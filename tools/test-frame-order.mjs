// C01 — the per-frame writer order, characterized so a later wave cannot
// reorder it silently. Run with: node tools/test-frame-order.mjs
//
// TWO LAYERS, and the difference matters when reading the evidence:
//
//   1. BEHAVIOURAL. journey/frame-application.js is DOM-free and pure enough
//      to execute here, so the orchestrator's chapter-side order is proved by
//      running it and recording the calls it makes. That is a real trace.
//
//   2. STATIC. journey/journey.js imports `three` through the page's import
//      map, and journey/ui.js and journey/rail.js build live DOM, so neither
//      can be instantiated in node. Their order is therefore pinned by
//      extracting the function body from source and asserting the ORDERED
//      sequence of writer calls inside it. That is weaker than execution — it
//      proves the source order, not the runtime order — and it is recorded as
//      such in limitations.md. It is still a tripwire: any reordering,
//      removal or duplication of a writer trips it.
//
// DEF-01 — RE-BASELINED 2026-08-21 by DEF-01-FIX (run 2026-08-21-elegance-run-01).
// This area used to characterize the rail's `root.inert` handoff INCLUDING its
// one-frame lag: `journey.detail` cleared synchronously in the close handler
// (journey/journey.js closeDetail) while the rail left `inert` only when its
// own update() next ran, inside ui.update(), the LAST writer of applyFrame.
// That lag has now been closed — journey/rail.js releaseModal() gives the
// detail's close the synchronous release openMenu()/closeMenu() always had —
// so S4 below pins the CORRECTED shape, at the same exactness. The old pinned
// values, and why each moved, are recorded in
// docs/code-health/evidence/2026-08-21-elegance-run-01/def-01-fix/rebaseline.md.
//
// S4 is a STRUCTURAL BACKSTOP, not the behavioural proof. Like the rest of
// area `S` it reads source text (see limitations.md §1 and §1a), so it detects
// that the writers exist and where — not that they run. The behaviour is
// proved by tools/test-detail-close-focus.mjs, which extracts these same
// function bodies and EXECUTES them against DOM doubles.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applyChapterFrame } from '../journey/frame-application.js';
import { createLedger } from './test-c01-harness.mjs';
import { stripComments } from './strip-comments.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const L = createLedger('frame order');

/* ------------------------------------------------------------------ *
 * 1. BEHAVIOURAL — journey/frame-application.js, actually executed.  *
 * ------------------------------------------------------------------ */

/** A chapter double that records every call the orchestrator makes to it. */
function makeChapter(id, log, { entryReady = null, driveEntry = false } = {}) {
  const mod = {
    drive(p) { log.push(`${id}.drive(${p})`); },
    setGliding(on) { log.push(`${id}.setGliding(${on})`); },
  };
  if (entryReady) mod.entryReady = () => { log.push(`${id}.entryReady`); return entryReady(); };
  if (driveEntry) mod.driveEntry = (f) => { log.push(`${id}.driveEntry(${+f.toFixed(6)})`); };
  return mod;
}

const guarded = (name, fn) => { fn(name); };

{
  // O1. With no entry ticket every chapter is driven then told about the
  // glide, chapter by chapter, in the registry's own key order — never all
  // the drives followed by all the setGlidings.
  const log = [];
  const chapters = {
    mission: makeChapter('mission', log),
    inspire: makeChapter('inspire', log),
    connect: makeChapter('connect', log),
  };
  const out = applyChapterFrame(chapters, null, 0.42, 0.016, true, guarded);
  L.same('O', 'O1 chapters are driven and glided one at a time, in key order',
    log, [
      'mission.drive(0.42)', 'mission.setGliding(true)',
      'inspire.drive(0.42)', 'inspire.setGliding(true)',
      'connect.drive(0.42)', 'connect.setGliding(true)',
    ]);
  L.check('O', 'O1 no entry ticket in, no entry ticket out', out === null, out);
}

{
  // O2. With an entry ticket the entry chapter's entryReady is consulted
  // BEFORE its clock advances, and it receives driveEntry(f) in place of
  // drive(p) — while every other chapter still gets drive(p).
  const log = [];
  const chapters = {
    mission: makeChapter('mission', log),
    connect: makeChapter('connect', log, { entryReady: () => true, driveEntry: true }),
  };
  const ticket = { id: 'connect', f: 0, t: 0, dur: 1 };
  applyChapterFrame(chapters, ticket, 0.42, 0.5, false, guarded);
  L.same('O', 'O2 entryReady is consulted first; the entry chapter gets driveEntry',
    log, [
      'connect.entryReady',
      'mission.drive(0.42)', 'mission.setGliding(false)',
      'connect.driveEntry(0.5)', 'connect.setGliding(false)',
    ]);
  L.check('O', 'O2 the ticket clock advanced by exactly dt', ticket.t === 0.5, ticket.t);
}

{
  // O3. entryReady === false FREEZES the ticket clock but does not stop the
  // frame: the chapter is still driven, at its unchanged eased fraction.
  const log = [];
  const chapters = {
    connect: makeChapter('connect', log, { entryReady: () => false, driveEntry: true }),
  };
  const ticket = { id: 'connect', f: 0, t: 0, dur: 2 };
  applyChapterFrame(chapters, ticket, 0.42, 0.5, false, guarded);
  applyChapterFrame(chapters, ticket, 0.42, 0.5, false, guarded);
  L.check('O', 'O3 a not-ready entry freezes its clock and still drives at f = 0',
    ticket.t === 0 && ticket.f === 0
      && log.filter((l) => l === 'connect.driveEntry(0)').length === 2,
    JSON.stringify(log));
}

{
  // O4. The entry easing is smootherstep of t/dur, clamped, and the ticket is
  // retired (returned as null) on the frame that reaches f = 1 — not after it.
  const smootherstep = (x) => x * x * x * (x * (x * 6 - 15) + 10);
  const log = [];
  const chapters = { c: makeChapter('c', log, { driveEntry: true }) };
  const ticket = { id: 'c', f: 0, t: 0, dur: 1 };
  const seen = [];
  let live = ticket;
  for (let i = 0; i < 4; i++) {
    live = applyChapterFrame(chapters, live, 0, 0.25, false, guarded);
    seen.push(live === null ? null : +live.f.toFixed(9));
  }
  L.same('O', 'O4 the entry fraction is smootherstep(t/dur) and retires at f = 1',
    seen, [
      +smootherstep(0.25).toFixed(9), +smootherstep(0.5).toFixed(9),
      +smootherstep(0.75).toFixed(9), null,
    ]);
  L.check('O', 'O4 the retiring frame still drove the chapter at f = 1',
    log.at(-2) === 'c.driveEntry(1)', log.at(-2));
}

{
  // O5. A negative dt cannot rewind an entry clock (Math.max(0, dt)), and a
  // chapter with neither drive nor driveEntry is simply skipped rather than
  // throwing.
  const log = [];
  const chapters = {
    bare: { setGliding(on) { log.push(`bare.setGliding(${on})`); } },
    c: makeChapter('c', log, { driveEntry: true }),
  };
  const ticket = { id: 'c', f: 0, t: 0.4, dur: 1 };
  applyChapterFrame(chapters, ticket, 0, -5, false, guarded);
  L.check('O', 'O5 a negative dt never rewinds the entry clock', ticket.t === 0.4, ticket.t);
  L.same('O', 'O5 a chapter with no drive still receives setGliding',
    log, ['bare.setGliding(false)', 'c.driveEntry(0.31744)', 'c.setGliding(false)']);
}

{
  // O6. Every call is routed through guarded() under a stable, per-chapter
  // name — that is what lets one broken chapter be dropped without taking the
  // rest of the frame with it.
  const names = [];
  const log = [];
  const chapters = {
    c: makeChapter('c', log, { entryReady: () => true, driveEntry: true }),
    d: makeChapter('d', log),
  };
  applyChapterFrame(chapters, { id: 'c', f: 0, t: 0, dur: 1 }, 0.3, 0.1,
    false, (name, fn) => { names.push(name); fn(); });
  L.same('O', 'O6 guard names are stable and per chapter', names, [
    'chapter:c.entryReady', 'chapter:c.driveEntry', 'chapter:c.setGliding',
    'chapter:d.drive', 'chapter:d.setGliding',
  ]);
}

/* ------------------------------------------------------------------ *
 * 2. STATIC — the orders that cannot be instantiated in node.        *
 * ------------------------------------------------------------------ */

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** The body of `function <name>(` in `src`, by brace matching. */
function bodyOf(src, name) {
  const head = src.indexOf(`function ${name}(`);
  if (head < 0) throw new Error(`no function ${name} in source`);
  const open = src.indexOf('{', src.indexOf(')', head));
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open + 1, i);
  }
  throw new Error(`unbalanced body for ${name}`);
}

/** Strip comments and strings so a token search cannot match prose. Every
 *  file in journey/ is dense with commentary that names the very calls this
 *  is looking for, so this step is load-bearing.
 *
 *  QA-04 / S-3: the five regexes this replaces had no string, template or
 *  regex-literal state, and the block-comment regex ran FIRST over raw
 *  source. `journey/journey.js:18` is a LINE comment containing a literal
 *  slash-star (`chapters/*.js`), so the block regex opened a phantom
 *  comment there and ran to the next terminator at :52 — blanking 1,250
 *  live characters across 31 lines of a PRODUCTION file, the entire import
 *  block among them. This suite's own file lost 7 more characters the same
 *  way. Now the one shared implementation in tools/strip-comments.mjs;
 *  blankStrings keeps the string-collapsing behaviour this scan needs. */
const code = (body) => stripComments(body, { blankStrings: true });

/** The ordered sequence of the given writer tokens as they appear in `body`,
 *  with duplicates preserved — a reorder, a removal or an extra call all
 *  change the result. */
function sequence(body, tokens) {
  const hits = [];
  for (const token of tokens) {
    let from = 0;
    for (;;) {
      const at = body.indexOf(token, from);
      if (at < 0) break;
      hits.push([at, token]);
      from = at + token.length;
    }
  }
  return hits.sort((a, b) => a[0] - b[0]).map(([, t]) => t);
}

const journeySrc = code(read('journey/journey.js'));
const uiSrc = code(read('journey/ui.js'));
const railSrc = code(read('journey/rail.js'));
/* U03 moved the card's state machine into its own vessel, so the close path
   S4 pins now spans two files. The assertion is unchanged in what it claims
   and one hop STRONGER in what it reads: the extra conjunct below pins that
   ui.js's closeCard actually reaches the vessel. */
const cardTierSrc = code(read('journey/ui/card-tier.js'));
/* "Exactly one caller" is a claim about the UI SURFACE, not about one file's
   address. U03 moved the caller into the card's own vessel; counting only
   journey/ui.js after that would have re-baselined a real cardinality down to
   zero and called it progress. */
const uiSurfaceSrc = code([readFileSync(join(ROOT, 'journey/ui.js'), 'utf8'),
  ...readdirSync(join(ROOT, 'journey/ui')).filter((f) => f.endsWith('.js')).sort()
    .map((f) => readFileSync(join(ROOT, 'journey/ui', f), 'utf8'))].join('\n'));

{
  // S1. spineFrame — the whole per-frame contract in five statements. The
  // fully rewound wrap lands FIRST, before scroll, state or any reader runs.
  const body = bodyOf(journeySrc, 'spineFrame');
  L.same('S', 'S1 spineFrame writer order',
    sequence(body, [
      'landWrapHome(', 'scroll.update(', 'journey.setProgress(',
      'journey.update(', 'applyFrame(',
    ]),
    ['landWrapHome(', 'scroll.update(', 'journey.setProgress(',
      'journey.update(', 'applyFrame(']);
}

{
  // S2. applyFrame — THE CAMERA IS FINISHED BEFORE ANYTHING READS IT. Every
  // reader below the camera block (seams, chapters, lens, hero furniture, UI)
  // must stay below it, and the UI must stay last.
  const body = bodyOf(journeySrc, 'applyFrame');
  const order = sequence(body, [
    'blendCancelled(', 'steerWrapBlend(', 'scroll.retire(', 'dropCamBlend(',
    'director.applyHeroPose(', 'director.setOwned(', 'director.apply(',
    'stepCamBlend(', 'seams.update(', 'applyChapterFrame(',
    'lens.update(', 'lens.setFocusHint(', 'paintHeroFurniture(', 'ui.update(',
  ]);
  L.same('S', 'S2 applyFrame writer order', order, [
    // the cancellation decision, before ownership is decided
    'blendCancelled(', 'steerWrapBlend(', 'scroll.retire(', 'dropCamBlend(',
    'blendCancelled(',
    // the camera, complete
    'director.applyHeroPose(', 'director.setOwned(', 'director.apply(',
    'stepCamBlend(',
    // ...and only then every reader of it
    'seams.update(', 'applyChapterFrame(', 'lens.update(', 'lens.setFocusHint(',
    'paintHeroFurniture(', 'ui.update(',
  ]);
  L.check('S', 'S2 the UI is the last writer of the frame',
    order.at(-1) === 'ui.update(', order.at(-1));
  L.check('S', 'S2 every camera writer precedes every camera reader',
    order.indexOf('stepCamBlend(') < order.indexOf('seams.update('),
    `${order.indexOf('stepCamBlend(')}<${order.indexOf('seams.update(')}`);
}

{
  // S3. placeAt — the dt = 0 placement contract: an applyFrame pass, then the
  // seams forced up to the target, then the chapter snap, then a SECOND
  // applyFrame so a hidden-tab capture burst renders the finished frame.
  const body = bodyOf(journeySrc, 'placeAt');
  L.same('S', 'S3 placeAt placement order',
    sequence(body, [
      'chapterEntry = null', 'journey.snapTo(', 'scroll.setProgress(',
      'applyFrame(', 'seams.update(', 'snapChapters(',
    ]),
    ['chapterEntry = null', 'journey.snapTo(', 'scroll.setProgress(',
      'applyFrame(', 'seams.update(', 'snapChapters(', 'applyFrame(']);
}

{
  // S4. DEF-01, RE-BASELINED to the corrected shape. `root.inert` is still
  // CLAIMED in exactly one place — the per-frame reconciliation inside
  // rail.update(), reached from exactly one call site inside ui.update(),
  // which is the last writer of applyFrame (S2). What changed is the RELEASE:
  // the detail's close path now has a synchronous writer of its own, exactly
  // as the menu always did.
  const railUpdate = bodyOf(railSrc, 'update');
  const WRITE = /root\.inert\s*=(?!=)/g;
  const inertWritesInFile = (railSrc.match(WRITE) || []).length;
  const inertWritesInUpdate = (railUpdate.match(WRITE) || []).length;
  const inertInOpenMenu = (bodyOf(railSrc, 'openMenu').match(WRITE) || []).length;
  const inertInCloseMenu = (bodyOf(railSrc, 'closeMenu').match(WRITE) || []).length;
  const inertInRelease = (bodyOf(railSrc, 'releaseModal').match(WRITE) || []).length;
  // THE ASYMMETRY WAS THE DEFECT, AND IT IS GONE. The MENU writes root.inert
  // synchronously in its own open/close handlers; the DETAIL now has the same
  // in releaseModal(), which ui.closeCard() calls on the close tick. The
  // per-frame reconciliation inside rail.update() remains the sole CLAIMER and
  // the authority; releaseModal() only ever clears, and only when the frame's
  // own predicate already says there is no modal detail.
  // WAS (pre-fix): total 3, and no writer outside update()/openMenu/closeMenu.
  L.check('S', 'S4 DEF-01: root.inert has exactly four writers in rail.js',
    inertWritesInFile === 4 && inertWritesInUpdate === 1
      && inertInOpenMenu === 1 && inertInCloseMenu === 1 && inertInRelease === 1,
    `update=${inertWritesInUpdate} open=${inertInOpenMenu} close=${inertInCloseMenu} release=${inertInRelease} total=${inertWritesInFile}`);
  // WAS (pre-fix): 'the menu writes inert synchronously, the detail does not'.
  L.check('S', 'S4 DEF-01: the menu AND the detail both write inert synchronously',
    inertInOpenMenu + inertInCloseMenu === 2 && inertInRelease === 1
      && inertWritesInUpdate === 1
      && /\breleaseModal,/.test(railSrc)
      && (uiSurfaceSrc.match(/rail\.releaseModal\(\)/g) || []).length === 1,
    'menu: synchronous; detail: synchronous via rail.releaseModal(); claim: per-frame only');
  L.check('S', 'S4 DEF-01: ...and only while the rail menu is closed',
    /if\s*\(!menuIsOpen\)\s*\{\s*const want = !modalDetail;/.test(railUpdate)
      && /if \(menuIsOpen\) return;/.test(bodyOf(railSrc, 'releaseModal')),
    'guarded by !menuIsOpen in both writers');
  L.check('S', 'S4 DEF-01: rail.update() is reached from exactly one call site',
    (uiSrc.match(/rail\.update\(/g) || []).length === 1
      && (journeySrc.match(/rail\.update\(/g) || []).length === 0,
    (uiSrc.match(/rail\.update\(/g) || []).length);
  L.check('S', 'S4 DEF-01: that call site is inside ui.update()',
    bodyOf(uiSrc, 'update').includes('rail.update('), true);
  L.check('S', 'S4 DEF-01: journey.detail is cleared SYNCHRONOUSLY on close',
    /function closeDetail\(\)\s*\{\s*if \(!detailNode\) return;\s*detailNode = null;\s*ui\.closeCard\(\);/
      .test(journeySrc),
    'closeDetail clears detailNode before ui.closeCard()');
  // WAS (pre-fix): a literal `true` narrative marker reading 'therefore inert
  // release lags detail clear by one frame'. The lag it named is closed, so
  // the marker is replaced — per C01 limitations.md §10 — by a real assertion
  // pinning the corrected handoff just as tightly: the close path reaches the
  // release, gated on the frame's own predicate, and the release NEVER claims.
  const uiClose = bodyOf(uiSrc, 'closeCard');
  const tierClose = bodyOf(cardTierSrc, 'close');
  const uiRelease = bodyOf(cardTierSrc, 'releaseRailAfterDetail');
  L.check('S', 'S4 DEF-01: the one-frame lag is CLOSED — closeCard() releases on the tick',
    /\bcardTier\.close\(\);/.test(uiClose)
      && /\breleaseRailAfterDetail\(\);/.test(tierClose)
      && /if \(isDetailOpen\(\) && !popover\.isPinned\(\)\) return;/.test(uiRelease)
      && /rail\.releaseModal\(\);/.test(uiRelease)
      && !/root\.inert\s*=\s*true/.test(bodyOf(railSrc, 'releaseModal')),
    'closeCard -> cardTier.close -> releaseRailAfterDetail (frame predicate) -> rail.releaseModal, release-only');
}

{
  // S5. The frame's single entry point: applyFrame is called from spineFrame
  // and from placeAt (twice), and from nowhere else. A new caller is a new
  // frame order and must not appear unnoticed.
  // QA-02 T4: the first conjunct here used to be
  // `(journeySrc.match(/[^n] applyFrame\(|^\s*applyFrame\(/gm) || []).length >= 0`
  // — a `.length >= 0` is true for every integer, i.e. always true, and was
  // dead weight next to the real (failable) `=== 3` conjunct below. Deleted;
  // the second conjunct is unchanged.
  L.check('S', 'S5 applyFrame has exactly three call sites',
    (journeySrc.match(/(?<!function )applyFrame\(/g) || []).length === 3,
    (journeySrc.match(/(?<!function )applyFrame\(/g) || []).length);
  L.check('S', 'S5 scroll.update() is called from exactly one place',
    (journeySrc.match(/scroll\.update\(/g) || []).length === 1,
    (journeySrc.match(/scroll\.update\(/g) || []).length);
}

process.exitCode = L.report() === 0 ? 0 : 1;
