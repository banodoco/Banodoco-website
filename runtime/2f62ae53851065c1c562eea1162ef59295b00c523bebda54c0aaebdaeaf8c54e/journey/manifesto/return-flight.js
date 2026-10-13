import { clamp01, smoother } from './pose.js';

const angleDelta = (from, to) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
const angles = new Set(['yaw', 'pitch', 'roll']);
export function returnChannels(pose) {
  const dx = pose.target.x - pose.position.x, dy = pose.target.y - pose.position.y;
  const dz = pose.target.z - pose.position.z;
  return { x: pose.position.x, y: pose.position.y, z: pose.position.z,
    yaw: pose.viewAngles?.yaw ?? Math.atan2(dz, dx),
    pitch: pose.viewAngles?.pitch ?? Math.atan2(dy, Math.hypot(dx, dz)),
    roll: pose.roll || 0, distance: Math.hypot(dx, dy, dz), fov: pose.fov };
}
export function returnVelocity(previous, current, seconds) {
  const a = returnChannels(previous), b = returnChannels(current), velocity = {};
  for (const key of Object.keys(a)) velocity[key] =
    (angles.has(key) ? angleDelta(a[key], b[key]) : b[key] - a[key]) / seconds;
  return velocity;
}
export function createReturnFlight(from, to, seconds, velocity = {}) {
  const a = returnChannels(from), b = returnChannels(to);
  for (const key of angles) b[key] = a[key] + angleDelta(a[key], b[key]);
  return { from, to, a, b, seconds, velocity: velocity || {} };
}
/** One camera move, rather than a blend of two independently rewound lifts.
 * Interpolate viewing angles explicitly: near vertical, lerped look-at targets
 * can cancel their tiny horizontal components and flip the camera's heading.
 * The quintic tangent carries the displayed velocity into an early return or
 * a retarget, and reaches zero velocity/acceleration at the exact landing. */
export function sampleReturnFlight(flight, progress) {
  const k = clamp01(progress);
  const w = smoother(k), tangent = k - 6*k**3 + 8*k**4 - 3*k**5;
  const value = {};
  for (const key of Object.keys(flight.a)) value[key] = flight.a[key]
    + (flight.b[key] - flight.a[key]) * w
    + (flight.velocity[key] || 0) * flight.seconds * tangent;
  const c = Math.cos(value.roll), s = Math.sin(value.roll);
  let up = { x: -Math.cos(value.yaw)*Math.sin(value.pitch)*c - Math.sin(value.yaw)*s,
    y: Math.cos(value.pitch)*c,
    z: -Math.sin(value.yaw)*Math.sin(value.pitch)*c + Math.cos(value.yaw)*s };
  // Turn the displayed frame toward the destination, rather than blending
  // world-up headings at the overhead pole. Transporting both gaze and up
  // along the shortest rotation keeps the frame continuous through vertical.
  // Short, shallow reversals retain their original gesture; a longer fall
  // has room to find the subject before settling into its authored framing.
  const aim = smoother(k / 0.7) * smoother((flight.seconds - 4) / 2);
  let forward = { x: Math.cos(value.yaw) * Math.cos(value.pitch),
    y: Math.sin(value.pitch), z: Math.sin(value.yaw) * Math.cos(value.pitch) };
  const dx = flight.to.target.x - value.x, dy = flight.to.target.y - value.y;
  const dz = flight.to.target.z - value.z, length = Math.hypot(dx, dy, dz);
  const toward = length > 1e-8 ? { x: dx / length, y: dy / length, z: dz / length } : forward;
  const axis = { x: forward.y * toward.z - forward.z * toward.y,
    y: forward.z * toward.x - forward.x * toward.z,
    z: forward.x * toward.y - forward.y * toward.x };
  const sine = Math.hypot(axis.x, axis.y, axis.z);
  const cosine = forward.x * toward.x + forward.y * toward.y + forward.z * toward.z;
  if ((sine > 1e-8 || cosine < 0) && aim > 0) {
    // At exactly opposite bearings, the displayed up supplies a stable
    // perpendicular axis instead of normalising a zero cross product.
    for (const key of ['x', 'y', 'z']) axis[key] = sine > 1e-8 ? axis[key] / sine : up[key];
    const angle = Math.atan2(sine, cosine) * aim, cA = Math.cos(angle), sA = Math.sin(angle);
    const rotate = v => {
      const dot = axis.x * v.x + axis.y * v.y + axis.z * v.z;
      return { x: v.x * cA + (axis.y * v.z - axis.z * v.y) * sA + axis.x * dot * (1 - cA),
        y: v.y * cA + (axis.z * v.x - axis.x * v.z) * sA + axis.y * dot * (1 - cA),
        z: v.z * cA + (axis.x * v.y - axis.y * v.x) * sA + axis.z * dot * (1 - cA) };
    };
    forward = rotate(forward); up = rotate(up);
    value.yaw = Math.atan2(forward.z, forward.x);
    value.pitch = Math.atan2(forward.y, Math.hypot(forward.x, forward.z));
    const sinP = Math.sin(value.pitch), cosP = Math.cos(value.pitch);
    value.roll = Math.atan2(-up.x * Math.sin(value.yaw) + up.z * Math.cos(value.yaw),
      -up.x * Math.cos(value.yaw) * sinP + up.y * cosP - up.z * Math.sin(value.yaw) * sinP);
  }
  const endpoint = k <= 0 ? flight.from : k >= 1 ? flight.to : null;
  return { up, viewAngles: { yaw: value.yaw, pitch: value.pitch },
    position: endpoint?.position || { x: value.x, y: value.y, z: value.z },
    target: endpoint?.target || { x: value.x + forward.x * value.distance,
      y: value.y + forward.y * value.distance,
      z: value.z + forward.z * value.distance },
    fov: value.fov, roll: value.roll };
}
