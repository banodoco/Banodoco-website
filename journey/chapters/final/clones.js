// journey-v6 — FINAL epilogue: HERO CLONES (18-one-species.md, "Step back:
// clones").
//
// Hannah, third round on the same complaint, after two approximations: the
// D15 texture-system port matched the hero's SYSTEMS but not its density;
// the doc-18 species.js rebuild matched the SILHOUETTE to double-precision
// noise but its tissue is still ~10x sparser than the hero's — and the
// hero's identity IS its tissue. A member standing beside the hero kept
// reading as a different creature because it literally was different
// geometry. The step-back decision: stop approximating. The near field
// members are now LITERAL CLONES of the hero organism's own scene graph —
// the same BufferGeometry objects, drawn again at another place and scale.
// Only the real thing reads as the real thing.
//
// SHARING RULES (the whole file is these rules)
// ---------------------------------------------
//   geometry   ALWAYS shared. A clone adds zero vertex memory; the caps,
//              gills, rim, stem lattice and bead clouds are the hero's own
//              buffers re-drawn under another matrix.
//   materials  cloned SHALLOWLY per clone, in three classes:
//              - opaque occlusion shells + stem core (MeshBasicMaterial):
//                shared outright — they carry no per-clone state. They are
//                what makes a body solid instead of x-ray, and cloning them
//                is what species.js could never afford (it mirrored them as
//                build-time damping). Black-on-black they cost nothing
//                visually until a bright stroke passes behind a body.
//                Their per-clone state is not a material but a VISIBILITY:
//                a body whose strokes have not kindled yet must not stand
//                in the frame as an opaque hole punched through the mist,
//                so each clone's shells are switched off below SHELL_ON of
//                its own reveal value (and switched off again on a reverse
//                retract). That also hands the frame back four draw calls
//                per unlit body.
//              - ShaderMaterials (dense lines, glow points): cloned, then
//                the ANIMATED / GLOBAL uniform objects are re-pointed at the
//                hero's own instances (time, uProg/uWin draw state, the tap
//                pulse trio, uRes, fog) so every clone shimmers, resolves
//                and answers floor taps in sync with the hero for free —
//                one uniform tick, N bodies. Only uOpacity is owned per
//                clone: it is the write-port for the chapter's reveal
//                choreography (uAmount x uPull whisper/kindle, D16-pure) —
//                and for nothing else, since the pointer glow was removed.
//              - the cap overlay net (LineBasicMaterial + injected draw):
//                rebuilt plain. The injection only matters mid-intro; parked
//                it is identity, and a fresh material gives the clone an
//                owned .opacity for the same write-port.
//   points     the hero's point shaders size sprites in world units with no
//              node-scale term (gl_PointSize = psize * 300/-mv.z), so a
//              scaled clone would wear full-size sprites. Cloned point
//              materials get one owned uniform, uScl = the clone's uniform
//              scale, patched into the size expression. Every layer is kept
//              — the beads and speckles ARE the tissue this step-back is
//              about. (The patched source is identical across clones, so
//              three's shader cache still compiles ONE extra program for
//              the whole set, not one per body.)
//
// The clones live in the CHAPTER's group (never swayGroup — adr-d3: the
// field does not ride the hero's wind). Stillness beside the swaying hero
// read dead, so each clone carries its own gentle two-pivot sway (root +
// capBend, the hero's own §10b/breeze motion language at reduced amplitude,
// distinct seeded phases) driven by the chapter animator through update().
//
// organism/* stays READ-ONLY: everything here is reached through the public
// createScene() API (groups.stem, groups.mushroom) and nothing is written
// back into the hero's graph.

import * as THREE from 'three';
import { heroPulse } from './world.js';
import { VARY_GLSL, varyUniforms, IDENTITY } from './variation.js';

/* ---- NO POINTER GLOW. THE PARITY FACT (2026-08-05, Hannah: "when I hover
   over the mushrooms at the bottom they still light up") -------------------
   These bodies used to carry furniture.js's §11 highlight math — an eased hot
   value with a breathing pulse, plus a one-shot click swell — driven by a
   raycast against whatever was under the pointer. That was wrong, and it was
   wrong on the only test that matters: the HERO DOES NOT DO IT. The hero's
   body has no hover response at all. Its region glow is driven exclusively by
   hovering the three HUD callout labels (main.js co-inspire / co-equip /
   co-connect -> furniture.js setHighlight); raycasting the hero's own body
   with a pointer does nothing whatsoever, and a tap is answered by §10c's
   four-part poke — wobble, ripple, spores, haptic — with no brightness term
   anywhere in it.

   So there is no hover state here and no click brightness either. A field
   body answers a POKE and nothing else, which is exactly what the hero does.
   The glow uniforms (uHotId/uHotAmt/uTapId/uTapAmt), the hotAt() shader term
   and the whole hover half of interact.js went with this comment's ancestors.
   Do not reintroduce a pointer glow on a scenery body without a hero
   counterpart to point at. ---- */

// Mirror of organism.js §10b breeze() — chapter-owned copy (organism is
// read-only and its instance is private to the closure). Same three modes
// under the same ~48s gust swell; clones run it phase-shifted and damped.
export function breeze(t) {
  const gust = 0.55 + 0.45 * Math.sin(t * 0.13 + 0.6);
  return gust * (0.62 * Math.sin(t * 1.20)
               + 0.26 * Math.sin(t * 1.83 + 1.3)
               + 0.07 * Math.sin(t * 2.60 + 2.7));
}

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth01 = (x) => { const c = clamp01(x); return c * c * (3 - 2 * c); };

/** intro.js `_shellFade`, for a clone's own shell materials. Solidity follows
 *  the ink: `k` is how far this region's stroking has got. At k = 1 the state
 *  is byte-identical to the shipped parked one (opaque, not transparent). */
function shellFade(meshes, mats, k) {
  for (const m of mats) { m.transparent = k < 1; m.opacity = k; }
  for (const sh of meshes) sh.visible = k > 0;
}

/* ---- THE POKE, MECHANICAL HALF (organism/organism.js §10c) --------------
   Hannah: "why is the touch-interaction on the new mushrooms different to the
   OG one?" The hero's answer to a poke is not a brightness ramp — it is a
   CANTILEVER. The stalk stands on an elastic root; a tap is an impulse at the
   hit point; the torque r x F about the base kicks the body's angular
   velocity, which then rings down as a lightly damped oscillator at the
   stalk's own flutter frequency, riding ON TOP of the breeze rather than
   replacing it.

   These are §10c's numbers, unchanged. They are copied rather than imported
   because organism/* is read-only and keeps them in a closure — the same
   arrangement this file's breeze() already lives under.

   The lever arm falls out of the cross product and is the whole character of
   the move: a tap on the cap (r.y ~ 4) tips a body four times as far as one
   low on the stem, and pressing one edge of the cap tips it toward that side.
   That is why the hit point has to be REAL and not the axis of a proxy
   collider — see interact.js's narrow phase.

   UNITS. For a clone, r and F are taken in the body's OWN frame (root-local,
   which is hero units because root.scale carries the clone's only scale), so
   the impulse constant, the saturation clamp and the resulting ANGLE are
   identical for every body whatever its size. A poked field mushroom leans by
   the same number of degrees as the poked hero — which is what "the same way
   the hero does" has to mean when the bodies are different sizes. */
export const TAP_W = 2.3;      // ring frequency (rad/s) — the stalk's fine-flutter mode
export const TAP_ZETA = 0.14;  // light damping: a few visible wobbles, settled in ~3s
const TAP_IMP = 0.008;         // impulse -> angular velocity
const TAP_MAX = 0.09;          // flesh, not a bell: repeated pokes saturate

/** Advance one body's tap ring-down by dt. Shared with ring.js so the batched
 *  species bodies ring down on the SAME integrator (semi-implicit Euler on the
 *  damped spring — stable at these frequencies and frame rates, and it
 *  conserves the impulse's feel). `st` is any object with {tx,tz,tvx,tvz}. */
export function stepTap(st, dt) {
  st.tvx += (-TAP_W * TAP_W * st.tx - 2 * TAP_ZETA * TAP_W * st.tvx) * dt;
  st.tvz += (-TAP_W * TAP_W * st.tz - 2 * TAP_ZETA * TAP_W * st.tvz) * dt;
  st.tx += st.tvx * dt;
  st.tz += st.tvz * dt;
}

/** The impulse itself: hit point `r` and push direction `F`, both already in
 *  the body's own frame and in hero units. organism §10c, line for line. */
export function kickTap(st, r, F) {
  st.tvx += TAP_IMP * (r.y * F.z - r.z * F.y);
  st.tvz += TAP_IMP * (r.x * F.y - r.y * F.x);
  const v = Math.hypot(st.tvx, st.tvz);
  if (v > TAP_MAX) { st.tvx *= TAP_MAX / v; st.tvz *= TAP_MAX / v; }
}

/** True while a body is still ringing — lets a caller skip still bodies and
 *  lets ring.js hand a wobble slot back the moment it has nothing to say. */
export const isRinging = (st) =>
  Math.abs(st.tx) > 1e-5 || Math.abs(st.tz) > 1e-5 ||
  Math.abs(st.tvx) > 1e-5 || Math.abs(st.tvz) > 1e-5;

/** Zero a tap state (retire, or a slot being reclaimed). */
export function clearTap(st) { st.tx = 0; st.tz = 0; st.tvx = 0; st.tvz = 0; }

/* ---- THE ENTRY, AS THE FIELD'S REVEAL (organism/organism.js DRAW_GLSL) ---
   Hannah: "what about the entry animation, too heavy to run on them?" It is
   not heavy at all — it was IMPOSSIBLE, for a reason that had nothing to do
   with cost. A clone shared the hero's single `uProg` draw-progress uniform,
   so all twenty-four bodies were pinned to whatever the hero's entry was
   doing — and the hero's entry finished back on the hero page, parked at
   uProg = 2. One uniform, one state, nothing left to draw.

   Each clone now owns its uProg (ONE float per body per frame) while still
   sharing every per-layer uWin — so the hero's authored choreography (stalk
   verticals, then the lattice, then gills, rim, cap surfaces, the overlay net
   last) replays per body, in the hero's own order, at whatever moment the
   chapter's reveal front reaches that body.

   THE LAW IT HAS TO OBEY (D16): nothing may fade in over open view; a draw-on
   tied to the camera-pure front is lawful, a time-based one is not. So the
   draw parameter is a pure function of uPull exactly like the kindle — and
   since 2026-08-06 it is the same front at the same width, so a body inks
   itself in AS it lights up (see DRAW_W_HI/LO). Reverse scrubs un-draw it,
   stroke by stroke, back into the dark.

   The window span below is the union of the hero's own stem+cap windows
   (intro.js WINDOWS: stemVerts opens at 0.296, overlayPts closes at 0.893) —
   the clone carries no ground layers, so driving uProg across the full 0..1
   would spend a third of the move on layers this body does not have. */
const DRAW_LO = 0.296, DRAW_HI = 0.893;
// THE DRAW RUNS ON THE KINDLE'S OWN FRONT — not ahead of it (Hannah,
// 2026-08-06: "they have a different entry animation when they come in — they
// kind of turn black... why can't we just make them one by one have the same
// entry animation as the main one does, the hero of the page, so they kind of
// pop up like that").
//
// This constant used to be DRAW_LEAD 0.20 against REVEAL_W 0.16 — the draw
// ran a whole reveal-width AHEAD of the kindle, so that "the last stroke lands
// before the first ember" and the shipped unlit-body-in-the-dark state
// survived. That reasoning was sound about the state and wrong about the
// ANIMATION, and the animation is what a visitor watches. What it produced was
// a body that inked itself in at the 7% ember whisper — near-invisible ink —
// then stood there fully drawn and unlit while its opaque shells came up, and
// only THEN lit. Measured at p 0.885: fifteen of twenty-four bodies at once
// with all four shells opaque and their own brightest layer at 3-8%, the worst
// of them subtracting 66% of the light from its own footprint. A near-black
// mushroom standing in the haze is precisely "they kind of turn black".
//
// The hero has no such phase, and cannot: on the landing page its strokes ink
// in at FULL brightness with the tip ember riding the drawing front, and
// intro.js fades each shell group in WHILE its own region is being stroked.
// The hero's ink IS its light. So the draw is now the SAME front as the
// kindle, at the same width — a body inks itself in as it lights up, one by
// one along the arc, and there is no window in which it is drawn and dark.
//
// Everything the lead was protecting is still protected, and by construction:
// at the arm uPull is 0 and every body's reveal is >= 0.45, so d = 0 and the
// field is undrawn and unlit (dark at arm, STRICTER than before — a body can
// no longer ink in ahead of its own light). The draw is still a pure function
// of the camera-pure pullRaw, so a reverse scrub un-inks each body stroke by
// stroke exactly as it inked (D16).
//
// 0.16 -> 0.28 (2026-08-07, "animate in slower one at a time"), then a single
// constant -> the per-body taper below (2026-08-09, "one at a time — like a
// town of Christmas trees lighting up"). The draw is still the SAME FRONT at
// the same threshold, running wider than the light — the hero's relation: on
// the landing page the hero's strokes ink in at FULL opacity with the tip
// ember riding the drawing front; it is never a dim body being drawn, it is a
// lit body still drawing. Every guarantee 070892c bought stays: the failure
// it fixed was a body DRAWN AND DARK (draw ahead of light), and every width
// in the taper keeps the draw at or behind the light's own pace.
//
// WHY A TAPER AND NOT A CONSTANT. The arrival ladder is now authored in p
// (ring.js FIELD_LADDER / world.js RING_LADDER: sparse opening singles,
// tightening as the town fills), and the camera crosses uPull ever faster
// into the rest — so a single width means the OPENING arrivals, which have
// the whole road to themselves, draw no slower than the CLOSING ones, which
// land a fifth of a second apart. The taper gives the early singles a long,
// watchable kindling (0.26 of pullRaw, ~a third of a second at a deliberate
// scroll) and lets the late fills snap in (0.12 — quick pops read as events
// even when they overlap; slow oozes just read as a wave), and it is what
// frees the ladder's tail at all: the last rung starts at 0.8379 and
// 0.8379 + 0.12 = 0.958 finishes far inside the 1.1200 the camera-pure
// pullRaw reaches at the rest, where + 0.26 would leave no margin. The width
// is a pure function of the body's own threshold — one more constant per
// body, computed once, nothing time-based, reverse scrubs unchanged (D16).
const DRAW_W_HI = 0.26;        // the opening singles' own kindling width
const DRAW_W_LO = 0.12;        // the closing fills' — a pop, not an ooze
const drawWOf = (reveal) => {
  const t = Math.min(1, Math.max(0, (reveal - 0.10) / (0.84 - 0.10)));
  return DRAW_W_HI - (DRAW_W_HI - DRAW_W_LO) * t;
};
// Arrival-bloom strength: peak brightness over resting level as a body's
// draw completes (see the bloom term in update()). The shape is borrowed
// from hero.css core-pop — overshoot, then settle to the resting style.
const BLOOM_A = 0.35;

// organism's own injectDraw(), re-expressed for a clone's plain overlay-net
// material. The hero grafts uProg/uWin/pulse into the stock line shader at
// compile time and keeps the handle in userData; a clone rebuilds the
// material (it needs an owned .opacity for the reveal write-port), so the
// graft has to be redone here — pointed at THIS clone's uProg and the hero's
// own uWin for that layer. Without it the overlay net is the one layer that
// stands fully drawn while the cap lattice under it is still being stroked,
// and the one layer that does not answer a poke's ripple.
function injectCloneDraw(mat, uProg, uWin, pulse, own, frame, vary) {
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
        '  float ring = exp(-pow((d - uPulseP.x * uPulseT) / w, 2.0));\n' +
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

// Below this reveal value a clone's opaque shells are switched off: an unlit
// body must read as a body in the dark, not as a silhouette cut out of the
// haze behind it. 0.02 sits under the 7% ember whisper x the chapter's own
// arm fade, so the shells arrive while the body is still underground behind
// the dissolving soil slab (D16) and leave again on a reverse retract.
const SHELL_ON = 0.02;

// THE SECOND SHELL GATE — now the HERO'S OWN FADE, not a switch.
//
// SHELL_ON alone was sufficient while a body was always fully inked: dim the
// strokes and you still had a dark body. Once a body spends part of uPull only
// PARTLY drawn, its shells — opaque, and carrying no draw state of their own —
// stand there the whole time, and a mid-draw member reads as a solid black
// mushroom cut out of the haze.
//
// organism/intro.js solves exactly this for the hero by FADING each shell
// group in while its own region is being stroked (_shellFade: stem shells over
// uProg 0.30..0.54, cap shells over 0.574..0.714), so solidity follows the
// ink. The first answer here could not do that: a clone SHARED the hero's
// shell materials, so it could only switch its own copies on and off, and it
// switched at the MIDPOINT of each of the hero's fades.
//
// THAT CONSTRAINT IS GONE, and has been since the variation round (66d1bed):
// a deformed body needs its SOLID to move with its outline, so `cloneShellMat`
// gives every body its own two shell materials (48 for the set). They are the
// clone's to fade, and a hard switch on a material nobody else can see was the
// last reason a field body's entry did not look like the hero's. So these are
// intro.js's own windows now, read digit for digit off _shellFade, applied to
// THIS body's own draw progress. A shell never appears over a blank region, no
// region is ever inked without its shell, and — the part the switch could not
// give — the solid arrives GRADUALLY, under accumulating light, exactly as it
// does on the landing page.
const STEM_SHELL_LO = 0.30, STEM_SHELL_HI = 0.54;   // intro.js _shellFade, stem
const CAP_SHELL_LO = 0.574, CAP_SHELL_HI = 0.714;   // intro.js _shellFade, cap

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
function varyVertex(src) {
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
function frameOf(parent, o, bendRoot) {
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
const rootFrame = () => {
  const m = new THREE.Matrix4();
  return { m, uVarM: { value: m }, uVarMI: { value: m } };
};

/** The opaque shells: a per-body clone of the hero's MeshBasicMaterial with
 *  the same map grafted into the stock shader. `transformed` is the stock
 *  local position — varyPt's frame hop is what puts it in the body frame. */
function cloneShellMat(src, own, frame) {
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
const CLAMP_OFF = 1e3;

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

function clonePointsMat(src, s, dropped, fogU, own, frame, vary) {
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

function cloneDenseMat(src, fogU, own, frame, vary) {
  const m = src.clone();
  shareUniforms(m, src, fogU, own, frame);
  m.uniforms.uOpacity = { value: src.uniforms.uOpacity.value };
  if (vary) m.vertexShader = varyVertex(m.vertexShader);
  return m;
}

/* ------------------------------------------------------------------ */
/* The clone set                                                       */
/* ------------------------------------------------------------------ */
const UP = new THREE.Vector3(0, 1, 0);

export function createClones(sceneApi) {
  const stemSrc = sceneApi.groups.stem;               // stemGroup
  const capBendSrc = sceneApi.groups.mushroom.parent; // capBend (pivot at the throat)
  const group = new THREE.Group();
  const list = [];
  const dropped = [];
  // ONE fog pair for the whole clone set — see the FOG comment above.
  const fogU = [{ value: 7 }, { value: 20 }];
  // ONE lid-off uniform for the whole clone set — see CLAMP_OFF above.
  const clampU = { value: CLAMP_OFF };
  // the hero's tap-pulse trio, for the overlay-net graft (the ShaderMaterial
  // layers pick it up through SHARE off their own source material)
  const pulse = heroPulse(sceneApi);
  let ownedMats = 0, shellMeshes = 0, shellMats = 0, drawsPerBody = 0, foreign = 0;

  /* ---- WHAT IS AND IS NOT THE ORGANISM ------------------------------
     The hero's groups are not private: chapters/inspire/index.js parents
     its own decoration group onto `groups.mushroom`, and anything else may
     do the same tomorrow. A clone must copy THE ORGANISM and nothing that
     happens to be hanging off it, so the walk takes only the drawable
     LEAVES that organism.js itself adds to stemGroup / mushroom (every one
     of its own .add() calls is a leaf — there is no nested organism group),
     and every leaf must also carry the organism's own build signature:
     the §-draw injection (uProg / userData.uWin) for its lit materials, or
     a MeshBasicMaterial for the §5 occlusion shells. A foreign subtree is
     counted and skipped, never guessed at. ---- */
  function isOrganismLeaf(o) {
    const m = o.material;
    if (!m) return false;
    if (o.isMesh) return !!m.isMeshBasicMaterial;
    if (o.isPoints || o.isLineSegments || o.isLine) {
      if (m.isShaderMaterial) return !!(m.uniforms && m.uniforms.uProg && m.uniforms.uOpacity);
      return !!(m.userData && m.userData.uWin);      // injectDraw()'d built-in
    }
    return false;
  }

  /* ---- THE VARIATION GUARD, taken once, before the first body ------------
     Two things have to be true for a deformation to be applied consistently
     to all fifteen of a body's layers, and neither is this file's to assume:

       1. every shader the walk will meet must accept the varyPt() rewrite
          (varyVertex's residue check is the real test — a source that still
          reaches the raw `position` anywhere would draw part of the body
          undeformed);
       2. every layer's geometry FRAME must be invertible, because varyPt hops
          into the body frame through it and back. This is where the first cut
          of the guard was wrong and said so out loud, which is the argument
          for having written it: the spine is NOT flat. `mushroom` carries the
          authored cap tilt (~8 deg about x) and a residual offset, so the cap
          leaves sit in a tilted frame while the stem leaves sit in the body
          frame — and a map applied to raw local coordinates would have meant
          two different things on the two halves of one mushroom. The frames
          are now carried explicitly (frameOf) and only their invertibility is
          assumed here.

     If either fails, varyOk is false and NO body is deformed. The failure
     mode is the shipped one-shape field, never a body whose outline and
     interior disagree. ---- */
  function framesInvertible(o, acc, root, bendRoot) {
    // exactly cloneNode's own walk: foreign subtrees are not copied, so they
    // are not ours to measure either (chapters/inspire hangs a group with its
    // own transform off groups.mushroom — see isOrganismLeaf)
    if (!root && !isOrganismLeaf(o)) return true;
    const here = frameOf(acc, o, bendRoot);
    if (Math.abs(here.m.determinant()) < 1e-9) return false;
    for (const ch of o.children) {
      if (!framesInvertible(ch, here, root && ch === sceneApi.groups.mushroom, false)) return false;
    }
    return true;
  }
  function probeVary() {
    if (!framesInvertible(stemSrc, rootFrame(), true, false)) return false;
    if (!framesInvertible(capBendSrc, rootFrame(), true, true)) return false;
    const seen = new Set();
    let ok = true;
    const visit = (o, root) => {
      if (!root && !isOrganismLeaf(o)) return;         // foreign: not ours to patch
      const m = o.material;
      if (m && m.isShaderMaterial && !seen.has(m.vertexShader)) {
        seen.add(m.vertexShader);
        if (!varyVertex(m.vertexShader)) ok = false;
      }
      for (const ch of o.children) visit(ch, root && ch === sceneApi.groups.mushroom);
    };
    visit(stemSrc, true);
    visit(capBendSrc, true);
    return ok && seen.size > 0;
  }
  const varyOk = probeVary();

  /** Walk one root of the hero's graph and build this clone's copy of it.
   *  EVERY layer is kept — the beads, the speckles and the overlay net are
   *  the tissue this whole step-back is about, and the measured budget
   *  (18-one-species.md's draw-call table) says they fit. The only thing
   *  that is ever dropped is a layer this file cannot copy FAITHFULLY: a
   *  point shader whose size expression has drifted out from under the
   *  uScl patch (see clonePointsMat). Better a missing layer than a body
   *  wearing full-size sprites. */
  // `base` below is read off the HERO's live material. That is only safe
  // because the clone set is built once, at chapter construction, before any
  // of the hero's own HUD CALLOUTS can be hovered — furniture.js's §11
  // stem-region highlight MULTIPLIES stemGroup's uOpacity in place while
  // `co-equip` is hot, and a clone built during one would bake the boosted
  // value in as its resting brightness. (The callouts are the hero's only
  // route to that highlight, and they are still live — it is the FIELD's
  // pointer glow that is gone, not the hero's labels.) Do not move this
  // build behind a lazy first-arm.
  function cloneNode(o, mats, shells, s, count, root, own, frame) {
    let c;
    const m = o.material;
    if (!root && !isOrganismLeaf(o)) { foreign++; return null; }
    // this node's geometry frame — inherited unchanged unless the node itself
    // adds a transform (see frameOf). Two distinct frames per body in practice.
    const fr = frameOf(frame, o, o === capBendSrc);
    if (o.isPoints) {
      const pm = clonePointsMat(m, s, dropped, fogU, own, fr, varyOk);
      if (!pm) return null;
      mats.push({ u: pm.uniforms.uOpacity, base: m.uniforms.uOpacity.value });
      ownedMats++;
      c = new THREE.Points(o.geometry, pm);
      if (count) drawsPerBody++;
    } else if (o.isLineSegments || o.isLine) {
      if (m.isShaderMaterial) {
        const dm = cloneDenseMat(m, fogU, own, fr, varyOk);
        mats.push({ u: dm.uniforms.uOpacity, base: m.uniforms.uOpacity.value });
        ownedMats++;
        c = new THREE.LineSegments(o.geometry, dm);
      } else {
        const bm = new THREE.LineBasicMaterial({
          vertexColors: true, blending: THREE.AdditiveBlending,
          transparent: true, opacity: m.opacity, depthWrite: false,
        });
        // the overlay net draws itself on and ripples with the rest of the
        // body (injectCloneDraw) — the hero's graft, on this clone's uProg
        // and the hero's own window for this layer
        if (m.userData && m.userData.uWin) {
          injectCloneDraw(bm, own.uProg, m.userData.uWin, pulse, own, fr, varyOk);
        }
        mats.push({ m: bm, base: m.opacity });
        ownedMats++;
        c = new THREE.LineSegments(o.geometry, bm);
      }
      if (count) drawsPerBody++;
    } else if (o.isMesh) {
      // the opaque occluder. Shared outright until the variation round: a
      // deformed body needs its SOLID to move with its outline, so the
      // material is now this body's own (one clone per distinct source
      // material per body — the §5 shells share one, the stem core has
      // another). Same meshes, same draw count, one extra program.
      let sm = m;
      if (varyOk) {
        sm = own.shellMats.get(m);
        if (!sm) { sm = cloneShellMat(m, own, fr); own.shellMats.set(m, sm); shellMats++; }
      }
      c = new THREE.Mesh(o.geometry, sm);
      shells.push(c);
      shellMeshes++;
      if (count) drawsPerBody++;
    } else {
      // only the spine (stemGroup, capBend, mushroom) is a Group here, and
      // only because it was passed in as a root — see isOrganismLeaf
      c = new THREE.Group();
    }
    c.position.copy(o.position);
    c.quaternion.copy(o.quaternion);
    c.scale.copy(o.scale);
    // the spine is one group deep on the stem side and two on the cap side
    // (capBend -> mushroom), so a root's group children are still spine
    for (const ch of o.children) {
      const cc = cloneNode(ch, mats, shells, s, count,
        root && ch === sceneApi.groups.mushroom, own, fr);
      if (cc) c.add(cc);
    }
    return c;
  }

  /** Stand one clone in the world. All pose inputs come from ring.js's
   *  memberParams — the same seeded stream the species build drew from, so
   *  a member keeps its shipped facing, lean and size. */
  function add({ x, z, gy, s, azFacing, leanDir, leanAmt,
                 arc, reveal, boost, tw0, phase, amp, lum, vary }) {
    const mats = [];
    // two shell groups, because they arrive at two different moments of the
    // draw (STEM_SHELL_LO..HI / CAP_SHELL_LO..HI). The split is free: cloneNode is
    // already called once per spine root.
    const stemShells = [];
    const capShells = [];
    const root = new THREE.Group();
    root.position.set(x, gy, z);
    const qYaw = new THREE.Quaternion().setFromAxisAngle(UP, azFacing);
    const qLean = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(Math.sin(leanDir), 0, -Math.cos(leanDir)).normalize(), leanAmt);
    root.quaternion.copy(qLean).multiply(qYaw);       // yaw first, then lean — a rigid pose
    root.scale.setScalar(s);
    const sway = new THREE.Group();                   // the animated pivot pair
    root.add(sway);
    const count = list.length === 0;                  // measure the first body only
    // THIS BODY'S own entry-draw progress (part B). Parked at the hero's own
    // "fully drawn" value so a body that is never reached by the front — and
    // every body at boot, before the first update() — looks exactly as it
    // always did.
    // THIS BODY'S SHAPE (variation.js). Four uniform objects, created here and
    // handed to every one of the fifteen materials below — see the variation
    // section header: the sharing IS the consistency guarantee.
    const own = {
      uProg: { value: 2 }, uClampY: clampU,
      shellMats: new Map(),
      ...varyUniforms(varyOk ? (vary || IDENTITY) : IDENTITY),
    };
    const F0 = rootFrame();
    const stemC = cloneNode(stemSrc, mats, stemShells, s, count, true, own, F0);
    const capBendC = cloneNode(capBendSrc, mats, capShells, s, count, true, own, F0);
    capBendC.quaternion.identity();                   // strip the hero's live bend snapshot
    sway.add(stemC, capBendC);
    group.add(root);
    // THE TWO SHELL MATERIAL SETS, and the test that says whether this body may
    // fade them. Two things have to hold. (1) The materials must be OURS:
    // without the variation graft cloneShellMat is never reached and the shells
    // are the hero's own, shared outright — writing .opacity on one of those
    // would reach into organism's graph, which is the one thing this file may
    // never do. (2) The two groups must not share a material, or one region's
    // fade would drive the other's. As built they cannot: organism §5's three
    // cap shells share one MeshBasicMaterial on `mushroom` and the stem core
    // has its own on `stemGroup`. Asserted rather than assumed, because a
    // future organism that merged them would otherwise fade a body's cap with
    // its stipe and nobody would know why.
    const stemShellMats = [...new Set(stemShells.map(m => m.material))];
    const capShellMats = [...new Set(capShells.map(m => m.material))];
    const ownShells = varyOk && stemShellMats.length > 0 && capShellMats.length > 0
      && !stemShellMats.some(m => capShellMats.includes(m));
    const c = {
      root, sway, capBend: capBendC, mats,
      stemShells, capShells, stemShellMats, capShellMats, ownShells,
      shells: stemShells.concat(capShells),           // interact.js's narrow phase
      x, z, gy, s,
      arc, reveal, boost, tw0, phase, amp, lum: lum ?? 1,
      drawW: drawWOf(reveal),                         // this body's own kindling width
      tx: 0, tz: 0, tvx: 0, tvz: 0,                   // tap ring-down (stepTap)
      uProg: own.uProg, prog: -1,                     // entry draw (part B)
      v: -1, ks: -1, kc: -1,
    };
    list.push(c);
    return c;
  }

  /** Poke one clone. `point` is the WORLD-space hit point (interact.js's
   *  narrow phase against this body's own opaque shells, so it is a point ON
   *  the mushroom, not the axis of a collider) and `dir` is the view ray the
   *  finger pushes along — organism §10c's own two inputs.
   *
   *  Both are carried into the body's frame through root.matrixWorld, which
   *  undoes the clone's place, yaw, lean AND scale in one step. What comes out
   *  is hero-unit local coordinates: r.y ~ 4 at the cap, ~1 low on the stem,
   *  exactly the numbers §10c's lever arm was tuned against. (The sway pivot
   *  under root is deliberately NOT undone: the hero measures its own hit
   *  point in the swayed world too, so leaving it in keeps the parity exact.)
   *
   *  Returns the local hit point, so the caller can apply the hero's own
   *  cap-tap test (y > 2.8) in the units the hero applies it in. */
  const _mi = new THREE.Matrix4();
  const _rp = new THREE.Vector3();
  const _rd = new THREE.Vector3();
  function poke(c, point, dir) {
    c.root.updateWorldMatrix(true, false);
    _mi.copy(c.root.matrixWorld).invert();
    _rp.copy(point).applyMatrix4(_mi);
    _rd.copy(dir).transformDirection(_mi).normalize();
    kickTap(c, _rp, _rd);
    return _rp;
  }

  /** Per-frame drive: the chapter's reveal choreography (the exact shader
   *  law from world.js STRAND_VERT, evaluated per body on the CPU — one
   *  scalar per clone instead of per vertex) and the gentle sway. Reads the
   *  chapter's shared uniforms — pure in the pose
   *  (uAmount/uPull) exactly like the batches, so reverse scrubs retract
   *  clones and nothing self-ignites (D16). */
  function update(t, dt, uniforms) {
    const eff = uniforms.uAmount.value;
    const pull = uniforms.uPull.value;
    // The draw front runs on the UNCLAMPED pull. pullOf() floors at 0 from
    // camera x −8 back, which is the surface pierce — a body keyed to draw
    // before then would arrive at the pierce already 80% inked and finish the
    // rest in open view. On the raw value the near bodies do their whole
    // drawing underground, behind the soil slab the chapter is dissolving,
    // and only the far ones ink in over the opening field, which is the point.
    const pullRaw = uniforms.uPullRaw.value;
    // the chapter's fog ramp, not the hero's fixed pair (see FOG above)
    fogU[0].value = uniforms.uFogNear.value;
    fogU[1].value = uniforms.uFogFar.value;
    const fr = uniforms.uFront.value, frOn = uniforms.uFrontOn.value;
    const ct = uniforms.uCta.value, ctOn = uniforms.uCtaOn.value;
    for (const c of list) {
      // ---- part B: this body draws ITSELF on as the front reaches it ----
      // Pure in the pose, and on the KINDLE'S OWN front at the kindle's own
      // width (see DRAW_W_HI/LO) — the ink and the light arrive together, which is
      // the hero's relation and the whole of the entry-parity fix. At d = 1 the
      // uniform is parked at the hero's own 2 — which is BYTE-IDENTICAL to
      // holding it at DRAW_HI (dp saturates at 1 either way, the tip term is
      // switched off by the same step(), and the lid is inert at CLAMP_OFF),
      // so the rest frame is the shipped rest frame.
      const d = smooth01((pullRaw - c.reveal) / c.drawW);
      let prog = c.uProg.value;
      if (d !== c.prog) {
        c.prog = d;
        prog = d >= 1 ? 2 : DRAW_LO + d * (DRAW_HI - DRAW_LO);
        c.uProg.value = prog;
      }
      const rv = smooth01((pull - c.reveal) / 0.16);  // REVEAL_W
      // The arrival bloom — the house's own onset (hero.css core-pop: the
      // callout node overshoots and settles, the instrument powering on).
      // A body flares ~1.35x over its resting level as its draw completes,
      // then settles by d = 1 exactly — so every frozen rest frame, where
      // every drawn body sits at d = 1, is untouched. Pure in the pose:
      // a reverse scrub re-runs the flare mirror-exact on the way out
      // (D16 asks for exact retraction, not for asymmetry).
      const bloom = 1 + BLOOM_A
        * smooth01((d - 0.30) / 0.45) * (1 - smooth01((d - 0.75) / 0.25));
      let b = (0.07 + 0.93 * rv) * bloom;             // the 7% ember whisper
      const df = c.arc - fr;
      b += c.boost * frOn * Math.exp(-df * df * 260) * (0.30 + 0.60 * rv);
      const dc = c.arc - ct;
      b += c.boost * ctOn * Math.exp(-dc * dc * 200) * 1.1;
      b *= 0.88 + 0.12 * Math.sin(t * 0.9 + c.tw0);   // strand twinkle
      const v = eff * b * c.lum;
      if (Math.abs(v - c.v) > 1e-4) {
        c.v = v;
        for (const e of c.mats) {
          if (e.u) e.u.value = e.base * v;
          else e.m.opacity = Math.min(1, e.base * v);
        }
      }
      // BOTH shell gates, every frame (they answer to two different drivers —
      // the reveal AND the draw — and the reveal's own early-out above would
      // otherwise strand the draw's half of the test). SHELL_ON stays the outer
      // gate: a body the reveal has retracted drops its shells outright rather
      // than easing them, so a reverse scrub leaves nothing standing.
      const lit = v > SHELL_ON;
      // intro.js's own fade windows, on THIS body's draw. Falls back to the
      // shipped midpoint switch when the shells are not ours to write (see
      // ownShells in add()) — the same behaviour, never a half-applied one.
      let ks, kc;
      if (c.ownShells) {
        ks = lit ? clamp01((prog - STEM_SHELL_LO) / (STEM_SHELL_HI - STEM_SHELL_LO)) : 0;
        kc = lit ? clamp01((prog - CAP_SHELL_LO) / (CAP_SHELL_HI - CAP_SHELL_LO)) : 0;
      } else {
        ks = lit && prog >= (STEM_SHELL_LO + STEM_SHELL_HI) / 2 ? 1 : 0;
        kc = lit && prog >= (CAP_SHELL_LO + CAP_SHELL_HI) / 2 ? 1 : 0;
      }
      if (ks !== c.ks) {
        c.ks = ks;
        if (c.ownShells) shellFade(c.stemShells, c.stemShellMats, ks);
        else for (const sh of c.stemShells) sh.visible = ks > 0;
      }
      if (kc !== c.kc) {
        c.kc = kc;
        if (c.ownShells) shellFade(c.capShells, c.capShellMats, kc);
        else for (const sh of c.capShells) sh.visible = kc > 0;
      }
      // the two-pivot sway, phase-scattered so no two bodies nod together —
      // with the tap ring-down integrated ON TOP, exactly as organism §10c's
      // 'breeze' animator does it, so a poked clone keeps swaying while it
      // recovers instead of freezing into a rigid wobble. The sway is damped
      // per body (c.amp — adr-d3, "the field does not ride the hero's wind");
      // the TAP is not. A poke is the visitor's own force, not the weather,
      // and it answers at full strength on every body.
      stepTap(c, dt);
      const w = breeze(t + c.phase);
      c.sway.rotation.z = -w * 0.034 * c.amp + c.tz;
      c.sway.rotation.x = breeze(t * 0.93 + c.phase + 2.0) * 0.007 * c.amp + c.tx;
      // the head trails the stalk: the hero's own first-order Taylor step back
      // along the tap's motion, at the hero's own 0.38 gain
      c.capBend.rotation.z = -breeze(t + c.phase - 0.30) * 0.013 * c.amp
                           + (c.tz - 0.30 * c.tvz) * 0.38;
    }
  }

  /** Drop every body's poke state on the floor. Called when the chapter
   *  retires: a body left mid-wobble would re-enter the next ride still
   *  swinging from a poke nobody in that ride gave it, and the ring-down
   *  alone would need a dozen frames it is not going to get. */
  function cool() {
    for (const c of list) {
      clearTap(c);
      c.sway.rotation.z = 0; c.sway.rotation.x = 0;
    }
  }

  /** LIVE QA: which bodies are still ringing from a poke, and by how many
   *  degrees. The wobble is a few pixels at field scale by design (the hero's
   *  ANGLE, not the hero's pixel throw), so a number is a better witness than
   *  a screenshot when tuning it. */
  function ringing() {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (isRinging(c)) out.push({ i, deg: +(Math.hypot(c.tx, c.tz) * 57.3).toFixed(4) });
    }
    return out;
  }

  return {
    group, add, update, cool, poke, ringing,
    /** Whether per-body variation survived the guard. ring.js reads it so the
     *  species band varies exactly when the clone band does — one field, one
     *  answer, never a near half that varies and a far half that does not. */
    varyOk,
    get counts() {
      return {
        bodies: list.length, ownedMats, shellMeshes, shellMats,
        drawsPerBody, dropped: dropped.length, foreign, varyOk,
      };
    },
  };
}
