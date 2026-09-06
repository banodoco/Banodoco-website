#!/usr/bin/env python3
"""Build the explicitly allowlisted static-site deployment directory."""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
import shutil
import sys
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "deploy" / "public-files.json"
REVISION_FILE = "release-revision.txt"

# The only files ORIGIN substitution ever touches. Declared in DEPLOY.md's
# "Artifact-only origin substitution" section: the three page heads plus
# sitemap.xml plus 404.html. Every other selected file — including the JS
# comments that happen to spell "ORIGINAL" — ships byte-identical to the
# source checkout.
PLACEHOLDER_FILES = frozenset({
    "404.html",
    "index.html",
    "ownership/index.html",
    "sitemap.xml",
    "static/index.html",
})

STATIC_FROM = re.compile(
    r'''(?ms)^[ \t]*(?:import|export)\b(?:(?!;).)*?\bfrom\s*["']([^"']+)["']'''
)
SIDE_EFFECT_IMPORT = re.compile(
    r'''(?m)^[ \t]*import\s*["']([^"']+)["']'''
)
DYNAMIC_IMPORT = re.compile(
    r'''\bimport\s*\(\s*["']([^"']+)["']\s*\)'''
)


def matches(path: str, patterns: list[str]) -> bool:
    name = PurePosixPath(path).name
    return any(fnmatch.fnmatch(path, pattern) or fnmatch.fnmatch(name, pattern)
               for pattern in patterns)


def selected_files(config: dict) -> list[tuple[Path, Path]]:
    selected: dict[str, Path] = {}
    for relative in config["files"]:
        selected[relative] = ROOT / relative

    for tree in config["trees"]:
        base = ROOT / tree["path"]
        includes = tree["include"]
        excludes = tree.get("exclude", [])
        if not base.is_dir():
            raise ValueError(f"allowlisted tree is missing: {tree['path']}")
        for source in base.rglob("*"):
            if not source.is_file():
                continue
            if source.is_symlink():
                raise ValueError(f"allowlisted trees may not contain symlinks: {source.relative_to(ROOT)}")
            within = source.relative_to(base).as_posix()
            if matches(within, includes) and not matches(within, excludes):
                relative = source.relative_to(ROOT).as_posix()
                selected[relative] = source

    missing = [relative for relative, source in selected.items() if not source.is_file()]
    if missing:
        raise ValueError("allowlisted files are missing: " + ", ".join(missing))
    return [(source, Path(relative)) for relative, source in sorted(selected.items())]


def validate_placeholder_declaration(copied: list[tuple[Path, Path]]) -> None:
    """Fail closed if a declared ORIGIN placeholder file is not part of what
    the manifest actually selected — e.g. deploy/public-files.json renaming
    or dropping one of the five files DEPLOY.md documents as substituted.
    Without this, a rename would silently ship that file with an unresolved
    ORIGIN placeholder instead of failing the build."""
    selected = {relative.as_posix() for _, relative in copied}
    missing = sorted(PLACEHOLDER_FILES - selected)
    if missing:
        raise ValueError(
            "declared ORIGIN placeholder files are not in the selection: " + ", ".join(missing)
        )


def verify_relative_module_graph(destination: Path) -> None:
    """Fail when a shipped JavaScript module imports a file we did not ship."""
    missing: list[str] = []
    escaped: list[str] = []
    for module in destination.rglob("*.js"):
        source = module.read_text(encoding="utf-8")
        specifiers: set[str] = set()
        for pattern in (STATIC_FROM, SIDE_EFFECT_IMPORT, DYNAMIC_IMPORT):
            specifiers.update(pattern.findall(source))
        for specifier in sorted(specifiers):
            if not specifier.startswith("."):
                continue
            clean = specifier.split("?", 1)[0].split("#", 1)[0]
            target = (module.parent / clean).resolve()
            try:
                target.relative_to(destination)
            except ValueError:
                escaped.append(
                    f"{module.relative_to(destination).as_posix()} -> {specifier}"
                )
                continue
            if not target.is_file():
                missing.append(
                    f"{module.relative_to(destination).as_posix()} -> {specifier}"
                )
    if escaped:
        raise ValueError("module imports escape public artifact: " + ", ".join(escaped))
    if missing:
        raise ValueError("module imports are absent from public artifact: " + ", ".join(missing))


def verify(destination: Path, config: dict,
           copied: list[tuple[Path, Path]], origin: str, revision: str) -> None:
    missing = [path for path in config["required"] if not (destination / path).is_file()]
    if missing:
        raise ValueError("required public files are missing: " + ", ".join(missing))

    present = {path.relative_to(destination).parts[0]
               for path in destination.iterdir()}
    leaked = sorted(present.intersection(config["forbidden"]))
    if leaked:
        raise ValueError("repository-only paths entered the artifact: " + ", ".join(leaked))

    verify_relative_module_graph(destination)

    check_outputs = destination / "static" / "captures" / "_check"
    if check_outputs.exists():
        raise ValueError("capture check outputs entered the artifact")

    expected = {relative.as_posix() for _, relative in copied} | {REVISION_FILE}
    actual = {path.relative_to(destination).as_posix()
              for path in destination.rglob("*") if path.is_file()}
    unexpected = sorted(actual - expected)
    omitted = sorted(expected - actual)
    if unexpected or omitted:
        details = []
        if unexpected:
            details.append("unexpected: " + ", ".join(unexpected))
        if omitted:
            details.append("omitted: " + ", ".join(omitted))
        raise ValueError("artifact differs from allowlist (" + "; ".join(details) + ")")

    changed = []
    unresolved = []
    for source, relative in copied:
        key = relative.as_posix()
        source_bytes = source.read_bytes()
        artifact_bytes = (destination / relative).read_bytes()
        if key in PLACEHOLDER_FILES:
            expected_bytes = source_bytes.replace(b"ORIGIN", origin.encode("utf-8"))
            if b"ORIGIN" in artifact_bytes:
                unresolved.append(key)
        else:
            # Every other selected file — including the JS comments that
            # happen to spell "ORIGINAL" — must ship byte-identical to the
            # source checkout. ORIGIN substitution is declared, not implied.
            expected_bytes = source_bytes
        if expected_bytes != artifact_bytes:
            changed.append(key)
    if changed:
        raise ValueError("artifact files differ from substituted sources: " + ", ".join(changed))
    if unresolved:
        raise ValueError("unresolved ORIGIN placeholders: " + ", ".join(unresolved))
    if (destination / REVISION_FILE).read_text(encoding="utf-8") != revision + "\n":
        raise ValueError("release revision marker does not match requested revision")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path,
                        help="new, empty directory to populate")
    parser.add_argument("--origin", required=True,
                        help="absolute deployment origin substituted into public files")
    parser.add_argument("--revision", required=True,
                        help="opaque deployed revision written to release-revision.txt")
    args = parser.parse_args()
    origin = args.origin.rstrip("/")
    if not origin.startswith(("https://", "http://")):
        raise ValueError("origin must be an absolute http(s) URL")
    revision = args.revision.strip()
    if not revision or "\n" in revision or "\r" in revision:
        raise ValueError("revision must be one non-empty line")
    destination = args.destination.resolve()
    if destination == ROOT or ROOT in destination.parents:
        raise ValueError("destination must be outside the repository")
    if destination.exists() and any(destination.iterdir()):
        raise ValueError(f"destination is not empty: {destination}")
    destination.mkdir(parents=True, exist_ok=True)

    config = json.loads(MANIFEST.read_text(encoding="utf-8"))
    copied = selected_files(config)
    validate_placeholder_declaration(copied)
    for source, relative in copied:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        data = source.read_bytes()
        if relative.as_posix() in PLACEHOLDER_FILES:
            data = data.replace(b"ORIGIN", origin.encode("utf-8"))
        target.write_bytes(data)
        shutil.copystat(source, target)
    (destination / REVISION_FILE).write_text(revision + "\n", encoding="utf-8")
    verify(destination, config, copied, origin, revision)
    print(f"public artifact: {len(copied)} files copied to {destination}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"package-public: {error}", file=sys.stderr)
        raise SystemExit(1)
