// organism/spores.js — THE spore system: the 4,200-particle shed, its
// integrator, and the driver seat (merge doc §3). Split out of the
// createScene closure at merge step M2 with zero behaviour change; all
// formerly-closure state arrives through `ctx` (built in organism.js).
import * as THREE from 'three';

// =====================================================================
// 10. SPORE CLOUD — shed from the gill surface across the cap's back side
// =====================================================================
// A real agaric releases spores from the whole hymenium: basidia carpet every
// gill face, the spores drop clear of the margin, and only then does the air
// take them. So each particle is a permanent emitter parked at its own spot on
// the back-side gills, and BREEZE_DIR carries it out from there — the plume is
// a consequence of the wind, not a shape we drew.
export function createSpores(ctx) {
  const { rand, gauss, pushC, makePoints, capUnderPt, tiltX, leanZ, scene } = ctx;

  const BREEZE_DIR = new THREE.Vector3(1.0, 0.62, 0.17).normalize();
  let sporePts, sporeVel = [], sporeOrigin, sporeAge;
  {
    const pp = [], pc = [], ps = [], org = [];
    const N = 4200;
    // the cap's own transform, so gill points land in world space
    const capXf = new THREE.Euler(tiltX, 0, leanZ);
    const capOff = new THREE.Vector3(0, 0, -tiltX * 3.2);
    for (let k = 0; k < N; k++) {
      // back half of the gill skirt (sin(a) < 0 faces away from camera), weighted
      // toward the downwind quarter so the shed curtain clears the margin into
      // open air; the outer gills carry the most surface, so bias u outward too
      const a = Math.PI * (1.0 + 0.98 * Math.pow(rand(), 0.45));
      const u = 0.55 + Math.pow(rand(), 0.6) * 0.45;
      const e = capUnderPt(u, a).applyEuler(capXf).add(capOff);
      e.x += gauss() * 0.06;
      e.z += gauss() * 0.06;
      e.y -= 0.06 + Math.pow(rand(), 1.5) * 0.62; // they fall clear of the gills first
      org.push(e.x, e.y, e.z);

      // scatter the cloud along the wind path by age: dense at the gills,
      // thinning and spreading as it travels downwind
      const age = Math.pow(rand(), 1.3);
      const travel = age * 5.2;
      const spread = 0.07 + age * 0.8;
      pp.push(e.x + BREEZE_DIR.x * travel + gauss() * spread,
              e.y + BREEZE_DIR.y * travel + gauss() * spread * 0.72,
              e.z + BREEZE_DIR.z * travel + gauss() * spread * 0.6);
      pushC(pc, 0.64 + Math.pow(rand(), 1.4) * 0.36);
      ps.push(Math.pow(rand(), 1.8) * 0.072 + 0.019);
      const sp = 0.028 + rand() * 0.055;
      sporeVel.push(BREEZE_DIR.x * sp,
                    BREEZE_DIR.y * sp + rand() * 0.012,
                    BREEZE_DIR.z * sp + gauss() * 0.008);
    }
    sporeOrigin = new Float32Array(org); // each spore recycles to its own gill spot
    // release progress, 0 = just shed and still dropping, 1 = fully carried
    sporeAge = new Float32Array(N).fill(1);
    sporePts = makePoints(pp, pc, ps, 2.4);
    scene.add(sporePts);
  }

  // a rap on the cap shakes a fresh shed of spores off the gills: a few
  // particles restart their fall from their own release points
  // (called by the tap handler in organism.js §10c)
  function shedSpores(n) {
    const pos = sporePts.geometry.attributes.position, arr = pos.array;
    for (let k = 0; k < n; k++) {
      const i = (rand() * sporeAge.length) | 0, i3 = i * 3;
      arr[i3]     = sporeOrigin[i3] * ctx.swayCos - sporeOrigin[i3 + 1] * ctx.swaySin;
      arr[i3 + 1] = sporeOrigin[i3] * ctx.swaySin + sporeOrigin[i3 + 1] * ctx.swayCos;
      arr[i3 + 2] = sporeOrigin[i3 + 2];
      sporeAge[i] = 0;
    }
    pos.needsUpdate = true;
  }

  // ---- mouse wind + the drift integrator ----
  // Called by organism.js at the exact position the inline block held in
  // mushroom-scene.js. ORDERING CONSTRAINT (load-bearing): 'spore-drift'
  // must be registered AFTER 'breeze' (it reads ctx.swayCos/swaySin written
  // by 'breeze' earlier in the same frame) and BEFORE the journey layer's
  // animators — the journey's takeover overwrites spore positions after this
  // integrator runs, and that render-order relationship is proven load-bearing.
  function registerDrift() {
    const { breeze, camera, addAnimator } = ctx;

    // ---- mouse wind: the cursor drags a whisper of air with it ----
    // The pointer's screen motion becomes a faint breeze along its view ray:
    // spores within about a unit of the ray feel a push matching the cursor's
    // sweep, mapped to each spore's own depth so near and far plume deflect by
    // the same VISUAL amount. A resting cursor keeps only a barely-there
    // outward drift — enough to sense the hover, never to scatter the cloud.
    // The smoothed velocity makes the stirred air trail the cursor a beat.
    // Mouse only: touch drags are orbit gestures, and this is a hover thing.
    const mw = { x: 9, y: 9, px: 9, py: 9, svx: 0, svy: 0, on: false };
    addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (e.buttons !== 0) { mw.on = false; return; } // dragging = orbiting, not hovering
      mw.x = (e.clientX / innerWidth) * 2 - 1;
      mw.y = -(e.clientY / innerHeight) * 2 + 1;
      mw.on = true;
    });
    document.addEventListener('mouseleave', () => { mw.on = false; });
    const _mwDir = new THREE.Vector3(), _mwRight = new THREE.Vector3(), _mwUp = new THREE.Vector3();

    addAnimator('spore-drift', (t, dt) => {
      // sway state for this frame, written by 'breeze' earlier in the frame
      const swayCos = ctx.swayCos, swaySin = ctx.swaySin;
      const gust = 0.72 + 0.28 * breeze(t);   // gusts surge the drift as the body leans
      const k = Math.min(dt, 0.033) * 60;     // advance per 60fps-equivalent frame
      // cursor wind for this frame (see the mouse-wind comment above)
      let windOn = false, wdx = 0, wdy = 0, wdz = 0,
          rox = 0, roy = 0, roz = 0, rdx = 0, rdy = 0, rdz = 0, steady = 0;
      {
        const a = 1 - Math.exp(-dt * 7); // the stirred air trails the cursor a bit
        const ivx = dt > 0 ? (mw.x - mw.px) / dt : 0;
        const ivy = dt > 0 ? (mw.y - mw.py) / dt : 0;
        mw.px = mw.x; mw.py = mw.y;
        mw.svx += (Math.max(-3, Math.min(3, ivx)) - mw.svx) * a;
        mw.svy += (Math.max(-3, Math.min(3, ivy)) - mw.svy) * a;
        if (mw.on) {
          windOn = true;
          _mwDir.set(mw.x, mw.y, 0.5).unproject(camera).sub(camera.position).normalize();
          rox = camera.position.x; roy = camera.position.y; roz = camera.position.z;
          rdx = _mwDir.x; rdy = _mwDir.y; rdz = _mwDir.z;
          // screen velocity -> world velocity per unit of depth along the ray
          const tanH = Math.tan(camera.fov * Math.PI / 360);
          _mwRight.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(mw.svx * tanH * camera.aspect);
          _mwUp.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(mw.svy * tanH);
          wdx = (_mwRight.x + _mwUp.x) * 0.03;
          wdy = (_mwRight.y + _mwUp.y) * 0.03;
          wdz = (_mwRight.z + _mwUp.z) * 0.03;
          steady = 0.018; // the resting-cursor drift, in units/s at the ray
        }
      }
      const dts = Math.min(dt, 0.033); // seconds, matching k's frame clamp
      const pos = sporePts.geometry.attributes.position;
      const arr = pos.array; // raw typed array: the getter/setter API costs real
                             // time at 4200 spores x 60fps in the hottest JS loop
      for (let i = 0; i < pos.count; i++) {
        const i3 = i * 3;
        // the gills that release this spore are swaying, so its origin swings too
        const gx = sporeOrigin[i3] * swayCos - sporeOrigin[i3 + 1] * swaySin;
        const gy = sporeOrigin[i3] * swaySin + sporeOrigin[i3 + 1] * swayCos;
        let x = arr[i3], y = arr[i3 + 1], z = arr[i3 + 2];
        // Under the cap the air is still, so a fresh spore drops clear of the gills
        // before the wind takes hold. That handover is measured in TIME, not in
        // distance travelled: the drift is slow enough (~0.06 units/s) that a
        // distance gate would keep a spore falling for a quarter of a minute.
        let w = sporeAge[i];
        if (w < 1) w = sporeAge[i] = Math.min(1, w + (k / 60) / 1.6);
        // The cursor's slipstream: find how deep this spore sits in it BEFORE
        // the ambient drift is applied. Inside the slipstream the air belongs
        // to the cursor, so the breeze's carry YIELDS to it instead of adding
        // to it — a purely additive push against the wind just cancelled a
        // comparable drift and read as nothing; displacing the ambient flow is
        // what lets an against-the-wind sweep visibly stall and turn the plume.
        let fall = 0, spx = 0, spy = 0, spz = 0, sd2 = 0, tp = 0;
        if (windOn) {
          const ox = x - rox, oy = y - roy, oz = z - roz;
          tp = ox * rdx + oy * rdy + oz * rdz; // depth of this spore along the ray
          if (tp > 1 && tp < 16) {
            spx = ox - tp * rdx; spy = oy - tp * rdy; spz = oz - tp * rdz;
            sd2 = spx * spx + spy * spy + spz * spz;
            if (sd2 < 7.3) fall = Math.exp(-sd2 / 0.81); // beyond ~3 radii: nothing
          }
        }
        const carry = gust * (0.45 + 0.55 * w) * k * (1 - 0.6 * fall);
        // gentle turbulence layered over the drift
        x += sporeVel[i3]     * 0.016 * carry + Math.sin(t * 0.7 + i * 0.37) * 0.0018 * k * w;
        y += sporeVel[i3 + 1] * 0.016 * carry - 0.0026 * (1 - w) * k;
        z += sporeVel[i3 + 2] * 0.016 * carry + Math.cos(t * 0.5 + i * 0.53) * 0.0013 * k * w;
        if (fall > 0) {
          const g = fall * dts;
          const inv = steady / Math.sqrt(sd2 + 1e-4) * g;
          x += wdx * tp * g + spx * inv;
          y += wdy * tp * g + spy * inv;
          z += wdz * tp * g + spz * inv;
        }
        // spent — release again from its own gill spot. The bounds are closed on
        // every side so nothing can wander off and never come back.
        if (x > 6.8 || y > 7.6 || y < 0.2 || x < gx - 2.5) {
          x = gx; y = gy; z = sporeOrigin[i3 + 2]; sporeAge[i] = 0;
        }
        arr[i3] = x; arr[i3 + 1] = y; arr[i3 + 2] = z;
      }
      pos.needsUpdate = true;
    });
  }

  const system = {
    sporePts, sporeOrigin, sporeAge, sporeVel, BREEZE_DIR,
    shedSpores, registerDrift,
    // ---- driver seat (M2 stub; merge doc §3) ----
    // The journey claims this seat at M3 to drive braid/split/detail as
    // first-class modes of THESE dots. null = pure ambient drift — today's
    // behaviour, byte-identical. Nothing reads the seat yet; while unclaimed
    // it does NOTHING by construction.
    driver: null,
    setDriver(d) { system.driver = d; },
  };
  return system;
}
