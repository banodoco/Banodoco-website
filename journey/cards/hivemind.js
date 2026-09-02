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
// evaluation set (eval/retrieval/golden/golden-v1.json cases G048, G055,
// G051; answers are those cases' judged best hits' answer_snippets in
// evidence-v1.json, verified 2026-08-17/18). G046 ("make the motion less
// jittery" -> the LightX2V trade-off) was swapped out 2026-08-18 —
// Hannah: the answer "makes no sense" as a reply to that phrasing; G048's
// pair answers itself on sight:
//   G048 "localize edits to just one region" -> distillation #7, 3 cites
//   G055 "ClownShark crash comfyui"          -> distillation #10, 4 cites
//   G051 "compare two image editors"         -> distillation #8, community
// STATS (policy (a), cards/index.js): "1,248,240 messages · 2,759 resources
//   & workflows" — corpus inventory snapshot 2026-07-28,
//   docs/hybrid-search/phase0-inventory.json. (The task brief's "~4,000
//   workflows" was a synthetic test fixture in that repo — corrected.)

import { CARD_ASSETS, REDUCE } from './runtime.js';

const QUERIES = [
  {
    query: 'localize edits to just one region',
    hit: '⤷ distillation #7 · 3 cited sources',
    answer: '"In the reported Wan VACE setup, white mask areas are regenerated and black areas are protected…"',
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
// Round 2: the corpus inventory renders as two compact chips rather than a
// written-out sentence (owner direction, 2026-08-30) — same snapshot, same
// provenance as the header note; 1,248,240 -> 1.2M, 2,759 -> 2.8K.
const CHIPS = [['1.2M', 'MESSAGES'], ['2.8K', 'RESOURCES']];

// Loop budget ≈ 7s per query (Hannah, 2026-08-18: the first cut "feels
// painfully slow" — everything roughly halved; the answer keeps the
// longest dwell because it is the payoff).
// 2026-08-18: typing 1.5x faster — 32 / 1.5 ≈ 21.
const CHAR_MS = 21;
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

    // Round 3: the round-2 title bar is gone — the restored shell head says
    // HIVEMIND and carries the ONE thesis line (the owner's round-2 flag
    // about the collective-memory line appearing twice stays honoured: no
    // interior label repeats it). The console opens straight onto the
    // replayed query, which is the personality the head introduces.
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

    // the librarian keeps the console's corner — the one face this project
    // has, parked where the transcript's air is
    const mascot = document.createElement('img');
    mascot.className = 'hm-mascot';
    mascot.src = `${CARD_ASSETS}/hivemind/mascot.png`;
    mascot.alt = '';
    mascot.loading = 'lazy';
    mascot.decoding = 'async';
    consoleEl.appendChild(mascot);

    // the record — the corpus as two compact chips (round 2: tags, not a
    // sentence); round 3 gives the repo door the shared full-width foot
    // below them, so Hivemind ends exactly where the other five do
    const foot = document.createElement('div');
    foot.className = 'hm-foot';
    const chips = document.createElement('div');
    chips.className = 'hm-chips';
    for (const [num, lab] of CHIPS) {
      const chip = document.createElement('span');
      chip.className = 'hm-chip';
      const n = document.createElement('b');
      n.textContent = num;
      chip.append(n, ` ${lab}`);
      chips.appendChild(chip);
    }
    foot.append(chips);
    const door = document.createElement('a');
    door.className = 'hm-door card-door card-cta';
    door.href = 'https://github.com/banodoco/hivemind';
    door.target = '_blank';
    door.rel = 'noopener noreferrer';
    door.tabIndex = -1;
    door.textContent = 'GITHUB →';

    stage.append(consoleEl, foot, door);

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
