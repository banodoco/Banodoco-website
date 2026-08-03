// organism/intro.js — the entry growth choreography: draw-window keying,
// occluder-shell fades, and the 'intro-draw' animator. Split out of the
// createScene closure at merge step M2 with zero behaviour change; shared
// state arrives through `ctx` (built in organism.js). Runs unconditionally:
// even with intro=0 it sets every object's draw window and the stem clamp,
// exactly as the inline block did.
import * as THREE from 'three';

export function setupIntro(ctx) {
  const { scene, renderer, mushroom, stemGroup, groundGroup,
          drawU, drawWin, animators, addAnimator, intro } = ctx;

  // ---- entry draw: the specimen inks itself in, stroke by stroke ----
  // One master progress sweeps 0..1 over `intro` seconds; every drawable object
  // claims a window of it (below) and strokes itself in during that slice, in
  // buffer order — thread by thread across the ground, fibre by fibre up the
  // stipe, then the cap surfaces, the gills, the rim as the closing flourish,
  // and the spore plume last. Windows overlap so several pens are on the paper
  // at once, but the big arcs stay legible: ground -> stalk -> cap -> spores.
  // The black occluder shells are a wrinkle: near-black against the warm
  // background, a full-size mushroom SILHOUETTE would loom over the blank page
  // from the first frame. So they hide until the stipe is being drawn and fade
  // in just ahead of the cap surfaces — by the time gills ink in behind the
  // cap, the shells are back on occlusion duty.
  const _capShells = mushroom.children.filter(o => o.isMesh && !o.material.userData.uWin);
  const _stemShells = stemGroup.children.filter(o => o.isMesh && !o.material.userData.uWin);
  // The stem occluder's geometry runs up INSIDE the cap, like the fibres do.
  // The ink stops at the cap line (uClampY), so during the intro the shell
  // must be sliced there too — otherwise its naked top stands as a black slab
  // against the sky where nothing has been drawn yet. The plane is lifted at
  // park, once the cap's own shells hide the joint.
  renderer.localClippingEnabled = true;
  const _stemClip = [new THREE.Plane(new THREE.Vector3(0, -1, 0), 3.65)];
  function _shellFade(shells, k, clip) {
    for (const m of shells) {
      m.material.transparent = k < 1;
      m.material.opacity = k;
      m.material.clippingPlanes = clip;
      m.visible = k > 0;
    }
  }
  function shellsAt(p) {
    // solidity follows the ink: each shell fades in WHILE its region is being
    // stroked, so the body fills in under the accumulating lines. The stem
    // shell's clip plane also RISES with wave 1's climbing front (capped at
    // the cap line), so no dark body ever stands above the drawn strands.
    _stemClip[0].constant = Math.min(3.65, Math.max(0.02, ((p - 0.296) / 0.219) * 3.9));
    _shellFade(_stemShells, Math.min(1, Math.max(0, (p - 0.30) / 0.24)), _stemClip);
    _shellFade(_capShells, Math.min(1, Math.max(0, (p - 0.574) / 0.14)), null);
  }
  function shellsRestore() {
    _shellFade(_stemShells, 1, null);
    _shellFade(_capShells, 1, null);
  }
  {
    const filt = list => list.filter(o => o.material &&
      ((o.material.uniforms && o.material.uniforms.uWin) || o.material.userData.uWin));
    const [web, myc, mossPts, pools, roots, ribbon, beads] = filt(groundGroup.children);
    const [stemVerts, stemMesh, stemPts] = filt(stemGroup.children);
    const [capMesh, overlay, overlayPts, gills, gillCore, rim, rimPts, capBeads] =
      filt(mushroom.children);
    const [motes, spores] = filt(scene.children);
    // The ground does not scatter in at random — it CONVERGES. Every ground
    // vertex is re-keyed to draw by distance from the mushroom's base,
    // outermost first, so all the threads stream inward together and arrive
    // at the foot of the stem just as the stalk fires upward. The mushroom
    // is what everything is moving toward.
    function convergeDraw(obj) {
      const pos = obj.geometry.attributes.position;
      const a = obj.geometry.attributes.aDraw;
      let rMin = Infinity, rMax = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getZ(i));
        if (r < rMin) rMin = r;
        if (r > rMax) rMax = r;
      }
      const span = (rMax - rMin) || 1;
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getZ(i));
        a.setX(i, (rMax - r) / span);
      }
      a.needsUpdate = true;
    }
    for (const o of [web, myc, mossPts, pools, roots, ribbon, beads]) convergeDraw(o);
    // The stalk rises the same way: draw order re-keyed by HEIGHT, so every
    // strand climbs together as one wave (a ring of ember light riding up the
    // stem) instead of strand-by-strand around the circumference — which made
    // far-side strands look like they simply appeared.
    function riseDraw(obj) {
      const pos = obj.geometry.attributes.position;
      const a = obj.geometry.attributes.aDraw;
      let yMin = Infinity, yMax = -Infinity;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < yMin) yMin = y;
        if (y > yMax) yMax = y;
      }
      const span = (yMax - yMin) || 1;
      for (let i = 0; i < pos.count; i++) a.setX(i, (pos.getY(i) - yMin) / span);
      a.needsUpdate = true;
    }
    for (const o of [stemVerts, stemMesh, stemPts]) riseDraw(o);
    const WINDOWS = [
      // Fractions of a 5.4s intro. The ground keeps its original absolute
      // pace; the stalk's two waves run at HALF speed (double duration); the
      // cap sequence follows at its original pace, just later.
      // one shared converging wave: threads lead, dust trails a half-beat
      [web, 0.000, 0.311], [myc, 0.015, 0.311], [roots, 0.000, 0.311],
      [ribbon, 0.015, 0.311], [mossPts, 0.047, 0.326], [beads, 0.047, 0.326],
      [pools, 0.078, 0.326],
      // the stalk climbs in two slow waves: strong verticals, then the lattice
      [stemVerts, 0.296, 0.515], [stemMesh, 0.419, 0.560], [stemPts, 0.463, 0.600],
      // under the cap, two loops — the gill sweep, then the rim right at the
      // edge chasing it — and only then does the cap top surface ink in
      [gills, 0.574, 0.715], [gillCore, 0.637, 0.730],
      [rim, 0.698, 0.793], [rimPts, 0.730, 0.807],
      [capMesh, 0.761, 0.870], [overlay, 0.793, 0.885], [overlayPts, 0.807, 0.893],
      [capBeads, 0.776, 0.885],
      // spores get the longest single window — the plume should gather slowly,
      // still settling as everything else finishes
      [motes, 0.233, 0.556], [spores, 0.715, 1.000],
    ];
    for (const [obj, a, b] of WINDOWS) drawWin(obj).value.set(a, b);
    // The stem's top quarter is built to run up INSIDE the cap (the joint is
    // buried). Left alone it would ink in against open sky and then get
    // swallowed as the cap's body fades in — drawn, then un-drawn. So the
    // stipe strokes stop at the cap line instead; the buried joint never
    // draws, and the lid lifts invisibly behind the shells once parked.
    for (const o of [stemVerts, stemMesh, stemPts]) o.material.uniforms.uClampY.value = 3.65;
  }

  // ?introat=P (0..1) freezes the drawing at that progress for frame inspection
  const _introAt = new URLSearchParams(location.search).get('introat');
  if (_introAt !== null) {
    const p = Math.min(1, Math.max(0, parseFloat(_introAt) || 0));
    drawU.value = p;
    shellsAt(p);
  } else if (intro > 0) {
    drawU.value = 0; // blank page before the first frame renders
    shellsAt(0);
    // Wall clock, not accumulated rAF dt: the page's CSS choreography runs on
    // the wall clock, and rAF stops entirely in a hidden tab — accumulating dt
    // would let the text finish while the specimen was still being drawn.
    const t0 = performance.now();
    addAnimator('intro-draw', () => {
      const lived = (performance.now() - t0) / 1000;
      if (lived >= intro) {
        // Don't snap to the parked value: glide uProg from 1 to 2 over 0.7s
        // so the stem's buried joint (held dark by the lid while drawing)
        // FADES in behind the cap instead of popping on in a single frame.
        const over = (lived - intro) / 0.7;
        if (over >= 1) {
          drawU.value = 2; // parked: fully drawn, embers and lid released
          shellsRestore();
          animators.delete('intro-draw');
          return;
        }
        drawU.value = 1 + over;
        shellsAt(1);
        return;
      }
      drawU.value = lived / intro;
      shellsAt(lived / intro);
    });
  }
}
