#!/usr/bin/env node
// tools/check-cycles.mjs
//
// Drives madge's Node API directly (instead of shelling out to its CLI, the
// way `npm run cycles` used to) so this script can do two things the stock
// CLI cannot:
//
//   1. Explicitly classify every entry madge reports as "skipped" (i.e.
//      unresolved) into one of two buckets:
//        - a DECLARED_EXTERNALS entry: a known third-party npm package
//          referenced by a bare specifier, expected to be excluded from
//          local dependency analysis.
//        - anything else: an unresolved LOCAL production import, which is a
//          real hole in the dependency graph -- part of the codebase went
//          unanalyzed for cycles.
//
//   2. FAIL LOUDLY: exit non-zero if any unresolved local root remains. The
//      stock `madge --warning` CLI only *prints* skipped files; it never
//      affects the exit code, so a real analysis hole can sit there
//      indefinitely while `npm run cycles` keeps reporting success.
//
// The query-suffix normalization that lets organism/organism.js (imported
// via a cache-busting `?v=...` specifier from main.js) resolve at all lives
// in madge.webpack.cjs (see StripQuerySuffixPlugin there), not here -- this
// script only classifies whatever madge still could not resolve after that
// normalization runs.
//
// The core logic below (classifySkipped, runCycleCheck) is exported so
// tools/test-check-cycles.mjs can exercise it directly -- including a
// negative test against an out-of-repo fixture -- without shelling out to
// this file as a subprocess for every case.

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import madge from 'madge';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Same roots the old CLI invocation covered:
//   madge --circular --warning --extensions js,mjs \
//     --webpack-config madge.webpack.cjs \
//     main.js journey organism ownership content tools
const SRC_ROOTS = ['main.js', 'journey', 'organism', 'ownership', 'content', 'tools'];

// Bare (non-relative, non-absolute) import specifiers that are genuine
// third-party npm dependencies, not local production code, and therefore
// expected to show up as "skipped" (madge never bundles node_modules by
// default). Add a name here ONLY when it is a real npm package -- this set
// is matched by exact bare-specifier string, so it can never accidentally
// swallow a local path.
export const DECLARED_EXTERNALS = new Set([
  // tools/browser-smoke.mjs imports `playwright-core` directly; it's a
  // devDependency (see package.json), not part of the analyzed source tree.
  'playwright-core',
  // This script itself (tools/check-cycles.mjs) imports the `madge`
  // devDependency directly to drive its Node API.
  'madge',
  // tools/test-portrait-remix.mjs imports the `espree` parser to census
  // portrait-remix.js's mutators by AST; it is a devDependency (ESLint's own
  // parser, already in node_modules), not part of the analyzed source tree.
  'espree',
]);

/**
 * Strip a possible `?query` / `#fragment` suffix the same way a resolver
 * would, so classification is robust to future values (not just today's
 * exact strings).
 * @param {string} entry
 * @returns {string}
 */
export function stripSuffix(entry) {
  return entry.split('?')[0].split('#')[0];
}

/**
 * A "bare" specifier is a package-style import (e.g. `playwright-core`,
 * `@scope/pkg`) as opposed to a relative (`./x`) or absolute (`/x`) local
 * path. Local production imports in this codebase are always relative, so
 * any bare specifier in the skipped list is, by construction, either a
 * declared external or an unexpected/unclassified bare import -- never a
 * local production root.
 * @param {string} entry
 * @returns {boolean}
 */
export function isBareSpecifier(entry) {
  const clean = stripSuffix(entry);
  return clean.length > 0 && !clean.startsWith('.') && !clean.startsWith('/') && !path.isAbsolute(clean);
}

export function pluralize(word, count) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/**
 * Partition madge's raw `warnings().skipped` list into declared externals
 * vs. unresolved local roots.
 * @param {string[]} skipped
 * @param {Set<string>} declaredExternals
 * @returns {{ declaredExternals: string[], unresolvedLocalRoots: string[] }}
 */
export function classifySkipped(skipped, declaredExternals = DECLARED_EXTERNALS) {
  const declared = [];
  const unresolved = [];

  for (const entry of skipped) {
    if (isBareSpecifier(entry) && declaredExternals.has(stripSuffix(entry))) {
      declared.push(entry);
    } else {
      unresolved.push(entry);
    }
  }

  return { declaredExternals: declared, unresolvedLocalRoots: unresolved };
}

/**
 * Run madge over the given roots/config and return a plain-data result --
 * no console output, no process.exit -- so callers (the CLI entrypoint
 * below, or a test) can decide what to do with it.
 * @param {Object} options
 * @param {string[]} options.srcRoots
 * @param {string} options.baseDir
 * @param {string} [options.webpackConfig]
 * @param {Set<string>} [options.declaredExternals]
 * @returns {Promise<{fileCount: number, elapsedMs: number, circular: string[][], declaredExternals: string[], unresolvedLocalRoots: string[], exitCode: number}>}
 */
export async function runCycleCheck({ srcRoots, baseDir, webpackConfig, declaredExternals = DECLARED_EXTERNALS }) {
  const startTime = Date.now();

  const madgeConfig = { baseDir, fileExtensions: ['js', 'mjs'] };
  if (webpackConfig) {
    madgeConfig.webpackConfig = webpackConfig;
  }

  const res = await madge(srcRoots, madgeConfig);

  const fileCount = Object.keys(res.obj()).length;
  const elapsedMs = Date.now() - startTime;
  const skipped = res.warnings().skipped;
  const circular = res.circular();

  const { declaredExternals: declared, unresolvedLocalRoots } = classifySkipped(skipped, declaredExternals);

  const exitCode = circular.length || unresolvedLocalRoots.length ? 1 : 0;

  return {
    fileCount,
    elapsedMs,
    skipped,
    circular,
    declaredExternals: declared,
    unresolvedLocalRoots,
    exitCode,
  };
}

function report(result) {
  const { fileCount, elapsedMs, skipped, circular, declaredExternals, unresolvedLocalRoots } = result;

  console.log(
    `Processed ${pluralize('file', fileCount)} (${elapsedMs}ms)` +
      (skipped.length ? ` (${pluralize('warning', skipped.length)})` : '')
  );
  console.log('');

  if (circular.length) {
    console.log(`✖ Found ${pluralize('circular dependency', circular.length)}!\n`);
    circular.forEach((cyclePath, idx) => {
      console.log(`${idx + 1}) ${cyclePath.join(' > ')}`);
    });
  } else {
    console.log('✔ No circular dependency found!');
  }

  if (declaredExternals.length) {
    console.log(`\nℹ Declared externals (expected -- not analyzed, ${declaredExternals.length}):\n`);
    declaredExternals.forEach((entry) => console.log(entry));
  }

  if (unresolvedLocalRoots.length) {
    console.log(
      `\n✖ Skipped ${pluralize('local file', unresolvedLocalRoots.length)} (UNRESOLVED -- dependency-analysis hole):\n`
    );
    unresolvedLocalRoots.forEach((entry) => console.log(entry));
    console.log(
      '\nmadge could not resolve one or more local production imports, so their subtrees ' +
        'were silently excluded from cycle analysis. Fix the import, or teach ' +
        'madge.webpack.cjs\'s resolver about it -- only add an entry to DECLARED_EXTERNALS ' +
        'in tools/check-cycles.mjs when it is genuinely a third-party package.'
    );
  }

  console.log('');
}

async function main() {
  const result = await runCycleCheck({
    srcRoots: SRC_ROOTS,
    baseDir: ROOT,
    webpackConfig: path.join(ROOT, 'madge.webpack.cjs'),
  });

  report(result);
  process.exitCode = result.exitCode;
}

const isDirectlyExecuted = path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url);

if (isDirectlyExecuted) {
  main().catch((err) => {
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
}
