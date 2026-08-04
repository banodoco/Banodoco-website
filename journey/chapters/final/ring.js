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
// 18-one-species.md (this revision): THE GEOMETRY LEFT THIS FILE. Hannah, at
// the Final rest: the ring and field members read as a DIFFERENT KIND of
// mushroom from the hero — flatter, parasol-like caps on skinnier stems.
// Measured cause: this module carried its own PARAMETERIZATION of the hero's
// form language (per-member rimScale 0.57..1.18, domeH up to 2.1x, stemW
// 0.75..1.30, and a stem taper renormalised against a shorter stem top), so
// "individuation" was quietly authoring new species. All of it is gone.
// Every body is now built by ./species.js from the anatomy.js form functions
// at ONE uniform scale — the hero's silhouette exactly, at whatever size —
// and this file is what it should always have been: PLACEMENT. It owns where
// the bodies stand, how the rest camera shades them, the ground merge, the
// batching, and the aReveal/uPull reveal choreography. It defines no cap dome
// and no stem curve of its own, and it never will again.
//
// Per-member individuation (seeded from the member index — deterministic, no
// Math.random) is now everything that CANNOT change proportions: the rigid
// azFacing rotation (which points each body's own cap droop and fold accent
// somewhere else in the world — this is what makes forty bodies of one
// silhouette read as forty individuals), a few degrees of whole-body lean,
// the heat sector, the twinkle phase, the gill density, and the seeded
// stroke jitter. All members merge into ONE LineSegments draw + ONE
// glow-Points draw; distance LOD is build-time against the fixed rest camera.
// The hero stays the most complete individual but is otherwise unprivileged
// (D12) — and now it is unambiguously the same organism.
//
// The bodies boot UNLIT (7% ember whisper) and kindle in sequence as the
// camera pulls back — Hannah's "undarken" — via the shared aReveal channel.
// The whisper state carries the full density too: a dense body barely lit
// reads as a body in the dark, where a sparse one lit read as a diagram.
//
// 17-final-field.md (this revision): the ladder gains two FIELD tiers (T3/T4)
// and a farthest cap-rim-hint rung — 60+ smaller bodies of the same species
// scattered beyond the ring into the fog, kindling outward after the ring as
// uPull completes. Same builder, same two draws. Plus the anti-"glass lamp"
// pass: per-tier interior-point damping (innerK), stroke-crowding damping on
// the stem/gill systems (crowdK), and per-field-member luminance (lum/lumMul)
// so distance reads as ember, not white. All build-time; the shaders are
// untouched.

import * as THREE from 'three';
import {
  TAU, MEMBERS, RING_C, arcOf, cutVal,
  makeRng, gaussOf, groundY, makeBatch, makeStrandMat, makePointsMat,
} from './world.js';
import { makeGlowTexture, CAP_Y } from '../../anatomy.js';
import {
  buildMushroom, scaleFor, DETAIL, HERO_MUL, STEM_BASE_R,
} from './species.js';
import { CAMERA } from './camera.js';

// The Final rest camera, for build-time LOD + occlusion only. M4 dedupe:
// read from the chapter's OWN camera leg ('final-rest' hold key) instead of
// mirroring the numbers — the reference can never drift from the authored
// pose again. (The declutter round's stale -13.9/2.55 mirror was exactly
// this class of bug.)
const REST_CAM = (() => {
  const k = CAMERA.keys.find(k => k.note === 'final-rest');
  return {
    x: k.pos.x, y: k.pos.y, z: k.pos.z,
    // plan heading of the rest gaze — the field is composed about it
    head: Math.atan2(k.tgt.z - k.pos.z, k.tgt.x - k.pos.x),
  };
})();

/* ------------------------------------------------------------------ */
/* Placement individuation (18-one-species.md)                          */
/* ------------------------------------------------------------------ */
function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** One member's POSE and TONE individuation, drawn from its own seeded
 *  stream (seed <- member index: stable regardless of build order).
 *
 *  Everything here is either a rigid transform or a tone. Nothing here can
 *  change a proportion — that is the point of 18-one-species.md, and the
 *  reason the old rimScale / domeH / stemW / flareK / harmonic knobs are
 *  not in this list. The SHAPE comes from species.js; this is where the
 *  body stands and how the frame lights it. */
function memberParams(m) {
  const seed = 0x5eed + m.i * 7919;
  const r = makeRng(seed);
  const mat = m.m;
  return {
    r, seed,
    // ONE uniform scale factor, natural variation folded into it
    s: scaleFor(m.h, seed),
    // rigid rotation about Y: this body's own facing. The hero's cap droop,
    // its fold accent and its rim harmonics travel with it, so every
    // individual presents a different profile of the SAME silhouette.
    azFacing: r() * TAU,
    // lean: direction + amount of whole-body tilt (mature bodies lean more —
    // they have the mass; buttons stand near-upright). A rigid rotation.
    // Trimmed under 18: at up to 0.19 rad (11 deg) a body tilted away from a
    // lens that already looks DOWN on it opened its rim ellipse into a
    // saucer, which reads as a different shape even though it is the same
    // one. The hero's own staging tilt is ~0.058 rad total (tiltX -0.05 /
    // leanZ -0.03); the band now brackets it.
    leanDir: r() * TAU,
    leanAmt: (0.03 + r() * 0.06) * (0.6 + 0.6 * mat),
    // heat distribution: which sector of THIS body runs hot, and how hard
    hotDir: r() * TAU, hotAmp: 0.15 + r() * 0.30,
    tw0: r() * TAU,
  };
}

/* ------------------------------------------------------------------ */
/* Detail + material bridge to species.js                              */
/* ------------------------------------------------------------------ */
// The per-tier COUNT table that used to live here is now DETAIL in
// species.js — one place to tune detail, sitting beside the one silhouette
// it traces (18-one-species.md §3). What stays here is the mapping from
// "how far is this body from the rest camera" to a tier index, which is
// placement's own knowledge, and the translation of the hero's per-system
// material opacities into this batch's color multipliers.
//
// Tier indices: 0 ring-near / 1 ring-mid / 2 ring-far / 3 field-near /
// 4 field-far / 5 hint. See DETAIL for what each rung carries.
const T_HINT = 5;

// Per-system luminance: the hero's material opacities (HERO_MUL) carried per
// segment via meta.mul against this batch's materials (strand opacity 1.15,
// points opacity 1.5 — both kept from D14 so the far hints and halo language
// are untouched). An equivalent stroke lands at the hero's final brightness.
const MUL = (() => {
  const m = {};
  for (const k in HERO_MUL.strand) m[k] = HERO_MUL.strand[k] / 1.15;
  for (const k in HERO_MUL.point) m[k] = HERO_MUL.point[k] / 1.5;
  return m;
})();

export function createFinalRing(sceneApi, uniforms) {
  const rand = makeRng(20260417);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();

  const lines = makeBatch();
  const glows = makeBatch();
  const memberStats = [];   // D15 QA: per-member built density

  /* ---- ONE BODY, PLACED ------------------------------------------------
     This function no longer draws a mushroom. It works out where a body
     stands, which detail rung it earns from the rest camera, how the frame
     shades it, and how its strokes carry the reveal — then hands all of that
     to species.js, which owns the silhouette (18-one-species.md).

     tierOverride: the field passes its tier explicitly (its members are
     placed BY distance band, so the band is the tier); ring members keep the
     measured 3-rung ladder. */
  function placeMushroom(m, tierOverride) {
    const P = memberParams(m);
    const dist = Math.hypot(m.x - REST_CAM.x, m.z - REST_CAM.z);
    const T = tierOverride != null ? tierOverride
      : dist < 8 ? 0 : dist < 14 ? 1 : 2;          // build-time LOD tier
    const C = DETAIL[T];
    // field members answer the growth-front pulse only faintly (m.boost):
    // the RING is what breathes with the colony; the distance echoes it
    const meta = { arc: m.arc, reveal: m.reveal, boost: m.boost ?? 1 };
    // distance damping (field only): additive strokes overlap in screen
    // space as bodies recede, so an undamped far cap sums to WHITE — a lamp
    // wall competing with the hero. lum drops the stroke tone down the heat
    // ramp (dimmer AND warmer — ember, the fog's own direction), lumMul
    // scales the carried per-system opacity. Ring members pass neither.
    const lumT = m.lum ?? 1;
    const lumM = m.lumMul ?? 1;
    // interior-light damping BY TIER (17-final-field.md): a body's inner
    // POINT systems — gill core, stem motes, cavity/heart stack — overlap
    // into one white column as the body shrinks on screen, which is the
    // "glass lamp" that kept reading as a different species from the hero.
    // The stroke systems (lattice, rim, gills, fibres) keep full tone: they
    // ARE the shared identity. T0 bodies are big enough to stay untouched.
    const innerK = [1, 0.55, 0.45, 0.5, 0.4, 0.4][T];
    // crowding compensation, same reasoning at stroke level: the stem's
    // lattice+fibres and the gill fan live in a NARROW screen column that
    // shrinks with distance, so their additive sum runs white on far bodies
    // while the hero's identical strokes stay textured (they cover pixels).
    // Cap lattice and rim spread wide and are spared — they are the read.
    // (Measured, not guessed: an A/B with the interior POINTS zeroed left
    // the lamp column intact — the column is stroke sum under bloom, and
    // additive saturation eats gentle scaling. These values are sized to
    // pull the pileup under the bloom knee at each tier's screen size.)
    // (field tiers sit higher than T1/T2: their bodies are already lum/
    // lumMul-damped, and a field stem dimmed twice left the rim floating —
    // the "floating rim ellipse" artifact the declutter round outlawed)
    const crowdK = [1, 0.52, 0.42, 0.78, 0.75, 0.75][T];
    const s = P.s;
    const seg0 = lines.segCount, pt0 = glows.ptCount;

    /* -- POSE: body frame (species.js output — already scaled and already
          rotated by azFacing) -> whole-body lean -> world. The lean is the
          hero's own tilt move (mushroom-scene.js "cap tilt") given a
          per-member axis and angle; it is a rigid rotation, so it cannot
          touch a proportion. -- */
    const cd = Math.cos(P.leanDir), sd = Math.sin(P.leanDir);
    const cF = Math.cos(P.leanAmt), sF = Math.sin(P.leanAmt);
    const w = (px, py, pz) => {
      const l = px * cd + pz * sd, t = -px * sd + pz * cd;
      const l2 = l * cF + py * sF, y2 = -l * sF + py * cF;
      return [m.x + (l2 * cd - t * sd), m.gy + y2, m.z + (l2 * sd + t * cd)];
    };

    /* -- the reveal choreography, unchanged in semantics: every stroke and
          every point this body emits carries the member's arc / aReveal /
          boost, its twinkle phase, and the per-system material multiplier
          scaled by the member's carried opacity. -- */
    const emit = {
      seg(ax, ay, az, bx, by, bz, ta, tb, tw, mul) {
        const p = w(ax, ay, az), q = w(bx, by, bz);
        lines.seg(p[0], p[1], p[2], q[0], q[1], q[2],
          Math.min(ta * lumT, 0.95), Math.min(tb * lumT, 0.95),
          { ...meta, tw: P.tw0 + tw, mul: (mul ?? 1) * lumM });
      },
      pt(x, y, z, tone, psize, tw, mul) {
        const p = w(x, y, z);
        glows.pt(p[0], p[1], p[2], Math.min(tone * lumT, 0.95), psize,
          { ...meta, tw: P.tw0 + tw, mul: (mul ?? 1) * lumM });
      },
    };

    /* -- SHADE: how the rest camera lights this body. All of it is baked
          against the fixed rest pose, like the LOD tier — approximate in
          transit, exact where scrutiny happens. -- */
    // this member's hot sector (the hero's own light lives where the lifted
    // rim exposes the gills — each copy picks its own side)
    const heatK = (a) => 1 + P.hotAmp * Math.cos(a - P.hotDir);
    // occlusion proxy (hero §5 shells, without a draw call): from the rest
    // camera the far side of a body's under-parts is hidden by its own flesh
    const camA = Math.atan2(REST_CAM.z - m.z, REST_CAM.x - m.x);
    const occlS = (a) => 0.28 + 0.72 * smoothstep(-0.55, 0.45, Math.cos(a - camA));
    const occlM = (a) => 0.60 + 0.40 * smoothstep(-0.60, 0.40, Math.cos(a - camA));
    // ELEVATION occlusion (declutter round): the §5 shells also hide the
    // gills and the stem interior when a cap is seen from ABOVE — the
    // missing piece that made short near members read as open glowing bowls
    // (a different creature) instead of solid caps. The rim plane now sits
    // at the SPECIES' own rim height (CAP_Y in hero units) rather than at a
    // per-member dome height that no longer exists.
    const rimWorldY = m.gy + s * CAP_Y;
    const elev = (REST_CAM.y - rimWorldY) / Math.max(dist, 1e-3);
    const underVis = 1 - smoothstep(0.02, 0.30, elev) * 0.88;

    buildMushroom({
      tier: T, seed: P.seed, scale: s, azFacing: P.azFacing,
      mat: m.m, shed: m.shed ?? 0,
      emit, mul: MUL,
      shade: { heatK, occlS, occlM, underVis, crowdK, innerK, camAz: camA },
    });

    /* ==== §8 base — ground merge. Not species geometry: these stubs walk
            on the REAL terrain (groundY / cutVal), which is placement's
            business, and they are clipped at the cutaway lip. They seat
            against the species' own soil-line stem radius so the stem is
            never re-derived here. The old forking, beaded root WALKS were
            the floor's worst countable strokes ("messy lines... especially
            along the forest floor"): up to ~40 wandering segments per
            member. Each body now keeps only C.roots SHORT stubs and the
            ground-merge mass is carried by the soft base glow pools
            species.js emits: atmosphere, not strokes. ==== */
    {
      const rs = Math.pow(s, 0.7);
      const r = P.r, g = () => gaussOf(r);
      for (let k = 0; k < C.roots; k++) {
        const a = r() * TAU;
        let dirA = a;
        let px = m.x + Math.cos(a) * STEM_BASE_R * s;
        let pz = m.z + Math.sin(a) * STEM_BASE_R * s;
        let py = m.gy + (0.08 + r() * 0.10) * s;
        let h = 0.42 + r() * 0.12;
        for (let st = 0; st < C.rootSteps; st++) {
          dirA += g() * 0.25;
          const len = (0.14 + r() * 0.16) * rs;
          const qx = px + Math.cos(dirA) * len, qz = pz + Math.sin(dirA) * len;
          if (cutVal(qx, qz) < 0.4) break;   // never off the soil lip
          const qy = Math.max(groundY(qx, qz), py - (0.04 + r() * 0.06) * rs);
          lines.seg(px, py, pz, qx, qy, qz, h * 0.85, h * 0.75,
            { ...meta, tw: P.tw0 + 9 + k, mul: MUL.root });
          px = qx; py = qy; pz = qz; h *= 0.9;
        }
      }
    }

    memberStats.push({
      i: m.i, tier: T, h: m.h,
      segs: lines.segCount - seg0, pts: glows.ptCount - pt0,
    });
  }

  for (const m of MEMBERS) placeMushroom(m);

  /* ================================================================
     THE FIELD (17-final-field.md, Hannah): "a whole field of smaller,
     less-detailed mushrooms stretching into the distant background —
     some smaller, some bigger — so it feels like a huge scale."
     Same species, same builder, same two draws: every field body is a
     buildMushroom() call on the T3/T4 rungs of the ladder, plus a
     farthest rung of pure cap-rim hints. Composition is authored in the
     REST FRAME: ~2/3 of the bodies stand on the frame-right side of the
     rest gaze (the upper-right Hannah gave the field when the copy moved
     to the bottom-left corner), the ring band keeps a 9.6-unit moat so
     the fairy ring stays the subject, the hero keeps its clearance and
     its airy sky sector (the trees' own gap), and everything stands on
     kept soil — the cutaway wedge stays void.
     Reveal: the kindling travels OUTWARD — near field kindles after the
     ring (uPull 0.45+), the farthest hints complete only as the camera
     settles at the rest. Pure in the pose like everything else here:
     reverse rides retract the field back toward the ring.
     ================================================================ */
  const fieldStats = { t3: 0, t4: 0, hints: 0 };
  {
    const fr = makeRng(0xF1E1D);
    const fg = () => gaussOf(fr);
    const placed = [];
    const want = { t3: 15, t4: 28 };
    let idx = 0, guard = 0;
    while ((fieldStats.t3 < want.t3 || fieldStats.t4 < want.t4) && guard++ < 6000) {
      const right = fr() < 0.66;
      const rel = right ? 0.03 + Math.pow(fr(), 0.9) * 0.60
                        : -0.03 - Math.pow(fr(), 0.9) * 0.55;
      // the frame-left arc of the RING is the composition's far anchor —
      // field bodies on that side start deeper so they sit clearly behind it
      const dist = (right ? 15 : 19) + Math.pow(fr(), 1.30) * (right ? 21 : 17);
      const th = REST_CAM.head + rel;
      const x = REST_CAM.x + Math.cos(th) * dist + fg() * 0.8;
      const z = REST_CAM.z + Math.sin(th) * dist + fg() * 0.8;
      if (cutVal(x, z) < 0.4) continue;               // kept soil only
      if (Math.hypot(x - RING_C.x, z - RING_C.z) < 9.6) continue;  // ring moat
      if (Math.hypot(x, z) < 4.0) continue;           // hero clearance
      // the hero's sky sector stays airy (the trees leave the same gap)
      if (rel > 0.10 && rel < 0.30 && dist > 24 && fr() < 0.5) continue;
      let ok = true;
      for (const q of placed)
        if (Math.hypot(x - q[0], z - q[1]) < 1.15) { ok = false; break; }
      if (!ok) continue;
      const tier = dist < 24 ? 3 : 4;
      if (tier === 3 && fieldStats.t3 >= want.t3) continue;
      if (tier === 4 && fieldStats.t4 >= want.t4) continue;
      // mostly smaller than the ring bodies; an occasional taller one so the
      // field has its own elders ("some smaller, some bigger")
      const h = (tier === 3 ? 0.9 + fr() * 1.3 : 0.7 + fr() * 1.1)
              + (fr() < 0.12 ? 0.8 : 0);
      const mat = 0.25 + fr() * 0.75;
      const distFrac = Math.min(1, Math.max(0, (dist - 14) / 30));
      placed.push([x, z]);
      placeMushroom({
        i: 100 + idx++,
        x, z,
        gy: groundY(x, z),
        h,
        m: mat,
        shed: 0,
        boost: 0.25,
        // brightness hierarchy (the field frames the hero, never buries it):
        // tone slides down the heat ramp and stroke opacity falls with the
        // distance band — far bodies are embers in the haze, not lamps
        lum: tier === 3 ? 0.80 - 0.10 * distFrac : 0.68 - 0.10 * distFrac,
        lumMul: tier === 3 ? 0.70 : 0.52,
        arc: arcOf(x, z),
        reveal: 0.45 + 0.37 * distFrac + fr() * 0.02,
      }, tier);
      fieldStats[tier === 3 ? 't3' : 't4']++;
    }

    // The farthest rung: cap-rim HINTS. A short front-facing rim arc
    // (bright toward the lens, the "glowing rim" signature at its minimum
    // legible density) + a cap ember + a soil pool. The fog does the rest —
    // they dissolve into the warm haze exactly as the horizon does.
    // 18-one-species.md: these used to be hand-rolled CIRCLES of radius
    // h*0.45 built right here — the last independent cap math in the
    // chapter. They now go through the same builder as every other body, on
    // the T_HINT rung of DETAIL, so even the faintest thing in frame traces
    // the hero's own wavy rim at the hero's own cap-to-height ratio.
    guard = 0;
    while (fieldStats.hints < 20 && guard++ < 2000) {
      const rel = -0.50 + fr() * 1.10;
      const dist = 34 + fr() * 12;
      const th = REST_CAM.head + rel;
      const x = REST_CAM.x + Math.cos(th) * dist + fg() * 1.2;
      const z = REST_CAM.z + Math.sin(th) * dist + fg() * 1.2;
      if (cutVal(x, z) < 0.4) continue;
      if (Math.hypot(x - RING_C.x, z - RING_C.z) < 9.6) continue;
      if (rel > 0.10 && rel < 0.30 && fr() < 0.35) continue;   // hero sky gap
      placeMushroom({
        i: 900 + fieldStats.hints,
        x, z,
        gy: groundY(x, z),
        h: 0.6 + fr() * 1.0,
        m: 0.5,
        shed: 0,
        boost: 0,
        arc: arcOf(x, z),
        reveal: 0.80 + fr() * 0.04,
      }, T_HINT);
      fieldStats.hints++;
    }
  }

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
      field: fieldStats,
    },
  };
}
