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

import { CARD_ASSETS, REDUCE } from './runtime.js';

const KEY = 'sb_publishable_O38oPBafrBoFrpi_rlWJvA_UJrulFsx';
const BASE = 'https://ujlwuvkrxlvoswwkerdf.supabase.co/rest/v1/daily_summaries';
const SELECT = 'full_summary,date,channel_id,discord_channels(channel_name)';
const FIRST_MS = 4500;    // the opening topic yields a little sooner
                          // (Hannah, 2026-08-18) — proof of more behind it
const CYCLE_MS = 7000;    // then one topic per 7s
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

let stage, headerLabel, topicEl, titleEl, textEl, metaEl, dotsEl, thumbEl;
let dots = [];
let topics = [];        // normalized { title, text, channel, date }
let index = 0;
let timer = null;
let active = false;     // activate/deactivate re-entrancy guard
let fallbackData = null;
let fallbackSnapshot = null;
let liveSnapshot = null;
let fallbackPromise = null;
let livePromise = null;

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

/* First showable image for a topic: mainMediaUrls, then the sub-topics'.
   Images pass through; videos contribute their poster frame. LIVE DATA
   ONLY — these are expiring Discord CDN links (the site refreshes them
   server-side), so the baked fallback deliberately ships without media and
   a dead link simply hides the thumb (img.onerror in renderTopic). */
function firstImage(t) {
  const pools = [t.mainMediaUrls, ...(t.subTopics || []).map((s) => s && s.subTopicMediaUrls)];
  for (const pool of pools) {
    if (!Array.isArray(pool)) continue;
    for (const m of pool) {
      if (!m || typeof m !== 'object') continue;
      if (m.type === 'image' && m.url) return m.url;
      if (m.type === 'video' && m.poster_url) return m.poster_url;
    }
  }
  return '';
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
      out.push({ title, text, channel, date, image: firstImage(t) });
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

/* Prepare Discord while the visitor is still travelling toward Connect.

   The generic card warmer fetches the JSON into the HTTP cache, but that does
   not parse it or start the live request, and this builder itself is not built
   until the first reveal. Previously activate() therefore opened an empty
   stage, painted the fallback on a later task, then sometimes replaced it
   with live data while the popover was still entering. That cold hydration
   was the last intermittent "pop" after the transform animations were
   removed.

   Preparation is data-only: no card DOM exists yet. A live result becomes the
   preferred snapshot for the next activation, but never replaces a fallback
   while the card is visible. Topic-to-topic cycling remains the only path
   that animates content after open. */
function prepareFallback() {
  if (fallbackPromise) return fallbackPromise;
  dates();
  fallbackPromise = getFallback().then((fb) => {
    fallbackSnapshot = {
      live: false,
      capturedAt: fb.capturedAt,
      topics: fb.topics,
    };

    // A direct deep link can beat even the local JSON. Fill that rare cold
    // edge as soon as the floor is ready, without waiting for the network.
    if (active && !topics.length) applySnapshot(fallbackSnapshot);
    return fallbackSnapshot;
  });
  return fallbackPromise;
}

function prepareLive() {
  if (livePromise) return livePromise;
  livePromise = prepareFallback().then(async () => {
    try {
      const liveTopics = await loadLive();
      if (liveTopics.length) {
        liveSnapshot = { live: true, capturedAt: '', topics: liveTopics };
      }
    } catch {
      // The parsed baked snapshot is already the complete offline result.
    }
    return liveSnapshot || fallbackSnapshot;
  });
  return livePromise;
}

function renderTopic(animate = true) {
  const t = topics[index];
  if (!t) return;
  titleEl.textContent = t.title;
  textEl.textContent = t.text;
  metaEl.textContent = metaFor(t);
  // the topic's image, very small (Hannah, 2026-08-18) — shown only once
  // it actually loads; an expired CDN link just leaves the text layout
  thumbEl.classList.remove('on');
  if (t.image) {
    thumbEl.onload = () => thumbEl.classList.add('on');
    thumbEl.onerror = () => thumbEl.classList.remove('on');
    thumbEl.src = t.image;
  } else {
    thumbEl.removeAttribute('src');
  }
  // Topic-to-topic changes rise in. Initial paint, reopen and async
  // fallback->live hydration render directly: the popover already owns that
  // entrance, and stacking both translations made Discord visibly shuffle.
  topicEl.classList.remove('dc-enter', 'dc-leave');
  if (animate && !REDUCE.matches) {
    void topicEl.offsetWidth;
    topicEl.classList.add('dc-enter');
  }
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

function restartTimer(firstMs = CYCLE_MS) {
  if (timer) { clearTimeout(timer); timer = null; }
  // `dc-live` arms the active pill's fill (the load state for the NEXT
  // item, Hannah 2026-08-17) — the fill's duration rides --dc-cycle so the
  // pill tells the truth about THIS window, including the shorter opener
  stage.classList.remove('dc-live');
  if (!active || REDUCE.matches || topics.length < 2) return;
  stage.style.setProperty('--dc-cycle', `${firstMs}ms`);
  stage.classList.add('dc-live');
  const tick = () => {
    stage.style.setProperty('--dc-cycle', `${CYCLE_MS}ms`);
    cycleTo((index + 1) % topics.length);
    timer = setTimeout(tick, CYCLE_MS);
  };
  timer = setTimeout(tick, firstMs);
}

function present() {
  renderTopic(false);
  renderDots();
  // the opening topic yields a little sooner (Hannah, 2026-08-18) — early
  // proof there is more behind it; the walk then settles into its 7s
  restartTimer(FIRST_MS);
}

function applySnapshot(snapshot) {
  topics = snapshot.topics;
  index = 0;
  headerLabel.textContent = snapshot.live
    ? 'LIVE FROM THE DISCORD'
    : `FROM THE DISCORD · ${snapshot.capturedAt}`.trim();
  stage.classList.toggle('dc-fallback', !snapshot.live);
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
    headerLabel.textContent = 'FROM THE DISCORD';
    // the door, right-aligned in the head; revealed on hover/pin by the
    // shared card-cta rule (margin-left:auto in css)
    const cta = document.createElement('a');
    cta.className = 'dc-cta card-cta';
    cta.href = 'https://discord.gg/NnFxGvx94b';
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
    cta.tabIndex = -1;
    cta.textContent = 'JOIN →';
    head.append(beacon, headerLabel, cta);

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
    // Stable cold-edge floor for a direct link that arrives before the
    // module-level preparation has parsed the bundled snapshot. The stage's
    // min-height already reserves the final geometry; hydration changes only
    // these words and never starts the topic shuffle.
    titleEl.textContent = 'Loading the latest community notes…';
    const copy = document.createElement('div');
    copy.className = 'dc-copy';
    copy.append(titleEl, textEl, metaEl);
    thumbEl = document.createElement('img');
    thumbEl.className = 'dc-thumb';
    thumbEl.alt = '';
    thumbEl.loading = 'lazy';
    thumbEl.decoding = 'async';
    thumbEl.referrerPolicy = 'no-referrer';
    topicEl.append(copy, thumbEl);
    body.appendChild(topicEl);

    dotsEl = document.createElement('div');
    dotsEl.className = 'dc-dots';

    // horizontal swipe through the topics (2026-08-19): a finger pull steps
    // the walk — right pulls the previous topic back in, left advances to
    // the next — with the same semantics as a dot tap (the 7s window
    // restarts). Only a committed horizontal drag steps.
    let swipe = null;
    const SWIPE_MIN_X = 44;   // px of horizontal travel before a swipe commits
    const onSwipeDown = (e) => {
      if (e.pointerType !== 'touch') return;
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
    };
    const onSwipeMove = (e) => {
      if (!swipe || e.pointerId !== swipe.id) return;
      swipe.dx = e.clientX - swipe.x;
      swipe.dy = e.clientY - swipe.y;
    };
    const onSwipeUp = (e) => {
      if (!swipe || e.pointerId !== swipe.id) return;
      const { dx = 0, dy = 0 } = swipe;
      swipe = null;
      if (Math.abs(dx) < SWIPE_MIN_X || Math.abs(dx) <= Math.abs(dy)) return;
      jumpTo(index + (dx < 0 ? 1 : -1));
    };
    stage.addEventListener('pointerdown', onSwipeDown, { passive: true });
    stage.addEventListener('pointermove', onSwipeMove, { passive: true });
    stage.addEventListener('pointerup', onSwipeUp, { passive: true });
    stage.addEventListener('pointercancel', () => { swipe = null; });

    stage.append(head, body, dotsEl);
    stage.classList.add('dc-fallback');
  },

  activate() {
    active = true;
    const ready = liveSnapshot || fallbackSnapshot;
    if (ready) { applySnapshot(ready); return; }
    // Usually already running from module boot. A direct deep link can win
    // the race; prepareFallback installs the baked floor as soon as it parses.
    prepareFallback();
    prepareLive();
  },

  deactivate() {
    active = false;
    if (timer) { clearInterval(timer); timer = null; }
    if (pendingSwap) {
      // never park mid-shuffle: land the swap so the card re-opens settled
      clearTimeout(pendingSwap);
      pendingSwap = null;
      topicEl.classList.remove('dc-leave');
      renderTopic(false);
      renderDots();
    }
  },
};

// discord.js executes while cards/index.js is still initializing, so defer one
// task before touching CARD_ASSETS. Parse the tiny local floor immediately;
// start the remote request only when the opening work yields (or after the
// timeout), well before a normal journey can reach Connect.
if (typeof document !== 'undefined') {
  setTimeout(prepareFallback, 0);
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(prepareLive, { timeout: 1500 });
  } else {
    setTimeout(prepareLive, 1200);
  }
}
