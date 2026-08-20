/** Resolve and persist the display-specific pixel-ratio calibration. */
export function createPixelRatioPolicy(pinPr) {
  const storeKey = (() => {
    try { return 'gs-pr-cal:' + screen.width + 'x' + screen.height + '@' + devicePixelRatio; }
    catch { return null; }
  })();
  const stored = (() => {
    try {
      const v = parseFloat(localStorage.getItem(storeKey));
      return Number.isFinite(v) && v >= 1 && v <= 3 ? v : null;
    } catch { return null; }
  })();
  function remember(v) {
    try { localStorage.setItem(storeKey, String(v)); } catch { /* private mode */ }
  }
  return {
    stored,
    initial: pinPr !== null ? pinPr : stored !== null ? stored : Math.min(devicePixelRatio, 2),
    remember,
  };
}
