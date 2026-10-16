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

## Added 2026-10-16 (deck slides 10–11, task F4)
- artcompute/emmacatnip-poster.jpg — the picture artcompute.org shows for
  itself: its og:image / twitter:image (https://artcompute.org/emmacatnip_poster.jpg,
  640×360, the poster frame of Emma Catnip's clip in the site's own background
  reel, credited there as @emmacatnip, HotshotXL), fetched 2026-10-16 and
  downscaled with macOS sips to 480×270, JPEG q62 (26 KB). Used as ArtCompute's
  icon on the deck's slide 11 halo (and slide 10 on a phone).
- Reused, not copied: assets/brand/mark-b-mask-96.png (the Banodoco B, see
  tools/build-mark.py) as the Banodoco icon's mask; the arca posters, the ADOS
  LA poster, the 2RP cover and the fonts above in the deck's fuller cards. The
  Astrid icon is drawn from deck/mink.js's GRID (the app's 16×16
  astrid-favicon.svg), not a file.

## Added 2026-10-16 (deck slide 1, task G5): five Arca Gidan Prize recipients
The five films on the deck's opening collage, all recipients of the Arca Gidan
Prize's Edition 2 (Mar–Apr 2026, the last edition), as arcagidan.com lists them
(its winners page, /winners/edition-2; data read 2026-10-16 from the Supabase
backend its own app reads, `submission_details`). Titles are spelled and artists
credited exactly as that page shows them. Each file was cut from the entrant's
original upload (the entry's `fallback_video_url`, read by byte range with
ffmpeg; nothing larger was kept):
- `<name>.avif` + `<name>.jpg` — one frame at the time below, cropped to the
  tile's shape round the focus below and scaled (Lanczos) to the tile's size at
  2× on a 640 px collage; AVIF q84 (Pillow/libavif; Sliver of Light q74), with a
  progressive JPEG q78 fallback.
- `<name>-preview.mp4` — the seconds below, from that same frame and crop, played
  on hover: silent, H.264 Constrained Baseline level 3.0, crf 27–31, faststart.
- Both carry the same gentle grade, so the five sit together on the deck's warm
  black: ffmpeg `curves=all='0/0.015 0.3/0.33 0.7/0.72 1/0.91',eq=saturation=0.95,
  colorbalance=rm=0.01:bm=-0.01:rh=0.03:bh=-0.04` (whites rolled to ~91%, a touch
  warmer and softer).

| name | title — artist (prize) | entry page | frame · preview | original |
|---|---|---|---|---|
| everyone-all-at-once | Everyone All at Once — VisualFrisson (Apex) | /submissions/entry/590bc5e0-62b5-4649-9da0-676e0057df4f | 6.0 s · 6.0–10.0 s, 640×360 | 3840×2160, 24 fps |
| the-cellist | The Cellist — Material_Rabbit (Apex) | /submissions/entry/3b32b51f-cb9a-4f20-ad87-5993f8e0a511 | 13.0 s (focus 64%) · 13.0–17.5 s, 352×528 | 1920×1080, 24 fps |
| sliver-of-light | Sliver of Light — Calvin Herbst (Apex) | /submissions/entry/ec26de7e-c088-41b1-b943-826e15db6900 | 63.25 s (focus 42%) · 63.25–67.25 s, 324×576 | 1024×576, 16 fps |
| cherrybomb | Cherrybomb (Original Music) — sagansagansagans (Crest) | /submissions/entry/13c435a1-057a-441b-b729-545d61cb111b | 69.0 s (focus 42%) · 69.0–72.5 s, 360×600 | 1920×1080, 16 fps |
| to-be-continued | To be continued — davidmaruscsak00 (Crest) | /submissions/entry/c7041961-a637-489d-91c0-84e10e40cb53 | 9.25 s · 9.25–13.25 s, 352×440 | 1280×720, 16 fps |

Clicking a tile plays the whole film from where arcagidan.com hosts it
(Cloudflare Stream, customer-xt84pg68d7eakb9h, in its own iframe player, with the
stream's thumbnail at the frame above as its poster); none of that is stored
here. These replace the stand-in clips video-1..4-60.mp4 (cut from the site's
own hero videos), which nothing used any more.
