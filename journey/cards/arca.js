// arca — "glimpsing the competition itself" (the exemplar card; the other
// five modules follow this shape).
//
// This is arcagidan.com's OWN hero, miniaturized whole (Hannah, 2026-08-17:
// "copy the whole approach from the website because it's nicely done
// there"), verified against the live site this session:
//   REST   — all four figure posters side by side at FULL color; one
//            "ARCA GIDAN" line across them in Eubergine, cream #f5f0eb,
//            tracking 0.12em, with "THE" above and "PRIZE" below at
//            tracking 0.5em; the edition line sits IN the art as a bottom
//            microline (Hannah, 2026-08-17: in the section like 2RP, not
//            in a strip below).
//   HOVER  — pointing at a syllable (or, card-only affordance, its panel:
//            letters alone are too small a target at 344px) turns the
//            syllable #7b0b0b and scales it 1.1 (their transition-all
//            duration-500), drops the OTHER three panels into darkness
//            (their crossfade, duration-300), and PLAYS that figure's
//            video panel (Hannah, 2026-08-17: "the videos should play
//            upon hover like on the arca gidan website") — the site's own
//            /N_figure_video.mp4 files, hover-streamed (preload=none,
//            muted loop; 2–5MB each, so they are NOT bundled — the poster
//            beneath is the instant state and the fallback if streaming
//            fails). The eyebrows step aside, as their "The"/"Prize" do.
//   No idle motion: the site's resting state is simply vibrant. Under
//   REDUCE the videos are never loaded and states snap.
//
// Panels: its four hero posters (assets/cards/arca/poster-{1..4}.jpg,
// PROVENANCE.md) — Arnolfo di Cambio (AR), Francesco Petrarca (CA),
// Giotto di Bondone (GI), Jean Buridan (DAN), its own syllable->figure map.
//
// STATS (policy (a), cards/index.js): Edition II (Mar 2026) is COMPLETE —
// results announced 2026-04-06. Votes and payout verified 2026-08-17
// against the site's own Supabase (submission_details 7,287 verified
// votes; retrospective_payouts $56,800 confirmed paid). ENTRIES: 198 per
// Hannah (2026-08-17, her figure, shipped on her authority). NB the
// public competition_entries table showed 98 submitted + 56 draft rows
// (154 total) when checked twice on 2026-08-17 — if 198 is ever
// questioned, that API count is the other source, and the discrepancy
// was flagged to Hannah the day this shipped.

import { CARD_ASSETS, REDUCE } from './runtime.js';

// SELF-HOSTED as of 2026-08-18 (assets/cards/arca/video-{1..4}.mp4,
// PROVENANCE.md): the site's own hero videos, fetched the hour its domain
// came back from a day-long Railway outage, transcoded to ~250KB each.
// Local files also sidestep the stale-DNS window that made the remote
// URLs fail for cached resolvers.
//
// FILENAMES ONLY at module scope: paths are composed at runtime by light()
// and build(), keeping this inventory independent of the page's asset base.
const FIGURES = [
  { syl: 'AR', name: 'Arnolfo di Cambio', video: 'video-1.mp4' },
  { syl: 'CA', name: 'Francesco Petrarca', video: 'video-2.mp4' },
  { syl: 'GI', name: 'Giotto di Bondone', video: 'video-3.mp4' },
  { syl: 'DAN', name: 'Jean Buridan', video: 'video-4.mp4' },
];

let root = null, panels = [], syls = [], videos = [];

/** i = spotlit figure, or null for the vibrant resting state. */
function light(i) {
  root.classList.toggle('ag-hovering', i != null);
  panels.forEach((p, k) => p.classList.toggle('lit', k === i));
  syls.forEach((s, k) => s.classList.toggle('lit', k === i));
  videos.forEach((v, k) => {
    if (k === i && !REDUCE.matches) {
      // the src attaches on first spotlight, never sooner
      if (!v.src) v.src = `${CARD_ASSETS}/arca/${FIGURES[k].video}`;
      v.play().catch(() => {});     // autoplay veto -> the poster simply stays
    } else if (v.src) {
      v.pause();
      v.classList.remove('playing');
    }
  });
}

export default {
  build(stage) {
    stage.classList.add('ag');
    root = stage;
    const row = document.createElement('div');
    row.className = 'ag-panels';
    panels = FIGURES.map((f, i) => {
      const fig = document.createElement('figure');
      fig.className = 'ag-panel';
      const img = document.createElement('img');
      img.src = `${CARD_ASSETS}/arca/poster-${i + 1}.jpg`;
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      const vid = document.createElement('video');
      vid.className = 'ag-video';
      vid.muted = true;
      vid.loop = true;
      vid.playsInline = true;
      vid.preload = 'none';
      vid.setAttribute('aria-hidden', 'true');
      // the video surfaces only once it actually renders frames — until
      // then (and on any failure) the poster is the panel
      vid.addEventListener('playing', () => vid.classList.add('playing'));
      videos.push(vid);
      fig.append(img, vid);
      fig.addEventListener('pointerenter', () => light(i));
      fig.addEventListener('pointerleave', () => light(null));
      row.appendChild(fig);
      return fig;
    });

    // Round 3: the THE/PRIZE eyebrows are gone — the restored shell head
    // directly above says ARCA GIDAN PRIZE, and the in-art wordmark stays
    // only as the artwork's own signature (and the hover instrument: the
    // syllables are the site's interaction), set smaller and quieter by
    // cards.css so it no longer reads as a second header.
    const word = document.createElement('div');
    word.className = 'ag-word';
    word.setAttribute('aria-hidden', 'true');
    const title = document.createElement('div');
    title.className = 'ag-title';
    syls = FIGURES.map((f, i) => {
      const span = document.createElement('span');
      span.className = 'ag-syl';
      span.textContent = f.syl;
      // their signature interaction, letter-for-letter: the syllables are
      // the hover zones (the panels above merely widen the same target)
      span.addEventListener('pointerenter', () => light(i));
      span.addEventListener('pointerleave', () => light(null));
      title.appendChild(span);
      return span;
    });
    word.append(title);

    // THE RECORD, below the art rather than crowding it (round 2): three
    // cells, value over label, hairline-separated — everything written
    // moves onto the ink plate where it reads over nothing. Round 3 drops
    // the tracked caption that led the plate: it repeated the shell head's
    // short line word for word, and the head says it now. Same verified
    // figures as before (see the STATS provenance note at the top of this
    // file); "Edition II" rides the door's own destination rather than a
    // fourth cell.
    const foot = document.createElement('div');
    foot.className = 'ag-foot';
    const band = document.createElement('div');
    band.className = 'ag-band';
    for (const [num, lab] of [['198', 'ENTRIES'], ['7,287', 'VOTES'], ['$56.8K', 'PRIZES']]) {
      const cell = document.createElement('div');
      cell.className = 'ag-stat';
      const n = document.createElement('span');
      n.className = 'ag-num';
      n.textContent = num;
      const l = document.createElement('span');
      l.className = 'ag-lab';
      l.textContent = lab;
      cell.append(n, l);
      band.appendChild(cell);
    }

    // the ending, in the site's own voice — Edition II is OVER (results
    // announced 2026-04-06), so the door says what a visitor can actually
    // do: see the winners. The href is the site's own winners route.
    const door = document.createElement('a');
    door.className = 'ag-door card-door card-cta';
    door.href = 'https://arcagidan.com/winners/edition-2';
    door.target = '_blank';
    door.rel = 'noopener noreferrer';
    door.tabIndex = -1;
    door.textContent = 'SEE THE WINNERS →';
    foot.append(band, door);
    stage.append(row, word, foot);
  },

  activate() {},                      // hover-driven; nothing to start

  deactivate() { if (root) light(null); },  // never park mid-spotlight
};
