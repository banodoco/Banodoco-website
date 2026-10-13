// Mobile's distant cameras need more reach than the intro's 7–20 unit fog.
// Shared claims prevent Purpose from overwriting Manifesto or Connect during
// overlapping transitions. Capture authored values once; never a sibling's fog.
const ledgers = new WeakMap();
export function createHeroBodyFogClaim(sceneApi) {
  let ledger = ledgers.get(sceneApi);
  if (!ledger) {
    const entries = [], slots = new Set();
    for (const root of [sceneApi.groups?.stem, sceneApi.groups?.mushroom]) root?.traverse(o => {
      for (const material of [].concat(o.material || [])) {
        const u = material.uniforms;
        if (!u?.fogNear || !u.fogFar || slots.has(u.fogNear)) continue;
        slots.add(u.fogNear); slots.add(u.fogFar);
        entries.push({ near: u.fogNear, far: u.fogFar, n0: u.fogNear.value, f0: u.fogFar.value });
      }
    });
    ledger = { entries, slots, claims: new Map() };
    ledgers.set(sceneApi, ledger);
  }
  const token = Symbol('body-fog');
  const paint = () => {
    for (const e of ledger.entries) {
      let near = e.n0, far = e.f0;
      for (const c of ledger.claims.values()) {
        near = Math.max(near, e.n0 + (c.near - e.n0) * c.reach);
        far = Math.max(far, e.f0 + (c.far - e.f0) * c.reach);
      }
      e.near.value = near; e.far.value = far;
    }
  };
  return {
    owns: slot => ledger.slots.has(slot),
    set(reach, near, far) {
      if (!(reach > 0)) { this.clear(); return; }
      ledger.claims.set(token, { reach: Math.min(1, reach), near, far });
      paint();
    },
    clear() { if (ledger.claims.delete(token)) paint(); },
  };
}
