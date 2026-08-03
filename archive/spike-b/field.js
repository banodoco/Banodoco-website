// Spike B — the underground field: volumetric irregular mycelium.
// Three depth batches of fine hyphae following one coherent flow field,
// five thick rhizomorph cords carrying slow independent travelling waves,
// authored dark substrate pockets (density holes + explicit voids), and
// soil-aggregate hints. Adapted from donor journey/chapters/owned.js.
//
// Deliberately NO global colony pulse in ambient — the spec forbids any
// perceptible whole-field loop. Waves live on the cords; hyphae twinkle
// asynchronously per strand.
import * as THREE from 'three';
import * as H from '../../journey/lib/helpers.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

export function buildField({ glide, palette: P }) {
  const V3 = THREE.Vector3;
  const V = (x, y, z) => new V3(x, y, z);
  const group = new THREE.Group();
  group.name = 'spikeB-field';
  const timeMats = [];
  const rndA = H.rng(90211);
  const _tube = new V3();

  const { GA, GD, GLEN2, GDIR, RIGHT, UPN, camDist, camAt, camPts } = glide;

  const _gp = new V3();
  function glideDist(x, y, z) {
    _gp.set(x - GA.x, y - GA.y, z - GA.z);
    const t = clamp(_gp.dot(GD) / GLEN2, 0, 1);
    const dx = x - (GA.x + GD.x * t);
    const dy = y - (GA.y + GD.y * t);
    const dz = z - (GA.z + GD.z * t);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Two-scale substrate density. Low values are soil, not colony.
  function substrate(x, y, z) {
    return H.fbm3(x * 0.052 + 3.1, y * 0.100 - 1.2, z * 0.052 - 1.7, 4) * 0.72
         + H.fbm3(x * 0.170 - 5.0, y * 0.230 + 2.2, z * 0.170 + 4.4, 3) * 0.28;
  }

  // Explicitly authored dark pockets. The camera arc now sweeps side ±8
  // across the corridor, so voids live on the FAR flanks (plus one under the
  // floor) — read obliquely in passing, never entered, never frame-filling.
  // Each spot is verified/pushed clear of the actual camera polyline so no
  // point of the traverse ever sits inside (or hard against) a void.
  const VOIDS = [];
  {
    const spots = [
      { t: 0.12, r: 4.6, side: -1, u: -0.4, d: 11.5 },
      { t: 0.30, r: 4.8, side: 1, u: 0.7, d: 11.0 },
      { t: 0.48, r: 5.0, side: -1, u: 0.3, d: 12.0 },
      { t: 0.55, r: 3.6, side: 0, u: -2.9, d: 0 },
      { t: 0.64, r: 4.6, side: 1, u: -0.6, d: 11.5 },
      { t: 0.85, r: 4.4, side: -1, u: 0.5, d: 11.0 },
    ];
    for (const s of spots) {
      const c = GA.clone().addScaledVector(GD, s.t)
        .addScaledVector(RIGHT, s.side * s.d)
        .addScaledVector(UPN, s.u * 2.4);
      // clearance enforcement: push the void straight away from the nearest
      // camera-path point until the lens can never dip inside it
      for (let guard = 0; guard < 8; guard++) {
        const cd = camDist(c.x, c.y, c.z);
        if (cd > s.r + 2.4) break;
        let nearest = camPts[0], bd = 1e9;
        for (const p of camPts) {
          const d = p.distanceToSquared(c);
          if (d < bd) { bd = d; nearest = p; }
        }
        const away = c.clone().sub(nearest);
        if (away.lengthSq() < 0.001) away.copy(RIGHT);
        c.addScaledVector(away.normalize(), (s.r + 2.4) - cd + 0.2);
      }
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

  // One coherent flow field: hyphae follow it, so the mat reads as grown
  // through a substrate rather than as scattered hairs.
  function flowStep(cur, i, step, out) {
    const a = H.fbm3(cur.x * 0.110 + i * 0.013, cur.y * 0.140, cur.z * 0.110, 3) * TAU;
    const b = H.fbm3(cur.z * 0.100 - 4.2, cur.x * 0.100 + 7.7, cur.y * 0.125, 3) * Math.PI * 0.62;
    const cb = Math.cos(b);
    out.set(
      cur.x + Math.cos(a) * cb * step,
      cur.y + Math.sin(b) * 0.72 * step,
      cur.z + Math.sin(a) * cb * step,
    );
    return out;
  }

  /* ---------------- fine hyphae: three depth batches ---------------- */
  const hyphae = [];
  let hyphaeVerts = 0;

  function hyphaBatch(spec) {
    const res = H.strandLines({
      count: spec.count, seed: spec.seed,
      generator: (i, rand) => {
        let x, y, z;
        if (spec.rMax) {
          // sample a shell around the CAMERA ARC — the layers the lens
          // actually brushes past are authored against the path it travels,
          // so every point of the traverse is wrapped in near/mid structure
          // (full 3D shell: above and below the lens too, no vertical holes)
          const s = rand();
          camAt(s, _tube);
          const a = rand() * TAU;
          const b = (rand() - 0.5) * Math.PI;
          const rr = spec.rMin + (spec.rMax - spec.rMin) * Math.sqrt(rand());
          const cs = Math.cos(a) * Math.cos(b) * rr;
          const sn = Math.sin(b) * rr * 0.82;
          const fw = Math.sin(a) * Math.cos(b) * rr * 0.6;
          x = clamp(_tube.x + RIGHT.x * cs + UPN.x * sn + GDIR.x * fw, -21.5, 21.5);
          y = clamp(_tube.y + RIGHT.y * cs + UPN.y * sn + GDIR.y * fw, -6.8, 6.8);
          z = clamp(_tube.z + RIGHT.z * cs + UPN.z * sn + GDIR.z * fw, -15.5, 15.5);
        } else {
          x = -21.5 + rand() * 43;
          y = -6.8 + rand() * 13.6;
          z = -15.5 + rand() * 31;
          // the far layer stays out of the corridor the near layers own
          if (camDist(x, y, z) < spec.gdMin && rand() < 0.78) return null;
        }
        if (inVoid(x, y, z)) return null;
        const d = substrate(x, y, z);
        if (d < spec.cut) return null;
        if (d < spec.cut + 0.09 && rand() < 0.55) return null;
        const len = spec.lenMin + rand() * (spec.lenMax - spec.lenMin);
        const step = len / 4;
        const pts = [V(x, y, z)];
        let cur = pts[0];
        for (let j = 0; j < 4; j++) {
          cur = flowStep(cur, i + j * 0.37, step, new V3());
          pts.push(cur);
        }
        return pts;
      },
    });
    const mat = H.makePulseMat(spec.color, {
      baseOpacity: spec.base, twinkle: spec.twinkle, pulseWidth: 0.10,
      pulseColor: spec.pulseColor, fogDensity: spec.fog,
    });
    const lines = new THREE.LineSegments(res.geometry, mat);
    lines.frustumCulled = false;
    lines.renderOrder = spec.order;
    group.add(lines);
    timeMats.push(mat);
    hyphaeVerts += res.geometry.attributes.position.count;
    hyphae.push({ lines, mat, geo: res.geometry, base: spec.base });
  }

  // far: fills the whole volume, dissolving into the haze
  hyphaBatch({
    count: 3800, seed: 2201, cut: -0.13, gdMin: 5.0,
    lenMin: 3.2, lenMax: 7.6, color: P.deepGold, pulseColor: P.ember,
    base: 0.135, twinkle: 0.64, fog: 0.031, order: -6,
  });
  // mid: the body of the colony, wrapped around the glide
  hyphaBatch({
    count: 4400, seed: 3307, cut: -0.08, rMin: 2.2, rMax: 15.0,
    lenMin: 2.4, lenMax: 5.4, color: 0xc19240, pulseColor: P.goldBright,
    base: 0.185, twinkle: 0.55, fog: 0.021, order: -5,
  });
  // near: sharp, hot, brushing past the lens (short steps — no jagged bolts)
  hyphaBatch({
    count: 1700, seed: 4409, cut: -0.08, rMin: 0.6, rMax: 7.5,
    lenMin: 1.2, lenMax: 2.8, color: P.gold, pulseColor: P.goldBright,
    base: 0.235, twinkle: 0.42, fog: 0.012, order: -4,
  });

  /* ---------------- rhizomorph cords: slow travelling waves ---------------- */
  function tubeStrand(points, opts, strandVal) {
    const g = H.tubeFrom(points, opts);
    const n = g.attributes.position.count;
    const uv = g.attributes.uv;
    const along = new Float32Array(n);
    const st = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      along[i] = uv ? uv.getX(i) : 0;
      st[i] = strandVal;
    }
    g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
    g.setAttribute('aStrand', new THREE.BufferAttribute(st, 1));
    if (g.attributes.normal) g.deleteAttribute('normal');
    if (g.attributes.uv) g.deleteAttribute('uv');
    return g;
  }

  // Cords run the length of the corridor (roughly world -X) at different
  // offsets, each with its own speed — waves never synchronize. Offsets keep
  // the same sign per cord so no cord crosses the camera corridor.
  const CORD_SPECS = [
    { seed: 6101, r0: -4.6, u0: -2.4, r1: -3.2, u1: 1.2, rad: 0.20,
      col: P.gold, pulse: P.goldBright, bow: V(0.5, 2.0, -2.6), speed: 0.052, base: 0.40 },
    { seed: 6203, r0: 4.4, u0: 2.0, r1: 3.4, u1: -2.6, rad: 0.15,
      col: 0xb98a35, pulse: P.ember, bow: V(-1.0, -1.5, 2.2), speed: 0.038, base: 0.33 },
    { seed: 6301, r0: -7.5, u0: 1.6, r1: -5.0, u1: -1.4, rad: 0.13,
      col: P.deepGold, pulse: P.ember, bow: V(1.8, 1.4, 2.8), speed: 0.031, base: 0.30 },
    { seed: 6407, r0: 3.6, u0: -3.4, r1: 5.4, u1: -2.2, rad: 0.11,
      col: P.gold, pulse: P.goldBright, bow: V(-2.2, 1.0, -1.4), speed: 0.045, base: 0.28 },
    // one cord rises out of the mat toward the organism above and leaves frame
    { seed: 6521, r0: 3.4, u0: -2.0, r1: 3.0, u1: 7.5, rad: 0.17, tShort: 0.55,
      col: P.goldBright, pulse: P.goldBright, bow: V(1.5, 0.6, -2.0), speed: 0.061, base: 0.42 },
  ];

  const cords = [];
  const cordPoints = [];
  let cordVerts = 0;
  CORD_SPECS.forEach((S, ci) => {
    const rand = H.rng(S.seed);
    const SEG = 11;
    const span = S.tShort ?? 1.18;
    const pts = [];
    for (let j = 0; j <= SEG; j++) {
      const t = j / SEG;
      const gt = -0.09 + t * span;
      const p = GA.clone().addScaledVector(GD, gt)
        .addScaledVector(RIGHT, S.r0 + (S.r1 - S.r0) * t)
        .addScaledVector(UPN, S.u0 + (S.u1 - S.u0) * t);
      const hump = Math.sin(Math.PI * t);
      p.addScaledVector(S.bow, hump);
      p.x += H.fbm3(t * 3.1 + ci * 5.3, 0.7, 2.1, 3) * 1.5;
      p.y += H.fbm3(1.9, t * 3.4 + ci * 2.7, 0.4, 3) * 1.15;
      p.z += H.fbm3(4.4, 0.3, t * 3.0 + ci * 4.1, 3) * 1.5;
      p.y = clamp(p.y, -6.9, S.tShort ? 10.5 : 6.9);
      // corridor clearance: never let a thick cord brush the camera ARC
      const gd = camDist(p.x, p.y, p.z);
      if (gd < 2.8) {
        let nearest = camPts[0], bd = 1e9;
        for (const cp of camPts) {
          const d = cp.distanceToSquared(p);
          if (d < bd) { bd = d; nearest = cp; }
        }
        const push = (2.8 - gd) / Math.max(gd, 0.001);
        p.set(
          p.x + (p.x - nearest.x) * push,
          p.y + (p.y - nearest.y) * push,
          p.z + (p.z - nearest.z) * push,
        );
      }
      pts.push(p);
    }
    cordPoints.push(pts);
    const geo = tubeStrand(pts, {
      radius: S.rad, radialSegments: 6, tubularSegments: 64, taper: 0.55 + rand() * 0.3,
    }, ci / CORD_SPECS.length);
    const mat = H.makePulseMat(S.col, {
      baseOpacity: S.base * 0.62, twinkle: 0.14, pulseWidth: 0.075,
      pulseColor: S.pulse, fogDensity: 0.010,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    timeMats.push(mat);
    cordVerts += geo.attributes.position.count;

    // filament overlay: a rhizomorph is a BUNDLE of hyphae, not a smooth pipe.
    // Jittered polylines share the tube's material so the wave rides them too.
    const fil = (() => {
      const curve = H.catmull(pts);
      const FIL = 7, SAMP = 26;
      const fpos = [], falong = [], fstrand = [];
      for (let f = 0; f < FIL; f++) {
        const phase = rand() * TAU;
        const amp = S.rad * (0.8 + rand() * 2.2);
        const wob = 1.5 + rand() * 2.5;
        let prev = null;
        for (let sIdx = 0; sIdx <= SAMP; sIdx++) {
          const t = sIdx / SAMP;
          const p = curve.getPointAt(t);
          const a = phase + t * wob * TAU * 0.25;
          p.x += Math.cos(a) * amp + H.fbm3(f * 3.7, t * 6.1 + ci, 2.2, 2) * S.rad * 1.6;
          p.y += Math.sin(a) * amp * 0.8 + H.fbm3(1.3, f * 2.9, t * 5.7 + ci, 2) * S.rad * 1.3;
          p.z += Math.sin(a + 1.7) * amp;
          if (prev) {
            fpos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
            falong.push((sIdx - 1) / SAMP, t);
            fstrand.push(f / FIL, f / FIL);
          }
          prev = p;
        }
      }
      const fg = new THREE.BufferGeometry();
      fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
      fg.setAttribute('aAlong', new THREE.Float32BufferAttribute(falong, 1));
      fg.setAttribute('aStrand', new THREE.Float32BufferAttribute(fstrand, 1));
      const lines = new THREE.LineSegments(fg, mat);
      lines.frustumCulled = false;
      group.add(lines);
      cordVerts += fpos.length / 3;
      return lines;
    })();

    cords.push({
      mesh, fil, mat, geo, base: S.base,
      p: -0.2 - ci * 0.31, speed: S.speed, k: ci * 4.7 + 1.3,
    });
  });

  function nearestCordPoint(p, rand) {
    let best = null, bestD = 1e9;
    for (let c = 0; c < cordPoints.length; c++) {
      const arr = cordPoints[c];
      for (let j = 1; j < arr.length - 1; j++) {
        const d = arr[j].distanceToSquared(p);
        if (d < bestD) { bestD = d; best = arr[j]; }
      }
    }
    if (!best || bestD > 100) return null;
    return best.clone().add(new V3(
      (rand() - 0.5) * 0.6, (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.6,
    ));
  }

  /* ---------------- soil aggregates: dim clumps ---------------- */
  let aggPoints = 0;
  function aggregateLayer(seed, count, size, opacity, color, nearOnly) {
    const rand = H.rng(seed);
    const pos = [];
    let guard = 0;
    while (pos.length / 3 < count && guard++ < count * 24) {
      const x = -22 + rand() * 44;
      const y = -7 + rand() * 14;
      const z = -16 + rand() * 32;
      if (inVoid(x, y, z)) continue;
      const gd = camDist(x, y, z);
      if (nearOnly && gd > 6.5) continue;
      if (!nearOnly && gd < 5) continue;
      if (substrate(x, y, z) < 0.12) continue;
      pos.push(x, y, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: H.softDisc(64), color: new THREE.Color(color), size,
      sizeAttenuation: true, transparent: true, opacity, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = -7;
    group.add(pts);
    aggPoints += pos.length / 3;
    return { pts, mat, baseOp: opacity };
  }
  const aggFar = aggregateLayer(7701, 64, 1.05, 0.055, P.deepGold, false);
  const aggNear = aggregateLayer(7803, 90, 0.34, 0.085, 0x8a6a34, true);

  /* ---------------- amber haze backdrop ---------------- */
  // Very large, very dim ember glows deep in the volume: distant structure
  // dissolves into warm haze instead of pure black. renderOrder far behind.
  {
    const rand = H.rng(5150);
    const place = (p, hot, op, sc) => {
      const mat = new THREE.SpriteMaterial({
        map: H.glowSprite(hot ? P.ember : P.deepGold, 64),
        color: new THREE.Color(hot ? P.ember : P.deepGold),
        transparent: true, opacity: op, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false,
      });
      const s = new THREE.Sprite(mat);
      s.position.copy(p);
      s.scale.setScalar(sc);
      s.renderOrder = -10;
      group.add(s);
    };
    for (let i = 0; i < 8; i++) {
      const t = 0.05 + rand() * 0.9;
      const side = rand() < 0.5 ? -1 : 1;
      const p = GA.clone().addScaledVector(GD, t)
        .addScaledVector(RIGHT, side * (13 + rand() * 14))
        .addScaledVector(UPN, (rand() - 0.5) * 8);
      place(p, i % 3 === 0, 0.014 + rand() * 0.016, 13 + rand() * 15);
    }
    // vertical backdrop: dim glows ABOVE and BELOW the corridor so the top
    // and bottom of frame dissolve into amber haze instead of hard black
    // (part of the no-empty-frames pass — vertical dead zones)
    for (let i = 0; i < 4; i++) {
      const t = 0.14 + rand() * 0.72;
      const up = i % 2 === 0 ? 1 : -1;
      const p = GA.clone().addScaledVector(GD, t)
        .addScaledVector(RIGHT, (rand() - 0.5) * 10)
        .addScaledVector(UPN, up * (8.5 + rand() * 3.5));
      place(p, i === 1, 0.012 + rand() * 0.012, 15 + rand() * 12);
    }
  }

  /* ---------------- colony surge (pod-hover response, OW-3) --------------
     One broad slow pulse through the whole colony: every cord re-fires its
     travelling wave in a stagger, and the three hyphae depth batches run a
     single quiet light-sweep along their strands, far layer last. This is
     interaction-triggered only — ambient behaviour stays loop-free. */
  let surgeT = -1;
  function surge() {
    surgeT = 0;
    cords.forEach((c, ci) => { c.p = -0.04 - ci * 0.22; c.boost = 1.0; });
  }

  /* ---------------- frame update ---------------- */
  function update(dt, time) {
    for (const m of timeMats) if (m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = time;
    // rhizomorph cords: slow, uneven, independent travelling waves
    for (const c of cords) {
      const jitter = 0.55 + 0.8 * (0.5 + 0.5 * H.noise3(time * 0.07, c.k, 0));
      c.p += dt * c.speed * (c.boost ? jitter * (1 + c.boost * 2.2) : jitter);
      if (c.p > 1.28) c.p = -0.12 - rndA() * 0.85;
      c.mat.uniforms.uPulse.value = c.p;
      c.mat.uniforms.uPulseOn.value =
        ((c.p > -0.1 && c.p < 1.2) ? 0.55 : 0) * (1 + (c.boost || 0) * 1.1);
      if (c.boost) c.boost = c.boost < 0.02 ? 0 : c.boost * Math.exp(-dt * 0.5);
    }
    if (surgeT >= 0) {
      surgeT += dt;
      hyphae.forEach((hb, i) => {
        const p = surgeT * 0.42 - i * 0.22;
        const on = (p > 0 && p < 1) ? Math.sin(Math.PI * p) : 0;
        hb.mat.uniforms.uPulse.value = clamp(p, 0, 1);
        hb.mat.uniforms.uPulseOn.value = on * 0.24;
      });
      if (surgeT > 4.5) {
        surgeT = -1;
        for (const hb of hyphae) hb.mat.uniforms.uPulseOn.value = 0;
      }
    }
    // foreground soil parallax: near aggregates drift very slowly
    const drift = H.noise3(time * 0.031, 4.4, 0) * 0.10;
    aggNear.pts.position.set(drift, H.noise3(0, time * 0.027, 9.1) * 0.07, -drift * 0.6);
    aggFar.mat.opacity = aggFar.baseOp * (0.85 + 0.15 * (0.5 + 0.5 * Math.sin(time * 0.09)));
    aggNear.mat.opacity = aggNear.baseOp * (0.82 + 0.18 * (0.5 + 0.5 * Math.sin(time * 0.063 + 1.7)));
  }

  return {
    group, update, surge, cordPoints, nearestCordPoint, inVoid, glideDist,
    counts: {
      hyphaeVerts,
      cordVerts,
      aggPoints,
      hyphaeStrands: 3800 + 4400 + 1700,
      cords: CORD_SPECS.length,
    },
  };
}
