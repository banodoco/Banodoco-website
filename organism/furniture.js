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
//
// =====================================================================
// STABLE CALLOUTS (Hannah, 2026-08-05): "in the hero section, make it so
// the CONNECT and INSPIRE and EQUIP labels and arrows don't move with the
// wind — they should stay stable."
//
// Measured first, at 1440x900, 900 frames (~15 s, ~3 full breeze cycles),
// before changing anything. TWO independent sources of motion, and the
// hero camera is NOT one of them:
//
//   camera.position   range 0.000e+0 on x, y, z
//   controls.target   range 0.000e+0 on x, y, z
//   camera.quaternion range 0.000e+0 on x, y, z, w
//
// The hero camera is bit-exact static — OrbitControls' damping has nothing
// to damp with no input, and nothing else writes it at the Mission pose. So
// neither a drifting nor a "breathing" camera was ever in play, and no
// per-frame recomputation of the leader/tag geometry is either: the leaders
// are static CSS, and this animator is the only thing that positions them.
//
//   1. EQUIP rode the breeze BY REQUEST — `sway: true` applied
//      swayGroup.matrixWorld, so its anchor swung with the stalk.
//      Measured excursion: 7.4-12.6 px horizontally depending on gust
//      phase. This is the motion Hannah actually sees.
//
//   2. ALL THREE carried a 0.6-0.7 px wobble that was not scene motion at
//      all: TAA jitters `camera.projectionMatrix` elements [8] and [9] by
//      +/-0.4 px of a Halton(2,3) walk (organism.js taaFrame(), which runs
//      LAST in the frame — so this animator reads the PREVIOUS frame's
//      jitter and inherits a sub-pixel tremor). Invisible on its own, but
//      it is jitter rather than motion, and a "stable" callout should not
//      have any.
//
// Both are fixed below, and the fix for (2) is deliberately not a rounding
// or a damping hack: it projects through the camera's CLEAN projection,
// which is the matrix that was true before the renderer borrowed it.
//
// TREATMENT CHOSEN FOR EQUIP — a static world anchor (dropping `sway`),
// NOT a damped follower. The two candidates the brief raised collapse into
// one here: swayGroup carries rotation ONLY (organism.js sets rotation.z /
// rotation.x and never a position), and it sits at the world origin, so
// "anchor to the sway pivot rather than the swaying tip" and "use the
// static world point" are arithmetically the SAME point — the anchor's
// rest position. That is what this now uses.
//
// It does not lie about what the leader points at. The anchor sits at
// y = 1.60 on the stalk; the sway reaches ~0.034 rad, so the real stalk
// point at that height swings ~1.60 * sin(0.034) = 0.054 world units either
// side of it — the measured 7.4-12.6 px. The stalk is far wider than that
// on screen, so the leader lands on the stalk at every phase of the breeze;
// it annotates the stem, and the stem is still under it. Heavy damping was
// rejected because a damped follower is still moving, just lazily, and
// rubber-banding against the wind reads worse than holding still.
// =====================================================================
//
// `sway` itself stays SUPPORTED below — it is the organism's documented
// tracker option (see createScene's JSDoc) and this module does not get to
// retire another module's API. What changed is that the PAGE stopped asking
// for it: main.js's equip tracker no longer sets the flag. Any future tracker
// that genuinely wants to ride the stalk can still say so.
export function registerTrackers(ctx) {
  const { trackers, camera, swayGroup, addAnimator } = ctx;
  const _trackV = new THREE.Vector3();
  // The camera's projection with TAA's sub-pixel jitter taken back out.
  // Rebuilt per frame because a ?free=1 orbit or a setView() fov ease can
  // change the real projection at any time — this must track those, and
  // ONLY reject the jitter.
  const _clean = new THREE.Matrix4();
  addAnimator('trackers', () => {
    // elements[8] / [9] are the frustum's x/y skew. taaFrame() ADDS the
    // Halton offset into exactly these two, and this camera never sets a
    // view offset or film offset, so their true value is 0 in every frame.
    // Zeroing them is therefore an exact undo, not an approximation.
    _clean.copy(camera.projectionMatrix);
    _clean.elements[8] = 0;
    _clean.elements[9] = 0;
    for (const tr of trackers) {
      _trackV.set(tr.pos[0], tr.pos[1], tr.pos[2]);
      // sway:true pins the point to the mushroom itself, so it rides the
      // breeze. No tracker on this page asks for it any more (see above).
      if (tr.sway) _trackV.applyMatrix4(swayGroup.matrixWorld);
      // This is Vector3.project() with the clean matrix substituted:
      // matrixWorldInverse is affine (w stays 1), and the second
      // applyMatrix4 does the perspective divide, exactly as project() does.
      _trackV.applyMatrix4(camera.matrixWorldInverse).applyMatrix4(_clean);
      const sx = (_trackV.x * 0.5 + 0.5) * innerWidth;
      const sy = (-_trackV.y * 0.5 + 0.5) * innerHeight;
      tr.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      tr.el.style.visibility = _trackV.z < 1 ? 'visible' : 'hidden';
    }
  });
}
