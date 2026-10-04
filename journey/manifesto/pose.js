// One branch clock, sampled in the journey's camera composition slot.
export const CAMERA_SECONDS = 28;
// THE DESCENT IS A FLIGHT TOO (2026-10-03 — Hannah: the way back "feels
// weird and sudden and lacking in drama"). It used to rewind the whole 28s
// ascent in 2.2s on a LINEAR clock — full speed on the first frame, a dead
// stop on the last. Now its length scales with how high the camera got
// (a Return straight after opening is short; one from the settled aerial
// view takes its time), and the rewind eases in and out (smoother), so the
// camera gathers itself, sinks through the spiral, and settles at the hero.
export const RETURN_SECONDS = 4.8;            // from the fully settled view
// 1.6 -> 2.2 (2026-10-04 — Hannah: turning back partway up "is really fast
// and snappy ... it should be more like the navigation going the other
// direction"): never shorter than the navigation's own 2.2 s opening beat
// (branch.js RAIL_OPEN_SECONDS), which the row's fold home now matches.
export const RETURN_MIN_SECONDS = 2.2;        // from just after departure
export const returnSecondsFrom = (u) => RETURN_MIN_SECONDS + (RETURN_SECONDS - RETURN_MIN_SECONDS) * clamp01(u);
/* A DESCENT THAT LANDS ELSEWHERE IS A LONGER JOURNEY (2026-10-04 — Hannah:
   "the journey generally from manifesto to ownership is way too fast"). It
   ran on the Return's clock — 4.8 s from the settled view, 1.6 s early —
   though it covers the whole fall AND the leg from Purpose to the other
   section (into the ground, for Ownership). It now takes about half as long
   again plus a second: 7.5 s from the settled view, 3.2 s early. */
export const AWAY_SCALE = 1.35;
export const AWAY_EXTRA_SECONDS = 1.0;
export const awaySecondsFrom = (u) => returnSecondsFrom(u) * AWAY_SCALE + AWAY_EXTRA_SECONDS;
export const SPIRAL_START_SECONDS = 1.0;
// The title is written the moment the page opens (2026-10-04 — Hannah: it
// should "fade in as soon as I press manifesto ... and then the texts appear
// afterwards").
export const TITLE_SECONDS = 0;
/* THE READING RHYTHM IS THE TEXT'S, NOT THE CAMERA'S (2026-10-04 — Hannah:
   the third and fourth "should come in a bit faster... the end part should
   be sped up... the rhythm of it just feels wrong"). The beats used to be
   spread over the 28 s ascent — 2.4 / 6.8 / 12.5 / 19 / 26 — so the pause
   before each sentence GREW (4.4, 5.7, 6.5, 7.0 s) while the sentences did
   not (26, 27, 20, 25 words): the shortest one waited longest, and the last
   arrived after a seven-second hold. Each pause is now priced by the
   sentence it follows — a breath plus a reading allowance per word — so
   the rhythm is even and a short sentence hands on sooner. */
export const FIRST_LINE_SECONDS = 2.0;
const LINE_BREATH_SECONDS = 1.6;
const LINE_SECONDS_PER_WORD = 0.11;
export function lineSecondsFor(wordCounts) {
  const out = [];
  let t = FIRST_LINE_SECONDS;
  wordCounts.forEach((words, i) => {
    if (i > 0) t += LINE_BREATH_SECONDS + LINE_SECONDS_PER_WORD * wordCounts[i - 1];
    out.push(+t.toFixed(2));
  });
  return out;
}
export const AERIAL_BODY_COUNT = 560;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smoother = (v) => { v = clamp01(v); return v * v * v * (v * (v * 6 - 15) + 10); };
const mix = (a, b, t) => a + (b - a) * t;
export function frameShiftAt(seconds, aspect = 1.6, from = { position: { x: -14.72, z: 2.7 } }) {
  const portrait = aspect < 0.9;
  const spiral = smoother((seconds - SPIRAL_START_SECONDS) / (CAMERA_SECONDS - SPIRAL_START_SECONDS));
  const az = Math.atan2(from.position.z, from.position.x) + spiral * Math.PI * 100 / 180;
  const distance = (portrait ? 18 : 11) * spiral;
  return { x: -Math.sin(az) * distance, z: Math.cos(az) * distance };
}

/** How much of its climb the camera has made, 0 at the press and 1 at the
 *  top: most of the height in the first ten seconds, the rest eased in over
 *  the whole flight. Exported because the navigation's dot rides it — the
 *  dot reaches the Manifesto as the camera reaches the top (2026-10-04,
 *  Hannah: it should "not reach the end until we've reached the actual top
 *  of the manifesto journey"). */
export function ascentAt(seconds) {
  return 0.60 * smoother(seconds / 10) + 0.40 * smoother(seconds / CAMERA_SECONDS);
}

/* THE DESCENT COMES DOWN BY HEIGHT, NOT BY THE CLIMB'S OWN CLOCK
   (2026-10-04 — Hannah: going from the Manifesto into Ownership "the
   contents jumps forward and moves back"). A descent used to replay the
   climb backwards at an eased but even pace through its seconds. The
   climb gains 60% of its height in its first 10 of 28 s (ascentAt), so
   played backwards that 60% — and the lift, the target's drop and the
   46 -> 58 degree lens all keyed to its first 3 s — landed in the last
   second: measured, the camera fell from 15.8 to 3.5 above the ground
   in 0.55 s, came 6% closer to its subject than where it lands, and
   backed off as the lens widened. That is the lurch. Now the HEIGHT
   eases down evenly (ascentAt inverted), so the plunge is spread over the
   whole descent; simulated, the peak zoom rate falls 2.0 -> 0.87 and the
   overshoot is gone. `k` is the descent's eased clock, 0..1; `startU` the
   climb fraction it began from. */
export function descentU(startU, k) {
  if (!(k < 1)) return 0;
  const top = Math.max(0, Math.min(1, startU)) * CAMERA_SECONDS;
  const a = ascentAt(top) * (1 - smoother(Math.max(0, k)));
  if (!(a > 0)) return 0;
  let lo = 0, hi = top;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (ascentAt(mid) < a) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2 / CAMERA_SECONDS;
}

/** The lift and orbit share one flight clock. The first second keeps the
 * authored departure pose stable, then the counter-clockwise orbit starts
 * while the camera is still climbing. Increasing atan2(z,x) is
 * counterclockwise in the field's authored x/z plan (the same convention as
 * Final arcOf). World up stays fixed: this orbit has no roll. */
export function manifestoPose(from, seconds, aspect = 1.6) {
  // The lift and orbit overlap. Keeping the old 2.2s phase boundary made the
  // camera visibly settle before the counter-clockwise expansion began.
  const lift = smoother(seconds / 3.0);
  const spiral = smoother((seconds - SPIRAL_START_SECONDS) / (CAMERA_SECONDS - SPIRAL_START_SECONDS));
  const ascent = ascentAt(seconds);
  const az = Math.atan2(from.position.z, from.position.x) + spiral * Math.PI * 100 / 180;
  const r = mix(Math.hypot(from.position.x, from.position.z), aspect < 0.9 ? 115 : 60, spiral);
  const height = Math.max(70, 76 / Math.max(0.38, aspect));
  const portrait = aspect < 0.9;
  const side = portrait ? 0 : 21;
  const ahead = portrait ? 42 : 0;
  // Keep the reading column clear by easing the dense field toward the
  // right-hand middle as the aerial view settles. Translating the camera and
  // target together preserves the authored orbit while changing only the
  // screen-space composition. Portrait needs a larger world-space offset
  // because its narrower aspect magnifies horizontal framing changes.
  const { x: shiftX, z: shiftZ } = frameShiftAt(seconds, aspect, from);
  return {
    position: {
      x: (seconds <= SPIRAL_START_SECONDS ? from.position.x : Math.cos(az) * r) + shiftX,
      y: from.position.y + 8 * lift + (height - from.position.y - 8) * ascent,
      z: (seconds <= SPIRAL_START_SECONDS ? from.position.z : Math.sin(az) * r) + shiftZ,
    },
    target: {
      x: mix(from.target.x, -3 - Math.sin(az) * side + Math.cos(az) * ahead, spiral) + shiftX,
      y: mix(mix(from.target.y, 3.15, lift), 0.4, spiral),
      z: mix(from.target.z, -1 + Math.cos(az) * side + Math.sin(az) * ahead, spiral) + shiftZ,
    },
    fov: mix(from.fov, 46, lift),
    field: smoother((seconds - SPIRAL_START_SECONDS) / 4.5),
    atmosphere: smoother(seconds / 8),
  };
}

// Seeded placement, prepared at construction rather than during flight.
//
// A COLONY GROWS IN PATCHES (2026-10-04 — Hannah, from orbit: the outskirts
// look "less organic... less alive"; "the ordering of them should be a bit
// more chaotic... clumps of them"; "some of the outlines in mushrooms feel
// way larger"). The field used to be one rejection pass with a single wide
// keep-out (3.2 + 1.8*(s+s') ~ 6 u), which is a Poisson-disc sampler: every
// body equally far from every other, an even sheet. And it sized them
// 0.46-1.01 (median 0.73) against the epilogue's own far bodies at 0.13-0.59
// (median ~0.31) — two and a half times larger, with even its seats floored
// to 0.45 — so the colony read as a different, coarser species.
// It now grows the way a mycelium fruits: patches — tufts, fairy-ring arcs
// and loose drifts — around a seeded set of centres, with bare ground
// between them and a few loners; bodies keep only a cap-to-cap clearance, so
// a tuft can crowd. Sizes follow the field: mostly small, a few elders at a
// tuft's heart. The count stays 560: 720 measured 9.8 fps settled against
// 14.3 (1440x900), and patches fill the frame with bare ground, not bodies.
// Each patch carries whether it is shedding (`emits`), so
// whole clumps breathe spores and others stand still (colony.js).
export const AERIAL_SCALE_MIN = 0.2;
export const AERIAL_SCALE_MAX = 0.72;
const CAP_REACH = 2.35;             // anatomy CAP_R: a body's cap radius per unit scale
export function aerialPlacements(seats, random, groundY) {
  const bodies = seats.filter(s => s.tier >= 4).map(s => ({ ...s,
    yaw: random() * Math.PI * 2, tone: 0.38 + random() * 0.30, patch: -1, emits: false }));
  const occupied = [{ x: 0, z: 0, s: 1 }, ...seats];
  // The clearance test only ever needs NEARBY bodies, so occupancy lives in
  // a coarse grid.
  const CELL = 6;
  const grid = new Map();
  let maxS = 0;
  const key = (cx, cz) => cx * 4096 + cz;
  const occupy = (q) => {
    const k = key(Math.floor(q.x / CELL), Math.floor(q.z / CELL));
    (grid.get(k) || grid.set(k, []).get(k)).push(q);
    if (q.s > maxS) maxS = q.s;
  };
  occupied.forEach(occupy);
  // cap to cap, plus a hair; the field's seats and the hero keep a wider moat
  const clear = (q, s) => (q.tier !== undefined || q.patch === undefined ? 1.6 : 0.25) + CAP_REACH * 0.92 * (s + q.s);
  const collides = (x, z, s) => {
    const reach = Math.ceil((1.6 + CAP_REACH * (s + maxS)) / CELL);
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -reach; i <= reach; i++) for (let j = -reach; j <= reach; j++) {
      const cell = grid.get(key(cx + i, cz + j));
      if (cell && cell.some(q => Math.hypot(x - q.x, z - q.z) < clear(q, s))) return true;
    }
    return false;
  };
  const clampS = (v) => Math.max(AERIAL_SCALE_MIN, Math.min(AERIAL_SCALE_MAX, v));
  // mostly small, a long thin tail of large: the field's own shape
  const fieldScale = () => clampS(0.22 + Math.pow(random(), 2.2) * 0.42);
  const place = (x, z, s, patch, tone, emits) => {
    const r = Math.hypot(x, z);
    if (r < 8.5 || r > 116 || collides(x, z, s)) return false;
    const body = { x, z, gy: groundY(x, z), s, yaw: random() * Math.PI * 2, tone, patch, emits };
    bodies.push(body); occupy(body);
    return true;
  };
  const centres = [];
  let patch = 0;
  for (let tries = 0; tries < 6000 && bodies.length < AERIAL_BODY_COUNT; tries++) {
    // a few loners between the patches
    if (random() < 0.14) {
      const r = 9 + Math.pow(random(), 0.5) * 104, a = random() * Math.PI * 2;
      place(Math.cos(a) * r, Math.sin(a) * r, fieldScale(), -1, 0.30 + random() * 0.36, random() < 0.12);
      continue;
    }
    // patch centres keep the old gentle bias toward the perimeter, and
    // their own elbow room so bare ground survives between them
    const r = 10 + Math.pow(random(), 0.5) * 100, a = random() * Math.PI * 2;
    const cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    if (centres.some(c => Math.hypot(c.x - cx, c.z - cz) < 7 + 0.5 * c.size)) continue;
    const kind = random();
    const tone = 0.36 + random() * 0.34;             // a patch shares its light
    const emits = random() < 0.36;                   // ...and whether it is shedding
    const shed = () => emits && random() < 0.6;
    let size;
    if (kind < 0.28) {
      // a fairy-ring arc: one generation of bodies on the mat's growing edge
      const R = 2.4 + random() * 3.4, span = Math.PI * (0.7 + random() * 1.3), a0 = random() * Math.PI * 2;
      const n = 4 + Math.floor(random() * 6);
      const s0 = clampS(0.22 + random() * 0.14);
      for (let k = 0; k < n; k++) {
        const t = a0 + span * (k + 0.5 * random()) / n, rr = R * (0.92 + random() * 0.16);
        place(cx + Math.cos(t) * rr, cz + Math.sin(t) * rr, clampS(s0 * (0.8 + random() * 0.45)), patch, tone * (0.85 + random() * 0.3), shed());
      }
      size = R;
    } else if (kind < 0.78) {
      // a tuft: an elder at the heart (sometimes), younger bodies crowding it
      const sigma = 0.9 + random() * 1.5, n = 2 + Math.floor(random() * 6);
      if (random() < 0.55) place(cx, cz, clampS(0.42 + random() * 0.28), patch, tone * 1.1, shed());
      for (let k = 0; k < n * 3; k++) {
        const g = Math.sqrt(-2 * Math.log(1 - random() * 0.999)) * sigma, t = random() * Math.PI * 2;
        place(cx + Math.cos(t) * g, cz + Math.sin(t) * g, clampS(0.2 + Math.pow(random(), 1.6) * 0.24), patch, tone * (0.8 + random() * 0.35), shed());
      }
      size = sigma * 2;
    } else {
      // a loose drift of a few bodies
      const sigma = 3 + random() * 3, n = 2 + Math.floor(random() * 4);
      for (let k = 0; k < n * 2; k++) {
        const g = Math.sqrt(-2 * Math.log(1 - random() * 0.999)) * sigma, t = random() * Math.PI * 2;
        place(cx + Math.cos(t) * g, cz + Math.sin(t) * g, fieldScale(), patch, tone * (0.8 + random() * 0.4), shed());
      }
      size = sigma * 2;
    }
    centres.push({ x: cx, z: cz, size });
    patch++;
  }
  return bodies.slice(0, seats.filter(s => s.tier >= 4).length + AERIAL_BODY_COUNT);
}

// The reveal window is tied to the camera's actual projected frame, not a
// synchronous world-space ring. Planning runs once per entry; the GPU samples
// these fixed windows from the same clock as the reversible camera pose.
export function aerialRevealAt(seconds, start, duration) {
  if (start < 0) return 1;
  const t = clamp01((seconds - start) / duration);
  return t * t * (3 - 2 * t);
}
export function planAerialReveals(bodies, from, aspect, output) {
  const frames = [];
  for (let seconds = 2.5; seconds <= 27; seconds += 0.25) {
    const pose = manifestoPose(from, seconds, aspect);
    const { position: p, target: q } = pose;
    const n = Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z);
    const fx = (q.x-p.x)/n, fy = (q.y-p.y)/n, fz = (q.z-p.z)/n;
    const h = Math.hypot(fx,fz), rx = -fz/h, rz = fx/h;
    frames.push({ seconds, p, fx, fy, fz, rx, rz,
      ux: -fy*rz, uy: fx*rz-fz*rx, uz: fy*rx,
      tangent: Math.tan(pose.fov*Math.PI/360) });
  }
  const edgeLoad = new Uint16Array(4 * 7);
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (b.tier >= 4) { output[i*2] = -1; output[i*2+1] = 1; continue; }
    const hash = Math.sin(b.x*12.9898 + b.z*78.233) * 43758.5453;
    const jitter = hash - Math.floor(hash);
    const desired = Math.min(25.5, 1.8 + Math.hypot(b.x,b.z)*0.15 + jitter*4.8);
    let best = Infinity, start = desired, chosen = -1;
    for (const f of frames) {
      const x = b.x-f.p.x, y = b.gy+b.s*3.2-f.p.y, z = b.z-f.p.z;
      const depth = x*f.fx+y*f.fy+z*f.fz;
      if (depth <= 0) continue;
      const nx = (x*f.rx+z*f.rz)/(depth*f.tangent*aspect);
      const ny = (x*f.ux+y*f.uy+z*f.uz)/(depth*f.tangent);
      const edge = Math.max(Math.abs(nx),Math.abs(ny));
      if (edge > 1.02) continue;
      const reading = aspect < 0.9 ? ny < 0.30 : nx < -0.05;
      const side = Math.abs(nx) > Math.abs(ny) ? (nx > 0 ? 0 : 1) : (ny > 0 ? 2 : 3);
      const bucket = Math.min(6, Math.floor(f.seconds/4))*4 + side;
      // Prefer arrivals just inside the frame, with a loose placement-seeded
      // cadence; the reading column is the last choice for an arrival.
      const score = Math.abs(f.seconds-desired)*0.16 + Math.abs(edge-0.82)*3 + (reading ? 0.2 : 0) + edgeLoad[bucket]*0.18;
      if (score < best) { best = score; start = f.seconds; chosen = bucket; }
    }
    if (chosen >= 0) edgeLoad[chosen]++;
    const duration = 1.3 + jitter*1.5;
    output[i*2] = Math.min(28-duration, Math.max(2.5, start + jitter*0.55));
    output[i*2+1] = duration;
  }
  return output;
}
