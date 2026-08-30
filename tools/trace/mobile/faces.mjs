// tools/trace/mobile/faces.mjs — MOBILE-GATE-01. THE FACE COUNT.
//
// The one instrument this order had to write rather than wire, because the
// fault it gates had none. OWNED-PASS found, and did not fix: "at 430x932 the
// rail's right-edge lane excludes contributor-1 — the portrait arc's authored
// right FLANKER at [0.84, 0.08] — so live phones show 15 faces while the
// mobile golden shows 16", and the goldens are structurally blind to it
// because in frozen `?capture=` mode the rail mask LATCHES (capture.py hides
// `.j-rail` with opacity:0, which does not release an exclusion already
// taken). So the goldens disagree with the live page about which faces exist,
// in both directions, and no re-shoot can fix that — it is a property gate or
// nothing.
//
// WHAT IS ASSERTED, and why it is not the whole fault. F1 is the state a
// visitor is actually in: the rail at rest, the camera at the Owned rest, on
// a phone. Sixteen of sixteen. F2 is the non-vacuity control and it is not
// decoration: `railExcludedIndices` returns [] when the mask has never run, so
// a zero from F1 is worth nothing unless something in the same run proves the
// mask, the getter and the binding are all live. F2 gets that by forcing the
// rail OPEN and sweeping the leg, where the phone does still withhold faces —
// which is the open finding, recorded here rather than gated, because the fix
// is a taste call the owner has not made and both files it would touch
// (journey/ui/rail-mask.js, journey/chapters/owned/portraits.js) are held.
//
// D118: this file IS the invocation; the exit code is node's own.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright-core');
const { A, finish } = await import('./gate-assert.mjs');

const CHROME = process.env.CHROME_BIN || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = `http://localhost:${process.env.PORT || 8177}`;
const PHONE = {
  viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
};
/* THE IN-PAGE MODULE THE PROBE READS, declared here and passed into
   `page.evaluate` as an argument rather than written as a literal inside it.
   The specifier is root-absolute because the dev server serves the tree from
   `/` — correct for the browser, meaningless to Node. Written inline it is a
   static `import('/journey/route.js')` in a `.mjs` file, which madge parses,
   fails to resolve, and answers by dropping route.js's ENTIRE subtree from
   cycle analysis while still reporting success (tools/check-cycles.mjs catches
   exactly this and reds). As an argument the payload declares its dependency
   at its boundary, where a human reads it first, and madge sees no local
   import to mis-resolve. */
const ROUTE_URL = '/journey/route.js';

/* THE PROOF MODE. `--prove-failure` withholds one contributor through the very
   API the rail mask drives (`portraits.setRailExcluded`) before F1 reads, so
   the gate is shown to red on exactly the state OWNED-PASS found live: fifteen
   faces of sixteen at the Owned rest on a phone. It proves the READER; F2,
   which runs unflagged on every invocation, proves the MASK can produce that
   state on its own. Neither half is worth much without the other. */
const PROVE = process.argv.includes('--prove-failure');
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-angle=metal'] });
const read = async (kind) => {
  const ctx = await browser.newContext(kind === 'phone' ? PHONE : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?steady=1`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.journey && window.journey.scroll && window.journey.scroll.enabled,
    null, { timeout: 90000, polling: 500 });
  await page.waitForTimeout(1200);
  const out = await page.evaluate(async ({ prove, routeUrl }) => {
    const J = window.journey;
    const R = await import(routeUrl);
    const raf = () => new Promise((r) => requestAnimationFrame(r));
    const settle = async (p) => { J.scrollTo(p); await raf(); await raf(); };
    const P = J.chapters.owned.portraits;
    await settle(R.restProgress('owned'));
    await new Promise((r) => setTimeout(r, 500));
    if (prove) P.setRailExcluded([P.nodes.find((n) => n.routable).id]);
    const resting = P.railExcludedIndices.slice();
    document.querySelector('.j-rail')?.classList.add('j-rail-open');
    await new Promise((r) => setTimeout(r, 500));
    const open = {};
    for (let q = R.startOf('owned'); q <= R.endOf('owned') + 1e-9; q += 0.005) {
      await settle(q);
      const e = P.railExcludedIndices;
      if (e.length) open[q.toFixed(3)] = e;
    }
    return { w: innerWidth, routable: P.counts.routable, portraitField: P.portraitField, resting, open };
  }, { prove: PROVE, routeUrl: ROUTE_URL });
  await ctx.close();
  return out;
};
const phone = await read('phone');
const desktop = await read('desktop');
await browser.close();

A(phone.w === 430 && desktop.w === 1440, 'faces/emulation', `phone vw ${phone.w} / desktop vw ${desktop.w}`,
  'a count taken at the wrong width proves nothing');
A(phone.portraitField === true, 'faces/portrait-field', `phone composed for the portrait band: ${phone.portraitField}`,
  'portraits.recompose() — the phone must be reading the portrait arc, which is where the flanker lives');
for (const [kind, m] of [['phone', phone], ['desktop', desktop]]) {
  A(m.routable === 16, `faces/F3 population ${kind}`, `${m.routable} routable contributors === 16`,
    'owned-pass: sixteen contributors; the population must not depend on the breakpoint');
  A(m.resting.length === 0, `faces/F1 all-present-at-rest ${kind}`,
    `${m.routable - m.resting.length} of ${m.routable} faces present at the Owned rest, rail at rest `
    + `(withheld: [${m.resting}])`,
    'owned-pass: live phones showed 15 of 16 while the mobile golden showed 16');
}
const openKeys = Object.keys(phone.open);
A(openKeys.length > 0, 'faces/F2 instrument-live',
  `rail-open sweep withholds a face at ${openKeys.length} of the leg's placements `
  + `(${openKeys.length ? `e.g. p ${openKeys[0]} -> [${phone.open[openKeys[0]]}]` : 'NONE'})`,
  'NON-VACUITY CONTROL: railExcludedIndices returns [] when the mask never ran, so F1 is '
  + 'worthless unless the same run shows the mask can exclude. It still does, on the phone, '
  + 'with the rail open — the open OWNED-PASS finding, recorded not gated.');
finish('faces');
