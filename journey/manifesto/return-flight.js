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
  const reach = Math.cos(value.pitch) * value.distance;
  const c = Math.cos(value.roll), s = Math.sin(value.roll);
  const up = { x: -Math.cos(value.yaw)*Math.sin(value.pitch)*c - Math.sin(value.yaw)*s,
    y: Math.cos(value.pitch)*c,
    z: -Math.sin(value.yaw)*Math.sin(value.pitch)*c + Math.cos(value.yaw)*s };
  const endpoint = k <= 0 ? flight.from : k >= 1 ? flight.to : null;
  return { up, viewAngles: { yaw: value.yaw, pitch: value.pitch },
    position: endpoint?.position || { x: value.x, y: value.y, z: value.z },
    target: endpoint?.target || { x: value.x + Math.cos(value.yaw) * reach,
      y: value.y + Math.sin(value.pitch) * value.distance,
      z: value.z + Math.sin(value.yaw) * reach },
    fov: value.fov, roll: value.roll };
}
