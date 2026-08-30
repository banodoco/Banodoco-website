// artcompute — "small compute -> real people -> real open-source projects"
// (artcompute.org, a micro-grant program: small GPU-compute grants for
// open-source AI art work, auto-approved by an AI). The stage is its own
// terminal: a stat band, three grant badges, and its grants ledger cycling
// one row per hover under the scanlines. Sources, verified 2026-08-17
// against the live site and its bundle:
//   ground #0a0a0a · body #c8c8c8 · neon green #39ff14 · violet #a78bfa ·
//   sky #38bdf8 · hairlines rgba(255,255,255,0.08) — all its own values.
//   avatars — the grantees its /grants ledger shows, assets/cards/artcompute/
//             (loreweavr, ashmotv, persoon), PROVENANCE.md.
// The em-dash, en-dash and middle dot below are the site's own characters,
// not typo'd hyphens.

import { CARD_ASSETS, REDUCE } from './runtime.js';

const CYCLE_MS = 3200;   // one ledger entry per hover; fade is 160ms

// STATS (cards/index.js policy (a)) — live-computed sums of grant_applications
// rows (status awaiting_wallet/approved/paid), artcompute.org/grants, verified
// 2026-08-17; goes stale only if new grants land -> acceptable, dated fact.
// Round 2: three cells, no subs — the third states the programme's one
// surprising fact (grants are approved by an AI) as a value rather than a
// badge, in their violet, so the old three-badge row could go entirely.
const STATS = [
  { label: 'GRANTS',   value: '11',   cls: '' },
  { label: 'GPU HOURS', value: '473', cls: 'ac-value--green' },
  { label: 'APPROVAL', value: 'AUTO', cls: 'ac-value--violet' },
];

// The three newest grants on their /grants ledger, verified 2026-08-17.
const LEDGER = [
  { text: 'Loreweavr — Dual-LoRA Composition · 50h',       avatar: 'loreweavr.jpg' },
  { text: 'AshmoTV — Multi-angle IC-LoRA, LTX 2.3 · 50h',  avatar: 'ashmotv.jpg' },
  { text: 'Persoon — Obscura Remova IC-LoRA · 40h',        avatar: 'persoon.jpg' },
];

let rows = [], idx = 0, timer = null;

function show(i) {
  idx = i;
  rows.forEach((r, k) => r.classList.toggle('on', k === i));
}

export default {
  build(stage) {
    stage.classList.add('ac');

    // band 1 — identity, in the terminal's own voice (round 2: the shell
    // head is gone, so the stage names itself): wordmark in their green,
    // the programme in one microline under it, steady status dot right
    // (no pulse: a blinking dot would fake liveness their grant page
    // never promises)
    const header = document.createElement('div');
    header.className = 'ac-header';
    const ident = document.createElement('div');
    ident.className = 'ac-ident';
    const name = document.createElement('span');
    name.className = 'ac-name';
    name.textContent = 'ARTCOMPUTE';
    const tag = document.createElement('span');
    tag.className = 'ac-tagline';
    tag.textContent = 'MICRO-GRANTS FOR OPEN RESEARCH';
    ident.append(name, tag);
    const dot = document.createElement('span');
    dot.className = 'ac-dot';
    header.append(ident, dot);

    // band 2 — stat grid: three cells over a 1px hairline gap
    const grid = document.createElement('div');
    grid.className = 'ac-grid';
    for (const s of STATS) {
      const cell = document.createElement('div');
      cell.className = 'ac-cell';
      const label = document.createElement('span');
      label.className = 'ac-label';
      label.textContent = s.label;
      const value = document.createElement('span');
      value.className = `ac-value ${s.cls}`.trim();
      value.textContent = s.value;
      cell.append(label, value);
      grid.appendChild(cell);
    }

    // band 3 — the cycling ledger (their /grants list, newest first),
    // under one micro-label so the row reads at a glance
    const ledgerLabel = document.createElement('span');
    ledgerLabel.className = 'ac-ledger-label';
    ledgerLabel.textContent = 'LATEST GRANTS';
    const ledger = document.createElement('div');
    ledger.className = 'ac-ledger';
    rows = LEDGER.map((g) => {
      const row = document.createElement('div');
      row.className = 'ac-ledger-row';
      const avatar = document.createElement('img');
      avatar.className = 'ac-avatar';
      avatar.src = `${CARD_ASSETS}/artcompute/${g.avatar}`;
      avatar.alt = '';            // decorative: the recipient is named in text
      avatar.loading = 'lazy';
      avatar.decoding = 'async';
      const text = document.createElement('span');
      text.className = 'ac-ledger-text';
      text.textContent = g.text;
      const chip = document.createElement('span');
      chip.className = 'ac-chip';
      chip.textContent = 'PAID';
      row.append(avatar, text, chip);
      ledger.appendChild(row);
      return row;
    });

    // the ending — their green CTA voice, a full-width terminal band
    const door = document.createElement('a');
    door.className = 'ac-door card-cta';
    door.href = 'https://artcompute.org/';
    door.target = '_blank';
    door.rel = 'noopener noreferrer';
    door.tabIndex = -1;
    door.textContent = 'REQUEST COMPUTE →';

    stage.append(header, grid, ledgerLabel, ledger, door);
    show(0);   // parked still: the newest grant, shown whether or not motion
               // is reduced
  },

  activate() {
    if (REDUCE.matches || timer) return;
    show(0);   // fresh reveal always opens on the newest grant
    timer = setInterval(() => show((idx + 1) % rows.length), CYCLE_MS);
  },

  deactivate() {
    if (timer) { clearInterval(timer); timer = null; }
  },
};
