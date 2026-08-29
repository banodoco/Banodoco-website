import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createIntroClock } from '../organism/intro-clock.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function javascriptFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await javascriptFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(path);
  }
  return files;
}

const runtimeFiles = [
  join(root, 'main.js'),
  ...await javascriptFiles(join(root, 'organism')),
  ...await javascriptFiles(join(root, 'journey')),
];
const forbiddenClockWrites = [
  /\bperformance\s*\.\s*now\s*=/,
  /\bperformance\s*\[\s*['"]now['"]\s*\]\s*=/,
  /\b(?:Object|Reflect)\s*\.\s*definePropert(?:y|ies)\s*\(\s*performance\b/,
  /\bObject\s*\.\s*assign\s*\(\s*performance\b/,
];
for (const file of runtimeFiles) {
  const source = await readFile(file, 'utf8');
  assert.ok(forbiddenClockWrites.every(pattern => !pattern.test(source)),
    `${relative(root, file)} must not replace or define performance.now`);
}

let wallMs = 1000;
const frames = [];
const nativePerformanceNow = performance.now;
const clock = createIntroClock({
  now: () => wallMs,
  requestFrame: callback => { frames.push(callback); },
});

assert.equal(clock.start(), true);
wallMs += 100;
assert.equal(clock.elapsedMs(), 100);
assert.equal(clock.accelerate({ totalMs: 8500, rampMs: 400 }), true);
assert.equal(frames.length, 1, 'acceleration owns a local rAF ramp');

wallMs += 200;
frames.shift()();
assert.equal(clock.elapsedMs(), 4500,
  'half of the ramp advances the intro-local scene time');
assert.equal(wallMs - 1000, 300,
  'an unrelated wall-clock consumer advances only by physical time');

wallMs += 200;
frames.shift()();
assert.equal(clock.elapsedMs(), 8900,
  'the local transform preserves the existing full fast-forward distance');
assert.equal(wallMs - 1000, 500,
  'the completed ramp still leaves unrelated timing untouched');
assert.equal(performance.now, nativePerformanceNow,
  'the realm-wide performance clock retains its native function');
assert.equal(clock.accelerate({ totalMs: 8500, rampMs: 400 }), false,
  'the intro acceleration remains one-shot');

console.log('intro local clock contract: PASS');
