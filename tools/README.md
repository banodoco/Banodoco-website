# QA loop index

All console tooling against the dev server (`python3 serve.py` on :8137).
None of it ships — "NOT shipped: nothing imports it" is the first line of
every header. Load by hand, read the numbers, close the tab.

| Tool | What it asserts | How to run |
|---|---|---|
| `tools/fieldpace.js` | The Final field's arrival in the two units Hannah uses: `kindle` (seconds one body takes to light), `gap` (between one body starting and the next), `sweep`, `order` (fieldpace.js:24-28). Measured on the REAL wheel path — rAF WheelEvents + a real release so the commit glide runs; the ladder is read from the build, never restated | Load by hand, `await __fieldPace({ dir, speed, from, to })`; results land in `window.__fp` (fieldpace.js:6-7, 36) |
| `tools/revealgates.js` | G1–G6 invariants of the Final reveal driver: camera-pure off a blend (bit-for-bit), placement-pure, blend paced, nothing fades in over open view, no landing pop, convergence (revealgates.js:13-18). G3/G4 refuse synthetic input — they demand trusted wheel deltas (`e.isTrusted`) | Load by hand (or from the capture CDP client), `await __revealGates()`; results land in `__rg` (revealgates.js:3-4) |
| `tools/scrollgates.js` | Scroll-controller invariants a speed trace cannot see: scrub adds no distance of its own (E2/E3 must read 1.0000), out-and-back returns (E1/R1), notches are not fought (R3), the landing never overshoots (R4), the p=1 end-hold holds (R5), a full 0→1→0 ride visits every anchor and stops nowhere else (R6) (scrollgates.js:5) | Load by hand next to scrollprobe.js, `await __gates()`; results land in `__g` (scrollgates.js:2-3) |
| `tools/inputgates.js` | The input surface, asked at a real pixel "what is actually on top?": the canvas owns the frame at rest (G1), even with every overlay's `hidden` stripped (G2 — the exact pre-fix state), the poke fires for body and ground on mouse AND touch (G3), overlays are inert while closed and live while open (G4), an open overlay takes the frame and hands it back (G5) (inputgates.js:29-33) | Load by hand (or from the capture CDP client), `await __inputGates()`; results land in `__ig` (inputgates.js:2-3) |
| `tools/scrollprobe.js` | Scroll FEEL, not p-rate: per-frame SCREEN speed — a grid of points unprojected at the camera's own look distance, re-projected next frame, median pixel displacement — under a real momentum-tail gesture (scrollprobe.js:1-20) | Script-tag load, then `await __probe.run({ at, peak, driveMs, tailMs })` (scrollprobe.js:4-6) |

## Serving

ALWAYS `python3 serve.py` (port 8137, no-store). Never plain `http.server`:
Chrome caches ES modules aggressively, so an edit behind a cached module
graph is an invisible stale build — every "I changed it but nothing moved"
hunt traces back to that (serve.py:1-6).

## The capture loop

`tools/capture.py` shoots the five resting poses × two viewports as frozen
stills (the `?capture=` freeze — deterministic to MAE 0.00/255, so goldens
are pixel targets, not one honest frame) into `static/captures/`.

- **Re-shoot a golden** — `python3 tools/capture.py --pose <id> --size desktop --note "why"`.
  The note lands in `manifest.json` (capture.py:1024); re-shooting in the same
  commit is the only sanctioned way a golden changes.
- **The gate** — `--check` re-captures and exits 1 on any MAE over 1.0/255.
  Fresh comparison images never land in the repo: by default they go to a
  freshly created system temp directory (printed at run time), or to
  `--check-out <dir>` if given — an override that resolves inside the repo
  is refused with a non-zero exit, since a check must never write repository
  artifacts. The existing tracked `static/captures/_check/` files predate
  this and are left alone; nothing writes there anymore. In frozen mode this
  is a REAL gate, not advisory (capture.py:7-8, 212-213; `--live` stays
  advisory by construction).
- **Runtime** — a full run is ~5 min: 10 cold page loads of a ~3.3 MB module
  graph, a readiness gate per shot (25 s ceiling, capture.py:169), settle,
  screenshot.
- **The flake** — headless Chrome occasionally fails to open the debugging
  port (capture.py:464-485). Kill orphaned Chrome processes and rerun — it is
  not a code failure (README.md:22-23).

## The commit gate

`tools/pre-commit` (symlinked into `.git/hooks/`) fires on any staged path
under `organism/` or `journey/` (pre-commit:75; not `glowshroom/organism/` —
the hook's own header notes it was repaired off that hard-coded nested-repo
layout to be portable) and runs `capture.py --check` — the server must be up
on :8137. `SKIP_SCENE_CHECK=1 git commit ...` bypasses it: doc-only
emergencies, never for code (pre-commit:77-78, README.md:25-26). An intended
visual change ships with its re-shot goldens in the same commit.

Same decision as `tools/check.sh` (the release gate — see "The gate" above):
no named-pose exemptions. `tools/pre-commit` sources `check.sh`'s
`decide_captures()` (pre-commit:108-136) rather than keeping a second copy
of the decision logic, so the two gates cannot drift apart. Every
`[FAIL-band]` row — including a sole `final@430x932` — is a hard commit
failure; the only way past a genuine environment issue is the same
`CAPTURE_CHECK_ADJUDICATION=<reason>` escape hatch `check.sh` uses, which
still exits non-zero (a distinct `blocked` status), never green.

## The copy-fit gate — browser ring, on the `test:browser` cadence

`PORT=8177 node tools/trace/copy-fit.mjs --prove-failure` measures the
rendered line count of every chapter heading and sub at 1440x900, 1280x800
and 375x812 against the budgets `content/content.js`'s own comments record,
and exits non-zero on a breach. It needs Chrome and the server, so it is NOT
in `npm run check`; run it beside `npm run test:browser`, and always with
`--prove-failure` (its mutant lengthens Inspire's sub and requires the gate
to red — without the flag nothing proves the gate can still see). It also
prints each slot's `headroom`, which is the warning a line count is not.

## The mid-arrival wrap gate — `npm run test:browser` (R1–R4)

`node tools/test-epilogue-retire.mjs` is the SECOND entry of the `test:browser`
script (package.json:17), so `npm run check:browser` runs it straight after
`browser-smoke` — it is not a beside-the-gate run like the copy-fit gate above.
It needs no `PORT=`: with no `--origin` it picks a free port and spawns its own
`serve.py`, so it cannot collide with a server you already have up. Point it at
one with `--origin=http://127.0.0.1:8177` if you prefer.

**Three owner reports ride one lap**, deliberately — one wheel-driven wrap out
of the Final rest, four assertions, no second instrument:

| law | the fault it exists for |
|---|---|
| `R1` / `R2` | report #29 — the epilogue retire fitted to a FULLY-LIT field (`BAND_S / window`) while the driver stands mid-arrival, so the whole departure lands ~1 s early over open view. Arm continuity, then: the reveal driver may not reach 0 before 80% of the retire window |
| `R3` | report #32 — one float given two meanings. `uSoilOn` is a fraction of the occluder's PIXELS and an AMPLITUDE for the strokes behind it, so the buried colony leaks through the stipple holes at `(1 - bed) * bed`, peaking at 0.25 mid-lap in BOTH directions |
| `R4` | report #31 — the hero entrance spent behind a closed gate: the wrap's copy envelope free-ran on the lap's wall clock while the rail's hero gate was shut, and the arrival shelf then swept the words in over 185 ms, owning 11 of 12 rising frames |

**It is deliberately NOT in `npm run check`,** for the phone ring's reason
below, unchanged: it needs real Chrome and a served tree, and a per-commit gate
that needs those is the step people learn to skip. `tools/test-gate-composition.mjs`
carries that decision as a `NOT_IN_CHAIN` row with its reasoning
(test-gate-composition.mjs:538-548) — an exemption, not an `UNWIRED_TODAY`
debt row, because the ring that runs it is a ring, not a to-do.

**It runs on the INJECTED CLOCK, not the wall clock** (2026-08-26). It used to
judge a trial by its p95 inter-frame gap, and on the owner's ordinary desktop
that excluded 8 of 8 trials at gaps of 63.9–82.8 ms — **0 of 2 valid, no
verdict**, on a tree with nothing wrong with it. So it was migrated onto
`tools/tempo-oracle.mjs`'s rig: `VT_INJECT` (imported from the oracle, which is
now the one place that clock swap lives) replaces `performance.now` before the
document loads, the driver advances it one frame per real rAF, and the spine
follows through `THREE.Clock`. The trust criterion is the oracle's own
`clockVerdict` — every rendered frame carried the frame the driver paid for.
Measured under load average 124: `dt` 0.016667 on every frame, min = max, 2/2
valid, 0 excluded. **R1–R4's laws and thresholds did not move**; every ms figure
they read was already a designed duration, not a wall interval.

**Its trigger, and the discipline about it.** ONE unbroken wheel stream lands at
the rest and can then never wrap — `intent` is not free, so the wrap block
refuses. The shipped single-gesture trigger therefore printed *"wrap never
fired"* 5 of 5 on a calm host and only ever fired because contention broke the
stream for it: this gate has been the blind one in **both** directions. The
trigger is now **land → hold `LAND_HOLD_FRAMES` (24 frames, 400 virtual ms) →
stream again**, which is also what a visitor does, and the hold buys the
departure pull directly and now DETERMINISTICALLY (12 frames → pull 0.554, 24
→ 0.631, 30 → 0.667, 42 → 0.736, 60 → 0.802, 90 → 0.903, outside the band).
**If you ever change how this suite is INVOKED, re-run it and read `pull@wrap`
in the output** — anything outside [0.35, 0.85] is excluded and retried, and if
the machine cannot produce `MIN_VALID` valid trials the suite FAILS AS
UNMEASURABLE rather than passing over a blind spot. It no longer needs a quiet
host to say so.

Red-proofs: all three were **re-taken on the migrated clock** and are recorded
together in `epilogue-race/gate-clock-migration.txt`, beside the wall-clock
originals — `epilogue-race/` for R1/R2, `hero-wrap-entry/gate-redproof.txt` for
R3, `.../gate-redproof-r4.txt` for R4, all under
`docs/code-health/evidence/2026-08-21-elegance-run-01/`. One limit is stated
there: the two-line pre-#29 reversion reds R2 but not R1's arm step, so **R1's
red-proof still stands on the recorded pre-fix tree, not on the re-take**.

## The phone ring — `npm run test:mobile` (MOBILE-GATE-01)

```sh
PORT=8177 python3 serve.py &        # never `python3 -m http.server`
PORT=8177 npm run test:mobile       # or `npm run check:browser`, which now includes it
```

**THE CADENCE RULE, and it is the whole point of the order that wrote this.**
A harness nobody runs is worse than none — it reads as coverage and provides
none. So:

- **Every gate runs it.** `npm run check:browser` invokes `test:mobile` after
  `browser-smoke`. A gate that ran `check` alone has not been near a phone.
- **Any commit touching `journey/portrait.js`, `journey/constants/**`, a route
  rest, a chapter's reveal law, `journey/scroll.js`, `journey/claim.js`,
  `journey/ui/rail-mask.js` or `journey/chapters/owned/portraits.js` runs it
  FIRST, before `check`.** Every one of the five phone-only faults on record
  entered through one of those files, and every one of them was green in
  `npm run check` and in all ten goldens on the day it shipped.
- **It is deliberately NOT in `npm run check`.** It needs real Chrome and
  playwright, and `check.sh` refuses capture work above load 8; wired
  per-commit it would become the step people learn to skip. Two tiers is the
  version that gets run — the pure half of the same properties already runs
  per commit, in `tools/test-connect-motion.mjs` (REST-01/REST-02).

**What it asserts** — properties only, never a rendered image. The ten goldens
cannot be reproduced on this machine by any tree, so a pixel gate here would
be measuring the GPU:

| stage | the fault it exists for |
|---|---|
| `analyze-posefield --assert` | the camera-pure resolve at the Connect rest, per composition, and the phone's bit-agreement with the 621-wide ablation — the 0.9267 that shipped and was blessed into a golden in the same commit |
| `analyze-gatesweep --assert` | chip formation variables = 1.000 at the rest (chips frozen mid-formation), and the three-beat cadence against a desktop control taken in the same run |
| `analyze-ride --assert` | the same, off a real touch stream: no gaze-rate sign flip (the visible nod), no resolve dip, and `jitterflick2` — two-sided in TIME since the A7 ruling (2026-08-26): a flick born mid-flight buys nothing, the ride stands unattended on the rest for 14 s (owner report #26), and a flick born AT that rest then buys its section |
| `rail-centre --assert` | phone/desktop parity of every rail glyph's ink against its housing. The rail is hidden before every shutter, so it appears in NONE of the ten goldens and nothing else can ever see it |
| `rail-recycle --assert --prove-failure` | that the retired half moon's per-frame recycle offset — written by `followCoordinate()` on one slot on every scrolled frame, at every breakpoint — paints NOWHERE, and that the optical pass survives the state. It runs a THIRD context rail-centre does not: narrow enough for the mobile file and still `(hover: hover)`, which is where the two geometries overlap and where a single icon looped down 24px while the rail was open |
| `faces.mjs` | sixteen contributor faces present at the Owned rest on a phone. The goldens are blind to this in both directions because the rail mask latches under `?capture=` |

**Its flake, and the discipline about it.** The live journey's WebGL boot under
a shared dev server flakes past its 90 s readiness wait roughly one run in
eight. `gate.mjs` retries a PROBE once and an ANALYZER never — an analyzer is
pure arithmetic over a file, so a retry there could only hide a real red.

**Known open, recorded not gated:** with the rail forced OPEN, the phone still
withholds one contributor face across part of the Owned leg (`faces.mjs` F2
prints the placements). That is OWNED-PASS's unfixed finding; the fix is a
taste call the owner has not made, and both files it would touch are held.

## Shipping

`DEPLOY.md` — the tree deploys as-is. It lists what MUST ship, what MUST NOT,
and the one deploy-time substitution (`sitemap.xml` ORIGIN).
