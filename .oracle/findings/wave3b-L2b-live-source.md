# Wave 3B L2b — Live-journey timeout source diagnosis

Luna read-only analysis at `1b24936` ranks scenario/process overlap first and genuine unbounded product readiness second.

The harness starts one Chromium per scenario but a timed-out scenario promise is not cancelled and cleanup may stop waiting after five seconds (`tools/browser-smoke.mjs:85-105,327-345`). A later live case can therefore overlap outstanding CDP/browser work. The 120-second outer deadline is ambiguous because startup waits use 90-second Playwright timeouts while later interaction waits have no independent deadline (`:293-319`).

The product risk is independently real: eager module/baked loading (`main.js:18-25,1173-1227`), unbounded manifest/bin `Promise.all()` (`journey/lib/baked.js:210-258`), portrait/texture/`compileAsync` readiness (`journey/journey.js:1485-1510`), and hidden warm draws (`:1512-1559`). Only the GPU fence has an eight-second bound. Wave3B L1 reproduced indefinite waits for import, manifest, bin, portrait, compile, and hidden draw.

The live smoke URL removes intro and real portraits, making intro-clock regression unlikely. SwiftShader detection is optional and hidden warm draws can run if renderer classification misses.

Disposition: the product readiness contract is unsafe, but source analysis alone could not attribute this particular timeout. No files changed.
