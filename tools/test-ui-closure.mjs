#!/usr/bin/env node
/* ==================================================================== *
 * tools/test-ui-closure.mjs — J03, the UI closure gate.
 *
 * SUBJECT
 *   journey/ui.js                    the module that used to reach the
 *                                    published global and a chapter's private
 *                                    `portraits` field.
 *   journey/chapter-interactions.js  the registrar, which J03's acceptance
 *                                    also names.
 *   journey/journey.js               the one file allowed to name the global,
 *                                    because it is the file that publishes it.
 *   main.js                          NOT this order's file. Scanned anyway and
 *                                    its three reads pinned, so they are a
 *                                    RECORDED exclusion rather than a gap this
 *                                    gate silently failed to catch (design.md
 *                                    section 11 Q1).
 *
 * WHY THIS FILE EXISTS AND WHY IT WRITES NO PRODUCTION LINE
 *   J03's runbook goal is "inject narrow UI runtime capabilities and remove
 *   lower-level global/private-shape reads", acceptance "no lower
 *   window.journey/portraits access". Coordinator decision Q1(a), adopted in
 *   slices.md section 4.1 and design.md section 11, found that all four
 *   ui.js sites belong to C05 slice D and that chapter-interactions.js never
 *   had one. J03 therefore became a VERIFICATION order (risk class T2 -> T1):
 *   it edits neither file and lands this gate instead. Nothing in this file
 *   modifies the tree; the only artefact of the order is the assertion set
 *   below and its evidence directory.
 *
 * WHAT IS BEING PROVED, IN ONE SENTENCE
 *   No code under journey/ reaches the published global or a chapter's
 *   private portraits field except journey.js's own publication of the handle
 *   it owns — proved textually with the zero standing beside a non-empty set
 *   measured by the same scanner, and proved again by EXECUTING the migrated
 *   bodies under a recording accessor on window.journey which they never
 *   trip and their pre-C05 originals trip nine times.
 *
 * THE FOUR KINDS OF ROW
 *   A is STATIC and is a ZERO OF LOOKING (D102). Every assert-zero returns the
 *     prose set the same scanner found in the same file in the same call, so a
 *     scanner that had gone blind reports [] against a non-empty pin.
 *   B is EXECUTED. Three bodies are sliced out of ui.js's own text and
 *     compiled; the registrar is IMPORTED, not compiled. All four run under a
 *     recording accessor installed on globalThis.window — never passed as a
 *     parameter, so an indirect or computed reach records too. The trap
 *     RECORDS AND NEVER THROWS (J02's finding: organism/animation.js deletes
 *     an animator that throws, so a throwing trap is swallowed and takes its
 *     reader with it).
 *   C is the DESIGN'S OWN TWO CONDITIONS on this gate, measured rather than
 *     obeyed: comments stripped with the shared stripper, and the pre-C05
 *     count pinned to a literal beside the post-C05 zero.
 *   E pins the obligations that are INAPPLICABLE to a production-write-free
 *     order, by deriving the inapplicability from the gates' own text rather
 *     than asserting it in prose.
 *
 * THE PRE-C05 FIXTURE, AND WHAT IT IS
 *   PRE_C05 below is VERBATIM text from journey/ui.js at commit
 *   6967a36ab309af7057336be64d6f0f9dd3c41b21 — the run's base commit, which
 *   predates C05 slice D. It reproduces ALL EIGHT of that file's code lines
 *   carrying either token (lines 215, 807, 1573, 1586, 2718, 2719, 2720,
 *   2721) and ALL THREE of its prose mentions (lines 136, 804, 1558), so the
 *   fixture's counts ARE the whole file's counts: 9 window.journey code
 *   occurrences, 3 prose, 3 private-portraits code occurrences. The whole-file
 *   measurement is recorded, with its reproduction command, in
 *   docs/code-health/evidence/2026-08-21-elegance-run-01/j03/.
 *
 *   THE ONE THING ADDED TO IT: two of the three prose mentions sit inside
 *   block comments whose delimiters are dozens of lines away from the mention,
 *   outside any excerpt worth embedding. The fixture supplies those two
 *   openings and closings, marked as such, so the excerpt has the comment
 *   STRUCTURE the original had. Every scanned line is verbatim; nothing that
 *   carries a token was altered, and the added lines carry none.
 *
 *   It is embedded rather than read through git because a gate whose pin is
 *   "what HEAD used to say" stops being true the moment this run is committed.
 *
 * D99/D54 — every collection below is a SITE SET carrying its own cardinality,
 *   never a bare count.
 *
 * KEYING, AND THE PRECEDENT IT FOLLOWS — this is NOT a D64 deviation.
 *   The site sets here key `file :: text`, not `file :: line :: text`. That
 *   looks like a deviation from D64's foreign-file rule and is not: QA-05
 *   re-keyed tools/test-chapter-contract.mjs's T2 — a control over THIS EXACT
 *   FILE — the same way, recording that `file :: text` "is what D64 requires"
 *   once the subject's line numbers churn, and that the tempting repair of
 *   bumping four line numbers "is precisely the failure D54 and D64 were
 *   written about". journey/ui.js is the most contended file left in the
 *   program (J04b has just landed 28 listener conversions; U01a, U01d,
 *   U02-U04, U06 are queued on it, and B01/B04/J05 on main.js), and the
 *   property these rows state is PRESENCE. C3 measures what would otherwise
 *   be taken on trust: both keyings have the same cardinality on every file
 *   scanned, so nothing is being collapsed.
 *
 * WHAT THIS GATE ADDS THAT C05 SLICE D'S T2 DOES NOT, measured rather than
 *   claimed. `test-chapter-contract.mjs`'s T2 already asserts
 *   `countOf(codeKeepStrings(ui.js), 'window.journey') === 0`, so A1's static
 *   half OVERLAPS it and that is stated here rather than left for a reviewer
 *   to discover. Three things T2 cannot express, and one it is blind to:
 *     * T2 counts the LITERAL TEXT `window.journey`. A computed reach —
 *       `window['jour' + 'ney']` — passes T2 and reds A1. Measured: injected
 *       into ui.js in a disposable mirror, this suite was the ONLY non-zero
 *       entry of the 49 in `test:contracts`.
 *     * T2 is static. B1/B2/B3 EXECUTE.
 *     * T2 is one file. A6 is the whole of journey/.
 *     * T2 says nothing about the VALUES the four injected capabilities carry
 *       — C05's own F-3 residual, recorded in the ledger as still open and
 *       the D58 sweep over the three ui.js sites recorded as unowned. B4-B7
 *       are that sweep's offline half.
 *
 * D93 — every slice is anchored on TEXT, and the slicer REFUSES on a miss AND
 *   ON AMBIGUITY. J02 found director.js carrying two matching sites where
 *   first-hit silently took the wrong one; `uniqueSlice` counts the start
 *   anchor before it slices.
 *
 * D84 — WHAT THIS FILE DOES NOT RE-DERIVE. The comment stripper, the ledger,
 *   the sentinel, the harness-fault type, the mutant registry and the
 *   self-control scans all come from tools/. Nothing is copied, nothing is
 *   staged, and nothing is written to disk (D56).
 *
 * D88, THE REGISTRY'S DECLARED BLIND SPOTS. `inputCanon` hashes String(fn),
 *   so every mutant that perturbs a body perturbs its SOURCE TEXT and lets the
 *   reader compile it, rather than swapping an already-built closure the
 *   registry cannot see moving. No input here is a Map, and nothing here is
 *   frozen, so those two blind spots do not arise.
 *
 * WHAT THIS SUITE DOES NOT PROVE — stated with the code, not in a README
 *   nobody opens beside it:
 *   * It does not execute journey/ui.js. That module needs a DOM and a
 *     WebGL scene; the browser harness is outside this order. The three
 *     migrated bodies are compiled from its text with new Function, and there
 *     is NO imported-module equivalence control for them of the kind J01's E0
 *     and J02's D3 carry, because there is no importable module to compare
 *     against. B0 states what IS available in its place: the text is the
 *     shipped bytes, sliced under refusing anchors.
 *   * It does not prove the migrated call sites are still REACHED at runtime.
 *     That is a live-frame property; nothing here runs a frame.
 *   * It says nothing about main.js's three reads beyond recording them.
 *     Closing window.journey as a public handle is D13's, and B04's.
 *   * journey/journey.js:1271's `chapters.owned.portraits` is the third
 *     private-portrait read. C06 owns it (C05 slice E, migration-table.md
 *     section 5(a), Q7). A2b pins it as a KNOWN LIVE SITE so that this gate's
 *     zeros elsewhere cannot be read as covering it.
 *
 * Usage:
 *   node tools/test-ui-closure.mjs
 *   node tools/test-ui-closure.mjs --prove-failure
 * ==================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { stripComments } from './strip-comments.mjs';
import {
  literalPredicateRe, literalPredicateHits, literalPredicateProbe,
  maskedToken, selfSiteSet, foreignSiteSet, scanTautologyAst,
} from './self-controls.mjs';
import {
  HarnessFault, fault, mutateText, sliceBetween, createLedger, armSentinel,
} from './instrument-ledger.mjs';
import { createRegistry, M, PIN_RECEIVER } from './mutant-registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const ARGV = new Set(process.argv.slice(2));
const PROVE = ARGV.has('--prove-failure');

const SENTINEL = armSentinel('test-ui-closure', ['main', ...(PROVE ? ['prove'] : [])]);
const L = createLedger();
const { REGISTRY, pin, sweep } = createRegistry({ ledger: L, fault });

const read = (p) => readFileSync(join(REPO, p), 'utf8');
const SELF_PATH = fileURLToPath(import.meta.url);
const SRC_SELF = readFileSync(SELF_PATH, 'utf8');

const UI = 'journey/ui.js';
const REGISTRAR = 'journey/chapter-interactions.js';

/* The registrar is IMPORTED, not compiled out of text: unlike journey/ui.js
   it needs no DOM, so B3 can drive the shipped module itself. */
const REGISTRAR_MOD = await import('../journey/chapter-interactions.js');
const STRUCTURE = await import('../journey/structure.js');
const CONTENT_MOD = await import('../content/content.js');

/** The node ids B3 registers, DERIVED from the shipped schema rather than
 *  invented: the registrar ends with validateJourneyStructure, which refuses
 *  any set but this one (D94 — no pin reads a hand-written collection). */
const SCHEMA_NODE_IDS = Object.freeze({
  inspire: STRUCTURE.FIXED_HOTSPOTS.inspire,
  connect: STRUCTURE.FIXED_HOTSPOTS.connect,
  owned: CONTENT_MOD.CONTENT.contributors.map((c) => c.id),
});

const SRC = {
  ui: read(UI),
  /* U03 moved the selected-light notifier out of journey/ui.js and into the
     one owner both disclosure vessels share. C05 slice D's claim is about the
     BODY — that it reads the injected `chapters` map and never the published
     global — so it is sliced from wherever that body now lives. */
  selection: read('journey/ui/selection.js'),
  /* U06 moved the other two of C05 slice D's three sites out of
     `journey/ui.js` on the same principle U03 established just above: the
     label-policy latch is now `journey/ui/label-policies.js`'s and the
     rail-exclusion dispatch is `journey/ui/rail-mask.js`'s. Slice D's claim is
     about the BODIES — that they read the injected `chapters` map and never
     the published global — so they are sliced from wherever those bodies now
     live. Neither body changed; both moved. */
  labelPolicies: read('journey/ui/label-policies.js'),
  railMask: read('journey/ui/rail-mask.js'),
  popoverTier: read('journey/ui/popover-tier.js'),
  cardTier: read('journey/ui/card-tier.js'),
  registrar: read(REGISTRAR),
  journey: read('journey/journey.js'),
  main: read('main.js'),
  baseline: read('tools/test-render-baseline.mjs'),
  instrumentLayer: read('tools/test-instrument-layer.mjs'),
  owned: read('journey/chapters/owned/index.js'),
  inspire: read('journey/chapters/inspire/index.js'),
  connect: read('journey/chapters/connect/index.js'),
  final: read('journey/chapters/final/index.js'),
};

/* ------------------------------------------------------------------ *
 * The two scanners.                                                   *
 * ------------------------------------------------------------------ *
 * THE GLOBAL. `window.journey`, `window?.journey`, and — deliberately —
 * ANY computed `window[...]`, because `window['jour' + 'ney']` is the
 * reach a member-access pattern cannot see and is exactly what a scan
 * whose zero is load-bearing must not be blind to.
 *
 * THE PRIVATE SHAPE. A `.portraits` member reach, optional-chained or
 * not. J03's acceptance names `portraits` because owned's portrait
 * model was the one genuine private-internals reach in the tree. */
const GLOBAL_RE = () => /window\s*\??\s*\.\s*journey\b|window\s*\[/g;
const PRIVATE_RE = () => /\??\s*\.\s*portraits\b/g;

/** Site set + occurrence tally over one text.
 *
 *  D99 — the SET is the evidence and the tally is D54's cardinality beside
 *  it. Keyed `file :: text` (see the header's declared D64 deviation);
 *  `lineKeyed` carries the D64 form so C3 can compare the two cardinalities
 *  rather than take the deviation on trust. */
function scan(file, text, mkRe) {
  const lines = text.split('\n');
  const seen = new Set();
  const sites = [];
  const lineKeyed = [];
  let occ = 0;
  for (let i = 0; i < lines.length; i++) {
    const re = mkRe();
    let hit = false;
    while (re.exec(lines[i]) !== null) { occ++; hit = true; }
    if (!hit) continue;
    const key = `${file} :: ${lines[i].trim()}`;
    lineKeyed.push(`${file} :: ${i + 1} :: ${lines[i].trim()}`);
    if (seen.has(key)) continue;
    seen.add(key);
    sites.push(key);
  }
  return { sites, occ, lineKeyed };
}

/** CODE sites and PROSE sites of the same pattern in the same file, from the
 *  same call. The zero and its positive control are ONE value, so no mutant
 *  can take the control away without taking the zero with it (D46/D102). */
/** `closure` over several files at once, merged and keyed by file — U03 split
 *  journey/ui.js into a composition root and two vessels, and a claim that the
 *  UI reaches the published global NOWHERE is a claim about all of them. The
 *  prose halves merge too, so a comment that moved with the code it documents
 *  stays inside the same reading instead of looking like a site that vanished.
 */
function closureAcross(files, mkRe, code) {
  const out = { code: [], codeOcc: 0, prose: [], proseOcc: 0 };
  for (const [name, text] of files) {
    const c = closure(name, text, mkRe, code);
    out.code.push(...c.code); out.codeOcc += c.codeOcc;
    out.prose.push(...c.prose); out.proseOcc += c.proseOcc;
  }
  return out;
}

function closure(file, text, mkRe, code) {
  const all = scan(file, text, mkRe);
  const inCode = scan(file, code(text), mkRe);
  const codeKeys = new Set(inCode.sites);
  return {
    code: inCode.sites,
    codeOcc: inCode.occ,
    prose: all.sites.filter((s) => !codeKeys.has(s)),
    proseOcc: all.occ - inCode.occ,
  };
}

/* The shared stripper, with string CONTENTS left intact: this file's own
   fixture IS source text held in a string and the scanners must be able to
   read it. The subject files carry no scanned token inside a string literal
   — C1c measures that rather than assuming it. */
const CODE = (s) => stripComments(s, { blankStrings: false });

/** sliceBetween, plus the ambiguity refusal J02 had to add after
 *  director.js's two matching sites let first-hit take the wrong one (D93).
 *  A start anchor that appears twice is not an anchor. */
function uniqueSlice(src, tag, startAnchor, endAnchor) {
  const n = src.split(startAnchor).length - 1;
  if (n !== 1) fault(`ambiguous anchor (${tag}): start anchor occurs ${n} times, not once`);
  return sliceBetween(src, tag, startAnchor, endAnchor);
}

/* ==================================================================== *
 * THE PRE-C05 FIXTURE — verbatim journey/ui.js at 6967a36.
 *
 * All eight code lines and all three prose mentions the file carried. See
 * the header for the provenance and for why it is embedded rather than read
 * out of git.
 * ==================================================================== */
const PRE_C05 = [
  '/* THE LABEL POLICY NOTE, from the module-scope block comment:',
  '   Resolved lazily (window.journey publishes its chapter modules after',
  '   registration), per node, once. No chapter or node id appears in this file:',
  '*/',
  '',
  "        sub.addEventListener('pointerenter', () => {",
  '          const mod = window.journey && window.journey.chapters && window.journey.chapters[c.id];',
  "          if (mod && typeof mod.trigger === 'function') mod.trigger(pulse);",
  '        });',
  '',
  '  /** Ask each chapter module, once, what it wants for its own nodes.',
  '   *  window.journey (and with it the chapter modules) is published AFTER',
  '   *  registration, so this runs from the frame loop until it can succeed. */',
  '  function resolveLabelPolicies() {',
  "    const mods = (typeof window !== 'undefined' && window.journey) ? window.journey.chapters : null;",
  '    if (!mods) return;                       // not published yet — try next frame',
  '    let left = false;',
  '    for (const h of hotspots) {',
  '      if (h.policyDone) continue;',
  '      const mod = mods[h.chapter];',
  '      if (!mod) { left = true; continue; }   // chapter not mounted yet',
  '      h.policyDone = true;',
  "      if (typeof mod.labelPolicy === 'function') applyLabelPolicy(h, mod.labelPolicy(h.id));",
  '    }',
  '    policyPending = left;',
  '  }',
  '',
  '  /* THE SELECTION HOOK NOTE, from the block comment above `selectedNode`:',
  "     Chapter modules are reached through window.journey's public handle,",
  '     because journey.js is read-only in this lane and does not pass them to',
  '     createUI(). */',
  '',
  '  function chapterModuleFor(nodeId) {',
  '    const h = hotspots.find(x => x.id === nodeId);',
  "    const mods = (typeof window !== 'undefined' && window.journey) ? window.journey.chapters : null;",
  '    return h && mods ? mods[h.chapter] || null : null;',
  '  }',
  '',
  '  function notifySelect(nodeId, on) {',
  '    const mod = chapterModuleFor(nodeId);',
  '    if (!mod) return;',
  "    if (typeof mod.setSelected === 'function') { mod.setSelected(nodeId, on); return; }",
  '    const pf = mod.portraits;',
  "    if (pf && typeof pf.setSelected === 'function' && typeof pf.indexOf === 'function') {",
  '      const idx = pf.indexOf(nodeId);',
  '      if (idx >= 0) pf.setSelected(on ? idx : -1);',
  '    }',
  '  }',
  '',
  "    const ownedChapter = (typeof window !== 'undefined' && window.journey?.chapters)",
  '      ? window.journey.chapters.owned : null;',
  '    if (ownedChapter?.portraits?.setRailExcluded) {',
  '      ownedChapter.portraits.setRailExcluded(ownedRailExcluded);',
  '    }',
].join('\n');

/* ==================================================================== *
 * The recording accessor on the global.
 *
 * Installed on globalThis.window, NEVER passed as a parameter: a body that
 * reaches the handle indirectly, or through a computed key, records here
 * too. It records and never throws.
 * ==================================================================== */
function withGlobalTrap(handle, run) {
  const log = [];
  const WINDOW = {
    get journey() { log.push('window.journey'); return handle; },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    get() { log.push('window'); return WINDOW; },
  });
  try {
    const value = run();
    return { value, reads: log.filter((e) => e === 'window.journey').length, log };
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
}

/* ==================================================================== *
 * The world the migrated bodies run in — BUILT FROM A SPEC ON EVERY CALL.
 *
 * D105, from J02: a reader that mutates its own registered input cannot be
 * re-run, because the registry's baseline pass then sees an already
 * perturbed world. Nothing below is held between calls.
 * ==================================================================== */
function buildWorld(spec) {
  const calls = [];
  const hotspots = spec.hotspots.map((h) => ({ ...h }));
  const chapters = {};
  for (const [id, kind] of Object.entries(spec.chapters)) {
    const chapter = {};
    if (kind.labelPolicy || kind.excluded || kind.nodeIds) {
      chapter.visibility = {};
      if (kind.labelPolicy) {
        chapter.visibility.labelPolicy = (nodeId) => {
          calls.push(`labelPolicy(${id},${nodeId})`);
          return { labelOnHover: true, label: `${id}:${nodeId}` };
        };
      }
      if (kind.excluded) {
        chapter.visibility.setExcludedNodes = (set) => {
          calls.push(`setExcludedNodes(${id},[${[...set].sort().join('|')}])`);
        };
      }
      if (kind.nodeIds) {
        chapter.visibility.nodeIds = kind.nodeIds;
        chapter.visibility.nodeWorld = (nodeId) => `${id}/${nodeId}`;
        chapter.visibility.nodeRadius = kind.nodeRadius ? ((nodeId) => `${id}/r/${nodeId}`) : null;
        chapter.visibility.nodeReveal = null;
        chapter.visibility.revealDirect = false;
        chapter.visibility.revealScrub = false;
      }
    }
    if (kind.setSelected) {
      chapter.selection = {
        setSelected: (nodeId, on) => { calls.push(`setSelected(${id},${nodeId},${on})`); },
        setHot: (nodeId, on) => { calls.push(`setHot(${id},${nodeId},${on})`); },
      };
    } else if (kind.selectionNull) {
      chapter.selection = null;
    }
    /* The private field a migrated reader must never touch, as a RECORDING
       ACCESSOR rather than an absent key: an absent key proves only that the
       reach would have been undefined, not that it was not attempted. */
    Object.defineProperty(chapter, 'portraits', {
      enumerable: false,
      get() { calls.push(`PRIVATE portraits(${id})`); return { setSelected() {}, indexOf: () => 0, setRailExcluded() {} }; },
    });
    chapters[id] = chapter;
  }
  return { calls, hotspots, chapters };
}

const WORLD_SPEC = Object.freeze({
  hotspots: [
    { id: 'ados', chapter: 'inspire' },
    { id: 'hive', chapter: 'owned' },
    { id: 'arca', chapter: 'owned' },
    { id: 'lost', chapter: 'ghost' },
  ],
  chapters: {
    inspire: { labelPolicy: true, setSelected: true, excluded: true },
    owned: { labelPolicy: true, setSelected: true, excluded: true },
    connect: { selectionNull: true, excluded: true },
  },
});

const RAIL_EXCLUDED = Object.freeze(['hive', 'ados']);

/** Perturb exactly one named file of a `[name, text]` list, leaving the rest
 *  byte-identical. Refuses on a miss like `mutateText` does — a mutation that
 *  silently applied to nothing is D70's shape and P5 scores it. */
const mutateIn = (files, name, tag, from, to) => files.map(([n, text]) =>
  (n === name ? [n, mutateText(text, tag, from, to)] : [n, text]));

/* The UI surface: the composition root plus the two vessels and the shared
   owner U03 split out of it, plus the two owners U06 did. A1/A2's zeros are
   claims about all six.

   U06 ADDED ITS TWO BECAUSE THE PROSE WENT WITH THE CODE. The historical
   notes that name `window.journey` — the reach C05 slice D removed — travelled
   into `label-policies.js` and `rail-mask.js` with the bodies they describe.
   A surface that did not follow them would have watched C1's "five false reds
   without stripping" fall to three and read that as an improvement, when
   nothing about the subject had changed at all. Same correction, third time
   this order: the count is a property of the code, so the scan has to be too. */
const UI_SURFACE = [
  [UI, SRC.ui],
  ['journey/ui/popover-tier.js', SRC.popoverTier],
  ['journey/ui/card-tier.js', SRC.cardTier],
  ['journey/ui/selection.js', SRC.selection],
  ['journey/ui/label-policies.js', SRC.labelPolicies],
  ['journey/ui/rail-mask.js', SRC.railMask],
];

/* The three migrated bodies, sliced from the shipped text under refusing,
   ambiguity-checked anchors. Sliced ONCE; compiled inside every reader. */
const SLICE = {
  labelPolicy: uniqueSlice(SRC.labelPolicies, 'resolveLabelPolicies',
    '  function resolveLabelPolicies() {', '    pending = left;\n  }'),
  notifySelect: uniqueSlice(SRC.selection, 'notify',
    '  function notify(nodeId, on) {',
    "if (sel && typeof sel.setSelected === 'function') sel.setSelected(nodeId, on);\n  }"),
  excluded: uniqueSlice(SRC.railMask, 'setExcludedNodes',
    '    for (const id of chapterIds) {', '      vis.setExcludedNodes(mine);\n    }'),
};

/* Their pre-C05 originals, sliced out of the FIXTURE by the same instrument. */
const OLD = {
  subPulse: uniqueSlice(PRE_C05, 'old-subPulse',
    '          const mod = window.journey', "mod.trigger(pulse);"),
  labelPolicy: uniqueSlice(PRE_C05, 'old-resolveLabelPolicies',
    '  function resolveLabelPolicies() {', '    policyPending = left;\n  }'),
  notifySelect: uniqueSlice(PRE_C05, 'old-notifySelect',
    '  function chapterModuleFor(nodeId) {', '      if (idx >= 0) pf.setSelected(on ? idx : -1);\n    }\n  }'),
  railExcluded: uniqueSlice(PRE_C05, 'old-setRailExcluded',
    "    const ownedChapter = (typeof window !== 'undefined'",
    '      ownedChapter.portraits.setRailExcluded(ownedRailExcluded);\n    }'),
};

/** Run all three MIGRATED bodies against a freshly built world, under the
 *  trap. Returns the capability call log and the number of times the global
 *  handle was reached. */
function runMigrated(text) {
  const world = buildWorld(WORLD_SPEC);
  const applied = [];
  const applyLabelPolicy = (h, pol) => { applied.push(`${h.id}=${pol ? pol.label : String(pol)}`); };
  const runtimeIds = ['inspire', 'connect', 'owned', 'final'];
  const trap = withGlobalTrap({ chapters: world.chapters }, () => {
    /* U06: the latch is `pending` in its own owner, where it was
       `policyPending` as a `createUI` binding. Reported under the old name so
       every assertion below reads the property it was written about. */
    const resolve3 = new Function('hotspots', 'chapters', 'applyLabelPolicy', 'pending',
      `${text.labelPolicy}\n    resolveLabelPolicies();\n    return pending;`);
    const pending = resolve3(world.hotspots, world.chapters, applyLabelPolicy, false);

    /* U03 renamed it `notify` when it moved into its one owner — the body,
       which is what C05 slice D's claim is about, is unchanged. */
    const select = new Function('hotspots', 'chapters', 'nodeId', 'on',
      `${text.notifySelect}\n    return notify(nodeId, on);`);
    select(world.hotspots, world.chapters, 'hive', true);
    select(world.hotspots, world.chapters, 'ados', false);
    select(world.hotspots, world.chapters, 'lost', true);

    const exclude = new Function('chapterIds', 'chapters', 'hotspots', 'excluded',
      text.excluded);
    exclude(runtimeIds, world.chapters, world.hotspots, new Set(RAIL_EXCLUDED));
    return { pending, done: world.hotspots.map((h) => `${h.id}=${h.policyDone === true}`) };
  });
  return {
    globalReads: trap.reads,
    calls: world.calls,
    applied,
    pending: trap.value.pending,
    policyDone: trap.value.done,
  };
}

/** The same three sites, PRE-C05, under the same trap and the same world. */
function runPreC05(fixture) {
  const world = buildWorld(WORLD_SPEC);
  const applied = [];
  const applyLabelPolicy = (h, pol) => { applied.push(`${h.id}=${pol ? pol.label : String(pol)}`); };
  const trap = withGlobalTrap({ chapters: world.chapters }, () => {
    new Function('c', 'pulse', `${fixture.subPulse}`)({ id: 'owned' }, 'surge');

    const resolve3 = new Function('hotspots', 'applyLabelPolicy', 'policyPending',
      `${fixture.labelPolicy}\n    resolveLabelPolicies();\n    return policyPending;`);
    resolve3(world.hotspots, applyLabelPolicy, false);

    const select = new Function('hotspots', 'nodeId', 'on',
      `${fixture.notifySelect}\n    return notifySelect(nodeId, on);`);
    select(world.hotspots, 'hive', true);

    new Function('ownedRailExcluded', fixture.railExcluded)(new Set(RAIL_EXCLUDED));
  });
  return { globalReads: trap.reads, calls: world.calls, applied };
}

console.log('J03 — the UI closure gate. Nothing here writes a production line.\n');

/* ------------------------------------------------------------------ *
 * A — the closure, statically, every zero beside its own control.      *
 * ------------------------------------------------------------------ */
console.log('A — the closure, and the zero of looking');

pin('A1', 'the UI surface reaches the published global NOWHERE in code — beside the five prose mentions the same scanner found across it',
  (i) => closureAcross(i.files, GLOBAL_RE, i.code),
  { files: UI_SURFACE, code: CODE },
  {
    code: [], codeOcc: 0,
    prose: [
      'journey/ui.js :: `pointerenter` listener that reached `window.journey.chapters[c.id].trigger`.',
      'journey/ui.js :: only cost was the `window.journey` read this slice exists to close, and',
      "journey/ui/selection.js :: *  C05 slice D: this used to read window.journey's public handle, because",
      'journey/ui/label-policies.js :: *  `window.journey.chapters`, which journey.js publishes inside activate()',
      'journey/ui/rail-mask.js :: `window.journey.chapters.owned.portraits.setRailExcluded(...)` — a named',
    ],
    proseOcc: 5,
  },
  'a scanner that had gone blind would report [] for BOTH halves; the prose set is what makes the code zero a zero of looking (D102)');

pin('A2', 'the UI surface reaches a chapter\'s private portraits field NOWHERE in code — beside the two prose mentions',
  (i) => closureAcross(i.files, PRIVATE_RE, i.code),
  { files: UI_SURFACE, code: CODE },
  {
    code: [], codeOcc: 0,
    prose: [
      'journey/ui/selection.js :: *  §6.2). It read `mod.portraits.setSelected(index)` through a chapter\'s',
      'journey/ui/rail-mask.js :: `window.journey.chapters.owned.portraits.setRailExcluded(...)` — a named',
    ],
    proseOcc: 2,
  });

pin('A2b', 'THE THIRD PRIVATE-PORTRAIT READ IS STILL LIVE, in journey.js, and is C06\'s — pinned so this gate\'s zeros cannot be read as covering it',
  (i) => closure('journey/journey.js', i.src, PRIVATE_RE, i.code),
  { src: SRC.journey, code: CODE },
  {
    code: ['journey/journey.js :: const portraits = chapters.owned && chapters.owned.portraits;'],
    codeOcc: 1, prose: [], proseOcc: 0,
  },
  'C05 slice E recorded migration-table.md section 5(a) and Q7: C06 owns it, and the fallback is a dated exception, NOT a fifth capability');

pin('A3', 'journey/chapter-interactions.js names neither token, in code or in prose — and the scan reached a file that really is the registrar',
  (i) => ({
    global: closure(REGISTRAR, i.src, GLOBAL_RE, i.code),
    private: closure(REGISTRAR, i.src, PRIVATE_RE, i.code),
    isRegistrar: /export function registerChapterInteractions\(ui, chapters\)/.test(i.code(i.src)),
  }),
  { src: SRC.registrar, code: CODE },
  {
    global: { code: [], codeOcc: 0, prose: [], proseOcc: 0 },
    private: { code: [], codeOcc: 0, prose: [], proseOcc: 0 },
    isRegistrar: true,
  },
  'this file has NO in-file prose control — it never mentions either token — so its zero is carried by A4\'s fixture, A5\'s live foreign control and B3\'s execution, not by itself');

pin('A4', 'THE PRE-C05 LITERAL (design.md section 11 Q1, condition 2): the same scanner over the same file BEFORE C05 slice D finds nine global reads over five lines and three private reaches over three',
  (i) => ({
    global: closure('pre-C05', i.src, GLOBAL_RE, i.code),
    private: closure('pre-C05', i.src, PRIVATE_RE, i.code),
  }),
  { src: PRE_C05, code: CODE },
  {
    global: {
      code: [
        'pre-C05 :: const mod = window.journey && window.journey.chapters && window.journey.chapters[c.id];',
        "pre-C05 :: const mods = (typeof window !== 'undefined' && window.journey) ? window.journey.chapters : null;",
        "pre-C05 :: const ownedChapter = (typeof window !== 'undefined' && window.journey?.chapters)",
        'pre-C05 :: ? window.journey.chapters.owned : null;',
      ],
      codeOcc: 9,
      prose: [
        'pre-C05 :: Resolved lazily (window.journey publishes its chapter modules after',
        'pre-C05 :: *  window.journey (and with it the chapter modules) is published AFTER',
        "pre-C05 :: Chapter modules are reached through window.journey's public handle,",
      ],
      proseOcc: 3,
    },
    private: {
      code: [
        'pre-C05 :: const pf = mod.portraits;',
        'pre-C05 :: if (ownedChapter?.portraits?.setRailExcluded) {',
        'pre-C05 :: ownedChapter.portraits.setRailExcluded(ownedRailExcluded);',
      ],
      codeOcc: 3, prose: [], proseOcc: 0,
    },
  },
  'four code SITES, not five, because ui.js:807 and ui.js:1573 were the same line of text in two functions and this keying is by text; the OCCURRENCE tally is nine and carries the fifth');

pin('A5', 'main.js still reads the published global three times — OUT OF SCOPE and recorded here rather than left looking like a gap this gate failed to catch',
  (i) => closure('main.js', i.src, GLOBAL_RE, i.code),
  { src: SRC.main, code: CODE },
  {
    code: [
      'main.js :: if (window.journey) return;',
      "main.js :: if (window.journey) window.journey.flyTo('mission');",
      'main.js :: if (window.journey) window.journey.flyTo(chapter);',
    ],
    codeOcc: 5,
    prose: ['main.js :: window.journey.flyTo, the same handle the rail\'s tiles and the two hero'],
    proseOcc: 1,
  },
  'design.md section 11 Q1 names these three explicitly; closing the handle is D13, and B04 owns it. This row is ALSO the live foreign positive control for A1/A2/A3 — the scanner demonstrably finds code sites in a file that has them');

pin('A6', 'ACROSS ALL OF journey/, the only code that names the published global is journey.js publishing the handle it owns and returning it on a second boot',
  (i) => {
    const walk = (dir, acc = []) => {
      for (const entry of readdirSync(dir).sort()) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) walk(full, acc);
        else if (entry.endsWith('.js')) acc.push(full.slice(REPO.length + 1));
      }
      return acc;
    };
    const codeSites = [];
    const proseOnly = [];
    for (const file of walk(join(REPO, 'journey'))) {
      const src = readFileSync(join(REPO, file), 'utf8');
      const found = closure(file, src, GLOBAL_RE, i.code);
      if (found.code.length) codeSites.push(...found.code);
      else if (found.prose.length) proseOnly.push(file);
    }
    return { codeSites, proseOnly, proseFiles: proseOnly.length };
  },
  { code: CODE },
  {
    /* RE-BASELINED by the DISPOSAL REMOVAL, 2026-08-25 — TWO SITES BEFORE
       AND TWO AFTER, both still in journey/journey.js, and THE PIN'S CLAIM
       IS UNCHANGED: the only code in journey/ that names the published
       global is this file publishing the handle it owns and returning it on
       a second boot. This row is the one J03 invariant that outlives every
       order that touches it, and nothing about the removal weakened it.
       WAS (pre-removal, J04e's spelling):
         'journey/journey.js :: if (liveJourney) return window.journey;'
         "journey/journey.js :: window.journey = lifecycle.claim(window, 'journey', state);"
       J04e's live-instance latch went back to being a plain boot latch, and
       `claim` — which armed an exact restore of the slot for a disposal that
       never came — went with the rest of the machinery. The publication is a
       bare assignment again, which is what it was before J04e and is still
       written out at the site precisely so THIS scan can see it. */
    codeSites: [
      'journey/journey.js :: if (booted) return window.journey;',
      'journey/journey.js :: window.journey = state;',
    ],
    proseOnly: [
      'journey/chapter-contract.js',
      'journey/chapters/connect/index.js',
      'journey/chapters/final/index.js',
      'journey/chapters/inspire/index.js',
      'journey/chapters/owned/index.js',
      /* REMOVED by the DISPOSAL REMOVAL, 2026-08-25: journey-owner.js's
         prose note about `claim` went with `claim`. The file survives as one
         exported constant and names the token nowhere. */
      /* Added by order U06, 2026-08-23, on U03's precedent immediately below:
         the label-policy latch and the rail-exclusion dispatch left
         `journey/ui.js` for their own owners, and C05 slice D's notes about
         the two `window.journey` reads it closed moved WITH the bodies they
         document. `journey/ui.js` stays on the list — it still carries the
         other two notes — so this is two files gained and none lost, which is
         the signature of a relocation rather than a deletion. */
      'journey/ui/label-policies.js',
      /* REMOVED by the DISPOSAL REMOVAL, 2026-08-25: owner.js's prose no
         longer discusses the publication, because it no longer arms
         anything against it. */
      'journey/ui/rail-mask.js',
      /* Added by order U03, 2026-08-22: the shared selection owner carries
         C05 slice D's own note about the read it closed, because the note
         moved with the body it documents. */
      'journey/ui/selection.js',
      'journey/ui.js',
    ],
    proseFiles: 9,
  },
  'the file COUNT of the walk is deliberately not pinned — J04c/J04d/J04e add modules and a growing tree is not a defect; what is pinned is the set of files that name the token');

/* ------------------------------------------------------------------ *
 * B — the closure, EXECUTED.                                          *
 * ------------------------------------------------------------------ */
console.log('\nB — executed: the migrated bodies cannot reach the handle');

pin('B0', 'the three executed bodies ARE the shipped text — sliced from journey/ui.js under refusing, ambiguity-checked anchors, and each is the whole function or loop, not a fragment',
  (i) => Object.entries(i.slice).map(([k, v]) => `${k}:${v.trim().split('\n').length}:${/^\s*(function|for) /.test(v) ? 'head' : 'FRAGMENT'}:${v.trim().endsWith('}') ? 'closed' : 'OPEN'}`),
  { slice: SLICE },
  ['labelPolicy:12:head:closed', 'notifySelect:5:head:closed', 'excluded:7:head:closed'],
  'there is NO imported-module equivalence control for these three (journey/ui.js needs a DOM and a WebGL scene); this row is what stands in its place');

pin('B1', 'THE MIGRATED BODIES REACH THE HANDLE ZERO TIMES, and the injected capabilities receive every call instead',
  (i) => { const r = runMigrated(i.text); return { globalReads: r.globalReads, calls: r.calls }; },
  { text: SLICE },
  {
    globalReads: 0,
    calls: [
      'labelPolicy(inspire,ados)', 'labelPolicy(owned,hive)', 'labelPolicy(owned,arca)',
      'setSelected(owned,hive,true)', 'setSelected(inspire,ados,false)',
      'setExcludedNodes(inspire,[ados])', 'setExcludedNodes(connect,[])', 'setExcludedNodes(owned,[hive])',
    ],
  },
  'the zero and the non-empty call log come out of ONE run of ONE world, so a mutant cannot remove the control without removing the zero');

pin('B2', 'THE PRE-C05 BODIES REACH IT NINE TIMES on the same world, and reach the private portraits field too — the trap can see, and this is what it was seeing before C05 slice D',
  (i) => { const r = runPreC05(i.text); return { globalReads: r.globalReads, calls: r.calls }; },
  { text: OLD },
  /* NINE AND THREE, hand-derived from the fixture text before the suite was
     run and before A4's tally was consulted. The handle: the sub-pulse line
     reads it three times (`window.journey && window.journey.chapters &&
     window.journey.chapters[c.id]`), resolveLabelPolicies twice,
     chapterModuleFor twice, the rail-exclusion pair twice — 3+2+2+2 = 9.
     The private field: the old notifySelect falls through to `mod.portraits`
     because these chapters declare no ROOT setSelected (it lives under
     `selection` now), and the old rail-exclusion site reaches it twice more —
     once for the `?.portraits?.setRailExcluded` guard and once for the call. */
  {
    globalReads: 9,
    calls: ['PRIVATE portraits(owned)', 'PRIVATE portraits(owned)', 'PRIVATE portraits(owned)'],
  },
  'this is the executed form of design.md Q1 condition 2 — the pre-C05 number pinned to a literal beside the post-C05 zero');

pin('B3', 'THE REAL REGISTRAR, IMPORTED AND RUN: journey/chapter-interactions.js registers every node through declared capabilities and touches neither the handle nor the private field',
  (i) => {
    /* THE REAL node ids, off the shipped schema: the registrar ends with
       validateJourneyStructure, so a made-up set is refused before the
       closure claim can be made at all. Only owned declares a nodeRadius,
       which is B6's measured premise arriving as this row's fixture. */
    const world = buildWorld({
      hotspots: [],
      chapters: {
        inspire: { nodeIds: i.nodeIds.inspire, setSelected: true, labelPolicy: true },
        connect: { nodeIds: i.nodeIds.connect, selectionNull: true },
        owned: { nodeIds: i.nodeIds.owned, nodeRadius: true, setSelected: true },
      },
    });
    const added = [];
    const ui = {
      addHotspot: (h) => { added.push(`${h.chapter}/${h.id}/${typeof h.radius}`); return {}; },
      addHoverZone: () => {},
      copyEase: () => 0,
    };
    let threw = null;
    const trap = withGlobalTrap({ chapters: world.chapters }, () => {
      try { return i.register(ui, world.chapters); }
      catch (e) { threw = `${e.constructor.name}: ${e.message}`; return null; }
    });
    return {
      globalReads: trap.reads,
      privateReaches: world.calls.filter((c) => c.startsWith('PRIVATE')).length,
      threw,
      registered: trap.value === null ? null : Object.keys(trap.value).length,
      order: added.map((a) => a.split('/')[0]).filter((c, n, all) => all[n - 1] !== c),
      radiusOwners: [...new Set(added.filter((a) => a.endsWith('/function')).map((a) => a.split('/')[0]))],
    };
  },
  { register: REGISTRAR_MOD.registerChapterInteractions, nodeIds: SCHEMA_NODE_IDS },
  {
    globalReads: 0, privateReaches: 0, threw: null, registered: 22,
    order: ['inspire', 'connect', 'owned'],
    radiusOwners: ['owned'],
  },
  'the 22 registered nodes and the RUNTIME_CHAPTER_IDS order are the properties C05 slice C\'s prose says must not change; they appear here as by-products of the closure run, and the load-bearing halves of this row are the two zeros beside them');

pin('B4', 'THE VALUES, not merely the wiring (C05 F-3): labelPolicy\'s return reaches the applier for every mounted chapter\'s nodes, policyDone is set on exactly those, and an UNMOUNTED chapter re-arms the pass',
  (i) => { const r = runMigrated(i.text); return { applied: r.applied, pending: r.pending, policyDone: r.policyDone }; },
  { text: SLICE },
  {
    applied: ['ados=inspire:ados', 'hive=owned:hive', 'arca=owned:arca'],
    pending: true,
    policyDone: ['ados=true', 'hive=true', 'arca=true', 'lost=false'],
  },
  'the fourth hotspot names a chapter absent from the injected map, so `left` is the vestigial-retry branch design.md section 6.3 deliberately kept — exercised here rather than left as an untested else (D75)');

pin('B5', 'setExcludedNodes is delivered PER CHAPTER and UNCONDITIONALLY: connect owns none of the excluded ids and still receives an empty Set, exactly as the old unconditional call behaved',
  (i) => { const r = runMigrated(i.text); return r.calls.filter((c) => c.startsWith('setExcludedNodes')); },
  { text: SLICE },
  ['setExcludedNodes(inspire,[ados])', 'setExcludedNodes(connect,[])', 'setExcludedNodes(owned,[hive])'],
  'ui.js\'s own comment claims "unconditional per frame, as the old call was" and "per chapter, not the union"; both halves are this row');

pin('B6', 'THE PREMISE THAT COMMENT RESTS ON, measured: owned declares the only nodeRadius function, so its share of the exclusion set IS the whole of it, as the pre-C05 owned-only call passed',
  (i) => Object.entries(i.chapters).map(([id, src]) => {
    const m = [...i.code(src).matchAll(/\n\s*nodeRadius\s*(?::\s*([A-Za-z]+)|,)/g)];
    return `${id}:${m.length ? m.map((x) => x[1] || 'shorthand').join('+') : 'absent'}`;
  }),
  { code: CODE, chapters: { connect: SRC.connect, final: SRC.final, inspire: SRC.inspire, owned: SRC.owned } },
  ['connect:null', 'final:absent', 'inspire:null', 'owned:shorthand+shorthand'],
  'owned is the only chapter whose nodeRadius is a shorthand reference to a real function rather than a literal null or an absent key');

pin('B7', 'a chapter declaring `selection: null` is simply not told — the connect case, entered rather than assumed',
  (i) => {
    const world = buildWorld({
      hotspots: [{ id: 'hub', chapter: 'connect' }, { id: 'hive', chapter: 'owned' }],
      chapters: { connect: { selectionNull: true }, owned: { setSelected: true } },
    });
    const select = new Function('hotspots', 'chapters', 'nodeId', 'on',
      `${i.text.notifySelect}\n    return notify(nodeId, on);`);
    select(world.hotspots, world.chapters, 'hub', true);
    select(world.hotspots, world.chapters, 'hive', true);
    return world.calls;
  },
  { text: SLICE },
  ['setSelected(owned,hive,true)'],
  'D75 — the branch the shipped route DOES enter (connect declares selection: null), exercised rather than recorded as unreachable');

/* ------------------------------------------------------------------ *
 * C — the design's two conditions on this gate, measured.             *
 * ------------------------------------------------------------------ */
console.log('\nC — the design\'s own conditions on this gate');

pin('C1', 'CONDITION 1 (design.md section 11 Q1): without comment stripping the UI surface gives five FALSE reds, and a naive `//`-only stripper fixes NONE of them, because all five sit in BLOCK comments — D101\'s blindness, on this subject',
  (i) => ({
    unstripped: scan(UI, i.src, GLOBAL_RE).occ,
    shared: scan(UI, i.code(i.src), GLOBAL_RE).occ,
    naiveLineComment: scan(UI, i.src.replace(/(^|[^:])\/\/[^\n]*/g, '$1'), GLOBAL_RE).occ,
  }),
  /* U03 split the file; four of the five mentions stayed with the composition
     root and one went to journey/ui/selection.js with the body it documents.
     The count is the SUBJECT's, not one address's. */
  { src: UI_SURFACE.map(([, text]) => text).join('\n'), code: CODE },
  { unstripped: 5, shared: 0, naiveLineComment: 5 },
  'the design named ui.js:136, :804 and :1558; C05 slice D and J04b moved the file and there are five now, which is why this row anchors on text and counts rather than citing lines (D93)');

pin('C1b', 'the shared stripper is LENGTH- and LINE-preserving on this subject, so a line number derived from stripped text still indexes the original',
  (i) => [i.code(i.src).length === i.src.length,
    i.code(i.src).split('\n').length === i.src.split('\n').length],
  { src: SRC.ui, code: CODE }, [true, true]);

pin('C1c', 'and the subjects carry NO scanned token inside a string literal, so leaving string contents intact costs this scan nothing — measured, not assumed',
  (i) => Object.entries(i.files).map(([name, src]) => {
    const bare = scan(name, stripComments(src, { blankStrings: false }), GLOBAL_RE).occ;
    const blanked = scan(name, stripComments(src, { blankStrings: true }), GLOBAL_RE).occ;
    return `${name}:${bare}:${blanked}`;
  }),
  { files: { 'journey/ui.js': SRC.ui, 'journey/chapter-interactions.js': SRC.registrar, 'main.js': SRC.main } },
  ['journey/ui.js:0:0', 'journey/chapter-interactions.js:0:0', 'main.js:5:5'],
  'if the two ever disagree, a token has moved into a string and the scan must decide which reading it wants');

pin('C3', 'THE KEYING, measured rather than trusted: keying these site sets `file :: text` — QA-05\'s ruling for this same subject — instead of `file :: line :: text` collapses nothing, because both keyings have the same cardinality on every file scanned',
  (i) => Object.entries(i.files).map(([name, src]) => {
    const s = scan(name, i.code(src), GLOBAL_RE);
    const d64 = foreignSiteSet(name, i.code(src), GLOBAL_RE(), { blankStrings: false });
    return `${name}:${s.sites.length}:${s.lineKeyed.length}:${d64.length === s.lineKeyed.length}`;
  }),
  { code: CODE, files: { 'journey/journey.js': SRC.journey, 'main.js': SRC.main } },
  ['journey/journey.js:2:2:true', 'main.js:3:3:true'],
  'the third field is the shared foreignSiteSet agreeing with this file\'s own line keying, so the comparison is against the house instrument and not against a second copy of it');

/* ------------------------------------------------------------------ *
 * E — the obligations that are INAPPLICABLE, derived not asserted.    *
 * ------------------------------------------------------------------ */
console.log('\nE — what a production-write-free order does not owe');

pin('E1', 'X3 — the source manifest holds PRODUCTION paths only, so an order that creates no production module owes it no entry: no tools/ path appears in it, and the three files this order READ are all already there',
  (i) => {
    const body = uniqueSlice(i.src, 'SOURCE_MANIFEST', 'const SOURCE_MANIFEST = [', '\n  ];');
    const paths = [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    return {
      toolsEntries: paths.filter((p) => p.startsWith('tools/')),
      subjectsPresent: [UI, REGISTRAR, 'journey/journey.js'].filter((p) => paths.includes(p)),
    };
  },
  { src: SRC.baseline },
  { toolsEntries: [], subjectsPresent: [UI, REGISTRAR, 'journey/journey.js'] },
  'M6/M7/M9/M16/M18/M19 are floors and ceilings over the same production text, and this order changes none of it');

pin('E2', 'COV-1 — the shared-instrument filter is EXECUTED on this file\'s own basename and excludes it, so no probe or mutant table is owed in tools/test-instrument-layer.mjs',
  (i) => {
    const head = '.filter((f) => ';
    const expr = uniqueSlice(i.src, 'COV-1-filter', `${head}/\\.mjs$/.test(f)`, '!NOT_SHARED_INSTRUMENTS[f])');
    const test = new Function('f', 'NOT_SHARED_INSTRUMENTS', `return (${expr.slice(head.length, -1)});`);
    return {
      thisFile: test('test-ui-closure.mjs', {}),
      control: test('strip-comments.mjs', {}),
      filterIsTheShippedOne: /\^\(test-\|verify-\)/.test(expr),
    };
  },
  { src: SRC.instrumentLayer },
  { thisFile: false, control: true, filterIsTheShippedOne: true },
  'the control is a real shared module the filter DOES admit, so a filter that had stopped admitting anything could not satisfy this row');

/* ------------------------------------------------------------------ *
 * F — this suite, audited (D44 / D76 / D86).                          *
 * ------------------------------------------------------------------ */
console.log('\nF — this suite, audited');

const PIN_TOKEN = maskedToken('p' + 'in');
const LIT_RE = literalPredicateRe(['L.same', PIN_TOKEN.whole], 2);
const LIT = literalPredicateHits(SRC_SELF, LIT_RE);
L.same('F1', 'D44 — bare-literal-predicate assertions in this suite', LIT.hits.length, 0,
  LIT.hits.join('\n        '));
L.same('F2', 'D46 — control: the D44 pattern DOES fire on a bare literal',
  literalPredicateProbe(LIT_RE, "L.same('X', 'what', true);"), true);
L.same('F3', 'D46 — control: it does NOT fire on a real comparison',
  literalPredicateProbe(LIT_RE, "L.same('X', 'what', a.length, 3);"), false);
L.same('F4', 'D45 — the D44 scan read this whole file, not a fragment', LIT.lineCount > 300, true);
L.same('F5', 'D76 — this self-scan MASKS its own token, so its stored rows are not occurrences it counts',
  [PIN_TOKEN.whole.length, SRC_SELF.includes("maskedToken('p' + 'in')")], [3, true]);

const TAUT = scanTautologyAst(SRC_SELF, new Map([['L.same', 2], [PIN_TOKEN.whole, PIN_RECEIVER]]));
L.same('F6', 'D86 — syntactic tautologies in this suite', TAUT.hits, [], TAUT.hits.join('\n        '));
L.same('F7', 'D86 — the AST pass reached this suite\'s call sites (a zero means the scan went blind, not that the file is clean)',
  [TAUT.sites > 0,
    TAUT.sites === REGISTRY.size + selfSiteSet('x', SRC_SELF, /(?:^|[^.\w$])L\.same\(/, null).length],
  [true, true]);
L.same('F8', 'D86 — control: the pass DOES fire on the shape a text scan cannot see',
  scanTautologyAst("L.same('X', 'what', 8, 8);", new Map([['L.same', 2]])).hits.length, 1);
L.same('F9', 'D76 — pin() call sites counted in this file equal the registry size',
  selfSiteSet('tools/test-ui-closure.mjs', SRC_SELF,
    new RegExp(`^${PIN_TOKEN.head}${PIN_TOKEN.tail}\\(`), PIN_TOKEN.whole).length, REGISTRY.size);

/* ------------------------------------------------------------------ *
 * Report / --prove-failure                                            *
 * ------------------------------------------------------------------ */

SENTINEL.reach('main');
let exitCode = L.report();

if (PROVE) {
  console.log('\n--- D58/D88 mutants: each names its killer; the null control runs FIRST ---\n');

  /* D88 — THE NULL-MUTANT CONTROL, AND IT RUNS FIRST. It targets a REAL pin
     (A5) and perturbs a part of the input that pin's reader does not read:
     main.js's text is scanned for the GLOBAL pattern, so adding a private
     portraits reach to it moves nothing A5 reports. The registry must score
     it CANNOT FAIL; a sweep that "kills" this is scoring noise. */
  const CTL = sweep([
    M('A5', 'D88 NULL CONTROL — a token A5\'s reader does not scan for is added to main.js', null,
      (i) => ({ ...i, src: `${i.src}\nconst q = chapter.portraits;\n` })),
  ]);
  L.same('P0a', 'D88 — the null control is scored, and scored as CANNOT FAIL by gate 3',
    CTL.gates.outputStill, ['A5']);
  L.same('P0b', 'D88 — and by NO other gate: it reached gate 3, so gates 1 and 2 both passed on it',
    [CTL.bad, CTL.gates.baselineMismatch, CTL.gates.inputNoOp,
      CTL.gates.axisMismatch, CTL.gates.unregistered, CTL.gates.threw],
    [1, [], [], [], [], []]);

  /* Every body mutant below perturbs SOURCE TEXT, which the reader then
     compiles — never an already-built closure, because inputCanon hashes
     String(fn) and would report the swap as a no-op (D88, declared in the
     header). D105: the readers build their world from WORLD_SPEC on every
     call, so the baseline pass never sees a world a previous run moved. */
  const MUTANTS = [
    /* U03 widened A1/A2 from one file to the UI surface, so their mutants
       perturb ONE NAMED MEMBER of that list rather than a lone `src`. Each
       still lands in the file that actually holds the mutated line — A1's in
       the composition root, A2's in the selection owner the read moved to —
       which is what keeps the mutation a reach the pin must see and not a
       string edit in an unrelated file. */
    M('A1', 'the reach comes back into ui.js, as the computed form a member-access pattern cannot see', ['code', 'codeOcc'],
      (i) => ({ ...i, files: mutateIn(i.files, 'journey/ui/label-policies.js', 'A1', '  function resolveLabelPolicies() {',
        "  function resolveLabelPolicies() {\n    const mods = window['jour' + 'ney'].chapters;\n    void mods;") })),
    M('A2', 'the selection owner reaches a chapter\'s private portraits field again', ['code', 'codeOcc'],
      (i) => ({ ...i, files: mutateIn(i.files, 'journey/ui/selection.js', 'A2', '    const sel = h && chapters[h.chapter] && chapters[h.chapter].selection;',
        '    const sel = h && chapters[h.chapter] && chapters[h.chapter].portraits;') })),
    M('A2b', 'C06 closes journey.js\'s private read, and this gate\'s record of it goes stale in the direction that matters', ['code', 'codeOcc'],
      (i) => ({ ...i, src: mutateText(i.src, 'A2b', 'const portraits = chapters.owned && chapters.owned.portraits;',
        'const portraits = chapters.owned && chapters.owned.portraitModel();') })),
    M('A3', 'the registrar grows a reach back to the published global', ['global'],
      (i) => ({ ...i, src: mutateText(i.src, 'A3', '  const nodeChapter = {};',
        '  const nodeChapter = {};\n  const all = window.journey.chapters;\n  void all;') })),
    M('A4', 'the fixture loses the rail-exclusion pair, so the pre-C05 literal quietly becomes a smaller number', ['global'],
      (i) => ({ ...i, src: i.src.replace('      ? window.journey.chapters.owned : null;\n', '') })),
    M('A5', 'main.js closes its three reads and this gate keeps claiming they are open — the prose mention goes with them, which is why the declared axis is all four members', ['code', 'codeOcc', 'prose', 'proseOcc'],
      (i) => ({ ...i, src: i.src.replace(/window\.journey/g, 'journeyHandle') })),
    M('A6', 'ui.js starts naming the handle in code again — the reach re-entering the tree anywhere but journey.js. It moves THREE members, because a file with a code site stops being a prose-only file', ['codeSites', 'proseFiles', 'proseOnly'],
      (i) => ({ ...i, code: (s) => i.code(s.replace('/* THE COPY SUB-PULSE IS GONE',
        'const back = window.journey; void back;\n/* THE COPY SUB-PULSE IS GONE')) })),
    M('B0', 'the slice takes a FRAGMENT — the anchors drift and half a function is executed as if it were the whole one', [0],
      (i) => ({ ...i, slice: { ...i.slice, labelPolicy: i.slice.labelPolicy.split('\n').slice(0, 4).join('\n') } })),
    M('B1', 'resolveLabelPolicies goes back to the global for its chapter map — the migration reverting', ['globalReads'],
      (i) => ({ ...i, text: { ...i.text, labelPolicy: mutateText(i.text.labelPolicy, 'B1',
        '      const ch = chapters[h.chapter];', '      const ch = window.journey.chapters[h.chapter];') } })),
    M('B2', 'the pre-C05 sub-pulse stops reaching the handle, so the trap\'s demonstration that it CAN see is quietly weakened', ['globalReads'],
      (i) => ({ ...i, text: { ...i.text, subPulse: mutateText(i.text.subPulse, 'B2',
        'const mod = window.journey && window.journey.chapters && window.journey.chapters[c.id];',
        'const mod = null;') } })),
    M('B3', 'the registrar is replaced by one that reaches the handle and the private field — the shape B3 exists to refuse', ['globalReads', 'order', 'privateReaches', 'radiusOwners', 'registered'],
      (i) => ({ ...i, register: (ui, chapters) => {
        void window.journey;
        void chapters.owned.portraits;
        ui.addHotspot({ chapter: 'owned', id: 'hive', radius: undefined });
        return {};
      } })),
    M('B4', 'policyDone is set for a hotspot whose chapter is NOT mounted, so the vestigial retry never re-arms', ['pending', 'policyDone'],
      (i) => ({ ...i, text: { ...i.text, labelPolicy: mutateText(i.text.labelPolicy, 'B4',
        '      if (!ch) { left = true; continue; }', '      if (!ch) { h.policyDone = true; continue; }') } })),
    M('B5', 'every chapter is handed the UNION instead of its own ids — the exact error the per-chapter loop replaced', [0, 1, 2],
      (i) => ({ ...i, text: { ...i.text, excluded: mutateText(i.text.excluded, 'B5',
        '      for (const h of hotspots) if (h.chapter === id && excluded.has(h.id)) mine.add(h.id);',
        '      for (const h of hotspots) if (excluded.has(h.id)) mine.add(h.id);') } })),
    M('B6', 'inspire grows a real nodeRadius, so owned stops being the only owner of the exclusion set', [2],
      (i) => ({ ...i, chapters: { ...i.chapters, inspire: i.chapters.inspire.replace('      nodeRadius: null,', '      nodeRadius,') } })),
    M('B7', 'THE PRIVATE BRIDGE COMES BACK — a chapter that declares no selection is reached through its portraits field instead, which is the pre-C05 fall-through C05 slice D deleted', null,
      (i) => ({ ...i, text: { ...i.text, notifySelect: mutateText(i.text.notifySelect, 'B7',
        "    if (sel && typeof sel.setSelected === 'function') sel.setSelected(nodeId, on);",
        "    if (sel && typeof sel.setSelected === 'function') sel.setSelected(nodeId, on);\n"
        + '    else if (h) { const pf = chapters[h.chapter].portraits; if (pf) pf.setSelected(nodeId, on); }') } })),
    M('C1', 'the stripper stops blanking block comments, so ui.js\'s five prose mentions become five false reds', ['shared'],
      (i) => ({ ...i, code: (s) => s.replace(/(^|[^:])\/\/[^\n]*/g, '$1') })),
    M('C1b', 'the stripper stops preserving length, so every line number derived from stripped text re-points', [0],
      (i) => ({ ...i, code: (s) => i.code(s).replace(/ {2,}/g, ' ') })),
    M('C1c', 'a scanned token moves into a string literal, where the two stripping modes disagree about whether it is code', [0],
      (i) => ({ ...i, files: { ...i.files, 'journey/ui.js': `${i.files['journey/ui.js']}\nconst hint = "window.journey";\n` } })),
    M('C3', 'two distinct sites share one line of text, so text keying WOULD collapse them and the deviation stops being free', [1],
      (i) => ({ ...i, files: { ...i.files, 'main.js': mutateText(i.files['main.js'], 'C3',
        "    if (window.journey) window.journey.flyTo('mission');",
        '    if (window.journey) return;') } })),
    M('E1', 'a tools/ path enters the source manifest, so a tools-only order WOULD owe it an entry', ['toolsEntries'],
      (i) => ({ ...i, src: i.src.replace('    "flags.js",', '    "flags.js",\n    "tools/test-ui-closure.mjs",') })),
    M('E2', 'COV-1\'s filter stops excluding test- prefixed files, so this suite WOULD owe a probe and a mutant table there', ['filterIsTheShippedOne', 'thisFile'],
      (i) => ({ ...i, src: mutateText(i.src, 'E2', '!/^(test-|verify-)/.test(f)', '!/^(verify-)/.test(f)') })),
  ];

  const res = sweep(MUTANTS);
  L.discard();
  L.same('P1', 'D50 — mutants exercised', res.total, MUTANTS.length);
  L.same('P2', 'D50 — every mutant drove its named assertion red, on the axis it declared', res.bad, 0);
  /* D88 — THE DECLARED-EQUIVALENCE SET IS EMPTY. Every mutation above moves a
     quantity some pin reads; none is a refactoring that leaves behaviour
     intact. So the survivor set must be empty, and P0a is the separate proof
     that an empty survivor set is a finding rather than an instrument that
     cannot report one. */
  L.same('P3', 'D88 — the survivor set EQUALS the declared-equivalence set, which for this list is empty',
    res.gates.outputStill, []);
  L.same('P4', 'D74 — no mutant reported BROKEN (a rotted anchor is never a silent kill)',
    Object.entries(res.gates).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.join(',')}`), []);
  L.same('P5', 'D70 — harness faults during the sweep (re-raised after the report, never scored)', res.faults, []);
  L.same('P6', 'D58 — registered pins carrying no mutant', res.uncovered, []);
  L.same('P7', 'D58 — every registered pin is mutated exactly once; the null control is the only extra mutant and it ran separately',
    [REGISTRY.size, MUTANTS.length, CTL.total], [MUTANTS.length, MUTANTS.length, 1]);
  SENTINEL.reach('prove');
  exitCode = L.report() || exitCode;
  if (res.faults.length) {
    throw new HarnessFault(`${res.faults.length} harness fault(s) during the sweep:\n  ${res.faults.join('\n  ')}`);
  }
}

process.exit(exitCode);
