#!/usr/bin/env python3
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import rebuild  # noqa: E402


class GateRebuildTests(unittest.TestCase):
    def test_fast_order_is_unchanged(self):
        self.assertEqual(
            [step[0] for step in rebuild.build_steps()],
            [step[0] for step in rebuild.FAST_STEPS],
        )

    def test_capture_precedes_metadata_in_full_rebuild(self):
        tools = [step[0] for step in rebuild.build_steps(with_captures=True)]
        self.assertLess(tools.index("capture.py"), tools.index("build-meta.py"))

    def test_check_arguments_preserve_dependency_order(self):
        steps = rebuild.build_steps(with_captures=True, check=True)
        tools = [step[0] for step in steps]
        self.assertLess(tools.index("capture.py"), tools.index("build-meta.py"))
        self.assertTrue(all(step[1] == ["--check"] for step in steps))


if __name__ == "__main__":
    unittest.main()
