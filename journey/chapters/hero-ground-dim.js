/* One scene-lifetime owner for chapter dimming of the hero ground network.
 *
 * Connect and Final/Purpose both borrow the same seven organism materials.
 * Independent "capture base / scale / restore" loops are not reversible:
 * when their active windows overlap, the later chapter can capture the
 * earlier chapter's already-dimmed value as its base and restore that darker
 * value forever. This ledger captures the authored values once and lets each
 * chapter publish only its requested factor. The darkest active request wins
 * per material; requests never multiply, and releasing one cannot erase a
 * sibling request that is still live. */

const LEDGERS = new WeakMap();

function groundEntries(sceneApi) {
  const ground = sceneApi.groups && sceneApi.groups.ground;
  if (!ground) return [];
  return ground.children
    .filter(o => o.material && (
      (o.material.uniforms && o.material.uniforms.uWin)
      || (o.material.userData && o.material.userData.uWin)))
    .map(o => {
      const material = o.material;
      const uniform = material.uniforms && material.uniforms.uOpacity;
      return {
        object: o,
        uniform: uniform || null,
        material: uniform ? null : material,
        base: uniform ? uniform.value : material.opacity,
        visible: o.visible,
      };
    })
    .filter(entry => typeof entry.base === 'number');
}

function ledgerFor(sceneApi) {
  let ledger = LEDGERS.get(sceneApi);
  if (ledger) return ledger;
  ledger = { entries: groundEntries(sceneApi), claims: new Map() };
  LEDGERS.set(sceneApi, ledger);
  return ledger;
}

function paint(ledger) {
  ledger.entries.forEach((entry, index) => {
    let factor = 1;
    let visible = entry.visible;
    for (const claim of ledger.claims.values()) {
      const keep = claim.keeps[index] ?? claim.fallback;
      const requested = 1 - claim.reach * (1 - keep);
      factor = Math.min(factor, requested);
      if (entry.object.isPoints && claim.pointThreshold !== null
          && requested <= claim.pointThreshold) visible = false;
    }
    if (entry.uniform) entry.uniform.value = entry.base * factor;
    else entry.material.opacity = entry.base * factor;
    entry.object.visible = visible;
  });
}

/** A chapter-local handle onto the shared hero-ground dim ledger. */
export function createHeroGroundDimClaim(sceneApi, {
  keeps,
  fallback = 0.5,
  pointThreshold = null,
} = {}) {
  const ledger = ledgerFor(sceneApi);
  const token = Symbol('hero-ground-dim');
  const claim = { keeps: keeps || [], fallback, pointThreshold, reach: 0 };
  let active = false;

  return {
    set(reach) {
      const next = Math.max(0, Math.min(1, Number(reach) || 0));
      if (next <= 0.001) {
        if (active) {
          ledger.claims.delete(token);
          active = false;
          paint(ledger);
        }
        return;
      }
      claim.reach = next;
      ledger.claims.set(token, claim);
      active = true;
      paint(ledger);
    },
    clear() {
      if (!active) return;
      ledger.claims.delete(token);
      active = false;
      paint(ledger);
    },
    get active() { return active; },
  };
}

