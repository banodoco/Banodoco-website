// journey-v6 — FINAL epilogue: the primordia bed.
//
// Extracted from `ring.js` by elegance order H03 (2026-08-21). Everything the
// dwell-driven bud field needs and nothing else: its two timing constants, its
// own uniform bundle, its emission, its shader and its one Points node.
//
// WHY THIS IS A SEAM WHEN THE REST OF THE FILE IS NOT. `ring.js` is PLACEMENT
// — where a fruiting body stands, which detail rung it earns from the rest
// camera, how that camera shades it, the ground merge, the two merged batches
// and the arrival ladders. The primordia are none of that. They are not
// fruiting bodies; they stand in the ring's arc gaps rather than on a placed
// seat; they carry no member meta, no tier, no reveal threshold and no body ID;
// they answer no poke; and they are driven by `uDwell` — seconds of settled
// dwell at the rest — rather than by the `uPull` every other draw in the
// chapter reads. They are the one draw here that the placement pass neither
// positions nor reveals, and the only ShaderMaterial the file owns.
//
// THE SEEDED STREAM IS THE CALLER'S, DELIBERATELY. `rand` and `gauss` are
// `createFinalRing`'s own `makeRng(20260417)` and its gaussian, passed in
// rather than reconstructed here. h-series-contract.md §2.2 allows a
// sub-module to receive an existing generator only when it is invoked at
// exactly the same point in the draw sequence; the facade's single call site,
// at the position the inline block occupied, is what makes that true. The full
// draw sequence of that stream is digested pre- and post-split by this order's
// suite, so a shift of one draw is a red assertion, not an argument.
//
// NOT A "BY CONSTRUCTION" CLAIM. Constructing a `BufferGeometry`, a
// `ShaderMaterial` and a `Points` node reaches `Math.random` through
// `generateUUID()` in vendor/three (ledger D55). What the split preserves is
// verbatim-ness with preserved callee order, measured — see h03's evidence.
//
// On the baked path this module writes no geometry at all: `bakedGeo` is
// handed in and the emission is skipped, exactly as the inline block did.
import * as THREE from 'three';
import { TAU, RING_C, cutVal, groundY } from './world.js';

/** The dwell-driven bud bed.
 *
 *  `bakedGeo` is the committed `final/primordia` geometry, or null to emit
 *  live. Returns the Points node, its geometry, its LIVE emission count (0 on
 *  the baked path — the facade keeps the `baked ? … : …` ternary that chooses
 *  between this and the payload's count) and its uniform bundle, so the
 *  facade's `group.add`, `geometries` literal, counts ternaries and `setDwell`
 *  read exactly what they read before. */
export function createPrimordia({ uniforms, glowTex, bakedGeo, rand, gauss }) {
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
  let primGeo;
  if (bakedGeo) {
    // Emission is fetched (final/primordia); only the shader below stays live.
    primGeo = bakedGeo;
  } else {
    {
      const c = new THREE.Color();
      // in the arc gaps and along the lip edge — always on kept soil
      const spots = [[100, 5.6], [160, 5.2], [300, 5.9], [335, 6.0], [20, 6.4]];
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
    primGeo = new THREE.BufferGeometry();
    primGeo.setAttribute('position', new THREE.Float32BufferAttribute(primPos, 3));
    primGeo.setAttribute('color', new THREE.Float32BufferAttribute(primCol, 3));
    primGeo.setAttribute('aDelay', new THREE.Float32BufferAttribute(primDelay, 1));
    primGeo.setAttribute('aTw', new THREE.Float32BufferAttribute(primTw, 1));
    primGeo.setAttribute('psize', new THREE.Float32BufferAttribute(primSize, 1));
  }
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
        float grow = smoothstep(0.0, 1.0, (uDwell - ${PRIM_DELAY.toFixed(1)} - aDelay) / ${PRIM_GROW.toFixed(1)});
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
  return { points: primordia, geo: primGeo, count: primSize.length, uniforms: primUniforms };
}
