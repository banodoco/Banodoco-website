import * as THREE from 'three';
import { COMMON } from './glsl.js';

/**
 * Renders a procedural pattern once into a texture.
 *
 * The filament networks are the expensive part of this scene — a single
 * veinNetwork() call is two 3x3x3 voronoi searches, i.e. ~54 hash evaluations.
 * Doing that per-pixel per-frame on the cap and stem costs more than the rest
 * of the frame combined. Baking lets us spend far *more* on pattern quality
 * (more octaves, sharper thresholds) while the runtime cost collapses to one
 * filtered texture fetch.
 */
export function bakePattern(renderer, width, height, body) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    generateMipmaps: true,
    depthBuffer: false,
    stencilBuffer: false,
  });

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        ${COMMON}
        varying vec2 vUv;
        ${body}
      `,
      depthTest: false,
      depthWrite: false,
    })
  );
  scene.add(quad);

  const prevTarget = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(prevTarget);

  quad.geometry.dispose();
  quad.material.dispose();

  target.texture.wrapS = THREE.RepeatWrapping;
  target.texture.wrapT = THREE.ClampToEdgeWrapping;
  target.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return target.texture;
}

// Seamless cylindrical domain — u wraps, v runs along the surface.
const CYL = /* glsl */ `
  vec3 cyl(float u, float v, float around, float along) {
    float a = u * 2.0 * PI;
    return vec3(cos(a), sin(a), 0.0) * around + vec3(0.0, 0.0, v * along);
  }
`;

/**
 * Cap cuticle.
 *   R = primary vein network   G = capillary network
 *   B = broad mottling         A = fine grain
 * u = angle around the cap, v = 0 at the apex -> 1 at the margin.
 */
export const CAP_PATTERN = /* glsl */ `
  ${CYL}
  void main() {
    float u = vUv.x, v = vUv.y;

    // Three scales of network. Cells are stretched radially (high angular
    // frequency, low radial frequency) so their borders run apex -> margin,
    // exactly like the venation in the reference.
    vec3 d1 = cyl(u, v, 11.5, 3.4);
    d1 += 0.30 * fbm(d1 * 0.5, 3);
    float n1 = veinNetwork(d1, 0.048);

    vec3 d2 = cyl(u, v, 23.0, 7.5);
    d2 += 0.20 * fbm(d2 * 0.4, 2);
    float n2 = veinNetwork(d2, 0.060);

    vec3 d3 = cyl(u, v, 44.0, 15.0);
    float n3 = veinNetwork(d3, 0.088);

    // Trunks stay strong everywhere; capillaries thicken toward the margin
    // where the flesh thins.
    // Sharpen: pow < 1 lifts the mid-strength borders so the network still
    // reads as a network after a couple of mip levels.
    float primary = pow(clamp(n1 * 1.0 + n2 * 0.45, 0.0, 1.0), 0.72);
    float capillary = pow(clamp(n2 * 0.5 + n3 * 0.7, 0.0, 1.0), 0.78);

    float mottle = fbm(cyl(u, v, 2.4, 1.6) + 11.3, 4);
    float grain = fbm(cyl(u, v, 26.0, 18.0) + 3.7, 4);

    gl_FragColor = vec4(primary, capillary, mottle, grain);
  }
`;

/**
 * Stem fibre bundle.
 *   R = coarse fibres  G = fine hyphae  B = mottling  A = grain
 * u = angle around the stem, v = 0 at the cap -> 1 at the soil.
 */
export const stemPattern = (twist) => /* glsl */ `
  ${CYL}
  void main() {
    float v = vUv.y;
    // Shear the domain so the fibres spiral with the braided geometry.
    float u = vUv.x + ${twist.toFixed(4)} * v;

    vec3 d1 = cyl(u, v, 9.0, 34.0);
    d1 += 0.26 * fbm(d1 * 0.4, 3);
    float n1 = veinNetwork(d1, 0.048);

    vec3 d2 = cyl(u, v, 19.0, 78.0);
    float n2 = veinNetwork(d2, 0.060);

    vec3 d3 = cyl(u, v, 40.0, 165.0);
    float n3 = veinNetwork(d3, 0.085);

    float coarse = clamp(n1 + n2 * 0.4, 0.0, 1.6);
    float fine = clamp(n2 * 0.45 + n3 * 0.75, 0.0, 1.6);

    float mottle = fbm(cyl(u, v, 2.0, 7.0) + 5.1, 4);
    float grain = fbm(cyl(u, v, 22.0, 60.0) + 17.9, 4);

    gl_FragColor = vec4(coarse, fine, mottle, grain);
  }
`;
