import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  SNAPSHOT_RING_BUFFER,
  __resetVibeDbForTests,
  clearDraft,
  fork,
  getAsset,
  listSnapshots,
  loadSession,
  putAsset,
  saveSession,
  saveSnapshot,
  type AssetRecord,
} from './db';
import type { VibeSessionState, VibeSnapshot } from '@/types/vibe';

const POST_ID = 'post-draft-aaaa-bbbb-cccc-dddd';

const nowIso = () => new Date().toISOString();

const makeSession = (overrides: Partial<VibeSessionState> = {}): VibeSessionState => ({
  postDraftId: POST_ID,
  model: 'claude-sonnet-4-6',
  tree: {
    'index.html': {
      path: 'index.html',
      kind: 'text',
      mime: 'text/html; charset=utf-8',
      content: '<!doctype html><body>x</body>',
    },
  },
  snapshots: [],
  chat: [],
  activeSnapshotId: null,
  usage: null,
  pending: false,
  error: null,
  ...overrides,
});

const makeSnapshot = (
  id: string,
  turnIndex: number,
  opts: { pinned?: boolean; parent?: string | null } = {},
): VibeSnapshot => ({
  id,
  postDraftId: POST_ID,
  turnIndex,
  parentSnapshotId: opts.parent ?? null,
  label: null,
  source: 'assistant_turn',
  pinned: Boolean(opts.pinned),
  createdAt: nowIso(),
  tree: {
    'index.html': {
      path: 'index.html',
      kind: 'text',
      mime: 'text/html',
      content: `turn-${turnIndex}`,
    },
  },
});

/** Wipe object-store contents between tests so each test is hermetic.
 *  We go through db.ts's own openDB path so the upgrade callback creates the
 *  stores before we try to clear them. Deleting the DB would block on the
 *  cached open connection held by db.ts's dbPromise. */
const wipeAllStores = async (): Promise<void> => {
  // saveSession triggers db.ts's getDb() → openDB with its upgrade callback,
  // which guarantees all three object stores exist. Then we clear them.
  await saveSession(makeSession({ postDraftId: '___bootstrap___' }));
  const { openDB } = await import('idb');
  const db = await openDB('banodoco-vibe', 1);
  const tx = db.transaction(['sessions', 'snapshots', 'assets'], 'readwrite');
  await Promise.all([
    tx.objectStore('sessions').clear(),
    tx.objectStore('snapshots').clear(),
    tx.objectStore('assets').clear(),
  ]);
  await tx.done;
};

beforeEach(async () => {
  await wipeAllStores();
});

afterEach(() => {
  __resetVibeDbForTests();
});

describe('db — session round-trip', () => {
  test('saveSession + loadSession returns the exact row back', async () => {
    const session = makeSession();
    await saveSession(session);
    const loaded = await loadSession(POST_ID);
    expect(loaded).not.toBeNull();
    expect(loaded?.postDraftId).toBe(POST_ID);
    expect(loaded?.tree['index.html'].content).toBe('<!doctype html><body>x</body>');
    expect(loaded?.model).toBe('claude-sonnet-4-6');
  });

  test('loadSession on missing id returns null', async () => {
    const loaded = await loadSession('nonexistent');
    expect(loaded).toBeNull();
  });
});

describe('db — ring buffer of 50 snapshots, pinned exempt', () => {
  test('writes beyond 50 unpinned trigger oldest-first eviction', async () => {
    // Write 55 unpinned snapshots with monotonically increasing turnIndex.
    for (let i = 0; i < 55; i += 1) {
      await saveSnapshot(makeSnapshot(`snap-${i.toString().padStart(3, '0')}`, i));
    }
    const remaining = await listSnapshots(POST_ID);
    expect(remaining).toHaveLength(SNAPSHOT_RING_BUFFER);
    // Oldest 5 (turnIndex 0..4) should be evicted; newest (50..54) survive.
    const turnIndices = remaining.map((s) => s.turnIndex).sort((a, b) => a - b);
    expect(turnIndices[0]).toBe(5);
    expect(turnIndices[turnIndices.length - 1]).toBe(54);
  });

  test('pinned snapshots are retained even when ring-buffer overflows', async () => {
    // First two pinned snapshots (turnIndex 0 and 1) must survive no matter what.
    await saveSnapshot(makeSnapshot('pinned-a', 0, { pinned: true }));
    await saveSnapshot(makeSnapshot('pinned-b', 1, { pinned: true }));
    // Then 55 unpinned writes — total unpinned > 50, so eviction kicks in.
    for (let i = 0; i < 55; i += 1) {
      await saveSnapshot(makeSnapshot(`free-${i}`, 2 + i));
    }
    const remaining = await listSnapshots(POST_ID);
    const ids = remaining.map((s) => s.id);
    expect(ids).toContain('pinned-a');
    expect(ids).toContain('pinned-b');
    // Unpinned count is <= 50.
    const unpinned = remaining.filter((s) => !s.pinned);
    expect(unpinned.length).toBeLessThanOrEqual(SNAPSHOT_RING_BUFFER);
  });
});

describe('db — fork parent-pointer correctness', () => {
  test('fork creates a snapshot whose parentSnapshotId points at the source', async () => {
    const source = makeSnapshot('source-xyz', 7);
    await saveSnapshot(source);
    const forked = await fork('source-xyz', { newId: 'fork-new-abc' });
    expect(forked.id).toBe('fork-new-abc');
    expect(forked.parentSnapshotId).toBe('source-xyz');
    expect(forked.source).toBe('fork');
    expect(forked.pinned).toBe(false);
    // Deep-clone: mutating the forked tree must NOT affect the source tree in IDB.
    forked.tree['index.html'].content = 'mutated';
    const refetched = await listSnapshots(POST_ID);
    const original = refetched.find((s) => s.id === 'source-xyz');
    expect(original?.tree['index.html'].content).toBe('turn-7');
  });
});

describe('db — asset put/get with [postDraftId, assetId] composite key', () => {
  test('round-trip preserves bytes under the composite key', async () => {
    const payload: AssetRecord = {
      postDraftId: POST_ID,
      assetId: 'asset-uuid-1',
      originalFilename: 'logo.png',
      mime: 'image/png',
      bytes: new Uint8Array([1, 2, 3, 4, 5]).buffer,
      createdAt: nowIso(),
    };
    await putAsset(payload);
    const loaded = await getAsset(POST_ID, 'asset-uuid-1');
    expect(loaded).not.toBeNull();
    expect(loaded?.originalFilename).toBe('logo.png');
    expect(new Uint8Array(loaded!.bytes)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  test('getAsset with wrong postDraftId returns null (composite key isolates tenants)', async () => {
    const payload: AssetRecord = {
      postDraftId: POST_ID,
      assetId: 'shared-id',
      originalFilename: 'a.png',
      mime: 'image/png',
      bytes: new Uint8Array([7]).buffer,
      createdAt: nowIso(),
    };
    await putAsset(payload);
    const otherDraftLookup = await getAsset('different-post', 'shared-id');
    expect(otherDraftLookup).toBeNull();
  });
});

describe('db — clearDraft wipes session + snapshots + assets for a draft', () => {
  test('after clearDraft the draft has no sessions, snapshots, or assets', async () => {
    await saveSession(makeSession());
    await saveSnapshot(makeSnapshot('s1', 0));
    await putAsset({
      postDraftId: POST_ID,
      assetId: 'a1',
      originalFilename: 'x.png',
      mime: 'image/png',
      bytes: new Uint8Array([0]).buffer,
      createdAt: nowIso(),
    });

    await clearDraft(POST_ID);

    expect(await loadSession(POST_ID)).toBeNull();
    expect(await listSnapshots(POST_ID)).toHaveLength(0);
    expect(await getAsset(POST_ID, 'a1')).toBeNull();
  });
});
