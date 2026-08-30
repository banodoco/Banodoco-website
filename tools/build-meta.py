#!/usr/bin/env python3
# ==============================================================================
# build-meta.py — derive the shipped favicons and social-preview cards.
#
#   python3 tools/build-meta.py            # rebuild favicon.ico + assets/brand/{favicon-96,apple-touch-icon}.png + og-*.jpg
#   python3 tools/build-meta.py --check    # rebuild to a temp dir and diff
#
# Sibling of build-mark.py, same contract: nothing here is hand-authored
# artwork. The icons are resized from their supplied square master; the social
# cards are crops of the Tier-3 captures, which tools/capture.py shoots FROM
# THE LIVE SCENE. Regenerate, never repaint.
#
# THE ICONS. The favicon master is already square, full-bleed artwork on its
# intended dark ground. Preserve the complete composition and downsample it
# with Lanczos. Tab-sized icons (the .ico and favicon-96) get a soft rounded
# corner so the tile doesn't sit as a hard slab in light-chrome tabs;
# apple-touch-icon ships full-bleed square because iOS rounds it itself.
#
# TWO MASTERS, ONE ICON SET (2026-08-30). The mushroom mark's normal stroke
# weight plus its glow blur (assets/brand/favicon.svg) reads as a smear once
# downsampled all the way to 16x16 or 32x32 — measured, not assumed: render
# both and look. So the .ico's 16 and 32 planes are cut from a second,
# bolder, unblurred master — assets/brand/favicon-source-small.png, derived
# from assets/brand/favicon-small.svg — while the .ico's 48 plane and every
# larger icon (favicon-96, apple-touch-icon, icon-192/512) still come from
# the normal favicon-source.png. Same silhouette in both; only the stroke
# weight and the glow differ. If the mark is ever redrawn, both SVGs need a
# matching pass, or the two masters drift apart at exactly the sizes this
# split exists to protect.
#
# THE CARDS. 1200x630 (the og:image ratio every major unfurler crops to),
# cut from the 1440x900 desktop captures — mission for the home and static
# pages (the specimen, the site's one image), owned for the ownership ledger
# (the grant burst). The crop keeps the subject in the right two-thirds and
# lets the left stay dark; the mark signs the dark side small, like a plate
# mark, painted from the master's real RGBA so it keeps its glow at card
# scale. JPEG: these are photographic glow fields, and PNG at this size is
# ~6x the bytes for no visible gain.
# ==============================================================================

import argparse
import os
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, "assets", "brand")
MARK_MASTER = os.path.join(BRAND, "mark-b-source.png")
FAVICON_MASTER = os.path.join(BRAND, "favicon-source.png")
FAVICON_MASTER_SMALL = os.path.join(BRAND, "favicon-source-small.png")
CAPTURES = os.path.join(ROOT, "static", "captures")

def icon_tile(master, size, radius_frac):
    if master.width != master.height:
        sys.exit("favicon master must be square (it is %dx%d)" % master.size)
    tile = master.convert("RGBA").resize((size, size), Image.LANCZOS)
    if radius_frac:
        # soft rounded corners, drawn 4x and downsampled so the curve is clean
        from PIL import ImageDraw
        s4 = size * 4
        msk = Image.new("L", (s4, s4), 0)
        ImageDraw.Draw(msk).rounded_rectangle(
            (0, 0, s4 - 1, s4 - 1), radius=round(s4 * radius_frac), fill=255)
        tile.putalpha(msk.resize((size, size), Image.LANCZOS))
    return tile


def card(capture, y0, mark_master, sign=True):
    im = Image.open(os.path.join(CAPTURES, capture)).convert("RGB")
    w, h = im.size                      # 1440x900
    ch = round(w * 630 / 1200)          # 756 at 1440
    y0 = max(0, min(h - ch, y0))
    im = im.crop((0, y0, w, y0 + ch)).resize((1200, 630), Image.LANCZOS)
    if sign:
        # the mark, small, low in the dark left third — a plate mark, not a
        # lockup. Painted from the master's real RGBA so the glow survives.
        mh = 132
        mw = round(mh * mark_master.size[0] / mark_master.size[1])
        m = mark_master.resize((mw, mh), Image.LANCZOS)
        im = im.convert("RGBA")
        im.alpha_composite(m, (96, 630 - mh - 72))
        im = im.convert("RGB")
    return im


def build(outdir):
    mark_master = Image.open(MARK_MASTER)
    if mark_master.mode != "RGBA":
        sys.exit("mark master must be RGBA (it is %s) — the alpha IS the mark"
                 % mark_master.mode)
    favicon_master = Image.open(FAVICON_MASTER)
    favicon_master_small = Image.open(FAVICON_MASTER_SMALL)
    made = []

    def save(img, relpath, **kw):
        path = os.path.join(outdir, relpath)
        os.makedirs(os.path.dirname(path), exist_ok=True) if os.path.dirname(relpath) else None
        img.save(path, **kw)
        made.append((relpath, os.path.getsize(path)))

    # favicon.ico — 16/32/48, rounded; one file, browsers pick the plane.
    # 48 comes from the normal master; 16 and 32 come from the bolder,
    # unblurred small master (see the TWO MASTERS note above) — the normal
    # stroke smears once downsampled that far.
    frames = [
        icon_tile(favicon_master, 48, radius_frac=0.1875),
        icon_tile(favicon_master_small, 32, radius_frac=0.1875),
        icon_tile(favicon_master_small, 16, radius_frac=0.1875),
    ]
    save(frames[0], "favicon.ico", format="ICO",
         append_images=frames[1:], sizes=[(48, 48), (32, 32), (16, 16)])
    # high-dpi tab / search-result icon
    save(icon_tile(favicon_master, 96, radius_frac=0.1875),
         os.path.join("assets", "brand", "favicon-96.png"), optimize=True)
    # iOS home screen — full-bleed, iOS rounds it
    save(icon_tile(favicon_master, 180, radius_frac=0).convert("RGB"),
         os.path.join("assets", "brand", "apple-touch-icon.png"), optimize=True)
    # Android home screen / install (site.webmanifest) — full-bleed like the
    # apple icon; launchers apply their own shape mask, so no baked rounding
    for s in (192, 512):
        save(icon_tile(favicon_master, s, radius_frac=0).convert("RGB"),
             os.path.join("assets", "brand", "icon-%d.png" % s), optimize=True)

    # social cards
    save(card("mission@1440x900.png", 144, mark_master),
         os.path.join("assets", "brand", "og-home.jpg"),
         quality=88, progressive=True, optimize=True)
    save(card("owned@1440x900.png", 0, mark_master),
         os.path.join("assets", "brand", "og-ownership.jpg"),
         quality=88, progressive=True, optimize=True)
    return made


def main():
    ap = argparse.ArgumentParser(description="derive the shipped favicons and social cards")
    ap.add_argument("--check", action="store_true",
                    help="rebuild to a temp dir and report any difference from what is committed")
    a = ap.parse_args()

    if a.check:
        with tempfile.TemporaryDirectory() as td:
            os.makedirs(os.path.join(td, "assets", "brand"))
            drift = 0
            for rel, n in build(td):
                live = os.path.join(ROOT, rel)
                if not os.path.exists(live):
                    print("MISSING %s" % rel); drift += 1
                elif open(live, "rb").read() != open(os.path.join(td, rel), "rb").read():
                    print("DRIFTED %s" % rel); drift += 1
                else:
                    print("ok      %-34s %d bytes" % (rel, n))
            sys.exit(1 if drift else 0)

    for rel, n in build(ROOT):
        print("wrote %-34s %d bytes" % (rel, n))


if __name__ == "__main__":
    main()
