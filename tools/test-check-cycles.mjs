// tools/test-check-cycles.mjs
//
// Focused test for tools/check-cycles.mjs. Covers:
//   1. The pure classification helpers (isBareSpecifier / classifySkipped).
//   2. A NEGATIVE integration test proving the fail-on-skipped-local-root
//      assertion actually fires: an out-of-repo fixture with a genuinely
//      unresolvable local import (including a `?v=`-style query suffix, so
//      this also proves the query-stripping in madge.webpack.cjs does not
//      over-eagerly mask a real break) must make runCycleCheck report a
//      non-zero exitCode.
//   3. A POSITIVE integration test: a fixture where every import either
//      resolves or is declared external must report exitCode 0.
//
// The fixture directory is created under os.tmpdir() (outside the repo)
// and removed in a `finally`, so nothing is left behind regardless of
// pass/fail.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { classifySkipped, isBareSpecifier, runCycleCheck } from './check-cycles.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const REPO_WEBPACK_CONFIG = path.join(REPO_ROOT, 'madge.webpack.cjs');

// --- 1. Pure helper unit tests -------------------------------------------

assert.equal(isBareSpecifier('playwright-core'), true, 'a plain package name is a bare specifier');
assert.equal(isBareSpecifier('@scope/pkg'), true, 'a scoped package name is a bare specifier');
assert.equal(isBareSpecifier('./local.js'), false, 'a relative import is not a bare specifier');
assert.equal(isBareSpecifier('../local.js'), false, 'a parent-relative import is not a bare specifier');
assert.equal(isBareSpecifier('/abs/local.js'), false, 'an absolute path is not a bare specifier');
assert.equal(
  isBareSpecifier('playwright-core?x=1'),
  true,
  'a query suffix on a bare specifier does not change its classification'
);

{
  const { declaredExternals, unresolvedLocalRoots } = classifySkipped(
    ['./organism/organism.js?v=123', 'playwright-core', 'left-pad'],
    new Set(['playwright-core'])
  );
  assert.deepEqual(declaredExternals, ['playwright-core'], 'only the declared name is classified external');
  assert.deepEqual(
    unresolvedLocalRoots,
    ['./organism/organism.js?v=123', 'left-pad'],
    'a relative path AND an undeclared bare specifier both count as unresolved -- ' +
      'an unlisted npm package must not be silently accepted'
  );
}

console.log('check-cycles classification helpers: PASS');

// --- 2 & 3. Integration tests against an out-of-repo fixture -------------

async function withFixture(files, fn) {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-cycles-fixture-'));
  try {
    for (const [relPath, contents] of Object.entries(files)) {
      const fullPath = path.join(fixtureDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, contents);
    }
    return await fn(fixtureDir);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
}

async function testNegativeUnresolvedLocalRoot() {
  await withFixture(
    {
      'entry.js': [
        "import { helper } from './helper.js';",
        // Deliberately unresolvable -- no helper2.js exists in this fixture,
        // AND it carries a `?v=`-style cache-bust suffix, so this also
        // proves query-stripping doesn't mask a genuinely missing file.
        "import { missing } from './helper2.js?v=999';",
        'console.log(helper);',
      ].join('\n'),
      'helper.js': 'export const helper = 1;\n',
    },
    async (fixtureDir) => {
      const result = await runCycleCheck({
        srcRoots: [path.join(fixtureDir, 'entry.js')],
        baseDir: fixtureDir,
        webpackConfig: REPO_WEBPACK_CONFIG,
      });

      assert.equal(result.exitCode, 1, 'a fixture with an unresolvable local import must exit non-zero');
      assert.equal(
        result.unresolvedLocalRoots.length,
        1,
        'exactly the one genuinely-broken import must be flagged as an unresolved local root'
      );
      assert.match(
        result.unresolvedLocalRoots[0],
        /helper2\.js/,
        'the reported entry must identify the broken import'
      );
      assert.deepEqual(result.declaredExternals, [], 'no declared externals expected in this fixture');
    }
  );

  console.log('check-cycles negative test (unresolved local root -> non-zero exit): PASS');
}

async function testPositiveResolvedAndDeclaredExternal() {
  await withFixture(
    {
      'entry.js': [
        "import { helper } from './helper.js';",
        // A bare specifier that is NOT installed anywhere -- but IS declared
        // external for this test run, so it must not fail the check.
        "import totallyFakePkg from 'totally-fake-pkg-for-test';",
        'console.log(helper, totallyFakePkg);',
      ].join('\n'),
      'helper.js': "import './nested/leaf.js';\nexport const helper = 1;\n",
      'nested/leaf.js': 'export const leaf = 1;\n',
    },
    async (fixtureDir) => {
      const result = await runCycleCheck({
        srcRoots: [path.join(fixtureDir, 'entry.js')],
        baseDir: fixtureDir,
        webpackConfig: REPO_WEBPACK_CONFIG,
        declaredExternals: new Set(['totally-fake-pkg-for-test']),
      });

      assert.equal(result.exitCode, 0, 'a fixture where every import resolves or is declared external must pass');
      assert.equal(result.unresolvedLocalRoots.length, 0, 'no unresolved local roots expected');
      assert.deepEqual(result.declaredExternals, ['totally-fake-pkg-for-test']);
      assert.equal(result.circular.length, 0);
      // helper.js's nested/leaf.js import proves transitive resolution
      // (and thus cycle-detection reach) works through the fixture too.
      assert.ok(result.fileCount >= 3, 'entry.js, helper.js, and nested/leaf.js must all be in the graph');
    }
  );

  console.log('check-cycles positive test (resolved + declared external -> zero exit): PASS');
}

await testNegativeUnresolvedLocalRoot();
await testPositiveResolvedAndDeclaredExternal();

console.log('check-cycles: ALL TESTS PASS');
process.exitCode = 0;
