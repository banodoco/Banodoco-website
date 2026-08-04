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
//                choreography (uAmount x uPull whisper/kindle, D16-pure)
//                and for the hover/click glow.
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

/* ---- the hero's §11 highlight language, shared with ring.js so species
   batch members breathe EXACTLY like clones do. furniture.js createHighlights:
   ease h += (tgt - h) * min(1, dt*5); boost 1 + h*(gain + gain*0.38*sin(t*3.1)).
   Click adds a one-shot pulse envelope on the pulseDriver idiom (fire -> a
   sine swell over CLICK_SECS, then inert). ---- */
export const HOVER_GAIN = 0.85;   // the spores-region gain: legible at field distance
export const CLICK_SECS = 1.4;
export const CLICK_GAIN = 1.1;

/** furniture.js's breathing boost, as an additive term: h * (gain +
 *  gain*0.38*sin(t*3.1)). Split out because the batched species bodies
 *  publish hover and click on TWO shader channels (world.js uHotAmt /
 *  uTapAmt) so a tap's decay survives the pointer moving on, while a clone
 *  applies the sum to its own materials. */
export const hoverTerm = (st, t) =>
  st.h * (HOVER_GAIN + HOVER_GAIN * 0.38 * Math.sin(t * 3.1));

/** The click pulse: one sine swell over CLICK_SECS, then inert (the hero's
 *  pulseDriver idiom). Zero once the envelope has run out. */
export const clickTerm = (st) =>
  st.clickT < CLICK_SECS
    ? CLICK_GAIN * Math.sin(Math.min(st.clickT / CLICK_SECS, 1) * Math.PI)
    : 0;

/** Advance one member's hover/click state (st: {h, tgt, clickT}) and return
 *  the additive glow term x — callers apply `1 + x`. */
export function easeHover(st, t, dt) {
  st.h += (st.tgt - st.h) * Math.min(1, dt * 5);
  if (st.h < 0.004 && st.tgt === 0) st.h = 0;
  st.clickT += dt;
  return hoverTerm(st, t) + clickTerm(st);
}

/** True while a state still has something to say — the caller can skip
 *  every cold body without touching it. */
export const isWarm = (st) => st.h !== 0 || st.tgt !== 0 || st.clickT < CLICK_SECS;

// Mirror of organism.js §10b breeze() — chapter-owned copy (organism is
// read-only and its instance is private to the closure). Same three modes
// under the same ~48s gust swell; clones run it phase-shifted and damped.
function breeze(t) {
  const gust = 0.55 + 0.45 * Math.sin(t * 0.13 + 0.6);
  return gust * (0.62 * Math.sin(t * 1.20)
               + 0.26 * Math.sin(t * 1.83 + 1.3)
               + 0.07 * Math.sin(t * 2.60 + 2.7));
}

const smooth01 = (x) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };

// Below this reveal value a clone's opaque shells are switched off: an unlit
// body must read as a body in the dark, not as a silhouette cut out of the
// haze behind it. 0.02 sits under the 7% ember whisper x the chapter's own
// arm fade, so the shells arrive while the body is still underground behind
// the dissolving soil slab (D16) and leave again on a reverse retract.
const SHELL_ON = 0.02;

/* ------------------------------------------------------------------ */
/* Material cloning                                                    */
/* ------------------------------------------------------------------ */
// Uniform objects a clone must SHARE with its source material, by name.
// Anything animated or global lands here; anything owned is created fresh.
const SHARE = [
  'map', 'time',                          // glow sprite + shimmer clock
  'uProg', 'uWin', 'uClampY',             // entry-draw state (parked post-intro)
  'uPulseC', 'uPulseT', 'uPulseP',        // the tap pulse — taps ripple into clones
  'uRes', 'uFadeOn',                      // coverage fade (resize keeps working)
];

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

function shareUniforms(dst, src, fogU) {
  for (const k of SHARE) if (src.uniforms[k]) dst.uniforms[k] = src.uniforms[k];
  for (let i = 0; i < FOG.length; i++)
    if (src.uniforms[FOG[i]]) dst.uniforms[FOG[i]] = fogU[i];
}

const SZ_TAG = 'float sz = psize * vTw * (300.0 / -mv.z)';

function clonePointsMat(src, s, dropped, fogU) {
  if (!src.vertexShader.includes(SZ_TAG) || !src.vertexShader.includes('uniform float time;')) {
    dropped.push('points');               // organism shader drifted: drop, never mis-size
    return null;
  }
  const m = src.clone();
  shareUniforms(m, src, fogU);
  m.uniforms.uOpacity = { value: src.uniforms.uOpacity.value };
  m.uniforms.uScl = { value: s };
  m.vertexShader = m.vertexShader
    .replace('uniform float time;', 'uniform float time;\n      uniform float uScl;')
    .replace(SZ_TAG, 'float sz = uScl * psize * vTw * (300.0 / -mv.z)');
  return m;
}

function cloneDenseMat(src, fogU) {
  const m = src.clone();
  shareUniforms(m, src, fogU);
  m.uniforms.uOpacity = { value: src.uniforms.uOpacity.value };
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
  let ownedMats = 0, sharedMeshes = 0, drawsPerBody = 0, foreign = 0;

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

  /** Walk one root of the hero's graph and build this clone's copy of it.
   *  EVERY layer is kept — the beads, the speckles and the overlay net are
   *  the tissue this whole step-back is about, and the measured budget
   *  (18-one-species.md's draw-call table) says they fit. The only thing
   *  that is ever dropped is a layer this file cannot copy FAITHFULLY: a
   *  point shader whose size expression has drifted out from under the
   *  uScl patch (see clonePointsMat). Better a missing layer than a body
   *  wearing full-size sprites. */
  // `base` below is read off the HERO's live material. That is only safe
  // because the clone set is built once, at chapter construction, before
  // anything can be hovered — furniture.js's §11 stem-region highlight
  // MULTIPLIES stemGroup's uOpacity in place while it is hot, and a clone
  // built during one would bake the boosted value in as its resting
  // brightness. Do not move this build behind a lazy first-arm.
  function cloneNode(o, mats, shells, s, count, root) {
    let c;
    const m = o.material;
    if (!root && !isOrganismLeaf(o)) { foreign++; return null; }
    if (o.isPoints) {
      const pm = clonePointsMat(m, s, dropped, fogU);
      if (!pm) return null;
      mats.push({ u: pm.uniforms.uOpacity, base: m.uniforms.uOpacity.value });
      ownedMats++;
      c = new THREE.Points(o.geometry, pm);
      if (count) drawsPerBody++;
    } else if (o.isLineSegments || o.isLine) {
      if (m.isShaderMaterial) {
        const dm = cloneDenseMat(m, fogU);
        mats.push({ u: dm.uniforms.uOpacity, base: m.uniforms.uOpacity.value });
        ownedMats++;
        c = new THREE.LineSegments(o.geometry, dm);
      } else {
        const bm = new THREE.LineBasicMaterial({
          vertexColors: true, blending: THREE.AdditiveBlending,
          transparent: true, opacity: m.opacity, depthWrite: false,
        });
        mats.push({ m: bm, base: m.opacity });
        ownedMats++;
        c = new THREE.LineSegments(o.geometry, bm);
      }
      if (count) drawsPerBody++;
    } else if (o.isMesh) {
      c = new THREE.Mesh(o.geometry, m);              // opaque occluder: share whole
      shells.push(c);
      sharedMeshes++;
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
        root && ch === sceneApi.groups.mushroom);
      if (cc) c.add(cc);
    }
    return c;
  }

  /** Stand one clone in the world. All pose inputs come from ring.js's
   *  memberParams — the same seeded stream the species build drew from, so
   *  a member keeps its shipped facing, lean and size. */
  function add({ x, z, gy, s, azFacing, leanDir, leanAmt,
                 arc, reveal, boost, tw0, phase, amp, lum }) {
    const mats = [];
    const shells = [];
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
    const stemC = cloneNode(stemSrc, mats, shells, s, count, true);
    const capBendC = cloneNode(capBendSrc, mats, shells, s, count, true);
    capBendC.quaternion.identity();                   // strip the hero's live bend snapshot
    sway.add(stemC, capBendC);
    group.add(root);
    const c = {
      root, sway, capBend: capBendC, mats, shells,
      x, z, gy, s,
      arc, reveal, boost, tw0, phase, amp, lum: lum ?? 1,
      h: 0, tgt: 0, clickT: 1e9,                      // hover/click state (easeHover)
      v: -1, shellsOn: true,
    };
    list.push(c);
    return c;
  }

  /** Per-frame drive: the chapter's reveal choreography (the exact shader
   *  law from world.js STRAND_VERT, evaluated per body on the CPU — one
   *  scalar per clone instead of per vertex), the hover/click glow, and the
   *  gentle sway. Reads the chapter's shared uniforms — pure in the pose
   *  (uAmount/uPull) exactly like the batches, so reverse scrubs retract
   *  clones and nothing self-ignites (D16). */
  function update(t, dt, uniforms) {
    const eff = uniforms.uAmount.value;
    const pull = uniforms.uPull.value;
    // the chapter's fog ramp, not the hero's fixed pair (see FOG above)
    fogU[0].value = uniforms.uFogNear.value;
    fogU[1].value = uniforms.uFogFar.value;
    const fr = uniforms.uFront.value, frOn = uniforms.uFrontOn.value;
    const ct = uniforms.uCta.value, ctOn = uniforms.uCtaOn.value;
    for (const c of list) {
      const glow = easeHover(c, t, dt);
      const rv = smooth01((pull - c.reveal) / 0.16);  // REVEAL_W
      let b = 0.07 + 0.93 * rv;                       // the 7% ember whisper
      const df = c.arc - fr;
      b += c.boost * frOn * Math.exp(-df * df * 260) * (0.30 + 0.60 * rv);
      const dc = c.arc - ct;
      b += c.boost * ctOn * Math.exp(-dc * dc * 200) * 1.1;
      b *= 0.88 + 0.12 * Math.sin(t * 0.9 + c.tw0);   // strand twinkle
      const v = eff * b * c.lum * (1 + glow);
      if (Math.abs(v - c.v) > 1e-4) {
        c.v = v;
        for (const e of c.mats) {
          if (e.u) e.u.value = e.base * v;
          else e.m.opacity = Math.min(1, e.base * v);
        }
        const on = v > SHELL_ON;
        if (on !== c.shellsOn) {
          c.shellsOn = on;
          for (const sh of c.shells) sh.visible = on;
        }
      }
      // the two-pivot sway, phase-scattered so no two bodies nod together
      const w = breeze(t + c.phase);
      c.sway.rotation.z = -w * 0.034 * c.amp;
      c.sway.rotation.x = breeze(t * 0.93 + c.phase + 2.0) * 0.007 * c.amp;
      c.capBend.rotation.z = -breeze(t + c.phase - 0.30) * 0.013 * c.amp;
    }
  }

  /** Drop every body's pointer state on the floor. Called when the chapter
   *  retires: the ease alone would need a dozen frames it is not going to
   *  get, and a body left part-hot re-enters the next ride mid-glow. */
  function cool() {
    for (const c of list) { c.h = 0; c.tgt = 0; c.clickT = 1e9; }
  }

  return {
    group, add, update, cool,
    get counts() {
      return {
        bodies: list.length, ownedMats, sharedMeshes,
        drawsPerBody, dropped: dropped.length, foreign,
      };
    },
  };
}
