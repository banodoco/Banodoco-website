// journey-v6 — FINAL epilogue: the fairy ring (W4-D production build,
// revised under D14, densified under D15).
//
// D14 (Hannah): the ring members are COPIES OF THE HERO — the same species,
// built from the hero's actual form recipe, then individualized so each
// reads as a distinct individual. The recipe below is a parameterization of
// mushroom-scene.js §4 (cap form language: rimRad / rimYoff / marginDroop /
// capLump / capTopPt / capUnderPt), §6 (gill cavity-shading curve, feathered
// inner attach, boosted veins), and §7 (stem taper, base ground-merge flare,
// curved axis converging on the cap throat, wiggling vertical fibres) — the
// same numbers that build the hero at the origin (byte-faithful mirror in
// core/anatomy.js), generalized per member.
//
// D15 (Hannah, live review): "the mushrooms there don't seem to be based on
// the main one — why do they have way worse texture?" The D14 build carried
// the hero's FORM but ~1/50th of its line DENSITY — and the hero's texture
// IS its density. Members are now built from the hero's actual TEXTURE
// SYSTEMS, not sketches of them:
//   - §4 cap: the full jittered lattice grid (azimuthal / radial / diagonal
//     strokes with the hero's gate probabilities), the sparse bright overlay
//     net between surface nodes, node points + surface speckle motes;
//   - §6 gills: evenly-fanned radial filaments with the feathered inner
//     attach, the cavity-shading curve (warm core, shadowed mid, bright
//     margin), the 8% doubled-vein boost, occasional gill beads + hot core;
//   - rim: the hero's three stacked rings, the doubled front arc whose
//     width follows depth (front = toward the rest camera), the bottom lip,
//     fringe ticks with margin beads, rim points;
//   - §7 stem: the staggered lattice mesh (warm throat / warm base) UNDER
//     long wiggling vertical fibres, every fifth doubled heavier;
//   - §8 base: a ground-merge root flare walking outward over real
//     groundY(), forking, beaded — clipped at the cutaway lip.
// Density rides a 3-tier ladder against the fixed rest camera (same
// precedent as the build-time LOD): T0 near ≈ 25-30% of the hero's ~16k-seg
// line build EACH, T1 mid ≈ 15%, T2 far ≈ 7%, further scaled by member size.
// Stroke TONES are the hero's own values, and meta.mul carries each
// system's hero material opacity into the shared batch (cap 0.28, gills
// 0.33, rim 0.55, stem 0.32, roots 0.42 against this batch's 1.15), so an
// equivalent stroke lands at the same final luminance as on the hero.
// The hero's §5 opaque occlusion shells are mirrored WITHOUT new draws as
// build-time far-side damping against the rest camera (occl below): gills,
// stem and lip strokes facing away from the lens are dimmed, so a member
// reads solid, not x-ray. Everything still merges into the SAME two draws.
//
// Per-member individuation (seeded from the member index — deterministic,
// no Math.random): scale + growth stage (young caps stay CLOSED: narrow rim,
// tall dome, curled margin, few gills), cap-diameter-to-dome-height ratio,
// lean direction/amount, rim-waviness harmonics + droop asymmetry + optional
// fold accent, gill count/density, stem thickness + curve, heat sector
// (which side of the body runs hot), moisture-glint placement, and per-member
// spore-shed presence/strength. All members merge into ONE LineSegments draw
// + ONE glow-Points draw; distance LOD is build-time against the fixed rest
// camera. No two silhouettes match; the hero stays the most complete
// individual but is otherwise unprivileged (D12).
//
// The bodies boot UNLIT (7% ember whisper) and kindle in sequence as the
// camera pulls back — Hannah's "undarken" — via the shared aReveal channel.
// The whisper state carries the full density too: a dense body barely lit
// reads as a body in the dark, where a sparse one lit read as a diagram.

import * as THREE from 'three';
import {
  TAU, MEMBERS, RING_C, arcOf, cutVal,
  makeRng, gaussOf, groundY, makeBatch, makeStrandMat, makePointsMat,
} from './final-world.js';
import { makeGlowTexture } from '../anatomy.js';

// The Final rest camera, for build-time LOD + occlusion only (mirrors the
// director's p=0.925 key exactly; declutter round corrected the stale
// -13.9/2.55 and added y for the new elevation occlusion below).
const REST_CAM = { x: -14.72, y: 2.73, z: 2.70 };

/* ------------------------------------------------------------------ */
/* The hero's form recipe, parameterized (D14)                          */
/* ------------------------------------------------------------------ */
// Hero constants (mushroom-scene.js §4): the scale reference for every
// member. A member's world scale is m.h / H_TOTAL, so its apex lands at
// its authored height.
const H_CAP_R = 2.35;      // hero rim radius
const H_CAP_H = 1.22;      // hero dome height above rim
const H_TOTAL = 3.15 + H_CAP_H;   // hero apex height (CAP_Y + CAP_H)

function angWrap(d) { return Math.atan2(Math.sin(d), Math.cos(d)); }
function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** One member's full individuation, drawn from its own seeded stream
 *  (seed <- member index: stable regardless of build order). */
function memberParams(m) {
  const r = makeRng(0x5eed + m.i * 7919);
  const mat = m.m, young = 1 - mat;
  return {
    r,
    s: m.h / H_TOTAL,
    // lean: direction + amount of whole-body tilt (mature bodies lean more —
    // they have the mass; buttons stand near-upright)
    leanDir: r() * TAU,
    leanAmt: (0.04 + r() * 0.11) * (0.6 + 0.6 * mat),
    // cap-diameter-to-dome-height ratio, gated by growth stage: young caps
    // stay closed (narrow rim, tall dome), mature caps open toward the
    // hero's flat bell — then a seeded spread on top so age isn't a lookup
    // Declutter round: individuation spreads tightened toward the hero's own
    // proportions — "same species, different individuals". The extremes of
    // the old spreads (very flat-wide or very tall-narrow caps, hard wave
    // harmonics) were reading as different KINDS, not different individuals.
    rimScale: (0.62 + 0.38 * Math.pow(mat, 0.8)) * (0.92 + r() * 0.18),
    domeH: H_CAP_H * (1 + 0.45 * young) * (0.88 + r() * 0.28),
    // rim waviness: the hero's three harmonics re-weighted + re-phased
    dAmp: 0.09 * (0.7 + r() * 0.8),
    w2: 0.045 * (0.6 + r() * 1.1), p2: r() * TAU,
    w3: 0.018 * (0.6 + r() * 1.2), p3: r() * TAU,
    // droop asymmetry (rim height modulation) + margin roll, curled harder
    // on young caps; some members carry the hero's one crisp fold accent
    yAmp: 0.16 * (0.65 + r() * 0.7), p4: r() * TAU,
    droopK: (0.75 + r() * 0.6) * (1 + 0.5 * young),
    fold: r() < 0.6 ? { az: r() * TAU, d: 0.08 + r() * 0.12, w: 0.25 + r() * 0.25 } : null,
    // cap-surface lumps (the hero's dents-and-swells pair, re-phased)
    lumpQ1: r() * TAU, lumpQ2: r() * TAU, lumpK: 0.7 + r() * 0.8,
    // gill density: seeded spread x growth stage (closed caps hide gills)
    gillD: (0.7 + r() * 0.65) * (0.35 + 0.65 * mat),
    // stem: thickness, ground-merge flare strength, axis curve
    stemW: 0.75 + r() * 0.55,
    flareK: 0.7 + r() * 0.8,
    curveA: 0.05 + r() * 0.17, curveP: r() * TAU, curveP2: r() * TAU,
    // heat distribution: which sector of THIS body runs hot, and how hard
    hotDir: r() * TAU, hotAmp: 0.15 + r() * 0.30,
    // moisture glints cluster on a seeded wet sector
    wetDir: r() * TAU,
    tw0: r() * TAU,
  };
}

/* ------------------------------------------------------------------ */
/* D15 density ladder                                                  */
/* ------------------------------------------------------------------ */
// Per-tier counts for the hero's texture systems. Hero reference build
// (mushroom-scene.js): cap 26x110 lattice + 190-node overlay / 230x12 gills
// / 340-seg rim x ~5 passes + 430 ticks / 46x34 stem lattice + 48x40 fibres
// / 14 root strands — ~16k line segments for the one organism. The ladder
// lands each T0 member at ~25-30% of that, T1 ~15%, T2 ~7% (before the
// per-member size factor), which reads as the same material at their
// distances from the rest pose.
// Declutter round: T0 nudged up and T1/T2 raised substantially — the far
// (frame-LEFT) arc members were the sketchiest bodies in frame, which read
// both as "a different kind of mushroom" and as a left-of-frame hole. The
// ROOT counts move the other way: the root flares were the floor's worst
// countable-stroke offender, so each member keeps only 1-2 short stubs and
// its ground-merge is now carried by soft base glow pools (see buildMushroom).
const TIERS = [
  { // T0 — near (dist < 8): the members Hannah is looking straight at
    capRings: 15, capSegs: 68, capNodes: 44, capBeadP: 0.10, capSpkPts: 80,
    gillN: 100, gillSub: 8, gillCorePts: 24,
    rimSeg: 126, ticks: 165, tickBeadP: 0.30, rimPts: 26,
    stemRings: 19, stemSegs: 15, stemPtP: 0.10,
    fibN: 24, fibSeg: 14,
    roots: 2, rootSteps: 3,
    glints: 12 },
  { // T1 — mid (dist < 14)
    capRings: 12, capSegs: 58, capNodes: 30, capBeadP: 0.08, capSpkPts: 48,
    gillN: 78, gillSub: 7, gillCorePts: 16,
    rimSeg: 96, ticks: 100, tickBeadP: 0.25, rimPts: 16,
    stemRings: 14, stemSegs: 12, stemPtP: 0.08,
    fibN: 17, fibSeg: 11,
    roots: 2, rootSteps: 3,
    glints: 8 },
  { // T2 — far (the visible frame-left arc lives here)
    capRings: 9, capSegs: 44, capNodes: 18, capBeadP: 0.06, capSpkPts: 24,
    gillN: 48, gillSub: 5, gillCorePts: 10,
    rimSeg: 72, ticks: 50, tickBeadP: 0.20, rimPts: 10,
    stemRings: 11, stemSegs: 10, stemPtP: 0.06,
    fibN: 13, fibSeg: 9,
    roots: 1, rootSteps: 2,
    glints: 6 },
];

// Per-system luminance: the hero's material opacities carried per segment
// (meta.mul) against this batch's materials (strand opacity 1.15, points
// opacity 1.5 — both kept from D14 so the far hints and halo language are
// untouched). An equivalent stroke lands at the hero's final brightness.
const M_CAP  = 0.28 / 1.15;   // cap lattice        (hero makeDenseLines 0.28)
const M_OVL  = 0.30 / 1.15;   // overlay net        (hero makeLines 0.30)
const M_GILL = 0.33 / 1.15;   // gill skirt         (hero 0.33)
const M_RIM  = 0.55 / 1.15;   // rim + ticks        (hero 0.55)
const M_STEM = 0.32 / 1.15;   // stem lattice       (hero 0.32)
const M_FIB  = 0.32 / 1.15;   // stem fibres        (hero 0.32)
const M_ROOT = 0.42 / 1.15;   // base root flare    (hero 0.42)
const M_BEAD   = 0.90 / 1.5;  // surface bead motes (hero makePoints 0.9)
const M_CORE   = 0.85 / 1.5;  // gill hot core      (hero 0.85)
const M_RIMPT  = 1.00 / 1.5;  // rim points         (hero 1.0)
const M_STEMPT = 0.70 / 1.5;  // stem points        (hero 0.7)

export function createFinalRing(sceneApi, uniforms) {
  const rand = makeRng(20260417);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();

  const lines = makeBatch();
  const glows = makeBatch();
  const memberStats = [];   // D15 QA: per-member built density

  /* ---- one individuated copy of the hero, appended into the batches ---- */
  function buildMushroom(m) {
    const P = memberParams(m);
    const r = P.r, g = () => gaussOf(r);
    const dist = Math.hypot(m.x - REST_CAM.x, m.z - REST_CAM.z);
    const T = dist < 8 ? 0 : dist < 14 ? 1 : 2;    // build-time LOD tier
    const C = TIERS[T];
    const meta = { arc: m.arc, reveal: m.reveal, boost: 1 };
    const s = P.s;
    // bigger members carry proportionally more strokes (density is per body
    // surface, and the tier already handles distance)
    const sizeK = Math.min(1.3, Math.max(0.8, 0.55 + 1.05 * s));
    const seg0 = lines.segCount, pt0 = glows.ptCount;

    // placement frame: local hero-units -> tilt toward leanDir -> scale ->
    // member base. The tilt is the hero's own whole-body lean move
    // (mushroom-scene.js "cap tilt"), given a per-member axis and angle.
    const cd = Math.cos(P.leanDir), sd = Math.sin(P.leanDir);
    const cF = Math.cos(P.leanAmt), sF = Math.sin(P.leanAmt);
    const w = (px, py, pz) => {
      const l = px * cd + pz * sd, t = -px * sd + pz * cd;
      const l2 = l * cF + py * sF, y2 = -l * sF + py * cF;
      return [m.x + s * (l2 * cd - t * sd), m.gy + s * y2, m.z + s * (l2 * sd + t * cd)];
    };
    const segW = (p, q, ta, tb, tw, mul) =>
      lines.seg(p[0], p[1], p[2], q[0], q[1], q[2],
        Math.min(ta, 0.95), Math.min(tb, 0.95), { ...meta, tw: P.tw0 + tw, mul });
    const ptW = (p, tone, psize, tw, mul) =>
      glows.pt(p[0], p[1], p[2], Math.min(tone, 0.95), psize,
        { ...meta, tw: P.tw0 + tw, mul });
    // heat distribution: this member's hot sector (the hero's own light lives
    // where the lifted rim exposes the gills — each copy picks its own side)
    const heatK = (a) => 1 + P.hotAmp * Math.cos(a - P.hotDir);
    // occlusion proxy (hero §5 shells, without a draw call): from the rest
    // camera the far side of a body's under-parts is hidden by its own flesh.
    // Baked against the rest pose, like the LOD tier — approximate in
    // transit, exact where scrutiny happens.
    const camA = Math.atan2(REST_CAM.z - m.z, REST_CAM.x - m.x);
    const occlS = (a) => 0.28 + 0.72 * smoothstep(-0.55, 0.45, Math.cos(a - camA));
    const occlM = (a) => 0.60 + 0.40 * smoothstep(-0.60, 0.40, Math.cos(a - camA));
    // ELEVATION occlusion (declutter round): the hero's §5 shells also hide
    // the gills and the stem interior when a cap is seen from ABOVE — the
    // missing piece that made the short near members read as open glowing
    // bowls (a different creature) instead of solid caps. Baked against the
    // rest camera like everything else here: underVis is 1 side-on and falls
    // toward 0.12 as the lens looks down past the rim plane.
    const rimWorldY = m.gy + P.s * (H_TOTAL - P.domeH);
    const elev = (REST_CAM.y - rimWorldY) / Math.max(dist, 1e-3);
    const underVis = 1 - smoothstep(0.02, 0.30, elev) * 0.88;

    /* -- the recipe's form functions, member-tuned (hero §4, local units) -- */
    const capY = H_TOTAL - P.domeH;               // apex stays at scale height
    const rimBase = H_CAP_R * P.rimScale;
    const rimRad = (a) => rimBase * (1 + P.dAmp * Math.cos(a - P.leanDir)
                                      + P.w2 * Math.cos(2 * a + P.p2)
                                      + P.w3 * Math.sin(3 * a + P.p3));
    const rimYoff = (a) => P.rimScale * (
        -P.yAmp * Math.cos(a - P.leanDir) + 0.05 * Math.cos(2 * a + P.p4)
        - (P.fold ? P.fold.d * Math.exp(-Math.pow(angWrap(a - P.fold.az) / P.fold.w, 2)) : 0));
    const droop = (u, a) => {
      const mm = Math.max(0, (u - 0.78) / 0.22);
      return -(0.11 + 0.05 * Math.cos(a - P.leanDir)) * P.droopK * P.rimScale * mm * mm;
    };
    const lump = (u, a) => (0.038 * Math.sin(u * 6.3 + a * 2.1 + P.lumpQ1)
                          + 0.026 * Math.sin(u * 9.7 - a * 3.3 + P.lumpQ2))
                          * Math.sin(Math.PI * Math.min(u, 1)) * P.lumpK;
    const topPt = (u, a) => {          // cap top: soft bell + wavy rim + lumps
      const uc = Math.min(u, 1), rr = u * rimRad(a);
      const y = capY + P.domeH * Math.pow(Math.cos(uc * Math.PI / 2), 1.15)
              + rimYoff(a) * Math.pow(uc, 1.6) + droop(uc, a) + lump(u, a);
      const nud = 0.15 * P.rimScale * (1 - uc * uc);   // apex nudged toward the lean
      return [Math.cos(a) * rr + nud * cd, y, Math.sin(a) * rr + nud * sd];
    };
    const underPt = (u, a) => {        // gill skirt underside (shallow)
      const rr = Math.max(u * rimRad(a), 0.2 * P.rimScale);
      const edge = Math.pow(Math.max(0, (u - 0.8) / 0.2), 2);
      const y = capY + 0.5 * Math.pow(Math.max(0, 1 - u), 1.8) + 0.03
              + rimYoff(a) * Math.pow(u, 1.6) + droop(u, a) - 0.11 * edge;
      const nud = 0.075 * P.rimScale * (1 - u * u);
      return [Math.cos(a) * rr + nud * cd, y, Math.sin(a) * rr + nud * sd];
    };

    /* -- stem (hero §7): taper + ground-merge base flare + flare into the
          cap, on a curved axis converging toward the throat -- */
    const stemTop = capY + 0.18;       // buried into the cap interior
    const stemR = (y) => (0.27 - 0.07 * (y / stemTop)) * P.stemW
                       + 0.42 * P.flareK * Math.exp(-y / 0.26)
                       + 0.05 * P.stemW * Math.exp((y - stemTop) / 0.35);
    const stemAxis = (y) => {
      const wt = Math.pow(Math.min(y / (stemTop * 0.92), 1), 2);
      return [
        (P.curveA * Math.sin(y * 0.85 + P.curveP)) * (1 - wt) + 0.10 * cd * wt,
        (P.curveA * 0.45 * Math.sin(y * 0.7 + P.curveP2)) * (1 - wt) + 0.10 * sd * wt,
      ];
    };

    /* ==== §7 STEM — staggered lattice mesh + long vertical fibres ==== */
    {
      const R = C.stemRings, S = C.stemSegs;
      const grid = [];
      for (let i = 0; i <= R; i++) {
        const y = (i / R) * stemTop;
        const [ax, az] = stemAxis(y);
        const rr = stemR(y);
        const row = [];
        for (let j = 0; j < S; j++) {
          const a = (j / S) * TAU + (i % 2) * (Math.PI / S) + g() * 0.05;
          const jr = rr * (1 + g() * 0.09);
          row.push([ax + Math.cos(a) * jr, y + g() * 0.015, az + Math.sin(a) * jr, a]);
        }
        grid.push(row);
      }
      for (let i = 0; i <= R; i++) {
        const yT = i / R;
        for (let j = 0; j < S; j++) {
          const pl = grid[i][j], a = pl[3];
          // hero shading: azimuthal sheen + warm throat, warm base; the
          // upper lattice ducks under the cap when seen from above
          const base = 0.22 + 0.15 * Math.abs(Math.sin((j / S) * TAU - 0.3)) + r() * 0.07;
          const uvK = 1 - (1 - underVis) * smoothstep(0.55, 0.95, yT);
          const b = (base + (yT > 0.85 ? 0.15 : 0) + (yT < 0.12 ? 0.08 : 0))
                  * heatK(a) * occlS(a) * uvK;
          const p = w(pl[0], pl[1], pl[2]);
          if (r() < 0.5) {
            const q = grid[i][(j + 1) % S];
            segW(p, w(q[0], q[1], q[2]), b * 0.75, b * 0.75, a + 3.3, M_STEM);
          }
          if (i < R && r() < 0.9) {
            const q = grid[i + 1][j];
            segW(p, w(q[0], q[1], q[2]), b, b, a + 3.6, M_STEM);
          }
          if (r() < C.stemPtP)
            ptW(p, 0.5 + r() * 0.3, s * (0.015 + r() * 0.04), i + j, M_STEMPT);
        }
      }
      // vertical fibres with the hero's wiggle; every fifth doubled heavier
      const NF = Math.max(6, Math.round(C.fibN * sizeK)), FS = C.fibSeg;
      for (let f = 0; f < NF; f++) {
        const a0 = (f / NF) * TAU + g() * 0.1;
        const bF = 0.26 + r() * 0.18;
        let pv = null, pvD = null, aPrev = a0;
        for (let i = 0; i <= FS; i++) {
          const y = (i / FS) * stemTop;
          const [ax, az] = stemAxis(y);
          const a = a0 + 0.11 * Math.sin(y * 1.7 + f);   // the hero's fibre wiggle
          const rr = stemR(y) * (1 + g() * 0.04) * 1.01;
          const q = [ax + Math.cos(a) * rr, y, az + Math.sin(a) * rr];
          const p = w(q[0], q[1], q[2]);
          const pD = w(q[0] + 0.009, q[1], q[2]);
          if (pv) {
            const uvF = 1 - (1 - underVis) * smoothstep(0.55, 0.95, y / stemTop);
            const b0 = (bF + g() * 0.04) * heatK(aPrev) * occlS(aPrev) * uvF;
            const b1 = (bF + g() * 0.04) * heatK(a) * occlS(a) * uvF;
            segW(pv, p, b0, b1, f * 1.3, M_FIB);
            if (f % 5 === 0)   // heavier structural strand
              segW(pvD, pD, b0 * 0.8, b1 * 0.8, f * 1.3 + 0.5, M_FIB);
            if (r() < 0.09)
              ptW(p, bF + 0.18, s * (0.012 + r() * 0.023), f + i, M_STEMPT);
          }
          pv = p; pvD = pD; aPrev = a;
        }
      }
    }

    /* ==== §4 CAP — the full jittered lattice + overlay net + motes ==== */
    {
      const R = C.capRings, S = Math.max(12, Math.round(C.capSegs * sizeK));
      const grid = [];
      for (let i = 0; i <= R; i++) {
        const u = i / R;
        const row = [];
        for (let j = 0; j < S; j++) {
          const a = (j / S) * TAU;
          const ju = Math.max(0, u + (i > 0 ? g() * 0.02 : 0));
          const ja = a + g() * 0.028;
          const q = topPt(ju, ja);
          row.push([q[0], q[1] + g() * 0.04, q[2], a]);
        }
        grid.push(row);
      }
      for (let i = 0; i <= R; i++) {
        const u = i / R;
        for (let j = 0; j < S; j++) {
          const pl = grid[i][j], a = pl[3];
          // the far downslope of the skirt ducks behind the dome (mild)
          const vis = 1 + (occlM(a) - 1) * Math.pow(u, 1.5);
          const bright = (0.14 + 0.26 * u + r() * 0.08) * heatK(a) * vis;
          const p = w(pl[0], pl[1], pl[2]);
          if (r() < C.capBeadP)
            ptW([p[0], p[1] + 0.01 * s, p[2]], bright * 1.7 + r() * 0.15,
              s * (0.016 + r() * r() * 0.05), j * 0.7, M_BEAD);
          if (i > 2 || r() < 0.4) {          // azimuthal stroke
            const q = grid[i][(j + 1) % S];
            segW(p, w(q[0], q[1], q[2]), bright, bright, a + 2, M_CAP);
          }
          if (i < R && r() < 0.85) {         // radial stroke
            const q = grid[i + 1][j];
            segW(p, w(q[0], q[1], q[2]), bright, bright + 0.03, a + 2.5, M_CAP);
          }
          if (i < R && r() < 0.25) {         // diagonal stroke
            const q = grid[i + 1][(j + 1) % S];
            segW(p, w(q[0], q[1], q[2]), bright * 0.8, bright * 0.8, a + 3, M_CAP);
          }
        }
      }
      // sparse bright overlay network + node dots riding the dome
      const nN = Math.max(8, Math.round(C.capNodes * sizeK));
      const nodes = [];
      for (let k = 0; k < nN; k++) {
        const u = Math.sqrt(r()) * 0.99, aa = r() * TAU;
        const q = topPt(u, aa);
        nodes.push([q[0], q[1] + 0.012, q[2], aa]);
      }
      for (const nd of nodes) {
        const near = nodes
          .filter(o => o !== nd)
          .map(o => ({
            o,
            d: (o[0] - nd[0]) ** 2 + (o[1] - nd[1]) ** 2 + (o[2] - nd[2]) ** 2,
          }))
          .sort((x, y) => x.d - y.d)
          .slice(0, 2);
        const pw = w(nd[0], nd[1], nd[2]);
        for (const { o } of near) {
          const b = (0.35 + r() * 0.15) * heatK(nd[3]);
          segW(pw, w(o[0], o[1], o[2]), b, b, nd[3] + 1.2, M_OVL);
        }
        ptW(pw, 0.5 + r() * 0.3, s * (0.03 + r() * 0.04), nd[3], M_BEAD);
      }
      for (let k = 0; k < C.capSpkPts; k++) {   // surface speckle motes
        const u = Math.sqrt(r()), aa = r() * TAU;
        const q = w(...topPt(u, aa));
        ptW([q[0], q[1] + 0.01 * s, q[2]], 0.3 + r() * 0.3,
          s * (0.015 + r() * 0.03), k * 0.4, M_BEAD);
      }
    }

    /* ==== rim — three stacked rings, depth-weighted front arc, lip,
            fringe ticks + margin beads, rim points ==== */
    {
      const S = Math.max(20, Math.round(C.rimSeg * sizeK));
      const mB = 0.88 + 0.12 * m.m;   // mature rims run a touch hotter
      const rings = T === 2
        ? [{ du: 1.005, dy: 0, b: 0.8 }, { lip: true, b: 0.6 }]
        : [{ du: 1.005, dy: 0, b: 0.8 },
           { du: 1.0,   dy: 0.035, b: 0.52 },
           { du: 1.012, dy: -0.012, b: 0.57 },
           { lip: true, b: 0.6 }];
      for (const ps of rings) {
        let pa = null;
        for (let k = 0; k <= S; k++) {
          const a = (k / S) * TAU;
          const q = ps.lip ? underPt(1.0, a) : topPt(ps.du, a);
          const p = w(q[0], q[1] + (ps.dy || 0) + g() * 0.008, q[2]);
          if (pa) {
            const b = (ps.b + g() * 0.05) * mB * heatK(a) * (ps.lip ? occlS(a) : 1);
            segW(pa, p, b, b, a + (ps.dy || 0) * 40, M_RIM);
          }
          pa = p;
        }
      }
      // doubled front arc: strokes thicken where the rim faces the rest
      // camera, thinning to nothing as it turns away — width follows depth
      if (T < 2) for (let pass = 0; pass < 2; pass++) {
        let pf = null;
        for (let k = 0; k <= S; k++) {
          const a = (k / S) * TAU;
          const wgt = Math.max(0, Math.cos(a - camA));
          const b = 0.55 * wgt * wgt * mB;
          const q = topPt(1.004, a);
          const p = w(q[0], q[1] + (pass ? 0.012 : -0.008) + g() * 0.006, q[2]);
          if (pf && b > 0.04) segW(pf, p, b, b, a + 6 + pass, M_RIM);
          pf = p;
        }
      }
      // fringe ticks across the flesh band between lip and rim, with the
      // hero's occasional margin bead
      const nT = Math.round(C.ticks * sizeK);
      for (let k = 0; k < nT; k++) {
        const a = r() * TAU;
        const b = (0.3 + r() * 0.2) * heatK(a) * occlS(a);
        const tt = w(...topPt(1.0, a)), uu = w(...underPt(1.0, a));
        segW(tt, uu, b, b * 0.9, k * 0.9, M_RIM);
        if (r() < C.tickBeadP)
          ptW(uu, 0.55 + r() * 0.25, s * (0.016 + r() * 0.028), k, M_BEAD);
      }
      for (let k = 0; k < C.rimPts; k++) {
        const a = r() * TAU;
        const q = topPt(1.0, a);
        ptW(w(q[0], q[1] + g() * 0.02, q[2]), 0.72 + r() * 0.18,
          s * (0.03 + r() * 0.05), k * 1.3, M_RIMPT);
      }
    }

    /* ==== §6 GILLS — dense radial filaments, feathered attach, the
            cavity-shading curve, 8% doubled veins, hot core ==== */
    {
      const N = Math.max(6, Math.round(C.gillN * P.gillD * sizeK));
      const SUB = C.gillSub;
      const ph = r() * TAU;   // per-member fan phase
      for (let gi = 0; gi < N; gi++) {
        const a0 = ph + (gi / N) * TAU + g() * 0.004;
        const wig = g() * 0.02;
        const boost = r() < 0.08 ? 0.18 : 0;
        const u0 = 0.06 + r() * 0.09;              // feathered inner attach
        const hk = heatK(a0) * occlS(a0) * underVis;
        let pv = null, pvD = null, tp = 0;
        for (let k = 0; k <= SUB; k++) {
          const t = k / SUB, u = u0 + t * (1 - u0);
          const q = underPt(u, a0 + wig * Math.sin(t * Math.PI));
          const qy = q[1] + g() * 0.008;
          const p = w(q[0], qy, q[2]);
          const pD = w(q[0], qy - 0.007, q[2]);
          if (pv) {
            // cavity shading: warm core, shadowed mid interior, bright fringe
            const b0 = (0.38 - 0.55 * tp + 0.85 * tp * tp + boost) * hk;
            const b1 = (0.38 - 0.55 * t + 0.85 * t * t + boost) * hk;
            segW(pv, p, b0, b1, a0 + gi * 0.3, M_GILL);
            if (boost > 0)   // doubled stroke reads as a thicker vein
              segW(pvD, pD, b0 * 0.85, b1 * 0.85, a0 + gi * 0.3 + 0.4, M_GILL);
            if (r() < 0.05)
              ptW(p, b1 * 1.2, s * (0.011 + r() * 0.018), gi, M_BEAD);
          }
          pv = p; pvD = pD; tp = t;
        }
      }
      // hot core where the gills meet the stem apex (hidden from above,
      // like the gills themselves)
      for (let k = 0; k < C.gillCorePts; k++) {
        const a = r() * TAU;
        const q = underPt(0.06 + r() * 0.14, a);
        ptW(w(q[0], q[1] + g() * 0.02, q[2]),
          (0.48 + r() * 0.15) * occlS(a) * underVis,
          s * (0.035 + r() * 0.04), k * 1.1, M_CORE);
      }
    }

    /* ==== §8 base — ground merge (declutter round). The old forking,
            beaded root WALKS were the floor's worst countable strokes
            ("messy lines... especially along the forest floor"): up to
            ~40 wandering segments per member, radiating in every
            direction. Each member now keeps only C.roots SHORT stubs —
            enough to seat the stem in the soil — and the ground-merge
            mass moves to soft base glow POOLS (below, in the glow batch,
            reveal-gated with the member): atmosphere, not strokes. ==== */
    {
      const rs = Math.pow(s, 0.7);
      for (let k = 0; k < C.roots; k++) {
        const a = r() * TAU;
        let dirA = a;
        let px = m.x + Math.cos(a) * 0.32 * s;
        let pz = m.z + Math.sin(a) * 0.32 * s;
        let py = m.gy + (0.08 + r() * 0.10) * s;
        let h = 0.42 + r() * 0.12;
        for (let st = 0; st < C.rootSteps; st++) {
          dirA += g() * 0.25;
          const len = (0.14 + r() * 0.16) * rs;
          const qx = px + Math.cos(dirA) * len, qz = pz + Math.sin(dirA) * len;
          if (cutVal(qx, qz) < 0.4) break;   // never off the soil lip
          const qy = Math.max(groundY(qx, qz), py - (0.04 + r() * 0.06) * rs);
          lines.seg(px, py, pz, qx, qy, qz, h * 0.85, h * 0.75,
            { ...meta, tw: P.tw0 + 9 + k, mul: M_ROOT });
          px = qx; py = qy; pz = qz; h *= 0.9;
        }
      }
    }

    /* -- moisture glints: tiny hot beads clustered on this member's wet
          sector of the cap (the hero's surfaces are studded with motes) -- */
    for (let k = 0; k < C.glints; k++) {
      const a = P.wetDir + g() * 0.6;
      const p = w(...topPt(0.8 + r() * 0.22, a));
      glows.pt(p[0], p[1] + 0.01, p[2], 0.82 + r() * 0.12,
        s * (0.05 + r() * 0.05), { ...meta, tw: P.tw0 + 2.3 * k });
    }

    /* -- per-member spore shed: mature bodies only, strength seeded in
          final-world (shared with the sky's source weighting). A short
          rising ember trail leaning into the +x drift — never the hero's. -- */
    if (m.shed > 0) {
      const nSh = T < 2 ? 3 : 2;
      const exitA = g() * 0.7;                     // near world +x (downwind)
      const e = underPt(1.0, exitA);
      for (let k = 0; k < nSh; k++) {
        const t = (k + 1) / nSh;
        const p = w(e[0] + t * (0.4 + 0.4 * m.shed) + g() * 0.06,
                    e[1] + t * (0.55 + 0.55 * m.shed),
                    e[2] + g() * 0.06);
        glows.pt(p[0], p[1], p[2], 0.55 - 0.12 * t,
          s * (0.10 - 0.05 * t) * (0.5 + m.shed), { ...meta, tw: P.tw0 + 4 + k });
      }
    }

    /* -- glow points (declutter round): body halo + under-cap ember +
          base ground pools. The halo still makes a body read as
          BIOLUMINESCENT at distance, but the old centre-blob stack
          (heart at 3x capR + a bright cavity readable THROUGH the cap
          from above) made members look like glass lamps with a bulb
          inside — a different creature from the hero's solid dark-topped
          cap. Now: heart smaller and quieter, cavity/core carry the same
          elevation occlusion as the gills they light, and the base ember
          grows into two soft GROUND POOLS that replace the root flares'
          visual mass (merged into the same batch + reveal channel:
          zero new draws, kindles with its member). -- */
    const heart = w(0.10 * cd, capY + P.domeH * 0.35, 0.10 * sd);
    const cavity = w(0.05 * cd, capY + 0.10, 0.05 * sd);
    glows.pt(heart[0], heart[1], heart[2], 0.36, m.capR * (2.1 + 0.5 * m.m),
      { ...meta, tw: P.tw0 + 1 });
    glows.pt(cavity[0], cavity[1], cavity[2],
      (0.68 + 0.12 * m.m) * (0.25 + 0.75 * underVis),
      m.capR * (1.35 + 0.35 * m.m), { ...meta, tw: P.tw0 });
    glows.pt(cavity[0], cavity[1] - 0.02, cavity[2], 0.88 * underVis,
      m.capR * 0.5, { ...meta, tw: P.tw0 + 2 });
    // ground-glow pools: the member's light meeting the soil
    glows.pt(m.x, m.gy + 0.04, m.z, 0.42, m.capR * 1.05,
      { ...meta, tw: P.tw0 + 3 });
    glows.pt(m.x + Math.cos(P.leanDir) * 0.18 * s, m.gy + 0.03,
      m.z + Math.sin(P.leanDir) * 0.18 * s, 0.26, m.capR * 2.1,
      { ...meta, tw: P.tw0 + 3.7 });

    memberStats.push({
      i: m.i, tier: T, h: m.h,
      segs: lines.segCount - seg0, pts: glows.ptCount - pt0,
    });
  }

  for (const m of MEMBERS) buildMushroom(m);

  // Declutter round: the two schematic far-side "continuation hint"
  // octagons are GONE. With the floor cleaned they read as floating rings
  // beside the hero — countable artifacts, not mushrooms. The sliced arc +
  // the members standing on the far lip already say "the ring continues";
  // two soft ground glows keep a breath of light where the hints stood.
  for (const [azDeg, r] of [[14, 9.6], [50, 10.4]]) {
    const a = (azDeg * Math.PI) / 180;
    const x = RING_C.x + Math.cos(a) * r, z = RING_C.z + Math.sin(a) * r;
    if (Math.hypot(x, z) < 3.4 || cutVal(x, z) < 0.35) continue;
    const gy = groundY(x, z);
    const arc = arcOf(x, z);
    const meta = { arc, reveal: 0.08 + 0.80 * arc, boost: 0.5, tw: rand() * TAU };
    glows.pt(x, gy + 0.05, z, 0.34, 0.55, meta);
  }

  const strandMat = makeStrandMat(uniforms, 1.15);
  const ringLines = new THREE.LineSegments(lines.geo(), strandMat);
  ringLines.frustumCulled = false;
  group.add(ringLines);

  const glowTex = makeGlowTexture();
  const glowMat = makePointsMat(uniforms, 1.5, glowTex);
  const ringGlows = new THREE.Points(glows.geo(true), glowMat);
  ringGlows.frustumCulled = false;
  group.add(ringGlows);

  /* ---- primordia: tiny buds that surface during a long hold (FN-2.4).
       Time-compressed and subtle — soil-level ember points, no theatrical
       sprouting. Driven by uDwell (seconds of settled dwell at the rest),
       accumulated by the orchestrator. ---- */
  const PRIM_DELAY = 6, PRIM_GROW = 9;
  const primUniforms = {
    uDwell: { value: 0 },
    uAmount: uniforms.uAmount,
    uFogNear: uniforms.uFogNear,
    uFogFar: uniforms.uFogFar,
    uTime: uniforms.uTime,
    uMap: { value: glowTex },
  };
  const primPos = [], primCol = [], primDelay = [], primTw = [], primSize = [];
  {
    const c = new THREE.Color();
    // in the arc gaps and along the lip edge — always on kept soil
    const spots = [[100, 5.6], [160, 5.2], [300, 5.9], [335, 6.0], [20, 6.4]];
    let di = 0;
    for (const [azDeg, r0] of spots) {
      const a = (azDeg * Math.PI) / 180;
      let r = r0;
      let x = RING_C.x + Math.cos(a) * r, z = RING_C.z + Math.sin(a) * r;
      let guard = 0;
      while (cutVal(x, z) < 0.4 && guard++ < 30) {
        r -= 0.15;
        x = RING_C.x + Math.cos(a) * r; z = RING_C.z + Math.sin(a) * r;
      }
      if (Math.hypot(x, z) < 3.2) continue;
      primPos.push(x + gauss() * 0.2, groundY(x, z) + 0.05, z + gauss() * 0.2);
      // warm bud tone
      c.setRGB(1.0, 0.72, 0.38);
      primCol.push(c.r, c.g, c.b);
      primDelay.push(di * 2.2 + rand() * 1.2);
      primTw.push(rand() * TAU);
      primSize.push(0.10 + rand() * 0.06);
      di++;
    }
  }
  const primGeo = new THREE.BufferGeometry();
  primGeo.setAttribute('position', new THREE.Float32BufferAttribute(primPos, 3));
  primGeo.setAttribute('color', new THREE.Float32BufferAttribute(primCol, 3));
  primGeo.setAttribute('aDelay', new THREE.Float32BufferAttribute(primDelay, 1));
  primGeo.setAttribute('aTw', new THREE.Float32BufferAttribute(primTw, 1));
  primGeo.setAttribute('psize', new THREE.Float32BufferAttribute(primSize, 1));
  const primMat = new THREE.ShaderMaterial({
    uniforms: primUniforms,
    vertexShader: /* glsl */ `
      #define MIN_PT 1.7
      attribute float aDelay, aTw, psize;
      uniform float uDwell, uTime;
      varying vec3 vColor;
      varying float vA;
      varying float vFog;
      varying float vShrink;
      void main() {
        float grow = smoothstep(0.0, 1.0, (uDwell - ${'6.0'} - aDelay) / ${'9.0'});
        vA = grow * (0.55 + 0.30 * sin(uTime * 0.35 + aTw * 1.7));
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFog = -mv.z;
        float sz = psize * (0.2 + 0.8 * grow) * (300.0 / -mv.z);
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
      varying float vA;
      varying float vFog;
      varying float vShrink;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
        gl_FragColor = vec4(vColor * t.a * vA * uAmount * fogF * vShrink, 1.0);
      }
    `,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const primordia = new THREE.Points(primGeo, primMat);
  primordia.frustumCulled = false;
  group.add(primordia);

  return {
    group,
    setDwell(s) { primUniforms.uDwell.value = s; },
    counts: {
      ringSegs: lines.segCount, glowPts: glows.ptCount,
      primordia: primSize.length, ringMembers: memberStats,
    },
  };
}
