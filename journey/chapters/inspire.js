// Chapter 4 — INSPIRE: breaking through the crown into open air.
// Exterior cap dome + rim + under-rim gill fringe, and three initiative spore
// plumes (Arca Gidan Prize, ArtCompute, 2RP) that must visibly ORIGINATE
// beneath the cap between the gills, migrate laterally to the rim, curl in
// local airflow around the margin, then rise as turbulent plumes — never a
// fountain erupting from the cap top. See CONTRACT.md → cluster envelope
// "inspire" and handoff.md Chapter 4.
//
// Local envelope: cap dome radius ~10, apex y~8, rim ring y~4.5 r~10. Camera
// sits low OUTSIDE the rim (y 3–12, r 13–17ish) looking across the crown, then
// tips over the rim at cp→1. Plume sectors at azimuth 5.6 (arca), 0.6
// (artcompute), 2.6 (tworp).
import * as THREE from 'three';

const TAU = Math.PI * 2;

/* ------------------------------------------------------------------ */
/* cap profile — shared between the dome mesh and the surface flow lines */
/* ------------------------------------------------------------------ */
// (radius, height) key points from apex down to the rim edge.
const CAP_PROFILE = [
  { r: 0.0, y: 8.00 },
  { r: 2.0, y: 7.70 },
  { r: 4.0, y: 7.10 },
  { r: 5.8, y: 6.35 },
  { r: 7.3, y: 5.55 },
  { r: 8.6, y: 4.90 },
  { r: 9.6, y: 4.55 },
  { r: 10.0, y: 4.48 },
];
function capProfileAt(u) {
  u = Math.min(Math.max(u, 0), 1);
  const n = CAP_PROFILE.length - 1;
  const f = u * n;
  const i = Math.min(Math.floor(f), n - 1);
  const t = f - i;
  const a = CAP_PROFILE[i], b = CAP_PROFILE[i + 1];
  return { r: a.r + (b.r - a.r) * t, y: a.y + (b.y - a.y) * t };
}

const PLUMES = [
  { id: 'arca', az: 5.6, colorA: 0xd9a441 /* gold */, colorB: 0xf0c877 /* goldBright */ },
  { id: 'artcompute', az: 0.6, colorA: 0x8a6420 /* deepGold */, colorB: 0xffb36b /* ember */ },
  { id: 'tworp', az: 2.6, colorA: 0xd9a441 /* gold */, colorB: 0xffb36b /* ember */ },
];

export function createChapter(ctx) {
  const T = THREE;
  const H = ctx.helpers;
  const P = ctx.palette;
  const reduced = !!ctx.reducedMotion;
  const V3 = T.Vector3;

  const group = new T.Group();
  group.name = 'inspire';

  // Whole crown tilts slightly off-axis — organic asymmetry, not a perfect
  // rotationally symmetric mushroom cap.
  const tilted = new T.Group();
  tilted.rotation.z = 0.046;
  tilted.rotation.x = -0.021;
  group.add(tilted);

  const disposables = [];   // { dispose() }
  const pulseMats = [];     // everything with a uTime uniform

  /* ================================================================ */
  /* CAP DOME — exterior crown, fresnel-lit amber shell + faint flow    */
  /* ================================================================ */
  const domeGeo = (() => {
    const pts = CAP_PROFILE.map(p => new T.Vector2(p.r, p.y));
    // slight undercut past the rim so the margin reads as having thickness
    // before the (separately modelled) gills begin.
    pts.push(new T.Vector2(9.5, 4.10));
    pts.push(new T.Vector2(8.9, 3.85));
    const geo = new T.LatheGeometry(pts, 56);

    // organic asymmetry: perturb radius by fbm noise, fading to zero at the
    // apex so the tip stays a clean pinch point rather than a jagged burr.
    const pos = geo.attributes.position;
    const v = new V3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const ang = Math.atan2(v.z, v.x);
      const r = Math.hypot(v.x, v.z);
      const ampScale = Math.min(r / 10, 1);
      const dr = H.fbm3(Math.cos(ang) * 0.62 + 4.1, v.y * 0.16, Math.sin(ang) * 0.62 + 4.1, 3) * 0.42 * ampScale;
      const dy = H.fbm3(Math.sin(ang) * 0.5 + 9.3, v.y * 0.11, Math.cos(ang) * 0.5, 3) * 0.10 * ampScale;
      const nr = Math.max(0, r + dr);
      pos.setXYZ(i, Math.cos(ang) * nr, v.y + dy, Math.sin(ang) * nr);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  })();

  const domeMat = new T.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBase: { value: new T.Color(P.soil) },
      uRim: { value: new T.Color(P.deepGold) },
      uFlow: { value: new T.Color(P.goldBright) },
      uFlowAmt: { value: 0.10 },
    },
    side: T.FrontSide,
    vertexShader: /* glsl */`
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      void main() {
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uFlowAmt;
      uniform vec3 uBase, uRim, uFlow;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - max(dot(normalize(vNormalW), viewDir), 0.0), 2.3);
        float az = atan(vWorldPos.z, vWorldPos.x);
        float r = length(vWorldPos.xz);
        // sparse travelling bioluminescent bands, not a full wash
        float band = sin(az * 3.0 - uTime * 0.22 + r * 0.55);
        band = smoothstep(0.62, 0.97, band * 0.5 + 0.5);
        vec3 col = mix(uBase, uRim, clamp(fres * 0.9, 0.0, 1.0));
        col += uFlow * band * uFlowAmt;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  pulseMats.push({ uniforms: domeMat.uniforms }); // uTime driver (shared loop below)
  const domeMesh = new T.Mesh(domeGeo, domeMat);
  domeMesh.frustumCulled = false;
  tilted.add(domeMesh);
  disposables.push(domeGeo, domeMat);

  /* ================================================================ */
  /* GILLS — simplified instanced blades peeking under the rim         */
  /* ================================================================ */
  const GILL_FULL = 56, GILL_TIER2 = 28;
  const gillGroup = new T.Group();
  const gillMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    side: T.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uBase: { value: 0.26 },
      uColor: { value: new T.Color(P.deepGold) },
      uGlowColor: { value: new T.Color(P.goldBright) },
      uGlow0: { value: 0 }, uGlow1: { value: 0 }, uGlow2: { value: 0 },
    },
    vertexShader: /* glsl */`
      attribute float aSeed;
      attribute vec3 aAff;
      varying float vSeed;
      varying float vAff;
      uniform float uGlow0, uGlow1, uGlow2;
      void main() {
        vSeed = aSeed;
        vAff = aAff.x * uGlow0 + aAff.y * uGlow1 + aAff.z * uGlow2;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uBase;
      uniform vec3 uColor, uGlowColor;
      varying float vSeed, vAff;
      void main() {
        float tw = 0.5 + 0.5 * sin(uTime * (0.35 + vSeed * 0.9) + vSeed * 21.0);
        float amb = uBase * (0.7 + 0.3 * tw);
        vec3 col = mix(uColor, uGlowColor, clamp(vAff, 0.0, 1.0)) ;
        float a = amb * (1.0 + 1.4 * vAff);
        gl_FragColor = vec4(col, a);
      }`,
  });
  pulseMats.push({ uniforms: gillMat.uniforms });

  const gillBladeGeo = (() => {
    // tapered triangular fin: local X = radial (negative = inward toward
    // centre), local Y = vertical (negative = hanging down from the rim).
    const positions = new Float32Array([
      0, 0, 0,     // attach, top-outer (at rim)
      0, -1, 0,    // attach, bottom-outer
      -1, -0.42, 0, // inner tip, tapering toward centre
    ]);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setIndex([0, 1, 2]);
    return geo;
  })();
  const gillMesh = new T.InstancedMesh(gillBladeGeo, gillMat, GILL_FULL);
  gillMesh.frustumCulled = false;
  {
    const rand = H.rng(6402);
    const seeds = new Float32Array(GILL_FULL);
    const affs = new Float32Array(GILL_FULL * 3);
    const m = new T.Matrix4();
    const q = new T.Quaternion();
    const s = new V3();
    const SIGMA = 0.62; // rad, gill-sector brightening falloff
    for (let i = 0; i < GILL_FULL; i++) {
      const az = (i / GILL_FULL) * TAU + (rand() - 0.5) * (TAU / GILL_FULL) * 0.7;
      const rimR = 9.55 + rand() * 0.35;
      const rimY = 4.42 + rand() * 0.12;
      const len = 1.1 + rand() * 1.9;
      const hang = 0.7 + rand() * 1.1;
      const tiltJ = (rand() - 0.5) * 0.18;
      const pos = new V3(Math.cos(az) * rimR, rimY, Math.sin(az) * rimR);
      q.setFromEuler(new T.Euler(tiltJ * 0.3, az, tiltJ, 'XYZ'));
      s.set(len, hang, 1);
      m.compose(pos, q, s);
      gillMesh.setMatrixAt(i, m);
      seeds[i] = rand() * 1000;
      for (let p = 0; p < 3; p++) {
        let d = Math.abs(az - PLUMES[p].az);
        d = Math.min(d, TAU - d);
        affs[i * 3 + p] = Math.exp(-(d * d) / (SIGMA * SIGMA));
      }
    }
    gillMesh.instanceMatrix.needsUpdate = true;
    gillBladeGeo.setAttribute('aSeed', new T.InstancedBufferAttribute(seeds, 1));
    gillBladeGeo.setAttribute('aAff', new T.InstancedBufferAttribute(affs, 3));
  }
  gillGroup.add(gillMesh);
  tilted.add(gillGroup);
  disposables.push(gillBladeGeo, gillMat);

  /* ================================================================ */
  /* CAP-SURFACE FLOW LINES — faint travelling bioluminescent flow      */
  /* ================================================================ */
  const FLOW_FULL = 22;
  const flowRes = H.strandLines({
    count: FLOW_FULL, seed: 5511,
    generator: (i, rand) => {
      const az = (i / FLOW_FULL) * TAU + (rand() - 0.5) * 0.4;
      const jitter = (rand() - 0.5) * 0.05;
      const pts = [];
      for (let k = 0; k <= 5; k++) {
        const u = k / 5;
        const { r, y } = capProfileAt(u);
        const rr = r * 1.012 + 0.05;
        pts.push(new V3(Math.cos(az + jitter * u) * rr, y + 0.04, Math.sin(az + jitter * u) * rr));
      }
      return pts;
    },
  });
  const flowMat = H.makePulseMat(P.deepGold, {
    baseOpacity: 0.11, twinkle: 0.6, pulseWidth: 0.30,
    pulseColor: P.goldBright, fogDensity: 0.012,
  });
  const flowLines = new T.LineSegments(flowRes.geometry, flowMat);
  flowLines.frustumCulled = false;
  tilted.add(flowLines);
  pulseMats.push(flowMat);
  const flowDriver = H.pulseDriver(4.2);
  let flowPulseT;
  {
    const r = H.rng(77);
    flowPulseT = 6 + r() * 8;
  }

  /* ================================================================ */
  /* SPORE PLUMES — shared Points system, per-particle authored path    */
  /* under-cap origin → lateral migration → rim curl → turbulent rise   */
  /* ================================================================ */
  const SPORE_FULL = 8940;   // tier 1: 2980 / plume
  const SPORE_TIER2 = 3150;  // tier 2: 1050 / plume
  const sporeTex = H.softDisc(48);
  const GILL_CHANNEL = TAU / GILL_FULL; // gill-lamella spacing, for origin quantizing

  function buildSporeAttrs(count) {
    const rand = H.rng(41207);
    const perPlume = Math.floor(count / PLUMES.length);
    const position = new Float32Array(count * 3);
    const aSeed = new Float32Array(count);
    const aPlume = new Float32Array(count);
    const aAz = new Float32Array(count);
    const aOriginR = new Float32Array(count);
    const aOriginY = new Float32Array(count);
    const aRimR = new Float32Array(count);
    const aRimY = new Float32Array(count);
    const aRiseTop = new Float32Array(count);
    const aPeriod = new Float32Array(count);
    const aPhase0 = new Float32Array(count);
    const aSize = new Float32Array(count);
    const aColorMix = new Float32Array(count);

    let idx = 0;
    for (let p = 0; p < PLUMES.length; p++) {
      const n = (p === PLUMES.length - 1) ? (count - idx) : perPlume;
      for (let j = 0; j < n; j++, idx++) {
        // gill blades occupy r≈6.5–9.6 — origins must sit between them, not
        // at the stipe-side inner radius.
        const originR = 6.3 + rand() * 2.9;
        const originY = 2.6 + rand() * 1.4;
        // spread across the sector but snap to a gill channel (a multiple of
        // TAU/56) so spores visibly emerge from between lamellae rather than
        // floating mid-blade; jitter kept well under half a channel width.
        const laneRaw = (rand() - 0.5) * 1.35;
        const laneChannel = Math.round(laneRaw / GILL_CHANNEL) * GILL_CHANNEL;
        const laneJitter = (rand() - 0.5) * GILL_CHANNEL * 0.4;
        const lane = laneChannel + laneJitter;
        const isDrop = rand() < 0.16;
        const rimR = 9.5 + rand() * 1.7;
        const rimY = 4.35 + rand() * 1.15;
        // drop cohort must end BELOW the rim so they genuinely sink and fade,
        // rather than above it (which just reads as a slow riser).
        const riseTop = isDrop ? (rimY - (1.5 + rand() * 2.0)) : (12.5 + rand() * 16.5);

        position[idx * 3 + 0] = Math.cos(PLUMES[p].az) * originR;
        position[idx * 3 + 1] = originY;
        position[idx * 3 + 2] = Math.sin(PLUMES[p].az) * originR;
        aSeed[idx] = rand() * 1000;
        aPlume[idx] = p;
        aAz[idx] = PLUMES[p].az + lane;
        aOriginR[idx] = originR;
        aOriginY[idx] = originY;
        aRimR[idx] = rimR;
        aRimY[idx] = rimY;
        aRiseTop[idx] = riseTop;
        aPeriod[idx] = 7.0 + rand() * 7.5;
        aPhase0[idx] = rand();
        aSize[idx] = 0.55 + rand() * 1.2;
        aColorMix[idx] = rand();
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(position, 3));
    geo.setAttribute('aSeed', new T.Float32BufferAttribute(aSeed, 1));
    geo.setAttribute('aPlume', new T.Float32BufferAttribute(aPlume, 1));
    geo.setAttribute('aAz', new T.Float32BufferAttribute(aAz, 1));
    geo.setAttribute('aOriginR', new T.Float32BufferAttribute(aOriginR, 1));
    geo.setAttribute('aOriginY', new T.Float32BufferAttribute(aOriginY, 1));
    geo.setAttribute('aRimR', new T.Float32BufferAttribute(aRimR, 1));
    geo.setAttribute('aRimY', new T.Float32BufferAttribute(aRimY, 1));
    geo.setAttribute('aRiseTop', new T.Float32BufferAttribute(aRiseTop, 1));
    geo.setAttribute('aPeriod', new T.Float32BufferAttribute(aPeriod, 1));
    geo.setAttribute('aPhase0', new T.Float32BufferAttribute(aPhase0, 1));
    geo.setAttribute('aSize', new T.Float32BufferAttribute(aSize, 1));
    geo.setAttribute('aColorMix', new T.Float32BufferAttribute(aColorMix, 1));
    return geo;
  }

  const sporeGeo = buildSporeAttrs(SPORE_FULL);
  const sporeMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: sporeTex },
      uSize: { value: 30 },
      uColorA0: { value: new T.Color(PLUMES[0].colorA) }, uColorB0: { value: new T.Color(PLUMES[0].colorB) },
      uColorA1: { value: new T.Color(PLUMES[1].colorA) }, uColorB1: { value: new T.Color(PLUMES[1].colorB) },
      uColorA2: { value: new T.Color(PLUMES[2].colorA) }, uColorB2: { value: new T.Color(PLUMES[2].colorB) },
      uGlow0: { value: 0 }, uGlow1: { value: 0 }, uGlow2: { value: 0 },
      uCoh0: { value: 0 }, uCoh1: { value: 0 }, uCoh2: { value: 0 },
      uMotion: { value: reduced ? 0.18 : 1.0 },
    },
    vertexShader: /* glsl */`
      attribute float aSeed, aPlume, aAz, aOriginR, aOriginY, aRimR, aRimY, aRiseTop, aPeriod, aPhase0, aSize, aColorMix;
      uniform float uTime, uSize, uMotion;
      uniform float uGlow0, uGlow1, uGlow2, uCoh0, uCoh1, uCoh2;
      varying float vAlpha;
      varying float vColorMix;
      varying float vPlume;
      float hash(float n){ return fract(sin(n) * 43758.5453); }

      void main() {
        vColorMix = aColorMix;
        vPlume = aPlume;

        float glow = uGlow0, coh = uCoh0;
        if (aPlume > 0.5) { glow = uGlow1; coh = uCoh1; }
        if (aPlume > 1.5) { glow = uGlow2; coh = uCoh2; }
        float settle = 1.0 - 0.5 * coh; // hovered plume: tighter, more directed

        float t = fract(uTime * uMotion / aPeriod + aPhase0);
        float h1 = hash(aSeed * 12.9898);
        float h2 = hash(aSeed * 78.233 + 1.0);
        float h3 = hash(aSeed * 37.719 + 2.0);
        float isDrop = step(aRiseTop, 8.0);

        float s1 = 0.14;
        float s2 = s1 + 0.24;
        float circleLen = (0.16 + h2 * 0.30) * mix(1.0, 0.6, coh);
        float s3 = min(0.90, s2 + circleLen);

        float r, y, az, alpha;
        if (t < s1) {
          // stage 0: appears between the gills, under the cap
          float u0 = t / s1;
          r = aOriginR + sin(uTime * 0.6 + aSeed) * 0.14 * settle;
          y = aOriginY + sin(uTime * 0.5 + aSeed * 1.3) * 0.07 * settle;
          az = aAz + sin(uTime * 0.4 + aSeed * 2.1) * 0.05 * settle;
          alpha = smoothstep(0.0, 0.3, u0);
        } else if (t < s2) {
          // stage 1: migrates laterally toward the rim
          float u1 = smoothstep(0.0, 1.0, (t - s1) / (s2 - s1));
          r = mix(aOriginR, aRimR, u1);
          y = mix(aOriginY, aRimY, u1);
          az = aAz + (h3 - 0.5) * 0.10 * u1 * settle;
          alpha = 1.0;
        } else if (t < s3) {
          // stage 2: curls around the rim margin in local airflow
          float u2 = (t - s2) / max(s3 - s2, 0.0001);
          float curlAmt = mix(-0.35 + h1 * 1.5, (-0.35 + h1 * 1.5) * 0.4, coh);
          float loops = 1.0 + h2 * 1.3;
          az = aAz + curlAmt * u2;
          r = aRimR + sin(u2 * 3.14159 * loops) * 0.5 * settle + cos(uTime * 0.8 + aSeed) * 0.10 * settle;
          y = aRimY + sin(u2 * 3.14159 * loops * 0.6 + 1.0) * 0.30 * settle + 0.15 * u2;
          alpha = 1.0;
        } else {
          // stage 3: rises as a turbulent plume (one dominant upward drift)
          float u3 = (t - s3) / max(1.0 - s3, 0.0001);
          float riseExp = 0.5 + h3 * 1.1;
          float curlAmt = -0.35 + h1 * 1.5;
          float eu = smoothstep(0.0, 0.12, u3);
          y = mix(aRimY, aRiseTop, pow(u3, riseExp));
          az = aAz + curlAmt + (sin(uTime * 0.13 + aSeed * 3.7) * 0.5 + sin(uTime * 0.31 + aSeed * 1.9) * 0.22) * u3 * settle;
          r = aRimR + (sin(uTime * 0.17 + aSeed * 2.3) * 1.1 + cos(uTime * 0.09 + aSeed * 4.1) * 0.55) * u3 * settle;
          alpha = eu * (1.0 - smoothstep(0.72, 1.0, u3)) * mix(1.0, 0.35, isDrop);
        }

        vAlpha = clamp(alpha, 0.0, 1.0) * (1.0 + 0.5 * glow);

        vec3 p = vec3(cos(az) * r, y, sin(az) * r);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float sizeMul = (1.0 + 0.35 * glow) * mix(1.0, 0.7, isDrop);
        gl_PointSize = uSize * aSize * sizeMul * (1.0 / max(-mv.z, 0.001));
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uColorA0, uColorB0, uColorA1, uColorB1, uColorA2, uColorB2;
      varying float vAlpha, vColorMix, vPlume;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        vec3 a = uColorA0, b = uColorB0;
        if (vPlume > 0.5) { a = uColorA1; b = uColorB1; }
        if (vPlume > 1.5) { a = uColorA2; b = uColorB2; }
        vec3 col = mix(a, b, vColorMix);
        gl_FragColor = vec4(col, tex.a * vAlpha * 0.85);
      }`,
  });
  const sporePoints = new T.Points(sporeGeo, sporeMat);
  sporePoints.frustumCulled = false;
  sporePoints.geometry.setDrawRange(0, ctx.tier === 2 ? SPORE_TIER2 : SPORE_FULL);
  tilted.add(sporePoints);
  pulseMats.push(sporeMat);
  disposables.push(sporeGeo, sporeMat);

  /* ================================================================ */
  /* PER-PLUME: reverse trace pulse (release → rim → origin) + streak   */
  /* ================================================================ */
  const plumeStates = PLUMES.map((spec) => {
    const az = spec.az;
    const releasePoint = new V3(Math.cos(az) * 10.4, 5.15, Math.sin(az) * 10.4);
    const curlMid = new V3(Math.cos(az + 0.42) * 10.15, 4.75, Math.sin(az + 0.42) * 10.15);
    const rimPoint = new V3(Math.cos(az) * 10.0, 4.5, Math.sin(az) * 10.0);
    const migMid = new V3(Math.cos(az) * 6.0, 3.72, Math.sin(az) * 6.0);
    const originPoint = new V3(Math.cos(az) * 3.2, 3.1, Math.sin(az) * 3.2);

    const res = H.strandLines({
      count: 1, seed: 900 + Math.round(az * 100),
      generator: () => [releasePoint, curlMid, rimPoint, migMid, originPoint],
    });
    const mat = H.makePulseMat(spec.colorA, {
      baseOpacity: 0.10, twinkle: 0.5, pulseWidth: 0.22,
      pulseColor: spec.colorB, fogDensity: 0.006,
    });
    const line = new T.LineSegments(res.geometry, mat);
    line.frustumCulled = false;
    tilted.add(line);
    pulseMats.push(mat);
    disposables.push(res.geometry, mat);

    // restrained anamorphic-ish streak at the active release point
    const streakMat = new T.SpriteMaterial({
      map: H.glowSprite(spec.colorB, 64), color: new T.Color(spec.colorB),
      transparent: true, opacity: 0, depthWrite: false,
      blending: T.AdditiveBlending, fog: true,
    });
    const streak = new T.Sprite(streakMat);
    streak.scale.set(3.6, 0.5, 1);
    streak.position.copy(releasePoint);
    tilted.add(streak);
    disposables.push(streakMat);

    // hotspot raycast proxy — invisible sphere anchored at the release point
    const proxyGeo = new T.SphereGeometry(1.4, 10, 8);
    const proxyMat = new T.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending,
    });
    const proxy = new T.Mesh(proxyGeo, proxyMat);
    proxy.position.copy(releasePoint);
    tilted.add(proxy);
    disposables.push(proxyGeo, proxyMat);

    return {
      id: spec.id, az,
      line, mat, streak, streakMat, proxy,
      driver: H.pulseDriver(3.0),
      ambientRng: H.rng(6600 + Math.round(az * 1000)),
      ambientT: 4 + Math.round(az * 7) % 6,
      hover: 0, sel: 0,
    };
  });

  /* ================================================================ */
  /* STATE + FRAME LOOP                                                */
  /* ================================================================ */
  let hovered = null, selected = null;
  let quality = 1;
  const motion = reduced ? 0.18 : 1;

  function plumeByAtId(id) { return plumeStates.find(pl => pl.id === id); }

  const api = {
    id: 'inspire',
    group,
    hotspots: plumeStates.map(pl => ({
      id: pl.id, object: pl.proxy, radius: 1.4, labelOffset: { x: 0, y: 1.3, z: 0 },
    })),

    update(dt, time, cp, active) {
      for (const m of pulseMats) if (m.uniforms.uTime) m.uniforms.uTime.value = time;

      // gentle "release surge" as the camera arcs over and tips past the rim
      const surge = active ? Math.max(0, Math.min((cp - 0.85) / 0.12, 1) - Math.max(0, (cp - 0.97) / 0.03)) : 0;

      for (const pl of plumeStates) {
        const wantHover = hovered === pl.id ? 1 : 0;
        const wantSel = selected === pl.id ? 1 : 0;
        pl.hover += (wantHover - pl.hover) * Math.min(dt * 4.5, 1);
        pl.sel += (wantSel - pl.sel) * Math.min(dt * 3.0, 1);
        const active2 = Math.max(pl.hover, pl.sel * 0.85);
        const glow = active2 + surge * 0.18;

        // ambient rim-circulation pulse: fires on an irregular per-plume
        // clock (re-randomized each cycle from a seeded rng stream, never a
        // fixed period), brightens/quickens when the initiative is active
        pl.ambientT -= dt;
        if (pl.ambientT <= 0) { pl.driver.fire(); pl.ambientT = (9 + pl.ambientRng() * 7) * (1 - 0.4 * active2); }
        pl.driver.update(dt);
        const on = pl.driver.active ? 1 : 0;
        pl.mat.uniforms.uPulse.value = pl.driver.value;
        pl.mat.uniforms.uPulseOn.value = on * (0.22 + 0.85 * active2);
        pl.mat.uniforms.uBase.value = 0.10 * (1 + 2.2 * active2);

        // anamorphic streak: exclusive to the currently active (hovered/
        // selected) release point — the release surge must NOT light all
        // three streaks at once, so it deliberately excludes `surge`.
        pl.streakMat.opacity = 0.55 * active2;
        pl.streak.scale.set(3.2 + 1.2 * active2, 0.45 + 0.15 * active2, 1);

        const idx = PLUMES.findIndex(p => p.id === pl.id);
        const gu = 'uGlow' + idx, cu = 'uCoh' + idx;
        sporeMat.uniforms[gu].value = glow;
        sporeMat.uniforms[cu].value = active2;
        gillMat.uniforms[gu].value = glow;
      }

      // cap-surface bioluminescent flow: rare slow travelling wave
      flowPulseT -= dt;
      if (flowPulseT <= 0) { flowDriver.fire(); flowPulseT = 10 + (time % 6); }
      flowDriver.update(dt);
      flowMat.uniforms.uPulse.value = flowDriver.value;
      flowMat.uniforms.uPulseOn.value = flowDriver.active ? 0.4 : 0;
      domeMat.uniforms.uFlowAmt.value = 0.08 + 0.05 * (flowDriver.active ? 1 : 0);

      if (!active || reduced) return;
      // tiny handheld sway on the whole crown — environmental force, not a
      // synchronized breath (asymmetric axes, low amplitude)
      tilted.rotation.y = H.noise3(time * 0.03, 5.2, 0) * 0.01 * motion;
    },

    setHover(id) {
      if (hovered === id) return;
      hovered = id || null;
      const pl = id && plumeByAtId(id);
      if (pl) pl.driver.fire();
    },

    setSelected(id) {
      selected = id || null;
      const pl = id && plumeByAtId(id);
      if (pl) pl.driver.fire();
    },

    trigger(name) {
      if (name === 'releasePulse' || name === 'ctaPulse') {
        for (const pl of plumeStates) pl.driver.fire();
      }
    },

    setQuality(tier) {
      quality = tier;
      const half = tier === 2;
      sporeGeo.setDrawRange(0, half ? SPORE_TIER2 : SPORE_FULL);
      gillMesh.count = half ? GILL_TIER2 : GILL_FULL;
      // drawRange counts VERTICES, not strands — derive from the geometry's
      // actual vertex count (22 strands × 6 segments × 2 verts = 264), not
      // from FLOW_FULL (a strand count), and keep it even so line-segment
      // pairs stay intact.
      const fullVerts = flowRes.geometry.attributes.position.count;
      const fn = half ? Math.floor(fullVerts * 0.55 / 2) * 2 : fullVerts;
      flowRes.geometry.setDrawRange(0, fn);
    },

    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          // maps from helpers (glowSprite/softDisc) are process-wide cached
          // and shared with other chapters — never dispose .map here. This
          // chapter creates no one-off textures of its own, so material
          // disposal alone is sufficient (geometries/materials it authored
          // are also tracked in `disposables` below).
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
