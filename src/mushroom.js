import * as THREE from 'three';
import { COMMON, BASE_VERT, VERT_VARYINGS } from './glsl.js';
import { parametricSurface, variableTube, makeRng } from './geometry.js';
import { bakePattern, CAP_PATTERN, stemPattern } from './bake.js';

// ---------------------------------------------------------------------------
// Proportions, measured off the reference frame.
//
//   cap radius                    1.00  (the unit for everything else)
//   cap height / cap radius       0.95
//   stem length / cap radius      2.25
//   stem waist radius             0.15
// ---------------------------------------------------------------------------
const CAP_R = 1.0;
const CAP_H = 0.80;
const CAP_THETA_MAX = 1.82;   // >pi/2, so the margin genuinely tucks under
const CAP_FLARE = 1.34;       // >1 narrows the crown into a bell
const N_GILLS = 116;
// Gills are decurrent — the sheet funnels down and in from the margin, which
// is why the convergence at the stem is the lowest and hottest point.
const GILL_DROP = 0.30;
const STEM_TOP_R = 0.125;
const CAP_BASE_Y = 3.05;      // world Y of the cap group's origin
const STRAND_COUNT = 8;
const STEM_TWIST = 1.05;      // turns of the braid over the stem length

const RIM_Y = CAP_H * Math.cos(CAP_THETA_MAX);
const JUNCTION_Y = RIM_Y - GILL_DROP;          // cap-local
const STEM_TOP = CAP_BASE_Y + JUNCTION_Y;      // world Y where stem meets gills

export const LAYOUT = {
  capApexY: CAP_BASE_Y + CAP_H,
  rimY: CAP_BASE_Y + RIM_Y,
  stemTopY: STEM_TOP,
};

const rng = makeRng(20260417);

// Wavy, lobed margin — the reference cap is anything but a clean parasol.
function marginWobble(a) {
  return 1.0
    + 0.078 * Math.sin(3.0 * a + 0.7)
    + 0.046 * Math.sin(5.0 * a + 2.1)
    + 0.026 * Math.sin(8.0 * a - 1.2);
}
function marginLift(a) {
  return 0.62 * Math.sin(3.0 * a + 1.9) + 0.38 * Math.sin(5.0 * a - 0.4);
}

// Shared so the top surface and the gill sheet meet exactly at the rim.
function capTopProfile(u, v, out) {
  const a = u * Math.PI * 2;
  const th = Math.pow(v, 0.88) * CAP_THETA_MAX;
  const wob = 1.0 + (marginWobble(a) - 1.0) * v * v;
  const r = CAP_R * Math.pow(Math.sin(th), CAP_FLARE) * wob;
  // Broad asymmetric lumps over the crown.
  const lump = 1.0
    + 0.034 * Math.sin(2.0 * a + 0.4) * Math.sin(v * Math.PI)
    + 0.022 * Math.sin(4.0 * a - 1.1) * Math.sin(v * Math.PI);
  const y = CAP_H * Math.cos(th) * lump + CAP_H * 0.165 * marginLift(a) * v * v;
  const lean = Math.pow(1.0 - v, 2.0);
  out.set(r * Math.cos(a) + 0.075 * lean, y, r * Math.sin(a) - 0.030 * lean);
  return out;
}

// Gill sheet: v = 0 at the margin, v = 1 at the stem.
const _rim = new THREE.Vector3();
function capUnderProfile(u, v, out) {
  const a = u * Math.PI * 2;
  capTopProfile(u, 1.0, _rim);
  const rimR = Math.hypot(_rim.x, _rim.z);
  const rimY = _rim.y;
  const k = Math.pow(v, 0.80);
  const r = rimR * (1.0 - k) + STEM_TOP_R * k;
  const y = rimY - GILL_DROP * Math.pow(v, 1.30)
            + 0.055 * Math.sin(v * Math.PI) * CAP_H;   // slight concavity
  out.set(r * Math.cos(a), y, r * Math.sin(a));
  return out;
}

export function buildMushroom(uniformsTime, renderer) {
  const group = new THREE.Group();
  const capGroup = new THREE.Group();

  const capTex = bakePattern(renderer, 2048, 1024, CAP_PATTERN);
  const stemTex = bakePattern(renderer, 1024, 2048, stemPattern(STEM_TWIST));

  // -------------------------------------------------------------------------
  // Cap — outer surface
  // -------------------------------------------------------------------------
  const capMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniformsTime,
      uIntensity: { value: 1.0 },
      uPattern: { value: capTex },
    },
    vertexShader: BASE_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${VERT_VARYINGS}
      uniform float uTime;
      uniform float uIntensity;
      uniform sampler2D uPattern;

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(vViewDir);
        float rad = vUv.y;                  // 0 apex -> 1 margin

        vec4 pat = texture2D(uPattern, vUv);
        float primary   = pat.r;
        float capillary = pat.g;
        float mottle    = pat.b;
        float grain     = pat.a;

        // Flesh: dark, wet bronze, well under the bloom threshold. Only the
        // filaments are allowed to glow.
        float fleshT = 0.05 + 0.11 * mottle + 0.09 * pow(rad, 2.4);
        vec3 col = emberRamp(fleshT) * (0.18 + 0.26 * grain) * formShade(N, 0.16);

        // Light escaping from the gills where the flesh is thinnest.
        float thin = pow(rad, 3.6);
        col += emberRamp(0.46 + 0.20 * thin) * thin * (0.55 + 0.45 * mottle) * 0.11;

        // The filament network — the signature of the reference image.
        float radial = 0.46 + 0.54 * smoothstep(0.03, 0.46, rad);
        float veinMask = (pow(primary, 2.4) * 1.10 + pow(capillary, 2.8) * 0.55) * radial;
        veinMask *= 0.42 + 0.85 * mottle;
        float pulse = 0.87 + 0.13 * sin(uTime * 0.8 + mottle * 9.0 + rad * 4.0);
        col += emberRamp(0.60 + 0.26 * grain) * veinMask * 0.88 * pulse;

        // Wet cuticle: a tight sheen plus a narrow warm rim.
        float sheen = specular(N, V, 60.0);
        col += vec3(1.0, 0.62, 0.26) * sheen * 0.85;
        col += vec3(1.0, 0.50, 0.16) * specular(N, V, 8.0) * 0.030;
        col += emberRamp(0.54) * fresnel(N, V, 4.0) * 0.090;

        // Micro sparkle in the wet film.
        float sp = pow(grain, 12.0) * pow(mottle, 3.0);
        col += vec3(1.0, 0.78, 0.42) * sp * 2.6 * (0.30 + sheen);

        // Dark cuticle band at the very margin — the crisp line that separates
        // the cap from the blazing gills.
        float band = smoothstep(0.86, 0.98, rad) * (1.0 - smoothstep(0.98, 1.0, rad));
        col *= 1.0 - 0.82 * band;

        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
  capGroup.add(new THREE.Mesh(parametricSurface(capTopProfile, 288, 80), capMat));

  // -------------------------------------------------------------------------
  // Gills — a corrugated sheet, so the blades are real geometry catching real
  // specular rather than painted stripes.
  // -------------------------------------------------------------------------
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const gillGeo = parametricSurface((u, v, out) => {
    capUnderProfile(u, v, out);

    // Displace along the profile normal so blades hang correctly even where
    // the sheet is steep.
    const eps = 0.004;
    capUnderProfile(u, Math.min(1.0, v + eps), tmpA);
    capUnderProfile(u, Math.max(0.0, v - eps), tmpB);
    const r0 = Math.hypot(tmpB.x, tmpB.z);
    const r1 = Math.hypot(tmpA.x, tmpA.z);
    let nr = tmpA.y - tmpB.y;
    let ny = -(r1 - r0);
    const nl = Math.hypot(nr, ny) || 1.0;
    nr /= nl; ny /= nl;
    if (ny > 0.0) { nr = -nr; ny = -ny; }

    const a = u * Math.PI * 2;
    const blade = 0.5 + 0.5 * Math.cos(N_GILLS * a);
    // Alternate gills are lamellulae: they stop short of the stem, which is
    // what keeps the convergence from reading as a solid fan.
    const isShort = Math.cos(N_GILLS * a * 0.5) <= 0;
    const reach = isShort ? Math.max(0.0, 1.0 - Math.pow(v / 0.72, 3.0)) : 1.0;
    const amp = 0.060 * Math.pow(1.0 - v, 0.45)
              * Math.min(1.0, v / 0.030)      // seal to the rim
              * (1.0 - Math.pow(v, 6.0))      // and to the stem
              * (0.55 + 0.45 * reach);
    const rr = Math.hypot(out.x, out.z);
    const dr = nr * amp * blade;
    const scale = rr > 1e-6 ? (rr + dr) / rr : 1.0;
    out.x *= scale;
    out.z *= scale;
    out.y += ny * amp * blade;
  }, 928, 60);

  const gillMat = new THREE.ShaderMaterial({
    uniforms: { uTime: uniformsTime, uIntensity: { value: 1.0 } },
    vertexShader: BASE_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${VERT_VARYINGS}
      uniform float uTime;
      uniform float uIntensity;

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(vViewDir);
        float v = vUv.y;                  // 0 margin -> 1 stem

        // Position across one gill: 0 in the valley, 1 on the blade crest.
        float s = fract(vUv.x * float(${N_GILLS}));
        float blade = sin(s * PI);
        float edge = pow(blade, 0.45);
        float valley = pow(1.0 - blade, 2.0);

        // Alternating short gills, matching the geometry above.
        float isLong = step(0.0, cos(vUv.x * float(${N_GILLS}) * PI));
        float shortFade = mix(1.0 - smoothstep(0.52, 0.80, v), 1.0, isLong);

        // Brightness climbs from the margin to a broad hot band around the
        // stem, then peaks at the convergence itself.
        float core = pow(v, 2.4);
        float band = smoothstep(0.28, 0.80, v);
        float heat = 0.30 + 0.30 * band + 0.20 * core;

        // Fine lengthwise striation along each blade.
        float striate = fbm(vec3(vUv.x * 520.0, v * 16.0, 0.0), 3);
        heat += 0.09 * (striate - 0.5);

        vec3 col = emberRamp(heat) * (0.30 + 0.62 * edge);

        // Self-shadowing between blades.
        col *= 1.0 - 0.88 * valley * (0.25 + 0.75 * (1.0 - core));
        col *= mix(0.42, 1.0, shortFade);

        // Specular crest along each blade.
        col += emberRamp(0.86) * pow(blade, 11.0) * (0.18 + 0.90 * v) * 0.42
             * (0.6 + 2.0 * specular(N, V, 20.0));

        // Cross-veining between blades, a real feature of decurrent gills.
        float cross = smoothstep(0.72, 1.0, fbm(vec3(vUv.x * 190.0, v * 40.0, 7.0), 3));
        col += emberRamp(0.74) * cross * valley * 0.30 * v;

        // Hot halo where every gill meets the stem.
        col += emberRamp(0.94) * pow(v, 3.4) * 0.72;

        // Fade into shadow toward the margin.
        col *= 0.09 + 0.91 * smoothstep(0.04, 0.46, v);

        col += emberRamp(0.82) * fresnel(N, V, 2.6) * 0.14;

        float pulse = 0.93 + 0.07 * sin(uTime * 0.9 + v * 5.0);
        gl_FragColor = vec4(col * uIntensity * 0.92 * pulse, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
  capGroup.add(new THREE.Mesh(gillGeo, gillMat));

  capGroup.position.y = CAP_BASE_Y;
  capGroup.rotation.z = -0.10;   // right margin drops
  capGroup.rotation.x = -0.42;   // brim lifted at the front, opening the gills
                                 // toward a camera that sits below the rim
  group.add(capGroup);

  // -------------------------------------------------------------------------
  // Stem — braided fibre bundle on a sinuous spine
  // -------------------------------------------------------------------------
  const L = STEM_TOP;
  const spine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.020, L + 0.20, 0.0),
    new THREE.Vector3(-0.035, L * 0.82, 0.030),
    new THREE.Vector3(-0.115, L * 0.62, 0.058),
    new THREE.Vector3(-0.170, L * 0.44, 0.042),
    new THREE.Vector3(-0.140, L * 0.26, -0.010),
    new THREE.Vector3(-0.105, L * 0.11, -0.032),
    new THREE.Vector3(-0.080, 0.0, -0.026),
  ], false, 'catmullrom', 0.5);

  const radiusStops = [
    [0.00, 0.108], [0.06, 0.146], [0.16, 0.152], [0.30, 0.147],
    [0.44, 0.142], [0.58, 0.147], [0.72, 0.158], [0.84, 0.182],
    [0.93, 0.224], [1.00, 0.305],
  ];
  function stemRadius(v) {
    for (let i = 0; i < radiusStops.length - 1; i++) {
      const [a, ra] = radiusStops[i];
      const [b, rb] = radiusStops[i + 1];
      if (v <= b) {
        const t = (v - a) / (b - a);
        return ra + (rb - ra) * (t * t * (3 - 2 * t));
      }
    }
    return radiusStops[radiusStops.length - 1][1];
  }

  const stemGeo = variableTube(spine, 280, 112, stemRadius, (u, v) => {
    const a = u * Math.PI * 2;
    const tw = STEM_TWIST * v * Math.PI * 2;
    let m = 1.0;
    m += 0.108 * Math.sin(STRAND_COUNT * a + tw);
    m += 0.046 * Math.sin(17.0 * a + 2.1 * tw + 1.3);
    m += 0.020 * Math.sin(31.0 * a - 1.4 * tw);
    m *= 1.0 + 0.045 * Math.sin(v * 13.0 + 0.6);
    return m;
  });

  const stemMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: uniformsTime,
      uIntensity: { value: 1.0 },
      uPattern: { value: stemTex },
    },
    vertexShader: BASE_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${VERT_VARYINGS}
      uniform float uTime;
      uniform float uIntensity;
      uniform sampler2D uPattern;

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(vViewDir);
        float v = vUv.y;                   // 0 under the cap -> 1 at the soil

        vec4 pat = texture2D(uPattern, vUv);
        float fibres = pat.r;
        float hairs  = pat.g;
        float mottle = pat.b;
        float grain  = pat.a;

        // Occlusion in the grooves between braided strands. Without this the
        // twist flattens into a slab.
        float ang = vUv.x * 2.0 * PI + ${STEM_TWIST.toFixed(3)} * v * 2.0 * PI;
        float groove = 0.5 + 0.5 * sin(float(${STRAND_COUNT}) * ang);
        float ao = 0.26 + 0.74 * pow(groove, 0.62);

        // Incandescent under the cap, cooling through the waist, warming again
        // where it enters the mycelium.
        float glowTop = pow(1.0 - v, 4.2) * 1.15;
        float glowBase = smoothstep(0.74, 1.0, v) * 0.42;
        float base = 0.09 + 0.11 * mottle + glowTop + glowBase;

        vec3 col = emberRamp(base) * (0.20 + 0.26 * grain) * formShade(N, 0.13);

        float fibreMask = (pow(fibres, 1.5) * 1.25 + pow(hairs, 1.8) * 0.70) * (0.40 + 0.65 * grain);
        float pulse = 0.88 + 0.12 * sin(uTime * 0.75 - v * 6.5 + mottle * 8.0);
        col += emberRamp(0.55 + 0.32 * glowTop + 0.20 * glowBase)
             * fibreMask * (0.62 + 1.05 * glowTop) * pulse;

        col *= ao;

        // Translucent edges.
        float fres = fresnel(N, V, 3.2);
        col += emberRamp(0.50 + 0.30 * glowTop) * fres * (0.16 + 0.52 * glowTop);

        // Wet highlight running down the braid.
        float sheen = specular(N, V, 38.0);
        col += vec3(1.0, 0.56, 0.20) * sheen * (0.16 + 0.34 * fibreMask);

        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
  group.add(new THREE.Mesh(stemGeo, stemMat));

  // -------------------------------------------------------------------------
  // Mycelium — thick roots as tubes, fine hyphae as additive lines
  // -------------------------------------------------------------------------
  const rootMat = new THREE.ShaderMaterial({
    uniforms: { uTime: uniformsTime, uIntensity: { value: 1.0 } },
    vertexShader: BASE_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${VERT_VARYINGS}
      uniform float uTime;
      uniform float uIntensity;
      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(vViewDir);
        float v = vUv.y;                       // 0 at the base -> 1 at the tip
        float grain = fbm(vPos * 26.0, 3);
        float fade = pow(1.0 - v, 1.5);
        float heat = 0.26 + 0.40 * fade + 0.18 * grain;
        vec3 col = emberRamp(heat) * (0.34 + 0.45 * grain) * formShade(N, 0.30);
        col += emberRamp(0.70) * fresnel(N, V, 2.4) * (0.14 + 0.42 * fade);
        col += vec3(1.0, 0.56, 0.22) * specular(N, V, 26.0) * 0.20;
        float pulse = 0.85 + 0.15 * sin(uTime * 1.1 - v * 9.0 + grain * 12.0);
        gl_FragColor = vec4(col * uIntensity * 0.62 * pulse, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });

  const roots = new THREE.Group();
  const BASE = new THREE.Vector3(-0.08, 0.02, -0.026);

  function rootCurve(azimuth, len, seedWander) {
    const pts = [];
    const steps = 5;
    let ang = azimuth;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      ang += (rng() - 0.5) * seedWander;
      const r = len * Math.pow(t, 0.78);
      const drop = -0.060 * Math.pow(t, 0.6) - 0.02 * t;
      pts.push(new THREE.Vector3(
        BASE.x + Math.cos(ang) * r,
        BASE.y + drop + (i === 0 ? 0.03 : 0) + Math.sin(t * 5.0 + azimuth) * 0.012,
        BASE.z + Math.sin(ang) * r * 0.72
      ));
    }
    return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  }

  const primaries = [];
  for (let i = 0; i < 34; i++) {
    const az = (i / 34) * Math.PI * 2 + rng() * 0.40;
    // Runners heading left/right read best against a low camera; bias length
    // toward the lateral directions.
    const lateral = Math.abs(Math.cos(az));
    const len = 0.30 + (0.45 + 1.75 * lateral) * (0.35 + 0.65 * rng());
    const c = rootCurve(az, len, 0.30);
    primaries.push({ curve: c, az, len });
    const r0 = 0.009 + rng() * 0.006;
    roots.add(new THREE.Mesh(
      variableTube(c, 30, 8, (v) => r0 * Math.pow(1.0 - v, 0.85) + 0.0014, null),
      rootMat
    ));
  }
  group.add(roots);

  // Fine hyphae: thin additive strands fanning across the crust.
  const hyphaePos = [];
  const hyphaeCol = [];
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  for (let i = 0; i < 760; i++) {
    const parent = primaries[Math.floor(rng() * primaries.length)];
    const t0 = 0.12 + rng() * 0.7;
    parent.curve.getPointAt(t0, tmp);
    let az = parent.az + (rng() - 0.5) * 2.0;
    const len = 0.05 + rng() * 0.62;
    const segs = 6;
    const cur = tmp.clone();
    for (let s = 0; s < segs; s++) {
      az += (rng() - 0.5) * 0.55;
      const step = len / segs;
      tmp2.set(
        cur.x + Math.cos(az) * step,
        cur.y - 0.004 * s + (rng() - 0.5) * 0.012,
        cur.z + Math.sin(az) * step * 0.7
      );
      hyphaePos.push(cur.x, cur.y, cur.z, tmp2.x, tmp2.y, tmp2.z);
      const f0 = 1.0 - s / segs;
      const f1 = 1.0 - (s + 1) / segs;
      const bright = 0.40 + 0.75 * rng();
      for (const f of [f0, f1]) {
        const k = Math.pow(f, 1.3) * bright;
        hyphaeCol.push(1.0 * k, (0.42 + 0.24 * f) * k, (0.07 + 0.12 * f) * k);
      }
      cur.copy(tmp2);
    }
  }
  const hyphaeGeo = new THREE.BufferGeometry();
  hyphaeGeo.setAttribute('position', new THREE.Float32BufferAttribute(hyphaePos, 3));
  hyphaeGeo.setAttribute('color', new THREE.Float32BufferAttribute(hyphaeCol, 3));
  const hyphae = new THREE.LineSegments(hyphaeGeo, new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  group.add(hyphae);

  return {
    group,
    capGroup,
    materials: { capMat, gillMat, stemMat, rootMat },
    textures: { capTex, stemTex },
    gillCenter: new THREE.Vector3(0, STEM_TOP + 0.10, 0),
  };
}

// ---------------------------------------------------------------------------
// Soil — a low, crumbling crust that swallows the light at its edges.
// ---------------------------------------------------------------------------
export function buildSoil(uniformsTime) {
  const geo = new THREE.IcosahedronGeometry(1, 6);
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();

  function n3(x, y, z) {
    const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return s - Math.floor(s);
  }
  function smoothN(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const c = (i, j, k) => n3(xi + i, yi + j, zi + k);
    const lerp = (a, b, t) => a + (b - a) * t;
    return lerp(
      lerp(lerp(c(0,0,0), c(1,0,0), u), lerp(c(0,1,0), c(1,1,0), u), v),
      lerp(lerp(c(0,0,1), c(1,0,1), u), lerp(c(0,1,1), c(1,1,1), u), v), w);
  }
  function fbmC(x, y, z) {
    let a = 0.5, s = 0;
    for (let i = 0; i < 5; i++) { s += a * smoothN(x, y, z); x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5; }
    return s;
  }

  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const d = 0.72 + 0.55 * fbmC(p.x * 3.1 + 13.0, p.y * 3.1 + 41.0, p.z * 3.1 + 7.0)
                   + 0.24 * fbmC(p.x * 12.0, p.y * 12.0, p.z * 12.0);
    p.multiplyScalar(d);
    p.x *= 2.10; p.y *= 0.26; p.z *= 1.30;
    // Sunk, so the mycelium lies on top of the crust rather than inside it.
    pos.setXYZ(i, p.x, p.y - 0.30, p.z);
  }
  geo.computeVertexNormals();

  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: uniformsTime },
    vertexShader: BASE_VERT,
    fragmentShader: /* glsl */ `
      ${COMMON}
      ${VERT_VARYINGS}
      uniform float uTime;
      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(vViewDir);
        float grain = fbm(vPos * 22.0, 4);
        float coarse = fbm(vPos * 5.0, 3);

        // Bounce from the mushroom, falling off fast with distance.
        float d = length(vec2(vPos.x, vPos.z * 1.35));
        float bounce = exp(-d * 1.55) * max(N.y, 0.0);

        vec3 col = vec3(0.018, 0.009, 0.005) * (0.35 + 1.0 * coarse);
        col += emberRamp(0.30 + 0.25 * grain) * bounce * 0.30;
        col += vec3(1.0, 0.46, 0.14) * specular(N, V, 30.0) * bounce * 0.55;

        // Sparse warm glints on wet grit.
        float glint = pow(vnoise(vPos * 95.0), 26.0);
        col += vec3(1.0, 0.58, 0.22) * glint * 2.4 * exp(-d * 1.1);

        // Swallow the edges into black.
        col *= exp(-max(d - 0.55, 0.0) * 1.9);
        col *= 0.35 + 0.65 * smoothstep(-0.45, 0.10, vPos.y);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  return new THREE.Mesh(geo, mat);
}

// ---------------------------------------------------------------------------
// Additive billboards standing in for volumetric light around the hot spots.
// ---------------------------------------------------------------------------
export function makeGlowSprite(color, size, power) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPower: { value: power },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uPower;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float a = pow(max(1.0 - d, 0.0), uPower);
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  s.renderOrder = 10;
  return s;
}
