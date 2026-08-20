#!/usr/bin/env node

/** Derive the no-JavaScript tier's authored content from content/content.js. */
import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONTENT } from '../content/content.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'static/index.html');
const CHECK = process.argv.includes('--check');

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
  return { output, textCount, linkCount };
}

const source = await readFile(OUTPUT, 'utf8');
const result = derive(source);
if (CHECK) {
  if (result.output !== source) {
    console.error('static/index.html content drifted from content/content.js');
    console.error('run: node tools/build-static-content.mjs');
    process.exitCode = 1;
  } else {
    console.log(`static content OK (${result.textCount} text bindings, ${result.linkCount} link bindings)`);
  }
} else {
  const temporary = `${OUTPUT}.tmp`;
  await writeFile(temporary, result.output, 'utf8');
  await rename(temporary, OUTPUT);
  console.log(`generated static/index.html (${result.textCount} text bindings, ${result.linkCount} link bindings)`);
}
