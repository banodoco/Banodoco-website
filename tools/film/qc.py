#!/usr/bin/env python3
# qc.py — extract first/25%/50%/75%/last frames of every clip in the film out
# dir into qc/<clip>_<n>.jpg, plus a mean-luma report to catch black/empty clips.
import glob
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from film import ffmpeg_exe, OUT_ROOT

out = sys.argv[1] if len(sys.argv) > 1 else OUT_ROOT
qc_dir = os.path.join(out, "qc")
os.makedirs(qc_dir, exist_ok=True)

from PIL import Image, ImageStat  # noqa: E402

report = {}
for mp4 in sorted(glob.glob(os.path.join(out, "*.mp4"))):
    name = os.path.splitext(os.path.basename(mp4))[0]
    # count frames via ffmpeg (fast: demux only)
    probe = subprocess.run(
        [ffmpeg_exe(), "-i", mp4, "-map", "0:v:0", "-c", "copy", "-f", "null", "-"],
        capture_output=True, text=True)
    n = 0
    for line in probe.stderr.splitlines():
        if "frame=" in line:
            try:
                n = int(line.split("frame=")[1].strip().split()[0])
            except Exception:
                pass
    marks = sorted(set([0, max(0, n // 4), max(0, n // 2), max(0, 3 * n // 4), max(0, n - 1)]))
    sel = "+".join("eq(n\\,%d)" % m for m in marks)
    subprocess.run(
        [ffmpeg_exe(), "-y", "-i", mp4, "-vf", "select='%s'" % sel, "-vsync", "0",
         "-q:v", "4", os.path.join(qc_dir, name + "_%d.jpg")],
        capture_output=True)
    lumas = []
    for f in sorted(glob.glob(os.path.join(qc_dir, name + "_*.jpg"))):
        im = Image.open(f).convert("L")
        lumas.append(round(ImageStat.Stat(im).mean[0], 1))
    flag = ""
    if lumas and max(lumas) < 4.0:
        flag = "  ⚠ NEAR-BLACK"
    if lumas and min(lumas) < 2.0:
        flag += "  ⚠ has-black-frame"
    report[name] = {"frames": n, "lumas": lumas}
    print("%-38s %4d frames  luma %s%s" % (name, n, lumas, flag))

with open(os.path.join(qc_dir, "report.json"), "w") as f:
    json.dump(report, f, indent=1)
print("\nQC stills in %s" % qc_dir)
