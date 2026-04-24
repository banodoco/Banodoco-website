import { describe, expect, test, vi } from 'vitest';
import { zipSync } from 'fflate';
import { toZipBlob, VIBE_MAX_FILE_BYTES, writeBinaryAsset, writeFile, type AssetBlobLookup } from './virtualFileTree';
import { importZipToTree } from './zipImport';

describe('importZipToTree', () => {
  test('round-trips a small tree exported through toZipBlob', async () => {
    let tree = {};
    const indexWrite = writeFile(tree, 'index.html', '<!doctype html><html><body>Hello</body></html>');
    expect(indexWrite.ok).toBe(true);
    tree = indexWrite.ok ? indexWrite.tree : tree;
    const postWrite = writeFile(
      tree,
      'post.json',
      JSON.stringify(
        {
          schemaVersion: 1,
          title: 'Zip Import Test',
          entry: 'index.html',
          layout: { mode: 'inline-auto', minHeight: 420, maxHeight: 1600 },
        },
        null,
        2,
      ),
      { mime: 'application/json; charset=utf-8' },
    );
    expect(postWrite.ok).toBe(true);
    tree = postWrite.ok ? postWrite.tree : tree;
    const assetWrite = writeBinaryAsset(tree, 'assets/logo.png', 'asset-source', 'image/png');
    expect(assetWrite.ok).toBe(true);
    tree = assetWrite.ok ? assetWrite.tree : tree;

    const readAsset: AssetBlobLookup = vi.fn(async (assetId: string) => {
      if (assetId !== 'asset-source') return null;
      return {
        bytes: new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]),
        originalFilename: 'logo.png',
      };
    });

    const blob = await toZipBlob(tree, readAsset);
    const putAsset = vi.fn(async () => {});
    const result = await importZipToTree({
      zipBytes: await blob.arrayBuffer(),
      postId: 'post-draft-1',
      putAsset,
    });

    expect(Object.keys(result.tree).sort()).toEqual(['assets/logo.png', 'index.html', 'post.json']);
    expect(result.tree['index.html']).toMatchObject({
      kind: 'text',
      mime: 'text/html; charset=utf-8',
      content: '<!doctype html><html><body>Hello</body></html>',
    });
    expect(result.tree['post.json']).toMatchObject({
      kind: 'text',
      mime: 'application/json; charset=utf-8',
    });
    expect(result.tree['assets/logo.png']).toMatchObject({
      kind: 'binary-asset',
      mime: 'image/png',
    });
    expect(result.tree['assets/logo.png']?.assetId).toEqual(expect.any(String));
    expect(putAsset).toHaveBeenCalledTimes(1);
    expect(putAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        postDraftId: 'post-draft-1',
        originalFilename: 'logo.png',
        mime: 'image/png',
        bytes: new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]),
      }),
    );
    expect(result.warnings).toEqual([]);
  });

  test('rejects path traversal entries with a warning', async () => {
    const result = await importZipToTree({
      zipBytes: zipSync({ '../foo.html': new TextEncoder().encode('bad') }),
      postId: 'post-draft-1',
      putAsset: vi.fn(async () => {}),
    });

    expect(result.tree).toEqual({});
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('path may not contain empty, "." or ".." segments')]),
    );
  });

  test('rejects disallowed extensions with a warning', async () => {
    const result = await importZipToTree({
      zipBytes: zipSync({ 'virus.exe': new TextEncoder().encode('bad') }),
      postId: 'post-draft-1',
      putAsset: vi.fn(async () => {}),
    });

    expect(result.tree).toEqual({});
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('extension .exe is not allowed')]),
    );
  });

  test('rejects oversized entries with a warning', async () => {
    const result = await importZipToTree({
      zipBytes: zipSync({ 'big.html': new Uint8Array(VIBE_MAX_FILE_BYTES + 1) }),
      postId: 'post-draft-1',
      putAsset: vi.fn(async () => {}),
    });

    expect(result.tree).toEqual({});
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining(`exceeds ${VIBE_MAX_FILE_BYTES} bytes`)]),
    );
  });
});
