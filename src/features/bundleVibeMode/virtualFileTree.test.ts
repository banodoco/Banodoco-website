import { describe, expect, test } from 'vitest';
import {
  applyPatch,
  createTree,
  serializeForClaude,
  writeFile,
  writeBinaryAsset,
} from './virtualFileTree';
import type { VirtualFileTree } from '@/types/vibe';

const textFile = (tree: VirtualFileTree, path: string, content: string): VirtualFileTree => {
  const result = writeFile(tree, path, content);
  if (!result.ok) throw new Error(`writeFile fixture failed: ${result.error}`);
  return result.tree;
};

describe('virtualFileTree.applyPatch', () => {
  test('0-match returns {ok:false, matches:0}', () => {
    let tree = createTree();
    tree = textFile(tree, 'index.html', '<!doctype html><body>hello</body>');
    const result = applyPatch(tree, 'index.html', 'goodbye', 'farewell');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.matches).toBe(0);
      expect(result.error).toMatch(/did not match/i);
    }
  });

  test('1-match returns {ok:true, matches:1} and replaces text', () => {
    let tree = createTree();
    tree = textFile(tree, 'index.html', '<!doctype html><body>hello</body>');
    const result = applyPatch(tree, 'index.html', 'hello', 'world');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.matches).toBe(1);
      const file = result.tree['index.html'];
      expect(file.kind).toBe('text');
      expect(file.content).toBe('<!doctype html><body>world</body>');
    }
  });

  test('>1-match returns {ok:false, matches:N}', () => {
    let tree = createTree();
    tree = textFile(tree, 'index.html', 'foo bar foo bar foo');
    const result = applyPatch(tree, 'index.html', 'foo', 'baz');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.matches).toBe(3);
      expect(result.error).toMatch(/matched 3 occurrences/);
    }
  });
});

describe('virtualFileTree.writeFile', () => {
  test('overwrite replaces content for existing path', () => {
    let tree = createTree();
    tree = textFile(tree, 'index.html', 'first');
    tree = textFile(tree, 'index.html', 'second');
    expect(tree['index.html'].content).toBe('second');
  });

  test('new path creates a fresh entry with inferred mime', () => {
    let tree = createTree();
    tree = textFile(tree, 'styles.css', 'body { color: red; }');
    expect(tree['styles.css'].kind).toBe('text');
    expect(tree['styles.css'].mime).toMatch(/text\/css/);
  });

  test('path-guard rejects absolute path', () => {
    const tree = createTree();
    const result = writeFile(tree, '/etc/passwd', 'data');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/POSIX/);
  });

  test('path-guard rejects `..` traversal', () => {
    const tree = createTree();
    const result = writeFile(tree, 'foo/../bar.html', 'data');
    expect(result.ok).toBe(false);
  });

  test('path-guard rejects disallowed extension', () => {
    const tree = createTree();
    const result = writeFile(tree, 'virus.exe', 'data');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/extension/i);
  });
});

describe('virtualFileTree.serializeForClaude', () => {
  test('emits files in alphabetical path order', () => {
    let tree = createTree();
    tree = textFile(tree, 'z-last.html', '<z/>');
    tree = textFile(tree, 'a-first.html', '<a/>');
    tree = textFile(tree, 'm-middle.html', '<m/>');
    const xml = serializeForClaude(tree);
    const aIdx = xml.indexOf('a-first.html');
    const mIdx = xml.indexOf('m-middle.html');
    const zIdx = xml.indexOf('z-last.html');
    expect(aIdx).toBeGreaterThan(-1);
    expect(mIdx).toBeGreaterThan(aIdx);
    expect(zIdx).toBeGreaterThan(mIdx);
  });

  test('binary asset renders metadata-only XML shape with no blob bytes', () => {
    let tree = createTree();
    const write = writeBinaryAsset(tree, 'assets/logo.png', 'abc-123-uuid', 'image/png');
    if (!write.ok) throw new Error(`writeBinaryAsset fixture failed: ${write.error}`);
    tree = write.tree;
    const xml = serializeForClaude(tree);
    expect(xml).toContain(
      '<file path="assets/logo.png" encoding="binary-asset" ref="asset-abc-123-uuid"/>',
    );
    expect(xml).not.toContain('CDATA');
  });

  test('text file uses CDATA with escaped `]]>` payload', () => {
    let tree = createTree();
    tree = textFile(tree, 'index.html', 'evil ]]> payload');
    const xml = serializeForClaude(tree);
    expect(xml).toMatch(/<!\[CDATA\[evil \]\]\]\]><!\[CDATA\[> payload\]\]>/);
  });
});
