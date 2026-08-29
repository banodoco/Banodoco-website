#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT } from '../content/content.js';
import { JOURNEY_CHAPTER_IDS } from '../journey/structure.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = spawnSync(process.execPath, ['tools/build-static-content.mjs', '--check'], {
  cwd: root,
  encoding: 'utf8',
});
assert.equal(check.status, 0, `${check.stdout}${check.stderr}`);

const html = await readFile(resolve(root, 'static/index.html'), 'utf8');
const chapterIds = JOURNEY_CHAPTER_IDS;
assert.deepEqual(Object.keys(CONTENT.chapters), chapterIds);
assert.match(html, /^<!DOCTYPE html>\n<html lang="en" class="no-js">/);
assert.match(html, /html\.no-js \{ scroll-behavior: auto; \}/);
assert.match(html, /document\.documentElement\.classList\.remove\('no-js'\)/);
assert.match(html, /<a class="skip" href="#main">Skip to content<\/a>/);
assert.match(html, /<main id="main">/);
assert.equal((html.match(/<section class="chapter"/g) ?? []).length, 5);

const chapterSections = [...html.matchAll(/<section\b[^>]*\bclass="[^"]*\bchapter\b[^"]*"[^>]*>/gi)];
assert.deepEqual(
  chapterSections.map(([section]) => /\bdata-chapter="([^"]+)"/i.exec(section)?.[1]),
  chapterIds,
);
assert.deepEqual(
  chapterSections.map(([section]) => /\bid="([^"]+)"/i.exec(section)?.[1]),
  chapterIds.map((id) => `/${id}`),
);
assert.deepEqual(
  [...html.matchAll(/\bid="\/([^"]+)"/g)].map((match) => match[1]),
  chapterIds,
  'native chapter targets must be unique and exhaustive',
);
for (const [section] of chapterSections) {
  assert.match(section, /\btabindex="-1"/i, 'native route target must remain focusable');
}

const linkedChapterIds = new Set([...html.matchAll(/\bhref="#\/([^/"#]+)"/g)].map((match) => match[1]));
assert.deepEqual(linkedChapterIds, new Set(chapterIds));
assert.match(html, new RegExp(`var CHAPTERS = ${JSON.stringify(chapterIds).replaceAll('[', '\\[').replaceAll(']', '\\]')}`));
assert.match(html, /if \(CHAPTERS\.indexOf\(chapter\) < 0\) return \{ chapter: null, node: null, unknown: true \};/);
assert.match(html, /history\.replaceState\(null, '', '#\/mission'\)/);
assert.doesNotMatch(html, /\bid="\/unknown"/);

assert.equal((html.match(/<[a-z][^>]*\bdata-src="/gi) ?? []).length, 131);
assert.equal((html.match(/<[a-z][^>]*\bdata-sym="/gi) ?? []).length, 11);
const uncommented = html.replace(/<!--[\s\S]*?-->/g, '');
assert.doesNotMatch(uncommented, /<canvas\b/i);
assert.match(html, /<button class="node-t"[^>]+aria-expanded="true"[^>]+aria-controls=/);
assert.match(html, /<ul class="contributors" aria-labelledby="h-contributors">/);
assert.match(html, /<script type="module">[\s\S]*import \{ CONTENT \}/);
console.log('static content semantics OK (real HTML, native routes, bindings, links, symbols, accessibility landmarks)');
