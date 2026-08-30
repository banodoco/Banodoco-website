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

assert.equal((html.match(/<[a-z][^>]*\bdata-src="/gi) ?? []).length, 133);
assert.equal((html.match(/<[a-z][^>]*\bdata-sym="/gi) ?? []).length, 11);
assert.match(html, /data-src="chapters\.final\.nav">Purpose<\/span>/);
assert.match(html, /class="menu-no">1\.<\/span><span class="menu-name">Inspiring<\/span>/);
assert.match(html, /class="menu-no">2\.<\/span><span class="menu-name">Equipping<\/span>/);
assert.match(html, /class="menu-no">3\.<\/span><span class="menu-name">Connecting<\/span>/);
assert.match(html, /We’re working to help the open-source AI art ecosystem thrive<\/span>/);
assert.match(html, /The open source ecosystem can accelerate a second renaissance<\/span>/);
assert.doesNotMatch(html, /We’re creating a platform that help the community and agents accomplish together/);
assert.equal((html.match(/class="menu-row-link menu-teaser" aria-label="Coming soon"/g) ?? []).length, 2,
  'Equipping exposes exactly two concealed initiative teasers');
assert.equal((html.match(/<span class="menu-badge"[^>]*>Soon<\/span>/g) ?? []).length, 4,
  '2RP, two Equipping teasers and Manifesto each have one Soon badge');
assert.match(html, /class="menu-dot-disc"[\s\S]*>Manifesto<\/span><span class="menu-is">Action at a pivotal moment<\/span><span class="menu-badge">Soon<\/span>/);
assert.match(html, />Ownership<\/span><span class="menu-is">equity rewards collaboration<\/span>/);
assert.match(html, /href="https:\/\/arcagidan\.com\/"[\s\S]*?<span class="menu-ia" aria-hidden="true">↗<\/span>/);
assert.match(html, /href="#\/owned"[\s\S]*?<span class="menu-ia" aria-hidden="true">→<\/span>/);
const inspireMenu = html.match(/data-menu-section="inspire"[\s\S]*?<ul class="menu-sub">([\s\S]*?)<\/ul>/)?.[1];
assert.ok(inspireMenu, 'the static Inspire menu exists');
assert.ok(
  inspireMenu.indexOf('nodes.arca.label') < inspireMenu.indexOf('nodes.tworp.label')
    && inspireMenu.indexOf('nodes.tworp.label') < inspireMenu.indexOf('nodes.artcompute.label'),
  'the static Inspire menu reads Arca Gidan, 2RP, ArtCompute',
);
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
console.log('static content semantics OK (real HTML, native routes, bindings, links, symbols, accessibility landmarks)');
