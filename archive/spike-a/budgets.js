// Spike A — live budget sampler (LA-7).
// renderer.info accumulated per displayed frame (autoReset off, manual reset
// in an animator that runs BEFORE composer.render; read in a probe rAF that
// runs AFTER it, since the scene's own rAF loop was registered first).
// CPU per frame = performance.now() at the probe minus the frame's rAF
// timestamp — the same method the BASELINE used, so numbers are comparable.
export function createBudgets(sceneApi, plumes, connectFrame) {
  const { renderer } = sceneApi;
  const hud = document.getElementById('hud');
  let show = false;

  renderer.info.autoReset = false;
  sceneApi.addAnimator('spike-budget-reset', () => { renderer.info.reset(); });

  const cpuSamples = [];
  const cadSamples = [];
  let lastTs = 0;
  let snap = { calls: 0, lines: 0, points: 0, tris: 0 };

  function probe(ts) {
    requestAnimationFrame(probe);
    const cpu = performance.now() - ts;
    if (cpu > 0 && cpu < 50) cpuSamples.push(cpu);
    if (cpuSamples.length > 240) cpuSamples.shift();
    if (lastTs) {
      const d = ts - lastTs;
      if (d > 0 && d < 200) cadSamples.push(d);
      if (cadSamples.length > 240) cadSamples.shift();
    }
    lastTs = ts;
    const r = renderer.info.render;
    snap = { calls: r.calls, lines: r.lines, points: r.points, tris: r.triangles };
  }
  requestAnimationFrame(probe);

  function median(a) {
    if (!a.length) return 0;
    const s = [...a].sort((x, y) => x - y);
    return s[s.length >> 1];
  }

  function report() {
    const c = plumes.counts, k = connectFrame.counts;
    return {
      drawCalls: snap.calls,
      lines: snap.lines,
      points: snap.points,
      triangles: snap.tris,
      cpuMedianMs: +median(cpuSamples).toFixed(2),
      cpuP95Ms: +([...cpuSamples].sort((a, b) => a - b)[Math.floor(cpuSamples.length * 0.95)] || 0).toFixed(2),
      cadenceMedianMs: +median(cadSamples).toFixed(1),
      pixelRatio: renderer.getPixelRatio(),
      heroSpores: 4200,
      plumeSpores: c.spores,
      plumeSegs: c.sourceSegs + c.wispSegs + c.flowSegs,
      plumeBeads: c.beads,
      connectSegs: k.bladeSegs + k.veinSegs,
      connectBeads: k.beads,
    };
  }
  // console hook for the budget capture pass
  window.__spikeBudget = report;

  setInterval(() => {
    if (!show) return;
    const r = report();
    hud.textContent =
      `draw calls   ${r.drawCalls}\n` +
      `lines        ${r.lines}\n` +
      `points       ${r.points}\n` +
      `triangles    ${r.triangles}\n` +
      `cpu med/p95  ${r.cpuMedianMs} / ${r.cpuP95Ms} ms\n` +
      `cadence med  ${r.cadenceMedianMs} ms\n` +
      `pixelRatio   ${r.pixelRatio}\n` +
      `plume pts    ${r.plumeSpores} (+${r.plumeBeads} beads)\n` +
      `plume segs   ${r.plumeSegs}\n` +
      `connect segs ${r.connectSegs} (+${r.connectBeads} beads)`;
  }, 400);

  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.key === 'h' || e.key === 'H') {
      show = !show;
      hud.style.display = show ? 'block' : 'none';
    }
    if (e.key === 'b' || e.key === 'B') {
      console.log('[spike-a budget]', JSON.stringify(report()));
    }
  });

  return { report };
}
