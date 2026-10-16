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
  const COLORS = { o: '#FF7A2E', c: '#F7E6CF', k: '#151311', t: '#D9531E', y: '#FFD678' };

  // The silhouette, traced along the middle of the icon's dark outline and open at the bottom where the
  // neck leaves the frame: up the back from the bottom left, over the ear and the flat top of the head,
  // along the squared snout (pointing right and a little up), down the throat.
  const OUTLINE = [
    [-0.2, 15.3], [-0.05, 14.5], [0.55, 13.6], [1.5, 12.6], [2.4, 11.6], [2.55, 10.4], [3.3, 9.5], [3.45, 8.4],
    [2.6, 7.4], [2.5, 5.6], [2.75, 4.85], [3.3, 4.5], [4.3, 4.4], [5.25, 3.7], [6.3, 2.75], [7.6, 1.8], [8.6, 1.55],
    [10.5, 1.5], [11.6, 1.6], [12.4, 2.35], [13.2, 3.2], [14.3, 3.2], [15.25, 3.08], [15.6, 3.35], [15.65, 4.4],
    [15.6, 5.3], [15.3, 5.75], [14.5, 6.4], [13.6, 7.3], [12.6, 8.3], [11.4, 9.2], [10.6, 9.8], [10.45, 11],
    [10.45, 13.2], [9.8, 14.2], [9.55, 16],
  ];
  // Where the cream throat and belly meet the body: from the mouth, back under the jaw, down to the bottom.
  const THROAT = [
    [14.35, 5.0], [14.1, 5.7], [13.2, 6.05], [11.6, 6.15], [10.6, 6.6], [9.4, 7.3], [8.4, 8.1], [7.5, 9.1],
    [7.05, 10.2], [6.8, 11.2], [6.3, 12.3], [6.0, 13.6], [5.4, 14.7], [5.1, 16],
  ];
  const EYE = [10, 5], NOSE = [15.6, 3.4], EAR = [2.75, 4.85], EARMARK = [4.5, 6.5];
  const BOX = { x0: -0.2, y0: 1.5, x1: 15.65, y1: 16, cx: 7.55, cy: 8.75 }; // the silhouette's bounds

  // The homepage avatar's four poses, read off its 128px sprites (3px art pixels) into one 23 x 20 frame:
  // profile (astrid-mink-provisional.webp), glint (its eye flash), facing (astrid-mink-front.png) and
  // focus (astrid-mink-focus.png, eyes lit). Same palette keys as GRID, plus t (tail tip #D9531E) and y (lit eye #FFD678).
  const POSES = {
    profile: [
      '.............kkkk......',
      '..........kkkkkkkkk....',
      '.........kkkooooookk...',
      '........kkoooooooookkk.',
      '.......kkoooookkkoookkk',
      '......kkooooookkkoookkk',
      '.....kokoooooooooooocck',
      '.....kokkooooooooccckk.',
      '.....kooooooooccccckk..',
      '.....kkooooooccccck....',
      '......kooooocccckk.....',
      '......koooooccckk......',
      '......koooocccckk......',
      '.....kkoooocccckk......',
      '....kkooooccccckk......',
      '...kkoooooccccckk......',
      '..kktoooooccccckk......',
      '..kkooooocccccck.......',
      '.ktooooooccccck........',
      'kooooooooccccck........',
    ],
    glint: [
      '.............kkkk......',
      '..........kkkkkkkkk....',
      '.........kkkooooookk...',
      '........kkoooooooookkk.',
      '.......kkoooooyccoookkk',
      '......kkooooooycyoookkk',
      '.....kokoooooooooooocck',
      '.....kokkooooooooccckk.',
      '.....kooooooooccccckk..',
      '.....kkooooooccccck....',
      '......kooooocccckk.....',
      '......koooooccckk......',
      '......koooocccckk......',
      '.....kkoooocccckk......',
      '....kkooooccccckk......',
      '...kkoooooccccckk......',
      '..kktoooooccccckk......',
      '..kkooooocccccck.......',
      '.ktooooooccccck........',
      'kooooooooccccck........',
    ],
    facing: [
      '........kkkkkkkk.......',
      '...kk.kkooooooookk.kk..',
      '..kttkooooooooooookttk.',
      '..kttoooooooooooooottk.',
      '...ktoookkooookkoootk..',
      '...ktoookkooookkoootk..',
      '...ktoooooccccoooootk..',
      '...ktoooccckkcccoootk..',
      '....ktoccccccccccotk...',
      '.....ktoccccccccotk....',
      '......ktooccccootk.....',
      '......koooccccoook.....',
      '......ktooccccootk.....',
      '......ktooccccootk.....',
      '.....ktoooccccoootk....',
      '.....ktoooccccoootk....',
      '....kttoooccccooottk...',
      '...kktoooccccccoootkk..',
      '..kttooooccccccoooottk.',
      '.kktooooccccccccooootkk',
    ],
    focus: [
      '........kkkkkkkk.......',
      '...kk.kkooooooookk.kk..',
      '..kttkooooooooooookttk.',
      '..kttoooooooooooooottk.',
      '...ktoooccooooccoootk..',
      '...ktoooyyooooyyoootk..',
      '...ktoooooccccoooootk..',
      '...ktoooccckkcccoootk..',
      '....ktoccccccccccotk...',
      '.....ktoccccccccotk....',
      '......ktooccccootk.....',
      '......koooccccoook.....',
      '......ktooccccootk.....',
      '......ktooccccootk.....',
      '.....ktoooccccoootk....',
      '.....ktoooccccoootk....',
      '....kttoooccccooottk...',
      '...kktoooccccccoootkk..',
      '..kttooooccccccoooottk.',
      '.kktooooccccccccooootkk',
    ],
  };

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
  // Where the pixel mink (the profile pose) sits in a lens, in art pixels from the lens's centre to her frame's: her
  // dark outline vanishes against the ground, and what reads is her fur, which fills the frame across but sits a
  // pixel low in it (its mass lower still, under the tall head); so she is raised to bring that to the lens's middle.
  const LENS = { x: 0, y: -1.3 };
  return { GRID, COLORS, POSES, OUTLINE, THROAT, EYE, NOSE, EAR, EARMARK, BOX, LENS, smooth };
})();
