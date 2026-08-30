# Wave 3B L2a — Reduced-motion timeout source diagnosis

Luna read-only analysis at `1b24936` concludes the reduced-motion product behavior is unlikely to cause the timeout. The static door is markup/CSS (`index.html:76-79`, `hero.css:1082-1108`) and static reduced-motion scrolling passes before the failing root navigation (`tools/browser-smoke.mjs:267-271`).

Highest-confidence defect is harness deadline/process ownership: `runWithDeadline()` races without cancelling the underlying scenario (`tools/browser-smoke.mjs:93-105`); browser cleanup is itself capped at five seconds without proving shutdown (`:85-91`); each next scenario launches a new browser (`:327-345`). The reduced-motion scenario's 45-second outer deadline is shorter than its 90-second `goto` timeout, so the outer failure cannot identify the actual navigation cause.

The failing root load is also the first normal-WebGL load. `?nointro=1` does not avoid synchronous renderer and scene construction (`main.js:276-312`, `organism/renderer.js:11-21`, `organism/organism.js:66-86`), and `DOMContentLoaded` waits for the module. Static → root navigation may still be cancelling roughly 10.8 MB of static background-image requests.

Disposition: product reduced-motion behavior no-finding; harness cancellation/shutdown defect source-proven; renderer/host starvation remains a runtime trigger candidate. No files changed.
