/* ==================================================================== *
 * tools/stage-tree.mjs — the single module-tree stager (D84).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * SEVEN copies of this mechanism shipped in tools/, not the four H06
 * counted when it named this order's first entry:
 *
 *   test-portrait-harness.mjs   test-tendrils-split.mjs
 *   test-owned-substrate-split.mjs   test-ring-split.mjs
 *   test-canopy-split.mjs   test-terrain-split.mjs   test-clones-split.mjs
 *
 * Each one copies a module graph into a scratch directory, rewriting every
 * relative specifier to an absolute file:// URL of the copy, so that a suite
 * can (a) load a chapter under plain Node, (b) get an INDEPENDENT module
 * registration per call, and (c) perturb the shipped source and reload it.
 *
 * THE DIVERGENCES, which are the finding
 * --------------------------------------
 * The walk itself is character-for-character identical across all seven
 * apart from `let raw` vs a ternary and the parameter name. What differed:
 *
 *   - test-portrait-harness.mjs returns a BARE PATH, not a file:// URL; its
 *     three call sites prepend 'file://' by hand. A different contract.
 *   - it also has NO override, asIf, asIfMap or patch: staging only.
 *   - test-owned-substrate-split.mjs has override but no asIf, no patch.
 *   - test-canopy-split.mjs has asIf but no patch.
 *   - test-tendrils-split.mjs and test-ring-split.mjs have asIf and patch
 *     but no asIfMap.
 *   - test-terrain-split.mjs and test-clones-split.mjs are the full form and
 *     are NORMALISED-IDENTICAL to each other.
 *   - the 'three' remap target is P.three in five copies and a hand-written
 *     `${REPO}/vendor/three/three.module.js` in two. Same value, two sources.
 *
 * This module is the STRONGEST of the seven, not their average: the full
 * option set, the file:// contract, and one capability none of them had.
 *
 * THE CAPABILITY NONE OF THEM HAD — the specifier guard
 * -----------------------------------------------------
 * All seven find specifiers with exactly `/from\s+'([^']+)'/g`. That pattern
 * is blind to four shapes:
 *
 *   import './side.js';        (side-effect import — no `from` at all)
 *   import a from "./d.js";    (double quotes)
 *   await import('./dyn.js');  (dynamic)
 *   import b from'./tight.js'; (no space before the quote)
 *
 * A blind specifier is not a crash. It is written through to the copy
 * unchanged, where it resolves against the SCRATCH directory instead of the
 * source directory — so the staged module quietly imports the REAL tree,
 * unpatched and unoverridden, and every perturbation the suite thought it
 * had applied is absent from that edge. Silent, and it reads as a pass.
 *
 * Measured before this guard shipped: 97 .js files under journey/, comments
 * stripped by tools/strip-comments.mjs, ZERO instances of any of the four
 * shapes, against a 4/4 positive control on a synthetic file. So the hazard
 * is latent rather than live, and the guard costs nothing today. It is here
 * because the failure mode is invisible: the day someone writes a
 * side-effect import into a staged chapter, seven suites go green over a
 * module they did not stage.
 *
 * The guard reads code with comments stripped, because journey/journey.js
 * carries the prose `this" from "we arrived on it"` in a comment, which the
 * double-quote shape would otherwise match.
 *
 * D87 — WHY THERE IS NO `import.meta.url` IN THIS FILE
 * ----------------------------------------------------
 * Every one of the seven copies derives its repo root as
 *
 *     resolve(dirname(fileURLToPath(import.meta.url)), '..')
 *
 * and every one of them lives in tools/. Lifting that line into this module
 * would produce the IDENTICAL value for all seven current consumers, so the
 * defect would be invisible to every test in the tree and would surface only
 * when a consumer is placed in some other directory.
 *
 * That is D87's hazard in its purest form — it is not merely undetected, it
 * is undetectable from inside the current consumer set. So `scratchRoot` and
 * `threePath` are REQUIRED parameters with no defaults, this file contains
 * no `import.meta.url`, no `__dirname`, no relative path resolution and no
 * stack inspection, and tools/test-stage-tree.mjs pins that as source text.
 * ==================================================================== */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';

import { fault } from './instrument-ledger.mjs';
import { stripComments } from './strip-comments.mjs';

/** Specifier shapes the `from '...'` walk cannot see. Each is checked
 *  against COMMENT-STRIPPED source. Ordered; the first hit is reported. */
export const BLIND_SPECIFIER_SHAPES = [
  ['side-effect import (no `from`)', /^[ \t]*import\s+['"][^'"]+['"]\s*;?[ \t]*$/m],
  ['double-quoted specifier', /\bfrom\s+"[^"]+"/],
  ['dynamic import()', /\bimport\s*\(\s*['"`]/],
  ["no space before the quote (from'x')", /\bfrom'[^']+'/],
];

/** The one specifier pattern the walk rewrites. Exported so a suite can pin
 *  that the guard's shapes and this pattern are complements rather than
 *  overlapping — a guard that fires on something the walk already handles
 *  would be a false alarm, not a defence. */
export const SPECIFIER_RE = () => /from\s+'([^']+)'/g;

/**
 * Every specifier the walk will rewrite, as `{ start, end, spec }` offsets
 * into the RAW text.
 *
 * QA-08 / D88 — THE TWO HALVES OF THIS MODULE DISAGREED ABOUT WHAT A
 * SPECIFIER IS. `findBlindSpecifier` strips comments before looking; the walk
 * ran `SPECIFIER_RE` straight over raw source, so a `from '…'` written inside
 * a COMMENT was collected as a dependency, read off disk, staged, and
 * rewritten. There is one live instance in the tree —
 * journey/chapters/connect/tendrils.js names `from './tendrils-materials.js'`
 * in prose — benign only because that path happens to exist. The failing case
 * is not benign and is not exotic: a comment naming a path that has moved
 * threw a bare `ENOENT` out of `readFileSync`, in the module whose headline
 * capability is a TYPED refusal (D70).
 *
 * The scan therefore runs over COMMENT-STRIPPED source and the rewrite is
 * applied to the RAW text at the offsets it found. That is only sound because
 * tools/strip-comments.mjs is LENGTH-PRESERVING — its first stated invariant
 * — so an offset in the stripped text addresses the same byte in the raw one.
 * `blankStrings` is off: here the specifier IS the string.
 */
export function specifierSites(src) {
  const scanned = stripComments(src);
  if (scanned.length !== src.length) {
    fault('stage-tree: the comment stripper was not length-preserving on this input, '
      + 'so a stripped-text offset no longer addresses the raw byte (S-3 invariant 1)');
  }
  const re = SPECIFIER_RE();
  const out = [];
  let m;
  while ((m = re.exec(scanned))) out.push({ start: m.index, end: m.index + m[0].length, spec: m[1] });
  return out;
}

/**
 * Report the first blind specifier shape in `src`, or null.
 *
 * @param {string} src raw source text; comments AND string contents are
 *                     blanked here before looking.
 * @returns {{shape: string, line: number, text: string} | null}
 *
 * QA-08 — `blankStrings` was OFF, and the first thing that revealed was that
 * THIS MODULE CANNOT STAGE ITSELF: the label
 * `"no space before the quote (from'x')"` above is a string literal that
 * matches its own regex, so the guard refused stage-tree.mjs as a hazard.
 * The same trap catches any consumer that quotes a hazard shape — and
 * tools/test-ring-split.mjs quotes three of them.
 *
 * D76's rule, in its proper place: a scan whose own stored rows are written in
 * its subject's vocabulary must mask them. Blanking string CONTENTS is exactly
 * that mask and costs the guard nothing, because every shape it looks for is
 * defined by its DELIMITERS and its keyword, not by the specifier's text:
 * `from "   "`, `from'   '`, `import '   ';` and `import( '` all still match,
 * so a real blind import is still caught. Only a shape written INSIDE a string
 * stops matching, and a shape inside a string is not an import.
 *
 * The reported `text` is read back out of the RAW source at the match offset —
 * the stripper is length-preserving — so the message names what is actually
 * written rather than a row of spaces.
 */
export function findBlindSpecifier(src) {
  const code = stripComments(src, { blankStrings: true });
  for (const [shape, re] of BLIND_SPECIFIER_SHAPES) {
    const m = code.match(re);
    if (!m) continue;
    const line = code.slice(0, m.index).split('\n').length;
    return { shape, line, text: src.slice(m.index, m.index + m[0].length).trim() };
  }
  return null;
}

/* ==================================================================== *
 * D95 — A MEMOISED STAGING IS STRUCTURALLY BLIND TO CROSS-MODULE WRITES.
 *
 * The first attempt to measure the ring -> terrain dependency returned ZERO
 * BYTES MOVED. The cause was not the measurement's arithmetic: it REUSED ONE
 * STAGED MODULE, and `ring.js`'s write onto the shared `MEMBERS` objects
 * PERSISTS ACROSS BUILDS inside a single Node module registration. Re-run
 * with a fresh registration per builder, the answer is exactly
 * `conn.aRevealIn`, 144 of 392,604 bytes.
 *
 *   > A memoised staging cannot see this class of dependency at all, and
 *   > memoised staging is what the instrument consolidation introduced.
 *
 * The memoisation was correct on its own terms — it kept the mutant count
 * identical to the old table and it is load-bearing for cost — so it is NOT
 * removed here. What is added is the ability to DETECT the blind case:
 *
 *   `auditRegistrations`   the guard. A measurement of cross-module state
 *                          declares one SUBJECT per staged module; two
 *                          subjects sharing one module URL is the blind case
 *                          and refuses with this module's own typed fault.
 *   `proveRegistrationFreshness`
 *                          the POSITIVE CONTROL the guard needs (D46): an
 *                          assert-that-they-differ is worthless if the
 *                          mechanism has stopped registering at all. It
 *                          stages ONE witness module TWICE and imports one of
 *                          the two copies TWICE, so both arms are observed in
 *                          the same run — a fresh salt restarts module scope,
 *                          and a reused URL demonstrably does not.
 *
 * WHY THE WITNESS IS HONEST. It is staged BY THE SHIPPED STAGER, through the
 * same walk, into the same scratch root, so it shares the subject's
 * registration fate exactly. It does not prove that any particular caller's
 * memo is fresh — a caller that never calls `stageTree` a second time is
 * invisible from in here, which is why `auditRegistrations` takes the
 * caller's own subject->URL table rather than reading anything private.
 * ==================================================================== */

/** The witness module. Module scope holds a counter and a mark log: a FRESH
 *  registration starts at zero, a SHARED one does not. Deliberately tiny and
 *  dependency-free — it is staged, so it must survive the specifier walk. */
export const REGISTRATION_WITNESS_SOURCE = [
  '/* staged by tools/stage-tree.mjs as the D95 fresh-registration witness. */',
  'export const state = { loads: 0, marks: [] };',
  'state.loads += 1;',
  'export const mark = (tag) => { state.marks.push(tag); return state.marks.length; };',
  '',
].join('\n');

/** Write the witness into `dir` and return its absolute path. The caller
 *  supplies the directory: this module derives no path of its own (D87). */
export function writeRegistrationWitness(dir) {
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'registration-witness.js');
  writeFileSync(p, REGISTRATION_WITNESS_SOURCE);
  return p;
}

/**
 * THE GUARD. Refuse a cross-module measurement whose subjects do not each
 * hold their own module registration.
 *
 * @param {string} label    what is being measured, for the message.
 * @param {Array<{subject: string, url: string}>} entries
 * @returns {{subjects: number, registrations: number}} on success.
 * @throws  a HarnessFault naming D95 when two subjects share one URL, or when
 *          a subject was declared with no URL at all.
 */
export function auditRegistrations(label, entries) {
  const rows = Array.isArray(entries) ? entries : [];
  if (!rows.length) {
    fault(`${label}: auditRegistrations was handed no subjects — a cross-module measurement `
      + 'with nothing registered is not a measurement (D95)');
  }
  const byUrl = new Map();
  for (const r of rows) {
    if (!r || typeof r.url !== 'string' || !r.url) {
      fault(`${label}: subject "${r && r.subject}" has no staged URL (D95)`);
    }
    if (!byUrl.has(r.url)) byUrl.set(r.url, []);
    byUrl.get(r.url).push(r.subject);
  }
  const shared = [...byUrl.entries()].filter(([, subs]) => new Set(subs).size > 1);
  if (shared.length) {
    fault(`${label}: ${shared.length} module registration(s) are SHARED between subjects `
      + `— ${shared.map(([u, subs]) => `${subs.join(' + ')} both use ${u}`).join('; ')}. `
      + 'A module-scope write by one subject persists into the other, so a cross-module '
      + 'dependency measured this way reports ZERO BYTES MOVED and calls the difference '
      + 'noise (D95). Register fresh per subject: pass a distinct salt.');
  }
  return { subjects: rows.length, registrations: byUrl.size };
}

/**
 * THE POSITIVE CONTROL for the guard. Both arms, one run.
 *
 * @param {object} o
 * @param {Function} o.stageTree     a stager from `createStager`.
 * @param {string}   o.witnessPath   from `writeRegistrationWitness`.
 * @param {Function} [o.importer]    defaults to dynamic `import`.
 * @returns {Promise<object>} the observations, as data for the caller to pin:
 *   `distinctUrls`     2 — two salts produced two staged copies;
 *   `freshLoads`       [1, 1] — each copy's module body ran once;
 *   `freshMarks`       [1, 1] — each copy's module scope started EMPTY;
 *   `reusedMark`       2 — re-importing the FIRST URL returned the SAME
 *                      instance, so the mark log carried over. This is the
 *                      arm that proves the control is not stuck: if module
 *                      registration had silently become fresh-every-time,
 *                      this would read 1 and the check fails.
 *   `reusedIsSameInstance` true.
 */
export async function proveRegistrationFreshness({ stageTree, witnessPath, importer = (u) => import(u) }) {
  const a = stageTree(witnessPath, { salt: 'd95-witness-a' });
  const b = stageTree(witnessPath, { salt: 'd95-witness-b' });
  const A = await importer(a);
  const B = await importer(b);
  const freshLoads = [A.state.loads, B.state.loads];
  const freshMarks = [A.mark('a'), B.mark('b')];
  const A2 = await importer(a);
  const reusedMark = A2.mark('a-again');
  return {
    distinctUrls: new Set([a, b]).size,
    freshLoads,
    freshMarks,
    reusedMark,
    reusedIsSameInstance: A.state === A2.state,
  };
}

/**
 * Build a stager bound to one scratch root and one THREE build.
 *
 * @param {object}  o
 * @param {string}  o.scratchRoot  absolute directory to write copies into.
 *                                 REQUIRED — see D87 above.
 * @param {string}  o.threePath    absolute path of the vendored three module,
 *                                 the target of the bare `three` specifier.
 *                                 REQUIRED — see D87 above.
 * @param {string} [o.label]       used only in fault messages.
 * @param {boolean} [o.guard]      set false to disable the specifier guard.
 *                                 Provided so a suite can prove the guard
 *                                 fires by running the same input both ways;
 *                                 not for silencing a real finding.
 */
export function createStager({ scratchRoot, threePath, label = 'stage-tree', guard = true } = {}) {
  if (typeof scratchRoot !== 'string' || !scratchRoot) {
    fault(`${label}: scratchRoot is required and must be an absolute path `
      + '(this module deliberately derives no path from its own location — D87)');
  }
  if (typeof threePath !== 'string' || !threePath) {
    fault(`${label}: threePath is required and must be an absolute path `
      + '(this module deliberately derives no path from its own location — D87)');
  }

  let seq = 0;

  /**
   * Copy `entryAbsPath` and its relative dependency graph into a fresh
   * directory under scratchRoot, and return a file:// URL for the copy.
   *
   * @param {string}   entryAbsPath  absolute path of the entry module.
   * @param {object}  [o]
   * @param {string}  [o.salt]      names the directory; a fresh salt forces a
   *                                brand-new Node module registration.
   * @param {object}  [o.override]  specifier -> replacement URL. An
   *                                overridden specifier is NOT walked.
   * @param {string}  [o.asIf]      resolve the ENTRY's relative specifiers as
   *                                if it sat in this directory.
   * @param {object}  [o.asIfMap]   per-file form of asIf: absPath -> dir.
   *                                Takes precedence over asIf.
   * @param {Function}[o.patch]     (absPath, src) => src, applied before the
   *                                specifiers are read, so a patch may add or
   *                                remove imports and they will be followed.
   */
  function stageTree(entryAbsPath, { salt = 'shared', override = {}, asIf = null, asIfMap = null, patch = null } = {}) {
    const dir = join(scratchRoot, `${salt}-${seq++}`);
    mkdirSync(dir, { recursive: true });
    const written = new Map();
    const tagFor = (abs) => join(dir,
      `${abs.split(sep).pop().replace(/\.js$/, '')}-${createHash('md5').update(abs).digest('hex').slice(0, 8)}.mjs`);

    /** Read a module, or refuse WITH THIS MODULE'S OWN TYPE. QA-08: an
     *  unreadable dependency used to escape as a bare `ENOENT` from
     *  readFileSync, indistinguishable to a --prove-failure harness from the
     *  subject throwing (D70), and naming neither the importer nor the
     *  specifier that reached for it. */
    const importedBy = new Map();
    const readModule = (abs) => {
      try {
        return readFileSync(abs, 'utf8');
      } catch (e) {
        fault(`${label}: cannot read ${abs}`
          + (importedBy.has(abs) ? `, reached from ${importedBy.get(abs)}` : ' (the staging entry)')
          + ` — ${e.code || e.name}: ${e.message}`);
        return ''; /* unreachable: fault() throws */
      }
    };

    function walk(abs) {
      if (written.has(abs)) return written.get(abs);
      const out = tagFor(abs);
      written.set(abs, out); // reserved BEFORE recursing: cycle-safe
      const fromDir = (asIfMap && asIfMap[abs]) ? asIfMap[abs]
        : ((abs === entryAbsPath && asIf) ? asIf : dirname(abs));
      const read = readModule(abs);
      const raw = patch ? patch(abs, read) : read;

      if (guard) {
        const blind = findBlindSpecifier(raw);
        if (blind) {
          fault(`${label}: ${abs}:${blind.line} uses a specifier shape this stager cannot rewrite `
            + `— ${blind.shape}: \`${blind.text}\`. Left as-is it would resolve against the scratch `
            + 'directory and silently load the REAL module instead of the staged copy.');
        }
      }

      /* One reading of the specifiers, from COMMENT-STRIPPED source, used for
         BOTH the dependency walk and the rewrite — so the two halves of this
         module can no longer disagree about what a specifier is (QA-08). */
      const sites = specifierSites(raw);
      for (const s of sites) {
        if (!s.spec.startsWith('.') || override[s.spec]) continue;
        const dep = resolve(fromDir, s.spec);
        if (!importedBy.has(dep)) importedBy.set(dep, `${abs} (\`from '${s.spec}'\`)`);
        walk(dep);
      }
      let text = '';
      let cursor = 0;
      for (const s of sites) {
        text += raw.slice(cursor, s.start);
        if (override[s.spec]) text += `from '${override[s.spec]}'`;
        else if (s.spec === 'three') text += `from 'file://${threePath}'`;
        else if (s.spec.startsWith('.')) text += `from 'file://${written.get(resolve(fromDir, s.spec))}'`;
        else text += raw.slice(s.start, s.end);
        cursor = s.end;
      }
      text += raw.slice(cursor);
      writeFileSync(out, text);
      return out;
    }

    const url = 'file://' + walk(entryAbsPath);
    stageTree.registrations.push({ entry: entryAbsPath, salt, dir, url });
    return url;
  }

  /** Every staging this stager has issued, in order — the raw material for
   *  `auditRegistrations`. A caller that MEMOISES above this line will show
   *  fewer rows than it has subjects, which is the D95 symptom made visible
   *  at the only place it is visible from inside this module. */
  stageTree.registrations = [];

  /**
   * Delete this stager's scratch root.
   *
   * OPT-IN, and it stays opt-in: seven suites already share this module and
   * none of them clean up today, so making cleanup automatic here would
   * change seven behaviours in a change that is meant to add one. Measured
   * on the machine this order ran on: os.tmpdir() held 8,900 staged trees
   * and 6.0 GB, from prefixes that name every suite in the gate, and the
   * disk had already hit zero once that day. A suite that calls this in a
   * `finally` gives back its own share; a suite that does not is exactly as
   * it was.
   */
  stageTree.cleanup = () => {
    try { rmSync(scratchRoot, { recursive: true, force: true }); } catch { /* best effort */ }
  };

  return stageTree;
}
