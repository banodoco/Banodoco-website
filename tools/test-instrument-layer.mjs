/* ==================================================================== *
 * tools/test-instrument-layer.mjs — QA-08.
 *
 * D58 APPLIED TO THE INSTRUMENT LAYER (D88).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * D84 collapsed six comment strippers, four mutant registries, thirteen abort
 * sentinels and seven tree stagers into five shared modules. D88 priced what
 * that cost: **lost disagreement.** Four re-derivations of `inputCanon` used
 * to sample each other's weaknesses — two were byte-blind, one left object
 * keys unsorted, one had no typed-array handling at all, and *those
 * divergences were the findings*. One authoritative implementation cannot
 * disagree with itself, so the redundancy has to be replaced by adversarial
 * self-testing:
 *
 *   > Every shared instrument module carries a mutant sweep of itself, and
 *   > every capability it exports has a positive control read by a gated
 *   > suite.
 *
 * BEFORE THIS FILE: `tools/strip-comments.mjs` had a dedicated suite
 * (`tools/test-comment-stripper.mjs`); `tools/self-controls.mjs` had its two
 * fixture tables, read by its consumers. `tools/instrument-ledger.mjs`,
 * `tools/mutant-registry.mjs` and `tools/stage-tree.mjs` had NOTHING — no
 * suite pinned `armSentinel`'s phases, `mutateText`'s anchor-miss guard, the
 * registry's named gates (the `gates` object was returned and read by nobody),
 * or the stager's specifier guard. THREE OF FIVE. This file is their control,
 * and it is also the first reader the `gates` object has ever had.
 *
 * HOW — MUTANTS OF THE SHIPPED SUBJECT, NOT POISONS OF A DOUBLE (D58)
 * ------------------------------------------------------------------
 * Every mutant perturbs the SHIPPED MODULE SOURCE, which is staged through
 * tools/stage-tree.mjs and imported as a second, independent copy. The suite
 * then runs a CAPABILITY PROBE over that copy — an object whose keys are the
 * module's exported behaviours — and compares it to a literal.
 *
 * That shape lets the registry drive its own gates over itself, which is the
 * point:
 *
 *   gate 1  the baseline probe reproduces the pinned expectation;
 *   gate 2  the perturbed SOURCE differs from the shipped source;
 *   gate 3  the probe's output moved;
 *   gate 4  the OBSERVED moved probe keys equal the DECLARED ones — which is
 *           D58's "each mutant naming which instrument should kill it",
 *           CHECKED rather than written down.
 *
 * WHERE SELF-TESTING STOPS, NAMED RATHER THAN PRETENDED AWAY
 * ----------------------------------------------------------
 * A harness cannot always be its own subject, and saying where it stops is
 * more useful than implying it doesn't.
 *
 *  1. THE COPY IS THE SUBJECT, NOT THE HARNESS'S OWN INSTANCE. This suite
 *     reports through `createLedger()` and mutates a STAGED `createLedger`.
 *     If the imported copy of the ledger were broken, this file would report
 *     nothing trustworthy about anything — and no control here could see it.
 *     Two copies at once is what makes the module its own subject at all;
 *     without the stager there would be no way to hold them apart.
 *  2. `armSentinel`'s EXIT-CODE EFFECT is unobservable in-process: it fires
 *     from a `process.on('exit')` hook and its whole purpose is the code the
 *     parent shell reads. It is checked by SPAWNING A CHILD and reading the
 *     child's exit status (`SENT-*`), which is the only honest reading — and
 *     the same argument QA-07 made about `grep '^FAIL'`.
 *  3. THE PARSER IS AN ORACLE. `scanTautologyAst` rests on espree. This suite
 *     falsifies the scan's own logic; it does not falsify espree, and a
 *     parser bug would be invisible here.
 *  4. `console.log` AND `process.exitCode` ARE NOT OURS. Every verdict in
 *     this tree is delivered through them. Nothing in this file, or in any
 *     file, can falsify the channel it reports through. That is the floor.
 *  5. STAGING IS ITSELF A SUBJECT. The stage-tree mutants are staged BY the
 *     shipped stager, so a stager defect could in principle mask a stager
 *     mutant. The mitigation is not another layer: it is that the stager's
 *     own probes read the WRITTEN FILE TEXT rather than trusting an import,
 *     so a mis-staged module shows up as wrong bytes on disk.
 *
 * Run:
 *   node tools/test-instrument-layer.mjs                 — the ledger
 *   node tools/test-instrument-layer.mjs --prove-failure — and the mutants
 * ==================================================================== */

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import {
  HarnessFault, fault, mutateText, createLedger, armSentinel, canon,
} from './instrument-ledger.mjs';
import { createRegistry, M, PIN_RECEIVER } from './mutant-registry.mjs';
import { createStager } from './stage-tree.mjs';
import { literalPredicateRe, literalPredicateHits } from './self-controls.mjs';

const SELF_PATH = fileURLToPath(import.meta.url);
const TOOLS = dirname(SELF_PATH);
const REPO = resolve(TOOLS, '..');
const P = {
  three: join(REPO, 'vendor/three/three.module.js'),
  self: 'tools/test-instrument-layer.mjs',
};
const require_ = createRequire(import.meta.url);
const ESPREE_URL = pathToFileURL(require_.resolve('espree')).href;

const PROVE = process.argv.includes('--prove-failure');
const SENT = armSentinel('test-instrument-layer', ['ledger', 'sweep'], (p) => p === 'ledger' || PROVE);

const L = createLedger();
const { pin, sweep } = createRegistry({ ledger: L, fault });

/* Every staged tree lives under os.tmpdir(), OUTSIDE the repository (D56). */
const SCRATCH = mkdtempSync(join(tmpdir(), 'qa08-instrument-'));
const stageTree = createStager({ scratchRoot: SCRATCH, threePath: P.three, label: 'QA-08 instrument layer' });
/* ====================================================================== *
 * HYGIENE-01 - give the staging tree back.                               *
 *                                                                        *
 * Measured before this change: 1 root per run, 47 standing on this       *
 * machine - and by BYTES this was the second heaviest leaker in the gate *
 * at 237 MiB, because what it stages is whole module trees rather than   *
 * single files. The st- sub-roots the stage-tree probe mints live inside *
 * SCRATCH, so this one removal reclaims those too.                       *
 *                                                                        *
 * ROUTED THROUGH THE SHARED INSTRUMENT, not a local rmSync. tools/stage- *
 * tree.mjs has exposed stageTree.cleanup() since D84 and was fixed long  *
 * ago; this consumer simply never called it. Calling it is strictly      *
 * cheaper than a local finally here - no new import, no second path to   *
 * the same directory, and the removal stays owned by the module that     *
 * created the tree.                                                      *
 *                                                                        *
 * cleanup() is documented as OPT-IN and stays opt-in: this change opts   *
 * ONE caller in, it does not make the stager clean up behind everybody.  *
 *                                                                        *
 * WHY AN EXIT HOOK AND NOT try/finally: the root is created at module    *
 * top level, where there is no enclosing try to attach a finally to -    *
 * and this suite terminates through process.exit(), which does NOT run   *
 * finally blocks. Both halves are measured by the positive control in    *
 * this order's evidence directory (hygiene-01/control-exit-hook.mjs).    *
 * cleanup() is already best effort internally.                           *
 * ====================================================================== */
process.on('exit', () => { stageTree.cleanup(); });

/** Run a thunk with stdout captured. The subjects here print their own
 *  reports; this suite's ledger is the only thing that should be heard. */
function quiet(thunk) {
  const real = console.log;
  console.log = () => {};
  try { return thunk(); } finally { console.log = real; }
}

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

/* ==================================================================== *
 * THE MODULE SET, AND THE LOADER.
 *
 * A reader registered with `pin()` must be SYNCHRONOUS, and importing a
 * module is not. So every source a mutant will produce is staged and imported
 * BEFORE the sweep, keyed by its own digest, and the reader is a lookup. A
 * source that was not pre-loaded is a HARNESS FAULT, never a zero (D63).
 * ==================================================================== */
const MODULES = ['strip-comments.mjs', 'instrument-ledger.mjs', 'mutant-registry.mjs',
  'self-controls.mjs', 'stage-tree.mjs', 'dwell-oracle.mjs', 'pose-oracle.mjs',
  'tempo-oracle.mjs', 'assertion-provenance.mjs'];
const SOURCE = new Map(MODULES.map((m) => [m, readFileSync(join(TOOLS, m), 'utf8')]));
const LOADED = new Map();

async function load(name, src) {
  const k = `${name}:${sha(src)}`;
  if (LOADED.has(k)) return LOADED.get(k);
  const abs = join(TOOLS, name);
  const url = stageTree(abs, {
    salt: `${name.replace(/\W/g, '')}-${sha(src)}`,
    patch: (p2, s) => (p2 === abs ? src : s),
    override: { espree: ESPREE_URL },
  });
  const mod = await import(url);
  LOADED.set(k, mod);
  return mod;
}

const held = (name) => (inp) => {
  const k = `${name}:${sha(inp.src)}`;
  if (!LOADED.has(k)) fault(`no staged copy of ${name} for digest ${sha(inp.src)} — the sweep reached a source the pre-load did not`);
  return LOADED.get(k);
};

/* ==================================================================== *
 * FIXTURE TREES ON DISK, for the stage-tree probes.
 * ==================================================================== */
const FIX = join(SCRATCH, 'fixtures');
mkdirSync(FIX, { recursive: true });
const fixture = (rel, text) => { const p2 = join(FIX, rel); mkdirSync(dirname(p2), { recursive: true }); writeFileSync(p2, text); return p2; };
const F = {
  three: fixture('three-stub.js', 'export const T = 1;\n'),
  dep: fixture('dep.js', 'export const dep = 7;\n'),
  entry: fixture('entry.js', "import { dep } from './dep.js';\nimport { T } from 'three';\nexport const v = dep + T;\n"),
  commented: fixture('commented.js',
    "import { dep } from './dep.js';\n"
    + "// the old form was `import { gone } from './moved/gone.js'`, kept for the reader\n"
    + 'export const v = dep;\n'),
  missing: fixture('missing.js', "import { gone } from './no/such.js';\nexport const v = gone;\n"),
  sideEffect: fixture('side.js', "import './dep.js';\nexport const v = 1;\n"),
  doubleQuote: fixture('dq.js', 'import { dep } from "./dep.js";\nexport const v = dep;\n'),
  dynamic: fixture('dyn.js', "export const v = () => import('./dep.js');\n"),
  tight: fixture('tight.js', "import { dep } from'./dep.js';\nexport const v = dep;\n"),
  nested: fixture('nested/leaf.js', 'export const leaf = 3;\n'),
  asIfEntry: fixture('asif/entry.js', "import { leaf } from './leaf.js';\nexport const v = leaf;\n"),
};
/* asif/leaf.js EXISTS so that removing asIf resolves to a DIFFERENT file
   rather than to none: a mutant that makes the stager unreadable lands in the
   registry's `threw` arm and proves nothing about asIf. The probe therefore
   pins WHICH leaf was staged, by the stager's own md5 tag. */
fixture('asif/leaf.js', 'export const leaf = 99;\n');
const NESTED_LEAF_TAG = `leaf-${createHash('md5').update(join(FIX, 'nested', 'leaf.js')).digest('hex').slice(0, 8)}.mjs`;

/* `auditLiteralPredicates` reads a FILE, so its positive control needs two —
   one clean, one carrying a bare-literal predicate. It is the one capability
   of self-controls.mjs that cannot be probed from a string. */
const AUDIT_CLEAN = fixture('audit-clean.js', "check('a', n === 3);\ncheck('b', xs.length === 2);\n");
const AUDIT_DIRTY = fixture('audit-dirty.js', "check('a', n === 3);\ncheck('b', true);\n");

/* ==================================================================== *
 * CAPABILITY PROBES — one per module. Each returns an OBJECT whose keys
 * are named behaviours, because gate 4's moved-KEY set is then exactly
 * "which control killed this mutant" (D58).
 * ==================================================================== */

const SAMPLE = 'const a = 1; // one\n/* two\n   three */\nconst b = `x${a /* four */}y`;\nconst c = "五";\n';

const PROBES = {
  'strip-comments.mjs': (m) => ({
    line: m.stripComments('const y = 1; // gone').includes('gone'),
    block: m.stripComments('const y = 1; /* gone */ const z = 2;').includes('gone'),
    inString: m.stripComments('const s = "/* keep */"; const y = 1;').includes('const y = 1;'),
    /* D67's third shape. A quote inside a regex is NOT enough to show this
       branch working — with string contents kept, a phantom string copies
       through verbatim and the probe cannot tell. It takes a COMMENT MARKER
       inside a regex, which is what actually destroys live code. Measured:
       the quote-only row survives SC3 and reported CANNOT FAIL (D50). */
    inRegexClass: m.stripComments('const u = /[//]/; const w = 3;').includes('const w = 3;'),
    inRegexBlock: m.stripComments('const u = /[/*]/; const w = 4;').includes('const w = 4;'),
    escaped: m.stripComments("const s = 'it\\'s'; /* gone */ const y = 1;").includes('gone'),
    interp: m.stripComments('const t = `a${b // gone\n}c`;').includes('gone'),
    keepStrings: m.stripComments("const s = 'abc';").includes('abc'),
    blankStrings: m.stripComments("const s = 'abc';", { blankStrings: true }).includes('abc'),
    lenPreserved: m.stripInvariants(SAMPLE).length,
    linesPreserved: m.stripInvariants(SAMPLE).lines,
    refusesNonString: (() => { try { m.stripComments(7); return false; } catch { return true; } })(),
  }),

  'instrument-ledger.mjs': (m) => {
    const geo = (bytes) => ({ isBufferGeometry: true, attributes: { position: { array: Float32Array.from(bytes) } }, index: null });
    const mesh = (bytes, kids = []) => ({
      isObject3D: true, type: 'Mesh', uuid: 'U', renderOrder: 0, frustumCulled: true,
      children: kids, geometry: geo(bytes),
    });
    const cyc = { name: 'c' }; cyc.self = cyc;
    const shared = { v: 1 };
    const threw = (f) => { try { f(); return false; } catch (e) { return e instanceof Error; } };
    /* The anchor-miss and inert-edit guards OVERLAP: a `from` that is absent
       also leaves the source unchanged, so removing the anchor guard still
       throws — from the OTHER guard. A boolean cannot tell them apart and
       reported CANNOT FAIL, which is D50 exactly. The message can. */
    const kind = (f) => {
      try { f(); return 'no refusal'; } catch (e) {
        if (/anchor miss/.test(e.message)) return 'anchor miss';
        if (/inert mutant/.test(e.message)) return 'inert';
        return `other: ${e.message.slice(0, 30)}`;
      }
    };
    const ledgerRun = quiet(() => {
      const l = m.createLedger();
      l.same('a', 'w', 1, 1);
      l.same('b', 'w', 1, 2);
      return { pass: l.pass, fails: l.failures.length, code: l.report() };
    });
    return {
      canonScalar: m.canon(3),
      canonObject: m.canon({ b: 1, a: 2 }),
      typedBytes: m.inputCanon(new Float32Array([1, 2])) !== m.inputCanon(new Float32Array([1, 9])),
      meshGeo: m.inputCanon(mesh([1, 2, 3])) !== m.inputCanon(mesh([1, 2, 9])),
      meshKid: m.inputCanon(mesh([1], [mesh([2])])) !== m.inputCanon(mesh([1], [mesh([9])])),
      sortedKeys: m.inputCanon({ a: 1, b: 2 }) === m.inputCanon({ b: 2, a: 1 }),
      cycleNamed: m.inputCanon(cyc).includes('<cycle>'),
      sharedNotACycle: !m.inputCanon({ x: shared, y: shared }).includes('<cycle>'),
      fnBySource: m.inputCanon(() => 1) !== m.inputCanon(() => 2),
      anchorMiss: kind(() => m.mutateText('abc', 't', 'zzz', 'q')),
      inertEdit: kind(() => m.mutateText('abc', 't', 'a', 'a')),
      sliceWholeFile: threw(() => m.sliceBetween('abc', 't', 'a', 'c')),
      sliceMiss: threw(() => m.sliceBetween('abc', 't', 'z', 'c')),
      unknownPhase: threw(() => m.armSentinel('x', ['a'], () => false).reach('nope')),
      ledgerPass: ledgerRun.pass,
      ledgerFails: ledgerRun.fails,
      ledgerCode: ledgerRun.code,
    };
  },

  'mutant-registry.mjs': (m) => {
    const nowhere = { same: () => true };
    /* Each gate gets its OWN registry, so a pin id is never reused and the
       arm that fires is unambiguous. `armFor` reduces the gates object to the
       single arm this input landed in — the positive control the module has
       never had. */
    const armFor = (pinArgs, mutant) => quiet(() => {
      const r = m.createRegistry({ ledger: nowhere, fault });
      r.pin(...pinArgs);
      const out = r.sweep([mutant]);
      const hot = Object.keys(out.gates).filter((k) => out.gates[k].length);
      return hot.length ? hot.join('+') : `clean(bad=${out.bad})`;
    });
    const reader = (i) => [...i.xs];
    const threw = (f) => { try { f(); return false; } catch { return true; } };
    const uncovered = quiet(() => {
      const r = m.createRegistry({ ledger: nowhere, fault });
      r.pin('covered', 'w', reader, { xs: [1] }, [1]);
      r.pin('bare', 'w', reader, { xs: [2] }, [2]);
      return r.sweep([m.M('covered', 'x', [0], () => ({ xs: [9] }))]).uncovered.join(',');
    });
    return {
      arms: quiet(() => Object.keys(m.createRegistry({ ledger: nowhere, fault }).sweep([])).join(',')),
      gateNames: quiet(() => Object.keys(m.createRegistry({ ledger: nowhere, fault }).sweep([]).gates).join(',')),
      g1baseline: armFor(['g1', 'w', reader, { xs: [1] }, [99]], m.M('g1', 'x', [0], () => ({ xs: [2] }))),
      g2inputNoOp: armFor(['g2', 'w', reader, { xs: [1] }, [1]], m.M('g2', 'x', [0], () => ({ xs: [1] }))),
      g3outputStill: armFor(['g3', 'w', (i) => i.xs.length, { xs: [1, 2] }, 2], m.M('g3', 'x', null, () => ({ xs: [9, 8] }))),
      g4axis: armFor(['g4', 'w', reader, { xs: [1, 2] }, [1, 2]], m.M('g4', 'x', [1], () => ({ xs: [9, 2] }))),
      g5unregistered: armFor(['g5', 'w', reader, { xs: [1] }, [1]], m.M('nope', 'x', [0], (i) => i)),
      g6threw: armFor(['g6', 'w', (i) => i.xs.map((x) => x.k.k), { xs: [{ k: { k: 1 } }] }, [1]],
        m.M('g6', 'x', [0], () => ({ xs: [{}] }))),
      clean: armFor(['ok', 'w', reader, { xs: [1, 2] }, [1, 2]], m.M('ok', 'x', [0], () => ({ xs: [9, 2] }))),
      uncovered,
      duplicatePin: threw(() => quiet(() => {
        const r = m.createRegistry({ ledger: nowhere, fault });
        r.pin('d', 'w', reader, { xs: [1] }, [1]);
        r.pin('d', 'w', reader, { xs: [1] }, [1]);
      })),
      movedArray: canon(m.movedPositions([1, 2, 3], [1, 9, 3])),
      movedObject: canon(m.movedPositions({ a: 1, b: 2 }, { a: 1, b: 9 })),
      movedShape: canon(m.movedPositions([1, 2], [1, 2, 3])),
      pinReceiver: canon(m.PIN_RECEIVER),
    };
  },

  'self-controls.mjs': (m) => {
    const RE = m.literalPredicateRe(['L.same'], 2);
    const TR = new Map([['L.same', 2]]);
    const PR = new Map([['pin', PIN_RECEIVER]]);
    const threw = (f, needle) => { try { f(); return 'no refusal'; } catch (e) { return e.message.includes(needle) ? 'refused' : `refused, wrong reason: ${e.message.slice(0, 40)}`; } };
    const hits = (src, recv) => m.scanTautologyAst(src, recv).hits.length;
    return {
      litReHit: RE.test("  L.same('a', 'b', true);"),
      litReClean: RE.test("  L.same('a', 'b', n === 3);"),
      litHits: m.literalPredicateHits("L.same('a','b', true);\nL.same('c','d', n === 3);\n", RE).hits.length,
      litProbe: m.literalPredicateProbe(RE, "L.same('a','b', false);"),
      scanRows: m.SCAN_FIXTURES.length,
      scanBad: m.SCAN_FIXTURES.filter(([, , s, w]) => m.scanLiteralPredicateText(s).hits.length !== w).length,
      tauRows: m.TAUTOLOGY_FIXTURES.length,
      tauBad: m.TAUTOLOGY_FIXTURES.filter(([, , s, w]) => hits(s, TR) !== w).length,
      tauWrapped: hits("L.same('x','w', f(live, RAND), f(\n  live,\n  RAND,\n));", TR),
      tauTrailingComma: hits("L.same('x','w', f(live, RAND), f(live, RAND,));", TR),
      tauEngine1: hits("const expected = gapOf(B);\nL.same('x','w', gapOf(B), expected);", TR),
      tauOneDeep: hits("const read = () => (c ? s.join('') : s.join(''));\nL.same('x','w', read(), 'gg');", TR),
      tauDeterminism: hits("const a = f(0);\nconst b = f(0);\nL.same('x','w', a, b);", TR),
      tauPinShape: hits("pin('X', 'w', rowsOf, TABLE, rowsOf(TABLE));", PR),
      tauPinClean: hits("pin('X', 'w', rowsOf, TABLE, 8);", PR),
      tauPinRefusal: threw(() => m.scanTautologyAst("pin('X','w',r,i,e);", new Map([['pin', 2]])), 'REFUSES'),
      tauParseRefusal: threw(() => m.scanTautologyAst('const = ;', TR), 'does not parse'),
      tauSites: m.scanTautologyAst("L.same('a','b',1,2);\nL.same('c','d',3,4);", TR).sites,
      masked: (() => { const t = m.maskedToken('check'); return `${t.head}|${t.tail}|${t.whole}`; })(),
      maskedShort: (() => { try { m.maskedToken('c'); return false; } catch { return true; } })(),
      foreignSet: canon(m.foreignSiteSet('f.js', 'const a = 1;\nconst b = 2;\n', /const/, { blankStrings: false })),
      selfSet: canon(m.selfSiteSet('f.js', 'const check = 1;\nconst check = 2;\n', /const/, 'check', { blankStrings: false })),
      codeBlanks: m.code("const s = 'abc';").includes('abc'),
      auditClean: quiet(() => m.auditLiteralPredicates('fixture', 2, AUDIT_CLEAN)).length,
      auditDirty: quiet(() => m.auditLiteralPredicates('fixture', 2, AUDIT_DIRTY)).length,
      auditWrongCensus: quiet(() => m.auditLiteralPredicates('fixture', 99, AUDIT_CLEAN)).length,
    };
  },

  'stage-tree.mjs': (m) => {
    const root = mkdtempSync(join(SCRATCH, 'st-'));
    const mk = (opts) => m.createStager({ scratchRoot: root, threePath: F.three, label: 'probe', ...opts });
    const text = (url) => readFileSync(url.replace('file://', ''), 'utf8');
    const guardOn = mk({});
    const guardOff = mk({ guard: false });
    /* `instanceof` is deliberately NOT used here, and the reason is a real
       property of the subject: the staged copy imports a STAGED
       instrument-ledger.mjs, so its HarnessFault is a different class object
       from this file's. Module identity is per-registration, which is the
       whole reason the stager can hold two copies apart — and it means a
       typed refusal can only be read by NAME across that boundary. The
       distinction the tag exists to make (a guard firing versus the subject
       throwing) survives; the class identity does not. */
    const refuses = (f, needle) => {
      try { f(); return 'no refusal'; } catch (e) {
        if (e.constructor.name !== 'HarnessFault') return `untagged ${e.constructor.name}`;
        return e.message.includes(needle) ? 'HarnessFault' : `HarnessFault, wrong reason: ${e.message.slice(0, 40)}`;
      }
    };
    /* D95's own stager and its two stagings, held apart from the guard
       probes above — see d95RegistrationsRecorded. */
    const d95Stager = mk({});
    const d95Witness = m.writeRegistrationWitness(join(root, 'witness'));
    d95Stager(d95Witness, { salt: 'd95-a' });
    d95Stager(d95Witness, { salt: 'd95-b' });
    const audits = (rows) => {
      try { return canon(m.auditRegistrations('probe', rows)); } catch (e) { return `refused: ${e.message.slice(0, 40)}`; }
    };
    const entryUrl = guardOn(F.entry, { salt: 'a' });
    const entryText = text(entryUrl);
    const overrideUrl = guardOn(F.entry, { salt: 'b', override: { './dep.js': 'file:///OVERRIDDEN.js' } });
    const patchUrl = guardOn(F.entry, { salt: 'c', patch: (p2, s) => s.replace('dep + T', 'dep + T + 1') });
    const asIfUrl = guardOn(F.asIfEntry, { salt: 'd', asIf: join(FIX, 'nested') });
    const asIfMapUrl = guardOn(F.asIfEntry, { salt: 'e', asIfMap: { [F.asIfEntry]: join(FIX, 'nested') } });
    return {
      blindShapeCount: m.BLIND_SPECIFIER_SHAPES.length,
      specifierReSource: m.SPECIFIER_RE().source,
      rewritesRelative: /from 'file:\/\/.*dep-[0-9a-f]{8}\.mjs'/.test(entryText),
      remapsThree: entryText.includes(`from 'file://${F.three}'`),
      honoursOverride: text(overrideUrl).includes("from 'file:///OVERRIDDEN.js'"),
      honoursPatch: text(patchUrl).includes('dep + T + 1'),
      honoursAsIf: text(asIfUrl).includes(NESTED_LEAF_TAG),
      honoursAsIfMap: text(asIfMapUrl).includes(NESTED_LEAF_TAG),
      freshRegistration: entryUrl !== overrideUrl,
      guardSideEffect: refuses(() => guardOn(F.sideEffect, { salt: 'f' }), 'side-effect import'),
      guardDoubleQuote: refuses(() => guardOn(F.doubleQuote, { salt: 'g' }), 'double-quoted specifier'),
      guardDynamic: refuses(() => guardOn(F.dynamic, { salt: 'h' }), 'dynamic import()'),
      guardTight: refuses(() => guardOn(F.tight, { salt: 'i' }), 'no space before the quote'),
      /* D46 / H4 — the guard's zero has a reader at last: the SAME input that
         the guard refuses must stage cleanly with `guard: false`. A guard that
         fires on nothing and a guard that cannot fire are indistinguishable
         without this row, and the option was added for it and never used. */
      guardOffStages: text(guardOff(F.sideEffect, { salt: 'j' })).includes("import './dep.js';"),
      guardOffIsNotSilence: refuses(() => guardOn(F.sideEffect, { salt: 'k' }), 'side-effect import'),
      /* The comment is COPIED, so its presence proves nothing. What is pinned
         is that its specifier was left UNREWRITTEN — and that the walk did
         not try to read it, which is what threw a bare ENOENT before QA-08. */
      commentSpecifierIgnored: (() => {
        try { return text(guardOn(F.commented, { salt: 'l' })).includes("from './moved/gone.js'"); } catch (e) { return `walked a commented specifier: ${e.constructor.name}`; }
      })(),
      missingDepTagged: refuses(() => guardOn(F.missing, { salt: 'n' }), 'cannot read'),
      requiresScratchRoot: refuses(() => m.createStager({ threePath: F.three }), 'scratchRoot is required'),
      requiresThreePath: refuses(() => m.createStager({ scratchRoot: root }), 'threePath is required'),
      specifierSites: canon(m.specifierSites("import a from './a.js';\n// from './b.js'\nimport c from './c.js';\n").map((s) => s.spec)),
      /* ---- D95, QA-09 --------------------------------------------- *
       * A memoised staging is structurally blind to a cross-module write:
       * the ring -> terrain measurement returned ZERO BYTES MOVED because
       * one staged module was reused and the write persisted across builds.
       * The guard is `auditRegistrations`; these are its controls. The
       * ASYNC half — a witness module imported twice and shown to keep its
       * module scope — cannot run in a synchronous probe and lives in
       * tools/test-assertion-provenance.mjs (AP9), which is the suite that
       * owns this capability. Stated rather than implied.                */
      d95AcceptsFresh: audits([{ subject: 'with-ring', url: 'u1' }, { subject: 'without-ring', url: 'u2' }]),
      d95RefusesShared: refuses(() => m.auditRegistrations('probe',
        [{ subject: 'with-ring', url: 'u1' }, { subject: 'without-ring', url: 'u1' }]), 'are SHARED between subjects'),
      /* One subject staged twice is NOT the blind case — a suite may build
         the same subject twice on purpose. Only two DIFFERENT subjects on
         one registration is. Without this row the guard could be an
         is-there-a-duplicate-URL check and read the same. */
      d95AcceptsOneSubjectTwice: audits([{ subject: 'ring', url: 'u1' }, { subject: 'ring', url: 'u1' }]),
      d95RefusesEmpty: refuses(() => m.auditRegistrations('probe', []), 'no subjects'),
      d95RefusesUrlless: refuses(() => m.auditRegistrations('probe', [{ subject: 'ring' }]), 'no staged URL'),
      d95WitnessHasModuleScope: /state\.loads \+= 1;/.test(m.REGISTRATION_WITNESS_SOURCE)
        && /export const state/.test(m.REGISTRATION_WITNESS_SOURCE),
      d95WitnessWritten: readFileSync(d95Witness, 'utf8') === m.REGISTRATION_WITNESS_SOURCE,
      /* A DEDICATED stager, not the one above: `guardOn` stages a different
         number of trees depending on which guard mutant is live, so counting
         ITS registrations would couple this row to five unrelated mutants and
         gate 4 said so on the first run. This one stages exactly two. */
      d95RegistrationsRecorded: d95Stager.registrations.length,
      d95RegistrationsAreDistinct: new Set(d95Stager.registrations.map((r) => r.url)).size
        === d95Stager.registrations.length,
      d95CleanupExists: typeof d95Stager.cleanup,
    };
  },

  /* ------------------------------------------------------------------ *
   * QA-09 — tools/assertion-provenance.mjs.
   *
   * PROBED: literal closure (the property the whole scan rests on), the
   * container-escape rule, the four classes, the receiver-spec refusals,
   * the D63 parse refusal, id collection and the two citation tiers.
   *
   * NOT PROBED HERE: the tree-wide manifests. They are per-subject data and
   * they belong to tools/test-assertion-provenance.mjs, which pins them as
   * sets. This file falsifies the SCAN; that file pins what it found.
   * ------------------------------------------------------------------ */
  'assertion-provenance.mjs': (m) => {
    const R = { 'L.same': { id: 0, what: 1, data: 2, expected: 3 }, pin: { id: 0, what: 1, data: 3, reader: 2, expected: 4 } };
    const cls = (src) => m.scanDataBlind(src, R).rows.map((r) => `${r.cls}:${r.id}`).join('|');
    const refuse = (f, needle) => {
      try { f(); return 'no refusal'; } catch (e) { return e.message.includes(needle) ? 'refused' : `wrong reason: ${e.message.slice(0, 50)}`; }
    };
    const world = {
      defined: ['HCLO100'], prefixes: ['HCLO'], dynamicPrefixes: [], namespaces: ['HB'],
    };
    const tiers = (src) => m.citationCandidates(src, world).map((r) => `${r.tier}:${r.token}`).join('|');
    return {
      /* DB1 — HCLO100's shape, reduced: an absence asserted over an input
         the assertion wrote itself. */
      db1: cls("const A = ['/*'];\npin('X', 'no assertion in this suite anchors on a comment marker',\n"
        + '  (i) => i.a.filter((t) => i.u.includes(t)), { a: A, u: [] }, []);'),
      /* DB2 — a census claim in the prose over invented data. */
      db2: cls("L.same('X', 'every candidate name is declared in clones-materials.js', 8, 8);"),
      /* DB3 — an iteration pin over the suite's own table: legitimately
         literal, and the class boundary the whole tiering rests on. */
      db3: cls("const T = [['a'], ['b']];\nL.same('X', 'the table is the size this order built', T.length, 2);"),
      /* CLEAN — the same assertion once one side reads the subject. */
      cleanSubjectRead: cls("L.same('X', 'every export site in this file', countExports(SRC), 8);"),
      /* TA19's rule, re-derived here and cross-checked by AP8. */
      containerEscapePush: cls("const b = [];\nrows.forEach((r) => b.push(r));\nL.same('X', 'no row failed', b, []);"),
      containerEscapeMember: cls("const B = {};\nB.live = build();\nL.same('X', 'the live counts', B.live, [1, 2]);"),
      containerEscapeCall: cls("const rows = [];\ncollectInto(rows);\nL.same('X', 'no row failed', rows, []);"),
      /* The fourth branch of the same rule: a write TARGET that SELECTS its
         container rather than naming it. Filled by the loop just as `b` is
         above, and until the rule was widened it read back as an untouched
         literal — the one shape of the four that had no probe. */
      containerEscapeSelecting: cls("const hit = [], missed = [];\nrows.forEach((r) => (r.ok ? hit : missed).push(r));\n"
        + "L.same('X', 'no row failed', hit, []);"),
      /* The pin's READER must also read nothing but its own argument. */
      readerReachesOutside: cls("pin('X', 'no anchor in this suite', (i) => usedIn(SRC, i.a), { a: [1] }, []);"),
      /* Literal closure itself, through the shapes that carry a value. */
      closureLiteral: m.literallyClosed({ type: 'Literal', value: 1 }, new Map()),
      closureCall: m.literallyClosed({ type: 'CallExpression', callee: { type: 'Identifier', name: 'f' }, arguments: [] }, new Map()),
      closureUnknownIdent: m.literallyClosed({ type: 'Identifier', name: 'x' }, new Map()),
      /* Receiver-spec refusals: a wrong spec is a wrong measurement (D59). */
      refusesNoSpec: refuse(() => m.scanDataBlind("L.same('X', 'w', 1, 1);", { 'L.same': null }), 'has no spec'),
      refusesNoData: refuse(() => m.scanDataBlind("L.same('X', 'w', 1, 1);", { 'L.same': { id: 0, expected: 3 } }), 'no `data` argument index'),
      refusesBadExpected: refuse(() => m.scanDataBlind("L.same('X', 'w', 1, 1);", { 'L.same': { data: 2, expected: 'x' } }), 'predicate-shaped'),
      refusesNoReceivers: refuse(() => m.scanDataBlind('const x = 1;', {}), 'receivers required'),
      refusesUnparseable: refuse(() => m.scanDataBlind('const = ;', R), 'does not parse'),
      /* `sites` is this scan's own D46 control. */
      sitesReached: m.scanDataBlind("L.same('A', 'w', f(), 1);\nL.same('B', 'w', g(), 2);", R).sites,
      sitesZeroOnRename: m.scanDataBlind("L.assert('A', 'w', f(), 1);", R).sites,
      /* Id collection, in all four shapes it must see. */
      idsFromCall: canon(m.collectAssertionIds("L.same('HCLO100', 'w', 1, 1);").ids),
      idsFromLeadingToken: canon(m.collectAssertionIds("L.check('PC-1c  and a real one', 1, 1);").ids),
      idsFromFixtureRow: canon(m.collectAssertionIds("const T = [['PC3-24', 'w', 's', 0]];").ids),
      idsDynamicPrefix: canon(m.collectAssertionIds('check(`G7.${id}`, 1);').dynamicPrefixes),
      /* The two citation tiers, and the four things that are NOT citations. */
      fc1LivePrefix: tiers('/* HCLO40 is the guard that says so. */\nconst x = 1;\n'),
      fc2CoverageClaim: tiers('/* Pinned by tools/test-ui-lifecycle.mjs (`MQ2`). */\nconst x = 1;\n'),
      citeCleanDefined: tiers('/* HCLO100 is the guard that says so. */\nconst x = 1;\n'),
      citeCleanNamespace: tiers('/* byte equality is NOT claimed. HB11 is open. */\nconst x = 1;\n'),
      citeCleanSection: tiers('/* built by this module (HCLO-5.2). */\nconst x = 1;\n'),
      citeCleanNoClaim: tiers('/* the ZZ9 case is handled elsewhere. */\nconst x = 1;\n'),
      /* D54, NOT a count. This row was `canon([DATA_BLIND_FIXTURES.length,
         CITATION_FIXTURES.length])` and it went stale within the hour of
         being written, when three fixtures were added: `[12,8]` against
         `[15,8]`. The collection is read off the subject, so D94 was
         satisfied — and D54 was not, because a bumped number cannot be
         audited and a missing NAME can. */
      fixtureIds: canon([m.DATA_BLIND_FIXTURES.map((r) => r[0]), m.CITATION_FIXTURES.map((r) => r[0])]),
    };
  },

  /* ------------------------------------------------------------------ *
   * PAGE-01 — tools/dwell-oracle.mjs.
   *
   * WHAT IS PROBED HERE AND WHAT CANNOT BE, stated rather than glossed
   * (the coordinator's instruction, and QA-08's own precedent at the head
   * of this file).
   *
   * PROBED: every decision function — the route-geometry reader, the LCG,
   * the wrap truncation, the dwell reader, the directional pass filter, the
   * two contract readers, and the D63 trust gate. All are pure and total;
   * none of them touches a browser.
   *
   * PROBED BY SOURCE, WHICH IS THE HONEST FORM: the page-driving half. The
   * bodies of `parkAt` and `drivenTrial` run INSIDE a browser page, so they
   * cannot be called here. What CAN be read is the function objects the
   * module exports — `driverDispatches`, `driverNoSetter` and `parkerSets`
   * read `String(fn)`, so a mutant that makes the driver set progress
   * instead of dispatching an event is caught by the same reader that will
   * catch it a year from now. That is a source assertion about behaviour,
   * not an observation of behaviour, and the difference is the point.
   *
   * NOT PROBED HERE, AND NOT PROBEABLE HERE: that a dispatched WheelEvent
   * actually advances `journey.scroll.surface`, and that any millisecond in
   * a recorded trace is real. Those need Chrome and a served tree; they are
   * `npm run test:dwell`'s per-origin POSITIVE CONTROL and its D63 trust
   * gate. Per D63 as PAGE-01 extends it, a browser harness has failure modes
   * — a hidden tab, an unrendered frame, a 404 — that a staged import cannot
   * simulate, so A MUTANT THAT COULD NOT BE TOLD APART FROM A LOST TAB IS
   * NOT A MUTANT and none is written here.
   * ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------ *
   * TEMPO-01 — tools/tempo-oracle.mjs.
   *
   * PROBED: every decision — the three law predicates, the window finder,
   * the clock-fidelity gate that stands where its siblings put frame
   * pacing, and the roll-up's refusals. All pure, all total, none of them
   * touches a browser. The fixtures are SYNTHETIC frame streams, not
   * recordings: a recorded stream would make this pin a value pin over a
   * measurement, which is the record-a-value disease CONTRIBUTING.md §1
   * names, and it would red every time the page's tempo legitimately
   * moved.
   *
   * PROBED BY SOURCE, WHICH IS THE HONEST FORM (the PO-P precedent): the
   * page-side halves. `runEpisode` and `positiveControl` run INSIDE a
   * page; what can be read here is `String(fn)`. So a mutant that stops
   * the driver advancing the injected clock, or swaps a real WheelEvent
   * for the `journey.wrap()` shortcut, is caught by the same reader that
   * will catch it a year from now — and those two are the whole reason
   * this instrument's numbers mean anything.
   *
   * NOT PROBED HERE AND NOT PROBEABLE HERE: that the page's spine really
   * reads the injected clock. That needs Chrome and a served origin; it is
   * `npm run test:tempo`'s own POSCTL, which fails the run rather than
   * measuring through it. A mutant that could not be told apart from a
   * lost tab is not a mutant, and none is written here.
   * ------------------------------------------------------------------ */
  'tempo-oracle.mjs': (m) => {
    const C = m.DEFAULT_CONTRACT;
    const FR = C.frameMs;
    /* One synthetic episode. `f(i)` returns the frame's channel values;
       everything it omits takes a quiet default, so each fixture below
       states only the one thing it is about. */
    const ep = (id, n, f, marks = {}) => {
      const rows = [];
      for (let i = 0; i < n; i++) {
        const v = f(i) || {};
        rows.push({
          vt: +(i * FR).toFixed(4), dt: v.dt === undefined ? 0.016667 : v.dt, seq: i,
          kind: v.kind === undefined ? (i >= 2 ? 'wrap' : '') : v.kind, e: 0, p: 0,
          cx: v.cx || 0, cy: 0, cz: 0,
          reveal: [v.rev || 0], revealVis: [v.revVis === undefined ? 1 : v.revVis],
          amount: [], amountVis: [], ground: [], groundVis: [],
          mote: [v.mote || 0], moteVis: [v.moteVis === undefined ? 0 : v.moteVis],
        });
      }
      return {
        id, rows, marks, hidden: false, chapterIds: ['inspire'],
        tags: { reveal: ['reveal:inspire'], amount: [], ground: [], mote: ['mote:0'] },
      };
    };
    const N = 60;
    /* The CONTINUITY law. `smooth` is a designed rise; `fold` is the roots flash in
       miniature — one frame, nothing to one; `hidden` holds the uniform at
       1 behind `visible = false` and then draws it, which is the walk-round
       the RENDERED rule exists to close; `close` goes dark while lit. */
    const smooth = ep('wrap-fwd', N, (i) => ({ rev: Math.max(0, Math.min(1, (i - 10) * 0.025)) }));
    const fold = ep('wrap-fwd', N, (i) => ({ rev: i < 30 ? 0 : 1 }));
    const hidden = ep('wrap-fwd', N, (i) => ({ rev: 1, revVis: i < 30 ? 0 : 1 }));
    const close = ep('wrap-fwd', N, (i) => ({ rev: 0.8, revVis: i < 30 ? 1 : 0 }));
    const t1s = m.evaluateTL1(smooth), t1f = m.evaluateTL1(fold);
    const t1h = m.evaluateTL1(hidden), t1c = m.evaluateTL1(close);
    /* The REALISED-FLOOR law. The window opens at frame 2 (the first `wrap` frame). */
    const late = ep('epilogue-early', N, (i) => (i >= 45 ? { mote: 0.5, moteVis: 1 } : {}));
    const early = ep('epilogue-early', N, (i) => (i >= 6 ? { mote: 0.5, moteVis: 1 } : {}));
    const t2l = m.evaluateTL2(late), t2e = m.evaluateTL2(early);
    /* The DEAD-TAIL law. Twenty frames of real travel, then a tail that buys nothing.
       `slow` overspends it; `tight` does not. */
    const glide = (deadFrames) => {
      let x = 0;
      return ep('glide-flick', 30 + deadFrames, (i) => {
        if (i > 9 && i <= 29) x += 1;
        else if (i > 29) x += 0.001;
        return { cx: x, kind: '' };
      }, { releaseIdx: 9, settleIdx: 29 + deadFrames });
    };
    const slow = glide(30), tight = glide(12);
    const t3s = m.evaluateTL3(slow, null), t3t = m.evaluateTL3(tight, null);
    const t3d = m.evaluateTL3(slow, 200);
    /* The clock gate, where the siblings put frame pacing. */
    const clockEp = (n, bad) => ep('wrap-fwd', n, (i) => ({ dt: (bad && i === 40) ? 0.03 : 0.016667 }));
    const cause = (e) => { const v = m.clockVerdict(e); return v.trusted ? 'TRUSTED' : v.causes[0].slice(0, 28); };
    /* The roll-up must REFUSE, not report, when a law kept nothing. */
    const rolled = m.evaluate([clockEp(120, true)], {}, C);
    /* ...and on a MEASURABLE episode carrying both an ignition step and an
       early onset, the continuity reading must reach `violations` (it fails
       the run) while the realised-floor reading reaches `reported` (it does
       not, and it must not). That split is a stated
       position, not an oversight, so it is pinned: see `evaluate`'s note. */
    const both = m.evaluate([{
      ...ep('wrap-fwd', 120, (i) => ({
        rev: i < 60 ? 0 : 1, mote: i >= 8 ? 0.5 : 0, moteVis: i >= 8 ? 1 : 0,
      })),
    }], {}, C);
    const src = { run: String(m.runEpisode), pc: String(m.positiveControl) };
    return {
      classes: Object.keys(m.CHANNEL_CLASSES).map((k) => `${k}:${m.CHANNEL_CLASSES[k].dmax}`).join(','),
      scenarios: m.SCENARIOS.map((s) => `${s.id}/${s.laws.join('+')}`).join(' '),
      contract: [C.frameMs.toFixed(4), C.dtTolFrac, C.minFrames, C.keptFrac,
        C.onsetFloorFrac, C.onsetLitAt, C.deadVFrac, C.deadTailMaxMs].join('/'),
      windowWrap: `${t1s.window.from}-${t1s.window.to}`,
      windowGlide: `${m.episodeWindow(slow).from}-${m.episodeWindow(slow).to}`,
      tl1SmoothUp: +t1s.worst[0].up.toFixed(4),
      tl1Smooth: t1s.violations.length,
      tl1Fold: t1f.violations.length,
      tl1FoldUp: +t1f.worst[0].up.toFixed(4),
      tl1FoldSays: t1f.violations[0] ? t1f.violations[0].slice(0, 44) : 'none',
      tl1Hidden: t1h.violations.length,
      tl1CloseJudged: t1c.violations.length,
      tl1CloseSeen: t1c.closes.length,
      tl2LateFrac: t2l.onsets.length ? t2l.onsets[0].frac : -1,
      tl2Late: t2l.violations.length,
      tl2EarlyFrac: t2e.onsets.length ? t2e.onsets[0].frac : -1,
      tl2Early: t2e.violations.length,
      tl3SlowMs: t3s.measured.deadMs,
      tl3SlowCeiling: `${t3s.measured.ceilingMs}/${t3s.measured.declared}`,
      tl3Slow: t3s.violations.length,
      tl3TightMs: t3t.measured.deadMs,
      tl3Tight: t3t.violations.length,
      tl3DeclaredCeiling: `${t3d.measured.ceilingMs}/${t3d.measured.declared}`,
      tl3Declared: t3d.violations.length,
      clockClean: cause(clockEp(120, false)),
      clockTorn: cause(clockEp(120, true)),
      clockThin: cause(clockEp(10, false)),
      evalRefuses: rolled.refusals.length,
      splitAsserted: both.violations.length,
      splitReported: both.reported.length,
      splitTl2ReachesExit: both.violations.some((v) => v.startsWith('TL2')),
      driverAdvancesClock: src.run.includes('window.__vt.now += FRAME'),
      driverUsesRealWheel: src.run.includes("new WheelEvent('wheel'"),
      driverAvoidsWrapShortcut: !/journey\.wrap\(|J\.wrap\(/.test(src.run),
      driverBreaksTheStream: src.run.includes('await tick(sc.gapFrames)'),
      samplerIsLast: src.run.includes("addAnimator('zz-tempo-oracle'"),
      posctlReadsSurface: src.pc.includes('J.scroll.surface') && src.pc.includes('__vt.now'),
    };
  },
  /* ------------------------------------------------------------------ *
   * PAGE-02 — tools/pose-oracle.mjs.
   *
   * PROBED: every decision function — the row splitter, the exclusion
   * masker (both the matching and the STALE case), the exact comparison, the
   * moved-cell site set, the digest's order sensitivity, the reproducibility
   * roll-up, the rail-gate source reader, and the D63 trust gate. All pure,
   * all total, none of them touches a browser.
   *
   * PROBED BY SOURCE, WHICH IS THE HONEST FORM: the page-side half. The
   * bodies of `pvRead` and `pvFreeze` run INSIDE a page. What CAN be read is
   * `String(fn)` — so a mutant that makes the pose reader consult a clock,
   * or makes the freeze pause without pinning `currentTime`, is caught by
   * the same reader that will catch it a year from now.
   *
   * NOT PROBED HERE AND NOT PROBEABLE HERE: that a frozen pose is actually
   * bit-identical across two fresh Chrome processes. That needs Chrome and
   * two served origins; it is `npm run test:pose`'s EXACT comparison and its
   * D63 trust gate. A mutant that could not be told apart from a lost tab is
   * not a mutant, and none is written here.
   *
   * The rail-gate reader is probed over a MINIATURE fixture, not the shipped
   * journey/rail.js — this suite must not red when the rail legitimately
   * changes. The pin over the real file is tools/test-pose-oracle.mjs's
   * PV-RAIL-GATES.
   * ------------------------------------------------------------------ */
  'pose-oracle.mjs': (m) => {
    const ROWS = [
      'nav.j-rail|nav|a b|0.000,1.000,2.000,3.000|1|none|visible|block|auto|auto|00000001',
      'nav.j-rail/0|div|c|4.000,5.000,6.000,7.000|0.5|matrix(1, 0, 0, 1, 8, 0)|visible|block|1|none|00000002',
      'nav.j-rail/0/0|i|d|8.000,9.000,1.000,1.000|0|none|hidden|block|2|none|00000003',
    ];
    const refuses = (f, needle) => {
      try { f(); return 'no refusal'; } catch (e) { return e.message.includes(needle) ? 'refused' : `other: ${e.message.slice(0, 30)}`; }
    };
    const RAIL = '  followReadyAt = reduceMotion.matches ? Date.now() : Date.now() + 720;\n'
      + "      clearTimeout(turnTimer);\n      turnTimer = owner.timer(() => {\n"
      + "        syncAt();\n      }, 500);\n";
    const live = m.maskExclusions(ROWS, [{ path: 'nav.j-rail/0', field: 'transform', why: 'x' }]);
    const stale = m.maskExclusions(ROWS, [{ path: 'nav.j-nope', field: 'rect', why: 'x' }]);
    const one = ROWS.map((r, n) => (n === 1 ? r.replace('|visible|', '|hidden|') : r));
    const clean = { httpOk: true, booted: true, positivePointer: true, positiveKey: true, poseCount: 3, staleExclusions: [] };
    const cause = (over) => { const v = m.trustVerdict({ ...clean, ...over }); return v.trusted ? 'TRUSTED' : v.causes[0].slice(0, 24); };
    return {
      exclusionsEmpty: m.EXCLUSIONS.length,
      unfrozenSet: m.EXCLUSIONS_UNFROZEN.length,
      fields: m.POSE_FIELDS.join(','),
      regionRoots: m.POSE_REGION.length,
      consts: [m.FREEZE_PHASE_MS, m.FREEZE_SETTLE_TICKS, m.FREEZE_PASSES, m.TEAR_RETRIES,
        m.RAIL_GATE_SETTLE_MS, m.MIN_POSE_ROWS].join('/'),
      split: canon(m.splitRow(ROWS[1])),
      splitRefuses: refuses(() => m.splitRow('a|b'), 'expected 11'),
      maskCell: live.rows[1],
      maskNames: canon(live.masked),
      maskKeepsRows: live.rows.length,
      maskStale: canon(stale.unmatched),
      maskOrdinateRefuses: refuses(() => m.maskExclusions(ROWS, [{ path: 'nav.j-rail', field: 'path' }]), 'ordinate'),
      maskFieldRefuses: refuses(() => m.maskExclusions(ROWS, [{ path: 'nav.j-rail', field: 'nope' }]), 'not a pose field'),
      cmpSame: m.comparePose(ROWS, ROWS.slice()).identical,
      cmpOne: m.comparePose(ROWS, one).movedRows,
      cmpLength: m.comparePose(ROWS, ROWS.slice(0, 2)).identical,
      cells: canon(m.movedCells(ROWS, one)),
      cellsMissing: canon(m.movedCells(ROWS, ROWS.slice(0, 2))),
      digestStable: m.vectorDigest(ROWS) === m.vectorDigest(ROWS.slice()),
      digestOrder: m.vectorDigest(ROWS) === m.vectorDigest([ROWS[1], ROWS[0], ROWS[2]]),
      repro: canon(m.reproducibility([{ label: 'a', rows: ROWS }, { label: 'b', rows: one }]).pairs[0].cells),
      railGates: canon(m.railGateLiterals(RAIL)),
      railRefuses: refuses(() => m.railGateLiterals('nothing'), 'followReadyAt'),
      trustClean: cause({}),
      trustTorn: cause({ tornReads: 1 }),
      trustFreeze: cause({ freezeFailures: 1 }),
      trustStale: cause({ staleExclusions: ['a :: rect'] }),
      trustSameTree: cause({ originsIdentical: true }),
      readerNoClock: (String(m.pvRead).match(/\b(?:Date\.now|performance\.now|Math\.random)\s*\(/g) || []).length,
      readerReads: String(m.pvRead).includes('getComputedStyle') && String(m.pvRead).includes('getBoundingClientRect'),
      freezerPins: String(m.pvFreeze).includes('currentTime = arg.phaseMs'),
      freezerLoops: String(m.pvFreeze).includes('arg.passes'),
      cliOriginB: m.parseArgs(['--origin-b=x']).originB,
    };
  },

  'dwell-oracle.mjs': (m) => {
    /* A miniature manifest, not the shipped one: this suite must not red
       when journey/structure.js legitimately changes. The rest-position pin
       over the REAL manifest is tools/test-dwell-oracle.mjs's DW-ROAD. */
    const CH = [
      { id: 'a', span: 10, scrollVh: 4, stops: [0.0] },
      { id: 'b', span: 30, scrollVh: 10, segVh: [2, 8] },
      { id: 'c', span: 60, scrollVh: 6, segVh: [5, 1] },
    ];
    const refuses = (f, needle) => {
      try { f(); return 'no refusal'; } catch (e) { return e.message.includes(needle) ? 'refused' : `other: ${e.message.slice(0, 30)}`; }
    };
    /* Four anchors, not three: the LAST is the terminal one and is excluded
       from judging by design, so a three-anchor set could never produce the
       two-rests-in-one-window case DW-C1 exists for. Caught by writing the
       probe and reading a 0 where a 1 was intended (D50 — a control that
       cannot reach its own case is a claim, not a check). */
    const A3 = [{ id: 'a', p: 0 }, { id: 'b', p: 0.4 }, { id: 'c', p: 0.8 }, { id: 'd', p: 0.95 }];
    /* One synthetic trial: parked at `a`, one gesture that scrubs past `b`
       during its INPUT phase, a second gesture from mid-flight. */
    const marks = [
      { t: 0, p: 0, kind: 'gesture-start' },
      { t: 100, p: 0.5, kind: 'gesture-end' },
      { t: 600, p: 0.6, kind: 'gesture-start' },
      { t: 700, p: 0.62, kind: 'gesture-end' },
      { t: 1200, p: 0.9, kind: 'settle-end' },
    ];
    const dwell = { a: 9999, b: 0, c: 0, d: 0 };
    const judged = ['b', 'c'];
    const swept = (fn) => canon(fn({ marks, anchors: A3, dwell, judged, floorMs: 250, tol: 0.004 }));
    const trial = (over) => ({
      cfg: { t: 1, pause: 500 }, fromP: 0,
      anchors: A3,
      samples: [[0, 0], [50, 0.5], [100, 0.6], [150, 0.9], [200, 0.9]],
      marks,
      ...over,
    });
    const clean = {
      httpOk: true, httpStatus: 200, booted: true, positiveControl: true,
      hiddenTrials: 0, thinTrials: 0, stillTrials: 0, framesRendered: 900, consoleErrors: 0,
      trialCount: 3, minSamples: 40,
    };

    /* --- DWELL-G1 fixtures, over the SAME miniature anchors A3 ---------
     *
     * `a` at p 0 and `b` at 0.4 are rests; 0.55 is not. Every fixture below
     * is built so that exactly one mechanism name, or one refusal branch, is
     * reachable through it — D50: a control that cannot reach its own case
     * is a claim, not a check. */
    const D0 = { a: 0, b: 0, c: 0, d: 0 };
    const JUDGED = ['b', 'c'];
    const mech = (x) => `${x.anchor}/${x.startState}/${x.phase}/${x.mechanism}/${x.machineOwned ? 'MACHINE' : 'earned'}`;
    const cross = (mk, dw) => m.classifyCrossings({ marks: mk, anchors: A3, dwell: dw, judged: JUDGED });
    /* Parked at `a`; the visitor's own input carries the ride past `b`, then
       hands off across `c`. LANDED start: scrub, then quiet-carry. */
    const MARKS_SCRUB = [
      { t: 0, p: 0, kind: 'gesture-start' },
      { t: 200, p: 0.5, kind: 'gesture-end' },
      { t: 900, p: 0.9, kind: 'settle-end' },
    ];
    /* The class's own shape: gesture two begins at p 0.5, which is no rest,
       so every metre it spends was banked by the flight it interrupted. */
    const MARKS_INFLIGHT = [
      { t: 0, p: 0, kind: 'gesture-start' },
      { t: 100, p: 0.3, kind: 'gesture-end' },
      { t: 600, p: 0.5, kind: 'gesture-start' },
      { t: 800, p: 0.9, kind: 'gesture-end' },
    ];
    /* One anchor reached and held for `ms`: 400 clears the floor, 120 does
       not, and 0 means the ride passed THROUGH between two frames and never
       landed — the row that keeps DW-C4 off DW-C3's event. */
    const land = (ms) => m.landings({
      samples: [[0, 0], [100, 0.4], [200, 0.4], [300, 0.9]],
      anchors: A3, judged: JUDGED, dwell: { ...D0, b: ms },
    });
    /* The dual, over A3's four anchors from index 0 (`a`) travelling
       forward, re-anchored by 2026-08-26-a7-ruling.md Ruling 1: `b` is ONE
       leg on, which is the contract and yields nothing (flick A was born at a
       rest and bought it; flick B was born in flight and was spent at A's
       landing); `c` is two, which is the SKIP — the owner's four reports;
       `a` is zero, which is the REFUSAL — the from-rest flick bought nothing;
       and 0.55 is no anchor at all. */
    const dual = (ends) => {
      const runs = ends.map((endP) => ({
        from: 'a', to: 'b', delayMs: 650, startIdx: 0, dir: 1, endP, anchors: A3, midFlight: { resolving: true },
      }));
      const r = m.evaluateDual(runs);
      return [r.legs, r.violations.map((v) => v.slice(0, 12))];
    };
    /* A fixture transit table, not route.js's: `a->b` declares 1.3 s, `b->c`
       declares nothing and must fall back to the band AND SAY SO. */
    const TRANSIT = (lo) => (lo === 0 ? 1.3 : (Math.abs(lo - 0.4) < 1e-9 ? 0 : 1.8));

    return {
      /* --- route geometry: the 24%-vs-94% asymmetry's only measurer --- */
      restTable: canon(m.restRoadTable(CH).map((r) => `${r.id}:${r.restAt}:${r.afterVh}`)),
      restRefuses: refuses(() => m.restRoadTable([{ id: 'x', span: 1, scrollVh: 5, stops: [0.5] }]), 'not derivable'),
      restRefusesNoVh: refuses(() => m.restRoadTable([{ id: 'x', span: 1, scrollVh: 0 }]), 'no positive scrollVh'),
      anchorPs: canon(m.restAnchors(CH).map((a) => Number(a.p.toFixed(6)))),

      /* --- the gesture generator --- */
      seed7: canon(m.gestureConfigs(7, 2)),
      seedRefuses: refuses(() => m.gestureConfigs(0, 2), 'positive integer'),

      /* --- the trace readers --- */
      wrapTruncates: canon(m.truncateAtWrap([[0, 0.9], [1, 0.95], [2, 0.02]])),
      wrapKeeps: m.truncateAtWrap([[0, 0.1], [1, 0.5]]).wrapped,
      wrapMarks: m.truncateMarksAtWrap([{ t: 0, p: 0.9 }, { t: 1, p: 0.02 }]).length,
      dwellContiguous: canon(m.dwellTable({
        samples: [[0, 0.725], [100, 0.725], [200, 0.6], [300, 0.725], [400, 0.725], [500, 0.725]],
        anchors: [{ id: 'owned', p: 0.725 }],
      })),
      /* THE BUG THE LIVE PAGE FOUND. An absolute-distance filter counts an
         anchor the ride is BEHIND as "passed, never dwelt at" — `mission`
         at p 0 against a departure at p 0.26 — and manufactures a contract
         violation out of a rest the ride never travels through. */
      passedDirectional: canon(m.passedAnchors({ samples: [[0, 0.26], [1, 0.9]], anchors: m.ANCHORS, fromP: 0.26 })),
      /* The terminal rest is excluded BY DESIGN and that exclusion needs a
         reader that can see it: DO2's first draft reported CANNOT FAIL
         because the sample run above never reaches p 0.97 at all, so the
         terminal was already absent for a different reason (D50 — a "cannot
         fail" verdict is a claim about the mutant until proven otherwise).
         This row drives the ride past the end. */
      passedExcludesTerminal: canon(m.passedAnchors({ samples: [[0, 0.26], [1, 0.999]], anchors: m.ANCHORS, fromP: 0.26 })),
      passedRefusesEmpty: refuses(() => m.passedAnchors({ samples: [], anchors: A3, fromP: 0 }), 'samples is empty'),

      /* --- the two contract readers --- */
      sweptWindows: swept(m.sweptByWindow),
      /* The from-rest guarantee must read the QUIET phase only: gesture 1
         begins parked at `a` and scrubs past `b` during its own input, which
         is a visitor scrolling, not a ride running away from them. */
      sweptFromRest: swept(m.sweptFromRest),
      sweptRefusesOneMark: refuses(
        () => m.sweptByWindow({ marks: [{ t: 0, p: 0, kind: 'gesture-start' }], anchors: A3, dwell, judged, floorMs: 250 }),
        'nothing was driven'),
      analysed: canon((() => {
        const r = m.analyseTrial(trial());
        return [r.maxSweptPerWindow, r.fromRestGestures, r.sweptFromRest, r.judged, r.swept];
      })()),
      violationsClean: m.evaluateContract([trial()]).violations.length,
      /* Two rests inside ONE gesture window: the regression DW-C1 exists for. */
      violationsTwoPerWindow: m.evaluateContract([trial({
        marks: [
          { t: 0, p: 0, kind: 'gesture-start' },
          { t: 100, p: 0.1, kind: 'gesture-end' },
          { t: 600, p: 0.9, kind: 'settle-end' },
        ],
      })]).violations.filter((v) => v.startsWith('DW-C1')).length,
      /* The same trial read through the OTHER contract: one gesture from a
         standstill, hands off through the whole quiet phase, and the ride
         crosses two rests without stopping. */
      violationsFromRest: m.evaluateContract([trial({
        marks: [
          { t: 0, p: 0, kind: 'gesture-start' },
          { t: 100, p: 0.1, kind: 'gesture-end' },
          { t: 600, p: 0.9, kind: 'settle-end' },
        ],
      })]).violations.filter((v) => v.startsWith('DW-C2')).length,

      /* --- the D63 trust gate --- */
      trustClean: m.trustVerdict(clean).trusted,
      trustPosCtl: m.trustVerdict({ ...clean, positiveControl: false }).causes.length,
      trustHidden: m.trustVerdict({ ...clean, hiddenTrials: 2 }).causes.length,
      trustStill: m.trustVerdict({ ...clean, stillTrials: 1 }).causes.length,
      /* The pacing cause, both arms — CONNECT-SKIP's per-trial frame-gap
         criterion, which replaced load average as the trust proxy after a
         sibling order measured load 30 at 40% CPU idle on this host. */
      trustPacedOut: m.trustVerdict({ ...clean, trialCount: 5, pacedOutTrials: 6, frameGapBudgetMs: 50 }).causes.length,
      trustPacedKept: m.trustVerdict({ ...clean, trialCount: 6, pacedOutTrials: 5, frameGapBudgetMs: 50 }).trusted,
      trustAllCauses: m.trustVerdict({
        httpOk: false, httpStatus: 404, booted: false, positiveControl: false,
        hiddenTrials: 1, thinTrials: 1, stillTrials: 1, framesRendered: 0, consoleErrors: 1,
        trialCount: 0, minSamples: 40,
      }).causes.length,

      /* --- the page-driving half, read as SOURCE (see the note above) --- */
      driverDispatches: /window\.dispatchEvent\(new WheelEvent\(/.test(String(m.drivenTrial)),
      driverNoSetter: !/\.(?:scrollTo|flyTo|setProgress|wrap)\s*\(/.test(String(m.drivenTrial)),
      parkerSets: /journey\.scrollTo\(/.test(String(m.parkAt)),

      /* --- the declared contract, read directly so a relaxed threshold
             moves a key of its own rather than hiding inside a verdict --- */
      contract: canon([m.DEFAULT_CONTRACT.tol, m.DEFAULT_CONTRACT.dwellFloorMs,
        m.DEFAULT_CONTRACT.sweptPerWindowMax, m.DEFAULT_CONTRACT.passMargin]),
      argDefaults: canon(m.parseArgs([])),

      /* ============================================================== *
       * DWELL-G1 — THE POST-FIX LAW. Everything below probes decision
       * functions that did not exist before 2026-08-25.
       *
       * The rows above and these rows split the work with
       * tools/test-dwell-oracle.mjs deliberately: that suite drives the
       * IMPORTED functions over fixtures and a recording, which proves the
       * fixtures reach their cases; these rows are run against a STAGED,
       * MUTATED COPY of the module source, which is the only place a
       * mutant can prove the shipped logic is load-bearing. DO24-DO36
       * below are the mutants, and each declares which of these keys it
       * must move.
       * ============================================================== */

      /* The declared law, read directly for the same reason `contract` is:
         a quietly relaxed threshold must move a key of its own. */
      contractLaw: canon([m.DEFAULT_CONTRACT.machineOwnedMax,
        m.DEFAULT_CONTRACT.dualLegs]),

      /* --- the crossing classifier, one fixture per mechanism name --- */
      crossScrub: canon(cross(MARKS_SCRUB, D0).map(mech)),
      crossLanding: canon(cross(MARKS_SCRUB, { ...D0, c: 900 }).map(mech)),
      crossInflight: canon(cross(MARKS_INFLIGHT, D0).map(mech)),
      crossRefuses: refuses(() => m.classifyCrossings({ marks: [MARKS_SCRUB[0]], anchors: A3, dwell: D0, judged: JUDGED }), 'nothing was driven'),

      /* --- DW-C4's landings, and the SWEEP line that keeps C3 and C4 from
             reporting one crossing twice --- */
      landHeld: canon(land(400)),
      landShort: canon(land(120)),
      landSweep: canon(land(0)),
      landRefuses: refuses(() => m.landings({ samples: [], anchors: A3, judged: JUDGED, dwell: D0 }), 'samples is empty'),

      /* --- DW-C5, the dual, BOTH DIRECTIONS off one integer --- */
      dualDesign: canon(dual([0.4])),
      dualSkip: canon(dual([0.8])),
      dualRefused: canon(dual([0])),
      dualNotRest: canon(dual([0.55])),
      dualRefusesLanded: refuses(() => m.evaluateDual([{ from: 'a', to: 'b', delayMs: 1, startIdx: 0, dir: 1, endP: 0.4, anchors: A3, midFlight: { resolving: false } }]), 'still in flight'),
      dualRefusesEmpty: refuses(() => m.evaluateDual([]), 'no dual runs'),

      /* --- the leg arithmetic, including the wrap --- */
      stepsWrap: m.stepsAdvanced(3, 0.4, 1, A3),
      stepsBack: m.stepsAdvanced(2, 0.4, -1, A3),
      stepsNotRest: m.stepsAdvanced(0, 0.55, 1, A3),
      stepsRefuses: refuses(() => m.stepsAdvanced(9, 0.4, 1, A3), 'not an index'),

      /* --- the transit-derived cadence --- */
      windows: canon(m.transitWindows({ anchors: A3, transitOf: TRANSIT }).map((w) => `${w.from}->${w.to}:${w.declared}:${w.ms}`)),
      delays: canon(m.dualDelaysMs({ anchors: A3, transitOf: TRANSIT }).map((w) => w.delays)),
      delayRefuses: refuses(() => m.dualDelaysMs({ anchors: A3, transitOf: TRANSIT, fractions: [1.5] }), 'strictly inside'),
      tgcPauses: canon(m.transitGestureConfigs(7, 4, 1300).map((c) => c.pause)),
      tgcKeepsRest: m.transitGestureConfigs(7, 4, 1300).map((c) => c.delta).join() === m.gestureConfigs(7, 4).map((c) => c.delta).join(),
      tgcRefuses: refuses(() => m.transitGestureConfigs(7, 4, 0), 'positive integer'),

      /* --- D88's second opinion, which must be NULL and not 0 when the
             recording carried no model state --- */
      proxyUnobserved: canon(m.proxyDisagreement({ marks, anchors: A3 })),
      proxyObserved: canon(m.proxyDisagreement({
        marks: [{ t: 0, p: 0, kind: 'gesture-start', resolving: false },
          { t: 600, p: 0.6, kind: 'gesture-start', resolving: false }],
        anchors: A3,
      })),

      /* THE LAW OVER THE SAME TRIAL the bounds call clean. `violationsClean`
         is 1, not 0, and that ONE number is the whole finding: this fixture
         is documented above as "a second gesture from mid-flight", the
         bounds scored it clean, and DW-C3 names it. */
      violationsLaw: canon(m.evaluateContract([trial()]).violations.filter((v) => v.startsWith('DW-C3')).map((v) => v.slice(0, 44))),
      marginLaw: canon((() => {
        const g = m.evaluateContract([trial()]).margin;
        return [g.crossings, g.machineOwned, g.landings, g.shortLandings];
      })()),
    };
  },
};

/* ==================================================================== *
 * THE MUTANTS — edits to the SHIPPED module source, each DECLARING the
 * probe keys it must move. Gate 4 checks the declaration, so "which
 * instrument should kill this mutant" (D58) is a checked statement rather
 * than a written-down intention.
 *
 * A mutant's registry id is its module's PIN id, because the registry
 * drives the pin the mutant names. Its own tag rides in `moves`, which is
 * what the sweep prints.
 * ==================================================================== */
const PIN_ID = {
  'strip-comments.mjs': 'SC-P',
  'instrument-ledger.mjs': 'IL-P',
  'mutant-registry.mjs': 'MR-P',
  'self-controls.mjs': 'SF-P',
  'stage-tree.mjs': 'ST-P',
  'dwell-oracle.mjs': 'DO-P',
  'pose-oracle.mjs': 'PO-P',
  'tempo-oracle.mjs': 'TO-P',
  'assertion-provenance.mjs': 'AP-P',
};

const SC = 'strip-comments.mjs';
const IL = 'instrument-ledger.mjs';
const MR = 'mutant-registry.mjs';
const SF = 'self-controls.mjs';
const ST = 'stage-tree.mjs';
const DO = 'dwell-oracle.mjs';
const PO = 'pose-oracle.mjs';
const TO = 'tempo-oracle.mjs';
const AP = 'assertion-provenance.mjs';

const MUTANTS = [
  /* --- strip-comments.mjs ------------------------------------------ */
  ['SC1', SC, 'the line-comment branch is disabled', ['interp', 'line'],
    ["    if (src.startsWith('//', i)) {", "    if (false && src.startsWith('//', i)) {"]],
  ['SC2', SC, 'the block-comment branch is disabled', ['block', 'escaped'],
    ["    if (src.startsWith('/*', i)) {", "    if (false && src.startsWith('/*', i)) {"]],
  ['SC3', SC, 'the regex-literal branch is disabled — a comment marker inside a regex opens a phantom comment', ['inRegexBlock', 'inRegexClass'],
    ["    if (src[i] === '/' && regexHere()) {", "    if (false && src[i] === '/' && regexHere()) {"]],
  ['SC4', SC, 'blanking stops preserving length', ['lenPreserved', 'linesPreserved'],
    ["const blank = (s) => s.replace(/[^\\n]/g, ' ');", "const blank = () => '';"]],
  ['SC5', SC, 'blankStrings stops blanking string contents', ['blankStrings'],
    ['        ? q + blank(src.slice(i + 1, j)) + q', '        ? src.slice(i, j + 1)']],
  ['SC6', SC, 'the non-string refusal is removed', ['refusesNonString'],
    ["  if (typeof src !== 'string') {", '  if (false) {']],

  /* --- instrument-ledger.mjs --------------------------------------- */
  ['IL1', IL, "the Object3D branch stops digesting geometry — D88's byte-blind Mesh, restored", ['meshGeo', 'meshKid'],
    ["        + `:geo=${x.geometry ? walk(x.geometry) : 'none'}`", "        + ':geo=none'"]],
  ['IL2', IL, 'children stop being walked — a nested Mesh goes byte-blind', ['meshKid'],
    ["      const kids = (x.children || []).map(walk).join('|');", "      const kids = (x.children || []).map(() => '').join('|');"]],
  ['IL3', IL, 'the ancestor stack is never popped — a shared acyclic ref reads as a cycle', ['sharedNotACycle'],
    ['      path.delete(x);', '      void x;']],
  ['IL4', IL, "typed arrays are reduced to their length — H02's original bug", ['typedBytes'],
    ['      return `<bytes:${x.constructor.name}:${x.byteLength}:${sha16(viewBytes(x))}>`;',
      '      return `<bytes:${x.constructor.name}:${x.byteLength}>`;']],
  ['IL5', IL, 'object keys are left unsorted', ['sortedKeys'],
    ["    return '{' + Object.keys(x).sort().map(", "    return '{' + Object.keys(x).map("]],
  ['IL6', IL, 'canon stops distinguishing an object from its string form', ['canonObject'],
    ["  return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : String(v);", '  return String(v);']],
  ['IL7', IL, "mutateText's anchor-miss guard is removed", ['anchorMiss'],
    ['  if (!src.includes(from)) {', '  if (false) {']],
  ['IL8', IL, "mutateText's inert-edit guard is removed", ['inertEdit'],
    ['  if (out === src) fault(', '  if (false) fault(']],
  ['IL9', IL, 'sliceBetween stops refusing a slice equal to the whole file', ['sliceWholeFile'],
    ['  if (out.length === src.length) fault(', '  if (false) fault(']],
  ['IL10', IL, 'the sentinel accepts an unknown reporting phase', ['unknownPhase'],
    ['      if (!known.has(phase)) fault(', '      if (false) fault(']],
  ['IL11', IL, 'the ledger scores a mismatch as a pass', ['ledgerCode', 'ledgerFails', 'ledgerPass'],
    ['    if (a === e) { pass++;', '    if (true) { pass++;']],

  /* --- mutant-registry.mjs ----------------------------------------- */
  ['MR1', MR, 'gate 1 (the baseline reproduces the expectation) is disabled', ['g1baseline'],
    ['        if (canon(before) !== canon(reg.expected)) {', '        if (false) {']],
  ['MR2', MR, "gate 2 (the perturbation moved the reader's input) is disabled", ['g2inputNoOp'],
    ['        if (inputCanon(perturbed) === inputCanon(reg.input)) {', '        if (false) {']],
  ['MR3', MR, "gate 3 (the reader's output moved) is disabled", ['g3outputStill'],
    ['      if (canon(after) === canon(before)) {', '      if (false) {']],
  ['MR4', MR, 'gate 4 (the observed axis equals the declared one) is disabled', ['g4axis'],
    ['        if (observed === null || canon(observed) !== canon(m.movedIndices)) {', '        if (false) {']],
  ['MR5', MR, 'a mutant naming an unregistered pin is accepted', ['g5unregistered'],
    ['      if (!reg) {', '      if (false) {']],
  ['MR6', MR, 'the duplicate-pin-id fault is removed', ['duplicatePin'],
    ['    if (REGISTRY.has(id)) fault(', '    if (false) fault(']],
  ['MR7', MR, "D58's uncovered-pin contract is retired", ['uncovered'],
    ['    const uncovered = [...REGISTRY.keys()].filter((id) => !mutated.has(id));', '    const uncovered = [];']],
  ['MR8', MR, 'the object branch of movedPositions is removed — gate 4 silently stops applying', ['movedObject'],
    ["    if (kb.join(',') === ka.join(',')) {", '    if (false) {']],
  ['MR9', MR, "PIN_RECEIVER stops describing pin's real signature", ['pinReceiver'],
    ['export const PIN_RECEIVER = Object.freeze({ actualCall: [2, 3], expected: 4 });',
      'export const PIN_RECEIVER = Object.freeze({ actual: 2, expected: 3 });']],

  /* --- self-controls.mjs ------------------------------------------- */
  ['SF1', SF, 'nodeKey reverts to the whitespace-COLLAPSING form D88 found',
    ['tauBad', 'tauPinShape', 'tauTrailingComma', 'tauWrapped'],
    ['  const key = makeKeyer(src, ast.tokens || []);',
      "  const key = (n) => src.slice(n.start, n.end).replace(/\\s+/g, ' ').trim();"]],
  ['SF2', SF, 'the trailing-comma rule is removed', ['tauBad', 'tauTrailingComma', 'tauWrapped'],
    ["      if (parts[k] === ',' && (parts[k + 1] === ')'", "      if (false && (parts[k + 1] === ')'"]],
  ['SF3', SF, 'the numeric-pin refusal is removed', ['tauPinRefusal'],
    ['    if (PIN_NAMES.has(callee)) {', '    if (false) {']],
  ['SF4', SF, "T4's one-sided guard is removed — the determinism idiom reads as a tautology", ['tauBad', 'tauDeterminism'],
    ['          if (aPropKey === ePropKey && (eMoved !== aMoved) && containsCall(eMoved ? eSub : aSub)) {',
      '          if (aPropKey === ePropKey && (eMoved || aMoved)) {']],
  ['SF5', SF, 'T4 is removed entirely — Engine 1 goes unseen again', ['tauBad', 'tauEngine1'],
    ["            row(n, 'T4',", "            void 0 && row(n, 'T4',"]],
  ['SF6', SF, 'T5 stops resolving a local helper — the one-call-deep shape goes unseen', ['tauBad', 'tauOneDeep'],
    ['        const body = fnBody.get(m.callee.name);', '        const body = null;']],
  ['SF7', SF, 'the actualCall form is ignored — pin sites go back to being unscanned', ['tauPinShape'],
    ['        const aKey = spec.actualCall', '        const aKey = false']],
  ['SF8', SF, 'the parse refusal is converted into a quiet error (D63)', ['tauParseRefusal'],
    ['    throw new Error(`scanTautologyAst REFUSES: the subject does not parse — ${e.message}`, { cause: e });',
      "    throw new Error('scanTautologyAst: quietly nothing');"]],
  ['SF9', SF, "literalPredicateRe ignores the caller's label arity — D59's own parameter",
    ['litHits', 'litProbe', 'litReHit'],
    ["  return new RegExp(`\\\\b(?:${alt})\\\\s*\\\\(${'[^,]*,'.repeat(labels)}\\\\s*(?:true|false)\\\\s*[,)]`);",
      "  return new RegExp(`\\\\b(?:${alt})\\\\s*\\\\(${'[^,]*,'.repeat(1)}\\\\s*(?:true|false|[a-z]+)\\\\s*[,)]`);"]],
  ['SF10', SF, "D76's masking is removed — a self-scan's own rows become occurrences", ['selfSet'],
    ['    if (mask) text = text.split(mask).join(`<${mask.length}c>`);', '    void mask;']],
  ['SF11', SF, "D54's line key is dropped from the FOREIGN site set", ['foreignSet'],
    ['  lines.forEach((line, n) => { if (re.test(line)) rows.push(`${file} :: ${n + 1} :: ${line.trim()}`); });',
      '  lines.forEach((line) => { if (re.test(line)) rows.push(`${file} :: ${line.trim()}`); });']],
  ['SF13', SF, "PC-1's census control is retired — an assert-zero scan that reads nothing reports clean", ['auditWrongCensus'],
    ["  say(self.sites === expectedSites, 'PC-1',", "  say(true, 'PC-1',"]],
  ['SF14', SF, 'the D44 row is retired — a bare-literal predicate stops being a problem', ['auditDirty'],
    ["  say(self.hits.length === 0, 'D44',", "  say(true, 'D44',"]],
  ['SF12', SF, 'the maskedToken length guard is removed', ['maskedShort'],
    ["  if (typeof token !== 'string' || token.length < 2) throw new Error('maskedToken: token too short to mask');",
      "  if (false) throw new Error('maskedToken: unreachable');"]],

  /* --- stage-tree.mjs ---------------------------------------------- */
  ['ST1', ST, 'the specifier guard is disabled — four blind shapes stage silently',
    ['guardDoubleQuote', 'guardDynamic', 'guardOffIsNotSilence', 'guardSideEffect', 'guardTight'],
    ['      if (guard) {', '      if (false) {']],
  ['ST2', ST, 'the specifier scan reverts to RAW source — a comment names a dependency again',
    ['commentSpecifierIgnored', 'specifierSites'],
    ['  const scanned = stripComments(src);', '  const scanned = src;']],
  ['ST3', ST, 'the unreadable-dependency refusal is untagged again', ['missingDepTagged'],
    ["      try {\n        return readFileSync(abs, 'utf8');",
      "      if (true) return readFileSync(abs, 'utf8');\n      try {\n        return readFileSync(abs, 'utf8');"]],
  ['ST4', ST, 'the bare `three` specifier stops being remapped', ['remapsThree'],
    ["        else if (s.spec === 'three')", '        else if (false)']],
  ['ST5', ST, 'override stops being honoured', ['honoursOverride'],
    ["        if (override[s.spec]) text += `from '${override[s.spec]}'`;", "        if (false) text += '';"]],
  ['ST6', ST, "asIf and asIfMap stop redirecting the entry's resolution", ['honoursAsIf', 'honoursAsIfMap'],
    ['      const fromDir = (asIfMap && asIfMap[abs]) ? asIfMap[abs]\n        : ((abs === entryAbsPath && asIf) ? asIf : dirname(abs));',
      '      const fromDir = dirname(abs);']],
  ['ST7', ST, 'the required-scratchRoot refusal is removed (D87)', ['requiresScratchRoot'],
    ["  if (typeof scratchRoot !== 'string' || !scratchRoot) {", '  if (false) {']],

  /* --- dwell-oracle.mjs (PAGE-01) ---------------------------------- *
   * Two of this module's capabilities are unusually load-bearing: it is the
   * first instrument here that fails on a USER-VISIBLE property rather than
   * a byte comparison, and its rest-position reader is the only thing in the
   * tree that will ever measure the 24%-vs-94% asymmetry. DO1-DO5 and
   * DO12-DO15 are written specifically so that quietly RELAXING either one
   * fires rather than passing.
   * ------------------------------------------------------------------ */
  ['DO1', DO, "the pass filter reverts to absolute distance — the bug the live page found, where `mission` at p 0 reads as passed-and-never-dwelt from a p 0.26 departure", ['passedDirectional', 'passedExcludesTerminal'],
    ['    .filter((a) => a.id !== terminal && a.p > fromP + tol && maxP > a.p + margin)',
      '    .filter((a) => a.id !== terminal && Math.abs(a.p - fromP) > tol && maxP > a.p + margin)']],
  ['DO2', DO, 'the terminal anchor stops being excluded, so the last rest is judged on a dwell the trial\'s own end bounds', ['passedExcludesTerminal'],
    ['    .filter((a) => a.id !== terminal && a.p > fromP + tol && maxP > a.p + margin)',
      '    .filter((a) => a.p > fromP + tol && maxP > a.p + margin)']],
  ['DO3', DO, 'the rest position is read from the road AFTER the rest instead of before — the 24% becomes 76% and the asymmetry inverts', ['restTable'],
    ['      beforeVh = c.segVh[0];', '      beforeVh = c.segVh[c.segVh.length - 1];']],
  ['DO4', DO, 'the underivable-chapter refusal is removed, so an unreadable rest position reports 0 instead of refusing', ['restRefuses'],
    ["      fault(`restRoadTable: chapter ${c.id} declares neither segVh nor a zero first stop — `",
      "      beforeVh = 0; if (false) fault(`restRoadTable: chapter ${c.id} declares neither segVh nor a zero first stop — `"]],
  ['DO5', DO, 'a declared stop stops being honoured, so every chapter rests at its own midpoint and the anchors move', ['anchorPs'],
    ['    const rest = (c.stops && c.stops.length) ? c.stops[0] : 0.5;', '    const rest = 0.5;']],
  ['DO6', DO, "the LCG's multiplier changes, so these are no longer DEF-OWNED's trials", ['seed7'],
    ['rnd = (rnd * 1103515245 + 12345) & 0x7fffffff;', 'rnd = (rnd * 1103515246 + 12345) & 0x7fffffff;']],
  ['DO7', DO, 'gestureConfigs stops refusing a seed of 0', ['seedRefuses'],
    ['  if (!Number.isInteger(seed) || seed <= 0) fault(', '  if (false) fault(']],
  ['DO8', DO, 'the wrap truncation never fires, so a second lap is measured as travel', ['wrapTruncates'],
    ['    if (samples[i][1] - samples[i - 1][1] < -drop) return { samples: samples.slice(0, i), wrapped: true };',
      '    if (false) return { samples: samples.slice(0, i), wrapped: true };']],
  ['DO9', DO, 'the mark-list wrap truncation never fires', ['wrapMarks'],
    ['    if (marks[i].p - marks[i - 1].p < -drop) return marks.slice(0, i);', '    if (false) return marks.slice(0, i);']],
  ['DO10', DO, 'dwell bridges an out-of-tolerance sample instead of restarting — two brief touches read as one long stop', ['dwellContiguous'],
    ['      } else { cur = 0; prev = null; }', '      } else { prev = t; }']],
  ['DO11', DO, 'the two-gesture-mark refusal is removed, so a trial that drove nothing reports zero swept windows', ['sweptRefusesOneMark'],
    ["  if (starts.length < 2) fault('sweptByWindow: fewer than two gesture marks — nothing was driven');",
      '  if (starts.length < 2) return [];']],
  ['DO12', DO, 'the from-rest guarantee measures from the gesture START, so a continuous scrub during the visitor\'s own input counts as the ride running away from them', ['analysed', 'sweptFromRest'],
    ['      swept: sweptBetween({ lo: end.p, hi: next.p, anchors, dwell, judged, floorMs }),',
      '      swept: sweptBetween({ lo: marks[i].p, hi: next.p, anchors, dwell, judged, floorMs }),']],
  ['DO13', DO, 'the from-rest guarantee applies to gestures that began MID-FLIGHT too, which is the case the shipped rule licenses', ['analysed', 'sweptFromRest'],
    ["    if (marks[i].kind !== 'gesture-start' || !atRest(marks[i].p)) continue;",
      "    if (marks[i].kind !== 'gesture-start') continue;"]],
  ['DO14', DO, 'DW-C1 stops being reported, so one gesture may carry the ride past any number of rests', ['violationsTwoPerWindow'],
    ['    if (r.maxSweptPerWindow > contract.sweptPerWindowMax) {', '    if (false) {']],
  ['DO22', DO, 'DW-C2 stops being reported, so the from-rest bound becomes a comment', ['violationsFromRest'],
    ['    if (r.maxSweptFromRest > contract.sweptPerWindowMax) {', '    if (false) {']],
  ['DO23', DO, "D63 — a trial in which the ride never moved stops being a cause; the recorded sweep had one (trial 6 dispatched 36 wheel events and travelled 0.000)",
    ['trustAllCauses', 'trustStill'],
    ['  if (evidence.stillTrials > 0) {', '  if (false) {']],
  ['DO15', DO, 'the swept-per-window bound is quietly relaxed from one section to two', ['contract', 'violationsFromRest', 'violationsTwoPerWindow'],
    ['  sweptPerWindowMax: 1,', '  sweptPerWindowMax: 2,']],
  ['DO16', DO, "D63 — trustVerdict stops checking the per-origin positive control, so a sweep that measured nothing reports numbers", ['trustAllCauses', 'trustPosCtl'],
    ['  if (!evidence.positiveControl) {', '  if (false) {']],
  ['DO17', DO, 'D63 — a hidden tab stops being a cause, and throttled setTimeout timings are reported as dwell', ['trustAllCauses', 'trustHidden'],
    ['  if (evidence.hiddenTrials > 0) {', '  if (false) {']],
  ['DO18', DO, 'the driven region moves the ride with a progress setter instead of a dispatched event', ['driverNoSetter'],
    ['      window.dispatchEvent(new WheelEvent(', '      j.scrollTo(j.p + 0.01) || window.dispatchEvent(new WheelEvent(']],
  ['DO19', DO, 'the driven region stops dispatching events at all — it constructs them and drops them',
    ['driverDispatches'],
    ['      window.dispatchEvent(new WheelEvent(', '      String(new WheelEvent(']],
  ['DO20', DO, 'the parking call stops setting progress, so every trial departs from wherever the last one ended', ['parkerSets'],
    ['  window.journey.scrollTo(fromP);', '  void fromP;']],
  /* `marginLaw` LEFT THIS DECLARATION ON 2026-08-26, and it was not a
     loosening: the floor moved this mutant's third axis only through
     `beatOverFloorMs` (`restBeatMs - dwellFloorMs`), and that tail was retired
     with the beat. The two axes that remain are the ones that read the
     recording, and both still catch it. */
  ['DO21', DO, 'the dwell floor is quietly relaxed to 50 ms, which would call a 60 ms sweep-through a stop', ['contract', 'landShort'],
    ['  dwellFloorMs: 250,', '  dwellFloorMs: 50,']],

  /* --- DWELL-G1: THE POST-FIX LAW ------------------------------------ *
   *
   * DO1-DO23 above were written so that quietly relaxing the BOUNDS moves a
   * key. These are the same discipline over the LAW, and three of them
   * (DO27, DO29, DO32) are written specifically against the failure mode
   * this whole order exists to close: a gate that is present, runs, and
   * cannot fail. Each names the fault it restores rather than the line it
   * edits, because "which instrument kills this mutant" is the checked
   * statement (D58), not "which character changed".
   * ------------------------------------------------------------------ */
  ['DO24', DO, 'ANY crossing counts as a landing — the dwell floor stops discriminating, so a rest the ride flew through at speed reads as one the visitor experienced', ['crossInflight', 'crossLanding', 'crossScrub', 'marginLaw', 'violationsClean', 'violationsLaw'],
    ['      if (held >= floorMs) mechanism = \'landing\';', '      if (held >= 0) mechanism = \'landing\';']],
  ['DO25', DO, 'the arming discrimination is dropped: every gesture is treated as having begun from a landed state, which is the 1.0% cell swallowing the 98.4% one', ['crossInflight'],
    ["    const startState = (g >= 0 && atRest(marks[g].p)) ? 'LANDED' : 'IN-FLIGHT';",
      "    const startState = 'LANDED';"]],
  ['DO26', DO, 'the quiet-carry mechanism stops being machine-owned — the skip `sweptPerWindowMax: 1` used to license is licensed again under a new name', ['crossInflight', 'crossScrub'],
    ["        machineOwned: mechanism === 'inflight-carry' || mechanism === 'quiet-carry',",
      "        machineOwned: mechanism === 'inflight-carry',"]],
  ['DO27', DO, 'D63 — the crossing classifier stops refusing a trial that drove nothing, so ZERO MACHINE-OWNED CROSSINGS is reported over a trial with no observation behind it. Zero is this rule\'s passing value, so the gate would pass hardest where it had seen least', ['crossRefuses'],
    ["  if (!Array.isArray(marks) || marks.length < 2) fault('classifyCrossings: fewer than two marks — nothing was driven');",
      '  if (false) { /* accepted */ }']],
  ['DO28', DO, 'the sweep/landing line is removed from `landings`, so DW-C4 reports every crossing DW-C3 already named and the per-crossing counts inflate', ['landSweep'],
    ['    if (!(dwell[a.id] > 0)) continue;', '    if (false) continue;']],
  ['DO29', DO, 'THE LAW\'S THRESHOLD IS QUIETLY RELAXED FROM ZERO TO ONE — one unearned crossing per trial becomes free, which is `sweptPerWindowMax: 1` restored in the new contract\'s own words', ['contractLaw', 'violationsClean', 'violationsLaw'],
    ['  machineOwnedMax: 0,', '  machineOwnedMax: 1,']],
  /* A MUTANT WAS RETIRED HERE ON 2026-08-26, WITH ITS SUBJECT. It put the
     oracle's restated landing beat, `restBeatMs`, back to 300; that
     restatement left the contract when journey/constants/scroll.js's
     `COMMIT_REST_BEAT_MS` and its one reader were retired, and a mutant of a
     field that no longer exists is a harness fault, not a killer.
     `contractLaw`'s middle slot and `marginLaw`'s tail went with it rather
     than being re-pointed at a third value — the instruction written at both
     sites, ratified. Its id is deliberately not spelled out: citing an id no
     suite defines is precisely what tools/test-assertion-provenance.mjs
     reports, and it is in the ledger. */
  ['DO31', DO, 'the dual is relaxed by one leg — the pre-A7 value, in which a stream born mid-flight buys a section of its own — so owner report #26\'s skip stops being a skip and the from-rest contract row starts reading as a refusal', ['contractLaw', 'dualDesign', 'dualSkip'],
    ['  dualLegs: 0,', '  dualLegs: 1,']],
  ['DO32', DO, 'THE DUAL BECOMES ONE-SIDED — the refusal branch is dropped, so a from-rest flick that buys nothing (DEFECT-02\'s class, "two flicks buy one section") reintroduces itself invisibly and the next fix trades one owner complaint for the other', ['dualRefused'],
    ['    } else if (r.legs < want) {', '    } else if (false) {']],
  ['DO33', DO, 'D63 — the dual stops refusing when NO run reached the in-flight state it exists to measure, so a probe that measured the from-standstill case entirely reports a clean two-sided result', ['dualRefusesLanded'],
    ['  if (!judged.length) {', '  if (false) {']],
  ['DO34', DO, 'the cadence stops requiring its fractions to lie strictly inside the transit window, so the second stream is delivered AFTER the landing while still calling itself an in-flight measurement', ['delayRefuses'],
    ['  for (const f of fractions) if (!(f > 0 && f < 1)) fault(`dualDelaysMs: fraction ${f} is not strictly inside the transit window`);',
      '  for (const f of fractions) void f;']],
  ['DO35', DO, 'the declared transit table stops being consulted — every boundary falls back to the band, so a TRANSIT_S edit no longer moves the probe with it and the coverage loss reads as a green', ['delays', 'windows'],
    ['    const declared = transitOf(anchors[i].p, anchors[i + 1].p, 1);', '    const declared = 0;']],
  ['DO36', DO, 'a ride that stopped somewhere that is not a rest reports ZERO LEGS instead of refusing to name one — an invented measurement rounded out of a null', ['dualNotRest', 'stepsNotRest'],
    ['  if (endIdx < 0) return null;', '  if (endIdx < 0) return 0;']],
  ['DO37', DO, 'the transit-derived generator stops redrawing its pauses, so the cadence silently reverts to the fixed range that predates the transit table', ['tgcPauses'],
    ['    pause: Math.max(60, Math.round(windowMs * ((i % 4) + 1) / 5)),', '    pause: c.pause,']],
  ['DO39', DO, 'D63 — the frame-pacing cause is dropped, so a run that lost most of its trials to stalls reports the figures its lucky half produced (a survivorship artefact wearing a measurement\'s clothes)', ['trustPacedOut'],
    ['  if (evidence.pacedOutTrials > 0 && evidence.trialCount <= evidence.pacedOutTrials) {', '  if (false) {']],
  ['DO40', DO, 'the pacing cause fires whenever ANY trial was excluded, so a run that kept ten of eleven refuses to report — the over-refusing half of the same rule, and a gate nobody can keep green is a gate that gets deleted', ['trustPacedKept'],
    ['  if (evidence.pacedOutTrials > 0 && evidence.trialCount <= evidence.pacedOutTrials) {',
      '  if (evidence.pacedOutTrials > 0) {']],
  ['DO38', DO, "D88 — the p-proxy's second opinion returns 0 instead of null when no mark carried model state, so \"not observed\" reads as \"the proxy agreed\"", ['proxyUnobserved'],
    ['  if (!observed.length) return null;', '  if (!observed.length) return { observed: 0, disagree: 0 };']],

  /* --- pose-oracle.mjs (PAGE-02) ------------------------------------ *
   * The two capabilities that carry the whole order are the EXACTNESS of the
   * comparison and the EMPTINESS of the exclusion set. PO5 and PO17 are
   * written so that quietly relaxing either fires rather than passing: PO5
   * is a tolerance smuggled into an equality, and PO17 is the widening the
   * empty declaration exists to make loud.
   * ------------------------------------------------------------------ */
  ['PO1', PO, 'the row-width guard is removed, so a row of the wrong shape is silently mapped onto eleven names', ['splitRefuses'],
    ['  if (parts.length !== POSE_FIELDS.length) {', '  if (false) {']],
  ['PO2', PO, 'an exclusion blanks the WHOLE ROW instead of its own cell — a node whose class changed would stop being caught', ['maskCell'],
    ["      if (wanted.has(k)) { wanted.set(k, true); cells[i] = 'EXCLUDED'; masked.push(k); hit = true; }",
      "      if (wanted.has(k)) { wanted.set(k, true); for (let z = 1; z < cells.length; z++) cells[z] = 'EXCLUDED'; masked.push(k); hit = true; }"]],
  ['PO3', PO, 'a STALE exclusion stops being reported — it silences nothing today and the wrong cell tomorrow', ['maskStale'],
    ['  const unmatched = [...wanted.entries()].filter(([, seen]) => !seen).map(([k]) => k).sort();',
      '  const unmatched = [];']],
  ['PO4', PO, 'the ordinate becomes excludable, so a pose could excuse the very key it is compared by', ['maskOrdinateRefuses'],
    ["  if (e.field === 'path') fault('the path cell is the ordinate and cannot be excluded');",
      "  if (false) fault('the path cell is the ordinate and cannot be excluded');"]],
  ['PO5', PO, 'A TOLERANCE IS SMUGGLED INTO THE EQUALITY — rows agreeing on their first 30 characters compare equal', ['cmpOne', 'repro'],
    ["    if (a[i] !== b[i]) rows.push({ i, a: a[i] === undefined ? 'MISSING' : a[i], b: b[i] === undefined ? 'MISSING' : b[i] });",
      "    if (a[i] !== b[i] && String(a[i]).slice(0, 30) !== String(b[i]).slice(0, 30)) rows.push({ i, a: a[i] === undefined ? 'MISSING' : a[i], b: b[i] === undefined ? 'MISSING' : b[i] });"]],
  ['PO6', PO, 'the moved-cell set stops naming the AXIS, so "something in this node moved" replaces "its visibility moved"', ['cells', 'repro'],
    ['    for (let f = 1; f < POSE_FIELDS.length; f++) if (A[f] !== B[f]) out.add(cellKey(A[0], POSE_FIELDS[f]));',
      '    for (let f = 1; f < POSE_FIELDS.length; f++) if (A[f] !== B[f]) out.add(A[0]);']],
  ['PO7', PO, 'the digest sorts before hashing, so a reordered DOM digests identically', ['digestOrder'],
    ["  return createHash('sha256').update(rows.join('\\n')).digest('hex').slice(0, 16);",
      "  return createHash('sha256').update(rows.slice().sort().join('\\n')).digest('hex').slice(0, 16);"]],
  ['PO8', PO, 'an unreadable rail source returns a DEFAULT instead of refusing — D63 in its original shape', ['railRefuses'],
    ["  if (!follow) fault('journey/rail.js: the followReadyAt deadline could not be read');",
      '  if (!follow) return { followReadyMs: 0, turnTimerMs: 0 };']],
  ['PO9', PO, 'the turn-timer literal is scaled on the way out, so the wait is compared against a number the rail does not use', ['railGates'],
    ['  return { followReadyMs: Number(follow[1]), turnTimerMs: Number(turn[1]) };',
      '  return { followReadyMs: Number(follow[1]), turnTimerMs: Number(turn[1]) / 10 };']],
  ['PO10', PO, 'the TORN-READ cause is dropped, so a vector describing a state that never existed is reported as a measurement', ['trustTorn'],
    ['  if (e.tornReads) causes.push(', '  if (false) causes.push(']],
  ['PO11', PO, 'the stale-exclusion cause is dropped', ['trustStale'],
    ['  if (e.staleExclusions && e.staleExclusions.length) {', '  if (false) {']],
  ['PO12', PO, 'the same-tree cause is dropped, so a two-tree run against ONE tree reports preservation of nothing', ['trustSameTree'],
    ['  if (e.originsIdentical) causes.push(', '  if (false) causes.push(']],
  ['PO13', PO, 'the pose reader starts consulting a clock — the vector stops being a function of the DOM alone', ['readerNoClock'],
    ['export const pvRead = (arg) => {\n  const out = [];',
      'export const pvRead = (arg) => {\n  const out = [];\n  void performance.now();']],
  ['PO14', PO, 'the pose reader stops reading computed style, so opacity, transform and visibility become whatever the inline style says', ['readerReads'],
    ['      const s = getComputedStyle(el);', '      const s = el.style;']],
  ['PO15', PO, 'THE FREEZE PAUSES WITHOUT PINNING currentTime — every animation stops at whatever phase it had reached, which is the same clock dependence in a new place', ['freezerPins'],
    ['      try { a.pause(); a.currentTime = arg.phaseMs; } catch (e) { void e; failures++; }',
      '      try { a.pause(); } catch (e) { void e; failures++; }']],
  ['PO16', PO, 'the freeze stops iterating to a fixpoint — one pass, and the transitionend handler that starts a second transition wins', ['freezerLoops'],
    ['  for (let p = 0; p < arg.passes; p++) {', '  for (let p = 0; p < 1; p++) {']],
  ['PO17', PO, 'THE EXCLUSION SET IS WIDENED — the rail ring is excused by name, which is exactly what the empty declaration exists to make loud', ['exclusionsEmpty'],
    ['export const EXCLUSIONS = Object.freeze([]);',
      "export const EXCLUSIONS = Object.freeze([{ path: 'nav.j-rail/0/0/0', field: 'transform', why: 'it moves' }]);"]],
  ['PO18', PO, 'the UNFROZEN counter-measurement is trimmed, so "the freeze is load-bearing" loses its number', ['unfrozenSet'],
    ["  'nav.j-rail/0/0/0 :: rect',\n", '']],
  ['PO19', PO, 'a region root is dropped — the popover would stop being part of the pose at all', ['regionRoots'],
    ["  'aside.j-pop',\n", '']],
  ['PO20', PO, 'a pose cell is renamed, so a vector claims to measure something it does not', ['fields', 'split'],
    ["  'path', 'tag', 'class', 'rect', 'opacity', 'transform',", "  'path', 'tag', 'class', 'rect', 'alpha', 'transform',"]],
  ['PO21', PO, "the pinned freeze phase becomes a tuning knob shorter than the sheet's longest transition", ['consts'],
    ['export const FREEZE_PHASE_MS = 100000;', 'export const FREEZE_PHASE_MS = 250;']],
  ['PO22', PO, "the rail-gate wait drops below journey/rail.js's own 720 ms deadline", ['consts'],
    ['export const RAIL_GATE_SETTLE_MS = 1500;', 'export const RAIL_GATE_SETTLE_MS = 300;']],

  /* --- tempo-oracle.mjs (TEMPO-01) ---------------------------------- *
   * Eight moves, each the shape of a real way this instrument could go
   * green over nothing. TO2 and TO8 are the two that matter most: TO2 is
   * the walk-round (hold a uniform high behind `visible = false`), and TO8
   * is HOW THE MISSION TAIL SHIPPED — the leg simply had no declared
   * budget, so a ceiling that only applies to declared legs would have
   * been blind to the exact defect this law generalises. */
  ['TO1', TO, 'the ignition ceiling stops being compared — every step is accepted', ['splitAsserted', 'tl1Fold', 'tl1FoldSays', 'tl1Hidden'],
    ['      if (dmax !== null && up > dmax) {', '      if (false) {']],
  ['TO2', TO, 'the series stops being the RENDERED value — a uniform held high behind visible=false draws with no step', ['tl1Hidden'],
    ['      const rendered = (r) => (r[`${cls}Vis`][s] ? r[cls][s] : 0);', '      const rendered = (r) => r[cls][s];']],
  ['TO3', TO, "TL2's floor stops being compared — an onset may land anywhere in the envelope", ['splitAsserted', 'splitTl2ReachesExit', 'tl2Early'],
    ['      if (ms < floorMs) {', '      if (false) {']],
  ['TO4', TO, "TL3's ceiling stops being compared — a dead tail of any length is accepted", ['tl3Declared', 'tl3Slow'],
    ['  if (deadMs > ceiling) {', '  if (false) {']],
  ['TO5', TO, 'the dead-frame scan stops walking — every tail measures zero', ['tl3Declared', 'tl3Slow', 'tl3SlowMs', 'tl3TightMs'],
    ['  for (let i = 0; i < step.length; i++) if (step[i] >= contract.deadVFrac * peak) last = i;',
      '  last = step.length - 1;']],
  ['TO6', TO, 'clock fidelity stops being checked — a frame the page did not take from the injected clock is measured through', ['clockTorn', 'evalRefuses'],
    ['  if (off.length) {', '  if (false) {']],
  ['TO7', TO, 'the driver stops advancing the injected clock — every figure silently becomes a wall-clock figure', ['driverAdvancesClock'],
    ['const tick = async (n = 1) => { for (let i = 0; i < n; i++) { window.__vt.now += FRAME; await raf(); } };',
      'const tick = async (n = 1) => { for (let i = 0; i < n; i++) { await raf(); } };']],
  ['TO9', TO, "TL2's reading stops being TAKEN — the law goes green over a channel nobody looked at", ['splitAsserted', 'splitTl2ReachesExit'],
    ["    if (sc.laws.includes('TL2')) {\n      row.tl2 = evaluateTL2(ep, contract);",
      "    if (false) {\n      row.tl2 = evaluateTL2(ep, contract);"]],
  ['TO8', TO, 'an UNDECLARED leg escapes the ceiling — which is exactly how the mission tail shipped', ['tl3Slow', 'tl3SlowCeiling'],
    ['  const ceiling = Number.isFinite(declaredMs) ? declaredMs : contract.deadTailMaxMs;',
      '  const ceiling = Number.isFinite(declaredMs) ? declaredMs : Infinity;']],

  /* --- stage-tree.mjs, the D95 guard (QA-09) ------------------------ */
  ['ST-D95a', ST, 'the shared-registration test is disabled — the memoised cross-module measurement is accepted, which is the case that reported ZERO BYTES MOVED', ['d95RefusesShared'],
    ['  const shared = [...byUrl.entries()].filter(([, subs]) => new Set(subs).size > 1);',
      '  const shared = [];']],
  ['ST-D95b', ST, 'the guard stops de-duplicating subject names, so ONE subject staged twice is refused as a collision — a false red, which is D59’s worse half', ['d95AcceptsOneSubjectTwice'],
    ['.filter(([, subs]) => new Set(subs).size > 1);', '.filter(([, subs]) => subs.length > 1);']],
  ['ST-D95c', ST, 'the empty-measurement refusal is removed: a cross-module audit with nothing registered reports success', ['d95RefusesEmpty'],
    ['  if (!rows.length) {', '  if (false) {']],
  ['ST-D95d', ST, 'the freshness witness loses its module-scope write, so a shared registration and a fresh one read identically', ['d95WitnessHasModuleScope'],
    ["  'state.loads += 1;',", "  '/* no module-scope write */',"]],
  ['ST-D95e', ST, 'the stager stops recording the stagings it issued, so a caller memoising above it is invisible', ['d95RegistrationsRecorded'],
    ['    stageTree.registrations.push({ entry: entryAbsPath, salt, dir, url });', '    void salt;']],

  /* --- assertion-provenance.mjs (QA-09) ----------------------------- */
  ['AP-P1', AP, 'the container-escape rule stops seeing MUTATOR METHODS — a `const rows = []` filled by push() reads as an invented empty census (TA19 restored as a defect)', ['containerEscapePush', 'containerEscapeSelecting'],
    ["      && n.callee.property.type === 'Identifier' && MUTATORS.has(n.callee.property.name)) {",
      "      && n.callee.property.type === 'Identifier' && false) {"]],
  ['AP-P2', AP, 'the container-escape rule stops seeing MEMBER ASSIGNMENT — `const BUILDS = {}` filled by `BUILDS.live = build()` reads as a literal', ['containerEscapeMember'],
    ["    if (n.type === 'AssignmentExpression' && n.left && n.left.type === 'MemberExpression') escape(rootNames(n.left));",
      "    if (false) escape(rootNames(n.left));"]],
  ['AP-P13', AP, 'the container-escape rule stops reading through a SELECTING write target, so `(c ? a : b).push(x)` escapes neither container and a filled array reads as an invented empty census', ['containerEscapeSelecting'],
    ["      case 'ConditionalExpression': return [...rootNames(n.consequent, seen), ...rootNames(n.alternate, seen)];",
      "      case 'ConditionalExpression': return [];"]],
  ['AP-P3', AP, 'the container-escape rule stops seeing ESCAPE INTO A CALL — a const handed to a collector reads as a literal', ['containerEscapeCall'],
    ['    for (const a of n.arguments || []) {', '    for (const a of []) {']],
  ['AP-P4', AP, 'emptiness stops being recognised, so DB1 (an ABSENCE asserted over invented data) collapses into the weaker prose-only class', ['db1'],
    ["  if (n.type === 'ArrayExpression') return (n.elements || []).length === 0;",
      "  if (n.type === 'ArrayExpression') return false;"]],
  ['AP-P5', AP, 'the census vocabulary loses its named-file clause, so a claim about a named source file over invented data drops to the inventory', ['db2'],
    ["  '\\\\b[a-z0-9-]+\\\\.(?:js|mjs)\\\\b',", "  '\\\\bzzzz-no-such-clause\\\\b',"]],
  ['AP-P6', AP, "a pin's READER is no longer required to read nothing but its own argument, so a reader that reaches the subject is scored data-blind", ['readerReachesOutside'],
    ['    if (literallyClosed(m, consts)) return;', '    if (true) return;']],
  ['AP-P7', AP, 'the receiver-spec refusal for a missing `data` index is removed — D59 in one line: a spec that cannot say which argument it measures is accepted', ['refusesNoData'],
    ['  if (!Number.isInteger(spec.data)) {', '  if (false) {']],
  ['AP-P8', AP, 'an empty receiver set is accepted, which returns a clean zero over a file it never looked at (D46)', ['refusesNoReceivers'],
    ["  if (!declared.size) throw new Error('scanDataBlind: receivers required');", '  if (false) { /* accepted */ }']],
  ['AP-P9', AP, "id collection stops taking the LEADING TOKEN of a label, so `L.check('PC-1c  …')` defines nothing and every citation of it reads false", ['idsFromLeadingToken'],
    ['    const head = value.split(/[\\s:]/)[0];', '    const head = value;']],
  ['AP-P10', AP, 'id collection stops reading FIXTURE-TABLE ROWS, so every fixture id in the tree becomes an undefined citation', ['idsFromFixtureRow'],
    ["    if (n.type === 'ArrayExpression' && (n.elements || []).length >= 2", '    if (false'],
  ],
  ['AP-P11', AP, 'a design-document SECTION reference stops being excluded, so `HCLO-5.2` is reported as a citation of a guard that does not exist', ['citeCleanSection'],
    ['      if (/^\\.[0-9]/.test(text.slice(m.index + m[0].length))) continue;', '      if (false) continue;']],
  ['AP-P12', AP, 'the coverage-claim proximity window collapses to zero, so a claim naming a suite and an id in the same parenthetical stops being a citation', ['fc2CoverageClaim'],
    ['        if (Math.abs(cm.index - m.index) <= 60) { claim = true; break; }',
      '        if (Math.abs(cm.index - m.index) <= 0) { claim = true; break; }']],
];

/* ==================================================================== *
 * PRE-LOAD, THEN THE LEDGER.
 * ==================================================================== */
for (const name of MODULES) await load(name, SOURCE.get(name));
if (PROVE) {
  for (const [tag, mod, , , [from, to]] of MUTANTS) await load(mod, mutateText(SOURCE.get(mod), tag, from, to));
}

console.log('tools/test-instrument-layer.mjs — D58 applied to the five shared modules\n');

const DO_EXPECTED = {
  /* Route geometry over a MINIATURE manifest (see the probe): chapter `b`
     rests at 2 of its 10 vh with 8 behind it — the `owned` shape in
     miniature, which is the shape the whole order exists for. */
  restTable: '["a:0/4:4","b:2/10:8","c:5/6:1"]',
  restRefuses: 'refused',
  restRefusesNoVh: 'refused',
  anchorPs: '[0,0.25,0.7]',
  seed7: '[{"t":1,"delta":215,"count":18,"iv":20,"pause":2816,"gestures":6},'
    + '{"t":2,"delta":198,"count":41,"iv":30,"pause":444,"gestures":7}]',
  seedRefuses: 'refused',
  wrapTruncates: '{"samples":[[0,0.9],[1,0.95]],"wrapped":true}',
  wrapKeeps: false,
  wrapMarks: 1,
  /* 200 ms + 200 ms across an out-of-tolerance sample must NOT read as 400. */
  dwellContiguous: '{"owned":200}',
  /* `mission` at p 0 is BEHIND a p 0.26 departure and must not appear. */
  passedDirectional: '["connect","owned"]',
  passedExcludesTerminal: '["connect","owned"]',
  passedRefusesEmpty: 'refused',
  sweptWindows: '[["b"],["c"]]',
  /* Empty: gesture 1 began parked at `a` and crossed `b` during its OWN
     input phase, which is a visitor scrolling, not a ride running away. */
  sweptFromRest: '[{"from":0,"swept":[]}]',
  sweptRefusesOneMark: 'refused',
  analysed: '[1,1,[],["b","c"],["b","c"]]',
  /* ONE, NOT ZERO — and this single moved number is what DWELL-G1 is for.
     The probe's trial is documented as "parked at `a`, one gesture that
     scrubs past `b` during its INPUT phase, and A SECOND GESTURE FROM
     MID-FLIGHT". Under DW-C1/DW-C2 it scored zero violations, because those
     rules ask how many rests a WINDOW crossed and this one crossed one per
     window. Under the law it scores one, because the second gesture spent
     distance a resolution had banked. The fixture never changed; the
     contract stopped licensing it. See `violationsLaw` for the rule and the
     anchor. */
  violationsClean: 1,
  violationsTwoPerWindow: 1,
  violationsFromRest: 1,
  trustClean: true,
  trustPosCtl: 1,
  trustHidden: 1,
  trustStill: 1,
  /* The pacing cause, both arms. DO39 removes it (a run reports its lucky
     half); DO40 makes it fire on ANY excluded trial (the over-refusing half
     of the same rule — a gate nobody can keep green gets deleted, which is
     this program's own recurring lesson). */
  trustPacedOut: 1,
  trustPacedKept: true,
  trustAllCauses: 9,
  driverDispatches: true,
  driverNoSetter: true,
  parkerSets: true,
  contract: '[0.004,250,1,0.02]',
  argDefaults: '{"origin":"http://localhost:8177","seed":7,"trials":11,"fromP":0.26,'
    + '"width":1280,"height":800,"record":null}',

  /* ================================================================== *
   * DWELL-G1 — THE POST-FIX LAW.
   *
   * `[0,1]` is what is left of the retune: machine-owned crossings ZERO (not
   * a rate — see the module header on why a 1.1% event over 40 trials makes a
   * rate gate a coin flip), and the dual's ONE additional leg. DO29 and DO31
   * drive them.
   *
   * THE MIDDLE NUMBER WAS THE LANDING BEAT, AND IT IS RETIRED (2026-08-26),
   * not re-pointed. It went 900 -> 0 that morning when `COMMIT_REST_BEAT_MS`
   * was re-derived on the wrap's own arithmetic, and later the same day the
   * constant, its one reader and the oracle's restatement of it were all
   * retired: a slot over a field that no longer exists is a remembered number
   * wearing a contract's clothes. Evidence, and the whole derivation:
   * docs/code-health/evidence/2026-08-21-elegance-run-01/wrap-beat/.
   * ================================================================== */
  /* `dualLegs` went 1 -> 0 on 2026-08-26 under
     docs/code-health/2026-08-26-a7-ruling.md Ruling 1: a gesture born in
     flight buys no leg of its own, it is spent at the landing of the flight
     it was born into. Both slots now read ZERO and they mean different
     things — no unearned crossing, and no leg from a mid-flight stream. */
  contractLaw: '[0,0]',

  /* Three fixtures, four mechanism names, and the pair that differ in ONE
     number: `crossScrub` and `crossLanding` share a mark list and differ
     only in the dwell at `c`, so the verdict provably turns on whether the
     visitor saw the rest. */
  crossScrub: '["b/LANDED/input/scrub/earned","c/LANDED/quiet/quiet-carry/MACHINE"]',
  crossLanding: '["b/LANDED/input/scrub/earned","c/LANDED/quiet/landing/earned"]',
  crossInflight: '["b/LANDED/quiet/quiet-carry/MACHINE","c/IN-FLIGHT/input/inflight-carry/MACHINE"]',
  crossRefuses: 'refused',

  /* THE THIRD ROW IS THE LOAD-BEARING ONE. At zero contiguous dwell the ride
     passed through the tolerance band between two frames and never landed,
     so DW-C4 says nothing and DW-C3 owns the crossing. Without it the two
     rules report one event twice and the per-crossing counts this contract
     is denominated in are inflated. */
  landHeld: '{"held":[{"id":"b","ms":400}],"short":[]}',
  landShort: '{"held":[],"short":[{"id":"b","ms":120}]}',
  landSweep: '{"held":[],"short":[]}',
  landRefuses: 'refused',

  /* THE DUAL, BOTH DIRECTIONS OFF ONE INTEGER, re-anchored 2026-08-26 by
     docs/code-health/2026-08-26-a7-ruling.md Ruling 1. ONE leg is the
     contract and is silent — a gesture born in flight is spent at the
     landing of the flight it was born into. TWO is the SKIP: the owner's
     four reports, #26's "This is when scrolling through", and the row a
     restored `intent.g === gSerial &&` drives. ZERO is the REFUSAL: the
     FROM-REST flick that opened the run bought nothing — DEFECT-02's true
     class, a different fault from the row above it. A gate carrying only
     the SKIP row would let the next fix trade one complaint for the other. */
  dualDesign: '[[1],[]]',
  dualSkip: '[[2],["DW-C5 SKIP a"]]',
  dualRefused: '[[0],["DW-C5 REFUSE"]]',
  dualNotRest: '[[null],["DW-C5 a->b d"]]',
  /* D63 both ways: a second stream that arrived after the landing measured
     the from-standstill case, which is flick-probe.mjs's experiment. */
  dualRefusesLanded: 'refused',
  dualRefusesEmpty: 'refused',

  /* The wrap: forward from `d` (index 3) past `a` to `b` is two legs, not
     minus two. A ride that stopped at 0.55 is no anchor and reports null
     rather than being rounded into a neighbour. */
  stepsWrap: 2,
  stepsBack: 1,
  stepsNotRest: null,
  stepsRefuses: 'refused',

  /* THE CADENCE, DERIVED. `b->c` declares no transit and says so with a
     NULL beside the band it fell back to, so a reader cannot mistake the
     fallback for a declaration. Every delay is a fraction of that
     boundary's own window, so a TRANSIT_S edit moves the probe with it
     instead of stranding it past the landing. */
  windows: '["a->b:1.3:1300","b->c:null:1800","c->d:1.8:1800"]',
  delays: '[[325,650,975],[450,900,1350],[450,900,1350]]',
  delayRefuses: 'refused',
  tgcPauses: '[260,520,780,1040]',
  tgcKeepsRest: true,
  tgcRefuses: 'refused',

  /* D88's second opinion. NULL, not 0, when the recording carried no model
     state — an honest "not observed" rather than a zero reading as
     agreement with something nobody recorded. */
  proxyUnobserved: 'null',
  proxyObserved: '{"observed":2,"disagree":1}',

  /* THE ONE NUMBER THAT MOVED, AND THE FINDING IT CARRIES. `violationsClean`
     is 1 — the fixture is documented in the probe as "a second gesture from
     mid-flight", the two BOUND rules scored it clean for as long as they
     were the whole contract, and DW-C3 names it. The key keeps its name
     because it is still the row the bounds call clean; `violationsLaw` says
     which rule disagrees and about which anchor. */
  violationsLaw: '["DW-C3 trial 1: the ride crossed `c` with 0 m"]',
  /* THE TAIL IS GONE (2026-08-26), AND THE CONDITION FOR REMOVING IT WAS
     WRITTEN HERE BEFORE IT WAS MET. `beatOverFloorMs` was `restBeatMs -
     dwellFloorMs`; `restBeatUntil` and `COMMIT_REST_BEAT_MS` have now been
     retired outright, the oracle's restatement went with them, and the
     instruction at this site was explicit — retire the tail and
     `contractLaw`'s middle slot rather than re-point either at a third value,
     because a checked column over a deleted quantity is a remembered number
     wearing a formula. Honoured.
     WHAT IS LEFT IS WHAT WAS ALWAYS READ OFF THE RECORDING: crossings,
     machine-owned crossings, landings, short landings. DO24 moves it through
     the classifier. */
  marginLaw: '[2,1,0,0]',
};

const BASELINE = {};
for (const name of MODULES) BASELINE[name] = PROBES[name](LOADED.get(`${name}:${sha(SOURCE.get(name))}`));

/* Every module's whole probe vector is ONE pin, so a mutant's moved-key set
   is exactly the set of controls that caught it (gate 4). The expectation is
   a literal written out per key — no derivation, nothing read from the
   subject (QA-01 Engine 1/2/3). */
/* PAGE-02. Every key is a literal written out per key — no derivation,
   nothing read from the subject (QA-01 Engine 1/2/3). The four `trust*`
   rows are the first 24 characters of the NAMED CAUSE, so a cause that is
   silently softened into a different sentence moves its own key rather than
   disappearing into a boolean. */
const PO_EXPECTED = {
  exclusionsEmpty: 0,
  unfrozenSet: 12,
  fields: 'path,tag,class,rect,opacity,transform,visibility,display,zIndex,pointerEvents,textHash',
  regionRoots: 9,
  consts: '100000/2/6/3/1500/200',
  split: '{"path":"nav.j-rail/0","tag":"div","class":"c","rect":"4.000,5.000,6.000,7.000",'
    + '"opacity":"0.5","transform":"matrix(1, 0, 0, 1, 8, 0)","visibility":"visible",'
    + '"display":"block","zIndex":"1","pointerEvents":"none","textHash":"00000002"}',
  splitRefuses: 'refused',
  maskCell: 'nav.j-rail/0|div|c|4.000,5.000,6.000,7.000|0.5|EXCLUDED|visible|block|1|none|00000002',
  maskNames: '["nav.j-rail/0 :: transform"]',
  maskKeepsRows: 3,
  maskStale: '["nav.j-nope :: rect"]',
  maskOrdinateRefuses: 'refused',
  maskFieldRefuses: 'refused',
  cmpSame: true,
  cmpOne: 1,
  cmpLength: false,
  cells: '["nav.j-rail/0 :: visibility"]',
  cellsMissing: '["nav.j-rail/0/0 :: ROW PRESENCE"]',
  digestStable: true,
  digestOrder: false,
  repro: '["nav.j-rail/0 :: visibility"]',
  railGates: '{"followReadyMs":720,"turnTimerMs":500}',
  railRefuses: 'refused',
  trustClean: 'TRUSTED',
  trustTorn: '1 TORN read(s): two cons',
  trustFreeze: '1 animation(s) could not',
  trustStale: 'exclusion(s) matching no',
  trustSameTree: 'the two origins served b',
  readerNoClock: 0,
  readerReads: true,
  freezerPins: true,
  freezerLoops: true,
  cliOriginB: 'x',
};

pin('DO-P', 'dwell-oracle: every decision function, plus the page-driving half read as source',
  (i) => PROBES['dwell-oracle.mjs'](held('dwell-oracle.mjs')(i)),
  { name: 'dwell-oracle.mjs', src: SOURCE.get('dwell-oracle.mjs') }, DO_EXPECTED);

pin('PO-P', 'pose-oracle: every decision function, plus the page-side half read as source',
  (i) => PROBES['pose-oracle.mjs'](held('pose-oracle.mjs')(i)),
  { name: 'pose-oracle.mjs', src: SOURCE.get('pose-oracle.mjs') }, PO_EXPECTED);

/* THE EXPECTED VALUES ARE A DESIGN, NOT A RECORDING. Every number below is
   derivable by hand from the fixtures in the probe and the contract in
   tools/tempo-oracle.mjs — the fold fixture rises 0 -> 1 in one frame against
   a 0.35 ceiling; the early onset lights 4 frames into a 57-frame window;
   the slow glide spends 30 frames of its 16.667 ms clock below 2% of a peak
   of 1.0, which is 500 ms against the 350 ms the class declares. Nothing here
   was blessed from an observation. */
const TO_EXPECTED = {
  classes: 'reveal:0.35,amount:null,ground:null,mote:null',
  scenarios: 'wrap-fwd/TL1+TL2 wrap-rewound/TL1 nav-final-inspire/TL1 epilogue-early/TL1+TL2 '
    + 'glide-flick/TL3 glide-gentle/TL3',
  contract: '16.6667/0.02/90/0.5/0.25/0.12/0.02/350',
  windowWrap: '2-59',
  windowGlide: '10-59',
  tl1SmoothUp: 0.025,
  tl1Smooth: 0,
  tl1Fold: 1,
  tl1FoldUp: 1,
  tl1FoldSays: 'TL1 wrap-fwd: reveal:inspire IGNITED 1.0000 ',
  tl1Hidden: 1,
  tl1CloseJudged: 0,
  tl1CloseSeen: 1,
  tl2LateFrac: 0.754,
  tl2Late: 0,
  tl2EarlyFrac: 0.07,
  tl2Early: 1,
  tl3SlowMs: 500,
  tl3SlowCeiling: '350/false',
  tl3Slow: 1,
  tl3TightMs: 200,
  tl3Tight: 0,
  tl3DeclaredCeiling: '200/true',
  tl3Declared: 1,
  clockClean: 'TRUSTED',
  clockTorn: '1 of 120 frame(s) did not ca',
  clockThin: 'only 10 rendered frame(s) (c',
  evalRefuses: 2,
  /* TL2 JOINED THE EXIT CODE ON 2026-08-26 (TL2-CURE) and these three rows are
     where that shows. They were 1 / 1 / false while the law was carried as a
     printed finding; the floor it is asserted at is unchanged at 0.25 (see
     `contract` above, whose fifth field is that floor and did NOT move). The
     fixture carries one ignition step AND one early onset, so both laws now
     reach `violations` and `reported` is left declared and empty. */
  splitAsserted: 2,
  splitReported: 0,
  splitTl2ReachesExit: true,
  driverAdvancesClock: true,
  driverUsesRealWheel: true,
  driverAvoidsWrapShortcut: true,
  driverBreaksTheStream: true,
  samplerIsLast: true,
  posctlReadsSurface: true,
};

pin('TO-P', 'tempo-oracle: the three law predicates, the window finder, the clock gate, and the page-driving halves read as source',
  (i) => PROBES['tempo-oracle.mjs'](held('tempo-oracle.mjs')(i)),
  { name: 'tempo-oracle.mjs', src: SOURCE.get('tempo-oracle.mjs') }, TO_EXPECTED);

pin('IL-P', 'instrument-ledger: every exported capability, probed',
  (i) => PROBES['instrument-ledger.mjs'](held('instrument-ledger.mjs')(i)),
  { name: 'instrument-ledger.mjs', src: SOURCE.get('instrument-ledger.mjs') }, {
    canonScalar: '3',
    canonObject: '{"b":1,"a":2}',
    typedBytes: true,
    meshGeo: true,
    meshKid: true,
    sortedKeys: true,
    cycleNamed: true,
    sharedNotACycle: true,
    fnBySource: true,
    anchorMiss: 'anchor miss',
    inertEdit: 'inert',
    sliceWholeFile: true,
    sliceMiss: true,
    unknownPhase: true,
    ledgerPass: 1,
    ledgerFails: 1,
    ledgerCode: 1,
  });

pin('SC-P', 'strip-comments: every exported capability, probed',
  (i) => PROBES['strip-comments.mjs'](held('strip-comments.mjs')(i)),
  { name: 'strip-comments.mjs', src: SOURCE.get('strip-comments.mjs') }, {
    line: false,
    block: false,
    inString: true,
    inRegexClass: true,
    inRegexBlock: true,
    escaped: false,
    interp: false,
    keepStrings: true,
    blankStrings: false,
    lenPreserved: true,
    linesPreserved: true,
    refusesNonString: true,
  });

pin('MR-P', 'mutant-registry: every gate arm, driven by an input built to land in it',
  (i) => PROBES['mutant-registry.mjs'](held('mutant-registry.mjs')(i)),
  { name: 'mutant-registry.mjs', src: SOURCE.get('mutant-registry.mjs') }, {
    arms: 'total,bad,uncovered,faults,gates,size',
    gateNames: 'baselineMismatch,inputNoOp,outputStill,axisMismatch,unregistered,threw',
    g1baseline: 'baselineMismatch',
    g2inputNoOp: 'inputNoOp',
    g3outputStill: 'outputStill',
    g4axis: 'axisMismatch',
    g5unregistered: 'unregistered',
    g6threw: 'threw',
    clean: 'clean(bad=0)',
    uncovered: 'bare',
    duplicatePin: true,
    movedArray: '[1]',
    movedObject: '["b"]',
    movedShape: 'null',
    pinReceiver: '{"actualCall":[2,3],"expected":4}',
  });

pin('SF-P', 'self-controls: every exported capability, probed',
  (i) => PROBES['self-controls.mjs'](held('self-controls.mjs')(i)),
  { name: 'self-controls.mjs', src: SOURCE.get('self-controls.mjs') }, {
    litReHit: true,
    litReClean: false,
    litHits: 1,
    litProbe: true,
    scanRows: 31,
    scanBad: 0,
    tauRows: 19,
    tauBad: 0,
    tauWrapped: 1,
    tauTrailingComma: 1,
    tauEngine1: 1,
    tauOneDeep: 1,
    tauDeterminism: 0,
    tauPinShape: 1,
    tauPinClean: 0,
    tauPinRefusal: 'refused',
    tauParseRefusal: 'refused',
    tauSites: 2,
    masked: 'c|heck|check',
    maskedShort: true,
    foreignSet: '["f.js :: 1 :: const a = 1;","f.js :: 2 :: const b = 2;"]',
    selfSet: '["f.js :: const <5c> = 1;","f.js :: const <5c> = 2;"]',
    codeBlanks: false,
    auditClean: 0,
    auditDirty: 1,
    auditWrongCensus: 1,
  });

pin('ST-P', 'stage-tree: every exported capability, probed — including the guard nothing used',
  (i) => PROBES['stage-tree.mjs'](held('stage-tree.mjs')(i)),
  { name: 'stage-tree.mjs', src: SOURCE.get('stage-tree.mjs') }, {
    blindShapeCount: 4,
    specifierReSource: String.raw`from\s+'([^']+)'`,
    rewritesRelative: true,
    remapsThree: true,
    honoursOverride: true,
    honoursPatch: true,
    honoursAsIf: true,
    honoursAsIfMap: true,
    freshRegistration: true,
    guardSideEffect: 'HarnessFault',
    guardDoubleQuote: 'HarnessFault',
    guardDynamic: 'HarnessFault',
    guardTight: 'HarnessFault',
    guardOffStages: true,
    guardOffIsNotSilence: 'HarnessFault',
    commentSpecifierIgnored: true,
    missingDepTagged: 'HarnessFault',
    requiresScratchRoot: 'HarnessFault',
    requiresThreePath: 'HarnessFault',
    specifierSites: '["./a.js","./c.js"]',
    /* ---- D95 (QA-09) -------------------------------------------- */
    d95AcceptsFresh: '{"subjects":2,"registrations":2}',
    d95RefusesShared: 'HarnessFault',
    d95AcceptsOneSubjectTwice: '{"subjects":2,"registrations":1}',
    d95RefusesEmpty: 'HarnessFault',
    d95RefusesUrlless: 'HarnessFault',
    d95WitnessHasModuleScope: true,
    d95WitnessWritten: true,
    /* SIX, and the number is the point: the probe above stages six trees
       through this stager, so a stager that stopped recording its stagings
       reads 0 here. It is an ITERATION PIN over the probe's own work (D45),
       not a constant somebody chose. */
    d95RegistrationsRecorded: 2,
    d95RegistrationsAreDistinct: true,
    d95CleanupExists: 'function',
  });

/* QA-09. Every literal is per-subject data (D84): the shared registry drives
   the reader, it does not supply the expectation. The CLEAN rows — the empty
   strings — are half the table on purpose: a scan that started reddening
   everything fails here, not only a scan that went blind (D46). */
const AP_PROBE_EXPECTED = {
  db1: 'DB1:X',
  db2: 'DB2:X',
  db3: 'DB3:X',
  cleanSubjectRead: '',
  containerEscapePush: '',
  containerEscapeMember: '',
  containerEscapeCall: '',
  containerEscapeSelecting: '',
  readerReachesOutside: '',
  closureLiteral: true,
  closureCall: false,
  closureUnknownIdent: false,
  refusesNoSpec: 'refused',
  refusesNoData: 'refused',
  refusesBadExpected: 'refused',
  refusesNoReceivers: 'refused',
  refusesUnparseable: 'refused',
  sitesReached: 2,
  sitesZeroOnRename: 0,
  idsFromCall: '["HCLO100"]',
  idsFromLeadingToken: '["PC-1c"]',
  idsFromFixtureRow: '["PC3-24"]',
  idsDynamicPrefix: '["G7"]',
  fc1LivePrefix: 'FC1:HCLO40',
  fc2CoverageClaim: 'FC2:MQ2',
  citeCleanDefined: '',
  citeCleanNamespace: '',
  citeCleanSection: '',
  citeCleanNoClaim: '',
  fixtureIds: '[["DB-F1","DB-F2","DB-F3","DB-F4","DB-F5","DB-F6","DB-F7","DB-F8","DB-F9","DB-F10",'
    + '"DB-F11","DB-F12","DB-F13","DB-F14","DB-F15","DB-F16","DB-F17"],'
    /* +3 by CITE-TOKENS, 2026-08-26. QA-09's citation fixture table gained
       FC-F9/F10/F11 when its harvester was repaired to take a hyphenated id
       WHOLE rather than at the `\b` inside it; this census is a SET by name,
       so the three arrive here as three names rather than as a bumped count. */
    + '["FC-F1","FC-F2","FC-F3","FC-F4","FC-F5","FC-F6","FC-F7","FC-F8",'
    + '"FC-F9","FC-F10","FC-F11"]]',
};
pin('AP-P', 'assertion-provenance: literal closure, the container-escape rule, the four classes, the receiver refusals and both citation tiers',
  (i) => PROBES['assertion-provenance.mjs'](held('assertion-provenance.mjs')(i)),
  { name: 'assertion-provenance.mjs', src: SOURCE.get('assertion-provenance.mjs') }, AP_PROBE_EXPECTED);

/* ---- the two properties no in-process probe can reach (see the header) --- */
{
  const child = join(SCRATCH, 'sentinel-case.mjs');
  const run = (argv) => {
    try { return { code: 0, out: execFileSync(process.execPath, [child, ...argv], { encoding: 'utf8' }) }; } catch (e) { return { code: e.status, out: e.stdout || '' }; }
  };
  writeFileSync(child,
    `import { armSentinel } from 'file://${join(TOOLS, 'instrument-ledger.mjs')}';\n`
    + "const S = armSentinel('probe-suite', ['ledger', 'sweep']);\n"
    + "S.reach('ledger');\n"
    + "if (process.argv[2] === 'all') S.reach('sweep');\n"
    + "if (process.argv[2] !== 'natural') process.exit(0);\n");
  const missed = run(['hard']);
  const clean = run(['all']);
  const natural = run(['natural']);
  L.same('SENT-1', 'D57/D88 — a suite that exits 0 without reaching a phase is RED, not merely noisy',
    [/^FAIL probe-suite ABORTED before reporting phase "sweep" \(exit 0\)/m.test(missed.out), missed.code],
    [true, 1], `child exit ${missed.code}`);
  L.same('SENT-2', 'D46 — and the sentinel is SILENT and GREEN when every phase is reached (the control for SENT-1)',
    [/ABORTED/.test(clean.out), clean.code], [false, 0]);
  L.same('SENT-3', 'a natural end that misses a phase is red too, not only an explicit exit(0)',
    [/ABORTED/.test(natural.out), natural.code], [true, 1]);
}

/* ---- D49/D53: the five modules are the five this suite claims to cover --- */
{
  /* Every .mjs in tools/ that is not a suite is either a SHARED INSTRUMENT —
     and therefore a subject of this file — or one of these, each of which is
     a gated subject in its own right. Naming them here is what makes COV-1 a
     D49 detector rather than a hard-coded list: a NEW shared module reds it
     on the day it lands, which is the mechanism QA-07 found missing when a
     fifth registry was hand-written a few files away from the shared one. */
  const NOT_SHARED_INSTRUMENTS = {
    'browser-smoke.mjs': 'the browser harness — its own suite is tools/test-browser-harness.mjs',
    'check-cycles.mjs': 'a gate step — its own suite is tools/test-check-cycles.mjs',
    'build-static-content.mjs': 'a build step — its own suite is tools/test-static-content.mjs',
    'scroll-touch-gates.mjs': 'wired directly into test:unit; it is a suite, not a library',
    'render-report-lib.mjs': 'the render report generator, driven by tools/render-report-generate.mjs',
    'render-report-generate.mjs': 'a report entry point, not an instrument imported by suites',
    'dwell-run.mjs': 'the rest-dwell entry point (npm run test:dwell) — it launches Chrome and imports '
      + 'playwright-core, which costs 2.0 s; every DECISION it makes is in dwell-oracle.mjs, which IS a '
      + 'subject here. Nothing imports this file.',
    'run-contracts.mjs': 'the contract-chain runner (npm run check) — plumbing, not an instrument: it '
      + 'parses test:contracts and reports every red. It asserts nothing. Nothing imports this file.',
    'pose-run.mjs': 'the freeze-then-read pose entry point (npm run test:pose) — the same split for the '
      + 'same reason; every DECISION it makes is in pose-oracle.mjs, which IS a subject here. Its DRIVEN '
      + 'REGION is scanned as source by tools/test-pose-oracle.mjs. Nothing imports this file.',
    'tempo-run.mjs': 'the tempo entry point (npm run test:tempo) — the third instance of the same split, '
      + 'for the third time for the same reason; it launches Chrome, injects the virtual clock and imports '
      + 'playwright-core. Every DECISION it makes is in tempo-oracle.mjs, which IS a subject here, and whose '
      + 'PAGE-SIDE HALVES are read as source by TO-P. Nothing imports this file.',
  };
  const shared = readdirSync(TOOLS)
    .filter((f) => /\.mjs$/.test(f) && !/^(test-|verify-)/.test(f) && !NOT_SHARED_INSTRUMENTS[f])
    .sort();
  L.same('COV-1', 'D88 — every shared instrument module in tools/ is a subject of this suite',
    shared, MODULES.slice().sort(),
    'a new shared module needs a probe and mutants here, or it is a sixth unwatched implementation');
  const covered = new Set(MUTANTS.map((r) => r[1]));
  L.same('COV-2', 'D58 — every module carries at least one mutant of itself',
    MODULES.filter((m) => !covered.has(m)), []);
  L.same('COV-3', 'D45 — the mutant table is the size this order built (iteration pin)', MUTANTS.length, 135);
}

/* ---- D44 over this file's own source ----
   NOT through `auditLiteralPredicates`: that helper's SCAN_CALL constant
   hard-codes the `check(` receiver, so over an `L.same`/`pin` suite its PC-1
   census reads 0 — which is D46's failure mode wearing D46's own control.
   Measured, not assumed. This suite uses the receiver-parameterised half of
   the same module instead, and `auditLiteralPredicates` gets its positive
   control inside SF-P, over two fixture files, where the receiver matches. */
const RE_SELF = literalPredicateRe(['L.same', 'pin'], 2);
const selfHits = literalPredicateHits(readFileSync(SELF_PATH, 'utf8'), RE_SELF).hits;
L.same('QA08-X1', 'D44 — bare-literal-predicate assertions in this suite', selfHits.length, 0,
  selfHits.length ? selfHits.join('\n        ') : null);
L.same('QA08-X2', 'D46 — the control for X1: the pattern DOES fire on a bare literal and NOT on a comparison',
  [RE_SELF.test("  pin('X', 'w', true);"), RE_SELF.test("  L.same('X', 'w', n === 3, 2);")], [true, false]);

SENT.reach('ledger');
let code = L.report();

/* ==================================================================== *
 * --prove-failure — the registry sweep, over mutants of the modules.
 * ==================================================================== */
if (PROVE) {
  console.log('\n--prove-failure — every shared module, driven red by a mutant of its own shipped source');
  let out;
  try {
    out = sweep(MUTANTS.map(([tag, mod, moves, keys, [from, to]]) => M(
      PIN_ID[mod], `${tag} (${mod}) — ${moves}`, keys,
      (inp) => ({ name: mod, src: mutateText(inp.src, tag, from, to) }),
    )));
  } finally {
    SENT.reach('sweep');
  }
  L.discard();
  L.same('QA08-M1', 'D58 — mutants that did not drive their declared probe keys red', out.bad, 0);
  L.same('QA08-M2', 'D45 — every mutant ran (iteration pin)', out.total, 135);
  L.same('QA08-M3', 'D58 — registered pins carrying no mutant', out.uncovered, []);
  L.same('QA08-M4', 'D70 — harness faults raised by a guard, named separately from a failed gate', out.faults, []);
  code = L.report() || code;
  if (out.faults.length) throw new HarnessFault(out.faults.join('; '));
}

process.exit(code);
