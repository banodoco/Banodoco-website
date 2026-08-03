// Spike A — Inspire plume treatment v1 (LA-2, LA-4, LA-6 streak).
// Three spore-exit regions on the REAR rim of the real hero cap. Behaviour
// adapted from journey/chapters/inspire.js (staged GPU phase shader) but
// re-parameterised against the hero's actual anatomy via anatomy.js:
//   born BETWEEN GILLS under the cap -> lateral travel to the margin ->
//   curl around the rim in local airflow -> braided turbulent rise leaning
//   with the +x breeze. A cohort drops and fades; a cohort circles; nothing
//   is a fountain, and nothing touches the cap top.
// Everything parents to groups.mushroom, so it is authored in cap-local
// coordinates with capUnderPt()/rimRad() and inherits cap bend + sway free.
import * as THREE from 'three';
import {
  makeRng, gaussOf, heat, capUnderPt, capTopPt, rimRad,
  makeGlowTexture, makeStreakTexture, EXITS, LEAN_DIR,
} from './anatomy.js';

const TAU = Math.PI * 2;
const N_GILL_CHANNELS = 230;                 // the hero's gill count
const CHANNEL = TAU / N_GILL_CHANNELS;
const FOG_NEAR = 7.0, FOG_FAR = 20.0;
const BREEZE = new THREE.Vector3(1.0, 0.62, 0.17).normalize();

const tmpC = new THREE.Color();

// ---------- shared faint-line material (sources / wisps / cap flow) ----------
function makeStrandMat(opacity, flow) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: opacity },
      uFade: { value: 0 },
      uTime: { value: 0 },
      uFlow: { value: flow },
      fogNear: { value: FOG_NEAR },
      fogFar: { value: FOG_FAR },
    },
    vertexShader: `
      attribute float aProg;
      varying vec3 vColor;
      varying float vFogDepth;
      varying float vBright;
      varying float vNear;
      uniform float uTime;
      uniform float uFlow;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mv.z;
        // near-camera fade: the lens passes through clean air (G2a v2)
        vNear = smoothstep(0.9, 1.9, length(mv.xyz));
        // travelling bioluminescent wave, moving along the strand toward
        // aProg = 1 (the rim / the release point)
        float wave = 0.62 + 0.38 * sin(6.2832 * (aProg * 1.9 - uTime * 0.11));
        vBright = mix(1.0, wave, uFlow);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uFade;
      uniform float fogNear;
      uniform float fogFar;
      varying vec3 vColor;
      varying float vFogDepth;
      varying float vBright;
      varying float vNear;
      void main() {
        float fogF = clamp((fogFar - vFogDepth) / (fogFar - fogNear), 0.0, 1.0);
        gl_FragColor = vec4(vColor * vBright * uOpacity * uFade * fogF * vNear, 1.0);
      }
    `,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

function strandGeo(positions, colors, progs) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aProg', new THREE.Float32BufferAttribute(progs, 1));
  return geo;
}

export function createPlumes(sceneApi) {
  const rand = makeRng(7741);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();
  group.visible = false;
  sceneApi.groups.mushroom.add(group);

  const glowTex = makeGlowTexture();
  const streakTex = makeStreakTexture();
  const counts = { sourceSegs: 0, wispSegs: 0, flowSegs: 0, gillSegs: 0, beads: 0, spores: 0 };

  // per-exit fade drivers (sequential reveal)
  const exits = EXITS.map((spec) => ({ spec, fade: 0, target: 0, mats: [] }));
  // v2: a 4th reveal channel — the backlit gill band on the LIFTED rim
  // (cap a ~ LEAN_DIR - pi ~ 26 deg), which faces the camera through the
  // az 60..120 middle of the swing. Not an exit: no plume, no chip — just
  // the under-rim filaments igniting so the middle of the arc has structure.
  const gillBand = { fade: 0, target: 0, mats: [] };

  /* ================================================================
     1. UNDER-RIM SOURCE GEOMETRY — brightened gill filaments + embers
        in each exit sector (hidden until orbit; front view untouched)
     ================================================================ */
  for (const ex of exits) {
    const { az } = ex.spec;
    const lp = [], lc = [], lg = [];
    const bp = [], bc = [], bs = [];
    const N_FIL = 56;
    for (let f = 0; f < N_FIL; f++) {
      // snap to a real gill channel so the light sits BETWEEN lamellae
      const lane = Math.round((gauss() * 0.30) / CHANNEL) * CHANNEL
                 + (rand() - 0.5) * CHANNEL * 0.35;
      const a = az + lane;
      const u0 = 0.52 + rand() * 0.22;
      const wig = gauss() * 0.012;
      const SEG = 5;
      let prev = null, prevU = 0;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        const u = u0 + t * (1.0 - u0);
        const p = capUnderPt(u, a + wig * Math.sin(t * Math.PI));
        p.y -= 0.008 + 0.012 * rand();       // just beneath the gill surface
        if (prev) {
          lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          const b0 = 0.30 + 0.55 * prevU, b1 = 0.30 + 0.55 * t;
          heat(b0, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          heat(b1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          lg.push(prevU, t);
          counts.sourceSegs++;
        }
        prev = p; prevU = t;
      }
      // ember bead at the release lip
      if (rand() < 0.55) {
        const p = capUnderPt(0.985 + rand() * 0.03, a);
        p.y -= 0.01;
        bp.push(p.x, p.y, p.z);
        heat(0.68 + rand() * 0.22, tmpC);
        bc.push(tmpC.r, tmpC.g, tmpC.b);
        bs.push(0.02 + Math.pow(rand(), 2) * 0.045);
        counts.beads++;
      }
    }
    const mat = makeStrandMat(0.5, 1.0); // sources carry the travelling flow
    ex.mats.push(mat);
    group.add(new THREE.LineSegments(strandGeo(lp, lc, lg), mat));

    // beads: small additive points with the same fade
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bGeo.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    bGeo.setAttribute('psize', new THREE.Float32BufferAttribute(bs, 1));
    const bMat = makeBeadMat();
    ex.mats.push(bMat);
    group.add(new THREE.Points(bGeo, bMat));
  }

  function makeBeadMat() {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: glowTex }, uFade: { value: 0 }, uTime: { value: 0 },
        fogNear: { value: FOG_NEAR }, fogFar: { value: FOG_FAR },
      },
      vertexShader: `
        #define MIN_PT 1.7
        attribute float psize;
        varying vec3 vColor;
        varying float vFogDepth;
        varying float vShrink;
        varying float vNear;
        uniform float uTime;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFogDepth = -mv.z;
          vNear = smoothstep(0.9, 1.9, length(mv.xyz));
          float tw = 0.85 + 0.15 * sin(uTime * 1.7 + position.x * 31.0);
          float sz = psize * tw * (300.0 / -mv.z);
          vShrink = 1.0;
          if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
          gl_PointSize = sz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float uFade;
        uniform float fogNear;
        uniform float fogFar;
        varying vec3 vColor;
        varying float vFogDepth;
        varying float vShrink;
        varying float vNear;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          float fogF = clamp((fogFar - vFogDepth) / (fogFar - fogNear), 0.0, 1.0);
          gl_FragColor = vec4(vColor * t.a * uFade * fogF * vShrink * vNear, 1.0);
        }
      `,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
  }

  /* ================================================================
     1b. BACKLIT GILL BAND on the lifted rim (v2, sparse-middle fix) —
         brightened between-gill filaments spanning the gill-exposed
         sector the map calls "the entry side". Faint, wide, no plume.
     ================================================================ */
  {
    const az0 = LEAN_DIR - Math.PI;           // the lifted-rim centre, ~26 deg
    const lp = [], lc = [], lg = [];
    const bp = [], bc = [], bs = [];
    const N_FIL = 46;
    for (let f = 0; f < N_FIL; f++) {
      const lane = Math.round((gauss() * 0.60) / CHANNEL) * CHANNEL
                 + (rand() - 0.5) * CHANNEL * 0.35;
      const a = az0 + lane;
      const u0 = 0.50 + rand() * 0.26;
      const wig = gauss() * 0.012;
      const SEG = 5;
      let prev = null, prevU = 0;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        const u = u0 + t * (1.0 - u0);
        const p = capUnderPt(u, a + wig * Math.sin(t * Math.PI));
        p.y -= 0.008 + 0.012 * rand();
        if (prev) {
          lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          const b0 = 0.26 + 0.46 * prevU, b1 = 0.26 + 0.46 * t;
          heat(b0, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          heat(b1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          lg.push(prevU, t);
          counts.gillSegs++;
        }
        prev = p; prevU = t;
      }
      if (rand() < 0.30) {
        const p = capUnderPt(0.985 + rand() * 0.03, a);
        p.y -= 0.01;
        bp.push(p.x, p.y, p.z);
        heat(0.60 + rand() * 0.20, tmpC);
        bc.push(tmpC.r, tmpC.g, tmpC.b);
        bs.push(0.016 + Math.pow(rand(), 2) * 0.034);
        counts.beads++;
      }
    }
    const mat = makeStrandMat(0.34, 1.0);
    gillBand.mats.push(mat);
    group.add(new THREE.LineSegments(strandGeo(lp, lc, lg), mat));
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bGeo.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    bGeo.setAttribute('psize', new THREE.Float32BufferAttribute(bs, 1));
    const bMat = makeBeadMat();
    gillBand.mats.push(bMat);
    group.add(new THREE.Points(bGeo, bMat));
  }

  /* ================================================================
     2. AUTHORED AIRFLOW — faint wisp guides tracing the actual path:
        between-gills -> rim -> curl -> rise. The air made visible.
     ================================================================ */
  for (const ex of exits) {
    const { az, riseMin, riseMax, lean } = ex.spec;
    const lp = [], lc = [], lg = [];
    const N_WISP = 4;
    for (let w = 0; w < N_WISP; w++) {
      const a0 = az + gauss() * 0.16;
      const u0 = 0.55 + rand() * 0.18;
      const o = capUnderPt(u0, a0);
      const rim = capUnderPt(1.0, a0);
      const rimR = rimRad(a0);
      const curl = (0.55 + rand() * 0.5) * (rand() < 0.5 ? 1 : -1) * 0.5;
      const rise = riseMin + rand() * (riseMax - riseMin);
      const sp = rand() * TAU;
      const pts = [];
      const SEG = 30;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        let p;
        if (t < 0.22) {                       // between the gills, drifting out
          const k = t / 0.22;
          p = capUnderPt(u0 + (1 - u0) * k * 0.45, a0 + 0.02 * Math.sin(k * 3));
          p.y -= 0.02 + 0.05 * k;
        } else if (t < 0.42) {                // lateral travel to the margin
          const k = (t - 0.22) / 0.2;
          const u = u0 + (1 - u0) * (0.45 + 0.55 * k);
          p = capUnderPt(u, a0);
          p.y -= 0.07 * (1 - k) + 0.02;
        } else if (t < 0.58) {                // curl around the rim
          const k = (t - 0.42) / 0.16;
          const aa = a0 + curl * k;
          const rr = rimR + 0.06 + 0.10 * Math.sin(k * Math.PI);
          p = new THREE.Vector3(Math.cos(aa) * rr, rim.y + 0.10 * k + 0.06 * Math.sin(k * 6 + sp), Math.sin(aa) * rr);
        } else {                              // braided rise, leaning +x
          const k = (t - 0.58) / 0.42;
          const aa = a0 + curl + 0.30 * Math.sin(k * 4.2 + sp);
          const rr = rimR + 0.06 + 0.22 * Math.sin(k * 3.1 + sp * 1.7);
          const y = rim.y + 0.10 + k * k * rise;
          p = new THREE.Vector3(Math.cos(aa) * rr, y, Math.sin(aa) * rr);
          p.x += BREEZE.x * lean * k * k * rise * 0.8;
          p.z += BREEZE.z * lean * k * k * rise * 0.8;
        }
        pts.push({ p, t });
      }
      for (let s = 0; s < SEG; s++) {
        const A = pts[s], B = pts[s + 1];
        lp.push(A.p.x, A.p.y, A.p.z, B.p.x, B.p.y, B.p.z);
        const fadeTop = (tt) => 1 - Math.pow(Math.max(0, (tt - 0.50) / 0.50), 1.15) * 0.95;
        heat(0.52 * fadeTop(A.t) + 0.1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
        heat(0.52 * fadeTop(B.t) + 0.1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
        lg.push(A.t, B.t);
        counts.wispSegs++;
      }
    }
    const mat = makeStrandMat(0.15, 1.0);
    ex.mats.push(mat);
    group.add(new THREE.LineSegments(strandGeo(lp, lc, lg), mat));
  }

  /* ================================================================
     3. CAP-SURFACE FLOW — a faint travelling glow on the rear dome,
        flowing toward each exit sector (handoff: "the cap surface
        carries a faint travelling bioluminescent flow")
     ================================================================ */
  for (const ex of exits) {
    const { az } = ex.spec;
    const lp = [], lc = [], lg = [];
    const N_STRIP = 7;
    for (let f = 0; f < N_STRIP; f++) {
      const a = az + gauss() * 0.22;
      const wig = gauss() * 0.03;
      const SEG = 9;
      let prev = null, prevT = 0;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        const u = 0.38 + t * 0.64;
        const p = capTopPt(u, a + wig * Math.sin(t * 2.2));
        p.y += 0.015;
        if (prev) {
          lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          const b0 = 0.24 + 0.3 * prevT, b1 = 0.24 + 0.3 * t;
          heat(b0, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          heat(b1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          lg.push(prevT, t);
          counts.flowSegs++;
        }
        prev = p; prevT = t;
      }
    }
    const mat = makeStrandMat(0.12, 1.0);
    ex.mats.push(mat);
    group.add(new THREE.LineSegments(strandGeo(lp, lc, lg), mat));
  }

  /* ================================================================
     4. SPORES — staged GPU phase shader on real anatomy.
        Round-robin across the three plumes (a Tier-2 drawRange prefix
        stays plume-balanced, per the donor's lesson).
     ================================================================ */
  const SPORE_FULL = 5100;
  const SPORE_TIER2 = 2550;
  counts.spores = SPORE_FULL;
  const sporeGeo = (() => {
    const n = SPORE_FULL;
    const position = new Float32Array(n * 3);   // origin point (between gills)
    const aRim = new Float32Array(n * 3);       // (rimR, rimY, rimAz)
    const aRise = new Float32Array(n * 4);      // (riseTop, lean, curl, strandPhase)
    const aCycle = new Float32Array(n * 4);     // (period, phase0, size, tone)
    const aMisc = new Float32Array(n * 2);      // (plume, seed)
    for (let i = 0; i < n; i++) {
      const p = i % 3;
      const spec = EXITS[p];
      // origin: snapped between real gill channels, inner-to-mid skirt
      const lane = Math.round((gauss() * 0.34) / CHANNEL) * CHANNEL
                 + (rand() - 0.5) * CHANNEL * 0.4;
      const a = spec.az + lane;
      const u0 = 0.48 + Math.pow(rand(), 0.8) * 0.34;
      const o = capUnderPt(u0, a);
      o.y -= 0.015 + rand() * 0.05;
      position[i * 3] = o.x; position[i * 3 + 1] = o.y; position[i * 3 + 2] = o.z;

      const rim = capUnderPt(1.0, a);
      const rr = rimRad(a) + 0.03 + rand() * 0.10;
      aRim[i * 3] = rr;
      aRim[i * 3 + 1] = rim.y - 0.02 + rand() * 0.06;
      aRim[i * 3 + 2] = a;

      const isDrop = rand() < 0.15;
      const rise = spec.riseMin + rand() * (spec.riseMax - spec.riseMin);
      aRise[i * 4] = isDrop ? -(0.5 + rand() * 1.1)      // sink below the rim
                            : rise;                       // rise above it
      aRise[i * 4 + 1] = spec.lean * (0.8 + rand() * 0.45);
      // each plume is a braid of THREE winding cores, not a uniform tube:
      // particles bunch onto one of three strands (quantized phase + curl),
      // which is what makes the braid resolve at viewing distance
      const strand = i % 9 < 3 ? 0 : (i % 9 < 6 ? 1 : 2);
      aRise[i * 4 + 2] = (strand - 1) * 0.30 + gauss() * 0.09;  // rim curl per core
      aRise[i * 4 + 3] = strand * 2.094 + gauss() * 0.3;        // braid phase per core

      aCycle[i * 4] = 7.0 + rand() * 8.5;                 // period: many velocities
      aCycle[i * 4 + 1] = rand();
      // size cohorts: dust / mid / a few bright knots
      const szR = rand();
      aCycle[i * 4 + 2] = szR < 0.75 ? 0.026 + rand() * 0.032
                        : szR < 0.96 ? 0.060 + rand() * 0.035
                        : 0.090 + rand() * 0.050;
      aCycle[i * 4 + 3] = Math.min(1, spec.tone + gauss() * 0.10 + (szR > 0.96 ? 0.2 : 0));

      aMisc[i * 2] = p;
      aMisc[i * 2 + 1] = rand() * 1000;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('aRim', new THREE.BufferAttribute(aRim, 3));
    geo.setAttribute('aRise', new THREE.BufferAttribute(aRise, 4));
    geo.setAttribute('aCycle', new THREE.BufferAttribute(aCycle, 4));
    geo.setAttribute('aMisc', new THREE.BufferAttribute(aMisc, 2));
    return geo;
  })();

  const sporeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: glowTex },
      uLean: { value: 1.0 },
      uRev: { value: new THREE.Vector3(0, 0, 0) },
      uCoh: { value: new THREE.Vector3(0, 0, 0) },
      uHeatA: { value: heat(0.55, new THREE.Color()).clone() },
      uHeatB: { value: heat(0.92, new THREE.Color()).clone() },
      fogNear: { value: FOG_NEAR },
      fogFar: { value: FOG_FAR },
    },
    vertexShader: `
      #define MIN_PT 1.7
      attribute vec3 aRim;    // rimR, rimY, rimAz
      attribute vec4 aRise;   // riseTop(+)/sink(-), lean, curl, strandPhase
      attribute vec4 aCycle;  // period, phase0, size, tone
      attribute vec2 aMisc;   // plume, seed
      uniform float uTime;
      uniform float uLean;
      uniform vec3 uRev;
      uniform vec3 uCoh;
      varying float vAlpha;
      varying float vTone;
      varying float vFogDepth;
      varying float vShrink;
      float hash(float n) { return fract(sin(n) * 43758.5453); }

      void main() {
        float plume = aMisc.x;
        float seed = aMisc.y;
        float rev = plume < 0.5 ? uRev.x : (plume < 1.5 ? uRev.y : uRev.z);
        float coh = plume < 0.5 ? uCoh.x : (plume < 1.5 ? uCoh.y : uCoh.z);
        float settle = 1.0 - 0.4 * coh;

        float t = fract(uTime / aCycle.x + aCycle.y);
        float h1 = hash(seed * 12.9898);
        float h2 = hash(seed * 78.233 + 1.0);
        float rimR = aRim.x, rimY = aRim.y, az0 = aRim.z;
        float isDrop = step(aRise.x, 0.0);
        float riseTop = abs(aRise.x);
        float lean = aRise.y, curl = aRise.z, sp = aRise.w;

        float s1 = 0.16;
        float s2 = 0.40;
        float circleLen = (0.10 + h2 * 0.22) * mix(1.0, 0.62, coh);
        float s3 = min(0.86, s2 + circleLen);

        vec3 p;
        float alpha;
        // cylindrical about the stipe axis
        float r, y, az;
        float xLean = 0.0, zLean = 0.0;
        if (t < s1) {
          // born between the gills: a slow shimmer in place, drifting down a hair
          float u0 = t / s1;
          r = length(position.xz) + sin(uTime * 0.5 + seed) * 0.03 * settle;
          y = position.y - 0.05 * u0 + sin(uTime * 0.6 + seed * 1.3) * 0.015;
          az = atan(position.z, position.x) + sin(uTime * 0.35 + seed * 2.1) * 0.012;
          alpha = smoothstep(0.0, 0.45, u0) * 0.85;
        } else if (t < s2) {
          // lateral travel between the lamellae toward the margin
          float u1 = smoothstep(0.0, 1.0, (t - s1) / (s2 - s1));
          r = mix(length(position.xz), rimR, u1);
          y = mix(position.y - 0.05, rimY, u1) - 0.10 * sin(u1 * 3.14159) ;
          az = atan(position.z, position.x) + (h1 - 0.5) * 0.05 * u1;
          alpha = 0.95;
        } else if (t < s3) {
          // curl around the rim margin in local airflow
          float u2 = (t - s2) / max(s3 - s2, 1e-4);
          az = az0 + curl * u2 * mix(1.0, 0.5, coh);
          float loops = 1.0 + h2 * 1.2;
          r = rimR + 0.05 + sin(u2 * 3.14159 * loops + sp) * 0.10 * settle;
          y = rimY + sin(u2 * 3.14159 * loops * 0.7 + 1.0 + sp) * 0.08 * settle + 0.10 * u2;
          alpha = 1.0;
        } else {
          // braided rise (or sinking drop), carried by the +x breeze
          float u3 = (t - s3) / max(1.0 - s3, 1e-4);
          float eu = smoothstep(0.0, 0.10, u3);
          if (isDrop > 0.5) {
            y = rimY + 0.10 - u3 * u3 * riseTop;
            az = az0 + curl + (h1 - 0.5) * 0.3 * u3;
            r = rimR + 0.05 + u3 * (0.3 + h2 * 0.4);
            alpha = eu * (1.0 - smoothstep(0.45, 0.95, u3)) * 0.5;
          } else {
            float h = pow(u3, 0.6 + h1 * 0.5);           // many rise velocities
            y = rimY + 0.10 + h * riseTop;
            // braid: coherent winding cores, jitter growing with height
            az = az0 + curl
               + (0.13 * sin(h * 5.1 + sp) + 0.07 * sin(h * 9.7 + sp * 2.3 + uTime * 0.21)) * settle
               + 0.03 * sin(uTime * 0.13 + seed * 3.7) * u3;
            r = rimR + 0.05
              + (0.10 * sin(h * 4.3 + sp * 1.7) + 0.05 * sin(uTime * 0.17 + seed * 2.3)) * settle
              + (h1 - 0.5) * 0.09 * (0.4 + h)             // scatter around the core
              + h * 0.14;
            xLean = lean * h * h * riseTop * 0.62;
            zLean = lean * h * h * riseTop * 0.105;
            alpha = eu * (1.0 - smoothstep(0.62, 1.0, u3));
          }
        }
        p = vec3(cos(az) * r + xLean, y, sin(az) * r + zLean);

        vAlpha = clamp(alpha, 0.0, 1.0) * rev * (1.0 + 0.5 * coh);
        vTone = aCycle.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFogDepth = -mv.z;
        float sz = aCycle.z * (1.0 + 0.25 * coh) * (300.0 / -mv.z);
        vShrink = 1.0;
        if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
        gl_PointSize = sz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uHeatA;
      uniform vec3 uHeatB;
      uniform float fogNear;
      uniform float fogFar;
      varying float vAlpha;
      varying float vTone;
      varying float vFogDepth;
      varying float vShrink;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float fogF = clamp((fogFar - vFogDepth) / (fogFar - fogNear), 0.0, 1.0);
        vec3 col = mix(uHeatA, uHeatB, vTone);
        gl_FragColor = vec4(col * t.a * vAlpha * vShrink * fogF * 2.3, 1.0);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const sporePts = new THREE.Points(sporeGeo, sporeMat);
  sporePts.frustumCulled = false;
  group.add(sporePts);

  /* ================================================================
     5. ANAMORPHIC STREAK — ONE active exit only ([e] cycles)
     ================================================================ */
  const streaks = exits.map((ex) => {
    const a = ex.spec.az;
    const rim = capUnderPt(1.0, a);
    const out = 1.0 + 0.10 / rimRad(a);
    const mat = new THREE.SpriteMaterial({
      map: streakTex,
      color: heat(0.9, new THREE.Color()).clone(),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(2.1, 0.17, 1);
    s.position.set(rim.x * out, rim.y + 0.05, rim.z * out);
    s.visible = false;
    group.add(s);
    return { sprite: s, mat, localPos: s.position.clone(), o: 0 };
  });

  let active = -1; // no streak until the director arms one

  const _wv = new THREE.Vector3();
  const api = {
    group,
    counts,
    exits: EXITS,
    sporeGeo,
    setTier(t) {
      sporeGeo.setDrawRange(0, t === 2 ? SPORE_TIER2 : SPORE_FULL);
      counts.spores = t === 2 ? SPORE_TIER2 : SPORE_FULL;
    },
    /** Sequential reveal, 0..1 per exit, in EXITS order. */
    setReveal(a, b, c) {
      exits[0].target = a; exits[1].target = b; exits[2].target = c;
    },
    /** Jump the eased fades straight to their targets (review helper —
     *  the hidden-tab harness only runs frames during capture). */
    snap() { for (const ex of exits) ex.fade = ex.target; },
    /** The one active exit for streak + coherence + halation focus. -1 = none. */
    setActive(i) { active = i; },
    get active() { return active; },
    /** World position of the active release point (for the lens focus hint). */
    activeWorld() {
      if (active < 0) return null;
      return _wv.copy(streaks[active].localPos)
        .applyMatrix4(sceneApi.groups.mushroom.matrixWorld).clone();
    },
  };

  const cohTarget = [0, 0, 0];
  sceneApi.addAnimator('spike-plumes', (t, dt) => {
    const k = Math.min(1, dt * 3.2);
    let anyVisible = false;
    for (let i = 0; i < 3; i++) {
      const ex = exits[i];
      ex.fade += (ex.target - ex.fade) * k;
      if (ex.fade < 0.012 && ex.target === 0) ex.fade = 0; // no exponential ghost tail
      if (ex.fade > 0) anyVisible = true;
      for (const m of ex.mats) {
        m.uniforms.uFade.value = ex.fade;
        m.uniforms.uTime.value = t;
      }
      cohTarget[i] = (i === active) ? 1 : 0;
    }
    group.visible = anyVisible;
    if (!anyVisible) return;
    sporeMat.uniforms.uTime.value = t;
    sporeMat.uniforms.uRev.value.set(exits[0].fade, exits[1].fade, exits[2].fade);
    const c = sporeMat.uniforms.uCoh.value;
    c.x += (cohTarget[0] - c.x) * k;
    c.y += (cohTarget[1] - c.y) * k;
    c.z += (cohTarget[2] - c.z) * k;
    for (let i = 0; i < 3; i++) {
      const st = streaks[i];
      const want = (i === active ? 0.42 : 0) * exits[i].fade;
      st.o += (want - st.o) * Math.min(1, dt * 2.4);
      if (st.o < 0.02 && want === 0) st.o = 0;   // die cleanly, no lingering blade
      // a lens catching an exceptional source: slow breathing, slight shimmer
      st.mat.opacity = st.o * (0.82 + 0.13 * Math.sin(t * 1.9 + i * 2.1)
                                    + 0.05 * Math.sin(t * 7.3 + i));
      st.sprite.visible = st.o > 0.01;
      const w = 2.1 * (1 + 0.06 * Math.sin(t * 2.7 + i));
      st.sprite.scale.set(w, 0.17, 1);
    }
  });

  return api;
}
