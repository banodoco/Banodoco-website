#!/usr/bin/env python3
import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from unittest import mock

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import capture  # noqa: E402


# ==============================================================================
# THE TRAP THIS PREFIX EXISTS TO CLOSE. gate-repair, 2026-09-02.
#
# capture.main() prints its own report, and under this file's mocks that report
# is a FIXTURE, not a measurement: fake_capture_one hard-codes mean 255.0 /
# ready False, urlopen is DummyHTTP, wait_webgl_stable returns "test-gl", no
# Chrome starts and no golden is opened. But the text it prints includes the
# line
#
#   --- drift check (REAL GATE: frozen captures, exit 1 on FAIL-band) ---
#
# and that text went to this suite's stdout unmarked, straight into every
# `npm run check` log. For weeks it was read as the capture gate's verdict. The
# 2026-09-02 gate audit found the same block BYTE-IDENTICAL across a dozen
# accepted logs from different trees and different changes — identical output
# across different inputs is itself proof it was a fixture — and, worse, that
# `npm run check` never invokes tools/check.sh at all, so this was the only
# capture-shaped text anyone ever saw. Real drift of 2.5 MAE went unreported
# because the gate that would have reported it was never run.
#
# The assertions below are unchanged and still assert exactly what they
# asserted. What changes is that the mocked run's output can no longer be
# mistaken for a capture: every line of it is prefixed, so it is visibly a unit
# test's fixture in a grep, in a log, and to a reader skimming a check run.
# ==============================================================================
MOCK_PREFIX = "[MOCKED capture gate — unit test; no capture ran] "


@contextlib.contextmanager
def quarantined_stdout(what):
    """Run a mocked capture.main() and re-emit its report, line-prefixed."""
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            yield buf
    finally:
        sys.stdout.write("%s%s\n" % (MOCK_PREFIX, what))
        for line in buf.getvalue().splitlines():
            sys.stdout.write(MOCK_PREFIX + line + "\n")
        sys.stdout.flush()


class DummyCDP:
    def __init__(self, *_args, **_kwargs):
        pass

    def call(self, *_args, **_kwargs):
        return {}

    def close(self):
        pass


class DummyHTTP:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self, _size=-1):
        return b"ok"


class GateCaptureTests(unittest.TestCase):
    def test_check_rejects_unconfirmed_pose_and_uses_cleaned_temp_output(self):
        actual_temporary_directory = tempfile.TemporaryDirectory
        check_dirs = []

        def recording_temporary_directory(*args, **kwargs):
            directory = actual_temporary_directory(*args, **kwargs)
            check_dirs.append(directory.name)
            return directory

        with actual_temporary_directory(prefix="gate-capture-golden-") as goldens:
            filename = "mission@1440x900.png"
            Image.new("RGB", (8, 8), "white").save(os.path.join(goldens, filename))

            def fake_capture_one(_cdp, pose, size_key, *_args, **_kwargs):
                Image.new("RGB", (8, 8), "white").save(
                    os.path.join(capture.OUT_DIR, filename)
                )
                return {
                    "pose": pose["id"], "chapter": pose["chapter"],
                    "label": pose["label"], "size": size_key,
                    "file": filename, "w": 1440, "h": 900, "dpr": 1,
                    "bytes": os.path.getsize(os.path.join(capture.OUT_DIR, filename)),
                    "mean": 255.0, "ready": False,
                    "readiness": "no-journey", "url": "http://example.invalid",
                }

            argv = [
                "capture.py", "--check", "--pose", "mission",
                "--size", "desktop", "--out", goldens,
            ]
            patches = (
                mock.patch.object(sys, "argv", argv),
                mock.patch.object(capture.urllib.request, "urlopen", return_value=DummyHTTP()),
                mock.patch.object(capture.tempfile, "TemporaryDirectory", side_effect=recording_temporary_directory),
                mock.patch.object(capture, "launch_chrome", return_value=object()),
                mock.patch.object(capture, "reap_chrome"),
                mock.patch.object(capture, "page_ws_url", return_value="ws://unused"),
                mock.patch.object(capture, "CDP", DummyCDP),
                mock.patch.object(capture, "wait_webgl_stable", return_value="test-gl"),
                mock.patch.object(capture, "capture_one", side_effect=fake_capture_one),
            )
            with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6], patches[7], patches[8]:
                with quarantined_stdout(
                        "capture.main() --check --pose mission --size desktop, "
                        "against a mocked shutter — asserting it returns 1"):
                    rc = capture.main()
                self.assertEqual(rc, 1)

            self.assertFalse(os.path.exists(os.path.join(goldens, "_check")))
            self.assertEqual(len(check_dirs), 1)
            self.assertFalse(os.path.exists(check_dirs[0]))


class OriginTests(unittest.TestCase):
    """The shutter and tools/check.sh's preflight must dial the same origin.

    Before gate-repair (2026-09-02) they could not: capture.py hard-coded
    ``http://localhost:8137/index.html`` with no override, while check.sh read
    ``CHECK_ORIGIN``. ``CHECK_ORIGIN=...:8599 tools/check.sh`` verified :8599
    and shot :8137. These are the smallest assertions that catch that class of
    defect returning — two constants nobody compared, and a variable one half
    honours.
    """

    CHECK_SH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "check.sh")

    def check_sh_default_origin(self):
        """The literal in check.sh's ``CHECK_ORIGIN="${CHECK_ORIGIN:-...}"``."""
        with open(self.CHECK_SH) as f:
            source = f.read()
        marker = 'CHECK_ORIGIN="${CHECK_ORIGIN:-'
        start = source.index(marker) + len(marker)
        return source[start:source.index('}"', start)]

    def test_check_sh_and_capture_agree_on_the_default_origin(self):
        self.assertEqual(self.check_sh_default_origin(), capture.DEFAULT_ORIGIN)
        self.assertEqual(capture.BASE_URL,
                         capture.base_url_for(capture.DEFAULT_ORIGIN))

    def test_check_origin_steers_the_shutter_and_the_flag_beats_it(self):
        with mock.patch.dict(os.environ, {"CHECK_ORIGIN": "http://localhost:8599"}):
            self.assertEqual(capture.resolve_origin(), "http://localhost:8599")
            self.assertEqual(capture.resolve_origin("http://localhost:8600"),
                             "http://localhost:8600")
        with mock.patch.dict(os.environ, {"CHECK_ORIGIN": "   "}):
            self.assertEqual(capture.resolve_origin(), capture.DEFAULT_ORIGIN)
        with mock.patch.dict(os.environ, {}, clear=True):
            self.assertEqual(capture.resolve_origin(), capture.DEFAULT_ORIGIN)

    def test_a_trailing_slash_does_not_double_up(self):
        self.assertEqual(capture.base_url_for("http://localhost:8599/"),
                         "http://localhost:8599/index.html")


def run_capture_with_fake_shutter(argv, goldens, shot):
    """Drive ``capture.main()`` with no Chrome, no server and no network.

    ``shot`` is a list of ``(pose_id, size_key)`` the fake shutter accepts;
    anything else is a programming error in the test. Every capture writes a
    real 8x8 PNG into the goldens directory so the byte counts are honest.
    """
    def fake_capture_one(_cdp, pose, size_key, *_args, **_kwargs):
        w, h = capture.SIZES[size_key]["w"], capture.SIZES[size_key]["h"]
        filename = "%s@%dx%d.png" % (pose["id"], w, h)
        Image.new("RGB", (8, 8), "white").save(
            os.path.join(capture.OUT_DIR, filename))
        return {
            "pose": pose["id"], "chapter": pose["chapter"],
            "label": pose["label"], "size": size_key, "file": filename,
            "w": w, "h": h, "dpr": 1,
            "bytes": os.path.getsize(os.path.join(capture.OUT_DIR, filename)),
            "mean": 128.0, "ready": True, "readiness": "ok",
            "url": "http://example.invalid",
        }

    with mock.patch.object(sys, "argv", argv), \
            mock.patch.object(capture.urllib.request, "urlopen", return_value=DummyHTTP()), \
            mock.patch.object(capture, "launch_chrome", return_value=object()), \
            mock.patch.object(capture, "reap_chrome"), \
            mock.patch.object(capture, "page_ws_url", return_value="ws://unused"), \
            mock.patch.object(capture, "CDP", DummyCDP), \
            mock.patch.object(capture, "wait_webgl_stable", return_value="test-gl"), \
            mock.patch.object(capture, "probe_environment", return_value={}), \
            mock.patch.object(capture, "git_head", return_value="0" * 40), \
            mock.patch.object(capture, "capture_one", side_effect=fake_capture_one):
        with quarantined_stdout("capture.main() %s, against a mocked shutter"
                                % " ".join(argv[1:])):
            rc = capture.main()
    with open(os.path.join(goldens, "manifest.json")) as f:
        return rc, json.load(f)


class MergeManifestTests(unittest.TestCase):
    """A subset shoot must update only its own rows of manifest.json.

    Without --merge-manifest, ``--pose inspire`` replaced a ten-row manifest
    with a one-row manifest and silently deleted the other nine goldens'
    provenance while leaving their PNGs on disk. These assert both halves: the
    merge preserves, and the merge is HONEST about what it preserved.
    """

    def seed(self, goldens):
        """A prior full-ish manifest: two poses, one size each."""
        manifest = {
            "generated": "2026-08-01T00:00:00",
            "commit": "a" * 40,
            "poses": {
                "mission": {"chapter": "mission", "label": "Mission", "sizes": {
                    "desktop": {"src": "captures/mission@1440x900.png", "w": 1440,
                                "h": 900, "bytes": 1, "mean": 1.0, "poseConfirmed": True}}},
                "inspire": {"chapter": "inspire", "label": "Inspire", "sizes": {
                    "desktop": {"src": "captures/inspire@1440x900.png", "w": 1440,
                                "h": 900, "bytes": 2, "mean": 2.0, "poseConfirmed": True}}},
            },
        }
        with open(os.path.join(goldens, "manifest.json"), "w") as f:
            json.dump(manifest, f)
        return manifest

    def test_merge_preserves_the_rows_this_run_did_not_shoot(self):
        with tempfile.TemporaryDirectory(prefix="gate-capture-merge-") as goldens:
            before = self.seed(goldens)
            rc, after = run_capture_with_fake_shutter(
                ["capture.py", "--pose", "mission", "--size", "desktop",
                 "--merge-manifest", "--out", goldens],
                goldens, [("mission", "desktop")])
            self.assertEqual(rc, 0)

            # The untouched row survived, byte for byte.
            self.assertEqual(after["poses"]["inspire"]["sizes"]["desktop"],
                             before["poses"]["inspire"]["sizes"]["desktop"])
            # The shot row was replaced by this run's measurement.
            self.assertNotEqual(after["poses"]["mission"]["sizes"]["desktop"]["mean"],
                                before["poses"]["mission"]["sizes"]["desktop"]["mean"])
            # And the file says which is which, and where the survivor came from.
            self.assertEqual(after["partial"]["shot"], ["mission@desktop"])
            self.assertEqual(after["partial"]["carriedOver"], ["inspire@desktop"])
            self.assertEqual(after["partial"]["carriedOverFrom"]["commit"], "a" * 40)

    def test_without_the_flag_a_subset_shoot_still_replaces(self):
        """The unflagged behaviour is unchanged — the flag is opt-in, and this
        pins that the merge is really the flag's doing and not a silent
        change of default that would mask a genuine golden-set replacement."""
        with tempfile.TemporaryDirectory(prefix="gate-capture-merge-") as goldens:
            self.seed(goldens)
            rc, after = run_capture_with_fake_shutter(
                ["capture.py", "--pose", "mission", "--size", "desktop",
                 "--out", goldens],
                goldens, [("mission", "desktop")])
            self.assertEqual(rc, 0)
            self.assertNotIn("inspire", after["poses"])
            self.assertNotIn("partial", after)

    def test_merge_into_nothing_refuses_rather_than_inventing_provenance(self):
        with tempfile.TemporaryDirectory(prefix="gate-capture-merge-") as goldens:
            with self.assertRaises(SystemExit) as caught:
                run_capture_with_fake_shutter(
                    ["capture.py", "--pose", "mission", "--size", "desktop",
                     "--merge-manifest", "--out", goldens],
                    goldens, [("mission", "desktop")])
            self.assertIn("--merge-manifest", str(caught.exception))

    def test_merge_is_refused_under_check_which_writes_no_manifest(self):
        with tempfile.TemporaryDirectory(prefix="gate-capture-merge-") as goldens:
            with mock.patch.object(sys, "argv", [
                    "capture.py", "--check", "--merge-manifest", "--out", goldens]):
                with self.assertRaises(SystemExit) as caught:
                    capture.main()
            self.assertIn("--merge-manifest", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
