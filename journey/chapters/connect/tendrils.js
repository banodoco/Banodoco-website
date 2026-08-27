// journey-v6 — CONNECT restage (doc 16): the ground network.
//
// The chapter's stage moved from the under-cap gill chamber to the open
// ground (16-connect-ground-restage.md): luminous surface tendrils grow out
// of the stipe base and run across the terrain to three glowing hubs —
// ADOS (near), Hivemind (mid), Discord (far) — with strands continuing past
// the hubs and past the frame edges. This file owns ALL geometry; its two
// shader materials are in ./tendrils-materials.js and its committed-bytes read
// in ./tendrils-baked.js (elegance order H02, 2026-08-21) — the three together
// are the chapter's builder. connect/index.js stays the orchestrator (arming,
// drivers, hover, drive(p), node anchors).
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
// THE PATHS PRE-EXIST; ARRIVING LIGHTS THEM UP (2026-08-05, Hannah: "make it
// so the stuff that appears on the ground when you enter the section actually
// moves along the lines that are already there rather than creating new lines
// ... currently it feels weird that they just appear"). The network is no
// longer GROWN as geometry keyed to leg progress. Two gates now stack:
//
//   uAmount   arm x the CAMERA-PURE resolve (index.js computes the resolve
//             from the camera's own gaze — no timeline, no p — and folds it
//             into this one uniform). It is what brings the QUIET,
//             un-highlighted paths out of the ground as the eye drops onto
//             it, exactly the way real ground detail resolves as you come
//             down to it, and dissolves them back on the way out. It is
//             EXACTLY ZERO at the hero pose and at the Inspire rest, which is
//             what keeps those protected frames untouched.
//   uLit      the travelling LIGHT (pure in p, so reverse scrubs mirror): a
//             soft front sweeps outward along aAlong (0 at the stipe base,
//             1 at the farthest strand tip) lifting each strand from its
//             quiet level to its full one, with a brighter head at the front
//             (uHead). Nothing appears; the light simply arrives.
//
// ONE ROUTE AT A TIME (2026-08-06, Hannah: "make them happen ONE AT A TIME and
// A LOT SLOWER ... it should feel like an ecosystem growing"). uLit/uHead are
// now vec3 — ONE FRONT PER ROUTE — and every vertex carries the id of the
// route whose front owns it (aB.w, the LIT ROUTE) alongside aA.z (which keeps
// owning hover amp and pulses, and is 3 for the hairline fill). The hairline
// inherits the lit route of the primary it was scattered around, so the fill
// near a hub lights with that hub rather than as one flat sheet. uLitMax is
// the along-distance each front must cover to saturate its own route's
// farthest tip (measured at build, plus the front's own ramp width), so a
// route's uLit runs a clean 0..1 no matter how long the route is, and
// index.js can key the hub kindle off the same number.

//
// So a strand's brightness is mix(uQuiet, 1.0, litMask) * uAmount, and the
// tier contrast is compressed in the quiet state (uQuietTier) so the resting
// network reads as ONE ambient web — the hero's own ground web (organism.js
// §8) organised into three routes — rather than as three bright highways
// waiting to be switched on. At the arm boundaries uResolve is 0: armed but
// invisible, the Final chapter's "dark at arm" law, now camera-keyed.
import * as THREE from 'three';
import { makeRng, gaussOf, heat, groundY, makeGlowTexture } from '../../anatomy.js';
import { FRONT_SOFT, makeStrandMat, makePointMat } from './tendrils-materials.js';
import { readBakedTendrils } from './tendrils-baked.js';
import { FIXED_HOTSPOTS } from '../../structure.js';
import { CONNECT_NODES, CONNECT_FOCAL_ID } from '../../../content/connect-nodes.js';

const TAU = Math.PI * 2;
const V3 = THREE.Vector3;
const tmpC = new THREE.Color();

// THE SHAPE OF THE FRONT — FRONT_SOFT (the quiet->lit ramp trailing the head)
// and FRONT_TIP (the half-width of the brighter head) moved to
// ./tendrils-materials.js with H02, because they exist to set uSoft/uTipW and
// their sixty lines of authoring rationale are entirely about how litMask's
// ramp reads on screen. Re-exported here so this module's export surface —
// and connect/index.js's `import { … FRONT_SOFT } from './tendrils.js'` — is
// unchanged. connect/index.js keys the hub kindle off the same width.
export { FRONT_SOFT, FRONT_TIP } from './tendrils-materials.js';

function smooth01(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

/* ================================================================
   The three hubs — world positions authored against the live rest
   frame (doc §3: "the frame is the spec"). ADOS nearest the base
   (lower-centre-left of frame), Hivemind mid-frame upper-network,
   Discord far right. y is derived from the terrain law at build.
   ================================================================ */
// ADOS moved LEFT of the mushroom (Hannah's mockup, 2026-08-04): the hub now
// sits in the lower-left ground field — world (+x, +z) is the camera-left
// foreground at the rest pose — with its own primary route running out of
// the stipe base and past the LEFT of the stem. Chip lands clearly left of
// the stem silhouette and fully clear of the centred copy block at 1280×800
// and 1440×900 (the previous centre-frame spot put it under the headline).
// Departure azimuth re-aimed to match (0.20 → 0.86); the braid/meander
// language and the route id are unchanged. Hivemind/Discord keep their
// audit-pass positions (1.65 → 1.38 −x nudge etc. — see git history).
// Core scales ~1.35× (with the resting-opacity lift in index.js) so each
// hub reads as a destination-beacon at rest — controlled halo, not
// lens-flare.
//
// TOP-LEFT / TOP-RIGHT RESTAGE (Hannah, 2026-08-04): with the mushroom in the
// frame's upper-left and the copy block in the upper-right, all three hubs are
// re-placed to fan through the open diagonal band between them — the ground
// that owns the lower two-thirds of the new rest frame. Authored against the
// live frame (doc §3: "the frame is the spec") and checked at 1440x900,
// 1280x800 and 375x812. Departure azimuths fan 37 / -27 / -8 deg out of the
// stipe base so the three primaries leave in genuinely different directions
// and never run as a bundle; the hubs land at world radius 4.3 / 5.6 / 8.0 —
// near / mid / far, exactly the narrative order (ADOS the flagship nearest the
// base, Discord the far everyday door).
// THE TWO NEAR HUBS COME DOWN THE FRAME (2026-08-14, Hannah): "we should try
// pushing the ADOS one down a bunch and the Discord one down a bit, and then
// visually understand if it feels visually balanced." This supersedes her own
// preceding instruction to push the MUSHROOM down again; the complaint under
// both is the same — dead space along the bottom of the Connect frame — and
// the three passes above (f31a0a9, 330d3a1, the third pass) have established
// that the camera cannot spend any more on it. At fixed eye, radius and fov
// the aim is a pure rotation, so every pixel the subject comes down costs
// ~1.27 px of void under the copy. This lever has no such exchange rate: the
// hubs are the furniture, and moving furniture into an empty corner of the
// room does not move anything else.
//
// AUTHORED IN THE FRAME, not in world space (doc §3: "the frame is the spec").
// A world-space translation is the wrong tool here — walking a hub along the
// ground-projected camera axis moves it down-screen AND hard to the right, and
// for Discord that runs it off the right edge before it has come down 60 px
// (measured: at −1.0 units it is at screen x 1339 of 1440, with a 100 px chip
// still to its right). Instead each target was picked as a SCREEN position at
// the 1440x900 rest and ray-marched back onto the terrain — cast from the lens
// through the target pixel, bisect where the ray crosses groundY. The world
// values below are that solution, and they re-project to their targets exactly.
//
//   ADOS      screen (248, 701) -> (254, 820)   down 119 px   world r 4.28 -> 5.53
//   Discord   screen (1221, 641) -> (1220, 720)  down  79 px   world r 8.01 -> 7.89
//   Hivemind  untouched
//
// "A bunch" and "a bit" as a 1.5:1 ratio in screen pixels, which is what the
// two phrases have to mean side by side. Candidates at 90/50, 119/79 and
// 149/109 px were compared on the frame: the first leaves a visible strip of
// unoccupied ground under ADOS, the third pushes ADOS's halo hard against the
// bottom edge and tightens the (pre-existing, already 4 px) portrait
// hivemind/discord chip pair to 3 px. The middle one ships.
//
// WHAT THIS DOES TO THE ROUTES, because they are not free. The route is
// re-sampled base -> hub, so its length changes, and `maxAlong` normalises the
// whole lighting schedule: ADOS's run lengthens with its radius (4.28 -> 5.53)
// and Discord's is very nearly a pure azimuth rotation at constant radius
// (8.01 -> 7.89), which is exactly the asymmetry the screen-space authoring
// produced and not a thing that was aimed for. The consequence is measured and
// reported in 16-connect-ground-restage.md: the HIVEMIND -> DISCORD -> ADOS
// order of `6afd508` still holds, ADOS is still last, and its light still
// visibly travels before its dot kindles.
//
// DEPARTURE AZIMUTHS ARE DELIBERATELY NOT RE-AIMED. The 37 / -27 / -8 deg fan
// out of the stipe base is what keeps the three primaries from leaving as a
// bundle, and it is a property of the BASE, not of where each route ends. ADOS's
// hub azimuth moves 3.9 deg and Discord's 8.8 deg, both small enough that the
// existing bow constants absorb them; re-aiming `az` to chase the hubs would
// narrow the fan for no gain.
//
// WHERE THE NUMBERS THAT PARAGRAPH ARGUES ABOUT ACTUALLY LIVE:
// `content/connect-nodes.js`, beside the rest of each node's identity — the
// placement, the azimuth, the bow, the strand and continuation counts, the
// spoke count and the core scale, one row per node.
//
// What lives HERE is the JOIN: the
// schema says which nodes the Connect chapter has and in what order, the
// content table says what each one is like, and this module needs both to
// grow a route to it. A schema id with no row in the table is a build that
// would otherwise produce a hub at `undefined` and fail four hundred lines
// away, so it is refused at module load with the id named.
export const HUB_IDS = FIXED_HOTSPOTS.connect;
for (const id of HUB_IDS) {
  if (!CONNECT_NODES[id]) throw new Error(`[tendrils] connect node '${id}' has no row in content/connect-nodes.js`);
}

/** The hub seeds for ONE build. The content table is frozen and shared, and
 *  grounding a hub writes `pos.y` — so every build gets its own vectors and
 *  the table stays authoritative rather than becoming a scratch buffer that
 *  the first build on the page silently rewrites for the second. */
function hubWorkingSet() {
  return Object.fromEntries(HUB_IDS.map((id) => {
    const n = CONNECT_NODES[id];
    return [id, { ...n, pos: new V3(n.pos[0], n.pos[1], n.pos[2]) }];
  }));
}

// Stipe footprint: routes leave the base at the stem's visible edge.
const BASE_R = 0.52;
const LIFT_LO = 0.015, LIFT_HI = 0.06;

const gy = (x, z, lift) => groundY(x, z) + lift;

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

  // How far each route's own light front has to travel to saturate its own
  // farthest vertex — measured here rather than assumed, because
  // continuations and frame-exit strands run past the hub by different
  // amounts on each route. index.js keys the hub kindle off the same numbers.
  const routeReach = [0, 0, 0];

  // strand buffers
  const sp = [], sA = [], sB = [];
  // `lr` is the LIT ROUTE — which front lights this segment. It equals `route`
  // everywhere except the hairline fill, whose route id is 3 (that id owns the
  // hover amp) but which lights with the primary it was scattered around.
  function pushSeg(P0, P1, a0, a1, ra0, ra1, route, tier, seed, b0, b1, lr = route) {
    sp.push(P0.x, P0.y, P0.z, P1.x, P1.y, P1.z);
    sA.push(a0, ra0, route, tier, a1, ra1, route, tier);
    const pa = patchOf(P0.x, P0.z), pb = patchOf(P1.x, P1.z);
    sB.push(seed, b0, pa, lr, seed, b1, pb, lr);
    const far = a0 > a1 ? a0 : a1;
    if (far > routeReach[lr]) routeReach[lr] = far;
  }

  // glint/particle buffers
  const gp = [], gP = [], gR = [];
  function pushGlint(P, along, alpha, lr) {
    gp.push(P.x, P.y + 0.012, P.z);
    gP.push(along, rnd(), 0, alpha);
    gR.push(lr);
    counts.glints++;
  }

  const baked = readBakedTendrils();


  /* ---- ground the hub positions ---- */
  const HUBS = hubWorkingSet();
  for (const id of HUB_IDS) {
    const h = HUBS[id];
    h.pos.y = gy(h.pos.x, h.pos.z, 0.03);
  }

  let routes, hubMeta, maxAlong, partData;

  if (baked) {
    routes = baked.routes;
    hubMeta = baked.hubMeta;
    partData = baked.particles;
    maxAlong = Math.max(...routes.map((r) => r.len)) + 3.2;
    Object.assign(counts, baked.counts);
  } else {
  /* ---- primary routes: base -> hub, braided ---- */
  routes = [];   // { id, poly, arcs, len }
  maxAlong = 0;

  HUB_IDS.forEach((id) => {
    const h = HUBS[id];
    const base = new V3(Math.cos(h.az) * BASE_R + 0.05, 0, Math.sin(h.az) * BASE_R + 0.02);
    base.y = gy(base.x, base.z, 0.03);
    const poly = sampleRoute(base, h.pos.clone(), rnd, h.bow);
    // terrain law on the centre-line itself
    for (const p of poly) p.y = gy(p.x, p.z, 0.03);
    const arcs = arcLengths(poly);
    routes.push({ id, poly, arcs, len: arcs[arcs.length - 1], base });
    maxAlong = Math.max(maxAlong, arcs[arcs.length - 1] + 3.2);   // + room for continuations
  });

  const AL = (worldArc) => worldArc / maxAlong;    // world arc length -> global along

  routes.forEach((R, ri) => {
    const nStrands = HUBS[R.id].strands;
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
        if (prev) {
          arc += p.distanceTo(prev.p);
          const b0 = (1 - 0.6 * ((i - 1) / SEG)), b1 = (1 - 0.6 * (i / SEG));   // thinning
          pushSeg(prev.p, p, AL(prev.arc), AL(arc), t0, t0, ri, 1, seed, b0 * 0.9, b1 * 0.9);
          counts.secondarySegs++;
        }
        prev = { p, arc };
      }
      if (rnd() < 0.7) pushGlint(P0, AL(t0 * R.len), 0.5 + rnd() * 0.4, ri);
      if (anastomose && rnd() < 0.7) pushGlint(end, AL(arc), 0.4 + rnd() * 0.4, ri);
    }
  });

  /* ---- hairline fill: sparse web knitting the sector, patchy ---- */
  {
    const N_TRY = 240;
    for (let i = 0; i < N_TRY; i++) {
      // the fill lights with the primary it belongs to, so the web around a
      // hub kindles with that hub instead of as one flat sheet
      const rIdx = Math.floor(rnd() * routes.length);
      const R = routes[rIdx];
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
          pushSeg(prev, p, along0, AL(arc), 0.5, 0.5, 3, 2, seed, 0.7 + rnd() * 0.3, 0.7 + rnd() * 0.3, rIdx);
          counts.hairSegs++;
        }
        prev = p;
      }
      if (rnd() < 0.16) pushGlint(P0, along0, 0.3 + rnd() * 0.3, rIdx);
    }
  }

  /* ---- hubs: radial convergence + ground-knot + continuations ---- */
  hubMeta = [];   // { id, pos, along, route } — index.js drives ignition
  routes.forEach((R, ri) => {
    const h = HUBS[R.id];
    const hubAlong = AL(R.len);
    // THE PORTRAIT LABEL ANCHOR IS GONE (2026-08-14). This used to also carry
    // a `portAnchor` — a point on the route the chip could ride when the
    // narrow portrait frustum could not hold the hub itself (the
    // hiveAnchorLand/Port precedent, doc §3). By 2026-08-04 only Discord still
    // used one; it is now retired too, and with no reader left the anchor is
    // no longer computed. A hub's chip is anchored on the hub, in both
    // orientations, full stop — see index.js's node-anchor block for the
    // measurement and for what made the exception expire (the chip layer's
    // edge-flip, which keeps the DOT on its node and mirrors only the pill).
    hubMeta.push({ id: R.id, pos: h.pos.clone(), along: hubAlong, route: ri });

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
          // rAlong 1.0 = the hub end of the route (pulses land here).
          // 1.1 → 1.5 (audit taste pass): the radial-spoke convergence is the
          // hub's resting signature — it must read against the ambient web.
          // tier -1 = hub convergence: identical to tier 0 once lit (same
          // tierBase, same pulse rights), far quieter before (see the shader).
          pushSeg(prev, p, hubAlong + 0.012 * (1 - t), hubAlong + 0.012 * (1 - t), 1.0, 1.0, ri, -1, seed,
            (0.5 + 0.5 * t) * 1.5, (0.5 + 0.5 * Math.min(t + 1 / SEG, 1)) * 1.5);
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
            // 1.35 → 1.6 (audit taste pass): the tight core knot anchors the
            // starburst's centre of gravity at rest.
            pushSeg(prev, p, hubAlong, hubAlong, 1.0, 1.0, ri, -1, seed, 1.6, 1.6);
            counts.hubSegs++;
          }
          prev = p;
        }
      }
    }

    // continuations PAST the hub: outward, thinning to nothing off-stage
    const nCont = h.continuations;
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

  /* ---- FAR FIELD: the network does not stop at the hubs ------------------

     2026-08-13, Hannah's THIRD report on this frame ("it still feels too high
     on the page tbh"). The mushroom had to come down a long way, and at fixed
     eye/radius/fov the aim is a pure rotation: every degree that lowers the
     subject sweeps the ground's far edge down with it and reopens the empty
     band under the copy — which is the complaint the pass before it was
     fixing. Two passes traded along that one axis in opposite directions and
     each re-opened the other's report. This is the thing that breaks it.

     THE BAND WAS NEVER FILLABLE BY AIMING, AND THE REASON IS MEASURABLE.
     Unprojected onto the ground at the rest pose (1440x900), the dark band
     under the copy lands between radius ~6 and ~20 — screen rows 460..540 map
     to 10.6..20.5 and 6.1..14.2 world units from the origin. THE NETWORK
     STOPPED AT 11.5: the farthest tendril vertex there was, measured, against
     a scene fog that does not close until 20. So the outer half of every frame
     this chapter has ever shot was bare soil, and the band read as a hole
     however the camera was pointed at it. Aiming down hid the hole by filling
     the frame with near ground and pushed the subject up and out of it (the
     f31a0a9 report); aiming up recovered the subject and showed the hole again
     (the 330d3a1 report). Neither pass could win because the ground the camera
     was being asked to point at was not there.

     So it is built. The chapter already says it should be — "strands
     continuing past the hubs and past the frame edges", "the larger, living
     ecosystem" — this carries that reach out to ~17 units, into the arc the
     band actually occupies (az -1.78..-0.82, the far side past Hivemind and
     Discord). The subject can then come down 84 px for 6 px of band, instead
     of the 107 px the measured exchange rate charges.

     WHAT IT MAY NOT DISTURB, and how each is held:
       · maxAlong / routeReach / uLitMax — untouched. The along values here are
         mapped into the 0.82..0.995 tail EXPLICITLY rather than accumulated
         from world arc, so no vertex reaches past the 0.995 clamp the existing
         continuations already sit on. The lighting schedule, its order and its
         pacing are arithmetically identical.
       · The pulse machinery — tier 3 everywhere on the runners, which is the
         gate the 2026-08-04 ghost-pulse audit installed (`tier > 2.5` zeroes
         pulse). Far-field geometry on tier 1 would have flashed the whole
         outer arc at full brightness as a base-departing pulse crossed its
         rAlong: the exact bug that audit fixed. The mat is route 3, which
         reaches no pulse branch at all.
       · Every other generator's RNG stream — this block draws from its OWN
         `frnd`. It is appended after all of them, and drawing from `rnd` would
         re-seed the particle field downstream and move geometry this pass has
         no business moving.

     Density, not brightness, does the work: at 12-18 units the scene fog is
     already taking 60-85%, and a far strand cranked bright enough to punch
     through would read as inverse aerial perspective. The blend is additive,
     so a thin patchy MAT resolves where a bright line would only look wrong.
     It thins outward by falling density, the `patchOf` philosophy the rest of
     the file uses, rather than by per-strand taper. ---- */
  {
    const frnd = makeRng(240813);
    const fg = () => gaussOf(frnd);

    const AZ0 = -1.78, AZ1 = -0.82;      // the arc the band unprojects onto
    const R_IN = 7.4, R_OUT = 17.2;      // inner edge sits on the hub ring

    // Which route owns a piece of far field: nearest hub in azimuth, so the
    // outer web kindles with the hub it grows out of and not as one sheet.
    const hubAz = HUB_IDS.map(id => Math.atan2(HUBS[id].pos.z, HUBS[id].pos.x));
    const ownerOf = (x, z) => {
      const a = Math.atan2(z, x);
      let best = 0, bd = Infinity;
      for (let i = 0; i < hubAz.length; i++) {
        let d = Math.abs(a - hubAz[i]);
        if (d > Math.PI) d = TAU - d;
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    };

    // The far field lights AFTER its hub, travelling outward — spread across
    // the tail of the route's own front rather than saturating in one step,
    // which is what keeps it a continuing growth and not a sheet switching on.
    //
    // THE CEILING IS EACH ROUTE'S OWN EXISTING REACH, snapshotted here before
    // a single far segment is pushed, and never exceeded. This is not
    // decoration: `pushSeg` raises `routeReach[lr]` for any vertex that runs
    // past it, `uLitMax` is built from those three numbers, and uLitMax is the
    // along-distance each front must cover to saturate — i.e. the SCHEDULE.
    // A first cut mapped into a flat 0.82..0.995 instead and moved Hivemind's
    // reach 1.141805 -> 1.325, which would have re-timed the middle of the
    // Hivemind -> Discord -> ADOS arrival (6afd508) and slowed the one channel
    // six separate requests have already asked to be slower. Held this way the
    // three uLitMax values are bit-identical to HEAD's, verified, not assumed.
    const reachSnap = routeReach.slice();
    const farAlong = (x, z, r) => {
      const u = (Math.hypot(x, z) - R_IN) / (R_OUT - R_IN);
      return reachSnap[r] * (0.84 + 0.16 * (u < 0 ? 0 : u > 1 ? 1 : u));
    };

    /* 1. RUNNERS — the primaries' own meander carried outward: low-frequency
          wander, no straight runs, thinning to nothing off-stage. */
    const N_RUN = 15;
    const runners = [];
    for (let k = 0; k < N_RUN; k++) {
      const az = AZ0 + (AZ1 - AZ0) * ((k + 0.5) / N_RUN) + fg() * 0.05;
      const r0 = R_IN + frnd() * 1.6;
      let x = Math.cos(az) * r0, z = Math.sin(az) * r0;
      let a = az + fg() * 0.22;                 // heading starts radially out
      const seed = frnd();
      const bright = 0.62 + frnd() * 0.30;
      const poly = [];
      // low-frequency wander PLUS a secondary ripple, the same two-scale
      // curvature the primaries get from sampleRoute: one alone still reads
      // as a ray once the fog has taken the strand's own detail away.
      const rip = 0.16 + frnd() * 0.14, fq = 2.2 + frnd() * 1.8, ph = frnd() * TAU;
      for (let s = 0; s < 14; s++) {
        poly.push(new V3(x, 0, z));
        a += fg() * 0.30 + Math.cos(s * fq * 0.5 + ph) * rip;
        const step = 0.66 + frnd() * 0.48;
        const nx = x + Math.cos(a) * step, nz = z + Math.sin(a) * step;
        if (Math.hypot(nx, nz) > R_OUT) break;
        x = nx; z = nz;
      }
      if (poly.length < 4) continue;
      let prev = null;
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i];
        p.y = gy(p.x, p.z, LIFT_LO + 0.02 * frnd());
        if (prev) {
          const t0 = (i - 1) / (poly.length - 1), t1 = i / (poly.length - 1);
          const own = ownerOf(p.x, p.z);
          // rAlong is compressed into 0.12..0.74 rather than run 0..1: the
          // tier-3 taper reaches 47% at the tip instead of 15%, which is the
          // difference between a strand that recedes and one the fog erases.
          pushSeg(prev, p, farAlong(prev.x, prev.z, own), farAlong(p.x, p.z, own),
            0.12 + 0.62 * t0, 0.12 + 0.62 * t1,
            own, 3, seed, bright * (1 - 0.25 * t0), bright * (1 - 0.25 * t1));
          counts.contSegs++;
        }
        prev = p;
      }
      runners.push(poly);
      if (frnd() < 0.45) {
        const P = poly[Math.floor(poly.length * (0.3 + frnd() * 0.5))];
        const own = ownerOf(P.x, P.z);
        pushGlint(P, farAlong(P.x, P.z, own), 0.22 + frnd() * 0.22, own);
      }
    }

    /* 2. ANASTOMOSIS — neighbouring runners reconnect, so the field reads as
          a web receding rather than a starburst radiating. Fungal, not
          dendritic (the anatomy note at the head of this file). The link
          WANDERS across rather than ruling a line: a straight chord between
          two runners is the "no straight runs, no right angles" violation in
          its purest form, and at this distance the eye reads a dozen of them
          as hatching before it reads them as a web. */
    for (let k = 0; k + 1 < runners.length; k++) {
      if (frnd() < 0.32) continue;              // not every neighbour pair
      const A = runners[k], B = runners[k + 1];
      const P0 = A[2 + Math.floor(frnd() * (A.length - 3))];
      const P1 = B[2 + Math.floor(frnd() * (B.length - 3))];
      if (!P0 || !P1) continue;
      const span = P0.distanceTo(P1);
      if (span > 4.2 || span < 0.5) continue;
      const perp = new V3(-(P1.z - P0.z), 0, P1.x - P0.x).normalize();
      const bow = (frnd() - 0.5) * 1.4;         // a real arc, not a nudge
      const seed = frnd();
      const rip = 0.10 + frnd() * 0.12;         // secondary curvature
      const fq = 4 + frnd() * 3;
      const SEG = 9;
      let prev = null;
      for (let i = 0; i <= SEG; i++) {
        const t = i / SEG;
        const p = P0.clone().lerp(P1, t).addScaledVector(perp,
          Math.sin(Math.PI * t) * bow + Math.sin(t * fq + seed * 20) * rip * Math.sin(Math.PI * t));
        p.y = gy(p.x, p.z, LIFT_LO + 0.015 * frnd());
        if (prev) {
          const own = ownerOf(p.x, p.z);
          pushSeg(prev, p, farAlong(prev.x, prev.z, own), farAlong(p.x, p.z, own), 0.30, 0.34,
            own, 3, seed, 0.42, 0.42);
          counts.contSegs++;
        }
        prev = p;
      }
    }

    /* 3. THE MAT — patchy hairline knitting the outer arc together. This is
          what actually resolves in the band: additive, so density reads where
          a single strand at 20% transmission does not.

          It grows OFF THE RUNNERS, the way the near-field hairline grows off
          the route corridors, and each sprig WANDERS from its own heading
          instead of being a chord between two points. The first cut scattered
          straight segments through the annulus on a mostly-tangential heading:
          they came out as a field of parallel straws — hatching, the exact
          circuit-board read the anatomy note at the head of this file forbids,
          and dead obvious at 2x on the shipped frame. Short, curved, anchored
          and patchy is what makes a mat instead. */
    const N_MAT = 300;
    for (let i = 0; i < N_MAT && runners.length; i++) {
      const R = runners[Math.floor(frnd() * runners.length)];
      const anchor = R[1 + Math.floor(frnd() * (R.length - 1))];
      // scatter into the corridor around the runner (hairline precedent)
      const oa = frnd() * TAU;
      const off = 0.28 + Math.pow(frnd(), 1.3) * 2.1;
      let x = anchor.x + Math.cos(oa) * off, z = anchor.z + Math.sin(oa) * off;
      const rr = Math.hypot(x, z);
      if (rr < R_IN - 0.8 || rr > R_OUT + 0.4) continue;
      if (patchOf(x, z) < 0.66 && frnd() < 0.78) continue;   // dark pockets survive
      // thin again with distance, so the field recedes by density, not by dimming
      if (frnd() < (rr - R_IN) / (R_OUT - R_IN) * 0.55) continue;
      const owner = ownerOf(x, z);
      const seed = frnd();
      const SEG = 5;
      const step = 0.15 + frnd() * 0.19;
      let a = frnd() * TAU;
      let prev = null;
      for (let s = 0; s <= SEG; s++) {
        const p = new V3(x, gy(x, z, LIFT_LO + frnd() * 0.012), z);
        if (prev) {
          pushSeg(prev, p, farAlong(prev.x, prev.z, owner), farAlong(p.x, p.z, owner), 0.5, 0.5,
            3, 2, seed, 0.7 + frnd() * 0.3, 0.7 + frnd() * 0.3, owner);
          counts.hairSegs++;
        }
        prev = p;
        a += fg() * 0.62;                       // wanders as it goes
        x += Math.cos(a) * step; z += Math.sin(a) * step;
      }
      if (frnd() < 0.10) pushGlint(prev, farAlong(prev.x, prev.z, owner), 0.18 + frnd() * 0.2, owner);
    }
  }   // close the far-field block
  }   // close the else (live-emission) block

  /** Nearest authored ADOS primary coordinate for attachment weights. The
   *  secondary branches reconnect to this curve; resolving their weight from
   *  geometry keeps both ends welded to the same responsive bend without
   *  repurposing rAlong (which owns the travelling pulse). */
  const adosRoute = routes[0];
  function adosRouteCoord(px, pz) {
    let bestD2 = Infinity, bestF = 1;
    for (let j = 1; j < adosRoute.poly.length; j++) {
      const a = adosRoute.poly[j - 1], b = adosRoute.poly[j];
      const dx = b.x - a.x, dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      const q = d2 > 1e-8
        ? Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / d2))
        : 0;
      const ex = px - (a.x + dx * q), ez = pz - (a.z + dz * q);
      const here = ex * ex + ez * ez;
      if (here < bestD2) {
        bestD2 = here;
        bestF = (adosRoute.arcs[j - 1] + Math.sqrt(d2) * q) / adosRoute.len;
      }
    }
    return { d2: bestD2, f: bestF };
  }

  /* ---- build the strand mesh ---- */
  const strandMat = makeStrandMat(U);
  let strandsGeo;
  if (baked) {
    strandsGeo = baked.strands;
  } else {
    strandsGeo = new THREE.BufferGeometry();
    strandsGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    strandsGeo.setAttribute('aA', new THREE.Float32BufferAttribute(sA, 4));
    strandsGeo.setAttribute('aB', new THREE.Float32BufferAttribute(sB, 4));
  }
  {
    const position = strandsGeo.attributes.position;
    const spec = strandsGeo.attributes.aA;
    const light = strandsGeo.attributes.aB;
    const shift = new Float32Array(position.count);
    for (let i = 0; i < position.count; i++) {
      if (light.getW(i) >= 0.5) continue;
      const route = spec.getZ(i), tier = spec.getW(i);
      if (route < 0.5 && tier >= -0.5 && tier < 0.5) {
        // The primary's own authored route coordinate is exact and cheapest.
        shift[i] = smooth01((spec.getY(i) - 0.12) / 0.70);
      } else if (route < 0.5 && tier >= 0.5 && tier < 1.5) {
        // A secondary may leave and reconnect: project each vertex back to
        // the primary so both attachment points share its exact bend weight.
        const q = adosRouteCoord(position.getX(i), position.getZ(i));
        shift[i] = smooth01((q.f - 0.12) / 0.70);
      } else {
        // Hub/knot, continuations, near hair and far field are one translated
        // ADOS lighting field, with no second stationary bloom underneath.
        shift[i] = 1;
      }
    }
    strandsGeo.setAttribute('aAdosShiftW', new THREE.BufferAttribute(shift, 1));
  }
  {
    const lines = new THREE.LineSegments(strandsGeo, strandMat);
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
  if (baked) {
    partData = baked.particles;            // round-trips via payload, NEVER recomputed
  } else {
    partData = [];
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
      gR.push(ri);                         // a particle drifts on its own route
    }
    counts.particles = N_PART;
  }

  let pointGeo;
  if (baked) {
    pointGeo = baked.points;
  } else {
    pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(gp, 3));
    pointGeo.setAttribute('aP', new THREE.Float32BufferAttribute(gP, 4));
    pointGeo.setAttribute('aR', new THREE.Float32BufferAttribute(gR, 1));
    const lifeArr = new Float32Array(gp.length / 3).fill(1);
    pointGeo.setAttribute('aLife', new THREE.BufferAttribute(lifeArr, 1));
  }
  const nGlints = counts.glints;
  /* Static glints share one Points draw with particles, but their baked data
     predates the responsive dodge and contains no route-tier attribute. Build
     a tiny runtime-only weight from the authored geometry: junction glints
     within the primary corridor inherit its exact planted-root feather;
     ADOS-owned hair/far-field glints translate with those full-shift layers.
     The 0.22 world-unit corridor is below hairline fill's authored 0.25-unit
     minimum offset, so the two classes are separated by construction. */
  {
    const position = pointGeo.attributes.position;
    const litRoute = pointGeo.attributes.aR;
    const shift = new Float32Array(position.count);
    const CORRIDOR2 = 0.22 * 0.22;
    for (let i = 0; i < nGlints; i++) {
      if (litRoute.getX(i) >= 0.5) continue;
      const px = position.getX(i), pz = position.getZ(i);
      const q = adosRouteCoord(px, pz);
      shift[i] = q.d2 <= CORRIDOR2 ? smooth01((q.f - 0.12) / 0.70) : 1;
    }
    pointGeo.setAttribute('aAdosShiftW', new THREE.BufferAttribute(shift, 1));
  }
  const pointMat = makePointMat(U, glowTex);
  const points = new THREE.Points(pointGeo, pointMat);
  points.frustumCulled = false;
  group.add(points);

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

  /* ---- publish each front's reach ----
     A route's front must cover its farthest vertex PLUS the ramp's own width
     before that vertex is fully lit (litMask needs `along <= head - uSoft`),
     so the lead is the ramp, not a magic 1.06. With this in the uniform, every
     route's uLit is a clean 0..1 whatever its length, and the hub kindle in
     index.js can be keyed off `uLit * uLitMax` — the head's own position —
     which is what makes the kindle land exactly as its trail's light arrives. */
  if (baked) {
    U.uLitMax.value.set(baked.uLitMax[0], baked.uLitMax[1], baked.uLitMax[2]);
  } else {
    U.uLitMax.value.set(
      routeReach[0] + FRONT_SOFT + 0.01,
      routeReach[1] + FRONT_SOFT + 0.01,
      routeReach[2] + FRONT_SOFT + 0.01,
    );
  }

  return {
    counts: { ...counts, totalSegs, points: counts.glints + counts.particles },
    strandMat, pointMat,
    routes, hubMeta, cores,
    // Which of this network's nodes is the focal one — the hub the chapter
    // pins its lens, its copy anchor and its shift uniform to, and the node
    // it publishes as its `focus` capability. Carried on the network rather
    // than looked up by name at each of those sites, because every one of
    // them is asking this same question of this same object; and carried at
    // the top level rather than as a `hubMeta` field because `hubMeta`
    // round-trips through the baked payload, which would drop it.
    focalId: CONNECT_FOCAL_ID,
    updateParticles,
    // Bake surfaces (read by connect/index.js's recording site; no-ops on the
    // shipped path). Keys match baked.js geometry() keys.
    geometries: { strands: strandsGeo, points: pointGeo },
    bakePayload: {
      counts: { ...counts, totalSegs, points: counts.glints + counts.particles },
      uLitMax: [U.uLitMax.value.x, U.uLitMax.value.y, U.uLitMax.value.z],
      hubMeta: hubMeta.map((hm) => ({ id: hm.id, pos: [hm.pos.x, hm.pos.y, hm.pos.z], along: hm.along, route: hm.route })),
      routes: routes.map((r) => ({ id: r.id, poly: r.poly.map((p) => [p.x, p.y, p.z]), arcs: r.arcs.slice(), len: r.len })),
      particles: partData.map((p) => ({ route: p.route, phase: p.phase, speed: p.speed, seed: p.seed })),
    },
  };
}
