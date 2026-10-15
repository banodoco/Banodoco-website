// The Astrid mink, the app's mascot, as data shared between slides. GRID is
// the 16 × 16 pixel icon (astrid-favicon.svg): o body #FF7A2E, c throat and
// belly #F7E6CF, k outline and eye #151311. OUTLINE, THROAT and the points
// are drawn from it in the same pixel units (x right, y down, 0–16): the
// silhouette's edge as key points, smoothed into a flowing contour by
// smooth(). Slide 4 draws the outline in gold thread; a later slide can
// morph that outline back into the pixels.
window.AstridMink = (() => {
  const GRID = [
    '................',
    '........kkkk....',
    '......kkooook...',
    '.....koooooookkk',
    '...kkooookkoookk',
    '..kooooookkooock',
    '..kokooooooccck.',
    '..koooooocccck..',
    '...koooocccck...',
    '...koooccckk....',
    '..kooooccck.....',
    '..kooocccck.....',
    '.kkooocccck.....',
    'kkoooocccck.....',
    'ooooocccck......',
    'ooooocccck......',
  ];
  const COLORS = { o: '#FF7A2E', c: '#F7E6CF', k: '#151311' };

  // The silhouette (body and throat), open at the bottom where the neck leaves the frame:
  // up the back from the bottom left, over the ear and the head, round the snout, down the throat.
  const OUTLINE = [
    [0.1, 16], [0.35, 14.5], [1.25, 13.85], [2.3, 13.3], [2.95, 12.4], [3.0, 10.7], [3.55, 9.95], [3.95, 9.0],
    [3.5, 8.05], [2.95, 7.1], [2.85, 5.65], [3.35, 4.95], [4.55, 4.75], [5.05, 4.3], [5.65, 3.45],
    [6.9, 2.55], [8.3, 2.0], [10.0, 1.95], [11.8, 2.1], [12.8, 2.9], [13.8, 3.8], [14.7, 4.7], [15.05, 5.5],
    [14.5, 6.3], [13.5, 7.1], [12.4, 8.1], [11.1, 8.9], [10.2, 9.45], [9.95, 10.6], [9.95, 13.2], [9.45, 14.4], [9.05, 16],
  ];
  // Where the cream throat and belly meet the body: from the mouth down to the bottom.
  const THROAT = [
    [14.25, 5.75], [12.3, 6.25], [10.5, 6.9], [9.05, 7.65], [7.95, 8.6], [7.15, 9.8], [6.85, 11.0], [6.3, 12.3],
    [6.0, 13.6], [5.45, 14.6], [5.1, 16],
  ];
  const EYE = [10, 5], NOSE = [15.05, 5.5], EAR = [2.95, 5.4], EARMARK = [4.5, 6.5];
  const BOX = { x0: 0, y0: 2, x1: 15.05, y1: 16, cx: 7.5, cy: 9 }; // the silhouette's bounds

  // Centripetal Catmull–Rom through the key points: `per` samples per span.
  const smooth = (pts, per = 8) => {
    const out = [];
    const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const d = (a, b) => Math.max(1e-4, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
      const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
      for (let j = 0; j < per; j++) {
        const t = t1 + ((t2 - t1) * j) / per;
        const L = (a, b, ta, tb) => [((tb - t) * a[0] + (t - ta) * b[0]) / (tb - ta), ((tb - t) * a[1] + (t - ta) * b[1]) / (tb - ta)];
        const A1 = L(p0, p1, 0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
        const B1 = L(A1, A2, 0, t2), B2 = L(A2, A3, t1, t3);
        out.push(L(B1, B2, t1, t2));
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  };
  return { GRID, COLORS, OUTLINE, THROAT, EYE, NOSE, EAR, EARMARK, BOX, smooth };
})();
