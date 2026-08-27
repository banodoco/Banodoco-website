# TRACE-01 — the recorded-trace oracle for `journey/ui.js`

> **RETIRED, 2026-08-26 (GATE-F). The kit this page documents no longer lives in `tools/`.**
>
> `deck.mjs`, `record.mjs`, `world.mjs`, `dom-double.mjs`, `mutants.mjs` and `trace-run.mjs` moved,
> runnable, to
> `docs/code-health/evidence/2026-08-21-elegance-run-01/retired-suites/trace/` — see that directory's
> `README.md` for why, for the six path edits that keep it runnable, and for the one production
> comment that now cites a moved path. **Every `tools/trace/trace-run.mjs` command below still works;
> prefix it with that directory.** The page is kept here, unshortened, because it is the kit's manual
> and a manual is worth nothing in a directory nobody opens.
>
> **What is still in `tools/trace/`, and is NOT retired:** `module-census.mjs` + `census.mjs`
> (G1/G2), `resolve-audit.mjs`, `rail-centre.mjs`, `rail-recycle.mjs`, `mobile/` (the phone ring,
> `npm run test:mobile`), `brake-tail.py`, `copy-fit.mjs` and the `ipad-*` probes. Note that
> `--census` and `--modules` drive two of those from the retired driver; the retired README explains
> why relocation was chosen over minting a second CLI, and when to reverse that.

**What it is.** A driven world (fake clock, fake rAF, recording DOM), a frozen
scenario deck, a mutant registry that proves the deck can *see*, a branch-coverage
floor with every uncovered branch enumerated, and a parse-based state census.

**What it is for.** Byte-preserving extraction is provable and shallow. Restructuring a
state machine is what `ui.js` needs and is **not** provable that way — which is why the
two files the program names as its top architectural centres were never touched. This
is the proof method that makes restructuring provable: **record the behaviour stream
against the old code, restructure, require the stream back byte-for-byte.**

---

## 1. Commands

```sh
node tools/trace/trace-run.mjs --record        # write baselines (do this BEFORE you restructure)
node tools/trace/trace-run.mjs --verify        # re-run and require byte identity
node tools/trace/trace-run.mjs --sensitivity   # the mutant registry — the deck's own gate
node tools/trace/trace-run.mjs --coverage      # branch floor + the enumerated uncovered list
node tools/trace/trace-run.mjs --census        # variable -> owner, shared state, update() shape
node tools/trace/trace-run.mjs --all
```

Useful flags: `--out DIR` (baseline location), `--floor 85`, `--max-owned N`,
`--max-shared N`, `--require-composed`, `--report FILE`.

**`--record` also writes a digest manifest** (`trace-digests.txt`) one level above the
trace directory: sha256 prefix, record count and scenario id per line. The traces
themselves are ~3.3 MB and are a **working** baseline — record yours immediately before
you restructure, which is the only moment a baseline means anything. The manifest is
what is kept in evidence. TRACE-01's own manifest, taken on the untouched `ui.js`, is at
`docs/code-health/evidence/2026-08-21-elegance-run-01/trace-01/trace-digests.txt`; the
traces it names are not committed, and `--verify` against the default `--out` will
correctly report that there is no baseline until you record one.

Set `TRACE01_SCRATCH` to a session scratch directory. Without it, staged trees go under
`os.tmpdir()`; they are removed by name on exit either way (D97), but sixteen gated
suites already `mkdtemp` there without cleaning up and the disk hit zero three times on
the day this was written (D127/D132).

### The U-order workflow

```sh
node tools/trace/trace-run.mjs --record --out docs/code-health/evidence/<run>/<order>/before  \
  && node tools/trace/trace-run.mjs --sensitivity                                             \
  && node tools/trace/trace-run.mjs --census --report .../census-before.txt
#   ... restructure ...
node tools/trace/trace-run.mjs --verify --out docs/code-health/evidence/<run>/<order>/before  \
  && node tools/trace/trace-run.mjs --census --max-owned N --max-shared M
```

**`--verify` is the acceptance.** Not "the same assertions pass" — the same behaviour
stream. With a fake clock and no RNG there is no nondeterminism to tolerate; any
divergence is a finding.

## 2. This is an ORACLE, not a gate

**It is deliberately not wired into `test:contracts`, and it should stay that way.**
A per-commit gate over `ui.js`'s full behaviour stream would red on every legitimate
change to the file and have to be re-blessed each time — which is precisely the friction
DIET-01 is retiring from the class-(b) move verifiers. The U-orders drive it around a
restructure. `package.json` belongs to DIET-01; this order did not touch it.

## 3. What it records, and what it cannot

**Records, in one ordered stream:** element creation; `class`, attribute, `style`
(both the property and `setProperty` spellings, including custom properties) and
tracked-property writes; tree edits with the insertion index; listener add **and
remove**; focus moves; Web Animation create / pause / play / cancel / `currentTime`
scrub; every geometry read; timer and rAF schedules, **cancellations** and fires; every
call out through `onNav` / `onOpen` / `onClose` / `isDetailOpen` **with arguments**; and
throws, because the production frame loop swallows them (S-1).

**Cannot:**

- **Layout.** `getBoundingClientRect`, `offsetWidth/Height` and `elementFromPoint`
  return what the scenario configures. A restructure that changes *which* geometry
  question is asked is visible — the read is a record. One that changes how a real
  browser would *answer* it is not. Browser reality stays the outer ring
  (pose/dwell oracles + captures).
- **Paint, compositing, sub-pixel behaviour.** `ui.js:3140`'s deliberate raw
  projection (see the comment there and `docs/one-trace.md`) models the same pure
  function as the injected one here, so the divergence survives in *shape* and not in
  *value*.
- **Anything the deck did not drive.** See §5.

**Selector grammar** is exactly what `journey/ui.js` and `journey/rail.js` use: tag,
`.class`, `#id`, `[attr]`, `:not([attr])`, `:focus-visible`, comma groups, descendant
combinators. Anything else **throws** — a silent `null` would read as "no such element"
and take a branch out of the trace without a mark.

## 4. Why one scenario per process

`record.mjs` runs exactly one scenario and exits. The first draft cache-busted
`journey/ui.js` with a query string inside a single process; that re-registers `ui.js`
but **not its dependency graph**, so a module-scope one-shot in a sibling is paid by
whichever scenario runs first and by nobody after. Measured as a real divergence at
record 14 of `construct-destroy` between two runs of the same deck in the same process.

A virgin process gives determinism **and** real V8 coverage offsets, which
`stage-tree.mjs` cannot — staging rewrites every specifier and moves byte offsets. The
stager is used for mutants only, where the source must be perturbed and offsets do not
matter.

## 5. The coverage floor, and the honest part

`--coverage` measures **static branch arms** (if / else / ternary arms / `&&` / `||`
right operands / loop bodies / catch / function bodies) against merged V8 block counts,
innermost range wins. The denominator is parsed from source, not taken from V8's own
range list — V8's list *grows* as lazily compiled functions are entered, so a percentage
over it flatters itself (measured: 580 blocks became 689 when this deck grew).

**Implicit `else` arms are excluded** and the count is printed. V8 emits no range for a
fall-through, so any offset chosen to stand for one resolves to the enclosing block and
reads as covered whenever the surrounding code ran. On `ui.js` that would have added 225
branches of which ~171 scored covered for free — about four headline points on no
evidence.

**Measured 2026-08-22: 501/779 = 64.3%. The 85% floor is NOT met**, so `--coverage`
and `--all` exit 1 today. That is the instrument working, not the instrument broken:
the shortfall is reported rather than adjusted away, and nothing gates on it. The full list is
written to `docs/code-health/evidence/2026-08-21-elegance-run-01/trace-01/uncovered-branches.txt`,
one branch per line with kind and source text. **That list, not the percentage, is what
U03–U06 consume**: for each branch in your order's scope, either drive it with a new
scenario or waive it with a reason in your acceptance.

## 6. The state census

`--census` resolves every identifier through a real scope chain. **It does not grep, and
that is not a style preference.** Three measured findings in this run say the greppers
have become an unelected architect: `chapter-registry.js` spells `chapter.dispose()`
non-optionally *because a census greps `\.dispose\s*\(`*; two gated suites require
production to contain the string `Corrected by J04d`; and
`test-chapter-contract.mjs:1264-1266` pins three `onHot` lines by text, which forced
U02's seam — state moved, effects could not. **Do not add to that.** Nothing in
`tools/trace/` pins a line of production by its text.

It reports `variable -> owner` for every mutable binding, how many distinct sub-owners
touch each one (`sharedBy > 1` is state with no single owner — sibling closures cannot
see each other, so shared state can only live in the common parent), the shadowed-name
list, and `update()`'s composition shape. The bars are flags, not constants, so U03–U06
can ratchet them one order at a time.

## 7. Adding to the deck

A scenario is `{ id, brief, run(k) }` plus optional `hasTouch`, `reduceMotion`,
`viewport`, `chapters`. **Every new scenario needs a registered mutant**, or the deck
grows without growing its power to discriminate — that is the D50/D58 contract, and this
instrument has already been caught by it once: on the first sensitivity run all eleven
mutants "differed" for a reason that was not the mutation, and only the null control
said so.

Three traps this deck has already fallen into, all of them the same trap:

- **A world too small to discriminate.** Chips are only placed once their chapter's
  eased copy opacity passes 0.72, so a `p` outside the copy band leaves the entire
  placement, dodge and label machinery running with `want` false end to end.
- **A clock that does not move.** `frame()` must advance the clock before it paints, or
  `HOTSPOT_STAGGER_MS` arms every chip in the same instant and a mutant that *halves*
  the stagger produces a byte-identical trace.
- **A page double that swallows the loop.** The card machine is a loop — a chip's click
  goes out through `onOpen` and the page calls back into `openCard`. A spy that only
  records leaves `cardOpen` false forever.

Check that your world can distinguish the outcome you assert.
