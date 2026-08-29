#!/usr/bin/env node

/** Derive the no-JavaScript tier's authored content from content/content.js. */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT } from '../content/content.js';
import { JOURNEY_CHAPTER_IDS } from '../journey/structure.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'static/index.html');
const CHECK = process.argv.includes('--check');

const contentChapterIds = Object.keys(CONTENT.chapters);
if (JSON.stringify(contentChapterIds) !== JSON.stringify(JOURNEY_CHAPTER_IDS)) {
  throw new Error('content chapters must match the canonical journey chapter order');
}

function valueAt(path) {
  let value = CONTENT;
  for (const key of path.split('.')) {
    value = Array.isArray(value) ? value[Number(key)] : value?.[key];
  }
  if (typeof value !== 'string') {
    throw new Error(`${path} does not resolve to a string in content/content.js`);
  }
  return value;
}

const escapeText = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');
const escapeAttribute = (value) => escapeText(value).replaceAll('"', '&quot;');

function derive(source) {
  const bindings = [...source.matchAll(/<[a-z][^>]*\bdata-src="([^"]+)"[^>]*>/gi)];
  let textCount = 0;
  let output = source.replace(
    /(<([a-z][\w:-]*)\b[^>]*\bdata-src="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/gi,
    (_match, open, _tag, path, _oldText, close) => {
      textCount += 1;
      return `${open}${escapeText(valueAt(path))}${close}`;
    },
  );
  if (textCount !== bindings.length) {
    throw new Error(`updated ${textCount} text bindings but found ${bindings.length}; data-src elements must contain text only`);
  }

  // A content label inside an anchor owns that anchor's destination. This
  // covers both direct CTA labels and the visually-hidden social labels.
  let linkCount = 0;
  const bindAnchor = (anchor, path) => {
    const href = valueAt(path.replace(/\.label$/, '.href'));
    if (!/\bhref="[^"]*"/.test(anchor)) throw new Error(`${path} is on an anchor without href`);
    linkCount += 1;
    return anchor.replace(/\bhref="[^"]*"/, `href="${escapeAttribute(href)}"`);
  };
  // CTA labels carry data-src on the anchor itself.
  output = output.replace(/<a\b[^>]*\bdata-src="([^"]+\.label)"[^>]*>/gi,
    (anchor, path) => bindAnchor(anchor, path));
  // Icon-only social links carry their canonical label in a hidden child.
  output = output.replace(/<a\b([^>]*)>((?:(?!<\/a>)[\s\S])*?<span\b[^>]*\bdata-src="(site\.social\.\d+\.label)"[^>]*>[^<]*<\/span>)<\/a>/gi,
    (anchor, _attributes, _body, path) => {
      const text = escapeAttribute(valueAt(path));
      return bindAnchor(anchor, path)
        .replace(/\baria-label="[^"]*"/, `aria-label="${text}"`)
        .replace(/\btitle="[^"]*"/, `title="${text}"`);
    });

  // A `#/chapter` URL has the native fragment `/chapter`. Make the existing
  // focusable section that target, deriving both the IDs and the enhancement
  // router's chapter order from the canonical navigation schema.
  const sectionChapters = [];
  output = output.replace(/<section\b[^>]*>/gi, (section) => {
    const className = /\bclass="([^"]*)"/i.exec(section)?.[1] || '';
    if (!className.split(/\s+/).includes('chapter')) return section;
    const chapter = /\bdata-chapter="([^"]+)"/i.exec(section)?.[1];
    if (!chapter || !JOURNEY_CHAPTER_IDS.includes(chapter)) {
      throw new Error(`static chapter is missing from journey schema: ${chapter || '<empty>'}`);
    }
    if (sectionChapters.includes(chapter)) throw new Error(`duplicate static chapter: ${chapter}`);
    if (!/\bid="[^"]*"/i.test(section)) throw new Error(`static chapter has no id: ${chapter}`);
    sectionChapters.push(chapter);
    return section.replace(/\bid="[^"]*"/i, `id="/${chapter}"`);
  });
  if (JSON.stringify(sectionChapters) !== JSON.stringify(JOURNEY_CHAPTER_IDS)) {
    throw new Error(`static chapter order must be ${JOURNEY_CHAPTER_IDS.join(', ')}`);
  }

  let routerChapterLists = 0;
  output = output.replace(/\bvar CHAPTERS = \[[^\n;]*\];/, () => {
    routerChapterLists += 1;
    return `var CHAPTERS = ${JSON.stringify(JOURNEY_CHAPTER_IDS)};`;
  });
  if (routerChapterLists !== 1) throw new Error('expected one static CHAPTERS declaration');

  return { output, textCount, linkCount, routeTargetCount: sectionChapters.length };
}

const source = await readFile(OUTPUT, 'utf8');
const result = derive(source);
if (CHECK) {
  if (result.output !== source) {
    console.error('static/index.html content drifted from content/content.js');
    console.error('run: node tools/build-static-content.mjs');
    process.exitCode = 1;
  } else {
    console.log(`static content OK (${result.textCount} text bindings, ${result.linkCount} link bindings, ${result.routeTargetCount} route targets)`);
  }
} else {
  const temporary = `${OUTPUT}.tmp`;
  await writeFile(temporary, result.output, 'utf8');
  await rename(temporary, OUTPUT);
  console.log(`generated static/index.html (${result.textCount} text bindings, ${result.linkCount} link bindings, ${result.routeTargetCount} route targets)`);
}
