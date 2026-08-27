# Before you edit this repository

Five things about this codebase are unusual enough that finding them out by
accident wastes a day. None of them is a defect. All five are load-bearing.

---

## 1. Editing a comment can fail CI

**Sixteen suites in `tools/` read production source as *text*.** They count call sites,
assert that a file does not name a symbol, check that a comment's claim matches the code
beneath it, and — in a few places — pin an exact string.

This has already bitten the people who wrote it, twice, and both incidents are recorded
in the source:

- naming a function inside a comment landed it in a census count and **cost two assertions
  on the first attempt** (`journey/ui.js`, the release-token block);
- a block comment's *wording* was chosen to dodge a per-line `startsWith('//')` filter in
  the census tooling.

**So: before you reword a comment in `journey/` or `organism/`, grep the suites for a
distinctive phrase from it.**

```bash
grep -ra "the phrase you are about to change" tools/
```

Use **`grep -a`**. One suite (`tools/test-preparation-lifecycle.mjs`) contains NUL bytes,
and plain `grep` treats it as binary and silently reports nothing.

**If a suite pins your text, move the pin or drop it — never leave it pointing at prose
you rewrote.** A `.replace()`-based mutation whose anchor has vanished does not fail. It
**no-ops and goes green**, and the assertion is silently dead from then on. One anchor
rotted that way and nobody noticed for four orders.

### Two registers of comment, and only one is worth keeping

Much of the prose here is genuinely excellent: a measured symptom in the reporter's own
words, then the physical diagnosis, then the fix. *"Scrolling back from Final to Owned is
far slower than forward"* followed by *the spline slope is 9× different at the two ends of
a span* is the house style at its best, and it will save you a week.

Some of it is a refactoring campaign narrating itself — order IDs, allowlists, arguments
with hypothetical future editors. That register belongs in
`docs/code-health/elegance-execution-ledger.md`, and a pass has already moved a lot of it
there.

**The test that works is counterfactual: if this sentence were deleted, would a maintainer
make a wrong edit?** Keep silent failure modes, keep things that look like oversights and
are deliberate, keep statements about the shipped page that contradict what the code
suggests. Move everything whose subject is the process.

---

### When a pin records a value instead of asserting a property

Some checks here pin a **coordinate** — a camera height, a byte count, a line number — where
what they mean to protect is a **property**. Those pass while the thing underneath breaks.

It has happened four times in this codebase. The clearest: `test-connect-motion.mjs` pinned the
camera's target height at Connect's rest, **named the phone pitch-up in its own comment**, and was
consciously updated when that change landed upstream. **It agreed with the defect for three days**,
because it pins where the camera ended up rather than what the camera is for — the ground resolve
it governs had quietly fallen from 1.0 to 0.927.

**The tell is a diff shape, not a counter:**

> **A pin re-baselined in the same commit as the change it is supposed to police is a conversion
> order on the spot — the pin did not fail, it complied.** A pin re-baselined twice for any reason
> is a conversion order regardless.

When you convert one:

- **Demote, don't delete.** The coordinate usually still holds an approved composition and fires on
  a different fault class. What it loses is its *authority* — one comment naming the assertion that
  now governs it costs a line and keeps the history readable.
- **Enumerate the input space the property ranges over, and assert across all of it.** This is the
  clause that matters. The defect above was invisible at desktop *and* at the aspect the old pin
  already used; the conversion is only worth more than the coordinate because it runs across eleven
  compositions. Measured, not assumed: all three plausible single-composition choices went green on
  the live defect.

> **A property asserted at a single point is a pin with better prose.**

### Adding to `tools/` costs something, and the cost has to be named

`tools/` is roughly one and a half times the size of the code it protects. That is not automatically
wrong — this repository's regression net has caught a phantom module, a vanished cleanup, a
two-modules-one-object coupling and a wrong-chapter shutter, all in one month, and deleting proven
catchers to make a ratio look better is the same error as writing the ratio down in the first place.
What *is* wrong is mass arriving without anyone deciding it should.

> **`tools/` code is a gated number, the way lint warnings are. It may not grow without the change
> naming what it bought.**

Two things follow, and neither of them is a script:

- **Say what a new suite catches that nothing already catches.** "Each addition is justified" is how
  every instrument layer in history got large; each addition usually *is* justified. The question is
  the marginal one — what fails today that would have passed yesterday.
- **Prefer arming what exists to adding what does not.** Eleven suites in this chain shipped a live
  `--prove-failure` block that the chain never passed the flag to; they had been green over nothing
  for weeks. Arming all ten survivors cost one `package.json` edit, about five seconds of wall clock,
  and not one line of new instrument.

The stock ratio is a **reported** number, never a gate. A gate on it punishes the past instead of
policing the future, and it invites denominator games besides.

## 2. Serve it with `serve.py`. Never `python3 -m http.server`

```bash
PORT=8177 python3 serve.py
```

`serve.py` sends `Cache-Control: no-store` and honours range requests. **A plain
`http.server` sends no cache headers at all**, so Chrome caches ES modules under heuristic
freshness and will happily serve you a *mixture* — a new module importing a symbol that
its stale dependency does not export yet.

The symptom is a `SyntaxError` about a missing export, for an export that is plainly there
on disk. It is not a code error. It cost real time this week, and the launch config that
caused it has been fixed.

---

## 3. A green `npm run check` does not mean the page loads

`npm run check` never opens the site. It lints, checks the module graph for cycles, runs
unit tests and runs ~50 contract suites against source and against compiled-and-driven
bytes. **All of that can pass while `index.html` fails to boot.**

The instrument that catches it exists and is not in the chain:

```bash
PORT=8177 node tools/browser-smoke.mjs
```

Eight scenarios in a real headless Chrome. The one that matters is *"live journey boots
cleanly and supports navigation, aliases, and card input."* **Run it whenever you touch
`main.js`, `index.html`, an import graph, or anything that runs at boot.**

### The captures are not a visual gate

`static/captures/` holds ten protected PNGs. They are **byte-compared, not re-rendered**,
and they were shot on someone else's machine — a pristine checkout of this repository
misses them by the same margin as the current tree, so they are **not reproducible here at
all**. That gap is GPU precision, not content; the full two-day refactor that preceded this
file changed the rendered frames by **zero**.

So *"captures unchanged"* means only *"I did not run the capture pipeline."* If you want
to know whether your change moved a pixel, compare **your own base against your own
result**:

```bash
PORT=8177 python3 tools/capture.py --pose connect --size desktop --out /tmp/before   # on your base
PORT=8177 python3 tools/capture.py --pose connect --size desktop --out /tmp/after    # on your change
```

Run-to-run noise on one machine is **MAE 0.0000**. Anything above ~0.01 is yours.

**Known flake: roughly one frame in fifty fires the shutter on the wrong chapter.** If one
file's error jumps while the others hold, re-shoot before believing it. `--check` now shoots
each pose twice and refuses a file whose two frames disagree.

---

## 4. Five files need a browser run before they can be committed

If you stage `journey/scroll.js`, `journey/transport.js`, `journey/claim.js`,
`journey/constants/scroll.js` or `journey/route.js`, the pre-commit hook will refuse the
commit until a **green browser-ring run** has been taken against those exact bytes:

```bash
PORT=8177 python3 serve.py     # in one shell
npm run test:dwell             # in another — writes tools/dwell-receipt.json
```

The receipt stamps the SHA of each of those five files as the run measured them, and the
hook compares against the **staged** blobs. So it asks *"was the ring green against these
bytes"*, not *"has a browser run ever happened"* — which is all a timestamp could say. Edit
one of the five again and the receipt goes stale; re-run.

**Why these five and not the whole tree.** They own one defect class — *input arriving while
a multi-second resolution is still in flight spends credit it never earned*. The owner has
reported it four times, at four different chapters, months apart. Each report was diagnosed
correctly and each fix landed and held. What never existed was anything that **ran** the
check: the instrument that can see this class was wired into no required ring at all, and
its contract still licensed the behaviour the owner had already overruled. A stale contract
and a contract nobody evaluates are the same object.

`journey/route.js` is on the list for its pacing tables, not its geometry: the window this
class lives in *is* the transit duration, so lengthening a leg widens the exposure without
touching `scroll.js` at all.

**The run needs a quiet GPU, and load average will not tell you.** Trials whose p95 frame gap
exceeds 50 ms are excluded, and a run that keeps fewer than half its trials reports **no
figure at all** rather than a figure over the lucky half. On this host that refusal fires
while `uptime` reads 190 *and* CPU idle reads 50% — the contention is GPU-side, and neither
proxy sees it. Close what is driving your GPU (a video tab will do it) and re-run.

There is an escape hatch and it is deliberately loud:

```bash
DWELL_RING_ADJUDICATION='<why>' git commit ...
```

It prints your reason. Use it for a genuine environment failure, not for convenience — the
design's own §9 says this gate is the load-bearing part, and that habitual overriding
reverts the whole thing to the status quo that produced four owner reports.

---

## 5. A beat is spent in the coordinate it is authored in, and nothing converts

The house principle is **one tempo, priced by the path actually travelled, eased by one C2
envelope**. Say plainly what that is: **a convention, enforced by gates and by reading — not by
construction.** Nothing here stops you pricing a beat in a coordinate that buys no visible
motion, and six shipped defects were exactly that.

> **A beat, floor, brake, onset or reveal is spent in the coordinate it is authored in. Price it
> by the span actually being travelled — never by a coordinate whose exchange rate to visible
> motion nothing declares.**

Four coordinates are in daily use: route position `p`, chapter pull/gate units, wall clock, and
copy ease. **Exactly one has a conversion authority.** `journey/route.js`'s pacing tables are
denominated in seconds on purpose — *"spanPx / seconds re-derives the correct px/s at every
viewport size on its own"*. Everything downstream of the route has none, and knows it.

**The tell is that the constant's stated purpose is in a different unit from the constant.**
Inspire's ember beats are gate units and their purpose is milliseconds. Connect's chip beats were
`p` and their purpose was reading time — a flick crossed the window in 133 ms. The Final ladder
is pull and its purpose is a town lighting one house at a time. Each was measured, retimed and
shipped; each then waited for an editor to move one end.

The sharpest exhibit is in the tree right now. `FORWARD_BRAKE_TAIL_S` is authored in seconds and
its own comment has to tell you it does not deliver them:

> READ THE NUMBER AS A DIAL, NOT AS THE DELIVERED TAIL … declared 0.35 delivers 183 ms on
> Inspire → Connect and 300 ms on Connect → Owned.

A constant whose shipped meaning is recoverable only by measurement, recorded in prose, pinned by
nothing. **Do not add another.**

When you author or move one:

- **Author it in the unit of its purpose wherever you can** — the `TRANSIT_S` precedent. Seconds
  is not a convenience; it is the unit that survives a viewport change.
- **Where you cannot, declare the conversion and pin both ends against each other in the pure
  ring.** The template is `tools/test-rest-composition.mjs`. The rest beat lives in
  `journey/constants/scroll.js`, the arrival clock it is answerable to lives in
  `journey/constants/copy.js` and `journey/ui/copy-arrival.js`, and the two modules had never
  referred to each other. The suite now recomputes the conversion, pins the number *and* the
  regime, and reds when either end moves without the other. **A beat whose implementation
  coordinate and whose stated purpose live in files that never import each other is the defect,
  pre-fault.**
- **Never widen a tolerance to close a gap.** Re-measure on the page and rewrite the declaration.

Three corollaries are already on record, each with its own evidence directory:

- **The fold law** (`wrap-flash/`) — a reveal keyed to a folded circular coordinate must be
  continuous on the circle. A half-open ramp in a folded coordinate is a step wearing a fold.
- **The fitted-departure law** (`epilogue-race/`, gated by `tools/test-epilogue-retire.mjs`) — a
  departure choreography must be fitted to the state it actually departs from, not the finished
  state it assumes.
- **The entrance law** (`hero-wrap-entry/`) — an entrance must be scheduled from the moment its
  surface can be seen. An envelope run behind a closed gate spends its animation where nobody is
  and hands the audience a pop.

The last two are the *state* half of the same rule, and its authority is
`journey/frame/publication.js`: **read what is published this frame; never assume the state the
design finishes in.**

The full analysis, the six exhibits, and the census of every conversion this tree states in prose
rather than checks: `docs/code-health/2026-08-26-the-missing-abstraction.md` and
`docs/code-health/2026-08-26-conversion-census.md`.

---

## Where the reasoning lives

- `docs/one-trace.md` — one wheel tick from the window listener to the pixel, with a
  citation at every hop. **Start here.** If a hop no longer matches the source, that is a
  bug in the document and worth fixing.
- `docs/code-health/2026-08-22-elegance-replan.md` — the current architectural target.
- `docs/code-health/2026-08-25-scroll-through-category.md` — why §4's gate exists: the four
  reports read as one category, and what a gate for it has to assert in both directions.
- `docs/code-health/OPEN-ITEMS.md` — what is known, unfixed, and why.
- `docs/code-health/elegance-execution-ledger.md` — the long-form record. Large, and not
  required reading; it is where a comment's provenance goes when it leaves the source.
