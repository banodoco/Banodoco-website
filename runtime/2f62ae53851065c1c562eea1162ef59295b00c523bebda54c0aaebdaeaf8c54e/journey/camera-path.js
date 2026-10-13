const azOf = (v) => Math.atan2(v.x, v.z);
const radOf = (v) => Math.hypot(v.x, v.z);

function azDelta(a, b) {
  const d = azOf(b) - azOf(a);
  return d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d;
}

export function azTurn(a, b, turn) {
  const d = azDelta(a, b);
  if (turn > 0 && d < 0) return d + 2 * Math.PI;
  if (turn < 0 && d > 0) return d - 2 * Math.PI;
  return d;
}

/* `eAz` lets the AZIMUTH ALONE run on a different ease from the rest of the
   pose. Only the interrupt's momentum spends it (journey.js: THE INTERRUPT'S
   MOMENTUM) — the opening slope it carries is derived from the azimuth's own
   rate, so radius, height and every channel keyed off `e` would overshoot for
   a reason that is not theirs. Omitted, it IS `e`, so every other caller and
   every settled frame is byte-identical. */
export function arcLerp(a, b, e, out, az1, bow, rise, eAz) {
  const rA = radOf(a), rB = radOf(b);
  const d = az1 === undefined || az1 === null ? azDelta(a, b) : az1;
  const eA = eAz === undefined || eAz === null ? e : eAz;
  const az = rA < 1e-3 ? azOf(b) : rB < 1e-3 ? azOf(a) : azOf(a) + d * eA;
  const swell = bow || rise ? Math.sin(Math.PI * e) : 0;
  const r = rA + (rB - rA) * e + (bow || 0) * swell;
  const y = a.y + (b.y - a.y) * e + (rise || 0) * swell;
  return out.set(Math.sin(az) * r, y, Math.cos(az) * r);
}

export function arcLength(a, b, az1) {
  const rA = radOf(a), rB = radOf(b);
  const d = az1 === undefined || az1 === null ? azDelta(a, b) : az1;
  return Math.hypot(Math.abs(d) * 0.5 * (rA + rB), rB - rA, b.y - a.y);
}