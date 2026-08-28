#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT } from '../content/content.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = spawnSync(process.execPath, ['tools/build-static-content.mjs', '--check'], {
  cwd: root,
  encoding: 'utf8',
});
assert.equal(check.status, 0, `${check.stdout}${check.stderr}`);

const html = await readFile(resolve(root, 'static/index.html'), 'utf8');
assert.match(html, /^<!DOCTYPE html>\n<html lang="en">/);
assert.match(html, /<a class="skip" href="#main">Skip to content<\/a>/);
assert.match(html, /<main id="main">/);
assert.equal((html.match(/<section class="chapter"/g) ?? []).length, 5);
assert.equal((html.match(/<[a-z][^>]*\bdata-src="/gi) ?? []).length, 131);
assert.equal((html.match(/<[a-z][^>]*\bdata-sym="/gi) ?? []).length, 11);
assert.match(html, /data-src="chapters\.final\.nav">Purpose<\/span>/);
assert.doesNotMatch(html, />Epilogue<\//);
assert.doesNotMatch(html, />Outro<\//);
assert.deepEqual(
  CONTENT.chapters.final.actions.map(({ label, sub, glyph, weight }) => ({ label, sub, glyph, weight })),
  [],
  'Purpose content no longer duplicates the navigator subtree Ownership control',
);
assert.doesNotMatch(html, /data-action="final-ownership"/,
  'the retired Purpose Ownership CTA is absent from static output');
const uncommented = html.replace(/<!--[\s\S]*?-->/g, '');
assert.doesNotMatch(uncommented, /<canvas\b/i);
assert.match(html, /<button class="node-t"[^>]+aria-expanded="true"[^>]+aria-controls=/);
assert.match(html, /<ul class="contributors" aria-labelledby="h-contributors">/);
assert.match(html, /<script type="module">[\s\S]*import \{ CONTENT \}/);
assert.match(html, /document\.documentElement\.classList\.add\('static-js'\)/);
assert.match(html, /\.chapter\.is-current \{ display: flex; \}/);
assert.match(html, /Use the navigation buttons to move between sections\./);
assert.match(html, /addEventListener\('wheel',[\s\S]*passive: false/);
assert.doesNotMatch(uncommented, /scrollIntoView\s*\(/);
assert.doesNotMatch(uncommented, /\bIntersectionObserver\b/);
assert.doesNotMatch(uncommented, /addEventListener\(['"]scroll['"]/);
console.log('static content semantics OK (real HTML, bindings, links, symbols, accessibility landmarks)');
