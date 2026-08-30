# Wave 3B L2c — Exclusive browser runtime diagnosis

Luna browser owner reproduced both full-smoke failures at `1b24936`, then ran fresh isolated probes.

Runtime facts:

- Local server remained responsive; direct probes returned HTTP 200 in roughly 16–99 ms.
- Browser requests had no failures and eventually returned 200.
- Both pages reached `document.readyState=complete` but remained `body.scene-preparing`, `window.journey=false`, with no status fallback and only about six RAF callbacks.
- Console repeatedly reported GPU `ReadPixels` stalls.
- Host load reached roughly 121 on eight CPUs with unrelated Chrome GPU/agent workloads.
- The browser owner left no browser/server processes after cleanup.

Disposition matrix:

- Product missing bounded terminal/fallback: **observed** (`main.js:1173-1268`, `journey/journey.js:1495-1559`).
- Server stall: **falsified**.
- Environmental renderer/resource starvation trigger: **reproduced**.
- Sequence leak: **undetermined**, because isolated cases already failed under the host condition.
- Definitive product-versus-host cause: **undetermined**, but the product contract fails to terminate gracefully under the observed external pressure.

Raw probe: `/tmp/banodoco-browser-isolation-20260830.json`. No repository files changed.
