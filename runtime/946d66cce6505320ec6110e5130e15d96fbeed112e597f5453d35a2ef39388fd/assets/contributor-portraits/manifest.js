// Real contributor portraits — Banodoco's own, not a stock set.
//
// PROVENANCE, which is the whole point of this directory. `profile-sprite.jpg`
// is the avatar sprite Banodoco publishes and renders on its own front page,
// taken unmodified from https://www.banodoco.ai/profile-sprite.jpg. Its 20x10
// grid of 96px tiles holds 198 contributors' own chosen avatars, and the tile
// coordinates are the ones that site's `profilePicsManifest.ts` records. Who
// appears at which tile is in content/contributors.js, joined to the public
// ownership ledger. Same people, same pictures, same organisation as the site
// that already shows them.
//
// THIS REPLACES assets/test-portraits, which was randomuser.me / pravatar stock
// faces marked LOOK-DEV ONLY with a standing "never ship" rule. That rule was
// never about photographs being wrong; it was about publishing strangers'
// faces.
//
// ONE FILE, NOT ONE PER PERSON. The field deals sixteen faces at a time out of
// a pool of 120 and re-deals on demand, so any given visit can want any tile.
// Shipping the whole sheet is 384 KB in a single cached request; the same
// coverage as 120 separate files would be ~900 KB across 120 requests, on a
// site with no build step and a ten-deep module waterfall already.

const BASE = new URL('./', import.meta.url).href;

/** The published sprite sheet and its grid. TILE * COLS/ROWS must equal the
 *  image's real pixel size (1920x960) — the drawing code slices by these. */
export const PORTRAIT_SPRITE = Object.freeze({
  url: new URL('profile-sprite.jpg', BASE).href,
  cols: 20,
  rows: 10,
  tile: 96,
});
