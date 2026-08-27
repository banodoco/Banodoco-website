/* ==================================================================== *
 * tools/trace/resolve-audit.mjs — the free-identifier resolution check.
 *
 * THE HOLE THIS IS AIMED AT, and it is the only one it is aimed at.
 *
 * U03 waived 44 branches as "moved verbatim by count-checked substitution"
 * and stated the limit itself: trace identity certifies nothing about a
 * branch no scenario executes — it has provenance, not behaviour. The
 * residual exposure is narrow and nameable:
 *
 *   A VERBATIM-MOVED BRANCH WHOSE FREE IDENTIFIERS NOW RESOLVE
 *   DIFFERENTLY. A name that was a shared closure `let` and is now a
 *   module-local; a parameter shadowing what used to be ambient. The bytes
 *   stay identical while the binding under them changes meaning, and the
 *   deck never runs the branch, so nothing notices.
 *
 * So: for every waived branch, every identifier that is FREE in that branch
 * is resolved through a real scope chain in the PRE file and again in the
 * POST file, and the two OWNER-KINDS must agree —
 *
 *   param   a parameter of some enclosing function
 *   local   a declaration in an enclosing function or block scope
 *   module  a declaration at module top level
 *   import  an imported binding, fingerprinted by RESOLVED MODULE + name,
 *           so "same word, different module" is a mismatch, not a match
 *   global  resolves to nothing in this file
 *
 * FUNCTION-HOP DISTANCE is measured too, and reported, but NOT gated. A
 * closure `let` one function out of `createUI` that is now a closure `let`
 * one function out of `createCardTier` is the same owner-kind at the same
 * distance and is exactly what a correct extraction looks like; a distance
 * that changed while the kind did not is worth a reader's eye and nothing
 * stronger, so it prints as INFO.
 *
 * MATCHING IS BY BRANCH, NOT BY BYTE OFFSET. Each pre branch is paired with
 * the post branch of the same kind and the same whitespace-normalised text.
 * A branch with no such partner is reported NOT-FOUND — which is itself a
 * finding against the verbatim claim, not a skip. An ambiguous pair is
 * analysed in ALL its candidates and must pass in every one.
 *
 * WHAT IT DOES NOT DO: it does not execute anything. A branch whose free
 * identifiers all resolve identically can still have been broken by a change
 * to what those bindings HOLD. This closes one named hole; the waiver is
 * still a waiver.
 * ==================================================================== */

import { readFileSync } from 'node:fs';
import { dirname, resolve as rp, relative, join } from 'node:path';
import { walk, names, isReference, branches } from './census.mjs';
import { load, scopedWalk } from './module-census.mjs';

const FN = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const norm = (s) => s.replace(/\s+/g, ' ').trim();

/** The innermost-first scope in force at each branch node, plus the name of
 *  the function the branch sits in — the reader's coordinate for "where". */
function inventory(m) {
  const inv = branches(m.abs).branches;
  const byRange = new Map(inv.map((b) => [`${b.range[0]}:${b.range[1]}`, b]));
  scopedWalk(m, (n, parent, scope) => {
    const b = byRange.get(`${n.range[0]}:${n.range[1]}`);
    if (!b || b.node) return;
    b.node = n; b.scope = scope;
    for (let s = scope; s; s = s.parent) {
      if (s.kind === 'fn' && FN.has(s.node.type)) { b.fn = m.fnName.get(s.node) || '<anon>'; break; }
    }
    b.text = norm(m.src.slice(b.range[0], b.range[1]));
    /* The ENCLOSING node's text, used to disambiguate. Nineteen branches in
     * this surface normalise to `return;`; without the context they pair at
     * random and the report reads as if the check were vacuous. */
    b.ctx = parent ? norm(m.src.slice(parent.range[0], parent.range[1])).slice(0, 240) : '';
  });
  return inv.filter((b) => b.node);
}

/** Identifiers referenced in the branch that the branch does not declare. */
function freeIdents(node) {
  const bound = new Set();
  walk(node, (n) => {
    if (n.type === 'VariableDeclaration') { for (const d of n.declarations) for (const id of names(d.id)) bound.add(id.name); }
    if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) bound.add(n.id.name);
    if (FN.has(n.type)) { for (const p of n.params) for (const id of names(p)) bound.add(id.name); }
    if (n.type === 'CatchClause' && n.param) for (const id of names(n.param)) bound.add(id.name);
  });
  const out = new Set();
  walk(node, (n, p) => {
    if (n.type !== 'Identifier' || !isReference(n, p) || bound.has(n.name)) return;
    out.add(n.name);
  });
  return [...out].sort();
}

/** Owner-kind + hop distance for one name, resolved where the branch stands. */
function classify(m, name, scope) {
  let hops = 0;
  for (let s = scope; s; s = s.parent) {
    const d = s.decls.get(name);
    if (d) {
      return {
        kind: d.kind === 'param' ? 'param' : (s === m.sc.root ? 'module' : 'local'),
        decl: d.kind, hops,
      };
    }
    if (s.kind === 'fn') hops++;
  }
  const im = m.imports.get(name);
  if (im) {
    /* Fingerprinted by the import's identity IN ITS OWN TREE, not by an
     * absolute path: the pre file is staged outside the repo, and comparing
     * filesystem paths would report every import as a mismatch. */
    const from = im.from.startsWith('.') ? relative(m.root, rp(dirname(m.abs), im.from)) : im.from;
    return { kind: 'import', decl: `${im.name} from ${from}`, hops: -1 };
  }
  return { kind: 'global', decl: 'global', hops: -1 };
}

const fp = (c) => (c.kind === 'import' ? `import:${c.decl}` : c.kind);

/**
 * @param {object} pre     loaded pre-move module
 * @param {object[]} posts loaded post-move modules, in search order
 * @param {object[]} want  [{ line, kind }] — the waived branches, pre coords
 */
export function audit({ pre, posts, want }) {
  const preInv = inventory(pre);
  const postInv = posts.flatMap((m) => inventory(m).map((b) => ({ ...b, m })));
  const results = [];
  for (const w of want) {
    const b = preInv.find((x) => x.line === w.line && x.kind === w.kind && !x._taken);
    if (!b) { results.push({ ...w, status: 'NO-SUCH-PRE-BRANCH' }); continue; }
    b._taken = true;
    let cands = postInv.filter((x) => x.kind === b.kind && x.text === b.text && !x._taken);
    const byCtx = cands.filter((x) => x.ctx === b.ctx);
    if (byCtx.length) cands = byCtx;
    else if (cands.length > 1) {
      const same = cands.filter((x) => x.fn === b.fn);
      if (same.length) cands = same;
    }
    if (!cands.length) {
      results.push({ ...w, status: 'NOT-FOUND', text: b.text.slice(0, 80), preFn: b.fn });
      continue;
    }
    const free = freeIdents(b.node);
    const rows = [];
    for (const cand of cands) {
      for (const name of free) {
        const a = classify(pre, name, b.scope);
        const z = classify(cand.m, name, cand.scope);
        rows.push({
          name, where: `${cand.m.rel}:${cand.line}`,
          pre: fp(a), post: fp(z), preHops: a.hops, postHops: z.hops,
          ok: fp(a) === fp(z),
        });
      }
    }
    cands[0]._taken = true;
    results.push({
      ...w, status: 'MATCHED', ambiguous: cands.length > 1,
      at: cands.map((c) => `${c.m.rel}:${c.line}`).join(' | '),
      preFn: b.fn, postFn: cands[0].fn, free: free.length,
      mismatches: rows.filter((r) => !r.ok),
      hopShifts: rows.filter((r) => r.ok && r.preHops !== r.postHops && r.preHops >= 0),
    });
  }
  return results;
}

/** `file:line<TAB>kind<TAB>text` rows, minus any line:kind pair in `skip`. */
export function readBranchList(path, skip = new Set()) {
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((l) => {
    const [loc, kind] = l.split('\t');
    return { line: Number(loc.split(':').pop()), kind };
  }).filter((r) => r.kind && !skip.has(`${r.line}:${r.kind}`));
}

export function loadAt(root, rel) { return load(join(root, rel), root); }
