// journey-v6 — CONNECT production (W4-B): the three semantic structures.
//
// Three REAL network behaviours with unmistakably distinct verbs (08-chapter-
// connect.md CN-2, anatomy map Plate I):
//
//   COMMUNITY  — ignite-in-place. A genuinely connected front-left sector of
//                the colonnade (tagged per-instance in connect-blades.js)
//                brightens IN SEQUENCE — gills, then secondaries, then the
//                cross-veins that join them — and holds. Lives in the blade /
//                vein shaders; nothing here but its anchor.
//   ADOS       — converge-then-echo. Distant strands threading the high
//                channels bend into one hot knot at the gill/stem apex;
//                pulses race INWARD out of step with each other, land, and a
//                small afterglow spreads back OUT (a gathering that changes
//                the network). Strands + knot live here; the outward echo
//                rides the blade shader's uAdos ring.
//   HIVEMIND   — travel-and-remember. A persistent braided route low across
//                the commons floor, threading toward the stipe-cap junction
//                (it doubles as the exit guide, CN-5.1). A pulse traverses
//                it leaving memory-points and an after-trace that stays lit
//                for seconds after the pulse has passed.
import * as THREE from 'three';
import { makeRng, gaussOf, heat, capUnderPt } from '../anatomy.js';
import { TAU, bladeDepth } from './connect-blades.js';

const V3 = THREE.Vector3;

function wrapPi(a) { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; }
function sm(a, b, x) { x = (x - a) / (b - a); x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

// The knot: ON the gill/stem apex (map: "the hot core at the gill/stem apex"),
// on the sector the rest gaze crosses — it crowns the junction where the gill
// fan radiates, upper-centre of the rest frame, clear of the left copy block.
export const KNOT_AZ = 3.35;
export const KNOT = (() => {
  const p = capUnderPt(0.15, KNOT_AZ);
  p.y -= 0.13;
  return p;
})();

/* ---------------- HIVEMIND route ----------------
   Starts low front-right of the rest camera (the open lower-right of the
   frame once the hero bokeh is dimmed), winds across the commons floor, then
   climbs and dives inward to the stipe-cap junction just below-left of the
   ADOS knot — the same junction the exit camera tilts toward, so the route
   literally points the way out. */
export function routePoint(t) {
  const az = 4.85 - 1.55 * t - 0.28 * sm(0.72, 1.0, t);
  const dive = sm(0.70, 1.0, t);
  const u = (0.70 - 0.16 * t) * (1 - dive) + 0.16 * dive;
  const wob = Math.sin(t * 9.1 + 1.7) * 0.035 * (1 - dive);
  const base = capUnderPt(u + wob, az);
  const drop = 0.78 - 0.28 * t - 0.30 * dive
             + Math.sin(t * 7.3 + 0.6) * 0.05 * (1 - dive);
  return { az, u, p: new V3(base.x, base.y - drop, base.z) };
}

export function buildStructures(group, U) {
  const rand = makeRng(90417);
  const gauss = () => gaussOf(rand);
  const counts = { adosStrandSegs: 0, adosKnotSegs: 0, hiveSegs: 0, memPoints: 0 };
  const timeMats = [];

  /* ================================================================
     ADOS — convergence strands
     ================================================================ */
  const adosMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount,
      uBase: { value: 0.16 },
      uIn: { value: 0 },          // inflow amount
      uInPos: { value: -2 },      // inflow head (0 source -> 1 knot)
      uStag: { value: 0.45 },     // per-strand arrival stagger
      uNear: { value: 0.5 },
      uFog: { value: 0.13 },
      uColGold: { value: heat(0.58, new THREE.Color()).clone() },
      uColHot: { value: heat(0.93, new THREE.Color()).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      varying vec3 vA;   // along, strand, dist
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = vec3(aAlong, aStrand, length(mv.xyz));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uAmount, uBase, uIn, uInPos, uStag, uNear, uFog;
      uniform vec3 uColGold, uColHot;
      varying vec3 vA;
      void main() {
        float a = vA.x, s = vA.y, dist = vA.z;
        float tw = 0.5 + 0.5*sin(uTime*(0.33 + fract(s*5.3)*0.9) + s*29.0);
        // channels arrive out of step: a gathering, not a switch
        float head = uInPos - s * uStag;
        float d = a - head;
        float inflow = uIn * exp(-d*d/0.0052);
        float wake = uIn * 0.22 * exp(-abs(min(d, 0.0)) * 6.0) * step(d, 0.0);
        // convergence is structural: strands brighten toward the knot at rest.
        // pow() base clamped strictly positive: varying interpolation can land
        // microscopically below 0 at strand starts, and pow(neg, y) is NaN by
        // spec — one NaN fragment blacks the whole frame through the bloom
        // mips (found the hard way; see W4-B in BUDGETS.md).
        float toward = 0.30 + 0.85 * pow(max(a, 1e-4), 2.4);
        vec3 col = uColGold * (uBase * toward * (0.55 + 0.45*tw))
                 + uColHot * (inflow + wake);
        col *= smoothstep(uNear*0.3, uNear, dist);
        col *= exp(-uFog*uFog*dist*dist);
        gl_FragColor = vec4(col * uAmount, 1.0);
      }`,
  });
  timeMats.push(adosMat);

  {
    const pos = [], along = [], strand = [];
    const N = 14, SEG = 11;
    for (let i = 0; i < N; i++) {
      // sources spread wide across the distant high channels; every third is
      // seeded into the arc the rest gaze frames, so the bending reads early
      const spread = (i % 3 === 0 ? 0.9 : 1.6) + rand() * 1.1;
      const srcAz = KNOT_AZ + (i % 2 === 0 ? 1 : -1) * spread * (0.55 + rand() * 0.45);
      const srcU = 0.80 + rand() * 0.16;
      let prev = null;
      for (let j = 0; j <= SEG; j++) {
        const t = j / SEG;
        const e = sm(0, 1, t);
        // follow the channel inward first, then bend the azimuth over
        const az = srcAz + wrapPi(KNOT_AZ - srcAz) * Math.pow(e, 1.55);
        const u = srcU + (0.15 - srcU) * sm(0, 1, Math.pow(t, 0.9));
        const base = capUnderPt(u, az);
        const hump = Math.sin(Math.PI * t) * (1 - e * 0.7);
        const p = new V3(
          base.x + gauss() * 0.02 * hump,
          base.y - 0.06 - 0.10 * hump - bladeDepth(u) * 0.12
            + Math.sin(t * 5.2 + i * 1.9) * 0.05 * hump,
          base.z + gauss() * 0.02 * hump,
        );
        if (t === 1) p.copy(KNOT);
        if (prev) {
          pos.push(prev.p.x, prev.p.y, prev.p.z, p.x, p.y, p.z);
          along.push(prev.t, t);
          strand.push(i / (N - 1), i / (N - 1));
          counts.adosStrandSegs++;
        }
        prev = { p, t };
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    g.setAttribute('aStrand', new THREE.Float32BufferAttribute(strand, 1));
    const lines = new THREE.LineSegments(g, adosMat);
    lines.frustumCulled = false;
    group.add(lines);
  }

  /* ---- the knot: a tight tangle + warm core ---- */
  const knotMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount,
      uBase: { value: 0.30 },
      uHotAmt: { value: 0 },
      uColGold: { value: heat(0.66, new THREE.Color()).clone() },
      uColHot: { value: heat(0.95, new THREE.Color()).clone() },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aStrand;
      varying vec2 vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = vec2(aStrand, length(mv.xyz));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uAmount, uBase, uHotAmt;
      uniform vec3 uColGold, uColHot;
      varying vec2 vA;
      void main() {
        float tw = 0.5 + 0.5*sin(uTime*(0.6 + fract(vA.x*7.1)) + vA.x*47.0);
        vec3 col = uColGold * (uBase * (0.5 + 0.5*tw))
                 + uColHot * (uHotAmt * (0.5 + 0.5*tw));
        col *= smoothstep(0.14, 0.4, vA.y);
        gl_FragColor = vec4(col * uAmount, 1.0);
      }`,
  });
  timeMats.push(knotMat);
  {
    const pos = [], strand = [];
    const N = 10;
    for (let i = 0; i < N; i++) {
      const a0 = rand() * TAU;
      const tilt = (rand() - 0.5) * 1.3;
      const R = 0.05 + rand() * 0.10;
      const span = 1.2 + rand() * 2.2;
      const SEG = 6;
      let prev = null;
      for (let j = 0; j <= SEG; j++) {
        const t = j / SEG;
        const a = a0 + t * span;
        const rr = R * (1 - 0.35 * t);
        const p = new V3(
          KNOT.x + Math.cos(a) * rr,
          KNOT.y + (t - 0.5) * R * 1.5 * (0.5 + tilt),
          KNOT.z + Math.sin(a) * rr,
        );
        if (prev) {
          pos.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          strand.push(i / N, i / N);
          counts.adosKnotSegs++;
        }
        prev = p;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aStrand', new THREE.Float32BufferAttribute(strand, 1));
    const lines = new THREE.LineSegments(g, knotMat);
    lines.frustumCulled = false;
    group.add(lines);
  }

  /* ================================================================
     HIVEMIND — braided persistent route + memory points
     ================================================================ */
  const hiveMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: U.uTime, uAmount: U.uAmount,
      uBase: { value: 0.20 },
      uPulse: { value: -2 },       // travelling head, 0..1 along the route
      uPulseOn: { value: 0 },
      uTrace: { value: 0 },        // persistent after-trace
      uHiveExit: { value: 0 },     // CN-5.1: junction stretch lights on exit
      uNear: { value: 0.42 },
      uFog: { value: 0.10 },
      uColGold: { value: heat(0.60, new THREE.Color()).clone() },
      uColHot: { value: heat(0.94, new THREE.Color()).clone() },
      // a whisper of cooler tone ONLY in the memory trace — nowhere else
      uColTrace: { value: heat(0.88, new THREE.Color()).clone().lerp(new THREE.Color(0xcfe0d8), 0.24) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      varying vec3 vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = vec3(aAlong, aStrand, length(mv.xyz));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uAmount, uBase, uPulse, uPulseOn, uTrace, uHiveExit, uNear, uFog;
      uniform vec3 uColGold, uColHot, uColTrace;
      varying vec3 vA;
      void main() {
        float a = vA.x, s = vA.y, dist = vA.z;
        float tw = 0.5 + 0.5*sin(uTime*(0.28 + fract(s*6.1)*0.8) + s*33.0);
        // braid strands carry the head slightly out of step
        float head = uPulse - s * 0.06;
        float d = a - head;
        float pulse = uPulseOn * exp(-d*d/0.0028);
        // persistence: what the pulse has passed keeps glowing
        float trace = uTrace * smoothstep(-0.03, 0.10, head - a);
        // exit guide: the junction stretch brightens as the camera leaves
        float exitG = uHiveExit * smoothstep(0.55, 0.95, a);
        vec3 col = uColGold * (uBase * (0.60 + 0.40*tw))
                 + uColHot * (pulse + exitG * 0.45)
                 + uColTrace * (trace * 0.50);
        col *= smoothstep(uNear*0.3, uNear, dist);
        col *= exp(-uFog*uFog*dist*dist);
        gl_FragColor = vec4(col * uAmount, 1.0);
      }`,
  });
  timeMats.push(hiveMat);

  {
    const pos = [], along = [], strand = [];
    const STRANDS = 5, CTRL = 44;
    for (let k = 0; k < STRANDS; k++) {
      const phase0 = (k / STRANDS) * TAU + (rand() - 0.5) * 0.4;
      const twist = 5.0 + rand() * 2.5;
      const br = 0.028 + rand() * 0.020;
      let prev = null;
      for (let j = 0; j <= CTRL; j++) {
        const t = j / CTRL;
        const { p } = routePoint(t);
        const ph = phase0 + t * twist * TAU;
        const tight = 1 - 0.6 * sm(0.75, 1.0, t);   // braid tightens into the junction
        const wob = gauss() * 0.006;
        const q = new V3(
          p.x + Math.cos(ph) * br * tight + wob,
          p.y + Math.sin(ph) * br * 0.8 * tight + wob * 0.5,
          p.z + Math.sin(ph + 1.3) * br * tight + wob,
        );
        if (prev) {
          pos.push(prev.q.x, prev.q.y, prev.q.z, q.x, q.y, q.z);
          along.push(prev.t, t);
          strand.push(k / (STRANDS - 1), k / (STRANDS - 1));
          counts.hiveSegs++;
        }
        prev = { q, t };
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    g.setAttribute('aStrand', new THREE.Float32BufferAttribute(strand, 1));
    const lines = new THREE.LineSegments(g, hiveMat);
    lines.frustumCulled = false;
    group.add(lines);
  }

  /* ---- memory points: lit by the passing head, fading over seconds ---- */
  const MEM_ALONG = [0.10, 0.28, 0.46, 0.64, 0.80];
  const memLife = new Float32Array(MEM_ALONG.length);
  let memGeo, memMat;
  {
    const pos = new Float32Array(MEM_ALONG.length * 3);
    MEM_ALONG.forEach((t, i) => {
      const { p } = routePoint(t);
      pos[i * 3] = p.x + gauss() * 0.03;
      pos[i * 3 + 1] = p.y + 0.09;
      pos[i * 3 + 2] = p.z + gauss() * 0.03;
    });
    memGeo = new THREE.BufferGeometry();
    memGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    memGeo.setAttribute('aLife', new THREE.BufferAttribute(memLife, 1));
    memMat = new THREE.ShaderMaterial({
      uniforms: {
        uAmount: U.uAmount,
        uMap: { value: null },   // set by caller (shared glow texture)
        uCol: { value: heat(0.88, new THREE.Color()).clone().lerp(new THREE.Color(0xcfe0d8), 0.20) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float aLife;
        varying float vLife;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vLife = aLife;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (26.0 + 30.0 * aLife) / max(length(mv.xyz), 0.4);
        }`,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        uniform vec3 uCol;
        uniform float uAmount;
        varying float vLife;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(uCol, tex.a * vLife * 0.85 * uAmount);
        }`,
    });
    const pts = new THREE.Points(memGeo, memMat);
    pts.frustumCulled = false;
    group.add(pts);
    counts.memPoints = MEM_ALONG.length;
  }

  /* ---- the knot's warm core sprite ---- */
  const coreMat = new THREE.SpriteMaterial({
    map: null,   // set by caller
    color: heat(0.80, new THREE.Color()).clone(),
    transparent: true, opacity: 0, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const core = new THREE.Sprite(coreMat);
  core.position.copy(KNOT);
  core.scale.setScalar(0.34);
  group.add(core);

  return {
    counts, adosMat, hiveMat, knotMat,
    core, coreMat, coreBase: 0.34,
    memAlong: MEM_ALONG, memLife, memGeo, memMat,
    setGlowTexture(tex) { memMat.uniforms.uMap.value = tex; coreMat.map = tex; },
  };
}
