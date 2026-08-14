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
  TAU, MEMBERS, RING_C, arcOf, cutVal, WOB_IDLE, sweepReveal,
  makeRng, gaussOf, groundY, makeBatch, makeStrandMat, makePointsMat,
} from './world.js';
import { makeGlowTexture, CAP_Y, CAP_R } from '../../anatomy.js';
import {
  buildMushroom, buildCloneSeat, scaleFor, DETAIL, HERO_MUL, STEM_BASE_R,
  HERO_H,
} from './species.js';
import {
  createClones, stepTap, kickTap, isRinging, clearTap, TAP_W,
} from './clones.js';
import {
  bodyVariation, varyPoint, IDENTITY, capRadiusK, heightK, baseRadiusK,
} from './variation.js';
import { createPicker } from './interact.js';
import { createShed } from './shed.js';
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
function memberParams(m, varyOn) {
  const seed = 0x5eed + m.i * 7919;
  const r = makeRng(seed);
  const mat = m.m;
  // THIS BODY'S SHAPE (variation.js, 2026-08-05). Hannah: "make them each
  // their own unique thing." Drawn from its OWN stream, so it cannot shift a
  // single value the placement below already draws from `r`. The 2026-08-04
  // note in this function — "nothing here can change a proportion" — is what
  // this supersedes, and only here: the SHAPE now varies per individual, but
  // it varies by one smooth map of the hero's own form, not by a second
  // parameterisation of it. There is still no cap-dome or stem-taper math
  // outside anatomy.js.
  const V = varyOn ? bodyVariation(seed) : IDENTITY;
  return {
    r, seed, V,
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
    // (the variation round widens this band by V.leanK, x0.8..x1.6 — still
    // under the 11 deg that opened the rim into a saucer)
    leanDir: r() * TAU,
    leanAmt: (0.03 + r() * 0.06) * (0.6 + 0.6 * mat) * V.leanK,
    // heat distribution: which sector of THIS body runs hot, and how hard
    hotDir: r() * TAU, hotAmp: 0.15 + r() * 0.30,
    tw0: r() * TAU,
    // Own sway phase/amplitude for the clone bodies — drawn from a SEPARATE
    // seeded stream so adding them could not shift a single value the
    // species build already draws from `r` (the root stubs read it next).
    ...(() => {
      const sr = makeRng(seed ^ 0x51a7);
      return { swayPhase: sr() * 40, swayAmp: 0.55 + 0.55 * sr() };
    })(),
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

/* ------------------------------------------------------------------ */
/* The clone cutover (18-one-species.md, "Step back: clones")           */
/* ------------------------------------------------------------------ */
// CLONE_DIST is where the hero's own geometry stops and species.js takes
// over. It is a screenshot judgement at the rest, and it was made twice:
//
//   18 units (the ring only, 9 bodies) LEFT A SEAM. The ring members reach
//   16.9 and the nearest field body stands at 17.0 — the two constructions
//   ended up shoulder to shoulder in the same depth band, where a species
//   body is still ~90 px tall and reads as an open wire umbrella beside a
//   solid one. Measured at 2x on the rest frame: unmistakable.
//
//   24 units (the ring plus the whole T3 field band) MOVES THE SEAM to the
//   T3/T4 boundary — a luminance step the composition ALREADY has (doc 17
//   drops stroke opacity 0.70 -> 0.52 across it) and a size step of about
//   half, so the change of construction lands where the frame is already
//   changing. Past 24 a body is under ~40 px of cap and the fog has taken
//   most of it; there is nothing left to tell apart.
//
// The T4 band and the hint rung stay species, and always will: they are
// where the detail ladder is supposed to be doing its job.
const CLONE_DIST = 24;

/** A clone's distance luminance. The clone set rides the CHAPTER's fog ramp
 *  (clones.js, FOG) — 15 -> 62 at the rest, which barely dims anything
 *  inside 24 units — so the depth cue has to be explicit, exactly as it is
 *  for the species field. This lands a clone at the far end of the T3 band
 *  on the same 0.70 the species T3 tier carries (ring.js's lumMul below),
 *  so a clone at 23 and a species body at 25 sit at the same luminance and
 *  the hierarchy the frame is composed around is unbroken: the hero is the
 *  brightest thing in it because it is nearest-and-largest, not because
 *  everything behind it was fogged out. */
function cloneLum(dist) {
  return 1 - 0.45 * smoothstep(8, 23, dist);
}

export function createFinalRing(sceneApi, uniforms) {
  const rand = makeRng(20260417);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();

  const lines = makeBatch();
  const glows = makeBatch();
  const memberStats = [];   // D15 QA: per-member built density
  // WHERE EVERY BODY STANDS, published for canopy.js. Placement is this
  // file's business and always has been, so the root canopy does not
  // re-derive it: it is handed the seats and builds ONE graph over them (see
  // canopy.js's header — a body is a node of the network, not the owner of a
  // root system). Filled by placeMushroom for every rung including the hints.
  const seats = [];

  // The clone set (literal copies of the hero's own scene graph) and the
  // pointer picker. Both are addressed per BODY, so both are fed from
  // placeMushroom below — the one place that knows where a body stands.
  const clones = createClones(sceneApi);
  // The poke's spore shed — one pooled Points draw for every body in the
  // chapter, dark and unticked until something is actually poked.
  const shed = createShed(uniforms);
  // Batched (species) bodies that can be poked: each carries a §10c tap
  // ring-down state and the member ID its vertices were stamped with.
  const pokeMembers = [];
  let nextBodyId = 1;         // 0 is the WebGL generic-attribute default
  // The picker's gate + the poke's answer are defined below §POINTER RESPONSE;
  // this closure is what lets the picker resolve a tap synchronously inside
  // the pointerup event (interact.js §ORDERING) while the state it needs still
  // lives down there.
  const gate = {
    armed: () => pickOn,
    accept: (ref) => lit(ref, uniforms.uPull.value),
    onTap: (hit) => respond(hit),
  };
  const picker = createPicker(sceneApi, gate);

  /* ---- ONE BODY, PLACED ------------------------------------------------
     This function no longer draws a mushroom. It works out where a body
     stands, which detail rung it earns from the rest camera, how the frame
     shades it, and how its strokes carry the reveal — then hands all of that
     to species.js, which owns the silhouette (18-one-species.md).

     tierOverride: the field passes its tier explicitly (its members are
     placed BY distance band, so the band is the tier); ring members keep the
     measured 3-rung ladder.

     wantClone: this body is a RING body, so it is a literal clone of the
     hero's own geometry rather than a species build (see CLONE_DIST above).
     Everything below still runs for it — the pose, the tier, the shading,
     the ground merge, the pick proxy — because all of that is placement's
     work and identical either way; the only fork is whether the TISSUE comes
     from species.js or from the hero. */
  function placeMushroom(m, tierOverride, wantClone) {
    const P = memberParams(m, clones.varyOk);
    const dist = Math.hypot(m.x - REST_CAM.x, m.z - REST_CAM.z);
    const T = tierOverride != null ? tierOverride
      : dist < 8 ? 0 : dist < 14 ? 1 : 2;          // build-time LOD tier
    const C = DETAIL[T];
    const asClone = !!wantClone && dist <= CLONE_DIST;
    // Pointer response: a body answers the pointer if it is big enough on
    // screen to aim at. The farthest hint rung is not — it is a 40-pixel
    // rim arc dissolving into the fog, and a pick proxy there would light
    // something the eye cannot even see it hit.
    const pickable = T !== T_HINT;
    // A SPECIES body lives inside a merged batch and has no node of its own,
    // so the poke's wobble reaches it through an ID stamped onto its vertices
    // (world.js aBody / uWobId). A CLONE has a node and needs none.
    const bodyId = (!asClone && pickable) ? nextBodyId++ : -1;
    // field members answer the growth-front pulse only faintly (m.boost):
    // the RING is what breathes with the colony; the distance echoes it
    const meta = { arc: m.arc, reveal: m.reveal, boost: m.boost ?? 1, body: bodyId };
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
    /* VARIATION, species side (variation.js). This is the ONE funnel every
       species stroke and point passes through, which is why the deformation
       goes here and nowhere else: the far band gets exactly the consistency
       argument the near band gets from sharing one uniform set — every layer
       of a body, without exception, sees the same map.
       species.js emits BODY-frame coordinates that are already multiplied by
       `scale`, and the map is written in hero units, so divide out, map, and
       multiply back. `si` is 1/s hoisted out of the inner loop. */
    const V = P.V, si = 1 / s;
    const _v = [0, 0, 0];
    const w = (px, py, pz) => {
      if (V !== IDENTITY) {
        varyPoint(V, px * si, py * si, pz * si, _v);
        px = _v[0] * s; py = _v[1] * s; pz = _v[2] * s;
      }
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
    // (the variation round stretches the stalk under the rim, so the rim
    // plane rides P.V.stemH — the map pins it there exactly, whatever else
    // the body does)
    const rimWorldY = m.gy + s * CAP_Y * P.V.stemH;
    const elev = (REST_CAM.y - rimWorldY) / Math.max(dist, 1e-3);
    const underVis = 1 - smoothstep(0.02, 0.30, elev) * 0.88;

    /* -- THE BODY. One fork in the whole chapter: a ring body is the hero's
          own geometry standing here (clones.js), everything beyond the moat
          is a species build. The option object is the same either way —
          placement describes a body once. -- */
    const spec = {
      tier: T, seed: P.seed, scale: s, azFacing: P.azFacing,
      mat: m.m, shed: m.shed ?? 0,
      emit, mul: MUL,
      shade: { heatK, occlS, occlM, underVis, crowdK, innerK, camAz: camA },
    };
    let body = null;
    if (asClone) {
      // The clone brings no soil with it (the hero's §8 ground network is
      // not in the stem/cap subtree), so the batch still carries this body's
      // ground-merge pools and its shed trail — atmosphere, not tissue.
      buildCloneSeat(spec);
      body = clones.add({
        x: m.x, z: m.z, gy: m.gy, s,
        azFacing: P.azFacing, leanDir: P.leanDir, leanAmt: P.leanAmt,
        arc: m.arc, reveal: m.reveal, boost: m.boost ?? 1,
        tw0: P.tw0, phase: P.swayPhase, amp: P.swayAmp,
        lum: cloneLum(dist),
        vary: P.V,                                    // this body's own shape
        seed: P.seed,                                 // ...and its own cap figure
      });
    } else {
      buildMushroom(spec);
      body = {
        bodyId, reveal: m.reveal,
        tx: 0, tz: 0, tvx: 0, tvz: 0,                 // tap ring-down (stepTap)
        // where this body stands and how big it is: the wobble pivot, the
        // shed's emission seat and the cap-tap test all need it, and a batched
        // body has no node to read it off
        x: m.x, gy: m.gy, z: m.z, s,
      };
      // only a body with a pick proxy can ever be poked, so only those need
      // to be reachable for the retire sweep — the twenty hints are not here
      if (pickable) pokeMembers.push(body);
    }

    /* -- the pick proxy: one invisible cone bracketing this body, in
          interact.js's detached tree. Never rendered, never traversed. -- */
    if (pickable) {
      // the cone has to bracket the DEFORMED body, so it takes the map's own
      // worst-case extents (rim crest, apex) rather than the nominal ones
      picker.add(m.x, m.gy, m.z,
        Math.max(s * CAP_R * capRadiusK(P.V), 0.22), s * HERO_H * heightK(P.V), body);
    }

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
      // the stubs seat against the stipe's soil-line radius, which the
      // variation round widens per body (stemW + flare) — a bulbous-footed
      // mushroom whose roots started inside its own flesh would read as a
      // body sunk into the floor
      const seatR = STEM_BASE_R * s * baseRadiusK(P.V);
      const r = P.r, g = () => gaussOf(r);
      for (let k = 0; k < C.roots; k++) {
        const a = r() * TAU;
        let dirA = a;
        let px = m.x + Math.cos(a) * seatR;
        let pz = m.z + Math.sin(a) * seatR;
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

    // this body's seat on the canopy: the soil point it stands on, its size
    // (which sets how far out its strands leave the stipe's footprint) and
    // the threshold it kindles at, so the ground under it can kindle with it
    seats.push({ x: m.x, z: m.z, gy: m.gy, s, reveal: m.reveal, tier: T });

    memberStats.push({
      i: m.i, tier: T, h: m.h, clone: asClone, pickable, bodyId,
      dist: +dist.toFixed(2), scale: +s.toFixed(3),
      // world anchor at the cap's rim plane — what a pointer aims at, and
      // what the interaction gate projects to place a synthetic tap
      aim: [+m.x.toFixed(3), +(m.gy + s * CAP_Y * P.V.stemH).toFixed(3), +m.z.toFixed(3)],
      segs: lines.segCount - seg0, pts: glows.ptCount - pt0,
    });
  }

  // The ring: every member is a clone of the hero (18-one-species.md's step
  // back). The hero itself is NOT in MEMBERS — it stands at the origin as the
  // twelfth body and keeps its place on the arc; no clone is ever placed
  // there, and none is built at its scale.
  for (const m of MEMBERS) placeMushroom(m, null, true);

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

    /* ---- THE FIELD'S ARRIVAL: SCATTERED ON AN AUTHORED LADDER (2026-08-09)
       Hannah: "the mushrooms should light up a lot more gradually. It
       should be, like, one at a time — like a Christmas tree, like a town
       of Christmas trees lighting up."

       §12 (2026-08-07) separated order from spacing — rank instead of
       clumped depth — and it was right about the arithmetic and still
       wrong about the clock. Even rank spacing is even in uPULL, and the
       camera does not cross uPull evenly: it accelerates from ~12 to ~25
       units of uPull per unit p into the rest, so a ladder even in uPull
       machine-guns at the end — the last ten arrivals landed inside an
       eighth of a second at a deliberate scroll, and twelve bodies were
       mid-draw at the peak. A wave with good intentions is still a wave.

       So the ladder is now authored in P — the axis the wheel and the eye
       actually traverse — and converted to uPull thresholds through the
       measured camera curve of this leg (18-one-species.md §13: curve,
       derivation, and the before/after tables). FIELD_LADDER below is that
       conversion, baked: arrival slots for the fifteen drawn field bodies,
       interleaved with the ring's own re-timed sweep (world.js
       RING_LADDER) so the whole chapter arrives on ONE 24-slot timeline
       that opens sparse — the first arrivals are singles a beat apart,
       each its own event — and tightens as the town fills toward the rest.

       ORDER — scattered, no longer near-to-far. §12 kept depth order on
       the argument that the front travels outward from the hero; measured
       on screen that is exactly what it looked like — a sweep — and a
       sweep is what "a town of Christmas trees lighting up" is not. A town
       lights in no order at all: a window here, a porch across the valley,
       two more behind you. The stride-7 walk over the depth ranks below
       (7 is coprime to 15, so every rank is visited once) sends each
       consecutive arrival to a different band of the field — far, middle,
       near, far again — which reads as scatter while staying fully
       deterministic and consuming NOTHING from the rand stream.

       The batched far band (T4) keeps its own rank-spread tail out to
       REV_HI: it has no draw-on and 25-45 units of fog between it and the
       lens; it reads as haze filling in behind the town, and haze may
       arrive as weather rather than as trees.

       REV_HI is not a taste number: the light reads the CLAMPED uPull, so
       a body with a threshold past PULL_MAX − REVEAL_W never reaches full
       brightness at all. That ceiling was 0.84 while the clamp sat at 1.0;
       with the rest at p 0.97 and PULL_MAX at the rest's own 1.12
       (world.js, 2026-08-09 §14) it is 0.96 — so the T4 weather-tail now
       stretches to 0.94 and fills in behind the town across the WHOLE
       lengthened arrival instead of finishing while the drawn bodies were
       still opening. Last T4 threshold 0.94 − jit finishes its light at
       ~1.10, inside the rest's 1.12. */
    const CLONE_DIST = 24;               // the T3/T4 seam: clones are nearer than this
    const REV_KNEE = 0.72, REV_HI = 0.94;
    const REV_JIT = 0.005;               // keeps the ladder off a metronome
    // The fifteen field slots of the merged 24-slot ladder, in arrival
    // order (starts p 0.884 → 0.931 on the §14 leg; the ring's nine take
    // the other slots — four opening singles, one mid, four closing).
    // RE-DERIVED 2026-08-09 §14 with the rest at p 0.97: same slot
    // structure, same PERM, re-laid in p across the won road and converted
    // through the §14 measured camera curve.
    const FIELD_LADDER = [0.4116, 0.4789, 0.5937, 0.6383, 0.6748,
                          0.7042, 0.7277, 0.7495, 0.7708, 0.7914,
                          0.8112, 0.8306, 0.8495, 0.8856, 0.9027];
    const cand = [];                     // placements, held for the rank pass
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
      const tier = dist < CLONE_DIST ? 3 : 4;
      if (tier === 3 && fieldStats.t3 >= want.t3) continue;
      if (tier === 4 && fieldStats.t4 >= want.t4) continue;
      // mostly smaller than the ring bodies; an occasional taller one so the
      // field has its own elders ("some smaller, some bigger")
      const h = (tier === 3 ? 0.9 + fr() * 1.3 : 0.7 + fr() * 1.1)
              + (fr() < 0.12 ? 0.8 : 0);
      const mat = 0.25 + fr() * 0.75;
      const distFrac = Math.min(1, Math.max(0, (dist - 14) / 30));
      // The jitter's own draw stays HERE, at exactly the point in the fr()
      // stream it was consumed before, so every placement downstream of it —
      // and therefore the whole field's geometry, and therefore the Final
      // golden — is bit-for-bit what it was. Only what the number is used for
      // has changed (see the rank pass below).
      const jit = fr() * REV_JIT;
      placed.push([x, z]);
      cand.push({
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
        // reveal is assigned in the rank pass below, not here
        dist, tier, jit,
        // the near field band is close enough for its construction to read,
        // so it is clones too — CLONE_DIST puts the seam at the T3/T4 step
      });
      fieldStats[tier === 3 ? 't3' : 't4']++;
    }

    /* ---- THE LADDER PASS -----------------------------------------------
       The drawn band: sort by depth (deterministic), then hand each
       arrival slot a depth rank from the authored permutation below — a
       stride walk that sends consecutive arrivals to different bands of
       the field (jumps of 4-14 ranks), with two authored exceptions at the
       head. Slot 0 is the NEAREST body: it is the biggest thing in the
       composition, and §11.8's stem-before-cap residual makes a mid-draw
       body briefly a stalk under a dark cap — at this body's screen size
       that state must play out early, while the camera is still close and
       the body sits half out of frame, not in the middle of the open view
       (measured on the ladder at p 0.894: a near-black dome the size of a
       quarter of the frame — the shipped tree had the same state on the
       same body at the same rung, so this is containment, not regression).
       Slot 1 is the FARTHEST drawn body — the town's first light across
       the valley, above the soil line and unmissable while the near
       arrival is still half-framed.

       The batched far band keeps §12's rank spread across its own tail.

       The bands are laid out in PLACEMENT order afterwards, so `rand` is
       consumed in precisely the sequence it was before and no body moves,
       changes size, or changes shape. Only its threshold does. */
    {
      const t3 = cand.filter(c => c.tier === 3).sort((a, b) => a.dist - b.dist);
      const PERM = [0, 14, 7, 3, 11, 5, 13, 1, 9, 4, 12, 2, 10, 6, 8];
      FIELD_LADDER.forEach((rv, k) => {
        const r = PERM[k];
        t3[r].reveal = rv + t3[r].jit;
      });
      const t4 = cand.filter(c => c.tier === 4).sort((a, b) => a.dist - b.dist);
      t4.forEach((c, k) => {
        c.reveal = REV_KNEE + (REV_HI - REV_JIT - REV_KNEE)
                 * (t4.length > 1 ? k / (t4.length - 1) : 0) + c.jit;
      });
      for (const c of cand) placeMushroom(c, c.tier, c.tier === 3);
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

    /* ================================================================
       THE LEFT EXTENSION (2026-08-12, Hannah): "on the final section at
       large viewport widths, the ring terminates short of the left edge
       and leaves dead space that reads as an accidental crop. Extend the
       ring so it continues to and bleeds past the left edge."
       ================================================================
       MEASURED CAUSE, and it is an angle, not a width. Everything in this
       chapter is composed in the REST FRAME as an offset `rel` from
       REST_CAM.head, and the frame's own left edge sits at a rel that
       depends only on ASPECT:

         aspect 1.600 (1440x900)   left edge at rel -0.591
         aspect 1.758 (1512x860)   left edge at rel -0.645
         aspect 1.763 (1728x980)   left edge at rel -0.647

       The field's left arm has always stopped at `rel = -0.03 - fr()^0.9 *
       0.55`, i.e. **-0.58**, and the hint rung at -0.50. At 1440x900 that
       -0.58 lands 8 px inside the edge and the band reads as running off
       it. Give the window a browser's real aspect — a 14" or 16" MacBook
       Pro at 1512 or 1728 logical px is ~1.76 once the browser chrome is
       taken out of the height — and the same -0.58 lands ~100 px INSIDE
       the frame, with the last body standing whole and a hard-edged
       hundred-pixel column of nothing to its left. That is Hannah's
       accidental crop, and it is why she sees it at her widths and not at
       the review size. The frame-right side has no such limit: three ring
       members sit at rel +0.67 / +0.80 / +0.86, all of them past the right
       edge at every aspect, so the right has always bled and only the left
       has ever stopped.

       WHY THE RING ITSELF CANNOT BE EXTENDED. The frame-left arc is the az
       279 -> 327 sector; further left along the arc is az < 279, which is
       exactly the az ~140-275 sector the CUTAWAY SLICES AWAY (world.js).
       Those bodies are not missing, they are below the soil-line by
       authorship, and putting fruiting bodies back there would contradict
       the cut face the whole lower-left wedge is built from. So the
       continuation has to come from the FIELD — which is already what
       occupies the band between the last ring body (screen x 365 at
       1728x980) and the edge.

       AND THE CUTAWAY BOUNDS IT, which is the number that sized this band.
       cutVal over the left wedge, at the rest:

         rel -0.55   soil from dist 18      rel -0.70   soil from dist 26
         rel -0.60   soil from dist 22      rel -0.75   soil only at 46
         rel -0.65   soil from dist 26      rel -0.80   none at any distance

       There is no ground to stand on past about rel -0.72, so the band
       below is rel [-0.72, -0.55] and the reach is not a taste choice: it
       is every metre of kept soil there is on that side. It happens to be
       enough — the frame edge is at -0.647, so bodies from -0.65 outward
       land at screen x 0 and beyond, and the band bleeds past the edge at
       every aspect up to 1.85 while overlapping the existing field's own
       -0.58 limit so the two read as one population with no seam.

       ALWAYS PRESENT, NEVER GATED ON WIDTH. These bodies are built at boot
       like every other body and are simply outside the frustum at narrow
       aspects. Gating them on viewport width was considered and is wrong
       here for reasons that are structural, not stylistic: canopy.js lays a
       minimum spanning tree over EVERY body in the chapter, so a body that
       exists only above 1440px would rewire strands that are visible below
       it; the arrival ladder's slots are authored constants against a fixed
       population; the reveal is camera-pure and must not become
       window-pure; the Final goldens would become width-dependent; and a
       resize would have to rebuild the chapter. One world, one build.

       TIER. Every body here lands at dist >= CLONE_DIST by construction —
       the cut leaves no soil nearer than 22 on this side and the band
       starts at 24 — so they are all T4, which IS the right rung for their
       distance under the same `dist < CLONE_DIST ? 3 : 4` rule the rest of
       the field uses. Nothing is added to the T3 clone rung or to its
       fifteen-slot FIELD_LADDER, both of which stay exactly as they were.

       ARRIVAL. They join the T4 weather-tail: thresholds spread by depth
       rank across the same [REV_KNEE, REV_HI] the existing far band uses,
       so they interleave with it rather than arriving as a block, they are
       fully arrived well inside the rest's PULL_MAX, they are dark at the
       arm, and they retract stroke-for-stroke on a reverse scrub because
       aReveal is read against the camera-pure uPull like everything else.

       THE STREAM IS ITS OWN. A fresh rng, and this block runs AFTER every
       existing draw, so not one shipped body moves, changes size, changes
       shape or changes threshold. `placed` is deliberately shared, so the
       extension keeps its 1.15-unit spacing from the bodies already there.
       Left side only: the right already bleeds, and matching it there would
       add cost for a problem that does not exist. */
    {
      const xr = makeRng(0x1EF7ED6E);          // 'left edge'
      const xg = () => gaussOf(xr);
      /* 16 -> 30 -> 22. The middle number was an overshoot and this is the
         correction (2026-08-14, Hannah: "the back left looks a little bit
         too crowded").

         The history in one line: d39b35b put 16 bodies here and she said the
         side was still empty; 6ba7b3f took it to 30 and she now says it is
         crowded. So the answer is between, and the useful part is WHY the
         30 read as crowded when the spacing test says it cannot overlap in
         PLAN.

         It cannot, and that was the error: the test is a 1.15-unit
         separation on the GROUND, and what the frame shows is the caps in
         PROJECTION. These bodies all stand in one narrow angular band (rel
         [-0.72, -0.55]) at one narrow depth (the near-weighted dist rule
         below puts most of them at 24-30), so on screen they sit at nearly
         the same size in nearly the same horizontal run. Two bodies 1.2
         units apart in plan but 25 units away are ~90 px apart on screen
         with ~200 px caps: legally separated on the ground, overlapping
         silhouettes in the frame. Adding bodies to a band that was already
         at its projected limit does not spread them, it stacks their
         outlines — and past roughly two dozen the cap rims stop reading as
         individual mushrooms and merge into one continuous lit ridge with
         no sky notches left between them.

         MEASURED, at the rest, 1728x980. The deep notch of dark sky between
         the big frame-left cap and the one behind it is open at 16, 18, 20
         and 22 bodies and CLOSED at 30 — the two silhouettes have become
         one — and a third rim runs across the gap beside it. 22 is the last
         count at which every cap in the band still resolves as its own
         body, and it is well clear of the thin picket 16 read as.

         Note that lit density did NOT catch this and is a weak metric here:
         the outer-120px band goes 0.215 (16) -> 0.303 (22) -> 0.359 (30) at
         1728x980, a smooth ramp with nothing at the point where the caps
         merge. Crowding is an occlusion property, not a coverage one. The
         density number is kept because it is the honest guard against the
         OTHER complaint (empty black), and 22 sits ~60% of the way from the
         under-composed state to the overshoot, which is where it belongs.

         Everything structural is unchanged: the BAND cannot change (rel
         [-0.72, -0.55] is every metre of kept soil on this side, per the
         cutVal table above), the same 1.15-unit spacing test against
         `placed` still bounds the draw, every body still lands at
         dist >= CLONE_DIST so they are all T4, the T3 clone rung and its
         fifteen-slot FIELD_LADDER stay untouched, and they join the same
         by-depth [REV_KNEE, REV_HI] tail. Same rng in the same draw order,
         so these 22 are the first 22 of the 30 — the eight removed are the
         eight that were drawn last, and no surviving body moves. */
      const WANT = 22;
      const cand = [];
      let g2 = 0;
      while (cand.length < WANT && g2++ < 4000) {
        const rel = -0.55 - Math.pow(xr(), 0.85) * 0.17;      // -0.72 .. -0.55
        const dist = CLONE_DIST + Math.pow(xr(), 1.70) * 15;  // 24 .. 39, near-weighted
        const th = REST_CAM.head + rel;
        const x = REST_CAM.x + Math.cos(th) * dist + xg() * 0.8;
        const z = REST_CAM.z + Math.sin(th) * dist + xg() * 0.8;
        if (cutVal(x, z) < 0.4) continue;                     // kept soil only
        if (Math.hypot(x - RING_C.x, z - RING_C.z) < 9.6) continue;   // ring moat
        let ok = true;
        for (const q of placed)
          if (Math.hypot(x - q[0], z - q[1]) < 1.15) { ok = false; break; }
        if (!ok) continue;
        placed.push([x, z]);
        const distFrac = Math.min(1, Math.max(0, (dist - 14) / 30));
        cand.push({
          i: 700 + cand.length,
          x, z,
          gy: groundY(x, z),
          h: 0.7 + xr() * 1.1 + (xr() < 0.20 ? 0.9 : 0),
          m: 0.25 + xr() * 0.75,
          shed: 0,
          boost: 0.25,
          lum: 0.68 - 0.10 * distFrac,
          lumMul: 0.52,
          arc: arcOf(x, z),
          dist,
          jit: xr() * REV_JIT,
        });
      }
      // interleave with the existing T4 tail: same range, same by-depth rank
      cand.sort((a, b) => a.dist - b.dist);
      cand.forEach((c, k) => {
        c.reveal = REV_KNEE + (REV_HI - REV_JIT - REV_KNEE)
                 * (cand.length > 1 ? k / (cand.length - 1) : 0) + c.jit;
        placeMushroom(c, 4, false);
        fieldStats.t4++;
        fieldStats.left = (fieldStats.left || 0) + 1;
      });

      // and the horizon behind them: the hint rung stops at rel -0.50, so
      // the far haze has the same edge the bodies did. Same band, same rung.
      let g3 = 0;
      /* 6 -> 12 -> 9. Held near the fill pass's number, deliberately, and
         it is worth saying why the crowding correction above did not take
         the hints down with it. A/B at 6 against 9 with everything else
         fixed is visually inert at all three review widths — these are
         T_HINT schematic outlines at dist 34-46, behind and above the body
         band, and they neither occlude a cap nor stack a silhouette. What
         they do carry is the horizon haze, which is the thing that answers
         the OTHER complaint: cutting them is a straight move back toward
         the empty black without buying any calm. 9 keeps the haze and
         tracks the body count down proportionally. */
      while ((fieldStats.leftHints || 0) < 9 && g3++ < 2000) {   // 6 -> 12 -> 9, same band
        const rel = -0.55 - xr() * 0.17;
        const dist = 34 + xr() * 12;
        const th = REST_CAM.head + rel;
        const x = REST_CAM.x + Math.cos(th) * dist + xg() * 1.2;
        const z = REST_CAM.z + Math.sin(th) * dist + xg() * 1.2;
        if (cutVal(x, z) < 0.4) continue;
        if (Math.hypot(x - RING_C.x, z - RING_C.z) < 9.6) continue;
        placeMushroom({
          i: 960 + (fieldStats.leftHints || 0),
          x, z,
          gy: groundY(x, z),
          h: 0.6 + xr() * 1.0,
          m: 0.5,
          shed: 0,
          boost: 0,
          arc: arcOf(x, z),
          reveal: 0.80 + xr() * 0.04,
        }, T_HINT);
        fieldStats.hints++;
        fieldStats.leftHints = (fieldStats.leftHints || 0) + 1;
      }
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
    // sweepReveal: the ring's re-timed CCW ladder (world.js) — the pool
    // still kindles exactly between the members it stands between.
    const meta = { arc, reveal: sweepReveal(arc), boost: 0.5, tw: rand() * TAU };
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

  // The clone bodies. In the CHAPTER's group, never swayGroup: adr-d3 says
  // the field does not ride the hero's wind, and each clone carries its own
  // seeded breeze instead (clones.js update()).
  group.add(clones.group);

  // The poke's spore shed. One Points draw, `visible = false` until a cap is
  // actually rapped — so it is absent from every capture and from every frame
  // of a ride nobody poked.
  group.add(shed.group);

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

  /* ================================================================
     POINTER RESPONSE — A POKE, AND ONLY A POKE (2026-08-05)
     Hannah: "when I hover over the mushrooms at the bottom they still light
     up." They did, and they should never have. The hero's body has no hover
     response: §11's region glow answers the three HUD CALLOUT LABELS
     (main.js -> furniture.js setHighlight) and nothing else, and a pointer
     raycast against the hero's own body does nothing at all. The hero's body
     answers exactly one gesture — a poke — so that is the only gesture the
     field answers. There is no hovered body here, no eased hot value, and no
     brightness term of any kind on a tap; §10c's four answers below are the
     whole response.

     Armed only while the epilogue is on screen AND the pullback has
     actually delivered the field: below PICK_PULL the bodies are still
     kindling out of the dark and must not answer a pointer they are not
     visibly part of yet. Per body, accept() adds the same test on that
     body's OWN reveal, so an unlit member at the far end of the sweep
     cannot be woken early — the D16 no-self-ignition law covers the
     pointer too.
     ================================================================ */
  const PICK_PULL = 0.55;
  const REVEAL_LIT = 0.35;      // this body's own smoothstep must be underway
  // A clone's arrival runs on its OWN window (clones.js drawW — the §14
  // charge/take law), so its poke gate reads the same clock: past 0.5 the
  // charge has crested and the take is beginning, which is when a body is
  // visibly part of the scene. Batched bodies keep the shader-law gate.
  const lit = (ref, pull) => ref.drawW
    ? (uniforms.uPullRaw.value - ref.reveal) / ref.drawW > 0.5
    : (pull - ref.reveal) / 0.16 > REVEAL_LIT;
  let wasOn = false, pickOn = false;

  /* ---- THE POKE, ANSWERED (18-one-species.md, this revision) -------------
     Hannah: "why is the touch-interaction on the new mushrooms different to
     the OG one? make it the same." The hero's answer to a tap (organism §10c)
     is FOUR things, and the field bodies had none of them — only a brightness
     boost. All four are wired below, from the hero's own constants, for both
     constructions. FOUR, and no fifth: the brightness boost that used to ride
     along with them was removed on 2026-08-05, because §10c does not have one
     and this list is the whole of what the hero does.

       1. the cantilever wobble, kicked by the torque r x F at the REAL hit
          point (interact.js's narrow phase) — a clone gets it on its own sway
          pivot, a batched body through the shader's wobble slots;
       2. the light ripple, planted at the fingertip on the hero's OWN shared
          pulse uniforms, so the poked body, its neighbours' near strokes, the
          soil under it and the hero all answer the one wave;
       3. the spore shed, for a cap tap, scaled to the body (shed.js);
       4. the haptic tick, on touch pointers only.

     Everything here runs INSIDE the pointerup event, which is what makes it
     the last word on the frame — see interact.js §ORDERING for the bug that
     buys. ---- */
  const _r = new THREE.Vector3();
  // The two shader wobble slots (world.js uWobId). uWobA / uWobB are the
  // pivot vectors themselves — written in place, shared by every batch.
  const wob = [
    { body: null, pivot: uniforms.uWobA.value },
    { body: null, pivot: uniforms.uWobB.value },
  ];
  /** Give this body a slot: its own if it already has one, else a free one,
   *  else steal the QUIETER of the two — the wobble with least left to say
   *  loses, never the one that was just started. */
  function takeSlot(b) {
    for (const s of wob) if (s.body === b) return s;
    for (const s of wob) if (!s.body) { s.body = b; return s; }
    const energy = (s) =>
      Math.hypot(s.body.tx, s.body.tz) + Math.hypot(s.body.tvx, s.body.tvz) / TAP_W;
    const s = energy(wob[0]) <= energy(wob[1]) ? wob[0] : wob[1];
    clearTap(s.body);
    s.body = b;
    return s;
  }

  function respond({ ref, point, dir, touch }) {
    // 1. MECHANICS. A clone resolves the impulse in its OWN frame (root-local,
    //    hero units) and rings its own scene-graph pivot. A batched body has no
    //    node, so its impulse is taken in WORLD axes with the lever arm scaled
    //    back to hero units — the same law, in the frame its shader rotates in,
    //    and the hero's own frame IS world, so the numbers agree.
    let localY;
    if (ref.root) {
      localY = clones.poke(ref, point, dir).y;
    } else {
      const s = takeSlot(ref);
      s.pivot.set(ref.x, ref.gy, ref.z);
      _r.set((point.x - ref.x) / ref.s,
             (point.y - ref.gy) / ref.s,
             (point.z - ref.z) / ref.s);
      kickTap(ref, _r, dir);
      localY = _r.y;
    }
    // 2. LIGHT. The hero's own uniform objects (world.js heroPulse), so this
    //    one write is the whole scene's answer — and it lands AFTER organism's
    //    own handler has planted its floor swell, correcting it in place.
    //
    //    SCALED TO THE BODY (2026-08-10, Hannah: "little sparkles that float
    //    off the bottom side of the mushroom... they don't look like the same
    //    spores"). The hero's constants are WORLD-sized: wave speed 1.4 u/s,
    //    range falloff exp(-1.5·d) — tuned so a cap tap's ring dies within
    //    about a unit of the fingertip and never reaches the hero's own stem
    //    base four units below. On a 0.3-0.5-scale field body those same
    //    world units cover the WHOLE body plus the floor under it, so one
    //    cap tap glinted every point layer on the underside (stem motes,
    //    bead cloud, base pools) AND the batch's soil lights and canopy
    //    junctions around the base — a wave of white sparkles crawling off
    //    the bottom of the body, which the hero provably never shows
    //    (measured: at +0.25 s a stock tap lit the tapped clone cap-to-
    //    ground-flare; the hero's identical tap leaves everything below its
    //    upper cap untouched). Speed scales BY s and falloff by 1/s, so the
    //    ripple is the hero's own response measured in the body's units —
    //    geometrically similar, dying at the same fraction of the body —
    //    and the floor under a small body stays as dark as the floor under
    //    the hero's cap. s = 1 would reproduce the hero's numbers exactly;
    //    the amplitude is untouched (a tap is the visitor's own force and
    //    answers at full strength on every body, like the wobble).
    uniforms.uPulseC.value.copy(point);
    uniforms.uPulseT.value = 0;
    uniforms.uPulseP.value.set(1.4 * ref.s, 1.5 / ref.s, 1.2); // the hero's tap, in this body's units
    // 3. SPORES. §10c's own cap test (y > 2.8 in hero units), applied in hero
    //    units on every body whatever its size.
    if (localY > 2.8) shed.burst(ref.x, ref.gy, ref.z, ref.s);
    // 4. HAPTIC. One soft tick where the platform offers one.
    if (touch && navigator.vibrate) navigator.vibrate(6);
  }

  /** Advance both wobble slots and publish them. Idle slots park at WOB_IDLE
   *  with a zero rotation — NOT at -1, which every non-body vertex carries. */
  function driveWobble(dt) {
    const ID = uniforms.uWobId.value, R = uniforms.uWobR.value;
    for (let k = 0; k < 2; k++) {
      const s = wob[k];
      if (s.body) {
        stepTap(s.body, dt);
        if (!isRinging(s.body)) { clearTap(s.body); s.body = null; }
      }
      const b = s.body;
      if (k === 0) { ID.x = b ? b.bodyId : WOB_IDLE; R.x = b ? b.tx : 0; R.y = b ? b.tz : 0; }
      else         { ID.y = b ? b.bodyId : WOB_IDLE; R.z = b ? b.tx : 0; R.w = b ? b.tz : 0; }
    }
  }

  function update(t, dt, active) {
    const pull = uniforms.uPull.value;
    const on = !!active && uniforms.uAmount.value > 0.5 && pull > PICK_PULL;
    pickOn = on;
    if (wasOn && !on) {
      // going cold: drop every ring-down outright rather than letting it
      // decay over frames the retiring chapter will not run, so re-entry
      // starts from a body that is not still swinging from a poke nobody in
      // that ride gave it. pokeMembers is sufficient here even though only a
      // body holding a wobble slot can have state — a slot is released by
      // clearTap, so the sweep is belt AND braces for the price of 28 visits.
      for (const b of pokeMembers) clearTap(b);
      for (const s of wob) s.body = null;
      clones.cool();
      shed.cool();
    }
    wasOn = on;
    driveWobble(dt);
    shed.update(t, dt);
    clones.update(t, dt, uniforms);
  }

  return {
    group,
    update,
    /** Every fruiting body's soil seat, for canopy.js. Read once, at
     *  construction — members never move (world.js is deterministic and the
     *  field is scene-parented), so this is a build product, not state. */
    seats,
    setDwell(s) { primUniforms.uDwell.value = s; },
    dispose() { picker.dispose(); clones.disposeFigures(); },
    counts: {
      ringSegs: lines.segCount, glowPts: glows.ptCount,
      primordia: primSize.length, ringMembers: memberStats,
      field: fieldStats,
      clones: clones.counts, pickTargets: picker.count,
      pokeMembers: pokeMembers.length,
    },
    /** LIVE QA (never a `counts` field: index.js SPREADS counts once at
     *  construction, which would freeze these at their boot values). The
     *  two phases' measured cost — both per-tap now, nothing per-frame — and
     *  what the poke is doing right this moment. */
    pickStats: () => ({
      narrowMs: picker.narrowMs, narrowCasts: picker.narrowN,
      broadMs: picker.broadMs, broadCasts: picker.broadN,
      shedLive: shed.live,
      clonesRinging: clones.ringing(),
      wobble: wob.map(s => (s.body ? {
        id: s.body.bodyId,
        deg: +(Math.hypot(s.body.tx, s.body.tz) * 57.3).toFixed(4),
      } : null)),
    }),
  };
}
