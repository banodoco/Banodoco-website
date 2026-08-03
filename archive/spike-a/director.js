// Spike A — camera director (LA-3), motion-legibility v2.
// One orbit spline from the EXACT hero pose around the right flank to the
// Inspire rest pose: ~172 degrees of azimuth, NO roll, never a full
// revolution. Plus the Connect frame jump.
//
// v2 after G2a review #1 ("stuff coming at me, zooming at me"): the orbit
// must read as the CAMERA travelling around a PINNED organism, not a dolly.
//   - the look target locks onto the cap inside the first ~20% and holds
//     (the mushroom never drifts in frame);
//   - radius stays CONSTANT at the hero's 10.64 through the whole swing —
//     the entire push-in 10.64 -> 8.3 is deferred to the final ~20%;
//   - the camera rides up to the plate's swing height (~2.9) early so the
//     ground colony stays in the lower frame as the parallax reference;
//   - slower: 20 s, constant angular feel.
// Poses are authored in world coordinates against the real anatomy
// (adr-d3): the hero's desktop camera is (-2.25, 2.25, 10.4) looking at
// (-2.4, 2.6, 0), i.e. azimuth atan2(-2.25, 10.4) = -12.2 deg at radius
// 10.64 about the stipe axis.
import * as THREE from 'three';

const DEG = Math.PI / 180;

// hero desktop pose, cylindrical about the stipe axis
const HERO = {
  az: Math.atan2(-2.25, 10.4),          // ≈ -0.213 rad
  r: Math.hypot(2.25, 10.4),            // ≈ 10.64
  y: 2.25,
  target: new THREE.Vector3(-2.4, 2.6, 0),
  fov: 38,
};
// Inspire rest: rear three-quarter, ~20 deg right of dead-rear (Plate II),
// pushed in, biased upward so the crown + plumes fill the upper frame
const INSPIRE = {
  az: 160 * DEG,
  r: 8.3,
  y: 3.25,
  target: new THREE.Vector3(0.15, 3.6, 0),
  fov: 38,
};
// Connect: inside the chamber, entered from the back-right, wide low angle,
// gaze across toward the front-left commons, looking up ~18 deg; the stipe
// sits right-of-centre, not dead-centre
const CONNECT = {
  pos: new THREE.Vector3(1.43, 2.15, -1.17),
  target: new THREE.Vector3(-1.5, 3.5, 0.4),
  fov: 60,
};

function easeInOut(x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
function smooth01(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }

// v2 arc profile constants
const SWING_Y = 2.9;                            // plate II: "cam y 2.25 -> ~2.9"
const PIN = new THREE.Vector3(0, 3.3, 0);       // cap-centre lock during the swing
const PUSH_START = 0.80;                        // push-in lives ONLY in the last 20%

export function createDirector(sceneApi, plumes, connectFrame, lens, labels, dust) {
  // labels/dust were introduced by an unfinished revision that was stopped
  // mid-edit; until those modules exist, they are inert so the v1 spike
  // behaviour (poses, orbit, keys) works exactly as delivered.
  labels = labels || { setHidden() {}, setCaption() {} };
  dust = dust || { setFade() {} };
  // same unfinished-revision guard: plumes.setLeanScale was called but never
  // exported by plumes.js — inert until that lands (uLean is unused there).
  if (typeof plumes.setLeanScale !== 'function') plumes.setLeanScale = () => {};
  const { camera, controls } = sceneApi;
  const stateEl = document.getElementById('state');

  let orbitS = 0;          // 0 = hero pose, 1 = inspire rest
  let playing = false;
  let mode = 'hero';       // hero | orbit | inspire | connect
  const ORBIT_SECONDS = 20;

  const _t1 = new THREE.Vector3();
  function orbitPose(s) {
    const e = easeInOut(s);                              // azimuth progress only
    const az = HERO.az + (INSPIRE.az - HERO.az) * e;
    const pin = smooth01(s / 0.22);                      // target locks on the cap early
    const push = smooth01((s - PUSH_START) / (1 - PUSH_START)); // deferred push-in
    const lift = smooth01((s - 0.06) / 0.58);            // gentle rise to swing height
    const r = HERO.r + (INSPIRE.r - HERO.r) * push;      // CONSTANT radius until s=0.8
    const y = HERO.y + (SWING_Y - HERO.y) * lift + (INSPIRE.y - SWING_Y) * push;
    const target = _t1.lerpVectors(HERO.target, PIN, pin)
      .lerp(INSPIRE.target, push).clone();
    return { pos: new THREE.Vector3(Math.sin(az) * r, y, Math.cos(az) * r), target, az };
  }

  function applyPose(pos, target, fov) {
    camera.position.copy(pos);
    controls.target.copy(target);
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    controls.update();
  }

  // ---- T1-style arming + sequential reveal, driven from the ACTUAL camera
  // azimuth every frame (manual orbiting arms the plumes too) ----
  // v2: arms earlier (18 deg) and adds a 4th channel — the backlit gill band
  // on the LIFTED rim (cap a ~ 26 deg), which faces the camera through the
  // formerly-dead az 60..120 middle. Something ignites at every azimuth:
  //   gill band 20..46 -> ArtCompute 36..72 -> Arca 76..112 -> 2RP 104..142.
  let armed = false;
  let lastCross = 0;
  function revealFromCamera(t) {
    let azDeg = Math.atan2(camera.position.x, camera.position.z) / DEG;
    if (azDeg < -90) azDeg += 360;       // rear-left reads 190..270
    // hysteresis: arm crossing 18 deg, disarm below 12, 250ms dwell
    if (!armed && azDeg > 18 && t - lastCross > 0.25) { armed = true; lastCross = t; }
    if (armed && azDeg < 12 && t - lastCross > 0.25) { armed = false; lastCross = t; }
    // plume cores must never stream along the view ray: damp the +x breeze
    // lean while the camera crosses the +x sector (az ~40..140) so the rises
    // stay tangential in frame, then let them bloom into the lean at the rear
    const belly = Math.min(smooth01((azDeg - 40) / 30), 1 - smooth01((azDeg - 115) / 30));
    plumes.setLeanScale(1 - 0.45 * Math.max(0, belly));
    if (!armed) { plumes.setReveal(0, 0, 0, 0); return; }
    const sm = (a, b) => Math.min(1, Math.max(0, (azDeg - a) / (b - a)));
    // sequential: gill band -> ArtCompute -> Arca Gidan -> 2RP (Plate II)
    plumes.setReveal(sm(36, 72), sm(76, 112), sm(104, 142), sm(20, 46));
  }

  function setState(label) { stateEl.textContent = 'SPIKE A · ' + label; }

  function toHero() {
    mode = 'hero'; playing = false; orbitS = 0;
    connectFrame.setVisible(false);
    plumes.setActive(-1);
    lens.setFocusHint(null);
    labels.setHidden(false); labels.setCaption(false);
    controls.enabled = true;
    applyPose(orbitPose(0).pos, HERO.target.clone(), HERO.fov);
    setState('HERO POSE (mission)');
  }
  function toInspire() {
    mode = 'inspire'; playing = false; orbitS = 1;
    connectFrame.setVisible(false);
    labels.setHidden(false); labels.setCaption(true);
    controls.enabled = true;
    applyPose(orbitPose(1).pos, INSPIRE.target.clone(), INSPIRE.fov);
    plumes.setActive(plumes.active < 0 ? 1 : plumes.active); // Arca active by default
    setState('INSPIRE REST (rear 3/4)');
  }
  function toConnect() {
    mode = 'connect'; playing = false;
    connectFrame.setVisible(true);
    plumes.setActive(-1);
    lens.setFocusHint(null);
    labels.setHidden(true); labels.setCaption(false);
    controls.enabled = true;
    applyPose(CONNECT.pos.clone(), CONNECT.target.clone(), CONNECT.fov);
    setState('CONNECT FRAME (gill commons density test)');
  }
  function playOrbit() {
    if (playing) { playing = false; controls.enabled = true; setState('ORBIT PAUSED'); return; }
    if (mode === 'connect') toHero();
    mode = 'orbit';
    playing = true;
    controls.enabled = false;
    labels.setHidden(false); labels.setCaption(false);
    if (orbitS >= 0.999) orbitS = 0;   // replay from the hero pose
    setState('ORBIT — playing');
  }

  // barely-perceptible foreground dust ramps in with the swing (parallax
  // amplifier), settles to a lower ambient level at the rest pose
  function dustLevel() {
    if (mode === 'connect' || mode === 'hero') return 0;
    const s = orbitS;
    return smooth01(s / 0.10) * (1 - 0.62 * smooth01((s - 0.82) / 0.18));
  }

  sceneApi.addAnimator('spike-director', (t, dt) => {
    if (playing) {
      orbitS = Math.min(1, orbitS + dt / ORBIT_SECONDS);
      const p = orbitPose(orbitS);
      applyPose(p.pos, p.target, 38);
      if (orbitS >= 1) {
        playing = false;
        controls.enabled = true;
        mode = 'inspire';
        plumes.setActive(plumes.active < 0 ? 1 : plumes.active);
        labels.setCaption(true);
        setState('INSPIRE REST (rear 3/4)');
      }
    }
    if (mode !== 'connect') revealFromCamera(t);
    else { plumes.setReveal(0, 0, 0, 0); plumes.setLeanScale(1); }
    dust.setFade(dustLevel());
    // halation focus follows the active exit's swaying release point
    if (plumes.active >= 0) lens.setFocusHint(plumes.activeWorld());
  });

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    switch (e.key) {
      case '1': toHero(); break;
      case '2': toInspire(); break;
      case '3': toConnect(); break;
      case ' ': case 'Space': case 'Spacebar': e.preventDefault(); playOrbit(); break;
      case 'ArrowRight': {
        playing = false; mode = 'orbit'; controls.enabled = true;
        labels.setHidden(false); labels.setCaption(false);
        orbitS = Math.min(1, orbitS + 0.02);
        const p = orbitPose(orbitS); applyPose(p.pos, p.target, 38);
        setState('ORBIT scrub ' + orbitS.toFixed(2));
        break;
      }
      case 'ArrowLeft': {
        playing = false; mode = 'orbit'; controls.enabled = true;
        labels.setHidden(false); labels.setCaption(false);
        orbitS = Math.max(0, orbitS - 0.02);
        const p = orbitPose(orbitS); applyPose(p.pos, p.target, 38);
        setState('ORBIT scrub ' + orbitS.toFixed(2));
        break;
      }
      case 'g': case 'G': {
        lens.setEnabled(!lens.enabled);
        setState((lens.enabled ? 'FINISHED (grade on)' : 'RAW (hero baseline)'));
        break;
      }
      case 'e': case 'E': {
        const next = plumes.active >= 2 ? 0 : plumes.active + 1;
        plumes.setActive(next);
        setState('STREAK: ' + plumes.exits[next].label);
        break;
      }
    }
  });

  return { toHero, toInspire, toConnect, playOrbit, get mode() { return mode; }, get orbitS() { return orbitS; } };
}

export { HERO, INSPIRE, CONNECT };
