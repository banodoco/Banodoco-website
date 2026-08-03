// organism/furniture.js — scene-owned page furniture: the region-highlight
// glow behind the hero callouts (§11) and the tracker projection that pins
// the callout DOM to world anchors. Split out of the createScene closure at
// merge step M2 with zero behaviour change; shared state arrives through
// `ctx` (built in organism.js). The page's entry wiring lives in main.js;
// the intro fast-forward is intro.js's accelerate() (M5).
import * as THREE from 'three';

// =====================================================================
// 11. REGION HIGHLIGHTS — HUD callout hover glow
// =====================================================================
// Each region eases toward its target and glows with a slow breathing pulse
// while hot. Brightness rides on top of the materials' base opacities.
// Called at §11's original position: base opacities are captured HERE, after
// every material exists and before any animator has touched them.
export function createHighlights(ctx) {
  const { sporePts, stemGroup, groundGroup } = ctx;
  const _hl = {
    spores: { h: 0, tgt: 0, mats: [], gain: 0.85 }, // already bright; hover lifts it further
    stem:   { h: 0, tgt: 0, mats: [], gain: 0.42 },
    ground: { h: 0, tgt: 0, mats: [], gain: 0.42 },
  };
  function _hlCollect(root, list) {
    root.traverse(o => {
      const m = o.material;
      if (!m) return;
      if (m.uniforms && m.uniforms.uOpacity) list.push({ m, base: m.uniforms.uOpacity.value, pt: true });
      else if (m.transparent && m.blending === THREE.AdditiveBlending) list.push({ m, base: m.opacity, pt: false });
    });
  }
  _hlCollect(sporePts, _hl.spores.mats);
  _hlCollect(stemGroup, _hl.stem.mats);
  _hlCollect(groundGroup, _hl.ground.mats);
  let _hlPrevT = 0;
  function _hlUpdate(t) {
    const dt = Math.min(0.05, Math.max(0, t - _hlPrevT));
    _hlPrevT = t;
    for (const k in _hl) {
      const g = _hl[k];
      g.h += (g.tgt - g.h) * Math.min(1, dt * 5);
      if (g.h < 0.004 && g.tgt === 0) { if (g.hot) { g.hot = false; g.h = 0; } else continue; }
      else g.hot = true;
      const boost = 1 + g.h * (g.gain + g.gain * 0.38 * Math.sin(t * 3.1));
      for (const e of g.mats) {
        if (e.pt) e.m.uniforms.uOpacity.value = e.base * boost;
        else e.m.opacity = Math.min(1, e.base * boost);
      }
    }
  }
  return {
    update: _hlUpdate,
    /** Ease a highlighted region ('spores' | 'stem' | 'ground') toward on/off; unknown names are ignored. */
    setHighlight(name, on) { if (_hl[name]) _hl[name].tgt = on ? 1 : 0; },
  };
}

// ---- trackers: HUD annotations projected to screen space every frame ----
// Called at the 'trackers' animator's original registration position — the
// order matters: 'breeze' calls swayGroup.updateMatrixWorld(true) earlier in
// the same frame specifically so this projection reads a current matrix.
export function registerTrackers(ctx) {
  const { trackers, camera, swayGroup, addAnimator } = ctx;
  const _trackV = new THREE.Vector3();
  addAnimator('trackers', () => {
    for (const tr of trackers) {
      _trackV.set(tr.pos[0], tr.pos[1], tr.pos[2]);
      // sway:true pins the point to the mushroom itself, so it rides the breeze
      if (tr.sway) _trackV.applyMatrix4(swayGroup.matrixWorld);
      _trackV.project(camera);
      const sx = (_trackV.x * 0.5 + 0.5) * innerWidth;
      const sy = (-_trackV.y * 0.5 + 0.5) * innerHeight;
      tr.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      tr.el.style.visibility = _trackV.z < 1 ? 'visible' : 'hidden';
    }
  });
}
