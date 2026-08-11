// tools/inputgates.js — QA-ONLY behavioural gates for the page's INPUT SURFACE.
// NOT shipped: nothing imports it. Load it by hand (or from the capture CDP
// client) and call `await __inputGates()`; results land in `__ig`.
//
// WHY THIS FILE EXISTS
// --------------------
// On 2026-08-09 the site stopped answering touch. Hannah: "when I used to tap
// a mushroom it would act like it had received physical contact and light up,
// same with the ground." Nothing about the poke had changed. A node-index
// scrim (24-mobile-pass) had been created without `hidden` — an invisible
// full-viewport surface at z-index 5 with default pointer-events, sitting over
// the canvas from boot. Every pointerdown on the frame landed on it, so
// organism.js §10c never saw a tap, and neither did the Final field picker.
//
// The thing that makes this class of bug expensive is that it is INVISIBLE. It
// moves no pixel, so every frozen reference still matches; it throws nothing,
// so the console stays clean; and it is a property of the whole viewport, so
// it does not look like it belongs to any one component. The only way to see
// it is to ask, at a real pixel, "what is actually on top?" — which is what
// this file does.
//
// The stylesheet now makes the overlays inert unless they carry `.open`
// (journey/site.css, the hit-model note over .j-menu-scrim), so the mechanism
// is gone rather than patched. G1/G2 assert that invariant directly, including
// against a deliberately sabotaged `hidden` flag, so the guarantee is tested
// rather than trusted.
//
//   G1  the canvas owns the frame at rest: no element beats it at a grid of
//       sample points on the landing page.
//   G2  with `hidden` stripped from every overlay — the exact pre-fix state —
//       the canvas STILL owns the frame, because the CSS keeps them inert.
//   G3  the poke fires for the body and for the ground, on mouse AND touch,
//       measured off the scene's own pulse uniforms rather than a screenshot.
//   G4  every overlay is inert while closed and live while open, for each of
//       the four full-frame surfaces.
//   G5  an open overlay is allowed to take the frame (that is its job), and
//       hands it back on close.
window.__ig = null; window.__igErr = null;

window.__inputGates = async function () {
  const out = [];
  try {
    const nf = () => new Promise(r => requestAnimationFrame(r));
    const settle = async (ms) => { const t = performance.now(); while (performance.now() - t < ms) await nf(); };
    const canvas = window.sceneApi.renderer.domElement;

    // Sample points spread over the frame.
    const pts = [];
    for (let fy = 0.12; fy <= 0.88; fy += 0.19)
      for (let fx = 0.10; fx <= 0.80; fx += 0.175)
        pts.push([Math.round(innerWidth * fx), Math.round(innerHeight * fy)]);

    const name = (e) => e ? e.tagName + '.' + String(
      e.className && e.className.baseVal !== undefined ? e.className.baseVal : (e.className || '')) : 'null';

    // THE INVARIANT IS ABOUT FULL-FRAME SURFACES, NOT ABOUT CONTROLS.
    // The page is supposed to have things on top of the canvas: the hero's
    // HUD callout links, the rail, hotspot chips, the action pills. A gate
    // that flags those cries wolf and gets ignored, which is worse than no
    // gate. What must never happen is a surface BIG ENOUGH TO COVER THE
    // SCENE taking the frame — that is the bug this file was written for.
    // So: an element only counts if it covers >= 12% of the viewport.
    const BIG = 0.12;
    const blockers = () => {
      const A = innerWidth * innerHeight, bad = [];
      for (const [x, y] of pts) {
        const e = document.elementFromPoint(x, y);
        if (!e || e === canvas) continue;
        const r = e.getBoundingClientRect();
        const iw = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0));
        const ih = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0));
        if ((iw * ih) / A >= BIG) bad.push(`${x},${y}->${name(e)} (${((iw * ih) / A * 100).toFixed(0)}% of frame)`);
      }
      return bad;
    };
    const notCanvas = blockers;

    // (.j-index / .j-index-scrim left this list 2026-08-11 with the node
    // index itself — the Contributors cue and its sheet were removed.)
    const OVERLAYS = ['.j-menu-scrim', '.j-menu'];

    // ---- G1 the canvas owns the frame at rest ----
    const g1 = notCanvas();
    out.push(`G1 canvas owns frame at rest: ${g1.length === 0 ? 'PASS' : 'FAIL ' + JSON.stringify(g1)} (${pts.length} points)`);

    // ---- G2 the guarantee: inert even with `hidden` sabotaged ----
    const restore = [];
    for (const sel of OVERLAYS) {
      const e = document.querySelector(sel);
      if (!e) continue;
      restore.push([e, e.hidden]);
      e.hidden = false;
    }
    await nf();
    const g2 = notCanvas();
    const styles = OVERLAYS.map(s => {
      const e = document.querySelector(s);
      return e ? `${s}=${getComputedStyle(e).pointerEvents}` : `${s}=absent`;
    }).join(' ');
    out.push(`G2 inert with \`hidden\` stripped: ${g2.length === 0 ? 'PASS' : 'FAIL ' + JSON.stringify(g2)} [${styles}]`);
    for (const [e, h] of restore) e.hidden = h;
    await nf();

    // ---- G3 the poke actually fires ----
    // Read the scene's own shared pulse uniforms: organism.js §10c writes
    // uPulseT=0 and uPulseP=(1.4,1.5,1.2) for a body, (2.6,0.33,1.4) for the
    // floor. Park the clock past decay first so a fire is unambiguous.
    let U = null;
    window.sceneApi.scene.traverse(o => {
      if (U) return;
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) if (m.uniforms && m.uniforms.uPulseT) { U = m.uniforms; return; }
    });
    if (!U) {
      out.push('G3 poke: SKIP (no uPulseT uniform found)');
    } else {
      // find an interior body pixel and an interior ground pixel
      const THREE = window.__THREE__;
      if (!THREE) {
        out.push('G3 poke: SKIP (set window.__THREE__ = await import("/vendor/three/three.module.js") first)');
      } else {
        const targets = [];
        for (const r of [window.sceneApi.groups.mushroom, window.sceneApi.groups.stem])
          if (r) r.traverse(o => { if (o.isMesh && o.material.isMeshBasicMaterial) targets.push(o); });
        const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
        const kindOf = (x, y) => {
          ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
          ray.setFromCamera(ndc, window.sceneApi.camera);
          if (ray.intersectObjects(targets, false)[0]) return 'body';
          const gt = -ray.ray.origin.y / ray.ray.direction.y;
          if (!(gt > 0)) return null;
          const gp = ray.ray.origin.clone().addScaledVector(ray.ray.direction, gt);
          return Math.hypot(gp.x, gp.z - 2) > 14 ? null : 'ground';
        };
        const bodyPts = [], groundPts = [];
        for (let y = 8; y < innerHeight; y += 10)
          for (let x = 8; x < innerWidth; x += 10) {
            const k = kindOf(x, y);
            if (k === 'body' && document.elementFromPoint(x, y) === canvas) bodyPts.push([x, y]);
            else if (k === 'ground' && document.elementFromPoint(x, y) === canvas) groundPts.push([x, y]);
          }
        const mid = (a) => a.length ? a[Math.floor(a.length / 2)] : null;
        const fire = async (pt, type) => {
          U.uPulseT.value = 1e3; U.uPulseC.value.set(999, 999, 999);
          const [x, y] = pt;
          const o = { clientX: x, clientY: y, pointerId: 1, pointerType: type, bubbles: true, cancelable: true };
          canvas.dispatchEvent(new PointerEvent('pointerdown', o));
          await settle(60);
          canvas.dispatchEvent(new PointerEvent('pointerup', o));
          await nf();
          const p = U.uPulseP.value;
          if (U.uPulseT.value >= 8 || U.uPulseC.value.x === 999) return 'none';
          return (Math.abs(p.x - 1.4) < 1e-6 && Math.abs(p.y - 1.5) < 1e-6) ? 'body' : 'ground';
        };
        const b = mid(bodyPts), g = mid(groundPts);
        const res = [];
        let ok = true;
        for (const type of ['mouse', 'touch']) {
          const rb = b ? await fire(b, type) : 'no-pixel';
          const rg = g ? await fire(g, type) : 'no-pixel';
          res.push(`body/${type}=${rb}`, `ground/${type}=${rg}`);
          // A hero-body pixel must always answer as a body.
          if (rb !== 'body') ok = false;
          // A ground pixel must POKE — but the branch is allowed to be `body`.
          // In FINAL the field picker (chapters/final/interact.js) runs second
          // on the same pointerup and deliberately corrects organism's floor
          // swell to a body poke when the ray actually met a field mushroom
          // standing on that patch of floor. Requiring `ground` there would be
          // asserting a bug. Requiring it to FIRE is the real invariant.
          if (rg === 'none' || rg === 'no-pixel') ok = false;
        }
        out.push(`G3 poke fires: ${ok ? 'PASS' : 'FAIL'} [${res.join(' ')}] (body px ${bodyPts.length}, ground px ${groundPts.length})`);
      }
    }

    // ---- G4 / G5 closed is inert, open is live ----
    const g4 = [], g5 = [];
    for (const sel of OVERLAYS) {
      const e = document.querySelector(sel);
      if (!e) { g4.push(`${sel}:absent`); continue; }
      const closed = getComputedStyle(e).pointerEvents;
      e.hidden = false; e.classList.add('open');
      await nf();
      const open = getComputedStyle(e).pointerEvents;
      e.classList.remove('open'); e.hidden = true;
      await nf();
      const back = getComputedStyle(e).pointerEvents;
      g4.push(`${sel}: closed=${closed} open=${open}`);
      if (closed !== 'none' || open !== 'auto' || back !== 'none') g5.push(sel);
    }
    out.push(`G4 overlay hit model: ${g4.join(' | ')}`);
    out.push(`G5 closed-inert / open-live / restored: ${g5.length === 0 ? 'PASS' : 'FAIL ' + JSON.stringify(g5)}`);

    window.__ig = out;
    return out;
  } catch (e) {
    window.__igErr = (e && e.stack) || String(e);
    window.__ig = out;
    throw e;
  }
};
