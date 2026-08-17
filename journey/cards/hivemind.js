// hivemind — "watching the collective brain work".
//
// github.com/banodoco/hivemind has no web UI and almost no visual identity:
// its languages are the query, the citation, and the count — plus one mascot.
// This card replays a real query from the repo's golden evaluation set as a
// short terminal transcript, parks its one face (the pixel-art librarian)
// bottom-right, and carries the stat footer as a dated inventory snapshot.
// There is no brand palette to borrow, so the card wears the house gold
// (site.css's #d9a441 family) on the house-dark ground and a plain terminal
// mono face.
//
// VERBATIM (golden set G046, eval/retrieval/golden/, verified 2026-08-17):
//   query          "make the motion less jittery"
//   hit            "⤷ distillation #5 · cites Kijai"
//   answer snippet "LightX2V is useful on interpolation, but applying it to
//                   the global model can suppress most motion…" — the judged
//                   best hit (distillation 5), whose answer_snippet cites
//                   Kijai.
// STATS (policy (a), cards/index.js): "1,248,240 messages · 2,759 resources
//   & workflows" — corpus inventory snapshot 2026-07-28,
//   docs/hybrid-search/phase0-inventory.json. (The task brief's "~4,000
//   workflows" was a synthetic test fixture in that repo — corrected.)

import { CARD_ASSETS, REDUCE } from './index.js';

const QUERY = 'make the motion less jittery';
const SEARCH = 'searching 1,248,240 messages…';
const HIT = '⤷ distillation #5 · cites Kijai';
const ANSWER = '"LightX2V is useful on interpolation, but applying it to the global model can suppress most motion…"';
const STATS = '1,248,240 messages · 2,759 resources & workflows';

// Loop budget ≈ 14s: QUERY.length × CHAR_MS type-out + the dwells below.
const CHAR_MS = 70;
const HOLD_QUERY_MS = 1400;
const SEARCH_MS = 2000;
const HIT_MS = 1500;
const ANSWER_MS = 6400;
const FADE_MS = 600;

let qText, searchEl, hitEl, ansEl;
let script = null;
let running = false;   // activate/deactivate re-entrancy guard
let token = 0;         // bumped on (de)activate to void a pending chain
let timer = null;

// The finished transcript, parked as a complete still (REDUCE and build()).
function settle() {
  qText.textContent = QUERY;
  searchEl.classList.add('on', 'done');
  hitEl.classList.add('on');
  ansEl.classList.add('on');
}

// The blank start of a replay pass.
function clearAll() {
  qText.textContent = '';
  searchEl.classList.remove('on', 'done');
  hitEl.classList.remove('on');
  ansEl.classList.remove('on');
}

// One step at a time; a single pending timeout per pass. `token` voids it on
// deactivate so no dangling reveal ever resumes after the card is gone.
function play(script, i = 0) {
  if (!running) return;
  if (i >= script.length) { play(script, 0); return; }
  const t = token;
  const [ms, fn] = script[i];
  timer = setTimeout(() => {
    if (t !== token) return;
    fn();
    play(script, i + 1);
  }, ms);
}

export default {
  build(stage) {
    stage.classList.add('hm');

    const consoleEl = document.createElement('div');
    consoleEl.className = 'hm-console';
    consoleEl.setAttribute('aria-hidden', 'true');

    const q = document.createElement('p');
    q.className = 'hm-line hm-query';
    const prompt = document.createElement('span');
    prompt.className = 'hm-prompt';
    prompt.textContent = '› ';
    qText = document.createElement('span');
    qText.className = 'hm-typed';
    q.append(prompt, qText);

    searchEl = document.createElement('p');
    searchEl.className = 'hm-line hm-search';
    const spin = document.createElement('span');
    spin.className = 'hm-spinner';
    searchEl.append(spin, document.createTextNode(SEARCH));

    hitEl = document.createElement('p');
    hitEl.className = 'hm-line hm-hit';
    hitEl.textContent = HIT;

    ansEl = document.createElement('p');
    ansEl.className = 'hm-line hm-ans';
    ansEl.textContent = ANSWER;

    consoleEl.append(q, searchEl, hitEl, ansEl);

    const foot = document.createElement('div');
    foot.className = 'hm-foot';
    const stats = document.createElement('p');
    stats.className = 'hm-stats';
    stats.textContent = STATS;
    const mascot = document.createElement('img');
    mascot.className = 'hm-mascot';
    mascot.src = `${CARD_ASSETS}/hivemind/mascot.png`;
    mascot.alt = '';
    mascot.loading = 'lazy';
    mascot.decoding = 'async';
    foot.append(stats, mascot);

    stage.append(consoleEl, foot);

    // The replay script is a flat [delay, action] list over the nodes above;
    // build it once, after they exist, and reuse it on every loop.
    script = [[0, clearAll]];
    for (let i = 0; i < QUERY.length; i++) {
      script.push([CHAR_MS, () => { qText.textContent += QUERY[i]; }]);
    }
    script.push(
      [HOLD_QUERY_MS, () => searchEl.classList.add('on')],
      [SEARCH_MS, () => { hitEl.classList.add('on'); searchEl.classList.add('done'); }],
      [HIT_MS, () => ansEl.classList.add('on')],
      [ANSWER_MS, () => {
        searchEl.classList.remove('on');
        hitEl.classList.remove('on');
        ansEl.classList.remove('on');
      }],
      [FADE_MS, () => {}],   // let the fade-out finish before the next pass
    );

    settle();
  },

  activate() {
    if (REDUCE.matches) { settle(); return; }   // park on the finished state
    if (running) return;                        // already animating
    running = true;
    token++;
    clearAll();
    play(script, 0);
  },

  deactivate() {
    running = false;
    token++;
    if (timer) { clearTimeout(timer); timer = null; }
    if (!REDUCE.matches) clearAll();            // reset for the next reveal
  },
};
