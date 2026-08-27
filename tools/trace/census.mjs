/* ==================================================================== *
 * tools/trace/census.mjs — the SHAPE half of acceptance: variable -> owner.
 *
 * PARSE, DO NOT GREP, and that is not a style preference. Three measured
 * findings in this run say the greppers have become an unelected architect:
 * `chapter-registry.js` spells `chapter.dispose()` non-optionally BECAUSE a
 * census greps `\.dispose\s*\(`; two gated suites require production to
 * contain the literal string `Corrected by J04d`; and
 * `test-chapter-contract.mjs:1264-1266` pins three `onHot` lines BY TEXT,
 * which forced U02 to move state while leaving effects behind. A text pin
 * makes the source answer to the instrument. This file resolves every
 * identifier through a real scope chain, so it answers to the source.
 *
 * WHAT IT MEASURES, and why these three and not others:
 *
 *  1. `variable -> owner` for every mutable binding (`let`/`var`) inside the
 *     subject factory. Owner is the DECLARING function. Today `createUI`
 *     owns all 61, which is the number the replan is aimed at.
 *
 *  2. SHARED STATE. Sibling sub-owners cannot see each other's closures — so
 *     the only way one can touch another's state is through a variable
 *     declared in their COMMON PARENT. For every mutable binding declared in
 *     the factory body, this counts the distinct direct-child functions whose
 *     subtree references it. `sharedBy > 1` is state with no single owner,
 *     and that count IS the elegance criterion, machine-checked.
 *
 *  3. `update()` COMPOSITION. Statement count, how many of those statements
 *     are bare calls, and the maximum nesting depth of the body. A fixed-
 *     order composition of sub-owner calls reads as N call-statements at
 *     depth 1; today's `update` does not, and the numbers say by how much.
 *
 * The bars are NOT hard-coded here. `--max-owned` / `--max-shared` /
 * `--require-composed` let U03..U06 tighten them one order at a time, which
 * is the only way a ratchet can be both honest and adoptable.
 * ==================================================================== */

import { readFileSync } from 'node:fs';
import * as espree from 'espree';

const PARSE = { ecmaVersion: 'latest', sourceType: 'module', range: true, loc: true };
const FN = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const BLOCKISH = new Set(['BlockStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement',
  'SwitchStatement', 'CatchClause', 'StaticBlock']);

export function walk(node, visit, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent);
  for (const key of espree.VisitorKeys[node.type] || []) {
    const v = node[key];
    if (Array.isArray(v)) for (const c of v) walk(c, visit, node);
    else walk(v, visit, node);
  }
}

/** Every name a binding pattern introduces. */
export function names(node, out = []) {
  if (!node) return out;
  switch (node.type) {
    case 'Identifier': out.push(node); break;
    case 'ObjectPattern': for (const p of node.properties) names(p.value || p.argument, out); break;
    case 'ArrayPattern': for (const e of node.elements) names(e, out); break;
    case 'AssignmentPattern': names(node.left, out); break;
    case 'RestElement': names(node.argument, out); break;
    default: break;
  }
  return out;
}

/** A scope chain over the whole module. `kind` is 'fn' or 'block'; `var` and
 *  function declarations hoist to the nearest 'fn', `let`/`const`/`class` stay
 *  in the nearest scope of either kind. */
export function scopes(ast) {
  const byNode = new Map();
  const all = [];
  const make = (node, kind, parent) => {
    const s = { node, kind, parent, decls: new Map(), children: [] };
    if (parent) parent.children.push(s);
    byNode.set(node, s); all.push(s); return s;
  };
  const root = make(ast, 'fn', null);
  const stack = [root];
  const fnOf = (s) => { let c = s; while (c.kind !== 'fn') c = c.parent; return c; };

  (function build(node, parent, scope) {
    if (!node || typeof node.type !== 'string') return;
    let here = scope;
    if (FN.has(node.type)) {
      here = make(node, 'fn', scope);
      for (const p of node.params) for (const id of names(p)) here.decls.set(id.name, { id, kind: 'param', scope: here });
    } else if (BLOCKISH.has(node.type) && !FN.has(parent?.type || '')) {
      here = make(node, 'block', scope);
    } else if (BLOCKISH.has(node.type)) {
      here = scope;                       // a function body block IS the function scope
      byNode.set(node, scope);
    }
    if (node.type === 'VariableDeclaration') {
      const target = node.kind === 'var' ? fnOf(here) : here;
      for (const d of node.declarations) {
        for (const id of names(d.id)) target.decls.set(id.name, { id, kind: node.kind, scope: target });
      }
    }
    if (node.type === 'FunctionDeclaration' && node.id) {
      (parent && FN.has(parent.type) ? here.parent : here.parent || here)
        .decls.set(node.id.name, { id: node.id, kind: 'function', scope: here.parent || here });
    }
    if (node.type === 'ClassDeclaration' && node.id) here.decls.set(node.id.name, { id: node.id, kind: 'class', scope: here });
    for (const key of espree.VisitorKeys[node.type] || []) {
      const v = node[key];
      if (Array.isArray(v)) for (const c of v) build(c, node, here);
      else build(v, node, here);
    }
  }(ast, null, root));

  stack.length = 0;
  return { root, byNode, all, fnOf };
}

/** Is this Identifier a reference, or a property name / label / declaration? */
export function isReference(node, parent) {
  if (!parent) return false;
  if (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) return false;
  if (parent.type === 'Property' && parent.key === node && !parent.computed) return false;
  if (parent.type === 'MethodDefinition' && parent.key === node && !parent.computed) return false;
  if (parent.type === 'LabeledStatement' || parent.type === 'BreakStatement'
    || parent.type === 'ContinueStatement') return false;
  if (parent.type === 'ImportSpecifier' && parent.imported === node) return false;
  if (parent.type === 'ExportSpecifier') return false;
  return true;
}

const label = (fn, src) => {
  if (!fn || fn.type === 'Program') return '<module>';
  if (fn.id && fn.id.name) return fn.id.name;
  return `<anon>@${src.slice(0, fn.range[0]).split('\n').length}`;
};

/** The STATIC branch inventory: every arm a reader would call a branch, with
 *  its source range. Used as the DENOMINATOR of the coverage floor, because
 *  V8's own range list is not a fixed denominator — it grows as lazily
 *  compiled functions are entered, so "blocks reported" rose from 580 to 689
 *  when this deck grew, and a percentage over a moving denominator flatters
 *  itself. This inventory does not move unless `journey/ui.js` moves.
 *
 *  IMPLICIT ELSE ARMS ARE EXCLUDED, and this is the honest half of the
 *  measurement. `if (x) foo();` has two outcomes, but V8 block coverage emits
 *  a range for the CONSEQUENT ONLY — there is no block for the fall-through,
 *  so any offset chosen to stand for it resolves to the enclosing block and
 *  reads as covered whenever the surrounding code ran at all. Counting them
 *  added 225 branches to this file's inventory of which 171 scored covered
 *  for free, i.e. it moved the headline up by ~4 points on no evidence. They
 *  are inventoried with kind `else-implicit` so a later instrument can pick
 *  them up, and excluded from the denominator by `branches()`'s caller. */
export function branches(file) {
  const src = readFileSync(file, 'utf8');
  const ast = espree.parse(src, PARSE);
  const out = [];
  const at = (node, kind, range) => out.push({
    kind, range: range || node.range,
    line: src.slice(0, (range || node.range)[0]).split('\n').length,
  });
  walk(ast, (n) => {
    switch (n.type) {
      case 'IfStatement':
        at(n.consequent, 'if');
        if (n.alternate) at(n.alternate, 'else');
        else at(n, 'else-implicit', [n.consequent.range[1], n.consequent.range[1] + 1]);  // excluded — see above
        break;
      case 'ConditionalExpression': at(n.consequent, '?'); at(n.alternate, ':'); break;
      case 'LogicalExpression': at(n.right, n.operator); break;
      case 'SwitchCase': at(n, 'case'); break;
      case 'ForStatement': case 'ForOfStatement': case 'ForInStatement':
      case 'WhileStatement': case 'DoWhileStatement': at(n.body, 'loop'); break;
      case 'CatchClause': at(n.body, 'catch'); break;
      default:
        if (FN.has(n.type)) at(n.body, 'fn');
        break;
    }
  });
  return { src, branches: out.filter((b) => b.kind !== 'else-implicit'), unmeasurable: out.filter((b) => b.kind === 'else-implicit').length };
}

/**
 * @param {string} file      absolute path of the subject
 * @param {string} factory   the exported factory whose closure is graded
 */
export function census(file, factory = 'createUI') {
  const src = readFileSync(file, 'utf8');
  const ast = espree.parse(src, PARSE);
  const sc = scopes(ast);

  /* The subject factory and its DIRECT child functions — the sub-owners. */
  let factoryNode = null;
  walk(ast, (n) => {
    if (FN.has(n.type) && n.id && n.id.name === factory) factoryNode = n;
  });
  if (!factoryNode) throw new Error(`census: no function named ${factory} in ${file}`);
  const factoryScope = sc.byNode.get(factoryNode);

  const inside = (scope, ancestor) => { for (let s = scope; s; s = s.parent) if (s === ancestor) return true; return false; };
  /** The direct-child function scope of the factory that contains `scope`. */
  const subOwner = (scope) => {
    let last = null;
    for (let s = scope; s && s !== factoryScope; s = s.parent) if (s.kind === 'fn') last = s;
    return last;
  };

  /* --- 1. variable -> owner ------------------------------------------- */
  const rows = [];
  for (const s of sc.all) {
    if (!inside(s, factoryScope) && s !== factoryScope) continue;
    for (const [name, d] of s.decls) {
      if (d.kind !== 'let' && d.kind !== 'var') continue;
      rows.push({
        name, kind: d.kind,
        owner: label(s.kind === 'fn' ? s.node : sc.fnOf(s).node, src),
        line: src.slice(0, d.id.range[0]).split('\n').length,
        scope: s, refs: 0, sharedBy: new Set(),
      });
    }
  }
  const byScopeName = new Map(rows.map((r) => [`${rows.indexOf(r)}`, r]));

  /* --- 2. resolve every reference, and attribute it to a sub-owner ----- */
  const scopeAt = (node) => {
    /* the innermost scope whose node range contains this node */
    let best = sc.root;
    for (const s of sc.all) {
      const [a, b] = s.node.range;
      if (node.range[0] >= a && node.range[1] <= b
        && (b - a) <= (best.node.range[1] - best.node.range[0])) best = s;
    }
    return best;
  };
  const rowFor = new Map();
  for (const r of rows) rowFor.set(`${r.scope.node.range[0]}:${r.name}`, r);

  const unresolvedShadow = [];
  walk(ast, (node, parent) => {
    if (node.type !== 'Identifier' || !isReference(node, parent)) return;
    const from = scopeAt(node);
    if (!inside(from, factoryScope) && from !== factoryScope) return;
    for (let s = from; s; s = s.parent) {
      const d = s.decls.get(node.name);
      if (!d) continue;
      const r = rowFor.get(`${s.node.range[0]}:${node.name}`);
      if (r) {
        r.refs++;
        const owner = subOwner(from);
        r.sharedBy.add(owner ? label(owner.node, src) : '<factory body>');
      }
      return;
    }
    unresolvedShadow.push(node.name);
  });

  /* --- 3. update() composition ---------------------------------------- */
  let updateNode = null;
  walk(factoryNode, (n) => { if (FN.has(n.type) && n.id && n.id.name === 'update') updateNode = n; });
  let composition = null;
  if (updateNode) {
    const body = updateNode.body.body || [];
    const isCall = (st) => st.type === 'ExpressionStatement'
      && (st.expression.type === 'CallExpression'
        || (st.expression.type === 'AwaitExpression' && st.expression.argument.type === 'CallExpression'));
    let depth = 0;
    (function deep(n, d) {
      depth = Math.max(depth, d);
      for (const key of espree.VisitorKeys[n.type] || []) {
        const v = n[key];
        const step = (c) => c && typeof c.type === 'string'
          && deep(c, d + (BLOCKISH.has(c.type) || FN.has(c.type) ? 1 : 0));
        if (Array.isArray(v)) v.forEach(step); else step(v);
      }
    }(updateNode.body, 0));
    composition = {
      statements: body.length,
      callStatements: body.filter(isCall).length,
      maxDepth: depth,
      codeLines: updateNode.loc.end.line - updateNode.loc.start.line + 1,
      composed: body.length > 0 && body.every(isCall),
    };
  }

  const table = rows.map((r) => ({
    name: r.name, kind: r.kind, owner: r.owner, line: r.line,
    refs: r.refs, sharedBy: [...r.sharedBy].sort(),
  })).sort((a, b) => a.line - b.line);

  const dupes = [...table.reduce((m, r) => m.set(r.name, (m.get(r.name) || 0) + 1), new Map())]
    .filter(([, n]) => n > 1).map(([n]) => n);

  return {
    file, factory,
    mutable: table.length,
    ownedByFactory: table.filter((r) => r.owner === factory).length,
    shared: table.filter((r) => r.sharedBy.filter((o) => o !== '<factory body>').length > 1).length,
    duplicateNames: dupes,
    owners: [...new Set(table.map((r) => r.owner))].sort(),
    composition,
    table,
    _unresolved: unresolvedShadow.length,
    _byScopeName: byScopeName.size,
  };
}
