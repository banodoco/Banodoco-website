#!/usr/bin/env python3
import os
import sys
import tempfile
import unittest
from unittest import mock

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import capture  # noqa: E402


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
                self.assertEqual(capture.main(), 1)

            self.assertFalse(os.path.exists(os.path.join(goldens, "_check")))
            self.assertEqual(len(check_dirs), 1)
            self.assertFalse(os.path.exists(check_dirs[0]))


if __name__ == "__main__":
    unittest.main()
