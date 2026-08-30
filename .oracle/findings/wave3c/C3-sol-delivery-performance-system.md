# Wave3C C3 — delivery, derived artifacts, and runtime performance system

Source-only review at `b7e0ca7`. No browser was launched and no application
source was edited. Earlier runtime measurements are cited as prior evidence;
they were not repeated here.

## Executive judgment

The system does not need a bundler, a deployment rewrite, or a generalized build
framework. Its existing shape is coherent: authored ES modules and committed
derived assets are selected through one public manifest, copied to a temporary
artifact, served by the same small HTTP server locally and on Railway, and
guarded by focused derivation checks.

The remaining risk is at the joins between those mechanisms:

- startup treats all baked chapter downloads and GPU preparation as one
  availability-critical transaction, while there is still no page-level
  deadline/abort owner;
- the public packager mutates every selected byte stream for origin
  substitution, including text that is not a placeholder, while its own
  verifier blesses the same mutation;
- browser smoke executes the repository checkout, not the public artifact, and
  production verification proves only the revision marker;
- the capture tool is now honest and read-only in check mode, but two wrappers
  deliberately turn one shipped mobile-golden failure back into success;
- artifact dependency enforcement is strong in the authorized release command
  but incomplete for direct commits, with no repository CI surface visible;
- measured payload quantities and the `no-store`/idle-warmer interaction justify
  controlled tracing, not an optimization proposal.

The delivery plan therefore remains **forming**. Fix artifact identity and
finish bounded startup before using performance results to select structural
work.

## Current artifact inventory — facts, not a load-time claim

Applying `deploy/public-files.json` to the current checkout selects **166 source
files totaling 28,069,964 bytes** before the generated revision marker. The
largest categories are:

| Category | Selected bytes | Interpretation |
|---|---:|---|
| PNG | 14,484,780 | Ten shipped Tier-3 chapter stills plus brand/card images; not all are necessarily fetched by one route. |
| baked `.bin` | 4,940,912 | Four chapter geometry files; the interactive loader currently requests all four. |
| JavaScript | 4,029,866 | 99 selected JS files including 1,367,201 bytes under `vendor/`; selection is not proof every module executes on one route. |
| MP4 | 2,944,815 | Seven card previews; idle warming may request all seven after boot. |
| remaining images/fonts/CSS/HTML/data | 1,669,591 | Mixed runtime and page-specific material. |

`static/` accounts for 19,295,662 selected bytes. Separately, the repository
still tracks ten obsolete `static/captures/_check` PNGs totaling about 13 MiB,
but the packager explicitly excludes them (`deploy/public-files.json:41-43`) and
the repaired capture check now writes to a system temporary directory. They are
repository residue, not a shipped-performance finding.

The older deployment statement that the raw payload is “3.3 MB” and that Three
is its bulk (`DEPLOY.md:45-51`) is no longer a description of the complete
artifact. It may have meant a narrower code path; it must not be reused as a
current transfer or artifact-size claim.

## Reconciliation of prior findings

| Prior concern | Current disposition at `b7e0ca7` |
|---|---|
| Browser unavailable/WebGL unavailable could appear as PASS | **Fixed.** Missing coverage fails by default and an authorized skip is explicit/machine-readable. Wave3B T1 also bounds scenario/preflight ownership and hard-stops on unconfirmed cleanup (`tools/browser-smoke.mjs:13-34,375-430`; `.oracle/checkins/wave3b-t1.md`). |
| Browser timeout could abandon a live scenario and start the next | **Fixed after review-directed repair.** Late page/context creation is adopted and cleanup-confirmed; the real overloaded-host run returned with no owned Chrome/profile residue. This is lifecycle evidence, not a performance pass. |
| Capture `--check` wrote tracked `_check` outputs and ignored readiness | **Fixed.** Fresh shutters use `TemporaryDirectory`, readiness contributes to exit status, and focused tests cover both (`tools/capture.py:847-853,925-974`; `tools/test-gate-capture.py`). The old tracked `_check` files remain inert residue. |
| Full rebuild generated metadata before its capture inputs | **Fixed.** `build_steps()` inserts capture before `build-meta.py`, with focused order coverage (`tools/rebuild.py:40-58`; `tools/test-gate-rebuild.py`). |
| Range suffix/multi-range/416 behavior was incorrect | **Fixed locally and covered.** `serve.py:25-112` now implements one strict range with HEAD parity; `tools/test-serve-range.mjs` is in the developer test chain. Browser media seek and deployed-origin headers remain unmeasured. |
| Static no-JS chapter links stayed at Mission/top | **Fixed and generated from the chapter schema.** The native IDs/router list are derived and statically tested (`tools/build-static-content.mjs:71-98`; `tools/test-static-content.mjs:28-51`). |
| Malformed bake manifests failed late | **Fixed at the schema/window boundary.** The loader validates manifest structure and bin windows, and current manifest digests match all four committed bins. A pending request is still unbounded (`journey/lib/baked.js:108-258`). |
| Initial DPR2 composer/TAA history was four times intended pixels | **Fixed and focused-test covered.** First construction now uses the same logical/drawing-buffer sizing contract as resize (`organism/organism.js:105-120,170-180,1843-1851`). This closes that allocation defect; it is not evidence that TAA or DPR now dominates nothing. |
| GPU fence itself could wait forever | **Falsified.** Its fence path is bounded at eight seconds (`journey/journey.js:1454-1479`). Synchronous compile/draw/`gl.finish()` stalls remain hypotheses, and whole-startup terminality remains reproduced. |
| `/tmp/public` restart failure and production compression | **Still unverified platform hypotheses.** The fixed destination plus nonempty-directory rejection makes restart persistence relevant (`railway.toml:5`; `tools/package-public.py:112-117`), but local source cannot establish Railway filesystem lifetime or edge encoding. |

## Ranked findings

### 1. P0 accepted interaction — delivery concurrency remains inside an unbounded startup transaction

**Evidence state: reproduced availability defect; measured byte cost; performance
impact not yet attributed.**

`fetchBakedAssets()` fetches every declared bin concurrently and resolves only
after their aggregate `Promise.all` (`journey/lib/baked.js:210-258`). Module-level
`ready` retains every successful `ArrayBuffer` (`:263-281`), and `geometry()`
then slices each used typed-array window into a second allocation (`:292-320`).
`main.js` waits for the aggregate before chapter preparation, then waits for
portrait preparation, compile, hidden warm draws, and GPU drain before
activation (`main.js:1173-1254`; `journey/journey.js:1485-1564`).

Wave3B directly held the module import, manifest, one bin, portrait image,
`compileAsync`, and one hidden draw; each left the page nonterminal until
released. This is not a hypothesis and is already the accepted T3 problem.
The delivery view adds an important constraint: per-chapter live fallback does
not help a *pending* bin, because the aggregate never reaches the point where
missing chapters can build live.

Do not solve the byte cost first. Finish the accepted ready-or-fallback
transaction, move optional warm draws off the availability path, and make late
settlement inert. Only then can a quiet-host trace decide whether eager bins,
copies, live builders, portraits, or GPU work merit a performance change.

### 2. P1 proven — artifact-wide `ORIGIN` replacement mutates unrelated shipped source and the verifier masks it

**Evidence state: deterministic current-source defect.**

The packager calls `.replace(b"ORIGIN", origin)` on every selected file
(`tools/package-public.py:119-125`), and verification computes its expectation
with the identical broad replacement (`:81-92`). The current public selection
contains two non-placeholder occurrences:

- `journey/ui.js:2007` contains `ORIGINAL trigger`;
- `journey/chapters/owned/portraits.js:2197` contains `ORIGINAL reason`.

At the production origin those comments become
`https://www.banodoco.aiAL trigger` and
`https://www.banodoco.aiAL reason`. Current runtime behavior is unaffected only
because both occurrences are comments. The advertised byte-roundtrip gate
cannot detect this class: it defines the unintended mutation as expected.
Future uppercase identifiers, strings, binary coincidences, or comments are all
inside the same unchecked mutation boundary.

Smallest correction: restrict substitution to the documented HTML/XML source
set (or exact placeholder tokens) and require every other selected file to be
byte-identical. Add a focused fixture containing both a real placeholder and
`ORIGINAL`; assert only the former changes and no placeholder survives.

### 3. P1 proven coverage gap — no gate executes the exact packaged artifact or substantive deployed routes

**Evidence state: source-proven absence; no packaged runtime failure claimed.**

`tools/check.sh` packages and compares the allowlist (`:32-37`), then validates
four files from the separately running repository server (`:39-50`). Browser
smoke itself starts `serve.py` with the repository root as cwd
(`tools/browser-smoke.mjs:11,375-405`). The release poll checks only the exact
`release-revision.txt` body (`tools/release.sh:152-169`). Therefore:

- unit/browser behavior is proved against source;
- file selection/substitution is proved against the artifact;
- deployed revision identity is proved against production;
- no lane currently proves those three properties together.

Finding 2 demonstrates why this is material: the packaged JS already differs
from the browser-tested source while all current package checks accept it.
There is no evidence that the present comment-only mutation breaks execution,
so this is a confidence-boundary defect rather than a claimed outage.

Add the smallest artifact target to the existing smoke mechanism: package into
a temporary directory, serve that directory with its copied `serve.py`, and run
the existing static/no-JS/WebGL-fallback/live route assertions without forking a
second scenario suite. Production verification should sample representative
HTML, module, static, media-range, and revision endpoints; it need not become a
deployment framework.

### 4. P1 proven gate exception — a failing shipped mobile capture can still produce a green release gate

**Evidence state: deterministic source behavior; visual root cause remains
unmeasured in this wave.**

`capture.py --check` correctly returns nonzero for a frozen FAIL-band
(`tools/capture.py:925-974`). Both `tools/check.sh:84-100` and
`tools/pre-commit:103-121` override that result when the sole failure is
`final@430x932.png`. That exact PNG is part of the shipped static fallback. The
exception is loud and narrow, but “reported loudly” is not equivalent to a
passing deterministic artifact contract.

`BUILDING.md:61-64,95-106` also records a separate Mission-mobile drift, while
only Final is exempted. This is evidence that the frozen-capture model has at
least two environment-sensitive outcomes; it is not evidence for the stated
perf-governor cause.

Use an exclusive quiet capture lease to shoot Final and Mission mobile at least
five times with renderer/DPR/governor state recorded. Either remove the source
of variance and restore a binary gate, or explicitly reclassify that specific
golden as advisory with a separate human approval artifact. Do not silently
widen the exception or raise the global MAE threshold.

### 5. P1 contributor-safety gap — derived dependencies are enforced by workflow convention, not one complete dependency contract

**Evidence state: source-proven enforcement gap; no stale production artifact
is asserted at this HEAD.**

The authorized `tools/release.sh` path is intentionally strong: it runs the
developer/browser contract and scene/artifact contract against the reviewed
tree before commit (`tools/release.sh:118-145`). Direct commits rely on
`tools/pre-commit`, whose expensive scene checks trigger only for `organism/` or
`journey/` (`tools/pre-commit:70-84`). Yet captures and startup behavior also
depend on `main.js`, `flags.js`, `hero.css`, capture tooling, and selected vendor
or content surfaces. The static derivation imports `journey/structure.js`, but
its hook trigger names only `content/content.js`, `static/index.html`, and the
builder (`tools/pre-commit:41-53`). `npm run check` would catch static drift,
but the hook does not run that aggregate, and no checked-in CI workflow was
found.

This does not make the release command unsafe. It means a direct commit/push can
bypass a derivation check whose output it affects, and Railway packages whatever
was committed without rebuilding or validating those derivations.

Define a small explicit source→artifact/check dependency table and test its
trigger classification with filenames. Extend existing hooks only for proven
dependencies; do not turn every edit into a capture or invent a build graph
framework.

### 6. P2 measurement-backed candidate — both interactive and recovery tiers are eager, heavy cold paths

**Evidence state: transfer quantities measured previously and source structure
verified; user harm and best intervention unmeasured.**

Wave1 measured about 5.07 MB of interactive baked geometry fetched before
chapter selection and 10.79 MB desktop / 3.33 MB mobile still downloads on the
static tier. Current source still declares all five resolution-matched static
backgrounds together (`static/index.html:141-154`) and still aggregates all
four baked bins. Static is the visitor-safe destination offered when the live
tier fails, so its cold-load cost is part of graceful-failure quality, not an
unrelated microsite concern.

These byte totals do not prove an LCP, memory, or abandonment defect. Trace cold
and repeat loads for interactive and static separately, record encoded and
decoded bytes, request priority, readiness/LCP, heap, and failed-live→static
handoff. Preserve the five authored stills and accessible HTML; test loading
policy before image format or visual changes.

### 7. P2 contract contradiction — idle card warming assumes a cache the shipped server forbids

**Evidence state: source-proven policy conflict; duplicate transfer remains a
hypothesis pending network evidence.**

The card warmer queues all light assets and seven MP4s one request per idle
slice and explicitly says production caching makes those fetches useful
(`journey/cards/index.js:67-112`). Railway starts the packaged copy of the same
`serve.py` (`railway.toml:5`), whose handler unconditionally sends
`Cache-Control: no-store, must-revalidate`, `Pragma: no-cache`, and an expired
date (`serve.py:18-23`). A proxy could override or cache despite the origin
header, so production behavior must be observed; source alone cannot prove
duplicate bytes.

The next trace must record each warm request and the first real card open under
both packaged-local and deployed origins, including transfer size, cache status,
Range behavior, cancellation after user activity/visibility change, and whether
the media request repeats. Do not remove warming or change cache policy until
that trace attributes cost and first-open benefit.

## System interactions and missing coverage

1. **Availability and performance share a critical path but not a solution.**
   T3 must bound startup regardless of speed. L10 profiling happens afterward
   so a slow host is not used to invent the timeout or justify an optimization.
2. **Artifact identity currently stops at three separate proofs.** Source
   behavior, artifact bytes, and deployed revision are each checked, but never
   as one executable identity. The broad origin substitution is a concrete
   example of the gap.
3. **Fallback correctness includes delivery cost.** The static application is
   useful and accessible, but its eager still policy has more consequence when
   it is the recovery destination for GPU/startup failure.
4. **Capture determinism and adaptive rendering are coupled.** The capture path
   claims a frozen visual state while documentation attributes one mobile drift
   to the performance governor. That cause is unverified; the probe must record
   renderer policy rather than infer it from pixels.
5. **Local and deployed HTTP behavior are not interchangeable.** Range behavior
   is now unit-tested locally. Compression, cache overrides, CDN/proxy range
   handling, and `/tmp/public` persistence are still platform questions.
6. **Render-failure lifecycle is adjacent but separate.** C1 identifies
   continued rendering/context recovery and core-render fault ownership. Do not
   fold those into delivery or use payload work as a substitute for the C1/T3
   terminal-state contracts.

## Targeted next probes and order

### A. Deterministic, source-only first

1. **Origin-substitution fixture:** package a fixture containing exact
   placeholders, `ORIGINAL`, and representative binary bytes. Require a named
   substitution set, exact expected replacement counts, and byte identity for
   every other file.
2. **Artifact manifest audit:** report source path, artifact path, byte hash,
   substitution disposition, and required/forbidden classification for every
   selected file. Fail on an undeclared mutation.
3. **Derived-dependency classifier:** feed changed-path sets for `main.js`,
   `flags.js`, `hero.css`, `journey/structure.js`, geometry modules, capture
   tooling, captures, brand masters, and content; assert the exact required
   derivations/checks. Keep skips explicit.
4. **Documentation assertions:** update measured inventory automatically or
   remove numeric payload claims that have no named scope. Do not add a second
   hand-maintained public file list.

### B. Exclusive browser/capture lease after artifact identity and T3

5. **Packaged-artifact smoke:** one unique port and profile, same bounded owner
   as source smoke; static/no-JS first, WebGL fallback next, healthy live last.
   Confirm no owned process/profile/port remains.
6. **Capture variance:** Final-mobile and Mission-mobile, at least five clean
   runs each, fixed source SHA, renderer/DPR/pixel-ratio-policy state and host
   load. Diagnose or explicitly downgrade only the proven case.
7. **Media delivery:** packaged and deployed initial play/seek/replay for one
   ADOS and one Arca video; record Range/HEAD, cache, encoding, transfer and
   repeat-fetch behavior.
8. **Correlated cold/steady profile last:** at least five runs per comparison,
   DPR1/DPR2, default/`photos=0`, baked/`livebuild=1`, warming blocked/enabled,
   and deterministic chapter/card route. Record phase marks, request/decoded
   bytes, long tasks, frame percentiles, target dimensions, heap/resources and
   server/host state. Preserve the already-fixed initial TAA sizing as the
   baseline.

### C. Platform evidence, never inferred from local `/tmp`

9. Query production HTML/JS/MP4/revision endpoints with GET/HEAD, Range and
   `Accept-Encoding`; record cache, encoding, `Vary`, server/CDN headers and
   exact revision.
10. Observe an actual Railway process restart/redeploy to determine whether
    `/tmp/public` persists. Only then decide whether fixed-destination cleanup or
    atomic replacement is needed.

## Exceptional `[XHARD]` assessment

**No current item is `[XHARD]`.** The proven fixes are narrow: constrain
substitution, execute the existing smoke against the artifact, make derived
dependencies explicit, and either remove or honestly classify the one capture
exception. Startup T3 and the measurement probes are already decomposed into
bounded normal work.

Reassess `[XHARD]` only if controlled traces prove that acceptable startup and
steady behavior require changing the one-document/all-chapter product contract
across live construction, baked artifacts, capture determinism, and static
fallback simultaneously. Current byte counts and overloaded-host stalls do not
meet that threshold.

## North Star disposition

The direction is deliberately conservative: preserve the authored visual
system, vanilla-module/static deployment, accessible fallback, and committed
artifact model. Make the artifact exactly the thing tested; make every derived
dependency and exception explicit; bound startup independently of speed; then
optimize only costs reproduced in comparable traces. Reject a bundler rewrite,
automatic image-format churn, arbitrary timeout inflation, broader capture
tolerances, or cache changes justified only by source comments.
