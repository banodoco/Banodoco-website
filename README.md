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

## Pre-deploy checklist (standing)

- [ ] `assets/test-portraits/` must not ship (plan-doc mandate). It is
      look-dev placeholder data, but `journey/chapters/owned/portraits.js`
      STATICALLY imports its `manifest.js` and the Owned goldens currently
      render its photos — replacing it is a content + code change (real
      portraits, or manifest import made dynamic + goldens re-shot), not a
      bare deletion.
- [ ] The 11 `TODO(Banodoco)` destination URLs in `content/content.js` and
      the 56 `[PLACEHOLDER]` tokens ship visitor-visible until confirmed.
