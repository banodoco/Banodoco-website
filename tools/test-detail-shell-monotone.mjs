// tools/test-detail-shell-monotone.mjs
//
// OWNER REPORT #30 — "when I hover over any of the items, the sections or
// owners, there's a weird border flash that disappears when I first hover. It
// feels unintentional".
//
// THE SUBJECT. Both surfaces the owner names are the same element species.
// Hovering an initiative chip inside a section opens `.j-pop`; hovering a
// contributor face in Owned opens `.j-card` (the card's transient tier IS a
// hover tier — journey/ui/card-tier.js, "the existing click state should
// become the hover state"). Both are armed with `.j-detail-enter`, and both
// therefore play ONE shared keyframe: `j-detail-arrive` in journey/site.css.
// So there is one cause, not two, and this file gates the cause.
//
// WHAT WENT WRONG. `j-detail-arrive` drove `border-color` through a stop that
// is BRIGHTER THAN ITS OWN RESTING VALUE and then came back down:
//
//     0%   rgba(217, 164, 65, 0.12)      68%  rgba(255, 226, 160, 0.62)
//     100% rgba(217, 164, 65, 0.35)      rest rgba(217, 164, 65, 0.30)
//
// Measured per frame in Chrome (journey/site.css unchanged, Inspire chips,
// p95 frame gap 29.9 ms): 0.12 -> 0.62 by t+137 ms -> 0.35 -> 0.30. The peak
// is 2.07x the resting alpha in a markedly whiter gold. That rise-then-fall
// is the "flash that disappears"; it is the same defect SHAPE as report #20's
// portrait flare, in CSS rather than in a shader.
//
// THE CONTRACT THIS FILE ENFORCES. A detail shell's edge may arrive, and may
// arrive fast — but it must never be brighter on the way in than it is when
// it settles, and never brighter on the way out than it was at rest. Stated
// as one measurable property: across the stops of any @keyframes that animates
// `border-color`, the EFFECTIVE edge brightness must be monotone.
//
// "Effective" matters, and asserting on the raw alpha alone would be a blind
// spot: these keyframes animate `opacity` on the same element in the same
// breath, so what a visitor sees is the product. A future edit could hold
// alpha flat and reintroduce the identical flash through opacity alone. The
// measured quantity here is therefore
//
//     brightness(stop) = relativeLuminance(rgb) * alpha * opacity
//
// which folds in the hue overshoot (255,226,160 is brighter than 217,164,65
// even at equal alpha) as well as the alpha and the fade.
//
// WHY STOPS ARE SUFFICIENT SAMPLES. Between two adjacent stops the UA
// interpolates each component monotonically, and every timing function in
// play here (`cubic-bezier(0.22, 1, 0.36, 1)`, `cubic-bezier(0.4, 0, 1, 1)`,
// `ease`) is monotone in time. So a non-monotone rendered curve requires a
// non-monotone stop sequence: extrema can only sit ON a declared stop.
//
// A stop that does not declare `border-color` (or `opacity`) is NOT skipped —
// it is resolved by linear interpolation between the neighbouring stops that
// do declare it, exactly as the UA resolves it. That is what lets the fix be
// "delete the overshoot declaration" rather than "write a different number":
// the property then simply runs 0% -> 100%, and this checker still sees a
// value at every stop rather than a hole it could pass over.
//
// SCOPE. Every @keyframes in the three authored stylesheets, with no name
// list and no exemptions — a new keyframe with this defect is caught without
// anyone remembering to add it here. As of writing, exactly two keyframes
// animate `border-color` at all (`j-detail-arrive`, `j-detail-depart`); the
// suite prints its own coverage so a future reader can see whether the gate
// still has a subject, rather than trusting that it does.
//
// RED PROOF. `--prove-failure` runs the checker against three mutants of the
// real source text and requires every one to be REJECTED:
//
//   M1  the shipped overshoot, restored verbatim  (the actual defect)
//   M2  alpha held flat, the flash moved into `opacity`  (the blind spot the
//       "effective" measure exists to close — M2 passes an alpha-only check)
//   M3  the depart keyframe's overshoot restored  (the exit half)
//
// It also requires the UNMUTATED source to be ACCEPTED, so the suite cannot
// pass by rejecting everything.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The authored stylesheets. Vendored, archived and built copies are out of
 *  scope: they are not what a change to this contract would be made in. */
const SHEETS = ['journey/site.css', 'journey/cards/cards.css', 'hero.css'];

/* -------------------------------------------------------------------------- */
/* Parsing                                                                     */
/* -------------------------------------------------------------------------- */

/** Every `@keyframes NAME { ... }` block, sliced with a brace counter so a
 *  nested block cannot end the slice early. */
export function readKeyframes(src) {
  const out = [];
  const re = /@keyframes\s+([A-Za-z0-9_-]+)\s*\{/g;
  let m;
  while ((m = re.exec(src))) {
    let i = re.lastIndex;
    let depth = 1;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    if (depth !== 0) throw new Error(`unterminated @keyframes ${m[1]}`);
    out.push({ name: m[1], body: src.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return out;
}

/** The stops of one keyframe body, in ascending percentage. `from`/`to` and
 *  comma-joined selectors (`0%, 100% { … }`) both expand to real numbers. */
export function readStops(body) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(body))) {
    const decls = m[2];
    for (const part of m[1].split(',')) {
      const s = part.trim();
      const p = s === 'from' ? 0 : s === 'to' ? 100 : parseFloat(s);
      if (Number.isFinite(p)) out.push({ p, decls });
    }
  }
  return out.sort((a, b) => a.p - b.p);
}

/** Last declaration of `prop` in a stop, or null. Property-name matching is
 *  anchored so `border-color` does not also match `border-top-color`. */
export function declOf(decls, prop) {
  const re = new RegExp(`(?:^|[;{\\s])${prop}\\s*:\\s*([^;}]+)`, 'g');
  let m;
  let last = null;
  while ((m = re.exec(decls))) last = m[1].trim();
  return last;
}

/** `rgba(r, g, b, a)` / `rgb(r, g, b)` / `#rrggbb` -> {r,g,b,a}. Anything else
 *  — a `var()`, a named colour, a keyword — returns null, which this suite
 *  treats as UNMEASURABLE and reports rather than silently passing. */
export function parseColor(v) {
  if (!v) return null;
  let m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/.exec(v);
  if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  m = /^#([0-9a-fA-F]{6})$/.exec(v);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  return null;
}

const srgb = (c) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
/** WCAG relative luminance — the hue's own contribution to how bright the
 *  1px edge reads against the panel's near-black ground. */
export const luminance = ({ r, g, b }) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);

/** Fill the holes the way the UA does: linear interpolation between the
 *  nearest stops that declare the value, clamped at both ends. */
function resolve(stops, valueAt) {
  const known = stops.map((s, i) => ({ i, p: s.p, v: valueAt(s) })).filter((x) => x.v !== null);
  if (!known.length) return null;
  return stops.map((s, i) => {
    const exact = known.find((k) => k.i === i);
    if (exact) return exact.v;
    const before = [...known].reverse().find((k) => k.p <= s.p);
    const after = known.find((k) => k.p >= s.p);
    if (!before) return after.v;
    if (!after) return before.v;
    if (after.p === before.p) return before.v;
    const t = (s.p - before.p) / (after.p - before.p);
    const lerp = (x, y) => x + (y - x) * t;
    if (typeof before.v === 'number') return lerp(before.v, after.v);
    return {
      r: lerp(before.v.r, after.v.r), g: lerp(before.v.g, after.v.g),
      b: lerp(before.v.b, after.v.b), a: lerp(before.v.a, after.v.a),
    };
  });
}

/* -------------------------------------------------------------------------- */
/* The measurement                                                             */
/* -------------------------------------------------------------------------- */

/** Effective edge brightness at each stop of one keyframe, or a reason it
 *  could not be measured. */
export function edgeCurve(name, body) {
  const stops = readStops(body);
  const colours = resolve(stops, (s) => parseColor(declOf(s.decls, 'border-color')));
  if (!colours) return { name, subject: false };
  const rawColours = stops.map((s) => declOf(s.decls, 'border-color')).filter(Boolean);
  if (rawColours.some((v) => parseColor(v) === null)) {
    return { name, subject: true, unmeasurable: rawColours.filter((v) => !parseColor(v)) };
  }
  const opacityDecls = resolve(stops, (s) => {
    const d = declOf(s.decls, 'opacity');
    if (d === null) return null;
    const n = parseFloat(d);
    return Number.isFinite(n) ? n : null;
  });
  const points = stops.map((s, i) => {
    const c = colours[i];
    const o = opacityDecls ? opacityDecls[i] : 1;
    return { p: s.p, brightness: luminance(c) * c.a * o, alpha: c.a, opacity: o };
  });
  return { name, subject: true, points };
}

/** Monotone within a tolerance that is well below a visible 1px edge step,
 *  and far below the 2x overshoot this gate exists to catch. */
const TOL = 1e-4;

export function violationsIn(src) {
  const bad = [];
  const covered = [];
  for (const k of readKeyframes(src)) {
    const c = edgeCurve(k.name, k.body);
    if (!c.subject) continue;
    covered.push(c.name);
    if (c.unmeasurable) {
      bad.push({ name: c.name, why: `border-color not statically measurable: ${c.unmeasurable.join(' | ')}` });
      continue;
    }
    const first = c.points[0].brightness;
    const last = c.points[c.points.length - 1].brightness;
    const rising = last >= first;
    for (let i = 1; i < c.points.length; i++) {
      const d = c.points[i].brightness - c.points[i - 1].brightness;
      if (rising ? d < -TOL : d > TOL) {
        bad.push({
          name: c.name,
          why: `edge brightness reverses between ${c.points[i - 1].p}% and ${c.points[i].p}%`,
          points: c.points.map((x) => `${x.p}%=${x.brightness.toFixed(4)}`).join('  '),
        });
        break;
      }
    }
    // A rise-then-fall whose ends happen to be equal would slip past the
    // direction test above, so the peak is checked against the endpoints too.
    const peak = Math.max(...c.points.map((x) => x.brightness));
    if (peak > Math.max(first, last) + TOL) {
      bad.push({
        name: c.name,
        why: `edge overshoots its endpoints: peak ${peak.toFixed(4)} vs max(end) ${Math.max(first, last).toFixed(4)}`,
        points: c.points.map((x) => `${x.p}%=${x.brightness.toFixed(4)}`).join('  '),
      });
    }
  }
  return { bad, covered };
}

/* -------------------------------------------------------------------------- */
/* Mutants                                                                     */
/* -------------------------------------------------------------------------- */

const MUTANTS = [
  {
    id: 'M1',
    what: 'the shipped overshoot restored on j-detail-arrive (the reported defect)',
    apply: (src) => src.replace(
      '    68%  { opacity: 1; clip-path: inset(-80px); }',
      '    68%  { opacity: 1; clip-path: inset(-80px); border-color: rgba(255, 226, 160, 0.62); }',
    ),
  },
  {
    id: 'M2',
    what: 'alpha held flat, the same flash moved into opacity (the alpha-only blind spot)',
    apply: (src) => src.replace(
      '    68%  { opacity: 1; clip-path: inset(-80px); }',
      '    68%  { opacity: 2.6; clip-path: inset(-80px); }',
    ),
  },
  {
    id: 'M3',
    what: 'the depart overshoot restored on j-detail-depart (the exit half)',
    apply: (src) => src.replace(
      '    32%  { opacity: 0.9; clip-path: inset(-80px); }',
      '    32%  { opacity: 0.9; clip-path: inset(-80px); border-color: rgba(255, 226, 160, 0.48); }',
    ),
  },
];

/* -------------------------------------------------------------------------- */

function main() {
  const prove = process.argv.includes('--prove-failure');
  let subjects = 0;

  for (const rel of SHEETS) {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const { bad, covered } = violationsIn(src);
    subjects += covered.length;
    console.log(`  ${rel}: ${covered.length} keyframe(s) animate border-color${covered.length ? ' — ' + covered.join(', ') : ''}`);
    for (const b of bad) console.error(`    ✗ @keyframes ${b.name}: ${b.why}${b.points ? '\n      ' + b.points : ''}`);
    assert.equal(bad.length, 0, `${rel}: ${bad.length} non-monotone edge animation(s) — see above`);
  }

  // A gate with no subject is a gate that cannot fail. Say so out loud.
  assert.ok(subjects > 0, 'no keyframe in the authored stylesheets animates border-color — this gate has lost its subject');
  console.log(`  ✓ ${subjects} edge animation(s) monotone in effective brightness`);

  if (prove) {
    const rel = 'journey/site.css';
    const src = readFileSync(join(ROOT, rel), 'utf8');
    assert.equal(violationsIn(src).bad.length, 0, 'unmutated source must be ACCEPTED');
    for (const m of MUTANTS) {
      const mutated = m.apply(src);
      assert.notEqual(mutated, src, `${m.id} did not apply — its anchor text has moved; the red proof is stale`);
      const { bad } = violationsIn(mutated);
      assert.ok(bad.length > 0, `${m.id} (${m.what}) was ACCEPTED — this gate is green over a blind spot`);
      console.log(`  ✓ ${m.id} rejected — ${m.what}`);
    }
  }

  console.log('tools/test-detail-shell-monotone.mjs — OK');
}

main();
