// journey-v6 — FINAL epilogue: the fairy ring (W4-D production build).
//
// Eleven built fruiting bodies + the hero organism = one irregular ring about
// RING_C. Each body is a seeded agaric drawn in the hero's own line language
// (heat palette, additive strands, brightest at the gill margin) — merged
// into ONE LineSegments draw + ONE glow-Points draw regardless of count.
// Distance LOD is build-time: segment counts fall with distance from the
// Final rest camera, which is known and fixed.
//
// The bodies boot UNLIT (7% ember whisper) and kindle in sequence as the
// camera pulls back — Hannah's "undarken" — via the shared aReveal channel.
// No body is the parent: sizes, leans and cap forms vary, and the hero
// reads as one mature member on the arc.

import * as THREE from 'three';
import {
  TAU, MEMBERS, RING_C, arcOf, cutVal,
  makeRng, gaussOf, groundY, makeBatch, makeStrandMat, makePointsMat, makeUniforms,
} from './final-world.js';
import { makeGlowTexture } from '../core/anatomy.js';

// The Final rest camera, for build-time LOD only (mirrors director key).
const REST_CAM = { x: -13.9, z: 2.55 };

export function createFinalRing(sceneApi, uniforms) {
  const rand = makeRng(20260417);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();

  const lines = makeBatch();
  const glows = makeBatch();

  /* ---- one seeded agaric, appended into the shared batches ---- */
  function buildMushroom(m) {
    const dist = Math.hypot(m.x - REST_CAM.x, m.z - REST_CAM.z);
    const lod = dist < 8 ? 1 : dist < 14 ? 0.72 : 0.5;   // build-time LOD
    const meta = { arc: m.arc, reveal: m.reveal, boost: 1 };
    const tw0 = rand() * TAU;

    const leanA = rand() * TAU;                  // lean direction
    const lean = (0.04 + rand() * 0.10) * m.h;   // lean amount at the cap
    const lx = Math.cos(leanA) * lean, lz = Math.sin(leanA) * lean;
    const capY = m.gy + m.h;
    const cx = m.x + lx, cz = m.z + lz;          // cap centre in plan

    // cap asymmetry: per-member rim wobble phases (hero form-language family)
    const w1 = rand() * TAU, w2 = rand() * TAU;
    const rimR = (a) => m.capR * (1 + 0.10 * Math.cos(a - leanA)
                                    + 0.05 * Math.cos(2 * a + w1)
                                    + 0.02 * Math.sin(3 * a + w2));
    const rimY = (a) => capY - 0.06 * m.capR
                      + m.capR * (-0.10 * Math.cos(a - leanA) + 0.05 * Math.cos(2 * a + w2));
    const domeH = m.capR * (0.62 + 0.18 * rand());

    // --- stipe: 2 (near) / 1 (far) gently curved strokes, dim -> warm ---
    const nSt = lod >= 0.72 ? 2 : 1;
    for (let s = 0; s < nSt; s++) {
      const off = s === 0 ? 0 : 0.05 * m.capR;
      const SEG = lod === 1 ? 5 : 3;
      let px = m.x + gauss() * 0.02 + off, py = m.gy, pz = m.z + gauss() * 0.02;
      for (let k = 1; k <= SEG; k++) {
        const t = k / SEG;
        const nx = m.x + lx * t * t + off * (1 - t) + gauss() * 0.015;
        const ny = m.gy + m.h * t * 0.97;
        const nz = m.z + lz * t * t + gauss() * 0.015;
        lines.seg(px, py, pz, nx, ny, nz,
          0.30 + 0.18 * t + 0.1 * m.m, 0.30 + 0.18 * (t + 1 / SEG) + 0.1 * m.m,
          { ...meta, tw: tw0 + t });
        px = nx; py = ny; pz = nz;
      }
    }

    // --- cap rim ring ---
    const N_RIM = Math.round(16 * lod) + 2;
    let pa = null;
    for (let k = 0; k <= N_RIM; k++) {
      const a = (k / N_RIM) * TAU;
      const r = rimR(a);
      const v = [cx + Math.cos(a) * r, rimY(a), cz + Math.sin(a) * r];
      if (pa) lines.seg(pa[0], pa[1], pa[2], v[0], v[1], v[2],
        0.62 + 0.18 * m.m, 0.62 + 0.18 * m.m, { ...meta, tw: tw0 + a });
      pa = v;
    }

    // --- dome meridians: rim -> apex arcs ---
    const N_MER = lod === 1 ? 4 : lod === 0.72 ? 3 : 2;
    for (let mm = 0; mm < N_MER; mm++) {
      const a = (mm / N_MER) * TAU + rand() * 0.5;
      const SEG = lod === 1 ? 4 : 3;
      let pv = null;
      for (let k = 0; k <= SEG; k++) {
        const u = 1 - k / SEG;                       // 1 at rim -> 0 at apex
        const r = rimR(a) * u;
        const y = rimY(a) * u + (capY + domeH) * (1 - u)
                - domeH * 0.25 * u * (1 - u);        // domed profile
        const v = [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
        if (pv) lines.seg(pv[0], pv[1], pv[2], v[0], v[1], v[2],
          0.52 - 0.14 * (1 - u), 0.52 - 0.14 * (1 - u + 1 / SEG),
          { ...meta, tw: tw0 + a + 2 });
        pv = v;
      }
    }

    // --- under-rim gill ticks: short bright strokes angled inward ---
    const N_GILL = Math.round(10 * lod * (0.6 + 0.4 * m.m));
    for (let g = 0; g < N_GILL; g++) {
      const a = rand() * TAU;
      const r = rimR(a);
      const inX = cx + Math.cos(a) * r * 0.62, inZ = cz + Math.sin(a) * r * 0.62;
      lines.seg(
        cx + Math.cos(a) * r * 0.97, rimY(a) - 0.015, cz + Math.sin(a) * r * 0.97,
        inX, rimY(a) + m.capR * 0.10, inZ,
        0.78 + 0.14 * m.m, 0.52, { ...meta, tw: tw0 + g });
    }

    // --- glow points: under-cap ember + base ember ---
    glows.pt(cx, capY - 0.02, cz, 0.72 + 0.16 * m.m, m.capR * (0.75 + 0.25 * m.m),
      { ...meta, tw: tw0 });
    glows.pt(m.x, m.gy + 0.05, m.z, 0.45, m.capR * 0.30, { ...meta, tw: tw0 + 3 });
  }

  for (const m of MEMBERS) buildMushroom(m);

  // Two faint far-side continuation hints beyond the visible arc (the map's
  // "(the ring continues on the far side)") — deliberately dim and small.
  for (const [azDeg, r, h] of [[14, 9.6, 1.3], [50, 10.4, 1.5]]) {
    const a = (azDeg * Math.PI) / 180;
    const x = RING_C.x + Math.cos(a) * r, z = RING_C.z + Math.sin(a) * r;
    if (Math.hypot(x, z) < 3.4 || cutVal(x, z) < 0.35) continue;
    const gy = groundY(x, z);
    const arc = arcOf(x, z);
    const meta = { arc, reveal: 0.08 + 0.80 * arc, boost: 0.5, tw: rand() * TAU };
    lines.seg(x, gy, z, x + gauss() * 0.03, gy + h, z + gauss() * 0.03, 0.26, 0.4, meta);
    const capR = h * 0.4;
    let pv = null;
    for (let k = 0; k <= 8; k++) {
      const aa = (k / 8) * TAU;
      const v = [x + Math.cos(aa) * capR, gy + h - 0.04, z + Math.sin(aa) * capR];
      if (pv) lines.seg(pv[0], pv[1], pv[2], v[0], v[1], v[2], 0.42, 0.42, meta);
      pv = v;
    }
    glows.pt(x, gy + h - 0.02, z, 0.55, capR * 0.6, meta);
  }

  const strandMat = makeStrandMat(uniforms, 0.88);
  const ringLines = new THREE.LineSegments(lines.geo(), strandMat);
  ringLines.frustumCulled = false;
  group.add(ringLines);

  const glowTex = makeGlowTexture();
  const glowMat = makePointsMat(uniforms, 0.85, glowTex);
  const ringGlows = new THREE.Points(glows.geo(true), glowMat);
  ringGlows.frustumCulled = false;
  group.add(ringGlows);

  /* ---- primordia: tiny buds that surface during a long hold (FN-2.4).
       Time-compressed and subtle — soil-level ember points, no theatrical
       sprouting. Driven by uDwell (seconds of settled dwell at the rest),
       accumulated by the orchestrator. ---- */
  const PRIM_DELAY = 6, PRIM_GROW = 9;
  const primUniforms = {
    uDwell: { value: 0 },
    uAmount: uniforms.uAmount,
    uFogNear: uniforms.uFogNear,
    uFogFar: uniforms.uFogFar,
    uTime: uniforms.uTime,
    uMap: { value: glowTex },
  };
  const primPos = [], primCol = [], primDelay = [], primTw = [], primSize = [];
  {
    const c = new THREE.Color();
    // in the arc gaps: between the lip members, and between the young
    // closers and the hero — always on kept soil
    const spots = [[168, 4.9], [186, 5.0], [214, 5.9], [345, 6.2], [30, 6.6]];
    let di = 0;
    for (const [azDeg, r0] of spots) {
      const a = (azDeg * Math.PI) / 180;
      let r = r0;
      let x = RING_C.x + Math.cos(a) * r, z = RING_C.z + Math.sin(a) * r;
      let guard = 0;
      while (cutVal(x, z) < 0.4 && guard++ < 30) {
        r -= 0.15;
        x = RING_C.x + Math.cos(a) * r; z = RING_C.z + Math.sin(a) * r;
      }
      if (Math.hypot(x, z) < 3.2) continue;
      primPos.push(x + gauss() * 0.2, groundY(x, z) + 0.05, z + gauss() * 0.2);
      // warm bud tone
      c.setRGB(1.0, 0.72, 0.38);
      primCol.push(c.r, c.g, c.b);
      primDelay.push(di * 2.2 + rand() * 1.2);
      primTw.push(rand() * TAU);
      primSize.push(0.10 + rand() * 0.06);
      di++;
    }
  }
  const primGeo = new THREE.BufferGeometry();
  primGeo.setAttribute('position', new THREE.Float32BufferAttribute(primPos, 3));
  primGeo.setAttribute('color', new THREE.Float32BufferAttribute(primCol, 3));
  primGeo.setAttribute('aDelay', new THREE.Float32BufferAttribute(primDelay, 1));
  primGeo.setAttribute('aTw', new THREE.Float32BufferAttribute(primTw, 1));
  primGeo.setAttribute('psize', new THREE.Float32BufferAttribute(primSize, 1));
  const primMat = new THREE.ShaderMaterial({
    uniforms: primUniforms,
    vertexShader: /* glsl */ `
      #define MIN_PT 1.7
      attribute float aDelay, aTw, psize;
      uniform float uDwell, uTime;
      varying vec3 vColor;
      varying float vA;
      varying float vFog;
      varying float vShrink;
      void main() {
        float grow = smoothstep(0.0, 1.0, (uDwell - ${'6.0'} - aDelay) / ${'9.0'});
        vA = grow * (0.55 + 0.30 * sin(uTime * 0.35 + aTw * 1.7));
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFog = -mv.z;
        float sz = psize * (0.2 + 0.8 * grow) * (300.0 / -mv.z);
        vShrink = 1.0;
        if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
        gl_PointSize = sz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uAmount, uFogNear, uFogFar;
      varying vec3 vColor;
      varying float vA;
      varying float vFog;
      varying float vShrink;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
        gl_FragColor = vec4(vColor * t.a * vA * uAmount * fogF * vShrink, 1.0);
      }
    `,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const primordia = new THREE.Points(primGeo, primMat);
  primordia.frustumCulled = false;
  group.add(primordia);

  return {
    group,
    setDwell(s) { primUniforms.uDwell.value = s; },
    counts: { ringSegs: lines.segCount, glowPts: glows.ptCount, primordia: primSize.length },
  };
}
