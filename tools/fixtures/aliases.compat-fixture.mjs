// GENERATED FIXTURE — S02 (2026-08-21-elegance-run-01).
//
// This file was produced by IMPORTING journey/route.js, journey/symbols.js,
// journey/constants.js, journey/structure.js and journey/navigation.js and
// serializing exactly what they export/return TODAY — not hand-transcribed
// from reading source. Purpose: pin every alias declared in journey/structure.js's JOURNEY_SCHEMA.aliases, the canonical #/<chapter>[/<node>] URL each one resolves to, and journey/navigation.js's normaliseNode() signature so a later order that removes
// a competing/duplicate source of route, copy, symbol or constant data (the
// F-series) is caught immediately if it changes a value, rather than at a
// capture gate.
//
// TO REGENERATE DELIBERATELY (only when a value legitimately changed):
//   node docs/code-health/evidence/2026-08-21-elegance-run-01/s02/generate-snapshot.mjs
// Then record the before/after in the run ledger. See the re-baselining
// protocol in docs/code-health/evidence/2026-08-21-elegance-run-01/c01/
// limitations.md §10 (this fixture follows the same convention) and this
// generator's own header. Do NOT hand-edit the assertions below to make them
// pass — regenerate, or transcription error creeps back in.

import assert from 'node:assert/strict';
import { JOURNEY_SCHEMA, FIXED_HOTSPOTS } from '../../journey/structure.js';
import { normaliseNode } from '../../journey/navigation.js';
import { CHAPTER_IDS } from '../../journey/route.js';

assert.deepEqual(JOURNEY_SCHEMA.aliases.nodes, {
  "2rp": "tworp",
  "community": "discord"
}, '[aliases fixture] aliases.nodes drifted');

const patternsSnapshot = JOURNEY_SCHEMA.aliases.patterns.map((p) => ({
  source: p.pattern.source, flags: p.pattern.flags, replacement: p.replacement, example: p.example,
}));
assert.deepEqual(patternsSnapshot, [
  {
    "source": "^person-(\\d+)$",
    "flags": "",
    "replacement": "contributor-$1",
    "example": "person-0"
  }
], '[aliases fixture] aliases.patterns drifted');

assert.deepEqual(
  { name: normaliseNode.name, length: normaliseNode.length },
  {
  "name": "normaliseNode",
  "length": 2
},
  '[aliases fixture] normaliseNode signature drifted',
);

// `#/equip` joined this list on 2026-08-30 and NOTHING WAS WIRED TO MAKE IT
// WORK, which is the fact worth recording: journey/state.js's parseHash tests
// membership of CHAPTER_IDS and normalises anything else, so promoting Equip in
// the schema made its deep link live by derivation alone.
//
// Every chapter's canonical nav URL — the format rail.js authors as
// `#/${c.id}` (journey/rail.js:516,663) and the one journey.js's own comments
// document for the detail route: `#/<chapter>/<node>`.
assert.deepEqual(CHAPTER_IDS.map((id) => ({ id, url: `#/${id}` })), [
  {
    "id": "mission",
    "url": "#/mission"
  },
  {
    "id": "inspire",
    "url": "#/inspire"
  },
  {
    "id": "equip",
    "url": "#/equip"
  },
  {
    "id": "connect",
    "url": "#/connect"
  },
  {
    "id": "owned",
    "url": "#/owned"
  },
  {
    "id": "final",
    "url": "#/final"
  }
],
  '[aliases fixture] chapter canonical URL set drifted');

// Every declared node alias resolved through the live normaliseNode(), and
// the fixed/dynamic hotspot chapter it lands in — so the canonical detail URL
// an alias silently stands for is pinned, not just the alias's raw target
// string.
function ownerChapterOf(nodeId) {
  for (const [chId, ids] of Object.entries(FIXED_HOTSPOTS)) {
    if (ids.includes(nodeId)) return chId;
  }
  if (/^contributor-\d+$/.test(nodeId)) {
    const ownedChapter = JOURNEY_SCHEMA.chapters.find((c) => c.hotspots.kind === 'dynamic' && c.hotspots.source === 'contributors');
    return ownedChapter ? ownedChapter.id : null;
  }
  return null;
}

for (const exp of [
  {
    "alias": "2rp",
    "resolvesTo": "tworp",
    "ownerChapter": "inspire",
    "canonicalUrl": "#/inspire/tworp"
  },
  {
    "alias": "community",
    "resolvesTo": "discord",
    "ownerChapter": "connect",
    "canonicalUrl": "#/connect/discord"
  }
]) {
  const resolved = normaliseNode('mission', exp.alias);
  assert.equal(resolved, exp.resolvesTo, `[aliases fixture] alias '${exp.alias}' resolution drifted`);
  const chapter = ownerChapterOf(resolved);
  assert.equal(chapter, exp.ownerChapter, `[aliases fixture] alias '${exp.alias}' owner chapter drifted`);
  const canonicalUrl = chapter ? `#/${chapter}/${resolved}` : null;
  assert.equal(canonicalUrl, exp.canonicalUrl, `[aliases fixture] alias '${exp.alias}' canonical URL drifted`);
}

for (const exp of [
  {
    "example": "person-0",
    "resolvesTo": "contributor-0",
    "ownerChapter": "owned",
    "canonicalUrl": "#/owned/contributor-0"
  }
]) {
  const resolved = normaliseNode('owned', exp.example);
  assert.equal(resolved, exp.resolvesTo, `[aliases fixture] pattern-alias example '${exp.example}' resolution drifted`);
  const chapter = ownerChapterOf(resolved);
  assert.equal(chapter, exp.ownerChapter, `[aliases fixture] pattern-alias example '${exp.example}' owner chapter drifted`);
}

// normaliseNode() representative input -> output pairs covering every branch:
// falsy nodeId, node-table alias, pattern alias, no alias (passthrough), and
// the 'final' chapter special-case (always returns null).
for (const { chapterId, nodeId, out } of [
  {
    "chapterId": "inspire",
    "nodeId": "2rp",
    "out": "tworp"
  },
  {
    "chapterId": "connect",
    "nodeId": "community",
    "out": "discord"
  },
  {
    "chapterId": "owned",
    "nodeId": "person-7",
    "out": "contributor-7"
  },
  {
    "chapterId": "inspire",
    "nodeId": "artcompute",
    "out": "artcompute"
  },
  {
    "chapterId": "inspire",
    "nodeId": null,
    "out": null
  },
  {
    "chapterId": "inspire",
    "nodeId": "",
    "out": null
  },
  {
    "chapterId": "final",
    "nodeId": "anything-at-all",
    "out": null
  },
  {
    "chapterId": "final",
    "nodeId": "2rp",
    "out": null
  }
]) {
  assert.equal(normaliseNode(chapterId, nodeId), out,
    `[aliases fixture] normaliseNode(${JSON.stringify(chapterId)}, ${JSON.stringify(nodeId)}) drifted`);
}

console.log('aliases compat fixture: ok');
