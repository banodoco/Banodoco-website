#!/usr/bin/env python3
# ==============================================================================
# build-meta.py — derive the shipped favicons and social-preview cards.
#
#   python3 tools/build-meta.py            # rebuild favicon.ico + assets/brand/{favicon-96,apple-touch-icon}.png + og-*.jpg
#   python3 tools/build-meta.py --check    # rebuild to a temp dir and diff
#
# Sibling of build-mark.py, same contract: nothing here is hand-authored
# artwork. The icons are the mark's own alpha (the same channel the shipped
# masks are cut from) painted in the site's lit gold on the site's background;
# the social cards are crops of the Tier-3 captures, which tools/capture.py
# shoots FROM THE LIVE SCENE. Regenerate, never repaint.
#
# THE ICONS. Browser tabs and home screens sit on arbitrary chrome, so the
# mark cannot ship on transparency the way the in-page masks do — it gets the
# site's own ground (--bg #141008) as a tile, and the B is painted flat in
# --gold-bright #f0c877, the site's LIT state, not the master's shaded RGB:
# at 16 px the far-face lighting gradient just reads as mud (same reasoning
# as build-mark.py's alpha-not-luminance note, one step further). Small sizes
# get an alpha gain so the hairlines survive resampling instead of fading
# grey. Tab-sized icons (the .ico and favicon-96) get a soft rounded corner
# so the tile doesn't sit as a hard slab in light-chrome tabs;
# apple-touch-icon ships full-bleed square because iOS rounds it itself.
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
MASTER = os.path.join(BRAND, "mark-b-source.png")
CAPTURES = os.path.join(ROOT, "static", "captures")

BG = (0x14, 0x10, 0x08)        # hero.css --bg
GOLD_LIT = (0xF0, 0xC8, 0x77)  # hero.css --gold-bright

# icon size -> (mark height as a fraction of the tile, alpha gain)
ICON_SIZES = {
    16: (0.80, 2.2),
    32: (0.76, 1.8),
    48: (0.74, 1.5),
    96: (0.72, 1.25),
    180: (0.62, 1.0),
    192: (0.62, 1.0),
    512: (0.62, 1.0),
}


def mark_alpha():
    master = Image.open(MASTER)
    if master.mode != "RGBA":
        sys.exit("master must be RGBA (it is %s) — the alpha IS the mark" % master.mode)
    return master, master.getchannel("A")


def icon_tile(alpha, size, mark_frac, gain, radius_frac):
    w0, h0 = alpha.size
    mh = max(1, round(size * mark_frac))
    mw = max(1, round(mh * w0 / h0))
    m = alpha.resize((mw, mh), Image.LANCZOS)
    if gain != 1.0:
        m = m.point(lambda v: min(255, round(v * gain)))
    tile = Image.new("RGBA", (size, size), BG + (255,))
    ink = Image.new("RGBA", (size, size), GOLD_LIT + (0,))
    ink.putalpha(Image.new("L", (size, size), 0))
    pad = Image.new("L", (size, size), 0)
    pad.paste(m, ((size - mw) // 2, (size - mh) // 2))
    ink = Image.merge("RGBA", (
        Image.new("L", (size, size), GOLD_LIT[0]),
        Image.new("L", (size, size), GOLD_LIT[1]),
        Image.new("L", (size, size), GOLD_LIT[2]),
        pad,
    ))
    tile = Image.alpha_composite(tile, ink)
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
    master, alpha = mark_alpha()
    made = []

    def save(img, relpath, **kw):
        path = os.path.join(outdir, relpath)
        os.makedirs(os.path.dirname(path), exist_ok=True) if os.path.dirname(relpath) else None
        img.save(path, **kw)
        made.append((relpath, os.path.getsize(path)))

    # favicon.ico — 16/32/48, rounded; one file, browsers pick the plane
    frames = [icon_tile(alpha, s, *ICON_SIZES[s], radius_frac=0.1875) for s in (48, 32, 16)]
    save(frames[0], "favicon.ico", format="ICO",
         append_images=frames[1:], sizes=[(48, 48), (32, 32), (16, 16)])
    # high-dpi tab / search-result icon
    save(icon_tile(alpha, 96, *ICON_SIZES[96], radius_frac=0.1875),
         os.path.join("assets", "brand", "favicon-96.png"), optimize=True)
    # iOS home screen — full-bleed, iOS rounds it
    save(icon_tile(alpha, 180, *ICON_SIZES[180], radius_frac=0).convert("RGB"),
         os.path.join("assets", "brand", "apple-touch-icon.png"), optimize=True)
    # Android home screen / install (site.webmanifest) — full-bleed like the
    # apple icon; launchers apply their own shape mask, so no baked rounding
    for s in (192, 512):
        save(icon_tile(alpha, s, *ICON_SIZES[s], radius_frac=0).convert("RGB"),
             os.path.join("assets", "brand", "icon-%d.png" % s), optimize=True)

    # social cards
    save(card("mission@1440x900.png", 144, master),
         os.path.join("assets", "brand", "og-home.jpg"),
         quality=88, progressive=True, optimize=True)
    save(card("owned@1440x900.png", 0, master),
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
