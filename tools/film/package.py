#!/usr/bin/env python3
# package.py — assemble the editor-ready ZIP: newest take per shot + SHOTLIST.md.
# Usage: python3 tools/film/package.py [--pick name1,name2,...] [--out dir]
import argparse
import glob
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from film import OUT_ROOT

ap = argparse.ArgumentParser()
ap.add_argument("--dir", default=OUT_ROOT)
ap.add_argument("--pick", default=None, help="comma-separated shot names; default: all")
ap.add_argument("--zip", default=os.path.join(OUT_ROOT, "glowshroom-coverage.zip"))
args = ap.parse_args()

# newest take per shot stem: NN_name.mp4 < NN_name_v2.mp4 < NN_name_v3.mp4 ...
takes = {}
for mp4 in glob.glob(os.path.join(args.dir, "*.mp4")):
    base = os.path.basename(mp4)[:-4]
    m = re.match(r"^(.*?)(?:_v(\d+))?$", base)
    stem, v = m.group(1), int(m.group(2) or 1)
    if stem not in takes or v > takes[stem][0]:
        takes[stem] = (v, mp4)

picks = sorted(takes)
if args.pick:
    want = set(args.pick.split(","))
    picks = [p for p in picks if p in want]
    missing = want - set(picks)
    if missing:
        sys.exit("missing shots: %s" % ", ".join(sorted(missing)))

lines = [
    "# Glowshroom — Announcement Film Coverage",
    "",
    "Cinematic coverage rendered offline from the live Three.js world with scripted",
    "cameras (1920x1080, 24fps, H.264). One clip per shot; `_vN` = newest approved",
    "take. Each clip ships with a `.json` sidecar carrying its full camera/timing",
    "recipe, so any shot can be tweaked and re-rendered on request.",
    "",
    "| Clip | Length | What it is |",
    "|---|---|---|",
]
staged = []
for stem in picks:
    v, mp4 = takes[stem]
    sidecar = mp4[:-4] + ".json"
    note, dur = "", ""
    if os.path.exists(sidecar):
        with open(sidecar) as f:
            sc = json.load(f)
        note = sc.get("settings", {}).get("note", "")
        d = sc.get("settings", {}).get("dur")
        dur = ("%.0fs" % d) if d else ""
    lines.append("| %s | %s | %s |" % (os.path.basename(mp4), dur, note))
    staged.append(mp4)
    if os.path.exists(sidecar):
        staged.append(sidecar)

shotlist = os.path.join(args.dir, "SHOTLIST.md")
with open(shotlist, "w") as f:
    f.write("\n".join(lines) + "\n")
staged.append(shotlist)

if os.path.exists(args.zip):
    os.remove(args.zip)
r = subprocess.run(["zip", "-j", "-q", args.zip] + staged)
if r.returncode != 0:
    sys.exit("zip failed")
print("wrote %s (%d clips, %.1f MB)" % (
    args.zip, len(picks), os.path.getsize(args.zip) / 1048576.0))
