#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
assert.equal((html.match(/<[a-z][^>]*\bdata-src="/gi) ?? []).length, 135);
assert.equal((html.match(/<[a-z][^>]*\bdata-sym="/gi) ?? []).length, 11);
const uncommented = html.replace(/<!--[\s\S]*?-->/g, '');
assert.doesNotMatch(uncommented, /<canvas\b/i);
assert.match(html, /<button class="node-t"[^>]+aria-expanded="true"[^>]+aria-controls=/);
assert.match(html, /<ul class="contributors" aria-labelledby="h-contributors">/);
assert.match(html, /<script type="module">[\s\S]*import \{ CONTENT \}/);
console.log('static content semantics OK (real HTML, bindings, links, symbols, accessibility landmarks)');
