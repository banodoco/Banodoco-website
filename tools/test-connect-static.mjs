#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = resolve(root, 'connect/index.html');
const flowPath = resolve(root, 'connect/auth-flow.js');
const manifestPath = resolve(root, 'deploy/public-files.json');
const page = await readFile(pagePath, 'utf8');
const flow = await readFile(flowPath, 'utf8');
const source = `${page}\n${flow}`;
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const connectTree = manifest.trees.find((tree) => tree.path === 'connect');
assert.deepEqual(connectTree?.include, ['*.html', '*.css', '*.js'], 'connect is an explicit static tree');
assert.ok(connectTree && !connectTree.exclude, 'connect has no package escape hatch');
assert.match(page, /<title>Connect a machine/);
assert.match(page, /type="module"/);
assert.match(page, /sessionStorage\.getItem\(CONTEXT_KEY\)/);
assert.match(page, /sessionStorage\.setItem\(CONTEXT_KEY/);
assert.match(source, /machine_label/);
assert.match(source, /approval_code/);
assert.match(source, /\/functions\/v1\/contributor-auth/);
assert.match(source, /\/auth\/v1\/authorize/);
assert.match(source, /\/auth\/v1\/token\?grant_type=pkce/);
assert.match(source, /mode: 'cors'/);
assert.match(source, /credentials: 'omit'/);
assert.match(source, /code_challenge_method/);
assert.match(flow, /Supabase Auth owns the provider-facing OAuth state/);
assert.match(source, /code_verifier/);
assert.match(page, /method: 'POST'/);
assert.match(page, /approvalBody\(context\.requestToken, context\.approvalCode\)/);
assert.match(page, /elements\.action\.addEventListener\('click'/);
assert.match(page, /await approve\(\)/);
assert.match(page, /return to your terminal/);
assert.match(page, /__BANODOCO_CONNECT_CONFIG__/);
assert.match(page, /sb_publishable_/);
assert.doesNotMatch(page, /broker contract is not present|unavailable broker|unimplemented broker/i);
assert.doesNotMatch(page, /https:\/\/cdn\.|unpkg\.com|jsdelivr\.net/);
assert.doesNotMatch(page, /service_role|sb_secret|contributor[_-]?key|private[_-]?key/i);
assert.doesNotMatch(page, /console\.(log|info|debug|dir)\s*\(/);
assert.match(source, /callbackPath: '\/connect\/'/);
assert.match(source, /state did not match this request/);
assert.match(flow, /request_token: requestToken/);
assert.match(flow, /approval_code: approvalCode/);
assert.match(flow, /credentials: 'omit'/);
assert.doesNotMatch(flow, /service_role|sb_secret|contributor[_-]?key|private[_-]?key/i);

const output = await mkdtemp(resolve(tmpdir(), 'banodoco-connect-package-'));
try {
  const packaged = spawnSync('python3', [
    'tools/package-public.py', output,
    '--origin', 'https://www.banodoco.ai',
    '--revision', 'connect-static-test',
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(packaged.status, 0, `${packaged.stdout}\n${packaged.stderr}`);
  const packagedPage = await readFile(resolve(output, 'connect/index.html'), 'utf8');
  assert.equal(packagedPage, page, 'connect page is byte-identical in the public artifact');
} finally {
  await rm(output, { recursive: true, force: true });
}

console.log('connect static seam and public packaging OK');
