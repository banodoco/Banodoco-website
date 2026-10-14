/** Apply a camera bank around its viewing axis, leaving DOM copy upright. */
export function applyCameraRoll(camera, target, roll = 0) {
  const dx = target.x - camera.position.x;
  const dy = target.y - camera.position.y;
  const dz = target.z - camera.position.z;
  const length = Math.hypot(dx, dy, dz) || 1;
  const x = dx / length, y = dy / length, z = dz / length;
  const c = Math.cos(roll), s = Math.sin(roll), k = 1 - c;
  camera.up.set(-z * s + x * y * k, c + y * y * k, x * s + z * y * k);
  camera.userData ||= {};
  camera.userData.journeyRoll = roll;
  camera.lookAt(target);
}
