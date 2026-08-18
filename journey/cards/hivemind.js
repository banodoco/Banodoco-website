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
// THREE REPLAYS, ROTATING (Hannah, 2026-08-18: "add 3 sample queries…
// make it show the breadth of what's possible") — each loop pass plays the
// next query, so a lingering hover sees intent-paraphrase, debugging, and
// comparison answered in turn. ALL VERBATIM from the repo's golden
// evaluation set (eval/retrieval/golden/golden-v1.json cases G046, G055,
// G051; answers are those cases' judged best hits' answer_snippets in
// evidence-v1.json, verified 2026-08-17/18):
//   G046 "make the motion less jittery"  -> distillation #5, cites Kijai
//   G055 "ClownShark crash comfyui"      -> distillation #10, 4 cites
//   G051 "compare two image editors"     -> distillation #8, community
// STATS (policy (a), cards/index.js): "1,248,240 messages · 2,759 resources
//   & workflows" — corpus inventory snapshot 2026-07-28,
//   docs/hybrid-search/phase0-inventory.json. (The task brief's "~4,000
//   workflows" was a synthetic test fixture in that repo — corrected.)

import { CARD_ASSETS, REDUCE } from './index.js';

const QUERIES = [
  {
    query: 'make the motion less jittery',
    hit: '⤷ distillation #5 · cites Kijai',
    answer: '"LightX2V is useful on interpolation, but applying it to the global model can suppress most motion…"',
  },
  {
    query: 'ClownShark crash comfyui',
    hit: '⤷ distillation #10 · 4 cited sources',
    answer: '"Check whether ClownShark is defaulting to float64, which uses roughly twice the tensor memory of float32…"',
  },
  {
    query: 'compare two image editors',
    hit: '⤷ distillation #8 · community comparison',
    answer: '"One community comparison found Flux 2 Klein stronger at understanding edit prompts but more likely to push the result toward realism…"',
  },
];
const SEARCH = 'searching 1,248,240 messages…';
const STATS = '1,248,240 messages · 2,759 resources & workflows';

// Loop budget ≈ 7s per query (Hannah, 2026-08-18: the first cut "feels
// painfully slow" — everything roughly halved; the answer keeps the
// longest dwell because it is the payoff).
const CHAR_MS = 32;
const HOLD_QUERY_MS = 550;
const SEARCH_MS = 900;
const HIT_MS = 750;
const ANSWER_MS = 3600;
const FADE_MS = 350;

let qText, searchEl, hitEl, ansEl;
let qIdx = 0;          // which of the three replays the next pass plays
let running = false;   // activate/deactivate re-entrancy guard
let token = 0;         // bumped on (de)activate to void a pending chain
let timer = null;

// The finished transcript, parked as a complete still (REDUCE and build()).
function settle() {
  const Q = QUERIES[qIdx];
  qText.textContent = Q.query;
  hitEl.textContent = Q.hit;
  ansEl.textContent = Q.answer;
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

/* One pass = one query's transcript; built fresh each time because the
   typed characters differ per query. The rotation is the breadth: pass N
   plays QUERIES[N % 3], so a lingering hover watches the corpus answer an
   intent paraphrase, then a crash, then a comparison. */
function buildScript() {
  const Q = QUERIES[qIdx];
  const script = [[0, () => {
    clearAll();
    hitEl.textContent = Q.hit;
    ansEl.textContent = Q.answer;
  }]];
  for (let i = 0; i < Q.query.length; i++) {
    script.push([CHAR_MS, () => { qText.textContent += Q.query[i]; }]);
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
    [FADE_MS, () => { qIdx = (qIdx + 1) % QUERIES.length; }],
  );
  return script;
}

// One step at a time; a single pending timeout per pass. `token` voids it on
// deactivate so no dangling reveal ever resumes after the card is gone.
function play(script, i = 0) {
  if (!running) return;
  if (i >= script.length) { play(buildScript(), 0); return; }   // next query
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

    // the name at the top (Hannah, 2026-08-18) — a console title bar in the
    // card's own terminal voice: the project's name, then what it is
    const head = document.createElement('div');
    head.className = 'hm-head';
    const name = document.createElement('span');
    name.className = 'hm-name';
    name.textContent = 'HIVEMIND';
    const desc = document.createElement('span');
    desc.className = 'hm-desc';
    desc.textContent = 'the community’s collective memory';
    head.append(name, desc);

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

    ansEl = document.createElement('p');
    ansEl.className = 'hm-line hm-ans';

    consoleEl.append(q, searchEl, hitEl, ansEl);

    const foot = document.createElement('div');
    foot.className = 'hm-foot';
    const stats = document.createElement('p');
    stats.className = 'hm-stats';
    stats.textContent = STATS;
    // the door, in the card's own voice (the house block below is gone —
    // Hannah, 2026-08-18: "explain everything in the main part"); revealed
    // on hover/pin by the shared card-cta rule in cards.css
    const cta = document.createElement('a');
    cta.className = 'hm-link card-cta';
    cta.href = 'https://github.com/banodoco/hivemind';
    cta.target = '_blank';
    cta.rel = 'noopener noreferrer';
    cta.tabIndex = -1;
    cta.textContent = 'view on GitHub →';
    const mascot = document.createElement('img');
    mascot.className = 'hm-mascot';
    mascot.src = `${CARD_ASSETS}/hivemind/mascot.png`;
    mascot.alt = '';
    mascot.loading = 'lazy';
    mascot.decoding = 'async';
    foot.append(stats, cta, mascot);

    stage.append(head, consoleEl, foot);

    settle();   // parked on the first query's finished transcript
  },

  activate() {
    if (REDUCE.matches) { settle(); return; }   // park on the finished state
    if (running) return;                        // already animating
    running = true;
    token++;
    clearAll();
    play(buildScript(), 0);
  },

  deactivate() {
    running = false;
    token++;
    if (timer) { clearTimeout(timer); timer = null; }
    if (!REDUCE.matches) clearAll();            // reset for the next reveal
  },
};
