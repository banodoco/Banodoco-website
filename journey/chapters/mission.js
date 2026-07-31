// Chapter 1 — MISSION: see the whole organism.
// A single luminous fruiting body — stipe, gills, tilted cap — rising from a
// much wider pre-existing diffuse mycelial field. NOT tree roots: the field
// is patchy fine hyphae with a few thicker cords that merely pass near the
// stipe base, plus soil-line growth tips, drifting under-cap spores, moisture
// glints, and one restrained ctaPulse guide toward the stipe entry point.
// See CONTRACT.md — cluster envelope "mission" — and handoff.md CHAPTER 1.
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

export function createChapter(ctx) {
  const H = ctx.helpers;
  const P = ctx.palette;
  const reduced = !!ctx.reducedMotion;
  const V3 = THREE.Vector3;

  const group = new THREE.Group();
  group.name = 'mission';

  const disposables = [];  // { dispose() }
  const timeMats = [];     // every material with a uTime uniform
  const jitterGroups = []; // ambient micro-shift carriers

  // tube with aAlong (0..1 along) + aStrand attributes
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

  // ribbon with aAlong (from uv.y) + aStrand attributes — for gill blades
  function ribbonStrand(points, width, strandVal) {
    const g = H.ribbon(points, width);
    const n = g.attributes.position.count;
    const uv = g.attributes.uv;
    const along = new Float32Array(n);
    const st = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      along[i] = uv ? uv.getY(i) : 0;
      st[i] = strandVal;
    }
    g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
    g.setAttribute('aStrand', new THREE.BufferAttribute(st, 1));
    if (g.attributes.normal) g.deleteAttribute('normal');
    if (g.attributes.uv) g.deleteAttribute('uv');
    return g;
  }

  function halfLineRange(fullCount, ratio = 0.55) {
    const n = Math.floor(fullCount * ratio);
    return n - (n % 2);
  }

  /* ================================================================ */
  /* ORGANISM CONSTANTS                                                 */
  /* ================================================================ */
  const CAP_POS = new V3(0.2, 5.6, 0);
  const CAP_RADIUS = 3.4;
  const CAP_HEIGHT = 1.35;
  const CAP_TILT = { x: -0.035, z: 0.055 };
  const STIPE_TOP = 5.0;
  const STIPE_BASE_R = 0.52;
  const STIPE_TAPER = 0.60;
  const LEAN_X = 0.24, LEAN_Z = 0.09;

  // profile fractions {x: radius/CAP_RADIUS, y: height/CAP_HEIGHT}, top->rim(->lip)
  const CAP_PROFILE = [
    { x: 0.00, y: 1.00 },
    { x: 0.26, y: 0.97 },
    { x: 0.53, y: 0.82 },
    { x: 0.76, y: 0.52 },
    { x: 0.93, y: 0.20 },
    { x: 1.00, y: 0.00 },
    { x: 0.975, y: -0.07 }, // slight underside curl / lip
  ];

  function stipeAxisAt(y) {
    const t = y / STIPE_TOP;
    const lean = t * t;
    const wobX = H.fbm3(0.6, y * 0.22, 2.4, 3) * 0.16;
    const wobZ = H.fbm3(3.1, y * 0.20 + 1.3, 0.7, 3) * 0.16;
    return new V3(LEAN_X * lean + wobX, y, LEAN_Z * lean + wobZ);
  }
  function stipeRadiusAt(t) {
    return STIPE_BASE_R * (1 + (STIPE_TAPER - 1) * t);
  }
  function capUndersideY(rFrac, thickness = 0.10) {
    const pts = CAP_PROFILE;
    let a = pts[0], b = pts[pts.length - 2]; // exclude the underside lip point
    for (let i = 0; i < pts.length - 2; i++) {
      if (rFrac >= pts[i].x && rFrac <= pts[i + 1].x) { a = pts[i]; b = pts[i + 1]; break; }
    }
    const span = Math.max(b.x - a.x, 1e-5);
    const f = THREE.MathUtils.clamp((rFrac - a.x) / span, 0, 1);
    const y = THREE.MathUtils.lerp(a.y, b.y, f) * CAP_HEIGHT;
    return y - thickness;
  }

  /* ================================================================ */
  /* STIPE — curved, tapering, asymmetric                              */
  /* ================================================================ */
  const stipeGroup = new THREE.Group();
  const stipeMat = H.makePulseMat(P.gold, {
    baseOpacity: 0.55, twinkle: 0.30, pulseWidth: 0.14,
    pulseColor: P.goldBright, fogDensity: 0.004,
  });
  timeMats.push(stipeMat);
  {
    const STIPE_SEGS = 16;
    const pts = [];
    for (let i = 0; i <= STIPE_SEGS; i++) pts.push(stipeAxisAt((i / STIPE_SEGS) * STIPE_TOP));
    const geo = tubeStrand(pts, {
      radius: STIPE_BASE_R, radialSegments: 12, tubularSegments: 70, taper: STIPE_TAPER,
    }, 0.0);
    const mesh = new THREE.Mesh(geo, stipeMat);
    mesh.frustumCulled = false;
    stipeGroup.add(mesh);
    disposables.push(geo);
  }

  /* ---------- dense outer-hypha hero layer hugging the stipe surface ---------- */
  // Ensures the threshold-one close-up (camera ends ~y2.3 touching the stipe)
  // reads as packed fibres with dark gaps, never a smooth empty tube.
  const HERO_FULL = 380;
  const heroMat = H.makePulseMat(P.goldBright, {
    baseOpacity: 0.30, twinkle: 0.55, pulseWidth: 0.10,
    pulseColor: P.ember, fogDensity: 0.006,
  });
  timeMats.push(heroMat);
  let heroLines;
  {
    const res = H.strandLines({
      count: HERO_FULL, seed: 9911,
      generator: (i, r) => {
        const ang = r() * TAU;
        const yc = 0.9 + r() * 3.5; // 0.9..4.4 — dense through the camera's approach zone
        const t = yc / STIPE_TOP;
        const rad = stipeRadiusAt(t);
        const dens = H.fbm3(Math.cos(ang) * 2.4, yc * 0.55, Math.sin(ang) * 2.4, 3);
        if (dens < -0.10) return null;               // dark gaps between fibres
        if (dens < 0.08 && r() < 0.5) return null;
        const c = stipeAxisAt(yc);
        const bump = 1 + H.noise3(ang * 3.1, yc * 0.4, 0) * 0.10;
        const len = 0.14 + r() * 0.22;
        const a2 = ang + (r() - 0.5) * 0.6 * 0.15;
        const y2 = yc + len;
        return [
          new V3(c.x + Math.cos(ang) * rad * bump, yc, c.z + Math.sin(ang) * rad * bump),
          new V3(c.x + Math.cos(a2) * rad * bump * 1.01, (yc + y2) / 2, c.z + Math.sin(a2) * rad * bump * 1.01),
          new V3(c.x + Math.cos(a2) * rad * bump * 1.015, y2, c.z + Math.sin(a2) * rad * bump * 1.015),
        ];
      },
    });
    heroLines = new THREE.LineSegments(res.geometry, heroMat);
    heroLines.frustumCulled = false;
    heroLines.userData.full = res.geometry.attributes.position.count;
    stipeGroup.add(heroLines);
  }
  jitterGroups.push({ g: stipeGroup, seed: 12.3, ampR: 0.0028, ampP: 0.0 });
  group.add(stipeGroup);

  /* ================================================================ */
  /* CAP — lathe dome, organic bumps + mottled vertex colour            */
  /* ================================================================ */
  const capGroup = new THREE.Group();
  capGroup.position.copy(CAP_POS);
  capGroup.rotation.set(CAP_TILT.x, 0, CAP_TILT.z);
  let capMesh, capMat;
  {
    const profilePts = CAP_PROFILE.map((p) => new THREE.Vector2(p.x * CAP_RADIUS, p.y * CAP_HEIGHT));
    const segs = 48;
    const geo = new THREE.LatheGeometry(profilePts, segs);
    const pos = geo.attributes.position;
    const n = pos.count;
    const colors = new Float32Array(n * 3);
    const deepC = new THREE.Color(P.deepGold), goldC = new THREE.Color(P.gold), brightC = new THREE.Color(P.goldBright);
    const tmp = new V3();
    for (let i = 0; i < n; i++) {
      tmp.fromBufferAttribute(pos, i);
      const ang = Math.atan2(tmp.z, tmp.x);
      const rr = Math.hypot(tmp.x, tmp.z);
      const bump = H.fbm3(Math.cos(ang) * 2.6, tmp.y * 0.7, Math.sin(ang) * 2.6, 4);
      const disp = 1 + bump * 0.045;
      pos.setXYZ(i, tmp.x * disp, tmp.y + bump * 0.05, tmp.z * disp);
      const patch = H.fbm3(Math.cos(ang) * 4.1 + 7.7, rr * 0.9, Math.sin(ang) * 4.1 + 3.1, 4);
      const t = THREE.MathUtils.clamp(0.5 + 0.5 * patch, 0, 1);
      const col = t < 0.5 ? deepC.clone().lerp(goldC, t * 2) : goldC.clone().lerp(brightC, (t - 0.5) * 2);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    capMat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true,
    });
    capMesh = new THREE.Mesh(geo, capMat);
    capGroup.add(capMesh);
    disposables.push(geo, capMat);
  }

  /* ---------- gills under the cap rim: primary + interleaved shorter secondary ---------- */
  const gillGroup = new THREE.Group();
  const gillMat = H.makePulseMat(P.ember, {
    baseOpacity: 0.30, twinkle: 0.45, pulseWidth: 0.16,
    pulseColor: P.goldBright, fogDensity: 0.006,
  });
  timeMats.push(gillMat);
  let gillMesh;
  const GILL_TOTAL = 54;
  const GILL_IDX_PER = 20 * 6; // ribbon segs=max(8, 5*4)=20 -> 20*6 indices/gill (uniform)
  {
    const rand = H.rng(6402);
    const geos = [];
    for (let i = 0; i < GILL_TOTAL; i++) {
      const ang = (i / GILL_TOTAL) * TAU + (rand() - 0.5) * 0.05;
      const secondary = i % 3 === 2;
      const rInFrac = secondary ? 0.34 + rand() * 0.18 : 0.10 + rand() * 0.05;
      const rOutFrac = 0.94 + rand() * 0.045;
      const STEPS = 4;
      const pts = [];
      for (let s = 0; s <= STEPS; s++) {
        const t = s / STEPS;
        const rf = THREE.MathUtils.lerp(rInFrac, rOutFrac, t);
        const r = rf * CAP_RADIUS;
        const y = capUndersideY(rf) + H.noise3(i * 1.7, t * 3.1, 0) * 0.03;
        const a2 = ang + H.noise3(i * 2.3, t * 2.0, 5.1) * 0.02;
        pts.push(new V3(Math.cos(a2) * r, y, Math.sin(a2) * r));
      }
      const width = (secondary ? 0.05 : 0.075) + rand() * 0.02;
      geos.push(ribbonStrand(pts, width, i / GILL_TOTAL));
    }
    const merged = mergeGeos(geos);
    gillMesh = new THREE.Mesh(merged, gillMat);
    gillMesh.frustumCulled = false;
    gillMesh.userData.fullIdx = merged.index.count;
    gillGroup.add(gillMesh);
    disposables.push(merged);
  }
  capGroup.add(gillGroup);
  jitterGroups.push({ g: capGroup, seed: 41.7, ampR: 0.006, ampP: 0.0, base: { x: CAP_TILT.x, z: CAP_TILT.z } });
  jitterGroups.push({ g: gillGroup, seed: 23.9, ampR: 0.010, ampP: 0.0 });
  group.add(capGroup);

  /* ================================================================ */
  /* GROUND — soil plane + faint glow patches                          */
  /* ================================================================ */
  {
    const geo = new THREE.CircleGeometry(40, 64);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(P.soil), transparent: true, opacity: 0.90,
      depthWrite: true, side: THREE.FrontSide, fog: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.03;
    group.add(mesh);
    disposables.push(geo, mat);
  }
  const GLOW_PATCH_COUNT = 10;
  const glowPatches = [];
  {
    const rand = H.rng(8201);
    for (let i = 0; i < GLOW_PATCH_COUNT; i++) {
      const col = rand() < 0.15 ? P.ember : P.gold;
      const mat = new THREE.SpriteMaterial({
        map: H.glowSprite(col, 96), color: new THREE.Color(col), transparent: true,
        opacity: 0.05 + rand() * 0.05, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
      });
      mat.rotation = rand() * TAU;
      const s = new THREE.Sprite(mat);
      const a = rand() * TAU, rad = 2 + rand() * rand() * 26;
      s.scale.set(2.2 + rand() * 3.5, 2.2 + rand() * 3.5, 1);
      s.position.set(Math.cos(a) * rad, 0.01, Math.sin(a) * rad);
      group.add(s);
      glowPatches.push({ s, mat, baseOp: mat.opacity, phase: rand() * TAU, period: 8 + rand() * 10 });
    }
  }

  /* ---------- diffuse mycelial field: patchy fine hyphae hugging the ground ---------- */
  const FIELD_FULL = 480;
  const fieldMat = H.makePulseMat(P.muted, {
    baseOpacity: 0.12, twinkle: 0.65, pulseWidth: 0.20,
    pulseColor: P.gold, fogDensity: 0.020,
  });
  timeMats.push(fieldMat);
  let fieldLines;
  {
    const res = H.strandLines({
      count: FIELD_FULL, seed: 5533,
      generator: (i, r) => {
        const ang = r() * TAU;
        const rad = 1.6 + Math.pow(r(), 0.55) * 28.4;
        const dens = H.fbm3(Math.cos(ang) * 1.4, rad * 0.06, Math.sin(ang) * 1.4, 3);
        if (dens < -0.15) return null;                 // patchy dropout — real dark gaps
        if (dens < 0.05 && r() < 0.6) return null;
        const len = 0.6 + r() * 1.8;
        const dir = r() * TAU;
        const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad;
        const dx = Math.cos(dir), dz = Math.sin(dir);
        const y0 = -0.32 + r() * 0.35;
        const pts = [];
        const STEPS = 4;
        for (let s = 0; s <= STEPS; s++) {
          const t = s / STEPS;
          const px = cx + dx * len * t, pz = cz + dz * len * t;
          const py = y0 + H.noise3(px * 0.5, t * 3, pz * 0.5) * 0.05;
          pts.push(new V3(px, py, pz));
        }
        return pts;
      },
    });
    fieldLines = new THREE.LineSegments(res.geometry, fieldMat);
    fieldLines.frustumCulled = false;
    fieldLines.userData.full = res.geometry.attributes.position.count;
    group.add(fieldLines);
  }

  /* ---------- 3 thicker rhizomorph-like cords — pass near the stipe, not FROM it ---------- */
  const CORD_COUNT = 3;
  const cordMeshes = [];
  {
    const rand = H.rng(3117);
    for (let c = 0; c < CORD_COUNT; c++) {
      const a0 = rand() * TAU;
      const r0 = 1.6 + rand() * 1.6;
      const rEnd = 20 + rand() * 8;
      const steps = 9;
      const pts = [];
      let curA = a0;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const curR = THREE.MathUtils.lerp(r0, rEnd, t);
        curA += H.fbm3(c * 3.3 + 1, t * 4.0, 1.7, 3) * 0.35;
        const y = -0.10 + H.fbm3(c * 5.1 + 1, t * 3.0, 2.2, 3) * 0.08;
        pts.push(new V3(Math.cos(curA) * curR, y, Math.sin(curA) * curR));
      }
      const geo = tubeStrand(pts, {
        radius: 0.045 + rand() * 0.03, radialSegments: 6, tubularSegments: 50, taper: 0.8,
      }, c / CORD_COUNT);
      const mat = H.makePulseMat(c === 0 ? P.gold : P.deepGold, {
        baseOpacity: 0.30, twinkle: 0.40, pulseWidth: 0.16, pulseColor: P.ember, fogDensity: 0.018,
      });
      timeMats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      group.add(mesh);
      cordMeshes.push({ mesh, mat, geo });
      disposables.push(geo);
    }
  }

  /* ---------- soil-line hyphal tips: brighten / fade / occasionally branch ---------- */
  const TIP_FULL = 70;
  const tipMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorDim: { value: new THREE.Color(P.deepGold) },
      uColorBright: { value: new THREE.Color(P.goldBright) },
      uOpacity: { value: 0.55 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      varying float vAlong;
      varying float vStrand;
      void main() {
        vAlong = aAlong; vStrand = aStrand;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uOpacity;
      uniform vec3 uColorDim, uColorBright;
      varying float vAlong, vStrand;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        float h1 = hash(vStrand * 91.7 + 1.0);
        float period = 6.0 + h1 * 9.0;
        float phase = mod(uTime + h1 * 47.0, period) / period;
        float glow = smoothstep(0.0, 0.18, phase) * smoothstep(1.0, 0.55, phase);
        float isBranch = step(0.5, vAlong);
        float gate = step(0.7, hash(vStrand * 53.1 + 2.0));
        float branchWin = smoothstep(0.32, 0.48, phase) * smoothstep(0.78, 0.5, phase);
        float branchAlpha = gate * branchWin * 1.3;
        float alpha = mix(glow, glow * branchAlpha, isBranch);
        vec3 col = mix(uColorDim, uColorBright, glow);
        gl_FragColor = vec4(col * alpha, alpha * uOpacity);
      }`,
  });
  timeMats.push(tipMat);
  let tipLines;
  {
    const res = H.strandLines({
      count: TIP_FULL, seed: 2266,
      generator: (i, r) => {
        const ang = r() * TAU;
        const rad = 1.8 + Math.pow(r(), 0.6) * 27;
        const cx = Math.cos(ang) * rad, cz = Math.sin(ang) * rad;
        const h = 0.015 + r() * 0.035;
        const dir = r() * TAU;
        const len = 0.10 + r() * 0.18;
        const p0 = new V3(cx, h * 0.4, cz);
        const p1 = new V3(cx + Math.cos(dir) * len, h, cz + Math.sin(dir) * len);
        const bdir = dir + (r() - 0.5) * 1.8;
        const blen = len * (0.35 + r() * 0.4);
        const p2 = new V3(p1.x + Math.cos(bdir) * blen, h + 0.008, p1.z + Math.sin(bdir) * blen);
        return [p0, p1, p2];
      },
    });
    tipLines = new THREE.LineSegments(res.geometry, tipMat);
    tipLines.frustumCulled = false;
    tipLines.userData.full = res.geometry.attributes.position.count;
    group.add(tipLines);
  }

  /* ---------- ambient guide strands: irregular pulses INTO the fruiting body ---------- */
  const GUIDE_FULL = 22;
  const guideMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(P.gold) },
      uPulseColor: { value: new THREE.Color(P.goldBright) },
      uBase: { value: 0.05 },
      uWidth: { value: 0.14 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      varying float vAlong;
      varying float vStrand;
      void main() {
        vAlong = aAlong; vStrand = aStrand;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uBase, uWidth;
      uniform vec3 uColor, uPulseColor;
      varying float vAlong, vStrand;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        float h1 = hash(vStrand * 77.0 + 3.0);
        float period = 5.0 + h1 * 8.0;
        float local = mod(uTime + h1 * 61.0, period) / period;
        float lit = step(local, 0.4);
        float head = local / 0.4;
        float d = vAlong - head;
        float pulse = lit * exp(-d * d / (uWidth * uWidth));
        float amb = uBase * (0.6 + 0.4 * sin(uTime * 0.3 + vStrand * 11.0));
        vec3 col = uColor * amb + uPulseColor * pulse * 0.9;
        gl_FragColor = vec4(col, amb + pulse);
      }`,
  });
  timeMats.push(guideMat);
  let guideLines;
  {
    // pts[0] = outer field point (aAlong=0) ... last = near stipe base (aAlong=1)
    const res = H.strandLines({
      count: GUIDE_FULL, seed: 4471,
      generator: (i, r) => {
        const ang = r() * TAU;
        const rOut = 6 + r() * 14;
        const cxo = Math.cos(ang) * rOut, czo = Math.sin(ang) * rOut;
        const innerAng = ang + (r() - 0.5) * 0.6;
        const innerR = 0.5 + r() * 0.6;
        const cxi = Math.cos(innerAng) * innerR, czi = Math.sin(innerAng) * innerR;
        const STEPS = 4;
        const pts = [];
        for (let s = 0; s <= STEPS; s++) {
          const t = s / STEPS;
          const x = THREE.MathUtils.lerp(cxo, cxi, t) + H.noise3(i * 1.3, t * 3, 0) * 0.4 * (1 - t);
          const z = THREE.MathUtils.lerp(czo, czi, t) + H.noise3(i * 2.1, t * 3, 5) * 0.4 * (1 - t);
          const y = -0.15 + t * 0.1 + H.noise3(x * 0.3, z * 0.3, t) * 0.03;
          pts.push(new V3(x, y, z));
        }
        return pts;
      },
    });
    guideLines = new THREE.LineSegments(res.geometry, guideMat);
    guideLines.frustumCulled = false;
    guideLines.userData.full = res.geometry.attributes.position.count;
    group.add(guideLines);
  }

  /* ---------- ctaPulse: one restrained pulse toward the stipe entry point ---------- */
  const CTA_COUNT = 4;
  const ctaMat = H.makePulseMat(P.gold, {
    baseOpacity: 0.10, twinkle: 0.15, pulseWidth: 0.22, pulseColor: P.goldBright, fogDensity: 0.010,
  });
  timeMats.push(ctaMat);
  let ctaLines;
  {
    const res = H.strandLines({
      count: CTA_COUNT, seed: 7733,
      generator: (i, r) => {
        const ang = (i / CTA_COUNT) * TAU + (r() - 0.5) * 0.8;
        const rOut = 5 + r() * 4;
        const cxo = Math.cos(ang) * rOut, czo = Math.sin(ang) * rOut;
        const innerAng = ang + (r() - 0.5) * 0.4;
        const innerR = 0.35 + r() * 0.3;
        const cxi = Math.cos(innerAng) * innerR, czi = Math.sin(innerAng) * innerR;
        const STEPS = 5;
        const pts = [];
        for (let s = 0; s <= STEPS; s++) {
          const t = s / STEPS;
          pts.push(new V3(
            THREE.MathUtils.lerp(cxo, cxi, t),
            -0.12 + t * 0.15,
            THREE.MathUtils.lerp(czo, czi, t),
          ));
        }
        return pts;
      },
    });
    ctaLines = new THREE.LineSegments(res.geometry, ctaMat);
    ctaLines.frustumCulled = false;
    group.add(ctaLines);
  }
  const ctaDriver = H.pulseDriver(2.4);
  const entryGlow = (() => {
    const mat = new THREE.SpriteMaterial({
      map: H.glowSprite(P.goldBright, 64), color: new THREE.Color(P.goldBright),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
    });
    const s = new THREE.Sprite(mat);
    s.position.set(0, 0.08, 0);
    s.scale.setScalar(0.5);
    group.add(s);
    return { sprite: s, mat };
  })();

  /* ---------- fine spores drifting beneath the cap, around the rim ---------- */
  const SPORE_FULL = 280;
  const SPORE_TIER2 = 150;
  function buildSporeGeo(count, seed) {
    const rand = H.rng(seed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const ang = rand() * TAU;
      const rr = CAP_RADIUS * (0.5 + rand() * 0.6);
      const y = CAP_POS.y - (0.2 + rand() * 1.6);
      positions[i * 3 + 0] = CAP_POS.x + Math.cos(ang) * rr;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = CAP_POS.z + Math.sin(ang) * rr;
      seeds[i] = rand() * 1000;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
    return geo;
  }
  const sporeGeoFull = buildSporeGeo(SPORE_FULL, 6161);
  const sporeGeoLow = buildSporeGeo(SPORE_TIER2, 6161);
  const sporeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(P.goldBright) },
      uColor2: { value: new THREE.Color(P.parchment) },
      uMap: { value: H.softDisc(48) },
      uSize: { value: 16 },
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aSeed;
      uniform float uTime, uSize;
      varying float vAlpha;
      varying float vSeed;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        vSeed = aSeed;
        float period = 9.0 + hash(aSeed * 1.3) * 7.0;
        float t = mod(uTime + hash(aSeed) * 40.0, period) / period;
        vec3 p = position;
        float ang = uTime * 0.06 * (0.4 + hash(aSeed * 2.1)) + aSeed;
        float driftR = 0.4 * sin(uTime * 0.08 + aSeed * 3.0);
        p.x += cos(ang) * driftR;
        p.z += sin(ang) * driftR;
        p.y += sin(uTime * 0.1 + aSeed * 1.7) * 0.15 - t * 0.3;
        vAlpha = smoothstep(0.0, 0.12, t) * smoothstep(1.0, 0.7, t);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (1.0 / -mv.z) * (0.6 + hash(aSeed * 5.3) * 0.7);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uColor, uColor2;
      varying float vAlpha;
      varying float vSeed;
      float hash(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        vec3 col = mix(uColor, uColor2, hash(vSeed * 7.1) * 0.4);
        gl_FragColor = vec4(col, tex.a * vAlpha * 0.8);
      }`,
  });
  timeMats.push(sporeMat);
  const sporePoints = new THREE.Points(sporeGeoFull, sporeMat);
  sporePoints.frustumCulled = false;
  group.add(sporePoints);

  /* ---------- moisture glints: a few tiny bright sprites that fade in/out ---------- */
  const MOIST_COUNT = 7;
  const moistureGlints = [];
  {
    const rand = H.rng(7011);
    const cols = [P.goldBright, P.ember, P.gold, P.goldBright, P.ember, P.gold, P.coolAccent];
    for (let i = 0; i < MOIST_COUNT; i++) {
      const col = cols[i % cols.length];
      const mat = new THREE.SpriteMaterial({
        map: H.glowSprite(col, 64), color: new THREE.Color(col), transparent: true,
        opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: true,
      });
      const s = new THREE.Sprite(mat);
      const where = rand();
      let pos;
      if (where < 0.4) {
        const y = 0.6 + rand() * 3.6;
        const c = stipeAxisAt(y);
        const rad = stipeRadiusAt(y / STIPE_TOP) + 0.03;
        const a = rand() * TAU;
        pos = new V3(c.x + Math.cos(a) * rad, y, c.z + Math.sin(a) * rad);
      } else if (where < 0.7) {
        const a = rand() * TAU, r = 3 + rand() * 22;
        pos = new V3(Math.cos(a) * r, 0.04 + rand() * 0.05, Math.sin(a) * r);
      } else {
        const a = rand() * TAU, r = 1.2 + rand() * 2.6;
        pos = new V3(CAP_POS.x + Math.cos(a) * r, CAP_POS.y - 0.3 - rand() * 0.5, CAP_POS.z + Math.sin(a) * r);
      }
      s.position.copy(pos);
      s.scale.setScalar(0.10 + rand() * 0.08);
      group.add(s);
      moistureGlints.push({ s, mat, baseOp: 0.55 + rand() * 0.25, period: 4 + rand() * 6, phase: rand() * TAU });
    }
  }

  /* ================================================================ */
  /* STATE + FRAME LOOP                                                */
  /* ================================================================ */
  let quality = 1;
  const motion = reduced ? 0 : 1;

  const api = {
    id: 'mission',
    group,
    hotspots: [], // mission has no interactive nodes

    update(dt, time, cp, active) {
      for (const m of timeMats) m.uniforms.uTime.value = time;

      // --- ctaPulse driver ---
      ctaDriver.update(dt);
      const ctaOn = ctaDriver.active ? 1 : 0;
      ctaMat.uniforms.uPulseOn.value = ctaOn;
      ctaMat.uniforms.uPulse.value = ctaDriver.value;
      const ctaEnv = ctaDriver.active ? Math.sin(Math.min(ctaDriver.value, 1) * Math.PI) : 0;
      entryGlow.mat.opacity = 0.5 * ctaEnv;
      entryGlow.sprite.scale.setScalar(0.5 + 0.4 * ctaEnv);

      if (!reduced) {
        for (const g of moistureGlints) {
          const s = 0.5 + 0.5 * Math.sin(time * (TAU / g.period) + g.phase);
          g.mat.opacity = g.baseOp * Math.pow(s, 3);
        }
        for (const p of glowPatches) {
          const s = 0.5 + 0.5 * Math.sin(time * (TAU / p.period) + p.phase);
          p.mat.opacity = p.baseOp * (0.7 + 0.3 * s);
        }
      }

      if (!active || reduced) return;

      // --- gill-edge / cap-margin / stipe micro-shift: irregular, low amplitude ---
      for (const j of jitterGroups) {
        const n1 = H.noise3(time * 0.05, j.seed, 0);
        const n2 = H.noise3(0, time * 0.045, j.seed + 3.7);
        const n3 = H.noise3(j.seed + 6.1, 0, time * 0.04);
        if (j.base) {
          j.g.rotation.set(j.base.x + n1 * j.ampR * motion, n2 * j.ampR * 0.5 * motion, j.base.z + n3 * j.ampR * motion);
        } else {
          j.g.rotation.set(n1 * j.ampR * motion, n2 * j.ampR * 0.6 * motion, n3 * j.ampR * motion);
        }
      }
    },

    setHover() { /* mission has no hotspots */ },
    setSelected() { /* mission has no hotspots */ },

    trigger(name) {
      if (name === 'ctaPulse') ctaDriver.fire();
    },

    setQuality(tier) {
      quality = tier;
      const half = tier === 2;

      const hf = heroLines.userData.full;
      heroLines.geometry.setDrawRange(0, half ? halfLineRange(hf) : hf);

      const ff = fieldLines.userData.full;
      fieldLines.geometry.setDrawRange(0, half ? halfLineRange(ff) : ff);

      const tf = tipLines.userData.full;
      tipLines.geometry.setDrawRange(0, half ? halfLineRange(tf, 0.55) : tf);

      const gf = guideLines.userData.full;
      guideLines.geometry.setDrawRange(0, half ? halfLineRange(gf, 0.65) : gf);

      // gills: indexed mesh, clip to whole-gill blocks
      const fullIdx = gillMesh.userData.fullIdx;
      const strands = Math.floor((fullIdx / GILL_IDX_PER) * (half ? 0.56 : 1));
      gillMesh.geometry.setDrawRange(0, strands * GILL_IDX_PER);

      // cords: hide the last one on reduced tier (keep 2 of 3)
      cordMeshes.forEach((c, i) => { c.mesh.visible = half ? i < 2 : true; });

      // spores: swap to a prebuilt lower-count geometry
      sporePoints.geometry = half ? sporeGeoLow : sporeGeoFull;

      // moisture glints / glow patches: hide roughly half on reduced tier
      moistureGlints.forEach((m, i) => { m.s.visible = half ? i % 2 === 0 : true; });
      glowPatches.forEach((p, i) => { p.s.visible = half ? i % 2 === 0 : true; });

      // hero structures (stipe, cap, primary gill silhouette) always stay full.
    },

    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) { if (m.map) m.map.dispose?.(); m.dispose?.(); }
        }
      });
      sporeGeoFull.dispose();
      sporeGeoLow.dispose();
      for (const d of disposables) d.dispose?.();
      group.clear();
    },
  };

  if (ctx.tier === 2) api.setQuality(2);
  return api;
}
