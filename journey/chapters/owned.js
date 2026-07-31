// Chapter 5 — OWNED: the people-powered mycelial mat, seen from underneath.
//
// A volumetric, substrate-bound colony filling x∈[−22,22], y∈[−7,7], z∈[−16,16]:
// thousands of fine hyphae following one coherent flow field, 5 thick rhizomorph
// cords carrying slow travelling waves, authored dark soil pockets (density
// holes + explicit voids), and soil-aggregate hints. Three ownership pods are
// warm knots the mycelium visibly feeds into; ~14 contributor nodes are ember
// "portraits" GROWN INTO the field — every one has real strand geometry that
// terminates at it, a real 3D fibre rim, and it sits at its own depth so the
// glide passes some out of focus in the foreground while others emerge from
// amber haze. There is no sky and no above-ground scene: one cord rises out of
// the mat toward the fruiting body above and leaves frame, and that is all.
//
// See CONTRACT.md — cluster envelope "owned" — and handoff.md CHAPTER 5.
// Local coords only; core offsets the group to (0,0,880).
import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

/* ------------------------------------------------------------------ */
/* local geometry utilities (kept in-chapter per CONTRACT)             */
/* ------------------------------------------------------------------ */

// Merge indexed geometries carrying position / aAlong / aStrand into one.
function mergeGeos(geos) {
  let vTotal = 0, iTotal = 0;
  for (const g of geos) {
    vTotal += g.attributes.position.count;
    iTotal += g.index ? g.index.count : 0;
  }
  const pos = new Float32Array(vTotal * 3);
  const along = new Float32Array(vTotal);
  const strand = new Float32Array(vTotal);
  const idx = iTotal ? (vTotal > 65535 ? new Uint32Array(iTotal) : new Uint16Array(iTotal)) : null;
  let vo = 0, io = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    const a = g.attributes.aAlong;
    const s = g.attributes.aStrand;
    pos.set(p.array, vo * 3);
    if (a) along.set(a.array, vo);
    if (s) strand.set(s.array, vo);
    if (idx && g.index) {
      const src = g.index.array;
      for (let k = 0; k < src.length; k++) idx[io + k] = src[k] + vo;
      io += src.length;
    }
    vo += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
  out.setAttribute('aStrand', new THREE.BufferAttribute(strand, 1));
  if (idx) out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/* ------------------------------------------------------------------ */
/* node-strand material: one draw call for every node's LOCAL strands.  */
/* aNode selects which node's strands illuminate, so hover lights only  */
/* the fibres that actually terminate at that person / pod.             */
/* aAlong runs 0 (out in the field) → 1 (at the node), so the pulse      */
/* travels INTO the node.                                               */
/* ------------------------------------------------------------------ */
function makeNodeStrandMat(THREE_, baseColor, pulseColor, opts = {}) {
  return new THREE_.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: -1 },
      uPulseOn: { value: 0 },
      uActive: { value: -999 },
      uActiveAmt: { value: 0 },
      uBase: { value: opts.baseOpacity ?? 0.13 },
      uWidth: { value: opts.pulseWidth ?? 0.13 },
      uFogDensity: { value: opts.fogDensity ?? 0.018 },
      uColor: { value: new THREE_.Color(baseColor) },
      uPulseColor: { value: new THREE_.Color(pulseColor) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE_.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      attribute float aNode;
      uniform float uActive, uActiveAmt;
      varying float vA, vS, vSel, vFog;
      void main() {
        vA = aAlong; vS = aStrand;
        vSel = step(abs(aNode - uActive), 0.5) * uActiveAmt;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFog = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uPulse, uPulseOn, uBase, uWidth, uFogDensity;
      uniform vec3 uColor, uPulseColor;
      varying float vA, vS, vSel, vFog;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.41 + vS * 1.55) + vS * 51.3);
        // strands read a touch hotter where they meet the node
        float amb = uBase * (0.66 + 0.34 * tw) * (0.65 + 0.55 * vA);
        float d = vA - uPulse;
        float p = exp(-d * d / (uWidth * uWidth)) * uPulseOn * vSel;
        float trail = 0.26 * exp(min(d, 0.0) * 6.0) * step(d, 0.0) * uPulseOn * vSel;
        vec3 col = uColor * amb * (1.0 + 2.10 * vSel) + uPulseColor * (p + trail) * 1.25;
        col *= exp(-uFogDensity * uFogDensity * vFog * vFog);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/* ------------------------------------------------------------------ */
export function createChapter(ctx) {
  const H = ctx.helpers;
  const P = ctx.palette;
  const reduced = !!ctx.reducedMotion;
  const V3 = THREE.Vector3;
  const V = (x, y, z) => new V3(x, y, z);

  const group = new THREE.Group();
  group.name = 'owned';

  const disposables = [];   // { dispose() }
  const timeMats = [];      // everything with a uTime uniform
  const rndA = H.rng(31337);

  /* ================================================================ */
  /* SUBSTRATE FIELD — density, authored voids, the camera glide line  */
  /* ================================================================ */

  // Camera glides (−14,1.8,6) → (11,3.4,−4); this line is the spine the
  // contributor nodes are strung along so they are encountered in passing.
  const GA = V(-15.5, 1.4, 6.8);
  const GB = V(12.5, 3.2, -4.8);
  const GD = GB.clone().sub(GA);
  const GLEN2 = GD.lengthSq();
  const GDIR = GD.clone().normalize();
  const RIGHT = new V3().crossVectors(GDIR, V(0, 1, 0)).normalize();
  const UPN = new V3().crossVectors(RIGHT, GDIR).normalize();

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

  // Explicitly authored dark pockets, placed where the glide will read them.
  const VOIDS = [
    { c: V(-10.5, -1.2, 1.0), r: 4.6 },
    { c: V(-3.0, -4.4, -6.5), r: 5.2 },
    { c: V(3.5, 3.6, 6.0), r: 4.2 },
    { c: V(9.5, -3.0, 2.4), r: 5.0 },
    { c: V(16.0, 1.4, -9.0), r: 4.4 },
    { c: V(-17.5, 4.2, -6.0), r: 4.0 },
  ];
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

  const POD_SHARED_POS = V(0, 3.5, 0);
  const WAVE_MAX_R = 30;

  // Rewrite aAlong as normalized radius from the primary pod, so the shared
  // makePulseMat "travelling pulse" becomes a broad spherical colony wave.
  function radialAlong(geo, center, maxR) {
    const pos = geo.attributes.position;
    const a = geo.attributes.aAlong;
    for (let i = 0; i < pos.count; i++) {
      const dx = pos.getX(i) - center.x;
      const dy = pos.getY(i) - center.y;
      const dz = pos.getZ(i) - center.z;
      a.setX(i, Math.min(1, Math.sqrt(dx * dx + dy * dy + dz * dz) / maxR));
    }
    a.needsUpdate = true;
  }

  /* ================================================================ */
  /* FINE HYPHAE — three depth batches, thousands of strands            */
  /* ================================================================ */
  const hyphae = [];   // { lines, mat, geo, base, full, pulseScale }

  function hyphaBatch(spec) {
    const res = H.strandLines({
      count: spec.count, seed: spec.seed,
      generator: (i, rand) => {
        let x, y, z;
        if (spec.rMax) {
          // sample inside a tube hugging the glide line — the layers the
          // camera actually brushes past are authored, not left to chance
          const t = -0.04 + rand() * 1.08;
          const a = rand() * TAU;
          const rr = spec.rMin + (spec.rMax - spec.rMin) * Math.sqrt(rand());
          const cs = Math.cos(a) * rr, sn = Math.sin(a) * rr * 0.78;
          x = clamp(GA.x + GD.x * t + RIGHT.x * cs + UPN.x * sn, -21.5, 21.5);
          y = clamp(GA.y + GD.y * t + RIGHT.y * cs + UPN.y * sn, -6.8, 6.8);
          z = clamp(GA.z + GD.z * t + RIGHT.z * cs + UPN.z * sn, -15.5, 15.5);
        } else {
          x = -21.5 + rand() * 43;
          y = -6.8 + rand() * 13.6;
          z = -15.5 + rand() * 31;
          // the far layer stays out of the corridor the near layers own
          if (glideDist(x, y, z) < spec.gdMin && rand() < 0.78) return null;
        }
        // --- dark pockets are authored, not accidental ---
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
    radialAlong(res.geometry, POD_SHARED_POS, WAVE_MAX_R);
    const mat = H.makePulseMat(spec.color, {
      baseOpacity: spec.base, twinkle: spec.twinkle, pulseWidth: spec.pulseWidth,
      pulseColor: spec.pulseColor, fogDensity: spec.fog,
    });
    const lines = new THREE.LineSegments(res.geometry, mat);
    lines.frustumCulled = false;
    lines.renderOrder = spec.order;
    group.add(lines);
    timeMats.push(mat);
    const rec = {
      lines, mat, geo: res.geometry, base: spec.base,
      full: res.geometry.attributes.position.count, pulseScale: spec.pulseScale,
    };
    hyphae.push(rec);
    return rec;
  }

  // far: fills the whole volume, dissolving into amber haze
  hyphaBatch({
    count: 2600, seed: 2201, cut: -0.09, gdMin: 6.0,
    lenMin: 3.2, lenMax: 7.6, color: P.deepGold, pulseColor: P.ember,
    base: 0.085, twinkle: 0.64, pulseWidth: 0.10, fog: 0.031,
    pulseScale: 0.75, order: -6,
  });
  // mid: the body of the colony, wrapped around the glide
  hyphaBatch({
    count: 2200, seed: 3307, cut: -0.05, rMin: 2.5, rMax: 15.0,
    lenMin: 2.4, lenMax: 5.4, color: 0xb98a35, pulseColor: P.goldBright,
    base: 0.140, twinkle: 0.55, pulseWidth: 0.09, fog: 0.021,
    pulseScale: 1.0, order: -5,
  });
  // near: sharp, hot, brushing past the lens
  hyphaBatch({
    count: 1000, seed: 4409, cut: -0.05, rMin: 0.6, rMax: 7.0,
    lenMin: 1.6, lenMax: 3.8, color: P.gold, pulseColor: P.goldBright,
    base: 0.215, twinkle: 0.42, pulseWidth: 0.085, fog: 0.012,
    pulseScale: 1.15, order: -4,
  });

  /* ================================================================ */
  /* RHIZOMORPH CORDS — 5 thick cords carrying SLOW travelling waves    */
  /* ================================================================ */
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

  const CORD_SPECS = [
    { seed: 6101, a: V(-21.5, -3.0, 8.0), b: V(19.0, 1.6, -6.0), r: 0.195,
      col: P.gold, pulse: P.goldBright, bow: V(0.5, 2.2, -3.2), speed: 0.052, base: 0.40 },
    { seed: 6203, a: V(-19.0, 4.2, -9.5), b: V(17.0, -3.4, 6.5), r: 0.150,
      col: 0xb98a35, pulse: P.ember, bow: V(-1.0, -1.7, 2.6), speed: 0.038, base: 0.33 },
    { seed: 6301, a: V(-12.0, -6.0, 2.5), b: V(20.5, 4.4, -11.0), r: 0.130,
      col: P.deepGold, pulse: P.ember, bow: V(2.0, 1.5, 3.4), speed: 0.031, base: 0.30 },
    { seed: 6407, a: V(-16.5, 1.0, -2.0), b: V(6.0, -5.6, 12.0), r: 0.110,
      col: P.gold, pulse: P.goldBright, bow: V(-2.6, 1.1, -1.6), speed: 0.045, base: 0.28 },
    // the mat's link to the fruiting body above: it rises and leaves frame.
    { seed: 6521, a: V(-8.2, -4.8, 5.2), b: V(-1.2, 7.0, 0.6), r: 0.170,
      col: P.goldBright, pulse: P.goldBright, bow: V(1.7, 0.6, -2.4), speed: 0.061, base: 0.46 },
  ];

  const cords = [];
  const cordPoints = [];     // sampled spines, reused as strand origins
  CORD_SPECS.forEach((S, ci) => {
    const rand = H.rng(S.seed);
    const SEG = 11;
    const pts = [];
    for (let j = 0; j <= SEG; j++) {
      const t = j / SEG;
      const p = S.a.clone().lerp(S.b, t);
      const hump = Math.sin(Math.PI * t);
      p.addScaledVector(S.bow, hump);
      p.x += H.fbm3(t * 3.1 + ci * 5.3, 0.7, 2.1, 3) * 1.5;
      p.y += H.fbm3(1.9, t * 3.4 + ci * 2.7, 0.4, 3) * 1.15;
      p.z += H.fbm3(4.4, 0.3, t * 3.0 + ci * 4.1, 3) * 1.5;
      pts.push(p);
    }
    cordPoints.push(pts);
    const geo = tubeStrand(pts, {
      radius: S.r, radialSegments: 6, tubularSegments: 64, taper: 0.55 + rand() * 0.3,
    }, ci / CORD_SPECS.length);
    const mat = H.makePulseMat(S.col, {
      baseOpacity: S.base, twinkle: 0.14, pulseWidth: 0.075,
      pulseColor: S.pulse, fogDensity: 0.010,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    timeMats.push(mat);
    disposables.push(geo);
    cords.push({
      mesh, mat, geo, base: S.base,
      p: -0.2 - ci * 0.31, speed: S.speed, k: ci * 4.7 + 1.3,
      full: geo.index ? geo.index.count : geo.attributes.position.count,
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

  /* ================================================================ */
  /* OWNERSHIP PODS — warm knots the mycelium feeds into                */
  /* ================================================================ */
  const POD_SPECS = [
    {
      id: 'pod-shared', pos: POD_SHARED_POS.clone(), primary: true, seed: 4801,
      tangle: 16, R: 0.90, wob: 0.16, color: P.goldBright, coreColor: P.goldBright,
      coreScale: 2.30, coreOp: 0.60, haloScale: 7.2, haloOp: 0.115,
      strands: 14, radius: 1.4, base: 0.46, labelY: 1.35,
    },
    {
      id: 'pod-monthly', pos: V(-6, -1.5, 3), primary: false, seed: 4907,
      tangle: 9, R: 0.50, wob: 0.12, color: P.gold, coreColor: P.ember,
      coreScale: 1.10, coreOp: 0.36, haloScale: 2.6, haloOp: 0.055,
      strands: 7, radius: 1.2, base: 0.30, labelY: 0.95,
    },
    {
      id: 'pod-split', pos: V(6, -2, -3), primary: false, seed: 5011,
      tangle: 9, R: 0.48, wob: 0.12, color: P.gold, coreColor: P.ember,
      coreScale: 1.05, coreOp: 0.34, haloScale: 2.4, haloOp: 0.050,
      strands: 7, radius: 1.2, base: 0.30, labelY: 0.95,
    },
  ];

  const pods = {};
  const podOrder = [];
  POD_SPECS.forEach((S, pi) => {
    const rand = H.rng(S.seed);
    const pg = new THREE.Group();
    pg.position.copy(S.pos);

    // tangled knot of short tubes — a knot, never a sphere
    const geos = [];
    for (let i = 0; i < S.tangle; i++) {
      const a0 = rand() * TAU;
      const tilt = (rand() - 0.5) * 1.6;
      const R = S.R * (0.45 + rand() * 0.65);
      const span = 0.9 + rand() * 2.1;
      const segs = 5;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const a = a0 + t * span;
        const rr = R * (1 - 0.38 * t);
        const w = H.noise3(i * 3.1, t * 3.7, S.seed * 0.001) * S.wob;
        pts.push(V(
          Math.cos(a) * (rr + w),
          (t - 0.5) * R * 1.35 * (0.4 + tilt) + w * 0.7,
          Math.sin(a) * (rr + w),
        ));
      }
      geos.push(tubeStrand(pts, {
        radius: 0.030 + rand() * 0.038, radialSegments: 4,
        tubularSegments: 12, taper: 0.55 + rand() * 0.4,
      }, i / S.tangle));
    }
    const knotMat = H.makePulseMat(S.color, {
      baseOpacity: S.base, twinkle: 0.20, pulseWidth: 0.20,
      pulseColor: P.goldBright, fogDensity: 0.006,
    });
    const knot = new THREE.Mesh(mergeGeos(geos), knotMat);
    knot.frustumCulled = false;
    pg.add(knot);
    timeMats.push(knotMat);
    disposables.push(knot.geometry);

    // hot core + broad halo (never white — goldBright/ember only)
    const coreMat = new THREE.SpriteMaterial({
      map: H.glowSprite(S.coreColor, 64), color: new THREE.Color(S.coreColor),
      transparent: true, opacity: S.coreOp, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true,
    });
    const core = new THREE.Sprite(coreMat);
    core.scale.setScalar(S.coreScale);
    pg.add(core);

    const haloMat = new THREE.SpriteMaterial({
      map: H.glowSprite(P.ember, 64), color: new THREE.Color(P.ember),
      transparent: true, opacity: S.haloOp, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(S.haloScale);
    halo.renderOrder = -3;
    pg.add(halo);

    group.add(pg);
    pods[S.id] = {
      id: S.id, spec: S, group: pg, knot, knotMat, knotBase: S.base,
      core, coreMat, coreBase: S.coreOp, coreScale: S.coreScale,
      halo, haloMat, haloBase: S.haloOp, haloScale: S.haloScale,
      driver: H.pulseDriver(1.9), hover: 0, sel: 0,
      nodeIdx: 100 + pi, flick: rand() * TAU,
    };
    podOrder.push(pods[S.id]);
  });

  /* ---------- convergence: real hyphae terminating at the primary pod ---------- */
  const converge = (() => {
    const res = H.strandLines({
      count: 150, seed: 5501,
      generator: (i, rand) => {
        const a = rand() * TAU;
        const b = (rand() - 0.5) * Math.PI * 0.8;
        const r = 5.5 + Math.pow(rand(), 0.7) * 12.0;
        const start = V(
          POD_SHARED_POS.x + Math.cos(a) * Math.cos(b) * r,
          clamp(POD_SHARED_POS.y + Math.sin(b) * r * 0.55, -6.6, 6.6),
          POD_SHARED_POS.z + Math.sin(a) * Math.cos(b) * r,
        );
        if (inVoid(start.x, start.y, start.z)) return null;
        const segs = 4;
        const pts = [];
        for (let j = 0; j <= segs; j++) {
          const t = j / segs;
          const e = H.easings.smooth(t);
          const p = start.clone().lerp(POD_SHARED_POS, e);
          const hump = Math.sin(Math.PI * t);
          p.x += H.fbm3(i * 1.7, t * 2.9, 3.3, 3) * 2.3 * hump;
          p.y += H.fbm3(5.1, t * 3.1 + i * 0.9, 0.4, 3) * 1.7 * hump;
          p.z += H.fbm3(2.2, 1.4, t * 2.7 + i * 1.3, 3) * 2.3 * hump;
          pts.push(p);
        }
        return pts;
      },
    });
    const mat = H.makePulseMat(P.gold, {
      baseOpacity: 0.115, twinkle: 0.48, pulseWidth: 0.10,
      pulseColor: P.goldBright, fogDensity: 0.016,
    });
    const lines = new THREE.LineSegments(res.geometry, mat);
    lines.frustumCulled = false;
    lines.renderOrder = -4;
    group.add(lines);
    timeMats.push(mat);
    return {
      lines, mat, geo: res.geometry, base: 0.115,
      full: res.geometry.attributes.position.count,
      driver: H.pulseDriver(2.4),
    };
  })();

  /* ================================================================ */
  /* CONTRIBUTOR NODES — placement along the glide, at many depths      */
  /* ================================================================ */
  const contributors = (ctx.content && ctx.content.contributors ? ctx.content.contributors : []).slice(0, 14);
  const NODE_COUNT = contributors.length;

  const nodes = contributors.map((c, i) => {
    const rand = H.rng(((c.seed ?? (i + 1)) * 7919 + 17) >>> 0);
    let pos;
    if (c.pos) {
      pos = Array.isArray(c.pos) ? V(c.pos[0], c.pos[1], c.pos[2]) : V(c.pos.x, c.pos.y, c.pos.z);
    } else {
      const u = clamp((i + 0.5) / Math.max(NODE_COUNT, 1) + (rand() - 0.5) * 0.085, 0.02, 0.98);
      const base = GA.clone().addScaledVector(GD, u);
      const a = rand() * TAU;
      // pow bias: a few very close (foreground, out of focus), most mid, some far
      const d = 1.25 + Math.pow(rand(), 1.7) * 8.4;
      pos = base.clone()
        .addScaledVector(RIGHT, Math.cos(a) * d)
        .addScaledVector(UPN, Math.sin(a) * d * 0.66);
      pos.x = clamp(pos.x, -20, 20);
      pos.y = clamp(pos.y, -6.2, 6.2);
      pos.z = clamp(pos.z, -14.5, 14.5);
      // never collide with a pod
      for (const p of podOrder) {
        const dd = pos.distanceTo(p.spec.pos);
        if (dd < 2.8) pos.addScaledVector(pos.clone().sub(p.spec.pos).normalize(), 2.8 - dd + 0.6);
      }
    }
    return {
      id: c.id, i, pos,
      size: 0.42 + rand() * 0.19,
      cell: i % 4,
      seed: rand(),
      strandCount: 3 + Math.floor(rand() * 3),
      linkPod: rand() < 0.45,
      rand,
    };
  });

  /* ---------- local strands that visibly TERMINATE at each node ---------- */
  function buildNodeStrandGeo(specs) {
    const pos = [], along = [], strand = [], nodeA = [];
    const N = 8;
    for (const s of specs) {
      const curve = H.catmull(s.pts);
      let prev = curve.getPointAt(0);
      for (let j = 1; j <= N; j++) {
        const t = j / N;
        const p = curve.getPointAt(t);
        pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        along.push((j - 1) / N, t);
        strand.push(s.strand, s.strand);
        nodeA.push(s.node, s.node);
        prev = p;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    geo.setAttribute('aStrand', new THREE.Float32BufferAttribute(strand, 1));
    geo.setAttribute('aNode', new THREE.Float32BufferAttribute(nodeA, 1));
    return geo;
  }

  const nodeStrandSpecs = [];
  function addLocalStrands(target, nodeIdx, count, seed, minLen, maxLen, cordBias) {
    const rand = H.rng(seed >>> 0);
    for (let k = 0; k < count; k++) {
      let start = null;
      if (rand() < cordBias) start = nearestCordPoint(target, rand);
      if (!start) {
        const a = rand() * TAU;
        const b = (rand() - 0.5) * Math.PI * 0.85;
        const r = minLen + rand() * (maxLen - minLen);
        start = V(
          target.x + Math.cos(a) * Math.cos(b) * r,
          clamp(target.y + Math.sin(b) * r * 0.75, -6.8, 6.8),
          target.z + Math.sin(a) * Math.cos(b) * r,
        );
      }
      const segs = 5;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const e = H.easings.smooth(t);
        const p = start.clone().lerp(target, e);
        const hump = Math.sin(Math.PI * t);
        p.x += H.fbm3(k * 2.3 + seed * 0.0007, t * 3.3, 1.7, 3) * 0.95 * hump;
        p.y += H.fbm3(3.9, t * 3.1 + k * 1.4, seed * 0.0005, 3) * 0.72 * hump;
        p.z += H.fbm3(1.1, 2.6, t * 2.8 + k * 1.9, 3) * 0.95 * hump;
        pts.push(p);
      }
      pts[segs].copy(target);   // terminate exactly at the node
      nodeStrandSpecs.push({ pts, node: nodeIdx, strand: (k + 1) / (count + 1) });
    }
  }

  for (const n of nodes) {
    addLocalStrands(n.pos, n.i, n.strandCount, 8100 + n.i * 173, 1.7, 4.2, 0.45);
    // some contributors have a longer fibre running to the pod that holds
    // their stake — hovering the person reveals that relationship.
    if (n.linkPod) {
      let best = podOrder[0], bd = 1e9;
      for (const p of podOrder) {
        const d = n.pos.distanceTo(p.spec.pos);
        if (d < bd) { bd = d; best = p; }
      }
      const segs = 5;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const p = best.spec.pos.clone().lerp(n.pos, H.easings.smooth(t));
        const hump = Math.sin(Math.PI * t);
        p.y += H.fbm3(n.i * 2.1, t * 2.4, 6.3, 3) * 1.5 * hump;
        p.x += H.fbm3(7.2, t * 2.2 + n.i * 1.1, 0.9, 3) * 1.6 * hump;
        p.z += H.fbm3(0.5, 4.8, t * 2.6 + n.i * 1.7, 3) * 1.6 * hump;
        pts.push(p);
      }
      pts[segs].copy(n.pos);
      nodeStrandSpecs.push({ pts, node: n.i, strand: 0.95 });
    }
  }
  for (const p of podOrder) {
    addLocalStrands(p.spec.pos, p.nodeIdx, p.spec.strands, 9200 + p.nodeIdx * 211,
      2.2, p.spec.primary ? 7.0 : 4.4, 0.5);
  }

  const nodeStrands = (() => {
    const geo = buildNodeStrandGeo(nodeStrandSpecs);
    const mat = makeNodeStrandMat(THREE, P.gold, P.goldBright, {
      baseOpacity: 0.135, pulseWidth: 0.13, fogDensity: 0.016,
    });
    const lines = new THREE.LineSegments(geo, mat);
    lines.frustumCulled = false;
    lines.renderOrder = -3;
    group.add(lines);
    timeMats.push(mat);
    disposables.push(geo);
    return { lines, mat, geo, base: 0.135, driver: H.pulseDriver(1.35) };
  })();

  /* ================================================================ */
  /* PORTRAIT TREATMENT — anonymous ember nodes (consent:false)         */
  /* 4-variant procedural atlas: warm tissue disc, fibrous striations,  */
  /* irregular ember rim, outward fibre ticks that dissolve into the    */
  /* mycelium. No photographs anywhere.                                 */
  /* ================================================================ */
  const CELL = 128;
  function portraitAtlas() {
    const size = CELL * 2;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.clearRect(0, 0, size, size);
    for (let v = 0; v < 4; v++) {
      const ox = (v % 2) * CELL, oy = ((v / 2) | 0) * CELL;
      const r = H.rng(9100 + v * 131);
      const cx = ox + CELL / 2, cy = oy + CELL / 2;
      const R = CELL * 0.36;
      g.save();
      g.beginPath(); g.rect(ox, oy, CELL, CELL); g.clip();

      // warm body, off-centre so it never reads as a UI avatar
      const grad = g.createRadialGradient(cx - R * 0.20, cy - R * 0.22, R * 0.05, cx, cy, R);
      grad.addColorStop(0.00, 'rgba(255,208,152,0.90)');
      grad.addColorStop(0.30, 'rgba(240,176,110,0.60)');
      grad.addColorStop(0.68, 'rgba(196,131,62,0.32)');
      grad.addColorStop(1.00, 'rgba(120,78,32,0.0)');
      g.fillStyle = grad;
      g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();

      g.globalCompositeOperation = 'lighter';
      // fibrous tissue striations inside the disc
      for (let k = 0; k < 26; k++) {
        const a0 = r() * TAU;
        const rr0 = R * (0.08 + r() * 0.52);
        const rr1 = R * (0.52 + r() * 0.42);
        const sweep = (r() - 0.5) * 1.15;
        g.strokeStyle = `rgba(255,${170 + ((r() * 50) | 0)},${90 + ((r() * 60) | 0)},${(0.05 + r() * 0.12).toFixed(3)})`;
        g.lineWidth = 0.5 + r() * 1.5;
        g.beginPath();
        for (let s = 0; s <= 8; s++) {
          const t = s / 8;
          const a = a0 + sweep * t;
          const rr = rr0 + (rr1 - rr0) * t;
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          if (s) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.stroke();
      }
      // fine speckle (spore / cytoplasm grain)
      for (let k = 0; k < 42; k++) {
        const a = r() * TAU, rr = R * Math.sqrt(r()) * 0.92;
        g.fillStyle = `rgba(255,200,140,${(0.03 + r() * 0.10).toFixed(3)})`;
        g.beginPath();
        g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.5 + r() * 1.3, 0, TAU);
        g.fill();
      }
      // irregular ember rim: many short arcs, never a clean circle stroke
      for (let k = 0; k < 64; k++) {
        const a0 = (k / 64) * TAU + (r() - 0.5) * 0.06;
        const a1 = a0 + (TAU / 64) * (1.05 + r() * 0.55);
        const rr = R * (0.90 + (r() - 0.5) * 0.10);
        g.strokeStyle = `rgba(255,${185 + ((r() * 45) | 0)},${115 + ((r() * 55) | 0)},${(0.10 + r() * 0.40).toFixed(3)})`;
        g.lineWidth = 1.0 + r() * 2.2;
        g.beginPath(); g.arc(cx, cy, rr, a0, a1); g.stroke();
      }
      // outward fibre ticks: the node frays into the surrounding mycelium
      for (let k = 0; k < 40; k++) {
        const a = r() * TAU;
        const r0 = R * 0.93, r1 = R * (1.02 + r() * 0.26);
        const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
        const bend = (r() - 0.5) * 0.20;
        const x1 = cx + Math.cos(a + bend) * r1, y1 = cy + Math.sin(a + bend) * r1;
        const gl = g.createLinearGradient(x0, y0, x1, y1);
        gl.addColorStop(0, `rgba(255,190,120,${(0.10 + r() * 0.28).toFixed(3)})`);
        gl.addColorStop(1, 'rgba(255,190,120,0)');
        g.strokeStyle = gl;
        g.lineWidth = 0.6 + r() * 1.1;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      }
      g.restore();
      g.globalCompositeOperation = 'source-over';
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    return tex;
  }

  const atlasTex = portraitAtlas();
  disposables.push(atlasTex);

  // Billboarding happens in the vertex shader (view-space offsets), so the
  // chapter never needs the camera object and the rim fibres stay welded to
  // the disc they belong to.
  const portraitMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: atlasTex },
      uRim: { value: new THREE.Color(P.ember) },
      uCore: { value: new THREE.Color(P.goldBright) },
      uHaze: { value: new THREE.Color(P.deepGold) },
      uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
      uSelIdx: { value: -999 }, uSelAmt: { value: 0 },
      uWave: { value: 0 }, uWaveOn: { value: 0 },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec2 aCorner;
      attribute vec2 aCell;
      attribute float aNode;
      attribute float aSeed;
      attribute float aSize;
      attribute float aRadial;
      uniform float uHoverIdx, uHoverAmt, uSelIdx, uSelAmt, uWave, uWaveOn;
      varying vec2 vUv;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWave;
      void main() {
        vQ = aCorner;
        vUv = (aCorner * 0.5 + 0.5) * 0.5 + aCell;
        vSeed = aSeed;
        float h = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
        float s = step(abs(aNode - uSelIdx), 0.5) * uSelAmt;
        vH = max(h, s * 0.88);
        // broad colony wave reaches this node at its own radius
        float dw = aRadial - uWave;
        vWave = exp(-dw * dw / 0.0125) * uWaveOn;

        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.z += vH * 0.62;                       // step forward in depth
        float dist = max(-mv.z, 0.05);
        float nearBlur = (1.0 - smoothstep(1.4, 5.5, dist)) * (1.0 - vH * 0.7);
        vSoft = nearBlur;
        float size = aSize * (1.0 + 0.13 * vH) * (1.0 + nearBlur * 1.85);
        mv.xy += aCorner * size;
        vDepth = dist;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uRim, uCore, uHaze;
      uniform float uTime, uOpacity;
      varying vec2 vUv;
      varying vec2 vQ;
      varying float vSeed, vH, vSoft, vDepth, vWave;
      void main() {
        float r = length(vQ);
        if (r > 1.02) discard;
        vec4 t = texture2D(uMap, vUv);
        // foreground nodes drift out of focus: mask dissolves into a broad blur
        float soft = exp(-r * r * 1.7);
        float mask = mix(t.a, soft * 0.72, vSoft * 0.88);
        // independent halo flicker — two incommensurate rates, no shared loop
        float flick = 0.84 + 0.16 * (
            0.62 * sin(uTime * (0.29 + vSeed * 0.61) + vSeed * 17.3)
          + 0.38 * sin(uTime * (0.163 + vSeed * 0.37) + vSeed * 5.1));
        float rq = (r - 0.72) / 0.115;
        float rim = exp(-rq * rq);
        float boost = vH + vWave * 0.55;
        vec3 col = t.rgb
          + uRim * rim * (0.30 + 1.55 * boost) * (1.0 - vSoft * 0.55)
          + uCore * exp(-r * r * 8.0) * (0.22 + 0.62 * boost);
        // distant nodes emerge from amber haze rather than vanishing to black
        float haze = exp(-0.00135 * vDepth * vDepth);
        col = mix(uHaze * 0.55, col, clamp(haze + 0.14, 0.0, 1.0)) * flick;
        float alpha = mask * (1.0 - vSoft * 0.70) * (0.35 + 0.75 * haze) * uOpacity;
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  timeMats.push(portraitMat);

  const portraits = (() => {
    const n = NODE_COUNT;
    const pos = new Float32Array(n * 4 * 3);
    const corner = new Float32Array(n * 4 * 2);
    const cell = new Float32Array(n * 4 * 2);
    const nodeA = new Float32Array(n * 4);
    const seedA = new Float32Array(n * 4);
    const sizeA = new Float32Array(n * 4);
    const radA = new Float32Array(n * 4);
    const idx = new Uint16Array(n * 6);
    const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    nodes.forEach((nd, i) => {
      const cx = (nd.cell % 2) * 0.5, cy = ((nd.cell / 2) | 0) * 0.5;
      const rad = Math.min(1, nd.pos.distanceTo(POD_SHARED_POS) / WAVE_MAX_R);
      for (let k = 0; k < 4; k++) {
        const v = i * 4 + k;
        pos[v * 3 + 0] = nd.pos.x; pos[v * 3 + 1] = nd.pos.y; pos[v * 3 + 2] = nd.pos.z;
        corner[v * 2 + 0] = CORNERS[k][0]; corner[v * 2 + 1] = CORNERS[k][1];
        cell[v * 2 + 0] = cx; cell[v * 2 + 1] = cy;
        nodeA[v] = i; seedA[v] = nd.seed * 9.7 + i * 1.31;
        sizeA[v] = nd.size; radA[v] = rad;
      }
      const o = i * 4;
      idx.set([o, o + 1, o + 2, o, o + 2, o + 3], i * 6);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aCorner', new THREE.BufferAttribute(corner, 2));
    geo.setAttribute('aCell', new THREE.BufferAttribute(cell, 2));
    geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
    geo.setAttribute('aRadial', new THREE.BufferAttribute(radA, 1));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const mesh = new THREE.Mesh(geo, portraitMat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    group.add(mesh);
    disposables.push(geo);
    return { mesh, geo, fullIndex: n * 6, planes: n };
  })();

  /* ---------- real 3D fibre rim: short strands radiating off each disc ---------- */
  const RIM_FIBRES = 12;
  const rimMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(P.ember) },
      uHot: { value: new THREE.Color(P.goldBright) },
      uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
      uSelIdx: { value: -999 }, uSelAmt: { value: 0 },
      uBase: { value: 0.42 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec2 aOff;
      attribute float aNode;
      attribute float aSeed;
      attribute float aAlong;
      uniform float uTime, uHoverIdx, uHoverAmt, uSelIdx, uSelAmt;
      varying float vA, vSeed, vH, vSoft, vDepth;
      void main() {
        vA = aAlong; vSeed = aSeed;
        float h = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
        float s = step(abs(aNode - uSelIdx), 0.5) * uSelAmt;
        vH = max(h, s * 0.88);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.z += vH * 0.62;
        float dist = max(-mv.z, 0.05);
        float nearBlur = (1.0 - smoothstep(1.4, 5.5, dist)) * (1.0 - vH * 0.7);
        vSoft = nearBlur; vDepth = dist;
        // moisture/substrate sway: per-fibre phase, tiny amplitude
        float ang = sin(uTime * (0.20 + aSeed * 0.47) + aSeed * 11.3) * 0.05;
        float ca = cos(ang), sa = sin(ang);
        vec2 o = vec2(aOff.x * ca - aOff.y * sa, aOff.x * sa + aOff.y * ca);
        mv.xy += o * (1.0 + 0.11 * vH) * (1.0 + nearBlur * 1.85);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor, uHot;
      uniform float uTime, uBase;
      varying float vA, vSeed, vH, vSoft, vDepth;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.37 + vSeed * 0.9) + vSeed * 23.1);
        float fall = 1.0 - vA;                    // hot at the rim, fading outward
        float a = uBase * fall * fall * (0.62 + 0.38 * tw) * (1.0 - vSoft * 0.75);
        a *= exp(-0.0013 * vDepth * vDepth) * (1.0 + 2.2 * vH);
        vec3 col = mix(uColor, uHot, vH * 0.7 + 0.15);
        gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
      }`,
  });
  timeMats.push(rimMat);

  const rimFibres = (() => {
    const SEGS = 3;                              // 3 segments → 6 verts per fibre
    const total = NODE_COUNT * RIM_FIBRES * SEGS * 2;
    const pos = new Float32Array(total * 3);
    const off = new Float32Array(total * 2);
    const nodeA = new Float32Array(total);
    const seedA = new Float32Array(total);
    const alongA = new Float32Array(total);
    let w = 0;
    nodes.forEach((nd, i) => {
      const rand = H.rng((3300 + i * 97) >>> 0);
      for (let f = 0; f < RIM_FIBRES; f++) {
        const a0 = (f / RIM_FIBRES) * TAU + (rand() - 0.5) * 0.42;
        const r0 = nd.size * (0.66 + rand() * 0.10);
        const len = nd.size * (0.34 + rand() * 0.72);
        const bend = (rand() - 0.5) * 0.9;
        const sd = rand();
        const pts = [];
        for (let s = 0; s <= SEGS; s++) {
          const t = s / SEGS;
          const a = a0 + bend * t * t;
          const rr = r0 + len * t;
          const jit = (H.noise3(i * 2.1 + f * 0.7, t * 4.0, sd * 9.0)) * nd.size * 0.10 * t;
          pts.push([Math.cos(a) * rr + jit, Math.sin(a) * rr - jit * 0.6, t]);
        }
        for (let s = 0; s < SEGS; s++) {
          for (const q of [pts[s], pts[s + 1]]) {
            pos[w * 3 + 0] = nd.pos.x; pos[w * 3 + 1] = nd.pos.y; pos[w * 3 + 2] = nd.pos.z;
            off[w * 2 + 0] = q[0]; off[w * 2 + 1] = q[1];
            nodeA[w] = i; seedA[w] = sd * 7.3 + f * 0.53; alongA[w] = q[2];
            w++;
          }
        }
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aOff', new THREE.BufferAttribute(off, 2));
    geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
    geo.setAttribute('aAlong', new THREE.BufferAttribute(alongA, 1));
    const lines = new THREE.LineSegments(geo, rimMat);
    lines.frustumCulled = false;
    lines.renderOrder = 1;
    group.add(lines);
    disposables.push(geo);
    return { lines, geo, full: total, perNode: RIM_FIBRES * SEGS * 2 };
  })();

  /* ---------- node cores: one Points draw call, always present ---------- */
  const coreMatNodes = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: H.softDisc(64) },
      uColor: { value: new THREE.Color(P.goldBright) },
      uHoverIdx: { value: -999 }, uHoverAmt: { value: 0 },
      uScale: { value: 220 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aSeed;
      attribute float aNode;
      uniform float uTime, uHoverIdx, uHoverAmt, uScale;
      varying float vSeed, vH;
      void main() {
        vSeed = aSeed;
        vH = step(abs(aNode - uHoverIdx), 0.5) * uHoverAmt;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.z += vH * 0.62;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uScale * aSize * (1.0 + 0.35 * vH) / max(-mv.z, 0.1);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uColor;
      uniform float uTime;
      varying float vSeed, vH;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float flick = 0.80 + 0.20 * sin(uTime * (0.33 + vSeed * 0.71) + vSeed * 13.7);
        gl_FragColor = vec4(uColor, t.a * (0.30 + 0.85 * vH) * flick);
      }`,
  });
  timeMats.push(coreMatNodes);

  const nodeCores = (() => {
    const n = NODE_COUNT;
    const pos = new Float32Array(n * 3);
    const sizeA = new Float32Array(n);
    const seedA = new Float32Array(n);
    const nodeA = new Float32Array(n);
    nodes.forEach((nd, i) => {
      pos[i * 3] = nd.pos.x; pos[i * 3 + 1] = nd.pos.y; pos[i * 3 + 2] = nd.pos.z;
      sizeA[i] = nd.size * 0.55;
      seedA[i] = nd.seed * 11.3 + i * 0.77;
      nodeA[i] = i;
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizeA, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seedA, 1));
    geo.setAttribute('aNode', new THREE.BufferAttribute(nodeA, 1));
    const pts = new THREE.Points(geo, coreMatNodes);
    pts.frustumCulled = false;
    pts.renderOrder = 3;
    group.add(pts);
    disposables.push(geo);
    return { pts, geo, sizeAttr: geo.attributes.aSize, baseSizes: Float32Array.from(sizeA) };
  })();

  /* ================================================================ */
  /* SOIL AGGREGATES — dim clumps, denser where the substrate is thick  */
  /* ================================================================ */
  function aggregateLayer(seed, count, sizeMin, sizeMax, opacity, color, nearOnly) {
    const rand = H.rng(seed);
    const pos = [];
    let guard = 0;
    while (pos.length / 3 < count && guard++ < count * 24) {
      const x = -22 + rand() * 44;
      const y = -7 + rand() * 14;
      const z = -16 + rand() * 32;
      if (inVoid(x, y, z)) continue;
      const gd = glideDist(x, y, z);
      if (nearOnly && gd > 6.5) continue;
      if (!nearOnly && gd < 5) continue;
      if (substrate(x, y, z) < 0.12) continue;
      pos.push(x, y, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: H.softDisc(64), color: new THREE.Color(color), size: sizeMin + (sizeMax - sizeMin) * 0.5,
      sizeAttenuation: true, transparent: true, opacity, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = -7;
    group.add(pts);
    disposables.push(geo);
    return { pts, mat, geo, baseOp: opacity };
  }
  const aggFar = aggregateLayer(7701, 64, 0.8, 1.4, 0.055, P.deepGold, false);
  const aggNear = aggregateLayer(7803, 90, 0.28, 0.5, 0.085, 0x8a6a34, true);
  aggNear.mat.size = 0.34;
  aggFar.mat.size = 1.05;

  /* ================================================================ */
  /* GROWTH FRONT — the exit: advancing tips at the +x end (cp → 1)     */
  /* ================================================================ */
  const growth = (() => {
    const g = new THREE.Group();
    const res = H.strandLines({
      count: 60, seed: 8801,
      generator: (i, rand) => {
        const x = 14.5 + rand() * 6.5;
        const y = 0.8 + rand() * 4.6;
        const z = -4.0 - rand() * 8.5;
        const pts = [V(x, y, z)];
        let cur = pts[0];
        const step = (0.6 + rand() * 1.1);
        for (let j = 0; j < 4; j++) {
          cur = flowStep(cur, i + j * 0.41, step, new V3());
          cur.x += 0.45; cur.y += 0.22;                   // biased outward/upward
          pts.push(cur);
        }
        return pts;
      },
    });
    const mat = H.makePulseMat(P.goldBright, {
      baseOpacity: 0.0, twinkle: 0.30, pulseWidth: 0.11,
      pulseColor: P.goldBright, fogDensity: 0.014,
    });
    const lines = new THREE.LineSegments(res.geometry, mat);
    lines.frustumCulled = false;
    g.add(lines);

    const trand = H.rng(8902);
    const tp = [];
    for (let i = 0; i < 26; i++) {
      tp.push(15.0 + trand() * 6.0, 1.2 + trand() * 4.4, -4.2 - trand() * 8.0);
    }
    const tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
    const tmat = new THREE.PointsMaterial({
      map: H.glowSprite(P.ember, 64), color: new THREE.Color(P.ember), size: 0.55,
      sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true,
    });
    const tips = new THREE.Points(tgeo, tmat);
    tips.frustumCulled = false;
    g.add(tips);
    group.add(g);
    timeMats.push(mat);
    disposables.push(tgeo);
    return {
      g, lines, mat, geo: res.geometry, tips, tmat,
      full: res.geometry.attributes.position.count, p: 0,
    };
  })();

  /* ================================================================ */
  /* HOTSPOTS — 3 pods + every contributor, invisible sphere proxies    */
  /* ================================================================ */
  const proxyGeo = new THREE.SphereGeometry(1, 8, 6);
  const proxyMat = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  disposables.push(proxyGeo, proxyMat);

  function makeProxy(pos, radius) {
    const m = new THREE.Mesh(proxyGeo, proxyMat);
    m.position.copy(pos);
    m.scale.setScalar(radius);
    m.renderOrder = -20;
    group.add(m);
    return m;
  }

  const hotspots = [];
  for (const p of podOrder) {
    p.proxy = makeProxy(p.spec.pos, p.spec.radius);
    hotspots.push({
      id: p.id, object: p.proxy, radius: p.spec.radius,
      labelOffset: { x: 0, y: p.spec.labelY, z: 0 },
    });
  }
  for (const nd of nodes) {
    nd.proxy = makeProxy(nd.pos, 1.05);
    hotspots.push({
      id: nd.id, object: nd.proxy, radius: 1.05,
      labelOffset: { x: 0, y: nd.size + 0.52, z: 0 },
    });
  }

  /* ================================================================ */
  /* STATE + FRAME LOOP                                                 */
  /* ================================================================ */
  const nodeIndexById = new Map();
  nodes.forEach(n => nodeIndexById.set(n.id, n.i));
  const podById = pods;

  let hovered = null, selected = null;
  let quality = 1;
  let hoverAmt = 0, selAmt = 0;
  let hoverIdx = -999, selIdx = -999;
  let hoverPortraitIdx = -999, selPortraitIdx = -999;

  const colonyDriver = H.pulseDriver(5.4);
  let colonyAmp = 0.30;
  let colonyNext = 9 + rndA() * 9;

  const motion = reduced ? 0 : 1;
  const rate = reduced ? 0.25 : 1;

  function fireColony(amp) {
    colonyAmp = amp;
    colonyDriver.fire();
    colonyNext = 18 + rndA() * 13;
  }

  function updatePod(p, dt) {
    const wantH = hovered === p.id ? 1 : 0;
    const wantS = selected === p.id ? 1 : 0;
    p.hover += (wantH - p.hover) * Math.min(dt * 4.5, 1);
    p.sel += (wantS - p.sel) * Math.min(dt * 3.0, 1);
    p.driver.update(dt);

    const em = Math.max(p.hover, p.sel * 0.9);
    const on = p.driver.active ? Math.sin(Math.min(p.driver.value, 1) * Math.PI) : 0;
    p.knotMat.uniforms.uBase.value = p.knotBase * (1 + 0.85 * em) + 0.10 * on;
    p.knotMat.uniforms.uPulse.value = p.driver.value;
    p.knotMat.uniforms.uPulseOn.value = on * 0.8;
    // independent gentle flicker per pod — never in step with the others
    const fl = 0.90 + 0.10 * Math.sin(p.flick + p.knotMat.uniforms.uTime.value * (0.21 + p.nodeIdx * 0.013));
    p.coreMat.opacity = Math.min(0.95, p.coreBase * fl * (1 + 0.80 * em + 0.35 * on));
    p.core.scale.setScalar(p.coreScale * (1 + 0.07 * em));
    p.haloMat.opacity = p.haloBase * fl * (1 + 1.25 * em + 0.6 * on);
    p.halo.scale.setScalar(p.haloScale * (1 + 0.10 * em + 0.14 * on));
  }

  const api = {
    id: 'owned',
    group,
    hotspots,

    update(dt, time, cp, active) {
      for (const m of timeMats) if (m.uniforms.uTime) m.uniforms.uTime.value = time;

      /* --- broad colony wave (ambient at low amplitude, full on pod hover) --- */
      colonyNext -= dt * rate;
      if (colonyNext <= 0) fireColony(0.30);
      colonyDriver.update(dt);
      const cv = colonyDriver.value;
      const cOn = colonyDriver.active
        ? colonyAmp * Math.sin(Math.min(cv, 1) * Math.PI) : 0;
      for (const f of hyphae) {
        f.mat.uniforms.uPulse.value = cv * 1.04;
        f.mat.uniforms.uPulseOn.value = cOn * f.pulseScale;
        f.mat.uniforms.uBase.value = f.base * (1 + 0.22 * cOn);
      }
      portraitMat.uniforms.uWave.value = cv * 1.04;
      portraitMat.uniforms.uWaveOn.value = cOn;

      /* --- rhizomorph cords: slow, uneven, independent travelling waves --- */
      for (const c of cords) {
        const jitter = 0.55 + 0.8 * (0.5 + 0.5 * H.noise3(time * 0.07, c.k, 0));
        c.p += dt * c.speed * jitter * rate;
        if (c.p > 1.28) c.p = -0.12 - rndA() * 0.85;
        c.mat.uniforms.uPulse.value = c.p;
        c.mat.uniforms.uPulseOn.value = (c.p > -0.1 && c.p < 1.2) ? 0.55 : 0;
        c.mat.uniforms.uBase.value = c.base * (1 + 0.45 * cOn);
      }

      /* --- convergence into the primary pod --- */
      converge.driver.update(dt);
      const convOn = converge.driver.active
        ? Math.sin(Math.min(converge.driver.value, 1) * Math.PI) : 0;
      converge.mat.uniforms.uPulse.value = converge.driver.value;
      converge.mat.uniforms.uPulseOn.value = convOn * 0.9;
      converge.mat.uniforms.uBase.value =
        converge.base * (1 + 0.9 * pods['pod-shared'].hover + 0.35 * cOn);

      /* --- pods --- */
      for (const p of podOrder) updatePod(p, dt);

      /* --- hover / selection emphasis --- */
      hoverAmt += ((hovered ? 1 : 0) - hoverAmt) * Math.min(dt * 5.0, 1);
      selAmt += ((selected ? 1 : 0) - selAmt) * Math.min(dt * 3.2, 1);
      portraitMat.uniforms.uHoverIdx.value = hoverPortraitIdx;
      portraitMat.uniforms.uHoverAmt.value = hoverAmt;
      portraitMat.uniforms.uSelIdx.value = selPortraitIdx;
      portraitMat.uniforms.uSelAmt.value = selAmt;
      rimMat.uniforms.uHoverIdx.value = hoverPortraitIdx;
      rimMat.uniforms.uHoverAmt.value = hoverAmt;
      rimMat.uniforms.uSelIdx.value = selPortraitIdx;
      rimMat.uniforms.uSelAmt.value = selAmt;
      coreMatNodes.uniforms.uHoverIdx.value = hoverPortraitIdx;
      coreMatNodes.uniforms.uHoverAmt.value = Math.max(hoverAmt, selAmt * 0.85);

      /* --- only the LOCAL strands of the active node illuminate --- */
      nodeStrands.driver.update(dt);
      const nsOn = nodeStrands.driver.active ? 1 : 0;
      nodeStrands.mat.uniforms.uActive.value = hoverIdx >= 0 ? hoverIdx : selIdx;
      nodeStrands.mat.uniforms.uActiveAmt.value = Math.max(hoverAmt, selAmt * 0.9);
      nodeStrands.mat.uniforms.uPulse.value = nodeStrands.driver.value;
      nodeStrands.mat.uniforms.uPulseOn.value = nsOn;
      nodeStrands.mat.uniforms.uBase.value = nodeStrands.base * (1 + 0.30 * cOn);

      /* --- growth front rises into view as the camera exits --- */
      const gf = cp > 0.66 ? H.easings.smooth(Math.min((cp - 0.66) / 0.30, 1)) : 0;
      growth.g.visible = gf > 0.004;
      growth.mat.uniforms.uBase.value = 0.30 * gf;
      growth.tmat.opacity = 0.55 * gf;
      if (gf > 0) {
        growth.p += dt * 0.24 * rate;
        if (growth.p > 1.25) growth.p = -0.15;
        growth.mat.uniforms.uPulse.value = growth.p;
        growth.mat.uniforms.uPulseOn.value = 0.9 * gf;
      }

      if (!active || reduced) return;

      /* --- foreground soil parallax: near aggregates drift very slowly --- */
      const drift = H.noise3(time * 0.031, 4.4, 0) * 0.10;
      aggNear.pts.position.set(drift, H.noise3(0, time * 0.027, 9.1) * 0.07, -drift * 0.6);
      aggFar.mat.opacity = aggFar.baseOp * (0.85 + 0.15 * (0.5 + 0.5 * Math.sin(time * 0.09)));
      aggNear.mat.opacity = aggNear.baseOp * (0.82 + 0.18 * (0.5 + 0.5 * Math.sin(time * 0.063 + 1.7)));
    },

    setHover(id) {
      if (hovered === id) return;
      hovered = id || null;
      resolveActive();
      if (!id) return;
      if (id === 'pod-shared') {
        // ONE broad, slow pulse through the full colony
        fireColony(1.0);
        converge.driver.fire();
        pods['pod-shared'].driver.fire();
      } else if (podById[id]) {
        podById[id].driver.fire();              // small localized response
        nodeStrands.driver.fire();
      } else if (nodeIndexById.has(id)) {
        nodeStrands.driver.fire();
      }
    },

    setSelected(id) {
      selected = id || null;
      resolveActive();
      if (!id) return;
      if (podById[id]) podById[id].driver.fire();
      else if (nodeIndexById.has(id)) nodeStrands.driver.fire();
    },

    trigger(name) {
      if (name === 'colonyPulse' || name === 'ctaPulse') {
        fireColony(1.0);
        converge.driver.fire();
      } else if (name === 'growthFront') {
        growth.p = -0.15;
      }
    },

    setQuality(tier) {
      quality = tier;
      const low = tier >= 2;

      // honest density reduction on the hyphae field (draw range, keeps geometry)
      for (const f of hyphae) {
        const n = low ? Math.floor(f.full * 0.42) : f.full;
        f.geo.setDrawRange(0, n - (n % 2));
      }
      const cn = low ? Math.floor(converge.full * 0.42) : converge.full;
      converge.geo.setDrawRange(0, cn - (cn % 2));
      const gn = low ? Math.floor(growth.full * 0.5) : growth.full;
      growth.geo.setDrawRange(0, gn - (gn % 2));

      // thinnest two cords drop out on tier 2
      cords.forEach((c, i) => { c.mesh.visible = low ? i !== 2 && i !== 3 : true; });
      // pod knots thin out (cores and halos stay — hierarchy must survive)
      for (const p of podOrder) {
        const g = p.knot.geometry;
        const full = g.index ? g.index.count : g.attributes.position.count;
        if (p.knot.userData.full == null) p.knot.userData.full = full;
        const t = low ? Math.floor(p.knot.userData.full * 0.55) : p.knot.userData.full;
        g.setDrawRange(0, t - (t % 3));
      }

      // portrait planes: 14 (tier 1) → 12 (tier 2). Dropped nodes keep their
      // rim-less ember core + local strands, so no hotspot is left pointing at
      // empty space.
      const planes = low ? Math.min(12, NODE_COUNT) : NODE_COUNT;
      portraits.geo.setDrawRange(0, planes * 6);
      rimFibres.geo.setDrawRange(0, planes * rimFibres.perNode);
      const sa = nodeCores.sizeAttr;
      for (let i = 0; i < NODE_COUNT; i++) {
        sa.setX(i, nodeCores.baseSizes[i] * (i >= planes ? 2.1 : 1));
      }
      sa.needsUpdate = true;

      aggFar.pts.visible = !low;
      aggNear.pts.visible = true;
    },

    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          // maps from helpers (glowSprite/softDisc) are process-wide cached and
          // shared with other chapters — only textures this chapter authored
          // (the portrait atlas) are disposed, via `disposables`.
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.dispose?.();
        }
      });
      for (const d of disposables) d.dispose?.();
      group.clear();
    },
  };

  function resolveActive() {
    const src = hovered || selected;
    hoverIdx = -999; selIdx = -999;
    hoverPortraitIdx = -999; selPortraitIdx = -999;
    if (hovered) {
      if (podById[hovered]) hoverIdx = podById[hovered].nodeIdx;
      else if (nodeIndexById.has(hovered)) {
        hoverIdx = nodeIndexById.get(hovered);
        hoverPortraitIdx = hoverIdx;
      }
    }
    if (selected) {
      if (podById[selected]) selIdx = podById[selected].nodeIdx;
      else if (nodeIndexById.has(selected)) {
        selIdx = nodeIndexById.get(selected);
        selPortraitIdx = selIdx;
      }
    }
    if (!src) { /* release back into ambient */ }
  }

  api.setQuality(ctx.tier === 2 ? 2 : 1);
  return api;
}
