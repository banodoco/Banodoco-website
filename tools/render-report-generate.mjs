// C03a — generate the deterministic rendering baseline report.
//
//   node tools/render-report-generate.mjs            # canonical JSON to stdout
//   node tools/render-report-generate.mjs --out FILE # …and to FILE
//
// The payload contains no wall-clock time and no absolute path, so two runs
// are byte-identical. That is proved by tools/test-render-determinism.mjs.
//
// This tool READS ONLY. It never regenerates a baked artifact, never starts a
// server, and never opens a browser.

import { writeFileSync } from 'node:fs';
import { buildReport, canonical } from './render-report-lib.mjs';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const out = outIdx === -1 ? null : args[outIdx + 1];

const text = canonical(await buildReport());
if (out) writeFileSync(out, text);
else process.stdout.write(text);
