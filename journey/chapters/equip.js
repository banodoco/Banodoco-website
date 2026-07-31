// Chapter 2 — EQUIP: extreme magnification inside the stipe.
// A vast interior chamber of longitudinal hyphae in three depth layers
// (near hero tubes / mid strand field / far streak shells). PYPE is a braided
// hyphal fascicle hugging the axis carrying slow uneven upward transport;
// Arnold and Astrid are differentiated hyphal knots fed by real branch fibres
// that visibly leave PYPE. See CONTRACT.md — cluster envelope "equip".
//
// Local envelope: fibre field radius ~14, y ∈ [−12.5, +25] (CONTRACT equip row);
// camera ascends near the axis from (0.5,−6,2.2) to (0.8,13.5,−1.2) so the
// exterior is never visible.
import * as THREE from 'three';

const TAU = Math.PI * 2;

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
    const n = p.count;
    pos.set(p.array, vo * 3);
    if (a) along.set(a.array, vo);
    if (s) strand.set(s.array, vo);
    if (idx && g.index) {
      const src = g.index.array;
      for (let k = 0; k < src.length; k++) idx[io + k] = src[k] + vo;
      io += src.length;
    }
    vo += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
  out.setAttribute('aStrand', new THREE.BufferAttribute(strand, 1));
  if (idx) out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/*
 spreadOrder(n): a deterministic permutation of 0..n-1 whose EVERY prefix is
 evenly distributed over the range (greedy farthest-point). Strand geometries are
 merged in this order, so `setDrawRange` truncation at tier 2 thins a bundle
 uniformly instead of slicing a wedge out of it. wrap=true for bundles indexed by
 azimuth, false for bundles ordered along a line (e.g. feeders stacked in height).
*/
function spreadOrder(n, wrap = true) {
  if (n < 2) return [0];
  const picked = wrap ? [0] : [0, n - 1];
  const left = [];
  for (let i = 0; i < n; i++) if (picked.indexOf(i) < 0) left.push(i);
  while (left.length) {
    let bi = 0, bd = -1;
    for (let a = 0; a < left.length; a++) {
      let d = Infinity;
      for (const p of picked) {
        let dd = Math.abs(left[a] - p);
        if (wrap) dd = Math.min(dd, n - dd);
        if (dd < d) d = dd;
      }
      if (d > bd) { bd = d; bi = a; }
    }
    picked.push(left.splice(bi, 1)[0]);
  }
  return picked;
}

// Merge `n` topologically identical strand geometries in spread order and record
// the index count per strand, so a strand count maps straight to a draw range.
function mergeBundle(geos, wrap = true) {
  const n = geos.length;
  const ord = spreadOrder(n, wrap);
  const geo = mergeGeos(ord.map(i => geos[i]));
  return { geo, n, per: geo.index ? geo.index.count / n : geo.attributes.position.count / n };
}

function setStrands(rec, keep) {
  rec.geo.setDrawRange(0, Math.round(rec.per * Math.min(keep, rec.n)));
}

/* ------------------------------------------------------------------ */
/* sequential feeder material: one draw call, per-strand staggered pulse */
/* ------------------------------------------------------------------ */
function makeFeederMat(baseColor, pulseColor, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: -2 },
      uPulseOn: { value: 0 },
      uBase: { value: opts.baseOpacity ?? 0.30 },
      uStagger: { value: opts.stagger ?? 0.55 },
      uWidth: { value: opts.pulseWidth ?? 0.10 },
      uColor: { value: new THREE.Color(baseColor) },
      uPulseColor: { value: new THREE.Color(pulseColor) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      varying float vA;
      varying float vS;
      void main() {
        vA = aAlong; vS = aStrand;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uPulse, uPulseOn, uBase, uStagger, uWidth;
      uniform vec3 uColor, uPulseColor;
      varying float vA;
      varying float vS;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.45 + vS * 1.9) + vS * 37.0);
        float amb = uBase * (0.78 + 0.22 * tw);
        // each feeder fibre lights in sequence: its pulse head is offset by aStrand
        float head = uPulse - vS * uStagger;
        float d = vA - head;
        float pulse = exp(-d * d / (uWidth * uWidth));
        float trail = 0.30 * exp(-abs(min(d, 0.0)) * 7.0) * step(d, 0.0);
        vec3 col = uColor * amb + uPulseColor * uPulseOn * (pulse + trail);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

/* ------------------------------------------------------------------ */
/* braid material: the three staggered PYPE sub-bundles in ONE draw call.
   Reproduces helpers.makePulseMat exactly, but selects colour / base opacity /
   pulse width / pulse phase per sub-bundle from the strand index, so the braid
   keeps its three independent transport waves without three meshes. Selection
   is branchless (step weights, no dynamic uniform indexing) for GLSL ES 1.00. */
/* ------------------------------------------------------------------ */
function makeBraidMat(opts) {
  const c = opts.colors.map(x => new THREE.Color(x));
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uStrands: { value: opts.strands },
      uC0: { value: c[0] }, uC1: { value: c[1] }, uC2: { value: c[2] },
      uBaseOp: { value: new THREE.Vector3(...opts.bases) },
      uWidth: { value: new THREE.Vector3(...opts.widths) },
      uPulse: { value: new THREE.Vector3() },
      uPulseOn: { value: new THREE.Vector3() },
      uPulseColor: { value: new THREE.Color(opts.pulseColor) },
      uTwinkle: { value: opts.twinkle },
      uFogColor: { value: new THREE.Color(opts.fogColor ?? 0x0a0805) },
      uFogDensity: { value: opts.fogDensity ?? 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      uniform float uStrands;
      varying float vAlong;
      varying float vStrand;
      varying float vFogDepth;
      varying vec3 vSel;
      void main() {
        vAlong = aAlong;
        vStrand = aStrand;
        // sub-bundle = strandIndex mod 3, recovered from the packed aStrand
        float b = mod(floor(aStrand * uStrands + 0.5), 3.0);
        vSel = vec3(step(b, 0.5), step(0.5, b) * step(b, 1.5), step(1.5, b));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uTwinkle, uFogDensity;
      uniform vec3 uBaseOp, uWidth, uPulse, uPulseOn;
      uniform vec3 uC0, uC1, uC2, uPulseColor, uFogColor;
      varying float vAlong, vStrand, vFogDepth;
      varying vec3 vSel;
      void main() {
        float baseOp = dot(uBaseOp, vSel);
        float wdt = dot(uWidth, vSel);
        float phase = dot(uPulse, vSel);
        float amount = dot(uPulseOn, vSel);
        vec3 tint = uC0 * vSel.x + uC1 * vSel.y + uC2 * vSel.z;
        float tw = 0.5 + 0.5 * sin(uTime * (0.6 + vStrand * 1.7) + vStrand * 43.7);
        float amb = baseOp * (1.0 - uTwinkle + uTwinkle * tw);
        float d = abs(vAlong - phase);
        float pulse = amount * exp(-d * d / (wdt * wdt));
        vec3 col = tint * amb + uPulseColor * pulse;
        float fogF = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
        col = mix(col, uFogColor * 0.0, clamp(fogF, 0.0, 1.0)); // additive: fade to black
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

  const group = new THREE.Group();
  group.name = 'equip';

  const disposables = [];   // { dispose() }
  const pulseMats = [];     // everything with a uTime uniform
  const flexGroups = [];    // ambient tiny-flex carriers

  const rndA = H.rng(90210);          // animation-side randomness (seeded)

  /* ---------- shared fibre helpers ---------- */

  // tube with aAlong (0..1 along) + aStrand attributes, uv/normal stripped
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

  // the fascicle wanders slightly off the geometric axis with height
  function pypeCenterAt(y) {
    return new V3(
      H.fbm3(0.5, y * 0.05, 3.3, 3) * 0.34,
      y,
      H.fbm3(3.3, y * 0.05 + 1.1, 0.5, 3) * 0.34,
    );
  }

  /* ================================================================ */
  /* FAR LAYER — 2–3 huge streak shells (cheap depth backdrop)         */
  /* ================================================================ */
  function streakTexture(seed) {
    const w = 256, h = 256;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#000000';
    g.fillRect(0, 0, w, h);
    const rand = H.rng(seed);
    const warms = ['255,196,120', '226,160,84', '255,170,98', '186,133,62'];
    for (let pass = 0; pass < 2; pass++) {
      const n = pass === 0 ? 34 : 120;                 // broad haze, then fine streaks
      for (let i = 0; i < n; i++) {
        const x = rand() * w;
        const wdt = pass === 0 ? 8 + rand() * 26 : 0.6 + rand() * 3.2;
        const a = pass === 0 ? 0.02 + rand() * 0.05 : 0.04 + rand() * 0.34;
        const y0 = -h * 0.25 + rand() * h * 0.6;
        const y1 = y0 + h * (0.35 + rand() * 0.95);
        const warm = warms[(rand() * warms.length) | 0];
        const grad = g.createLinearGradient(0, y0, 0, y1);
        grad.addColorStop(0.0, `rgba(${warm},0)`);
        grad.addColorStop(0.32, `rgba(${warm},${a.toFixed(3)})`);
        grad.addColorStop(0.68, `rgba(${warm},${(a * 0.62).toFixed(3)})`);
        grad.addColorStop(1.0, `rgba(${warm},0)`);
        g.fillStyle = grad;
        g.fillRect(x, y0, wdt, y1 - y0);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    disposables.push(tex);
    return tex;
  }

  const farShells = [];
  {
    const specs = [
      { r: 10.0, op: 0.085, rep: 4.0, col: P.gold,      spin: 0.0045 },
      { r: 12.2, op: 0.062, rep: 3.0, col: P.deepGold,  spin: -0.0031 },
      { r: 14.0, op: 0.046, rep: 2.2, col: 0xb98a3a,    spin: 0.0021 },
    ];
    specs.forEach((s, i) => {
      const tex = streakTexture(4400 + i * 137);
      tex.repeat.set(s.rep, 1);
      // 36.6 tall centred at 6.2 → y ∈ [−12.1, 24.5], inside the equip envelope
      const geo = new THREE.CylinderGeometry(s.r, s.r * 1.08, 36.6, 40, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        map: tex, color: new THREE.Color(s.col), transparent: true,
        opacity: s.op, depthWrite: false, blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide, fog: true,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 6.2;
      mesh.renderOrder = -10 + i;
      mesh.frustumCulled = false;
      group.add(mesh);
      farShells.push({ mesh, mat, geo, baseOp: s.op, spin: s.spin });
    });
  }

  /* ================================================================ */
  /* MID LAYER — instanced-ish merged strand lines (2 batches)         */
  /* ================================================================ */
  function fieldBatch(seed, count, rMin, rMax) {
    return H.strandLines({
      count, seed,
      generator: (i, rand) => {
        const ang = rand() * TAU;
        const rr = rMin + (rMax - rMin) * Math.pow(rand(), 0.62);
        const yBot = -12.2 + rand() * 4.2;
        const yTop = 17.4 + rand() * 7.0;
        // patchy density: azimuth × height mask carves real dark gaps
        const dens = H.fbm3(Math.cos(ang) * 1.7, (yBot + yTop) * 0.035, Math.sin(ang) * 1.7, 3);
        if (dens < -0.10) return null;
        if (dens < 0.02 && rand() < 0.55) return null;
        const segs = 8;
        const drift = 0.45 + rr * 0.14;
        const pts = [];
        for (let j = 0; j <= segs; j++) {
          const t = j / segs;
          const y = yBot + (yTop - yBot) * t;
          const nx = H.fbm3(rr * 0.31 + ang * 2.1, y * 0.075, ang * 1.3, 3);
          const nz = H.fbm3(ang * 1.73 + 5.3, y * 0.071 + 2.9, rr * 0.29, 3);
          const r2 = Math.max(0.9, rr + nx * drift);
          const a2 = ang + nz * drift * 0.06;
          pts.push(new V3(Math.cos(a2) * r2, y, Math.sin(a2) * r2));
        }
        return pts;
      },
    });
  }

  const midLayers = [];
  {
    const inner = fieldBatch(1811, 260, 1.9, 7.0);
    const outer = fieldBatch(2909, 300, 6.0, 14.0);
    const matInner = H.makePulseMat(P.gold, {
      baseOpacity: 0.21, twinkle: 0.5, pulseWidth: 0.11,
      pulseColor: P.goldBright, fogDensity: 0.020,
    });
    const matOuter = H.makePulseMat(0xb98a35, {
      baseOpacity: 0.135, twinkle: 0.58, pulseWidth: 0.13,
      pulseColor: P.ember, fogDensity: 0.030,
    });
    [[inner, matInner, 0.21], [outer, matOuter, 0.135]].forEach(([res, mat, base], i) => {
      const lines = new THREE.LineSegments(res.geometry, mat);
      lines.frustumCulled = false;
      lines.renderOrder = -5 + i;
      const g = new THREE.Group();
      g.add(lines);
      group.add(g);
      flexGroups.push({ g, seed: 3.1 + i * 4.7, ampR: 0.0035, ampP: 0.020 });
      pulseMats.push(mat);
      midLayers.push({ lines, mat, geo: res.geometry, base, full: res.geometry.attributes.position.count });
    });
  }

  /* ---------- cross-connection bridges (short horizontal, twinkling) ---------- */
  const bridges = (() => {
    const res = H.strandLines({
      count: 58, seed: 6151,
      generator: (i, rand) => {
        const ang = rand() * TAU;
        const r = 1.7 + rand() * 9.5;
        const y = -8 + rand() * 28;
        const a2 = ang + (rand() - 0.5) * 0.46;
        const r2 = Math.max(0.9, r + (rand() - 0.5) * 2.6);
        const p0 = new V3(Math.cos(ang) * r, y, Math.sin(ang) * r);
        const p1 = new V3(Math.cos(a2) * r2, y + (rand() - 0.5) * 1.7, Math.sin(a2) * r2);
        const mid = p0.clone().lerp(p1, 0.5);
        mid.y += (rand() - 0.5) * 0.5;
        mid.x += (rand() - 0.5) * 0.3;
        return [p0, mid, p1];
      },
    });
    const mat = H.makePulseMat(P.ember, {
      baseOpacity: 0.17, twinkle: 0.95, pulseWidth: 0.2,
      pulseColor: P.goldBright, fogDensity: 0.022,
    });
    const lines = new THREE.LineSegments(res.geometry, mat);
    lines.frustumCulled = false;
    const g = new THREE.Group();
    g.add(lines);
    group.add(g);
    flexGroups.push({ g, seed: 17.3, ampR: 0.005, ampP: 0.03 });
    pulseMats.push(mat);
    return { lines, mat, geo: res.geometry, base: 0.17, full: res.geometry.attributes.position.count };
  })();

  /* ================================================================ */
  /* NEAR LAYER — ~12 hero fibres, real tube geometry                  */
  /* ================================================================ */
  const nearMat = H.makePulseMat(P.gold, {
    baseOpacity: 0.32, twinkle: 0.26, pulseWidth: 0.09,
    pulseColor: P.goldBright, fogDensity: 0.012,
  });
  pulseMats.push(nearMat);
  const nearGroup = new THREE.Group();
  let nearRec;
  {
    const rand = H.rng(7723);
    const geos = [];
    const HERO = 12;
    for (let i = 0; i < HERO; i++) {
      const ang = (i / HERO) * TAU + (rand() - 0.5) * 0.5;
      const rr = 1.4 + rand() * 4.8;
      const yBot = -11.5 - rand() * 0.7;
      const yTop = 21.4 + rand() * 3.0;
      const segs = 20;
      const wav = 0.55 + rand() * 0.75;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const y = yBot + (yTop - yBot) * t;
        const nx = H.fbm3(rr * 0.4 + i * 2.7, y * 0.062, 1.7, 4);
        const nz = H.fbm3(9.1, y * 0.058 + i * 1.9, rr * 0.4, 4);
        const r2 = Math.max(0.85, rr + nx * wav);
        const a2 = ang + nz * wav * 0.10;
        pts.push(new V3(Math.cos(a2) * r2, y, Math.sin(a2) * r2));
      }
      geos.push(tubeStrand(pts, {
        radius: 0.05 + rand() * 0.07,
        radialSegments: 5,
        tubularSegments: 80,
        taper: 0.7 + rand() * 0.5,
      }, i / HERO));
    }
    nearRec = mergeBundle(geos, true);
    const mesh = new THREE.Mesh(nearRec.geo, nearMat);
    mesh.frustumCulled = false;
    nearGroup.add(mesh);
    group.add(nearGroup);
    flexGroups.push({ g: nearGroup, seed: 29.7, ampR: 0.0028, ampP: 0.016 });
    disposables.push(mesh.geometry);
  }

  /* ---------- exit fan: upper fibres that bend outward near cp→1 ---------- */
  const exitFan = new THREE.Group();
  const fanMat = H.makePulseMat(P.gold, {
    baseOpacity: 0.24, twinkle: 0.3, pulseWidth: 0.12,
    pulseColor: P.ember, fogDensity: 0.016,
  });
  pulseMats.push(fanMat);
  let fanRec;
  {
    const rand = H.rng(3391);
    const geos = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * TAU + (rand() - 0.5) * 0.6;
      const r0 = 1.3 + rand() * 4.4;
      const segs = 10;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const y = 12.5 + t * 11.9;
        const spread = 1 + t * t * 0.85;      // already opens a little on its own
        const nx = H.fbm3(i * 3.3, y * 0.07, 2.2, 3);
        const r2 = r0 * spread + nx * 0.5;
        pts.push(new V3(Math.cos(ang + nx * 0.06) * r2, y, Math.sin(ang + nx * 0.06) * r2));
      }
      geos.push(tubeStrand(pts, {
        radius: 0.045 + rand() * 0.05, radialSegments: 4,
        tubularSegments: 30, taper: 0.8,
      }, i / N));
    }
    fanRec = mergeBundle(geos, true);
    const mesh = new THREE.Mesh(fanRec.geo, fanMat);
    mesh.frustumCulled = false;
    exitFan.add(mesh);
    group.add(exitFan);
    disposables.push(mesh.geometry);
  }

  /* ================================================================ */
  /* PYPE — braided fascicle hugging the axis (3 staggered sub-mats)   */
  /* ================================================================ */
  const PY0 = -12.2, PY1 = 24.4;
  const PYPE_STRANDS = 9;
  const pypeStates = [];
  const pypeGroup = new THREE.Group();
  const braidMat = makeBraidMat({
    strands: PYPE_STRANDS,
    colors: [P.goldBright, P.gold, P.ember],
    bases: [0.46, 0.51, 0.56],
    widths: [0.055, 0.075, 0.095],
    pulseColor: P.goldBright, twinkle: 0.16, fogDensity: 0.008,
  });
  pulseMats.push(braidMat);
  const braidGeos = [null, null, null];       // indexed by quality tier
  // The braid is the one bundle whose silhouette must stay 9 strands wide at both
  // tiers, so tier 2 rebuilds it at lower tessellation rather than dropping
  // strands. The rng is consumed identically in both passes → same strand shapes.
  function buildBraid(q) {
    if (braidGeos[q]) return braidGeos[q];
    const rand = H.rng(5150);
    const tub = q === 2 ? 46 : 110;
    const radial = q === 2 ? 4 : 5;
    const geos = [];
    for (let k = 0; k < PYPE_STRANDS; k++) {
      const a0 = (k / PYPE_STRANDS) * TAU + (rand() - 0.5) * 0.45;
      const twist = 0.10 + rand() * 0.06;
      const rBase = 0.30 + rand() * 0.44;
      const segs = 30;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const y = PY0 + (PY1 - PY0) * t;
        const wob = H.fbm3(k * 3.1, y * 0.11, 2.4, 3);
        const wob2 = H.fbm3(7.7, y * 0.09, k * 2.3, 3);
        const r = Math.max(0.10, rBase + wob * 0.17);
        const a = a0 + y * twist + wob2 * 0.55;
        const c = pypeCenterAt(y);
        pts.push(new V3(c.x + Math.cos(a) * r, y, c.z + Math.sin(a) * r));
      }
      geos.push(tubeStrand(pts, {
        radius: 0.045 + rand() * 0.032, radialSegments: radial,
        tubularSegments: tub, taper: 0.9,
      }, k / PYPE_STRANDS));
    }
    const geo = mergeBundle(geos, true).geo;
    braidGeos[q] = geo;
    disposables.push(geo);
    return geo;
  }
  // built at the incoming tier so mobile never pays for the dense braid
  const braidMesh = new THREE.Mesh(buildBraid(ctx.tier === 2 ? 2 : 1), braidMat);
  {
    braidMesh.frustumCulled = false;
    pypeGroup.add(braidMesh);
    for (let i = 0; i < 3; i++) {
      pypeStates.push({
        i, base: 0.46 + i * 0.05,
        p: -0.35 - i * 0.30,
        speed: 0.135 + i * 0.028,
        k: i * 5.3 + 1.7,
      });
    }
    group.add(pypeGroup);
    flexGroups.push({ g: pypeGroup, seed: 41.1, ampR: 0.0016, ampP: 0.010 });
  }

  /* ================================================================ */
  /* KNOTS — Arnold (structural) and Astrid (exploratory)              */
  /* ================================================================ */
  const KNOT_SPECS = {
    arnold: {
      pos: new V3(-3.4, 4.5, 1.5), seed: 8801,
      tangleCount: 12, spanMin: 0.5, spanMax: 1.25,       // deliberate, lattice-ish
      rMin: 0.20, rMax: 0.52, wob: 0.10, taper: 0.85,
      color: P.gold, coreColor: P.goldBright, coreScale: 1.15, coreOp: 0.52,
      feeders: 4, feederYs: [0.9, 1.9, 2.7, 3.5], bow: 0.55,
      feederColor: P.gold, feederPulse: P.goldBright,
    },
    astrid: {
      pos: new V3(3.2, 7.5, -1.0), seed: 9307,
      tangleCount: 15, spanMin: 1.3, spanMax: 2.6,        // looser, curling, wispier
      rMin: 0.16, rMax: 0.62, wob: 0.24, taper: 0.38,
      color: P.ember, coreColor: P.ember, coreScale: 1.3, coreOp: 0.48,
      feeders: 5, feederYs: [3.4, 4.4, 5.2, 5.9, 6.5], bow: 0.75,
      feederColor: P.ember, feederPulse: P.goldBright,
    },
  };

  const knots = {};
  for (const id of Object.keys(KNOT_SPECS)) {
    const S = KNOT_SPECS[id];
    const rand = H.rng(S.seed);
    const kg = new THREE.Group();
    kg.position.copy(S.pos);

    // --- tangle of short curved strands, built around local origin ---
    const geos = [];
    for (let i = 0; i < S.tangleCount; i++) {
      const a0 = rand() * TAU;
      const tilt = (rand() - 0.5) * 1.5;
      const R = S.rMin + (S.rMax - S.rMin) * rand();
      const span = S.spanMin + (S.spanMax - S.spanMin) * rand();
      const segs = 5;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const a = a0 + t * span;
        const rr = R * (1 - 0.42 * t);
        const w = H.noise3(i * 2.9, t * 3.4, S.seed * 0.001) * S.wob;
        pts.push(new V3(
          Math.cos(a) * (rr + w),
          (t - 0.5) * R * 1.5 * (0.4 + tilt) + w * 0.6,
          Math.sin(a) * (rr + w),
        ));
      }
      geos.push(tubeStrand(pts, {
        radius: 0.028 + rand() * 0.032, radialSegments: 4,
        tubularSegments: 14, taper: S.taper,
      }, i / S.tangleCount));
    }
    const tangleMat = H.makePulseMat(S.color, {
      baseOpacity: 0.40, twinkle: 0.28, pulseWidth: 0.16,
      pulseColor: P.goldBright, fogDensity: 0.006,
    });
    pulseMats.push(tangleMat);
    const tangleRec = mergeBundle(geos, true);
    const tangle = new THREE.Mesh(tangleRec.geo, tangleMat);
    tangle.frustumCulled = false;
    kg.add(tangle);
    disposables.push(tangle.geometry);

    // --- bright core sprite (never pure white) ---
    const coreTex = H.glowSprite(S.coreColor, 64);
    const coreMat = new THREE.SpriteMaterial({
      map: coreTex, color: new THREE.Color(S.coreColor), transparent: true,
      opacity: S.coreOp, depthWrite: false, blending: THREE.AdditiveBlending,
      fog: true,
    });
    const core = new THREE.Sprite(coreMat);
    core.scale.setScalar(S.coreScale);
    kg.add(core);

    // --- raycast proxy (never rendered, still hittable) ---
    // WebGLRenderer.projectObject skips objects whose material.visible is false,
    // so this costs zero draw calls; Mesh.raycast never consults material.visible,
    // so the hotspot stays hit-testable (and getWorldPosition still anchors it).
    const proxyGeo = new THREE.SphereGeometry(1.2, 10, 8);
    const proxyMat = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    proxyMat.visible = false;
    const proxy = new THREE.Mesh(proxyGeo, proxyMat);
    kg.add(proxy);
    disposables.push(proxyGeo, proxyMat);

    group.add(kg);
    flexGroups.push({ g: kg, seed: S.seed * 0.01, ampR: 0.004, ampP: 0.012, anchor: S.pos });

    // --- feeder fibres: real branches leaving PYPE for the knot ---
    const fgeos = [];
    for (let f = 0; f < S.feeders; f++) {
      const y0 = S.feederYs[f];
      const start = pypeCenterAt(y0);
      const sa = rand() * TAU;
      start.x += Math.cos(sa) * 0.42;
      start.z += Math.sin(sa) * 0.42;
      const segs = 12;
      const pts = [];
      const endJitter = new V3((rand() - 0.5) * 0.5, (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.5);
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const e = H.easings.smooth(t);
        const p = start.clone().lerp(S.pos.clone().add(endJitter), e);
        const hump = Math.sin(Math.PI * t);
        p.y += hump * S.bow * (0.6 + rand() * 0.0);   // deterministic bow
        p.x += H.noise3(f * 3.7 + S.seed * 0.001, t * 3.1, 1.1) * 0.42 * hump;
        p.z += H.noise3(2.3, t * 3.1, f * 2.9 + S.seed * 0.001) * 0.42 * hump;
        pts.push(p);
      }
      fgeos.push(tubeStrand(pts, {
        radius: 0.035 + rand() * 0.028, radialSegments: 4,
        tubularSegments: 40, taper: 0.75,
      }, S.feeders > 1 ? f / (S.feeders - 1) : 0));
    }
    const feederMat = makeFeederMat(S.feederColor, S.feederPulse, {
      baseOpacity: 0.26, stagger: 0.5, pulseWidth: 0.085,
    });
    pulseMats.push(feederMat);
    const feederRec = mergeBundle(fgeos, false);   // ordered along height, not azimuth
    const feederMesh = new THREE.Mesh(feederRec.geo, feederMat);
    feederMesh.frustumCulled = false;
    const fgrp = new THREE.Group();
    fgrp.add(feederMesh);
    group.add(fgrp);
    flexGroups.push({ g: fgrp, seed: S.seed * 0.013 + 5, ampR: 0.0022, ampP: 0.010 });
    disposables.push(feederMesh.geometry);

    knots[id] = {
      id, group: kg, tangle, tangleMat, tangleBase: 0.40, tangleRec,
      core, coreMat, coreBase: S.coreOp, coreScale: S.coreScale,
      feederMat, feederBase: 0.26, feederRec,
      driver: H.pulseDriver(2.1),
      hover: 0, sel: 0, proxy,
    };
  }

  /* ---------- PYPE hotspot proxy ---------- */
  const pypeProxy = (() => {
    const c = pypeCenterAt(5.0);
    const geo = new THREE.SphereGeometry(1.4, 10, 8);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    mat.visible = false;                      // see knot proxy note: hittable, not drawn
    const m = new THREE.Mesh(geo, mat);
    m.position.set(c.x, 5.0, c.z);
    group.add(m);
    disposables.push(geo, mat);
    return m;
  })();

  /* ================================================================ */
  /* ATMOSPHERE — entry glow + moisture droplets                       */
  /* ================================================================ */
  const entryGlow = (() => {
    const mat = new THREE.SpriteMaterial({
      map: H.glowSprite(P.ember, 64), color: new THREE.Color(P.ember),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(11, 15, 1);
    s.position.set(0.3, -2.0, 0);
    s.renderOrder = -8;
    group.add(s);
    return { sprite: s, mat };
  })();

  const droplets = [];
  {
    const cols = [P.goldBright, P.ember, P.coolAccent];
    const rand = H.rng(1234);
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.SpriteMaterial({
        map: H.glowSprite(cols[i], 64), color: new THREE.Color(cols[i]),
        transparent: true, opacity: i === 2 ? 0.30 : 0.5, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: true,
      });
      const s = new THREE.Sprite(mat);
      const a = rand() * TAU;
      const r = 0.9 + rand() * 2.6;
      s.position.set(Math.cos(a) * r, -8 + rand() * 20, Math.sin(a) * r);
      s.scale.setScalar(0.17 + rand() * 0.16);
      group.add(s);
      droplets.push({
        s, mat, a, r, baseOp: mat.opacity, base: s.scale.x,
        speed: 0.10 + rand() * 0.16, phase: rand() * TAU,
      });
    }
  }

  /* ================================================================ */
  /* STATE + FRAME LOOP                                                */
  /* ================================================================ */
  let hovered = null, selected = null;
  let pypeHover = 0, pypeSel = 0;
  let quality = 1;
  let fieldPulseT = 2 + rndA() * 4;
  const fieldDriver = H.pulseDriver(5.5);
  const motion = reduced ? 0 : 1;

  const BASE = {
    inner: midLayers[0] ? midLayers[0].base : 0.21,
    outer: midLayers[1] ? midLayers[1].base : 0.135,
    bridges: bridges.base,
    near: 0.32,
    fan: 0.24,
  };

  function updateKnot(k, dt) {
    const wantHover = hovered === k.id ? 1 : 0;
    const wantSel = selected === k.id ? 1 : 0;
    k.hover += (wantHover - k.hover) * Math.min(dt * 4.5, 1);
    k.sel += (wantSel - k.sel) * Math.min(dt * 3.0, 1);

    k.driver.update(dt);
    const on = k.driver.active ? 1 : 0;
    const stag = k.feederMat.uniforms.uStagger.value;
    k.feederMat.uniforms.uPulseOn.value = on * (0.85 + 0.5 * k.hover);
    k.feederMat.uniforms.uPulse.value = k.driver.value * (1 + stag);
    k.feederMat.uniforms.uBase.value = k.feederBase * (1 + 0.85 * k.hover + 0.45 * k.sel);

    k.tangleMat.uniforms.uBase.value = k.tangleBase * (1 + 0.75 * k.hover + 0.6 * k.sel);
    k.coreMat.opacity = Math.min(0.95, k.coreBase * (1 + 0.85 * k.hover + 0.7 * k.sel));
    // never bouncy: pure exponential approach. The knot tightens on hover/focus
    // (half amount) and fully on select — both driven by the smoothed values.
    k.tangle.scale.setScalar(1 - 0.06 * Math.max(k.hover * 0.5, k.sel));
    k.core.scale.setScalar(k.coreScale * (1 + 0.05 * k.hover - 0.04 * k.sel));
  }

  const api = {
    id: 'equip',
    group,
    hotspots: [
      // higher label offset keeps the PYPE tag clear of the right-side copy
      // block, which sits at the same screen height as the braid at rest
      { id: 'pype', object: pypeProxy, radius: 1.4, labelOffset: { x: 0, y: 3.0, z: 0 } },
      { id: 'arnold', object: knots.arnold.proxy, radius: 1.2, labelOffset: { x: 0, y: 1.0, z: 0 } },
      { id: 'astrid', object: knots.astrid.proxy, radius: 1.2, labelOffset: { x: 0, y: 1.0, z: 0 } },
    ],

    update(dt, time, cp, active) {
      for (const m of pulseMats) m.uniforms.uTime.value = time;

      // --- PYPE: slow, uneven, staggered upward transport ---
      const hoverBoost = 1 + 1.5 * pypeHover;
      const bu = braidMat.uniforms;
      for (const s of pypeStates) {
        const jitter = 0.5 + 0.85 * (0.5 + 0.5 * H.noise3(time * 0.11, s.k, 0));
        s.p += dt * s.speed * jitter * hoverBoost * (reduced ? 0.25 : 1);
        if (s.p > 1.3) s.p = -0.15 - rndA() * 0.7;      // uneven gaps between pulses
        bu.uPulse.value.setComponent(s.i, s.p);
        bu.uPulseOn.value.setComponent(s.i,
          (s.p > -0.15 && s.p < 1.2) ? (0.45 + 0.85 * pypeHover) : 0);
        bu.uBaseOp.value.setComponent(s.i,
          s.base * (1 + 0.35 * pypeHover + 0.25 * pypeSel));
      }

      // --- rare slow transport pulse through the mid field ---
      fieldPulseT -= dt;
      if (fieldPulseT <= 0) { fieldDriver.fire(); fieldPulseT = 7 + rndA() * 7; }
      fieldDriver.update(dt);
      if (midLayers[0]) {
        midLayers[0].mat.uniforms.uPulse.value = fieldDriver.value;
        midLayers[0].mat.uniforms.uPulseOn.value = fieldDriver.active ? 0.35 : 0;
      }

      // --- knots ---
      updateKnot(knots.arnold, dt);
      updateKnot(knots.astrid, dt);
      pypeHover += ((hovered === 'pype' ? 1 : 0) - pypeHover) * Math.min(dt * 4.5, 1);
      pypeSel += ((selected === 'pype' ? 1 : 0) - pypeSel) * Math.min(dt * 3.0, 1);

      // neighbouring fibres come into focus while something is selected/hovered
      const near = Math.max(knots.arnold.hover, knots.astrid.hover, pypeHover);
      const nearSel = Math.max(knots.arnold.sel, knots.astrid.sel, pypeSel);
      const neigh = 1 + 0.22 * near + 0.18 * nearSel;

      // --- entry (cp<0.1): brighten below ---
      const entry = cp < 0.10 ? 1 - cp / 0.10 : 0;
      entryGlow.mat.opacity = 0.34 * entry;
      entryGlow.sprite.visible = entry > 0.002;

      // --- exit (cp>0.9): fibres above bend outward slightly ---
      const exit = cp > 0.90 ? H.easings.smooth((cp - 0.90) / 0.10) : 0;
      exitFan.scale.set(1 + exit * 0.24, 1, 1 + exit * 0.24);
      exitFan.rotation.y = exit * 0.05;
      fanMat.uniforms.uBase.value = BASE.fan * (1 + 0.5 * exit) * neigh;

      if (midLayers[0]) midLayers[0].mat.uniforms.uBase.value = BASE.inner * (1 + 0.4 * entry) * neigh;
      if (midLayers[1]) midLayers[1].mat.uniforms.uBase.value = BASE.outer * (1 + 0.25 * entry);
      nearMat.uniforms.uBase.value = BASE.near * (1 + 0.3 * entry) * neigh;
      bridges.mat.uniforms.uBase.value = BASE.bridges * neigh;

      if (!active || reduced) return;

      // --- ambient: tiny fibre flex, randomized phase per group ---
      for (const f of flexGroups) {
        const n1 = H.noise3(time * 0.055, f.seed, 0);
        const n2 = H.noise3(0, time * 0.048, f.seed + 3.3);
        const n3 = H.noise3(f.seed + 7.1, 0, time * 0.041);
        f.g.rotation.y = n1 * f.ampR * motion;
        f.g.rotation.z = n3 * f.ampR * 0.5 * motion;
        if (f.anchor) {
          f.g.position.set(
            f.anchor.x + n2 * f.ampP * motion,
            f.anchor.y + n1 * f.ampP * 0.7 * motion,
            f.anchor.z + n3 * f.ampP * motion,
          );
        } else {
          f.g.position.set(n2 * f.ampP * motion, n1 * f.ampP * 0.5 * motion, n3 * f.ampP * motion);
        }
      }

      // --- far shells: imperceptible counter-drift for parallax ---
      for (const s of farShells) s.mesh.rotation.y += dt * s.spin * motion;

      // --- moisture droplets drifting upward through the field ---
      for (const d of droplets) {
        d.s.position.y += dt * d.speed * motion;
        if (d.s.position.y > 17) d.s.position.y = -9;
        const w = H.noise3(d.phase, d.s.position.y * 0.12, time * 0.05);
        const w2 = H.noise3(time * 0.045, d.phase + 2.1, 0);
        const rr = d.r + w * 0.35;
        d.s.position.x = Math.cos(d.a + w2 * 0.25) * rr;
        d.s.position.z = Math.sin(d.a + w2 * 0.25) * rr;
        // refractive catch: brief brightening as it crosses the light
        const catchAmt = Math.pow(0.5 + 0.5 * Math.sin(time * 0.5 + d.phase), 6);
        d.mat.opacity = d.baseOp * (0.55 + 0.9 * catchAmt);
        d.s.scale.setScalar(d.base * (1 + 0.35 * catchAmt));
      }
    },

    setHover(id) {
      if (hovered === id) return;
      hovered = id || null;
      const k = id && knots[id];
      if (k) k.driver.fire();                 // sequential pulse along its feeders
      if (id === 'pype') {                    // staggered restart across sub-strands
        pypeStates.forEach((s, i) => { s.p = -0.12 - i * 0.26; });
      }
    },

    setSelected(id) {
      selected = id || null;
      const k = id && knots[id];
      if (k) k.driver.fire();
    },

    trigger(name) {
      if (name === 'transport') pypeStates.forEach((s, i) => { s.p = -0.1 - i * 0.24; });
      else if (name === 'fieldPulse') fieldDriver.fire();
    },

    // Tier 2 thins EVERY bundle, not just the cheap backdrop: the line fields and
    // bridges by draw range, the tube bundles by strand count (spread-ordered, so
    // the thinning is even), and the braid by rebuilding at lower tessellation.
    // All of it is real GPU work removed — see the arithmetic in the header notes.
    setQuality(tier) {
      quality = tier;
      const half = tier === 2;
      for (const m of midLayers) {
        const n = half ? Math.floor(m.full * 0.5) : m.full;
        m.geo.setDrawRange(0, n - (n % 2));
      }
      const bn = half ? Math.floor(bridges.full * 0.5) : bridges.full;
      bridges.geo.setDrawRange(0, bn - (bn % 2));
      farShells.forEach((s, i) => { s.mesh.visible = half ? i === 0 : true; });
      droplets.forEach((d, i) => { d.s.visible = half ? i === 0 : true; });

      setStrands(nearRec, half ? 6 : nearRec.n);
      setStrands(fanRec, half ? 5 : fanRec.n);
      for (const id of Object.keys(knots)) {
        const k = knots[id];
        setStrands(k.tangleRec, half ? Math.round(k.tangleRec.n * 0.6) : k.tangleRec.n);
        setStrands(k.feederRec, half ? Math.max(3, k.feederRec.n - 2) : k.feederRec.n);
      }
      braidMesh.geometry = buildBraid(half ? 2 : 1);

      exitFan.visible = true;
    },

    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          // maps from helpers (glowSprite/softDisc) are process-wide cached and
          // shared with other chapters — never dispose m.map here. Only textures
          // this chapter authored (the far-shell streak canvases) are disposed,
          // via `disposables`.
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.dispose?.();
        }
      });
      for (const d of disposables) d.dispose?.();
      group.clear();
    },
  };

  if (ctx.tier === 2) api.setQuality(2);
  return api;
}
