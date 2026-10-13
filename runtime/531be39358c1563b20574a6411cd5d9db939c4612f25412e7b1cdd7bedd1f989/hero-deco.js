// hero-deco.js — the illustrated-hero EXPLORATION (2026-10-05, Hannah: "adding
// these kind of decorative fonts and line work ... just do it for the hero
// section to start ... so I can see if it's a good idea to go in this
// direction"). Reference: assets/deco/src/reference.png.
//
// Inert unless the page is opened with ?deco=<variant>. The <head> script in
// index.html sets html[data-deco] and links the fonts + hero-deco.css; this
// classic script runs right after the hero markup (before first paint of the
// copy, which is held by the ENTRY BARRIER anyway) and only re-sets the
// headline and adds the ornaments. Nothing in journey/ or organism/ knows.
//
//   filigree  — closest to the reference: gilded drop-cap W in a generated
//               root filigree, "thrive." on its own line in a large gilded
//               italic, the generated rail at the left, a pendant at right.
//   hairline  — the restrained one: no drop cap, four lines as shipped,
//               "thrive." gilded with a generated swash under it, and a coded
//               hairline rail that draws itself in.
//   mycelium  — all code: the W grows its own roots (seeded, drawn in on
//               load), "thrive." set in a copperplate script.
(() => {
  const v = document.documentElement.dataset.deco;
  const hero = document.querySelector('.ui .hero');
  const h1 = hero && hero.querySelector('h1');
  const asked = new URLSearchParams(location.search).get('deco');
  if (!h1 || asked === null) return;
  if (v) decorate(v);
  switcher(v || 'off');

  function decorate(v) {

  const full = 'We’re working to help the open-source AI art ecosystem thrive.';
  const hl = (html, cls = '') => `<span class="hl${cls ? ' ' + cls : ''}">${html}</span>`;
  const W = '<span class="dc" aria-hidden="true"><span class="dc-ink">W</span></span>';
  const nb = 'open&#8209;source';

  if (v === 'hairline') {
    h1.innerHTML = hl('We&rsquo;re working') + hl('to help the') + hl(`${nb} AI art`)
      + hl('ecosystem <em class="thr">thrive.<span class="swash" aria-hidden="true"></span></em>');
  } else {
    h1.innerHTML = hl(`${W}e&rsquo;re working`, 'l1') + hl('to help the', 'l2') + hl(nb, 'l3')
      + hl('AI art ecosystem', 'l4') + hl('<em class="thr">thrive.</em>', 'l5');
  }
  h1.setAttribute('aria-label', full);

  const add = (cls, html = '') => {
    const el = document.createElement('div');
    el.className = `deco ${cls}`;
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = html;
    hero.appendChild(el);
    return el;
  };

  if (v === 'filigree') {
    // the right-edge ornament: centred on the viewport's height (CSS)
    const mid = add('deco-rail-r');
    if (new URLSearchParams(location.search).get('mid') === 'b') mid.classList.add('deco-mid-b');
    chapters();
  }

  // ---- coded line work -------------------------------------------------
  const NS = 'http://www.w3.org/2000/svg';
  const star = (x, y, r) => `<path class="st" d="M${x} ${y - r}Q${x} ${y} ${x + r * 0.42} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r * 0.42} ${y}Q${x} ${y} ${x} ${y - r}Z"/>`;

  if (v === 'hairline') {
    // A vertical hairline with sparkles, a dotted reach and two small forks,
    // drawn in top to bottom (pathLength=1 + dashoffset, see hero-deco.css).
    let s = '';
    s += `<path class="ln" pathLength="1" style="--d:0s" d="M20 26V150"/>`;
    s += `<path class="ln" pathLength="1" style="--d:.5s" d="M20 196V430"/>`;
    s += `<path class="ln" pathLength="1" style="--d:1.1s" d="M20 476V640"/>`;
    for (let y = 158; y < 192; y += 7) s += `<circle class="dt" cx="20" cy="${y}" r=".9"/>`;
    for (let y = 438; y < 472; y += 7) s += `<circle class="dt" cx="20" cy="${y}" r=".9"/>`;
    // a drooping root knot: three pairs of hairs leaving the line and
    // curling down and out, longest in the middle, each tipped with a dot
    const fork = (y, d) => [-1, 1].map((k) => [[0, 16, 26, 1.1], [11, 24, 38, 1.4], [26, 14, 26, 1]].map(([dy, dx, len, r], i) =>
      `<path class="ln" pathLength="1" style="--d:${(d + i * 0.12).toFixed(2)}s" d="M20 ${y + dy}c${k * 1} ${len * 0.35} ${k * dx * 0.7} ${len * 0.55} ${k * dx} ${len}"/>`
      + `<circle class="dt" style="--d:${(d + 0.6 + i * 0.12).toFixed(2)}s" cx="${20 + k * dx}" cy="${y + dy + len}" r="${r}"/>`).join('')).join('');
    s += fork(250, 0.8) + fork(536, 1.4);
    s += star(20, 18, 8) + star(20, 340, 6) + star(20, 650, 9);
    add('deco-hair', `<svg viewBox="0 0 40 670" fill="none">${s}</svg>`);
  }

  if (v === 'mycelium') {
    // Roots grown off the W: a seeded branching walk, fanning up-left and
    // hanging down, each segment drawn in after its parent.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const segs = [], tips = [];
    const grow = (x, y, a, len, w, depth, t) => {
      const bend = (rnd() - 0.5) * 0.9;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      const cx = x + Math.cos(a + bend) * len * 0.55, cy = y + Math.sin(a + bend) * len * 0.55;
      segs.push({ d: `M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`, w, t, dur: 0.25 + len / 260 });
      const t2 = t + 0.18 + len / 300;
      if (depth <= 0 || len < 9) { if (rnd() < 0.45) tips.push({ x: x2, y: y2, t: t2, r: 0.7 + rnd() * 1.1 }); return; }
      const n = rnd() < 0.55 ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * (0.42 + rnd() * 0.3);
        grow(x2, y2, a + spread + (rnd() - 0.5) * 0.25, len * (0.62 + rnd() * 0.18), w * 0.68, depth - 1, t2);
      }
    };
    // origin = the W's left foot / top-left serif, in a 400x400 box whose
    // centre the letter sits on (see .deco-roots in hero-deco.css)
    grow(152, 146, -1.95, 52, 1.6, 4, 0.2);   // up and out to the top-left
    grow(144, 182, -2.7, 40, 1.4, 4, 0.35);   // out to the left
    grow(150, 236, 2.2, 46, 1.5, 4, 0.3);     // hanging roots, down-left of the text
    grow(168, 252, 1.85, 34, 1.2, 3, 0.5);
    grow(236, 138, -1.05, 34, 1.0, 3, 0.6);   // a few tendrils off the top-right
    let s = segs.map((g) => `<path class="rt" pathLength="1" style="--d:${g.t.toFixed(2)}s;--l:${g.dur.toFixed(2)}s;stroke-width:${g.w.toFixed(2)}" d="${g.d}"/>`).join('');
    s += tips.map((p) => `<circle class="tp" style="--d:${p.t.toFixed(2)}s" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${p.r.toFixed(2)}"/>`).join('');
    const dc = h1.querySelector('.dc');
    if (dc) {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('class', 'deco-roots');
      svg.setAttribute('viewBox', '0 0 400 400');
      svg.setAttribute('fill', 'none');
      svg.innerHTML = s;
      dc.prepend(svg);
    }
  }

  }

  // ---- the chapters: the same vocabulary, one notch quieter -------------
  // journey/ui.js builds the chapter blocks after this script has run, so
  // they are picked up as they arrive. Each heading's MAIN WORD takes the
  // gilded italic ("thrive." in the hero; Hannah: "highlight the main word,
  // equip, connect etc, similar to thrive"), and each chapter gets its own
  // chapter-head vignette above the heading (Hannah: "different decorations
  // for subsequent sections") — generated, assets/deco/orn-<chapter>.webp.
  // Nothing in ui.js is touched.
  const MAIN_WORD = { inspire: 'Inspire', equip: 'Equip', connect: 'Connect', owned: 'Owned', final: '2nd Renaissance' };
  // Each ornament is drawn for the space its chapter's copy leaves (Hannah:
  // "often the wrong shape for the area, some should be a lot longer"):
  //   head — a long band over the heading, as wide as the heading's measure
  //          (centred blocks symmetric). Final carries none for now
  //          (Hannah: "feels a little bit detached ... remove it entirely").
  //   side — a tall strip beside the copy, on the side the copy faces the
  //          scene from: Equip's on its left, Connect's on its right
  const ORN = {
    inspire: { kind: 'head' },
    owned: { kind: 'head' },
    equip: { kind: 'side', side: 'l' },
    connect: { kind: 'side', side: 'r' },
  };
  function chapters() {
    const sides = [];
    const seatSide = ({ b, h, img }) => {
      const sub = b.querySelector('.j-sub') || h;
      const top = h.offsetTop, bot = sub.offsetTop + sub.offsetHeight;
      const span = bot - top, H = Math.round(span * 2.0);
      img.style.height = `${H}px`;
      img.style.top = `${Math.round(top + span / 2 - H / 2)}px`;
    };
    const seatAll = () => sides.forEach(seatSide);
    addEventListener('resize', seatAll);
    if (document.fonts) document.fonts.ready.then(seatAll);
    const dress = (b) => {
      if (b.dataset.deco) return;
      b.dataset.deco = '1';
      const id = b.dataset.chapter;
      const h = b.querySelector('.j-h');
      if (!h) return;
      const w = MAIN_WORD[id];
      if (w && !h.querySelector('.thr')) {
        const t = h.textContent;
        const i = t.indexOf(w);
        if (i >= 0) {
          h.textContent = '';
          const em = document.createElement('em');
          em.className = 'thr';
          em.textContent = w;
          h.append(t.slice(0, i), em, t.slice(i + w.length));
        }
      }
      const o = ORN[id];
      if (!o) return;
      const img = document.createElement('img');
      img.src = `./assets/deco/orn-${id}.webp`;
      img.alt = '';
      img.decoding = 'async';
      img.setAttribute('aria-hidden', 'true');
      if (o.kind === 'head') {
        img.className = `deco-orn deco-head deco-head-${id}`;
        b.insertBefore(img, h);
      } else {
        img.className = `deco-orn deco-side deco-side-${o.side}`;
        b.appendChild(img);
        const e = { b, h, img };
        sides.push(e);
        requestAnimationFrame(() => seatSide(e));
        if (typeof ResizeObserver === 'function') new ResizeObserver(() => seatSide(e)).observe(b);
      }
    };
    // The Manifesto is its own page, so it gets its own figure rather than a
    // chapter's: its title gilded like the highlighted words (hero-deco.css)
    // and a closing tailpiece once the last line has been written. (Tried
    // and dropped on Hannah's notes: a mark per line — "distracting" — and
    // an ornament beside the title.)
    const dressManifesto = (panel) => {
      if (panel.dataset.deco) return;
      panel.dataset.deco = '1';
      // The tailpiece sits OUTSIDE the panel's flow: inside it, its height
      // re-centred the whole page upward (at 1280x720 the title met the
      // logo). It hangs in the page layer, seated off the lines' measured
      // foot, so the reading page keeps exactly its shipped geometry.
      const page = panel.closest('.j-manifesto') || document.body;
      const tail = document.createElement('img');
      tail.className = 'deco-tail';
      tail.src = './assets/deco/orn-manifesto.webp';
      tail.alt = '';
      tail.decoding = 'async';
      tail.setAttribute('aria-hidden', 'true');
      page.appendChild(tail);
      const box = panel.querySelector('.j-manifesto-lines') || panel;
      const lines = panel.querySelectorAll('.j-manifesto-line');
      const last = lines[lines.length - 1];
      const seat = () => {
        const r = box.getBoundingClientRect();
        if (!r.width) return;
        tail.style.left = `${Math.round(r.left + r.width / 2)}px`;
        tail.style.top = `${Math.round(r.bottom + 18)}px`;
      };
      const sync = () => {
        seat();
        tail.classList.toggle('shown', !!last && last.classList.contains('shown'));
      };
      addEventListener('resize', seat);
      if (last) new MutationObserver(sync).observe(last, { attributes: true, attributeFilter: ['class'] });
      if (typeof ResizeObserver === 'function') new ResizeObserver(seat).observe(box);
      sync();
    };
    const scan = () => {
      document.querySelectorAll('.j-copy .j-block').forEach(dress);
      document.querySelectorAll('.j-manifesto-panel').forEach(dressManifesto);
    };
    scan();
    new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  }

  // ---- the exploration switcher (QA only) ------------------------------
  function switcher(v) {
  const sw = document.createElement('nav');
  sw.className = 'deco-switch';
  sw.setAttribute('aria-label', 'Hero decoration explorations');
  const here = new URLSearchParams(location.search);
  sw.innerHTML = ['off', 'filigree', 'hairline', 'mycelium'].map((k) => {
    const q = new URLSearchParams(here);
    if (k === 'off') q.delete('deco'); else q.set('deco', k);
    q.set('nointro', '1');
    return `<a href="?${q}"${k === v ? ' aria-current="true"' : ''}>${k}</a>`;
  }).join('');
  document.body.appendChild(sw);
  }
})();
