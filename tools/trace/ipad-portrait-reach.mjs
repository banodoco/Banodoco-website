// tools/trace/ipad-portrait-reach.mjs — QA-ONLY. Nothing imports it.
//
// IPAD-NUDGE (2026-08-25). Answers ONE question, with a mutant rather than by
// reading the source: can journey/portrait.js's authored field move anything
// at LANDSCAPE TABLET (aspect 1.23-1.55, hero-mode.js's `deskNarrow`)?
//
// Method (the a5b sweep2.mjs recipe): stage a copy of the tree with a
// deliberately enormous perturbation to the portrait field — +5.0 world units
// of `truck` and +5.0 of `tgtRight` on EVERY key — and compare poseAt's output
// against the shipped module across the whole route, at every viewport class.
//
// A mutant this large is the point. If a 5-unit truck on every key cannot
// move a pixel at 1024x768, then no 0.3-unit key anyone might author there
// can either, and the file is the wrong instrument for that viewport — which
// is a fact about the aspect gate, not about the values.
//
// The phone rows are the CONTROL: the same mutant must move them, or the
// probe is measuring its own staging and not the gate.
//
// Heroes are the MEASURED per-mode hero captures from ipad-land.mjs, not the
// authored desktop HERO — director.poseAt's arrival leg reads `hero`, and at
// deskNarrow the desktop default is simply the wrong composition.
//
// D118: this file IS the invocation. Read its exit code from the process you
// spawned, never from a backgrounded wrapper.
import { createStager } from '../stage-tree.mjs';
import { readFileSync } from 'node:fs';

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const SCRATCH = process.env.IPAD_SCRATCH
  || `${REPO}/tools/trace/out/ipad-portrait-reach`;
globalThis.matchMedia = () => ({ matches: false });
const THREE = await import(`file://${REPO}/vendor/three/three.module.js`);

const PORTRAIT = `${REPO}/journey/portrait.js`;

// The mutation: every authored key gains a huge horizontal push, in both of
// the two fields that move a subject sideways.
function mutate(src) {
  let n = 0;
  const out = src.replace(/truck: (-?[\d.]+), tgtUp: (-?[\d.]+), tgtRight: (-?[\d.]+)/g,
    (m, a, b, c) => { n++; return `truck: ${(+a + 5).toFixed(3)}, tgtUp: ${b}, tgtRight: ${(+c + 5).toFixed(3)}`; });
  if (n < 5) throw new Error(`mutant matched only ${n} keys — the anchor moved`);
  return out;
}

async function build(label, patchPortrait) {
  const stage = createStager({
    scratchRoot: `${SCRATCH}/${label}`,
    threePath: `${REPO}/vendor/three/three.module.js`,
    label,
  });
  const patch = (abs, src) => (abs === PORTRAIT && patchPortrait ? mutate(src) : src);
  const d = await import(stage(`${REPO}/journey/director.js`, { salt: label, patch }));
  return { d, stage };
}

// Measured per-viewport hero captures (tools/trace/ipad-land.mjs, 2026-08-25).
const CASES = [
  { id: 'desktop1440', w: 1440, h: 900, hero: { az: -0.21361, r: 10.6419, y: 2.07, t: [-2.406, 2.42, 0], fov: 38 } },
  { id: 'ipadmini5', w: 1024, h: 768, hero: { az: -0.1136, r: 12.3295, y: 2.12, t: [-1.5476, 2.47, 0], fov: 38 } },
  { id: 'ipadmini6', w: 1133, h: 744, hero: { az: -0.18013, r: 11.8736, y: 2.12, t: [-2.2773, 2.47, 0], fov: 38 } },
  { id: 'ipadair', w: 1180, h: 820, hero: { az: -0.18108, r: 12.1313, y: 2.12, t: [-2.3347, 2.47, 0], fov: 38 } },
  { id: 'tabletport', w: 768, h: 1024, hero: { az: 0.07203, r: 12.0312, y: 2.72, t: [0.7158, 3.82, 0], fov: 50 } },
  { id: 'phone430', w: 430, h: 932, hero: { az: 0.06508, r: 11.6984, y: 2.95, t: [0.6109, 4.0103, 0], fov: 64 } },
];

const ship = await build('ship', false);
const mut = await build('mut', true);

const mkHero = (h) => ({
  az: h.az, r: h.r, y: h.y, fov: h.fov,
  target: new THREE.Vector3(h.t[0], h.t[1], h.t[2]),
});

function poses(built, C) {
  const hero = mkHero(C.hero);
  const out = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 38 };
  const rows = [];
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    built.d.poseAt(p, out, hero, C.w / C.h, C.w);
    rows.push([out.pos.x, out.pos.y, out.pos.z, out.target.x, out.target.y, out.target.z, out.fov]);
  }
  return rows;
}

console.log('viewport         aspect   max |pose delta| under a +5.0 truck / +5.0 tgtRight mutant on EVERY key');
let bad = 0;
for (const C of CASES) {
  const a = poses(ship, C), b = poses(mut, C);
  let worst = 0, worstP = 0;
  for (let i = 0; i < a.length; i++) {
    for (let k = 0; k < 7; k++) {
      const d = Math.abs(a[i][k] - b[i][k]);
      if (d > worst) { worst = d; worstP = i / 1000; }
    }
  }
  const aspect = C.w / C.h;
  const expectInert = aspect >= 1;
  const inert = worst === 0;
  const ok = inert === expectInert;
  if (!ok) bad++;
  console.log(
    `${C.id.padEnd(14)} ${aspect.toFixed(4).padStart(7)}   ` +
    `${inert ? 'BIT-IDENTICAL (field cannot reach)' : `moves, max ${worst.toFixed(4)} u at p=${worstP}`}` +
    `   ${ok ? '' : '<< UNEXPECTED'}`,
  );
}
// The control has to fire, or this proves nothing.
const control = CASES.find((c) => c.id === 'phone430');
const ca = poses(ship, control), cb = poses(mut, control);
let cw = 0;
for (let i = 0; i < ca.length; i++) for (let k = 0; k < 7; k++) cw = Math.max(cw, Math.abs(ca[i][k] - cb[i][k]));
console.log(`\nmutant control (phone430): ${cw > 1 ? `LIVE, ${cw.toFixed(3)} u` : 'DEAD — the staging, not the gate, is what you measured'}`);
console.log(`portrait.js keys perturbed: ${(mutate(readFileSync(PORTRAIT, 'utf8')).match(/truck: /g) || []).length}`);
ship.stage.cleanup(); mut.stage.cleanup();
process.exit(bad === 0 && cw > 1 ? 0 : 1);
