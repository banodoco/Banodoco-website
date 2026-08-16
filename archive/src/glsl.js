// Shared GLSL chunks: hashes, value-noise fbm, 3D voronoi (for the mycelial
// vein network), the warm emission ramp, and a tiny analytic key-light rig.
// Everything the subject needs is self-luminous, so no scene lights are used.

export const COMMON = /* glsl */ `
  #define PI 3.14159265359

  float hash13(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  vec3 hash33(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
  }

  float vnoise(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash13(p + vec3(0,0,0)), hash13(p + vec3(1,0,0)), f.x),
                   mix(hash13(p + vec3(0,1,0)), hash13(p + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash13(p + vec3(0,0,1)), hash13(p + vec3(1,0,1)), f.x),
                   mix(hash13(p + vec3(0,1,1)), hash13(p + vec3(1,1,1)), f.x), f.y), f.z);
  }

  float fbm(vec3 p, int oct) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 6; i++) {
      if (i >= oct) break;
      s += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return s;
  }

  // Returns (F1, F2). F2 - F1 is small on cell borders, which is what draws
  // the filament network.
  vec2 voronoi(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);
    float f1 = 1e9, f2 = 1e9;
    for (int k = -1; k <= 1; k++)
    for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec3 b = vec3(float(i), float(j), float(k));
      vec3 r = b + hash33(p + b) - f;
      float d = dot(r, r);
      if (d < f1) { f2 = f1; f1 = d; }
      else if (d < f2) { f2 = d; }
    }
    return vec2(sqrt(f1), sqrt(f2));
  }

  // Bright thin lines along cell boundaries, layered over two scales so the
  // network has both trunks and capillaries.
  float veinNetwork(vec3 p, float w) {
    vec2 v1 = voronoi(p);
    float a = 1.0 - smoothstep(0.0, w, v1.y - v1.x);
    vec2 v2 = voronoi(p * 2.35 + 41.7);
    float b = 1.0 - smoothstep(0.0, w * 1.6, v2.y - v2.x);
    return clamp(a + b * 0.55, 0.0, 1.0);
  }

  // Deep ember -> amber -> orange -> gold -> hot white. Blue is kept very low
  // right up to the top of the ramp; that is what keeps the highlights amber
  // instead of bleaching to cream.
  vec3 emberRamp(float t) {
    t = clamp(t, 0.0, 1.0);
    const vec3 c0 = vec3(0.035, 0.009, 0.002);
    const vec3 c1 = vec3(0.220, 0.050, 0.007);
    const vec3 c2 = vec3(0.700, 0.180, 0.016);
    const vec3 c3 = vec3(1.000, 0.360, 0.040);
    const vec3 c4 = vec3(1.000, 0.620, 0.150);
    const vec3 c5 = vec3(1.000, 0.880, 0.520);
    if (t < 0.2)  return mix(c0, c1, smoothstep(0.0, 0.2, t));
    if (t < 0.42) return mix(c1, c2, smoothstep(0.2, 0.42, t));
    if (t < 0.64) return mix(c2, c3, smoothstep(0.42, 0.64, t));
    if (t < 0.84) return mix(c3, c4, smoothstep(0.64, 0.84, t));
    return mix(c4, c5, smoothstep(0.84, 1.0, t));
  }

  // Single soft key from upper-front-left, matching the sheen on the cap.
  const vec3 KEY_DIR = vec3(-0.40, 0.72, 0.57);

  float specular(vec3 N, vec3 V, float power) {
    vec3 L = normalize(KEY_DIR);
    vec3 H = normalize(L + V);
    return pow(max(dot(N, H), 0.0), power);
  }

  float fresnel(vec3 N, vec3 V, float power) {
    return pow(1.0 - clamp(dot(N, V), 0.0, 1.0), power);
  }

  // Wrapped diffuse. A purely emissive body reads flat; modulating the flesh
  // (never the filaments) by this restores the sense of a rounded solid.
  float formShade(vec3 N, float floorLevel) {
    float l = 0.5 + 0.5 * dot(N, normalize(KEY_DIR));
    return floorLevel + (1.0 - floorLevel) * pow(l, 1.3);
  }
`;

export const VERT_VARYINGS = /* glsl */ `
  varying vec3 vPos;      // object space
  varying vec3 vNormalW;  // world space
  varying vec3 vViewDir;  // world space, surface -> camera
  varying vec2 vUv;
`;

export const VERT_BODY = /* glsl */ `
  vUv = uv;
  vPos = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
`;

export const BASE_VERT = /* glsl */ `
  ${VERT_VARYINGS}
  void main() {
    ${VERT_BODY}
  }
`;
