#!/usr/bin/env python3
# ==============================================================================
# test_capture_check.py — focused harness for the Q05 fixes to
# tools/capture.py's `--check` output location and tools/check.sh's
# fail-band decision logic.
#
# Runs WITHOUT launching Chrome and WITHOUT the dev server on :8137: it
# exercises `capture.py`'s argument-resolution helper directly (imported as
# a module — `if __name__ == "__main__":` guards the Chrome-driving `main()`,
# so import alone never touches the network or a browser) and drives
# `capture.py --check --check-out <bad path>` as a subprocess only far enough
# to hit the refusal, which happens before the server-reachability check.
# tools/check.sh's fail-band decision logic is exercised by sourcing the
# script (the `BASH_SOURCE[0] == $0` guard at the bottom of check.sh skips
# `main` — and therefore the whole capture/curl/rebuild pipeline — when the
# file is sourced rather than executed) and calling `decide_captures`
# directly against prepared fixture logs.
#
# Nothing this file touches lands under static/captures/ or anywhere else in
# the repo — every check_dir it creates is a mkdtemp() under the system temp
# dir, removed again before exit.
#
# D13 (R1 repair): decide_captures() used to check `gate_rc == 0` FIRST and
# return a bare pass without ever looking at the log, so a log carrying a
# [FAIL-band] row paired with gate_rc == 0 produced a green result — the
# runbook's "every fail-band exits nonzero" was only true because check.sh's
# one real call site happens to keep the two signals in sync, not because
# the function enforced it. Fixed: the fail-band scan now runs
# unconditionally, before gate_rc is consulted at all. Cases below prove the
# full decision table (fail-band present? x gate_rc x adjudication) rather
# than just the two combinations the old code was reachable through.
#
# D15 (further R1/closure repair): decide_captures() computed fail_rows
# via `grep -c ... "$log_file" || true`. When $log_file was missing or
# unreadable, grep wrote nothing to stdout, so fail_rows became an empty
# string; `[ "$fail_rows" -gt 0 ]` then errored ("integer expression
# expected") on stderr and control fell through to the gate_rc==0 pass
# branch — a missing/unreadable log paired with gate_rc==0 read as a silent
# pass. Fixed: existence/readability are checked before anything else, and
# fail_rows is validated as a plain integer (case pattern) before any
# arithmetic test ever touches it. See test_evidence_validity() below.
#
# F08 addendum: tools/pre-commit carried its own, older capture-gate policy
# (a `final@430x932`-only "known flake" auto-green, string-compared against
# `FAIL_ROWS = "1"`) left over from before Q05/D13/D15 replaced check.sh's
# equivalent logic. That made the commit-time gate MORE permissive than the
# release gate on exactly the ad-hoc/emergency commit path where drift is
# most likely to slip through. Fixed: tools/pre-commit's capture-gate block
# now sources check.sh's decide_captures() itself (via `bash -c 'source
# ...; decide_captures ...'`, the same pattern this file already uses) rather
# than reimplementing a second copy of the decision table, so the two gates
# cannot re-diverge. test_precommit_capture_gate() below proves this by
# extracting the actual fragment from tools/pre-commit (between its BEGIN/END
# CAPTURE GATE markers — never a hand-retyped copy) and driving it end to end
# with a fake `capture.py --check` stub, covering the same decision table as
# test_decide_captures() above plus the wiring around it (mktemp, the python3
# invocation, exit-code propagation, cleanup).
#
# Usage: python3 tools/test_capture_check.py
# Exit 0 = every case passed; exit 1 = at least one case failed (printed).
# ==============================================================================

import importlib.util
import os
import shlex
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(HERE)
CAPTURE_PY = os.path.join(HERE, "capture.py")
CHECK_SH = os.path.join(HERE, "check.sh")
PRE_COMMIT = os.path.join(HERE, "pre-commit")

failures = []


def check(label, condition, detail=""):
    if condition:
        print("  PASS  %s" % label)
    else:
        print("  FAIL  %s  %s" % (label, detail))
        failures.append(label)


def load_capture_module():
    spec = importlib.util.spec_from_file_location("capture_under_test", CAPTURE_PY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # safe: main() is import-guarded, no Chrome/network here
    return mod


# ------------------------------------------------------------------------------
# Part 1 — capture.py: resolve_check_out()
# ------------------------------------------------------------------------------

def test_resolve_check_out():
    print("\n== capture.py: resolve_check_out() ==")
    capture = load_capture_module()

    # Default (no --check-out): must land outside the repo, must exist.
    d = capture.resolve_check_out(None)
    try:
        repo_real = os.path.realpath(REPO_ROOT)
        inside = d == repo_real or d.startswith(repo_real + os.sep)
        check("default check-out resolves outside the repo", not inside, "got %s" % d)
        check("default check-out directory was created", os.path.isdir(d), d)
        sys_tmp = os.path.realpath(tempfile.gettempdir())
        d_real = os.path.realpath(d)
        check("default check-out lands under the system temp dir",
              d_real == sys_tmp or d_real.startswith(sys_tmp + os.sep), d)
    finally:
        if os.path.isdir(d):
            os.rmdir(d)

    # Explicit override outside the repo: accepted, created.
    override = tempfile.mkdtemp(prefix="capture-check-override-test-")
    os.rmdir(override)  # resolve_check_out must (re)create it
    try:
        d2 = capture.resolve_check_out(override)
        check("explicit outside-repo --check-out is accepted", d2 == os.path.realpath(override))
        check("explicit outside-repo --check-out directory exists", os.path.isdir(d2))
    finally:
        if os.path.isdir(override):
            os.rmdir(override)

    # Explicit override INSIDE the repo (relative): refused.
    try:
        capture.resolve_check_out("static/captures/_check")
        check("relative in-repo --check-out is refused", False, "did not raise")
    except SystemExit as e:
        check("relative in-repo --check-out is refused", True)
        check("refusal message names the problem", "must not resolve inside the repository" in str(e))

    # Explicit override INSIDE the repo (absolute): refused.
    try:
        capture.resolve_check_out(os.path.join(REPO_ROOT, "static", "captures"))
        check("absolute in-repo --check-out is refused", False, "did not raise")
    except SystemExit:
        check("absolute in-repo --check-out is refused", True)

    # The repo root itself: refused.
    try:
        capture.resolve_check_out(REPO_ROOT)
        check("repo root itself as --check-out is refused", False, "did not raise")
    except SystemExit:
        check("repo root itself as --check-out is refused", True)


def test_check_out_cli_refusal():
    print("\n== capture.py CLI: --check --check-out <in-repo> refuses before touching Chrome ==")
    # This subprocess call hits sys.exit() during argument resolution, which
    # happens before the BASE_URL reachability probe — so it needs neither
    # Chrome nor the dev server on :8137.
    proc = subprocess.run(
        [sys.executable, CAPTURE_PY, "--check", "--check-out", "static/captures",
         "--pose", "owned", "--size", "mobile"],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=15,
    )
    check("CLI refusal exits non-zero", proc.returncode != 0, "rc=%s" % proc.returncode)
    combined = proc.stdout + proc.stderr
    check("CLI refusal names the repo-root constraint",
          "must not resolve inside the repository" in combined, combined[:300])

    # And --check-out without --check is also refused, same reasoning.
    proc2 = subprocess.run(
        [sys.executable, CAPTURE_PY, "--check-out", "/tmp/whatever-q05-test"],
        cwd=REPO_ROOT, capture_output=True, text=True, timeout=15,
    )
    check("--check-out without --check is refused", proc2.returncode != 0, "rc=%s" % proc2.returncode)


# ------------------------------------------------------------------------------
# Part 2 — check.sh: decide_captures()
# ------------------------------------------------------------------------------

FIXTURES = {
    "case_a_single_final_430": (
        "  · final@430x932.png     MAE 12.34/255   3.2% px >8   [FAIL-band]\n"
        "  · mission@1440x900.png  MAE  0.50/255   0.0% px >8   [within]\n",
        1,  # GATE_RC from capture.py
        1,  # expected decide_captures exit code (must NOT be the old silent pass)
    ),
    "case_b_single_other": (
        "  · owned@1440x900.png    MAE 15.00/255   4.0% px >8   [FAIL-band]\n"
        "  · mission@1440x900.png  MAE  0.50/255   0.0% px >8   [within]\n",
        1,
        1,
    ),
    "case_c_several": (
        "  · final@430x932.png     MAE 12.34/255   3.2% px >8   [FAIL-band]\n"
        "  · owned@1440x900.png    MAE 15.00/255   4.0% px >8   [FAIL-band]\n"
        "  · inspire@430x932.png   MAE 20.00/255   5.0% px >8   [FAIL-band]\n",
        1,
        1,
    ),
    "case_d_none": (
        "  · mission@1440x900.png  MAE  0.50/255   0.0% px >8   [within]\n"
        "  · owned@1440x900.png    MAE  0.60/255   0.0% px >8   [within]\n",
        0,
        0,
    ),
    # D13 — the acceptance case: a FAIL-band row is present but the caller's
    # reported exit code is 0. This combination is not reachable through
    # check.sh's real (non --live) invocation of capture.py — a printed
    # FAIL-band always sets `failed=True` there, forcing a non-zero exit —
    # but decide_captures() must not rely on the caller getting that right.
    # Before D13 this returned 0 ("all gates green"); it must now be a
    # non-pass with a message that names the disagreement.
    "d13_failband_gate_rc_zero": (
        "  · final@430x932.png     MAE 12.34/255   3.2% px >8   [FAIL-band]\n"
        "  · mission@1440x900.png  MAE  0.50/255   0.0% px >8   [within]\n",
        0,
        1,
    ),
    # No FAIL-band row, but gate_rc is non-zero anyway — e.g. capture.py
    # crashed or raised before printing any per-pose row. Must still be a
    # loud non-pass (unchanged by D13, listed here to keep the table complete).
    "d13_nofailband_gate_rc_nonzero_crash": (
        "Traceback (most recent call last):\n"
        "  ...\n"
        "RuntimeError: capture.py blew up before writing any pose rows\n",
        1,
        1,
    ),
}


def run_decide_captures(log_text, gate_rc, env_extra=None):
    with tempfile.NamedTemporaryFile("w", suffix=".log", delete=False) as f:
        f.write(log_text)
        log_path = f.name
    try:
        env = dict(os.environ)
        env.pop("CAPTURE_CHECK_ADJUDICATION", None)
        if env_extra:
            env.update(env_extra)
        proc = subprocess.run(
            ["bash", "-c", 'source "$1"; decide_captures "$2" "$3"',
             "_", CHECK_SH, log_path, str(gate_rc)],
            cwd=REPO_ROOT, capture_output=True, text=True, env=env, timeout=15,
        )
        return proc.returncode, proc.stdout + proc.stderr
    finally:
        os.unlink(log_path)


def run_decide_captures_at_path(log_path, gate_rc, env_extra=None):
    """Like run_decide_captures, but against a caller-supplied path — used
    for the D15 evidence-validity cases (missing / unreadable log files),
    where there is no content to write because the point is the path itself
    is bad."""
    env = dict(os.environ)
    env.pop("CAPTURE_CHECK_ADJUDICATION", None)
    if env_extra:
        env.update(env_extra)
    proc = subprocess.run(
        ["bash", "-c", 'source "$1"; decide_captures "$2" "$3"',
         "_", CHECK_SH, log_path, str(gate_rc)],
        cwd=REPO_ROOT, capture_output=True, text=True, env=env, timeout=15,
    )
    return proc.returncode, proc.stdout + proc.stderr


def test_decide_captures():
    print("\n== check.sh: decide_captures() fail-band decision ==")
    for name, (log_text, gate_rc, expected_rc) in FIXTURES.items():
        rc, out = run_decide_captures(log_text, gate_rc)
        check("%s -> exit %d" % (name, expected_rc), rc == expected_rc,
              "got rc=%s\n%s" % (rc, out))

    # THE regression case, called out explicitly: a lone final@430x932
    # FAIL-band used to print "known flake only" and let check.sh continue
    # to a green "all gates green". It must now be a hard non-pass.
    log_text, gate_rc, _ = FIXTURES["case_a_single_final_430"]
    rc, out = run_decide_captures(log_text, gate_rc)
    check("regression case: lone final@430x932 FAIL-band is a non-pass",
          rc != 0, "got rc=%s\n%s" % (rc, out))
    check("regression case: no silent-pass wording ('known flake only') on this path",
          "known flake only" not in out, out)

    # Adjudication path: still a non-pass (distinct exit code 3), never green.
    rc, out = run_decide_captures(log_text, gate_rc,
                                   env_extra={"CAPTURE_CHECK_ADJUDICATION": "test: recorded reason"})
    check("adjudicated fail-band exits non-zero (blocked, not passing)", rc != 0, "got rc=%s" % rc)
    check("adjudicated fail-band uses the distinct 'blocked' exit code (3)", rc == 3, "got rc=%s" % rc)
    check("adjudicated fail-band never prints a pass", "all gates green" not in out, out)
    check("adjudication reason is recorded in the output", "recorded reason" in out, out)

    # ---- D13: the acceptance case -----------------------------------------
    # fail-band present + gate_rc == 0 must be a non-pass, and the message
    # must call out the disagreement rather than reading like either a plain
    # pass or an ordinary drift failure.
    mismatch_log, mismatch_gate_rc, mismatch_expected = FIXTURES["d13_failband_gate_rc_zero"]
    rc, out = run_decide_captures(mismatch_log, mismatch_gate_rc)
    check("D13: fail-band + gate_rc=0 is non-zero (was the bug: used to return 0)",
          rc == mismatch_expected, "got rc=%s\n%s" % (rc, out))
    check("D13: fail-band + gate_rc=0 never prints a pass", "all gates green" not in out, out)
    check("D13: fail-band + gate_rc=0 message names the signal disagreement",
          "SIGNAL MISMATCH" in out, out)

    # fail-band + gate_rc=0 must still honour adjudication (still non-zero,
    # still 'blocked', never green) — adjudication is keyed on the fail-band
    # scan, not on gate_rc, so this must behave the same as the gate_rc != 0
    # adjudicated case above.
    rc, out = run_decide_captures(mismatch_log, mismatch_gate_rc,
                                   env_extra={"CAPTURE_CHECK_ADJUDICATION": "test: mismatch reason"})
    check("D13: adjudicated fail-band + gate_rc=0 exits 3 (blocked)", rc == 3, "got rc=%s" % rc)
    check("D13: adjudicated fail-band + gate_rc=0 never prints a pass",
          "all gates green" not in out, out)

    # no fail-band + gate_rc != 0 (e.g. a capture.py crash/traceback): must
    # still be a loud non-pass, unchanged by D13.
    crash_log, crash_gate_rc, crash_expected = FIXTURES["d13_nofailband_gate_rc_nonzero_crash"]
    rc, out = run_decide_captures(crash_log, crash_gate_rc)
    check("no fail-band + gate_rc!=0 (crash) is non-zero", rc == crash_expected,
          "got rc=%s\n%s" % (rc, out))
    check("no fail-band + gate_rc!=0 (crash) tails the log (loud)",
          "RuntimeError" in out, out)

    # ---- adjudication blank-value handling ---------------------------------
    # unset / empty-string / whitespace-only must all behave exactly like
    # "no adjudication" — only a non-blank (post-strip) reason may adjudicate.
    for label, env_extra in [
        ("unset", None),
        ("empty string", {"CAPTURE_CHECK_ADJUDICATION": ""}),
        ("whitespace-only", {"CAPTURE_CHECK_ADJUDICATION": "   \t  "}),
    ]:
        rc, out = run_decide_captures(log_text, gate_rc, env_extra=env_extra)
        check("adjudication %s -> treated as unset (plain fail, not blocked)" % label,
              rc == 1, "got rc=%s\n%s" % (rc, out))
        check("adjudication %s -> no 'BLOCKED' wording" % label,
              "BLOCKED" not in out, out)
        check("adjudication %s -> no 'adjudication on record' line" % label,
              "adjudication on record" not in out, out)

    # A reason that is non-blank once its surrounding whitespace is stripped
    # must still adjudicate (only fully-blank values are rejected).
    rc, out = run_decide_captures(log_text, gate_rc,
                                   env_extra={"CAPTURE_CHECK_ADJUDICATION": "  real reason  "})
    check("adjudication with surrounding whitespace around real content still adjudicates",
          rc == 3, "got rc=%s\n%s" % (rc, out))

    # ---- D15: the six previously-verified rows, pinned as their own perma-
    # nent regression assertions (not just re-derived from the loop above) --
    row_cases = [
        ("row1 fail-band=0, gate_rc=0", FIXTURES["case_d_none"][0], 0, None, 0),
        ("row2 fail-band=0, gate_rc!=0", FIXTURES["case_d_none"][0], 1, None, 1),
        ("row3 fail-band>0, gate_rc=0, no adjudication (D13 SIGNAL MISMATCH)",
         FIXTURES["d13_failband_gate_rc_zero"][0], 0, None, 1),
        ("row4 fail-band>0, gate_rc!=0, no adjudication",
         FIXTURES["case_a_single_final_430"][0], 1, None, 1),
        ("row5 fail-band>0, gate_rc=0, adjudicated",
         FIXTURES["d13_failband_gate_rc_zero"][0], 0, {"CAPTURE_CHECK_ADJUDICATION": "pinned reason"}, 3),
        ("row6 fail-band>0, gate_rc!=0, adjudicated",
         FIXTURES["case_a_single_final_430"][0], 1, {"CAPTURE_CHECK_ADJUDICATION": "pinned reason"}, 3),
    ]
    for label, log_text_r, gate_rc_r, env_extra_r, expected_r in row_cases:
        rc, out = run_decide_captures(log_text_r, gate_rc_r, env_extra=env_extra_r)
        check("D15 regression pin: %s -> exit %d" % (label, expected_r),
              rc == expected_r, "got rc=%s\n%s" % (rc, out))


def test_evidence_validity():
    """D15 — decide_captures must never return pass (or crash open) when it
    cannot read its own evidence log. Covers: missing file, unreadable file,
    and the legitimate empty-but-readable-log pass that must NOT regress.
    Exercises the real bash function against real paths/permissions — no
    Chrome, no dev server."""
    print("\n== check.sh: decide_captures() evidence validity (D15) ==")
    tmpdir = tempfile.mkdtemp(prefix="d15-evidence-")
    try:
        missing_path = os.path.join(tmpdir, "does-not-exist.log")

        # 1. Missing log + gate_rc == 0 — THE D15 acceptance criterion.
        # Before the fix this returned 0 (silent pass).
        rc, out = run_decide_captures_at_path(missing_path, 0)
        check("D15 case 1: missing log + gate_rc=0 is non-zero (was the blocker: used to return 0)",
              rc != 0, "got rc=%s\n%s" % (rc, out))
        check("D15 case 1: message names 'CANNOT READ LOG'", "CANNOT READ LOG" in out, out)
        check("D15 case 1: message names 'does not exist'", "does not exist" in out, out)
        check("D15 case 1: never prints a pass", "all gates green" not in out, out)
        check("D15 case 1: no leaked bash arithmetic error",
              "integer expression expected" not in out, out)

        # 2. Missing log + gate_rc != 0 — already correct; must stay non-zero.
        rc, out = run_decide_captures_at_path(missing_path, 1)
        check("D15 case 2: missing log + gate_rc!=0 stays non-zero", rc != 0,
              "got rc=%s\n%s" % (rc, out))
        check("D15 case 2: no leaked bash arithmetic error",
              "integer expression expected" not in out, out)

        # 3/3b. Unreadable log (exists, permission denied) + gate_rc == 0
        # and gate_rc != 0 — tested distinctly from "missing", since the
        # code path (the `-r` check, not the `-e` check) differs. Skipped
        # gracefully if running as root, where chmod 000 doesn't block reads.
        unreadable_path = os.path.join(tmpdir, "unreadable.log")
        with open(unreadable_path, "w") as f:
            f.write("  · owned@1440x900.png    MAE  0.10/255   0.0% px >8   [within]\n")
        os.chmod(unreadable_path, 0o000)
        is_root = hasattr(os, "geteuid") and os.geteuid() == 0
        try:
            if is_root:
                print("  SKIP  unreadable-log cases (running as root; chmod 000 doesn't block root reads)")
            else:
                rc, out = run_decide_captures_at_path(unreadable_path, 0)
                check("D15 case 3: unreadable log + gate_rc=0 is non-zero", rc != 0,
                      "got rc=%s\n%s" % (rc, out))
                check("D15 case 3: message names 'CANNOT READ LOG'", "CANNOT READ LOG" in out, out)
                check("D15 case 3: message names 'not readable'", "not readable" in out, out)
                check("D15 case 3: never prints a pass", "all gates green" not in out, out)

                rc, out = run_decide_captures_at_path(unreadable_path, 1)
                check("D15 case 3b: unreadable log + gate_rc!=0 stays non-zero", rc != 0,
                      "got rc=%s\n%s" % (rc, out))
        finally:
            os.chmod(unreadable_path, 0o644)

        # 4. Empty-but-readable log + gate_rc == 0 — legitimate pass. Evidence
        # exists, is readable, contains zero fail-band rows: this must NOT be
        # broken by the "absent evidence" fix.
        empty_path = os.path.join(tmpdir, "empty.log")
        open(empty_path, "w").close()
        rc, out = run_decide_captures_at_path(empty_path, 0)
        check("D15 case 4: empty-but-readable log + gate_rc=0 is a genuine pass (must not over-correct)",
              rc == 0, "got rc=%s\n%s" % (rc, out))
        check("D15 case 4: prints 'all gates green'", "all gates green" in out, out)

        # 5. Empty-but-readable log + gate_rc != 0 — non-zero and loud.
        rc, out = run_decide_captures_at_path(empty_path, 1)
        check("D15 case 5: empty-but-readable log + gate_rc!=0 is non-zero", rc != 0,
              "got rc=%s\n%s" % (rc, out))

        # 7. fail_rows is always a valid integer: with the log content held
        # fixed and readable, decide_captures never trips a bash arithmetic
        # error regardless of gate_rc — proven across all combinations run
        # above plus this direct sweep over both a fail-band and a clean log.
        for name, (log_text, _gate_rc, _expected) in FIXTURES.items():
            for gate_rc in (0, 1):
                rc, out = run_decide_captures(log_text, gate_rc)
                check("D15 case 7: '%s' gate_rc=%d never leaks a bash arithmetic error"
                      % (name, gate_rc),
                      "integer expression expected" not in out, out)
    finally:
        import shutil as _shutil
        _shutil.rmtree(tmpdir, ignore_errors=True)


# ------------------------------------------------------------------------------
# Part 3 — tools/pre-commit: capture-gate wiring (F08)
# ------------------------------------------------------------------------------

def extract_precommit_capture_gate(precommit_path=PRE_COMMIT):
    """Pull the capture-gate shell fragment out of tools/pre-commit between
    its `# --- BEGIN CAPTURE GATE` / `# --- END CAPTURE GATE ---` markers, so
    this test always exercises whatever is actually in the tracked file —
    never a hand-retyped copy that could silently drift from it. Raises if
    the markers are missing (e.g. a future edit that removes them without
    updating this extractor — fail loud rather than silently testing stale
    text)."""
    with open(precommit_path) as f:
        lines = f.readlines()
    start = end = None
    for i, line in enumerate(lines):
        if "BEGIN CAPTURE GATE" in line:
            start = i
        elif "END CAPTURE GATE" in line:
            end = i
            break
    if start is None or end is None:
        raise RuntimeError(
            "%s: BEGIN/END CAPTURE GATE markers not found — extractor is stale"
            % precommit_path)
    return "".join(lines[start:end + 1])


def run_precommit_capture_gate(log_text, gate_rc, env_extra=None,
                                precommit_path=PRE_COMMIT):
    """Drive the ACTUAL capture-gate fragment extracted from tools/pre-commit
    end to end, unmodified: a fake `capture.py --check` stub prints
    `log_text` and exits `gate_rc` (standing in for the real capture.py, same
    role FIXTURES plays for test_decide_captures above), and the fragment
    runs for real — its own `mktemp`, its own `python3 "$CAPTURE_PY" --check`
    invocation, its own `bash -c 'source ...; decide_captures ...'` call
    against the REAL tools/check.sh, its own exit-code propagation and
    cleanup. `TOOLS` is set to the real tools/ dir so `$TOOLS/check.sh`
    resolves to the real, accepted decide_captures() — this test is proving
    the wiring around that call, not re-deriving the decision table with a
    second implementation.

    Returns (returncode, combined stdout+stderr, reached_end) where
    reached_end is True iff execution fell through the whole fragment
    (the gate passed) rather than hitting one of its internal `exit`s."""
    fragment = extract_precommit_capture_gate(precommit_path)
    tmpdir = tempfile.mkdtemp(prefix="precommit-gate-")
    try:
        fragment_path = os.path.join(tmpdir, "fragment.sh")
        with open(fragment_path, "w") as f:
            f.write(fragment)

        stub_path = os.path.join(tmpdir, "fake_capture.py")
        with open(stub_path, "w") as f:
            f.write("#!/usr/bin/env python3\n")
            f.write("import sys\n")
            f.write("sys.stdout.write(%r)\n" % log_text)
            f.write("sys.exit(%d)\n" % gate_rc)
        os.chmod(stub_path, 0o755)

        env = dict(os.environ)
        env.pop("CAPTURE_CHECK_ADJUDICATION", None)
        if env_extra:
            env.update(env_extra)

        sentinel = "PRECOMMIT_GATE_REACHED_END"
        script = "TOOLS=%s\nCAPTURE_PY=%s\nsource %s\necho %s\n" % (
            shlex.quote(HERE), shlex.quote(stub_path),
            shlex.quote(fragment_path), sentinel)
        proc = subprocess.run(
            ["bash", "-c", script],
            cwd=REPO_ROOT, capture_output=True, text=True, env=env, timeout=15,
        )
        combined = proc.stdout + proc.stderr
        return proc.returncode, combined, sentinel in combined
    finally:
        import shutil as _shutil
        _shutil.rmtree(tmpdir, ignore_errors=True)


def test_precommit_capture_gate():
    """The regression this order (F08) exists to fix, and the rest of the
    decision table, driven against tools/pre-commit's own extracted
    fragment rather than check.sh directly."""
    print("\n== pre-commit: capture-gate decision (mirrors check.sh, F08) ==")

    # THE named regression: a sole final@430x932 FAIL-band used to print
    # "KNOWN FLAKE ONLY ... Committing with the known flake." and let the
    # hook fall through to bake-geom.py with exit 0. It must now be a hard
    # non-pass, and the old wording must be gone.
    log_text, gate_rc, _ = FIXTURES["case_a_single_final_430"]
    rc, out, reached_end = run_precommit_capture_gate(log_text, gate_rc)
    check("regression: sole final@430x932 FAIL-band is now a non-zero exit",
          rc != 0, "got rc=%s\n%s" % (rc, out))
    check("regression: gate does NOT fall through to the rest of the hook",
          not reached_end, out)
    check("regression: no more 'KNOWN FLAKE ONLY' wording", "KNOWN FLAKE ONLY" not in out, out)
    check("regression: no more 'Committing with the known flake' wording",
          "Committing with the known flake" not in out, out)

    # Legitimate pass must still pass — do not over-correct.
    clean_log, clean_gate_rc, _ = FIXTURES["case_d_none"]
    rc, out, reached_end = run_precommit_capture_gate(clean_log, clean_gate_rc)
    check("legitimate pass: clean log + gate_rc=0 exits zero", rc == 0,
          "got rc=%s\n%s" % (rc, out))
    check("legitimate pass: gate falls through to the rest of the hook",
          reached_end, out)

    # Signal mismatch: fail-band rows present but capture.py claimed exit 0.
    mismatch_log, mismatch_gate_rc, _ = FIXTURES["d13_failband_gate_rc_zero"]
    rc, out, reached_end = run_precommit_capture_gate(mismatch_log, mismatch_gate_rc)
    check("signal mismatch (fail-band + gate_rc=0) exits non-zero", rc != 0,
          "got rc=%s\n%s" % (rc, out))
    check("signal mismatch does not fall through", not reached_end, out)
    check("signal mismatch names SIGNAL MISMATCH", "SIGNAL MISMATCH" in out, out)

    # Real drift with no fail-band row (capture.py crash) is still non-zero.
    crash_log, crash_gate_rc, _ = FIXTURES["d13_nofailband_gate_rc_nonzero_crash"]
    rc, out, reached_end = run_precommit_capture_gate(crash_log, crash_gate_rc)
    check("crash (no fail-band, gate_rc!=0) exits non-zero", rc != 0,
          "got rc=%s\n%s" % (rc, out))
    check("crash does not fall through", not reached_end, out)

    # Adjudication: distinct non-zero 'blocked' status (exit 3), reason
    # echoed, never a pass. Whitespace-only behaves as unset.
    rc, out, reached_end = run_precommit_capture_gate(
        log_text, gate_rc, env_extra={"CAPTURE_CHECK_ADJUDICATION": "f08 test: recorded reason"})
    check("adjudicated fail-band exits 3 (blocked)", rc == 3, "got rc=%s\n%s" % (rc, out))
    check("adjudicated fail-band does not fall through", not reached_end, out)
    check("adjudication reason is echoed", "recorded reason" in out, out)

    rc, out, reached_end = run_precommit_capture_gate(
        log_text, gate_rc, env_extra={"CAPTURE_CHECK_ADJUDICATION": "   "})
    check("whitespace-only adjudication behaves as unset (plain fail, not blocked)",
          rc == 1, "got rc=%s\n%s" % (rc, out))
    check("whitespace-only adjudication prints no 'BLOCKED' wording",
          "BLOCKED" not in out, out)

    # Missing/unreadable capture log: covered structurally by the fragment's
    # own defensive `[ ! -f "$CHECK_SH" ]` guard and by decide_captures()
    # itself refusing a missing/unreadable log (test_evidence_validity above
    # already proves decide_captures' half of this end to end; here we prove
    # the fragment's OWN defensive guard when check.sh itself is absent).
    tmpdir = tempfile.mkdtemp(prefix="precommit-gate-no-checksh-")
    try:
        # The happy-path cases above already proved reached_end True with the
        # real $TOOLS; this block instead points TOOLS at an empty dir so
        # $TOOLS/check.sh does not exist, proving the fragment's own guard.
        empty_tools = os.path.join(tmpdir, "tools")
        os.makedirs(empty_tools)
        fragment = extract_precommit_capture_gate()
        fragment_path = os.path.join(tmpdir, "fragment.sh")
        with open(fragment_path, "w") as f:
            f.write(fragment)
        stub_path = os.path.join(tmpdir, "fake_capture.py")
        with open(stub_path, "w") as f:
            f.write("#!/usr/bin/env python3\nimport sys\nsys.exit(0)\n")
        os.chmod(stub_path, 0o755)
        script = "TOOLS=%s\nCAPTURE_PY=%s\nsource %s\necho PRECOMMIT_GATE_REACHED_END\n" % (
            shlex.quote(empty_tools), shlex.quote(stub_path), shlex.quote(fragment_path))
        proc = subprocess.run(["bash", "-c", script], cwd=REPO_ROOT,
                               capture_output=True, text=True, timeout=15)
        out2 = proc.stdout + proc.stderr
        check("missing check.sh under $TOOLS is a non-zero exit", proc.returncode != 0,
              "got rc=%s\n%s" % (proc.returncode, out2))
        check("missing check.sh message names the expected path",
              "expected check.sh at" in out2, out2)
    finally:
        import shutil as _shutil
        _shutil.rmtree(tmpdir, ignore_errors=True)


def test_precommit_static():
    print("\n== pre-commit: static checks ==")
    proc = subprocess.run(["bash", "-n", PRE_COMMIT], capture_output=True, text=True)
    check("bash -n tools/pre-commit", proc.returncode == 0, proc.stderr)
    check("tools/pre-commit stays executable", os.access(PRE_COMMIT, os.X_OK))
    with open(PRE_COMMIT) as f:
        contents = f.read()
    check("tools/pre-commit no longer hardcodes the named-pose exemption",
          "final@430x932.png.*FAIL-band" not in contents, contents)
    check("tools/pre-commit no longer carries the string-compared FAIL_ROWS check",
          'FAIL_ROWS" = "1"' not in contents, contents)


def test_check_sh_static():
    print("\n== check.sh: static checks ==")
    proc = subprocess.run(["bash", "-n", CHECK_SH], capture_output=True, text=True)
    check("bash -n tools/check.sh", proc.returncode == 0, proc.stderr)
    check("tools/check.sh stays executable", os.access(CHECK_SH, os.X_OK))


def test_capture_py_static():
    print("\n== capture.py: static checks ==")
    proc = subprocess.run(
        [sys.executable, "-c",
         "import ast,sys; ast.parse(open(sys.argv[1]).read())", CAPTURE_PY],
        capture_output=True, text=True,
    )
    check("ast.parse tools/capture.py", proc.returncode == 0, proc.stderr)


def main():
    test_resolve_check_out()
    test_check_out_cli_refusal()
    test_decide_captures()
    test_evidence_validity()
    test_precommit_capture_gate()
    test_precommit_static()
    test_check_sh_static()
    test_capture_py_static()

    print()
    if failures:
        print("FAIL — %d case(s) failed: %s" % (len(failures), ", ".join(failures)))
        return 1
    print("PASS — all cases green")
    return 0


if __name__ == "__main__":
    sys.exit(main())
