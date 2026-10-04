import * as THREE from 'three';
import { aerialPlacements, planAerialReveals, manifestoPose, CAMERA_SECONDS } from './pose.js';
import { groundY, makeRng } from '../chapters/final/world.js';

// Prepared once with Final. Every instance shares the hero's actual buffers;
// only placement, uniform scale, yaw and light vary. No rim-only LOD species.
//
// THE AERIAL VIEW DRAWS A STRIDED SUBSET OF THOSE BUFFERS (2026-10-03 —
// Hannah: the Manifesto "feels laggy"). Measured at 1440x900: every one of
// the 560 bodies drew the hero's FULL strand set — 83.7M vertices a frame —
// and the flight ran at 11-14 fps (8.5 settled) against ~40 at the hero
// rest on the same machine; with the colony hidden it ran at the rest rate.
// From the aerial camera a body is 30-80 px tall, so most of those strands
// land on the same pixels. Each layer therefore draws through its own index
// that keeps every Nth strand / spark / body triangle — still the hero's
// own vertices, colours and shaders, just fewer of them. LOD_STRIDE is the
// knob; 1 restores the full set.
//   Measured per layer type (settled aerial pose, strides swept one at a
//   time): the additive STRAND layers are the whole cost — lines 1 -> 8 took
//   it from 10 to 16 fps, while meshes 1 -> 8 changed nothing. So the opaque
//   bodies keep every triangle (their occlusion stays exact) and only the
//   light-carrying layers thin out.
//   A body's glow is the SUM of its strands, so thinning alone dims the
//   colony: each kept strand / spark carries `stride` times the light
//   (uColonyGain), which keeps the colony's light per pixel where it was.
const LOD_STRIDE = { lines: 8, points: 3, mesh: 1 };

/* TWO TIERS BY SCREEN SIZE (2026-10-04 — Hannah: "lets try" level of detail,
   after measuring the settled aerial view at ~20M triangles, 2M segments and
   0.5M points a frame — about 30 ms of GPU work, the bulk of the Manifesto's
   frame). The bodies never move, and the flight's camera path is known
   (pose.js manifestoPose), so prepare() works out how tall each body ever
   gets on screen and splits them:
     NEAR — any body that reaches NEAR_PX on screen at any moment of the
            climb or the descent keeps the set above, exactly as before;
     FAR  — every other body draws the same layers, thinned again: strands
            by FAR_THIN more (light compensated the same way, so a pixel's
            glow holds), and the opaque shells through a CLUSTERED
            index — their own vertices welded on a grid of FAR_CELL_PX of
            the largest far body's height, which keeps the silhouette and
            occlusion to well under a pixel and drops most triangles.
   The sparks are NOT thinned further: a quarter of them at four times the
   light read as a coarse speckle on the far caps in the side-by-side
   comparison, where thinner strands did not. Same buffers, same
   materials' shaders (no new programs), only new indices. */
const NEAR_PX = 70;
const FAR_THIN = 1;
const FAR_CELL_PX = 1.25;
const BODY_HEIGHT = 3.6;         // a body's height in hero units (stem foot to cap top)

/** An index over a triangle mesh with its vertices welded on a `cell` grid:
 *  every triangle is re-pointed at the FIRST vertex of each corner's cell,
 *  collapsed triangles and duplicates are dropped. No vertex is created or
 *  moved — the index only chooses which existing vertices to draw — so the
 *  shared attributes still serve both tiers. */
function clusteredIndex(source, cell) {
  const position = source.attributes.position;
  const base = source.index ? source.index.array : null;
  const count = base ? base.length : position.count;
  const rep = new Int32Array(position.count).fill(-1);
  const cells = new Map();
  const key = (i) => `${Math.floor(position.getX(i) / cell)},${Math.floor(position.getY(i) / cell)},${Math.floor(position.getZ(i) / cell)}`;
  const at = (i) => {
    if (rep[i] < 0) {
      const k = key(i);
      let r = cells.get(k);
      if (r === undefined) { r = i; cells.set(k, r); }
      rep[i] = r;
    }
    return rep[i];
  };
  const out = new Uint32Array(count);
  const seen = new Set();
  let o = 0;
  for (let t = 0; t + 2 < count; t += 3) {
    const a = at(base ? base[t] : t), b = at(base ? base[t + 1] : t + 1), c = at(base ? base[t + 2] : t + 2);
    if (a === b || b === c || a === c) continue;
    const sorted = [a, b, c].sort((x, y) => x - y).join(',');
    if (seen.has(sorted)) continue;
    seen.add(sorted);
    out[o++] = a; out[o++] = b; out[o++] = c;
  }
  return new THREE.BufferAttribute(out.slice(0, o), 1);
}

/** An index over `source` that keeps every `stride`th primitive (`unit`
 *  indices each: 2 for segments, 1 for points, 3 for triangles). */
function stridedIndex(source, unit, stride) {
  const base = source.index ? source.index.array : null;
  const count = base ? base.length : source.attributes.position.count;
  const prims = Math.floor(count / unit);
  const kept = Math.ceil(prims / stride);
  const out = new Uint32Array(kept * unit);
  let o = 0;
  for (let p = 0; p < prims; p += stride) {
    for (let k = 0; k < unit; k++) {
      const v = p * unit + k;
      out[o++] = base ? base[v] : v;
    }
  }
  return new THREE.BufferAttribute(out.subarray(0, o), 1);
}

export function createAerialColony(sceneApi, seats, time = { value: 0 }) {
  const random = makeRng(0x41e21a);
  const bodies = aerialPlacements(seats, random, groundY);
  const group = new THREE.Group();
  group.visible = false;
  const gate = { value: 0 };
  const clock = { value: 0 }, portrait = { value: 0 };
  // the ring's own seats: 1 while aloft, easing to 0 through a Return while
  // Final's original ring comes back underneath them (see setSeatLight)
  const seatLight = { value: 1 };
  // Per-body arrival windows in BODY order (the links read them that way);
  // the instanced attributes below are written in ARRIVAL order instead.
  const plan = new Float32Array(bodies.length * 2);
  const fogNear = { value: 30 }, fogFar = { value: 150 };
  const poseBase = new Float32Array(bodies.flatMap(b => [b.x, b.gy, b.z, b.s]));
  const toneBase = new Float32Array(bodies.flatMap(b => [b.yaw, b.tone]));
  // Each tier owns its instance attributes; prepare() fills them.
  const tierOf = (name, thin) => ({
    name, thin, layers: [], starts: new Float32Array(0), drawn: -1,
    poses: new THREE.InstancedBufferAttribute(poseBase.slice(), 4),
    tones: new THREE.InstancedBufferAttribute(toneBase.slice(), 2),
    arrivals: new THREE.InstancedBufferAttribute(new Float32Array(bodies.length * 2), 2),
  });
  const tiers = [tierOf('near', 1), tierOf('far', FAR_THIN)];
  // the welding grid, in hero units: FAR_CELL_PX of the tallest a far body
  // can be (NEAR_PX) — so a weld never spans more than ~1 px on screen
  const farCell = BODY_HEIGHT * FAR_CELL_PX / NEAR_PX;
  // ONLY ARRIVED BODIES ARE DRAWN. A body before its window is already dark
  // (colonyArrival() = 0 discards every fragment) but still paid its full
  // vertex cost. prepare() sorts the instances by arrival start, so the
  // bodies that can be lit are always a prefix and set() just draws that
  // prefix — the picture is identical, the early flight is much cheaper.
  const header = `
    attribute vec4 aColonyPose;
    attribute vec2 aColonyTone;
    attribute vec2 aColonyReveal;
    uniform float uColonySeconds;
    uniform float uColonyPortrait;
    uniform mat4 uColonyFrame;
    uniform float uColonyGate;
    uniform float uColonyGain;
    uniform float uColonySeatLight;
    varying float vColonyLight;
    varying float vColonyFade;
    float colonyArrival() {
      return aColonyReveal.x < 0. ? 1. : smoothstep(aColonyReveal.x, aColonyReveal.x + aColonyReveal.y, uColonySeconds);
    }
    mat4 colonyMatrix() {
      float c = cos(aColonyTone.x), s = sin(aColonyTone.x), k = aColonyPose.w * mix(0.88, 1., colonyArrival());
      return mat4(vec4(c*k,0.,-s*k,0.),vec4(0.,k,0.,0.),vec4(s*k,0.,c*k,0.),vec4(aColonyPose.xyz,1.)) * uColonyFrame;
    }
  `;
  function addLayer(source, frame) {
    for (const tier of tiers) addTierLayer(source, frame, tier);
  }
  function addTierLayer(source, frame, tier) {
    const src = source.material;
    if (!src || !(src.isMeshBasicMaterial || src.uniforms?.uProg || src.userData?.uWin)) return;
    const geometry = new THREE.InstancedBufferGeometry();
    // Attribute references are shared, never copied per body; only the
    // (strided) index is this layer's own — see LOD_STRIDE.
    for (const [key, attribute] of Object.entries(source.geometry.attributes)) geometry.setAttribute(key, attribute);
    const [unit, stride] = source.isLineSegments ? [2, LOD_STRIDE.lines * tier.thin]
      : source.isPoints ? [1, LOD_STRIDE.points] : [3, LOD_STRIDE.mesh];
    if (unit === 3 && tier.name === 'far') {
      // the frame's scale carries hero units into this geometry's own
      geometry.setIndex(clusteredIndex(source.geometry, farCell / Math.max(1e-6, frame.getMaxScaleOnAxis())));
    } else {
      geometry.setIndex(stride > 1 ? stridedIndex(source.geometry, unit, stride) : source.geometry.index);
    }
    tier.layers.push(geometry);
    geometry.setAttribute('aColonyPose', tier.poses); geometry.setAttribute('aColonyTone', tier.tones);
    geometry.setAttribute('aColonyReveal', tier.arrivals);
    geometry.instanceCount = 0;   // set() draws each tier's arrived prefix
    const material = src.clone();
    /* intro.js's shellsRestore() state, PINNED, not inherited (as Final's
       cloneShellMat does). The colony is cloned at boot, while the hero's
       stem shell may still carry the growth's clip plane — and clone()
       shares the Plane itself, so every colony stem was sliced at whatever
       height the growth last left it (measured: 0.02, i.e. nearly the whole
       stem gone). Worse, clipping is applied only inside a real draw, so the
       boot warm-up compiled the UNclipped program and the clipped one linked
       on the first Manifesto frame: a shader compile mid-flight (2026-10-04,
       Hannah: "random lag when I move ... from Purpose into Manifesto"). */
    if (src.isMeshBasicMaterial) { material.opacity = 1; material.transparent = false; material.clippingPlanes = null; }
    // light compensation for the thinning (1 for the unthinned opaque bodies)
    const own = { uniforms: { uColonyFrame: { value: frame }, uColonyGate: gate, uColonySeconds: clock, uColonyPortrait: portrait,
      uColonyGain: { value: stride }, uColonySeatLight: seatLight } };
    function vertex(shader) {
      return header + shader
        .replace(/\bmodelViewMatrix\b/g, '(modelViewMatrix * colonyMatrix())')
        .replace(/\bmodelMatrix\b/g, '(modelMatrix * colonyMatrix())')
        .replace('#include <project_vertex>', 'vec4 mvPosition = modelViewMatrix * colonyMatrix() * vec4(transformed,1.); gl_Position = projectionMatrix * mvPosition;')
        .replace('void main() {', `void main() {
          vec4 centre = projectionMatrix * modelViewMatrix * vec4(aColonyPose.xyz,1.);
          vec2 screen = centre.xy / max(0.001, centre.w);
          float quiet = mix(smoothstep(-0.20,0.15,screen.x), smoothstep(0.05,0.4,screen.y), uColonyPortrait);
          // The ring's own seats (reveal window < 0) are the epilogue's
          // existing mushrooms, which Final hides the moment the branch
          // opens (ring.setAerial). They must not ride the colony's fade-in
          // gate, or they go dark through the first seconds of the flight —
          // and the last seconds of the Return — and pop back on landing.
          vColonyFade = aColonyReveal.x < 0. ? uColonySeatLight : uColonyGate * colonyArrival();
          vColonyLight = uColonyGain * aColonyTone.y * vColonyFade * mix(0.60,1.,quiet);`)
        .replace('float sz = psize', 'float sz = aColonyPose.w * psize')
        .replace('vFade = mix(1.0, 1.0 - exp(-gap), uFadeOn);', 'vFade = mix(1.0, max(0.20, 1.0 - exp(-gap)), uFadeOn);');
    }
    /* THE SOLID BODIES DISSOLVE; THEY DO NOT DARKEN (2026-10-04). The cap
       occluders are opaque, so scaling their colour toward zero left black
       discs standing over the lit ground while a body arrived or a Return
       retired the ring's seats ("weird mushrooms"). They now leave by a
       screen-door: a per-pixel threshold against the fade, which the TAA
       resolve integrates into an ordinary transparency without sorting. */
    const dissolve = src.isMeshBasicMaterial
      ? ' if (vColonyFade < 0.999 && vColonyFade <= fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))) discard;'
      : '';
    function fragment(shader) {
      return 'varying float vColonyLight;\nvarying float vColonyFade;\n' + shader.replace(/void main\(\)\s*\{/, `void main() { if(vColonyLight < 0.001) discard;${dissolve}`)
        .replace(/gl_FragColor = vec4\(vColor/g, 'gl_FragColor = vec4(vColor * vColonyLight')
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb *= vColonyLight;');
    }
    if (material.isShaderMaterial) {
      for (const key of Object.keys(src.uniforms)) material.uniforms[key] = src.uniforms[key];
      Object.assign(material.uniforms, own.uniforms, { uProg: { value: 2 }, fogNear, fogFar });
      material.vertexShader = vertex(src.vertexShader);
      material.fragmentShader = fragment(src.fragmentShader);
    } else {
      material.onBeforeCompile = shader => {
        Object.assign(shader.uniforms, own.uniforms);
        shader.vertexShader = vertex(shader.vertexShader);
        shader.fragmentShader = fragment(shader.fragmentShader);
      };
      material.customProgramCacheKey = () => 'manifesto-colony-v2';
    }
    const object = source.isPoints ? new THREE.Points(geometry, material)
      : source.isMesh ? new THREE.Mesh(geometry, material) : new THREE.LineSegments(geometry, material);
    object.frustumCulled = false;
    group.add(object);
  }
  function walk(root, parent) {
    root.updateMatrix();
    const frame = parent.clone().multiply(root.matrix);
    if (root.geometry) addLayer(root, frame);
    else for (const child of root.children) {
      if (child.geometry || child === sceneApi.groups.mushroom) walk(child, frame);
    }
  }
  walk(sceneApi.groups.stem, new THREE.Matrix4());
  walk(sceneApi.groups.mushroom.parent, new THREE.Matrix4());

  /* THE GROUND MAT GROWS BY PATCH, AND LIGHTS AS IT GROWS (2026-10-04 —
     Hannah: "when the ground network appears, it should just light up
     temporarily"; "more like a general feeling of different ground networks
     happening from orbit"). It used to join every body to its two nearest
     predecessors at 2.5% light — one even lattice nobody could see. Now
     each patch is its own web (every body joins its nearest elder in the
     patch), each patch's first body sends a runner to the nearest earlier
     node (another patch, a loner, the epilogue's seats or the hero), and
     some patches send a second. Every strand is drawn FROM the end that
     arrived first TO the one that arrives later: its tip travels across the
     ground, hot, and leaves a glow that settles to the mat's resting light
     — so a new body is reached by a running light that then dims. */
  const points = [], colors = [], owners = [], paths = [];
  const bodyIndex = new Map(bodies.map((body,i) => [body,i]));
  const nodes = [{ x: 0, z: 0 }, ...seats, ...bodies.filter(b => b.tier === undefined).toSorted((a,b) => Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))];
  const firstNew = seats.length + 1;
  const seenPatch = new Set();
  function strand(a, b, strands, bendScale) {
    const length = Math.hypot(b.x-a.x, b.z-a.z);
    // a strand meanders in proportion to the ground it crosses
    const bendK = Math.max(0.12, length / 6) * 0.55 * bendScale;
    for (let k = 0; k < strands; k++) {
      const phase = random() * Math.PI * 2, bend = (0.35 + random() * 0.7) * bendK;
      let previous = null, previousT = 0;
      for (let j = 0; j <= 20; j++) {
        const t = j / 20, wave = Math.sin(t*Math.PI) * Math.sin(t*7+phase) * bend;
        const x = a.x + (b.x-a.x)*t + wave, z = a.z+(b.z-a.z)*t + wave*0.7;
        const p = [x, groundY(x,z)+0.035, z];
        if (previous) {
          points.push(...previous,...p); colors.push(0.32,0.22,0.10,0.32,0.22,0.10);
          const ia = bodyIndex.get(a) ?? -1, ib = bodyIndex.get(b) ?? -1;
          owners.push(ia,ib,ia,ib);
          paths.push(previousT, length, t, length);
        }
        previous = p; previousT = t;
      }
    }
  }
  for (let i = firstNew; i < nodes.length; i++) {
    const b = nodes[i];
    let near = null, dNear = Infinity, n0 = null, n1 = null, d0 = Infinity, d1 = Infinity;
    for (let j = 0; j < i; j++) {
      const q = nodes[j], d = Math.hypot(q.x-b.x,q.z-b.z);
      if (d <= 0.1) continue;
      if (b.patch >= 0 && q.patch === b.patch && d < dNear) { near = q; dNear = d; }
      if (d < d0) { n1 = n0; d1 = d0; n0 = q; d0 = d; }
      else if (d < d1) { n1 = q; d1 = d; }
    }
    if (near) strand(near, b, 2, 0.6);
    if (!near || !seenPatch.has(b.patch)) {
      // the patch's (or loner's) runner back into the wider mat
      // (only to ground it could plausibly have grown across: a runner
      // longer than that read from orbit as a straight wire over the dark)
      if (n0 && d0 < 18) strand(n0, b, 3, 1);
      if (n1 && d1 < 14 && b.patch >= 0 && random() < 0.45) strand(n1, b, 2, 1);
    }
    if (b.patch >= 0) seenPatch.add(b.patch);
  }
  const ground = new THREE.BufferGeometry();
  ground.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  ground.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const links = new THREE.BufferAttribute(new Float32Array(owners.length * 2), 4);
  ground.setAttribute('aColonyLink', links);
  ground.setAttribute('aColonyPath', new THREE.Float32BufferAttribute(paths, 2));
  const groundMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 });
  groundMat.onBeforeCompile = shader => {
    shader.uniforms.uColonySeconds = clock;
    shader.vertexShader = `attribute vec4 aColonyLink; attribute vec2 aColonyPath; uniform float uColonySeconds; varying float vColonyLink;
      float linkStart(vec2 window) { return window.x < 0. ? -1e3 : window.x; }
` + shader.vertexShader
      .replace('void main() {', `void main() {
        float sa = linkStart(aColonyLink.xy), sb = linkStart(aColonyLink.zw);
        // distance along the strand from the end that was there first
        float along = sb >= sa ? aColonyPath.x : 1. - aColonyPath.x;
        float travel = 0.9 + aColonyPath.y * 0.07;
        // the tip sets out a little before the later body, and reaches it
        // as that body rises
        float passed = uColonySeconds - (max(sa, sb) - 0.5 * travel) - along * travel;
        float grown = smoothstep(0., 0.2, passed);
        float flash = passed > 0. ? exp(-passed / 1.3) : 0.;
        vColonyLink = grown * (1. + 4. * flash);`);
    shader.fragmentShader = 'varying float vColonyLink;\n' + shader.fragmentShader
      .replace('#include <opaque_fragment>', '#include <opaque_fragment>\ngl_FragColor.rgb *= vColonyLink;');
  };
  groundMat.customProgramCacheKey = () => 'manifesto-links-v2';
  group.add(new THREE.LineSegments(ground, groundMat));

  /* THE PATCHES THAT ARE SHEDDING (2026-10-04 — Hannah: "some of the random
     ones should be giving off spores as well... the spores flying through
     the sky being a part of it"; then "is that realistic now? In terms of
     how they actually spread?"). Shed the way a gilled mushroom sheds:
       - most spores DROP from under the cap at their terminal speed (a
         straight, steady fall), carried a little downwind as they go, and
         SETTLE — the faint glowing print round the foot of a shedding body;
       - a minority are caught in the cap's own small updraft, lift a
         little, and are taken by the wind across the colony, slowly rising.
     Neighbours shed together (a patch is wet or dry as one). Every spore
     belongs to its body: gated on that body's arrival window and on the
     colony's gate, it can neither precede its mushroom nor outlive it.
     Sprites keep one pixel band at any depth, so no plume is thicker for
     being nearer the camera. */
  const SPORE_FALL = 40, SPORE_LOFT = 14;
  const shedders = [];
  bodies.forEach((b, i) => { if (b.emits) shedders.push(i); });
  const sporeCount = shedders.length * (SPORE_FALL + SPORE_LOFT);
  const sporePos = new Float32Array(sporeCount * 3), sporeData = new Float32Array(sporeCount * 4);
  const sporeBody = new Float32Array(sporeCount * 2);
  const sporeOwner = new Int32Array(sporeCount);
  const sporeGate = new THREE.BufferAttribute(new Float32Array(sporeCount * 2), 2);
  let si = 0;
  for (const i of shedders) {
    const b = bodies[i];
    for (let k = 0; k < SPORE_FALL + SPORE_LOFT; k++, si++) {
      // the body's foot; the shader finds the gills from its scale
      sporePos[si*3] = b.x; sporePos[si*3+1] = b.gy; sporePos[si*3+2] = b.z;
      const loft = k >= SPORE_FALL;
      sporeData[si*4] = random() * 1000;                                   // seed
      sporeData[si*4+1] = loft ? 70 + random() * 50 : 22 + random() * 14; // period
      sporeData[si*4+2] = random();                                        // phase
      sporeData[si*4+3] = loft ? 1 : 0;                                    // cohort
      sporeBody[si*2] = b.s; sporeBody[si*2+1] = b.yaw;
      sporeOwner[si] = i;
    }
  }
  const sporeGeo = new THREE.BufferGeometry();
  sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePos, 3));
  sporeGeo.setAttribute('aSpore', new THREE.BufferAttribute(sporeData, 4));
  sporeGeo.setAttribute('aSporeBody', new THREE.BufferAttribute(sporeBody, 2));
  sporeGeo.setAttribute('aSporeGate', sporeGate);
  const sporeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: time, uColonySeconds: clock, uColonyGate: gate, fogNear, fogFar },
    vertexShader: /* glsl */ `
      attribute vec4 aSpore;       // seed, period, phase, cohort (0 drop, 1 lofted)
      attribute vec2 aSporeBody;   // the owner's scale, yaw
      attribute vec2 aSporeGate;   // the owner's arrival window
      uniform float uTime, uColonySeconds, uColonyGate, fogNear, fogFar;
      varying float vAlpha;
      varying vec3 vColor;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        // in once the body is up; gone before it goes
        float owner = smoothstep(aSporeGate.x + 0.6 * aSporeGate.y, aSporeGate.x + aSporeGate.y + 1.2, uColonySeconds);
        float t = fract(uTime / aSpore.y + aSpore.z);
        float h1 = hash(aSpore.x * 12.9898), h2 = hash(aSpore.x * 78.233 + 1.), h3 = hash(aSpore.x * 45.164 + 2.);
        float s = aSporeBody.x;
        vec3 wind = normalize(vec3(1.0, 0.0, 0.17));   // the field's one breeze, level
        vec3 side = vec3(-wind.z, 0., wind.x);
        // released from the gills: under the cap, anywhere between stem and margin
        float ang = h2 * 6.2832, rr = 2.35 * s * (0.18 + 0.72 * sqrt(h1));
        vec3 p = position + vec3(cos(ang) * rr, 3.15 * s * 0.80, sin(ang) * rr);
        float fall = p.y - position.y;
        float life;
        float glow = 1.0;
        if (aSpore.w < 0.5) {
          // terminal fall (linear: a spore is at terminal speed within a
          // millimetre), drifting downwind as it drops, then lying in the print
          float tf = 0.30;
          float k = clamp(t / tf, 0., 1.);
          p.y -= fall * k;
          p += wind * (0.25 + 1.6 * h3) * s * 3.0 * k + side * (h1 - 0.5) * 1.2 * s * k;
          p.y = max(p.y, position.y + 0.03);
          float settled = step(tf, t);
          glow = mix(1.0, 0.45, settled);
          life = smoothstep(0., 0.04, t) * (1. - smoothstep(0.55, 1., t));
        } else {
          // the cap's own small updraft, then the wind's
          float lift = smoothstep(0., 0.12, t);
          p.y += (0.4 + 0.8 * h1) * s * 3.0 * lift;
          float carry = smoothstep(0.06, 1., t);
          p += wind * (12. + 14. * h3) * carry + vec3(0., (1.2 + 2.0 * h2) * carry, 0.);
          p += (side * sin(uTime * 0.07 + aSpore.x) + vec3(0., 0.4 * cos(uTime * 0.05 + aSpore.x * 1.7), 0.)) * 1.4 * carry;
          life = smoothstep(0., 0.06, t) * (1. - smoothstep(0.65, 1., t));
          glow = 0.7;
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        float depth = -mv.z;
        float fogF = clamp((fogFar - depth) / max(1., fogFar - fogNear), 0., 1.);
        float tw = 0.8 + 0.2 * sin(uTime * 1.4 + aSpore.x * 7.);
        vAlpha = life * glow * owner * uColonyGate * fogF * tw * 0.9;
        vColor = mix(vec3(1.0, 0.70, 0.36), vec3(1.0, 0.86, 0.60), h2);
        // one apparent size at any depth: a fixed pixel band
        gl_PointSize = clamp(0.22 * 300. / max(depth, 1.), 1.6, 2.6) * mix(1., 0.8, 1. - glow);
        gl_Position = projectionMatrix * mv;
        if (vAlpha < 0.002) gl_Position = vec4(2., 2., 2., 1.);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.;
        float a = pow(max(0., 1. - d * d), 1.5);
        gl_FragColor = vec4(vColor * a * vAlpha, 1.);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const sporePts = new THREE.Points(sporeGeo, sporeMat);
  sporePts.frustumCulled = false;
  group.add(sporePts);
  // Its programs are warmed with the rest of Final's hidden subtree (this
  // group lives inside Final's) — see warmHiddenChapters in journey.js.

  /** Which bodies ever stand NEAR_PX tall on screen, over the whole flight
   *  (the descent replays the same poses, so the climb covers both ways).
   *  The camera path is sampled every quarter second; a body counts only
   *  from its arrival (the ring's own seats from the start) and only while
   *  it is inside the frame. */
  function nearBodies(from, aspect) {
    const halfH = (typeof window !== 'undefined' ? window.innerHeight : 900) / 2;
    const frames = [];
    for (let t = 0; t <= CAMERA_SECONDS; t += 0.25) {
      const pose = manifestoPose(from, t, aspect);
      const { position: p, target: q } = pose;
      const n = Math.hypot(q.x-p.x, q.y-p.y, q.z-p.z);
      const fx = (q.x-p.x)/n, fy = (q.y-p.y)/n, fz = (q.z-p.z)/n;
      const h = Math.hypot(fx, fz), rx = -fz/h, rz = fx/h;
      frames.push({ t, p, fx, fy, fz, rx, rz, ux: -fy*rz, uy: fx*rz-fz*rx, uz: fy*rx,
        tangent: Math.tan(pose.fov * Math.PI / 360) });
    }
    return bodies.map((b, i) => {
      const height = b.s * BODY_HEIGHT;
      const arrives = plan[i*2] < 0 ? 0 : plan[i*2];
      for (const f of frames) {
        if (f.t + 0.25 < arrives) continue;
        const x = b.x-f.p.x, y = b.gy+height/2-f.p.y, z = b.z-f.p.z;
        const depth = x*f.fx + y*f.fy + z*f.fz;
        // a body the camera is inside or right beside is as near as it gets
        if (depth <= height) return true;
        const nx = (x*f.rx + z*f.rz) / (depth*f.tangent*aspect);
        const ny = (x*f.ux + y*f.uy + z*f.uz) / (depth*f.tangent);
        if (Math.abs(nx) > 1.1 || Math.abs(ny) > 1.1) continue;
        if (height / (depth*f.tangent) * halfH >= NEAR_PX) return true;
      }
      return false;
    });
  }

  return {
    group,
    // the placements, for layers that dress the same field (sky.js plumes)
    bodies,
    prepare(from, aspect) {
      planAerialReveals(bodies, from, aspect, plan);
      for (let i = 0; i < owners.length; i++) {
        const owner = owners[i];
        links.array[i*2] = owner < 0 ? -1 : plan[owner*2];
        links.array[i*2+1] = owner < 0 ? 1 : plan[owner*2+1];
      }
      links.needsUpdate = true;
      for (let k = 0; k < sporeCount; k++) {
        const owner = sporeOwner[k];
        sporeGate.array[k*2] = plan[owner*2]; sporeGate.array[k*2+1] = plan[owner*2+1];
      }
      sporeGate.needsUpdate = true;
      const order = bodies.map((_, i) => i).sort((a, b) => plan[a*2] - plan[b*2]);
      // each body's tier, from the tallest it gets on screen on this flight
      const near = nearBodies(from, aspect);
      for (const tier of tiers) {
        const mine = order.filter(i => near[i] === (tier.name === 'near'));
        tier.starts = new Float32Array(mine.length);
        mine.forEach((src, dst) => {
          tier.starts[dst] = plan[src*2];
          tier.arrivals.array[dst*2] = plan[src*2]; tier.arrivals.array[dst*2+1] = plan[src*2+1];
          for (let k = 0; k < 4; k++) tier.poses.array[dst*4+k] = poseBase[src*4+k];
          tier.tones.array[dst*2] = toneBase[src*2]; tier.tones.array[dst*2+1] = toneBase[src*2+1];
        });
        tier.arrivals.needsUpdate = true; tier.poses.needsUpdate = true; tier.tones.needsUpdate = true;
        tier.drawn = -1;
      }
      portrait.value = aspect < 0.9 ? 1 : 0;
    },
    /** QA: how many bodies each tier holds on the prepared flight. */
    get lod() { return { near: tiers[0].starts.length, far: tiers[1].starts.length }; },
    setSeatLight(v) { seatLight.value = Math.max(0, Math.min(1, v)); },
    set(progress, near, far, seconds) {
      /* The ring's own seats stand in for Final's ring from the branch's
         first frame (Final hides its ring lines the moment it opens), so
         the colony is drawn whenever they are lit — not only once the
         arrivals' gate opens a second later. Waiting for the gate left the
         ring dimmed for that second and then switched the copies on at full
         light: the jolt on pressing Manifesto (2026-10-04). Unarrived
         bodies cost nothing here — they are past the drawn prefix. */
      group.visible = progress > 0 || seatLight.value > 0.001;
      gate.value = progress;
      clock.value = seconds;
      for (const tier of tiers) {
        let count = 0;
        while (count < tier.starts.length && tier.starts[count] <= seconds) count++;
        if (count !== tier.drawn) {
          tier.drawn = count;
          for (const geometry of tier.layers) geometry.instanceCount = count;
        }
      }
      groundMat.opacity = progress * 0.07;
      fogNear.value = near; fogFar.value = far;
    },
  };
}
