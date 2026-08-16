# Deploying glowshroom

There is no build step: the tree deploys as-is, minus everything listed under
MUST NOT SHIP. Serve `glowshroom/` as the site root (subpaths work — all live
references are relative).

## MUST ship

```
index.html  main.js  flags.js  hero.css  README.md(optional)
organism/                       (4 .js)
journey/                        (*.js, lib/, chapters/, site.css, index.html stub)
content/content.js
vendor/three/                   (three.module.js + addons/)
static/                         (index.html + captures/*.png — NOT captures/_check/)
assets/brand/mark-b-mask-{48,64,96}.png
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

`sitemap.xml` (and robots.txt's `Sitemap:` line) use the placeholder
`ORIGIN` / a relative path — substitute the real origin at deploy:
`sed -i '' "s|ORIGIN|https://your.host/base|g" sitemap.xml` and set
`Sitemap: https://your.host/base/sitemap.xml` in robots.txt.

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
