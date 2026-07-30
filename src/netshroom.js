import * as THREE from 'three';
import { makeRng } from './geometry.js';
import { sampleDisc, knnEdges } from './graph.js';

// ---------------------------------------------------------------------------
// Palette. Everything in the piece is self-luminous, so these are emission
// values in linear space — the hot end deliberately exceeds 1.0 so bloom has
// something to catch.
// ---------------------------------------------------------------------------
export const PAL = {
  ember: new THREE.Color(0.30, 0.085, 0.012),
  amber: new THREE.Color(0.95, 0.34, 0.045),
  gold:  new THREE.Color(1.00, 0.62, 0.16),
  hot:   new THREE.Color(1.00, 0.86, 0.50),
};

export const MAX_PULSES = 4;

// ---------------------------------------------------------------------------
// Proportions, measured off the Banodoco hero frame.
// ---------------------------------------------------------------------------
export const CAP_R = 1.0;
export const CAP_H = 0.295;        // apex above the cap's local origin
export const CAP_Y = 1.30;        // world height of the cap's local origin
const RIM_DROP = 0.070;           // how far the margin turns down
// Where the gills converge. Must sit just outside the stem's radius at that
// height or the fan disappears inside the stem.
const STEM_TOP_R = 0.126;
const STEM_TOP_Y = CAP_Y + 0.255; // runs up inside the cap, but must stay
                                  // below the apex (CAP_Y + CAP_H) or it spears through
const STEM_BASE_Y = -0.02;
const N_GILLS = 148;

// ---------------------------------------------------------------------------
// Shared shader chunks: pulse wavefronts + a cursor light that both the line
// and point materials respond to, so the whole network reacts as one organism.
// ---------------------------------------------------------------------------
const FIELD_UNIFORMS = () => ({
  uTime: { value: 0 },
  uPulseOrigin: { value: Array.from({ length: MAX_PULSES }, () => new THREE.Vector3()) },
  uPulseAge: { value: new Float32Array(MAX_PULSES).fill(-1) },
  uCursor: { value: new THREE.Vector3(0, -99, 0) },
  uCursorStrength: { value: 0 },
  uReveal: { value: 0 },
  // 0.5 * drawingBufferHeight / tan(fov/2). Turns a world-space radius into
  // device pixels, so node size is physically correct at any resolution.
  uPxPerUnit: { value: 900 },
});

const FIELD_GLSL = /* glsl */ `
  uniform float uTime;
  uniform vec3  uPulseOrigin[${MAX_PULSES}];
  uniform float uPulseAge[${MAX_PULSES}];
  uniform vec3  uCursor;
  uniform float uCursorStrength;

  // Expanding rings of light. Each pulse is a gaussian shell whose radius
  // grows with age and whose amplitude decays, so it reads as a signal
  // travelling out through the mycelium.
  float pulseAt(vec3 p) {
    float sum = 0.0;
    for (int i = 0; i < ${MAX_PULSES}; i++) {
      float age = uPulseAge[i];
      if (age < 0.0) continue;
      float radius = age * 3.6;
      float d = distance(p.xz, uPulseOrigin[i].xz);
      float shell = exp(-pow((d - radius) * 1.9, 2.0));
      sum += shell * exp(-age * 0.42);
    }
    return sum;
  }

  float cursorAt(vec3 p) {
    float d = distance(p.xz, uCursor.xz);
    return uCursorStrength * exp(-d * d * 0.55);
  }
`;

function fieldLineMaterial({ opacity = 1.0, gain = 1.0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...FIELD_UNIFORMS(), uOpacity: { value: opacity }, uGain: { value: gain } },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSeed;
      attribute float aFlow;     // 0..1 along the strand, for travelling glints
      varying vec3 vColor;
      varying float vSeed;
      varying float vFlow;
      varying vec3 vWorld;
      void main() {
        vColor = aColor;
        vSeed = aSeed;
        vFlow = aFlow;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FIELD_GLSL}
      uniform float uOpacity;
      uniform float uGain;
      uniform float uReveal;
      varying vec3 vColor;
      varying float vSeed;
      varying float vFlow;
      varying vec3 vWorld;
      void main() {
        // Slow idle shimmer so the mesh never looks frozen.
        float breathe = 0.93 + 0.07 * sin(uTime * 0.35 + vSeed * 43.0);
        // A glint chasing along each strand.
        float chase = 0.5 + 0.5 * sin(vFlow * 5.0 - uTime * 0.7 + vSeed * 21.0);
        chase = pow(chase, 10.0);

        float energy = breathe + chase * 0.16
                     + pulseAt(vWorld) * 1.9
                     + cursorAt(vWorld) * 1.1;

        vec3 c = vColor * energy * uGain;
        float a = uOpacity * clamp(uReveal * 1.4 - vSeed * 0.25, 0.0, 1.0);
        gl_FragColor = vec4(c, a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function fieldPointMaterial({ size = 0.01, gain = 1.0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...FIELD_UNIFORMS(), uSize: { value: size }, uGain: { value: gain } },
    vertexShader: /* glsl */ `
      ${FIELD_GLSL}
      attribute vec3 aColor;
      attribute float aSeed;
      attribute float aScale;
      uniform float uSize;
      uniform float uPxPerUnit;
      varying vec3 vColor;
      varying float vEnergy;
      void main() {
        vColor = aColor;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec4 mv = viewMatrix * wp;

        float twinkle = 0.94 + 0.06 * sin(uTime * 0.42 + aSeed * 61.0);
        vEnergy = twinkle + pulseAt(wp.xyz) * 2.4 + cursorAt(wp.xyz) * 1.5;

        // uSize is a world-space radius; nodes swell as energy passes through.
        float world = uSize * aScale * (0.85 + 0.28 * vEnergy);
        gl_PointSize = clamp(world * uPxPerUnit / max(-mv.z, 0.05), 1.0, 13.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uGain;
      uniform float uReveal;
      varying vec3 vColor;
      varying float vEnergy;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        if (r > 1.0) discard;
        // Tight core with a wide soft skirt reads as a point light.
        float f = max(1.0 - r, 0.0);
        float core = pow(f, 3.5);
        float halo = pow(f, 1.8) * 0.30;
        gl_FragColor = vec4(vColor * (core + halo) * vEnergy * uGain, (core + halo) * uReveal);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

/**
 * Soft glowing ribbons.
 *
 * GL_LINES are one device pixel wide no matter how close the camera is, which
 * is why a line-built version of this scene can only ever look wiry: brighten
 * a hairline and it aliases and clumps rather than glowing. Expanding each
 * segment into a camera-facing quad gives filaments real width and a soft
 * cross-section, so they read as light with structure — which is what the
 * reference actually looks like.
 */
function fieldRibbonMaterial({ width = 0.006, minPx = 1.4, softness = 1.6, opacity = 1.0, gain = 1.0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...FIELD_UNIFORMS(),
      uOpacity: { value: opacity },
      uGain: { value: gain },
      uWidth: { value: width },
      uMinPx: { value: minPx },
      uSoftness: { value: softness },
      uResolution: { value: new THREE.Vector2(1600, 900) },
    },
    vertexShader: /* glsl */ `
      ${FIELD_GLSL}
      attribute vec3 aOther;     // the segment's other endpoint
      attribute float aSide;     // -1 / +1 across the ribbon
      attribute vec3 aColor;
      attribute float aSeed;
      attribute float aFlow;
      uniform float uWidth, uMinPx, uPxPerUnit;
      uniform vec2 uResolution;
      varying vec3 vColor;
      varying float vSeed, vFlow, vCross;
      varying vec3 vWorld;

      void main() {
        vColor = aColor; vSeed = aSeed; vFlow = aFlow; vCross = aSide;

        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec4 wo = modelMatrix * vec4(aOther, 1.0);
        vWorld = wp.xyz;

        vec4 clipP = projectionMatrix * viewMatrix * wp;
        vec4 clipO = projectionMatrix * viewMatrix * wo;

        // Screen-space perpendicular, so the ribbon always faces the camera.
        vec2 sp = clipP.xy / max(abs(clipP.w), 1e-4) * uResolution;
        vec2 so = clipO.xy / max(abs(clipO.w), 1e-4) * uResolution;
        vec2 dir = so - sp;
        dir = length(dir) < 1e-5 ? vec2(1.0, 0.0) : normalize(dir);
        vec2 nrm = vec2(-dir.y, dir.x);

        // World-width so distant strands thin out naturally, floored in pixels
        // so they never fall below the resolution limit and start to shimmer.
        float px = max(uMinPx, uWidth * uPxPerUnit / max(-(viewMatrix * wp).z, 0.05));
        gl_Position = clipP;
        gl_Position.xy += nrm * aSide * px / uResolution * clipP.w;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FIELD_GLSL}
      uniform float uOpacity, uGain, uSoftness, uReveal;
      varying vec3 vColor;
      varying float vSeed, vFlow, vCross;
      varying vec3 vWorld;
      void main() {
        // Soft cross-section: bright filament core fading to nothing at the
        // edges. This is what replaces the hard 1px hairline.
        float f = max(1.0 - abs(vCross), 0.0);
        float profile = pow(f, uSoftness) * 0.55 + pow(f, 6.0) * 0.75;

        float breathe = 0.93 + 0.07 * sin(uTime * 0.35 + vSeed * 43.0);
        float chase = pow(0.5 + 0.5 * sin(vFlow * 5.0 - uTime * 0.7 + vSeed * 21.0), 10.0);
        float energy = breathe + chase * 0.16
                     + pulseAt(vWorld) * 1.9
                     + cursorAt(vWorld) * 1.1;

        float a = uOpacity * profile * clamp(uReveal * 1.4 - vSeed * 0.25, 0.0, 1.0);
        gl_FragColor = vec4(vColor * energy * uGain * profile, a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    // A ribbon quad's winding flips depending on which way its segment points
    // in screen space, so half of them get backface-culled and the strand
    // renders as dashes. Ribbons have no meaningful facing — draw both sides.
    side: THREE.DoubleSide,
  });
}

/**
 * Turns the flat per-segment arrays every builder already produces into ribbon
 * geometry: 4 vertices and 2 triangles per segment.
 */
function makeRibbons(field, { pos, col, seed, flow }, opts) {
  const n = pos.length / 6;                   // segments
  const P = new Float32Array(n * 12);
  const O = new Float32Array(n * 12);
  const C = new Float32Array(n * 12);
  const S = new Float32Array(n * 4);
  const F = new Float32Array(n * 4);
  const SD = new Float32Array(n * 4);
  const idx = new Uint32Array(n * 6);

  for (let i = 0; i < n; i++) {
    const a = i * 6, v = i * 12, q = i * 4;
    const ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
    const bx = pos[a + 3], by = pos[a + 4], bz = pos[a + 5];
    // A-, A+, B-, B+
    const pts = [[ax, ay, az, bx, by, bz], [ax, ay, az, bx, by, bz],
                 [bx, by, bz, ax, ay, az], [bx, by, bz, ax, ay, az]];
    for (let k = 0; k < 4; k++) {
      P[v + k * 3] = pts[k][0]; P[v + k * 3 + 1] = pts[k][1]; P[v + k * 3 + 2] = pts[k][2];
      O[v + k * 3] = pts[k][3]; O[v + k * 3 + 1] = pts[k][4]; O[v + k * 3 + 2] = pts[k][5];
      const src = k < 2 ? a : a + 3;
      C[v + k * 3] = col[src]; C[v + k * 3 + 1] = col[src + 1]; C[v + k * 3 + 2] = col[src + 2];
      S[q + k] = k % 2 === 0 ? -1 : 1;
      F[q + k] = flow[k < 2 ? i * 2 : i * 2 + 1];
      SD[q + k] = seed[i * 2];
    }
    const o = i * 6, b = i * 4;
    idx[o] = b; idx[o + 1] = b + 2; idx[o + 2] = b + 1;
    idx[o + 3] = b + 1; idx[o + 4] = b + 2; idx[o + 5] = b + 3;
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('aOther', new THREE.BufferAttribute(O, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(C, 3));
  g.setAttribute('aSide', new THREE.BufferAttribute(S, 1));
  g.setAttribute('aFlow', new THREE.BufferAttribute(F, 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(SD, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return new THREE.Mesh(g, field.ribbon(opts));
}

/** Collects every field material so one update loop can drive them all. */
export class Field {
  constructor() { this.materials = []; }
  line(opts) { const m = fieldLineMaterial(opts); this.materials.push(m); return m; }
  ribbon(opts) { const m = fieldRibbonMaterial(opts); this.materials.push(m); return m; }
  point(opts) { const m = fieldPointMaterial(opts); this.materials.push(m); return m; }
  set(name, value) {
    for (const m of this.materials) if (m.uniforms[name]) m.uniforms[name].value = value;
  }
  setPulses(origins, ages) {
    for (const m of this.materials) {
      if (!m.uniforms.uPulseOrigin) continue;
      for (let i = 0; i < MAX_PULSES; i++) {
        m.uniforms.uPulseOrigin.value[i].copy(origins[i]);
        m.uniforms.uPulseAge.value[i] = ages[i];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Cap surface
// ---------------------------------------------------------------------------
const capWobble = (a) =>
  1.0 + 0.052 * Math.sin(3.0 * a + 0.6) + 0.030 * Math.sin(5.0 * a + 2.2)
      + 0.016 * Math.sin(7.0 * a - 1.4);

const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

export function capRadius(v, a) {
  return CAP_R * Math.pow(v, 0.72) * capWobble(a);
}
export function capHeight(v, a) {
  return CAP_H * Math.pow(Math.max(0.0, 1.0 - v * v), 0.72)
       - RIM_DROP * smoothstep(0.78, 1.0, v)
       + CAP_H * 0.075 * Math.sin(3.0 * a + 1.9) * v * v;   // wavy margin
}

function capPoint(u, v, out) {
  const a = u * Math.PI * 2;
  const r = capRadius(v, a);
  const y = capHeight(v, a);
  // The whole crown leans, so the apex is off the stem axis.
  const lean = Math.pow(1 - v, 2);
  return out.set(r * Math.cos(a) + 0.055 * lean, y, r * Math.sin(a) - 0.030 * lean);
}

// ---------------------------------------------------------------------------
export function buildMushroom(field, seed = 20260417) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  // Cap parts live in their own group lifted to CAP_Y; the stem is authored in
  // world coordinates so it can span from inside the cap down to the soil.
  const capGroup = new THREE.Group();
  capGroup.position.y = CAP_Y;
  capGroup.rotation.z = -0.055;
  capGroup.rotation.x = -0.075;
  group.add(capGroup);

  const U = 132, V = 30;
  const verts = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= V; j++) {
    const v = Math.pow(j / V, 0.92);
    for (let i = 0; i < U; i++) {
      const u = i / U;
      capPoint(u, v, p);
      // Jitter along the surface so the triangulation reads as grown rather
      // than extruded from a lathe.
      const jitter = 0.016 * (1 - Math.pow(1 - v, 2));
      verts.push(
        p.x + (rng() - 0.5) * jitter,
        p.y + (rng() - 0.5) * jitter * 0.55,
        p.z + (rng() - 0.5) * jitter
      );
    }
  }

  const idx = (i, j) => j * U + (i % U);

  // --- Cap shell: dark, opaque enough to occlude the far side ---------------
  const shellPos = [];
  const shellUv = [];
  for (let j = 0; j <= V; j++) {
    for (let i = 0; i < U; i++) {
      const o = idx(i, j) * 3;
      shellPos.push(verts[o], verts[o + 1], verts[o + 2]);
      shellUv.push(i / U, j / V);
    }
  }
  const shellIdx = [];
  for (let j = 0; j < V; j++) {
    for (let i = 0; i < U; i++) {
      const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
      shellIdx.push(a, c, b, b, c, d);
    }
  }
  const shellGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute('position', new THREE.Float32BufferAttribute(shellPos, 3));
  shellGeo.setAttribute('uv', new THREE.Float32BufferAttribute(shellUv, 2));
  shellGeo.setIndex(shellIdx);
  shellGeo.computeVertexNormals();

  const shellMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uReveal: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uReveal;
      varying vec2 vUv;
      varying vec3 vN;
      varying vec3 vView;
      void main() {
        float rad = vUv.y;
        float facing = abs(dot(normalize(vN), normalize(vView)));
        // Deep translucent bronze: dark enough to read as solid volume, warm
        // enough that the wireframe on top looks like it is lit from within.
        vec3 base = mix(vec3(0.0016, 0.0006, 0.00018), vec3(0.0075, 0.0026, 0.0006), rad);
        vec3 col = base * (0.22 + 0.78 * facing);
        gl_FragColor = vec4(col * uReveal, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
  capGroup.add(new THREE.Mesh(shellGeo, shellMat));

  // --- Cap web --------------------------------------------------------------
  // A lat-long wireframe reads as machinery: you see concentric rings and
  // radial spokes. The cap *is* a disc in (angle, radius), so sampling it with
  // blue noise and joining nearest neighbours gives a genuinely grown,
  // irregular web — which is what makes the reference look organic.
  const c = new THREE.Color();

  // Surface point for a sample in the unit parameter disc, lifted clear of the
  // shell so the web never z-fights with it.
  const onCap = (px, pz, lift) => {
    const v = Math.min(1, Math.hypot(px, pz));
    const a = Math.atan2(pz, px);
    const r = capRadius(v, a);
    const y = capHeight(v, a);
    const lean = Math.pow(1 - v, 2);
    return {
      v,
      p: new THREE.Vector3(
        r * Math.cos(a) + 0.055 * lean,
        y + lift,
        r * Math.sin(a) - 0.030 * lean
      ),
    };
  };

  /**
   * One layer of web. `tight` pulls the spacing in toward the margin, which is
   * where the reference's mesh gets densest.
   */
  const webLayer = ({ minDist, growth, k, lift, gain, opacity, size, hubRate, nodeGain }) => {
    const pts = sampleDisc({ radius: 1, minDist, growth, seed: seed + Math.round(minDist * 1e4) });
    const edges = knnEdges(pts, { k, trunkChance: 0.07, seed: seed + 91 });
    const surf = pts.map(([x, z]) => onCap(x, z, lift));

    const ePos = [], eCol = [], eSeed = [], eFlow = [];
    for (const [ia, ib] of edges) {
      const s = rng();
      const strength = 0.30 + 0.70 * rng() * rng();
      for (const q of [surf[ia], surf[ib]]) {
        ePos.push(q.p.x, q.p.y, q.p.z);
        // Coppery and dim over the crown, gold at the shoulder, white-hot as it
        // approaches the glowing margin.
        const t = Math.pow(q.v, 1.15);
        c.copy(PAL.amber).lerp(PAL.gold, t);
        if (q.v > 0.78) c.lerp(PAL.hot, (q.v - 0.78) / 0.22 * 0.9);
        const kk = strength * (0.62 + 1.55 * t);
        eCol.push(c.r * kk, c.g * kk, c.b * kk);
        eSeed.push(s);
        eFlow.push(q.v);
      }
    }
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute('position', new THREE.Float32BufferAttribute(ePos, 3));
    eGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(eCol, 3));
    eGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(eSeed, 1));
    eGeo.setAttribute('aFlow', new THREE.Float32BufferAttribute(eFlow, 1));
    capGroup.add(makeRibbons(field, { pos: ePos, col: eCol, seed: eSeed, flow: eFlow },
      { width: 0.0075, minPx: 1.9, softness: 1.5, opacity, gain: gain * 1.55 }));

    if (!size) return;
    const nPos = [], nCol = [], nSeed = [], nScale = [];
    for (const q of surf) {
      const hub = rng() < hubRate;
      if (!hub && rng() > 0.85) continue;
      nPos.push(q.p.x, q.p.y, q.p.z);
      c.copy(PAL.gold).lerp(PAL.hot, Math.pow(q.v, 1.6) * 0.95);
      const kk = (hub ? 2.6 : 0.8) * (0.30 + 1.25 * Math.pow(q.v, 1.2));
      nCol.push(c.r * kk, c.g * kk, c.b * kk);
      nSeed.push(rng());
      nScale.push(hub ? 1.15 + rng() * 0.45 : 0.50 + rng() * 0.35);
    }
    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute('position', new THREE.Float32BufferAttribute(nPos, 3));
    nGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(nCol, 3));
    nGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(nSeed, 1));
    nGeo.setAttribute('aScale', new THREE.Float32BufferAttribute(nScale, 1));
    capGroup.add(new THREE.Points(nGeo, field.point({ size, gain: nodeGain })));
  };

  // One crisp structural web. A second finer layer was tried and removed: at
  // this on-screen size it never resolved into filigree, it just fogged the
  // crown into a grey cloud.
  webLayer({ minDist: 0.072, growth: -0.20, k: 3, lift: 0.007,
             gain: 1.30, opacity: 0.96, size: 0.0082, hubRate: 0.17, nodeGain: 4.0 });

  // --- Gills ----------------------------------------------------------------
  // Dense radial strokes hugging the cap underside. These are the single most
  // recognisable feature of the reference, so they get their own pass.
  const gillPos = [], gillCol = [], gillSeed = [], gillFlow = [];
  const SEG = 26;
  for (let g = 0; g < N_GILLS; g++) {
    const a = (g / N_GILLS) * Math.PI * 2 + (rng() - 0.5) * 0.004;
    // Alternating lamellulae start further out, exactly as real gills do.
    const t0 = g % 2 === 0 ? 0.085 : 0.34 + rng() * 0.14;
    const s = rng();
    const bright = 0.55 + 0.75 * rng();
    let prev = null;
    for (let k = 0; k <= SEG; k++) {
      const t = t0 + (1 - t0) * (k / SEG);
      const rr = Math.max(STEM_TOP_R, capRadius(t, a) * 0.985);
      const thick = 0.062 * (1 - Math.pow(t, 0.55)) + 0.010;
      const yy = capHeight(t, a) - thick;
      const cur = [rr * Math.cos(a), yy, rr * Math.sin(a)];
      if (prev) {
        for (const [pt, tt] of [[prev, (k - 1) / SEG], [cur, k / SEG]]) {
          gillPos.push(pt[0], pt[1], pt[2]);
          // Hot where they converge on the stem, hot again at the bright rim,
          // slightly cooler through the middle of the fan.
          const heat = Math.min(1, 0.30 + 0.70 * Math.pow(tt, 1.7)
                                   + 0.60 * Math.pow(1 - tt, 3.2));
          // amber -> gold across the fan; only the convergence goes pale.
          c.copy(PAL.amber).lerp(PAL.gold, heat);
          if (tt < 0.10) c.lerp(PAL.hot, (0.10 - tt) / 0.10 * 0.7);
          const k2 = bright * (0.34 + 0.72 * heat);
          gillCol.push(c.r * k2, c.g * k2, c.b * k2);
          gillSeed.push(s);
          gillFlow.push(tt);
        }
      }
      prev = cur;
    }
  }
  const gillGeo = new THREE.BufferGeometry();
  gillGeo.setAttribute('position', new THREE.Float32BufferAttribute(gillPos, 3));
  gillGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(gillCol, 3));
  gillGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(gillSeed, 1));
  gillGeo.setAttribute('aFlow', new THREE.Float32BufferAttribute(gillFlow, 1));
  capGroup.add(makeRibbons(field, { pos: gillPos, col: gillCol, seed: gillSeed, flow: gillFlow },
    { width: 0.0072, minPx: 1.9, softness: 1.6, opacity: 0.94, gain: 3.30 }));

  // --- Bright margin ring ---------------------------------------------------
  const ringPos = [], ringCol = [], ringSeed = [], ringFlow = [];
  const RN = 420;
  for (let i = 0; i < RN; i++) {
    for (const q of [i, i + 1]) {
      const u = (q % RN) / RN;
      const a = u * Math.PI * 2;
      const rr = capRadius(1, a) * 0.995;
      ringPos.push(rr * Math.cos(a), capHeight(1, a) + 0.004, rr * Math.sin(a));
      // The rim catches the most light where it faces the viewer.
      const k = 1.0 + 1.35 * Math.max(0.0, Math.cos(a - 0.5));
      ringCol.push(PAL.hot.r * k, PAL.hot.g * k, PAL.hot.b * k);
      ringSeed.push(u);
      ringFlow.push(u);
    }
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringPos, 3));
  ringGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(ringCol, 3));
  ringGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(ringSeed, 1));
  ringGeo.setAttribute('aFlow', new THREE.Float32BufferAttribute(ringFlow, 1));
  capGroup.add(makeRibbons(field, { pos: ringPos, col: ringCol, seed: ringSeed, flow: ringFlow },
    { width: 0.0140, minPx: 2.8, softness: 1.3, opacity: 1.0, gain: 2.30 }));

  // --- Stem -----------------------------------------------------------------
  // Slender, waisted, twisting. Its top runs up *inside* the cap so the gill
  // fan lands on the stem's flank rather than floating above a gap.
  const stemRadius = (v) => {
    // v: 0 at the top (inside the cap), 1 at the soil.
    const waist = 0.044;
    const top = 0.058 * Math.pow(1 - v, 2.8);        // flare into the gills
    const base = 0.052 * Math.pow(smoothstep(0.86, 1.0, v), 1.8);
    return waist + top + base + 0.004 * Math.sin(v * 9.0);
  };
  const stemAxis = (v) => new THREE.Vector3(
    // Gentle S, leaning left through the waist then recovering.
    -0.085 * Math.sin(v * Math.PI * 0.92) - 0.030 * v,
    STEM_TOP_Y * (1 - v) + STEM_BASE_Y * v,
    0.045 * Math.sin(v * Math.PI * 0.7)
  );

  const SV = 90, SU = 46;
  const stemPos = [], stemUv = [];
  const sp = new THREE.Vector3();
  const stemVert = (i, j) => {
    const v = j / SV;
    const u = i / SU;
    const a = u * Math.PI * 2 + v * 2.1;             // twist
    const axis = stemAxis(v);
    const r = stemRadius(v) * (1 + 0.09 * Math.sin(6 * a) + 0.035 * Math.sin(13 * a));
    sp.set(axis.x + Math.cos(a) * r, axis.y, axis.z + Math.sin(a) * r);
    return sp;
  };
  for (let j = 0; j <= SV; j++) {
    for (let i = 0; i < SU; i++) {
      const q = stemVert(i, j);
      stemPos.push(q.x, q.y, q.z);
      stemUv.push(i / SU, j / SV);
    }
  }
  const sIdx = (i, j) => j * SU + (i % SU);
  const stemIdxArr = [];
  for (let j = 0; j < SV; j++) {
    for (let i = 0; i < SU; i++) {
      const a = sIdx(i, j), b = sIdx(i + 1, j), cc = sIdx(i, j + 1), d = sIdx(i + 1, j + 1);
      stemIdxArr.push(a, cc, b, b, cc, d);
    }
  }
  const stemGeo = new THREE.BufferGeometry();
  stemGeo.setAttribute('position', new THREE.Float32BufferAttribute(stemPos, 3));
  stemGeo.setAttribute('uv', new THREE.Float32BufferAttribute(stemUv, 2));
  stemGeo.setIndex(stemIdxArr);
  stemGeo.computeVertexNormals();
  group.add(new THREE.Mesh(stemGeo, shellMat));

  // Longitudinal filaments running the length of the stem.
  const filPos = [], filCol = [], filSeed = [], filFlow = [];
  const NF = 26;
  for (let f = 0; f < NF; f++) {
    const u0 = f / NF;
    const s = rng();
    const bright = 0.45 + 0.9 * rng();
    let prev = null;
    for (let j = 0; j <= SV; j++) {
      const v = j / SV;
      const q = stemVert(Math.round(u0 * SU + v * 3), j).clone();
      // Push filaments a hair off the shell so they never z-fight.
      const ax = stemAxis(v);
      q.x += (q.x - ax.x) * 0.03;
      q.z += (q.z - ax.z) * 0.03;
      if (prev) {
        for (const [pt, vv] of [[prev, (j - 1) / SV], [q, v]]) {
          filPos.push(pt.x, pt.y, pt.z);
          // Bright where it meets the gills, bright again in the root flare.
          const heat = Math.max(Math.pow(1 - vv, 3.4), Math.pow(vv, 4.0) * 0.7);
          c.copy(PAL.amber).lerp(PAL.hot, heat * 0.75);
          const k = bright * (0.32 + 0.55 * heat);
          filCol.push(c.r * k, c.g * k, c.b * k);
          filSeed.push(s);
          filFlow.push(vv);
        }
      }
      prev = q;
    }
  }
  const filGeo = new THREE.BufferGeometry();
  filGeo.setAttribute('position', new THREE.Float32BufferAttribute(filPos, 3));
  filGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(filCol, 3));
  filGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(filSeed, 1));
  filGeo.setAttribute('aFlow', new THREE.Float32BufferAttribute(filFlow, 1));
  group.add(makeRibbons(field, { pos: filPos, col: filCol, seed: filSeed, flow: filFlow },
    { width: 0.0080, minPx: 2.0, softness: 1.6, opacity: 0.85, gain: 2.40 }));

  return { group, capGroup, shellMat, stemAxis, stemRadius,
           base: new THREE.Vector3(stemAxis(1).x, 0.0, stemAxis(1).z) };
}

// ---------------------------------------------------------------------------
// Ground mycelium
// ---------------------------------------------------------------------------
export function groundHeight(x, z) {
  return 0.055 * Math.sin(x * 0.62 + 0.7) * Math.cos(z * 0.48)
       + 0.030 * Math.sin(x * 1.35 - z * 0.9 + 2.1)
       + 0.018 * Math.sin(x * 2.7 + z * 2.2);
}

export function buildNetwork(field, { radius = 17, minDist = 0.30, growth = 2.6, seed = 4242 } = {}) {
  const group = new THREE.Group();
  const rng = makeRng(seed + 7);

  const pts2 = sampleDisc({ radius, minDist, growth, seed });
  const edges = knnEdges(pts2, { k: 3, seed: seed + 1 });

  const pos = pts2.map(([x, z]) => new THREE.Vector3(x, groundHeight(x, z), z));
  const c = new THREE.Color();

  // Density and brightness both fall off with distance, so the network melts
  // into black at the frame edges instead of ending abruptly.
  const falloff = (r) => Math.exp(-r * 0.108) * (0.44 + 0.56 * Math.exp(-r * 0.20));

  // Low-frequency richness field: without it the even spacing reads as tiling.
  const richness = (x, z) =>
    0.42 + 0.58 * Math.min(1, Math.max(0,
      0.5 + 0.34 * Math.sin(x * 0.55 + 1.3) * Math.cos(z * 0.47 - 0.4)
          + 0.24 * Math.sin(x * 1.15 - z * 0.83 + 2.6)
          + 0.16 * Math.sin(x * 2.3 + z * 1.9)));

  // --- Edges ---------------------------------------------------------------
  const ePos = [], eCol = [], eSeed = [], eFlow = [];
  for (const [a, b] of edges) {
    const A = pos[a], B = pos[b];
    const s = rng();
    const strength = 0.20 + 0.95 * rng() * rng();
    for (const [P, t] of [[A, 0], [B, 1]]) {
      const r = Math.hypot(P.x, P.z);
      const f = falloff(r) * strength * richness(P.x, P.z);
      c.copy(PAL.amber).lerp(PAL.gold, 0.35 + 0.5 * rng());
      ePos.push(P.x, P.y, P.z);
      eCol.push(c.r * f, c.g * f, c.b * f);
      eSeed.push(s);
      eFlow.push(t + s);
    }
  }
  const eGeo = new THREE.BufferGeometry();
  eGeo.setAttribute('position', new THREE.Float32BufferAttribute(ePos, 3));
  eGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(eCol, 3));
  eGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(eSeed, 1));
  eGeo.setAttribute('aFlow', new THREE.Float32BufferAttribute(eFlow, 1));
  group.add(makeRibbons(field, { pos: ePos, col: eCol, seed: eSeed, flow: eFlow },
    { width: 0.0105, minPx: 2.1, softness: 1.6, opacity: 0.95, gain: 1.60 }));

  // --- Nodes ---------------------------------------------------------------
  const nPos = [], nCol = [], nSeed = [], nScale = [];
  for (const P of pos) {
    const r = Math.hypot(P.x, P.z);
    const f = falloff(r);
    const big = rng() < 0.045;
    c.copy(big ? PAL.hot : PAL.gold);
    const k = f * richness(P.x, P.z) * (big ? 1.9 : 0.62);
    nPos.push(P.x, P.y, P.z);
    nCol.push(c.r * k, c.g * k, c.b * k);
    nSeed.push(rng());
    nScale.push(big ? 1.25 + rng() * 0.5 : 0.55 + rng() * 0.35);
  }
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute('position', new THREE.Float32BufferAttribute(nPos, 3));
  nGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(nCol, 3));
  nGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(nSeed, 1));
  nGeo.setAttribute('aScale', new THREE.Float32BufferAttribute(nScale, 1));
  group.add(new THREE.Points(nGeo, field.point({ size: 0.0062, gain: 2.10 })));

  return { group, nodes: pos, count: pos.length, edgeCount: edges.length };
}

/**
 * Ties the stem base into the surrounding network with curved runners, so the
 * mushroom grows *out of* the mesh rather than sitting on top of it.
 */
export function buildRootLinks(field, network, base, { count = 30, reach = 3.4, minReach = 0.35, seed = 8 } = {}) {
  const rng = makeRng(seed);
  const near = network.nodes
    .map((p, i) => [i, Math.hypot(p.x - base.x, p.z - base.z)])
    .filter(([, d]) => d > minReach && d < reach)
    .sort((a, b) => a[1] - b[1])
    .slice(0, count * 3);

  const pos = [], col = [], seeds = [], flow = [];
  const c = new THREE.Color();
  const tmp = new THREE.Vector3();

  for (let i = 0; i < Math.min(count, near.length); i++) {
    const target = network.nodes[near[Math.floor(rng() * near.length)][0]];
    const s = rng();
    const bright = 0.6 + 0.8 * rng();
    const mid = new THREE.Vector3(
      (base.x + target.x) * 0.5 + (rng() - 0.5) * 0.5,
      Math.max(base.y, target.y) + 0.06 + rng() * 0.05,
      (base.z + target.z) * 0.5 + (rng() - 0.5) * 0.5
    );
    const curve = new THREE.QuadraticBezierCurve3(base.clone(), mid, target.clone());
    const N = 14;
    let prev = null;
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      curve.getPoint(t, tmp);
      const cur = tmp.clone();
      if (prev) {
        for (const [P, tt] of [[prev, (k - 1) / N], [cur, t]]) {
          pos.push(P.x, P.y, P.z);
          c.copy(PAL.hot).lerp(PAL.amber, tt);
          const k2 = bright * (1.0 - 0.55 * tt);
          col.push(c.r * k2, c.g * k2, c.b * k2);
          seeds.push(s);
          flow.push(tt);
        }
      }
      prev = cur;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  geo.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 1));
  return makeRibbons(field, { pos, col, seed: seeds, flow },
    { width: 0.0125, minPx: 2.4, softness: 1.5, opacity: 1.0, gain: 1.05 });
}

/**
 * Spore drift. Two populations: a dense spray shearing off the cap's downwind
 * edge (the dissolving-mesh motif) and sparse motes floating through the air.
 */
export function buildSpores(field, { seed = 555 } = {}) {
  const rng = makeRng(seed);
  const pos = [], col = [], seeds = [], scale = [], drift = [];
  const c = new THREE.Color();

  // Cap spray. This must read as discrete motes shearing *off* the margin —
  // an earlier version started inside the cap radius and turned the crown into
  // a grey cloud. Every spore now begins outside the rim and travels outward.
  for (let i = 0; i < 520; i++) {
    const t = Math.pow(rng(), 0.75);                 // 0 at the rim -> 1 far out
    const a = (rng() - 0.5) * 1.25 - 0.10;           // tight arc facing +x
    const spread = 0.05 + t * 0.85;
    const r = capRadius(1.0, a) * 1.02 + 0.04 + t * 1.55;
    const y = CAP_Y + capHeight(1.0, a) + (rng() - 0.5) * spread * 0.9 + t * 0.30;
    pos.push(r * Math.cos(a) + t * 0.35, y, r * Math.sin(a) * 0.85 + (rng() - 0.5) * spread);
    c.copy(PAL.gold).lerp(PAL.hot, rng() * 0.85);
    const k = Math.pow(1 - t, 1.4) * (0.9 + 1.9 * rng());
    col.push(c.r * k, c.g * k, c.b * k);
    seeds.push(rng());
    scale.push(0.35 + rng() * 0.55);
    drift.push(0.4 + rng());
  }

  // Ambient motes. Kept clear of the cap's silhouette — anything drifting in
  // front of the crown reads as fog, not as spores.
  for (let i = 0; i < 240; i++) {
    const a = rng() * Math.PI * 2;
    const r = 2.2 + Math.pow(rng(), 0.6) * 9.5;
    pos.push(Math.cos(a) * r, rng() * 2.2 - 0.05, Math.sin(a) * r);
    c.copy(PAL.gold).lerp(PAL.hot, rng() * 0.5);
    const k = 0.10 + 0.45 * rng() * rng();
    col.push(c.r * k, c.g * k, c.b * k);
    seeds.push(rng());
    scale.push(0.2 + rng() * 0.8);
    drift.push(0.2 + rng() * 0.7);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  geo.setAttribute('aScale', new THREE.Float32BufferAttribute(scale, 1));
  geo.setAttribute('aDrift', new THREE.Float32BufferAttribute(drift, 1));

  const mat = field.point({ size: 0.0046, gain: 0.90 });
  // Spores need to actually move, so extend the shared point vertex shader.
  mat.vertexShader = mat.vertexShader.replace(
    'vec4 wp = modelMatrix * vec4(position, 1.0);',
    `vec3 sp = position;
     sp.x += sin(uTime * 0.19 * aDrift + aSeed * 30.0) * 0.16 * aDrift;
     sp.y += sin(uTime * 0.24 * aDrift + aSeed * 55.0) * 0.11 * aDrift
           + mod(uTime * 0.035 * aDrift + aSeed, 1.0) * 0.25;
     sp.z += cos(uTime * 0.17 * aDrift + aSeed * 41.0) * 0.16 * aDrift;
     vec4 wp = modelMatrix * vec4(sp, 1.0);`
  ).replace('attribute float aScale;', 'attribute float aScale;\nattribute float aDrift;');

  return new THREE.Points(geo, mat);
}
