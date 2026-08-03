// journey-v6 — OWNED leg sampler (W4-C).
//
// The Spike B field was authored against the camera polyline the lens
// ACTUALLY travels — that is the one placement idea the spike's rev-2 audit
// proved out, and it carries here verbatim: everything in the Owned chapter
// (voids, cords, hyphae shells, portrait clearance, frame-cell placement)
// measures against the REAL journey leg, sampled from the director's pure
// poseAt(p). director.js is imported read-only; nothing here mutates it.
//
// The leg: T3 soil crossing at p ~0.693 -> level-out -> OWNED rest at
// p 0.725 (pos (-0.4,-1.4,0.3), gaze -X, fov 54) -> glide/drift -> rise,
// clearing the soil at p ~0.858 into the Final cutaway.
import * as THREE from 'three';
import { poseAt } from '../../director.js';
import { groundY } from '../../anatomy.js';

const clamp = THREE.MathUtils.clamp;

/** p-range sampled for clearance: a little beyond both soil crossings so
 *  nodes near the thresholds keep clearance from the approach frames too. */
export const LEG_P0 = 0.660;
export const LEG_P1 = 0.872;
/** p-range in which the camera is actually underground (portrait homes). */
export const UG_P0 = 0.700;
export const UG_P1 = 0.845;
export const REST_P = 0.725;

export function buildLeg() {
  const N = 106;
  const camPts = [];
  const camPs = [];
  const pose = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 54 };
  for (let i = 0; i <= N; i++) {
    const p = LEG_P0 + (i / N) * (LEG_P1 - LEG_P0);
    poseAt(p, pose);
    camPts.push(pose.pos.clone());
    camPs.push(p);
  }

  function camDist(x, y, z) {
    let best = 1e9;
    for (let i = 0; i < camPts.length; i++) {
      const c = camPts[i];
      const dx = x - c.x, dy = y - c.y, dz = z - c.z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  }
  function nearestCamPt(v) {
    let best = camPts[0], bd = 1e9;
    for (const c of camPts) {
      const d = c.distanceToSquared(v);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  /** Full camera basis at journey progress p — frame-cell placement composes
   *  against this (the REAL pose, not a design stand-in). */
  function frameAt(p) {
    poseAt(p, pose);
    const fwd = pose.target.clone().sub(pose.pos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    return { pos: pose.pos.clone(), fwd, right, up, fov: pose.fov };
  }
  const restFrame = frameAt(REST_P);

  /** NDC-space projection into an authored frame (aspect = design 1.55). */
  function projectInto(f, v, aspect = 1.55) {
    const rel = v.clone().sub(f.pos);
    const z = rel.dot(f.fwd);
    if (z <= 0.01) return { x: 99, y: 99, z };
    const tanv = Math.tan(0.5 * f.fov * Math.PI / 180);
    return {
      x: rel.dot(f.right) / (z * tanv * aspect),
      y: rel.dot(f.up) / (z * tanv),
      z,
    };
  }

  // The colony SPINE: the content axis the substrate is grown along. It runs
  // under the entry (below the stipe-side descent), through the glide, and
  // past the rise exit so the substrate continues beyond both thresholds —
  // the camera enters and leaves through the middle of grown structure,
  // never at its edge.
  const SA = new THREE.Vector3(2.2, -1.35, 1.1);
  const SB = new THREE.Vector3(-12.8, -2.1, -2.6);
  const SD = SB.clone().sub(SA);
  const SLEN2 = SD.lengthSq();
  const SDIR = SD.clone().normalize();
  const RIGHT = new THREE.Vector3().crossVectors(SDIR, new THREE.Vector3(0, 1, 0)).normalize();
  const UPN = new THREE.Vector3().crossVectors(RIGHT, SDIR).normalize();

  const _sp = new THREE.Vector3();
  function spineDist(x, y, z) {
    _sp.set(x - SA.x, y - SA.y, z - SA.z);
    const t = clamp(_sp.dot(SD) / SLEN2, 0, 1);
    const dx = x - (SA.x + SD.x * t);
    const dy = y - (SA.y + SD.y * t);
    const dz = z - (SA.z + SD.z * t);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  const spineAt = (t) => SA.clone().addScaledVector(SD, t);

  /** Keep a point convincingly under the soil. */
  function clampUnder(v, margin = 0.3) {
    const g = groundY(v.x, v.z);
    if (v.y > g - margin) v.y = g - margin;
    if (v.y < -6.8) v.y = -6.8;
    return v;
  }

  // Where the rise crosses the soil-line (the growth-front exit corridor).
  let exitP = 0.85;
  for (let i = 1; i < camPts.length; i++) {
    if (camPts[i - 1].y < groundY(camPts[i - 1].x, camPts[i - 1].z)
      && camPts[i].y >= groundY(camPts[i].x, camPts[i].z)) {
      exitP = camPs[i];
      break;
    }
  }
  const exitPt = frameAt(exitP).pos.clone();

  return {
    camPts, camPs, camDist, nearestCamPt, frameAt, restFrame, projectInto,
    SA, SB, SD, SLEN2, SDIR, RIGHT, UPN, spineDist, spineAt, clampUnder,
    exitP, exitPt, groundY,
  };
}
