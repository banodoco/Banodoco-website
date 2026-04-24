/**
 * Vibe Mode — IndexedDB adapter (client-local persistence).
 *
 * Database: `banodoco-vibe`, version 1.
 *
 * Stores:
 *   sessions   keyPath=`postDraftId`                  — one row per draft
 *   snapshots  keyPath=`id`, indexes byDraftAndTurn / byDraft
 *   assets     keyPath=[`postDraftId`, `assetId`]     — composite key
 *
 * Policies (per doc §Step 8):
 *   • Snapshot ring buffer of 50 entries per draft; `pinned:true` snapshots
 *     are exempt from eviction.
 *   • Quota handling: `navigator.storage.estimate()` is consulted at session
 *     startup AND before large asset writes. If estimated usage crosses 80%
 *     of quota, a non-blocking warning is surfaced; on `QuotaExceededError`
 *     the write is refused and the caller is told to stop accepting data
 *     until the user exports or frees space.
 *   • Ship It (T15) clears the draft's session+snapshots+assets in one
 *     transaction via `clearDraft()` so IDB doesn't hoard bytes after
 *     upload.
 *
 * AssetId lifecycle: `assetId` is a UUIDv4 minted client-side on upload
 * (see T13's AssetTray). It is stable for the lifetime of the session and
 * partners with `postDraftId` to form the composite key in the `assets`
 * store. `toZipBlob` (virtualFileTree.ts) materialises blob bytes from
 * this store on Ship It.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { VibeSessionState, VibeSnapshot } from '@/types/vibe';

export const VIBE_DB_NAME = 'banodoco-vibe';
export const VIBE_DB_VERSION = 1;
export const SNAPSHOT_RING_BUFFER = 50;
export const QUOTA_WARN_FRACTION = 0.8;

export interface AssetRecord {
  postDraftId: string;
  assetId: string;
  originalFilename: string;
  mime: string;
  bytes: ArrayBuffer;
  createdAt: string;
}

interface VibeDBSchema extends DBSchema {
  sessions: {
    key: string;
    value: VibeSessionState;
  };
  snapshots: {
    key: string;
    value: VibeSnapshot;
    indexes: {
      byDraftAndTurn: [string, number];
      byDraft: string;
    };
  };
  assets: {
    key: [string, string];
    value: AssetRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<VibeDBSchema>> | null = null;

const getDb = (): Promise<IDBPDatabase<VibeDBSchema>> => {
  if (dbPromise) return dbPromise;
  dbPromise = openDB<VibeDBSchema>(VIBE_DB_NAME, VIBE_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'postDraftId' });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        const snapshots = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapshots.createIndex('byDraftAndTurn', ['postDraftId', 'turnIndex']);
        snapshots.createIndex('byDraft', 'postDraftId');
      }
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets', { keyPath: ['postDraftId', 'assetId'] });
      }
    },
    blocked() {
      console.warn('[vibe/db] upgrade blocked by another tab');
    },
    blocking() {
      console.warn('[vibe/db] this tab is blocking a newer upgrade; will close');
    },
  });
  return dbPromise;
};

export const __resetVibeDbForTests = (): void => {
  dbPromise = null;
};

// ---------------------------------------------------------------------------
// Quota & eviction
// ---------------------------------------------------------------------------

export interface QuotaSnapshot {
  supported: boolean;
  usage: number;
  quota: number;
  fraction: number;
  warn: boolean;
}

export const getQuotaSnapshot = async (): Promise<QuotaSnapshot> => {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { supported: false, usage: 0, quota: 0, fraction: 0, warn: false };
  }
  try {
    const est = await navigator.storage.estimate();
    const usage = typeof est.usage === 'number' ? est.usage : 0;
    const quota = typeof est.quota === 'number' ? est.quota : 0;
    const fraction = quota > 0 ? usage / quota : 0;
    return {
      supported: true,
      usage,
      quota,
      fraction,
      warn: fraction >= QUOTA_WARN_FRACTION,
    };
  } catch {
    return { supported: false, usage: 0, quota: 0, fraction: 0, warn: false };
  }
};

export class VibeQuotaExceededError extends Error {
  readonly code = 'vibe_quota_exceeded';
  constructor(message = 'IndexedDB quota exceeded; refuse additional writes until user exports or frees space.') {
    super(message);
    this.name = 'VibeQuotaExceededError';
  }
}

const isQuotaError = (err: unknown): boolean => {
  if (!err) return false;
  if (err instanceof DOMException && (err.name === 'QuotaExceededError' || err.code === 22)) {
    return true;
  }
  // Some browsers throw a plain object with .name
  const e = err as { name?: unknown };
  return e.name === 'QuotaExceededError';
};

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export const saveSession = async (session: VibeSessionState): Promise<void> => {
  const db = await getDb();
  try {
    await db.put('sessions', session);
  } catch (err) {
    if (isQuotaError(err)) throw new VibeQuotaExceededError();
    throw err;
  }
};

export const loadSession = async (postDraftId: string): Promise<VibeSessionState | null> => {
  const db = await getDb();
  const row = await db.get('sessions', postDraftId);
  return row ?? null;
};

export const deleteSession = async (postDraftId: string): Promise<void> => {
  const db = await getDb();
  await db.delete('sessions', postDraftId);
};

// ---------------------------------------------------------------------------
// Snapshots (ring buffer of 50; pinned exempt)
// ---------------------------------------------------------------------------

export const saveSnapshot = async (snapshot: VibeSnapshot): Promise<void> => {
  const db = await getDb();
  try {
    await db.put('snapshots', snapshot);
  } catch (err) {
    if (isQuotaError(err)) throw new VibeQuotaExceededError();
    throw err;
  }
  // Best-effort eviction after each write so the buffer stays at most 50.
  await evictOldUnpinned(snapshot.postDraftId);
};

export const listSnapshots = async (postDraftId: string): Promise<VibeSnapshot[]> => {
  const db = await getDb();
  const idx = db.transaction('snapshots').store.index('byDraft');
  const snaps = await idx.getAll(IDBKeyRange.only(postDraftId));
  // Chronological by turnIndex, then createdAt as tiebreaker.
  snaps.sort((a, b) => {
    if (a.turnIndex !== b.turnIndex) return a.turnIndex - b.turnIndex;
    return a.createdAt.localeCompare(b.createdAt);
  });
  return snaps;
};

export const getSnapshot = async (id: string): Promise<VibeSnapshot | null> => {
  const db = await getDb();
  const row = await db.get('snapshots', id);
  return row ?? null;
};

/**
 * Fork a snapshot: create a new snapshot with `source:'fork'` whose
 * `parentSnapshotId` points at the source. Tree is deep-cloned so later
 * edits of the fork don't mutate the source's tree reference in IDB.
 */
export const fork = async (
  sourceId: string,
  opts: { newId: string; label?: string | null; turnIndex?: number },
): Promise<VibeSnapshot> => {
  const source = await getSnapshot(sourceId);
  if (!source) {
    throw new Error(`fork: source snapshot ${sourceId} not found`);
  }
  const forked: VibeSnapshot = {
    id: opts.newId,
    postDraftId: source.postDraftId,
    turnIndex: opts.turnIndex ?? source.turnIndex,
    parentSnapshotId: source.id,
    label: opts.label ?? null,
    source: 'fork',
    pinned: false,
    createdAt: new Date().toISOString(),
    tree: JSON.parse(JSON.stringify(source.tree)),
  };
  await saveSnapshot(forked);
  return forked;
};

/**
 * Ring-buffer eviction. Keeps at most SNAPSHOT_RING_BUFFER (50) unpinned
 * snapshots per draft; pinned snapshots are ALWAYS retained regardless of
 * age. Oldest-first eviction by (turnIndex asc, createdAt asc).
 */
export const evictOldUnpinned = async (postDraftId: string): Promise<void> => {
  const db = await getDb();
  const all = await listSnapshots(postDraftId);
  const unpinned = all.filter((s) => !s.pinned);
  if (unpinned.length <= SNAPSHOT_RING_BUFFER) return;
  const toEvict = unpinned.slice(0, unpinned.length - SNAPSHOT_RING_BUFFER);
  const tx = db.transaction('snapshots', 'readwrite');
  await Promise.all(toEvict.map((s) => tx.store.delete(s.id)));
  await tx.done;
};

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export const putAsset = async (record: AssetRecord): Promise<void> => {
  // Consult quota BEFORE the write; large-asset heuristic is any
  // payload >= 1MB. Warn via the returned QuotaSnapshot.warn flag —
  // this does not block the write (T13's AssetTray decides UI).
  if (record.bytes.byteLength >= 1024 * 1024) {
    const q = await getQuotaSnapshot();
    if (q.warn) {
      console.warn(
        `[vibe/db] storage at ${(q.fraction * 100).toFixed(1)}% of quota (${q.usage}/${q.quota} bytes) — eviction recommended`,
      );
    }
  }
  const db = await getDb();
  try {
    await db.put('assets', record);
  } catch (err) {
    if (isQuotaError(err)) throw new VibeQuotaExceededError();
    throw err;
  }
};

export const getAsset = async (
  postDraftId: string,
  assetId: string,
): Promise<AssetRecord | null> => {
  const db = await getDb();
  const row = await db.get('assets', [postDraftId, assetId]);
  return row ?? null;
};

export const listAssets = async (postDraftId: string): Promise<AssetRecord[]> => {
  const db = await getDb();
  const range = IDBKeyRange.bound([postDraftId, ''], [postDraftId, '￿']);
  return db.getAll('assets', range);
};

export const deleteAsset = async (postDraftId: string, assetId: string): Promise<void> => {
  const db = await getDb();
  await db.delete('assets', [postDraftId, assetId]);
};

// ---------------------------------------------------------------------------
// Ship It cleanup — clear the entire local footprint for a draft in one shot.
// ---------------------------------------------------------------------------

export const clearDraft = async (postDraftId: string): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction(['sessions', 'snapshots', 'assets'], 'readwrite');

  await tx.objectStore('sessions').delete(postDraftId);

  const snapshotIdx = tx.objectStore('snapshots').index('byDraft');
  const snapCursor = await snapshotIdx.openCursor(IDBKeyRange.only(postDraftId));
  const snapTarget = tx.objectStore('snapshots');
  let cur = snapCursor;
  while (cur) {
    await snapTarget.delete(cur.primaryKey);
    cur = await cur.continue();
  }

  const assetRange = IDBKeyRange.bound([postDraftId, ''], [postDraftId, '￿']);
  const assetCursor = await tx.objectStore('assets').openCursor(assetRange);
  let acur = assetCursor;
  while (acur) {
    await acur.delete();
    acur = await acur.continue();
  }

  await tx.done;
};
