# Wave 3B T1 checkpoint — browser-smoke lifecycle

## Outcome

PASS after review-directed repair. Browser-smoke scenarios now own every page, context, and browser they create; total deadlines report the active phase; later scenarios cannot begin after unconfirmed cleanup; preflight is also bounded and owned.

## Independent review

- Reviewer: GPT-5.6 Sol, explicitly authorized fallback Oracle while user-preferred Grok 4.6 is unavailable with HTTP 402.
- Initial verdict: `REVISE`.
- Blocking findings:
  1. Delayed page/context creation could resolve after the cleanup snapshot and escape while cleanup was reported confirmed.
  2. Initial WebGL preflight was outside an owned deadline.
  3. A 90-second inner navigation timeout exceeded the default 45-second scenario deadline.
- Repair closure:
  - pending creations are registered before awaiting, adopted on late resolution, and closed exactly once;
  - cleanup waits for creation quiescence and treats unresolved creation/closure as unconfirmed;
  - initial preflight uses the same deadline/owner boundary;
  - normal operations use 40 seconds inside a 45-second scenario total; live operations use 90 seconds inside a 120-second total;
  - fulfilled callback results survive the wrapper, preventing silent loss of the WebGL preflight result.

## Evidence

- `node tools/test-browser-smoke-lifecycle.mjs` — PASS. Covers fulfilled-result propagation, late mutation suppression, delayed page/context adoption, exactly-one close, repeated clean baseline, and hard-stop closure failure.
- `node tools/test-gate-browser-smoke.mjs` — PASS. Missing-browser failure and explicit machine-readable skip semantics preserved.
- Syntax checks, scoped ESLint, and `git diff --check` — PASS.
- Exclusive real-browser run on an overloaded host:
  - seven non-live scenarios passed;
  - live scenario reached its 120-second total deadline during `live Connect navigation` and returned after confirmed cleanup at 122,494 ms;
  - no Chrome process started by the run remained, and no recent `banodoco-browser-smoke-*` temp profile remained.

The live timeout is not a performance or startup-threshold claim. It is retained as T1 lifecycle evidence and remains an input to T2/T3.
