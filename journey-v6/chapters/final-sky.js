// journey-v6 — FINAL epilogue: spore sky + forest-mist horizon (W4-D).
//
// SPORES (FN-2.3): a staged GPU phase shader in the Spike A family — zero
// per-frame CPU, every particle a pure function of (uTime, attributes).
// Two cohorts in one draw:
//   mode 0 — plume-born: released UNDER the caps of the mature ring members
//            (multiple sources, never the hero), rising and merging into the
//            drift band. Gated by the member's reveal, so no body sheds
//            before it has kindled.
//   mode 1 — the standing broad cloud: already aloft, long periods, forming
//            as the sky opens (gated on uPull) — the "broad broken" mass.
// One dominant drift direction (+x, the hero's own breeze), cluster-coherent
// eddies (particles sharing aClump move together), and a peel-away cohort
// that diverges after mid-life. Alpha windows + cluster gaps keep the cloud
// BROKEN, not a uniform haze.
//
// HORIZON (FN-1.3): conifer-silhouette line strokes + mist sprites at
// 26-46 world units from the Final rest camera — a far plane for the frame
// now that the fog opens to ~60. Fog does most of the dimming.

import * as THREE from 'three';
import {
  TAU, RING_C, SPORE_SOURCES,
  makeRng, gaussOf, heat, groundY, makeBatch, makeStrandMat, makePointsMat,
} from './final-world.js';
import { makeGlowTexture } from '../core/anatomy.js';

// Final rest camera (build-time composition anchor, mirrors director key).
const REST = { x: -13.9, y: 3.4, z: 2.55, headingDeg: -22.7 };

export function createFinalSky(sceneApi, uniforms) {
  const rand = makeRng(88417);
  const gauss = () => gaussOf(rand);
  const group = new THREE.Group();
  const glowTex = makeGlowTexture();
  const counts = {};

  /* ================================================================
     1. The spore cloud — one Points draw, GPU phase
     ================================================================ */
  const N_SPORE = 3600;
  counts.spores = N_SPORE;
  const sporeGeo = (() => {
    const position = new Float32Array(N_SPORE * 3);
    const aSeed = new Float32Array(N_SPORE);
    const aCycle = new Float32Array(N_SPORE * 4);  // period, phase, size, tone
    const aClump = new Float32Array(N_SPORE * 2);  // clump phase, peel flag
    const aGate = new Float32Array(N_SPORE * 2);   // reveal threshold, mode
    for (let i = 0; i < N_SPORE; i++) {
      const highBand = rand() < 0.42;              // mode 1: standing cloud
      let x, y, z, revealT;
      if (highBand) {
        // aloft over the ring interior, biased downwind (+x, slightly +z) —
        // the mass sweeps the frame's upper right, clear of the copy block
        const a = rand() * TAU, r = Math.pow(rand(), 0.6) * 13;
        x = RING_C.x + Math.cos(a) * r + 2.5 + rand() * 6.5;
        z = RING_C.z + Math.sin(a) * r * 0.9 + 1.0 + rand() * 4.5;
        y = 3.2 + Math.pow(rand(), 0.85) * 8.5;
        revealT = -1;
      } else {
        const src = SPORE_SOURCES[Math.floor(rand() * SPORE_SOURCES.length)];
        const a = rand() * TAU, rr = rand() * src.capR * 0.8;
        x = src.x + Math.cos(a) * rr;
        z = src.z + Math.sin(a) * rr;
        y = src.gy + src.h - 0.12 - rand() * 0.3;   // UNDER the cap, never apex
        revealT = src.reveal;
      }
      position[i * 3] = x; position[i * 3 + 1] = y; position[i * 3 + 2] = z;
      aSeed[i] = rand() * 1000;
      aCycle[i * 4] = highBand ? 26 + rand() * 22 : 11 + rand() * 10;
      aCycle[i * 4 + 1] = rand();
      const szR = rand();
      const szBase = szR < 0.72 ? 0.028 + rand() * 0.034
                   : szR < 0.95 ? 0.062 + rand() * 0.04
                   : 0.10 + rand() * 0.05;
      aCycle[i * 4 + 2] = szBase * (highBand ? 1.9 : 1.15);
      aCycle[i * 4 + 3] = Math.min(1, 0.5 + rand() * 0.36 + (szR > 0.95 ? 0.14 : 0));
      // 14 eddy clusters; a cluster id quantises the eddy phase so whole
      // groups wheel together — eddies, clusters, isolated points
      const clump = Math.floor(rand() * 14);
      aClump[i * 2] = clump * 2.399 + gauss() * 0.15;
      aClump[i * 2 + 1] = rand() < 0.18 ? 1 : 0;    // peel-away cohort
      aGate[i * 2] = revealT;
      aGate[i * 2 + 1] = highBand ? 1 : 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(position, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1));
    g.setAttribute('aCycle', new THREE.BufferAttribute(aCycle, 4));
    g.setAttribute('aClump', new THREE.BufferAttribute(aClump, 2));
    g.setAttribute('aGate', new THREE.BufferAttribute(aGate, 2));
    return g;
  })();

  const sporeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniforms.uTime,
      uPull: uniforms.uPull,
      uAmount: uniforms.uAmount,
      uFogNear: uniforms.uFogNear,
      uFogFar: uniforms.uFogFar,
      uMap: { value: glowTex },
      uHeatA: { value: heat(0.52, new THREE.Color()).clone() },
      uHeatB: { value: heat(0.9, new THREE.Color()).clone() },
    },
    vertexShader: /* glsl */ `
      #define MIN_PT 1.7
      attribute float aSeed;
      attribute vec4 aCycle;   // period, phase, size, tone
      attribute vec2 aClump;   // clump phase, peel flag
      attribute vec2 aGate;    // reveal threshold, mode
      uniform float uTime, uPull;
      varying float vAlpha, vTone, vFog, vShrink;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        float mode = aGate.y;
        float reveal = aGate.x < -0.5 ? 1.0
                     : smoothstep(aGate.x, aGate.x + 0.16, uPull);
        // the standing cloud forms as the sky opens
        float bandGate = mode > 0.5 ? smoothstep(0.30, 0.72, uPull) : 1.0;
        float t = fract(uTime / aCycle.x + aCycle.y);
        float h1 = hash(aSeed * 12.9898), h2 = hash(aSeed * 78.233 + 1.0);
        vec3 p = position;
        // rise: plume-born climb 6-13 units; the high band breathes slowly
        float rise = mode > 0.5
          ? 0.8 * sin(uTime * 0.05 + aSeed)
          : t * (6.0 + h1 * 7.0);
        // ONE dominant drift direction: +x with a whisper of +z (the hero's
        // breeze), scaled with life
        float drift = t * (4.0 + h2 * 4.5);
        vec3 dir = vec3(0.975, 0.0, 0.16);
        // cluster-coherent eddies: whole clumps wheel together
        float e = aClump.x;
        vec3 eddy = vec3(
          sin(uTime * 0.10 + e) * 1.5,
          cos(uTime * 0.083 + e * 1.3) * 0.75,
          sin(uTime * 0.067 + e * 2.1) * 1.35
        ) * (0.35 + 0.65 * t);
        // peel-away cohort: diverges after mid-life
        float peel = aClump.y * smoothstep(0.45, 0.9, t);
        vec3 peelV = vec3(-1.2 - h1 * 1.6, 0.9, (h2 - 0.5) * 4.0) * peel;
        p += vec3(0.0, rise, 0.0) + dir * drift + eddy + peelV;
        p.x += (h1 - 0.5) * 1.2 * t;  // scatter across the drift
        p.z += (h2 - 0.5) * 1.6 * t;
        // life window + broken-cloud gaps (slow per-particle gating)
        float life = mode > 0.5
          ? 0.55 + 0.45 * sin(uTime * 0.045 + aSeed * 2.7)
          : smoothstep(0.0, 0.07, t) * (1.0 - smoothstep(0.72, 1.0, t));
        vAlpha = life * reveal * bandGate * (0.35 + 0.5 * h2) * mix(1.0, 1.5, mode);
        vTone = aCycle.w;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFog = -mv.z;
        // near-camera fade: receding through the cloud must not blow out
        vAlpha *= smoothstep(1.6, 3.4, length(mv.xyz));
        float sz = aCycle.z * (300.0 / -mv.z);
        vShrink = 1.0;
        if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
        gl_PointSize = sz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uHeatA, uHeatB;
      uniform float uAmount, uFogNear, uFogFar;
      varying float vAlpha, vTone, vFog, vShrink;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
        vec3 col = mix(uHeatA, uHeatB, vTone);
        gl_FragColor = vec4(col * t.a * vAlpha * uAmount * fogF * 2.2, 1.0);
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
     2. Forest horizon: conifer silhouettes in two fogged distance bands
     ================================================================ */
  const trees = makeBatch();
  {
    const head = (REST.headingDeg * Math.PI) / 180;
    for (const [band, distLo, distHi, n, tone] of [
      [0, 26, 34, 22, 0.30], [1, 36, 46, 26, 0.22],
    ]) {
      for (let i = 0; i < n; i++) {
        // spread across the frame; thinner on the far left where the copy
        // block owns the upper-left negative space
        const rel = (-0.62 + (i / (n - 1)) * 1.5 + gauss() * 0.05);   // radians off gaze
        const th = head + rel;
        const dist = distLo + rand() * (distHi - distLo);
        const x = REST.x + Math.cos(th) * dist;
        const z = REST.z + Math.sin(th) * dist;
        const gy = groundY(x, z);
        const h = (rel < -0.30 ? 2.6 : 4.0) + rand() * (band ? 4.5 : 3.0);
        const tw = rand() * TAU;
        const meta = { tw, reveal: -1 };
        // trunk
        trees.seg(x, gy, z, x + gauss() * 0.1, gy + h, z + gauss() * 0.1, tone, tone * 1.3, meta);
        // conifer chevrons: symmetric drooping bough PAIRS, wide at the base
        // narrowing to the crown — the silhouette, not a streak
        const NB = 5 + Math.floor(rand() * 3);
        // bough plane roughly facing the rest camera
        const face = Math.atan2(REST.z - z, REST.x - x) + Math.PI / 2;
        for (let b = 0; b < NB; b++) {
          const u = b / NB;
          const by = gy + h * (0.18 + 0.78 * u);
          const bw = (1 - u * 0.85) * (1.3 + rand() * 1.2);
          for (const sgn of [-1, 1]) {
            trees.seg(x, by, z,
              x + Math.cos(face) * bw * sgn, by - bw * 0.55, z + Math.sin(face) * bw * sgn,
              tone * 1.25, tone * 0.55, meta);
          }
        }
        // crown tip
        trees.seg(x, gy + h, z, x + gauss() * 0.05, gy + h + 0.5 + rand() * 0.4, z + gauss() * 0.05,
          tone * 1.3, tone * 0.6, meta);
      }
    }
  }
  const treeMat = makeStrandMat(uniforms, 0.7);
  const treeLines = new THREE.LineSegments(trees.geo(), treeMat);
  treeLines.frustumCulled = false;
  group.add(treeLines);
  counts.treeSegs = trees.segCount;

  /* ================================================================
     3. Mist + horizon glow sprites (fade driven by the orchestrator)
     ================================================================ */
  const sprites = [];
  const addSprite = (x, y, z, sx, sy, tone, base) => {
    const mat = new THREE.SpriteMaterial({
      map: glowTex, color: heat(tone, new THREE.Color()).clone(),
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    s.position.set(x, y, z);
    s.scale.set(sx, sy, 1);
    group.add(s);
    sprites.push({ mat, base, drift: rand() * TAU, spr: s, x0: x });
    return s;
  };
  {
    const head = (REST.headingDeg * Math.PI) / 180;
    // low mist banks among the trees
    for (const [rel, dist, sx, sy, tone, base] of [
      [-0.30, 30, 16, 5, 0.34, 0.05],
      [0.05, 33, 22, 6, 0.36, 0.055],
      [0.42, 28, 18, 5.5, 0.34, 0.05],
      [0.75, 36, 20, 6, 0.32, 0.045],
    ]) {
      const x = REST.x + Math.cos(head + rel) * dist;
      const z = REST.z + Math.sin(head + rel) * dist;
      addSprite(x, 1.6 + rand() * 1.2, z, sx, sy, tone, base);
    }
    // one broad warm horizon glow, biased frame-right (under the spore
    // cloud's drift), far enough that fog keeps it a breath, not a sun
    const gx = REST.x + Math.cos(head + 0.28) * 40;
    const gz = REST.z + Math.sin(head + 0.28) * 40;
    addSprite(gx, 4.5, gz, 46, 12, 0.5, 0.085);
  }

  return {
    group,
    counts,
    /** sprite fade + slow lateral mist drift (sprites sit outside the
     *  shared shader uniforms) */
    update(t, amount) {
      for (const s of sprites) {
        s.mat.opacity = s.base * amount * (0.8 + 0.2 * Math.sin(t * 0.05 + s.drift));
        s.spr.position.x = s.x0 + Math.sin(t * 0.03 + s.drift) * 0.6;
      }
    },
  };
}
