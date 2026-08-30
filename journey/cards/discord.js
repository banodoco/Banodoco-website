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

// The topic's provenance as compact tag chips (round 2: the written-out
// uppercase meta line read as more copy; a channel and a day are tags).
function metaFor(t) {
  const parts = [];
  if (t.channel) parts.push(`#${t.channel}`);
  const rd = relDate(t.date);
  if (rd) parts.push(rd);
  return parts;
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
// Exported ONLY so tools/test-discord-card.mjs can exercise the :107
// diagnostic-loss-catch fix directly (same-row-skip proof) without a
// network fetch; every internal call site still uses it exactly as before.
export function topicsFromRows(rows) {
  const out = [];
  if (!Array.isArray(rows)) return out;
  for (const row of rows) {
    let arr;
    try {
      arr = JSON.parse(row.full_summary);
    } catch (err) {
      // Q04/D9: the ONE diagnostic-loss catch in this file. Skipping a
      // malformed row is still the right visitor-facing behavior (same
      // skip, same continue, same output) — this warn only stops a real
      // content-pipeline bug from sitting unnoticed forever. The other
      // three catches in this module (:148, :167, :218) are intentional-
      // safe fallbacks with visible fallback copy and stay silent.
      console.warn('[discord-card] full_summary row failed to parse as JSON — skipping row', err);
      continue;
    }
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
  metaEl.replaceChildren(...metaFor(t).map((txt) => {
    const chip = document.createElement('span');
    chip.className = 'dc-tag';
    chip.textContent = txt;
    return chip;
  }));
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
  // Round 2: the head already says DISCORD, so the status corner says only
  // what the feed IS — live, or a dated snapshot (owner direction,
  // 2026-08-30: "Live from the Discord" -> cleaner).
  headerLabel.textContent = snapshot.live
    ? 'LIVE UPDATES'
    : (snapshot.capturedAt || 'SNAPSHOT');
  stage.classList.toggle('dc-fallback', !snapshot.live);
  buildDots();
  present();
}

export default {
  build(s) {
    stage = s;
    stage.classList.add('dc');

    // Round 3: the round-2 wordmark leaves this row — the restored shell
    // head says DISCORD — and the feed's status corner (beacon plus one
    // word) keeps the row alone, top-right over the topics like a
    // broadcast bug.
    const head = document.createElement('div');
    head.className = 'dc-head';
    const status = document.createElement('span');
    status.className = 'dc-status';
    const beacon = document.createElement('span');
    beacon.className = 'dc-beacon';
    beacon.setAttribute('aria-hidden', 'true');
    headerLabel = document.createElement('span');
    headerLabel.className = 'dc-label';
    headerLabel.textContent = 'UPDATES';
    status.append(beacon, headerLabel);
    head.append(status);

    const body = document.createElement('div');
    body.className = 'dc-body';
    topicEl = document.createElement('div');
    topicEl.className = 'dc-topic';
    titleEl = document.createElement('p');
    titleEl.className = 'dc-title';
    textEl = document.createElement('p');
    textEl.className = 'dc-text';
    metaEl = document.createElement('div');
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

    // the ending — the invite as a full-width band in their blurple, the
    // walk's dots resting just above it
    const door = document.createElement('a');
    door.className = 'dc-door card-door card-cta';
    door.href = 'https://discord.gg/NnFxGvx94b';
    door.target = '_blank';
    door.rel = 'noopener noreferrer';
    door.tabIndex = -1;
    door.textContent = 'JOIN THE DISCORD →';

    stage.append(head, body, dotsEl, door);
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

// startDiscordPreparation() — the sole owner of the two-step boot schedule
// below. Behavior is byte-for-byte identical to the old bare self-start:
// discord.js executes while cards/index.js is still initializing, so defer
// one task before touching CARD_ASSETS. Parse the tiny local floor
// immediately (setTimeout(prepareFallback, 0)); start the remote request
// only when the opening work yields — requestIdleCallback(prepareLive,
// {timeout: 1500}) when available, else setTimeout(prepareLive, 1200) —
// well before a normal journey can reach Connect. `overrides` exists ONLY
// so tests can inject clock/idle doubles without a browser and without a
// real network request; every default resolves to the real ambient
// global, so a call with no arguments (the only way this is called today,
// via the self-start guard below) is indistinguishable from the old code.
//
// `prepareFallback`/`prepareLive` themselves are untouched — same
// functions, same promises, same fetch calls inside them, called from the
// same two scheduled sites as before AND still directly from activate()
// (line ~439) for the direct-deep-link race. This owner only wraps *when*
// those two calls get scheduled and gives that schedule a cancel handle;
// it does not change what gets fetched or when the fetch itself fires
// once a call has been made.
//
// requestIdleCallback availability is resolved at call time of
// startDiscordPreparation() — i.e. import time via the guard below, the
// same moment the original bare code checked it — so there is no
// deferred-vs-immediate divergence to introduce here (unlike U01a's
// warming cascade, this file's original check was never deferred to
// begin with).
//
// Returns cancelDiscordPreparation(): idempotent, safe to call before
// either scheduled call fires (zero fetches — neither prepareFallback nor
// prepareLive ever runs), mid-flight (if the fallback call already fired
// but the live call has not, cancelling prevents prepareLive from ever
// starting; the fallback's own in-flight work is not aborted — this does
// not attempt to abort in-flight requests, matching U01a's cascade), or
// after both have already fired naturally (true no-op, does not throw).
// Both scheduled callbacks re-check the cancelled flag at fire time as the
// actual correctness mechanism; clearing the timer/idle handle is a
// best-effort optimization on top of that, not the only guard.
export function startDiscordPreparation(overrides = {}) {
  const setTimeoutFn = overrides.setTimeoutFn || setTimeout;
  const clearTimeoutFn = overrides.clearTimeoutFn || clearTimeout;
  const ric = typeof overrides.requestIdleCallbackFn === 'function'
    ? overrides.requestIdleCallbackFn
    : (typeof requestIdleCallback === 'function' ? requestIdleCallback : undefined);
  const cancelRic = typeof overrides.cancelIdleCallbackFn === 'function'
    ? overrides.cancelIdleCallbackFn
    : (typeof cancelIdleCallback === 'function' ? cancelIdleCallback : undefined);

  let cancelled = false;

  const fallbackTimerId = setTimeoutFn(() => {
    if (cancelled) return;
    prepareFallback();
  }, 0);

  let liveTimerId = null;
  let liveIdleHandle = null;
  if (ric) {
    liveIdleHandle = ric(() => {
      if (cancelled) return;
      prepareLive();
    }, { timeout: 1500 });
  } else {
    liveTimerId = setTimeoutFn(() => {
      if (cancelled) return;
      prepareLive();
    }, 1200);
  }

  return function cancelDiscordPreparation() {
    if (cancelled) return;
    cancelled = true;
    clearTimeoutFn(fallbackTimerId);
    if (liveTimerId !== null) clearTimeoutFn(liveTimerId);
    if (liveIdleHandle !== null && cancelRic) cancelRic(liveIdleHandle);
  };
}

if (typeof document !== 'undefined') {
  // Self-start by design (U01d preserves today's behavior, matching the
  // sequencing decision U01a made for the sibling warming cascade) — a
  // later order (U01c/B-series) replaces this with an explicit call site
  // from main.js or the journey facade so the schedule can actually be
  // stopped. This card's import-time fetch of live Discord topic data is
  // NOT retired here; only its ownership and cancellability change.
  startDiscordPreparation();
}
