#!/usr/bin/env python3
# ==============================================================================
# build-mark.py — derive the shipped logo masks from the supplied master.
#
#   python3 tools/build-mark.py            # rebuild assets/brand/mark-b-mask-*.png
#   python3 tools/build-mark.py --check    # rebuild to a temp dir and diff
#
# THE MARK (2026-08-11). Hannah supplied the Banodoco logo as an isometric
# wireframe capital B drawn in glowing amber line art, cropped to its ink and
# cut out of its background on the source's own alpha:
#
#     assets/brand/mark-b-source.png    814x1112 RGBA, aspect 0.732
#
# That file is the MASTER and is never served. What ships is its ALPHA CHANNEL,
# at three resolutions, as grayscale+alpha PNGs — the site paints the colour
# itself (hero.css `.logo .mark`, and Tier 3's copy in static/index.html), so
# the mark can rest in parchment and lift to gold with the control opposite it
# instead of being permanently lit amber. The long version of why is in the
# comment above `.logo` in hero.css.
#
# WHY ALPHA AND NOT LUMINANCE. The master's RGB carries a lighting gradient
# across the drawing — bright near faces, dark far ones. Masking on luminance
# (or on luminance x alpha) drops the far faces almost entirely and the B comes
# apart into an illustration with holes. The alpha channel holds every line at
# the same weight AND keeps the original's soft glow falloff, so the shipped
# mark is the same hairline the .co leader lines and the Discord outline are
# drawn at. Nothing is traced or re-drawn; this is the artwork's own alpha,
# resampled.
#
# WHY THESE THREE SIZES. They are picked for the RENDERED size, not for round
# numbers. The mark is 29.3 CSS px wide at 1440 and 24.9 at 375, so a device
# needs ~29 / 59 / 88 px of mask at 1x / 2x / 3x; 48 / 64 / 96 are the smallest
# widths that stay oversampled at each. CSS picks between them with image-set,
# so exactly ONE of them is ever fetched: 2.9 / 4.8 / 9.7 kB.
# ==============================================================================

import argparse
import os
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRAND = os.path.join(ROOT, "assets", "brand")
MASTER = os.path.join(BRAND, "mark-b-source.png")

# width -> the resolution slot it serves in the image-set
WIDTHS = {48: "1x", 64: "2x", 96: "3x"}


def build(outdir):
    master = Image.open(MASTER)
    if master.mode != "RGBA":
        sys.exit("master must be RGBA (it is %s) — the alpha IS the mark" % master.mode)
    w0, h0 = master.size
    alpha = master.getchannel("A")
    made = []
    for w in sorted(WIDTHS):
        h = round(w * h0 / w0)
        m = alpha.resize((w, h), Image.LANCZOS)
        # grayscale+alpha: the grey plane is a constant and costs almost
        # nothing to deflate; the alpha plane is the mask. mask-mode defaults
        # to match-source, which for a PNG means "use the alpha".
        out = Image.merge("LA", (Image.new("L", (w, h), 255), m))
        path = os.path.join(outdir, "mark-b-mask-%d.png" % w)
        out.save(path, optimize=True)
        made.append((path, w, h, os.path.getsize(path)))
    return made


def main():
    ap = argparse.ArgumentParser(description="derive the shipped logo masks from the master")
    ap.add_argument("--check", action="store_true",
                    help="rebuild to a temp dir and report any difference from what is committed")
    a = ap.parse_args()

    if a.check:
        with tempfile.TemporaryDirectory() as td:
            drift = 0
            for path, w, h, n in build(td):
                live = os.path.join(BRAND, os.path.basename(path))
                if not os.path.exists(live):
                    print("MISSING %s" % os.path.basename(live)); drift += 1
                elif open(live, "rb").read() != open(path, "rb").read():
                    print("DRIFTED %s" % os.path.basename(live)); drift += 1
                else:
                    print("ok      %-22s %dx%d  %d bytes  (%s)"
                          % (os.path.basename(live), w, h, n, WIDTHS[w]))
            sys.exit(1 if drift else 0)

    for path, w, h, n in build(BRAND):
        print("wrote %-22s %dx%d  %d bytes  (%s)" % (os.path.basename(path), w, h, n, WIDTHS[w]))


if __name__ == "__main__":
    main()
