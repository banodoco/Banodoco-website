#!/usr/bin/env node
// build-reasons.js — merge researched batch results into ownership/reasons.js.
//
// Sources:
//   - /tmp/results/batch-NN.json (researched sentences + evidence) for batches 2-74
//   - ownership/data.js OWNERSHIP (the authoritative 370-owner list)
//   - /tmp/owner_history.json (grant months + categories per owner)
//
// Output: ownership/reasons.js — additive module; data.js untouched.
//
// Fallbacks: any owner whose research came back null (no archive presence)
// gets an honest CATEGORY-based sentence in the site's voice — never invented
// specificity, never "granted a stake" language. Re-run this script any time
// results change; entries with researched sentences are always preferred.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RESULTS = '/tmp/results';
const OWNER_HISTORY = '/tmp/owner_history.json';

// --- category fallback copy (site voice; true-by-construction, not invented) ---
const FALLBACK = {
  INFRASTRUCTURE: "Helped build and maintain the infrastructure the community's video and image workflows ran on.",
  'KNOWLEDGE/TOOLS': "Shared knowledge and practical tools that helped the community get more out of these models.",
  'KNOWLEDGE SHARERS': "Consistently shared knowledge and findings with the community.",
  ARTISTS: "Made art with these tools and shared it with the community.",
  ART: "Made art with these tools and shared it with the community.",
  CORE: "Helped build Banodoco and the community around it.",
};
// mixed-category compositions, longest-first match
const MIXED = {
  'INFRASTRUCTURE+KNOWLEDGE/TOOLS': "Helped build community infrastructure and shared the knowledge and tools that went with it.",
  'ARTISTS+KNOWLEDGE/TOOLS': "Made art with these tools and shared the practical knowledge behind it.",
  'KNOWLEDGE/TOOLS+ARTISTS': "Shared the practical knowledge behind their art, and the tools that made it.",
  'INFRASTRUCTURE+ARTISTS': "Helped build community infrastructure and made art with the tools it ran.",
  'ARTISTS+ART': "Made art with these tools and shared it with the community.",
  'INFRASTRUCTURE+KNOWLEDGE/TOOLS+ARTISTS': "Helped build community infrastructure, shared the knowledge, and made art with the tools.",
};
const EARLY_FALLBACK = "One of the community's earliest members.";

function categoryKey(hist) {
  if (!hist || !hist.length) return '';
  const cats = [...new Set(hist.flatMap((h) => h.categories))].filter(Boolean);
  if (!cats.length) return '';
  const ordered = ['INFRASTRUCTURE', 'KNOWLEDGE/TOOLS', 'KNOWLEDGE SHARERS', 'ARTISTS', 'CORE'];
  cats.sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b));
  return cats.join('+');
}

function fallbackFor(username, hist) {
  const key = categoryKey(hist);
  if (MIXED[key]) return MIXED[key];
  if (FALLBACK[key]) return FALLBACK[key];
  // single category or unknown
  const single = key.split('+')[0];
  if (FALLBACK[single]) return FALLBACK[single];
  return EARLY_FALLBACK;
}

// --- load owners ---
const dataSrc = fs.readFileSync(path.join(ROOT, 'ownership', 'data.js'), 'utf8');
const OWNERSHIP = [];
const re = /Object\.freeze\(\{ username: '([^']+)', granted: ([0-9.]+), total: ([0-9.]+) \}\)/g;
let m;
while ((m = re.exec(dataSrc)) !== null) {
  OWNERSHIP.push({ username: m[1], granted: parseFloat(m[2]), total: parseFloat(m[3]) });
}

// --- load researched results ---
const researched = new Map(); // lowercase username -> entry
if (fs.existsSync(RESULTS)) {
  for (const f of fs.readdirSync(RESULTS).sort()) {
    if (!/^batch-\d+\.json$/.test(f)) continue;
    let rows;
    try { rows = JSON.parse(fs.readFileSync(path.join(RESULTS, f), 'utf8')); }
    catch { continue; } // malformed batch file: skip it, keep processing the rest
    if (!Array.isArray(rows)) continue;
    for (const r of rows) {
      if (!r || typeof r.username !== 'string') continue;
      const key = r.username.toLowerCase().trim();
      if (!researched.has(key)) researched.set(key, r);
    }
  }
}

const history = JSON.parse(fs.readFileSync(OWNER_HISTORY, 'utf8'));

// --- build REASONS ---
const entries = [];
for (const owner of OWNERSHIP) {
  const key = owner.username.toLowerCase().trim();
  const r = researched.get(key);
  const hist = history[key];
  if (r && r.sentence) {
    entries.push({
      username: owner.username,
      sentence: r.sentence,
      evidence: Array.isArray(r.evidence) ? r.evidence : [],
      aliases: Array.isArray(r.aliases) ? r.aliases : [],
      confidence: r.confidence || 'medium',
      ...(r.note ? { note: r.note } : {}),
    });
  } else {
    entries.push({
      username: owner.username,
      sentence: fallbackFor(owner.username, hist),
      evidence: [],
      aliases: [],
      confidence: 'low',
      note: 'Category fallback — no archive presence found under any name variant; sentence reflects the grant category only.',
    });
  }
}

// --- serialize ---
const obj = entries.map((e) => {
  const ev = e.evidence.map((x) =>
    `      { message_id: '${x.message_id}', channel: '${x.channel || ''}', date: '${x.date || ''}', snippet: ${JSON.stringify(x.snippet || '')} },`
  ).join('\n');
  const al = e.aliases.map((a) => JSON.stringify(a)).join(', ');
  const note = e.note ? `\n    note: ${JSON.stringify(e.note)},` : '';
  return `  '${e.username}': Object.freeze({\n` +
    `    sentence: ${JSON.stringify(e.sentence)},\n` +
    (ev ? `    evidence: [\n${ev}\n    ],\n` : `    evidence: [],\n`) +
    `    aliases: [${al}],\n` +
    `    confidence: '${e.confidence}',${note}\n` +
    `  }),`;
}).join('\n\n');

const out = `// reasons.js — per-owner descriptions for the ownership ledger hover.
// Additive to data.js (which stays a pure mirror of the source ledger);
// this file carries the human-researched "what they actually did" line for
// each owner, plus the internal evidence trail (message ids, aliases,
// confidence) that backs it. Rendered by ownership.js as a hover tooltip
// on the contributor cell and as a readable list in the Contributors tab.
//
// GENERATED by tools/build-reasons.js — do not hand-edit. Re-run the
// generator after research batches land; owners whose research came back
// null get an honest category-based fallback.
//
// Contract: every researched \`sentence\` must be traceable to at least one
// evidence message_id; never invent specificity.

export const REASONS = Object.freeze({
${obj}
});
`;

const outPath = path.join(ROOT, 'ownership', 'reasons.js');
fs.writeFileSync(outPath, out);

const total = entries.length;
const withEv = entries.filter((e) => e.evidence.length).length;
const fallback = entries.filter((e) => !e.evidence.length).length;
console.log(`wrote ${outPath}`);
console.log(`  owners: ${total} | researched+evidenced: ${withEv} | category fallback: ${fallback}`);
