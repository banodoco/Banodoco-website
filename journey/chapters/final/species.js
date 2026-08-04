// journey-v6 — FINAL epilogue: THE SPECIES.
// (journey-v6-plan/18-one-species.md — "every mushroom is the hero's mushroom")
//
// THE INVARIANT THIS FILE EXISTS TO ENFORCE
// -----------------------------------------
// Every fruiting body in the Final frame — the hero at the origin, the nine
// ring members, the forty-three field bodies, the twenty far hints — has the
// SAME SILHOUETTE. One cap profile, one rim line, one margin droop, one stem
// taper. Two things and only two things vary between individuals:
//
//   size    one uniform scale factor (plus a seeded natural variation of
//           +/-NAT_VAR, applied to that SAME uniform factor — so a small body
//           is a small hero, never a differently-proportioned mushroom);
//   detail  the DETAIL table below — stroke counts, gill counts, point
//           budgets, extras. Detail changes what traces the silhouette. It
//           never changes the silhouette.
//
// Before this module, final/ring.js carried its own PARAMETERIZATION of the
// hero's form language: per-member `rimScale` (0.57..1.18 of the hero's rim
// radius), `domeH` (1.07x..2.10x the hero's dome), `stemW` (0.75..1.30 on the
// stem taper) and `flareK`, plus a stem taper renormalised against a SHORTER
// stem top (capY + 0.18 = 3.33 instead of the hero's STEM_TOP = 3.9). The
// three compounded exactly the way Hannah reported them: caps came out flatter
// and parasol-like, stems skinnier. A wide-cap / skinny-stem draw landed at a
// stem-to-cap ratio of ~0.083 against the hero's 0.111 — 25% too thin — while
// the dome could be twice the hero's height on a rim two-thirds its width.
// Those knobs are GONE. There is no cap-dome or stem math anywhere in this
// chapter except the anatomy.js form functions imported below, which are the
// byte-faithful mirror of mushroom-scene.js §4 and §7 — the hero's own math.
//
// WHAT IS STILL INDIVIDUAL (and why none of it is a silhouette)
// ------------------------------------------------------------
//   azFacing   a rigid rotation about Y. The hero's asymmetries — the cap's
//              lean toward LEAN_DIR, the one crisp fold accent at az 5.3, the
//              rim harmonics — are baked into the form language, so rotating
//              a body points its own droop and fold somewhere else in the
//              world. Every individual reads distinct in frame; every
//              individual is the same organism. This is the whole trick.
//   scale      one uniform factor, jittered +/-NAT_VAR.
//   seed       which lattice strokes are drawn, where the jitter noise lands,
//              which gills carry a doubled vein, where the beads sit.
//   shade      heat sector, occlusion, crowding/interior damping, maturity
//              tone — all TONE, supplied by the caller (they depend on the
//              rest camera and on where the body stands, which is placement's
//              business, not the species').
//
// The whole-body LEAN (a few degrees of physical tilt) stays in ring.js: it
// is a POSE, applied to the finished body as a rigid transform, the same way
// the world position is. It cannot alter proportions.
//
// CONTRACT
// --------
// buildMushroom({ tier, seed, scale, azFacing, ... }) emits into the caller's
// `emit.seg` / `emit.pt` in the BODY frame: origin at the body's soil point,
// +y up, already scaled and already rotated by azFacing. The caller owns
// placement (lean, world translate), batching, per-member luminance and the
// aReveal/uPull reveal choreography — this module knows nothing about any of
// them, and never touches a THREE object.

import {
  CAP_Y, CAP_R, CAP_H,
  capTopPt, capUnderPt, stemRadius, stemAxis,
  makeRng, gaussOf,
} from '../../anatomy.js';

/* ------------------------------------------------------------------ */
/* Species constants — the scale reference                             */
/* ------------------------------------------------------------------ */
/** Apex height of the hero, in hero units (3.15 + 1.22). A body of authored
 *  height h is built at scale h / HERO_H, so its apex lands at h. */
export const HERO_H = CAP_Y + CAP_H;                 // 4.37

/** THE cap-width law. A body of height h has rim radius h * CAP_R_OVER_H.
 *  Nothing in this chapter may invent another one. (world.js used to carry
 *  `capR: h * (0.40 + 0.10 * maturity)` — 0.40..0.50 against this 0.5378, a
 *  cap up to 26% too narrow for its height, which is half of "skinnier".) */
export const CAP_R_OVER_H = CAP_R / HERO_H;          // 0.53776...

/** Stem radius at the soil line, hero units — the ground-merge stubs in
 *  ring.js seat against this rather than re-deriving a stem width. */
export const STEM_BASE_R = stemRadius(0.10);         // ~0.556

/** Per-individual natural variation on the UNIFORM scale factor. Cap width
 *  and height move together by up to this much, so proportions are constant.
 *  (Doc 18 allows ~+/-12%; 9% keeps the authored member heights — which doc
 *  17 tuned against the rest camera's elevation, the "floating rim ellipse"
 *  fix — inside the band they were tuned in.) */
export const NAT_VAR = 0.09;

/** The hero's per-system material opacities. The caller divides these by its
 *  own batch opacity and hands the result back as `mul`, so an equivalent
 *  stroke on a member lands at the same final luminance as on the hero. */
export const HERO_MUL = {
  strand: { cap: 0.28, ovl: 0.30, gill: 0.33, rim: 0.55, stem: 0.32, fib: 0.32, root: 0.42 },
  point:  { bead: 0.90, core: 0.85, rimPt: 1.00, stemPt: 0.70 },
};

/* ------------------------------------------------------------------ */
/* THE DETAIL TABLE                                                     */
/* ------------------------------------------------------------------ */
// One row per tier. TUNING DETAIL IS EDITING THIS TABLE — there is nowhere
// else in the chapter where a count lives. Every row traces the same
// silhouette; the rows differ only in how many strokes trace it and which
// extras survive. Zero counts are skipped by the builder's guards, so the one
// builder serves the near ring member and the farthest hint alike.
//
// Doc 18 names four tiers (T1 ring / T2 mid / T3 far / T4 hint); the shipped
// ladder is finer-grained and the row indices below are the ladder's own —
// `name` carries the meaning. Doc-18 T1 is `ring-near`, T4 is `hint`.
//
// Hero reference build (mushroom-scene.js): cap 26x110 lattice + 190-node
// overlay / 230x12 gills / 340-seg rim x ~5 passes + 430 ticks / 46x34 stem
// lattice + 48x40 fibres — ~16k line segments for the one organism.
export const DETAIL = [
  { // 0 — ring, near (rest-cam dist < 8): the bodies Hannah looks straight at
    name: 'ring-near',
    capRings: 15, capSegs: 68, capNodes: 44, capBeadP: 0.10, capSpkPts: 80,
    gillN: 100, gillSub: 8, gillCorePts: 24,
    rimStack: 4, rimSeg: 126, frontArc: true,
    ticks: 165, tickBeadP: 0.30, rimPts: 26,
    stemRings: 19, stemSegs: 15, stemPtP: 0.10,
    fibN: 24, fibSeg: 14,
    roots: 2, rootSteps: 3,
    glints: 12,
    baseFlareWarmth: true, cavityCore: true, pool2: true, shed: 3 },
  { // 1 — ring, mid (dist < 14)
    name: 'ring-mid',
    capRings: 12, capSegs: 58, capNodes: 30, capBeadP: 0.08, capSpkPts: 48,
    gillN: 78, gillSub: 7, gillCorePts: 16,
    rimStack: 4, rimSeg: 96, frontArc: true,
    ticks: 100, tickBeadP: 0.25, rimPts: 16,
    stemRings: 14, stemSegs: 12, stemPtP: 0.08,
    fibN: 13, fibSeg: 11,
    roots: 2, rootSteps: 3,
    glints: 8,
    baseFlareWarmth: false, cavityCore: true, pool2: true, shed: 3 },
  { // 2 — ring, far (the visible frame-left arc lives here)
    name: 'ring-far',
    capRings: 9, capSegs: 44, capNodes: 18, capBeadP: 0.06, capSpkPts: 24,
    gillN: 48, gillSub: 5, gillCorePts: 10,
    rimStack: 2, rimSeg: 72, frontArc: false,
    ticks: 50, tickBeadP: 0.20, rimPts: 10,
    stemRings: 11, stemSegs: 10, stemPtP: 0.06,
    fibN: 9, fibSeg: 9,
    roots: 1, rootSteps: 2,
    glints: 6,
    baseFlareWarmth: false, cavityCore: true, pool2: true, shed: 2 },
  { // 3 — field, near (dist ~15-24): a legible small body
    name: 'field-near',
    capRings: 5, capSegs: 20, capNodes: 0, capBeadP: 0.04, capSpkPts: 8,
    gillN: 12, gillSub: 4, gillCorePts: 4,
    rimStack: 2, rimSeg: 40, frontArc: false,
    ticks: 14, tickBeadP: 0.15, rimPts: 5,
    stemRings: 6, stemSegs: 7, stemPtP: 0.05,
    fibN: 7, fibSeg: 6,
    roots: 0, rootSteps: 0,
    glints: 2,
    baseFlareWarmth: false, cavityCore: true, pool2: true, shed: 0 },
  { // 4 — field, far (dist ~24-36): silhouette + rim light + a few fibres
    name: 'field-far',
    capRings: 3, capSegs: 14, capNodes: 0, capBeadP: 0, capSpkPts: 0,
    gillN: 0, gillSub: 0, gillCorePts: 0,
    rimStack: 2, rimSeg: 24, frontArc: false,
    ticks: 0, tickBeadP: 0, rimPts: 1,   // 2 -> 1: see fibSeg note below
    stemRings: 3, stemSegs: 5, stemPtP: 0,
    // fibSeg 4 -> 3: at 24-36 units, lum-damped to 0.52, a fibre's third
    // subdivision is below a pixel. Buys back the ~50 segments the restored
    // form language costs on the near bodies (wider caps = a longer rim ring
    // at the same rimSeg count), so the whole build lands under doc 17.
    fibN: 4, fibSeg: 3,
    roots: 0, rootSteps: 0,
    glints: 0,
    baseFlareWarmth: false, cavityCore: false, pool2: false, shed: 0 },
  { // 5 — hint (dist 34-46): the rim signature at its minimum legible
    // density. Doc 17 built these as a plain CIRCLE of radius h*0.45 — the
    // last independent cap math in the chapter, and a wrong one twice over
    // (a circle has none of the hero's rim waviness, and 0.45 is 16% narrow
    // against CAP_R_OVER_H). It is now a real arc of the real rim.
    name: 'hint',
    arcOnly: true, arcSeg: 8, arcSpan: 1.1,
    capRings: 0, capSegs: 0, capNodes: 0, capBeadP: 0, capSpkPts: 0,
    gillN: 0, gillSub: 0, gillCorePts: 0,
    rimStack: 0, rimSeg: 0, frontArc: false,
    ticks: 0, tickBeadP: 0, rimPts: 0,
    stemRings: 0, stemSegs: 0, stemPtP: 0,
    fibN: 0, fibSeg: 0,
    roots: 0, rootSteps: 0,
    glints: 0,
    baseFlareWarmth: false, cavityCore: false, pool2: false, shed: 0 },
];

/* ------------------------------------------------------------------ */
/* THE FORM — the one silhouette, in hero units                        */
/* ------------------------------------------------------------------ */
// These four are the entire shape of the species, and every one of them is
// imported from the anatomy mirror, unmodified and unparameterised. FORM is
// exported so the numeric silhouette check (doc 18 §4.1) can assert against
// capUnderPt-derived references that the BUILDER'S OWN profile — not a
// second copy of it — is the hero's.
export const FORM = {
  /** Cap upper surface, u in [0,1] apex -> rim. */
  top(u, a) { const v = capTopPt(u, a); return [v.x, v.y, v.z]; },
  /** Gill-skirt underside. */
  under(u, a) { const v = capUnderPt(u, a); return [v.x, v.y, v.z]; },
  /** Stem radius / axis at local height y. */
  stemR: stemRadius,
  stemAxis,
};

// How high the stem SYSTEMS are drawn. The hero draws its lattice and fibres
// over the full STEM_TOP (3.9) and hides the buried upper span behind its §5
// opaque shells; members have no shells (they would cost draw calls), so the
// build stops just inside the throat and damps what remains with insideK
// below — the same "mirror the shells as build-time damping" trick the rest
// of this chapter uses. The RADIUS LAW is untouched and still normalised
// against the hero's real STEM_TOP: this is a drawn EXTENT, not a form.
const STEM_DRAW_TOP = CAP_Y + 0.25;                  // 3.40

const smoothstep = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// §5 shell mirror, elevation-free half: above the rim plane the stem is
// inside the cap's flesh from EVERY azimuth, so it falls to a whisper.
const insideK = (y) => 1 - 0.88 * smoothstep(CAP_Y - 0.15, CAP_Y + 0.45, y);
// §5 shell mirror, under-cap half: the band the cap's own skirt shadows when
// the lens sits above the rim. Absolute y, sized to the cap (doc 17 keyed it
// to a fraction of the member's stem top, which moved with the old,
// parameterised stem height).
const underBand = (y) => smoothstep(2.00, 3.10, y);

/* ------------------------------------------------------------------ */
/* The builder                                                          */
/* ------------------------------------------------------------------ */
/**
 * Build one individual of the species into the caller's batches.
 *
 * @param {object}  o
 * @param {number}  o.tier      index into DETAIL
 * @param {number}  o.seed      deterministic individuation stream
 * @param {number}  o.scale     uniform scale, hero units -> world units
 *                              (natural variation is the caller's, or use
 *                              scaleFor() below)
 * @param {number}  o.azFacing  rigid rotation about Y (radians)
 * @param {number} [o.mat]      maturity 0..1 — TONE only (rim heat, gill
 *                              density, halo size). Never form.
 * @param {number} [o.shed]     spore-shed strength 0..1
 * @param {object}  o.emit      { seg(ax,ay,az,bx,by,bz,ta,tb,tw,mul),
 *                                pt(x,y,z,tone,psize,tw,mul) } in body frame
 * @param {object}  o.mul       per-system color multipliers (see HERO_MUL)
 * @param {object}  o.shade     tone environment, all supplied by placement:
 *                              heatK(worldAz), occlS(worldAz), occlM(worldAz),
 *                              underVis, crowdK, innerK, camAz (body-frame
 *                              plan azimuth toward the rest camera)
 */
export function buildMushroom(o) {
  const C = DETAIL[o.tier];
  const r = makeRng(o.seed);
  const g = () => gaussOf(r);
  const s = o.scale;
  const mat = o.mat ?? 1;
  const sh = o.shade;
  const emit = o.emit;
  const MUL = o.mul;

  // body frame = form frame rotated about Y by azFacing, then scaled. A form
  // azimuth `a` becomes the body/world azimuth `a + azFacing`, which is what
  // the shade functions are asked about.
  const ca = Math.cos(o.azFacing), sa = Math.sin(o.azFacing);
  const B = (p) => [s * (p[0] * ca - p[2] * sa), s * p[1], s * (p[0] * sa + p[2] * ca)];
  const wa = (a) => a + o.azFacing;
  // the rest camera's azimuth expressed in FORM coordinates, for the
  // depth-weighted front arc and the hint arc
  const camF = (sh.camAz ?? 0) - o.azFacing;

  const seg = (p, q, ta, tb, tw, mul) =>
    emit.seg(p[0], p[1], p[2], q[0], q[1], q[2], ta, tb, tw, mul);
  const pt = (p, tone, psize, tw, mul) => emit.pt(p[0], p[1], p[2], tone, psize, tw, mul);

  /* ---- the hint rung: a front-facing arc of the REAL rim, an ember and a
     soil pool. Everything the fog will let through, and not one stroke that
     is not this species'. ---- */
  if (C.arcOnly) {
    const S = C.arcSeg, span = C.arcSpan;
    let pv = null;
    for (let k = 0; k <= S; k++) {
      const a = camF - span + (k / S) * span * 2;
      const q = FORM.top(1.0, a);
      const p = B([q[0], q[1] + g() * 0.04, q[2]]);
      if (pv) {
        const t0 = 0.42 * (0.35 + 0.65 * Math.cos((a - camF) / span * 1.4));
        seg(pv, p, t0, t0, k * 0.3, MUL.rim);
      }
      pv = p;
    }
    pt([0, s * (CAP_Y + CAP_H * 0.55), 0], 0.34, s * 1.77, 0.0, 1);
    pt([0, s * 0.07, 0], 0.22, s * 2.56, 2.1, 1);
    return;
  }

  // bigger bodies carry proportionally more strokes (density is per unit of
  // body surface; the tier already handles distance)
  const sizeK = Math.min(1.3, Math.max(0.8, 0.55 + 1.05 * s));

  /* ================== §7 STEM — lattice mesh + fibres ================== */
  {
    const R = C.stemRings, S = C.stemSegs;
    if (R > 0 && S > 0) {
      const grid = [];
      for (let i = 0; i <= R; i++) {
        const y = (i / R) * STEM_DRAW_TOP;
        const [ax, az] = FORM.stemAxis(y);
        const rr = FORM.stemR(y);
        const row = [];
        for (let j = 0; j < S; j++) {
          const a = (j / S) * Math.PI * 2 + (i % 2) * (Math.PI / S) + g() * 0.05;
          const jr = rr * (1 + g() * 0.09);
          row.push([ax + Math.cos(a) * jr, y + g() * 0.015, az + Math.sin(a) * jr, a]);
        }
        grid.push(row);
      }
      for (let i = 0; i <= R; i++) {
        const yT = i / R, y = yT * STEM_DRAW_TOP;
        for (let j = 0; j < S; j++) {
          const pl = grid[i][j], a = pl[3];
          // hero shading: azimuthal sheen + warm throat, warm base
          const base = 0.22 + 0.15 * Math.abs(Math.sin((j / S) * Math.PI * 2 - 0.3)) + r() * 0.07;
          const uvK = 1 - (1 - sh.underVis) * underBand(y);
          const b = (base + (yT > 0.85 ? 0.15 : 0)
                          + (y < 0.40 && C.baseFlareWarmth ? 0.08 : 0))
                  * sh.heatK(wa(a)) * sh.occlS(wa(a)) * uvK * insideK(y) * sh.crowdK;
          const p = B(pl);
          if (r() < 0.5) {
            const q = grid[i][(j + 1) % S];
            seg(p, B(q), b * 0.75, b * 0.75, a + 3.3, MUL.stem);
          }
          if (i < R && r() < 0.9) seg(p, B(grid[i + 1][j]), b, b, a + 3.6, MUL.stem);
          if (r() < C.stemPtP)
            pt(p, (0.5 + r() * 0.3) * sh.innerK, s * (0.015 + r() * 0.04), i + j, MUL.stemPt);
        }
      }
    }
    // vertical fibres with the hero's wiggle; every fifth doubled heavier
    const NF = C.fibN ? Math.max(4, Math.round(C.fibN * sizeK)) : 0;
    const FS = C.fibSeg;
    for (let f = 0; f < NF; f++) {
      const a0 = (f / NF) * Math.PI * 2 + g() * 0.1;
      const bF = 0.26 + r() * 0.18;
      let pv = null, pvD = null, aPrev = a0;
      for (let i = 0; i <= FS; i++) {
        const y = (i / FS) * STEM_DRAW_TOP;
        const [ax, az] = FORM.stemAxis(y);
        const a = a0 + 0.11 * Math.sin(y * 1.7 + f);        // the hero's wiggle
        const rr = FORM.stemR(y) * (1 + g() * 0.04) * 1.01;
        const q = [ax + Math.cos(a) * rr, y, az + Math.sin(a) * rr];
        const p = B(q);
        const pD = B([q[0] + 0.009, q[1], q[2]]);
        if (pv) {
          const uvF = (1 - (1 - sh.underVis) * underBand(y)) * insideK(y);
          const b0 = (bF + g() * 0.04) * sh.heatK(wa(aPrev)) * sh.occlS(wa(aPrev)) * uvF * sh.crowdK;
          const b1 = (bF + g() * 0.04) * sh.heatK(wa(a)) * sh.occlS(wa(a)) * uvF * sh.crowdK;
          seg(pv, p, b0, b1, f * 1.3, MUL.fib);
          if (f % 5 === 0) seg(pvD, pD, b0 * 0.8, b1 * 0.8, f * 1.3 + 0.5, MUL.fib);
          if (r() < 0.09)
            pt(p, (bF + 0.18) * sh.innerK, s * (0.012 + r() * 0.023), f + i, MUL.stemPt);
        }
        pv = p; pvD = pD; aPrev = a;
      }
    }
  }

  /* ============ §4 CAP — jittered lattice + overlay net + motes ============ */
  if (C.capRings > 0) {
    const R = C.capRings, S = Math.max(12, Math.round(C.capSegs * sizeK));
    const grid = [];
    for (let i = 0; i <= R; i++) {
      const u = i / R;
      const row = [];
      for (let j = 0; j < S; j++) {
        const a = (j / S) * Math.PI * 2;
        const ju = Math.max(0, u + (i > 0 ? g() * 0.02 : 0));
        const q = FORM.top(ju, a + g() * 0.028);
        row.push([q[0], q[1] + g() * 0.04, q[2], a]);
      }
      grid.push(row);
    }
    for (let i = 0; i <= R; i++) {
      const u = i / R;
      for (let j = 0; j < S; j++) {
        const pl = grid[i][j], a = pl[3];
        const vis = 1 + (sh.occlM(wa(a)) - 1) * Math.pow(u, 1.5);
        const bright = (0.14 + 0.26 * u + r() * 0.08) * sh.heatK(wa(a)) * vis;
        const p = B(pl);
        if (r() < C.capBeadP)
          pt([p[0], p[1] + 0.01 * s, p[2]], bright * 1.7 + r() * 0.15,
            s * (0.016 + r() * r() * 0.05), j * 0.7, MUL.bead);
        if (i > 2 || r() < 0.4)                       // azimuthal stroke
          seg(p, B(grid[i][(j + 1) % S]), bright, bright, a + 2, MUL.cap);
        if (i < R && r() < 0.85)                      // radial stroke
          seg(p, B(grid[i + 1][j]), bright, bright + 0.03, a + 2.5, MUL.cap);
        if (i < R && r() < 0.25)                      // diagonal stroke
          seg(p, B(grid[i + 1][(j + 1) % S]), bright * 0.8, bright * 0.8, a + 3, MUL.cap);
      }
    }
    // sparse bright overlay network + node dots riding the dome
    const nN = C.capNodes ? Math.max(8, Math.round(C.capNodes * sizeK)) : 0;
    const nodes = [];
    for (let k = 0; k < nN; k++) {
      const q = FORM.top(Math.sqrt(r()) * 0.99, r() * Math.PI * 2);
      nodes.push([q[0], q[1] + 0.012, q[2], Math.atan2(q[2], q[0])]);
    }
    for (const nd of nodes) {
      const near = nodes.filter(x => x !== nd)
        .map(x => ({ x, d: (x[0] - nd[0]) ** 2 + (x[1] - nd[1]) ** 2 + (x[2] - nd[2]) ** 2 }))
        .sort((p, q) => p.d - q.d).slice(0, 2);
      const pw = B(nd);
      for (const { x } of near) {
        const b = (0.35 + r() * 0.15) * sh.heatK(wa(nd[3]));
        seg(pw, B(x), b, b, nd[3] + 1.2, MUL.ovl);
      }
      pt(pw, 0.5 + r() * 0.3, s * (0.03 + r() * 0.04), nd[3], MUL.bead);
    }
    for (let k = 0; k < C.capSpkPts; k++) {           // surface speckle motes
      const q = B(FORM.top(Math.sqrt(r()), r() * Math.PI * 2));
      pt([q[0], q[1] + 0.01 * s, q[2]], 0.3 + r() * 0.3,
        s * (0.015 + r() * 0.03), k * 0.4, MUL.bead);
    }
  }

  /* ==== RIM — stacked rings, depth-weighted front arc, lip, fringe ==== */
  if (C.rimSeg > 0) {
    const S = Math.max(20, Math.round(C.rimSeg * sizeK));
    const mB = 0.88 + 0.12 * mat;                     // mature rims run hotter
    const rings = C.rimStack >= 4
      ? [{ du: 1.005, dy: 0, b: 0.8 },
         { du: 1.0, dy: 0.035, b: 0.52 },
         { du: 1.012, dy: -0.012, b: 0.57 },
         { lip: true, b: 0.6 }]
      : [{ du: 1.005, dy: 0, b: 0.8 }, { lip: true, b: 0.6 }];
    for (const ps of rings) {
      let pa = null;
      for (let k = 0; k <= S; k++) {
        const a = (k / S) * Math.PI * 2;
        const q = ps.lip ? FORM.under(1.0, a) : FORM.top(ps.du, a);
        const p = B([q[0], q[1] + (ps.dy || 0) + g() * 0.008, q[2]]);
        if (pa) {
          const b = (ps.b + g() * 0.05) * mB * sh.heatK(wa(a)) * (ps.lip ? sh.occlS(wa(a)) : 1);
          seg(pa, p, b, b, a + (ps.dy || 0) * 40, MUL.rim);
        }
        pa = p;
      }
    }
    // doubled front arc: strokes thicken where the rim faces the rest camera
    if (C.frontArc) for (let pass = 0; pass < 2; pass++) {
      let pf = null;
      for (let k = 0; k <= S; k++) {
        const a = (k / S) * Math.PI * 2;
        const wgt = Math.max(0, Math.cos(a - camF));
        const b = 0.55 * wgt * wgt * mB;
        const q = FORM.top(1.004, a);
        const p = B([q[0], q[1] + (pass ? 0.012 : -0.008) + g() * 0.006, q[2]]);
        if (pf && b > 0.04) seg(pf, p, b, b, a + 6 + pass, MUL.rim);
        pf = p;
      }
    }
    // fringe ticks across the flesh band between lip and rim
    const nT = Math.round(C.ticks * sizeK);
    for (let k = 0; k < nT; k++) {
      const a = r() * Math.PI * 2;
      const b = (0.3 + r() * 0.2) * sh.heatK(wa(a)) * sh.occlS(wa(a));
      const tt = B(FORM.top(1.0, a)), uu = B(FORM.under(1.0, a));
      seg(tt, uu, b, b * 0.9, k * 0.9, MUL.rim);
      if (r() < C.tickBeadP) pt(uu, 0.55 + r() * 0.25, s * (0.016 + r() * 0.028), k, MUL.bead);
    }
    for (let k = 0; k < C.rimPts; k++) {
      const a = r() * Math.PI * 2;
      const q = FORM.top(1.0, a);
      pt(B([q[0], q[1] + g() * 0.02, q[2]]), 0.72 + r() * 0.18,
        s * (0.03 + r() * 0.05), k * 1.3, MUL.rimPt);
    }
  }

  /* ==== §6 GILLS — radial filaments, feathered attach, cavity shading ==== */
  {
    // gill DENSITY is a detail axis and may vary per individual — a seeded
    // spread times growth stage, since a young cap has not opened far enough
    // to show its full fan. This is a COUNT: the surface those filaments lie
    // on is the invariant one, and a 12-gill body and a 100-gill body have
    // the same silhouette. (The old build gated the same way; keeping the
    // gate keeps the segment budget where doc 17 measured it.)
    const dens = (0.7 + r() * 0.65) * (0.35 + 0.65 * mat);
    const N = C.gillN ? Math.max(6, Math.round(C.gillN * dens * sizeK)) : 0;
    const SUB = C.gillSub;
    const ph = r() * Math.PI * 2;
    for (let gi = 0; gi < N; gi++) {
      const a0 = ph + (gi / N) * Math.PI * 2 + g() * 0.004;
      const wig = g() * 0.02;
      const boost = r() < 0.08 ? 0.18 : 0;
      const u0 = 0.06 + r() * 0.09;                   // feathered inner attach
      const hk = sh.heatK(wa(a0)) * sh.occlS(wa(a0)) * sh.underVis * sh.crowdK;
      let pv = null, pvD = null, tp = 0;
      for (let k = 0; k <= SUB; k++) {
        const t = k / SUB, u = u0 + t * (1 - u0);
        const q = FORM.under(u, a0 + wig * Math.sin(t * Math.PI));
        const qy = q[1] + g() * 0.008;
        const p = B([q[0], qy, q[2]]);
        const pD = B([q[0], qy - 0.007, q[2]]);
        if (pv) {
          // cavity shading: warm core, shadowed mid interior, bright fringe
          const b0 = (0.38 - 0.55 * tp + 0.85 * tp * tp + boost) * hk;
          const b1 = (0.38 - 0.55 * t + 0.85 * t * t + boost) * hk;
          seg(pv, p, b0, b1, a0 + gi * 0.3, MUL.gill);
          if (boost > 0) seg(pvD, pD, b0 * 0.85, b1 * 0.85, a0 + gi * 0.3 + 0.4, MUL.gill);
          if (r() < 0.05) pt(p, b1 * 1.2, s * (0.011 + r() * 0.018), gi, MUL.bead);
        }
        pv = p; pvD = pD; tp = t;
      }
    }
    for (let k = 0; k < C.gillCorePts; k++) {         // hot core at the throat
      const a = r() * Math.PI * 2;
      const q = FORM.under(0.06 + r() * 0.14, a);
      pt(B([q[0], q[1] + g() * 0.02, q[2]]),
        (0.48 + r() * 0.15) * sh.occlS(wa(a)) * sh.underVis * sh.innerK,
        s * (0.035 + r() * 0.04), k * 1.1, MUL.core);
    }
  }

  /* ---- moisture glints: hot beads on this body's seeded wet sector ---- */
  {
    const wetDir = r() * Math.PI * 2;
    for (let k = 0; k < C.glints; k++) {
      const p = B(FORM.top(0.8 + r() * 0.22, wetDir + g() * 0.6));
      pt([p[0], p[1] + 0.01, p[2]], 0.82 + r() * 0.12, s * (0.05 + r() * 0.05), 2.3 * k, 1);
    }
  }

  /* ---- interior light: halo, under-cap ember, ground pools. Sizes are in
     hero units x scale (doc 17's anti-"glass lamp" tuning preserved to the
     world unit — it was expressed against the old, narrower capR proxy). ---- */
  const heart = B([-0.10, CAP_Y + CAP_H * 0.35, 0]);
  const cavity = B([-0.05, CAP_Y + 0.10, 0]);
  pt(heart, 0.29 * sh.innerK, s * (2.71 + 1.55 * mat), 1.0, 1);
  pt(cavity, (0.50 + 0.10 * mat) * (0.25 + 0.75 * sh.underVis) * sh.innerK,
    s * (1.66 + 0.90 * mat), 0.0, 1);
  if (C.cavityCore)
    pt([cavity[0], cavity[1] - 0.02, cavity[2]], 0.68 * sh.underVis * sh.innerK,
      s * (0.70 + 0.175 * mat), 2.0, 1);
  pt([0, 0.04, 0], 0.42 * sh.innerK, s * (1.84 + 0.46 * mat), 3.0, 1);
  if (C.pool2)
    pt([s * 0.18 * ca, 0.03, s * 0.18 * sa], 0.26 * sh.innerK,
      s * (3.67 + 0.92 * mat), 3.7, 1);

  /* ---- spore shed: mature bodies only, a short rising ember trail leaning
     into the +x drift. Never the hero's. ---- */
  if (o.shed > 0 && C.shed > 0) {
    const nSh = C.shed;
    const e = FORM.under(1.0, camF + g() * 0.7);
    for (let k = 0; k < nSh; k++) {
      const t = (k + 1) / nSh;
      const p = B([e[0] + g() * 0.06, e[1] + t * (0.55 + 0.55 * o.shed), e[2] + g() * 0.06]);
      pt([p[0] + s * t * (0.4 + 0.4 * o.shed), p[1], p[2]], 0.55 - 0.12 * t,
        s * (0.10 - 0.05 * t) * (0.5 + o.shed), 4 + k, 1);
    }
  }
}

/** The uniform scale for an authored height, with the seeded natural
 *  variation folded into that SAME factor. Cap width and height move
 *  together — the only size law in the chapter. */
export function scaleFor(h, seed) {
  const v = makeRng(seed ^ 0x9e37)();
  return (h / HERO_H) * (1 + NAT_VAR * (2 * v - 1));
}
