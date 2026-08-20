#!/usr/bin/env python3
"""rebuild.py — regenerate every derived artifact of the journey.

The journey has NO compiler. "Building" it means regenerating the committed
derived artifacts from the live scene and sources:

    bake-geom.py    -> static/geom/*.bin     (deterministic chapter geometry)
    build-meta.py   -> favicon.ico + assets/brand/og-* (favicons + social cards)
    build-mark.py   -> assets/brand/mark-b-mask-*.png (logo masks)
    capture.py      -> static/captures/*.png (Tier-3 stills; ~1-2 min, optional)

Usage:
    python3 tools/rebuild.py                  # fast: bake + meta + mark, NO captures
    python3 tools/rebuild.py --with-captures  # everything, incl. re-shooting stills
    python3 tools/rebuild.py --check          # verify-only: byte/MAE gates, writes nothing

Precondition: the static server must be up (python3 serve.py) on :8137 —
bake-geom and capture drive the LIVE scene in headless Chrome. build-meta
and build-mark are pure derivation and do not need it.

Run the site from LIVE code instead of the baked geometry:
    http://localhost:8137/?livebuild=1
(?livebuild=1 makes journey/lib/baked.js skip static/geom/*.bin and run the
real builders — BAKING.md §2. Everything else on the site is always live;
there is no other bundling.)

See BUILDING.md at the repo root for the full picture.
"""
import argparse
import os
import subprocess
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
PORT = int(os.environ.get("PORT", 8137))

# (tool, args, label, needs_server)
FAST_STEPS = [
    ("build-static-content.mjs", [], "static content   static/index.html", False),
    ("bake-geom.py", [], "geometry bake    static/geom/*.bin", True),
    ("build-meta.py", [], "favicons + og    favicon.ico, assets/brand/og-*", False),
    ("build-mark.py", [], "logo masks       assets/brand/mark-b-mask-*.png", False),
]
CAPTURE_STEP = ("capture.py", [], "Tier-3 stills    static/captures/*.png", True)


def server_up():
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def run_step(tool, args, label):
    print(f"== {label}")
    r = subprocess.run(
        (["node"] if tool.endswith(".mjs") else [sys.executable])
        + [os.path.join(TOOLS, tool)] + args,
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    # the tools are quiet on success; show their tail on failure
    if r.returncode != 0:
        print(r.stdout[-1200:])
        print(r.stderr[-1200:])
    return r.returncode == 0


def main():
    ap = argparse.ArgumentParser(
        description="Regenerate the journey's derived artifacts (see BUILDING.md)"
    )
    ap.add_argument(
        "--with-captures", action="store_true",
        help="also re-shoot the Tier-3 stills (capture.py, ~1-2 min; the gate's "
             "slow + currently nondeterministic part)",
    )
    ap.add_argument(
        "--check", action="store_true",
        help="verify-only: run every gate (byte/MAE) without writing anything",
    )
    args = ap.parse_args()

    os.chdir(ROOT)

    if args.check:
        steps = [(t, ["--check"], l, s) for t, _a, l, s in FAST_STEPS]
        if args.with_captures:
            steps.append((CAPTURE_STEP[0], ["--check"], CAPTURE_STEP[2], CAPTURE_STEP[3]))
    else:
        steps = list(FAST_STEPS)
        if args.with_captures:
            steps.append(CAPTURE_STEP)
        else:
            print("note: captures NOT regenerated — add --with-captures for the full build")
            print("      (see BUILDING.md; the mission@430x932 freeze is nondeterministic)")

    if any(needs for _, _, _, needs in steps) and not server_up():
        print(f"error: static server not up on :{PORT} — start it first:")
        print(f"  python3 serve.py    # then re-run this")
        sys.exit(2)

    ok = True
    for tool, tool_args, label, _needs in steps:
        if not run_step(tool, tool_args, label):
            ok = False
            print(f"  ^ {tool} FAILED")

    print()
    print("build %s" % ("OK" if ok else "FAILED"))
    print("live-code mode: http://localhost:%d/?livebuild=1" % PORT)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
