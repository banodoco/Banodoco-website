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
  TAU, RING_C, MEMBERS, arcOf, cutVal, cutEdgePoint, CUT_S_MIN, CUT_S_MAX,
  makeRng, gaussOf, heat, groundY, makeBatch, makeStrandMat, makePointsMat, makeUniforms,
} from './final-world.js';
import { makeGlowTexture } from '../core/anatomy.js';

export function createFinalTerrain(sceneApi, uniforms) {
  const rand = makeRng(41719);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();
  const counts = {};

  /* ================================================================
     1. Surface: broken strokes on the kept side — denser along the
        ring band and near the lip, thinning toward the horizon.
     ================================================================ */
  const surface = makeBatch();
  {
    let placed = 0, guard = 0;
    while (placed < 520 && guard++ < 4000) {
      const a = rand() * TAU;
      // density: ring band > interior > outskirts
      const band = rand();
      const r = band < 0.45 ? 5.0 + rand() * 4.4
              : band < 0.75 ? rand() * 5.0
              : 9.4 + rand() * 9.0;
      const x = RING_C.x + Math.cos(a) * r;
      const z = RING_C.z + Math.sin(a) * r;
      if (cutVal(x, z) < 0.25) continue;
      const y = groundY(x, z);
      const len = 0.5 + rand() * 1.4;
      const d = rand() * TAU;
      const dx = Math.cos(d) * len, dz = Math.sin(d) * len;
      const tone = 0.16 + rand() * 0.14 + (r > 9 ? -0.06 : 0);
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
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const s = CUT_S_MIN + (i / N) * (CUT_S_MAX - CUT_S_MIN);
      const p = cutEdgePoint(s);
      const v = [p.x + gauss() * 0.05, groundY(p.x, p.z) + 0.02 + gauss() * 0.02, p.z + gauss() * 0.05];
      if (prev && rand() > 0.08) {
        const t = 0.55 + rand() * 0.2;
        cut.seg(prev[0], prev[1], prev[2], v[0], v[1], v[2], t, t,
          { tw: rand() * TAU, boost: 0.35, arc: arcOf(p.x, p.z) });
      }
      // overhang ticks breaking over the edge
      if (rand() < 0.3) {
        const t = 0.4 + rand() * 0.2;
        cut.seg(v[0], v[1], v[2],
          v[0] - 0.2 - rand() * 0.3, v[1] - 0.1 - rand() * 0.25, v[2] + gauss() * 0.2,
          t, t * 0.4, { tw: rand() * TAU });
      }
      prev = v;
    }
    // the face: the section through the substrate. NOT a curtain of
    // verticals — a mix of short ragged drops, horizontal strata ticks and
    // root stubs, warm at the lip fading dark within ~2 units.
    for (let i = 0; i < 130; i++) {
      const s = CUT_S_MIN + rand() * (CUT_S_MAX - CUT_S_MIN);
      const p = cutEdgePoint(s);
      const x = p.x + gauss() * 0.2, z = p.z + gauss() * 0.2;
      const y0 = groundY(x, z);
      const depth = 0.9 + rand() * 1.9;
      const t0 = 0.46 + rand() * 0.2;
      cut.seg(x, y0, z, x + gauss() * 0.3, y0 - depth, z + gauss() * 0.3,
        t0, 0.09, { tw: rand() * TAU });
    }
    // horizontal strata: broken layer lines a little below the lip
    for (let i = 0; i < 90; i++) {
      const s = CUT_S_MIN + rand() * (CUT_S_MAX - CUT_S_MIN);
      const p = cutEdgePoint(s);
      const d = 0.25 + Math.pow(rand(), 1.4) * 2.2;
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
  for (let i = 0; i < 190; i++) {
    const s = CUT_S_MIN + rand() * (CUT_S_MAX - CUT_S_MIN);
    const p = cutEdgePoint(s);
    const x = p.x + gauss() * 0.3, z = p.z + gauss() * 0.3;
    const y = groundY(x, z) - Math.pow(rand(), 1.6) * 3.4 + 0.04;
    aggr.pt(x, y, z, 0.30 + rand() * 0.28, 0.018 + Math.pow(rand(), 2) * 0.05,
      { tw: rand() * TAU });
  }
  for (let i = 0; i < 70; i++) {
    const s = CUT_S_MIN + rand() * (CUT_S_MAX - CUT_S_MIN);
    const p = cutEdgePoint(s);
    aggr.pt(p.x + gauss() * 0.08, groundY(p.x, p.z) + 0.03, p.z + gauss() * 0.08,
      0.62 + rand() * 0.24, 0.07 + Math.pow(rand(), 2) * 0.1,
      { tw: rand() * TAU, boost: 0.4, arc: arcOf(p.x, p.z) });
  }
  const glowTex = makeGlowTexture();
  const aggrMat = makePointsMat(uniforms, 0.6, glowTex);
  const aggrPts = new THREE.Points(aggr.geo(true), aggrMat);
  aggrPts.frustumCulled = false;
  group.add(aggrPts);
  counts.aggrPts = aggr.ptCount;

  /* ================================================================
     3. Underground colony: fine hyphae everywhere beneath the ring
        interior AND exposed in the void the cut opens — the pre-
        existing wider organism the fruiting bodies emerge from.
     ================================================================ */
  const hyph = makeBatch();
  {
    let placed = 0, guard = 0;
    while (placed < 850 && guard++ < 6000) {
      const a = rand() * TAU;
      const r = Math.pow(rand(), 0.7) * 11.5;
      let x = RING_C.x + Math.cos(a) * r;
      let z = RING_C.z + Math.sin(a) * r;
      // hyphae live under kept soil AND stand exposed in the void near the
      // face (the section view) — but thin out far from the cut on the void
      // side so the removed area still reads as absence
      const cv = cutVal(x, z);
      if (cv < -3.4 && rand() < 0.75) continue;
      let y = -0.3 - Math.pow(rand(), 1.4) * 3.6;
      // dark pockets stay dark (two authored voids)
      if (Math.hypot(x + 3.4, y + 2.4, z - 3.0) < 1.5) continue;
      if (Math.hypot(x + 8.6, y + 2.0, z + 4.6) < 1.4) continue;
      const bright = 0.14 + rand() * 0.22;
      const SEG = 2;
      let px = x, py = y, pz = z;
      const arc = arcOf(x, z);
      for (let sgi = 0; sgi < SEG; sgi++) {
        const nx = px + gauss() * 0.8, ny = py + gauss() * 0.4, nz = pz + gauss() * 0.8;
        hyph.seg(px, py, pz, nx, Math.min(-0.22, ny), nz,
          bright, bright * (0.5 + rand() * 0.5),
          { tw: rand() * TAU, boost: 0.3, arc });
        px = nx; py = Math.min(-0.22, ny); pz = nz;
      }
      placed++;
    }
  }
  const hyphMat = makeStrandMat(uniforms, 0.62);
  const hyphLines = new THREE.LineSegments(hyph.geo(), hyphMat);
  hyphLines.frustumCulled = false;
  group.add(hyphLines);
  counts.hyphSegs = hyph.segCount;

  /* ================================================================
     4. Rhizomorph cords: 6 thicker polylines radiating outward from
        the colony interior, crossing under the growth front; two head
        toward the camera side and are CUT at the face — bright section
        ends visible in the wedge. Slow outward waves via aWave.
     ================================================================ */
  const cords = makeBatch();
  const cordEnds = [];
  {
    const CORD_AZ = [12, 68, 118, 195, 250, 310];   // deg about C; 195/250 cross the void
    CORD_AZ.forEach((azDeg, ci) => {
      const a0 = (azDeg * Math.PI) / 180 + gauss() * 0.08;
      let x = RING_C.x + Math.cos(a0) * 1.2, z = RING_C.z + Math.sin(a0) * 1.2;
      let y = -1.1 - rand() * 1.2;
      const SEG = 13;
      const bright = 0.4 + rand() * 0.2;
      const tw0 = rand() * TAU;
      let px = x, py = y, pz = z;
      for (let s = 1; s <= SEG; s++) {
        const t = s / SEG;
        const rr = 1.2 + t * (8.6 + rand() * 1.6);
        const aa = a0 + Math.sin(t * 2.6 + ci) * 0.16 + gauss() * 0.02;
        x = RING_C.x + Math.cos(aa) * rr;
        z = RING_C.z + Math.sin(aa) * rr;
        y = Math.min(-0.5, y + gauss() * 0.32 - 0.06);
        // cords under the void get cut at the face: stop and mark the end
        if (cutVal(x, z) < 0.2 && cutVal(px, pz) >= 0.2) {
          cordEnds.push([px, py, pz]);
          break;
        }
        // double stroke = thickness reading
        for (const off of [0, 0.055]) {
          cords.seg(px, py + off, pz, x, y + off, z,
            bright * (1 - t * 0.45), bright * (1 - (t + 1 / SEG) * 0.45),
            { tw: tw0, wave: 1, arc: t, boost: 0.15 });
        }
        px = x; py = y; pz = z;
      }
    });
  }
  const cordMat = makeStrandMat(uniforms, 0.72);
  const cordLines = new THREE.LineSegments(cords.geo(), cordMat);
  cordLines.frustumCulled = false;
  group.add(cordLines);
  counts.cordSegs = cords.segCount;

  // bright cut-cord section ends on the face
  const ends = makeBatch();
  for (const [x, y, z] of cordEnds) ends.pt(x, y, z, 0.8, 0.09, { tw: rand() * TAU });
  const endMat = makePointsMat(uniforms, 0.9, glowTex);
  const endPts = new THREE.Points(ends.geo(true), endMat);
  endPts.frustumCulled = false;
  group.add(endPts);

  /* ================================================================
     5. The growth front: a bright underground arc along the ring band —
        the live edge of the colony. Carries the travelling reveal pulse
        (aBoost 1) that the fruiting bodies above brighten in step with.
     ================================================================ */
  const front = makeBatch();
  {
    const N = 130;
    for (let i = 0; i < N; i++) {
      const arc = i / N;
      const az = arc * TAU + Math.atan2(0.8, 6.0);   // arc 0 = the hero azimuth
      // radius follows the member band, wobbling
      const r = 6.4 + 1.1 * Math.sin(arc * TAU * 2.3 + 1.0) + gauss() * 0.35;
      const x = RING_C.x + Math.cos(az) * r;
      const z = RING_C.z + Math.sin(az) * r;
      const y0 = -0.35 - rand() * 1.3;
      const t = 0.44 + rand() * 0.2;
      front.seg(x, y0, z, x + gauss() * 0.35, y0 + 0.35 + rand() * 0.4, z + gauss() * 0.35,
        t, t * 1.5, { tw: rand() * TAU, boost: 1, arc, reveal: -1 });
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
  const conn = makeBatch();
  for (const m of MEMBERS) {
    for (let k = 0; k < 2; k++) {
      // rooted OFF-axis (never straight under the stipe): the strand reads
      // as a diagonal tie into the front, not a light pillar under the body
      const fx = RING_C.x + Math.cos(m.az + 0.10 + gauss() * 0.08) * (m.r + 1.0 + gauss() * 0.5);
      const fz = RING_C.z + Math.sin(m.az + 0.10 + gauss() * 0.08) * (m.r + 1.0 + gauss() * 0.5);
      const fy = -0.9 - rand() * 0.7;
      const midX = (fx + m.x) / 2 + gauss() * 0.2;
      const midZ = (fz + m.z) / 2 + gauss() * 0.2;
      const meta = { arc: m.arc, reveal: m.reveal, boost: 1, tw: rand() * TAU };
      conn.seg(fx, fy, fz, midX, fy * 0.4, midZ, 0.30, 0.42, meta);
      conn.seg(midX, fy * 0.4, midZ, m.x + gauss() * 0.05, m.gy + 0.04, m.z + gauss() * 0.05,
        0.42, 0.55, meta);
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
  const hazeSprites = [];
  const hazeSpots = [
    [-13.2, -1.6, 0.8, 3.2], [-10.5, -2.2, -4.0, 2.6],
    [-4.2, -2.6, 4.4, 3.0], [-1.5, -1.8, -5.2, 2.4],
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
    hazeSprites.push({ mat, base: 0.045 + rand() * 0.02 });
  }

  return {
    group,
    counts,
    /** haze sprites cannot share the shader uniforms — fade them here */
    setAmount(a) { for (const h of hazeSprites) h.mat.opacity = h.base * a; },
  };
}
