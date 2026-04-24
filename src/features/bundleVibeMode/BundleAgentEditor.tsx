import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { buildEntitySlug } from '@/lib/routing';
import type { PostStatus, BundleManifestV1 } from '@/types/post';
import type { PostMediaItem } from '@/hooks/usePost';
import type { ChatMessage, VirtualFileTree } from '@/types/vibe';
import CoverSection from '@/pages/SubmitPost/CoverSection';
import { ChatBar } from './ChatBar';
import { TemplatePicker } from './TemplatePicker';
import { loadTemplateById, type TemplateEntry } from './templates';
import { useVibeSession, type UseVibeSessionResult } from './useVibeSession';
import { shipVibeBundle, ShipVibeBundleError } from './shipIt';
import { rehydrateTreeFromBundle, RehydrateAuthError } from './rehydrate';
import { importZipToTree } from './zipImport';
import { clearDraft } from './db';
import { getShipButtonLabel } from './shipButtonLabel';

const ProCodePanelLazy = lazy(() =>
  import('./ProCodePanel').then((m) => ({ default: m.ProCodePanel })),
);

export interface BundleAgentEditorShippedBundle {
  versionId: string;
  manifest: BundleManifestV1;
  version?: number;
}

export interface BundleAgentEditorProps {
  postId: string;
  title: string;
  slug?: string;
  coverMediaId?: string | null;
  coverPreview?: PostMediaItem | null;
  coverUploadFiles?: File[];
  coverUploading?: boolean;
  status?: PostStatus;
  onTitleChange?(next: string): void;
  onSlugChange?(next: string): void;
  onCoverUpload?(files: File[]): void | Promise<void>;
  onCoverRemove?(): void;
  onPublish?(): void | Promise<void>;
  onUnpublish?(): void | Promise<void>;
  onDelete?(): void | Promise<void>;
  onSaveDraft?(): void | Promise<void>;
  onRequestClose?(): void;
  onShipped(result: { bundleVersionId: string }): void;
  memberId?: string;
  shippedBundle?: BundleAgentEditorShippedBundle | null;
  session?: UseVibeSessionResult;
  statusAccessory?: ReactNode;
  statusMessage?: string | null;
}

export default function BundleAgentEditor({
  postId,
  title,
  slug,
  coverMediaId = null,
  coverPreview = null,
  coverUploadFiles = [],
  coverUploading = false,
  status = 'draft',
  onTitleChange,
  onSlugChange,
  onCoverUpload,
  onCoverRemove,
  onPublish,
  onUnpublish,
  onDelete,
  onSaveDraft,
  onRequestClose,
  onShipped,
  memberId,
  shippedBundle = null,
  session: sessionProp,
  statusAccessory,
  statusMessage = null,
}: BundleAgentEditorProps) {
  const internalSession = useVibeSession(sessionProp ? null : postId);
  const session = sessionProp ?? internalSession;
  const {
    tree,
    chat,
    snapshots,
    pending,
    error,
    model,
    activeSnapshotId,
    sessionTokensUsed,
    budgetState,
    usage,
    hydrated,
    sendTurn,
    abortTurn,
    pickSnapshot,
    fork,
    commitTree,
    exportZip,
  } = session;

  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'settings'>('chat');
  const [notices, setNotices] = useState<string[]>([]);
  const [slugEditing, setSlugEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftSlug, setDraftSlug] = useState(slug ?? buildEntitySlug(title, postId));
  const [shipping, setShipping] = useState(false);
  const [showAllTurns, setShowAllTurns] = useState(false);
  const [expandedTurns, setExpandedTurns] = useState<Record<string, boolean>>({});
  const importZipInputRef = useRef<HTMLInputElement | null>(null);
  const userEditedSlugRef = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const autoExpandedTurnIdRef = useRef<string | null>(null);
  const seededInitialTurnRef = useRef(false);
  const prevPendingRef = useRef(pending);

  // Group chat into "turns": each user message starts a new turn and
  // collects every subsequent assistant/system message until the next
  // user message. Anything before the first user message becomes a
  // leading turn so nothing is dropped.
  const turns = useMemo<{ id: string; messages: ChatMessage[] }[]>(() => {
    const out: { id: string; messages: ChatMessage[] }[] = [];
    for (const msg of chat) {
      if (msg.role === 'user' || out.length === 0) {
        out.push({ id: msg.id, messages: [msg] });
      } else {
        out[out.length - 1].messages.push(msg);
      }
    }
    return out;
  }, [chat]);

  const VISIBLE_TURNS = 2;
  const hiddenTurnCount = Math.max(0, turns.length - VISIBLE_TURNS);
  const visibleTurns = showAllTurns ? turns : turns.slice(-VISIBLE_TURNS);
  const lastTurnId = turns[turns.length - 1]?.id ?? null;

  // Pair each user-led turn with the snapshot it produced so the row can
  // surface restore/fork/pinned/active affordances directly — replaces the
  // standalone SnapshotGraph. Streaming/in-progress turns have no snapshot
  // yet (the assistant_turn snapshot is created at turn end), so the
  // pairing tail-aligns: oldest user-led turn -> oldest assistant_turn
  // snapshot, etc.
  const turnSnapshotById = useMemo(() => {
    const ordered = [...snapshots]
      .filter((s) => s.source === 'assistant_turn')
      .sort((a, b) => a.turnIndex - b.turnIndex);
    const userLed = turns.filter((t) => t.messages[0]?.role === 'user');
    const map = new Map<string, (typeof ordered)[number]>();
    const offset = Math.max(0, userLed.length - ordered.length);
    userLed.forEach((turn, i) => {
      const snap = ordered[i - offset];
      if (snap) map.set(turn.id, snap);
    });
    return map;
  }, [snapshots, turns]);

  const pushNotice = useCallback((text: string) => {
    setNotices((prev) => [...prev.slice(-4), text]);
  }, []);

  const pushWarnings = useCallback((warnings: readonly string[]) => {
    warnings.forEach((warning) => pushNotice(warning));
  }, [pushNotice]);

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  useEffect(() => {
    setDraftSlug(slug ?? buildEntitySlug(title, postId));
  }, [postId, slug, title]);

  // Pin the chat scroll to the bottom whenever the latest turn changes —
  // matches how chat UIs feel and keeps the newest assistant output and
  // the input within sight together.
  useEffect(() => {
    if (activeTab !== 'chat') return;
    const node = chatScrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [activeTab, chat, notices, showAllTurns]);

  useEffect(() => {
    let nextAutoExpandedTurnId = autoExpandedTurnIdRef.current;

    if (!lastTurnId) {
      nextAutoExpandedTurnId = null;
      const didChange = nextAutoExpandedTurnId !== autoExpandedTurnIdRef.current;
      autoExpandedTurnIdRef.current = nextAutoExpandedTurnId;
      prevPendingRef.current = pending;
      if (didChange) {
        setExpandedTurns((prev) => ({ ...prev }));
      }
      return;
    }

    const autoExpandedTurnId = autoExpandedTurnIdRef.current;
    if (pending) {
      nextAutoExpandedTurnId = lastTurnId;
      seededInitialTurnRef.current = true;
    } else if (prevPendingRef.current && autoExpandedTurnId) {
      if (!Object.prototype.hasOwnProperty.call(expandedTurns, autoExpandedTurnId)) {
        nextAutoExpandedTurnId = null;
      }
    } else if (!seededInitialTurnRef.current || (autoExpandedTurnId && !turns.some((turn) => turn.id === autoExpandedTurnId))) {
      nextAutoExpandedTurnId = lastTurnId;
      seededInitialTurnRef.current = true;
    }

    const didChange = nextAutoExpandedTurnId !== autoExpandedTurnIdRef.current;
    autoExpandedTurnIdRef.current = nextAutoExpandedTurnId;
    prevPendingRef.current = pending;
    if (didChange) {
      setExpandedTurns((prev) => ({ ...prev }));
    }
  }, [expandedTurns, lastTurnId, pending, turns]);

  const effectiveTitle = onTitleChange ? title : draftTitle;
  const effectiveSlug = (onSlugChange ? slug : draftSlug) ?? buildEntitySlug(effectiveTitle, postId);
  const shipLabel = useMemo(() => getShipButtonLabel(shippedBundle), [shippedBundle]);
  const shippedVersionLabel = useMemo(() => {
    if (!shippedBundle) return 'shipped version';
    return typeof shippedBundle.version === 'number' ? `v${shippedBundle.version}` : 'shipped version';
  }, [shippedBundle]);

  useEffect(() => {
    userEditedSlugRef.current = Boolean(
      effectiveSlug && effectiveSlug !== buildEntitySlug(effectiveTitle, postId),
    );
  }, [effectiveSlug, effectiveTitle, postId]);

  const handleTitleInputChange = useCallback((nextValue: string) => {
    if (onTitleChange) {
      onTitleChange(nextValue);
    } else {
      setDraftTitle(nextValue);
    }

    if (!userEditedSlugRef.current) {
      const nextSlug = buildEntitySlug(nextValue, postId);
      if (onSlugChange) {
        onSlugChange(nextSlug);
      } else {
        setDraftSlug(nextSlug);
      }
    }
  }, [onSlugChange, onTitleChange, postId]);

  const handleSlugInputChange = useCallback((nextValue: string) => {
    userEditedSlugRef.current = true;
    if (onSlugChange) {
      onSlugChange(nextValue);
    } else {
      setDraftSlug(nextValue);
    }
  }, [onSlugChange]);

  const handleSubmit = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await sendTurn({ text: trimmed });
  }, [sendTurn]);

  const handleTemplatePick = useCallback(async (entry: TemplateEntry) => {
    await commitTree(entry.tree, 'template', entry.meta.label);
  }, [commitTree]);

  const seedMinimalTemplate = useCallback(async () => {
    const fallback = loadTemplateById('minimal');
    if (fallback) await handleTemplatePick(fallback);
  }, [handleTemplatePick]);

  const handleStartBlank = useCallback(async () => {
    const blank: VirtualFileTree = {
      'index.html': {
        path: 'index.html',
        kind: 'text',
        mime: 'text/html; charset=utf-8',
        content:
          '<!doctype html>\n<html>\n  <head><meta charset="utf-8"><title>Untitled</title></head>\n  <body><main><h1>Untitled</h1><p>Start describing your post in chat.</p></main></body>\n</html>\n',
      },
      'post.json': {
        path: 'post.json',
        kind: 'text',
        mime: 'application/json; charset=utf-8',
        content: JSON.stringify({
          schemaVersion: 1,
          title: effectiveTitle,
          entry: 'index.html',
          source: 'vibe',
          layout: { mode: 'inline-auto', minHeight: 420, maxHeight: 1600 },
        } satisfies BundleManifestV1, null, 2),
      },
    };
    await commitTree(blank, 'template', 'Blank');
  }, [commitTree, effectiveTitle]);

  const rehydrateFromShippedBundle = useCallback(async (label: string): Promise<boolean> => {
    if (!shippedBundle) return false;
    const result = await rehydrateTreeFromBundle({
      bundleVersionId: shippedBundle.versionId,
      manifest: shippedBundle.manifest,
      postId,
    });
    await commitTree(result.tree, 'template', label);
    pushWarnings(result.warnings);
    return true;
  }, [commitTree, postId, pushWarnings, shippedBundle]);

  const autoSeededRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    if (autoSeededRef.current) return;
    if (Object.keys(tree).length > 0) {
      autoSeededRef.current = true;
      return;
    }
    autoSeededRef.current = true;
    if (shippedBundle) {
      void rehydrateFromShippedBundle(`Rehydrated from ${shippedVersionLabel}`).catch(async (err) => {
        if (err instanceof RehydrateAuthError) {
          pushNotice('Could not load shipped bundle. Starting from the Minimal template.');
          await seedMinimalTemplate();
          return;
        }
        pushNotice(`Could not load shipped bundle: ${err instanceof Error ? err.message : String(err)}`);
      });
      return;
    }
    void seedMinimalTemplate();
  }, [hydrated, pushNotice, rehydrateFromShippedBundle, seedMinimalTemplate, shippedBundle, shippedVersionLabel, tree]);

  const handleExportZip = useCallback(() => {
    void exportZip().catch((err) => pushNotice(`Export failed: ${err instanceof Error ? err.message : String(err)}`));
  }, [exportZip, pushNotice]);

  const openImportZipPicker = useCallback(() => {
    importZipInputRef.current?.click();
  }, []);

  const handleImportZipFile = useCallback(async (file: File | null) => {
    if (!file) return;
    if (
      Object.keys(tree).length > 0
      && typeof window !== 'undefined'
      && !window.confirm('Replace the current editor tree with the imported zip?')
    ) {
      return;
    }
    try {
      const zipBytes = await file.arrayBuffer();
      const result = await importZipToTree({ zipBytes, postId });
      await commitTree(result.tree, 'template', 'Imported .zip');
      pushWarnings(result.warnings);
    } catch (err) {
      pushNotice(`Import .zip failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [commitTree, postId, pushNotice, pushWarnings, tree]);

  const handleImportZipInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    void handleImportZipFile(file).finally(() => {
      event.target.value = '';
    });
  }, [handleImportZipFile]);

  const handleShipIt = useCallback(async () => {
    if (shipping) return;
    setShipping(true);
    try {
      const result = await shipVibeBundle({
        tree,
        postId,
        title: effectiveTitle,
        onShipped: (shipped) => onShipped(shipped),
      });
      if (result.kind === 'duplicate') {
        pushNotice('This bundle matches the last shipped version.');
      } else {
        pushNotice(`${shipLabel} complete. Local draft preserved for continued editing.`);
      }
    } catch (err) {
      if (err instanceof ShipVibeBundleError) {
        pushNotice(`Ship failed: ${err.message}`);
      } else {
        pushNotice(`Ship failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setShipping(false);
    }
  }, [effectiveTitle, onShipped, postId, pushNotice, shipLabel, shipping, tree]);

  const handleHardBudgetConfirm = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    return window.confirm(
      'You are about to exceed the soft 100k-token session budget. Continue with this turn?',
    );
  }, []);

  const handleResetToShipped = useCallback(() => {
    if (!shippedBundle) return;
    if (
      typeof window !== 'undefined'
      && !window.confirm('Discard local changes and reload shipped version?')
    ) {
      return;
    }
    void clearDraft(postId)
      .then(() => rehydrateFromShippedBundle(`Reset to shipped ${shippedVersionLabel}`))
      .then((didReset) => {
        if (didReset) {
          pushNotice(`Reset to ${shippedVersionLabel}.`);
        }
      })
      .catch((err) => {
        pushNotice(`Could not reload shipped bundle: ${err instanceof Error ? err.message : String(err)}`);
      });
  }, [postId, pushNotice, rehydrateFromShippedBundle, shippedBundle, shippedVersionLabel]);

  const runAction = useCallback((action?: () => void | Promise<void>) => {
    if (!action) return;
    void action();
  }, []);

  const isEmpty = Object.keys(tree).length === 0;
  const statusLabel = shippedBundle
    ? `v${shippedBundle.version ?? 0} shipped - editing`
    : 'draft - not yet shipped';

  const toggleTurnExpanded = useCallback((turnId: string) => {
    setExpandedTurns((prev) => {
      const isExpanded = Object.prototype.hasOwnProperty.call(prev, turnId)
        ? prev[turnId]
        : autoExpandedTurnIdRef.current === turnId;
      return { ...prev, [turnId]: !isExpanded };
    });
  }, []);

  const renderTurnBody = useCallback((turn: { id: string; messages: ChatMessage[] }) => (
    <div className="mt-2 flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/80 p-3">
      {turn.messages.map((msg) => (
        <div key={msg.id}>
          <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
            {msg.role}
          </div>
          <div className="flex flex-col gap-1">
            {msg.parts.map((part, index) => {
              if (part.type === 'text') {
                return (
                  <div key={index} className="whitespace-pre-wrap text-sm text-zinc-100">
                    {part.text}
                  </div>
                );
              }
              if (part.type === 'system_notice') {
                return (
                  <div key={index} className="rounded bg-zinc-800/70 px-2 py-1 text-xs text-amber-200">
                    {part.text}
                  </div>
                );
              }
              if (part.type === 'tool_call') {
                return (
                  <div key={index} className="font-mono text-xs text-sky-300">
                    {'->'} {part.tool}({part.path})
                  </div>
                );
              }
              if (part.type === 'tool_result') {
                return (
                  <div
                    key={index}
                    className={`font-mono text-xs ${part.ok ? 'text-emerald-300' : 'text-rose-300'}`}
                  >
                    {part.ok ? '[ok]' : '[error]'} {part.summary}
                  </div>
                );
              }
              if (part.type === 'image') {
                return (
                  <div key={index} className="text-xs text-zinc-500">
                    [image | {part.mime}]
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      ))}
    </div>
  ), []);

  return (
    <div className="flex h-full flex-col">
      <input
        ref={importZipInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleImportZipInputChange}
      />

      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 text-xs text-zinc-300">
        <div className="min-w-0">
          <div className="font-medium text-zinc-100">{statusLabel}</div>
          {(statusMessage || error || notices[notices.length - 1]) && (
            <div className={statusMessage || error ? 'text-rose-300' : 'text-zinc-400'}>
              {statusMessage ?? error ?? notices[notices.length - 1]}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {statusAccessory}
          <button
            type="button"
            onClick={onRequestClose}
            className="rounded-md border border-zinc-700 px-2 py-1 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
          >
            x
          </button>
        </div>
      </div>

      <div className="flex items-baseline gap-3 border-b border-zinc-800 px-4 py-4">
        <input
          data-drawer-focusable
          type="text"
          value={effectiveTitle}
          onChange={(event) => handleTitleInputChange(event.target.value)}
          placeholder="Untitled post"
          title="Post title — shown to readers and used to generate the URL slug."
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-zinc-100 outline-none placeholder:text-zinc-500"
        />
        <div className="min-w-0 shrink-0 max-w-[45%] text-sm text-zinc-500">
          {slugEditing ? (
            <input
              type="text"
              value={effectiveSlug}
              onChange={(event) => handleSlugInputChange(event.target.value)}
              onBlur={() => setSlugEditing(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === 'Escape') {
                  event.currentTarget.blur();
                }
              }}
              title="URL slug — appears in the post's public URL. Auto-derived from the title until you edit it."
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-right text-zinc-200 outline-none focus:border-zinc-500"
            />
          ) : (
            <button
              type="button"
              onClick={() => setSlugEditing(true)}
              title="URL slug — appears in the post's public URL. Click to edit."
              className="block w-full truncate text-right text-zinc-500 hover:text-zinc-300"
            >
              {effectiveSlug || 'Click to edit slug'}
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-zinc-800 px-2">
        {([
          ['chat', 'Chat'],
          ['files', 'Files'],
          ['settings', 'Settings'],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`border-b-2 px-3 py-2 text-sm ${
              activeTab === tab
                ? 'border-emerald-500 text-zinc-100'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {isEmpty ? (
          <div className="h-full overflow-auto">
            <TemplatePicker
              onPick={handleTemplatePick}
              onStartBlank={handleStartBlank}
              onImportZip={openImportZipPicker}
            />
          </div>
        ) : activeTab === 'chat' ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div ref={chatScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 text-sm text-zinc-200">
              {usage && (
                <div className="mb-3 text-xs text-zinc-500">
                  {model} | last turn: {usage.totalTokens.toLocaleString()} tok | $
                  {usage.estimatedUsd.toFixed(3)}
                </div>
              )}
              {chat.length === 0 && (
                <p className="mb-3 text-xs text-zinc-500">
                  Describe the change you want. The agent will edit the working tree directly.
                </p>
              )}
              {notices.map((notice, index) => (
                <div key={`notice-${index}`} className="mb-2 rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-400">
                  {notice}
                </div>
              ))}
              {!showAllTurns && hiddenTurnCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllTurns(true)}
                  className="mb-3 w-full rounded border border-dashed border-zinc-800 px-2 py-1.5 text-center text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                >
                  See {hiddenTurnCount} more turn{hiddenTurnCount === 1 ? '' : 's'}
                </button>
              )}
              {showAllTurns && turns.length > VISIBLE_TURNS && (
                <button
                  type="button"
                  onClick={() => setShowAllTurns(false)}
                  className="mb-3 w-full rounded border border-dashed border-zinc-800 px-2 py-1.5 text-center text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
                >
                  Show fewer turns
                </button>
              )}
              {visibleTurns.map((turn) => {
                const userMessage = turn.messages.find((msg) => msg.role === 'user');
                const assistantMessage = turn.messages.find((msg) => msg.role === 'assistant' && msg.summary?.trim())
                  ?? turn.messages.find((msg) => msg.role === 'assistant');
                const userTextPart = userMessage?.parts.find(
                  (part): part is Extract<ChatMessage['parts'][number], { type: 'text' }> => part.type === 'text' && part.text.trim().length > 0,
                );
                const userText = userTextPart?.text.trim() ?? '';
                const userFallback = userText.length > 40 ? `${userText.slice(0, 40).trimEnd()}...` : userText;
                const toolCallCount = turn.messages.reduce(
                  (count, msg) => count + msg.parts.filter((part) => part.type === 'tool_call').length,
                  0,
                );
                const isStreamingTurn = pending && turn.id === lastTurnId;
                const isExpanded = Object.prototype.hasOwnProperty.call(expandedTurns, turn.id)
                  ? expandedTurns[turn.id]
                  : autoExpandedTurnIdRef.current === turn.id;
                const title = assistantMessage?.summary?.trim() || (isStreamingTurn ? '...' : userFallback || 'Untitled turn');
                const snapshot = turnSnapshotById.get(turn.id);
                const snapshotId = snapshot?.id ?? null;
                const isActiveSnapshot = Boolean(snapshotId && snapshotId === activeSnapshotId);
                const isPinned = Boolean(snapshot?.pinned);

                return (
                  <div key={turn.id} className="mb-2">
                    <div
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition ${
                        isActiveSnapshot
                          ? 'border-emerald-500/60 bg-emerald-500/5'
                          : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTurnExpanded(turn.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span
                          className={`inline-block text-xs text-zinc-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          aria-hidden="true"
                        >
                          &gt;
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-zinc-100">{title}</span>
                            {isPinned && (
                              <span className="text-[10px] text-amber-300" title="Pinned">
                                🔒
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                            {toolCallCount} file edit{toolCallCount === 1 ? '' : 's'}
                            {isActiveSnapshot && ' · active'}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        {isStreamingTurn && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />}
                        {snapshotId && (
                          <button
                            type="button"
                            onClick={(event) => {
                              if (event.shiftKey) {
                                void fork(snapshotId);
                              } else {
                                void pickSnapshot(snapshotId);
                              }
                            }}
                            disabled={isActiveSnapshot && !pending}
                            title="Click to restore this version · shift-click to fork"
                            className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Restore or fork this turn"
                          >
                            ↺
                          </button>
                        )}
                      </div>
                    </div>
                    {isExpanded && renderTurnBody(turn)}
                  </div>
                );
              })}
            </div>

            <ChatBar
              onSubmit={(text) => void handleSubmit(text)}
              onAbort={abortTurn}
              pending={pending}
              model={model}
              sessionTokensUsed={sessionTokensUsed}
              dailyBudgetRemaining={usage ? Math.max(0, usage.dailyTokensBudget - usage.dailyTokensUsed) : 0}
              budgetState={budgetState}
              onHardBudgetConfirm={handleHardBudgetConfirm}
              postDraftId={postId}
              memberId={memberId}
              tree={tree}
              onCommitTree={(nextTree) => commitTree(nextTree, 'user_raw_edit', 'Manual code edit')}
              onNotice={pushNotice}
            />
          </div>
        ) : activeTab === 'files' ? (
          <div className="h-full">
            <Suspense fallback={<div className="p-4 text-sm text-zinc-400">Loading editor...</div>}>
              <ProCodePanelLazy
                tree={tree}
                onCommit={(nextTree) => commitTree(nextTree, 'user_raw_edit', 'Manual code edit')}
                onClose={() => setActiveTab('chat')}
              />
            </Suspense>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <div className="space-y-4">
              <CoverSection
                coverMediaId={coverMediaId}
                coverPreview={coverPreview}
                uploading={coverUploading}
                uploadFiles={coverUploadFiles}
                onUpload={(files) => {
                  if (!onCoverUpload) return;
                  void onCoverUpload(files);
                }}
                onRemove={() => onCoverRemove?.()}
              />

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-sm font-medium text-zinc-200">Tags</div>
                <div className="mt-1 text-xs text-zinc-500">Tag editing stays out of scope in this batch.</div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-sm font-medium text-zinc-200">Publishing</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {status === 'published' ? (
                    <button
                      type="button"
                      onClick={() => runAction(onUnpublish)}
                      className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
                    >
                      Unpublish
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => runAction(onPublish)}
                      className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
                    >
                      Publish
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => runAction(onDelete)}
                    className="rounded-md border border-rose-500/60 px-3 py-2 text-sm text-rose-200 hover:border-rose-400"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-sm font-medium text-zinc-200">Version reset</div>
                <button
                  type="button"
                  onClick={handleResetToShipped}
                  disabled={!shippedBundle}
                  className="mt-3 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reset to shipped version
                </button>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <div className="text-sm font-medium text-zinc-200">Bundle files</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openImportZipPicker}
                    className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
                  >
                    Import .zip
                  </button>
                  <button
                    type="button"
                    onClick={handleExportZip}
                    className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-500"
                  >
                    Export .zip
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 p-4">
        <button
          type="button"
          onClick={() => void handleShipIt()}
          disabled={pending || shipping}
          className="w-full rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-700"
        >
          {shipping ? 'Shipping...' : shipLabel}
        </button>
        <button
          type="button"
          onClick={() => runAction(onSaveDraft)}
          className="mt-2 w-full rounded-md border border-zinc-700 px-4 py-3 text-sm text-zinc-200 hover:border-zinc-500"
        >
          Save draft
        </button>
      </div>
    </div>
  );
}
