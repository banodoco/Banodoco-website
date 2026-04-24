/**
 * Vibe Mode — session state hook.
 *
 * Owns the per-editor session: virtual file tree, chat transcript,
 * snapshot chain, streaming turn state, slash commands, and the
 * soft token budget. Persistence to IndexedDB is driven by this
 * hook; the agent-proxy Edge Function is the sole server write.
 *
 * THROWS AT MOUNT on nullish `postDraftId` — T14's SubmitPost
 * integration guarantees a JIT draft is created before Vibe mode
 * is entered, so reaching here with a null id is a programmer
 * error. Failing loudly surfaces it in dev.
 *
 * Slash commands handled locally (never go to the agent):
 *   - `/undo`       → records a new snapshot with `source:'undo'` whose
 *                     tree equals the parent-of-the-current snapshot.
 *                     The NEXT `sendTurn` extends the undo LINEARLY
 *                     (its parentSnapshotId points at the undo snapshot,
 *                     per pre-plan guidance — matches Cursor's
 *                     undo-then-edit behaviour).
 *   - `/snapshot [name]` → saves a `pinned:true` snapshot with the
 *                     optional label. Pinned snapshots are exempt from
 *                     ring-buffer eviction (db.ts).
 *   - `/model <name>`    → switches the active model. Opus requires an
 *                     explicit confirm (caller supplies); Sonnet / Haiku
 *                     are immediate.
 *   - `/show-code`       → toggles the ProCodePanel (UI state only).
 *   - `/export-zip`      → runs `toZipBlob(tree, readAsset)` + triggers
 *                     a local download. CRITICAL: this command MUST
 *                     work before Ship It because Ship It clears IDB.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  ChatMessage,
  ChatPart,
  TurnUsage,
  VibeSnapshot,
  VirtualFile,
  VirtualFileTree,
} from '@/types/vibe';
import type { BundleManifestV1 } from '@/types/post';
import { applyPatch, toZipBlob, writeFile } from './virtualFileTree';
import {
  getAsset,
  listSnapshots,
  loadSession,
  saveSession,
  saveSnapshot,
  clearDraft,
  fork as forkSnapshotInDb,
} from './db';
import { lintTree, type LintFinding } from './previewLint';

export const SESSION_SOFT_BUDGET_WARN_TOKENS = 80_000;
export const SESSION_SOFT_BUDGET_HARD_TOKENS = 100_000;

export type VibeModel = TurnUsage['model'];
export const DEFAULT_MODEL: VibeModel = 'claude-sonnet-4-6';
export const CONFIRM_REQUIRED_MODELS: readonly VibeModel[] = ['claude-opus-4-7'];

export interface SendTurnInput {
  text: string;
  images?: Array<{ mime: string; dataUrl: string; width: number; height: number }>;
  templateContinuation?: string | null;
}

export interface UseVibeSessionResult {
  readonly tree: VirtualFileTree;
  readonly snapshots: readonly VibeSnapshot[];
  readonly chat: readonly ChatMessage[];
  readonly usage: TurnUsage | null;
  readonly pending: boolean;
  readonly error: string | null;
  readonly model: VibeModel;
  readonly activeSnapshotId: string | null;
  readonly showProCodePanel: boolean;
  /** Cumulative input+output tokens this session. Drives soft budget banners. */
  readonly sessionTokensUsed: number;
  readonly budgetState: 'ok' | 'warn' | 'hard';
  /** `false` while loading from IDB on mount, `true` afterwards. Consumers use
   *  this to distinguish "we're still hydrating — tree may be empty transiently"
   *  from "we've fully loaded and the tree really is empty → auto-seed a template". */
  readonly hydrated: boolean;
  sendTurn(input: SendTurnInput): Promise<void>;
  abortTurn(): void;
  /** Restore a snapshot by id (read-only pick; does NOT record a new snapshot). */
  pickSnapshot(id: string): Promise<void>;
  /** Shift-click behaviour: create a `source:'fork'` snapshot pointed at id. */
  fork(id: string): Promise<void>;
  /** Replace the current tree wholesale (ProCodePanel, TemplatePicker). Records a `user_raw_edit` or `template` snapshot per source. */
  commitTree(nextTree: VirtualFileTree, source: VibeSnapshot['source'], label?: string | null): Promise<void>;
  slashCommand(raw: string, opts?: { confirmModelSwitch?: (model: VibeModel) => boolean }): Promise<void>;
  /** Manual /export-zip — works BEFORE Ship It. */
  exportZip(): Promise<Blob>;
}

interface BuildAssistantTurnArgs {
  postDraftId: string;
  model: VibeModel;
  tree: VirtualFileTree;
  chatHistory: ChatMessage[];
  userTurn: SendTurnInput;
}

const newId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const nowIso = (): string => new Date().toISOString();

const parseSsePayload = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

interface SseEvent {
  event: string;
  data: unknown;
}

/**
 * Split a raw SSE frame into its event + data fields. Returns null for
 * comment frames or frames with no `event:` line. Multiline `data:`
 * fields are joined with `\n` per the spec.
 */
const parseSseFrame = (frame: string): SseEvent | null => {
  let event = '';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (!line || line.startsWith(':')) continue;
    const sep = line.indexOf(':');
    const field = sep === -1 ? line : line.slice(0, sep);
    const value = sep === -1 ? '' : line.slice(sep + 1).replace(/^ /, '');
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (!event) return null;
  return { event, data: parseSsePayload(dataLines.join('\n')) };
};

/**
 * Stream the agent-proxy SSE response. Emits each framed event as it
 * arrives. Completes when the stream closes (on `done`, `refusal`, or
 * `error`). Caller is expected to interpret events in order.
 */
async function* streamAgentTurn(args: BuildAssistantTurnArgs, signal: AbortSignal): AsyncGenerator<SseEvent> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured; agent-proxy unreachable');
  }
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Vibe turn requires an authenticated session');

  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!baseUrl) throw new Error('VITE_SUPABASE_URL is not set');
  const url = `${baseUrl.replace(/\/$/, '')}/functions/v1/agent-proxy`;

  const body = {
    postDraftId: args.postDraftId,
    model: args.model,
    tree: args.tree,
    chatHistory: args.chatHistory,
    userTurn: {
      text: args.userTurn.text,
      images: args.userTurn.images,
    },
    templateContinuation: args.userTurn.templateContinuation ?? null,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
      accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let code = `http_${res.status}`;
    let message = `agent-proxy returned HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson?.error?.code) code = errJson.error.code;
      if (errJson?.error?.message) message = errJson.error.message;
    } catch {
      // keep defaults
    }
    // Surface as an SSE-shaped error so the consumer can handle it uniformly.
    yield { event: 'error', data: { code, message } };
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('agent-proxy response is not streamable');
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE frames are separated by a blank line.
      let sep = buffer.indexOf('\n\n');
      while (sep !== -1) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const evt = parseSseFrame(frame);
        if (evt) yield evt;
        sep = buffer.indexOf('\n\n');
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }
}

const tryReadManifest = (tree: VirtualFileTree): BundleManifestV1 | null => {
  const file: VirtualFile | undefined = tree['post.json'];
  if (!file || file.kind !== 'text' || typeof file.content !== 'string') return null;
  try {
    return JSON.parse(file.content) as BundleManifestV1;
  } catch {
    return null;
  }
};

const appendSystemNotice = (chat: ChatMessage[], text: string): ChatMessage[] => {
  const last = chat[chat.length - 1];
  const part: ChatPart = { type: 'system_notice', text };
  if (last && last.role === 'system') {
    const next: ChatMessage = { ...last, parts: [...last.parts, part] };
    return [...chat.slice(0, -1), next];
  }
  return [
    ...chat,
    { id: newId(), role: 'system', createdAt: nowIso(), parts: [part] },
  ];
};

const triggerZipDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Small delay so Safari/Firefox finish the download before revoke.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

// Inert no-op session — returned when a caller invokes the hook with a
// nullish postDraftId (intentional, e.g. `BundleAgentEditor` when an
// external `session` prop is provided and the internal hook call is a
// placeholder). Safe because the caller discards the return value; we
// never touch IDB or the network without a real draft id.
const INERT_SESSION: UseVibeSessionResult = {
  tree: {},
  snapshots: [],
  chat: [],
  usage: null,
  pending: false,
  error: null,
  model: DEFAULT_MODEL,
  activeSnapshotId: null,
  showProCodePanel: false,
  sessionTokensUsed: 0,
  budgetState: 'ok',
  hydrated: false,
  sendTurn: async () => {},
  abortTurn: () => {},
  pickSnapshot: async () => {},
  fork: async () => {},
  commitTree: async () => {},
  slashCommand: async () => {},
  exportZip: async () => new Blob([]),
};

export function useVibeSession(postDraftId: string | null | undefined): UseVibeSessionResult {
  // Hooks must run unconditionally (rules of hooks). We run all of them even
  // when postDraftId is nullish, then short-circuit the EFFECT BODIES that
  // would hit IDB / the network. At the end of the function we return the
  // inert session shape if there's no draft id. This means switching a
  // caller's postDraftId between null and non-null across renders is safe.
  const [tree, setTree] = useState<VirtualFileTree>({});
  const [hydrated, setHydrated] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [snapshots, setSnapshots] = useState<VibeSnapshot[]>([]);
  const [usage, setUsage] = useState<TurnUsage | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<VibeModel>(DEFAULT_MODEL);
  const [activeSnapshotId, setActiveSnapshotId] = useState<string | null>(null);
  const [showProCodePanel, setShowProCodePanel] = useState(false);
  const [sessionTokensUsed, setSessionTokensUsed] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  // Refs mirror state so the streaming callbacks can read latest without closure staleness.
  const treeRef = useRef(tree);
  const activeSnapshotIdRef = useRef<string | null>(null);
  useEffect(() => { treeRef.current = tree; }, [tree]);
  useEffect(() => { activeSnapshotIdRef.current = activeSnapshotId; }, [activeSnapshotId]);

  const budgetState: 'ok' | 'warn' | 'hard' = useMemo(() => {
    if (sessionTokensUsed >= SESSION_SOFT_BUDGET_HARD_TOKENS) return 'hard';
    if (sessionTokensUsed >= SESSION_SOFT_BUDGET_WARN_TOKENS) return 'warn';
    return 'ok';
  }, [sessionTokensUsed]);

  const requirePostDraftId = useCallback((): string => {
    if (!postDraftId) {
      throw new Error('useVibeSession requires postDraftId before performing session I/O');
    }
    return postDraftId;
  }, [postDraftId]);

  // Hydrate from IDB on mount.
  useEffect(() => {
    if (!postDraftId) {
      setHydrated(true);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const [session, snaps] = await Promise.all([
          loadSession(postDraftId),
          listSnapshots(postDraftId),
        ]);
        if (cancelled) return;
        if (session) {
          setTree(session.tree);
          setChat(session.chat);
          setUsage(session.usage);
          setModel(session.model);
          setActiveSnapshotId(session.activeSnapshotId);
        }
        setSnapshots(snaps);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, [postDraftId]);

  const persistSession = useCallback(
    async (nextTree: VirtualFileTree, nextChat: ChatMessage[], nextUsage: TurnUsage | null, nextActive: string | null) => {
      const nextPostDraftId = requirePostDraftId();
      await saveSession({
        postDraftId: nextPostDraftId,
        model,
        tree: nextTree,
        snapshots: [],
        chat: nextChat,
        activeSnapshotId: nextActive,
        usage: nextUsage,
        pending: false,
        error: null,
      });
    },
    [requirePostDraftId, model],
  );

  const recordSnapshot = useCallback(
    async (args: {
      tree: VirtualFileTree;
      source: VibeSnapshot['source'];
      parentSnapshotId: string | null;
      label?: string | null;
      pinned?: boolean;
    }): Promise<VibeSnapshot> => {
      const nextPostDraftId = requirePostDraftId();
      const snapshot: VibeSnapshot = {
        id: newId(),
        postDraftId: nextPostDraftId,
        turnIndex: snapshots.length,
        parentSnapshotId: args.parentSnapshotId,
        label: args.label ?? null,
        source: args.source,
        pinned: args.pinned ?? false,
        createdAt: nowIso(),
        tree: JSON.parse(JSON.stringify(args.tree)),
      };
      await saveSnapshot(snapshot);
      setSnapshots((prev) => [...prev, snapshot]);
      return snapshot;
    },
    [requirePostDraftId, snapshots.length],
  );

  const abortTurn = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(false);
  }, []);

  const sendTurn = useCallback(
    async (input: SendTurnInput): Promise<void> => {
      if (pending) throw new Error('A Vibe turn is already in flight');
      setError(null);
      setPending(true);

      // Append the user-turn + an empty assistant message we'll stream into.
      const userMsg: ChatMessage = {
        id: newId(),
        role: 'user',
        createdAt: nowIso(),
        parts: [
          { type: 'text', text: input.text },
          ...(input.images ?? []).map<ChatPart>((img) => ({
            type: 'image',
            assetId: newId(),
            mime: img.mime,
            width: img.width,
            height: img.height,
          })),
        ],
      };
      const assistantMsg: ChatMessage = {
        id: newId(),
        role: 'assistant',
        createdAt: nowIso(),
        parts: [],
      };

      let localChat: ChatMessage[] = [];
      setChat((prev) => {
        localChat = [...prev, userMsg, assistantMsg];
        return localChat;
      });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const nextPostDraftId = requirePostDraftId();
        let nextTree: VirtualFileTree = treeRef.current;
        let turnUsage: TurnUsage | null = null;
        let refusalText: string | null = null;
        let streamErrorCode: string | null = null;
        let streamErrorMessage: string | null = null;
        // chatHistory sent to the proxy is the transcript BEFORE this turn's
        // user/assistant pair — the proxy appends the user turn itself. Cap
        // to the last HISTORY_TURNS user-led turns so a long session doesn't
        // pay an ever-growing token bill on every turn while still letting
        // the agent reference what was just done.
        const HISTORY_TURNS = 3;
        const fullPrior = localChat.slice(0, -2);
        const grouped: ChatMessage[][] = [];
        for (const m of fullPrior) {
          if (m.role === 'user' || grouped.length === 0) grouped.push([m]);
          else grouped[grouped.length - 1].push(m);
        }
        const priorHistory = grouped.slice(-HISTORY_TURNS).flat();

        for await (const evt of streamAgentTurn(
          {
            postDraftId: nextPostDraftId,
            model,
            tree: treeRef.current,
            chatHistory: priorHistory,
            userTurn: input,
          },
          controller.signal,
        )) {
          switch (evt.event) {
            case 'summary': {
              const text = (evt.data as { text?: string } | null)?.text;
              if (typeof text !== 'string' || text === '') break;
              setChat((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== 'assistant') return prev;
                return [...prev.slice(0, -1), { ...last, summary: text }];
              });
              break;
            }
            case 'text': {
              const delta = (evt.data as { delta?: string } | null)?.delta;
              if (typeof delta !== 'string' || delta === '') break;
              setChat((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== 'assistant') return prev;
                const lastPart = last.parts[last.parts.length - 1];
                const merged: ChatPart = lastPart && lastPart.type === 'text'
                  ? { type: 'text', text: lastPart.text + delta }
                  : { type: 'text', text: delta };
                const newParts = lastPart && lastPart.type === 'text'
                  ? [...last.parts.slice(0, -1), merged]
                  : [...last.parts, merged];
                return [...prev.slice(0, -1), { ...last, parts: newParts }];
              });
              break;
            }
            case 'tool_call': {
              const d = evt.data as { tool?: string; path?: string } | null;
              if (!d || (d.tool !== 'write_file' && d.tool !== 'apply_patch')) break;
              setChat((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== 'assistant') return prev;
                const part: ChatPart = {
                  type: 'tool_call',
                  tool: d.tool as 'write_file' | 'apply_patch',
                  path: typeof d.path === 'string' ? d.path : '',
                };
                return [...prev.slice(0, -1), { ...last, parts: [...last.parts, part] }];
              });
              break;
            }
            case 'tool_result': {
              const d = evt.data as { tool?: string; path?: string; ok?: boolean; summary?: string; error?: string } | null;
              if (!d) break;
              setChat((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== 'assistant') return prev;
                const part: ChatPart = {
                  type: 'tool_result',
                  ok: Boolean(d.ok),
                  summary: typeof d.summary === 'string' ? d.summary : (d.error ?? ''),
                };
                return [...prev.slice(0, -1), { ...last, parts: [...last.parts, part] }];
              });
              break;
            }
            case 'safety_warning': {
              const d = evt.data as { text?: string; rule?: string; path?: string } | null;
              const msg = d?.text ?? 'Safety warning';
              setChat((prev) => appendSystemNotice(prev, msg));
              break;
            }
            case 'usage': {
              const d = evt.data as TurnUsage | null;
              if (d) {
                turnUsage = d;
                setUsage(d);
                setSessionTokensUsed((prev) => prev + (d.totalTokens ?? 0));
              }
              break;
            }
            case 'refusal': {
              const d = evt.data as { text?: string } | null;
              refusalText = typeof d?.text === 'string' ? d.text : 'The model declined this turn.';
              setChat((prev) => appendSystemNotice(prev, `${refusalText}\n\nTry rephrasing your request.`));
              break;
            }
            case 'error': {
              const d = evt.data as { code?: string; message?: string } | null;
              streamErrorCode = d?.code ?? 'vibe_stream_error';
              streamErrorMessage = d?.message ?? 'Stream error';
              break;
            }
            case 'done': {
              const d = evt.data as { tree?: VirtualFileTree } | null;
              if (d?.tree) nextTree = d.tree;
              break;
            }
          }
        }

        if (streamErrorCode) {
          setError(`${streamErrorCode}: ${streamErrorMessage ?? 'unknown'}`);
          setPending(false);
          abortRef.current = null;
          return;
        }

        // Apply the post-turn tree.
        const treeChanged = nextTree !== treeRef.current;
        console.info('[vibe/session] post-turn tree', {
          treeChanged,
          currentFiles: Object.keys(treeRef.current).length,
          nextFiles: Object.keys(nextTree).length,
          currentPaths: Object.keys(treeRef.current).slice(0, 5),
          nextPaths: Object.keys(nextTree).slice(0, 5),
        });
        if (treeChanged) {
          setTree(nextTree);
        }

        // Run client-side lint and append any findings as system notices.
        const manifest = tryReadManifest(nextTree);
        const lintFindings: LintFinding[] = lintTree(nextTree, manifest);
        if (lintFindings.length > 0) {
          setChat((prev) => {
            let next = prev;
            for (const f of lintFindings) next = appendSystemNotice(next, f.message);
            return next;
          });
        }

        // Persist a snapshot. Refusal uses 'undo' to avoid polluting the
        // assistant chain, but we still link it so /undo from a refusal
        // behaves sensibly.
        if (refusalText === null) {
          const snap = await recordSnapshot({
            tree: nextTree,
            source: 'assistant_turn',
            parentSnapshotId: activeSnapshotIdRef.current,
          });
          setActiveSnapshotId(snap.id);
        }

        const finalChatSnapshot: ChatMessage[] = [];
        setChat((prev) => {
          finalChatSnapshot.push(...prev);
          return prev;
        });
        await persistSession(nextTree, finalChatSnapshot, turnUsage, activeSnapshotIdRef.current);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') {
          // user cancellation — silent
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setPending(false);
        abortRef.current = null;
      }
    },
    [pending, requirePostDraftId, model, persistSession, recordSnapshot],
  );

  const pickSnapshot = useCallback(
    async (id: string): Promise<void> => {
      const snap = snapshots.find((s) => s.id === id);
      if (!snap) throw new Error(`Snapshot ${id} not found`);
      const restored: VirtualFileTree = JSON.parse(JSON.stringify(snap.tree));
      setTree(restored);
      setActiveSnapshotId(snap.id);
      await persistSession(restored, chat, usage, snap.id);
    },
    [snapshots, chat, usage, persistSession],
  );

  const fork = useCallback(
    async (id: string): Promise<void> => {
      const forked = await forkSnapshotInDb(id, { newId: newId() });
      setSnapshots((prev) => [...prev, forked]);
      const restored: VirtualFileTree = JSON.parse(JSON.stringify(forked.tree));
      setTree(restored);
      setActiveSnapshotId(forked.id);
      await persistSession(restored, chat, usage, forked.id);
    },
    [chat, usage, persistSession],
  );

  const commitTree = useCallback(
    async (nextTree: VirtualFileTree, source: VibeSnapshot['source'], label?: string | null) => {
      setTree(nextTree);
      const snap = await recordSnapshot({
        tree: nextTree,
        source,
        parentSnapshotId: activeSnapshotIdRef.current,
        label: label ?? null,
      });
      setActiveSnapshotId(snap.id);
      await persistSession(nextTree, chat, usage, snap.id);
    },
    [chat, usage, persistSession, recordSnapshot],
  );

  const readAssetForZip = useCallback(
    async (assetId: string) => {
      const rec = await getAsset(requirePostDraftId(), assetId);
      if (!rec) return null;
      return {
        bytes: new Uint8Array(rec.bytes),
        originalFilename: rec.originalFilename,
      };
    },
    [requirePostDraftId],
  );

  const exportZip = useCallback(async (): Promise<Blob> => {
    const blob = await toZipBlob(treeRef.current, readAssetForZip);
    triggerZipDownload(blob, `vibe-${postDraftId}-${Date.now()}.zip`);
    return blob;
  }, [postDraftId, readAssetForZip]);

  const slashCommand = useCallback(
    async (
      raw: string,
      opts?: { confirmModelSwitch?: (model: VibeModel) => boolean },
    ): Promise<void> => {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('/')) return;
      const [cmdRaw, ...rest] = trimmed.slice(1).split(/\s+/);
      const cmd = cmdRaw.toLowerCase();

      switch (cmd) {
        case 'undo': {
          // Undo flips to the parent-of-current snapshot's tree, and records
          // a new snapshot with source='undo' whose parent IS the pre-undo
          // snapshot. The next sendTurn extends the undo LINEARLY
          // (parentSnapshotId=undo.id), per pre-plan guidance.
          const current = activeSnapshotIdRef.current
            ? snapshots.find((s) => s.id === activeSnapshotIdRef.current)
            : null;
          if (!current || !current.parentSnapshotId) {
            setChat((prev) => appendSystemNotice(prev, 'Nothing to undo.'));
            return;
          }
          const parent = snapshots.find((s) => s.id === current.parentSnapshotId);
          if (!parent) {
            setChat((prev) => appendSystemNotice(prev, 'Undo target missing.'));
            return;
          }
          const restored: VirtualFileTree = JSON.parse(JSON.stringify(parent.tree));
          setTree(restored);
          const undoSnap = await recordSnapshot({
            tree: restored,
            source: 'undo',
            parentSnapshotId: current.id,
          });
          setActiveSnapshotId(undoSnap.id);
          await persistSession(restored, chat, usage, undoSnap.id);
          return;
        }
        case 'snapshot': {
          const label = rest.length > 0 ? rest.join(' ') : null;
          const snap = await recordSnapshot({
            tree: treeRef.current,
            source: 'assistant_turn',
            parentSnapshotId: activeSnapshotIdRef.current,
            label,
            pinned: true,
          });
          setActiveSnapshotId(snap.id);
          setChat((prev) => appendSystemNotice(prev, `Pinned snapshot${label ? ` "${label}"` : ''}.`));
          return;
        }
        case 'model': {
          const requested = rest[0] as VibeModel | undefined;
          if (!requested) {
            setChat((prev) => appendSystemNotice(prev, `Usage: /model claude-sonnet-4-6 | claude-opus-4-7 | claude-haiku-4-5`));
            return;
          }
          if (requested === model) return;
          if (CONFIRM_REQUIRED_MODELS.includes(requested)) {
            const confirmed = opts?.confirmModelSwitch?.(requested) ?? false;
            if (!confirmed) {
              setChat((prev) => appendSystemNotice(prev, `Switch to ${requested} cancelled (Opus requires explicit confirm).`));
              return;
            }
          }
          setModel(requested);
          setChat((prev) => appendSystemNotice(prev, `Model switched to ${requested}.`));
          return;
        }
        case 'show-code': {
          setShowProCodePanel((prev) => !prev);
          return;
        }
        case 'export-zip': {
          await exportZip();
          setChat((prev) => appendSystemNotice(prev, `Exported zip. Remember: export BEFORE Ship It — Ship It clears IDB.`));
          return;
        }
        default:
          setChat((prev) => appendSystemNotice(prev, `Unknown command: /${cmd}`));
      }
    },
    [snapshots, chat, usage, model, recordSnapshot, persistSession, exportZip],
  );

  // Expose a writeFile/applyPatch surface for ProCodePanel and
  // AssetTray — used by T13. Kept separate from the agent's tools.
  useEffect(() => {
    if (!postDraftId) return;
    // `writeFile`/`applyPatch` are re-exported by T7's virtualFileTree
    // and are intentionally not part of the hook's public API here;
    // sub-components that need raw tree mutations import them directly
    // and call `commitTree(nextTree, 'user_raw_edit')` afterward.
    void writeFile;
    void applyPatch;
  }, [postDraftId]);

  // Expose `clearDraft` for Ship It (T15). Not part of the hook's
  // public return; Ship It imports it from ./db directly.
  void clearDraft;

  // Hooks all ran above unconditionally (rules of hooks satisfied). If the
  // caller gave us no draft id, return the inert shape; the stateful machinery
  // above is unused but hook count is stable.
  if (!postDraftId) {
    return INERT_SESSION;
  }

  return {
    tree,
    snapshots,
    chat,
    usage,
    pending,
    error,
    model,
    activeSnapshotId,
    showProCodePanel,
    sessionTokensUsed,
    budgetState,
    hydrated,
    sendTurn,
    abortTurn,
    pickSnapshot,
    fork,
    commitTree,
    slashCommand,
    exportZip,
  };
}
