#!/usr/bin/env python3
"""Regression coverage for tools/package-public.py's declared-placeholder
ORIGIN substitution (R4).

Before this suite, package-public.py had no dedicated test at all: its only
"coverage" was its own verify(), which computed its expectation with the
identical broad byte-replace the copy loop used -- so the packager's defect
(every one of the ~224 selected files byte-replaced for the literal token
`ORIGIN`, not just the five files DEPLOY.md's "Artifact-only origin
substitution" section declares) was invisible to `npm run check`. The gate
defined the corruption as expected, rather than catching it. Five shipped
comments (each spelling "ORIGINAL ...") were mangled into
"https://www.banodoco.aiAL ..." in every production deploy, silently, with
nothing red.

This suite is that first coverage. It proves, independent of the production
manifest:
  - a declared placeholder file (PLACEHOLDER_FILES) gets its ORIGIN token
    substituted and none survives afterward;
  - a file that merely contains the substring "ORIGIN" as part of other text
    (the "ORIGINAL" comment class) ships byte-identical to source;
  - verify() actively rejects the pre-fix behaviour (a negative case that
    reproduces the old broad replace and confirms the current verify()
    refuses the corrupted artifact it produces), so the fix is enforced, not
    just exercised on the happy path;
  - validate_placeholder_declaration() fails closed when a declared
    placeholder file is missing from the manifest's selection (e.g. a
    rename), rather than silently shipping it unsubstituted.

tools/package-public.py has a hyphen in its name, so it is loaded via
importlib.util.spec_from_file_location rather than a bare import (the
pattern tools/test_capture_check.py already uses for the same reason).
Its `if __name__ == "__main__":` guard means importing it never touches the
filesystem beyond executing module-level definitions.

All fixtures live in temp directories only (tempfile.mkdtemp, removed on
exit via addCleanup) -- the convention tools/test_capture_check.py already
uses. Nothing here reads or writes this repository's real
deploy/public-files.json, its real source tree, or anywhere else in the
checkout; the end-to-end tests copy package-public.py into a throwaway
fixture "repository" so `ROOT`/`MANIFEST`, which package-public.py resolves
from `__file__`, point at the fixture rather than the real repo.

Usage: python3 tools/test-gate-package-public.py
"""

import importlib.util
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
PACKAGE_PUBLIC_PY = os.path.join(HERE, "package-public.py")

# A comment string in the shape of the five real files DEPLOY.md's
# substitution section does not cover: a wording choice that happens to
# spell "ORIGINAL", not the ORIGIN placeholder itself.
COMMENT_TEXT = (
    "// same-name registration IN ITS ORIGINAL Map slot, so re-parking\n"
    "// keeps this callback discoverable under the name it was added with.\n"
)


def load_package_public():
    spec = importlib.util.spec_from_file_location(
        "package_public_under_test", PACKAGE_PUBLIC_PY)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # safe: main() is import-guarded, no I/O here
    return mod


class DeclaredPlaceholderUnitTests(unittest.TestCase):
    """Exercises verify() and validate_placeholder_declaration() directly
    against synthetic fixtures. Neither function reads the module's
    ROOT/MANIFEST globals, so these need no fixture "repository" -- just
    temp-dir source files and a temp-dir destination."""

    def setUp(self):
        self.mod = load_package_public()
        self.source_dir = Path(tempfile.mkdtemp(prefix="pkgpub-src-"))
        self.dest_dir = Path(tempfile.mkdtemp(prefix="pkgpub-dest-"))
        self.addCleanup(shutil.rmtree, self.source_dir, ignore_errors=True)
        self.addCleanup(shutil.rmtree, self.dest_dir, ignore_errors=True)

        # One declared placeholder file with a real ORIGIN token...
        self.placeholder_source = self.source_dir / "index.html"
        self.placeholder_source.write_text(
            '<link rel="canonical" href="ORIGIN/">\n', encoding="utf-8"
        )
        # ...and one non-declared JS file whose comment happens to spell
        # "ORIGINAL" -- the exact corruption class the five shipped files
        # named in the R4 task exhibit today.
        self.comment_source = self.source_dir / "journey" / "journey.js"
        self.comment_source.parent.mkdir(parents=True, exist_ok=True)
        self.comment_source.write_text(COMMENT_TEXT, encoding="utf-8")

        self.copied = [
            (self.placeholder_source, Path("index.html")),
            (self.comment_source, Path("journey/journey.js")),
        ]
        self.origin = "https://www.example-origin.test"
        self.revision = "deadbeef"
        self.config = {
            "required": ["index.html", "journey/journey.js"],
            "forbidden": [],
        }

    def _write_correct_artifact(self):
        """Reproduce the fixed copy loop from package-public.py's main():
        substitute only PLACEHOLDER_FILES, ship everything else untouched."""
        for source, relative in self.copied:
            target = self.dest_dir / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            data = source.read_bytes()
            if relative.as_posix() in self.mod.PLACEHOLDER_FILES:
                data = data.replace(b"ORIGIN", self.origin.encode("utf-8"))
            target.write_bytes(data)
        (self.dest_dir / self.mod.REVISION_FILE).write_text(
            self.revision + "\n", encoding="utf-8"
        )

    def test_declared_placeholder_file_is_substituted(self):
        self._write_correct_artifact()
        out = (self.dest_dir / "index.html").read_bytes()
        self.assertIn(self.origin.encode("utf-8"), out)
        self.assertNotIn(b"ORIGIN", out)

    def test_non_declared_file_is_byte_identical(self):
        self._write_correct_artifact()
        out = (self.dest_dir / "journey" / "journey.js").read_bytes()
        self.assertEqual(out, self.comment_source.read_bytes())
        # Unmangled: still spells ORIGINAL, never <origin>AL.
        self.assertIn(b"ORIGINAL", out)

    def test_verify_passes_the_correctly_built_artifact(self):
        self._write_correct_artifact()
        self.mod.verify(self.dest_dir, self.config, self.copied, self.origin, self.revision)

    def test_verify_rejects_old_broad_replace_corruption(self):
        """Negative case: reproduce the pre-R4 behaviour (every selected
        file byte-replaced for ORIGIN, not just the declared five) and
        confirm today's verify() refuses the artifact it produces -- proving
        the fix is actively enforced by the gate, not merely exercised on
        the happy path."""
        for source, relative in self.copied:
            target = self.dest_dir / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            # THE OLD BEHAVIOUR: broad, unconditional replace on every file.
            target.write_bytes(
                source.read_bytes().replace(b"ORIGIN", self.origin.encode("utf-8"))
            )
        (self.dest_dir / self.mod.REVISION_FILE).write_text(
            self.revision + "\n", encoding="utf-8"
        )

        corrupted = (self.dest_dir / "journey" / "journey.js").read_bytes()
        # Confirm the corruption this reproduces is real before asserting
        # verify() catches it.
        self.assertNotIn(b"ORIGINAL", corrupted)
        self.assertIn(self.origin.encode("utf-8") + b"AL", corrupted)

        with self.assertRaises(ValueError) as ctx:
            self.mod.verify(self.dest_dir, self.config, self.copied, self.origin, self.revision)
        message = str(ctx.exception)
        self.assertIn("differ from substituted sources", message)
        self.assertIn("journey/journey.js", message)

    def test_no_origin_placeholder_survives_declared_files(self):
        self._write_correct_artifact()
        for relative in self.mod.PLACEHOLDER_FILES:
            candidate = self.dest_dir / relative
            if candidate.is_file():
                self.assertNotIn(b"ORIGIN", candidate.read_bytes())

    def test_validate_placeholder_declaration_accepts_full_selection(self):
        # validate_placeholder_declaration only checks the *set* of relative
        # paths selected, never file contents, so reusing one source file
        # for all five declared names is fine here.
        full_selection = [
            (self.placeholder_source, Path(name))
            for name in sorted(self.mod.PLACEHOLDER_FILES)
        ]
        self.mod.validate_placeholder_declaration(full_selection)  # must not raise

    def test_validate_placeholder_declaration_fails_closed_on_rename(self):
        """If deploy/public-files.json renamed 404.html to something else,
        the packager must refuse to build rather than silently shipping the
        renamed file with an unresolved ORIGIN placeholder."""
        renamed_selection = [
            (self.placeholder_source, Path(name))
            for name in sorted(self.mod.PLACEHOLDER_FILES)
            if name != "404.html"
        ]
        renamed_selection.append((self.placeholder_source, Path("error.html")))
        with self.assertRaises(ValueError) as ctx:
            self.mod.validate_placeholder_declaration(renamed_selection)
        self.assertIn("404.html", str(ctx.exception))


class PackagePublicEndToEndTests(unittest.TestCase):
    """Runs package-public.py as a real subprocess -- exactly how
    railway.toml and tools/check.sh invoke it -- against a throwaway
    fixture repository copied into a temp dir. Never touches the real
    deploy/public-files.json or this repository's own working tree."""

    def setUp(self):
        self.fixture_root = Path(tempfile.mkdtemp(prefix="pkgpub-fixture-"))
        self.addCleanup(shutil.rmtree, self.fixture_root, ignore_errors=True)
        self.out_dir = Path(tempfile.mkdtemp(prefix="pkgpub-out-"))
        self.addCleanup(shutil.rmtree, self.out_dir, ignore_errors=True)
        # package-public.py requires its destination to not yet exist (or be
        # empty); mkdtemp already created it non-empty-capable, so remove it
        # and let the script recreate it, matching its own precondition.
        self.out_dir.rmdir()

        tools_dir = self.fixture_root / "tools"
        tools_dir.mkdir(parents=True)
        shutil.copy(PACKAGE_PUBLIC_PY, tools_dir / "package-public.py")

        deploy_dir = self.fixture_root / "deploy"
        deploy_dir.mkdir(parents=True)
        # All five declared placeholder paths must be present so
        # validate_placeholder_declaration() (a hard-coded invariant, not
        # config-driven) does not refuse the fixture itself -- plus one
        # non-declared comment file, the corruption-class fixture.
        manifest = {
            "files": [
                "404.html",
                "index.html",
                "ownership/index.html",
                "sitemap.xml",
                "static/index.html",
                "journey/journey.js",
            ],
            "trees": [],
            "required": [
                "404.html",
                "index.html",
                "ownership/index.html",
                "sitemap.xml",
                "static/index.html",
                "journey/journey.js",
            ],
            "forbidden": [],
        }
        (deploy_dir / "public-files.json").write_text(
            json.dumps(manifest), encoding="utf-8"
        )

        for relative in ("404.html", "index.html", "ownership/index.html",
                          "sitemap.xml", "static/index.html"):
            path = self.fixture_root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('<link rel="canonical" href="ORIGIN/">\n', encoding="utf-8")

        journey_dir = self.fixture_root / "journey"
        journey_dir.mkdir(parents=True, exist_ok=True)
        (journey_dir / "journey.js").write_text(COMMENT_TEXT, encoding="utf-8")

    def _run(self, origin="https://example.test", revision="cafef00d"):
        return subprocess.run(
            [sys.executable, str(self.fixture_root / "tools" / "package-public.py"),
             str(self.out_dir), "--origin", origin, "--revision", revision],
            cwd=str(self.fixture_root), capture_output=True, text=True, timeout=30,
        )

    def test_end_to_end_declared_files_substituted_verify_passes(self):
        proc = self._run()
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        for relative in ("404.html", "index.html", "ownership/index.html",
                          "sitemap.xml", "static/index.html"):
            out = (self.out_dir / relative).read_bytes()
            self.assertIn(b"https://example.test", out, relative)
            self.assertNotIn(b"ORIGIN", out, relative)

    def test_end_to_end_comment_file_untouched(self):
        proc = self._run()
        self.assertEqual(proc.returncode, 0, proc.stdout + proc.stderr)
        out = (self.out_dir / "journey" / "journey.js").read_bytes()
        self.assertEqual(out, (self.fixture_root / "journey" / "journey.js").read_bytes())
        self.assertIn(b"ORIGINAL", out)


if __name__ == "__main__":
    unittest.main()
