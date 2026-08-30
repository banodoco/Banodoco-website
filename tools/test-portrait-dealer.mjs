// C04 — journey/chapters/owned/portrait-deal.js characterization.
// Run with: node tools/test-portrait-dealer.mjs
//
// Covers CHARACTERIZE item 1 (deal atomicity) and item 7 (RNG / deal order).
// portrait-deal.js is pure (no THREE render calls, no canvas) — every check
// here runs the REAL createPortraitDealer against the REAL 120-person
// CONTRIBUTOR_POOL (content/contributors.js), not a fake.
//
// DEF-C04-01 (NEW, reported here — not fixed): seatPeople() is not atomic.
// It iterates `nodes.forEach` and writes name/role/blurb/avatar node-by-node
// with no try/catch; a malformed `people[k]` (present, but missing
// `.sprite`) throws partway through `node.content.avatar = { ...,
// col: person.sprite.col, ... }` (portrait-deal.js:37-43), leaving every
// node before k already re-cast to the new identity and every node at/after
// k still carrying the PREVIOUS deal's identity — a torn, half-dealt field
// that is directly observable by the caller (via `nodes[i].content`) once
// the throw propagates. Nothing in the current pipeline feeds seatPeople a
// malformed array (dealFor()'s output is always a well-formed CONTRIBUTOR_
// POOL slice), so this is latent, not exploitable via the shipped path —
// see test-portrait-perturbation.mjs P1 for the mutated-input proof.
import { dealerModule, createLedger } from './test-portrait-harness.mjs';

const L = createLedger('portrait dealer');
const { createPortraitDealer } = dealerModule;

function makeNodes(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: `node-${i}`,
    content: { name: `stale-${i}`, role: 'stale-role', blurb: 'stale-blurb', seed: i },
  }));
}

function withPinnedRandom(value, fn) {
  const orig = Math.random;
  Math.random = () => value;
  try { return fn(); } finally { Math.random = orig; }
}

/* -------------------------------------------------------------- *
 * D1/D2 — determinism: same salt+variant -> identical sequence,   *
 * called twice (the "baked more than once, must not re-derive a   *
 * different sixteen" guarantee the source comments require).      *
 * -------------------------------------------------------------- */
{
  const nodes = makeNodes(6);
  const contributors = nodes.map((n) => ({ id: n.id }));
  const dealer = withPinnedRandom(0.1234567, () => createPortraitDealer({ nodes, contributors, nodeCount: 6 }));
  const a = dealer.dealFor(0).map((p) => p.name);
  const b = dealer.dealFor(0).map((p) => p.name);
  L.same('D', 'D1 dealFor(v) is a pure function of v — called twice, identical result', a, b);
}

/* -------------------------------------------------------------- *
 * D2 — RNG / deal order PINNED (item 7): the exact Fisher-Yates    *
 * prefix for a fixed dealSalt (via a pinned Math.random) and two   *
 * variants, so a later wave cannot silently reorder the shuffle.   *
 * Captured 2026-08-21 against the current 120-row CONTRIBUTOR_POOL *
 * (content/contributors.js) — a content-data change legitimately   *
 * moves these names and this pin must be re-blessed, same protocol *
 * as C01's golden re-baselining (see limitations.md).              *
 * -------------------------------------------------------------- */
{
  const nodes = makeNodes(6);
  const contributors = nodes.map((n) => ({ id: n.id }));
  const dealer = withPinnedRandom(0.1234567, () => createPortraitDealer({ nodes, contributors, nodeCount: 6 }));
  L.same('D', 'D2 dealFor(0) exact sequence pinned', dealer.dealFor(0).map((p) => p.name), [
    'johndopamine', 'realsammyt', 'Zlikwid', 'Ian_G', 'anime_is_real', 'lone_samurai',
  ]);
  L.same('D', 'D2 dealFor(1) exact sequence pinned (different variant, same salt)', dealer.dealFor(1).map((p) => p.name), [
    'BadCRC', 'ingierlingsson', 'aleksej623', 'hypereikon', 'fakeitorleaveit', 'sorrymary',
  ]);
}

/* -------------------------------------------------------------- *
 * D3 — a different dealSalt (a fresh page load) deals a different  *
 * sixteen for the SAME variant. Not a strict guarantee (a 120-pool *
 * Fisher-Yates COULD coincide), but pinned here as the observed,   *
 * expected-in-practice behaviour for two distinct salts.           *
 * -------------------------------------------------------------- */
{
  const nodesA = makeNodes(6);
  const dealerA = withPinnedRandom(0.11, () => createPortraitDealer({ nodes: nodesA, contributors: [], nodeCount: 6 }));
  const nodesB = makeNodes(6);
  const dealerB = withPinnedRandom(0.87, () => createPortraitDealer({ nodes: nodesB, contributors: [], nodeCount: 6 }));
  const seqA = dealerA.dealFor(0).map((p) => p.name);
  const seqB = dealerB.dealFor(0).map((p) => p.name);
  L.check('D', 'D3 two distinct salts deal visibly different sixteens for the same variant',
    JSON.stringify(seqA) !== JSON.stringify(seqB), `${seqA[0]} vs ${seqB[0]}`);
}

/* -------------------------------------------------------------- *
 * D4 — seatPeople mutates node.content AND the parallel static     *
 * `contributors` row identically (the "no path moves one without   *
 * the others" guarantee the source comments claim).                *
 * -------------------------------------------------------------- */
{
  const nodes = makeNodes(4);
  const contributors = nodes.map((n) => ({ id: n.id, name: 'stale', role: 'stale', blurb: 'stale' }));
  const dealer = withPinnedRandom(0.33, () => createPortraitDealer({ nodes, contributors, nodeCount: 4 }));
  const people = dealer.dealFor(0);
  dealer.seatPeople(people);
  const contentNames = nodes.map((n) => n.content.name);
  const staticNames = contributors.map((c) => c.name);
  L.same('D', 'D4 node.content.name matches the dealt person', contentNames, people.map((p) => p.name));
  L.same('D', 'D4 the parallel static contributors row is seated identically', staticNames, contentNames);
  L.check('D', 'D4 node.content.avatar carries the dealt sprite coordinates',
    nodes.every((n, i) => n.content.avatar.col === people[i].sprite.col && n.content.avatar.row === people[i].sprite.row),
    nodes.map((n) => n.content.avatar));
}

/* -------------------------------------------------------------- *
 * D5 — ATOMICITY (item 1) + DEF-C04-01: a malformed deal (a person  *
 * missing `.sprite`, which real dealFor() output never produces)   *
 * throws PARTWAY through seatPeople's forEach, and the throw is    *
 * NOT contained — nodes before the bad index are already re-cast,  *
 * nodes at/after it are not. That is the observable "torn deal."   *
 * See test-portrait-perturbation.mjs P1 for the paired good/bad    *
 * transcript this characterization requires.                       *
 * -------------------------------------------------------------- */
{
  const nodes = makeNodes(5);
  const contributors = nodes.map((n) => ({ id: n.id, name: 'stale', role: 'stale', blurb: 'stale' }));
  const dealer = createPortraitDealer({ nodes, contributors, nodeCount: 5 });
  const goodPeople = dealer.dealFor(0);
  const brokenIndex = 2;
  const brokenPeople = goodPeople.map((p, i) => (i === brokenIndex ? { name: 'BROKEN', role: 'x', blurb: 'y' } : p));
  let threw = null;
  try { dealer.seatPeople(brokenPeople); } catch (e) { threw = e; }
  L.check('D', 'D5 a person missing .sprite throws (no per-entry validation)', threw instanceof TypeError, String(threw));
  const before = nodes.slice(0, brokenIndex).every((n, i) => n.content.name === goodPeople[i].name);
  const brokenNodeUpdatedNameButNoAvatar = nodes[brokenIndex].content.name === 'BROKEN';
  const after = nodes.slice(brokenIndex + 1).every((n, i) => n.content.name === `stale-${brokenIndex + 1 + i}`);
  L.check('D', 'D5 TORN STATE: nodes before the bad index were already re-cast', before, nodes.slice(0, brokenIndex).map((n) => n.content.name));
  L.check('D', 'D5 TORN STATE: the bad node itself has a new name but never reached avatar/staticRow', brokenNodeUpdatedNameButNoAvatar, nodes[brokenIndex].content);
  L.check('D', 'D5 TORN STATE: nodes after the bad index kept the PREVIOUS deal untouched', after, nodes.slice(brokenIndex + 1).map((n) => n.content.name));
}

process.exit(L.report());
