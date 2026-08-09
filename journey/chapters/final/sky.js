// journey-v6 — FINAL epilogue: spore sky + forest-mist horizon (W4-D).
//
// SPORES (FN-2.3): a staged GPU phase shader in the Spike A family — zero
// per-frame CPU, every particle a pure function of (uTime, attributes).
// Two cohorts in one draw:
//   mode 0 — plume-born: released UNDER the caps of the mature ring members
//            (multiple sources, never the hero), rising and merging into the
//            drift band. Gated by the member's reveal, so no body sheds
//            before it has kindled.
//   mode 1 — the broad drift band: born low and wide across the ring, long
//            periods, forming as the sky opens (gated on uPull) — the "broad
//            broken" mass the plumes merge into.
// One wind carries both (BREEZE below), cluster-coherent eddies (particles
// sharing aClump move together), and a peel-away cohort that diverges after
// mid-life. Alpha windows + cluster gaps keep the cloud BROKEN, not a
// uniform haze.
//
// ===========================================================================
// 2026-08-06 — ONE SUBSTANCE (17-final-field.md's dated section)
// ===========================================================================
// Hannah: "the spores coming from the mushroom at the end feel different in
// character to the ones from the main one at the beginning; make them match,
// make the colours work, and make them react to the wind."
//
// Measured at the rest, this layer supplied ~82% of the particulate light in
// frame (mean per-particle output 0.500 against the hero shed's 0.109) — so
// "the spores at the end" ARE these, and every way they differed from
// organism/spores.js was a way the substance differed. Four mechanisms, all
// of them here, all now on the hero's own laws:
//
//   SIZE — the tell, and the biggest one. The hero's shed is mostly
//     SUB-PIXEL: `psize` runs 0.019-0.091 world units, which at its own
//     camera is 0.5-2.4 px, and the point shader's MIN_PT floor holds those
//     at 1.7 px while `vShrink` dims them by the area they lost. The result
//     is a sea of faint dust with a scattering of bright sparks. This layer
//     ran `szBase * 1.9`, which put most of its particles ABOVE the floor at
//     vShrink = 1 — every dot rendering at full brightness, evenly sized.
//     That is a starfield, and it is what the frame looked like. The size law
//     is now the hero's own; depth is handled by the hero's own DOF (below).
//
//   COLOUR — this layer lerped between two ramp SAMPLES, heat(0.52) and
//     heat(0.9), over a tone of 0.5-1.0. A straight lerp cuts the corners off
//     a piecewise ramp, so the mid went pale and the whole population landed
//     in a narrow cream band — cold, even, and (now that a field of warm
//     bodies stands behind it) reading as a separate layer of stars rather
//     than embers in the same air. Colours are now baked per particle through
//     heat() itself on the hero shed's own tone law, so the majority sits
//     amber in the house look and only the top few percent reach white.
//
//   WIND — there was none. The drift ran at a fixed rate along a FLAT
//     (0.975, 0, 0.16); the only time-varying motion was a 63-94 s eddy. The
//     hero's shed is carried by BREEZE_DIR — which lifts — at a speed the
//     gust surges (`carry *= 0.72 + 0.28*breeze(t)`). Both are now shared:
//     one wind vector for the whole field, and the gust surge in closed form
//     (breezeInt below).
//
//   LIFETIME — mode 1's alpha was a slow sinusoid unrelated to its drift
//     phase, so a particle teleported back to its birth point mid-cycle while
//     visible. With the wind now lifting it, that wrap would be a fall. Both
//     cohorts run one life window on their own phase.
//
// WHY ONE GLOBAL WIND AND NOT 72 LOCAL ONES. The field's bodies each carry a
// seeded sway (clones.js), so a spore could in principle answer the body it
// came from. It should not. A wind is one air current and the bodies' sways
// are RESPONSES to it, not sources — organism.js §10b says exactly this
// ("Sharing one signal is what makes the motion read as air rather than as
// two unrelated animations"), and it is why the hero's stalk and the hero's
// spores ride the same `breeze(t)`. Measured against the alternative: at the
// rest camera a field body's cap rim moves ~1 px through its whole sway, so a
// release point pinned to it buys nothing visible — while a MIS-phased one
// (this shader has no per-body state; it would have to re-seed the phase) is
// a real error at the same scale. One wind, and the bodies lean in it.
//
// HORIZON (FN-1.3): conifer-silhouette line strokes + mist sprites at
// 26-46 world units from the Final rest camera — a far plane for the frame
// now that the fog opens to ~60. Fog does most of the dimming.

import * as THREE from 'three';
import {
  TAU, RING_C, SPORE_SOURCES,
  makeRng, gaussOf, heat, groundY, makeBatch, makeStrandMat, makePointsMat,
} from './world.js';
import { makeGlowTexture } from '../../anatomy.js';

// Final rest camera (build-time composition anchor, mirrors director key).
const REST = { x: -13.9, y: 3.4, z: 2.55, headingDeg: -22.7 };

// THE ONE WIND — organism/spores.js §10's own BZX/BZY/BZZ, normalized here
// (the same three numbers final/shed.js already mirrors for the poke's puff).
// It LIFTS: y/x = 0.62 is the diagonal the hero's plume climbs, and the
// separate `rise` term this file used to carry is gone into it.
const BREEZE = new THREE.Vector3(1.0, 0.62, 0.17).normalize();

// Sprite size: the hero shed's own law, pow(rand,1.8)*0.072 + 0.019 world
// units (organism/spores.js §10). Absolute, per final/shed.js's own note — a
// spore is a spore, it does not resize with the body or the framing.
const SZ_MIN = 0.019, SZ_SPAN = 0.072, SZ_POW = 1.8;
// DEPTH, and the one number this chapter has to choose for itself.
//
// The hero's point shader carries a fake depth-of-field: outside a focal band
// a sprite GROWS and dims — vBlur = clamp(|depth − 9.5| / 8), size
// *= 1 + 1.35*vBlur, light *= 1 − 0.55*vBlur (organism.js makePoints). It is
// not decoration: it is the reason the hero's far spores stay legible instead
// of falling under MIN_PT and being crushed to nothing by vShrink.
//
// Measured, that crush is the whole problem at this distance. A hero-sized
// spore 24 units out is 0.23 px, which vShrink dims to 1.8% — so with the
// hero's sizes and no DOF the far half of this cloud simply is not there, and
// the frame goes top-heavy and thin (the first cut did exactly that).
//
// So the chapter takes the hero's LAW and re-centres its band on its own
// composition: the ring and near field carry the frame at 6-14 units, the
// species tiers walk out to ~36, the horizon sits at 46. FOCAL 10.5 with a
// 14-unit range puts vBlur at 1 by ~24.5 units, where the 2.35x growth almost
// exactly cancels the 1/d shrink — a 24-unit spore ends up the same size on
// screen as an 11-unit one and 45% as bright. That is what makes the whole
// cloud read as one substance seen at many depths instead of two populations,
// and the depth cue moves into brightness and fog, which is where the rest of
// this chapter already keeps it (clones.js's cloneLum, ring.js's tier lum).
const FOCAL_D = 10.5, FOCAL_R = 14.0;
// Tone: the hero shed's own draw, `0.64 + pow(rand,1.9)*0.36`, through heat().
// (1.4 → 1.9 on 2026-08-09 with the hero's own draw — the white top-tail
// thinned across the one substance; see organism/spores.js.)
const TONE_MIN = 0.64, TONE_SPAN = 0.36, TONE_POW = 1.9;
// The hero's point material carries uOpacity 2.4 on the shed. Same number.
const SPORE_GAIN = 2.4;

export function createFinalSky(sceneApi, uniforms) {
  const rand = makeRng(88417);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();
  const glowTex = makeGlowTexture();
  const counts = {};

  /* ================================================================
     1. The spore cloud — one Points draw, GPU phase
     ================================================================ */
  // Declutter round: 3,600 -> 5,200 with the growth all in the standing
  // broad cloud (mode 1), per the grade pass's honest gap ("the still's
  // spore sky is far denser") — density in the SKY is atmosphere, and it
  // buys back the richness the floor's culled strokes gave up.
  const N_SPORE = 5200;
  counts.spores = N_SPORE;
  // world.js's shed-weighted source list, re-sorted by distance from the rest
  // camera. WHICH bodies read is a framing question, so it is decided here,
  // where the rest camera is already known, and not in world.js.
  const SRC_NEAR = SPORE_SOURCES.slice().sort((a, b) =>
    Math.hypot(a.x - REST.x, a.gy + a.h - REST.y, a.z - REST.z) -
    Math.hypot(b.x - REST.x, b.gy + b.h - REST.y, b.z - REST.z));
  const sporeGeo = (() => {
    const position = new Float32Array(N_SPORE * 3);
    const color = new Float32Array(N_SPORE * 3);    // baked heat(), see header
    const aSeed = new Float32Array(N_SPORE);
    const aCycle = new Float32Array(N_SPORE * 4);  // period, phase, size, carry
    const aClump = new Float32Array(N_SPORE * 2);  // clump phase, peel flag
    const aGate = new Float32Array(N_SPORE * 2);   // reveal threshold, mode
    const c = new THREE.Color();
    for (let i = 0; i < N_SPORE; i++) {
      // Rebalanced 0.60 -> 0.46 toward the plumes. Two reasons, both
      // measured: the standing band WAS the starfield, and — the one that
      // decides it — density. The hero's shed puts 4,200 particles into a
      // cone about four units across, and that concentration is most of why
      // it reads as a substance. Spread the same order of particles over a
      // 26-unit-wide sky and each cubic unit holds a twentieth as many, which
      // is a haze, not a shed. There are only SEVEN shedding bodies in the
      // frame, so pushing the majority into their plumes is what buys back a
      // hero-like packing anywhere at all. 0.38 emptied the upper-left sky
      // further than the composition wants — doc 17's declutter round grew
      // this cohort deliberately, because density in the sky IS atmosphere —
      // so 0.46 is where the plumes still pack and the far air still breathes.
      // Total count unchanged: no cost.
      const highBand = rand() < 0.46;              // mode 1: the drift band
      let x, y, z, revealT;
      if (highBand) {
        // Spread across the ring interior. Declutter round: biased downwind
        // (+x) but not hard, and a third of the mass over the frame-LEFT arc
        // (world −z) — the old all-right bias fed the left-of-frame
        // imbalance. Kept clear of the copy block so legibility is untouched.
        const a = rand() * TAU, r = Math.pow(rand(), 0.6) * 13;
        const leftHalf = rand() < 0.34;
        x = RING_C.x + Math.cos(a) * r + (leftHalf ? 0.5 + rand() * 4.0 : 2.0 + rand() * 6.5);
        z = RING_C.z + Math.sin(a) * r * 0.9
          + (leftHalf ? -4.5 + rand() * 3.5 : 0.5 + rand() * 4.5);
        // Born LOWER than before (was 2.6/3.2 + up to 4.6/8.5): the one wind
        // now lifts this cohort too, ~0.52 units of rise per unit carried, so
        // the band climbs into the sky it used to simply occupy. The left
        // cohort still stays low, keeping dark ground under the copy block.
        y = leftHalf ? 1.9 + Math.pow(rand(), 0.85) * 3.4
                     : 2.2 + Math.pow(rand(), 0.85) * 6.2;
        revealT = -1;
      } else {
        // Source pick, biased NEAR. world.js weights this list by each body's
        // own shed strength, which is the right physical weighting and the
        // wrong compositional one: there are seven shedding bodies between 7.3
        // and 16.2 units of the rest camera, and spreading the plume cohort
        // evenly over all seven gives every one of them a plume too thin to
        // read as anything but haze — which is what the frame had. A plume is
        // a DENSITY, and density is the one thing the hero's shed has that
        // cannot be faked: 4,200 particles in a cone four units across. The
        // squared draw over the distance-sorted list puts roughly half the
        // cohort on the nearest two bodies, where a plume can actually be
        // seen, and leaves the far ones a whisper — which is also what a real
        // frame does, since the far ones' plumes are 16 units of fog away.
        const src = SRC_NEAR[Math.min(SRC_NEAR.length - 1,
          Math.floor(Math.pow(rand(), 2) * SRC_NEAR.length))];
        const a = rand() * TAU, rr = rand() * src.capR * 0.8;
        x = src.x + Math.cos(a) * rr;
        z = src.z + Math.sin(a) * rr;
        y = src.gy + src.h - 0.12 - rand() * 0.3;   // UNDER the cap, never apex
        revealT = src.reveal;
      }
      position[i * 3] = x; position[i * 3 + 1] = y; position[i * 3 + 2] = z;
      aSeed[i] = rand() * 1000;
      aCycle[i * 4] = highBand ? 26 + rand() * 22 : 11 + rand() * 10;
      aCycle[i * 4 + 1] = rand();
      // the hero shed's own size law (header, SIZE) — a heavy small tail, so
      // most of the cloud sits under the point shader's MIN_PT floor and gets
      // vShrink'd to dust, with a scattering of full-brightness sparks
      aCycle[i * 4 + 2] = SZ_MIN + Math.pow(rand(), SZ_POW) * SZ_SPAN;
      // How far the wind carries this one over its life, in world units.
      // The plume length is the hero's: its shed scatters over age*5.2 units
      // along BREEZE_DIR and then recycles, so a plume off a field cap runs
      // the same distance — a spore is a spore in the same air, and a plume
      // stretched to 16 units (the first cut) is the same particles over
      // three times the volume, i.e. diffuse by construction. The band drifts
      // further because it has been travelling since before the frame opened.
      aCycle[i * 4 + 3] = highBand ? 7.0 + rand() * 7.0 : 4.4 + rand() * 3.0;
      // the hero shed's own tone draw, through the real heat() ramp
      heat(TONE_MIN + Math.pow(rand(), TONE_POW) * TONE_SPAN, c);
      color[i * 3] = c.r; color[i * 3 + 1] = c.g; color[i * 3 + 2] = c.b;
      // 14 eddy clusters; a cluster id quantises the eddy phase so whole
      // groups wheel together — eddies, clusters, isolated points
      const clump = Math.floor(rand() * 14);
      aClump[i * 2] = clump * 2.399 + gauss() * 0.15;
      aClump[i * 2 + 1] = rand() < 0.18 ? 1 : 0;    // peel-away cohort
      aGate[i * 2] = revealT;
      aGate[i * 2 + 1] = highBand ? 1 : 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(position, 3));
    g.setAttribute('color', new THREE.BufferAttribute(color, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    g.setAttribute('aCycle', new THREE.BufferAttribute(aCycle, 4));
    g.setAttribute('aClump', new THREE.BufferAttribute(aClump, 2));
    g.setAttribute('aGate', new THREE.BufferAttribute(aGate, 2));
    return g;
  })();

  const sporeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uPull: uniforms.uPull,
      uAmount: uniforms.uAmount,
      uFogNear: uniforms.uFogNear,
      uFogFar: uniforms.uFogFar,
      uMap: { value: glowTex },
      uWind: { value: BREEZE.clone() },
    },
    vertexShader: /* glsl */ `
      #define MIN_PT 1.7
      attribute float aSeed;
      attribute vec4 aCycle;   // period, phase, size, carry
      attribute vec2 aClump;   // clump phase, peel flag
      attribute vec2 aGate;    // reveal threshold, mode
      uniform float uTime, uPull;
      uniform vec3 uWind;
      varying vec3 vColor;
      varying float vAlpha, vFog, vShrink, vBlur, vTw;
      float hash(float n) { return fract(sin(n) * 43758.5453); }

      // Mirror of organism.js §10b breeze() — a chapter-owned copy, the same
      // one clones.js keeps in JS for the bodies' sway (organism is read-only
      // and its instance is private to that closure). Three modes under one
      // ~48 s gust swell. If the hero's wind ever changes, both mirrors move.
      float breeze(float t) {
        float g = 0.55 + 0.45 * sin(t * 0.13 + 0.6);
        return g * (0.62 * sin(t * 1.20)
                  + 0.26 * sin(t * 1.83 + 1.3)
                  + 0.07 * sin(t * 2.60 + 2.7));
      }
      // ...and its antiderivative, which is what a stateless shader needs.
      // organism/spores.js applies the gust to the drift as a SPEED law
      // (carry *= 0.72 + 0.28*breeze(t)) and integrates it one frame at a
      // time. Here there are no frames — position must be a closed form in
      // uTime — so the speed law is integrated once, analytically. The gust
      // swell G is ~40x slower than the three sway modes, so carrying it as a
      // factor and integrating only the modes (amplitude/omega each) is exact
      // to a few percent, which is well inside the amplitude's own taste
      // band. Peak |breezeInt| ~= 0.686 s; d/dt of this IS breeze(t), so the
      // SPEED modulation a viewer sees is the hero's, to the digit.
      float breezeInt(float t) {
        float g = 0.55 + 0.45 * sin(t * 0.13 + 0.6);
        return -g * (0.516667 * cos(t * 1.20)
                   + 0.142077 * cos(t * 1.83 + 1.3)
                   + 0.026923 * cos(t * 2.60 + 2.7));
      }

      void main() {
        float mode = aGate.y;
        float reveal = aGate.x < -0.5 ? 1.0
                     : smoothstep(aGate.x, aGate.x + 0.16, uPull);
        // the broad band forms as the sky opens
        float bandGate = mode > 0.5 ? smoothstep(0.30, 0.72, uPull) : 1.0;
        float t = fract(uTime / aCycle.x + aCycle.y);
        float h1 = hash(aSeed * 12.9898), h2 = hash(aSeed * 78.233 + 1.0);
        vec3 p = position;
        // THE CARRY. One wind, one vector, for both cohorts — the separate
        // rise term is gone into uWind's own 0.62 y/x lean, which is the
        // diagonal the hero's plume climbs.
        //
        // The gust: the hero's 0.72 + 0.28*breeze speed law, integrated.
        // The 1/0.72 renormalises the MEAN back to the shipped drift rate, so
        // this adds a surge (+-38% of speed, coherent across the whole field)
        // and does not quietly slow the cloud down.
        float spd = aCycle.w / aCycle.x;                 // world units / second
        float carry = (aCycle.w * t + 0.28 * spd * breezeInt(uTime)) / 0.72;
        // Cluster-coherent eddies: whole clumps wheel together. Halved from
        // (1.5, 0.75, 1.35) — they used to be the ONLY motion in this layer
        // with any character and had grown into a slow lava-lamp swirl; now
        // the wind carries the cloud and these are its texture. The PLUMES
        // get a quarter of even that: the hero's shed spreads by
        // 0.07 + age*0.8 around its drift and stays a legible stream for
        // its whole length, and a plume is only a plume while it is tighter
        // than the air it is crossing.
        float tight = mix(0.25, 1.0, mode);
        float e = aClump.x;
        vec3 eddy = vec3(
          sin(uTime * 0.10 + e) * 0.75,
          cos(uTime * 0.083 + e * 1.3) * 0.38,
          sin(uTime * 0.067 + e * 2.1) * 0.68
        ) * (0.35 + 0.65 * t) * tight;
        // peel-away cohort: diverges after mid-life
        float peel = aClump.y * smoothstep(0.45, 0.9, t);
        vec3 peelV = vec3(-1.2 - h1 * 1.6, 0.9, (h2 - 0.5) * 4.0) * peel * tight;
        p += uWind * carry + eddy + peelV;
        // scatter across the drift — the hero's own widening-with-age cone
        p.x += (h1 - 0.5) * 1.2 * t * tight;
        p.z += (h2 - 0.5) * 1.6 * t * tight;
        // ONE life window, both cohorts, on the particle's own phase. The
        // band used to fade on a sinusoid unrelated to its drift phase, which
        // teleported it back to its birth point mid-cycle while visible —
        // survivable while it drifted flat, a visible FALL now that the wind
        // lifts it. The band's window is wider (it is the long-lived mass).
        float life = mode > 0.5
          ? smoothstep(0.0, 0.10, t) * (1.0 - smoothstep(0.80, 1.0, t))
          : smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.72, 1.0, t));
        vAlpha = life * reveal * bandGate * (0.55 + 0.45 * h2);
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFog = -mv.z;
        // near-camera fade: receding through the cloud must not blow out
        vAlpha *= smoothstep(1.6, 3.4, length(mv.xyz));
        // The hero's own twinkle (organism.js makePoints: vTw). It rides BOTH
        // gl_PointSize and the fragment's brightness there, so it is carried to
        // both here too: on the size it pumps the MIN_PT floor's vShrink, on
        // the light it is the shimmer itself. The faint half of the cloud
        // sparkles; the sparks hold steady.
        vTw = 0.85 + 0.15 * sin(uTime * 1.4 + aSeed * 7.0);
        float tw = vTw;
        // ...and its depth-of-field, on this chapter's own focal band (see
        // FOCAL_D). Outside the band a sprite grows and dims by the hero's
        // exact coefficients, which is what keeps the far field's spores the
        // same APPARENT size as the near ones instead of vanishing under
        // MIN_PT. vBlur goes to the fragment as the matching dim.
        vBlur = clamp(abs(vFog - ${FOCAL_D.toFixed(1)}) / ${FOCAL_R.toFixed(1)}, 0.0, 1.0);
        float sz = aCycle.z * tw * (300.0 / -mv.z) * (1.0 + 1.35 * vBlur);
        vShrink = 1.0;
        if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
        gl_PointSize = sz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uAmount, uFogNear, uFogFar;
      varying vec3 vColor;
      varying float vAlpha, vFog, vShrink, vBlur, vTw;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
        gl_FragColor = vec4(vColor * t.a * vTw * vAlpha * uAmount * fogF * vShrink
                            * (1.0 - 0.55 * vBlur) * ${SPORE_GAIN.toFixed(1)}, 1.0);
      }
    `,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const sporePts = new THREE.Points(sporeGeo, sporeMat);
  sporePts.frustumCulled = false;
  group.add(sporePts);

  /* ================================================================
     2. Forest horizon: conifer silhouettes in two fogged distance bands
     ================================================================ */
  // Declutter round: 48 trees -> 26, tones nearly halved, fewer boughs, and
  // a GAP behind the hero's cap sector. Additive line trees can never be
  // the still's dark silhouettes — at the old brightness they read as
  // scratchy "sticks" all over the sky (Hannah, both rounds). Now they are
  // whispers behind the mist, which carries the horizon instead.
  const trees = makeBatch();
  {
    const head = (REST.headingDeg * Math.PI) / 180;
    for (const [band, distLo, distHi, n, tone] of [
      [0, 26, 34, 11, 0.17], [1, 36, 46, 15, 0.125],
    ]) {
      for (let i = 0; i < n; i++) {
        // spread across the frame; thinner on the far left where the copy
        // block owns the upper-left negative space
        const rel = (-0.62 + (i / (n - 1)) * 1.5 + gauss() * 0.05);   // radians off gaze
        if (rel > 0.08 && rel < 0.32) continue;   // keep the hero's sky clean
        const th = head + rel;
        const dist = distLo + rand() * (distHi - distLo);
        const x = REST.x + Math.cos(th) * dist;
        const z = REST.z + Math.sin(th) * dist;
        const gy = groundY(x, z);
        const h = (rel < -0.30 ? 2.6 : 4.0) + rand() * (band ? 4.5 : 3.0);
        const tw = rand() * TAU;
        const meta = { tw, reveal: -1 };
        // trunk
        trees.seg(x, gy, z, x + gauss() * 0.1, gy + h, z + gauss() * 0.1, tone, tone * 1.3, meta);
        // conifer chevrons: symmetric drooping bough PAIRS, wide at the base
        // narrowing to the crown — the silhouette, not a streak
        const NB = 4 + Math.floor(rand() * 2);
        // bough plane roughly facing the rest camera
        const face = Math.atan2(REST.z - z, REST.x - x) + Math.PI / 2;
        for (let b = 0; b < NB; b++) {
          const u = b / NB;
          const by = gy + h * (0.18 + 0.78 * u);
          const bw = (1 - u * 0.85) * (1.3 + rand() * 1.2);
          for (const sgn of [-1, 1]) {
            trees.seg(x, by, z,
              x + Math.cos(face) * bw * sgn, by - bw * 0.55, z + Math.sin(face) * bw * sgn,
              tone * 1.25, tone * 0.55, meta);
          }
        }
        // crown tip
        trees.seg(x, gy + h, z, x + gauss() * 0.05, gy + h + 0.5 + rand() * 0.4, z + gauss() * 0.05,
          tone * 1.3, tone * 0.6, meta);
      }
    }
  }
  const treeMat = makeStrandMat(uniforms, 0.7);
  const treeLines = new THREE.LineSegments(trees.geo(), treeMat);
  treeLines.frustumCulled = false;
  group.add(treeLines);
  counts.treeSegs = trees.segCount;

  /* ================================================================
     3. Mist + horizon glow sprites (fade driven by the orchestrator)
     ================================================================ */
  const sprites = [];
  const addSprite = (x, y, z, sx, sy, tone, base) => {
    const mat = new THREE.SpriteMaterial({
      map: glowTex, color: heat(tone, new THREE.Color()).clone(),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.set(sx, sy, 1);
    group.add(s);
    sprites.push({ mat, base, drift: rand() * TAU, spr: s, x0: x });
    return s;
  };
  {
    const head = (REST.headingDeg * Math.PI) / 180;
    // low mist banks among the trees (bases raised: mist carries the
    // horizon now that the trees are whispers)
    for (const [rel, dist, sx, sy, tone, base] of [
      [-0.30, 30, 16, 5, 0.34, 0.065],
      [0.05, 33, 22, 6, 0.36, 0.07],
      [0.42, 28, 18, 5.5, 0.34, 0.065],
      [0.75, 36, 20, 6, 0.32, 0.055],
    ]) {
      const x = REST.x + Math.cos(head + rel) * dist;
      const z = REST.z + Math.sin(head + rel) * dist;
      addSprite(x, 1.6 + rand() * 1.2, z, sx, sy, tone, base);
    }
    // Declutter round: two MID-distance mist bands drifting across the ring
    // itself — the approved still's layered haze between the mushrooms.
    // One sits over the frame-left arc (rebalance), one grazes centre-right.
    const m1x = REST.x + Math.cos(head - 0.34) * 15;
    const m1z = REST.z + Math.sin(head - 0.34) * 15;
    addSprite(m1x, 1.9, m1z, 15, 3.6, 0.36, 0.052);
    const m2x = REST.x + Math.cos(head + 0.30) * 19;
    const m2z = REST.z + Math.sin(head + 0.30) * 19;
    addSprite(m2x, 2.3, m2z, 18, 4.2, 0.34, 0.045);
    // broad warm horizon glow, re-centred (the old +0.28 bias put a bright
    // smear on the right frame edge) + a fainter answer over the left arc
    const gx = REST.x + Math.cos(head + 0.10) * 40;
    const gz = REST.z + Math.sin(head + 0.10) * 40;
    addSprite(gx, 4.5, gz, 42, 11, 0.5, 0.06);
    const lx = REST.x + Math.cos(head - 0.46) * 38;
    const lz = REST.z + Math.sin(head - 0.46) * 38;
    addSprite(lx, 3.6, lz, 26, 8, 0.44, 0.042);
  }

  return {
    group,
    counts,
    /** sprite fade + slow lateral mist drift (sprites sit outside the
     *  shared shader uniforms) */
    update(t, amount) {
      for (const s of sprites) {
        s.mat.opacity = s.base * amount * (0.8 + 0.2 * Math.sin(t * 0.05 + s.drift));
        s.spr.position.x = s.x0 + Math.sin(t * 0.03 + s.drift) * 0.6;
      }
    },
  };
}
