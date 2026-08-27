// C03a — the determinism proof. A baseline that is not reproducible is not
// a baseline.
//
//   node tools/test-render-determinism.mjs
//
// Three things are proved:
//   D1  the report generator, run three times IN THE SAME PROCESS, produces
//       byte-identical text;
//   D2  the report generator, run twice in SEPARATE Node processes, produces
//       byte-identical text (which catches anything that would vary with
//       module-load order, GC, or a fresh V8);
//   D3  the payload contains no wall-clock time, no absolute path and no
//       process-specific value — the three things that usually make a report
//       look reproducible in one session and drift in the next.
//
// D2 shells out to `node tools/render-report-generate.mjs`, which reads only.
// No server, no browser, nothing written outside the OS temp directory.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport, canonical, sha256 } from './render-report-lib.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));

let pass = 0;
let fail = 0;
const failures = [];

function check(id, what, ok, detail) {
  if (ok) { pass++; console.log(`  PASS  ${id}  ${what}${detail ? '  — ' + detail : ''}`); return; }
  fail++;
  failures.push(`${id}  ${what}${detail ? '  — ' + detail : ''}`);
  console.log(`  FAIL  ${id}  ${what}${detail ? '  — ' + detail : ''}`);
}

console.log('\nD1 — three in-process runs');
const inProcess = [];
for (let i = 0; i < 3; i++) inProcess.push(canonical(await buildReport()));
const h1 = inProcess.map(sha256);
check('D1', 'three in-process reports are byte-identical',
  h1[0] === h1[1] && h1[1] === h1[2], h1[0].slice(0, 32) + '…');

console.log('\nD2 — two separate Node processes');
const tmp = mkdtempSync(join(tmpdir(), 'c03a-'));
try {
  const outs = [];
  for (const name of ['a.json', 'b.json']) {
    const p = join(tmp, name);
    execFileSync(process.execPath, [join(HERE, 'render-report-generate.mjs'), '--out', p], { stdio: 'ignore' });
    outs.push(readFileSync(p));
  }
  const h2 = outs.map(sha256);
  check('D2a', 'two out-of-process reports are byte-identical', h2[0] === h2[1], h2[0].slice(0, 32) + '…');
  check('D2b', 'and identical to the in-process report', h2[0] === h1[0],
    `in-process ${h1[0].slice(0, 16)}… / out-of-process ${h2[0].slice(0, 16)}…`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log('\nD3 — the payload carries nothing session-specific');
const text = inProcess[0];
check('D3a', 'no absolute path', !text.includes('/Users/') && !text.includes(HERE));
check('D3b', 'no ISO timestamp', !/"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text));
check('D3c', 'no epoch-millisecond literal', !/\b1[6-9]\d{11}\b/.test(text));
check('D3d', 'no process id or tmp path', !/\/(?:var|tmp)\/[A-Za-z0-9._-]*c03a-/.test(text));
check('D3e', 'keys are emitted in sorted order at the top level',
  JSON.stringify(Object.keys(JSON.parse(text))) === JSON.stringify(Object.keys(JSON.parse(text)).sort()));

console.log(`\n${pass + fail} determinism checks — ${pass} PASS, ${fail} FAIL`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  ' + f);
  process.exit(1);
}
