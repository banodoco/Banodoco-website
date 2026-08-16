# glowshroom

The Banodoco site: a WebGL hero organism (`organism/`) with a scroll-journey
built over it (`journey/`, chapters in `journey/chapters/`). `main.js` is the
one page entry; `index.html` is markup + links only. The same journey exists
as plain HTML in `static/` (linked from the rail's site-map panel).

## Working on the scene — the regression gate

`tools/capture.py --check` is the gate: it re-shoots 10 frozen stills
(5 chapter rests x 2 viewports, via `?capture=`) and diffs them against the
goldens in `static/captures/` at a 1.0/255 MAE threshold. A pre-commit hook
(symlinked from `tools/pre-commit`) runs it on any staged `organism/` or
`journey/` path. It needs:

- `python3 serve.py` running on :8137
- Chrome at the standard path (headless; occasionally flakes on launch —
  kill orphaned processes and rerun)

`SKIP_SCENE_CHECK=1 git commit ...` bypasses the gate — doc-only emergencies,
never for code. An intended visual change means re-shooting the golden
(`capture.py --pose <id>`) in the same commit, with the reason in the
manifest.

The gate sees only the frozen rests with UI chrome hidden. Travel frames,
DOM/UI work, and interactions need their own verification (`tools/*gates.js`
in the console, or a hand test).

## Contributor portraits

The Owned field shows real people. `assets/contributor-portraits/
profile-sprite.jpg` is Banodoco's own published avatar sheet (20x10 tiles of
96px, taken unmodified from banodoco.ai), and `content/contributors.js` says
who is at which tile — 120 contributors joined from the public ownership
ledger at banodoco.ai/ownership. The stock-face set that used to live in
`assets/test-portraits/` is gone, and with it the standing rule against
shipping it.

Sixteen of the 120 are dealt at random per page load, and the crown re-deals
them on hover. Name, role, blurb and face are dealt in one assignment and must
never be separated — that is the only thing stopping a picture being captioned
with someone else's name.

**The goldens do not cover any of this.** Under `?capture` the photo crossfade
never advances, so the frozen frames render the procedural busts (deliberately
— see the `snap()` note in `portraits.js`). Anything touching the grade, the
atlas bake, the deal or the crown has to be checked by eye on the live page.

## Pre-deploy checklist (standing)

- [ ] Nothing outstanding. The 11 `TODO(Banodoco)` URLs and 56 `[PLACEHOLDER]`
      tokens were resolved 2026-08-16 against banodoco.ai and its repository;
      `grep -rn PLACEHOLDER content/ static/` should stay empty, and no
      `href="#"` should return in `content/content.js`.
- [ ] One node ships as "Coming soon" with no outbound link, on purpose:
      `tworp` — the publication is unbuilt. Everything else has a real
      destination. (`hivemind` briefly shipped this way too; it turned out to
      live at github.com/banodoco/hivemind, not on banodoco.ai. When a node
      looks missing, look past the marketing site.)
