// journey-v6 — OWNED substrate (W4-C): the volumetric mycelial field.
// Port of the APPROVED Spike B treatment (spike-b/field.js) into the live
// journey, re-authored against the journey's REAL Owned leg polyline
// (owned-leg.js) instead of the spike's stand-alone arc. Copied + adapted,
// never imported from spike-b/ (that tree stays frozen as the look-dev
// record).
//
// Carried verbatim from the spike:
//   - two-scale substrate density (low values are soil, not colony);
//   - one coherent flow field so hyphae read as grown, not scattered;
//   - three depth batches of fine hyphae (far volume fill / mid shell /
//     near shell), shells sampled around the CAMERA POLYLINE;
//   - five rhizomorph cords with independent travelling waves + filament
//     bundle overlays (a rhizomorph is a bundle, not a pipe);
//   - authored dark voids kept off-frame-centre, push-cleared off the path;
//   - soil aggregates, amber haze backdrop, interaction-only colony surge.
// New for the journey: a soil-underside lid (the frame is visibly UNDER
// ground — the T3 crossing and the rise both pass through it), fade support
// for the T3 streaming seam, and clamps that keep every element below the
// real groundY().
import * as THREE from 'three';
import * as H from '../../lib/helpers.js';

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;

/* Adapted copy of the spike's pulse material with one addition: uFade, the
   T3 seam ramp (the whole chapter eases in/out, never switches). */
export function makeFadePulseMat(baseColor, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uPulseOn: { value: 0 },
      uFade: { value: 0 },
      uBase: { value: opts.baseOpacity ?? 0.35 },
      uColor: { value: new THREE.Color(baseColor) },
      uPulseColor: { value: new THREE.Color(opts.pulseColor ?? 0xf0c877) },
      uPulseWidth: { value: opts.pulseWidth ?? 0.12 },
      uTwinkle: { value: opts.twinkle ?? 0.35 },
      uFogDensity: { value: opts.fogDensity ?? 0.0 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      varying float vAlong, vStrand, vFogDepth;
      void main() {
        vAlong = aAlong;
        vStrand = aStrand;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uPulse, uPulseOn, uFade, uBase, uPulseWidth, uTwinkle, uFogDensity;
      uniform vec3 uColor, uPulseColor;
      varying float vAlong, vStrand, vFogDepth;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.6 + vStrand * 1.7) + vStrand * 43.7);
        float amb = uBase * (1.0 - uTwinkle + uTwinkle * tw);
        float d = abs(vAlong - uPulse);
        float pulse = uPulseOn * exp(-d * d / (uPulseWidth * uPulseWidth));
        vec3 col = uColor * amb + uPulseColor * pulse;
        float fogF = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
        col *= 1.0 - clamp(fogF, 0.0, 1.0);   // additive: depth fades to black
        // near-fade: a strand grazing the lens softens away instead of
        // blazing into a flat ribbon (the near field belongs to defocus,
        // not brightness — same philosophy as the portrait blur band)
        col *= smoothstep(1.1, 2.9, vFogDepth);
        gl_FragColor = vec4(col * uFade, 1.0);
      }`,
  });
}

export function buildSubstrate({ leg, palette: P, exposure = 1 }) {
  const V3 = THREE.Vector3;
  const V = (x, y, z) => new V3(x, y, z);
  const group = new THREE.Group();
  group.name = 'owned-substrate';
  const timeMats = [];        // shader mats needing uTime + uFade
  const fadeSprites = [];     // {mat, base} plain materials faded by opacity
  const rndA = H.rng(90211);
  const _tube = new V3();

  const {
    camPts, camDist, nearestCamPt, RIGHT, UPN,
    spineAt, clampUnder, groundY,
  } = leg;

  // World envelope of the underground volume (the journey's soil sits at
  // groundY ~ 0; the colony lives in a slab under it, sized so the T3 entry
  // column, the whole glide and the rise exit all sit well inside it).
  const BX = [-17.5, 5.5], BY = [-6.8, -0.1], BZ = [-9.5, 9.5];

  // Two-scale substrate density — spike values, spike seeds.
  function substrate(x, y, z) {
    return H.fbm3(x * 0.052 + 3.1, y * 0.100 - 1.2, z * 0.052 - 1.7, 4) * 0.72
         + H.fbm3(x * 0.170 - 5.0, y * 0.230 + 2.2, z * 0.170 + 4.4, 3) * 0.28;
  }

  /* ---------------- authored dark voids ----------------
     Kept OFF frame-centre for the whole leg: the rest gaze runs down the
     corridor toward -X, so voids live on the flanks and under the floor,
     read obliquely, never entered. Push-cleared off the real polyline. */
  const VOIDS = [];
  {
    const spots = [
      { t: 0.10, r: 3.6, side: -1, u: -0.2, d: 8.5 },
      { t: 0.30, r: 4.0, side: 1, u: 0.4, d: 8.8 },
      { t: 0.46, r: 3.4, side: 0, u: -2.6, d: 0 },     // under the floor
      { t: 0.60, r: 4.2, side: -1, u: 0.2, d: 9.0 },
      { t: 0.80, r: 3.8, side: 1, u: -0.5, d: 8.6 },
    ];
    for (const s of spots) {
      const c = spineAt(s.t)
        .addScaledVector(RIGHT, s.side * s.d)
        .addScaledVector(UPN, s.u * 2.0);
      for (let guard = 0; guard < 8; guard++) {
        const cd = camDist(c.x, c.y, c.z);
        if (cd > s.r + 2.4) break;
        const nearest = nearestCamPt(c);
        const away = c.clone().sub(nearest);
        if (away.lengthSq() < 0.001) away.copy(RIGHT);
        c.addScaledVector(away.normalize(), (s.r + 2.4) - cd + 0.2);
      }
      if (c.y > -1.0) c.y = -1.0;                     // voids stay in the slab
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

  // One coherent flow field (spike verbatim), with a soil-ceiling reflection
  // so strands near the lid flatten along it instead of poking through.
  function flowStep(cur, i, step, out) {
    const a = H.fbm3(cur.x * 0.110 + i * 0.013, cur.y * 0.140, cur.z * 0.110, 3) * TAU;
    const b = H.fbm3(cur.z * 0.100 - 4.2, cur.x * 0.100 + 7.7, cur.y * 0.125, 3) * Math.PI * 0.62;
    const cb = Math.cos(b);
    out.set(
      cur.x + Math.cos(a) * cb * step,
      cur.y + Math.sin(b) * 0.72 * step,
      cur.z + Math.sin(a) * cb * step,
    );
    const lid = groundY(out.x, out.z) - 0.16;
    if (out.y > lid) out.y = lid - (out.y - lid) * 0.6;
    if (out.y < BY[0]) out.y = BY[0] + (BY[0] - out.y) * 0.6;
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
          // shell around the REAL leg polyline — the layers the lens brushes
          // past wrap every moment of the traverse, descent and rise included
          const s = rand();
          const f = clamp(s, 0, 1) * (camPts.length - 1);
          const i0 = Math.min(Math.floor(f), camPts.length - 2);
          _tube.copy(camPts[i0]).lerp(camPts[i0 + 1], f - i0);
          const a = rand() * TAU;
          const b = (rand() - 0.5) * Math.PI;
          const rr = spec.rMin + (spec.rMax - spec.rMin) * Math.sqrt(rand());
          x = clamp(_tube.x + Math.cos(a) * Math.cos(b) * rr, BX[0], BX[1]);
          y = _tube.y + Math.sin(b) * rr * 0.72;
          z = clamp(_tube.z + Math.sin(a) * Math.cos(b) * rr * 0.85, BZ[0], BZ[1]);
        } else {
          x = BX[0] + rand() * (BX[1] - BX[0]);
          y = BY[0] + rand() * (BY[1] - BY[0]);
          z = BZ[0] + rand() * (BZ[1] - BZ[0]);
          // the far layer stays out of the corridor the near layers own
          if (camDist(x, y, z) < spec.gdMin && rand() < 0.78) return null;
        }
        y = Math.min(y, groundY(x, z) - 0.18);
        if (y < BY[0]) y = BY[0] + rand() * 0.4;
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
    const mat = makeFadePulseMat(spec.color, {
      baseOpacity: spec.base * exposure, twinkle: spec.twinkle, pulseWidth: 0.10,
      pulseColor: spec.pulseColor, fogDensity: spec.fog,
    });
    const lines = new THREE.LineSegments(res.geometry, mat);
    lines.frustumCulled = false;
    lines.renderOrder = spec.order;
    group.add(lines);
    timeMats.push(mat);
    hyphaeVerts += res.geometry.attributes.position.count;
    hyphae.push({ lines, mat });
  }

  // far: fills the slab, dissolving into the haze
  hyphaBatch({
    count: 2700, seed: 2201, cut: -0.13, gdMin: 4.6,
    lenMin: 2.6, lenMax: 6.2, color: P.deepGold, pulseColor: P.ember,
    base: 0.135, twinkle: 0.64, fog: 0.031, order: -6,
  });
  // mid: the body of the colony, wrapped around the leg
  hyphaBatch({
    count: 3300, seed: 3307, cut: -0.08, rMin: 2.2, rMax: 11.5,
    lenMin: 2.0, lenMax: 4.6, color: 0xc19240, pulseColor: P.goldBright,
    base: 0.185, twinkle: 0.55, fog: 0.021, order: -5,
  });
  // near: sharp, hot, brushing past the lens (short steps — no jagged bolts)
  hyphaBatch({
    count: 1400, seed: 4409, cut: -0.08, rMin: 0.6, rMax: 6.2,
    lenMin: 1.1, lenMax: 2.5, color: P.gold, pulseColor: P.goldBright,
    base: 0.235, twinkle: 0.42, fog: 0.012, order: -4,
  });

  /* ---------------- soil-underside lid ----------------
     The ceiling of the underground volume, read from below as a dark
     undulating grid of root-mat lines just beneath the real soil surface —
     both crossings (T3 down, the rise up) pass THROUGH it, which is what
     keeps the seams reading as thresholds rather than fades. */
  {
    const rand = H.rng(6633);
    const gauss = () => (rand() + rand() + rand() + rand() - 2) / 2;
    const res = H.strandLines({
      count: 560, seed: 6633,
      generator: () => {
        const x = BX[0] + rand() * (BX[1] - BX[0]);
        const z = BZ[0] + rand() * (BZ[1] - BZ[0]);
        if (inVoid(x, -0.6, z) && rand() < 0.7) return null;
        const y0 = groundY(x, z) - 0.12 - Math.abs(gauss()) * 0.10;
        const a = rand() * TAU;
        const len = 0.7 + rand() * 1.6;
        const pts = [];
        for (let j = 0; j <= 3; j++) {
          const t = j / 3;
          const px = x + Math.cos(a) * len * t + gauss() * 0.10;
          const pz = z + Math.sin(a) * len * t + gauss() * 0.10;
          pts.push(V(px, groundY(px, pz) - 0.12 - Math.abs(gauss()) * 0.12, pz));
        }
        return pts;
      },
    });
    const mat = makeFadePulseMat(P.deepGold, {
      baseOpacity: 0.16 * exposure, twinkle: 0.30, pulseWidth: 0.10,
      pulseColor: P.ember, fogDensity: 0.026,
    });
    const lines = new THREE.LineSegments(res.geometry, mat);
    lines.frustumCulled = false;
    lines.renderOrder = -6;
    group.add(lines);
    timeMats.push(mat);
    hyphaeVerts += res.geometry.attributes.position.count;
  }

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

  // Cords run the corridor at RIGHT/UPN offsets. The rest gaze looks DOWN
  // the corridor (-X), so cords are given deliberate lateral travel — they
  // cross the frame obliquely, passing above/below the camera path (never
  // through it: the clearance push guards the polyline).
  const CORD_SPECS = [
    { seed: 6101, r0: -5.2, u0: -2.2, r1: -2.6, u1: 1.0, rad: 0.20,
      col: P.gold, pulse: P.goldBright, bow: V(0.5, 1.4, -2.0), speed: 0.052, base: 0.40 },
    { seed: 6203, r0: 4.6, u0: 1.6, r1: 2.8, u1: -2.4, rad: 0.15,
      col: 0xb98a35, pulse: P.ember, bow: V(-1.0, -1.2, 1.8), speed: 0.038, base: 0.33 },
    { seed: 6301, r0: -7.0, u0: 1.2, r1: -4.4, u1: -1.4, rad: 0.13,
      col: P.deepGold, pulse: P.ember, bow: V(1.4, 1.0, 2.2), speed: 0.031, base: 0.30 },
    { seed: 6407, r0: 3.2, u0: -3.2, r1: 5.2, u1: -2.0, rad: 0.11,
      col: P.gold, pulse: P.goldBright, bow: V(-1.8, 0.8, -1.2), speed: 0.045, base: 0.28 },
    // one cord climbs toward the organism above: it rises under the stipe at
    // the entry end and stops just beneath the soil — the T3 descent passes
    // alongside it, tying the underground to the mushroom overhead
    { seed: 6521, r0: 2.6, u0: -2.0, r1: 1.6, u1: 3.5, rad: 0.17, tShort: 0.34,
      col: P.goldBright, pulse: P.goldBright, bow: V(0.8, 0.4, -1.2), speed: 0.061, base: 0.42 },
    // and one runs out along the EXIT corridor so the rise leaves through a
    // live artery (OW-5: the pulse leaves along the active growth front)
    { seed: 6617, r0: -1.8, u0: -1.6, r1: -3.0, u1: 1.8, rad: 0.14, tA: 0.52, tB: 1.10,
      col: P.gold, pulse: P.goldBright, bow: V(0.6, 0.9, 1.4), speed: 0.049, base: 0.34 },
  ];

  const cords = [];
  const cordPoints = [];
  let cordVerts = 0;
  CORD_SPECS.forEach((S, ci) => {
    const rand = H.rng(S.seed);
    const SEG = 11;
    const tA = S.tA ?? -0.08;
    const tB = S.tB ?? (S.tShort ?? 1.12);
    const pts = [];
    for (let j = 0; j <= SEG; j++) {
      const t = j / SEG;
      const gt = tA + t * (tB - tA);
      const p = spineAt(gt)
        .addScaledVector(RIGHT, S.r0 + (S.r1 - S.r0) * t)
        .addScaledVector(UPN, S.u0 + (S.u1 - S.u0) * t);
      const hump = Math.sin(Math.PI * t);
      p.addScaledVector(S.bow, hump);
      p.x += H.fbm3(t * 3.1 + ci * 5.3, 0.7, 2.1, 3) * 1.4;
      p.y += H.fbm3(1.9, t * 3.4 + ci * 2.7, 0.4, 3) * 1.0;
      p.z += H.fbm3(4.4, 0.3, t * 3.0 + ci * 4.1, 3) * 1.4;
      clampUnder(p, S.tShort ? 0.22 : 0.35);
      // corridor clearance: never let a thick cord brush the camera path.
      // 3.4 (spike used 2.8): at the journey's fov 54 a tube at 2.8 still
      // reads as a frame-wide flat ribbon.
      const gd = camDist(p.x, p.y, p.z);
      if (gd < 3.4) {
        const nearest = nearestCamPt(p);
        const push = (3.4 - gd) / Math.max(gd, 0.001);
        p.set(
          p.x + (p.x - nearest.x) * push,
          p.y + (p.y - nearest.y) * push,
          p.z + (p.z - nearest.z) * push,
        );
        clampUnder(p, 0.22);
      }
      pts.push(p);
    }
    cordPoints.push(pts);
    const geo = tubeStrand(pts, {
      radius: S.rad, radialSegments: 6, tubularSegments: 64, taper: 0.55 + rand() * 0.3,
    }, ci / CORD_SPECS.length);
    const mat = makeFadePulseMat(S.col, {
      // 0.62 was the spike's display-space cord level; under the hero's
      // ACES stack the tubes read as bright ribbons — cut to 0.34 and let
      // depth sink faster (fogDensity 0.010 -> 0.020)
      baseOpacity: S.base * 0.34 * exposure, twinkle: 0.14, pulseWidth: 0.075,
      pulseColor: S.pulse, fogDensity: 0.020,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    timeMats.push(mat);
    cordVerts += geo.attributes.position.count;

    // filament overlay: a rhizomorph is a BUNDLE of hyphae, not a smooth
    // pipe. Jittered polylines share the tube's material so waves ride them.
    {
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
          clampUnder(p, 0.18);
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
    }

    cords.push({
      mesh, mat, p: -0.2 - ci * 0.31, speed: S.speed, k: ci * 4.7 + 1.3,
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
      const x = BX[0] + rand() * (BX[1] - BX[0]);
      const y = BY[0] + rand() * (BY[1] - BY[0]);
      const z = BZ[0] + rand() * (BZ[1] - BZ[0]);
      if (y > groundY(x, z) - 0.25) continue;
      if (inVoid(x, y, z)) continue;
      const gd = camDist(x, y, z);
      if (nearOnly && gd > 6.0) continue;
      if (!nearOnly && gd < 4.5) continue;
      if (substrate(x, y, z) < 0.12) continue;
      pos.push(x, y, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: H.softDisc(64), color: new THREE.Color(color), size,
      sizeAttenuation: true, transparent: true, opacity: opacity * exposure,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = -7;
    group.add(pts);
    aggPoints += pos.length / 3;
    fadeSprites.push({ mat, base: opacity * exposure });
    return { pts, mat, baseOp: opacity * exposure };
  }
  const aggFar = aggregateLayer(7701, 56, 0.95, 0.055, P.deepGold, false);
  const aggNear = aggregateLayer(7803, 78, 0.32, 0.085, 0x8a6a34, true);

  /* ---------------- amber haze backdrop ----------------
     Very large, very dim ember glows deep in the volume: distant structure
     dissolves into warm haze instead of pure black. Centres pushed low so
     the glow hugs the colony — the Final cutaway reads soil-line above it. */
  {
    const rand = H.rng(5150);
    const place = (p, hot, op, sc) => {
      const mat = new THREE.SpriteMaterial({
        map: H.glowSprite(hot ? P.ember : P.deepGold, 64),
        color: new THREE.Color(hot ? P.ember : P.deepGold),
        transparent: true, opacity: op * exposure, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false,
      });
      const s = new THREE.Sprite(mat);
      s.position.copy(p);
      s.scale.setScalar(sc);
      s.renderOrder = -10;
      group.add(s);
      fadeSprites.push({ mat, base: op * exposure });
    };
    for (let i = 0; i < 8; i++) {
      const t = 0.05 + rand() * 0.9;
      const side = rand() < 0.5 ? -1 : 1;
      const p = spineAt(t)
        .addScaledVector(RIGHT, side * (10 + rand() * 9))
        .addScaledVector(UPN, -1.5 + (rand() - 0.5) * 4);
      if (p.y > -2.0) p.y = -2.0 - rand();
      place(p, i % 3 === 0, 0.014 + rand() * 0.016, 9 + rand() * 8);
    }
    // below-floor glows so the bottom of frame dissolves into amber
    for (let i = 0; i < 4; i++) {
      const t = 0.14 + rand() * 0.72;
      const p = spineAt(t)
        .addScaledVector(RIGHT, (rand() - 0.5) * 8)
        .addScaledVector(UPN, -(6.0 + rand() * 2.5));
      place(p, i === 1, 0.012 + rand() * 0.012, 10 + rand() * 8);
    }
  }

  /* ---------------- colony surge (pod-hover response, OW-3) --------------
     One broad slow pulse through the whole colony: every cord re-fires its
     travelling wave in a stagger, and the hyphae depth batches run a single
     quiet light-sweep along their strands, far layer last. Interaction-
     triggered only — ambient behaviour stays loop-free. */
  let surgeT = -1;
  function surge() {
    surgeT = 0;
    cords.forEach((c, ci) => { c.p = -0.04 - ci * 0.22; c.boost = 1.0; });
  }

  /* ---------------- frame update ---------------- */
  let fade = 0;
  function setFade(a) {
    fade = a;
    for (const m of timeMats) m.uniforms.uFade.value = a;
    for (const f of fadeSprites) f.mat.opacity = f.base * a;
  }
  setFade(0);

  function update(dt, time) {
    if (fade <= 0) return;
    for (const m of timeMats) m.uniforms.uTime.value = time;
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
    aggFar.mat.opacity = aggFar.baseOp * fade * (0.85 + 0.15 * (0.5 + 0.5 * Math.sin(time * 0.09)));
    aggNear.mat.opacity = aggNear.baseOp * fade * (0.82 + 0.18 * (0.5 + 0.5 * Math.sin(time * 0.063 + 1.7)));
  }

  return {
    group, update, surge, setFade, cordPoints, nearestCordPoint, inVoid,
    counts: {
      hyphaeVerts, cordVerts, aggPoints,
      hyphaeStrands: 2700 + 3300 + 1400,
      cords: CORD_SPECS.length,
      voids: VOIDS.length,
    },
  };
}
