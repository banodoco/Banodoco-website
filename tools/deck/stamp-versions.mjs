#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [outputArg, versionArg, baseArg] = process.argv.slice(2);
if (!outputArg || process.argv.length !== 5) {
  console.error('Usage: node tools/deck/stamp-versions.mjs <site-copy> <short-commit-hash> <site-base-url>');
  process.exit(2);
}

const output = path.resolve(outputArg);
const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (output === sourceRoot) {
  console.error('Refusing to stamp the working source tree; pass a publish copy.');
  process.exit(2);
}
const version = versionArg;
if (!version || !/^[0-9a-f]{4,40}$/i.test(version)) {
  console.error('Provide a short commit hash (4–40 hexadecimal characters).');
  process.exit(2);
}
let baseUrl;
try {
  baseUrl = new URL(baseArg);
  if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('Use an HTTP(S) URL.');
  if (!baseUrl.pathname.endsWith('/')) baseUrl.pathname += '/';
} catch (error) {
  console.error(`Provide a valid site base URL, for example https://banodoco.github.io/Banodoco-website/: ${error.message}`);
  process.exit(2);
}
const ogImageUrl = new URL(`mycelial/mycelial-og.jpg?v=${version}`, baseUrl).href;

const allowed = /\.(?:js|mjs|css|png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mov|woff2?|ttf|otf|eot)$/i;

function stamp(raw, relativeFile) {
  if (!raw || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(raw)) return raw;

  const hashAt = raw.indexOf('#');
  const fragment = hashAt < 0 ? '' : raw.slice(hashAt);
  const beforeFragment = hashAt < 0 ? raw : raw.slice(0, hashAt);
  const queryAt = beforeFragment.indexOf('?');
  const pathname = queryAt < 0 ? beforeFragment : beforeFragment.slice(0, queryAt);
  const query = queryAt < 0 ? '' : beforeFragment.slice(queryAt + 1);
  if (!pathname || !allowed.test(pathname)) return raw;

  let sitePath;
  if (pathname.startsWith('/')) sitePath = pathname.slice(1);
  else sitePath = path.posix.normalize(path.posix.join(path.posix.dirname(relativeFile), pathname));
  if (!(sitePath.startsWith('assets/') || sitePath.startsWith('mycelial/'))) return raw;

  const params = new URLSearchParams(query);
  params.set('v', version);
  const nextQuery = params.toString();
  return `${pathname}?${nextQuery}${fragment}`;
}

function rewriteSrcset(value, relativeFile) {
  return value.split(',').map((candidate) => {
    const match = candidate.match(/^(\s*)(\S+)([\s\S]*)$/);
    return match ? `${match[1]}${stamp(match[2], relativeFile)}${match[3]}` : candidate;
  }).join(',');
}

function rewrite(text, relativeFile, extension) {
  let result = text;
  if (/\.html?$/i.test(extension)) {
    if (relativeFile === 'mycelial/index.html') {
      let replaced = false;
      result = result.replace(/(<meta\s+property=["']og:image["']\s+content=["'])[^"']*(["'])/i, (_all, before, after) => {
        replaced = true;
        return `${before}${ogImageUrl}${after}`;
      });
      if (!replaced) throw new Error('Failed to set the Open Graph image URL in mycelial/index.html.');
    }
    result = result.replace(/(\b(?:src|href|poster|srcset)\s*=\s*)(["'])(.*?)\2/gi, (_all, prefix, quote, value) => {
      const next = /\bsrcset\s*=/i.test(prefix) ? rewriteSrcset(value, relativeFile) : stamp(value, relativeFile);
      return `${prefix}${quote}${next}${quote}`;
    });
    result = result.replace(/(\bstyle\s*=\s*)(["'])(.*?)\2/gi, (_all, prefix, quote, value) =>
      `${prefix}${quote}${rewriteCssUrls(value, relativeFile)}${quote}`);
    result = result.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (_all, open, css, close) =>
      `${open}${rewriteCssUrls(css, relativeFile)}${close}`);
  }
  if (/\.css$/i.test(extension)) result = rewriteCssUrls(result, relativeFile);

  if (/\.(?:js|mjs)$/i.test(extension)) {
    // In JS, only inspect quoted/template strings. This catches paths embedded
    // in generated HTML/CSS without treating canvas methods such as moveTo as URLs.
    result = result.replace(/(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g, (whole, quote, value) => {
      const localPath = /(?:\.\.\/|\.\/|\/)[^\s"'<>`()]+\.(?:js|mjs|css|png|jpe?g|gif|webp|avif|svg|ico|mp4|webm|mov|woff2?|ttf|otf|eot)(?:\?[^\s"'<>`()]+)?/gi;
      const next = value.replace(localPath, (url) => {
        const trailing = url.match(/[),.;]+$/)?.[0] ?? '';
        return stamp(url.slice(0, url.length - trailing.length), relativeFile) + trailing;
      });
      return `${quote}${next}${quote}`;
    });
  }
  return result;
}

function rewriteCssUrls(text, relativeFile) {
  return text.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (_all, quote, value) =>
    `url(${quote}${stamp(value, relativeFile)}${quote})`);
}

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(absolute));
    else if (entry.isFile() && /\.(?:html?|js|mjs|css)$/i.test(entry.name)) files.push(absolute);
  }
  return files;
}

const deckDirectory = path.join(output, 'mycelial');
const files = await filesUnder(deckDirectory);
let changed = 0;
for (const file of files) {
  const relativeFile = path.relative(output, file).split(path.sep).join('/');
  const before = await readFile(file, 'utf8');
  const after = rewrite(before, relativeFile, path.extname(file));
  if (before !== after) {
    await writeFile(file, after);
    changed++;
  }
}
console.log(`Stamped ${changed} of ${files.length} deck files with v=${version}.`);
