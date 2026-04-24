/**
 * Vibe Mode session primitives.
 *
 * `VirtualFile.assetId` is a UUIDv4 minted client-side at upload time (see
 * `src/features/bundleVibeMode/AssetTray.tsx` and the IndexedDB adapter at
 * `src/features/bundleVibeMode/db.ts`). The id stays stable across snapshots
 * and acts as the composite-key partner to `postDraftId` in the IDB `assets`
 * store (keyPath `[postDraftId, assetId]`). Binary blobs are never embedded
 * in `serializeForClaude` output — only the path + metadata are passed to the
 * agent, and `toZipBlob` materialises the bytes from IDB into the final zip
 * under `assets/<originalFilename>` on Ship It.
 */

export interface VirtualFile {
  path: string;
  kind: 'text' | 'binary-asset';
  mime: string;
  content?: string;
  assetId?: string;
}

export type VirtualFileTree = Record<string, VirtualFile>;

export interface VibeSnapshot {
  id: string;
  postDraftId: string;
  turnIndex: number;
  parentSnapshotId: string | null;
  label: string | null;
  source: 'template' | 'assistant_turn' | 'user_raw_edit' | 'fork' | 'undo';
  pinned: boolean;
  createdAt: string;
  tree: VirtualFileTree;
}

export type ChatPart =
  | { type: 'text'; text: string }
  | { type: 'image'; assetId: string; mime: string; width?: number; height?: number }
  | { type: 'system_notice'; text: string }
  | { type: 'tool_call'; tool: 'write_file' | 'apply_patch'; path: string }
  | { type: 'tool_result'; ok: boolean; summary: string };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  createdAt: string;
  parts: ChatPart[];
  summary?: string;
  snapshotId?: string | null;
}

export interface TurnUsage {
  model: 'claude-sonnet-4-6' | 'claude-opus-4-7' | 'claude-haiku-4-5';
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedUsd: number;
  sessionTokensUsed: number;
  dailyTokensUsed: number;
  dailyTokensBudget: number;
}

export interface VibeSessionState {
  postDraftId: string;
  model: TurnUsage['model'];
  tree: VirtualFileTree;
  snapshots: VibeSnapshot[];
  chat: ChatMessage[];
  activeSnapshotId: string | null;
  usage: TurnUsage | null;
  pending: boolean;
  error: string | null;
}
