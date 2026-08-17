// discord — "what's happening right now".
//
// Reuses the EXACT data source banodoco.ai's Community section reads
// (verified in its repo + live 2026-08-17): Supabase table daily_summaries,
// AI-written digests of the day's Discord activity. Each row's full_summary
// is a JSON STRING encoding an array of topics ({ title, mainText,
// subTopics:[{text}], … }). We fetch today, and — the site's own fallback
// logic — if fewer than 2 topics come back, also fetch yesterday and append.
// Any failure (network, abort, zero topics) renders the baked snapshot
// assets/cards/discord/fallback.json, labeled with its capturedAt date
// instead of "live". The fetch is guarded by a 4s AbortController so a hung
// request can never hold the card; on abort -> fallback, no retries.
//
// The publishable key ships in banodoco.ai's public bundle (public by design).

import { CARD_ASSETS, REDUCE } from './index.js';

const KEY = 'sb_publishable_O38oPBafrBoFrpi_rlWJvA_UJrulFsx';
const BASE = 'https://ujlwuvkrxlvoswwkerdf.supabase.co/rest/v1/daily_summaries';
const SELECT = 'full_summary,date,channel_id,discord_channels(channel_name)';
const CYCLE_MS = 7000;    // one topic per 7s
const LEAVE_MS = 190;     // outgoing topic's exit — must match .dc-leave
const TIMEOUT_MS = 4000;  // fetch timeout guard

// The site's own citation-stripping regex (from its Community bundle),
// plus markdown emphasis/code markers — the site renders those; a plain-
// text card must shed them or print literal asterisks.
const CITATION_RE = /\s*\[\[?\d+\]?\]\(https?:\/\/[^)]*\)/g;
const clean = (s) => String(s ?? '')
  .replace(CITATION_RE, '')
  .replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/`([^`]+)`/g, '$1')
  .trim();

let stage, headerLabel, topicEl, titleEl, textEl, metaEl, dotsEl;
let dots = [];
let topics = [];        // normalized { title, text, channel, date }
let index = 0;
let timer = null;
let active = false;     // activate/deactivate re-entrancy guard
let fetchPromise = null;
let fallbackData = null;

function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let todayStr = '';
let yesterdayStr = '';
function dates() {
  if (todayStr) return;
  const now = new Date();
  todayStr = iso(now);
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  yesterdayStr = iso(y);
}

function relDate(d) {
  if (!d) return '';
  if (d === todayStr) return 'today';
  if (d === yesterdayStr) return 'yesterday';
  return d;
}

function metaFor(t) {
  const parts = [];
  if (t.channel) parts.push(`#${t.channel}`);
  const rd = relDate(t.date);
  if (rd) parts.push(rd);
  return parts.join(' · ');
}

// Rows → display topics. full_summary is a JSON string; a row whose summary
// won't parse is skipped (a parse miss, not a network failure).
function topicsFromRows(rows) {
  const out = [];
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    let arr;
    try { arr = JSON.parse(row.full_summary); } catch { continue; }
    if (!Array.isArray(arr)) continue;
    const rel = Array.isArray(row.discord_channels)
      ? row.discord_channels[0] : row.discord_channels;
    const channel = rel?.channel_name || '';
    const date = row.date || '';
    for (const t of arr) {
      if (!t || typeof t !== 'object') continue;
      const title = clean(t.title);
      const text = clean(t.mainText);
      if (!title && !text) continue;
      out.push({ title, text, channel, date });
    }
  }
  return out;
}

async function fetchDate(dateStr) {
  const url = `${BASE}?select=${SELECT}&included_in_main_summary=eq.true&dev_mode=eq.false&date=eq.${dateStr}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    return topicsFromRows(rows);
  } finally {
    clearTimeout(to);
  }
}

// Today, then (if fewer than 2 topics) yesterday appended — the site's own
// today→yesterday fallback. Throws only on a hard today failure (→ fallback).
async function loadLive() {
  const today = await fetchDate(todayStr);
  let topics = today;
  if (topics.length < 2) {
    try { topics = topics.concat(await fetchDate(yesterdayStr)); }
    catch { /* keep today's topics */ }
  }
  return topics;
}

async function getFallback() {
  if (fallbackData) return fallbackData;
  try {
    const res = await fetch(`${CARD_ASSETS}/discord/fallback.json`);
    const data = await res.json();
    fallbackData = {
      capturedAt: data.capturedAt || '',
      topics: (data.topics || []).map((t) => ({
        title: clean(t.title),
        text: clean(t.text),
        channel: t.channel || '',
        date: t.date || '',
      })),
    };
  } catch {
    // The local snapshot is a bundled asset and will not miss; this guard is
    // the never-empty floor if even it fails.
    fallbackData = {
      capturedAt: '',
      topics: [{ title: 'The Discord daily summary is unavailable right now.', text: '', channel: '', date: '' }],
    };
  }
  return fallbackData;
}

function renderTopic() {
  const t = topics[index];
  if (!t) return;
  titleEl.textContent = t.title;
  textEl.textContent = t.text;
  metaEl.textContent = metaFor(t);
  // restart the entrance; a reflow lets the same class re-trigger
  topicEl.classList.remove('dc-enter');
  void topicEl.offsetWidth;
  topicEl.classList.add('dc-enter');
}

/* The shuffle (Hannah, 2026-08-17: "a nice elegant shuffle"): the standing
   topic slips up and out, the next one rises in after it — two beats, not
   a hard swap. REDUCE (and the very first paint) render directly. */
let pendingSwap = null;
function cycleTo(i) {
  if (pendingSwap) { clearTimeout(pendingSwap); pendingSwap = null; }
  if (REDUCE.matches) {
    index = i;
    renderTopic();
    renderDots();
    return;
  }
  topicEl.classList.remove('dc-enter');
  topicEl.classList.add('dc-leave');
  pendingSwap = setTimeout(() => {
    pendingSwap = null;
    topicEl.classList.remove('dc-leave');
    index = i;
    renderTopic();
    renderDots();
  }, LEAVE_MS);
}

function buildDots() {
  dots = [];
  dotsEl.replaceChildren();
  topics.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dc-dot';
    b.tabIndex = -1;
    b.setAttribute('aria-label', `Show topic ${i + 1}`);
    b.addEventListener('click', () => jumpTo(i));
    dotsEl.appendChild(b);
    dots.push(b);
  });
  renderDots();
}

function renderDots() {
  dots.forEach((d, i) => {
    const on = i === index;
    d.classList.toggle('is-on', on);
    if (on) {
      // restart the pill's fill so its 7s always tracks this item's window
      d.classList.remove('dc-filling');
      void d.offsetWidth;
      d.classList.add('dc-filling');
    } else {
      d.classList.remove('dc-filling');
    }
  });
}

function jumpTo(i) {
  if (!topics.length) return;
  cycleTo(((i % topics.length) + topics.length) % topics.length);
  restartTimer();   // a click restarts the 7s window
}

function restartTimer() {
  if (timer) { clearInterval(timer); timer = null; }
  // `dc-live` arms the active pill's fill (the load state for the NEXT
  // item, Hannah 2026-08-17) — its CSS duration must equal CYCLE_MS
  stage.classList.remove('dc-live');
  if (!active || REDUCE.matches || topics.length < 2) return;
  stage.classList.add('dc-live');
  timer = setInterval(() => cycleTo((index + 1) % topics.length), CYCLE_MS);
}

function present() {
  renderTopic();
  renderDots();
  restartTimer();
}

async function showFallback() {
  const fb = await getFallback();
  topics = fb.topics;
  index = 0;
  headerLabel.textContent = `FROM THE DISCORD · ${fb.capturedAt}`.trim();
  stage.classList.add('dc-fallback');
  buildDots();
  present();
}

function showLive(liveTopics) {
  topics = liveTopics;
  index = 0;
  headerLabel.textContent = 'LIVE FROM THE DISCORD';
  stage.classList.remove('dc-fallback');
  buildDots();
  present();
}

export default {
  build(s) {
    stage = s;
    stage.classList.add('dc');

    const head = document.createElement('div');
    head.className = 'dc-head';
    const beacon = document.createElement('span');
    beacon.className = 'dc-beacon';
    beacon.setAttribute('aria-hidden', 'true');
    headerLabel = document.createElement('span');
    headerLabel.className = 'dc-label';
    headerLabel.textContent = 'LIVE FROM THE DISCORD';
    head.append(beacon, headerLabel);

    const body = document.createElement('div');
    body.className = 'dc-body';
    topicEl = document.createElement('div');
    topicEl.className = 'dc-topic';
    titleEl = document.createElement('p');
    titleEl.className = 'dc-title';
    textEl = document.createElement('p');
    textEl.className = 'dc-text';
    metaEl = document.createElement('p');
    metaEl.className = 'dc-meta';
    topicEl.append(titleEl, textEl, metaEl);
    body.appendChild(topicEl);

    dotsEl = document.createElement('div');
    dotsEl.className = 'dc-dots';

    stage.append(head, body, dotsEl);
  },

  activate() {
    dates();
    active = true;
    if (topics.length) { present(); return; }   // content already resolved
    if (fetchPromise) return;                   // fetch in flight; it renders
    // Paint the baked snapshot as the floor (never an empty stage), then go
    // live once the fetch settles; on failure the snapshot stays.
    fetchPromise = (async () => {
      await showFallback();
      const live = await loadLive();
      if (!live.length) throw new Error('zero topics');
      showLive(live);
    })().catch(() => showFallback());
  },

  deactivate() {
    active = false;
    if (timer) { clearInterval(timer); timer = null; }
    if (pendingSwap) {
      // never park mid-shuffle: land the swap so the card re-opens settled
      clearTimeout(pendingSwap);
      pendingSwap = null;
      topicEl.classList.remove('dc-leave');
      renderTopic();
      renderDots();
    }
  },
};
