# assets/cards — provenance

Every file here is a real asset of the project its card represents, fetched
2026-08-17 and downscaled locally (Pillow; fonts subset with fontTools). No
generated or stock imagery. Re-fetch sources are listed per directory.

## arca/ — arcagidan.com (same ecosystem; the Arca Gidan Prize site)
- poster-1..4.jpg — the site's own four hero panels (1080×1920 → h520 jpg):
  1 Arnolfo di Cambio · 2 Francesco Petrarca · 3 Giotto di Bondone ·
  4 Jean Buridan, from https://arcagidan.com/{1..4}_*_poster.jpg
- video-1..4.mp4 — the site's own four hero videos (same figure order as
  the posters), fetched 2026-08-18 from https://arcagidan.com/{1..4}_*_video.mp4
  the hour the domain returned from a Railway outage, then transcoded with
  macOS avconvert (PresetAppleM4VCellular): 640×1138 @ 2-5MB each → ~170-286KB
  each, indistinguishable at the card's ~90px panel width.
- eubergine-sub.woff2 — the site's own self-hosted display face
  (https://arcagidan.com/fonts/Eubergine.ttf), subset to caps+space.
- geosans-sub.woff2 — its body face (GeosansLight.ttf), subset.

## ados/ — ados.events (Banodoco's events site)
- {paris-2026,la-2025,paris-2025}-thumb.jpg — its own event posters.
- *-preview.mp4 — 10-second clips cut straight from its own 720p trailers
  (https://ados.events/events/{paris-2026-720p,la-2025-video-720p,
  paris-2025-video-720p}.mp4), 2026-08-18, re-encoded at 30fps with
  libx264 (profile Constrained Baseline level 3.0 — no B-frames/CABAC,
  for hardware-decoder compatibility; the earlier High-profile encodes
  stalled ~1s in playback on real Chrome), crf 26, faststart, no audio
  track. Offsets verified
  frame-exact against the originals by matching the old previews' first
  frames: paris-2026 @10s, la-2025 @5s, paris-2025 @23s. The earlier
  avconvert files were 9s at 10fps and stalled in Safari; the card plays
  the current event's video once and HOLDS the final frame, with the ‹ ›
  walker moving between the three events — no loop, no auto-advance
  (see journey/cards/ados.js). The videos are preloaded whole (preload=
  auto, ~500KB each) so Safari never depends on range-request streaming;
  serve.py also answers byte ranges correctly.
- pilowlava-sub.woff2 — its wordmark face (/fonts/Pilowlava.woff2 — Pilowlava
  is a Velvetyne/SIL-OFL face), subset to caps+digits+en-dash.

## tworp/ — banodoco.ai (2RP)
- cover.jpg — the site's own 2RP card art (public/community-projects/2rp.jpg,
  alt "VisualFrisson — Everyone All at Once"), w520.
- {monoton,sixtyfour,rubikglitch}-sub.woff2 — three of the ten Google faces
  the 2RP wordmark actually rotates through (src/components/brand/
  rpLogoTheme.ts), fetched pre-subset via fonts.googleapis.com text= (all
  SIL OFL), glyphs "2RPND EAISCOL·∞+0-9".

## hivemind/ — github.com/banodoco/hivemind
- mascot.png — the repo's only identity asset (assets/mascot/mascot.png,
  pixel-art librarian), NEAREST-resized to h120 to keep pixels crisp.

## artcompute/ — artcompute.org
- six recipient avatars (56px) — the grantees the site itself shows on its
  /grants ledger (Discord CDN avatars, via the site's own members table):
  loreweavr, ashmotv, persoon, cseti007, oumoumad, calvinherbst.

## discord/
- fallback.json — a trimmed snapshot of the daily_summaries row the live
  card fetches (same Supabase source banodoco.ai's Community section reads),
  captured 2026-08-17; rendered only when the live fetch fails, labeled with
  its capture date.
