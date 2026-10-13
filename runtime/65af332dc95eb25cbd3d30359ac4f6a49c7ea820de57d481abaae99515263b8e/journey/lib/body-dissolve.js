/** Fixed patches in body space: no time or screen coordinates, so the same
 * fragments return when growth reverses and the pattern travels with a body.
 * Two inexpensive cell scales break up the occluding skin into soft-looking
 * clusters, rather than leaving a solid dark silhouette under fading ink. */
export const BODY_DISSOLVE_GLSL = `
  varying vec3 vBodyDissolvePosition;
  float bodyDissolveHash(vec3 cell) {
    vec3 p = fract(cell * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float bodyDissolveThreshold(vec3 p) {
    return 0.72 * bodyDissolveHash(floor(p * 24.0))
      + 0.28 * bodyDissolveHash(floor(p * 7.0) + 19.0);
  }
  void dissolveBody(float coverage) {
    if (coverage <= 0.0) discard;
    if (coverage < 0.9999 && bodyDissolveThreshold(vBodyDissolvePosition) >= coverage) discard;
  }
`;
