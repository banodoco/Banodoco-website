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

import { CARD_ASSETS, REDUCE } from './index.js';

const CYCLE_MS = 3200;   // one ledger entry per hover; fade is 160ms

// STATS (cards/index.js policy (a)) — live-computed sums of grant_applications
// rows (status awaiting_wallet/approved/paid), artcompute.org/grants, verified
// 2026-08-17; goes stale only if new grants land -> acceptable, dated fact.
const STATS = [
  { label: 'GRANTS',  value: '11',    sub: 'approved' },
  { label: 'COMPUTE', value: '473h',  sub: 'GPU hours allocated' },
];

const BADGES = [
  { text: '10–50 GPU HRS', cls: 'ac-badge--green' },
  { text: 'AUTO APPROVAL', cls: 'ac-badge--violet' },
  { text: 'OPEN SOURCE',   cls: 'ac-badge--sky' },
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

    // band 1 — header: wordmark left, steady status dot right (no pulse:
    // a blinking dot would fake liveness their grant page never promises)
    const header = document.createElement('div');
    header.className = 'ac-header';
    const title = document.createElement('span');
    title.className = 'ac-title';
    title.textContent = 'ARTCOMPUTE';
    const dot = document.createElement('span');
    dot.className = 'ac-dot';
    header.append(title, dot);

    // band 2 — stat grid: two cells over a 1px hairline gap
    const grid = document.createElement('div');
    grid.className = 'ac-grid';
    for (const s of STATS) {
      const cell = document.createElement('div');
      cell.className = 'ac-cell';
      const label = document.createElement('span');
      label.className = 'ac-label';
      label.textContent = s.label;
      const value = document.createElement('span');
      value.className = 'ac-value';
      value.textContent = s.value;
      const sub = document.createElement('span');
      sub.className = 'ac-sub';
      sub.textContent = s.sub;
      cell.append(label, value, sub);
      grid.appendChild(cell);
    }

    // band 3a — the three grant badges in their own palette
    const badges = document.createElement('div');
    badges.className = 'ac-badges';
    for (const b of BADGES) {
      const pill = document.createElement('span');
      pill.className = `ac-badge ${b.cls}`;
      pill.textContent = b.text;
      badges.appendChild(pill);
    }

    // band 3b — the cycling ledger (their /grants list, newest first)
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

    stage.append(header, grid, badges, ledger);
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
