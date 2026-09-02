#!/usr/bin/env bash
# Read-only release gates. This script never builds, stages, commits, merges,
# pushes, deploys, or rewrites committed artifacts.

set -euo pipefail

step() { printf '\n\033[1;36m== %s\033[0m\n' "$1"; }
pass() { printf '\033[32m   ✓ %s\033[0m\n' "$1"; }
fail() { printf '\033[31m   ✗ %s\033[0m\n' "$1" >&2; }
die() { fail "$1"; exit "${2:-1}"; }

# Decision logic for the capture-check gate, factored out so it can be
# exercised directly against a fixture log — no Chrome, no dev server, no
# capture pipeline — by sourcing this file (the sourced-vs-executed guard at
# the bottom skips `main` when this file is sourced rather than run).
#
#   $1 = path to the capture.py --check log
#   $2 = capture.py's exit code (GATE_RC)
#
# Every `[FAIL-band]` row is a non-pass — there is no longer a named-pose
# exemption (the old `final@430x932` "known flake" special case auto-greened
# exactly the failure it named, which is not permitted). The fail-band scan
# runs UNCONDITIONALLY, before GATE_RC is even consulted: "every fail-band
# exits nonzero" has to hold regardless of what the caller passed as an exit
# code, not just for the one real call site that happens to keep the two
# signals in sync (D13 — a log with a FAIL-band row and GATE_RC=0 disagree
# with each other, and that disagreement is itself surfaced, not quietly
# treated as a normal pass or a normal fail). The one adjudication path is
# explicit and still returns non-zero: setting CAPTURE_CHECK_ADJUDICATION to
# a non-blank (after stripping whitespace) recorded reason turns a fail-band
# result from `fail` into `blocked` — a distinct, still-failing status —
# never into `pass`. A whitespace-only value is treated as unset: an
# adjudication with no recorded reason defeats the point of recording one.
#
# D15: evidence must be readable before it can be trusted. If `$log_file`
# does not exist, is not readable, or (defense in depth, in case it vanishes
# between the readability check and the scan) yields something that is not a
# plain non-negative integer fail-band count, that is its OWN outcome — a
# hard non-pass, distinct from both "drift" and "signal mismatch" — decided
# BEFORE gate_rc is consulted. A verification function that cannot read its
# own evidence must never return "pass": the old code let `grep -c` on a
# missing file print nothing to stdout, which made `fail_rows` an empty
# string; `[ "$fail_rows" -gt 0 ]` then errored ("integer expression
# expected") on stderr, control fell through the (now-skipped) if-block, and
# a missing log paired with GATE_RC=0 read as a silent pass. Fixed by
# validating existence/readability up front and by never letting `fail_rows`
# be anything but digits before it reaches an arithmetic test.
#
# Returns (via `return`, not `exit`, so callers/tests control the process):
#   0 = pass       — evidence present and readable, no fail-band row,
#                    GATE_RC was 0
#   1 = fail       — evidence missing/unreadable/unscannable (checked
#                    first, regardless of GATE_RC); or a fail-band row
#                    (regardless of GATE_RC); or GATE_RC non-zero with no
#                    fail-band row (e.g. a capture.py crash) — non-pass
#   3 = blocked    — fail-band drift, explicitly (non-blank) adjudicated,
#                    still non-pass
decide_captures() {
  local log_file="$1" gate_rc="$2"

  if [ ! -e "$log_file" ]; then
    fail "capture check CANNOT READ LOG: $log_file does not exist — absent evidence is never a pass"
    return 1
  fi
  if [ ! -r "$log_file" ]; then
    fail "capture check CANNOT READ LOG: $log_file exists but is not readable — absent evidence is never a pass"
    return 1
  fi

  local fail_rows
  fail_rows=$(grep -c '\[FAIL-band\]' "$log_file" 2>/dev/null || true)
  fail_rows="${fail_rows:-}"
  case "$fail_rows" in
    ''|*[!0-9]*)
      fail "capture check CANNOT READ LOG: fail-band count from $log_file was not a plain integer (got '${fail_rows}') — absent/unscannable evidence is never a pass"
      return 1
      ;;
  esac

  if [ "$fail_rows" -gt 0 ]; then
    local reason="${CAPTURE_CHECK_ADJUDICATION:-}"
    local reason_stripped
    reason_stripped=$(printf '%s' "$reason" | tr -d '[:space:]')
    if [ -n "$reason_stripped" ]; then
      tail -20 "$log_file" >&2
      echo "   adjudication on record: $reason" >&2
      fail "capture check BLOCKED (adjudicated, not passing): $fail_rows fail-band row(s) — every fail-band is a non-pass"
      return 3
    fi
    tail -20 "$log_file" >&2
    if [ "$gate_rc" -eq 0 ]; then
      fail "capture check SIGNAL MISMATCH: $fail_rows fail-band row(s) found in the log but capture.py reported exit 0 — every fail-band is a non-pass regardless of the reported exit code"
    else
      fail "capture check failed with real drift ($fail_rows fail-band row(s))"
    fi
    return 1
  fi

  if [ "$gate_rc" -eq 0 ]; then
    pass "all gates green"
    return 0
  fi

  tail -20 "$log_file" >&2
  fail "capture check failed (exit $gate_rc) — see $log_file"
  return 1
}

main() {
  SKIP_CAPTURES=0
  CHECK_ORIGIN="${CHECK_ORIGIN:-http://localhost:8137}"
  for arg in "$@"; do
    case "$arg" in
      --skip-captures) SKIP_CAPTURES=1 ;;
      -h|--help)
        echo "Usage: tools/check.sh [--skip-captures]"
        echo "Runs read-only rebuild drift checks; requires the site on :8137."
        exit 0
        ;;
      *) echo "check: unknown flag $arg" >&2; exit 2 ;;
    esac
  done

  cd "$(dirname "$0")/.." || exit 2

  umask 077
  CHECK_TMP=$(mktemp -d /tmp/glowshroom-check.XXXXXX) \
    || { echo "check: could not create temporary directory" >&2; exit 2; }
  trap 'rm -rf "$CHECK_TMP"' EXIT

  step "PUBLIC ARTIFACT"
  CHECK_REVISION=$(git rev-parse HEAD) || die "could not resolve checkout revision" 2
  python3 tools/package-public.py "$CHECK_TMP/public" \
    --origin https://www.banodoco.ai --revision "$CHECK_REVISION" \
    || die "public artifact allowlist/roundtrip verification failed"
  pass "public artifact matches its allowlist, declared-placeholder ORIGIN substitution, and byte-identical source elsewhere"

  step "CHECK PRECONDITIONS"
  if ! curl -fsS "$CHECK_ORIGIN/index.html" -o "$CHECK_TMP/index.html" 2>/dev/null; then
    die "static server not on :8137 — run 'python3 serve.py' first" 2
  fi
  for runtime_path in index.html main.js journey/journey.js organism/organism.js; do
    served="$CHECK_TMP/$(printf '%s' "$runtime_path" | tr '/' '_')"
    if ! curl -fsS "$CHECK_ORIGIN/$runtime_path" -o "$served" 2>/dev/null \
        || ! cmp -s "$runtime_path" "$served"; then
      die "server on :8137 is not serving this checkout ($runtime_path differs) — restart it from $PWD" 2
    fi
  done
  pass "this checkout is served on :8137"

  if [ "$SKIP_CAPTURES" = "0" ]; then
    LOAD_NOW=$(sysctl -n vm.loadavg 2>/dev/null | awk -F'[ {,}]+' '{print $2}' || echo 0)
    LOAD_LIMIT="${PREFLIGHT_LOAD_LIMIT:-8}"
    if [ "$(printf '%.0f' "$LOAD_NOW")" -gt "$LOAD_LIMIT" ] 2>/dev/null; then
      echo "   ⚠ load average $(printf '%.1f' "$LOAD_NOW") > $LOAD_LIMIT — waiting up to 10 min"
      DEADLINE=$(( $(date +%s) + 600 ))
      while [ "$(date +%s)" -lt "$DEADLINE" ]; do
        LOAD_NOW=$(sysctl -n vm.loadavg 2>/dev/null | awk -F'[ {,}]+' '{print $2}' || echo 0)
        [ "$(printf '%.0f' "$LOAD_NOW")" -le "$LOAD_LIMIT" ] 2>/dev/null && break
        sleep 20
      done
    fi
  fi

  LOG_FILE="$CHECK_TMP/gates.log"
  if [ "$SKIP_CAPTURES" = "1" ]; then
    step "CHECK (bake/meta; captures skipped)"
    python3 tools/rebuild.py --check >"$LOG_FILE" 2>&1 || {
      tail -20 "$LOG_FILE" >&2
      die "check failed — see $LOG_FILE"
    }
    pass "bake + meta gates green (capture drift gate skipped)"
    exit 0
  fi

  step "CHECK (bake/meta)"
  if ! python3 tools/rebuild.py --check >"$LOG_FILE" 2>&1; then
    tail -20 "$LOG_FILE" >&2
    die "bake/meta check failed"
  fi
  pass "bake + meta gates green"

  step "CHECK (captures)"
  set +e
  python3 tools/capture.py --check >"$LOG_FILE" 2>&1
  GATE_RC=$?
  set -e
  decide_captures "$LOG_FILE" "$GATE_RC" || exit $?
}

# Run `main` only when this file is executed directly — sourcing it (as the
# capture-check test harness does) defines `decide_captures` and friends
# without touching the network, Chrome, or any file outside /tmp.
if [[ "${BASH_SOURCE[0]:-$0}" == "${0}" ]]; then
  main "$@"
fi
