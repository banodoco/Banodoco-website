import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { coverageDisposition } from './browser-smoke.mjs';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const root = dirname(toolsDir);
const script = join(toolsDir, 'browser-smoke.mjs');

assert.deepEqual(coverageDisposition('no WebGL', false), {
  gate: 'browser-smoke',
  status: 'fail',
  reason: 'no WebGL',
  optInSkip: false,
});
assert.equal(coverageDisposition('no WebGL', true).status, 'skip');

function run(allowSkip) {
  const env = {
    ...process.env,
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: '/definitely/missing/chromium',
  };
  delete env.BROWSER_SMOKE_ALLOW_SKIP;
  if (allowSkip) env.BROWSER_SMOKE_ALLOW_SKIP = '1';
  return spawnSync(process.execPath, [script], {
    cwd: root,
    env,
    encoding: 'utf8',
    timeout: 15_000,
  });
}

const denied = run(false);
assert.equal(denied.status, 1, denied.stderr || denied.stdout);
assert.match(denied.stdout, /BROWSER_SMOKE_RESULT \{"gate":"browser-smoke","status":"fail"/);

const allowed = run(true);
assert.equal(allowed.status, 0, allowed.stderr || allowed.stdout);
assert.match(allowed.stdout, /BROWSER_SMOKE_RESULT \{"gate":"browser-smoke","status":"skip"/);

console.log('gate browser-smoke tests passed');
