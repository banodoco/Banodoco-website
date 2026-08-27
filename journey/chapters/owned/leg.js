// journey-v6 — OWNED leg sampler (W4-C).
//
// The Spike B field was authored against the camera polyline the lens
// ACTUALLY travels — that is the one placement idea the spike's rev-2 audit
// proved out, and it carries here verbatim: everything in the Owned chapter
// (voids, cords, hyphae shells, portrait clearance, frame-cell placement)
// measures against the REAL journey leg, sampled from the director's pure
// poseAt(p). director.js is imported read-only; nothing here mutates it.
//
// The leg: the dive() gesture's single arc (owned/camera.js, 2026-08-11 —
// its sinking ease pins the T3 soil crossing at p ~0.692) -> OWNED rest at
// p 0.725 -> glide/drift -> rise, clearing the soil at p ~0.856 into the
// Final cutaway. (The 2026-08-11 gesture deliberately replaced the keyed
// stipe-side crawl, so everything this file derives for p < 0.725 regrew
// around the new corridor in that commit; samples at p >= 0.725 were
// bit-exact by the rest key's hold.)
import * as THREE from 'three';
import { poseAt } from '../../director.js';
import { portraitWeight } from '../../portrait.js';
import { groundY, stemAxis } from '../../anatomy.js';
import { ASPECT } from '../../../flags.js';

const clamp = THREE.MathUtils.clamp;

/** ROOT CROWN — the knot the whole chapter now hangs from (root-world
 *  restage, 20-owned-root-network.md).
 *
 *  It is the hero's own stipe base, read from the SHARED form-language mirror
 *  rather than guessed: stemAxis(0) is where the stem's axis meets the ground
 *  plane, groundY() is the soil there, and the crown sits CROWN_DROP below it
 *  — deep enough that the soil lid crops the fibres gathering up into the
 *  stem (so the base "enters the frame" at the top edge instead of floating
 *  in it), shallow enough to still read as the mushroom's own root.
 *
 *  organism/* is read-only and stays so: nothing here draws the mushroom, it
 *  only asks the mirror where the mushroom's foot is. */
export const CROWN_DROP = 0.61;
export function crownPoint() {
  const [ax, az] = stemAxis(0);
  return new THREE.Vector3(ax, groundY(ax, az) - CROWN_DROP, az);
}

/** p-range sampled for clearance: a little beyond both soil crossings so
 *  nodes near the thresholds keep clearance from the approach frames too.
 *  (Checked against the 2026-08-09 §14 Final-rest move: the Final leg's
 *  travel keys at p 0.878 / 0.905 did not move, so every pose this file
 *  samples — all p <= 0.872, i.e. strictly before the first Final key —
 *  is bit-identical under the re-timed rest. Measured: max |camera.x|
 *  drift 0.0 across the sampled range. If a future edit moves either
 *  travel key, this range samples a changed approach and the colony
 *  placement moves with it — re-measure before assuming.) */
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
   *  against this (the REAL pose, not a design stand-in). `aspect` defaults to
   *  the landscape design aspect, so every existing caller is bit-identical;
   *  pass one to compose against the portrait.js re-composed pose instead. */
  function frameAt(p, aspect = 1.6) {
    poseAt(p, pose, undefined, aspect);
    const fwd = pose.target.clone().sub(pose.pos).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    return { pos: pose.pos.clone(), fwd, right, up, fov: pose.fov };
  }
  const restFrame = frameAt(REST_P);

  // ---- portrait build (2026-08-17, the sparse-phone-field fix) ----------
  // The portrait field's rest arc is authored in rest-frame NDC at the
  // landscape design aspect, so on a ~0.46-aspect phone only the four most
  // central of the sixteen sites projected into frame — the chapter read as
  // five faces and a lot of dark. A tall frame needs its own authored arc,
  // and that arc must be composed against the pose the device actually
  // shows: the portrait.js re-composed rest, at the BUILD aspect.
  //
  // The build aspect, not a fixed phone constant (revised same day): a
  // fixed 430/932 design aspect squeezed the whole arc into the middle 60%
  // of a 0.75-aspect tablet — cluttered centre, empty margins. Composing at
  // the true aspect spreads the arc across whatever tall frame the visitor
  // has; both review phones sit within 0.0004 of each other (430/932 vs
  // 375/812), so the owned@430x932 golden still pins the phone placement.
  // The clamp only fences QA extremes (?aspect=0.1) off the placement math.
  //
  // WHICH FIELD A VIEWPORT ASKS FOR — one law, asked as often as it is
  // needed. portraitWeight >= 0.5 is the midpoint of portrait.js's blend band,
  // i.e. aspect 0.875 exactly; below it the tall arc is the composition, above
  // it the landscape one is.
  //
  // THIS USED TO BE THREE `const`s EVALUATED ONCE (2026-08-17 → 2026-08-25),
  // and the comment here said so in as many words: "Rotating a phone after
  // load keeps the built placement: chapters never rebuild on resize, and the
  // camera's own portrait blend still tracks the live aspect continuously."
  // That sentence describes the DEFECT the site owner reported ("when I resize
  // the screen, the number of items that shows in the ownership section
  // doesn't update appropriately"), because the two halves it puts side by
  // side do not agree with each other: the camera DOES re-pose every frame
  // (fov 58 → 64 across the band), so a page that crossed the boundary showed
  // the landscape arc through the portrait lens — 4 of 16 faces on frame at
  // 430x932 against 16 on a fresh load, and the twelve missing ones were not
  // stale, they were placed for a frame that no longer exists.
  //
  // So the predicate is now a FUNCTION OF ASPECT, and the build-time trio is
  // simply its first call. `?aspect=` still wins outright — a capture pinned
  // to an aspect must not re-compose when its window is sized — which keeps
  // capture.py and every golden on exactly the composition they shoot today.
  //
  // The consumer side is portraits.js `recompose()`, driven off the rail
  // dock's viewport revision (chapters/owned/index.js). Nothing here decides
  // WHEN to ask; this only answers.
  function fieldFor(aspect) {
    const a = ASPECT ?? aspect;
    const portraitAspect = clamp(a, 0.40, 0.875);
    return {
      portraitField: portraitWeight(a) >= 0.5,
      portraitAspect,
      restFramePortrait: frameAt(REST_P, portraitAspect),
    };
  }
  const buildAspect = ASPECT
    ?? (typeof window !== 'undefined' ? window.innerWidth / Math.max(1, window.innerHeight) : 1.6);
  const { portraitField, portraitAspect, restFramePortrait } = fieldFor(buildAspect);

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

  // The colony SPINE: the content axis the ambient layers (haze, aggregates,
  // far filler) are spread along. Since the root-world restage the STRUCTURE
  // radiates from the crown instead — the spine is only the "and it keeps
  // going that way" axis, running from under the crown out past the rise exit
  // so the camera enters and leaves through the middle of grown structure,
  // never at its edge.
  const SA = new THREE.Vector3(1.0, -1.30, 0.6);
  const SB = new THREE.Vector3(-11.5, -2.4, -1.4);
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
    portraitField, portraitAspect, restFramePortrait, fieldFor,
    SA, SB, SD, SLEN2, SDIR, RIGHT, UPN, spineDist, spineAt, clampUnder,
    exitP, exitPt, groundY, CROWN: crownPoint(),
  };
}
