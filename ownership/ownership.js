/* ownership.js — page behaviour: the two data tabs, the grants /
   transfers / ownership tables, filter, sort, and the show-more reveals.
   The ledger lives in data.js (built separately) — this module renders it,
   so the tables stay data, not markup. */
import { GRANTS, TRANSFERS, OWNERSHIP } from './data.js';
import { initMycelium } from './mycelium.js';

/* ============================================================
   TABS — two corner-tick buttons over a hairline. Clicking or
   arrow-keying (left/right/home/end) switches the panel; the
   active tab is the only one in the tab order. ============================================================ */
const tablist = document.querySelector('.tabs');
const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

function selectTab(tab) {
  tabs.forEach((t) => {
    const active = t === tab;
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !active;
  });
}

tabs.forEach((t) => t.addEventListener('click', () => selectTab(t)));
tablist.addEventListener('keydown', (e) => {
  const i = tabs.indexOf(document.activeElement);
  if (i === -1) return;
  let next = -1;
  if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
  else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = tabs.length - 1;
  if (next === -1) return;
  e.preventDefault();
  selectTab(tabs[next]);
  tabs[next].focus();
});

/* ============================================================
   GRANTS — raw strings are `|`-separated segments; a segment is
   `GROUPNAME: name;name;...` or a bare run of names (pre-group
   months, and any trailing segment without a prefix). Each group
   renders as a small-caps gold chip + middot; names are joined
   by thin middots. Newest month first from data.js; 3 rows at
   first, "Show more" reveals the rest. ============================================================ */
const GRANT_ROWS_VISIBLE = 3;
const grantsBody = document.querySelector('.grants-table tbody');
const grantsMore = document.getElementById('grants-more');
const grantsMoreLabel = document.getElementById('grants-more-label');

function parseGrantSegment(seg) {
  seg = seg.trim();
  const m = seg.match(/^([^:]+):(.*)$/s);
  if (m) {
    return { group: m[1].trim(), names: m[2].split(';').map((s) => s.trim()).filter(Boolean) };
  }
  return { group: null, names: seg.split(';').map((s) => s.trim()).filter(Boolean) };
}

function middot() {
  const s = document.createElement('span');
  s.className = 'grant-sep';
  s.textContent = '\u00b7';
  return s;
}

function renderGrants() {
  const frag = document.createDocumentFragment();
  for (const row of GRANTS) {
    const tr = document.createElement('tr');

    const month = document.createElement('td');
    month.className = 'month';
    month.textContent = row.month;

    const cell = document.createElement('td');
    cell.className = 'grants';
    /* each group segment is its own line — run inline, the last name of one
       group collides with the next group's chip */
    for (const seg of row.grants.split('|').map(parseGrantSegment)) {
      const line = document.createElement('div');
      line.className = 'grant-seg';
      if (seg.group) {
        const chip = document.createElement('span');
        chip.className = 'grant-group';
        chip.textContent = seg.group;
        line.appendChild(chip);
      }
      seg.names.forEach((name, i) => {
        if (i > 0) line.appendChild(middot());
        const n = document.createElement('span');
        n.className = 'grant-name';
        n.textContent = name;
        line.appendChild(n);
      });
      cell.appendChild(line);
    }
    tr.append(month, cell);
    frag.appendChild(tr);
  }
  grantsBody.appendChild(frag);
}

let grantsExpanded = false;
function applyGrantsVisibility() {
  const rows = Array.from(grantsBody.rows);
  rows.forEach((r, i) => { r.hidden = !grantsExpanded && i >= GRANT_ROWS_VISIBLE; });
  grantsMoreLabel.textContent = grantsExpanded ? 'Show less' : `Show all ${GRANTS.length} months`;
}
grantsMore.addEventListener('click', () => {
  grantsExpanded = !grantsExpanded;
  applyGrantsVisibility();
});

/* ============================================================
   TRANSFERS — four columns, amount in gold tabular numerals. ============================================================ */
const transfersBody = document.querySelector('.transfers-table tbody');
for (const t of TRANSFERS) {
  const tr = document.createElement('tr');
  for (const key of ['from', 'to', 'amount', 'date']) {
    const td = document.createElement('td');
    if (key === 'amount') td.className = 'amount';
    td.textContent = t[key];
    tr.appendChild(td);
  }
  transfersBody.appendChild(tr);
}

/* ============================================================
   OWNERSHIP — 370 rows, sorted granted desc by default, 25 shown
   until "Show all". Headers sort (asc/desc with a gold arrow);
   the filter narrows by username substring as you type; the
   granted cell carries a micro-bar proportional to
   granted/max(granted). Percentages are each user's share of
   the column's total, to 4 decimals. ============================================================ */
const OWNERSHIP_PAGE = 25;
const ownershipBody = document.querySelector('.ownership-table tbody');
const ownershipMore = document.getElementById('ownership-more');
const ownershipMoreLabel = document.getElementById('ownership-more-label');
const filterInput = document.getElementById('ownership-filter');
const countLine = document.getElementById('ownership-count');
const sortButtons = Array.from(document.querySelectorAll('.ownership-table .sort-btn'));

const maxGranted = Math.max(...OWNERSHIP.map((o) => o.granted));
/* The ledger's own numbers, printed as banodoco.ai/ownership prints them —
   toFixed(4) on the stored value. Never recomputed: the mirror must show
   the figures the source of record shows, rounding artefacts and all. */
const pct = (v) => v.toFixed(4) + '%';

let sortKey = 'granted';
let sortDir = 'desc';
let ownershipExpanded = false;
let filterText = '';

function visibleRows() {
  const q = filterText.toLowerCase();
  const rows = OWNERSHIP.filter((o) => !q || o.username.toLowerCase().includes(q));
  const dir = sortDir === 'asc' ? 1 : -1;
  rows.sort((a, b) => {
    if (sortKey === 'username') return a.username.localeCompare(b.username) * dir;
    return (a[sortKey] - b[sortKey]) * dir;
  });
  return rows;
}

function syncSortIndicators() {
  sortButtons.forEach((btn) => {
    const th = btn.closest('th');
    const active = btn.dataset.key === sortKey;
    th.setAttribute('aria-sort', active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
    btn.querySelector('.arrow').textContent = active && sortDir === 'asc' ? '\u2191' : '\u2193';
  });
}

function renderOwnership() {
  const rows = visibleRows();
  ownershipBody.textContent = '';

  const shown = ownershipExpanded ? rows.length : Math.min(rows.length, OWNERSHIP_PAGE);
  const frag = document.createDocumentFragment();
  for (let i = 0; i < shown; i++) {
    const o = rows[i];
    const tr = document.createElement('tr');

    const user = document.createElement('td');
    user.className = 'contributor';
    user.textContent = o.username;

    const granted = document.createElement('td');
    granted.className = 'num';
    const gNum = document.createElement('span');
    gNum.textContent = pct(o.granted);
    const bar = document.createElement('span');
    bar.className = 'microbar';
    const fill = document.createElement('i');
    fill.style.width = `${maxGranted > 0 ? (o.granted / maxGranted) * 100 : 0}%`;
    bar.appendChild(fill);
    granted.append(gNum, bar);

    const total = document.createElement('td');
    total.className = 'num';
    total.textContent = pct(o.total);

    tr.append(user, granted, total);
    frag.appendChild(tr);
  }
  ownershipBody.appendChild(frag);

  countLine.textContent = filterText.trim()
    ? `${rows.length} of ${OWNERSHIP.length} contributors`
    : `${OWNERSHIP.length} contributors \u00b7 100% shared`;
  ownershipMoreLabel.textContent = ownershipExpanded
    ? `Show first ${OWNERSHIP_PAGE}`
    : `Show all ${OWNERSHIP.length} contributors`;
  ownershipMore.hidden = rows.length <= OWNERSHIP_PAGE;
  syncSortIndicators();
}

sortButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.key;
    if (key === sortKey) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortKey = key;
      sortDir = key === 'username' ? 'asc' : 'desc';
    }
    renderOwnership();
  });
});

filterInput.addEventListener('input', () => {
  filterText = filterInput.value;
  renderOwnership();
});

ownershipMore.addEventListener('click', () => {
  ownershipExpanded = !ownershipExpanded;
  renderOwnership();
});

/* --- boot --- */
renderGrants();
applyGrantsVisibility();
renderOwnership();
initMycelium();
