// journey-v6 — FINAL epilogue: THE POKE'S SPORE SHED.
//
// organism §10c's third answer to a fingertip: `if (hit.point.y > 2.8)
// sporeSys.shedSpores(28)` — a rap on the cap rattles a few spores loose off
// the gills. Part of the same complaint Hannah raised about the field bodies:
// the hero puffs when you poke its cap, and the field bodies did not.
//
// WHY THIS IS NOT THE HERO'S SHED, AND NOT THE SKY'S EITHER
// ---------------------------------------------------------
// The hero's shedSpores(n) recycles n particles of its own 4,200-spore cloud
// back to THEIR OWN gill origins — origins baked at the world origin, on the
// hero's own cap. Called for a field body it would puff the hero. And the
// chapter's own spore sky (sky.js) is a closed-form GPU phase function of
// uTime with zero per-frame CPU: right for a standing drift, structurally
// incapable of an event at an arbitrary place and moment.
//
// So the shed is its own small pool: ONE additive Points draw, a ring buffer
// of SHED_N particles, integrated on the CPU only while something is alive
// and `visible = false` (no draw, no loop, no upload) the rest of the time —
// which is every frame of every capture, so the goldens cannot see it.
//
// The motion is organism/spores.js's own language: a fresh spore drops clear
// of the gills first (the air under a cap is still), then the one wind takes
// it — BREEZE, the hero's own (1, 0.62, 0.17) normalized, the same vector
// that carries the hero's plume and the sky's drift.
//
// SCALING (the judgement this file owes the reader, and the one place the
// first cut was wrong).
//
// COUNT scales with the body. The hero sheds 28 for a body 4.37 units tall; a
// field body sheds round(28 * scale), floored at 10 — under about ten
// particles a shed stops reading as a puff and starts reading as three stray
// dots, which is worse than not answering at all. That is the honest axis: a
// bigger fruiting body has more hymenium, so it drops more spores.
//
// SIZE DOES NOT. The first cut scaled the sprites by the body too, and
// measured on a poked near clone that put every spore at 0.007-0.03 world
// units — gl_PointSize 0.5-1.6 px at the rest camera's six-to-thirty-unit
// distances, i.e. under the point shader's own MIN_PT floor, where vShrink
// dims them to a tenth. The shed fired, integrated and drifted correctly, and
// you could not see one pixel of it. Two mistakes in one: a spore is a SPORE
// — it is the same physical object on every fruiting body of one species, it
// does not shrink with the mushroom — and the whole field is an order of
// magnitude further from this camera than the hero is from its own. So the
// sizes are absolute, and sit in the same band the chapter's spore SKY
// already uses at these distances (sky.js szBase * 1.9), which is what makes
// a poke's puff read as more of the drift the frame is already full of.
const SZ_MIN = 0.045, SZ_SPAN = 0.115;
// and the same brightness multiplier the sky's own cloud carries — without it
// this material sits ~2x under everything else additive in the frame
const SHED_GAIN = 2.2;

import * as THREE from 'three';
import { makeGlowTexture, CAP_Y, CAP_R } from '../../anatomy.js';
import { makeRng, gaussOf, heat } from './world.js';

const SHED_N = 256;            // pool: ~9 full-strength sheds live at once
const LIFE = 7.0;              // seconds from release to gone
const SETTLE = 1.4;            // seconds of falling before the wind has it
// the hero's one wind (organism/spores.js BZX/BZY/BZZ), normalized here
const BREEZE = new THREE.Vector3(1.0, 0.62, 0.17).normalize();

export function createShed(uniforms) {
  const rand = makeRng(0x5A0DE);
  const gauss = () => gaussOf(rand);

  const pos = new Float32Array(SHED_N * 3);
  const vel = new Float32Array(SHED_N * 3);
  const size = new Float32Array(SHED_N);
  const age = new Float32Array(SHED_N).fill(LIFE + 1);   // all dead at boot
  const col = new Float32Array(SHED_N * 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('psize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAge', new THREE.BufferAttribute(age, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: makeGlowTexture() },
      uAmount: uniforms.uAmount,
      uFogNear: uniforms.uFogNear,
      uFogFar: uniforms.uFogFar,
    },
    vertexShader: /* glsl */ `
      #define MIN_PT 1.7
      #define LIFE ${LIFE.toFixed(1)}
      attribute float psize, aAge;
      varying vec3 vColor;
      varying float vA, vFog, vShrink;
      void main() {
        float u = aAge / LIFE;
        // in over the first breath, out over the last third
        vA = smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.62, 1.0, u));
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFog = -mv.z;
        vA *= smoothstep(1.2, 2.8, length(mv.xyz));
        float sz = psize * (300.0 / -mv.z);
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
      varying float vA, vFog, vShrink;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
        gl_FragColor = vec4(vColor * t.a * vA * uAmount * fogF * vShrink * ${SHED_GAIN.toFixed(1)}, 1.0);
      }
    `,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  const group = new THREE.Group();
  group.add(points);

  let cursor = 0;     // ring-buffer write head
  let live = 0;       // particles still inside their life
  const c = new THREE.Color();

  /** A rap on this body's cap. `(bx, by, bz)` is the body's SOIL point and `s`
   *  its uniform scale in hero units; everything else falls out of the
   *  species' own proportions, so a clone and a batched body shed the same
   *  way from the same place under their caps. */
  function burst(bx, by, bz, s) {
    const n = Math.max(10, Math.round(28 * s));
    const R = s * CAP_R;                 // this body's rim, by the one cap law
    for (let k = 0; k < n; k++) {
      const i = cursor; cursor = (cursor + 1) % SHED_N;
      if (age[i] >= LIFE) live++;        // reviving a dead slot, not a live one
      const a = rand() * Math.PI * 2;
      const u = 0.72 + Math.pow(rand(), 0.6) * 0.28;  // outer gills carry most surface
      const i3 = i * 3;
      pos[i3]     = bx + Math.cos(a) * R * u + gauss() * 0.02;
      pos[i3 + 1] = by + s * (CAP_Y - 0.10) - Math.pow(rand(), 1.5) * 0.45 * s;
      pos[i3 + 2] = bz + Math.sin(a) * R * u + gauss() * 0.02;
      // OUT, then down, then the wind. The release itself has to billow past
      // the cap MARGIN, and this is not decoration: the Final rest camera sits
      // ABOVE every field body's rim plane, so its own opaque §5 cap shell
      // hides the whole gill space underneath it. A shed released straight
      // down under the gills — which is what a spore really does, and what the
      // first cut did — is emitted into a box the visitor cannot see into, and
      // reads as no answer at all. So a rap knocks them clear of the margin
      // first, which is also the truer picture of what a rap does.
      // Out far enough to clear the rim in about a second, DOWN harder than
      // out so the puff lands against the dark floor beside the stem instead
      // of over the body's own lit cap, where a dozen four-pixel motes are
      // simply lost. Then the wind (below) lifts them back up past the margin.
      const out = 0.16 + rand() * 0.16;
      vel[i3]     = Math.cos(a) * out + gauss() * 0.03;
      vel[i3 + 1] = -(0.26 + rand() * 0.16);
      vel[i3 + 2] = Math.sin(a) * out + gauss() * 0.03;
      // absolute world-unit sprite size — see the SIZE DOES NOT note above
      size[i]     = SZ_MIN + Math.pow(rand(), 1.6) * SZ_SPAN;
      age[i]      = 0;
      heat(0.64 + Math.pow(rand(), 1.4) * 0.36, c);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    geo.attributes.color.needsUpdate = true;
    geo.attributes.psize.needsUpdate = true;
    points.visible = true;
  }

  /** Integrate. Returns immediately — no loop, no upload, no draw — whenever
   *  nothing is alive, which is every frame of every capture and almost every
   *  frame of a ride. */
  function update(dt) {
    if (!live) return;
    const step = Math.min(dt, 0.033);
    live = 0;
    for (let i = 0; i < SHED_N; i++) {
      let a = age[i];
      if (a >= LIFE) continue;
      a += step;
      age[i] = a;
      if (a >= LIFE) continue;
      live++;
      const i3 = i * 3;
      // the handover from the still air under the cap to the one wind is
      // measured in TIME, not distance (organism/spores.js's own reasoning:
      // at these drift speeds a distance gate keeps a spore falling for a
      // quarter of a minute)
      const w = Math.min(1, a / SETTLE);
      const sp = 0.24 * (0.4 + 0.6 * w);
      const k = w * step * 2.2;
      vel[i3]     += (BREEZE.x * sp - vel[i3]) * k;
      vel[i3 + 1] += (BREEZE.y * sp - vel[i3 + 1]) * k;
      vel[i3 + 2] += (BREEZE.z * sp - vel[i3 + 2]) * k;
      pos[i3]     += vel[i3] * step;
      pos[i3 + 1] += vel[i3 + 1] * step;
      pos[i3 + 2] += vel[i3 + 2] * step;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAge.needsUpdate = true;
    if (!live) points.visible = false;
  }

  /** The chapter is retiring: drop every particle on the floor, so a poke from
   *  the last ride is not still drifting when the next one arrives. */
  function cool() {
    if (!live) return;
    age.fill(LIFE + 1);
    live = 0;
    points.visible = false;
    geo.attributes.aAge.needsUpdate = true;
  }

  return { group, burst, update, cool, get live() { return live; } };
}
