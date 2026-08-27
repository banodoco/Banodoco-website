// journey-v6 — OWNED substrate: THE ROOT WORLD (root-network restage,
// 2026-08-06, journey-v6-plan/20-owned-root-network.md).
//
// WHAT THIS REPLACED AND WHY
// --------------------------
// Until this restage the chapter drew a volumetric mycelial COLONY spread
// along a spine — cords, three depth batches of hyphae, voids, haze — and the
// camera glided through the middle of it on a level gaze. That build was
// faithful to 09-chapter-owned.md and it was, at the rest, a band of light
// hugging the soil lid across the top of the frame with two-thirds of the
// picture empty (the pre-restage owned golden is the record).
//
// Hannah's reference re-frames the section as one legible image:
//
//   · the mushroom's BASE enters the frame at TOP CENTRE — a bright
//     convergence point at the top edge, the stalk's fibres gathering into it;
//   · from that point a WIDE FAN of fine glowing root filaments descends and
//     spreads outward, like a fountain or a willow — dense and bright where
//     they leave the base, thinning and spreading as they fall;
//   · the fan opens into a LUMINOUS NETWORK filling the lower two-thirds:
//     fine amber threads, many small bright nodes where threads cross, and a
//     scattering of brighter starburst convergence points;
//   · the PEOPLE are those brightest intersections (portraits.js).
//
// So the organising idea is no longer "a slab of colony the camera flies
// through" but "one root system, hanging from one point, seen from just under
// it". Everything below is grown from `leg.CROWN`:
//
//   growRoot()      one filament: leaves the crown on an azimuth, droops
//                   under a gravity term, meanders on fbm — a fountain arc,
//                   not a straight spoke
//   PRIMARIES       26 of them, azimuths spread by the golden angle. Roots
//                   heading up the DEPTH axis (at the lens, or away down the
//                   glide) are given extra initial dip so they duck below the
//                   camera corridor; roots heading across it (±z, which is
//                   frame left/right at the rest) stay shallow and fan wide.
//                   That asymmetry is what makes the fan fill the frame
//                   horizontally while leaving the flight path clear.
//   SECONDARIES     branches off the primaries, same law, shorter
//   HAIRS           very short fine filaments off the secondaries — the
//                   "fine amber threads" density, and the thing that stops
//                   the fan reading as a diagram
//   LINKS           the WEB: bowed cross-connections between points on
//                   DIFFERENT roots. This is what turns a fan into a network;
//                   their endpoints are the "small bright nodes where threads
//                   cross" (junction glints).
//   HUBS            5 starburst convergence points, deliberately the same
//                   visual family as CONNECT's hubs (chapters/connect/
//                   tendrils.js: radial spokes + a tight knot + a glow core),
//                   because the reference asks for that family by name and
//                   the site should not grow a second language for it.
//
// Kept from the previous build because they were right and are orientation-
// independent: the soil-underside lid (both crossings pass THROUGH it, which
// is what keeps the seams reading as thresholds), the authored dark voids,
// soil aggregates, the amber haze backdrop, the interaction-only colony
// surge, and uFade on every layer for the T3 streaming seam.
//
// COLOUR-PIPELINE NOTE is unchanged: levels are calibrated for the hero
// composer (UnrealBloom -> TAA -> OutputPass/ACES), via index.js's EXPOSURE_*.
import * as THREE from 'three';
import * as H from '../../lib/helpers.js';
import { readBakedSubstrate } from './substrate-baked.js';
import { createStrandOwnership } from './substrate-ownership.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

/* Adapted copy of the spike's pulse material with two additions: uFade (the
   T3 seam ramp — the whole chapter eases in/out, never switches) and an
   optional near-fade window. The near-fade exists so a strand grazing the
   lens softens away instead of blazing into a flat ribbon; the root fan
   needs a TIGHTER window than the old colony did, because the crown itself
   now sits 1.85 units from the rest camera and the default 1.1->2.9 ramp
   would dim the picture's brightest point to a third of its level. */
export function makeFadePulseMat(baseColor, opts = {}) {
  const nf = opts.nearFade || [1.1, 2.9];
  // alongTaper: brightness at aAlong = 1 relative to aAlong = 0. The root fan
  // asks for this by name — "dense and bright where they leave the base,
  // thinning and spreading as they fall" is a taper along the filament, not a
  // depth fade, and doing it with fog instead would dim the far side of the
  // frame rather than the ends of the roots. 1 = off (every prior caller).
  const tp = opts.alongTaper ?? 1;
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uPulseOn: { value: 0 },
      uFade: { value: 0 },
      uBase: { value: opts.baseOpacity ?? 0.35 },
      uColor: { value: new THREE.Color(baseColor) },
      uPulseColor: { value: new THREE.Color(opts.pulseColor ?? 0xf0c877) },
      uPulseWidth: { value: opts.pulseWidth ?? 0.12 },
      uTwinkle: { value: opts.twinkle ?? 0.35 },
      uFogDensity: { value: opts.fogDensity ?? 0.0 },
      // M5 ignition audit (D16): optional draw-on gate. A strand is visible
      // where aAlong < uGrow (0.15 feathered tip), so a batch can GROW from
      // its aAlong=0 roots instead of fading in whole. Default 2.0 = fully
      // grown = inert for every existing user of this material.
      uGrow: { value: 2.0 },
      // LOCAL ROOTS (2026-08-06, report C). Only injected for a material that
      // asks (`ownerGate`), and only that material gains the aOwner attribute
      // and these two uniforms — every other caller compiles the exact
      // pre-change shader, byte for byte.
      ...(opts.ownerGate ? {
        uOwner: { value: -1 },
        uOwnerAmt: { value: 0 },
      } : {}),
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      varying float vAlong, vStrand, vFogDepth;
      ${opts.ownerGate ? `
      attribute float aOwner;
      uniform float uOwner, uOwnerAmt;
      varying float vOwn;` : ''}
      void main() {
        vAlong = aAlong;
        vStrand = aStrand;
        ${opts.ownerGate ? 'vOwn = step(abs(aOwner - uOwner), 0.5) * uOwnerAmt;' : ''}
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uPulse, uPulseOn, uFade, uBase, uPulseWidth, uTwinkle, uFogDensity, uGrow;
      uniform vec3 uColor, uPulseColor;
      varying float vAlong, vStrand, vFogDepth;
      ${opts.ownerGate ? 'varying float vOwn;' : ''}
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.6 + vStrand * 1.7) + vStrand * 43.7);
        float amb = uBase * (1.0 - uTwinkle + uTwinkle * tw)
                  * mix(1.0, ${tp.toFixed(3)}, clamp(vAlong, 0.0, 1.0));
        float d = abs(vAlong - uPulse);
        float pulse = uPulseOn * exp(-d * d / (uPulseWidth * uPulseWidth));
        vec3 col = uColor * amb + uPulseColor * pulse;
        ${opts.ownerGate ? `
        // the hovered face's OWN filaments, and nothing else in the mesh
        col += (uColor * 2.20 + uPulseColor * 1.60) * amb * vOwn;` : ''}
        float fogF = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
        col *= 1.0 - clamp(fogF, 0.0, 1.0);   // additive: depth fades to black
        // near-fade: the near field belongs to defocus, not brightness —
        // same philosophy as the portrait blur band.
        col *= smoothstep(${nf[0].toFixed(3)}, ${nf[1].toFixed(3)}, vFogDepth);
        ${opts.growGate ? `
        // draw-on growth gate (M5 ignition audit, D16): visible where
        // aAlong < uGrow, 0.15 feathered tip — the strand GROWS from its
        // aAlong=0 root instead of fading in whole. Injected only for
        // materials that ask (the Owned growth-front fan); every other
        // user of this material compiles the exact pre-audit shader.
        float grw = 1.0 - smoothstep(uGrow - 0.15, uGrow, vAlong);
        gl_FragColor = vec4(col * uFade * grw, 1.0);` : `
        gl_FragColor = vec4(col * uFade, 1.0);`}
      }`,
  });
}

export function buildSubstrate({ leg, palette: P, exposure = 1 }) {
  const V3 = THREE.Vector3;
  const V = (x, y, z) => new V3(x, y, z);
  const group = new THREE.Group();
  group.name = 'owned-rootworld';
  const timeMats = [];        // shader mats needing uTime + uFade
  const fadeSprites = [];     // {mat, base} plain materials faded by opacity
  const rndA = H.rng(90211);

  const {
    camDist, nearestCamPt, RIGHT, UPN, spineAt, clampUnder, groundY,
    CROWN, restFrame,
  } = leg;

  // ---- baked-read wiring (2026-08-17; moved to substrate-baked.js by H01,
  //      2026-08-21) -------------------------------------------------------
  // The shipped path skips the geometry math below and rebuilds every
  // BufferGeometry from static/geom bytes (baked once at commit time in the
  // goldens' own headless Chrome; see journey/lib/baked.js). Materials,
  // uniforms, closures and the live `rndA` ambient stream stay computed on
  // both paths — only geometry is skipped. ONE try/catch wraps the WHOLE
  // read: any missing key or shape mismatch throws and the chapter falls
  // back to the live builders in full, never a half-baked mix. `null` means
  // "build live, in full" and is what every `if (baked)` below branches on.
  const baked = readBakedSubstrate(leg);

  // World envelope. The root world hangs from the crown near the origin and
  // trails -X along the glide, so the box is asymmetric: plenty of room in
  // front of the rest camera, only a little behind it.
  const BX = [-14.0, 6.0], BY = [-7.0, -0.05], BZ = [-8.5, 8.5];

  // Two-scale substrate density — kept from the previous build (spike values,
  // spike seeds): the ambient layers still ask it where soil ends and colony
  // begins, so the filler never reads as an even wash.
  function substrate(x, y, z) {
    return H.fbm3(x * 0.052 + 3.1, y * 0.100 - 1.2, z * 0.052 - 1.7, 4) * 0.72
         + H.fbm3(x * 0.170 - 5.0, y * 0.230 + 2.2, z * 0.170 + 4.4, 3) * 0.28;
  }

  /* ================================================================
     Frame-relative directions (the frame is the spec, doc §3 house rule)
     ================================================================ */
  // Azimuth (atan2(z, x)) of the rest camera as seen FROM the crown, and of
  // the glide the camera leaves on. Roots aimed along either of those two
  // axes are the ones that would otherwise run down the flight corridor.
  const CAM_AZ = Math.atan2(restFrame.pos.z - CROWN.z, restFrame.pos.x - CROWN.x);
  const GLIDE_AZ = CAM_AZ + Math.PI;
  const angDelta = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

  /* ---------------- authored dark voids ----------------
     Breathing room: the reference has clear dark gaps between the lit
     clusters. Voids are placed on the flanks and under the floor of the
     rest frame, never on the crown axis, and push-cleared off the polyline. */
  /* COMPUTED ON BOTH PATHS since 2026-08-25, and it was a real gap that it
     was not. The voids are not geometry — they are a PREDICATE (`inVoid`
     below) that placement consults, five authored spots of pure leg-derived
     arithmetic with no random draw and no buffer. Under `if (!baked)` the
     predicate answered "no" everywhere on a baked page, which was inert only
     because every one of its callers was itself skipped there. It stopped
     being inert the moment portraits.js gained recompose(): a page that boots
     landscape serves this substrate from bytes and then re-places its field,
     and the sixteen sites were being nudged out of voids that the baked page
     claimed did not exist — measured as one node 0.333 world units (21 px)
     away from where the same size composes on a fresh load.
     Nothing at build changes on either path: on the live path this block ran
     already, and on the baked path every geometry builder that reads inVoid
     is skipped. It costs ~4300 distance tests, once. */
  const VOIDS = [];
  {
    // Sized and placed to miss the authored portrait arc (portraits.js
    // REST_SITES): the arc's sites sit 5.5-12.5 units down the rest gaze and
    // within ~7 units of it laterally, so the voids live further out and
    // lower. A void that swallows a face makes the chapter push it out of the
    // composition, which is the tail wagging the dog.
    const spots = [
      { t: 0.20, r: 2.4, side: -1, u: -2.2, d: 9.2 },
      { t: 0.38, r: 2.8, side: 1, u: -1.8, d: 9.6 },
      { t: 0.52, r: 2.6, side: 0, u: -4.2, d: 0 },     // under the floor
      { t: 0.70, r: 2.8, side: -1, u: -1.4, d: 10.4 },
      { t: 0.86, r: 2.6, side: 1, u: -2.0, d: 9.8 },
    ];
    for (const s of spots) {
      const c = spineAt(s.t)
        .addScaledVector(RIGHT, s.side * s.d)
        .addScaledVector(UPN, s.u * 2.0);
      for (let guard = 0; guard < 8; guard++) {
        const cd = camDist(c.x, c.y, c.z);
        if (cd > s.r + 2.4) break;
        const nearest = nearestCamPt(c);
        const away = c.clone().sub(nearest);
        if (away.lengthSq() < 0.001) away.copy(RIGHT);
        c.addScaledVector(away.normalize(), (s.r + 2.4) - cd + 0.2);
      }
      if (c.y > -1.6) c.y = -1.6;                     // voids stay in the slab
      VOIDS.push({ c, r: s.r });
    }
  }
  function inVoid(x, y, z) {
    for (let i = 0; i < VOIDS.length; i++) {
      const v = VOIDS[i];
      const dx = x - v.c.x, dy = y - v.c.y, dz = z - v.c.z;
      if (dx * dx + dy * dy + dz * dz < v.r * v.r) return true;
    }
    return false;
  }

  /* ================================================================
     THE ROOT FAN
     ================================================================ */
  // One filament. Integrated rather than parameterised: the direction leaves
  // the crown at `dip0` below horizontal and is bent further down every step
  // by a gravity term while fbm walks it sideways. That is what gives the
  // fountain/willow silhouette — near the crown the filaments are still
  // spreading outward, far from it they are falling.
  const GRAV = 0.46;
  function growRoot(start, dir0, len, seg, seed, meander = 0.24, sweep = null) {
    const dir = dir0.clone().normalize();
    const step = len / seg;
    const pts = [start.clone()];
    let pos = start.clone();
    for (let j = 1; j <= seg; j++) {
      const t = j / seg;
      dir.y -= GRAV * step * (0.30 + 1.55 * t);
      // a COHERENT lateral bend, per root. fbm meander is symmetric noise and
      // averages out to a straight line at this scale; a jet only reads as a
      // jet if it curves one way along its whole length.
      if (sweep) dir.addScaledVector(sweep, step * (0.25 + 1.1 * t));
      // meander grows with distance: near the crown the filaments are still
      // leaving on their authored azimuth (which is what keeps the burst
      // reading as a burst), far out they wander
      const m = meander * (0.35 + 1.5 * t);
      dir.x += H.fbm3(seed * 0.017 + t * 2.6, 1.3, 0.7, 3) * m;
      dir.z += H.fbm3(2.9, seed * 0.013 + t * 2.4, 4.1, 3) * m;
      dir.y += H.fbm3(5.1, 0.6, seed * 0.019 + t * 2.2, 3) * m * 0.55;
      dir.normalize();
      pos = pos.clone().addScaledVector(dir, step);
      if (pos.y < BY[0]) { pos.y = BY[0] + (BY[0] - pos.y) * 0.35; dir.y = Math.abs(dir.y) * 0.12; }
      pos.x = clamp(pos.x, BX[0], BX[1]);
      pos.z = clamp(pos.z, BZ[0], BZ[1]);
      clampUnder(pos, 0.12);
      pts.push(pos);
    }
    return pts;
  }

  const primaries = [];     // [{ pts, az }] — the long fall
  const skirt = [];         // [{ pts }] — the dense bright collar at the crown
  const secondaries = [];   // [{ pts, parent }]
  const N_PRIMARY = 66;
  const N_SKIRT = 150;
  const N_MID = 190;
  if (!baked) {
    const rnd = H.rng(4801);
    const GOLD = Math.PI * (3 - Math.sqrt(5));
    // duck the depth-axis roots: 1 when a root heads straight at the lens or
    // straight down the glide, 0 when it fans across the frame. This is the
    // single authored asymmetry that keeps the flight corridor clear while
    // the fan still fills the frame left to right.
    const duckOf = (az) => Math.max(0, 1 - angDelta(az, CAM_AZ) / 1.05) * 0.62
                         + Math.max(0, 1 - angDelta(az, GLIDE_AZ) / 1.05) * 0.50;
    for (let i = 0; i < N_PRIMARY; i++) {
      const az = (i * GOLD + rnd() * 0.16) % TAU;
      // Leaving the crown NEARLY HORIZONTALLY is what makes the silhouette a
      // fountain instead of a firework: the arc has to happen in view. A root
      // that starts steep is a straight line to the bottom of the frame; one
      // that starts flat and is pulled over by GRAV within two or three units
      // draws the willow curve the reference is made of.
      const dip0 = 0.02 + rnd() * 0.20 + duckOf(az) * 0.85;
      // roots running away down the glide are longer, so the colony stays
      // grown all the way out to the rise instead of stopping behind us
      const away = Math.max(0, Math.cos(az - GLIDE_AZ));
      const len = (5.4 + rnd() * 5.6) * (1 + away * 0.85);
      const dir0 = V(Math.cos(az) * Math.cos(dip0), -Math.sin(dip0), Math.sin(az) * Math.cos(dip0));
      // the knot has extent: starting every root at the same point puts a
      // hard vanishing singularity at top centre
      const start = CROWN.clone().add(V(
        (rnd() - 0.5) * 0.30, (rnd() - 0.5) * 0.22, (rnd() - 0.5) * 0.30));
      const side = V(-Math.sin(az), 0, Math.cos(az));
      const sweep = side.multiplyScalar((rnd() - 0.5) * 0.46);
      primaries.push({ pts: growRoot(start, dir0, len, 16, 900 + i * 37, 0.34, sweep), az });
    }
    // The COLLAR: the reference's fountain is dense where it leaves the base
    // and sparse where it falls. Long roots alone cannot do that — spacing
    // them tightly enough at the crown makes them a solid mass further down.
    // So the density near the crown is its own population, in two ranks:
    //   · the inner collar (under 1.4 units) is the knot's own halo of
    //     filaments. It has to stay short: at the rest the crown is 1.85
    //     units from the lens, so a 3-unit filament there subtends most of
    //     the frame and the collar reads as the firework it must not be;
    //   · the outer rank (1.5-4.2) bridges the gap between that knot and the
    //     long primaries, which is where the first build read as a handful of
    //     bare rays crossing the headline.
    for (let i = 0; i < N_SKIRT; i++) {
      const az = (i * GOLD * 2.0 + rnd() * 0.5) % TAU;
      const dip0 = 0.02 + rnd() * 0.75 + duckOf(az) * 0.7;
      const len = 0.30 + rnd() * 1.05;
      const dir0 = V(Math.cos(az) * Math.cos(dip0), -Math.sin(dip0), Math.sin(az) * Math.cos(dip0));
      const start = CROWN.clone().add(V(
        (rnd() - 0.5) * 0.34, (rnd() - 0.5) * 0.26, (rnd() - 0.5) * 0.34));
      skirt.push({ pts: growRoot(start, dir0, len, 5, 15500 + i * 23, 0.20) });
    }
    for (let i = 0; i < N_MID; i++) {
      const az = (i * GOLD * 3.0 + rnd() * 0.4) % TAU;
      const dip0 = 0.02 + rnd() * 0.42 + duckOf(az) * 0.8;
      const len = 1.5 + rnd() * 2.7;
      const dir0 = V(Math.cos(az) * Math.cos(dip0), -Math.sin(dip0), Math.sin(az) * Math.cos(dip0));
      const start = CROWN.clone().add(V(
        (rnd() - 0.5) * 0.40, (rnd() - 0.5) * 0.30, (rnd() - 0.5) * 0.40));
      const side = V(-Math.sin(az), 0, Math.cos(az));
      skirt.push({
        pts: growRoot(start, dir0, len, 9, 17700 + i * 19, 0.28,
          side.multiplyScalar((rnd() - 0.5) * 0.34)),
      });
    }
    const rnd2 = H.rng(5209);
    primaries.forEach((pr, pi) => {
      const n = 3 + Math.floor(rnd2() * 4);
      for (let k = 0; k < n; k++) {
        const t = 0.24 + rnd2() * 0.62;
        const j = clamp(Math.round(t * (pr.pts.length - 1)), 1, pr.pts.length - 2);
        const base = pr.pts[j];
        if (base.y > -1.0) continue;
        const tang = pr.pts[j + 1].clone().sub(pr.pts[j - 1]).normalize();
        const side = V(-tang.z, 0, tang.x).normalize();
        const dir0 = tang.clone()
          .addScaledVector(side, (rnd2() < 0.5 ? -1 : 1) * (0.7 + rnd2() * 0.9))
          .add(V(0, -(0.25 + rnd2() * 0.5), 0));
        const len = 1.4 + rnd2() * 3.6;
        const pts = growRoot(base, dir0, len, 8, 3300 + pi * 71 + k * 13, 0.34);
        secondaries.push({ pts, parent: pi });
      }
    });
  }

  // Both generations draw in ONE batch. aAlong runs 0 at the crown end, so a
  // travelling pulse reads as light leaving the base and running out along the
  // roots — the same direction the fan grew.
  const fanMat = makeFadePulseMat(P.gold, {
    baseOpacity: 0.36 * exposure, twinkle: 0.34, pulseWidth: 0.10,
    pulseColor: P.goldBright, fogDensity: 0.042, nearFade: [0.55, 1.35],
    alongTaper: 0.22,
  });
  // 2026-08-16: fan, web, crown, hub, grain and aggregate all used to build
  // vertices in plain JS arrays and hand them to Float32BufferAttribute, which
  // copies into a typed array anyway — the per-vertex push + the final copy
  // were the chapter's dominant GC source. A growable float cursor stores
  // straight into a Float32Array (f32[i] = x rounds identically to the old
  // wrap) and hands the shader an exact-size slice: same bits, no churn.
  const f32Cursor = (cap = 512) => {
    let a = new Float32Array(cap);
    let n = 0;
    return {
      put: (...v) => {
        if (n + v.length > a.length) {
          const b = new Float32Array(a.length * 2);
          b.set(a);
          a = b;
        }
        for (let i = 0; i < v.length; i++) a[n++] = v[i];
      },
      get n() { return n; },
      slice: () => a.slice(0, n),
    };
  };
  let fanGeo;
  if (baked) {
    fanGeo = baked.g.fan;
  } else {
    const pos = f32Cursor(), along = f32Cursor(), strand = f32Cursor();
    const push = (list, sv, headroom) => {
      list.forEach((r, ri) => {
        const curve = H.catmull(r.pts);
        const N = r.pts.length + 4;
        let prev = curve.getPointAt(0);
        for (let j = 1; j <= N; j++) {
          const t = j / N;
          const p = curve.getPointAt(t);
          pos.put(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          along.put(headroom + (1 - headroom) * (j - 1) / N, headroom + (1 - headroom) * t);
          strand.put(sv(ri), sv(ri));
          prev = p;
        }
      });
    };
    push(primaries, (ri) => ri / N_PRIMARY, 0);
    // the collar shares the fan's along range but only its first third, so
    // the taper leaves it bright: it IS the "dense and bright" end
    push(skirt, (ri) => (ri % 23) / 23, 0);
    push(secondaries, (ri) => 0.5 + (ri % 17) / 34, 0.30);
    fanGeo = new THREE.BufferGeometry();
    fanGeo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
    fanGeo.setAttribute('aAlong', new THREE.BufferAttribute(along.slice(), 1));
    fanGeo.setAttribute('aStrand', new THREE.BufferAttribute(strand.slice(), 1));
  }
  const fanLines = new THREE.LineSegments(fanGeo, fanMat);
  fanLines.frustumCulled = false;
  fanLines.renderOrder = -4;
  group.add(fanLines);
  timeMats.push(fanMat);
  const fanVerts = fanGeo.attributes.position.count;

  /* ---------------- hairs: the fine thread density ---------------- */
  // Short filaments hanging off the secondaries. They carry most of the
  // picture's "fine amber threads" read and none of its structure, so they
  // are dimmer, thinner in depth and fogged harder.
  const hairMat = makeFadePulseMat(0xc19240, {
    baseOpacity: 0.30 * exposure, twinkle: 0.60, pulseWidth: 0.10,
    pulseColor: P.ember, fogDensity: 0.042, nearFade: [0.7, 1.8],
  });
  let hairGeo;
  if (baked) {
    hairGeo = baked.g.hair;
  } else {
    const src = [...secondaries, ...primaries];
    const res = H.strandLines({
      count: 2400, seed: 7717,
      generator: (i, rnd) => {
        const s = src[Math.floor(rnd() * src.length)];
        const j = clamp(Math.floor(rnd() * (s.pts.length - 1)), 0, s.pts.length - 2);
        const base = s.pts[j].clone().lerp(s.pts[j + 1], rnd());
        if (base.y > -0.95) return null;
        if (inVoid(base.x, base.y, base.z)) return null;
        if (camDist(base.x, base.y, base.z) < 1.5) return null;
        if (substrate(base.x, base.y, base.z) < -0.16) return null;
        const a = rnd() * TAU;
        const b = -(0.1 + rnd() * 1.2);
        const dir0 = V(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b));
        return growRoot(base, dir0, 0.5 + rnd() * 1.5, 4, 9000 + i * 7);
      },
    });
    hairGeo = res.geometry;
  }
  const hairLines = new THREE.LineSegments(hairGeo, hairMat);
  hairLines.frustumCulled = false;
  hairLines.renderOrder = -5;
  group.add(hairLines);
  timeMats.push(hairMat);
  const hairVerts = hairGeo.attributes.position.count;

  /* ================================================================
     THE WEB — cross-links between different roots
     ================================================================ */
  // A fan is not a network, and root-to-root links alone are not one either:
  // the roots diverge radially, so beyond four or five units from the crown
  // there is nothing near enough to link to and the lower field stays empty —
  // which is exactly what the first build of this restage looked like against
  // the reference's dense lit web.
  //
  // So the network has its own NODES. They are seeded through the lower
  // volume (authored in the rest frustum, with a tail spread along the glide
  // so the field does not stop at the frame edge), spaced by a minimum
  // distance, textured by the substrate density function so the web clumps and
  // thins instead of tiling, and then each is wired to its nearest few
  // neighbours. The fan's roots are wired INTO the nearest nodes, so the
  // structure reads as one thing: light leaves the crown, runs down the roots
  // and out through the mesh.
  const netNodes = [];        // V3 — the network's own vertices
  const linkNodes = [];       // V3 — everything that gets a glint
  let netLinks = 0;
  const webMat = makeFadePulseMat(P.gold, {
    baseOpacity: 0.34 * exposure, twinkle: 0.46, pulseWidth: 0.12,
    pulseColor: P.goldBright, fogDensity: 0.030, nearFade: [0.7, 1.8],
    ownerGate: true,      // per-face local lighting — see assignOwners() below
  });
  // The web's graph, kept so that "which filaments belong to this person" can
  // be ANSWERED rather than guessed. `webAdj` is the netNode adjacency the
  // links below actually build; `webLinkMeta` records, for every link drawn,
  // the vertex range it occupies in the buffer and the graph vertices it
  // joins. assignOwners() walks these; nothing about ownership looks at a
  // distance except to seed the walk.
  const webAdj = [];          // netNode index -> [netNode index]
  const webLinkMeta = [];     // { v0, vN, a, b, root }  (a/b: netNode idx, -1)
  let webOwner = null;        // Float32Array, one entry per web vertex — the
                              // `= null` is LIVE: on the baked path aOwner
                              // arrived assigned and nothing writes this.
  let webGeo;                 // assigned unconditionally by BOTH branches below
  const rootPool = [];        // { p, key } sample points eligible for linking
  if (baked) {
    webGeo = baked.g.web;
  } else {
    const add = (list, tag) => list.forEach((r, ri) => {
      for (let j = 1; j < r.pts.length; j++) {
        const p = r.pts[j];
        if (p.y > -1.35) continue;                    // stay under the corridor
        rootPool.push({ p, key: `${tag}${ri}` });
      }
    });
    add(primaries, 'p');
    add(secondaries, 's');

    const rf = restFrame;
    const TANV = Math.tan(0.5 * rf.fov * Math.PI / 180);
    const rnd = H.rng(6151);
    const MIN_SEP = 0.72;
    const NET_N = 430;
    for (let guard = 0; netNodes.length < NET_N && guard < NET_N * 40; guard++) {
      let p;
      if (rnd() < 0.74) {
        // authored in the REST FRUSTUM: the lower two-thirds is where the
        // reference's network lives, so that is where the density is spent.
        // cy is squared toward the bottom, and depth is biased near, so the
        // mesh is denser and coarser low and finer high — which is also what
        // reads as depth.
        const cx = (rnd() * 2 - 1) * 1.15;
        const u = rnd();
        const cy = 0.34 - 1.45 * Math.pow(u, 0.72);
        const d = 3.4 + Math.pow(rnd(), 0.8) * 15.5;
        p = rf.pos.clone()
          .addScaledVector(rf.fwd, d)
          .addScaledVector(rf.right, cx * TANV * 1.6 * d)
          .addScaledVector(rf.up, cy * TANV * d);
      } else {
        // and a tail along the glide so the mesh does not end at the frame
        p = spineAt(rnd() * 1.05)
          .addScaledVector(RIGHT, (rnd() - 0.5) * 17)
          .addScaledVector(UPN, -(0.8 + rnd() * 4.4));
      }
      p.x = clamp(p.x, BX[0], BX[1]);
      p.z = clamp(p.z, BZ[0], BZ[1]);
      clampUnder(p, 0.5);
      if (p.y > -1.95 || p.y < BY[0]) continue;       // below the flight corridor
      if (camDist(p.x, p.y, p.z) < 2.6) continue;
      if (inVoid(p.x, p.y, p.z)) continue;
      if (substrate(p.x, p.y, p.z) < -0.22) continue; // clump and thin, never tile
      let tooClose = false;
      for (let i = 0; i < netNodes.length; i++) {
        if (netNodes[i].distanceToSquared(p) < MIN_SEP * MIN_SEP) { tooClose = true; break; }
      }
      if (tooClose) continue;
      netNodes.push(p);
    }

    const pos = f32Cursor(), along = f32Cursor(), strand = f32Cursor();
    const seen = new Set();
    const link = (a, b, sv, sag, ia = -1, ib = -1) => {
      const d = a.distanceTo(b);
      const SEG = 5;
      const v0 = pos.n / 3;
      const bow = V((rnd() - 0.5) * d * 0.22, -(sag * d * (0.05 + rnd() * 0.22)), (rnd() - 0.5) * d * 0.22);
      let prev = null;
      for (let j = 0; j <= SEG; j++) {
        const t = j / SEG;
        const p = a.clone().lerp(b, t).addScaledVector(bow, Math.sin(Math.PI * t));
        clampUnder(p, 0.12);
        if (prev) {
          pos.put(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          along.put((j - 1) / SEG, t);
          strand.put(sv, sv);
        }
        prev = p;
      }
      webLinkMeta.push({
        v0, vN: pos.n / 3, a: ia, b: ib,
        mid: a.clone().lerp(b, 0.5),
        // a link with a free end (a root sample reaching into the mesh) keeps
        // that end's world point: it is where the fan meets the network, and
        // it is what an anchor is matched against.
        root: ia < 0 ? a.clone() : null,
      });
      netLinks++;
    };
    // node -> nearest neighbours
    for (let i = 0; i < netNodes.length; i++) webAdj.push([]);
    netNodes.forEach((a, i) => {
      const near = [];
      for (let j = 0; j < netNodes.length; j++) {
        if (j === i) continue;
        const d2 = a.distanceToSquared(netNodes[j]);
        if (d2 < 20.25) near.push({ j, d2 });        // within 4.5
      }
      near.sort((x, y) => x.d2 - y.d2);
      const k = 2 + Math.floor(rnd() * 3);
      for (let n = 0; n < Math.min(k, near.length); n++) {
        const j = near[n].j;
        const key = i < j ? `${i}_${j}` : `${j}_${i}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const mid = a.clone().lerp(netNodes[j], 0.5);
        if (camDist(mid.x, mid.y, mid.z) < 2.4) continue;
        link(a, netNodes[j], rnd(), 1, i, j);
        webAdj[i].push(j);
        webAdj[j].push(i);
      }
      linkNodes.push(a.clone());
    });
    // the fan feeds the mesh: every root sample gets a chance to reach the
    // nearest node, so the two structures are one structure
    for (let i = 0; i < rootPool.length; i += 2) {
      const a = rootPool[i].p;
      let best = null, bestJ = -1, bd = 9;
      for (let j = 0; j < netNodes.length; j++) {
        const d2 = a.distanceToSquared(netNodes[j]);
        if (d2 < bd) { bd = d2; best = netNodes[j]; bestJ = j; }
      }
      if (!best || bd < 0.09) continue;
      if (rnd() > 0.44) continue;
      const mid = a.clone().lerp(best, 0.5);
      if (camDist(mid.x, mid.y, mid.z) < 2.4) continue;
      link(a, best, rnd(), 0.6, -1, bestJ);
      if (rnd() < 0.30) linkNodes.push(a.clone());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
    geo.setAttribute('aAlong', new THREE.BufferAttribute(along.slice(), 1));
    geo.setAttribute('aStrand', new THREE.BufferAttribute(strand.slice(), 1));
    webOwner = new Float32Array(pos.n / 3).fill(-1);
    geo.setAttribute('aOwner', new THREE.BufferAttribute(webOwner, 1));
    webGeo = geo;
  }
  const webLines = new THREE.LineSegments(webGeo, webMat);
  webLines.frustumCulled = false;
  webLines.renderOrder = -4;
  group.add(webLines);
  timeMats.push(webMat);
  const webVerts = webGeo.attributes.position.count;

  /* ---------------- junction glints ---------------- */
  // "Many small bright nodes where threads cross." One Points draw, per-point
  // twinkle on incommensurate frequencies so nothing beats in unison.
  const glints = (() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uFade: { value: 0 },
        uMap: { value: H.softDisc(64) },
        uColor: { value: new THREE.Color(P.goldBright) },
        uScale: { value: 260 }, uBaseA: { value: 0.72 * exposure },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: /* glsl */`
        attribute float aSize; attribute float aSeed;
        uniform float uScale;
        varying float vSeed, vD;
        void main() {
          vSeed = aSeed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vD = -mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * aSize / max(-mv.z, 0.1);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform vec3 uColor;
        uniform float uTime, uBaseA, uFade;
        varying float vSeed, vD;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          float flick = 0.62 + 0.38 * sin(uTime * (0.29 + fract(vSeed) * 0.83) + vSeed * 9.1);
          float depth = 1.0 - clamp((vD - 5.0) / 13.0, 0.0, 0.72);
          float a = t.a * uBaseA * flick * depth * smoothstep(0.6, 1.6, vD);
          gl_FragColor = vec4(uColor, clamp(a * uFade, 0.0, 1.0));
        }`,
    });
    let geo, count;
    if (baked) {
      geo = baked.g.glints;
      count = geo.attributes.position.count;
    } else {
      const rnd = H.rng(8123);
      const keep = linkNodes.filter(() => rnd() < 0.88);
      const pos = new Float32Array(keep.length * 3);
      const sizeA = new Float32Array(keep.length);
      const seedA = new Float32Array(keep.length);
      keep.forEach((p, i) => {
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        sizeA[i] = 0.075 + rnd() * 0.155;
        seedA[i] = rnd() * 31.7;
      });
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
      count = keep.length;
    }
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = -3;
    group.add(pts);
    return { pts, mat, geo, count };
  })();

  /* ================================================================
     THE CROWN — the convergence point at top centre
     ================================================================ */
  // A knot, not a body: fibres gathering UP into the stem base (cropped by
  // the soil lid and by the top of the frame) over a tight radial burst and
  // a hot core. Same grammar as CONNECT's hubs, one scale larger.
  const crownMat = makeFadePulseMat(P.goldBright, {
    baseOpacity: 0.62 * exposure, twinkle: 0.18, pulseWidth: 0.09,
    pulseColor: 0xfff0d0, fogDensity: 0.010, nearFade: [0.35, 0.95],
  });
  let crownGeo;
  if (baked) {
    crownGeo = baked.g.crown;
  } else {
    const rnd = H.rng(2711);
    const pos = f32Cursor(), along = f32Cursor(), strand = f32Cursor();
    const seg = (a, b, t0, t1, sv) => {
      pos.put(a.x, a.y, a.z, b.x, b.y, b.z);
      along.put(t0, t1); strand.put(sv, sv);
    };
    // (a) the gathering: fibres rising from the crown to the stem's foot,
    //     converging as they climb. The lid crops them; the top of the frame
    //     crops what the lid does not.
    const foot = V(CROWN.x, groundY(CROWN.x, CROWN.z) + 0.16, CROWN.z);
    for (let i = 0; i < 34; i++) {
      const a0 = rnd() * TAU;
      const r0 = 0.28 + rnd() * 0.62;
      const start = V(CROWN.x + Math.cos(a0) * r0, CROWN.y - 0.10 - rnd() * 0.45, CROWN.z + Math.sin(a0) * r0);
      const sv = rnd();
      const N = 6;
      let prev = start;
      for (let j = 1; j <= N; j++) {
        const t = j / N;
        const e = H.easings.smooth(t);
        const p = start.clone().lerp(foot, e);
        const hump = Math.sin(Math.PI * t) * 0.16;
        p.x += H.fbm3(i * 1.7, t * 3.1, 0.5, 2) * hump;
        p.z += H.fbm3(0.9, i * 1.3, t * 3.4, 2) * hump;
        seg(prev, p, (j - 1) / N, t, sv);
        prev = p;
      }
    }
    // (b) the radial burst: short spokes converging on the crown itself
    for (let i = 0; i < 30; i++) {
      const a0 = rnd() * TAU;
      const b0 = (rnd() - 0.5) * Math.PI * 0.9;
      const rr = 0.55 + rnd() * 0.95;
      const start = V(
        CROWN.x + Math.cos(a0) * Math.cos(b0) * rr,
        CROWN.y + Math.sin(b0) * rr * 0.7,
        CROWN.z + Math.sin(a0) * Math.cos(b0) * rr,
      );
      clampUnder(start, 0.10);
      const sv = rnd();
      const N = 5;
      let prev = start;
      for (let j = 1; j <= N; j++) {
        const t = j / N;
        const p = start.clone().lerp(CROWN, H.easings.smooth(t));
        seg(prev, p, (j - 1) / N, t, sv);
        prev = p;
      }
    }
    crownGeo = new THREE.BufferGeometry();
    crownGeo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
    crownGeo.setAttribute('aAlong', new THREE.BufferAttribute(along.slice(), 1));
    crownGeo.setAttribute('aStrand', new THREE.BufferAttribute(strand.slice(), 1));
  }
  const crownLines = new THREE.LineSegments(crownGeo, crownMat);
  crownLines.frustumCulled = false;
  crownLines.renderOrder = -2;
  group.add(crownLines);
  timeMats.push(crownMat);
  const crownVerts = crownGeo.attributes.position.count;

  /* ================================================================
     STARBURST HUBS — the reference's brighter convergence points
     ================================================================ */
  // Authored in the REST FRAME (the frame is the spec), then grounded into
  // the field and cleared off the polyline. Positions avoid the copy block
  // (top-centre) and the portrait sites (portraits.js REST_SITES).
  const HUB_SITES = [
    [-0.86, -0.34, 8.2, 1.00],
    [0.82, -0.52, 6.6, 0.92],
    [-0.20, -0.66, 6.2, 0.86],
    [0.44, 0.12, 12.6, 0.72],
    [-0.68, 0.16, 13.4, 0.66],
  ];
  const hubPos = [];
  if (!baked) {
    const rf = restFrame;
    const TANV = Math.tan(0.5 * rf.fov * Math.PI / 180);
    for (const [cx, cy, depth, sc] of HUB_SITES) {
      const p = rf.pos.clone()
        .addScaledVector(rf.fwd, depth)
        .addScaledVector(rf.right, cx * TANV * 1.6 * depth)
        .addScaledVector(rf.up, cy * TANV * depth);
      clampUnder(p, 0.9);
      for (let it = 0; it < 5; it++) {
        const cd = camDist(p.x, p.y, p.z);
        if (cd >= 2.8) break;
        const away = p.clone().sub(nearestCamPt(p));
        if (away.lengthSq() < 0.001) away.set(0, -1, 0);
        away.normalize();
        if (away.y > 0) away.y *= 0.25;
        p.addScaledVector(away.normalize(), 2.85 - cd);
        clampUnder(p, 0.9);
      }
      hubPos.push({ p, sc });
    }
  }
  const hubMat = makeFadePulseMat(P.goldBright, {
    baseOpacity: 0.46 * exposure, twinkle: 0.22, pulseWidth: 0.10,
    pulseColor: 0xffe0ae, fogDensity: 0.022, nearFade: [0.7, 1.8],
  });
  let hubsGeo;
  if (baked) {
    hubsGeo = baked.g.hubs;
  } else {
    const rnd = H.rng(3391);
    const pos = f32Cursor(), along = f32Cursor(), strand = f32Cursor();
    hubPos.forEach((h, hi) => {
      const R = 0.55 * h.sc;
      // radial convergence spokes (CONNECT's hub grammar, in 3D)
      for (let s = 0; s < 15; s++) {
        const a = (s / 15) * TAU + rnd() * 0.4;
        const b = (rnd() - 0.5) * Math.PI * 0.8;
        const rr = R * (1.8 + rnd() * 2.6);
        const start = V(
          h.p.x + Math.cos(a) * Math.cos(b) * rr,
          h.p.y + Math.sin(b) * rr * 0.72,
          h.p.z + Math.sin(a) * Math.cos(b) * rr,
        );
        clampUnder(start, 0.12);
        const sv = rnd();
        const N = 5;
        let prev = start;
        for (let j = 1; j <= N; j++) {
          const t = j / N;
          const p = start.clone().lerp(h.p, H.easings.smooth(t));
          pos.put(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          along.put((j - 1) / N, t); strand.put(sv, sv);
          prev = p;
        }
      }
      // the tight knot at the core
      for (let k = 0; k < 6; k++) {
        const a0 = rnd() * TAU, span = 1.6 + rnd() * 2.6;
        const Rk = R * (0.16 + rnd() * 0.22);
        const sv = rnd();
        const N = 7;
        let prev = null;
        for (let j = 0; j <= N; j++) {
          const t = j / N;
          const a = a0 + t * span;
          const p = V(
            h.p.x + Math.cos(a) * Rk,
            h.p.y + Math.sin(a * 1.7 + hi) * Rk * 0.5,
            h.p.z + Math.sin(a) * Rk,
          );
          if (prev) {
            pos.put(prev.x, prev.y, prev.z, p.x, p.y, p.z);
            along.put((j - 1) / N, t); strand.put(sv, sv);
          }
          prev = p;
        }
      }
    });
    hubsGeo = new THREE.BufferGeometry();
    hubsGeo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
    hubsGeo.setAttribute('aAlong', new THREE.BufferAttribute(along.slice(), 1));
    hubsGeo.setAttribute('aStrand', new THREE.BufferAttribute(strand.slice(), 1));
  }
  const hubsLines = new THREE.LineSegments(hubsGeo, hubMat);
  hubsLines.frustumCulled = false;
  hubsLines.renderOrder = -2;
  group.add(hubsLines);
  timeMats.push(hubMat);
  const hubVerts = hubsGeo.attributes.position.count;
  /* ---------------- cores + halos: crown and hubs, 2 Points draws ------- */
  function coreLayer(map, color, mul, baseA, order, bakedGeo) {
    let geo = bakedGeo || null;
    if (!geo) {
      const list = [{ p: CROWN, sc: 1.9 }, ...hubPos];
      const pos = new Float32Array(list.length * 3);
      const sizeA = new Float32Array(list.length);
      const seedA = new Float32Array(list.length);
      list.forEach((h, i) => {
        pos[i * 3] = h.p.x; pos[i * 3 + 1] = h.p.y; pos[i * 3 + 2] = h.p.z;
        sizeA[i] = h.sc * mul;
        seedA[i] = i * 3.7 + 1.1;
      });
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uFade: { value: 0 }, uSurge: { value: 0 },
        uMap: { value: map }, uColor: { value: new THREE.Color(color) },
        uScale: { value: 240 }, uBaseA: { value: baseA * exposure },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: /* glsl */`
        attribute float aSize; attribute float aSeed;
        uniform float uScale, uSurge;
        varying float vSeed, vD;
        void main() {
          vSeed = aSeed;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vD = -mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * aSize * (1.0 + 0.22 * uSurge) / max(-mv.z, 0.1);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform vec3 uColor;
        uniform float uTime, uBaseA, uFade, uSurge;
        varying float vSeed, vD;
        void main() {
          vec4 t = texture2D(uMap, gl_PointCoord);
          float br = 0.86 + 0.14 * sin(uTime * (0.21 + fract(vSeed) * 0.33) + vSeed * 5.3);
          float a = t.a * uBaseA * br * (1.0 + 0.9 * uSurge) * smoothstep(0.45, 1.25, vD);
          gl_FragColor = vec4(uColor, clamp(a * uFade, 0.0, 1.0));
        }`,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = order;
    group.add(pts);
    return { pts, mat, geo };
  }
  const cores = coreLayer(H.softDisc(64), 0xffe9c4, 0.30, 0.55, -1, baked?.g.hubCores);
  const halos = coreLayer(H.glowSprite(P.ember, 64), P.ember, 1.55, 0.26, -6, baked?.g.hubHalos);

  /* ================================================================
     THE SOIL CEILING — the frame's darkness, and the reason the crown
     is the brightest thing in it
     ================================================================ */
  // The one genuinely NEW layer of the restage, and the one that made the
  // composition work. Every lit thing in this scene is additive, so before
  // this there was nothing between the underground camera and the hero's own
  // surface mycelium: the ground network blazed straight through the soil
  // across the top of the frame, brighter than the root world beneath it, and
  // the picture's hierarchy was upside down (the pre-restage golden shows it —
  // that band of light IS the surface web, seen from below through solid
  // earth). The reference's top is near-black with one bright convergence.
  //
  // So: an actual opaque ceiling at the soil line, drawn ONLY from below —
  // PlaneGeometry rotated so its normal points DOWN, FrontSide, so from above
  // it is back-facing and culled. That single property is what keeps it out
  // of the Final cutaway, which deliberately looks INTO the colony from above
  // and must not meet a lid. It writes depth (renderOrder -30, before every
  // additive layer in the scene), which is what lets it occlude the hero's
  // ground group without touching organism/* — nothing here reads, writes or
  // configures the hero's own objects; it simply stands between them and the
  // lens, which is what a metre of soil does.
  //
  // Colour is warm near-black, not black: it reads as earth over the haze
  // rather than as a hole punched in the frame. Opacity rides the chapter
  // fade, so it arrives and retires inside the same murk window as everything
  // else and reverse scrubs identically.
  const ceiling = (() => {
    let geo;
    if (baked) {
      geo = baked.g.ceiling;
    } else {
      const SEG = 44, SPAN = 78;
      geo = new THREE.PlaneGeometry(SPAN, SPAN, SEG, SEG);
      geo.rotateX(Math.PI / 2);                 // normal -> -Y (visible from below)
      const pa = geo.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        pa.setY(i, groundY(pa.getX(i), pa.getZ(i)) - 0.07);
      }
      pa.needsUpdate = true;
      geo.deleteAttribute('normal');
      geo.deleteAttribute('uv');
    }
    // The ceiling's colour has to DISSOLVE with distance or it draws a hard
    // horizontal rule across the frame: the soil plane's vanishing line is
    // where its depth goes to infinity, so the strip just above the line is
    // the FARTHEST ceiling there is, and a flat near-black plane meets the
    // lit haze below the line at full contrast. Grading it toward the haze
    // tone over 5->34 units makes the two meet at the same value and the
    // boundary stops existing — which is what the reference's top looks like:
    // dark that gets darker upward, no edge.
    // NEAR-EARTH STRUCTURE (2026-08-11, THE SOIL HORIZON — Hannah, on the
    // Connect -> Owned crossing: "we need the transition point, the ground, to
    // be RICHER as we're going into it").
    //
    // Measured on the shipped tree (dense frozen strip, step 0.001, 1440x900):
    // the crossing frame is a HOLE. Between p 0.694 and p 0.695 — the soil
    // crossing is p 0.6927 — lit pixels fall 49.2% -> 19.9%, p95 luminance
    // 90.7 -> 26.6, top-of-frame mean 59.9 -> 18.0, in ONE 0.001 step. The
    // mechanism is a mismatch of shapes: the above-ground world collapses to a
    // grazing sliver the instant the lens passes the soil plane (a STEP),
    // while the colony beneath is revealed by camera depth over 0.94 units (a
    // RAMP, fc1e151/SINK_D) and so is 8% up at that moment. Between the step
    // and the ramp the frame holds nothing, and this plane — the only thing
    // reliably in it — was a flat near-black card at 8% opacity.
    //
    // Two things change, and they only work together (either alone is worse
    // than shipped: opacity alone makes the hole blacker, texture alone is
    // texture at 8%):
    //
    //   1. THE LID GOES OPAQUE ON CROSSING, NOT ON SINK. uOpacity now rides
    //      the chapter arm times a LID term that completes 0.14 units under
    //      the soil (owned/index.js), instead of riding `eff` (which carries
    //      SINK_D's 0.94). This is fc1e151's own stated law finally made true
    //      — "the lid material occludes until you are through it" — which the
    //      shipped tree did not honour: at depth 0.2 the soil was 90%
    //      TRANSPARENT. It is still camera-pure, still 0 above ground (and
    //      still back-face-culled from above, so the Final cutaway is
    //      untouched by construction), and it still reverse-scrubs exactly.
    //
    //   2. THE EARTH GETS A FACE. A two-octave world-space mottle (clods) plus
    //      a finer grain, added as warm value rather than multiplied into a
    //      near-black, so the lid reads as packed earth with pores and
    //      mineral catch-light instead of as a hole punched in the frame.
    //
    // THE STRUCTURE WINDOW IS A GEOMETRIC ARGUMENT, NOT A TASTE SETTING.
    // It dies by EARTH_HI = 3.0 units. At the Owned rest the lens sits 1.137
    // under this plane at pitch -8.0 with fov 58, so the top frame edge is
    // 21.0 deg above horizontal and the NEAREST ceiling fragment that can be
    // in frame at all is 1.137 / sin(21.0 deg) = 3.17 units away. 3.0 < 3.17,
    // so the frozen approved rest composition cannot see one textured
    // fragment — the owned golden is untouched BY CONSTRUCTION, not by
    // measurement (though it is measured too: MAE 0.00). At the crossing the
    // lens is 0.16 under and the top edge is 12.1 deg up, so the band runs
    // 0.76 -> 3.0 units and the texture owns the whole ceiling in frame.
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uNear: { value: new THREE.Color(P.warmBlack ?? 0x0a0805) },
        uFar: { value: new THREE.Color(0x241a10) },
        uOpacity: { value: 0 },
        uEarth: { value: new THREE.Color(0x37260f) },   // clod value, ADDED
        uGrain: { value: new THREE.Color(0x6b4a1e) },   // mineral catch-light
        // REACH (2026-08-11, the Owned -> Final traverse). See setLid.
        uReach: { value: 0 },
      },
      transparent: true, depthWrite: true, fog: false, side: THREE.FrontSide,
      vertexShader: /* glsl */`
        varying float vD;
        varying vec3 vW;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vW = (modelMatrix * vec4(position, 1.0)).xyz;
          vD = -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uNear, uFar, uEarth, uGrain;
        uniform float uOpacity, uReach;
        varying float vD;
        varying vec3 vW;
        float h21(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        float vn(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x),
                     mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        void main() {
          vec3 c = mix(uNear, uFar, smoothstep(5.0, 34.0, vD));
          // Structure resolves only where the lens is IN the soil (see the
          // geometric argument above). uReach opens the window out along the
          // Owned -> Final traverse, where this lid is the ONLY thing in the
          // top third of the frame and 3.00 units leaves it bare; it is 0 at
          // both rests by construction, so the geometric guarantee stands.
          // The far half of the reach carries the COARSE octave only — at 8
          // units the fine grain is below a pixel and would alias, while broad
          // clod shadow is what earth actually shows at that range.
          float hi = mix(3.00, 8.60, uReach);
          float near = 1.0 - smoothstep(1.30, hi, vD);
          if (near > 0.002) {
            vec2 q = vW.xz;
            // clods: two octaves, the coarse one carrying the shape
            float clod = vn(q * 1.15) * 0.66 + vn(q * 2.90) * 0.34;
            // grain: fine, sparse, and only the top of its range catches
            float g = vn(q * 9.5) * 0.62 + vn(q * 21.0) * 0.38;
            float fine = 1.0 - smoothstep(1.30, 3.00, vD);
            c += uEarth * (near * clod * clod);
            c += uGrain * (fine * pow(max(0.0, g - 0.60) * 2.5, 2.0) * 0.55);
          }
          gl_FragColor = vec4(c, uOpacity);
        }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = -30;
    mesh.frustumCulled = false;
    group.add(mesh);
    return { mesh, mat, geo };
  })();

  /* ---------------- soil-underside root mat ----------------
     The ceiling's texture: an undulating mat of root lines just beneath it,
     so the dark band overhead is grown earth rather than a flat card. Both
     crossings (T3 down, the rise up) pass THROUGH it, which is what keeps the
     seams reading as thresholds — and at the rest it is the band the crown
     pierces. */
  const lidMat = makeFadePulseMat(P.deepGold, {
    baseOpacity: 0.20 * exposure, twinkle: 0.30, pulseWidth: 0.10,
    pulseColor: P.ember, fogDensity: 0.026,
  });
  let lidGeo;
  if (baked) {
    lidGeo = baked.g.lid;
  } else {
    const rand = H.rng(6633);
    const gauss = () => (rand() + rand() + rand() + rand() - 2) / 2;
    const res = H.strandLines({
      count: 620, seed: 6633,
      generator: () => {
        const x = BX[0] + rand() * (BX[1] - BX[0]);
        const z = BZ[0] + rand() * (BZ[1] - BZ[0]);
        if (inVoid(x, -0.6, z) && rand() < 0.7) return null;
        const y0 = groundY(x, z) - 0.12 - Math.abs(gauss()) * 0.10;
        const a = rand() * TAU;
        const len = 0.7 + rand() * 1.6;
        const pts = [];
        for (let j = 0; j <= 3; j++) {
          const t = j / 3;
          const px = x + Math.cos(a) * len * t + gauss() * 0.10;
          const pz = z + Math.sin(a) * len * t + gauss() * 0.10;
          pts.push(V(px, Math.min(y0, groundY(px, pz) - 0.12 - Math.abs(gauss()) * 0.12), pz));
        }
        return pts;
      },
    });
    lidGeo = res.geometry;
  }
  const lidLines = new THREE.LineSegments(lidGeo, lidMat);
  lidLines.frustumCulled = false;
  lidLines.renderOrder = -6;
  group.add(lidLines);
  timeMats.push(lidMat);
  const lidVerts = lidGeo.attributes.position.count;

  /* ================================================================
     THE SOIL HORIZON — the metre of earth the lens passes THROUGH
     (2026-08-11; see the ceiling's own note above for the measurement
     that motivates it, and 20-owned-root-network.md)
     ================================================================ */
  // The lid mat above is the earth seen FROM THE REST, three-plus units off,
  // in the band the crown pierces: 620 near-horizontal strands in a 0.22-unit
  // skin. It was never meant to be flown through, and at 1-2 units it is not
  // there at all. This is the same soil authored for the OTHER reading — the
  // one the dive actually gets, from inside.
  //
  // Two layers, both hanging in the depth band 0.10 -> 1.90 under the soil:
  //
  //   FELT   fine rootlets and hyphal fuzz DEPENDING from the lid — vertical
  //          structure, because what the passage lacked was anything that
  //          streams past the lens. Aimed down with a lateral wander, longest
  //          near the crown, and thinning with depth so the layer has a
  //          profile instead of an edge.
  //   GRAIN  mineral flecks through the same volume, sized for parallax at
  //          contact range. Instanced Points on the shared soft disc — one
  //          draw, and the same sprite every other point layer here uses.
  //
  // WHY THEY ARE DRIVEN BY A DEPTH BAND, NOT BY `eff`. This is the soil IN
  // CONTACT WITH THE LENS: a thin shell, so how much of it is within the
  // murk's reach is genuinely a function of how deep the lens is, and the
  // band states that analytically instead of asking a per-fragment fog to
  // know the shell is thin. The term (owned/index.js `passage`) is a pure
  // function of the camera, so it reverse-scrubs exactly; it is 0 above
  // ground, so the chapter is still dark at arm; it comes on BEHIND the lid
  // (which is opaque by then — see above), so nothing ignites over open view;
  // and it is back to 0 by depth 1.15, under the rest's own 1.207. That last
  // number is the frozen-composition guarantee: PASS_HI < the rest depth
  // means the Owned rest cannot contain one felt strand or one grain, so the
  // approved composition and its golden are untouched by construction.
  //
  // Both layers carry a tight near-fade and a heavy fog so they read as a
  // medium resolving out of the murk at contact range and swallowed again a
  // few units off — the scene's own established language (every ambient layer
  // in this file is fogged), never a pop.
  // BOTH LAYERS ARE PLACED ALONG THE CORRIDOR, NOT ACROSS THE BOX. The first
  // build of this pass scattered them over BX/BZ like every ambient layer here
  // and measured almost nothing (crossing mean 19.4 -> 20.8): a contact-range
  // medium spread over 20x17 units puts ~2.5 strands per unit² anywhere, so
  // the few units the lens can actually see hold seventy strands. The layer is
  // only ever seen from INSIDE, so its density belongs where the lens goes —
  // leg.camDist is the same polyline every clearance rule in this chapter
  // measures against (leg.js samples p 0.660-0.872, which spans the dive's
  // crossing AND the rise), and both layers are rejection-sampled against it.
  const HORIZON_D0 = 0.10, HORIZON_D1 = 1.90;
  const HORIZON_R = 4.2;      // corridor half-width the layers are packed into
  /** Keep-probability for a soil-horizon sample: everything in close, thinning
   *  to nothing at HORIZON_R, so the medium has no boundary — it just runs out
   *  where the lens was never going to be. */
  function horizonKeep(x, y, z, rand) {
    const d = camDist(x, y, z);
    if (d > HORIZON_R) return false;
    return rand() < 1 - (d / HORIZON_R) ** 2 * 0.88;
  }
  const horizonMats = [];        // shader mats driven by `passage`
  const horizonObjs = [];        // ...and the objects they belong to
  const horizonSprites = [];     // {mat, base} plain materials driven by it
  const feltMat = makeFadePulseMat(P.deepGold, {
    baseOpacity: 0.95 * exposure, twinkle: 0.42, pulseWidth: 0.10,
    pulseColor: P.ember, fogDensity: 0.155, nearFade: [0.22, 0.80],
  });
  let feltGeo;
  if (baked) {
    feltGeo = baked.g.felt;
  } else {
    const rand = H.rng(41207);
    const gauss = () => (rand() + rand() + rand() + rand() - 2) / 2;
    const res = H.strandLines({
      count: 5200, seed: 41207,
      generator: () => {
        const x = BX[0] + rand() * (BX[1] - BX[0]);
        const z = BZ[0] + rand() * (BZ[1] - BZ[0]);
        const g = groundY(x, z);
        // depth profile: dense against the lid, thinning downward, so the
        // layer ends in a gradient and never in a plane
        const u = rand() * rand();                       // biased to 0
        const y0 = g - (HORIZON_D0 + u * (HORIZON_D1 - HORIZON_D0));
        if (!horizonKeep(x, y0, z, rand)) return null;
        if (inVoid(x, y0, z) && rand() < 0.6) return null;
        // FEEDERS (one strand in seven). The mat alone was legible but aimless
        // — an even wall of fibre at one scale with no focal pull, and the
        // crossing frame had no brightest thing in it (p95 33/255 against the
        // rest's 77). These are the heavy roots the fine mat feeds: longer,
        // shallower in droop, and BEARING ON THE CROWN, which is 1.9 units off
        // and is exactly where the dive is going. Passing through them the lens
        // gets streaming parallax lines that all point the same way, so the
        // soil says where you are headed instead of just that you are in it.
        // Drawn in the felt's own batch — no extra draw call — and read as
        // brighter purely by running longer through the same additive stack.
        const feeder = rand() < 0.145;
        // longer, denser under the crown: the mushroom's own feeder mat
        const near = Math.max(0, 1 - Math.hypot(x - CROWN.x, z - CROWN.z) / 9.0);
        // scale variety: a mat at ONE length reads as a texture swatch. The
        // cube biases hard to short, so a few run long and the eye gets a
        // near/far read out of the same layer.
        const len = feeder
          ? 0.95 + rand() * 1.5
          : (0.16 + (rand() ** 3) * 0.85) * (0.75 + near * 0.8);
        // A rootlet DROOPS: it leaves the lid on a bearing and turns down as
        // it goes, so the lateral run is spent early and the tail hangs. The
        // first build ran the two linearly against each other and drew
        // straight needles at random angles — dropped pins, not a mat. The
        // lateral term is now sqrt(t) (fast, then done) against a t² fall
        // (slow, then committed), which is one curve with a knee, and the
        // strand is sampled at 5 points so the knee survives.
        const a = feeder
          ? Math.atan2(CROWN.z - z, CROWN.x - x) + gauss() * 0.30
          : rand() * TAU;
        const lean = feeder ? (0.90 + rand() * 0.45) * len
                            : (0.35 + rand() * 0.75) * len;
        const drop = feeder ? len * (0.16 + rand() * 0.22)
                            : len * (0.55 + rand() * 0.55);
        const wob = feeder ? 0.9 + rand() * 1.1 : 0.25 + rand() * 0.7;
        const pts = [];
        for (let j = 0; j <= 4; j++) {
          const t = j / 4;
          const lat = Math.sqrt(t) * lean;
          const px = x + Math.cos(a) * lat + Math.sin(t * 5.1 + a) * 0.035 * wob + gauss() * 0.022;
          const pz = z + Math.sin(a) * lat + Math.cos(t * 4.6 + a) * 0.035 * wob + gauss() * 0.022;
          const py = y0 - drop * (0.25 * t + 0.75 * t * t) + gauss() * 0.018;
          pts.push(V(px, Math.min(py, groundY(px, pz) - HORIZON_D0), pz));
        }
        return pts;
      },
    });
    feltGeo = res.geometry;
  }
  const feltLines = new THREE.LineSegments(feltGeo, feltMat);
  feltLines.frustumCulled = false;
  feltLines.renderOrder = -6;
  group.add(feltLines);
  horizonMats.push(feltMat);
  horizonObjs.push(feltLines);
  const feltVerts = feltGeo.attributes.position.count;
  let grainGeo;
  if (baked) {
    grainGeo = baked.g.grain;
  } else {
    const rand = H.rng(41309);
    const pos = f32Cursor();
    let guard = 0;
    while (pos.n / 3 < 4200 && guard++ < 4200 * 60) {
      const x = BX[0] + rand() * (BX[1] - BX[0]);
      const z = BZ[0] + rand() * (BZ[1] - BZ[0]);
      const u = rand() * rand();
      const y = groundY(x, z) - (HORIZON_D0 + u * (HORIZON_D1 - HORIZON_D0));
      if (!horizonKeep(x, y, z, rand)) continue;
      if (inVoid(x, y, z)) continue;
      pos.put(x, y, z);
    }
    grainGeo = new THREE.BufferGeometry();
    grainGeo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
  }
  // GRAIN WANTS ITS OWN SHADER, not PointsMaterial. Measured on the first
  // build: a size-attenuated soft disc passed at contact range balloons —
  // a grain 0.25 units off the lens drew a 60 px disc, and the crossing
  // read as bokeh, champagne bubbles in front of the network, rather than
  // as earth. Three things fix it and none is available on PointsMaterial:
  // a HARD CEILING on the projected size (grain never gets bigger than a
  // speck, however close it passes), a near-fade so the ones that graze the
  // lens dissolve instead of flaring (the same law every line layer here
  // uses), and a distance fog so the volume ends in murk. Same soft-disc
  // sprite and same single draw as the aggregate layers.
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: H.softDisc(64) },
      uColor: { value: new THREE.Color(0xb98a46) },
      uFade: { value: 0 },
      uSize: { value: 26.0 },
      uTime: { value: 0 },
    },
    transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      uniform float uSize;
      varying float vD, vJ;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vD = -mv.z;
        vJ = fract(sin(dot(position.xz, vec2(41.3, 289.1))) * 21313.7);
        gl_Position = projectionMatrix * mv;
        // attenuate, then CLAMP: a speck stays a speck at any range
        gl_PointSize = clamp(uSize / max(vD, 0.05), 1.0, 4.5);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uFade, uTime;
      varying float vD, vJ;
      void main() {
        float a = texture2D(uMap, gl_PointCoord).a;
        // near-fade + fog: the medium resolves at contact range and is
        // swallowed a few units off, exactly like the felt beside it
        a *= smoothstep(0.18, 0.70, vD);
        a *= exp(-0.055 * vD * vD);
        a *= 0.72 + 0.28 * sin(uTime * (0.5 + vJ * 1.4) + vJ * 51.0);
        gl_FragColor = vec4(uColor * a * uFade, 1.0);
      }`,
  });
  const pts = new THREE.Points(grainGeo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -6;
  group.add(pts);
  horizonMats.push(mat);          // uFade + uTime, same drive as the felt
  horizonObjs.push(pts);
  const grainPoints = grainGeo.attributes.position.count;

  /* ---------------- far filler: the volume behind the network ---------- */
  // Very dim, very fogged short strands scattered through the slab so the
  // deep field is warm-textured rather than flat black behind the web.
  const fillMat = makeFadePulseMat(P.deepGold, {
    baseOpacity: 0.15 * exposure, twinkle: 0.66, pulseWidth: 0.10,
    pulseColor: P.ember, fogDensity: 0.038, nearFade: [1.4, 3.4],
  });
  let fillGeo;
  if (baked) {
    fillGeo = baked.g.fill;
  } else {
    const res = H.strandLines({
      count: 2000, seed: 2201,
      generator: (i, rand) => {
        const x = BX[0] + rand() * (BX[1] - BX[0]);
        const y = BY[0] + rand() * (BY[1] - BY[0]);
        const z = BZ[0] + rand() * (BZ[1] - BZ[0]);
        if (camDist(x, y, z) < 4.2 && rand() < 0.85) return null;
        const yy = Math.min(y, groundY(x, z) - 0.20);
        if (inVoid(x, yy, z)) return null;
        if (substrate(x, yy, z) < -0.12) return null;
        const a = rand() * TAU;
        const b = -(rand() * 1.1);
        const dir0 = V(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b));
        return growRoot(V(x, yy, z), dir0, 1.6 + rand() * 3.6, 5, 12000 + i * 3);
      },
    });
    fillGeo = res.geometry;
  }
  const lines = new THREE.LineSegments(fillGeo, fillMat);
  lines.frustumCulled = false;
  lines.renderOrder = -7;
  group.add(lines);
  timeMats.push(fillMat);
  const fillVerts = fillGeo.attributes.position.count;

  /* ---------------- root lookup for portrait strand roots -------------- */
  function nearestCordPoint(p, rand) {
    let best = null, bestD = 1e9;
    for (let i = 0; i < rootPool.length; i++) {
      const d = rootPool[i].p.distanceToSquared(p);
      if (d < bestD) { bestD = d; best = rootPool[i].p; }
    }
    if (!best || bestD > 42) return null;
    return best.clone().add(new V3(
      (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.5,
    ));
  }

  /* ---------------- soil aggregates: dim clumps ---------------- */
  let aggPoints = 0;
  function aggregateLayer(seed, count, size, opacity, color, nearOnly, bakedGeo) {
    let geo = bakedGeo || null;
    if (!geo) {
      const rand = H.rng(seed);
      const pos = f32Cursor();
      let guard = 0;
      while (pos.n / 3 < count && guard++ < count * 24) {
        const x = BX[0] + rand() * (BX[1] - BX[0]);
        const y = BY[0] + rand() * (BY[1] - BY[0]);
        const z = BZ[0] + rand() * (BZ[1] - BZ[0]);
        if (y > groundY(x, z) - 0.25) continue;
        if (inVoid(x, y, z)) continue;
        const gd = camDist(x, y, z);
        if (nearOnly && gd > 6.0) continue;
        if (!nearOnly && gd < 4.5) continue;
        if (substrate(x, y, z) < 0.12) continue;
        pos.put(x, y, z);
      }
      geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));
    }
    const mat = new THREE.PointsMaterial({
      map: H.softDisc(64), color: new THREE.Color(color), size,
      sizeAttenuation: true, transparent: true, opacity: opacity * exposure,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = -7;
    group.add(pts);
    aggPoints += geo.attributes.position.count;
    fadeSprites.push({ mat, base: opacity * exposure });
    return { pts, mat, geo, baseOp: opacity * exposure };
  }
  const aggFar = aggregateLayer(7701, 56, 0.95, 0.055, P.deepGold, false, baked?.g.aggregateFar);
  const aggNear = aggregateLayer(7803, 78, 0.32, 0.085, 0x8a6a34, true, baked?.g.aggregateNear);

  /* ---------------- amber haze backdrop ----------------
     Very large, very dim ember glows deep in the volume: distant structure
     dissolves into warm haze instead of pure black, which is what gives the
     reference its warm floor under the corner vignette. */
  {
    const rand = H.rng(5150);
    const place = (p, hot, op, sc) => {
      const mat = new THREE.SpriteMaterial({
        map: H.glowSprite(hot ? P.ember : P.deepGold, 64),
        color: new THREE.Color(hot ? P.ember : P.deepGold),
        transparent: true, opacity: op * exposure, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false,
      });
      const s = new THREE.Sprite(mat);
      s.position.copy(p);
      s.scale.setScalar(sc);
      s.renderOrder = -10;
      group.add(s);
      fadeSprites.push({ mat, base: op * exposure });
    };
    for (let i = 0; i < 8; i++) {
      const t = 0.05 + rand() * 0.9;
      const side = rand() < 0.5 ? -1 : 1;
      const p = spineAt(t)
        .addScaledVector(RIGHT, side * (8 + rand() * 9))
        .addScaledVector(UPN, -2.0 + (rand() - 0.5) * 4);
      if (p.y > -2.2) p.y = -2.2 - rand();
      place(p, i % 3 === 0, 0.016 + rand() * 0.018, 9 + rand() * 8);
    }
    // below-floor glows so the bottom of frame dissolves into amber
    for (let i = 0; i < 4; i++) {
      const t = 0.10 + rand() * 0.66;
      const p = spineAt(t)
        .addScaledVector(RIGHT, (rand() - 0.5) * 8)
        .addScaledVector(UPN, -(5.4 + rand() * 2.5));
      place(p, i === 1, 0.014 + rand() * 0.014, 10 + rand() * 8);
    }
  }

  /* ---------------- colony surge (claim-pulse response, OW-3) -----------
     One broad slow wave through the whole root system: light leaves the
     crown and runs OUT along the roots (aAlong 0 is the crown end), the web
     answers a beat later, and the cores brighten under it. Interaction-
     triggered only — ambient behaviour stays loop-free. */
  const pulseLayers = [
    { mat: crownMat, delay: 0.00, amp: 0.55, speed: 0.62 },
    { mat: fanMat, delay: 0.12, amp: 0.40, speed: 0.46 },
    { mat: hubMat, delay: 0.34, amp: 0.34, speed: 0.55 },
    { mat: webMat, delay: 0.46, amp: 0.26, speed: 0.50 },
    { mat: hairMat, delay: 0.62, amp: 0.20, speed: 0.58 },
  ];
  let surgeT = -1;
  let ambP = -0.3;
  function surge() { surgeT = 0; }

  /* ---------------- strand ownership (substrate-ownership.js) ----------
     Which filaments belong to which person: the graph Voronoi over the web
     the block above just built, moved out by H01 (2026-08-21) because it is
     a POST-PASS rather than a build step — owned/index.js calls assignOwners
     after this builder has returned and only then registers the geometry.
     Constructed HERE, at the point the region occupied, because webGeo and
     webOwner are assigned by the web block above and the sibling holds them
     by reference. */
  const { assignOwners, setActiveNode, ownershipStats } = createStrandOwnership({
    baked, webGeo, webOwner, netNodes, webAdj, webLinkMeta, webMat,
  });

  /* ---------------- frame update ---------------- */
  let fade = 0, passage = 0;
  function setFade(a) {
    fade = a;
    for (const m of timeMats) m.uniforms.uFade.value = a;
    glints.mat.uniforms.uFade.value = a;
    cores.mat.uniforms.uFade.value = a;
    halos.mat.uniforms.uFade.value = a;
    for (const f of fadeSprites) f.mat.opacity = f.base * a;
  }
  /** The lid's own drive (2026-08-11, the soil horizon). Split off setFade
   *  because the ceiling must be SOLID the moment the lens is under it, while
   *  everything else swims up through SINK_D's metre of murk — see the
   *  ceiling's note. `a` is the chapter arm times the crossing term. */
  /** `reach` (2026-08-11) opens the ceiling's structure window from 3.00 to
   *  8.60 units. It is keyed on DISTANCE FROM THE CROWN (owned/index.js),
   *  which is the one quantity that separates the two situations: at both
   *  Owned rests the lens sits 1.85 / 2.06 units off the crown and the lid
   *  overhead is DRESSED — the crown's own fan blazes across it — so 3.00 is
   *  right and the frozen composition is protected; out along the Owned ->
   *  Final traverse the lens is 3.5-10 units off, nothing lights the lid, and
   *  at 3.00 the top third of the frame measured a mean luminance of 10.3/255
   *  (Hannah: "there's kind of black, weird blackness above the top"). */
  function setLid(a, reach = 0) {
    ceiling.mat.uniforms.uOpacity.value = a;
    ceiling.mat.uniforms.uReach.value = reach;
    ceiling.mesh.visible = a > 0.004;
  }
  /** The soil horizon's drive: the chapter arm times the depth band that says
   *  the lens is inside the layer (owned/index.js). Zero at the rest. */
  function setPassage(a) {
    passage = a;
    for (const m of horizonMats) m.uniforms.uFade.value = a;
    for (const s of horizonSprites) s.mat.opacity = s.base * a;
    // Outside the band these two contribute exactly zero (additive at uFade
    // 0), so hiding them is not a fade — it is declining to submit ~9.8k line
    // verts and 4.2k points that would draw nothing. Measured: it returns
    // BOTH rests to the shipped draw-call count exactly (owned 55, final 428),
    // i.e. the soil horizon is free everywhere it is not the picture.
    const on = a > 0.004;
    for (const o of horizonObjs) o.visible = on;
  }
  setFade(0);
  setLid(0);
  setPassage(0);

  function update(dt, time) {
    if (passage > 0) for (const m of horizonMats) m.uniforms.uTime.value = time;
    if (fade <= 0) return;
    for (const m of timeMats) m.uniforms.uTime.value = time;
    glints.mat.uniforms.uTime.value = time;
    cores.mat.uniforms.uTime.value = time;
    halos.mat.uniforms.uTime.value = time;

    // ambient: a very slow, uneven wander of light down the primaries. Never
    // a loop you can count — the phase is driven by a noise-modulated rate
    // and restarts at a jittered negative offset.
    ambP += dt * (0.030 + 0.026 * (0.5 + 0.5 * H.noise3(time * 0.043, 2.1, 0)));
    if (ambP > 1.3) ambP = -0.28 - rndA() * 0.5;
    fanMat.uniforms.uPulse.value = ambP;
    fanMat.uniforms.uPulseOn.value = (ambP > -0.1 && ambP < 1.2) ? 0.16 : 0;

    let surgeAmt = 0;
    if (surgeT >= 0) {
      surgeT += dt;
      for (const L of pulseLayers) {
        const p = (surgeT - L.delay) * L.speed;
        const on = (p > -0.05 && p < 1.15) ? Math.sin(Math.PI * clamp(p, 0, 1)) : 0;
        if (L.mat === fanMat && on <= 0) continue;   // fan keeps its ambient
        L.mat.uniforms.uPulse.value = clamp(p, 0, 1);
        L.mat.uniforms.uPulseOn.value = on * L.amp;
      }
      surgeAmt = Math.max(0, 1 - surgeT / 3.2);
      if (surgeT > 3.4) {
        surgeT = -1;
        for (const L of pulseLayers) if (L.mat !== fanMat) L.mat.uniforms.uPulseOn.value = 0;
      }
    }
    cores.mat.uniforms.uSurge.value = surgeAmt;
    halos.mat.uniforms.uSurge.value = surgeAmt;

    // foreground soil parallax: near aggregates drift very slowly
    const drift = H.noise3(time * 0.031, 4.4, 0) * 0.10;
    aggNear.pts.position.set(drift, H.noise3(0, time * 0.027, 9.1) * 0.07, -drift * 0.6);
    aggFar.mat.opacity = aggFar.baseOp * fade * (0.85 + 0.15 * (0.5 + 0.5 * Math.sin(time * 0.09)));
    aggNear.mat.opacity = aggNear.baseOp * fade * (0.82 + 0.18 * (0.5 + 0.5 * Math.sin(time * 0.063 + 1.7)));
  }
  // Population counts are NOT derivable from geometry attribute lengths (the
  // fan bakes primaries+skirt+secondaries into one buffer, the web folds its
  // graph into aOwner, etc.), so on the baked path they come from the payload;
  // live they are the arrays the builders just filled. Vertex counts ARE
  // derivable and are recomputed from each baked attribute's .count.
  const popCounts = baked
    ? (baked.counts || { primaries: 0, skirt: 0, secondaries: 0, netNodes: 0, netLinks: 0, hubs: 0, voids: 0 })
    : {
        primaries: primaries.length,
        skirt: skirt.length,
        secondaries: secondaries.length,
        netNodes: netNodes.length,
        netLinks,
        hubs: hubPos.length,
        voids: VOIDS.length,
      };

  return {
    group, update, surge, setFade, setLid, setPassage, nearestCordPoint, inVoid,
    assignOwners, setActiveNode, ownershipStats,
    CROWN, hubs: hubPos.map(h => h.p.clone()),
    // The bake recording site (owned/index.js) reads these AFTER assignOwners
    // so the web's aOwner is final. Keys match the baked.js geometry() keys.
    geometries: {
      fan: fanGeo, hair: hairGeo, web: webGeo, glints: glints.geo,
      crown: crownGeo, hubs: hubsGeo,
      hubCores: cores.geo, hubHalos: halos.geo,
      ceiling: ceiling.geo, lid: lidGeo, felt: feltGeo, grain: grainGeo,
      fill: fillGeo, aggregateFar: aggFar.geo, aggregateNear: aggNear.geo,
    },
    bakePayload: popCounts,
    counts: {
      primaries: popCounts.primaries,
      skirt: popCounts.skirt,
      secondaries: popCounts.secondaries,
      fanVerts, hairVerts, webVerts, crownVerts, hubVerts, lidVerts, fillVerts,
      feltVerts, grainPoints,
      glints: glints.count,
      netNodes: popCounts.netNodes,
      netLinks: popCounts.netLinks,
      hubs: popCounts.hubs,
      aggPoints,
      voids: popCounts.voids,
    },
  };
}
