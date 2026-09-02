#!/usr/bin/env bash
# =============================================================================
# capture-diff.sh — THE DIFFERENTIAL CAPTURE GATE.
#
#   tools/capture-diff.sh --base <ref> [--tip <ref>] [options]
#
# Shoots two trees at every pose and size, on ONE host, in ONE session, with
# ONE Chrome and ONE copy of tools/capture.py, and reports the per-pose MAE
# between them. Writes a markdown table. Exits 1 if any pose exceeds the band.
#
# -----------------------------------------------------------------------------
# WHY THIS EXISTS, AND WHY IT IS NOT `capture.py --check`
# -----------------------------------------------------------------------------
# `capture.py --check` compares a fresh frame against the committed goldens in
# static/captures/. Those goldens were shot on ANOTHER MACHINE — manifest.json
# records `ANGLE Metal Renderer: Apple M2` and `Chrome/151.0.7922.174`. On an
# M3 with Chrome 152 the check is red on every pose before anyone changes a
# line: mission 2.17, inspire 2.64, connect 2.64, owned 3.01, final 3.05 MAE,
# measured twice in two different trees on 2026-09-02, both runs reporting
# `self-agreement: all 10 file(s) shot twice, both shots agree within 1.00`.
# The camera is fine; the goldens are from a different GPU. CONTRIBUTING §3
# says the same thing in prose: the captures "are not reproducible here at
# all."
#
# Re-shooting the goldens on this host would make `--check` green and would
# destroy comparability with every prior lane's numbers, so it is not done.
#
# THE DIFFERENTIAL IS THE WAY OUT, AND IT IS EXACT, NOT A WORKAROUND. Shoot
# BOTH trees here. The renderer floor is a property of the host, not of the
# change, so it appears identically in both frames and CANCELS in the
# subtraction. What survives is the change and only the change — measured
# run-to-run noise on one machine is MAE 0.0000 (CONTRIBUTING §3). A 2.5 MAE
# content change shows up unmistakably against a 0.00 baseline delta, on a
# host where the absolute check cannot distinguish it from the floor.
#
# -----------------------------------------------------------------------------
# WHY IT SHOOTS EACH TREE TWICE
# -----------------------------------------------------------------------------
# CONTRIBUTING §3: "roughly one frame in fifty fires the shutter on the wrong
# chapter." A single pass cannot tell that flake from a real change, and a
# differential's whole value is that a number in it means something. So each
# tree is shot TWICE and each pose carries a self-agreement figure. A pose
# whose own two passes disagree by more than the band is reported
# INCONCLUSIVE and is NOT given a drift number — the same discipline
# capture.py --check applies with its `_confirm` shots, for the same reason:
# refusing to report is honest, reporting a number you cannot stand behind is
# not. The four passes run base, tip, base, tip so that any drift across the
# session (thermal, load) lands on both trees equally.
#
# -----------------------------------------------------------------------------
# WHAT IT NEVER TOUCHES
# -----------------------------------------------------------------------------
# Nothing in either repository. Both trees are SERVED read-only; every frame
# and every manifest this script produces lands in a fresh temp directory,
# and static/captures/ is never an output path. The base worktree is created
# with `git worktree add --detach` and removed on exit. No commit, no stage,
# no push, no golden is re-blessed.
# =============================================================================

set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
BASE_REF=""
TIP_REF="HEAD"
BASE_PORT=""
TIP_PORT=""
BAND="0.05"
OUT_FILE=""
PASSES=2
POSE_ARGS=()
SIZE_ARGS=()

usage() {
  cat <<'USAGE'
Usage: tools/capture-diff.sh --base <ref> [options]

  --base <ref>        REQUIRED. The tree to compare against (e.g. a merge base).
  --tip <ref>         The tree under test. Default: HEAD (this checkout, served
                      as it stands on disk — uncommitted edits included).
  --base-port <n>     Port for the base tree's server.   Default: 8621
  --tip-port <n>      Port for the tip tree's server.    Default: 8597
                      (both chosen clear of :8137 and of the 8320/8321/8584-8598
                      range other lanes hold on this host; override if they move)
  --band <mae>        Per-pose fail band. Default: 0.05. Run-to-run noise on one
                      host is 0.0000 (CONTRIBUTING §3), so this is ~5x margin
                      over the measured floor and far below anything visible.
  --pose <id>         Restrict to a pose; repeatable. Default: all five.
  --size <name>       Restrict to a size; repeatable. Default: desktop, mobile.
  --single-pass       One pass per tree instead of two. FASTER AND WEAKER: the
                      one-in-fifty wrong-chapter shutter flake then cannot be
                      distinguished from a real change, so every row loses its
                      self-agreement column. Not for an acceptance run.
  --out <file>        Write the markdown table here (default: stdout only).
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE_REF="$2"; shift 2 ;;
    --tip) TIP_REF="$2"; shift 2 ;;
    --base-port) BASE_PORT="$2"; shift 2 ;;
    --tip-port) TIP_PORT="$2"; shift 2 ;;
    --band) BAND="$2"; shift 2 ;;
    --pose) POSE_ARGS+=(--pose "$2"); shift 2 ;;
    --size) SIZE_ARGS+=(--size "$2"); shift 2 ;;
    --single-pass) PASSES=1; shift ;;
    --out) OUT_FILE="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "capture-diff: unknown flag $1" >&2; usage >&2; exit 2 ;;
  esac
done

[ -n "$BASE_REF" ] || { echo "capture-diff: --base is required" >&2; usage >&2; exit 2; }
BASE_PORT="${BASE_PORT:-8621}"
TIP_PORT="${TIP_PORT:-8597}"

cd "$REPO"
BASE_SHA=$(git rev-parse --short "$BASE_REF") || { echo "capture-diff: cannot resolve --base $BASE_REF" >&2; exit 2; }
TIP_SHA=$(git rev-parse --short "$TIP_REF") || { echo "capture-diff: cannot resolve --tip $TIP_REF" >&2; exit 2; }
[ "$BASE_SHA" != "$TIP_SHA" ] || { echo "capture-diff: base and tip are the same commit ($BASE_SHA) — nothing to compare" >&2; exit 2; }

umask 077
WORK=$(mktemp -d /tmp/capture-diff.XXXXXX)
BASE_TREE="$WORK/base-tree"
BASE_PID=""; TIP_PID=""

cleanup() {
  [ -n "$BASE_PID" ] && kill "$BASE_PID" 2>/dev/null || true
  [ -n "$TIP_PID" ] && kill "$TIP_PID" 2>/dev/null || true
  wait 2>/dev/null || true
  # The base worktree is this script's own scratch, never a lane's checkout.
  [ -d "$BASE_TREE" ] && git -C "$REPO" worktree remove --force "$BASE_TREE" 2>/dev/null || true
  git -C "$REPO" worktree prune 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT INT TERM

step() { printf '\n\033[1;36m== %s\033[0m\n' "$1"; }

step "BASE TREE  $BASE_SHA  ($BASE_REF)"
git -C "$REPO" worktree add --detach "$BASE_TREE" "$BASE_SHA" >/dev/null
# serve.py is stdlib-only, so the base worktree needs no node_modules.
echo "   checked out at $BASE_TREE"

step "SERVERS"
( cd "$BASE_TREE" && PORT="$BASE_PORT" python3 serve.py >"$WORK/serve-base.log" 2>&1 ) &
BASE_PID=$!
( cd "$REPO" && PORT="$TIP_PORT" python3 serve.py >"$WORK/serve-tip.log" 2>&1 ) &
TIP_PID=$!

for attempt in $(seq 1 40); do
  if curl -fsS "http://localhost:$BASE_PORT/index.html" -o /dev/null 2>/dev/null \
     && curl -fsS "http://localhost:$TIP_PORT/index.html" -o /dev/null 2>/dev/null; then
    break
  fi
  [ "$attempt" -eq 40 ] && { echo "capture-diff: servers did not come up" >&2; tail -5 "$WORK"/serve-*.log >&2; exit 2; }
  sleep 0.5
done
# PROVE each server is serving the tree it is supposed to, the way check.sh's
# preflight does. A differential between two ports that turn out to hold the
# same bytes is the most expensive way to measure zero.
for runtime_path in index.html main.js journey/journey.js; do
  curl -fsS "http://localhost:$BASE_PORT/$runtime_path" -o "$WORK/b.chk"
  curl -fsS "http://localhost:$TIP_PORT/$runtime_path" -o "$WORK/t.chk"
  cmp -s "$BASE_TREE/$runtime_path" "$WORK/b.chk" || { echo "capture-diff: :$BASE_PORT is not serving the base tree ($runtime_path)" >&2; exit 2; }
  cmp -s "$REPO/$runtime_path" "$WORK/t.chk" || { echo "capture-diff: :$TIP_PORT is not serving this checkout ($runtime_path)" >&2; exit 2; }
done
echo "   base :$BASE_PORT -> $BASE_SHA    tip :$TIP_PORT -> $TIP_SHA (verified)"

shoot() {  # shoot <origin> <outdir> <label>
  mkdir -p "$2"
  echo ""
  echo "   shooting $3 ..."
  python3 "$REPO/tools/capture.py" --origin "http://localhost:$1" --out "$2" \
    ${POSE_ARGS[@]+"${POSE_ARGS[@]}"} ${SIZE_ARGS[@]+"${SIZE_ARGS[@]}"} >"$WORK/shoot-$3.log" 2>&1 || {
      echo "capture-diff: the $3 pass failed — see below" >&2
      tail -25 "$WORK/shoot-$3.log" >&2
      exit 1
    }
  grep -E '^  · ' "$WORK/shoot-$3.log" || true
}

step "SHOOTING  ($PASSES pass(es) per tree, one Chrome at a time)"
shoot "$BASE_PORT" "$WORK/base-1" "base-1"
shoot "$TIP_PORT"  "$WORK/tip-1"  "tip-1"
if [ "$PASSES" -eq 2 ]; then
  shoot "$BASE_PORT" "$WORK/base-2" "base-2"
  shoot "$TIP_PORT"  "$WORK/tip-2"  "tip-2"
fi

step "DIFFERENTIAL"
REPORT="$WORK/report.md"
set +e
python3 - "$WORK" "$PASSES" "$BAND" "$BASE_SHA" "$TIP_SHA" "$REPORT" <<'PYEOF'
import os
import sys

from PIL import Image, ImageChops, ImageStat

work, passes, band, base_sha, tip_sha, report_path = sys.argv[1:7]
passes = int(passes)
band = float(band)


def mae(a, b):
    """Mean absolute error per channel-pixel, 0-255. Same measure capture.py
    uses, reimplemented here rather than imported so this report does not
    depend on the shooter's module-level state."""
    ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    if ia.size != ib.size:
        return None
    return ImageStat.Stat(ImageChops.difference(ia, ib)).mean


def mae1(a, b):
    m = mae(a, b)
    return None if m is None else sum(m) / len(m)


files = sorted(f for f in os.listdir(os.path.join(work, "base-1")) if f.endswith(".png"))
rows = []
worst = 0.0
failed = 0
inconclusive = 0

for f in files:
    b1 = os.path.join(work, "base-1", f)
    t1 = os.path.join(work, "tip-1", f)
    if not os.path.exists(t1):
        rows.append((f, None, None, None, "MISSING at tip"))
        failed += 1
        continue
    agree_b = agree_t = None
    if passes == 2:
        b2, t2 = os.path.join(work, "base-2", f), os.path.join(work, "tip-2", f)
        agree_b = mae1(b1, b2) if os.path.exists(b2) else None
        agree_t = mae1(t1, t2) if os.path.exists(t2) else None

    drift = mae1(b1, t1)
    if drift is None:
        rows.append((f, None, agree_b, agree_t, "SIZE MISMATCH"))
        failed += 1
        continue

    worse_agree = max(x for x in (agree_b, agree_t, 0.0) if x is not None)
    if passes == 2 and worse_agree > band:
        # The tree disagreed with ITSELF by more than the band, so the
        # tip-vs-base number cannot be attributed to the change. Refuse.
        rows.append((f, drift, agree_b, agree_t, "INCONCLUSIVE (self-disagreement)"))
        inconclusive += 1
        continue

    verdict = "MOVED" if drift > band else "flat"
    if drift > band:
        failed += 1
    worst = max(worst, drift)
    rows.append((f, drift, agree_b, agree_t, verdict))

n = lambda v: "—" if v is None else ("%.4f" % v)
lines = []
lines.append("| pose@size | tip vs base (MAE/255) | base self | tip self | verdict |")
lines.append("|---|---:|---:|---:|---|")
for f, drift, ab, at, verdict in rows:
    lines.append("| `%s` | %s | %s | %s | %s |"
                 % (f.replace(".png", ""), n(drift), n(ab), n(at), verdict))
table = "\n".join(lines)

head = ("Differential capture: **%s** (base) vs **%s** (tip)\n\n"
        "%d pass(es) per tree, one host, one session, one Chrome. Fail band "
        "**%.4f MAE/255**.\nThe host renderer floor cancels in the subtraction, "
        "so every number below is the change.\n" % (base_sha, tip_sha, passes, band))
summary = ("\nworst drift %.4f/255 · %d row(s) over band · %d inconclusive · %d row(s) compared\n"
           % (worst, sum(1 for r in rows if r[1] is not None and r[1] > band),
              inconclusive, len(rows)))

print(head)
print(table)
print(summary)
with open(report_path, "w") as fh:
    fh.write(head + "\n" + table + "\n" + summary)

sys.exit(1 if (failed or inconclusive) else 0)
PYEOF
RC=$?
set -e

if [ -n "$OUT_FILE" ]; then
  mkdir -p "$(dirname "$OUT_FILE")"
  cp "$REPORT" "$OUT_FILE"
  echo "   table written to $OUT_FILE"
fi
exit $RC
