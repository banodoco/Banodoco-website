// journey-v6 — FINAL epilogue: terrain cutaway + underground colony (W4-D).
//
// The soil is SLICED along the irregular cut line in final-world.js: the
// kept (far) side carries the surface the ring stands on; the near side is
// removed, exposing the colony in section. The Final camera leg lives
// entirely on the removed side, so the frame always reads: surface + ring
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
  makeRng, gaussOf, heat, groundY, makeBatch, makeStrandMat, makePointsMat, makeUniforms,
} from './world.js';
import { makeGlowTexture } from '../../anatomy.js';

export function createFinalTerrain(sceneApi, uniforms) {
  const rand = makeRng(41719);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();
  const counts = {};
  let soilDissolve = null;   // the slab's uSoilOn uniform (set below)
  let soilUnder = null;      // the slab's uUnder uniform (set below)

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
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
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
    const soilMat = new THREE.ShaderMaterial({
      uniforms: {
        uSoilOn: { value: 0 },
        uUnder: { value: 0 },
        uSoilCol: { value: new THREE.Color(
          (sceneApi.scene.fog && sceneApi.scene.fog.color) || 0x000000) },
      },
      vertexShader: /* glsl */`
        void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uSoilOn;
        uniform float uUnder;
        uniform vec3 uSoilCol;
        void main() {
          float h = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          if (h > uSoilOn) discard;
          gl_FragColor = vec4(mix(uSoilCol, uSoilCol * 0.10, uUnder), 1.0);
        }`,
      side: THREE.DoubleSide,
    });
    const soil = new THREE.Mesh(g, soilMat);
    soil.frustumCulled = false;
    soil.renderOrder = -10;          // first among opaques
    group.add(soil);
    soilDissolve = soilMat.uniforms.uSoilOn;
    soilUnder = soilMat.uniforms.uUnder;
    counts.soilTris = idx.length / 3;
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
  const surface = makeBatch();
  {
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
      surface.seg(x, y + 0.02, z, mx, groundY(mx, mz) + 0.03 + rand() * 0.02, mz,
        tone, tone * 1.1, { tw: rand() * TAU, boost: 0.25, arc: arcOf(x, z) });
      surface.seg(mx, groundY(mx, mz) + 0.03, mz, x + dx, groundY(x + dx, z + dz) + 0.02, z + dz,
        tone * 1.1, tone * 0.8, { tw: rand() * TAU, boost: 0.25, arc: arcOf(x, z) });
      placed++;
    }
  }
  const surfMat = makeStrandMat(uniforms, 0.5);
  const surfLines = new THREE.LineSegments(surface.geo(), surfMat);
  surfLines.frustumCulled = false;
  group.add(surfLines);
  counts.surfaceSegs = surface.segCount;

  /* ================================================================
     2. The cut: bright broken lip + soil face falling away beneath it
     ================================================================ */
  const cut = makeBatch();
  {
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
      let px = x, py = y0, pz = z;
      for (let k = 1; k <= SEG; k++) {
        const f = k / SEG;
        const ease = f * (0.55 + 0.45 * f);         // accelerating fall
        const nx = x + (-CUT_N.z) * swayS * f + CUT_N.x * hugN * f * f + gauss() * 0.05;
        const nz = z + CUT_N.x * swayS * f + CUT_N.z * hugN * f * f + gauss() * 0.05;
        const ny = y0 - depth * ease;
        cut.seg(px, py, pz, nx, ny, nz,
          t0 * (1 - ((k - 1) / SEG) * 0.85), t0 * (1 - f * 0.85), { tw });
        px = nx; py = ny; pz = nz;
      }
      // root-tip flick: a last dim oblique turn, dying out
      cut.seg(px, py, pz,
        px + gauss() * 0.16 + CUT_N.x * hugN * 0.4,
        py - 0.05 - rand() * 0.10,
        pz + gauss() * 0.16 + CUT_N.z * hugN * 0.4,
        t0 * 0.15, 0.02, { tw });
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
      cut.seg(p.x + gauss() * 0.1, y, p.z + gauss() * 0.1,
        q.x + gauss() * 0.1, y + gauss() * 0.1, q.z + gauss() * 0.1,
        t0, t0 * 0.6, { tw: rand() * TAU });
    }
  }
  const cutMat = makeStrandMat(uniforms, 0.72);
  const cutLines = new THREE.LineSegments(cut.geo(), cutMat);
  cutLines.frustumCulled = false;
  group.add(cutLines);
  counts.cutSegs = cut.segCount;

  // soil aggregates: fine points peppering the lip + face, plus a row of
  // brighter beads ALONG the lip itself (the still's glowing soil-line)
  const aggr = makeBatch();
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
  const glowTex = makeGlowTexture();
  const aggrMat = makePointsMat(uniforms, 0.6, glowTex);
  const aggrPts = new THREE.Points(aggr.geo(true), aggrMat);
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
  {
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
  const cordLines = new THREE.LineSegments(cords.geo(), cordMat);
  cordLines.frustumCulled = false;
  group.add(cordLines);
  counts.cordSegs = cords.segCount;

  /* ================================================================
     3. Underground colony: fine hyphae everywhere beneath the ring
        interior AND exposed in the void the cut opens — the pre-
        existing wider organism the fruiting bodies emerge from.
     ================================================================ */
  // Declutter round: 850 -> 380 scribbles, dimmer and pushed DEEPER — under
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
  {
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
  const hyphMat = makeStrandMat(uniforms, 0.62);
  const hyphLines = new THREE.LineSegments(hyph.geo(), hyphMat);
  hyphLines.frustumCulled = false;
  group.add(hyphLines);
  counts.hyphSegs = hyph.segCount;

  // bright cut-cord section ends on the face + the lit junctions
  const ends = makeBatch();
  for (const [x, y, z] of cordEnds) ends.pt(x, y, z, 0.8, 0.09, { tw: rand() * TAU });
  for (const [x, y, z, b] of cordNodes)
    ends.pt(x, y, z, Math.min(0.72, b * 1.5), 0.05 + rand() * 0.07,
      { tw: rand() * TAU, wave: 1, boost: 0.15 });
  const endMat = makePointsMat(uniforms, 0.9, glowTex);
  const endPts = new THREE.Points(ends.geo(true), endMat);
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
  {
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
  const frontLines = new THREE.LineSegments(front.geo(), frontMat);
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
  for (const m of MEMBERS) {
    {
      // rooted OFF-axis (never straight under the stipe): the strand reads
      // as a diagonal tie into the front, not a light pillar under the body
      const fx = RING_C.x + Math.cos(m.az + 0.10 + gauss() * 0.08) * (m.r + 1.0 + gauss() * 0.5);
      const fz = RING_C.z + Math.sin(m.az + 0.10 + gauss() * 0.08) * (m.r + 1.0 + gauss() * 0.5);
      const fy = -0.9 - rand() * 0.7;
      const midX = (fx + m.x) / 2 + gauss() * 0.2;
      const midZ = (fz + m.z) / 2 + gauss() * 0.2;
      const meta = { arc: m.arc, reveal: m.reveal, boost: 1, tw: rand() * TAU };
      conn.seg(fx, fy, fz, midX, fy * 0.4, midZ, 0.20, 0.28, meta);
      conn.seg(midX, fy * 0.4, midZ, m.x + gauss() * 0.05, m.gy + 0.04, m.z + gauss() * 0.05,
        0.28, 0.38, meta);
    }
  }
  const connMat = makeStrandMat(uniforms, 0.4);
  const connLines = new THREE.LineSegments(conn.geo(), connMat);
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
  for (const [x, y, z, sc] of hazeSpots) {
    const mat = new THREE.SpriteMaterial({
      map: glowTex, color: heat(0.30 + rand() * 0.1, new THREE.Color()).clone(),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.set(sc, sc * 0.7, 1);
    group.add(s);
    hazeSprites.push({ mat, base: 0.062 + rand() * 0.022 });
  }

  return {
    group,
    counts,
    /** haze sprites cannot share the shader uniforms — fade them here; the
     *  soil slab's hashed dissolve rides the same drive (M5, D16).
     *  `under` (transit pass): 1 while the camera is below the soil line,
     *  0 above — darkens the slab's underside so the overhead earth reads
     *  as a ceiling, not a stage flat. Pure in the camera pose (index.js). */
    setAmount(a, under = 0) {
      for (const h of hazeSprites) h.mat.opacity = h.base * a;
      if (soilDissolve) soilDissolve.value = a;
      if (soilUnder) soilUnder.value = under;
    },
  };
}
