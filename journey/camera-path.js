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

export function arcLerp(a, b, e, out, az1, bow, rise) {
  const rA = radOf(a), rB = radOf(b);
  const d = az1 === undefined || az1 === null ? azDelta(a, b) : az1;
  const az = rA < 1e-3 ? azOf(b) : rB < 1e-3 ? azOf(a) : azOf(a) + d * e;
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

/** Plateau envelope for a held mid-flight excursion: quintic-smoothstep up
 *  over eased phase [0, ein], 1 across the middle, quintic down over
 *  [1 - eout, 1]. Both shoulders have zero first AND second derivative at
 *  their ends, so a channel mixed by this window leaves its endpoints with
 *  the same C2 stillness the master ease already guarantees — w(0) = w(1)
 *  = 0 keeps a settled or dt = 0 frame byte-identical, the arcLerp rule.
 *  The sin(PI e) swell above is one bump; this is the bump given a flat
 *  top, for a value that must be REACHED, HELD, then surrendered. */
export function skimWindow(e, ein, eout) {
  const s = (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return x * x * x * (x * (x * 6 - 15) + 10);
  };
  return s(e / ein) * s((1 - e) / eout);
}
