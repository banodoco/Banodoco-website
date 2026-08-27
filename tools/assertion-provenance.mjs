/* ==================================================================== *
 * tools/assertion-provenance.mjs — QA-09.
 *
 * THE ELEVENTH SHAPE (D94): AN ASSERTION BLIND IN ITS DATA, NOT ITS
 * PREDICATE — AND THE FALSE-CITATION SWEEP THAT RIDES WITH IT.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `HCLO100` is the guard H06 wrote to close D85 in its own suite, and it
 * does not read its own suite:
 *
 *     pin('HCLO100', 'D85 (a) — no assertion in this suite anchors an
 *       extraction on a comment marker',
 *       (i) => i.anchors.filter((tok) => i.usedAnchors.includes(tok)),
 *       { anchors: COMMENT_ANCHORS, usedAnchors: [] }, [], …);
 *
 * The predicate is correct. `usedAnchors` is a HAND-WRITTEN EMPTY LITERAL,
 * so the reader is a constant: `[].filter(…)` is `[]` for every anchor list
 * anyone could ever write. The assertion claims to be a CENSUS OF THE
 * SUITE'S ANCHORS and reads nothing.
 *
 *   > The tautology is in the DATA, so `scanTautologyAst` cannot see it.
 *
 * Three instances, three dresses:
 *   · HTER103 — extracted GLSL from STRIPPED source, so the digest of
 *     nothing equalled the digest of nothing (D85);
 *   · HCLO08  — `L.same('…', 8, 8)`, labelled a D45 execution pin, reading
 *     nothing (D86);
 *   · HCLO100 — a correct predicate over a hand-written empty collection.
 *
 * Every instrument in this program reads the PREDICATE.
 * `scanTautologyAst` walks expressions; `auditLiteralPredicates` matches
 * call shapes; the mutant registry perturbs THE INPUTS A PIN DECLARES.
 * None of them asks whether the declared input was ever populated from the
 * subject. That is the question this module asks.
 *
 * THE RULE, WHICH IS D45 ONE LEVEL OVER
 * -------------------------------------
 * A reader whose value is a LITERAL, or whose collection is constructed
 * inside the assertion rather than derived from the subject, must fail on
 * CARDINALITY against the subject's own count — not merely be non-empty.
 * `HCLO100`'s empty literal is legal; an empty literal CLAIMING TO BE THE
 * SUITE'S ANCHOR CENSUS is not.
 *
 * WHAT THIS MODULE COMPUTES: LITERAL CLOSURE
 * ------------------------------------------
 * An expression is LITERALLY CLOSED when every leaf of it, after one
 * bounded walk through single-binding `const`s, is a literal. A literally
 * closed expression cannot depend on any file, any import, any parameter
 * and any call — so it CANNOT have been derived from the subject. That is
 * a sound one-way test: closed ⇒ not subject-derived. The converse does
 * not hold and is not claimed.
 *
 * FOUR CLASSES, and the tiering is the whole point, because SOME LITERALS
 * ARE LEGITIMATELY LITERAL. The difference is whether the literal claims
 * to be a census of something.
 *
 *   DB1  ASSERT-EMPTY OVER INVENTED DATA. Both sides literally closed and
 *        the expected side is EMPTY (`[]`, `{}`, `''`, `0`, `false`). The
 *        assertion asserts an ABSENCE over data it wrote itself. This is
 *        HCLO100's exact shape and it is a HIT with no judgement needed:
 *        an absence claim is only evidence if the collection came from the
 *        subject.
 *   DBP  A `--prove-failure` SITE WITH NO SUBJECT ON EITHER SIDE. A prove
 *        receiver's contract is "this assertion can be driven red by
 *        perturbing the subject". If both the good value and the corrupted
 *        value are hand-written, the site compares two literals and is
 *        evidence about nothing — D58's "poison of a double", found
 *        structurally rather than by reading.
 *   DB2  A CENSUS CLAIM IN THE PROSE over literally closed data. The
 *        assertion's own words claim something about the subject ("no
 *        assertion in this suite", "every … in the tree", a named file)
 *        and the data cannot have come from it. HIT.
 *   DB3  A SELF-CONTAINED LITERAL ASSERTION with no census claim — an
 *        iteration pin over the suite's own table, a synthetic fixture, a
 *        demo row. REVIEW, reported as an INVENTORY rather than a failure,
 *        because these are the legitimate literals and reddening them
 *        would be D59's error.
 *
 * WHAT IS OUT OF REACH, STATED PRECISELY RATHER THAN QUIETLY MISSED
 * ----------------------------------------------------------------
 * This scan is PARTLY HEURISTIC and the boundary is here, not in a footnote:
 *
 *  1. HTER103's DRESS IS UNREACHABLE. Its input WAS read off disk; the
 *     emptiness arrived at run time when a correct stripper blanked the
 *     anchor. No syntactic scan can see a slice that will be empty. The
 *     remedy for that dress is a cardinality pin beside the assertion
 *     (D85's own remedy), not this module.
 *  2. A READER THAT REACHES OUTSIDE ITS INPUT is judged by the free names
 *     in its body only. A reader calling an imported helper is treated as
 *     subject-reading even if that helper ignores its argument.
 *  3. ONE LEVEL OF CONST INDIRECTION PER STEP, depth-capped, and only for a
 *     name bound exactly once by `const`, never reassigned, never a
 *     parameter, never imported. A `let`, a destructuring pattern or a
 *     twice-bound name resolves to NOT CLOSED, which is the conservative
 *     direction: a miss, never a false red (D59).
 *  4. A CONTAINER THAT MIGHT HAVE BEEN WRITTEN INTO is not closed. `const
 *     broken = []` filled by `push()` is the assert-zero idiom, not an
 *     invented census — `scanTautologyAst`'s TA19 makes the same
 *     distinction and this module makes it the same way, by looking for
 *     mutators, member-assignment and escape into a non-assertion call.
 *     A container mutated through an ALIAS is missed. The write TARGET is
 *     read through the selecting shapes as well as through member chains —
 *     `(c ? a : b).push(x)` escapes BOTH `a` and `b` — because until this
 *     rule was widened it escaped neither, and the sweep-and-mutant block in
 *     the connect-motion proof was reported as a legitimately-literal DB3
 *     while the subject's own loop was filling it. An ARGUMENT is read as a
 *     bare identifier only, so `f(c ? a : b)` escapes nothing; that shape
 *     has no instance in this tree and is left stated rather than widened
 *     unmeasured.
 *  5. THE RECEIVER TABLE IS PER-SUBJECT DATA AND CAN ROT. A renamed ledger
 *     method silently drops a file to zero sites, which is D46's failure
 *     mode wearing this module's clothes. `sites` is returned for exactly
 *     that reason and the calling suite must pin it: a zero means the scan
 *     read the wrong receiver, NOT that the file is clean.
 *  6. NOTHING CROSS-FILE, and nothing EVALUATED. The subject is one source
 *     text and the scan never runs it.
 *  7. THE CENSUS VOCABULARY IS A HEURISTIC. DB2 is a judgement encoded as a
 *     word list; DB1 and DBP are not, and they are where the confidence is.
 *
 * D63: a file that does not parse yields NO measurement. The scans throw
 * with the cause named; callers must not convert that into a zero.
 *
 * D84 — WHAT THIS FILE RE-DERIVES, NAMED RATHER THAN QUIETLY COPIED
 * -----------------------------------------------------------------
 * `walk()` and the single-binding `const` table are private to
 * tools/self-controls.mjs (`localBindings`), which QA-09 is not allowed to
 * edit, so they are re-derived here — the SECOND implementation of each,
 * and that is a gap, not a design. The remedy is one line in a later order:
 * export them from self-controls.mjs and delete the copies below. Until
 * then the copy is held honest ADVERSARIALLY: the calling suite runs this
 * module's binding table over `scanTautologyAst`'s own T4 guard fixtures
 * (TA15, TA18, TA19) and requires the two to agree, so a divergence between
 * the two binding tables is a red rather than a silent difference of
 * opinion (D88 — a single implementation is only safe if it is
 * adversarially tested, and this one is tested against its twin).
 * ==================================================================== */

import { parse } from 'espree';
import { stripComments } from './strip-comments.mjs';

/* ==================================================================== *
 * THE PARSE CACHE, and it is a cost decision with a measurement behind it.
 *
 * Measured on this tree: espree over the 64 modules in tools/ costs 115 ms;
 * over the 106 sources under journey/ as well it costs 6,379 ms. The mutant
 * sweep re-runs the whole scan once per mutant, so an uncached scan put this
 * suite at 50-70 s in the gate — which is not a tier-1 instrument, whatever
 * it does.
 *
 * Two consequences, both deliberate:
 *   · the AST is cached by SOURCE TEXT, so a sweep that perturbs one file
 *     re-parses one file. Keyed on the text, never on a path, so a mutated
 *     source can never collide with the source it was mutated from.
 *   · `citationCandidates` does not parse AT ALL. It finds comments with the
 *     shared, length-preserving comment stripper — 73 ms over all 170 files —
 *     which is also the right tool for the job: the subject there is prose,
 *     not syntax.
 *
 * D95's lesson applies to a cache too, so it is stated: this cache is keyed
 * on the whole source text and holds no mutable state, so a stale entry is
 * impossible by construction rather than by discipline.
 * ==================================================================== */
const PARSE_CACHE = new Map();
const PARSE_CACHE_MAX = 512;

function astOf(src, who) {
  const hit = PARSE_CACHE.get(src);
  if (hit) return hit;
  let ast;
  try {
    ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module', loc: true, range: true });
  } catch (e) {
    throw new Error(`${who} REFUSES: the subject does not parse — ${e.message}`, { cause: e });
  }
  if (PARSE_CACHE.size >= PARSE_CACHE_MAX) PARSE_CACHE.clear();
  PARSE_CACHE.set(src, ast);
  return ast;
}

/* ==================================================================== *
 * The AST utilities. See the D84 note above: these are a second copy.
 * ==================================================================== */

/** Depth-first walk. `visit(node, parent)`. */
export function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const k of Object.keys(node)) {
    if (k === 'start' || k === 'end' || k === 'loc' || k === 'range' || k === 'parent'
      || k === 'tokens' || k === 'comments') continue;
    const v = node[k];
    if (Array.isArray(v)) { for (const c of v) walk(c, visit, node); } else if (v && typeof v.type === 'string') walk(v, visit, node);
  }
}

const nodeText = (src, n) => src.slice(n.start, n.end).replace(/\s+/g, ' ').trim();
const calleeText = (src, n) => (n.callee ? nodeText(src, n.callee) : '');

/** Methods that write into the receiver. A `const` bound to a container
 *  literal and reached by one of these is no longer a literal. */
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse',
  'fill', 'copyWithin', 'add', 'set', 'delete', 'clear', 'assign']);

/**
 * name -> initialiser node, for every `const NAME = expr` declared EXACTLY
 * ONCE and never reassigned, never a parameter, never imported, never
 * bound by `let`/`var`, never destructured.
 *
 * One binding per name is the whole safety argument, and it is the same
 * argument tools/self-controls.mjs makes for `localBindings`: with two
 * bindings the scan would have to resolve scope, and a scan that guesses at
 * scope reddens healthy code, which D59 says is worse than missing a shape.
 */
function singleBindingConsts(ast) {
  const count = new Map();
  const init = new Map();
  const unsafe = new Set();
  const bump = (k) => count.set(k, (count.get(k) || 0) + 1);
  const namesIn = (pattern, into) => walk(pattern, (m) => { if (m.type === 'Identifier') into.add(m.name); });

  walk(ast, (n) => {
    if (n.type === 'AssignmentExpression' && n.left && n.left.type === 'Identifier') unsafe.add(n.left.name);
    if (n.type === 'UpdateExpression' && n.argument && n.argument.type === 'Identifier') unsafe.add(n.argument.name);
    if (n.type === 'FunctionDeclaration' && n.id) unsafe.add(n.id.name);
    if (n.type === 'ClassDeclaration' && n.id) unsafe.add(n.id.name);
    if (n.type === 'ImportDeclaration') for (const s of n.specifiers || []) unsafe.add(s.local.name);
    if (/Function/.test(n.type)) for (const p of n.params || []) namesIn(p, unsafe);
    if (n.type === 'CatchClause' && n.param) namesIn(n.param, unsafe);
    if (n.type !== 'VariableDeclaration') return;
    for (const d of n.declarations || []) {
      if (!d.id || d.id.type !== 'Identifier') { namesIn(d.id, unsafe); continue; }
      if (n.kind !== 'const' || !d.init) { unsafe.add(d.id.name); continue; }
      bump(d.id.name);
      init.set(d.id.name, d.init);
    }
  });

  const out = new Map();
  for (const [name, node] of init) if (count.get(name) === 1 && !unsafe.has(name)) out.set(name, node);
  return out;
}

/**
 * The container-escape rule, and it is `scanTautologyAst`'s TA19 stated as
 * a table rather than as a guard on one comparison.
 *
 * `const broken = []` filled by `broken.push(row)` and compared against `[]`
 * is an ASSERT-ZERO over a real scan, not an invented census. So a `const`
 * whose initialiser is a container literal stops being a literal the moment
 * anything in the file could have written into it: a mutator method, an
 * assignment through a member expression, a `delete`, or the plain fact of
 * being handed to a call that is not one of the declared assertion
 * receivers (which cannot mutate, because they only read).
 */
function escapedContainers(src, ast, consts, receivers) {
  const container = new Set();
  for (const [name, node] of consts) {
    if (node.type === 'ArrayExpression' || node.type === 'ObjectExpression'
      || node.type === 'NewExpression') container.add(name);
  }
  /* EVERY container a write TARGET could be. Not one name but a set, because
     a target expression need not name its container directly:

         (law(…) === want ? stayed : moved).push(name);

     is `stayed.push` on one composition and `moved.push` on the next, and a
     walk that only descends `MemberExpression.object` bottoms out on the
     ConditionalExpression and reports NOTHING — so a container the subject's
     own loop fills reads back as the untouched `[]` it was initialised to.
     That is not the ALIAS miss stated in the header's limit 4; the identifier
     is right there in the target, one node type over.

     The selecting shapes are enumerated rather than assumed: a conditional
     and a logical both evaluate to ONE of their branches and a sequence to
     its last, so every branch is a container that MIGHT have been written
     into — and "might" is the whole test. Escaping all of them is the
     conservative direction (D59): a container wrongly escaped is a row this
     scan declines to claim, never a false red. */
  const rootNames = (n, seen = new Set()) => {
    if (!n || seen.has(n)) return [];
    seen.add(n);
    switch (n.type) {
      case 'Identifier': return [n.name];
      case 'MemberExpression': return rootNames(n.object, seen);
      case 'ChainExpression': return rootNames(n.expression, seen);
      case 'TSNonNullExpression': return rootNames(n.expression, seen);
      case 'ConditionalExpression': return [...rootNames(n.consequent, seen), ...rootNames(n.alternate, seen)];
      case 'LogicalExpression': return [...rootNames(n.left, seen), ...rootNames(n.right, seen)];
      case 'SequenceExpression': return rootNames(n.expressions[n.expressions.length - 1], seen);
      case 'AssignmentExpression': return rootNames(n.right, seen);
      default: return [];
    }
  };
  const out = new Set();
  const escape = (names) => { for (const nm of names) if (nm && container.has(nm)) out.add(nm); };
  walk(ast, (n) => {
    if (n.type === 'AssignmentExpression' && n.left && n.left.type === 'MemberExpression') escape(rootNames(n.left));
    if (n.type === 'UnaryExpression' && n.operator === 'delete') escape(rootNames(n.argument));
    if (n.type !== 'CallExpression') return;
    if (n.callee && n.callee.type === 'MemberExpression' && !n.callee.computed
      && n.callee.property.type === 'Identifier' && MUTATORS.has(n.callee.property.name)) {
      escape(rootNames(n.callee.object));
    }
    if (receivers.has(calleeText(src, n))) return;
    for (const a of n.arguments || []) {
      if (a.type === 'Identifier') escape([a.name]);
      if (a.type === 'SpreadElement' && a.argument.type === 'Identifier') escape([a.argument.name]);
    }
  });
  return out;
}

const DEPTH_CAP = 8;

/**
 * Methods that carry literalness through, so that `LIT.filter(p)` is as
 * closed as `LIT` is.
 *
 * THIS LIST EXISTS BECAUSE OF A MISS, MEASURED. QA-09's own gating proof
 * planted `HCLO100`'s species written INLINE —
 *
 *     L.same('X', 'no assertion in this suite anchors on a comment marker',
 *       COMMENT_ANCHORS.filter((t) => USED.includes(t)), []);
 *
 * — and the scan did not see it, because the actual is a CallExpression and
 * a call was `false` by construction. The pin form was caught and the inline
 * form was not: the same defect, one refactor apart. `HCLO100` happens to be
 * a pin; nothing says the next one will be.
 *
 * Only methods that cannot reach outside their receiver and arguments are
 * here. `sort` and `reverse` are deliberately absent: they WRITE to the
 * receiver, and a const they are called on is already escaped by
 * `escapedContainers` — listing them would be two rules disagreeing.
 */
const PURE_METHODS = new Set([
  'filter', 'map', 'slice', 'concat', 'join', 'includes', 'indexOf', 'lastIndexOf',
  'every', 'some', 'find', 'findIndex', 'flat', 'flatMap', 'reduce', 'reduceRight',
  'at', 'split', 'trim', 'toLowerCase', 'toUpperCase', 'replace', 'replaceAll',
  'padStart', 'padEnd', 'repeat', 'startsWith', 'endsWith', 'charAt', 'charCodeAt',
  'substring', 'toString', 'match', 'test',
]);

/**
 * Is this expression LITERALLY CLOSED — every leaf a literal, after a
 * bounded walk through single-binding consts?
 *
 * Closed ⇒ the expression cannot have been derived from any file, import,
 * parameter or call ⇒ it was not derived from the subject. The converse is
 * not claimed: an unclosed expression may still be independent of the
 * subject, and this module never says otherwise.
 */
export function literallyClosed(n, consts, seen = new Set(), depth = 0) {
  if (!n || depth > DEPTH_CAP) return false;
  const sub = (m) => literallyClosed(m, consts, seen, depth + 1);
  switch (n.type) {
    case 'Literal': return true;
    case 'TemplateLiteral': return (n.expressions || []).every(sub);
    case 'ArrayExpression':
      return (n.elements || []).every((e) => e === null || sub(e.type === 'SpreadElement' ? e.argument : e));
    case 'ObjectExpression':
      return (n.properties || []).every((p) => {
        if (p.type === 'SpreadElement') return sub(p.argument);
        if (p.computed && !sub(p.key)) return false;
        return sub(p.value);
      });
    case 'UnaryExpression': return sub(n.argument);
    case 'BinaryExpression': case 'LogicalExpression': return sub(n.left) && sub(n.right);
    case 'ConditionalExpression': return sub(n.test) && sub(n.consequent) && sub(n.alternate);
    case 'MemberExpression': return sub(n.object) && (!n.computed || sub(n.property));
    case 'CallExpression': {
      const c = n.callee;
      if (!c || c.type !== 'MemberExpression' || c.computed) return false;
      if (c.property.type !== 'Identifier' || !PURE_METHODS.has(c.property.name)) return false;
      if (!sub(c.object)) return false;
      return (n.arguments || []).every((a) => (
        (a.type === 'ArrowFunctionExpression' || a.type === 'FunctionExpression')
          ? readerIsClosed(a, consts)
          : sub(a.type === 'SpreadElement' ? a.argument : a)));
    }
    case 'Identifier': {
      if (seen.has(n.name)) return false;
      const init = consts.get(n.name);
      if (!init) return false;
      const next = new Set(seen);
      next.add(n.name);
      return literallyClosed(init, consts, next, depth + 1);
    }
    default: return false;
  }
}

/** Does this expression evaluate to an EMPTY collection / zero / false,
 *  after the same bounded const walk? DB1's other half. */
function closedEmpty(n, consts, seen = new Set(), depth = 0) {
  if (!n || depth > DEPTH_CAP) return false;
  if (n.type === 'ArrayExpression') return (n.elements || []).length === 0;
  if (n.type === 'ObjectExpression') return (n.properties || []).length === 0;
  if (n.type === 'Literal') return n.value === '' || n.value === 0 || n.value === false || n.value === null;
  if (n.type === 'Identifier' && !seen.has(n.name) && consts.has(n.name)) {
    const next = new Set(seen);
    next.add(n.name);
    return closedEmpty(consts.get(n.name), consts, next, depth + 1);
  }
  return false;
}

/**
 * A `pin`'s actual is `reader(input)`, so a pin is data-blind only if the
 * READER also reads nothing but its own argument. Every free name in the
 * body must be a parameter, a local, or itself literally closed.
 */
function readerIsClosed(fn, consts) {
  if (!fn) return false;
  if (fn.type !== 'ArrowFunctionExpression' && fn.type !== 'FunctionExpression') {
    return literallyClosed(fn, consts);
  }
  const local = new Set();
  const bind = (pattern) => walk(pattern, (m) => { if (m.type === 'Identifier') local.add(m.name); });
  for (const p of fn.params || []) bind(p);
  walk(fn.body, (m) => {
    if (m.type === 'VariableDeclarator') bind(m.id);
    if (/Function/.test(m.type)) for (const p of m.params || []) bind(p);
  });
  let closed = true;
  walk(fn.body, (m, parent) => {
    if (m.type !== 'Identifier') return;
    if (parent && parent.type === 'MemberExpression' && parent.property === m && !parent.computed) return;
    if (parent && parent.type === 'Property' && parent.key === m && !parent.computed) return;
    if (local.has(m.name)) return;
    if (literallyClosed(m, consts)) return;
    closed = false;
  });
  return closed;
}

/**
 * The census vocabulary — DB2's heuristic, written out so a reader can
 * disagree with it. A claim about THE SUBJECT: this suite, this file, the
 * tree, a named source file, or a universal/absence quantifier applied to
 * assertions, anchors, sites or files.
 */
export const CENSUS_RE = new RegExp([
  'this suite', 'this file', 'in the tree', 'tree-wide', 'anywhere',
  '\\bevery\\b[^.]{0,40}\\b(assertion|anchor|site|file|module|suite|pin|row)',
  '\\bno\\b[^.]{0,40}\\b(assertion|anchor|site|file|module|suite|pin|row)',
  '\\b[a-z0-9-]+\\.(?:js|mjs)\\b',
].join('|'), 'i');

/**
 * Receiver specs. A suite declares its OWN ledger shape, because D59 is
 * exactly this parameter: `same(id, what, actual, expected)`,
 * `same(name, value, expected, detail)` and
 * `same(area, name, value, expected, trace)` all ship in this tree, and a
 * scan that assumes one of them measures the wrong argument in the other
 * two — silently, and with a plausible-looking row.
 *
 *   { id, what, data, expected }  argument indices. `what` may be null.
 *   expected: null                a PREDICATE-shaped receiver (the data IS
 *                                 the predicate; there is no expected side).
 *   reader: n                     the data is the INPUT to the reader at
 *                                 argument n — `pin(id, what, reader,
 *                                 input, expected)`.
 *   prove: true                   a --prove-failure receiver, whose contract
 *                                 is that the compared value came from a
 *                                 perturbation OF THE SUBJECT (D58).
 */
function normaliseSpec(callee, spec) {
  if (!spec || typeof spec !== 'object') {
    throw new Error(`assertion-provenance REFUSES: receiver "${callee}" has no spec — declare `
      + '{ id, what, data, expected } with argument indices, expected: null for a predicate receiver');
  }
  if (!Number.isInteger(spec.data)) {
    throw new Error(`assertion-provenance REFUSES: receiver "${callee}" declares no \`data\` argument index`);
  }
  if (spec.expected !== null && !Number.isInteger(spec.expected)) {
    throw new Error(`assertion-provenance REFUSES: receiver "${callee}" declares \`expected\` as `
      + `${JSON.stringify(spec.expected)} — it must be an argument index, or null to state plainly `
      + 'that this receiver is predicate-shaped and has no expected side');
  }
  return spec;
}

/**
 * Scan one source text for assertions blind in their data.
 *
 * @param src        the source (RAW — espree needs real syntax).
 * @param receivers  Map from callee text to a spec (see above).
 * @returns { rows, sites } — `rows` carry `{ cls, id, line, callee, what,
 *          data, expected }`; `sites` is the number of assertion call sites
 *          the AST actually reached, WHICH IS THIS SCAN'S OWN POSITIVE
 *          CONTROL. A zero means the receivers were renamed or the file
 *          moved, NOT that the file is clean (D46).
 * @throws  on a parse failure, naming the cause (D63), and on an unreadable
 *          receiver spec.
 */
export function scanDataBlind(src, receivers) {
  const declared = receivers instanceof Map ? receivers : new Map(Object.entries(receivers || {}));
  if (!declared.size) throw new Error('scanDataBlind: receivers required');
  const specs = new Map([...declared].map(([callee, spec]) => [callee, normaliseSpec(callee, spec)]));
  const ast = astOf(src, 'scanDataBlind');
  const consts = singleBindingConsts(ast);
  for (const name of escapedContainers(src, ast, consts, specs)) consts.delete(name);

  const rows = [];
  let sites = 0;
  walk(ast, (n) => {
    if (n.type !== 'CallExpression') return;
    const callee = calleeText(src, n);
    const spec = specs.get(callee);
    if (!spec) return;
    sites++;
    const args = n.arguments || [];
    let data = args[spec.data];
    if (!data) return;
    /* `check(name, () => n === 3)` — the predicate is the arrow's body. */
    if (data.type === 'ArrowFunctionExpression' && data.body.type !== 'BlockStatement') data = data.body;

    if (!literallyClosed(data, consts)) return;
    if (spec.reader !== undefined && !readerIsClosed(args[spec.reader], consts)) return;
    const expected = spec.expected === null ? null : args[spec.expected];
    if (expected && !literallyClosed(expected, consts)) return;
    if (spec.expected !== null && !expected) return;

    const idNode = spec.id === null ? null : args[spec.id];
    const id = idNode && idNode.type === 'Literal' && typeof idNode.value === 'string'
      ? idNode.value.split(/\s{2,}|:/)[0].trim()
      : `${callee}@${n.loc.start.line}`;
    const whatNode = spec.what === null || spec.what === undefined ? null : args[spec.what];
    const what = whatNode && whatNode.type === 'Literal' && typeof whatNode.value === 'string'
      ? whatNode.value : (whatNode ? nodeText(src, whatNode) : '');

    const cls = spec.prove ? 'DBP'
      : (expected && closedEmpty(expected, consts)) ? 'DB1'
        : CENSUS_RE.test(what) ? 'DB2' : 'DB3';
    rows.push({
      cls,
      id,
      line: n.loc.start.line,
      callee,
      what,
      data: nodeText(src, data).slice(0, 120),
      expected: expected ? nodeText(src, expected).slice(0, 80) : '(predicate)',
    });
  });
  rows.sort((a, b) => a.line - b.line);
  return { rows, sites };
}

/* ==================================================================== *
 * PART 1b — RECEIVER DRIFT: IS THE DECLARATION COMPLETE? (AP-02)
 *
 * `scanDataBlind` is only as wide as the receiver map it is handed, and
 * that map is HAND-MAINTAINED by the calling suite. A suite that adopts a
 * new assertion receiver NARROWS THE SCAN SILENTLY — which is D54's "goes
 * stale in the direction that matters", inside the instrument built to find
 * data-blindness. It is not hypothetical: SUB-01 converted seventeen sites
 * onto `pin`, and until AP-01 widened the map those seventeen — the very
 * sites this program had just repaired — were UNREAD, while the file still
 * looked covered because `L.same` alone reached 46.
 *
 * The answer is HSUB70's, one file over: DERIVE the receivers from the
 * subject instead of consulting a list.
 *
 * WHAT IS DERIVABLE, AND WHAT IS NOT — because only half of it is:
 *
 *   DERIVABLE   the NAME of every callee that is handed a LEDGER-ROW LABEL
 *               (an assertion id) in argument 0 or 1. That is this function.
 *
 *   NOT DERIVABLE   the SPEC — `{ id, what, data, expected, reader, prove }`
 *               argument indices. That is D59 stated as an impossibility
 *               rather than as a hazard: `say(ok, id, what, detail)` puts the
 *               data at 0 and the id at 1; `L.same(id, what, actual, expected)`
 *               puts it at 2; `pin(id, what, reader, input, expected)` puts it
 *               at 3 AND needs `reader: 2`; `ceiling(id, what, actual, max)`
 *               is indistinguishable from `check(id, what, actual, expected)`
 *               at the call site and compares `<=`. Reading the index off the
 *               call requires resolving the helper's DEFINITION and knowing
 *               which parameter is the actual — and `prove: true` is a
 *               judgement about a CONTRACT (D58) that no source states.
 *
 *               The two `check(name, fn)` helpers in this tree settle it:
 *               tools/test-browser-harness.mjs's runs `fn()` and renders a
 *               verdict, so it IS a receiver; tools/test-chapter-contract.mjs's
 *               is `(name, fn) => CHECKS.push({ name, fn })`, a REGISTRAR
 *               whose comparisons are `assert.*` inside the body. Identical
 *               at every call site. A derivation that produced specs would
 *               have to call one of them wrong.
 *
 * So the derivation produces CANDIDATE NAMES, and the calling suite pins
 * that every one of them is adjudicated — declared with a shape, or named
 * as a non-receiver with a reason. A suite adopting a receiver then ADDS A
 * ROW rather than narrowing the scan.
 *
 * THE STATED LIMIT, and the calling suite pins it as data rather than prose:
 * a receiver whose rows carry NO id — `assert.equal(a, b)`, or a `check`
 * labelled in plain prose — is invisible here. Those are declared by hand
 * and always were; this scan does not make them worse, and it does not
 * pretend to see them.
 * ==================================================================== */

/**
 * A LEDGER-ROW LABEL. Deliberately broader than `ID_SHAPE_RE`, which serves
 * the citation sweep and must stay tight to avoid reporting prose as a
 * citation. Here the cost of a false candidate is one adjudicated row; the
 * cost of a miss is an unread receiver, so this side errs wide.
 *
 * Measured against the tree: `ID_SHAPE_RE` could not see 'GC-R1', 'C06-N1',
 * 'O1', 'B1' or 'M9.demo', and was blind to 59 of the ~110 receivers already
 * declared. This shape sees all five and cuts that to 38.
 */
export const RECEIVER_ID_RE = /^[A-Z][A-Za-z0-9]{0,11}(?:-[A-Za-z0-9]{1,6}){0,2}(?:\.[A-Za-z0-9]{1,8})?$/;

/** The label is the FIRST TOKEN of the string: `'O1 chapters are driven…'`
 *  and `'D12: awaitInteraction also tags…'` both label the row `O1`/`D12`. */
const leadToken = (s) => s.trim().split(/[\s:,]|—/)[0];

/**
 * Every callee in `src` handed a ledger-row label in argument 0 or 1.
 *
 * @returns Map from callee text to the number of such call sites.
 * @throws  on a parse failure, naming the cause (D63).
 *
 * Two narrowings, both deliberate and both fixture-pinned:
 *   · ARITY >= 2 — a one-argument call is a `console.log`, a `fault()` or a
 *     `throw`, never a comparison. Without it the candidate set is mostly
 *     logging.
 *   · a PLAIN or SINGLE-DOTTED callee — `L.same`, `q.pin`, `check`. A
 *     computed callee (`TABLE[k](…)`) cannot be keyed by name at all, and a
 *     receiver reached that way is out of reach here, as it is for
 *     `scanDataBlind` itself.
 */
export function idBearingCallees(src) {
  const ast = astOf(src, 'idBearingCallees');
  const out = new Map();
  walk(ast, (n) => {
    if (n.type !== 'CallExpression') return;
    if ((n.arguments || []).length < 2) return;
    const callee = calleeText(src, n);
    if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?$/.test(callee)) return;
    for (const a of [n.arguments[0], n.arguments[1]]) {
      if (!a || a.type !== 'Literal' || typeof a.value !== 'string') continue;
      const tok = leadToken(a.value);
      if (tok.length <= 16 && /[0-9]/.test(tok) && RECEIVER_ID_RE.test(tok)) {
        out.set(callee, (out.get(callee) || 0) + 1);
        return;
      }
    }
  });
  return out;
}

/* ==================================================================== *
 * PART 2 — THE FALSE-CITATION SWEEP.
 *
 * `HCLO100`'s header cites `HCLO40`, which does not exist anywhere but that
 * comment. `journey/ui/media.js:20` claims a pin `MQ2` that does not exist —
 * one hit tree-wide, the comment asserting it (D92).
 *
 * A COMMENT CLAIMING COVERAGE THAT DOES NOT EXIST IS WORSE THAN NO COMMENT,
 * because the next four orders import that file and read the comment as a
 * guarantee. This half is cheap and mechanical, and it had already found two
 * before it was written.
 *
 * TWO TIERS, and both need a one-line human read before they are called
 * defects — the scan produces CANDIDATES, and says so:
 *
 *   FC1  the cited token's PREFIX is a live assertion-id prefix in this tree
 *        and the full id is defined nowhere. `HCLO40` is FC1.
 *   FC2  the token sits within 60 characters of a COVERAGE CLAIM — "pinned
 *        by", "guarded by", a `tools/test-*.mjs` path — and is defined
 *        nowhere. `MQ2` is FC2: *"Pinned by tools/test-ui-lifecycle.mjs
 *        (`MQ2`)"*.
 *
 * WHAT IS OUT OF REACH HERE, TOO:
 *   · a citation of an id built at run time (`G7.${id}`) — the calling suite
 *     declares those prefixes and they are skipped wholesale;
 *   · TENSE. "the previous revision's HTEN72b" is an honest reference to a
 *     retired id and reads identically to a false claim. The scan reports
 *     it; a human retires it.
 *   · vocabularies that are shaped like assertion ids and are not — order
 *     names (QA-05), defect ids (DEF-04), decisions (D45), design-contract
 *     obligations (HB11, DI-1). These are DECLARED BY THE CALLING SUITE as
 *     namespaces, with a reason each, so a NEW namespace lands as a red row
 *     rather than as silence.
 * ==================================================================== */

/**
 * An assertion id: a capitalised stem, an optional CAPITALISED MIDDLE
 * SEGMENT, an optional dash, a number, an optional range tail and an
 * optional letter suffix.
 *
 * THE MIDDLE SEGMENT, added 2026-08-26 by CITE-TOKENS, is the DEFINITION half of a
 * defect whose visible half was in the tokenizer. This tree has 48 ids of
 * the three-segment shape `DW-EVT-2`, `PV-EXCL-1`, `MUT-WALL-2` — a stem, a
 * WORD, a number — and this shape could see none of them. That had two
 * consequences and they were the same defect twice:
 *
 *   · on the DEFINITION side, `collectAssertionIds` did not collect them, so
 *     a live id was absent from the world;
 *   · on the CITATION side, the harvester's `\b` cut at the hyphen and
 *     offered the TAIL — `EVT-2` — which is a legal two-segment id defined
 *     nowhere, so a correct citation of a real guard was reported as a
 *     citation of a guard that does not exist.
 *
 * Both halves must move together or the fix is a silencer: harvest
 * `DW-EVT-2` whole while the shape still cannot DEFINE it and the citation
 * merely changes its false tier. The two sides read the SAME regex, and that
 * is the invariant — this constant is the one place the shape is written.
 *
 * The middle segment is `[A-Z][A-Za-z]{1,7}` — a capitalised WORD, TWO
 * LETTERS OR MORE, and both bounds are load-bearing rather than tuned:
 *
 *   · not `[A-Za-z0-9]+`, which would swallow `T1-T3-equivalent` and every
 *     hyphenated phrase that happens to start with a capital;
 *   · not a SINGLE letter, because `X-Ln` is a different family that this
 *     shape has never claimed and must not start claiming. `DB-F1`, `FC-F1`,
 *     `UIL-T8` are fixture-row and retired-guard labels whose second segment
 *     is a letter and a number; admitting them makes `DB` and `FC` live
 *     PREFIXES, and the scan's own class names — DB1, DB2, DB3, FC1, FC2,
 *     written as prose in five suites — become FC1 citations of guards that
 *     never existed. Measured: fifteen such rows, every one of them noise.
 *     The word-vs-letter line is where the two families actually part.
 *
 * Ids outside the shape — `PV-RAIL-R1`, `DW-ANCHORS-LIT` (no number at all)
 * — remain unseen, which is the conservative direction on BOTH sides at
 * once: unseen on the definition side is a citation this scan declines to
 * judge, and unseen on the citation side is a miss, never a false red
 * (D59).
 */
export const ID_SHAPE_RE = /^[A-Z][A-Za-z]{0,7}(?:-[A-Z][A-Za-z]{1,7})?-?[0-9]{1,3}(?:-[0-9]{1,3})?[a-z]?$/;

/**
 * The comments in a source text, WITHOUT PARSING IT.
 *
 * D84 in its cheapest form: tools/strip-comments.mjs is the one shared,
 * string-aware, regex-literal-aware, template-interpolation-aware stripper,
 * and its first stated invariant is that it is LENGTH-PRESERVING — it blanks
 * a comment to spaces and keeps its newlines. So the comments of a file are
 * exactly the positions where the stripped text differs from the raw one,
 * and finding them costs a string walk instead of a parse. Measured: 73 ms
 * over all 170 sources, against 6,379 ms to parse them.
 *
 * `blankStrings` is OFF, so a comment marker inside a string literal is not
 * a comment here — which is the same choice `stage-tree.mjs` makes for the
 * same reason.
 *
 * Consecutive differing LINES are merged into one block, so a block comment
 * stays one block and the 60-character proximity rule for a coverage claim
 * reads the sentence rather than the line. Two adjacent `//` lines merge too;
 * that is a deliberate over-merge, because a claim split across two line
 * comments is still one claim.
 *
 * @returns {Array<{value: string, line: number}>}
 */
export function commentBlocks(src) {
  const stripped = stripComments(src);
  if (stripped.length !== src.length) {
    throw new Error('commentBlocks REFUSES: the comment stripper was not length-preserving on this '
      + 'input, so a stripped-text offset no longer addresses the raw byte (S-3 invariant 1)');
  }
  const rawLines = src.split('\n');
  const outLines = stripped.split('\n');
  const blocks = [];
  let cur = null;
  for (let i = 0; i < rawLines.length; i++) {
    const a = rawLines[i];
    const b = outLines[i];
    if (a === b) { cur = null; continue; }
    let lo = 0;
    while (lo < a.length && a[lo] === b[lo]) lo++;
    let hi = a.length;
    while (hi > lo && a[hi - 1] === b[hi - 1]) hi--;
    const text = a.slice(lo, hi);
    if (cur) cur.value += `\n${text}`;
    else { cur = { value: text, line: i + 1 }; blocks.push(cur); }
  }
  return blocks;
}

/**
 * Every assertion id DEFINED in one source text, plus the static prefixes of
 * ids assembled from template literals.
 *
 * An id is defined when it is the first argument of a call (`L.same('X', …)`,
 * `M('HTEN26', …)`, `prove('HSUB5', …)`), the leading token of that argument
 * (`L.check('PC-1c  …and a real tautology…', …)`), the second argument of an
 * `(area, name, …)` ledger, or the first element of a fixture-table row
 * (`['PC3-24', 'CLEAN: …', …]`).
 */
export function collectAssertionIds(src) {
  const ast = astOf(src, 'collectAssertionIds');
  const ids = new Set();
  const dynamicPrefixes = new Set();
  const take = (value) => {
    if (typeof value !== 'string') return;
    if (ID_SHAPE_RE.test(value)) ids.add(value);
    const head = value.split(/[\s:]/)[0];
    if (ID_SHAPE_RE.test(head)) ids.add(head);
  };
  walk(ast, (n) => {
    if (n.type === 'ArrayExpression' && (n.elements || []).length >= 2
      && n.elements[0] && n.elements[0].type === 'Literal') take(n.elements[0].value);
    if (n.type !== 'CallExpression') return;
    const args = n.arguments || [];
    if (args[0] && args[0].type === 'Literal') take(args[0].value);
    if (args[0] && args[0].type === 'TemplateLiteral' && args[0].quasis[0]) {
      const m = args[0].quasis[0].value.raw.match(/^[A-Za-z][A-Za-z0-9]*/);
      if (m) dynamicPrefixes.add(m[0]);
    }
    if (args[1] && args[1].type === 'Literal') take(args[1].value);
  });
  return { ids: [...ids].sort(), dynamicPrefixes: [...dynamicPrefixes].sort() };
}

/** Phrases that turn a mention into a coverage CLAIM. */
export const COVERAGE_CLAIM_RE = /pinned by|asserted by|covered by|proved by|checked by|guard(?:ed|s)?(?: by)?|tools\/(?:test|verify)-[a-z0-9-]+\.mjs/i;

/**
 * Candidate false citations in one source text's COMMENTS.
 *
 * @param src         the source.
 * @param world       { defined: Set|Array of ids, prefixes: Set|Array of live
 *                    id prefixes, dynamicPrefixes, namespaces: Set|Array of
 *                    stem strings that are NOT assertion-id namespaces }.
 * @returns rows `{ tier, line, token, comment }`.
 */
export function citationCandidates(src, world) {
  const defined = world.defined instanceof Set ? world.defined : new Set(world.defined || []);
  const prefixes = world.prefixes instanceof Set ? world.prefixes : new Set(world.prefixes || []);
  const dynamic = world.dynamicPrefixes instanceof Set ? world.dynamicPrefixes : new Set(world.dynamicPrefixes || []);
  const namespaces = world.namespaces instanceof Set ? world.namespaces : new Set(world.namespaces || []);
  const definedList = [...defined];

  /* `PC-2` is not a false citation when `PC-2a` and `PC-2b` exist: it names
     the FAMILY. Same for the range form `HCLO60-65`. */
  const isFamilyStem = (tok) => definedList.some((d) => d !== tok && d.startsWith(tok)
    && /^[A-Za-z0-9.]/.test(d.slice(tok.length)));
  const isRange = (tok) => {
    const m = tok.match(/^([A-Z][A-Za-z]{0,7}-?)([0-9]{1,3})-([0-9]{1,3})$/);
    return !!m && defined.has(m[1] + m[2]) && defined.has(m[1] + m[3]);
  };

  const rows = [];
  /* THE HARVEST UNIT IS THE WHOLE HYPHENATED WORD, and that is the fix to a
     defect this tokenizer carried at 48 sites.

     It used to read `\b<id-shape>\b`, which asks the regex engine to find the
     shape ANYWHERE a word boundary allows. `-` is not a word character, so
     `\b` sits INSIDE every hyphenated id — and in `DW-EVT-2` the engine could
     not match from `DW` (no digits follow the stem) but could match from the
     MIDDLE SEGMENT onward, harvesting a TAIL that is itself a perfectly legal
     two-segment id shape — and one defined nowhere in the tree. So a correct
     citation of a real guard was reported as a citation of a guard that does
     not exist. (The tail is not spelled out here: writing it would make this
     comment the very thing it describes, and the mask that would then be
     needed is a silencing this repair does not have to buy.) Every three-segment id here
     — `DW-EVT-1`…`DW-EVT-5`, `DW-DUAL-1`, `PV-EXCL-1`, forty more — could be
     cut the same way; this one merely happened to sit within 60 characters of
     a `tools/test-*.mjs` path and so tripped FC2 rather than passing unseen.

     So the token is now delimited by SHAPE, not by `\b`: a run that begins at
     a capital and continues across every hyphen-joined alphanumeric segment,
     with a lookbehind and lookahead that refuse to start or stop in the
     middle of such a run. `DW-EVT-2` therefore yields exactly `DW-EVT-2`, and
     `ID_SHAPE_RE` — the same shape the DEFINITION side collects with — then
     judges the whole token. A hyphenated word that is not an id shape
     (`Copy-with-provenance`, `T1-T3-equivalent`) yields NOTHING rather than
     an interior fragment.

     This is keyed to token shape and nowhere names an id or a prefix, so it
     moves with the tree rather than with a list somebody has to maintain.
     Pinned by FC-F9/FC-F10/FC-F11 below and by the AP7 mutant. */
  const token = /`?(?<![-\w])([A-Z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*)(?![-\w])`?/g;
  for (const c of commentBlocks(src)) {
    const text = c.value;
    const seen = new Set();
    for (const m of text.matchAll(token)) {
      const tok = m[1];
      if (seen.has(tok)) continue;
      seen.add(tok);
      if (!ID_SHAPE_RE.test(tok)) continue;
      /* `PS-5.2` is a design-document SECTION reference, not an id. */
      if (/^\.[0-9]/.test(text.slice(m.index + m[0].length))) continue;
      if (defined.has(tok) || isFamilyStem(tok) || isRange(tok)) continue;
      const stem = tok.match(/^[A-Za-z]+/)[0];
      if (namespaces.has(stem) || dynamic.has(stem)) continue;
      const livePrefix = prefixes.has(stem) && stem.length >= 2;
      let claim = false;
      for (const cm of text.matchAll(new RegExp(COVERAGE_CLAIM_RE.source, 'gi'))) {
        if (Math.abs(cm.index - m.index) <= 60) { claim = true; break; }
      }
      if (!livePrefix && !claim) continue;
      rows.push({
        tier: livePrefix ? 'FC1' : 'FC2',
        line: c.line,
        token: tok,
        comment: text.replace(/\s+/g, ' ').trim().slice(0, 160),
      });
    }
  }
  return rows;
}

/* ==================================================================== *
 * THE D46 POSITIVE CONTROLS.
 *
 * An assert-zero scan that has gone blind returns zero, which is the passing
 * answer. Both scans above therefore ship with a table of shapes they MUST
 * see and shapes they MUST NOT, so the calling suite pins the SET of
 * behaviours rather than a bare count. Row DB-F1 is HCLO100's exact form,
 * reduced; row FC-F1 is HCLO40's; row FC-F3 is MQ2's.
 * ==================================================================== */

/** [id, what, source, expected classes in line order] */
export const DATA_BLIND_FIXTURES = [
  ['DB-F1', 'HCLO100: a correct predicate over a hand-written empty collection',
    "const A = ['/*', '//'];\npin('X', 'no assertion in this suite anchors on a comment marker',\n"
    + "  (i) => i.anchors.filter((t) => i.used.includes(t)), { anchors: A, used: [] }, []);", ['DB1']],
  ['DB-F2', 'HCLO08: an execution pin reading nothing',
    "L.same('X', 'every candidate name is declared in clones-materials.js', 8, 8);", ['DB2']],
  ['DB-F3', 'CLEAN: the same pin once its input is read off the subject',
    "const A = ['/*', '//'];\npin('X', 'no assertion in this suite anchors on a comment marker',\n"
    + '  (i) => i.anchors.filter((t) => i.used.includes(t)),\n'
    + '  { anchors: A, used: anchorsUsedIn(read(SELF)) }, []);', []],
  ['DB-F4', 'CLEAN: TA19 — a const container mutated in place, compared against its empty literal',
    "const broken = [];\nrows.forEach((r) => broken.push(r));\nL.same('X', 'no row failed', broken, []);", []],
  ['DB-F5', 'CLEAN: a real reading of the subject compared against a literal',
    "L.same('X', 'the file has eight export sites', countExports(SRC), 8);", []],
  ['DB-F6', 'DBP: a prove-failure site with a hand-written good value AND a hand-written corruption',
    "prove('X', 'buildSubstrate arity', ['function', 1], ['function', 2]);", ['DBP']],
  ['DB-F7', 'CLEAN: the same prove once the corruption is produced by mutating the subject',
    "prove('X', 'export surface', ['a', 'b'], exportsOf(mutate(SRC, 'exports', EDIT)));", []],
  ['DB-F8', 'DB3: an iteration pin over the suite\'s own hand-written table — literal, and legitimately so',
    "const T = [['a'], ['b'], ['c']];\nL.same('X', 'the table is the size this order built', T.length, 3);", ['DB3']],
  ['DB-F9', 'CLEAN: a predicate receiver whose predicate reads the subject',
    "L.check('X', 'the rail is focusable', rail.tabIndex === 0, rail.tabIndex);", []],
  ['DB-F10', 'DB1 through a predicate receiver: the predicate is a constant and the claim is an absence',
    "const USED = [];\nL.check('X', 'no anchor in this file is a comment marker', USED.length === 0, USED);", ['DB2']],
  /* The TWO GUARDS whose absence would redden healthy suites — measured
     live during development, exactly as scanTautologyAst's TA18/TA19 were. */
  ['DB-F11', 'CLEAN: a container filled by member assignment is not a literal',
    "const BUILDS = {};\nBUILDS.live = build();\npin('X', 'the live counts', (i) => i.counts, BUILDS.live, [1272, 53]);", []],
  ['DB-F12', 'CLEAN: a const handed to a non-assertion call may have been written into',
    "const rows = [];\ncollectInto(rows);\nL.same('X', 'no row failed', rows, []);", []],
  /* The MISS this scan's own gating proof found. See PURE_METHODS. */
  ['DB-F13', 'DB1 written INLINE rather than through a pin — the same species as HCLO100, one refactor away',
    "const A = ['/*'];\nconst USED = [];\nL.same('X', 'no assertion in this suite anchors on a comment marker',\n"
    + '  A.filter((t) => USED.includes(t)), []);', ['DB1']],
  ['DB-F14', 'CLEAN: the same inline shape once the collection it filters against is read off the subject',
    "const A = ['/*'];\nL.same('X', 'no assertion in this suite anchors on a comment marker',\n"
    + '  A.filter((t) => anchorsUsedIn(read(SELF)).includes(t)), []);', []],
  ['DB-F15', 'CLEAN: an IMPURE method on a literal is not carried through — the receiver is escaped, and the two rules must not disagree',
    "const A = ['b', 'a'];\nA.sort();\nL.same('X', 'the sorted anchors', A, ['a', 'b']);", []],
  /* The MISS this order found in a shipped suite, and its twin. DB-F16 is
     DB-F4 with the write TARGET spelled as a conditional instead of a bare
     name — the loop fills the container just the same, and the scan read it
     back as an untouched literal. DB-F17 is DB-F16 with the write DELETED,
     and it must still be a row: the widening had to stop escaping a shape it
     could not see, not start escaping every container in sight. */
  ['DB-F16', 'CLEAN: TA19 with the write target a conditional — the loop fills it, so it is no literal',
    'const hit = [], missed = [];\nrows.forEach((r) => (r.ok ? hit : missed).push(r));\n'
    + "L.same('X', 'the mutant split the table', hit.length > 0, true);", []],
  ['DB-F17', 'DB3: the CONTROL for DB-F16 — the same assertion with nothing writing to the container is literal again',
    'const hit = [], missed = [];\n'
    + "L.same('X', 'the mutant split the table', hit.length > 0, true);", ['DB3']],
];

/** [id, what, source, expected tiers in order] — the world is supplied by
 *  the calling suite so these rows test the SCAN, not the tree. */
export const CITATION_FIXTURES = [
  ['FC-F1', 'HCLO40: an id cited in a header whose prefix is live and whose id is not defined',
    '/* HCLO40 is the guard that says so and it fails on CARDINALITY. */\nconst x = 1;\n', ['FC1']],
  ['FC-F2', 'CLEAN: the same sentence citing an id that IS defined',
    '/* HCLO100 is the guard that says so and it fails on CARDINALITY. */\nconst x = 1;\n', []],
  ['FC-F3', 'MQ2: a coverage claim in production prose, naming a suite and an id that does not exist',
    '/* Pinned by tools/test-ui-lifecycle.mjs (`MQ2`). */\nconst x = 1;\n', ['FC2']],
  ['FC-F4', 'CLEAN: a declared non-assertion namespace is not a citation',
    '/* byte equality is NOT claimed. HB6/HB11 are open. */\nconst x = 1;\n', []],
  ['FC-F5', 'CLEAN: a family stem whose members are defined',
    '/* PC-2 is the files-read pin: INPUTS, not matches. */\nconst x = 1;\n', []],
  ['FC-F6', 'CLEAN: a range whose endpoints are defined',
    '/* shown sensitive by six positive controls (HCLO60-65). */\nconst x = 1;\n', []],
  ['FC-F7', 'CLEAN: a section reference, not an id',
    '/* built by this module (PL-2.1 / HCLO-5.2). */\nconst x = 1;\n', []],
  ['FC-F8', 'CLEAN: a bare mention with no live prefix and no coverage claim',
    '/* the ZZ9 case is handled elsewhere. */\nconst x = 1;\n', []],
  /* THE THREE ROWS CITE-TOKENS FORCED, 2026-08-26. The harvester used to be
     `\b<id-shape>\b`, and `\b` sits inside every hyphenated id — so a
     three-segment id offered its TAIL as a token and the scan reported a
     correct citation of a real guard as a citation of a guard that does not
     exist. All three of these rows are RED against that harvester, and the
     first is the live instance reduced: tools/test-pose-oracle.mjs cites a
     three-segment id that IS defined in tools/test-dwell-oracle.mjs, and it
     was the tail of that id — defined nowhere — that landed in the manifest.
     The fixture sources below carry the tokens; they are STRINGS, which this
     sweep does not read, so the rows state the shape without becoming
     instances of it. */
  ['FC-F9', 'CLEAN: a three-segment id that IS defined, cited beside a coverage claim — the live instance reduced. A `\\b`-delimited harvester yields the tail here and reports FC2',
    '/* the count is the incidental part. Its twin is HCLO-EVT-2 in\n'
    + '   tools/test-dwell-oracle.mjs, which pins the same number. */\nconst x = 1;\n', []],
  ['FC-F10', 'FC1: the SAME shape with the id defined NOWHERE is still reported, and reported WHOLE — the direction in which harvesting whole must not become a silencer',
    '/* HCLO-EVT-9 is the guard that says so and it fails on CARDINALITY. */\nconst x = 1;\n', ['FC1']],
  ['FC-F11', 'CLEAN: a hyphenated label whose WHOLE is not an id shape yields nothing, not its id-shaped tail — the harvester never starts in the middle of a run',
    '/* Pinned by tools/test-x.mjs — the DW-ROAD-EVT-2 capture label is not an id. */\nconst x = 1;\n', []],
];

/** [id, why, source, the callee names `idBearingCallees` must return].
 *
 *  Five rows FIND a receiver and three deliberately DO NOT — including
 *  RD-F5, which is this scan's stated limit written as a fixture rather than
 *  as prose, so the limit moves with the code (AP13's discipline). */
export const RECEIVER_DRIFT_FIXTURES = [
  ['RD-F1', 'the ordinary ledger shape: the label is argument 0',
    "L.same('HX1', 'the export surface', exportsOf(SRC), ['a']);", ['L.same']],
  ['RD-F2', 'an AREA-first ledger: the label is argument 1, and ID_SHAPE_RE could not see it',
    "L.same('O', 'O1 chapters are driven one at a time', driven, ['a']);", ['L.same']],
  ['RD-F3', 'a DASHED label, which ID_SHAPE_RE could not see either',
    "check('GC-R1', 'a typed refusal, never an empty chain', got, want);", ['check']],
  ['RD-F4', 'a DOTTED receiver and a DOTTED label',
    "q.pin('C06-N1', 'the pristine bytes build', reader, RIG, ['M9.demo']);", ['q.pin']],
  ['RD-F5', 'THE STATED LIMIT: a receiver whose rows carry no label is invisible here',
    "check('all 8 stable scenario ids are registered exactly once', () => { run(); });\n"
    + 'assert.equal(a, b);', []],
  ['RD-F6', 'a one-argument call is logging, never a comparison (the arity floor)',
    "console.log('D46 — the scan read a real corpus');", []],
  ['RD-F7', 'a COMPUTED callee cannot be keyed by name, here or in scanDataBlind',
    "TABLE['x']('HX1', 'what', got, want);", []],
  ['RD-F8', 'a label-shaped literal in argument 2 is NOT a label — only 0 and 1 are read',
    "emit(source, target, 'HX1', 'what');", []],
];
