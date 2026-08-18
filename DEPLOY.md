# Deploying glowshroom

There is no build step: the tree deploys as-is, minus everything listed under
MUST NOT SHIP. Serve `glowshroom/` as the site root (subpaths work — all live
references are relative). For regenerating the derived artifacts (geometry
bake, favicons, captures) BEFORE shipping, see **[BUILDING.md](BUILDING.md)** —
`python3 tools/rebuild.py` (fast, no captures) or `--with-captures` (full).

## MUST ship

```
index.html  main.js  flags.js  hero.css  README.md(optional)
organism/                       (4 .js)
journey/                        (*.js, lib/, chapters/, site.css, index.html stub)
content/content.js
vendor/three/                   (three.module.js + addons/)
static/                         (index.html + captures/*.png — NOT captures/_check/)
static/geom/                    (manifest.json + *.bin — the committed geometry
                                 bake. Named explicitly so nobody trims it: the
                                 page falls back to live builders without it,
                                 which works but re-introduces the load-time
                                 build cost the bake exists to remove. Always
                                 fresh by construction: tools/pre-commit
                                 byte-gates it, so whatever is committed IS
                                 what the builders would compute.)
assets/brand/mark-b-mask-{48,64,96}.png
favicon.ico  site.webmanifest   (site root)
404.html                        (site root; point the host's 404 handling at
                                 it — most static hosts pick up /404.html by
                                 convention)
assets/brand/favicon-96.png
assets/brand/apple-touch-icon.png
assets/brand/icon-{192,512}.png
assets/brand/og-home.jpg        (1200x630 unfurl cards, referenced from the
assets/brand/og-ownership.jpg    three page heads; derived by
                                 tools/build-meta.py — regenerate, never
                                 repaint, same contract as the mark masks)
content/contributors.js         (the 120-person portrait pool)
assets/contributor-portraits/   (manifest.js + profile-sprite.jpg, 384 KB —
                                 BOTH are hard dependencies of portraits.js
                                 and the field ships photos by default now.
                                 The old assets/test-portraits/ stock set is
                                 deleted; nothing imports it.)
robots.txt  sitemap.xml
```

## MUST NOT ship

`archive/`, `journey-v6-plan/`, `journey-v6/`, `tools/`, `serve.py`,
`ab.html`, `compare.html`, `golden-mushroom.html`, `golden-mushroom-page.html`,
`design-reference.png`, `reference.jpg`, `assets/brand/mark-b-source.png`,
`static/captures/_check/`, `content/content-archive-deferred.js`, `DEPLOY.md`.

## Host configuration

- **MIME**: `.js` must serve as `text/javascript` (object-store hosts often
  need this set explicitly). No other special types (all GLSL is inline).
- **Caching**: there is no content hashing — do NOT use long immutable TTLs
  or a CDN will serve mixed-version module graphs after an update (hard
  `does not provide an export` failures). Use `Cache-Control: max-age=300,
  must-revalidate` (or `no-store` if traffic is small). Do not add more
  hand-maintained `?v=` tokens.
- **Compression**: enable gzip/brotli — the 3.3 MB raw payload compresses to
  ~1 MB, and `vendor/three/three.module.js` (1.3 MB) is the bulk of it.
- **CSP**: if any CSP is applied, the inline `<script type="importmap">` in
  index.html needs a nonce or sha-256 hash or the whole site dies.

## One deploy-time substitution

`sitemap.xml` and the three page heads (`index.html`, `static/index.html`,
`ownership/index.html` — their `og:url`/`og:image`/canonical, which must be
absolute, plus the homepage's JSON-LD block) and `404.html` (its home link
and icon — self-contained otherwise, since hosts serve it at arbitrary
depths) use the placeholder `ORIGIN`; robots.txt's `Sitemap:` line
uses a relative path. Substitute the real origin at deploy:

    sed -i '' "s|ORIGIN|https://your.host/base|g" \
      sitemap.xml index.html static/index.html ownership/index.html

and set `Sitemap: https://your.host/base/sitemap.xml` in robots.txt.
(Skipping the sed breaks nothing on-page — unfurlers just fall back to a
card without an image.)

## Field monitoring

Load the site with `?debug=1` to render collected page errors on screen
(`window.__pageErrors` counts them; the overlay lists deduped messages).

## Known shipping placeholders (accepted for launch, tracked)

- ~~All outbound links are `href="#"` and 56 `[PLACEHOLDER]` tokens render~~ —
  **resolved 2026-08-16.** Every destination is now one banodoco.ai itself
  uses, and no placeholder token ships. One node deliberately has no link and
  says "Coming soon": `tworp`.
- ~~The Owned portrait field ships procedural~~ — **resolved 2026-08-16.** It
  ships real contributor photographs from Banodoco's own published sprite,
  sixteen dealt at random out of 120 per load. `?photos=0` forces the old
  procedural look if a venue machine struggles with the atlas bake.
- `hivemind` is wired to github.com/banodoco/hivemind. It is absent from
  banodoco.ai entirely, which is why it briefly shipped as "Coming soon" —
  the project lives in its own repository. Only `tworp` is still unbuilt.
