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
// The motion is organism/spores.js's own language: the one wind takes it —
// BREEZE, the hero's own (1, 0.62, 0.17) normalized, the same vector that
// carries the hero's plume and the sky's drift. The hero's spore drops clear
// of the gills first (the air under a cap is still); this pool is SEATED past
// the margin, where a hero spore has already finished doing that, so it is
// born on the far side of the handover — see the STILL-AIR note below, which
// is Hannah's "weird little sparkles drop from the non-primary mushrooms".
//
// SCALING (the judgement this file owes the reader).
//
// COUNT scales with the body. The hero sheds 28 for a body 4.37 units tall; a
// field body sheds round(28 * scale), floored at 10 — under about ten
// particles a shed stops reading as a puff and starts reading as three stray
// dots, which is worse than not answering at all. That is the honest axis: a
// bigger fruiting body has more hymenium, so it drops more spores.
//
// SIZE DOES NOT. A spore is a SPORE — the same physical object on every
// fruiting body of one species, it does not shrink with the mushroom. So the
// sizes are absolute, and they are now the HERO'S OWN DRAW, digit for digit
// (organism/spores.js: `pow(rand, 1.8) * 0.072 + 0.019`).
//
// THE SIZE BAND USED TO BE THIS FILE'S OWN, AND THAT WAS THE BUG (Hannah,
// 2026-08-06: "there's this kind of stuff that jumps out of the mushroom...
// they should all have spores coming from them like the other one"). It ran
// 0.045 + rand^1.6 * 0.115 — up to 3.3x the hero's sprite — and justified
// itself by pointing at `sky.js szBase * 1.9`. Commit 836d373 DELETED that
// expression: it put the chapter's whole spore sky on the hero's own size
// draw, its vShrink, its twinkle and a re-banded depth-of-field, precisely
// because the old band rendered every dot at the MIN_PT floor at full
// brightness and read as a STARFIELD rather than as spores. This file was the
// one particle layer left behind, so its stated reference no longer existed.
// It is brought across here, whole: same constants, same twinkle, same DOF
// band, same gain. One substance at both ends of the ride, and one substance
// across this frame.
const SZ_MIN = 0.019, SZ_SPAN = 0.072, SZ_POW = 1.8;
// sky.js FOCAL_D / FOCAL_R: this chapter's own focal band for the hero's DOF
// law. A hero-sized spore 24 units out is 0.23 px, which vShrink crushes to
// 1.8%; the 2.35x growth at vBlur = 1 almost exactly cancels the 1/d shrink,
// so a far spore lands the same size on screen as a near one and 45% as
// bright. Depth reads as brightness and fog, which is where this chapter
// keeps it everywhere else (cloneLum, the tier lum ladder).
const FOCAL_D = 10.5, FOCAL_R = 14.0;
// the same brightness multiplier the sky's own cloud carries (sky.js
// SPORE_GAIN) — the hero point material's own uOpacity on the shed
const SHED_GAIN = 2.4;

import * as THREE from 'three';
import { makeGlowTexture, CAP_Y, CAP_R } from '../../anatomy.js';
import { makeRng, gaussOf, heat } from './world.js';
import { breeze } from './clones.js';

const SHED_N = 256;            // pool: ~9 full-strength sheds live at once
const LIFE = 7.0;              // seconds from release to gone
// THE STILL-AIR HANDOVER, AND WHY THIS POOL IS BORN PAST IT (2026-08-07).
//
// Hannah: "weird little sparkles drop from the non-primary mushrooms in the
// final view." They did, and it is this file, and the measurement is not
// subtle: poke a ring body and every one of the released particles falls —
// mean −0.076 world units, +13.5 SCREEN PIXELS straight down, over 1.2 s.
// That is not a component of the puff's motion, it IS the puff's motion. The
// drift the wind supplies over the same 1.2 s is 0.02-0.06 units, a fifth of
// it and sideways.
//
// The falling term is organism/spores.js's own, and correct there:
//
//     y += vel.y * 0.016 * carry - 0.0026 * (1 - w) * k        w = age / 1.6
//
// — the air UNDER A CAP is still, so a fresh spore drops clear of the gills
// before the wind has any of it, and only then is it carried. `w` is that
// handover, and every term it gates is a statement about being inside the
// hymenium: the fall itself, and the `0.45 + 0.55 w` ramp on the carry.
//
// The seat below is deliberately NOT inside the hymenium. The commit that
// brought this integrator across (070892c) moved the release out to a band
// STRADDLING THE MARGIN — u 0.92..1.12 of the rim — because the Final rest
// camera stands ~11 deg above every field body's rim plane, so a body's own
// opaque §5 cap shell covers its whole underside and a puff seated where the
// hero seats one is emitted into a box the visitor cannot see into. That
// judgement is still right and the seat is unchanged.
//
// But it means these particles are born WHERE A HERO SPORE ARRIVES — clear of
// the gills, in open air past the margin — and then run the handover again,
// in full view. The hero's own fall is hidden behind its cap for its whole
// 1.6 s; ours is the first thing you see. Same law, applied at the wrong
// moment of a spore's life for the place it is seated.
//
// So a shed particle is born AT the end of the handover, not at its start:
// w = 1 identically. No fall, and the carry at full strength from the first
// frame — which is exactly what organism/spores.js does with a spore that has
// already dropped clear, i.e. every spore in the hero's plume outside its own
// margin. Nothing else moves: the seat, the release velocity, the gust, the
// turbulence, the size draw, the tone, the twinkle, the DOF band and the life
// window are all untouched, and organism/* is not read differently either.
// A poked hero and a poked field body still let go of their spores; neither
// throws them, and now neither drops them in open sky.
//
// Measured after: 0 of 11 falling, mean +0.006 world units, −0.9 screen px
// over the same 1.2 s — the wind's own gentle lift, at the hero's own rate.
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
  // per-particle seed: the hero's twinkle phase (organism.js makePoints vTw)
  const seed = new Float32Array(SHED_N);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('psize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAge', new THREE.BufferAttribute(age, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: makeGlowTexture() },
      uAmount: uniforms.uAmount,
      uFogNear: uniforms.uFogNear,
      uFogFar: uniforms.uFogFar,
      uTime: uniforms.uTime,
    },
    vertexShader: /* glsl */ `
      #define MIN_PT 1.7
      #define LIFE ${LIFE.toFixed(1)}
      uniform float uTime;
      attribute float psize, aAge, aSeed;
      varying vec3 vColor;
      varying float vA, vFog, vShrink, vBlur, vTw;
      void main() {
        float u = aAge / LIFE;
        // in over the first breath, out over the last third
        vA = smoothstep(0.0, 0.06, u) * (1.0 - smoothstep(0.62, 1.0, u));
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFog = -mv.z;
        vA *= smoothstep(1.2, 2.8, length(mv.xyz));
        // The hero's own twinkle (organism.js makePoints: vTw), which rides
        // BOTH gl_PointSize and the fragment's brightness there, so it is
        // carried to both here — exactly as sky.js carries it.
        vTw = 0.85 + 0.15 * sin(uTime * 1.4 + aSeed * 7.0);
        // ...and the hero's depth-of-field on this chapter's focal band.
        vBlur = clamp(abs(vFog - ${FOCAL_D.toFixed(1)}) / ${FOCAL_R.toFixed(1)}, 0.0, 1.0);
        float sz = psize * vTw * (300.0 / -mv.z) * (1.0 + 1.35 * vBlur);
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
      varying float vA, vFog, vShrink, vBlur, vTw;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float fogF = clamp((uFogFar - vFog) / (uFogFar - uFogNear), 0.0, 1.0);
        gl_FragColor = vec4(vColor * t.a * vTw * vA * uAmount * fogF * vShrink
                            * (1.0 - 0.55 * vBlur) * ${SHED_GAIN.toFixed(1)}, 1.0);
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
      // THE SEAT, and the one thing here that is NOT the hero's own number.
      //
      // The hero draws its release radius on u = 0.55 + rand^0.6 * 0.45 of the
      // cap — the whole hymenium, weighted outward. That is right for a lens
      // sitting at the hero's own rim level, which sees straight into the gill
      // space. The Final rest camera does not: it stands ABOVE every field
      // body's rim plane (~11 deg of elevation on the nearest member), so a
      // body's own opaque §5 cap shell covers its entire underside, and a
      // release seated at u 0.6 is emitted into a box the visitor cannot see
      // into. So the seat — and ONLY the seat — is moved out to a band
      // straddling the MARGIN, where the same spore on the same law is in
      // open air. Placement was always this file's business; the poke's answer
      // is the MOTION, and the motion below is the hero's, digit for digit.
      //
      // 2026-08-07: this seat is also the reason update() runs the hero's
      // integrator at w = 1 rather than integrating the handover. A spore in
      // open air past the margin has ALREADY dropped clear; running the fall
      // again out here is what Hannah saw drop. Header, STILL-AIR HANDOVER.
      const u = 0.92 + rand() * 0.20;
      const i3 = i * 3;
      pos[i3]     = bx + Math.cos(a) * R * u + gauss() * 0.06 * s;
      // organism/spores.js's own release band under the gill skirt, scaled to
      // the body — the DEPTH of the seat is the hero's; only its radius moved
      pos[i3 + 1] = by + s * (CAP_Y - 0.06 - Math.pow(rand(), 1.5) * 0.62);
      pos[i3 + 2] = bz + Math.sin(a) * R * u + gauss() * 0.06 * s;
      // THE RELEASE VELOCITY IS THE HERO'S, WHICH IS TO SAY: THERE ISN'T ONE.
      //
      // This is the whole of Hannah's complaint. The first cut fired a spore
      // OUT along the radius (0.16-0.32 units/s) and DOWN harder still
      // (0.26-0.42), to billow it clear of the cap before the wind took over.
      // Measured against the hero's own shed, that is 38x the hero's outward
      // speed and 3x its total; a poked field body ejected its spores while a
      // poked hero simply let go of them. "Stuff that jumps out of the
      // mushroom" is an exact description of an impulse the hero does not
      // have, and no amount of tuning it down makes it the same GESTURE.
      //
      // organism/spores.js gives a re-released spore no impulse at all: it
      // carries the drift velocity it was born with — BREEZE_DIR * sp, sp on
      // [0.028, 0.083] — and the integrator below simply holds the wind off it
      // while it falls clear. Same three numbers here.
      const sp = 0.028 + rand() * 0.055;
      vel[i3]     = BREEZE.x * sp;
      vel[i3 + 1] = BREEZE.y * sp + rand() * 0.012;
      vel[i3 + 2] = BREEZE.z * sp + gauss() * 0.008;
      // absolute world-unit sprite size, the hero's own draw — see above
      size[i]     = SZ_MIN + Math.pow(rand(), SZ_POW) * SZ_SPAN;
      seed[i]     = rand();
      age[i]      = 0;
      heat(0.64 + Math.pow(rand(), 1.4) * 0.36, c);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    geo.attributes.color.needsUpdate = true;
    geo.attributes.psize.needsUpdate = true;
    geo.attributes.aSeed.needsUpdate = true;
    points.visible = true;
  }

  /** Integrate. Returns immediately — no loop, no upload, no draw — whenever
   *  nothing is alive, which is every frame of every capture and almost every
   *  frame of a ride. */
  function update(t, dt) {
    if (!live) return;
    const step = Math.min(dt, 0.033);
    live = 0;
    // organism/spores.js's own drift integrator, term for term (§10b/§10c):
    // an advance measured in 60fps-equivalent frames, a gust that surges the
    // carry as the body leans, and the hero's two turbulence modes. The old
    // integrator relaxed a launch velocity toward a fixed 0.24 units/s — an
    // order of magnitude faster than the drift the hero's own dust travels
    // at, which is the second half of why a poked field body did not look
    // like a poked hero.
    //
    // The one term of the hero's that is NOT here is the still-air handover
    // `w`, and the header says why: this pool is seated past the margin, i.e.
    // where a hero spore ARRIVES once it has dropped clear, so w is 1 for its
    // whole life. Every place the hero writes `w` the constant 1 is
    // substituted below — the fall term is `1 - w = 0` and vanishes, the
    // carry ramp `0.45 + 0.55 w` saturates, and the two turbulence modes run
    // at full. Nothing is scaled, nothing is retuned.
    const k = step * 60;
    const gust = 0.72 + 0.28 * breeze(t);
    const carry = gust * k;              // = gust * (0.45 + 0.55 * 1) * k
    for (let i = 0; i < SHED_N; i++) {
      let a = age[i];
      if (a >= LIFE) continue;
      a += step;
      age[i] = a;
      if (a >= LIFE) continue;
      live++;
      const i3 = i * 3;
      pos[i3]     += vel[i3] * 0.016 * carry + Math.sin(t * 0.7 + i * 0.37) * 0.0018 * k;
      pos[i3 + 1] += vel[i3 + 1] * 0.016 * carry;
      pos[i3 + 2] += vel[i3 + 2] * 0.016 * carry + Math.cos(t * 0.5 + i * 0.53) * 0.0013 * k;
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
