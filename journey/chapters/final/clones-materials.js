// journey-v6 — FINAL epilogue: PER-CLONE MATERIAL CONSTRUCTION.
//
// H06 seam B. Three regions of clones.js, lifted VERBATIM (:375-424,
// :473-610, :612-701 at 6967a36a) in their original order: the overlay-net
// draw graft, the per-body deformation machinery (the varyPt patcher, the
// uniform binder and the geometry FRAMES it hops through), and the material
// cloning table itself.
//
// This is E4.4's "materials and owned resources" for the clone set. Every
// function here takes what it needs as an argument in the shipped code
// already — `dropped` was a parameter of clonePointsMat before this order
// existed — and NONE of them touches one of the clone set's census counters
// (ownedMats, shellMeshes, shellMats, drawsPerBody, foreign, figures). That
// is the property that made this the seam: §2.4 names `counts` as this
// order's byte-equivalent, and a region that cannot reach a counter cannot
// move one. See h06/reconnaissance.md §2.
//
// Eight of the sixteen declarations below are exported, and the export
// keyword is the ONLY edit any of the moved text carries. The other eight
// (VARY_U, bindVary, IDENT_M, isIdentityM, SHARE, FOG, shareUniforms,
// SZ_TAG) are reached only from inside this file and stay private.

import * as THREE from 'three';
import { VARY_GLSL } from './variation.js';

// organism's own injectDraw(), re-expressed for a clone's plain overlay-net
// material. The hero grafts uProg/uWin/pulse into the stock line shader at
// compile time and keeps the handle in userData; a clone rebuilds the
// material (it needs an owned .opacity for the reveal write-port), so the
// graft has to be redone here — pointed at THIS clone's uProg and the hero's
// own uWin for that layer. Without it the overlay net is the one layer that
// stands fully drawn while the cap lattice under it is still being stroked,
// and the one layer that does not answer a poke's ripple.
export function injectCloneDraw(mat, uProg, uWin, pulse, own, frame, vary) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uProg = uProg;
    sh.uniforms.uWin = uWin;
    sh.uniforms.uPulseC = pulse.uPulseC;
    sh.uniforms.uPulseT = pulse.uPulseT;
    sh.uniforms.uPulseP = pulse.uPulseP;
    if (vary) bindVary(sh.uniforms, own, frame);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>',
        '#include <common>\n' + (vary ? VARY_GLSL : '') +
        'uniform float uProg;\nuniform vec2 uWin;\n' +
        'attribute float aDraw;\nvarying float vDraw;\n' +
        'uniform vec3 uPulseC;\nuniform float uPulseT;\nuniform vec3 uPulseP;\n' +
        'varying float vPulse;\n' +
        'float pulseAt(vec3 wp) {\n' +
        '  float d = distance(wp, uPulseC);\n' +
        '  float w = uPulseP.x * (0.15 + 0.21 * uPulseT);\n' +
        // rb*rb, never pow(rb, 2.0) — negative base is undefined GLSL (see
        // organism.js's PULSE_GLSL note; Metal hides it, D3D11/Mali may not)
        '  float rb = (d - uPulseP.x * uPulseT) / w;\n' +
        '  float ring = exp(-(rb * rb));\n' +
        '  return 1.0 + uPulseP.z * ring * exp(-1.15 * uPulseT) * exp(-d * uPulseP.y);\n' +
        '}')
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\n' +
        (vary ? '  transformed = varyPt(transformed);\n' : '') +
        '{ float dp = clamp((uProg - uWin.x) / (uWin.y - uWin.x), 0.0, 1.0);\n' +
        '  float head = smoothstep(0.0, 0.012, dp - aDraw);\n' +
        '  float tip = smoothstep(0.03, 0.0, abs(dp - aDraw)) * smoothstep(0.0, 0.01, dp) * (1.0 - step(0.999, dp));\n' +
        '  vDraw = head + tip * 1.7;\n' +
        '  vPulse = pulseAt((modelMatrix * vec4(transformed, 1.0)).xyz); }');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vDraw;\nvarying float vPulse;')
      .replace('#include <color_fragment>',
        '#include <color_fragment>\ndiffuseColor.rgb *= vDraw * vPulse;');
  };
  // Same source for every clone, so three compiles ONE extra program for the
  // whole set. A key distinct from the hero's 'draw-injected' keeps the two
  // grafts from being confused for each other if organism's ever drifts.
  mat.customProgramCacheKey = () => 'clone-draw-injected';
}

/* ---- PER-BODY VARIATION (variation.js, 2026-08-05) ----------------------
   Hannah, on the shipped field: "the mushrooms at the end seem too similar to
   one another... make them each their own unique thing."

   She is describing the price of the step-back above. A clone IS the hero's
   vertices; a uniform scale, a yaw and a few degrees of lean are the only
   things that have ever differed between two bodies. Variation therefore
   cannot come from the build — the buffers are shared and must stay shared —
   so it comes from a DEFORMATION: variation.js's `varyPt()`, one smooth map
   of the body frame to itself, seeded per individual and evaluated in the
   vertex shader.

   THE WHOLE DIFFICULTY IS CONSISTENCY. A body here is fifteen drawables with
   thirteen materials. Deform the cap lattice and not the cap SHELL and the
   body's lit outline stops agreeing with its own opaque interior — a rim
   floating off a black cap, which is the most broken a thing in this scene
   can look. Three mechanisms hold the line, and they are the reason this
   section is longer than the map itself:

     1. ONE UNIFORM SET PER BODY. `varyUniforms(V)` is built once in add() and
        the SAME four objects (uVarA..uVarD) are handed to every one of that
        body's materials. Not copied — the same object. A layer cannot
        disagree with its neighbour even for a frame, because there is nothing
        to disagree with.
     2. ONE FRAME, CARRIED EXPLICITLY. The map is written in the body frame
        (soil at the origin, hero units), and a layer's geometry is NOT
        necessarily in it. The first cut of this file assumed it was; the
        guard below said otherwise, which is the argument for having written
        the guard. `mushroom` carries the authored cap tilt (~8 deg about x)
        and a residual offset, so cap leaves live in a tilted, translated
        frame while stem leaves live in the body frame — and a map applied to
        raw local coordinates would have meant two different things on the two
        halves of one mushroom. Every layer therefore carries uVarM/uVarMI,
        the exact matrix from ITS frame to the body frame; varyPt hops in,
        deforms, and hops back. frameOf() reuses the parent's frame object
        whenever a node adds no transform, so there are exactly TWO frames per
        body, not fifteen.
     3. ONE GUARD, TAKEN BEFORE THE FIRST BODY IS BUILT. `probeVary()` test-
        patches every distinct shader source the walk will meet and checks
        every frame matrix is invertible. If ANY of them refuses, `varyOk` is
        false and NOTHING is deformed — clones and species band together, since
        ring.js reads clones.varyOk for both. Half a deformed body is not a
        degraded outcome, it is a bug; the only safe fallback is none at all.

   The shells had to stop being shared for this. That is a real change to the
   rules table above, and it costs 24 x ~2 extra MeshBasicMaterials — but zero
   extra draw calls (same meshes, same count) and one extra program (the cache
   key is constant across the set). It also fixes a latent bug it inherited:
   a shared shell material carries the hero's intro clipping plane and fade
   opacity, so a clone set built during the hero's grow-in would have baked
   those in. cloneShellMat pins the restored state explicitly. ---- */

// The three ways `position` reaches the pipeline in organism's own shaders.
// Every one is rewritten to go through varyPt(); anything else reaching the
// raw attribute would be an UNDEFORMED coordinate mixed into a deformed body,
// so the patcher refuses rather than half-applying.
export function varyVertex(src) {
  if (!src.includes('void main() {')) return null;
  let n = src;
  // the dense-line coverage fade measures the screen gap to the neighbouring
  // line: deform the NEIGHBOUR too, or a stretched body reports its unstretched
  // spacing and fades by the wrong amount
  n = n.split('vec4(position + tang, 1.0)').join('vec4(varyPt(position + tang), 1.0)');
  n = n.split('vec4(position + tang2, 1.0)').join('vec4(varyPt(position + tang2), 1.0)');
  n = n.split('vec4(position, 1.0)').join('vec4(vPosD, 1.0)');
  n = n.split('drawAt(position)').join('drawAt(vPosD)');
  if (n === src) return null;                       // matched nothing: refuse
  n = n.replace('void main() {',
    VARY_GLSL + '\n      void main() {\n        vec3 vPosD = varyPt(position);');
  // residue check: after removing the three legitimate varyPt() arguments,
  // no path to the raw attribute may remain anywhere in the source
  const residue = n
    .split('varyPt(position + tang2)').join('')
    .split('varyPt(position + tang)').join('')
    .split('varyPt(position)').join('');
  if (residue.includes('position')) return null;
  return n;
}

const VARY_U = ['uVarA', 'uVarB', 'uVarC', 'uVarD'];
/** Bind one layer's variation uniforms: the body's SHAPE (four objects shared
 *  by every layer of the body — the consistency guarantee) and this layer's
 *  own geometry FRAME (see VARY_GLSL's varyPt: the spine is not flat). */
function bindVary(target, own, frame) {
  for (const k of VARY_U) target[k] = own[k];
  target.uVarM = frame.uVarM;
  target.uVarMI = frame.uVarMI;
}

const IDENT_M = new THREE.Matrix4();
const isIdentityM = (m) => {
  const e = m.elements, I = IDENT_M.elements;
  for (let i = 0; i < 16; i++) if (Math.abs(e[i] - I[i]) > 1e-9) return false;
  return true;
};
/** The frame a node's geometry lives in, as the accumulated matrix from the
 *  clone's own spine root. Returns the PARENT's frame object unchanged when
 *  the node adds no transform, so the whole stem side shares one identity
 *  frame and the whole cap side shares one tilted frame — two uniform pairs
 *  per body, not fifteen. `bendRoot` mirrors cloneNode stripping capBend's
 *  live bend snapshot: the frame must describe the clone, not the hero. */
export function frameOf(parent, o, bendRoot) {
  const local = new THREE.Matrix4();
  if (bendRoot) local.makeTranslation(o.position.x, o.position.y, o.position.z);
  else local.compose(o.position, o.quaternion, o.scale);
  if (isIdentityM(local)) return parent;
  const m = parent.m.clone().multiply(local);
  return {
    m,
    uVarM: { value: m },
    uVarMI: { value: new THREE.Matrix4().copy(m).invert() },
  };
}
/** The spine root's frame: identity, so uVarM and uVarMI can share one matrix
 *  (identity is its own inverse). Every stem-side layer ends up on this pair. */
export const rootFrame = () => {
  const m = new THREE.Matrix4();
  return { m, uVarM: { value: m }, uVarMI: { value: m } };
};

/** The opaque shells: a per-body clone of the hero's MeshBasicMaterial with
 *  the same map grafted into the stock shader. `transformed` is the stock
 *  local position — varyPt's frame hop is what puts it in the body frame. */
export function cloneShellMat(src, own, frame) {
  const m = src.clone();
  // intro.js's shellsRestore() state, pinned rather than inherited — see the
  // section header. A clone is never mid-grow-in.
  m.opacity = 1; m.transparent = false; m.clippingPlanes = null;
  m.onBeforeCompile = (sh) => {
    bindVary(sh.uniforms, own, frame);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + VARY_GLSL)
      .replace('#include <begin_vertex>',
        '#include <begin_vertex>\n  transformed = varyPt(transformed);');
  };
  m.customProgramCacheKey = () => 'clone-vary-shell';
  return m;
}

/* ------------------------------------------------------------------ */
/* Material cloning                                                    */
/* ------------------------------------------------------------------ */
// Uniform objects a clone must SHARE with its source material, by name.
// Anything animated or global lands here; anything owned is created fresh.
const SHARE = [
  'map', 'time',                          // glow sprite + shimmer clock
  'uWin',                                 // the hero's per-LAYER draw windows
  'uPulseC', 'uPulseT', 'uPulseP',        // the tap pulse — taps ripple into clones
  'uRes', 'uFadeOn',                      // coverage fade (resize keeps working)
];

// NOT shared, and both for the entry draw (see DRAW_LO above):
//
//   uProg    OWNED PER BODY. This is the whole of part B: the draw progress
//            is the one piece of entry state that has to differ per body for
//            the field to reveal itself by drawing on. uWin stays shared, so
//            the ORDER of the choreography is still the hero's.
//   uClampY  owned by the CLONE SET (one object, all bodies). The hero parks
//            its stem materials at 3.65 to stop the stipe inking against open
//            sky before the cap exists, and the lid tests WORLD y — a metric
//            that means nothing to a body standing at another place and
//            scale. Every clone's stem happens to sit below 3.45 world y, so
//            the lid is already inert for all of them; pinning it at 1e3
//            makes that structural instead of a coincidence waiting for a
//            taller member. The joint the hero's lid protects is covered on a
//            clone by its own §5 cap shell, which is opaque from SHELL_ON.
export const CLAMP_OFF = 1e3;

// THE ONE UNIFORM A CLONE MUST NOT INHERIT: fog.
//
// The first cut of this file shared fogNear/fogFar with the hero on the
// reasoning that "a clone should dim with distance exactly as the hero
// does". Measured at the rest, that is wrong, and visibly so. The hero's
// pair is FIXED at 7 -> 20 — a hero-page parameterisation for a lens two
// metres off one organism — while the director re-parameterises the world's
// fog to 15 -> 62 across the Final leg because the composition is now forty
// units deep, and every other thing in the frame (terrain, sky, the species
// batch) rides that ramp. A clone on 7/20 therefore dims about five times
// faster than the soil it stands on and reaches BLACK at 20 units, which
// put a hard wall through the middle of the field and — worse — left the
// far ring bodies DIMMER than the species bodies standing behind them. A
// brightness inversion is a seam you cannot not see.
//
// So the clone set owns ONE shared pair of fog uniforms (shared across all
// clones, so it is two writes a frame however many bodies there are), fed
// from the chapter's own uFogNear/uFogFar. The depth cue that the hero's
// fog used to supply is now explicit instead: each clone carries a distance
// LUMINANCE (ring.js's cloneLum) into its reveal value, which is the same
// device the species field already uses for its own tiers — so a clone and
// a species body at the same distance land at the same luminance, and the
// hero keeps the frame because it is the biggest and the brightest, not
// because everything else was fogged out.
const FOG = ['fogNear', 'fogFar'];

function shareUniforms(dst, src, fogU, own, frame) {
  for (const k of SHARE) if (src.uniforms[k]) dst.uniforms[k] = src.uniforms[k];
  for (let i = 0; i < FOG.length; i++)
    if (src.uniforms[FOG[i]]) dst.uniforms[FOG[i]] = fogU[i];
  // the entry-draw state this body owns (or the set owns) — see SHARE above
  if (src.uniforms.uProg) dst.uniforms.uProg = own.uProg;
  if (src.uniforms.uClampY) dst.uniforms.uClampY = own.uClampY;
  // this body's shape — the same four objects on every layer it owns
  bindVary(dst.uniforms, own, frame);
}

const SZ_TAG = 'float sz = psize * vTw * (300.0 / -mv.z)';

export function clonePointsMat(src, s, dropped, fogU, own, frame, vary) {
  if (!src.vertexShader.includes(SZ_TAG) || !src.vertexShader.includes('uniform float time;')) {
    dropped.push('points');               // organism shader drifted: drop, never mis-size
    return null;
  }
  const m = src.clone();
  shareUniforms(m, src, fogU, own, frame);
  m.uniforms.uOpacity = { value: src.uniforms.uOpacity.value };
  m.uniforms.uScl = { value: s };
  m.vertexShader = (vary ? varyVertex(m.vertexShader) : m.vertexShader)
    .replace('uniform float time;', 'uniform float time;\n      uniform float uScl;')
    .replace(SZ_TAG, 'float sz = uScl * psize * vTw * (300.0 / -mv.z)');
  return m;
}

export function cloneDenseMat(src, fogU, own, frame, vary) {
  const m = src.clone();
  shareUniforms(m, src, fogU, own, frame);
  m.uniforms.uOpacity = { value: src.uniforms.uOpacity.value };
  if (vary) m.vertexShader = varyVertex(m.vertexShader);
  return m;
}
