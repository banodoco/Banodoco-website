// The cap is a solid obstacle to its own shed. Work in its moving local
// frame, steering air along the lower gill envelope before contact.
export function createCapFlow(capUnderPt, rimRad) {
  function surface(x, z) {
    let u = 0, a = 0;
    for (let j = 0; j < 4; j++) {
      const qx = x + .075 * (1 - Math.min(u * u, 1));
      a = Math.atan2(z, qx); u = Math.hypot(qx, z) / rimRad(a);
    }
    if (u >= 1 || u <= .09) return null;
    return capUnderPt(u, a).y - .056;
  }
  function topHeight(x, z) {
    let u = 0, a = 0;
    for (let j = 0; j < 6; j++) {
      const qx = x + .15 * (1 - Math.min(u * u, 1));
      a = Math.atan2(z, qx); u = Math.hypot(qx, z) / rimRad(a);
    }
    u = Math.min(u, 1);
    if (a < 0) a += Math.PI * 2;
    const fold = Math.atan2(Math.sin(a - 5.3), Math.cos(a - 5.3)) / .35;
    const rim = -.16 * Math.cos(a - 3.6) + .05 * Math.cos(2 * a + .7) - .13 * Math.exp(-fold * fold);
    const margin = Math.max(0, (u - .78) / .22);
    const lump = (.038 * Math.sin(u * 6.3 + a * 2.1 + 1)
      + .026 * Math.sin(u * 9.7 - a * 3.3 + 2)) * Math.sin(Math.PI * u);
    return 3.15 + 1.22 * Math.pow(Math.max(0, Math.cos(u * Math.PI / 2)), 1.15)
      + rim * Math.pow(u, 1.6) - (.11 + .05 * Math.cos(a - 3.6)) * margin * margin + lump;
  }
  function seed(p, clearance = .16) {
    if (p.y < 2.3 || p.y > 4.5 || p.x * p.x + p.z * p.z > 8.5) return;
    if (p.y > topHeight(p.x, p.z)) return;
    const h = surface(p.x, p.z);
    // Only initialization: born-in-flesh samples belong below their gills.
    // No live position is ever remapped this way.
    if (h !== null && p.y > h - clearance) { p.y = h - clearance; return true; }
  }
  function advance(from, to, dt) {
    if (dt <= 0 || from.y < 2.2 || from.y > 4.5
      || from.x * from.x + from.z * from.z > 8.5) return;
    const currentH = surface(from.x, from.z), candidateH = surface(to.x, to.z);
    if (currentH === null && candidateH !== null && to.y > candidateH - .06
      && to.y < topHeight(to.x, to.z)) {
      // An exterior rising mote may approach the rolled rim sideways.
      // Keep its vertical travel outside instead of entering the cap edge.
      // Leave a tiny clearance for the Float32 world-position roundtrip;
      // holding exactly at the rim can classify the next frame as inside.
      const r = Math.hypot(from.x, from.z), margin = r < .3 ? -.003 : .003;
      to.x = from.x + from.x / r * margin;
      to.z = from.z + from.z / r * margin;
      return true;
    }
    const h = currentH ?? candidateH;
    if (h === null) return;
    const top = topHeight(from.x, from.z);
    if (from.y >= top - .003) {
      // Exterior air may also approach the curved upper shell at the rim.
      // Limit its entering velocity; keep genuinely above-cap travel intact.
      const nextTop = topHeight(to.x, to.z);
      if (candidateH !== null && to.y < nextTop) {
        to.y = from.y + Math.max(to.y - from.y, nextTop - top + .003);
        return true;
      }
      return;
    }
    const clearance = h - from.y;
    if (clearance >= .28) return;
    const hx = surface(from.x + .005, from.z), hz = surface(from.x, from.z + .005);
    const nx = hx === null ? 0 : (hx - h) / .005;
    const nz = hz === null ? 0 : (hz - h) / .005;
    let dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
    const inward = dx * nx - dy + dz * nz;
    const q = Math.max(0, Math.min(1, (clearance - .10) / .18));
    const contact = 1 - q * q * (3 - 2 * q);
    if (inward < 0) {
      const correction = -inward * contact / (1 + nx * nx + nz * nz);
      dx += correction * nx; dy -= correction; dz += correction * nz;
    }
    // A small outward air slip lets the shed leave the skirt instead of
    // accumulating against it. Its normal component is directed away too.
    const r = Math.hypot(from.x, from.z), slip = .075 * dt * contact;
    if (r > .1) { dx += from.x / r * slip; dz += from.z / r * slip; }
    dy -= .035 * dt * contact;
    to.set(from.x + dx, from.y + dy, from.z + dz);
    const nextH = surface(to.x, to.z);
    // Curved/rolled rim can descend across an outward step. Limit that
    // proposed velocity, never snap the current position onto a surface.
    if (nextH !== null && nextH - to.y < Math.min(.06, clearance)) {
      to.y = from.y + Math.min(dy, nextH - h);
    }
    return true;
  }
  return { surface, topHeight, seed, advance };
}
