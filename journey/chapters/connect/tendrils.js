// journey-v6 — CONNECT restage (doc 16): the ground network.
//
// The chapter's stage moved from the under-cap gill chamber to the open
// ground (16-connect-ground-restage.md): luminous surface tendrils grow out
// of the stipe base and run across the terrain to three glowing hubs —
// ADOS (near), Hivemind (mid), Discord (far) — with strands continuing past
// the hubs and past the frame edges. This file owns ALL geometry + shaders;
// connect/index.js stays the orchestrator (arming, drivers, hover, drive(p),
// node anchors).
//
// TERRAIN LAW (doc §3): every vertex sits at groundY(x, z) + lift, lift
// 0.015–0.06 — the same law the hero's own ground web obeys (organism.js §8,
// mirrored in ../../anatomy.js). Nothing floats, nothing sinks. The whole
// group parents to a NON-sway node (sceneApi.scene): the network is rooted
// terrain; it must not sway with the cap.
//
// NETWORK ANATOMY (runners + neural + fibre-optic; never tree roots /
// lightning / circuit-board):
//   · 3 primary routes, one per hub, leaving the stipe base at distinct
//     azimuths, meandering (low-frequency wander + secondary curvature; no
//     straight runs, no right angles). Each is a loose braid of 2–3 strands
//     (the Hivemind-braid precedent) so primaries read thicker BY STRUCTURE.
//   · Secondary branches forking at oblique angles, thinning, some
//     reconnecting (anastomosis — fungal, not dendritic).
//   · Hairline fill knitting the sector together, PATCHY (whole pockets stay
//     dark — the patchOf precedent; organic asymmetry is the house look).
//   · Junction glints where strands meet (bead points, existing glow tex).
//   · Hubs: 9–13 short strands converging to a bright core (glow sprite +
//     tight ground-knot, ADOS-knot precedent), with 2–3 strands continuing
//     PAST each hub toward and beyond the frame edge.
//   · A few long strands exit frame left/right at low brightness.
//
// SHADER LAWS (doc §7 — hard-won; violations have blacked whole frames):
// vertex-heavy / fragment-cheap (everything smooth along a strand is
// computed per vertex and shipped premultiplied; fragments are clamps and a
// couple of mixes), every varying clamped to its domain, pow() bases
// strictly positive, output capped at 48, additive blending, depthWrite
// false, frustumCulled false. Budget: segments well under the chamber's old
// ~5k, points ≤ 500.
//
// GROWTH is the arrival (doc §4): index.js drives uGrow 0..1 (keyed to
// leg-local progress); a soft front sweeps outward along aAlong (0 at the
// stipe base, 1 at the farthest strand tip), tips leading with a slightly
// brighter growing edge (uGrowEdge). At the arm boundaries the network has
// zero extent — armed but invisible, the Final chapter's "dark at arm" law.
import * as THREE from 'three';
import { makeRng, gaussOf, heat, groundY, makeGlowTexture } from '../../anatomy.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
const tmpC = new THREE.Color();

function smooth01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
const sm = (a, b, x) => smooth01((x - a) / (b - a));

/* ================================================================
   The three hubs — world positions authored against the live rest
   frame (doc §3: "the frame is the spec"). ADOS nearest the base
   (lower-centre-left of frame), Hivemind mid-frame upper-network,
   Discord far right. y is derived from the terrain law at build.
   ================================================================ */
export const HUBS = {
  ados:     { pos: new V3(2.85, 0, 0.25), az: 0.20, spokes: 13, coreScale: 0.34 },
  hivemind: { pos: new V3(1.65, 0, -3.05), az: -1.07, spokes: 11, coreScale: 0.30 },
  discord:  { pos: new V3(5.35, 0, -3.45), az: -0.57, spokes: 9,  coreScale: 0.27 },
};
export const HUB_IDS = ['ados', 'hivemind', 'discord'];

// Stipe footprint: routes leave the base at the stem's visible edge.
const BASE_R = 0.52;
const LIFT_LO = 0.015, LIFT_HI = 0.06;

const gy = (x, z, lift) => groundY(x, z) + lift;

/* ================================================================
   Materials
   ================================================================ */
function makeStrandMat(U) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount,
      uGrow: U.uGrow, uGrowEdge: U.uGrowEdge,
      uRouteAmp: U.uRouteAmp,     // vec3: per-route brightness (hover lift / unrelated dim)
      uHairAmp: U.uHairAmp,       // hairline fill brightness (mild dim while any hub is hot)
      uPulseHead: U.uPulseHead,   // vec3: travelling pulse head per route (route-along 0..1; -2 parked)
      uPulseAmp: U.uPulseAmp,     // vec3: pulse strengths
      uExit: U.uExit,             // x: exit convergence amount (camera-driven)
      uWell: U.uWell,             // xy: world-xz centre of the copy brightness well, z: strength, w: radius
      uBase: { value: 1.05 },
      uNear: { value: 0.9 },
      uFar: { value: 0.055 },     // soft distance dim (own, gentler than scene fog)
      uColDeep: { value: heat(0.46, new THREE.Color()).clone() },
      uColGold: { value: heat(0.64, new THREE.Color()).clone() },
      uColHot: { value: heat(0.92, new THREE.Color()).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aA;   // along (global 0..1), routeAlong (0..1), route (0,1,2; 3 hairline; 4 continuation), tier (0 primary, 1 secondary, 2 hairline, 3 faded continuation)
      attribute vec3 aB;   // seed, bright, patch
      uniform float uTime, uAmount, uGrow, uGrowEdge, uBase, uNear, uFar, uHairAmp;
      uniform vec3 uRouteAmp, uPulseHead, uPulseAmp;
      uniform float uExit;
      uniform vec4 uWell;
      uniform vec3 uColDeep, uColGold, uColHot;
      varying vec3 vCol;
      void main() {
        float along = aA.x, rAlong = aA.y, route = aA.z, tier = aA.w;
        float seed = aB.x, bright = aB.y, pat = aB.z;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = length(mv.xyz);

        /* ---- growth front (the arrival; also the no-self-ignition answer) ---- */
        float head = uGrow * 1.06;                      // slight lead so uGrow=1 saturates every tip
        float vis = 1.0 - smoothstep(head - 0.05, head + 0.004, along);
        // the growing edge glows a touch brighter, fading once growth completes
        float dTip = (along - head) / 0.028;
        float tip = exp(-dTip * dTip) * uGrowEdge;

        /* ---- ambient shimmer (tw idiom, slow: 0.1–0.4 Hz) ---- */
        float tw = 0.5 + 0.5 * sin(uTime * (0.63 + fract(seed * 7.31) * 1.88) + seed * 41.0);

        /* ---- travelling pulse along this route (base -> hub) ----
           gaussian via d*d products only — NEVER pow() with a base that can
           go negative (blades.js NaN law: one NaN fragment blacks the frame
           through the bloom mips and TAA holds it forever). ---- */
        float routeAmp = uHairAmp;
        float pulse = 0.0;
        if (route < 0.5)      { routeAmp = uRouteAmp.x; float d = (rAlong - uPulseHead.x) * 9.0; pulse = uPulseAmp.x * exp(-d * d); }
        else if (route < 1.5) { routeAmp = uRouteAmp.y; float d = (rAlong - uPulseHead.y) * 9.0; pulse = uPulseAmp.y * exp(-d * d); }
        else if (route < 2.5) { routeAmp = uRouteAmp.z; float d = (rAlong - uPulseHead.z) * 9.0; pulse = uPulseAmp.z * exp(-d * d); }

        /* ---- exit convergence: energy drains home into the root ---- */
        float nearBase = exp(-along * 5.5);
        float exit = uExit * (1.9 * nearBase - 0.55 * smoothstep(0.25, 0.7, along));

        /* ---- the copy brightness well (in-world calm zone, no overlays) ---- */
        vec2 dw = position.xz - uWell.xy;
        float well = 1.0 - uWell.z * exp(-dot(dw, dw) / (uWell.w * uWell.w));

        /* ---- distance shaping: near fade (lens through clean air) + far calm ---- */
        float distK = smoothstep(uNear * 0.35, uNear, dist) * exp(-uFar * uFar * dist * dist);

        float tierBase = tier < 0.5 ? 1.0 : (tier < 1.5 ? 0.46 : (tier < 2.5 ? 0.20 : 0.26));
        // continuations thin toward their tips (they leave the stage, not end on it)
        if (tier > 2.5) tierBase *= 1.0 - 0.85 * smoothstep(0.55, 1.0, rAlong);

        float gate = vis * uAmount * distK * pat * well;
        float b = uBase * bright * tierBase * routeAmp * (0.72 + 0.28 * tw) * (1.0 + exit);
        vCol = uColDeep * (b * 0.5)
             + uColGold * (b * 0.62)
             + uColHot * ((tip * 1.4 + pulse + max(exit, 0.0) * 0.22 * nearBase) * bright * pat);
        vCol *= gate;
        gl_Position = projectionMatrix * mv;
      }`,
    // THE CLAMPS ARE LOAD-BEARING (blades.js lesson, kept): rare garbage
    // varyings on this ANGLE Metal path must come out finite — one NaN/Inf
    // pixel becomes NaN through bloom, and TAA holds it forever.
    fragmentShader: /* glsl */`
      varying vec3 vCol;
      void main() {
        gl_FragColor = vec4(min(max(vCol, vec3(0.0)), vec3(48.0)), 1.0);
      }`,
  });
}

/** Points — junction glints + drifting particles share one material.
 *  aP = (along, seed, kind 0 glint / 1 particle, baseAlpha); aLife is a
 *  CPU-written per-frame window for the particles (1.0 for glints). */
function makePointMat(U, tex) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount, uGrow: U.uGrow,
      uPartAmp: U.uPartAmp,      // particle visibility gate (extent > 0.9)
      uMap: { value: tex },
      uSize: { value: 30.0 },
      uCol: { value: heat(0.78, new THREE.Color()).clone() },
      uCol2: { value: heat(0.60, new THREE.Color()).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aP;      // along, seed, kind, baseAlpha
      attribute float aLife;
      uniform float uTime, uGrow, uSize, uPartAmp;
      varying vec2 vA;        // alpha, seed
      void main() {
        float along = aP.x, seed = aP.y, kind = aP.z, baseA = aP.w;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float dist = length(mv.xyz);
        float head = uGrow * 1.06;
        float vis = 1.0 - smoothstep(head - 0.05, head + 0.004, along);
        float tw = 0.5 + 0.5 * sin(uTime * (0.7 + fract(seed * 9.13) * 1.6) + seed * 57.0);
        float a = baseA * vis * (0.45 + 0.55 * tw) * aLife;
        a *= mix(1.0, uPartAmp, step(0.5, kind));
        a *= smoothstep(0.5, 1.1, dist);
        float sz = uSize * (0.6 + fract(seed * 5.7) * 0.8) / max(dist, 0.5);
        // hero min-px-clamp trick: clamp px size, pay in alpha
        float px = max(sz, 1.6);
        a *= (sz / px) * (sz / px);
        vA = vec2(a, seed);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = px;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform float uAmount;
      uniform vec3 uCol, uCol2;
      varying vec2 vA;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        float a = clamp(vA.x, 0.0, 1.0) * clamp(uAmount, 0.0, 1.0);
        vec3 col = mix(uCol, uCol2, fract(vA.y * 9.3) * 0.7);
        gl_FragColor = vec4(col, tex.a * a);
      }`,
  });
}

/* ================================================================
   Route centre-lines
   ================================================================ */
/** Catmull-Rom through 4 points, plus organic wander. */
function sampleRoute(base, hub, rnd, bowSign) {
  const dir = hub.clone().sub(base);
  const len = dir.length();
  const perp = new V3(-dir.z, 0, dir.x).normalize();
  const bow1 = bowSign * (0.55 + rnd() * 0.5) * len * 0.22;
  const bow2 = -bowSign * (0.3 + rnd() * 0.45) * len * 0.16;
  const c1 = base.clone().lerp(hub, 0.33).addScaledVector(perp, bow1);
  const c2 = base.clone().lerp(hub, 0.7).addScaledVector(perp, bow2);
  const pts = [base, c1, c2, hub];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.6);
  const N = 56;
  const out = [];
  const w1 = 2.2 + rnd() * 1.6, w2 = 5.0 + rnd() * 2.6;
  const p1 = rnd() * TAU, p2 = rnd() * TAU;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = curve.getPoint(t);
    // secondary curvature: two incommensurate perpendicular sines, zero at
    // both ends so departure and arrival stay exact
    const env = Math.sin(Math.PI * t);
    const wob = (Math.sin(t * w1 * 2 + p1) * 0.10 + Math.sin(t * w2 * 2 + p2) * 0.045) * env;
    p.addScaledVector(perp, wob);
    out.push(p);
  }
  return out;
}

/** Cumulative arc length per sample. */
function arcLengths(poly) {
  const acc = [0];
  for (let i = 1; i < poly.length; i++) acc.push(acc[i - 1] + poly[i].distanceTo(poly[i - 1]));
  return acc;
}

/** Point at arc-fraction t of a polyline (with its arc table). */
function polyAt(poly, arcs, t) {
  const target = t * arcs[arcs.length - 1];
  let i = 1;
  while (i < arcs.length - 1 && arcs[i] < target) i++;
  const seg = arcs[i] - arcs[i - 1] || 1e-6;
  const f = (target - arcs[i - 1]) / seg;
  return poly[i - 1].clone().lerp(poly[i], f);
}

/* ================================================================
   The build
   ================================================================ */
export function buildTendrils(group, U) {
  const rnd = makeRng(160817);
  const gauss = () => gaussOf(rnd);
  const counts = { primarySegs: 0, secondarySegs: 0, hairSegs: 0, hubSegs: 0, contSegs: 0, glints: 0, particles: 0 };

  // patchy sector luminosity — whole pockets stay dark (organic asymmetry)
  const patchOf = (x, z) => {
    const p = 0.5 + 0.5 * (0.6 * Math.sin(x * 0.9 + z * 0.7 + 1.4) + 0.4 * Math.sin(x * 1.7 - z * 1.1 + 4.0));
    return 0.42 + 0.66 * p;
  };

  // strand buffers
  const sp = [], sA = [], sB = [];
  function pushSeg(P0, P1, a0, a1, ra0, ra1, route, tier, seed, b0, b1) {
    sp.push(P0.x, P0.y, P0.z, P1.x, P1.y, P1.z);
    sA.push(a0, ra0, route, tier, a1, ra1, route, tier);
    const pa = patchOf(P0.x, P0.z), pb = patchOf(P1.x, P1.z);
    sB.push(seed, b0, pa, seed, b1, pb);
  }

  // glint/particle buffers
  const gp = [], gP = [];
  function pushGlint(P, along, alpha) {
    gp.push(P.x, P.y + 0.012, P.z);
    gP.push(along, rnd(), 0, alpha);
    counts.glints++;
  }

  /* ---- ground the hub positions ---- */
  for (const id of HUB_IDS) {
    const h = HUBS[id];
    h.pos.y = gy(h.pos.x, h.pos.z, 0.03);
  }

  /* ---- primary routes: base -> hub, braided ---- */
  const routes = [];   // { id, poly, arcs, len }
  const bows = { ados: 1, hivemind: -1, discord: 1 };
  let maxAlong = 0;

  HUB_IDS.forEach((id, ri) => {
    const h = HUBS[id];
    const base = new V3(Math.cos(h.az) * BASE_R + 0.05, 0, Math.sin(h.az) * BASE_R + 0.02);
    base.y = gy(base.x, base.z, 0.03);
    const poly = sampleRoute(base, h.pos.clone(), rnd, bows[id]);
    // terrain law on the centre-line itself
    for (const p of poly) p.y = gy(p.x, p.z, 0.03);
    const arcs = arcLengths(poly);
    routes.push({ id, poly, arcs, len: arcs[arcs.length - 1], base });
    maxAlong = Math.max(maxAlong, arcs[arcs.length - 1] + 3.2);   // + room for continuations
  });

  const AL = (worldArc) => worldArc / maxAlong;    // world arc length -> global along

  routes.forEach((R, ri) => {
    const nStrands = R.id === 'discord' ? 2 : 3;
    for (let k = 0; k < nStrands; k++) {
      const ph0 = (k / nStrands) * TAU + rnd() * 0.8;
      const twist = 3.6 + rnd() * 2.2;
      const br = 0.030 + rnd() * 0.022;
      const seed = rnd();
      const bright = 0.8 + rnd() * 0.25;
      let prev = null;
      for (let i = 0; i < R.poly.length; i++) {
        const t = i / (R.poly.length - 1);
        const p = R.poly[i];
        const nxt = R.poly[Math.min(i + 1, R.poly.length - 1)];
        const dir = nxt.clone().sub(R.poly[Math.max(i - 1, 0)]);
        const perp = new V3(-dir.z, 0, dir.x).normalize();
        const ph = ph0 + t * twist * TAU;
        // braid tightens into the base and into the hub
        const tight = (0.35 + 0.65 * Math.sin(Math.PI * Math.min(t * 1.15, 1)) ** 0.7);
        const q = p.clone().addScaledVector(perp, Math.cos(ph) * br * tight);
        const lift = 0.028 + 0.020 * Math.sin(ph * 0.7 + seed * 9.0) * tight;   // stays in [0.008..0.048]
        q.y = gy(q.x, q.z, Math.max(LIFT_LO, Math.min(LIFT_HI, lift)));
        const node = { q, a: AL(R.arcs[i]), ra: t };
        if (prev) {
          pushSeg(prev.q, q, prev.a, node.a, prev.ra, t, ri, 0, seed, bright, bright);
          counts.primarySegs++;
        }
        prev = node;
      }
    }
  });

  /* ---- secondary branches (forks, oblique, thinning, some anastomosing) ---- */
  routes.forEach((R, ri) => {
    const nSec = 5 + Math.floor(rnd() * 2);
    for (let s = 0; s < nSec; s++) {
      const t0 = 0.18 + rnd() * 0.6;
      const P0 = polyAt(R.poly, R.arcs, t0);
      const dirAt = polyAt(R.poly, R.arcs, Math.min(t0 + 0.03, 1)).sub(polyAt(R.poly, R.arcs, Math.max(t0 - 0.03, 0))).normalize();
      const side = rnd() < 0.5 ? 1 : -1;
      const ang = side * (0.5 + rnd() * 0.55);           // oblique, never right-angle
      const cosA = Math.cos(ang), sinA = Math.sin(ang);
      const bd = new V3(dirAt.x * cosA - dirAt.z * sinA, 0, dirAt.x * sinA + dirAt.z * cosA);
      const anastomose = rnd() < 0.35;
      const len = anastomose ? 0 : 0.7 + rnd() * 1.5;
      let end;
      if (anastomose) {
        // reconnect further along the same route (fungal cross-link)
        const t1 = Math.min(t0 + 0.14 + rnd() * 0.2, 0.96);
        end = polyAt(R.poly, R.arcs, t1);
      } else {
        end = P0.clone().addScaledVector(bd, len);
      }
      const perp = new V3(-(end.z - P0.z), 0, end.x - P0.x).normalize();
      const bow = (rnd() - 0.5) * 0.5;
      const SEG = 14;
      const seed = rnd();
      let prev = null;
      let arc = t0 * R.len;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = P0.clone().lerp(end, t)
          .addScaledVector(perp, Math.sin(Math.PI * t) * bow + Math.sin(t * 7 + seed * 20) * 0.03 * Math.sin(Math.PI * t));
        p.y = gy(p.x, p.z, 0.02 + 0.015 * Math.sin(t * 5 + seed * 11));
        const node = { p, arc };
        if (prev) {
          arc += p.distanceTo(prev.p);
          const b0 = (1 - 0.6 * ((i - 1) / SEG)), b1 = (1 - 0.6 * (i / SEG));   // thinning
          pushSeg(prev.p, p, AL(prev.arc), AL(arc), t0, t0, ri, 1, seed, b0 * 0.9, b1 * 0.9);
          counts.secondarySegs++;
        }
        prev = { p, arc };
      }
      if (rnd() < 0.7) pushGlint(P0, AL(t0 * R.len), 0.5 + rnd() * 0.4);
      if (anastomose && rnd() < 0.7) pushGlint(end, AL(arc), 0.4 + rnd() * 0.4);
    }
  });

  /* ---- hairline fill: sparse web knitting the sector, patchy ---- */
  {
    const N_TRY = 240;
    for (let i = 0; i < N_TRY; i++) {
      const R = routes[Math.floor(rnd() * routes.length)];
      const t0 = 0.1 + rnd() * 0.85;
      const A = polyAt(R.poly, R.arcs, t0);
      // scatter around the route corridor
      const off = 0.25 + Math.pow(rnd(), 1.4) * 1.1;
      const oa = rnd() * TAU;
      const P0 = new V3(A.x + Math.cos(oa) * off, 0, A.z + Math.sin(oa) * off);
      // dark pockets survive: patchy acceptance
      if (patchOf(P0.x, P0.z) < 0.62 && rnd() < 0.72) continue;
      const len = 0.3 + rnd() * 0.75;
      const da = rnd() * TAU;
      const P1 = new V3(P0.x + Math.cos(da) * len, 0, P0.z + Math.sin(da) * len);
      const seed = rnd();
      const SEG = 5;
      const along0 = AL(t0 * R.len + off);
      const perp = new V3(-(P1.z - P0.z), 0, P1.x - P0.x).normalize();
      const bow = (rnd() - 0.5) * 0.16;
      let prev = null, arc = t0 * R.len + off;
      for (let sgi = 0; sgi <= SEG; sgi++) {
        const t = sgi / SEG;
        const p = P0.clone().lerp(P1, t).addScaledVector(perp, Math.sin(Math.PI * t) * bow);
        p.y = gy(p.x, p.z, LIFT_LO + rnd() * 0.012);
        if (prev) {
          arc += p.distanceTo(prev);
          pushSeg(prev, p, along0, AL(arc), 0.5, 0.5, 3, 2, seed, 0.7 + rnd() * 0.3, 0.7 + rnd() * 0.3);
          counts.hairSegs++;
        }
        prev = p;
      }
      if (rnd() < 0.16) pushGlint(P0, along0, 0.3 + rnd() * 0.3);
    }
  }

  /* ---- hubs: radial convergence + ground-knot + continuations ---- */
  const hubMeta = [];   // { id, pos, along, portAnchor } — index.js drives ignition
  routes.forEach((R, ri) => {
    const h = HUBS[R.id];
    const hubAlong = AL(R.len);
    // Portrait label anchor (the hiveAnchorLand/Port precedent, doc §3): the
    // narrow portrait frustum cannot always hold the hub itself, so a chip
    // may ride its route's in-frame stretch instead. The network is one
    // world-space build; only the ANCHOR is per-orientation.
    const portAnchor = polyAt(R.poly, R.arcs, 0.60);
    portAnchor.y = gy(portAnchor.x, portAnchor.z, 0.04);
    hubMeta.push({ id: R.id, pos: h.pos.clone(), along: hubAlong, route: ri, portAnchor });

    // radial convergence spokes
    for (let s = 0; s < h.spokes; s++) {
      const a = (s / h.spokes) * TAU + rnd() * 0.5;
      const rr = 0.45 + rnd() * 0.5;
      const P0 = new V3(h.pos.x + Math.cos(a) * rr, 0, h.pos.z + Math.sin(a) * rr);
      const seed = rnd();
      const SEG = 7;
      let prev = null;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = P0.clone().lerp(h.pos, t);
        p.x += gauss() * 0.02 * (1 - t);
        p.z += gauss() * 0.02 * (1 - t);
        p.y = gy(p.x, p.z, LIFT_LO + 0.02 * (1 - t) + 0.012 * t);
        if (prev) {
          // spokes carry the hub's along so they ignite as the front arrives;
          // rAlong 1.0 = the hub end of the route (pulses land here)
          pushSeg(prev, p, hubAlong + 0.012 * (1 - t), hubAlong + 0.012 * (1 - t), 1.0, 1.0, ri, 0, seed,
            (0.5 + 0.5 * t) * 1.1, (0.5 + 0.5 * Math.min(t + 1 / SEG, 1)) * 1.1);
          counts.hubSegs++;
        }
        prev = p;
      }
    }

    // tight ground-knot at the core (ADOS-knot precedent, flattened to terrain)
    {
      const N = 7;
      for (let k = 0; k < N; k++) {
        const a0 = rnd() * TAU, span = 1.5 + rnd() * 2.4;
        const Rk = 0.05 + rnd() * 0.09;
        const seed = rnd();
        const SEG = 6;
        let prev = null;
        for (let j = 0; j <= SEG; j++) {
          const t = j / SEG;
          const a = a0 + t * span;
          const rr = Rk * (1 - 0.3 * t);
          const p = new V3(h.pos.x + Math.cos(a) * rr, 0, h.pos.z + Math.sin(a) * rr);
          p.y = gy(p.x, p.z, 0.02 + 0.018 * Math.sin(a * 2 + seed * 7));
          if (prev) {
            pushSeg(prev, p, hubAlong, hubAlong, 1.0, 1.0, ri, 0, seed, 1.35, 1.35);
            counts.hubSegs++;
          }
          prev = p;
        }
      }
    }

    // continuations PAST the hub: outward, thinning to nothing off-stage
    const nCont = R.id === 'ados' ? 2 : 3;
    for (let c = 0; c < nCont; c++) {
      const away = h.pos.clone().sub(R.base).normalize();
      const spread = (c - (nCont - 1) / 2) * (0.5 + rnd() * 0.25) + gauss() * 0.1;
      const ca = Math.atan2(away.z, away.x) + spread;
      const clen = 2.4 + rnd() * 2.2;
      const end = new V3(h.pos.x + Math.cos(ca) * clen, 0, h.pos.z + Math.sin(ca) * clen);
      const perp = new V3(-(end.z - h.pos.z), 0, end.x - h.pos.x).normalize();
      const bow = (rnd() - 0.5) * 0.9;
      const seed = rnd();
      const SEG = 16;
      let prev = null, arc = R.len;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = h.pos.clone().lerp(end, t)
          .addScaledVector(perp, Math.sin(Math.PI * t) * bow + Math.sin(t * 6 + seed * 25) * 0.05 * t);
        p.y = gy(p.x, p.z, LIFT_LO + 0.02 * rnd());
        if (prev) {
          arc += p.distanceTo(prev);
          pushSeg(prev, p, AL(Math.min(arc, maxAlong * 0.995)), AL(Math.min(arc, maxAlong * 0.995)),
            t, Math.min(t + 1 / SEG, 1), ri, 3, seed, 0.9, 0.9);
          counts.contSegs++;
        }
        prev = p;
      }
    }
  });

  /* ---- long frame-exit strands (the larger, living ecosystem) ---- */
  {
    const exits = [
      { from: 0.55, route: 0, dir: 1.9, len: 4.6 },    // off toward frame-left past the mushroom
      { from: 0.45, route: 1, dir: -2.5, len: 4.2 },   // low frame-left/near
      { from: 0.7, route: 2, dir: -0.15, len: 4.4 },   // far frame-right
      { from: 0.75, route: 0, dir: 0.62, len: 4.8 },   // near-field: crosses the right foreground and exits
    ];
    for (const ex of exits) {
      const R = routes[ex.route];
      const P0 = polyAt(R.poly, R.arcs, ex.from);
      const end = new V3(P0.x + Math.cos(ex.dir) * ex.len, 0, P0.z + Math.sin(ex.dir) * ex.len);
      const perp = new V3(-(end.z - P0.z), 0, end.x - P0.x).normalize();
      const bow = (rnd() - 0.5) * 1.2;
      const seed = rnd();
      const SEG = 15;
      let prev = null, arc = ex.from * R.len;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = P0.clone().lerp(end, t)
          .addScaledVector(perp, Math.sin(Math.PI * t) * bow + Math.sin(t * 5 + seed * 30) * 0.06 * t);
        p.y = gy(p.x, p.z, LIFT_LO + 0.02 * rnd());
        if (prev) {
          arc += p.distanceTo(prev);
          pushSeg(prev, p, AL(Math.min(arc, maxAlong * 0.995)), AL(Math.min(arc, maxAlong * 0.995)),
            t, Math.min(t + 1 / SEG, 1), ex.route, 3, seed, 0.7, 0.7);
          counts.contSegs++;
        }
        prev = p;
      }
    }
  }

  /* ---- build the strand mesh ---- */
  const strandMat = makeStrandMat(U);
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    g.setAttribute('aA', new THREE.Float32BufferAttribute(sA, 4));
    g.setAttribute('aB', new THREE.Float32BufferAttribute(sB, 3));
    const lines = new THREE.LineSegments(g, strandMat);
    lines.frustumCulled = false;
    group.add(lines);
  }

  /* ---- glow texture, hub cores ---- */
  const glowTex = makeGlowTexture();
  const cores = [];
  for (const hm of hubMeta) {
    const h = HUBS[hm.id];
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: heat(0.82, tmpC).clone(),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    s.position.copy(h.pos).add(new V3(0, 0.05, 0));
    s.scale.setScalar(h.coreScale);
    group.add(s);
    cores.push({ id: hm.id, sprite: s, mat, baseScale: h.coreScale });
  }

  /* ---- particles: sparse, slow, drifting along the primaries ---- */
  const N_PART = 108;
  const partData = [];
  {
    for (let i = 0; i < N_PART; i++) {
      const ri = Math.floor(rnd() * routes.length);
      partData.push({
        route: ri,
        phase: rnd(),
        speed: 0.010 + rnd() * 0.020,     // route-fractions per second — slow
        seed: rnd(),
      });
      gp.push(0, -10, 0);                  // parked; positioned by updateParticles
      gP.push(0, partData[i].seed, 1, 0.5 + rnd() * 0.4);
    }
    counts.particles = N_PART;
  }

  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
  pointGeo.setAttribute('aP', new THREE.Float32BufferAttribute(gP, 4));
  const lifeArr = new Float32Array(gp.length / 3).fill(1);
  pointGeo.setAttribute('aLife', new THREE.BufferAttribute(lifeArr, 1));
  const pointMat = makePointMat(U, glowTex);
  const points = new THREE.Points(pointGeo, pointMat);
  points.frustumCulled = false;
  group.add(points);

  const nGlints = counts.glints;
  const posAttr = pointGeo.attributes.position;
  const pAttr = pointGeo.attributes.aP;
  const lifeAttr = pointGeo.attributes.aLife;

  /** Particle drift — pure in t (frozen-capture safe: t held => positions held). */
  function updateParticles(t) {
    for (let i = 0; i < N_PART; i++) {
      const d = partData[i];
      const R = routes[d.route];
      const f = (d.phase + t * d.speed) % 1;
      const p = polyAt(R.poly, R.arcs, f);
      const k = (nGlints + i) * 3;
      posAttr.array[k] = p.x;
      posAttr.array[k + 1] = gy(p.x, p.z, 0.045) + 0.01;
      posAttr.array[k + 2] = p.z;
      // life window: fade near path ends; occasional — deep sine gaps
      const wnd = smooth01(f / 0.08) * (1 - smooth01((f - 0.9) / 0.1));
      const occ = 0.5 + 0.5 * Math.sin(t * (0.05 + d.seed * 0.06) + d.seed * 40);
      lifeAttr.array[nGlints + i] = wnd * smooth01((occ - 0.35) / 0.4);
      // along for the growth gate: current route fraction of the global along
      pAttr.array[(nGlints + i) * 4] = f * (R.len / maxAlong);
    }
    posAttr.needsUpdate = true;
    lifeAttr.needsUpdate = true;
    pAttr.needsUpdate = true;
  }

  const totalSegs = counts.primarySegs + counts.secondarySegs + counts.hairSegs + counts.hubSegs + counts.contSegs;

  return {
    counts: { ...counts, totalSegs, points: counts.glints + counts.particles },
    strandMat, pointMat,
    routes, hubMeta, cores,
    updateParticles,
  };
}
