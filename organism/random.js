import * as THREE from 'three';

/** Create the scene-local deterministic RNG and palette helpers. */
export function createRandomGeometryHelpers() {
  let seed = 1337;
  function rand() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function randRange(a, b) { return a + (b - a) * rand(); }
  function gauss() { return (rand() + rand() + rand() + rand() - 2) / 2; }

  const C_DARK  = new THREE.Color(0x421c05);
  const C_MID   = new THREE.Color(0xb96b1c);
  const C_AMBER = new THREE.Color(0xf5a63c);
  const C_HOT   = new THREE.Color(0xffdfae);
  const C_WHITE = new THREE.Color(0xfff3e0);
  function heat(t, out) {
    t = Math.max(0, Math.min(1, t));
    const c = out || new THREE.Color();
    if (t < 0.35)      c.lerpColors(C_DARK, C_MID,  t / 0.35);
    else if (t < 0.65) c.lerpColors(C_MID, C_AMBER, (t - 0.35) / 0.3);
    else if (t < 0.88) c.lerpColors(C_AMBER, C_HOT, (t - 0.65) / 0.23);
    else               c.lerpColors(C_HOT, C_WHITE, (t - 0.88) / 0.12);
    return c;
  }

  return { rand, randRange, gauss, heat };
}
