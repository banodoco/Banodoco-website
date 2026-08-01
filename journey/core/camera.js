// Camera director: one canonical journey progress p drives one continuous
// camera path through six chapter clusters, with organic occlusion veils at the
// five anatomical boundaries. See CONTRACT.md for ranges and cluster envelopes.
import * as THREE from 'three';
import { easings, noise3 } from '../lib/helpers.js?v=7';

export const CHAPTER_RANGES = [
  { id: 'mission', start: 0.000, end: 0.135 },
  { id: 'equip',   start: 0.135, end: 0.320 },
  { id: 'connect', start: 0.320, end: 0.500 },
  { id: 'inspire', start: 0.500, end: 0.665 },
  { id: 'owned',   start: 0.665, end: 0.850 },
  { id: 'final',   start: 0.850, end: 1.000 },
];

export const CLUSTER_OFFSETS = {
  mission: new THREE.Vector3(0, 0, 0),
  equip:   new THREE.Vector3(0, 0, 220),
  connect: new THREE.Vector3(0, 0, 440),
  inspire: new THREE.Vector3(0, 0, 660),
  owned:   new THREE.Vector3(0, 0, 880),
  final:   new THREE.Vector3(0, 0, 1100),
};

export const VEIL_HALF = 0.032; // half-width of each boundary veil in p units
// Canonical rest band (chapter-local progress) in which copy and hotspot
// labels are shown — single source for core/main.js and core/interact.js.
export const REST_LO = 0.20;
export const REST_HI = 0.80;

// Boundary veil flavors: [mission→equip, equip→connect, connect→inspire,
// inspire→owned, owned→final]
const VEILS = [
  { kind: 'fibres',  dir: 1.0, scale: 3.0,  color: new THREE.Color(0xd9a441) }, // packed stipe hyphae
  { kind: 'fibres',  dir: 0.4, scale: 1.6,  color: new THREE.Color(0xc79a3e) }, // tissue opening
  { kind: 'tissue',  dir: 0.2, scale: 2.2,  color: new THREE.Color(0xb8892f) }, // cap flesh + cuticle
  { kind: 'soil',    dir: -1., scale: 2.6,  color: new THREE.Color(0x6b4a22) }, // soil-line punch
  { kind: 'soil',    dir: 1.0, scale: 1.8,  color: new THREE.Color(0x7a5526) }, // rise through substrate
];

/*
 Camera key poses per chapter, in CLUSTER-LOCAL coordinates.
 Each chapter: array of { t (chapter-local 0..1), pos, look, fov? }.
 Entry (t=0) should face INTO the cluster from a tight/occluded framing so it
 lines up with the veil; exit (t=1) should end tight/occluded again.
 Rest plateau lives roughly t 0.25–0.75 (keys close together = slow drift).
*/
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const PATHS = {
  mission: [
    { t: 0.00, pos: V(11.5, 3.4, 13.5), look: V(0.4, 3.4, 0), fov: 42 },
    { t: 0.30, pos: V(9.2, 3.1, 11.0),  look: V(0.3, 3.5, 0), fov: 42 },
    { t: 0.70, pos: V(7.8, 3.0, 9.6),   look: V(0.2, 3.6, 0), fov: 42 },
    { t: 0.88, pos: V(3.6, 2.6, 4.4),   look: V(0.0, 2.8, 0), fov: 46 },
    { t: 1.00, pos: V(0.9, 2.3, 1.1),   look: V(0.0, 2.4, 0), fov: 52 }, // touching stipe surface
  ],
  equip: [
    { t: 0.00, pos: V(0.5, -6.0, 2.2),  look: V(0.2, 0.5, 0), fov: 52 },
    { t: 0.25, pos: V(2.6, -1.5, 3.4),  look: V(0.0, 4.0, 0), fov: 50 },
    { t: 0.50, pos: V(3.6, 3.0, 2.2),   look: V(-0.6, 6.4, 0), fov: 50 },
    { t: 0.75, pos: V(2.4, 8.0, -2.6),  look: V(0.4, 10.5, 0.4), fov: 50 },
    { t: 1.00, pos: V(0.8, 13.5, -1.2), look: V(0.0, 19.0, 0), fov: 54 },
  ],
  // Middle keys sweep the gaze across the three semantic nodes in narrative
  // order: community (az 0.0 → local (9,·,0)), ados (az 2.1 → (-4.5,·,7.8)),
  // hivemind (az ~4.95 → (2,·,-8.3)) — so each label frames inside the
  // cp 0.20–0.80 rest band.
  connect: [
    { t: 0.00, pos: V(3.0, 1.2, 0.5),   look: V(10.0, 2.8, 3.0), fov: 55 },
    { t: 0.26, pos: V(7.6, 2.0, -4.4),  look: V(9.5, 2.5, 0.5), fov: 52 },
    { t: 0.50, pos: V(3.9, 2.2, -8.1),  look: V(-4.5, 2.9, 7.8), fov: 52 },
    { t: 0.76, pos: V(-3.1, 2.4, -8.8), look: V(2.0, 3.0, -8.3), fov: 52 },
    { t: 1.00, pos: V(2.8, 3.6, -7.5),  look: V(0.0, 5.2, -2.0), fov: 56 },
  ],
  inspire: [
    { t: 0.00, pos: V(11.8, 4.2, 6.6),  look: V(4.0, 7.0, 0), fov: 52 },
    { t: 0.30, pos: V(13.6, 5.0, 3.2),  look: V(0.0, 7.6, 0), fov: 48 },
    { t: 0.62, pos: V(12.8, 6.4, -3.4), look: V(0.0, 8.4, 0), fov: 48 },
    { t: 0.82, pos: V(7.4, 11.8, -6.2), look: V(0.0, 7.0, 0), fov: 50 },
    { t: 1.00, pos: V(1.8, 6.0, -10.9), look: V(0.5, -3.0, -10.4), fov: 56 }, // tipping over rim, diving
  ],
  owned: [
    { t: 0.00, pos: V(-14.0, 1.8, 6.0), look: V(-4.0, 0.0, 2.0), fov: 54 },
    { t: 0.28, pos: V(-8.0, 0.4, 4.0),  look: V(0.0, 2.2, 0.0), fov: 52 },
    { t: 0.55, pos: V(-2.0, 0.2, 2.0),  look: V(2.0, 1.5, -2.0), fov: 52 },
    { t: 0.80, pos: V(5.0, 0.8, -1.0),  look: V(12.0, 2.0, -5.0), fov: 52 },
    { t: 1.00, pos: V(11.0, 3.4, -4.0), look: V(18.0, 8.0, -8.0), fov: 54 }, // rising toward growth front
  ],
  final: [
    { t: 0.00, pos: V(6.5, 3.6, 16.0),  look: V(0, 1.5, 0), fov: 50 },
    { t: 0.30, pos: V(9.5, 6.0, 22.0),  look: V(0, 1.0, 0), fov: 48 },
    { t: 0.60, pos: V(14.0, 9.5, 30.0), look: V(0, 0.5, 0), fov: 46 },
    { t: 1.00, pos: V(26.0, 17.0, 52.0), look: V(0, 0.0, 0), fov: 44 },
  ],
};

export function chapterAt(p) {
  for (const c of CHAPTER_RANGES) if (p <= c.end) return c;
  return CHAPTER_RANGES[CHAPTER_RANGES.length - 1];
}
export function localProgress(p, c) {
  return THREE.MathUtils.clamp((p - c.start) / (c.end - c.start), 0, 1);
}

const _sp = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50 };
const _sp2 = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50 };
function samplePath(id, t, out = _sp) {
  const keys = PATHS[id];
  t = THREE.MathUtils.clamp(t, 0, 1);
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1];
  const span = Math.max(b.t - a.t, 1e-5);
  const f = easings.smooth(THREE.MathUtils.clamp((t - a.t) / span, 0, 1));
  out.pos.copy(a.pos).lerp(b.pos, f);
  out.look.copy(a.look).lerp(b.look, f);
  out.fov = THREE.MathUtils.lerp(a.fov ?? 50, b.fov ?? 50, f);
  return out;
}

export function createCameraDirector(camera, veilParent) {
  // ---- veil: camera-attached fullscreen quad with organic occlusion shader ----
  const veilUniforms = {
    uAmount: { value: 0 },
    uTime: { value: 0 },
    uKind: { value: 0 },   // 0 fibres, 1 tissue, 2 soil
    uDir: { value: 1 },
    uScale: { value: 2.5 },
    uColor: { value: new THREE.Color(0xd9a441) },
  };
  const veilMat = new THREE.ShaderMaterial({
    uniforms: veilUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float uAmount, uTime, uKind, uDir, uScale;
      uniform vec3 uColor;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p){
        float s = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++){ s += a * vnoise(p); p *= 2.07; a *= 0.5; }
        return s;
      }
      void main(){
        if (uAmount <= 0.001) discard;
        vec2 uv = vUv;
        float t = uTime * 0.15;
        float pattern;
        if (uKind < 0.5) {
          // packed vertical fibres: stretched noise
          pattern = fbm(vec2(uv.x * 14.0 * uScale, uv.y * 1.4 * uScale + t * uDir * 3.0));
        } else if (uKind < 1.5) {
          // dense tissue: rounded cellular blobs
          pattern = fbm(uv * 5.0 * uScale + vec2(t * uDir, t * 0.4));
        } else {
          // soil: coarse granular clumps
          pattern = fbm(uv * 7.0 * uScale + vec2(0.0, t * uDir * 2.0));
          pattern = pattern * 0.75 + 0.25 * vnoise(uv * 40.0);
        }
        // amount sweeps threshold so texture "closes over" the frame organically
        float a = smoothstep(1.0 - uAmount * 1.25, 1.0 - uAmount * 1.25 + 0.28, pattern + uAmount * 0.55);
        a = clamp(a, 0.0, 1.0) * smoothstep(0.0, 0.10, uAmount);
        // near-opaque core stays very dark with faint warm tint
        vec3 col = mix(vec3(0.02, 0.013, 0.004), uColor * 0.10, pattern * 0.6);
        // match the optics grain so the lens never "switches off" mid-threshold
        float g = hash(uv * 1837.0 + fract(uTime) * 97.0) - 0.5;
        col += g * 0.05;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const veilMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), veilMat);
  veilMesh.frustumCulled = false;
  veilMesh.renderOrder = 9999;
  veilMesh.visible = false;
  veilParent.add(veilMesh);

  // focus state (detail drawers): lerp toward a framing of a node
  let focus = null;        // { worldPos: Vector3, dist, bias: Vector3 }
  let lastFocus = null;    // survives clearFocus so the ease-out has a target
  let focusAmt = 0;

  const _pos = new THREE.Vector3();
  const _look = new THREE.Vector3();
  const _dirA = new THREE.Vector3();
  const _dirB = new THREE.Vector3();
  const _fpos = new THREE.Vector3();

  function update(p, time, dt) {
    const c = chapterAt(p);
    const t = localProgress(p, c);
    const s = samplePath(c.id, t);
    // Distribute the inter-chapter rotation across the veil band: while the
    // tissue closes over the frame, blend this chapter's view direction toward
    // the neighbouring chapter's entry/exit direction so the turn happens
    // during the occlusion, never as a hidden hard cut.
    {
      const ci = CHAPTER_RANGES.indexOf(c);
      const nextEdge = c.end, prevEdge = c.start;
      let other = null, blend = 0;
      if (ci < CHAPTER_RANGES.length - 1 && nextEdge - p < VEIL_HALF) {
        other = CHAPTER_RANGES[ci + 1];
        blend = 0.5 * (1 - (nextEdge - p) / VEIL_HALF); // 0 → 0.5 approaching edge
        samplePath(other.id, 0, _sp2);
      } else if (ci > 0 && p - prevEdge < VEIL_HALF && p > prevEdge) {
        other = CHAPTER_RANGES[ci - 1];
        blend = 0.5 * (1 - (p - prevEdge) / VEIL_HALF); // 0.5 → 0 leaving edge
        samplePath(other.id, 1, _sp2);
      }
      if (other && blend > 0.001) {
        const f = easings.smooth(blend);
        // cluster offsets cancel for pure directions — blend view DIRECTIONS
        // and re-aim the look target at the original distance
        const lookDist = _dirA.copy(s.look).sub(s.pos).length();
        _dirA.normalize();
        _dirB.copy(_sp2.look).sub(_sp2.pos).normalize();
        _dirA.lerp(_dirB, f).normalize();
        s.look.copy(s.pos).addScaledVector(_dirA, lookDist);
        // fov eases toward the neighbour's too
        s.fov = THREE.MathUtils.lerp(s.fov, _sp2.fov, f);
      }
    }
    // deliberate portrait pose: a tall frame can't hold the landscape framing,
    // so back the camera off along its own axis and open the fov a touch —
    // the whole composition (organism + copy space) survives the rotation
    if (camera.aspect < 1) {
      const back = 1.30 - camera.aspect * 0.22; // ≈1.08–1.21 over realistic portrait aspects
      s.pos.sub(s.look).multiplyScalar(back).add(s.look);
      s.fov = Math.min(s.fov + 6, 62);
    }
    const off = CLUSTER_OFFSETS[c.id];
    _pos.copy(s.pos).add(off);
    _look.copy(s.look).add(off);

    // subtle handheld/documentary drift
    const drift = 0.10;
    _pos.x += noise3(time * 0.07, 3.1, 0) * drift;
    _pos.y += noise3(0, time * 0.06, 7.7) * drift * 0.6;
    _look.x += noise3(time * 0.05, 11.3, 2) * drift * 0.5;

    // focus override (detail state) — eases IN toward the node and, because
    // lastFocus survives clearFocus(), eases OUT back to the path instead of
    // snapping the frame on close
    const focusTarget = focus ? 1 : 0;
    focusAmt += (focusTarget - focusAmt) * Math.min(dt * 3.2, 1);
    const f = focus || lastFocus;
    if (focusAmt > 0.001 && f) {
      _fpos.copy(f.worldPos).add(f.bias);
      _pos.lerp(_fpos, easings.smooth(focusAmt));
      _look.lerp(f.worldPos, easings.smooth(focusAmt));
    } else if (!focus && focusAmt <= 0.001) {
      lastFocus = null;
    }

    camera.position.copy(_pos);
    camera.lookAt(_look);
    if (Math.abs(camera.fov - s.fov) > 0.01) {
      camera.fov += (s.fov - camera.fov) * Math.min(dt * 4, 1);
      camera.updateProjectionMatrix();
    }

    // ---- veil amount: peaks at each chapter boundary ----
    let amount = 0, veilIdx = -1;
    for (let i = 0; i < CHAPTER_RANGES.length - 1; i++) {
      const edge = CHAPTER_RANGES[i].end;
      const d = Math.abs(p - edge);
      if (d < VEIL_HALF) {
        const a = 1 - (d / VEIL_HALF);
        if (a > amount) { amount = easings.smooth(a); veilIdx = i; }
      }
    }
    if (veilIdx >= 0) {
      const vf = VEILS[veilIdx];
      veilUniforms.uKind.value = vf.kind === 'fibres' ? 0 : vf.kind === 'tissue' ? 1 : 2;
      veilUniforms.uDir.value = vf.dir;
      veilUniforms.uScale.value = vf.scale;
      veilUniforms.uColor.value.copy(vf.color);
    }
    veilUniforms.uAmount.value = amount;
    veilUniforms.uTime.value = time;
    veilMesh.visible = amount > 0.001;
    return { chapter: c, cp: t, veil: amount };
  }

  return {
    update,
    setFocus(worldPos, { dist = 4.5, side = 1 } = {}) {
      if (!worldPos) { focus = null; return; }
      // frame the node off-center: camera backs off along view axis, biased sideways
      const bias = new THREE.Vector3(side * dist * 0.55, dist * 0.22, dist * 0.85);
      focus = { worldPos: worldPos.clone(), bias };
      lastFocus = focus;
    },
    clearFocus() { focus = null; },
    get focusActive() { return !!focus; },
  };
}
