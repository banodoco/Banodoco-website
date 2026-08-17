// journey-v6 — FINAL epilogue: terrain cutaway + underground colony (W4-D).
//
// The soil is SLICED along the irregular cut line in final-world.js: the
// kept (far) side carries the surface the ring stands on; the near side is
// removed, exposing the colony in section. The Final camera leg lives
// on the removed side at the rest and on approach, so the frame always reads: surface + ring
// above the lip, cut face falling away below it, living colony beneath —
// the diagonal soil-line of the approved still.
//
// Family: the Owned field. Fine hyphae, a few thicker rhizomorph cords
// carrying slow outward waves (FN-2.5), dark substrate pockets kept intact,
// and the bright underground GROWTH FRONT arc that the reveal pulse and the
// CTA wave travel along.

import * as THREE from 'three';
import {
  TAU, RING_C, MEMBERS, arcOf, cutVal, cutEdgePoint, CUT_N, CUT_S_MIN, CUT_S_MAX,
  makeRng, gaussOf, heat, groundY, makeBatch, makeStrandMat, makePointsMat,
  BATCH_LINE, BATCH_POINT,
} from './world.js';
import { makeGlowTexture } from '../../anatomy.js';
import { isBaked, geometry, payload } from '../../lib/baked.js';

export function createFinalTerrain(sceneApi, uniforms) {
  const rand = makeRng(41719);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();
  const counts = {};
  let soilDissolve = null;   // the slab's uSoilOn uniform (set below)
  let soilBuried = null;     // the slab's uBuried uniform (set below)
  let soil = null;           // the slab mesh — hoisted like the two uniforms
                             // above so the bake-dump return (geometries.soil)
                             // can read it out of §0's block (2026-08-17)

  // ---- baked-read wiring (2026-08-17) --------------------------------
  // The shipped path skips every emission block below (soil slab, surface,
  // cut, aggr, cords, hyph, ends, front, conn) and rebuilds each
  // BufferGeometry from static/geom bytes (baked once at commit time; see
  // journey/lib/baked.js). Materials, the soil uniforms, the haze sprites
  // and the setAmount/setBuried closures stay live either way — only
  // geometry is skipped. ONE try/catch wraps the WHOLE read: any missing
  // key or shape mismatch throws and the chapter falls back to the live
  // builders in full, never a half-baked mix.
  const baked = (() => {
    if (!isBaked('final')) return null;
    try {
      const T = payload('final')?.terrain;
      if (!T || typeof T.soilTris !== 'number' || typeof T.hyphSegs !== 'number'
          || !Array.isArray(T.haze)) {
        throw new Error('final terrain payload mismatch');
      }
      return {
        g: {
          soil: geometry('final/soil', [['position', 3]]),
          surface: geometry('final/surface', BATCH_LINE),
          cut: geometry('final/cut', BATCH_LINE),
          aggr: geometry('final/aggr', BATCH_POINT),
          cords: geometry('final/cords', BATCH_LINE),
          hyph: geometry('final/hyph', BATCH_LINE),
          ends: geometry('final/ends', BATCH_POINT),
          front: geometry('final/front', BATCH_LINE),
          conn: geometry('final/conn', BATCH_LINE),
        },
        counts: {
          soilTris: T.soilTris, surfaceStrokes: T.surfaceStrokes,
          surfaceSegs: T.surfaceSegs, lipRootlets: T.lipRootlets,
          lipStrata: T.lipStrata, cutSegs: T.cutSegs, aggrPts: T.aggrPts,
          cordSegs: T.cordSegs, hyphSegs: T.hyphSegs, frontSegs: T.frontSegs,
          connSegs: T.connSegs, pitStrands: T.pitStrands,
        },
        haze: T.haze,
      };
    } catch (e) {
      return null;
    }
  })();

  /* ================================================================
     0. SOIL OCCLUDER (declutter round). Under additive blending every
        underground stroke — this chapter's colony, the Owned field that
        stays armed through the epilogue, the hero's dipping roots —
        reads THROUGH the surface as a stray line lying ON the floor:
        the core of Hannah's twice-repeated note ("messy lines... along
        the forest floor"). Dimming cannot fix geometry that has no
        occluder, so the kept-side soil is now REAL: an opaque,
        fog-colored slab under the surface plus a face sheet down the
        cut, depth-written in the opaque pass. The colony is visible
        ONLY in the section the cutaway opens — the approved still's
        exact reading — and the growth-front pulse still shows above
        ground through the members it kindles (their aBoost channel)
        and underground where the front crosses the open section.
        The mirror of the hero's own §5 occlusion shells, at 1 draw.
     ================================================================ */
  {
    let g;
    if (baked) {
      g = baked.g.soil;
    } else {
      const pos = [], idx = [];
    const S_N = 44, S0 = CUT_S_MIN - 8, S1 = CUT_S_MAX + 8;
    // non-uniform depth rows into the kept side: dense at the lip where
    // the silhouette matters, sparse toward the horizon
    const DROWS = [0.02, 0.35, 0.9, 1.7, 3.0, 5.0, 8.0, 12.0, 18.0, 27.0];
    for (let i = 0; i <= S_N; i++) {
      const s = S0 + (i / S_N) * (S1 - S0);
      const e = cutEdgePoint(s);
      for (const d of DROWS) {
        const x = e.x + CUT_N.x * d, z = e.z + CUT_N.z * d;
        pos.push(x, groundY(x, z) - 0.06, z);
      }
    }
    const cols = DROWS.length;
    for (let i = 0; i < S_N; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j, b = a + cols;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    // the face: from just inside the lip straight down — the section wall
    const base = pos.length / 3;
    const F_N = 60, YR = [0.0, -1.2, -2.8, -4.6, -7.0];
    for (let i = 0; i <= F_N; i++) {
      const s = S0 + (i / F_N) * (S1 - S0);
      const e = cutEdgePoint(s);
      const x = e.x + CUT_N.x * 0.10, z = e.z + CUT_N.z * 0.10;
      const gy = groundY(x, z) - 0.05;
      for (const dy of YR) pos.push(x, gy + dy, z);
    }
    for (let i = 0; i < F_N; i++) {
      for (let j = 0; j < YR.length - 1; j++) {
        const a = base + i * YR.length + j, b = a + YR.length;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
      g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      counts.soilTris = idx.length / 3;
    }
    // M5 ignition audit (D16): the slab used to appear with group.visible —
    // a binary pop that blacked out the still-visible colony the instant the
    // chapter armed, and un-occluded it just as instantly on a reverse ride.
    // It is now a hashed-alpha dissolve: fragments discard where a screen-
    // space hash exceeds uSoilOn, so the occlusion builds pixel-by-pixel
    // (TAA integrates the stipple into a smooth swallow) while depth writes
    // stay honest for the fragments that remain. At uSoilOn = 1 every
    // fragment survives — identical to the old opaque MeshBasicMaterial.
    // Driven by the orchestrator through setAmount (the rise mask), so the
    // soil solidifies during the underground rise like fog thickening, never
    // as a switch.
    // High-detail transit pass (2026-08-09): the slab is fog-colored so that
    // FROM ABOVE it reads as distance haze under the surface. FROM BELOW —
    // the whole underground stretch of the Owned→Final leg, p ~0.80-0.855 —
    // that same constant color made its silhouette read as torn floating
    // cardboard plates against the black sky ("half-constructed"). uUnder
    // (0 above ground, 1 below; pure in the camera pose, driven by index.js)
    // sinks the slab toward warm near-black while the lens is underground,
    // so overhead it reads as OWNED's dark soil lid — a ceiling of earth,
    // not a stage flat — and it returns to fog tone by the time the camera
    // has pierced and can ever see its far side. The rest frame has
    // uUnder = 0 and is untouched by construction.
    // BURIED (2026-08-11, 17-final-field.md — Hannah, on Owned → Final: "the
    // side gets cropped off, I think, from the side of the fairy ring… it's in
    // an awkward state"). The 2026-08-09 note above says the leg's underground
    // stretch is spent looking at this plate's underside, and it treated that
    // by re-TINTING it. Measured, the situation is worse than a tint can
    // reach, and the measurement is the whole finding:
    //
    //   THE LEG IS BURIED IN THE KEPT SIDE FOR EVERY UNDERGROUND FRAME.
    //   Scanning cutVal along p 0.725–0.970 (41 samples): cutVal runs
    //   +10.06 → +0.56 across p 0.725–0.854 — POSITIVE, i.e. the kept side —
    //   and only crosses zero at p ≈ 0.862, which is AFTER the lens has
    //   already pierced the surface at p 0.8555. The file header's "the Final
    //   camera leg lives entirely on the removed side" is true of the REST and
    //   the approach; it is false of the whole underground traverse.
    //
    // So for p 0.725–0.855 this mesh is not a ceiling overhead — it is the
    // SECTION WALL standing between a buried lens and everything the chapter
    // draws, plus a horizontal plate whose own extent is the horizon. Hiding
    // it at p 0.83 restores a coherent, even underground volume; leaving it
    // gives the hard-edged dark wall down the middle of Hannah's "awkward
    // state", and no widening of the plate's span fixes that (measured: ±8 →
    // ±46 on the tangent and 27 → 66 units of depth moved pure-black pixels
    // by 0.1% — the edge was never the point, the wall was).
    //
    // It is therefore DISSOLVED while the lens is buried, on the same hashed
    // stipple uSoilOn already uses, driven by uBuried — a pure function of
    // camera depth (index.js). This is the exact mirror of OWNED's ceiling
    // being FrontSide-from-below: each soil surface draws only from the side
    // it is FOR. Nothing is lost, because everything this occluder exists to
    // stop ("underground strokes read THROUGH the surface as a stray line
    // lying ON the floor") is a from-ABOVE fault, and above ground uBuried is
    // 0 and this material compiles to the shipped one exactly — the rest, the
    // whole approach and both Final goldens are untouched by construction.
    const soilMat = new THREE.ShaderMaterial({
      uniforms: {
        uSoilOn: { value: 0 },
        uBuried: { value: 0 },
        uSoilCol: { value: new THREE.Color(
          (sceneApi.scene.fog && sceneApi.scene.fog.color) || 0x000000) },
      },
      vertexShader: /* glsl */`
        void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uSoilOn;
        uniform float uBuried;
        uniform vec3 uSoilCol;
        void main() {
          float h = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          // ONE stipple window, two edges: uSoilOn builds the occlusion on
          // arm (D16), uBuried takes it away again as the lens goes under.
          if (h > uSoilOn) discard;
          if (h < uBuried) discard;
          gl_FragColor = vec4(uSoilCol, 1.0);
        }`,
      side: THREE.DoubleSide,
    });
    soil = new THREE.Mesh(g, soilMat);
    soil.frustumCulled = false;
    soil.renderOrder = -10;          // first among opaques
    group.add(soil);
    soilDissolve = soilMat.uniforms.uSoilOn;
    soilBuried = soilMat.uniforms.uBuried;
    // (soilTris is recorded in the live-only branch above — baked reads it
    // from the payload.)
  }

  /* ================================================================
     1. Surface: broken strokes on the kept side — denser along the
        ring band and near the lip, thinning toward the horizon.
     ================================================================ */
  // Declutter round: 520 stroke pairs -> 140, shorter and dimmer, and
  // concentrated in the ring band — the old broadcast scatter was a
  // countable-line carpet over the whole floor ("messy lines... along the
  // forest floor"). Surface density is now carried by the members' ground
  // glow pools (final-ring) + the band glow below, not by strokes.
  //
  /* 2026-08-14 — thinned again, and this block is the literal referent of
     Hannah's phrase. "Reduce maybe 20-30% of the MISCELLANEOUS ANGULAR LINES":
     these strokes are drawn at `const d = rand() * TAU`, a uniformly random
     heading on the ground with no relation to anything else in the frame, and
     there is nothing else in the chapter that fits the description better. The
     canopy's strands go between two nodes; the cords radiate; the rootlets
     leave the lip; §3b's filaments trail out of the cut face. These point
     nowhere, which is exactly their job as texture and exactly the problem
     once the frame has real routes in it to read instead.

     Masked, not re-counted, for the same reason the lip curtain is (see §2):
     §2, §4 and §3 all read further down this same rng, so a smaller loop would
     re-lay the entire cut face and underground colony. Every surviving stroke
     is byte-identical, including the two rand() draws that used to sit inline
     in the emit calls and are hoisted here so a masked stroke still consumes
     them.

     Weighted by DISTANCE TO THE REST LENS, the same rule §3b's mask uses —
     near strokes are large in the frame and land in the foreground band she
     named; far ones are the horizon texture that answers the opposite
     complaint. One metric for both cuts. */
  const surface = makeBatch();
  if (!baked) {
    const surfThin = makeRng(0x5F4CE1);
    const surfKeep = (x, z) => {
      const d = Math.hypot(x + 14.72, z - 2.70);
      const t = Math.max(0, Math.min(1, (d - 7) / 13));
      return 0.55 + 0.40 * t * t * (3 - 2 * t);
    };
    let kept = 0;
    let placed = 0, guard = 0;
    while (placed < 140 && guard++ < 4000) {
      const a = rand() * TAU;
      // density: ring band above all; a whisper elsewhere
      const band = rand();
      const r = band < 0.72 ? 5.2 + rand() * 4.0
              : band < 0.88 ? rand() * 5.0
              : 9.4 + rand() * 7.0;
      const x = RING_C.x + Math.cos(a) * r;
      const z = RING_C.z + Math.sin(a) * r;
      if (cutVal(x, z) < 0.25) continue;
      const y = groundY(x, z);
      const len = 0.35 + rand() * 0.75;
      const d = rand() * TAU;
      const dx = Math.cos(d) * len, dz = Math.sin(d) * len;
      const tone = 0.11 + rand() * 0.11 + (r > 9 ? -0.05 : 0);
      const mx = x + dx * 0.5, mz = z + dz * 0.5;
      // hoisted so the mask cannot change the stream (see the header above)
      const yJit = rand() * 0.02;
      const tw1 = rand() * TAU, tw2 = rand() * TAU;
      if (surfThin() < surfKeep(x, z)) {
        surface.seg(x, y + 0.02, z, mx, groundY(mx, mz) + 0.03 + yJit, mz,
          tone, tone * 1.1, { tw: tw1, boost: 0.25, arc: arcOf(x, z) });
        surface.seg(mx, groundY(mx, mz) + 0.03, mz, x + dx, groundY(x + dx, z + dz) + 0.02, z + dz,
          tone * 1.1, tone * 0.8, { tw: tw2, boost: 0.25, arc: arcOf(x, z) });
        kept++;
      }
      placed++;
    }
    counts.surfaceStrokes = kept;
  }
  const surfMat = makeStrandMat(uniforms, 0.5);
  const surfLines = new THREE.LineSegments(baked ? baked.g.surface : surface.geo(), surfMat);
  surfLines.frustumCulled = false;
  group.add(surfLines);
  counts.surfaceSegs = surface.segCount;

  /* ================================================================
     2. The cut: bright broken lip + soil face falling away beneath it
     ================================================================ */
  const cut = makeBatch();
  if (!baked) {
    // the lip: a warm, nearly continuous bright edge — the soil-line the
    // whole composition hangs on (the approved still's brightest terrain
    // feature). Two passes: a continuous core + broken overhang ticks.
    const N = 160;
    // near-camera taper (declutter round): the lip's low-s end passes a few
    // units from the rest lens, where full tone + bloom smeared into a hot
    // bar at the bottom-right frame edge. Brightness eases off as the lip
    // approaches the camera.
    const nearK = (x, z) => {
      const d = Math.hypot(x + 14.72, z - 2.70);   // dist to rest cam
      const k = Math.max(0, Math.min(1, (d - 4.5) / 5.5));
      return 0.35 + 0.65 * k * k * (3 - 2 * k);
    };
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const s = CUT_S_MIN + (i / N) * (CUT_S_MAX - CUT_S_MIN);
      const p = cutEdgePoint(s);
      const v = [p.x + gauss() * 0.05, groundY(p.x, p.z) + 0.02 + gauss() * 0.02, p.z + gauss() * 0.05];
      if (prev && rand() > 0.08) {
        const t = (0.55 + rand() * 0.2) * nearK(p.x, p.z);
        cut.seg(prev[0], prev[1], prev[2], v[0], v[1], v[2], t, t,
          { tw: rand() * TAU, boost: 0.35, arc: arcOf(p.x, p.z) });
      }
      // overhang ticks breaking over the edge (declutter: rarer)
      if (rand() < 0.14) {
        const t = 0.34 + rand() * 0.16;
        cut.seg(v[0], v[1], v[2],
          v[0] - 0.2 - rand() * 0.3, v[1] - 0.1 - rand() * 0.25, v[2] + gauss() * 0.2,
          t, t * 0.4, { tw: rand() * TAU });
      }
      prev = v;
    }
    // the face: the section through the substrate. Declutter round: the
    // 130-drop scratch curtain halved and dimmed — the LIP is the statement,
    // the face falls to darkness fast.
    //
    // High-detail transit pass (2026-08-09): the drops were single straight
    // segments, y0 -> y0 - depth, at constant tone until a hard tail — from
    // the rest they read as a fringe of parallel HANGING WIRES off the lip
    // (Hannah: "stuff hanging off the edge of the fairy ring"), and in close
    // passage (p 0.865-0.895, frame left) as loose cables. Each drop is now
    // a three-segment ROOTLET: it leaves the lip, curves back toward the cut
    // face (along -CUT_N, so it hugs the section wall instead of dangling in
    // the void), sways along the lip tangent, dims to near-nothing by its
    // tip, and ends with a dim oblique root-tip flick — the strand ends by
    // TURNING and dissolving, never by stopping mid-air. Depth is biased
    // short; only a few reach past a unit.
    //
    /* THE THINNING MASK (2026-08-14, Hannah's fairy-ring brief: "reduce maybe
       20-30% of the miscellaneous angular lines, particularly in the very
       bottom foreground and immediately around/behind the copy", and her
       separate note on the frame-left mushroom: "the background behind this
       leftmost mushroom still feels quite busy — clean that up until it feels
       populated but not crowded").

       This curtain is the largest single contributor to that second report.
       Sixty rootlets and fifty-four strata along the lip read from the rest as
       a picket of short countable dashes directly behind the frame-left caps —
       the exact region of her screenshot.

       IT IS A MASK, NOT A SMALLER LOOP, and that is the whole of the
       implementation note. Every iteration still runs and still draws every
       rand() it drew before; only the EMISSION is gated, on a decision taken
       from a separate rng. So the rootlets that survive are byte-identical to
       the ones that shipped, and §3's hyphae and §4's cords — which read from
       the same stream further down this function — do not move by a
       millimetre. A smaller loop count would have re-laid the entire
       underground colony in order to remove eighteen dashes.

       WEIGHTED ALONG THE LIP. s runs CUT_S_MIN..CUT_S_MAX, and §3b's own
       header measures what that means in the frame: the low-s end is the far
       wall across the pit at frame-LEFT (22 units out, 12.8 to the left of
       the view axis) and the high-s end is the near right corner. Her crowded
       region is the low end, so the mask bites there and lets the near corner
       — already held down by the lip's own nearK taper — through nearly
       untouched. */
    const thin = makeRng(0x7417ED);
    const lipKeep = (s) => {
      const u = (s - CUT_S_MIN) / (CUT_S_MAX - CUT_S_MIN);   // 0 = frame-left
      return 0.56 + 0.38 * u;
    };
    let rootKept = 0, strataKept = 0;
    for (let i = 0; i < 60; i++) {
      const s = CUT_S_MIN + rand() * (CUT_S_MAX - CUT_S_MIN);
      const p = cutEdgePoint(s);
      const x = p.x + gauss() * 0.2, z = p.z + gauss() * 0.2;
      const y0 = groundY(x, z);
      const depth = 0.5 + Math.pow(rand(), 1.7) * 1.5;
      const t0 = 0.34 + rand() * 0.16;
      const tw = rand() * TAU;
      const swayS = gauss() * 0.26;                 // along the lip tangent
      const hugN = -(0.08 + rand() * 0.18);         // back toward the face
      const SEG = 3;
      const keep = thin() < lipKeep(s);
      if (keep) rootKept++;
      let px = x, py = y0, pz = z;
      for (let k = 1; k <= SEG; k++) {
        const f = k / SEG;
        const ease = f * (0.55 + 0.45 * f);         // accelerating fall
        const nx = x + (-CUT_N.z) * swayS * f + CUT_N.x * hugN * f * f + gauss() * 0.05;
        const nz = z + CUT_N.x * swayS * f + CUT_N.z * hugN * f * f + gauss() * 0.05;
        const ny = y0 - depth * ease;
        if (keep) cut.seg(px, py, pz, nx, ny, nz,
          t0 * (1 - ((k - 1) / SEG) * 0.85), t0 * (1 - f * 0.85), { tw });
        px = nx; py = ny; pz = nz;
      }
      // root-tip flick: a last dim oblique turn, dying out
      const fx = px + gauss() * 0.16 + CUT_N.x * hugN * 0.4;
      const fy = py - 0.05 - rand() * 0.10;
      const fz = pz + gauss() * 0.16 + CUT_N.z * hugN * 0.4;
      if (keep) cut.seg(px, py, pz, fx, fy, fz, t0 * 0.15, 0.02, { tw });
    }
    // horizontal strata: broken layer lines a little below the lip. Transit
    // pass: a few more, biased shallower, so the rootlet curtain reads as
    // threading through bedded soil rather than hanging in front of nothing.
    for (let i = 0; i < 54; i++) {
      const s = CUT_S_MIN + rand() * (CUT_S_MAX - CUT_S_MIN);
      const p = cutEdgePoint(s);
      const d = 0.25 + Math.pow(rand(), 1.6) * 2.2;
      const y = groundY(p.x, p.z) - d;
      const len = 0.4 + rand() * 1.0;
      const t0 = (0.34 + rand() * 0.16) * (1 - d * 0.28);
      const dirS = rand() < 0.5 ? -1 : 1;
      const q = cutEdgePoint(s + dirS * len);
      const ax = p.x + gauss() * 0.1, az = p.z + gauss() * 0.1;
      const bx = q.x + gauss() * 0.1, by = y + gauss() * 0.1, bz = q.z + gauss() * 0.1;
      const tws = rand() * TAU;
      // same mask, same reasoning (see the rootlets above) — the strata are
      // the other half of the picket behind the frame-left caps
      if (thin() < lipKeep(s)) {
        cut.seg(ax, y, az, bx, by, bz, t0, t0 * 0.6, { tw: tws });
        strataKept++;
      }
    }
    counts.lipRootlets = rootKept;
    counts.lipStrata = strataKept;
  }
  const cutMat = makeStrandMat(uniforms, 0.72);
  const cutLines = new THREE.LineSegments(baked ? baked.g.cut : cut.geo(), cutMat);
  cutLines.frustumCulled = false;
  group.add(cutLines);
  counts.cutSegs = cut.segCount;

  // soil aggregates: fine points peppering the lip + face, plus a row of
  // brighter beads ALONG the lip itself (the still's glowing soil-line)
  const aggr = makeBatch();
  if (!baked) {
  for (let i = 0; i < 130; i++) {
    const s = CUT_S_MIN + rand() * (CUT_S_MAX - CUT_S_MIN);
    const p = cutEdgePoint(s);
    const x = p.x + gauss() * 0.3, z = p.z + gauss() * 0.3;
    const y = groundY(x, z) - Math.pow(rand(), 1.6) * 3.4 + 0.04;
    aggr.pt(x, y, z, 0.30 + rand() * 0.24, 0.018 + Math.pow(rand(), 2) * 0.05,
      { tw: rand() * TAU });
  }
  // Declutter round — colony glow pools: broad soft light in the exposed
  // section (the lower-left wedge), doing with ATMOSPHERE what the culled
  // hyphae scribbles used to do with strokes. Biased toward negative s
  // (frame-left) — part of the left-of-frame rebalance.
  for (let i = 0; i < 12; i++) {
    const s = CUT_S_MIN + 2 + rand() * ((CUT_S_MAX - CUT_S_MIN) * 0.6);
    const p = cutEdgePoint(s);
    const x = p.x - (0.4 + rand() * 1.6), z = p.z + gauss() * 0.8;
    const y = groundY(p.x, p.z) - 0.8 - rand() * 2.2;
    aggr.pt(x, y, z, 0.30 + rand() * 0.18, 0.55 + rand() * 0.75,
      { tw: rand() * TAU, boost: 0.3, arc: arcOf(x, z) });
  }
  // Growth-front glow carriers (declutter round): soft points along the
  // underground front arc (same pure formula as the front strokes in §5),
  // boost 1 so the travelling pulse + CTA wave read as a moving GLOW under
  // the soil, letting §5 keep far fewer of its stroke verticals.
  for (let i = 0; i < 44; i++) {
    const arc = i / 44;
    const az = arc * TAU + Math.atan2(0.8, 6.0);
    const r = 6.4 + 1.1 * Math.sin(arc * TAU * 2.3 + 1.0) + gauss() * 0.25;
    const x = RING_C.x + Math.cos(az) * r;
    const z = RING_C.z + Math.sin(az) * r;
    aggr.pt(x, -0.5 - rand() * 0.9, z, 0.34 + rand() * 0.14,
      0.16 + rand() * 0.22, { tw: rand() * TAU, boost: 1, arc, reveal: -1 });
  }
  for (let i = 0; i < 70; i++) {
    const s = CUT_S_MIN + rand() * (CUT_S_MAX - CUT_S_MIN);
    const p = cutEdgePoint(s);
    // same near-camera taper as the lip strokes (declutter round)
    const dNear = Math.hypot(p.x + 14.72, p.z - 2.70);
    const kN = Math.max(0, Math.min(1, (dNear - 4.5) / 5.5));
    aggr.pt(p.x + gauss() * 0.08, groundY(p.x, p.z) + 0.03, p.z + gauss() * 0.08,
      (0.62 + rand() * 0.24) * (0.35 + 0.65 * kN * kN * (3 - 2 * kN)),
      0.07 + Math.pow(rand(), 2) * 0.1,
      { tw: rand() * TAU, boost: 0.4, arc: arcOf(p.x, p.z) });
  }
  /* Colony glow pools, part two (2026-08-13 — the left-of-frame fill).
     The twelve above sit within ~2 units of the lip. The pit itself — the
     lower-left third of the rest frame, 6-11 units out from the lens and
     entirely on the removed side — had no atmosphere at all, so the void
     strands of §3b would have been the only thing in it and would have
     read as strokes on black. These are broad, dim, low pools set DEEPER
     into the cut and further out from the wall, on the same frame-left
     weighting: they give the pit a floor of light to sit against, which is
     what makes the strands read as depth rather than as debris.
     Fresh rng, appended after every existing `aggr` draw, so no shipped
     point moves; same boost/arc grammar, same camera-pure rise.

     KEPT WHOLE at 22 through the 2026-08-14 crowding correction, while the
     §3b strand count came down 150 -> 80. These have no edges to count:
     they are broad, dim, sub-lip light. They carry the "not empty black"
     half of the brief at zero cost to the "not busy" half, which is exactly
     what let the strand count fall as far as it did. */
  {
    const pr = makeRng(0x9001C001);            // 'pool'
    const pg = () => gaussOf(pr);
    for (let i = 0; i < 22; i++) {
      const s = CUT_S_MIN + Math.pow(pr(), 1.7) * (CUT_S_MAX - CUT_S_MIN);
      const p = cutEdgePoint(s);
      const out = 1.2 + Math.pow(pr(), 0.8) * 4.6;      // out into the void
      const x = p.x - CUT_N.x * out + pg() * 0.9;
      const z = p.z - CUT_N.z * out + pg() * 0.9;
      const y = groundY(p.x, p.z) - 1.4 - pr() * 3.6;
      aggr.pt(x, y, z, 0.16 + pr() * 0.13, 0.9 + pr() * 1.5,
        { tw: pr() * TAU, boost: 0.22, arc: arcOf(x, z) });
    }
  }
  }

  const glowTex = makeGlowTexture();
  const aggrMat = makePointsMat(uniforms, 0.6, glowTex);
  const aggrPts = new THREE.Points(baked ? baked.g.aggr : aggr.geo(true), aggrMat);
  aggrPts.frustumCulled = false;
  group.add(aggrPts);
  counts.aggrPts = aggr.ptCount;

  /* ================================================================
     4. Rhizomorph cords: 6 thicker polylines radiating outward from
        the colony interior, crossing under the growth front; two head
        toward the camera side and are CUT at the face — bright section
        ends visible in the wedge. Slow outward waves via aWave.
        (Built before §3 since the transit pass seeds hyphal twigs on
        real cord samples — the fine threads leave the arteries.)
     ================================================================ */
  // High-detail transit pass (2026-08-09): the Owned→Final camera crosses
  // this colony at close range (p ~0.80-0.855), where two authored-for-the-
  // rest choices fell apart. (1) The double stroke was a CONSTANT vertical
  // 0.055 offset — at 12 units it reads as thickness, at 3 it reads as tram
  // rails. The gap now breathes along the cord's length (0.024-0.056, two
  // incommensurate harmonics) and the twin runs at 0.78 of the main tone, so
  // the pair reads as one braided cord with a lit core. (2) 13 segments over
  // ~10 units left visible kinks; the walk now takes 26 half-steps with the
  // per-step jitter halved — same path family, same endpoints, half the
  // elbow angle.
  const cords = makeBatch();
  const cordEnds = [];
  const cordNodes = [];   // declutter round: lit junctions along the cords
  const cordPts = [];     // transit pass: samples the hyphal twigs grow from
  if (!baked) {
    const CORD_AZ = [12, 68, 118, 195, 250, 310];   // deg about C; 195/250 cross the void
    CORD_AZ.forEach((azDeg, ci) => {
      const a0 = (azDeg * Math.PI) / 180 + gauss() * 0.08;
      let x = RING_C.x + Math.cos(a0) * 1.2, z = RING_C.z + Math.sin(a0) * 1.2;
      let y = -1.1 - rand() * 1.2;
      const SEG = 26;
      const bright = 0.4 + rand() * 0.2;
      const tw0 = rand() * TAU;
      let px = x, py = y, pz = z;
      for (let s = 1; s <= SEG; s++) {
        const t = s / SEG;
        const rr = 1.2 + t * (8.6 + rand() * 1.6);
        const aa = a0 + Math.sin(t * 2.6 + ci) * 0.16 + gauss() * 0.01;
        x = RING_C.x + Math.cos(aa) * rr;
        z = RING_C.z + Math.sin(aa) * rr;
        y = Math.min(-0.5, y + gauss() * 0.16 - 0.03);
        // cords under the void get cut at the face: stop and mark the end
        if (cutVal(x, z) < 0.2 && cutVal(px, pz) >= 0.2) {
          cordEnds.push([px, py, pz]);
          break;
        }
        // double stroke = thickness reading; the gap breathes (see header)
        const gap = 0.040 + 0.016 * Math.sin(t * 7.3 + ci * 2.1)
                  + 0.008 * Math.sin(t * 17.9 + tw0);
        let strokeI = 0;
        for (const off of [0, gap]) {
          const dim = strokeI++ === 0 ? 1 : 0.78;
          cords.seg(px, py + off, pz, x, y + off, z,
            bright * (1 - t * 0.45) * dim, bright * (1 - (t + 1 / SEG) * 0.45) * dim,
            { tw: tw0, wave: 1, arc: t, boost: 0.15 });
        }
        // lit junction nodes riding the cord (the approved still's network
        // is bright connected cords with glowing nodes — glow, not strokes)
        if (rand() < 0.15)
          cordNodes.push([x, y + 0.03, z, bright * (1 - t * 0.35)]);
        cordPts.push([x, y, z, bright * (1 - t * 0.45)]);
        px = x; py = y; pz = z;
      }
    });
  }
  const cordMat = makeStrandMat(uniforms, 0.72);
  const cordLines = new THREE.LineSegments(baked ? baked.g.cords : cords.geo(), cordMat);
  cordLines.frustumCulled = false;
  group.add(cordLines);
  counts.cordSegs = cords.segCount;

  /* ================================================================
     3. Underground colony: fine hyphae everywhere beneath the ring
        interior AND exposed in the void the cut opens — the pre-
        existing wider organism the fruiting bodies emerge from.
     ================================================================ */
  // Declutter round: 850 -> 300 scribbles, dimmer and pushed DEEPER — under
  // additive blending every underground stroke reads THROUGH the soil as a
  // stray line lying on the floor, so the fine-hyphae texture is halved and
  // sunk while the cords + colony glow pools carry the network reading.
  //
  // High-detail transit pass (2026-08-09): the scribbles were 2 segments of
  // pure gauss noise — at the rest's 12 units they read as texture, but the
  // camera now CROSSES this field and each one resolved as a disconnected
  // floating dash ("broken lines... half-constructed"). Three changes, same
  // light budget:
  //   · FILAMENTS, not scribbles: 5 half-length steps with a persistent
  //     heading (momentum 0.68) and a tail that dims to 20% — a thread that
  //     travels and dissolves, never a dash that stops.
  //   · TWIGS: 150 short threads seeded ON cordPts — the fine field visibly
  //     leaves the arteries, so close passage reads as one organism.
  //   · THE VOID EDGE DISSOLVES: survival beyond the cut face now decays
  //     with distance (none past ~2.6 units) and the survivors dim with
  //     depth into the void, so the removed side fades to true absence
  //     instead of stranding bright floaters in open black (the rest
  //     frame's lower-left).
  const hyph = makeBatch();
  if (!baked) {
    let placed = 0, guard = 0;
    while (placed < 300 && guard++ < 9000) {
      const a = rand() * TAU;
      const r = Math.pow(rand(), 0.7) * 11.5;
      let x = RING_C.x + Math.cos(a) * r;
      let z = RING_C.z + Math.sin(a) * r;
      // hyphae live under kept soil AND stand exposed in the void near the
      // face (the section view) — density decays into the void (see header)
      const cv = cutVal(x, z);
      if (cv < 0 && rand() < Math.min(0.96, -cv / 2.6)) continue;
      let y = -0.55 - Math.pow(rand(), 1.4) * 3.5;
      // dark pockets stay dark (two authored voids)
      if (Math.hypot(x + 3.4, y + 2.4, z - 3.0) < 1.5) continue;
      if (Math.hypot(x + 8.6, y + 2.0, z + 4.6) < 1.4) continue;
      const voidDim = cv < 0 ? Math.max(0.4, 1 + cv * 0.24) : 1;
      const bright = (0.11 + rand() * 0.17) * voidDim;
      const SEG = 5;
      let px = x, py = y, pz = z;
      // persistent heading: a filament that travels, not a scribble
      let hx = gauss(), hy = gauss() * 0.35, hz = gauss();
      const hl = Math.hypot(hx, hy, hz) || 1;
      hx /= hl; hy /= hl; hz /= hl;
      const arc = arcOf(x, z);
      const tw = rand() * TAU;
      for (let sgi = 0; sgi < SEG; sgi++) {
        const step = 0.42 + rand() * 0.22;
        hx = hx * 0.68 + gauss() * 0.32;
        hy = hy * 0.68 + gauss() * 0.13;
        hz = hz * 0.68 + gauss() * 0.32;
        const nl = Math.hypot(hx, hy, hz) || 1;
        hx /= nl; hy /= nl; hz /= nl;
        const nx = px + hx * step;
        const ny = Math.min(-0.45, py + hy * step);
        const nz = pz + hz * step;
        const f0 = 1 - (sgi / SEG) * 0.8, f1 = 1 - ((sgi + 1) / SEG) * 0.8;
        hyph.seg(px, py, pz, nx, ny, nz,
          bright * f0, bright * f1,
          { tw, boost: 0.3, arc });
        px = nx; py = ny; pz = nz;
      }
      placed++;
    }
    // the twigs: fine threads leaving the arteries (see header)
    for (let i = 0; i < 150 && cordPts.length; i++) {
      const cp = cordPts[(rand() * cordPts.length) | 0];
      const tone = Math.min(0.24, cp[3] * (0.45 + rand() * 0.3));
      const tw = rand() * TAU;
      let px = cp[0], py = cp[1], pz = cp[2];
      let hx = gauss(), hy = -Math.abs(gauss()) * 0.5, hz = gauss();
      const hl = Math.hypot(hx, hy, hz) || 1;
      hx /= hl; hy /= hl; hz /= hl;
      const arc = arcOf(px, pz);
      for (let k = 0; k < 2; k++) {
        const step = 0.22 + rand() * 0.20;
        hx = hx * 0.7 + gauss() * 0.3;
        hy = hy * 0.7 + gauss() * 0.18;
        hz = hz * 0.7 + gauss() * 0.3;
        const nl = Math.hypot(hx, hy, hz) || 1;
        const nx = px + (hx / nl) * step;
        const ny = Math.min(-0.45, py + (hy / nl) * step);
        const nz = pz + (hz / nl) * step;
        hyph.seg(px, py, pz, nx, ny, nz,
          tone * (1 - k * 0.5), tone * (0.5 - k * 0.35),
          { tw, boost: 0.3, arc });
        px = nx; py = ny; pz = nz;
      }
    }
  }
  /* ================================================================
     3b. THE SECTION TRAILS OFF INTO THE CUT (2026-08-13, Hannah): "in the
         final section, the area to the left of the text currently contains
         a large amount of empty black space and feels under-composed...
         visible mycelial/network structures... subtle organic details that
         connect back to the rest of the mushroom system."
     ================================================================
     WHERE THE EMPTINESS ACTUALLY IS, MEASURED. Unprojecting the rest frame
     at 1728x980 and reading cutVal at the ground plane under each pixel:

       screen (80,700)  -> ( -9.34, -5.46) dist 10.2  cutVal -2.62
       screen (250,760) -> ( -9.72, -3.37) dist  8.3  cutVal -2.05
       screen (420,830) -> (-10.12, -1.68) dist  6.9  cutVal -1.88
       screen (150,900) -> (-11.18, -2.32) dist  6.7  cutVal -3.08
       screen (80,460)  -> (  0.09,-19.05) dist 26.5  cutVal +2.91  KEPT

     The whole lower half of the frame is the REMOVED side. It is not an
     under-populated field — it is the excavation, and there is no ground
     there to stand anything on. d39b35b's left extension could only reach
     the kept band along the horizon (screen y < ~500), which is why the
     dead area survived it.

     SO THE THING THAT BELONGS THERE IS THE SECTION ITSELF. §3 already
     exposes the colony in the void near the face and then deliberately
     stops: "survival beyond the cut face now decays with distance (none
     past ~2.6 units)... so the removed side fades to true absence instead
     of stranding bright floaters in open black (the rest frame's
     lower-left)". That is the authored emptiness Hannah is now reporting,
     and the note names the real hazard exactly: FLOATERS. The answer is
     not to relax the decay and scatter loose strokes into the black — that
     is the countable-dash carpet the declutter round removed — it is to
     give the void strands an ANCHOR, so what fills the pit is visibly the
     severed network trailing out of the wall rather than debris hanging in
     front of it.

     Every filament here therefore STARTS ON THE CUT FACE — on the lip or
     down the section wall — and travels out into the removed side, sagging
     under its own length, dimming continuously to nothing by its tip. It
     is the same three-vocabulary the file already speaks (§2's rootlets
     leave the lip, §3's filaments travel with momentum, §4's cords are cut
     at the face and glint); this is those cut ends CONTINUING, which is
     what a section through a living network looks like when you stand
     inside the hole.

     WEIGHTED TO FRAME-LEFT, which is the LOW-s end: with the rest lens at
     (-14.72, 2.70) and the cut running s -14..+10, cutEdgePoint(-14) is
     ( -2.75, -15.81) — 22.0 units out and 12.8 to the left of the view
     axis — while cutEdgePoint(+10) is (-10.69, 6.85), 5.8 units out and
     5.4 to the RIGHT. The right end is the near corner the lip's own
     nearK taper already holds down; the left end is the far wall across
     the empty pit. Density falls off with s so the near-right corner gains
     almost nothing and the frame-left wall gains most.

     A FRESH RNG, and this block runs after every existing draw into `hyph`,
     so not one shipped stroke moves. Reveal is left at the batch default
     (-1, "always lit"), which is what every other stroke on this face
     carries: the cut face is gated by the chapter's camera-pure rise mask
     (uAmount), so it is dark at the arm, arrives with the rise, and
     retracts stroke-for-stroke on a reverse scrub — the same law, not a
     second one. Nothing here is a fruiting body, so nothing enters the
     bodies' uPull ladder or the canopy's node set. */
  if (!baked) {
    const vr = makeRng(0x5EC7104E);            // 'section'
    const vg = () => gaussOf(vr);
    const S_LO = CUT_S_MIN, S_SPAN = CUT_S_MAX - CUT_S_MIN;
    // the face's own tangent, so a strand can run ALONG the wall as
    // readily as away from it (see the CURL note below)
    const TGx = -CUT_N.z, TGz = CUT_N.x;
    /* 150 -> 80 (2026-08-14, Hannah: "the back left looks a little bit too
       crowded"). This block is the larger half of that report, and the
       failure mode is the one the header above names and then walks into.

       The header is right that a persistent curl beats per-step noise, and
       it does — each strand on its own is a smooth arc. What it does not
       account for is how many arcs the frame can hold before the arcs stop
       being the unit you read. At 150 strands x ~11.5 segments the pit
       carried 1,723 line segments in the lower-left third, and at that
       count the eye stops resolving individual strands and integrates them
       into a MAT: a field of crossing strokes with no figure, which is the
       countable-dash carpet by another route. The declutter round's lesson
       was about stroke count, and the curl fixed the character of each
       stroke without touching the count.

       80 is where the strands are still countable as strands. Compared at
       0 / 60 / 80 / 100 / 150 on the frame: the pit reads as severed
       network trailing out of the wall up to about 80, begins to hatch at
       100, and is a mat at 150.

       WHAT IS NOT CUT, and this is the load-bearing half of the fix: the
       22 second-bank colony glow pools below stay at 22. They are the
       reason this count could come down as far as it did. The pools are
       ATMOSPHERE — broad, dim, sub-lip light with no edges — so they add
       floor to the pit without adding anything to count, and they answer
       "empty black space" directly while contributing nothing to "busy".
       Cutting strokes and keeping light is the whole trade; cutting both
       would land back on the emptiness this block was built to fill. */
    /* 2026-08-14 (Hannah's fairy-ring brief): "reduce maybe 20-30% of the
       miscellaneous angular lines, PARTICULARLY IN THE VERY BOTTOM FOREGROUND
       and immediately around/behind the copy."

       The bottom foreground of this frame is this block, and the previous pass
       (60c7370) already argued its count down 150 -> 80 on a whole-frame
       judgement. What it did not do — because its own finding had not been
       written down yet — is spend the cut where the frame actually pays for
       it. Its lesson was: A RULE THAT BOUNDS THINGS ON THE GROUND SAYS NOTHING
       ABOUT WHAT THE LENS SEES, and a uniform count cut is exactly such a
       rule. Every strand costs the same one of eighty either way, but a strand
       starting six units from the lens paints something like sixteen times the
       pixels of one starting twenty-four units out, and lands them in the
       bottom of the frame at full size where nothing else is competing.

       So the mask is a function of DISTANCE TO THE REST LENS, not of index:
       near strands are mostly dropped and far ones mostly kept. That takes the
       cut out of the very bottom foreground she named, and leaves it where
       6ba7b3f put it for a reason — the far wall across the pit, which is the
       "large amount of empty black space" this block exists to answer. The two
       reports are only compatible along this axis; a uniform thin would have
       had to trade one against the other.

       Emission is gated and the vr() stream is not, so every surviving strand
       is byte-identical to the one that shipped. */
    const pitThin = makeRng(0x9174B1);
    const pitKeep = (x, z) => {
      const d = Math.hypot(x + 14.72, z - 2.70);            // dist to rest cam
      const t = Math.max(0, Math.min(1, (d - 6.5) / 14.5));
      return 0.34 + 0.62 * t * t * (3 - 2 * t);
    };
    let pitKept = 0;
    for (let i = 0; i < 80; i++) {
      // s weighted to the low (frame-left, far) end: pow > 1 crowds toward 0
      const s = S_LO + Math.pow(vr(), 1.9) * S_SPAN;
      const p = cutEdgePoint(s);
      const keep = pitThin() < pitKeep(p.x, p.z);
      if (keep) pitKept++;
      // start somewhere on the wall: at the lip, or down the section
      const y0 = groundY(p.x, p.z) - Math.pow(vr(), 1.5) * 3.4;
      // a little proud of the face, on the removed side, so the opaque
      // section sheet cannot z-fight it away
      const ox = p.x - CUT_N.x * (0.06 + vr() * 0.10);
      const oz = p.z - CUT_N.z * (0.06 + vr() * 0.10);
      /* CURL, NOT MOMENTUM+NOISE. The first cut of this block gave every
         strand the same outward bias and let noise do the bending; at four
         to seven long steps that produces a near-straight run, and 210 of
         them all leaning off the same wall read as a COMBED HATCH — the
         countable-stroke carpet the declutter round spent a pass deleting,
         reintroduced in the one place the frame has nothing else to look
         at. Two changes fix the reading and neither is a tuning nudge:
           · the heading starts on the face TANGENT, with a random sign, and
             only drifts outward — so strands run along the wall and across
             each other instead of all raking away from it;
           · turning is a PERSISTENT CURL (a signed turn rate carried for
             the strand's whole length, itself drifting) rather than
             per-step noise, so the path is a smooth arc. A hypha bends; it
             does not zigzag and it does not rule a line.
         Steps are half as long and there are twice as many of them, for the
         same reach, so the curve is actually resolved. */
      const sgn = vr() < 0.5 ? -1 : 1;
      let hx = TGx * sgn * (0.55 + vr() * 0.45) - CUT_N.x * (0.10 + vr() * 0.45);
      let hz = TGz * sgn * (0.55 + vr() * 0.45) - CUT_N.z * (0.10 + vr() * 0.45);
      let hy = -0.05 - vr() * 0.12;
      const hl = Math.hypot(hx, hy, hz) || 1;
      hx /= hl; hy /= hl; hz /= hl;
      let curl = vg() * 0.30;                    // rad per step, persistent
      const tone = 0.10 + vr() * 0.12;
      const tw = vr() * TAU;
      const arc = arcOf(ox, oz);
      const SEG = 9 + ((vr() * 6) | 0);
      const REACH = 3.0 + vr() * 2.4;
      let px = ox, py = y0, pz = oz, run = 0;
      for (let k = 0; k < SEG; k++) {
        const step = 0.16 + vr() * 0.16;
        // rotate the heading in the horizontal plane by the curl
        curl = curl * 0.90 + vg() * 0.07;
        const ca = Math.cos(curl), sa = Math.sin(curl);
        const rx = hx * ca - hz * sa, rz = hx * sa + hz * ca;
        hx = rx; hz = rz;
        hy = hy * 0.88 - 0.018 - vr() * 0.020;    // drapes as it goes
        const nl = Math.hypot(hx, hy, hz) || 1;
        const nx = px + (hx / nl) * step;
        const ny = py + (hy / nl) * step;
        const nz = pz + (hz / nl) * step;
        run += step;
        // dim continuously with how far it has left the wall, so the strand
        // dissolves into the dark instead of ending at a countable point
        const f0 = Math.max(0, 1 - run / REACH);
        const f1 = Math.max(0, 1 - (run + step) / REACH);
        if (keep) hyph.seg(px, py, pz, nx, ny, nz,
          tone * f0 * f0, tone * f1 * f1, { tw, boost: 0.22, arc });
        px = nx; py = ny; pz = nz;
      }
    }
    counts.pitStrands = pitKept;
  }

  const hyphMat = makeStrandMat(uniforms, 0.62);
  const hyphLines = new THREE.LineSegments(baked ? baked.g.hyph : hyph.geo(), hyphMat);
  hyphLines.frustumCulled = false;
  group.add(hyphLines);
  counts.hyphSegs = hyph.segCount;

  // bright cut-cord section ends on the face + the lit junctions
  const ends = makeBatch();
  if (!baked) {
    for (const [x, y, z] of cordEnds) ends.pt(x, y, z, 0.8, 0.09, { tw: rand() * TAU });
    for (const [x, y, z, b] of cordNodes)
      ends.pt(x, y, z, Math.min(0.72, b * 1.5), 0.05 + rand() * 0.07,
        { tw: rand() * TAU, wave: 1, boost: 0.15 });
  }
  const endMat = makePointsMat(uniforms, 0.9, glowTex);
  const endPts = new THREE.Points(baked ? baked.g.ends : ends.geo(true), endMat);
  endPts.frustumCulled = false;
  group.add(endPts);

  /* ================================================================
     5. The growth front: a bright underground arc along the ring band —
        the live edge of the colony. Carries the travelling reveal pulse
        (aBoost 1) that the fruiting bodies above brighten in step with.
     ================================================================ */
  // Declutter round: 130 -> 72 strokes, shorter and held BELOW the surface —
  // the old rises poked through the soil as "grass" spikes around the
  // members. The pulse's brightness now mostly rides the glow carriers
  // added to the aggregate batch above.
  // High-detail transit pass (2026-08-09): the 72 rises were isolated ticks —
  // the camera now crosses the arc at close range (p ~0.81-0.84) and a row of
  // disconnected vertical dashes is exactly the "broken lines" read. The base
  // points are now CHAINED: each rise's foot links to the next around the arc
  // (closing the loop) at half the rise tone, so the front is a continuous
  // undulating line the rises grow from — "the live edge of the colony" as
  // one edge, and the travelling pulse now runs along an unbroken carrier.
  const front = makeBatch();
  if (!baked) {
    const N = 72;
    const feet = [];
    for (let i = 0; i < N; i++) {
      const arc = i / N;
      const az = arc * TAU + Math.atan2(0.8, 6.0);   // arc 0 = the hero azimuth
      // radius follows the member band, wobbling
      const r = 6.4 + 1.1 * Math.sin(arc * TAU * 2.3 + 1.0) + gauss() * 0.35;
      const x = RING_C.x + Math.cos(az) * r;
      const z = RING_C.z + Math.sin(az) * r;
      const y0 = -0.55 - rand() * 1.2;
      const t = 0.36 + rand() * 0.16;
      front.seg(x, y0, z,
        x + gauss() * 0.3, Math.min(-0.2, y0 + 0.22 + rand() * 0.26), z + gauss() * 0.3,
        t, t * 1.5, { tw: rand() * TAU, boost: 1, arc, reveal: -1 });
      feet.push([x, y0, z, t, arc]);
    }
    for (let i = 0; i < N; i++) {
      const a = feet[i], b = feet[(i + 1) % N];
      const arcMid = i + 1 === N ? 0 : (a[4] + b[4]) * 0.5;   // wrap: land on 0
      front.seg(a[0], a[1], a[2], b[0], b[1], b[2],
        a[3] * 0.5, b[3] * 0.5,
        { tw: rand() * TAU, boost: 1, arc: arcMid, reveal: -1 });
    }
  }
  const frontMat = makeStrandMat(uniforms, 0.66);
  const frontLines = new THREE.LineSegments(baked ? baked.g.front : front.geo(), frontMat);
  frontLines.frustumCulled = false;
  group.add(frontLines);
  counts.frontSegs = front.segCount;

  /* ================================================================
     6. Connectors: per member, two strands from the front depth up to
        the stipe base — the surface↔colony relationship the CTA pulse
        briefly lights (FN-3.1). They reveal WITH their member.
     ================================================================ */
  // Declutter round: ONE strand per member (was two), at rest tones low
  // enough to sit under the member's ground pool — the tie only truly
  // lights when the CTA / front pulse passes (boost 1).
  const conn = makeBatch();
  if (!baked) for (const m of MEMBERS) {
    {
      // rooted OFF-axis (never straight under the stipe): the strand reads
      // as a diagonal tie into the front, not a light pillar under the body
      const fx = RING_C.x + Math.cos(m.az + 0.10 + gauss() * 0.08) * (m.r + 1.0 + gauss() * 0.5);
      const fz = RING_C.z + Math.sin(m.az + 0.10 + gauss() * 0.08) * (m.r + 1.0 + gauss() * 0.5);
      const fy = -0.9 - rand() * 0.7;
      const midX = (fx + m.x) / 2 + gauss() * 0.2;
      const midZ = (fz + m.z) / 2 + gauss() * 0.2;
      const meta = { arc: m.arc, reveal: m.reveal, revealIn: m.revealIn ?? m.reveal,
                     boost: 1, tw: rand() * TAU };
      conn.seg(fx, fy, fz, midX, fy * 0.4, midZ, 0.20, 0.28, meta);
      conn.seg(midX, fy * 0.4, midZ, m.x + gauss() * 0.05, m.gy + 0.04, m.z + gauss() * 0.05,
        0.28, 0.38, meta);
    }
  }
  const connMat = makeStrandMat(uniforms, 0.4);
  const connLines = new THREE.LineSegments(baked ? baked.g.conn : conn.geo(), connMat);
  connLines.frustumCulled = false;
  group.add(connLines);
  counts.connSegs = conn.segCount;

  /* ================================================================
     7. Dark-pocket haze: sparse dim ember sprites so underground depth
        dissolves into warmth rather than clean black (Owned lesson) —
        while the two authored pockets above stay genuinely dark.
     ================================================================ */
  // Declutter round: bases raised (haze carries more of the density the
  // culled strokes gave up) + two new spots under the frame-LEFT arc
  // (world −z), part of the left-of-frame rebalance.
  const hazeSprites = [];
  const hazeSpots = [
    [-13.2, -1.6, 0.8, 3.2], [-10.5, -2.2, -4.0, 2.6],
    [-4.2, -2.6, 4.4, 3.0], [-1.5, -1.8, -5.2, 2.4],
    [-8.2, -1.9, -6.8, 3.4], [-4.4, -2.1, -8.2, 3.0],
  ];
  // Baked read path: the haze tone/base are the LAST draws off this
  // function's `rand`, so skipping the geometry blocks above would shift
  // them — they round-trip via the payload instead (2026-08-17). Positions
  // and scale are authored; only the material's two seeded floats move.
  for (let i = 0; i < hazeSpots.length; i++) {
    const [x, y, z, sc] = hazeSpots[i];
    const tone = baked ? baked.haze[i].tone : (0.30 + rand() * 0.1);
    const base = baked ? baked.haze[i].base : (0.062 + rand() * 0.022);
    const mat = new THREE.SpriteMaterial({
      map: glowTex, color: heat(tone, new THREE.Color()).clone(),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.set(sc, sc * 0.7, 1);
    group.add(s);
    hazeSprites.push({ mat, base, tone });
  }
  // Baked: the emission blocks above never ran, so every count is
  // reconstructed from the payload — including the "kept" mask counts
  // (surfaceStrokes / lipRootlets / lipStrata / pitStrands) that are NOT
  // derivable from the baked attribute counts (2026-08-17).
  if (baked) Object.assign(counts, baked.counts);

  return {
    group,
    counts,
    // The bake recording site (final/index.js) reads these AFTER every
    // cross-module write is final. Keys match baked.js geometry() keys.
    geometries: {
      soil: soil.geometry,
      surface: surfLines.geometry,
      cut: cutLines.geometry,
      aggr: aggrPts.geometry,
      cords: cordLines.geometry,
      hyph: hyphLines.geometry,
      ends: endPts.geometry,
      front: frontLines.geometry,
      conn: connLines.geometry,
    },
    bakePayload: {
      soilTris: counts.soilTris,
      surfaceStrokes: counts.surfaceStrokes,
      surfaceSegs: counts.surfaceSegs,
      lipRootlets: counts.lipRootlets,
      lipStrata: counts.lipStrata,
      cutSegs: counts.cutSegs,
      aggrPts: counts.aggrPts,
      cordSegs: counts.cordSegs,
      hyphSegs: counts.hyphSegs,
      pitStrands: counts.pitStrands,
      frontSegs: counts.frontSegs,
      connSegs: counts.connSegs,
      haze: hazeSprites.map(h => ({ tone: h.tone, base: h.base })),
    },
    /** haze sprites cannot share the shader uniforms — fade them here; the
     *  soil slab's hashed dissolve rides the same drive (M5, D16).
     *  `buried` (2026-08-11): dissolves the slab away entirely while the lens
     *  is UNDER the soil, where this mesh can only be the section wall in
     *  front of it — see the material's own note. Camera-pure, so reverse
     *  rides retrace it exactly. It REPLACES the 2026-08-09 `under` tint,
     *  which is retired with it. */
    setAmount(a) {
      for (const h of hazeSprites) h.mat.opacity = h.base * a;
      if (soilDissolve) soilDissolve.value = a;
    },
    /** ONE float, written every frame whatever the chapter is doing — see
     *  index.js. Kept off setAmount so the retired epilogue still costs
     *  nothing per frame beyond this single assignment. */
    setBuried(v) { if (soilBuried) soilBuried.value = v; },
  };
}
