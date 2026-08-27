/* ==================================================================== *
 * tools/trace/module-census.mjs — G1 and G2, the shape half of
 * acceptance restated at MODULE granularity (replan Amendment 2).
 *
 * WHY THIS FILE REPLACES A NUMBER RATHER THAN TIGHTENING ONE.
 *
 * `census.mjs` grades a factory by counting the distinct direct-child
 * functions that touch each of its `let`s. That was a proxy for a module
 * boundary that did not exist yet. Once U03 created the real modules the
 * proxy inverted: the inner functions of `card-tier.js` are no longer
 * prospective owners competing for a variable, they ARE the owner's
 * implementation, and thirteen of them reading `cardIsOpen` is a state
 * machine working. The only way to score zero on that metric without
 * deleting behaviour is to hide the reads behind a `const` state object —
 * the exact move the census was built to refuse. A metric whose perfect
 * score is reachable only by the gaming it prohibits is not a metric.
 *
 * So: READERS ARE NOT GATED HERE, ANYWHERE, EVER. They are counted and
 * printed because they are informative, and no threshold is applied to
 * them. What is gated is who may WRITE, and across which boundary.
 *
 *   G1  cross-module mutable coupling, must be 0.
 *       (a) every assignment target resolves to a binding declared in the
 *           SAME module. An assignment to an imported name, or to a name
 *           that resolves nowhere, is cross-module coupling.
 *       (b) OBJECT ESCAPE. An object or array literal that receives
 *           property-writes in two modules is a shared mutable binding
 *           wearing a `const`. This is the anti-gaming rule and it is
 *           what makes (a) worth having: without it, `const state = {}`
 *           passed between two modules scores a perfect zero.
 *
 *   G2  per mutable binding: write sites <= 2, OR every write inside one
 *       named, NON-TRIVIAL transition function.
 *       TRIVIAL-SETTER TRANSPARENCY: a function whose entire body is one
 *       bare assignment is INLINED — its callers become the write sites.
 *       A bare `set(v){ x = v; }` with thirteen callers scores thirteen.
 *       A transition that validates, sequences or enforces legality
 *       scores one, and that difference is the whole point.
 *
 * HOW (b) IS ACTUALLY DECIDED, stated plainly because an approximation
 * sold as a proof is worse than no rule. Identity is propagated over a
 * small parse-built flow graph and iterated to a fixed point:
 *
 *   literal            `const s = {}`            -> s holds that literal
 *   alias              `const t = s`             -> t holds what s holds
 *   import             `import { s } from './m'` -> s holds m's s
 *   return             `const t = f()`           -> t holds what f returns
 *   argument           `f(s)` where f's param is a plain identifier
 *                                                -> that param holds s
 *   member call        `obj.m(s)` where obj holds a literal carrying `m`
 *                                                -> same as argument
 *
 * DESTRUCTURED PARAMETERS DELIBERATELY DO NOT PROPAGATE. `createCardTier({
 * shell, owner })` never binds the argument object to a name inside the
 * callee, so the callee cannot property-write it; only its members flow,
 * and they flow as their own identities. That is not a gap, it is the
 * reason the repo's factory-options idiom is not cross-module coupling.
 *
 * WHAT IT DOES NOT SEE, so nobody mistakes silence for proof: identity
 * through arrays and object members (`bag.items[0].x = 1`), through
 * `this`, through dynamic dispatch on a computed name, and through any
 * module outside the parsed world. Property-writes on objects that never
 * originate in a literal here — DOM nodes, `Map`s, imports from outside
 * the world — are not identity-tracked and are not counted, which is the
 * rule as written: it is about object and array LITERALS.
 * ==================================================================== */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve as rp, relative, join } from 'node:path';
import * as espree from 'espree';
import { walk, scopes, isReference } from './census.mjs';

const PARSE = { ecmaVersion: 'latest', sourceType: 'module', range: true, loc: true };
const FN = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const LIT = new Set(['ObjectExpression', 'ArrayExpression']);
/* Array methods that mutate the receiver. `Object.assign(x, …)` is handled
 * separately because its receiver is an argument, not the callee's object. */
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort',
  'reverse', 'fill', 'copyWithin']);

/* ------------------------------------------------------------------ *
 * Module loading                                                      *
 * ------------------------------------------------------------------ */

export function load(abs, root) {
  const src = readFileSync(abs, 'utf8');
  const ast = espree.parse(src, PARSE);
  const m = {
    abs, root, rel: relative(root, abs), src, ast, sc: scopes(ast),
    imports: new Map(), exports: new Map(), initOf: new Map(), fnName: new Map(),
    line: (o) => src.slice(0, o).split('\n').length,
  };
  walk(ast, (n) => {
    if (n.type === 'ImportDeclaration') {
      for (const s of n.specifiers) {
        m.imports.set(s.local.name, {
          from: n.source.value,
          name: s.type === 'ImportSpecifier' ? s.imported.name
            : s.type === 'ImportDefaultSpecifier' ? 'default' : '*',
        });
      }
    } else if (n.type === 'ExportNamedDeclaration') {
      const d = n.declaration;
      if (d && d.type === 'VariableDeclaration') {
        for (const v of d.declarations) if (v.id.type === 'Identifier') m.exports.set(v.id.name, v.id.name);
      } else if (d && d.id) m.exports.set(d.id.name, d.id.name);
      for (const s of n.specifiers || []) m.exports.set(s.exported.name, s.local.name);
    } else if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') {
      m.initOf.set(n.id.range[0], n.init);
      if (n.init && FN.has(n.init.type)) m.fnName.set(n.init, n.id.name);
    } else if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) {
      m.initOf.set(n.id.range[0], n);
      m.fnName.set(n, n.id.name);
    } else if (n.type === 'Property' && !n.computed && n.key.type === 'Identifier' && FN.has(n.value.type)) {
      m.fnName.set(n.value, n.key.name);
    }
  });
  return m;
}

/** The AST walk that carries the lexical scope down with it, so every
 *  identifier can be resolved where it stands rather than by a range search. */
export function scopedWalk(m, visit) {
  (function go(node, parent, scope) {
    if (!node || typeof node.type !== 'string') return;
    const here = m.sc.byNode.get(node) || scope;
    visit(node, parent, here);
    for (const k of espree.VisitorKeys[node.type] || []) {
      const v = node[k];
      if (Array.isArray(v)) { for (const c of v) go(c, node, here); } else go(v, node, here);
    }
  }(m.ast, null, m.sc.root));
}

/** Resolve `name` from `scope`, following one import hop into the world.
 *  Returns { m, d } for a real declaration, { external } for a name that
 *  leaves the parsed world, or { } for a free identifier. */
function resolveRef(m, name, scope, world) {
  for (let s = scope; s; s = s.parent) { const d = s.decls.get(name); if (d) return { m, d, scope: s }; }
  const im = m.imports.get(name);
  if (!im) return {};
  if (!im.from.startsWith('.')) return { external: im };
  const tm = world.get(rp(dirname(m.abs), im.from));
  if (!tm) return { external: im };
  const local = tm.exports.get(im.name) || im.name;
  const d = tm.sc.root.decls.get(local);
  return d ? { m: tm, d, scope: tm.sc.root } : { external: im };
}

const bindKey = (m, d) => `bind:${m.rel}#${d.id.range[0]}`;
const litKey = (m, n) => `lit:${m.rel}#${n.range[0]}`;
const retKey = (m, fn) => `ret:${m.rel}#${fn.range[0]}`;

/** The function node a resolved name denotes, if it denotes one. */
function fnNodeOf(r) {
  if (!r || !r.d) return null;
  const init = r.m.initOf.get(r.d.id.range[0]);
  if (init && FN.has(init.type)) return init;
  return null;
}

/* ------------------------------------------------------------------ *
 * The identity flow graph — rule (b)'s engine                         *
 * ------------------------------------------------------------------ */

function buildFlow(world) {
  const sets = new Map();                 // slot key -> Set(literal key)
  const edges = new Map();                // "from|to" -> [fromKey, toKey]
  const litAt = new Map();                // literal key -> { m, node }
  const add = (k, v) => { if (!sets.has(k)) sets.set(k, new Set()); sets.get(k).add(v); };
  const edge = (a, b) => edges.set(`${a}|${b}`, [a, b]);

  /** The identity slot(s) an expression denotes, seeding literals as it goes. */
  const idOf = (m, e, scope) => {
    if (!e) return [];
    if (LIT.has(e.type)) { const k = litKey(m, e); litAt.set(k, { m, node: e }); add(k, k); return [k]; }
    if (e.type === 'Identifier') {
      const r = resolveRef(m, e.name, scope, world);
      return r.d ? [bindKey(r.m, r.d)] : [];
    }
    if (e.type === 'CallExpression') {
      const fn = calleeFn(m, e, scope, world);
      return fn ? [retKey(fn.m, fn.node)] : [];
    }
    if (e.type === 'AssignmentExpression') return idOf(m, e.right, scope);
    if (e.type === 'LogicalExpression') return [...idOf(m, e.left, scope), ...idOf(m, e.right, scope)];
    if (e.type === 'ConditionalExpression') return [...idOf(m, e.consequent, scope), ...idOf(m, e.alternate, scope)];
    return [];
  };

  /** `f(…)` or `obj.method(…)` resolved to the function that will run. The
   *  member form is how one module calls into another's returned interface,
   *  so leaving it out would hide the repo's main inter-module call shape. */
  const calleeFn = (m, call, scope, world2 = world) => {
    const c = call.callee;
    if (c.type === 'Identifier') {
      const r = resolveRef(m, c.name, scope, world2);
      const node = fnNodeOf(r);
      return node ? { m: r.m, node } : null;
    }
    if (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier'
      && c.object.type === 'Identifier') {
      for (const slot of idOf(m, c.object, scope)) {
        for (const lk of sets.get(slot) || []) {
          const at = litAt.get(lk);
          if (!at || at.node.type !== 'ObjectExpression') continue;
          for (const p of at.node.properties) {
            if (p.type !== 'Property' || p.computed || p.key.name !== c.property.name) continue;
            if (FN.has(p.value.type)) return { m: at.m, node: p.value };
            if (p.value.type === 'Identifier') {
              const r = resolveRef(at.m, p.value.name, at.m.sc.byNode.get(at.node) || at.m.sc.root, world2);
              const node = fnNodeOf(r);
              if (node) return { m: r.m, node };
            }
          }
        }
      }
    }
    return null;
  };

  /* Pass 1: seed literals and declaration edges. Two rounds, because a
   * member-call callee can only be resolved once the receiver's literal is
   * known, and that is itself learned by pass 1. */
  for (let round = 0; round < 2; round++) {
    for (const m of world.values()) {
      scopedWalk(m, (n, parent, scope) => {
        if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.init) {
          for (const s of idOf(m, n.init, scope)) edge(s, `bind:${m.rel}#${n.id.range[0]}`);
        } else if (n.type === 'ReturnStatement' && n.argument) {
          let fn = null;
          for (let s = scope; s; s = s.parent) if (s.kind === 'fn' && FN.has(s.node.type)) { fn = s.node; break; }
          if (fn) for (const s of idOf(m, n.argument, scope)) edge(s, retKey(m, fn));
        } else if (n.type === 'ArrowFunctionExpression' && n.body && LIT.has(n.body.type)) {
          for (const s of idOf(m, n.body, scope)) edge(s, retKey(m, n));
        } else if (n.type === 'CallExpression') {
          const fn = calleeFn(m, n, scope);
          if (!fn) return;
          n.arguments.forEach((a, i) => {
            const p = fn.node.params[i];
            if (!p) return;
            if (p.type === 'Identifier') {
              for (const s of idOf(m, a, scope)) edge(s, `bind:${fn.m.rel}#${p.range[0]}`);
              return;
            }
            /* The factory-options idiom. The OPTIONS OBJECT does not flow —
             * the callee never binds it to a name, so it cannot property-write
             * it — but each MEMBER does, landing in the destructured param
             * that names it. Without this edge every object the repo hands a
             * vessel becomes invisible at the boundary, which is where rule
             * (b) most needs to see. */
            if (p.type !== 'ObjectPattern' || a.type !== 'ObjectExpression') return;
            for (const pp of p.properties) {
              if (pp.type !== 'Property' || pp.computed) continue;
              const local = pp.value.type === 'AssignmentPattern' ? pp.value.left : pp.value;
              if (local.type !== 'Identifier') continue;
              const got = a.properties.find((q) => q.type === 'Property' && !q.computed
                && q.key.type === 'Identifier' && q.key.name === pp.key.name);
              if (got) for (const s of idOf(m, got.value, scope)) edge(s, `bind:${fn.m.rel}#${local.range[0]}`);
            }
          });
        }
      });
    }
  }

  /* Pass 2: propagate to a fixed point. */
  for (let changed = true, guard = 0; changed && guard < 40; guard++) {
    changed = false;
    for (const [from, to] of edges.values()) {
      const src = sets.get(from); if (!src) continue;
      for (const v of src) { if (!sets.has(to)) sets.set(to, new Set()); if (!sets.get(to).has(v)) { sets.get(to).add(v); changed = true; } }
    }
  }
  return { sets, litAt, calleeFn, idOf };
}

/* ------------------------------------------------------------------ *
 * Writes                                                              *
 * ------------------------------------------------------------------ */

/** Assignment/update targets, flattened through destructuring patterns.
 *  Returns Identifier nodes (binding writes) and MemberExpressions
 *  (property writes) — the two things rules (a) and (b) each care about. */
function targets(t, out = []) {
  if (!t) return out;
  switch (t.type) {
    case 'Identifier': case 'MemberExpression': out.push(t); break;
    case 'ObjectPattern': for (const p of t.properties) targets(p.value || p.argument, out); break;
    case 'ArrayPattern': for (const e of t.elements) targets(e, out); break;
    case 'AssignmentPattern': targets(t.left, out); break;
    case 'RestElement': targets(t.argument, out); break;
    default: break;
  }
  return out;
}

/** The nearest enclosing function, and the name a reader would call it. */
function enclosing(m, scope) {
  for (let s = scope; s; s = s.parent) {
    if (s.kind !== 'fn' || !FN.has(s.node.type)) continue;
    const fn = s.node;
    return { fn, name: m.fnName.get(fn) || `<anon>@${m.rel}:${m.line(fn.range[0])}` };
  }
  return { fn: null, name: '<module>' };
}

/** A function whose whole body is one bare assignment to a binding declared
 *  outside it. Its callers are the real write sites. */
function trivialSetter(fn) {
  let expr = null;
  if (fn.body.type === 'AssignmentExpression') expr = fn.body;
  else if (fn.body.type === 'BlockStatement' && fn.body.body.length === 1
    && fn.body.body[0].type === 'ExpressionStatement'
    && fn.body.body[0].expression.type === 'AssignmentExpression') expr = fn.body.body[0].expression;
  if (!expr || expr.left.type !== 'Identifier') return null;
  return expr;
}

/* ------------------------------------------------------------------ *
 * The census                                                          *
 * ------------------------------------------------------------------ */

export function moduleCensus({ world, graded }) {
  const flow = buildFlow(world);
  const g1a = [];                          // rule (a) violations
  const propWriters = new Map();           // literal key -> Map(rel -> [lines])
  const bindings = new Map();              // bind key -> row
  const setters = new Map();               // fn node -> { bindKey, m }

  for (const m of world.values()) {
    const isGraded = graded.has(m.rel);
    /* Inventory every mutable binding in a graded module. */
    if (isGraded) {
      for (const s of m.sc.all) {
        for (const [name, d] of s.decls) {
          if (d.kind !== 'let' && d.kind !== 'var') continue;
          bindings.set(bindKey(m, d), {
            name, kind: d.kind, rel: m.rel, line: m.line(d.id.range[0]),
            owner: enclosing(m, s).name, declFn: enclosing(m, s).fn,
            writes: [], refs: 0, captured: false,
          });
        }
      }
    }
    scopedWalk(m, (n, parent, scope) => {
      /* --- references, counted and NEVER gated -------------------- */
      if (n.type === 'Identifier' && parent && isReference(n, parent)
        && !(parent.type === 'VariableDeclarator' && parent.id === n)) {
        const r = resolveRef(m, n.name, scope, world);
        const row = r.d && bindings.get(bindKey(r.m, r.d));
        if (row) {
          row.refs++;
          /* CAPTURED = referenced from a function other than the one that
           * declares it. That is the line between machine state (it outlives
           * one call, someone else can see it) and a scratch `let` inside a
           * geometry routine. Reported, never used to shrink a denominator. */
          if (enclosing(m, scope).fn !== row.declFn) row.captured = true;
        }
      }
      /* --- writes -------------------------------------------------- */
      let ts = null;
      if (n.type === 'AssignmentExpression') ts = targets(n.left);
      else if (n.type === 'UpdateExpression') ts = targets(n.argument);
      else if ((n.type === 'ForInStatement' || n.type === 'ForOfStatement')
        && n.left.type !== 'VariableDeclaration') ts = targets(n.left);
      else if (n.type === 'UnaryExpression' && n.operator === 'delete') ts = targets(n.argument);
      /* Receiver-mutating calls are property writes by another name. */
      if (!ts && n.type === 'CallExpression' && n.callee.type === 'MemberExpression'
        && !n.callee.computed && n.callee.property.type === 'Identifier') {
        if (MUTATORS.has(n.callee.property.name)) ts = [n.callee];
        else if (n.callee.property.name === 'assign' && n.callee.object.type === 'Identifier'
          && n.callee.object.name === 'Object' && n.arguments[0]) ts = targets(n.arguments[0]);
      }
      if (!ts) return;
      for (const t of ts) {
        if (t.type === 'Identifier') {
          const r = resolveRef(m, t.name, scope, world);
          if (!r.d) {
            if (isGraded) {
              g1a.push({ rel: m.rel, line: m.line(t.range[0]), name: t.name,
                why: r.external ? `assigns imported \`${t.name}\` from ${r.external.from}` : `assigns unresolved \`${t.name}\`` });
            }
            continue;
          }
          if (r.m !== m && isGraded) {
            g1a.push({ rel: m.rel, line: m.line(t.range[0]), name: t.name, why: `assigns \`${t.name}\` declared in ${r.m.rel}` });
          }
          const row = bindings.get(bindKey(r.m, r.d));
          if (row) row.writes.push({ rel: m.rel, line: m.line(t.range[0]), ...enclosing(m, scope) });
          continue;
        }
        /* Property write: charge it to every literal the IMMEDIATE object can
           hold.

           `x.y = v`, `x[i] = v` and `x.push(v)` write a property OF `x`, and
           that is what rule (b) is about. `x.y.z = v` does NOT: it writes a
           property of whatever `x.y` denotes, and this flow graph deliberately
           does not follow identity through object members — the file header
           says so in as many words ("identity through arrays and object
           members (`bag.items[0].x = 1`)" is on the WHAT IT DOES NOT SEE
           list).

           It used to walk the whole member chain to the root identifier, which
           made the implementation contradict that header: every
           `blocks[id].style.opacity = s` was charged to `blocks`, so a module
           that merely READS a registry and paints the DOM nodes in it was
           booked as a second writer of the registry. Measured on U04: the
           copy-arrival extraction reported G1 = 1 against `journey/ui.js:243
           const blocks = {}` for exactly that reason, with the two cited lines
           being writes to `HTMLElement.style` three levels down.

           The true positive this gate was built on is unaffected and was
           re-proved before this line changed: D158's `label-policy.js` wrote
           `hotspot.label` — depth one, immediate object an identifier — and
           the corrected rule still reports it. See
           `evidence/.../u04/g1-depth-control.txt`. */
        const b = t.object;
        if (!b || b.type !== 'Identifier') continue;
        for (const slot of flow.idOf(m, b, scope)) {
          for (const lk of flow.sets.get(slot) || []) {
            if (!propWriters.has(lk)) propWriters.set(lk, new Map());
            const w = propWriters.get(lk);
            if (!w.has(m.rel)) w.set(m.rel, []);
            w.get(m.rel).push(m.line(t.range[0]));
          }
        }
      }
    });
    /* Trivial setters — recorded now, inlined below. */
    scopedWalk(m, (n) => {
      if (!FN.has(n.type)) return;
      const expr = trivialSetter(n);
      if (!expr) return;
      /* NAMED functions only. An inline `(e) => { last = e.type; }` handed to
       * an event listener is not "centralising writes behind set()" — it is a
       * write site that happens to be a callback, and nothing calls it by
       * name. Treating it as a setter would inline it to its zero callers and
       * DELETE a real write, which is the flattering direction. */
      if (!m.fnName.has(n)) return;
      const inner = m.sc.byNode.get(n);
      const r = resolveRef(m, expr.left.name, inner, world);
      if (!r.d) return;
      for (let s = r.scope; s; s = s.parent) if (s === inner) return;   // its own local — not a setter
      setters.set(n, { key: bindKey(r.m, r.d), m });
    });
  }

  /* --- trivial-setter transparency ------------------------------- */
  /* Replace the write inside each bare setter with its call sites, and
   * iterate so a setter that only calls another setter cannot launder a
   * write either. */
  const callsTo = new Map();
  for (const m of world.values()) {
    scopedWalk(m, (n, parent, scope) => {
      if (n.type !== 'CallExpression') return;
      const fn = flow.calleeFn(m, n, scope, world);
      if (!fn || !setters.has(fn.node)) return;
      if (!callsTo.has(fn.node)) callsTo.set(fn.node, []);
      callsTo.get(fn.node).push({ rel: m.rel, line: m.line(n.range[0]), ...enclosing(m, scope) });
    });
  }
  const inlined = [];
  for (let round = 0; round < 4; round++) {
    for (const [fn, info] of setters) {
      const row = bindings.get(info.key);
      if (!row) continue;
      const inside = row.writes.filter((w) => w.fn === fn);
      if (!inside.length) continue;
      const sites = callsTo.get(fn) || [];
      const name = info.m.fnName.get(fn);
      /* NO RESOLVABLE CALLER, NO INLINE. "I could not find the callers" is
       * not evidence that there are none — a setter reached through a
       * dynamically built interface would otherwise have its write silently
       * deleted, and the binding would score better for being harder to
       * analyse. The write stays where it is and the failure to resolve is
       * printed. */
      if (!sites.length) {
        if (round === 0) inlined.push({ name: row.name, setter: name, callers: 0, unresolved: true });
        continue;
      }
      row.writes = row.writes.filter((w) => w.fn !== fn).concat(sites.map((s) => ({ ...s, viaSetter: true })));
      if (round === 0) inlined.push({ name: row.name, setter: name, callers: sites.length });
    }
  }

  /* --- G2 verdicts ------------------------------------------------ */
  const g2 = [];
  for (const [, row] of bindings) {
    const named = new Set(row.writes.map((w) => `${w.rel}::${w.name}`));
    const single = named.size === 1 && ![...named][0].endsWith('::<module>') && !/<anon>/.test([...named][0]);
    const soleFn = row.writes.length ? row.writes[0].fn : null;
    const soleTrivial = single && soleFn && setters.has(soleFn);
    const pass = row.writes.length <= 2 || (single && !soleTrivial);
    /* If a binding passes ONLY because every write sits in one function, the
     * size of that function is the whole question. Trivial-setter
     * transparency kills the one-line laundry; a 653-line `update()` is the
     * same evasion wearing a bigger coat, so its size is printed beside the
     * green and G3 (review) owns the judgement. */
    const via = row.writes.length > 2 && single && soleFn
      ? { fn: [...named][0], lines: soleFn.loc.end.line - soleFn.loc.start.line + 1 } : null;
    g2.push({ ...row, declFn: undefined, writers: row.writes.length, single: single ? [...named][0] : null, via, pass });
  }

  /* --- G1(b) verdicts --------------------------------------------- */
  const g1b = [];
  for (const [lk, writers] of propWriters) {
    if (writers.size < 2) continue;
    const at = flow.litAt.get(lk);
    if (!at || !graded.has(at.m.rel)) continue;
    g1b.push({ rel: at.m.rel, line: at.m.line(at.node.range[0]), kind: at.node.type,
      writers: [...writers].map(([rel, lines]) => `${rel}:${lines.join(',')}`) });
  }

  return { g1a, g1b, g2, inlined, literals: flow.litAt.size, propWritten: propWriters.size };
}

/* ------------------------------------------------------------------ *
 * World construction and CLI                                          *
 * ------------------------------------------------------------------ */

/** Every module reachable from the seeds by relative import, so that an
 *  identity leaving a graded module is still followed where it lands. */
export function buildWorld(root, seeds) {
  const world = new Map();
  const queue = [...seeds];
  while (queue.length) {
    const abs = queue.shift();
    if (world.has(abs) || !existsSync(abs)) continue;
    let m; try { m = load(abs, root); } catch { continue; }
    world.set(abs, m);
    for (const [, im] of m.imports) if (im.from.startsWith('.')) queue.push(rp(dirname(abs), im.from));
  }
  return world;
}

/* THE GRADED SURFACE MUST FOLLOW THE CODE. Every U-order that lifts a machine
   out of `journey/ui.js` adds its module here, for the same reason the coverage
   subject list is a list (D160): a gate that stops scanning the file the
   behaviour moved to reports zero about nothing, and the number goes UP as the
   measurement goes away. U04 added copy-arrival.js. */
/* THE GRADED SURFACE. Each U-order adds the modules it created, so the gates
 * follow the state out of `createUI` instead of losing sight of it the moment
 * it leaves the file. U05 adds two: the card's placement resolver, which holds
 * no mutable state at all and is here so that claim is MEASURED rather than
 * asserted, and the rail's measurement owner, whose four bindings are the
 * published slots and their staleness. */
export const DEFAULT_SURFACE = ['journey/ui.js', 'journey/ui/card-tier.js',
  'journey/ui/popover-tier.js', 'journey/ui/selection.js',
  'journey/ui/copy-arrival.js', 'journey/ui/card-layout.js',
  'journey/layout/rail-geometry.js',
  /* U06: the five owners `createUI`'s state left for. The conservation
     diagnostic is only a conservation check if the surface follows the code;
     a surface that stayed at seven modules would have reported eighteen
     bindings VANISHING when they had merely moved next door. Same reason
     U05 grew this list, and the same reason `SUBJECTS` in trace-run.mjs
     grows with it. */
  'journey/ui/hotspot-frame.js', 'journey/ui/hover-zone.js',
  'journey/ui/rail-mask.js', 'journey/ui/frame-projection.js',
  'journey/ui/label-policies.js'];

export function surfaceOf(root, spec) {
  if (spec === 'ui-all') {
    return ['journey/ui.js', ...readdirSync(join(root, 'journey/ui')).filter((f) => f.endsWith('.js'))
      .map((f) => `journey/ui/${f}`)];
  }
  return spec ? spec.split(',') : DEFAULT_SURFACE;
}
