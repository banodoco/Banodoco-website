#!/usr/bin/env python3
"""Build the explicitly allowlisted static-site deployment directory."""

from __future__ import annotations

import argparse
import fnmatch
import json
import shutil
import sys
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "deploy" / "public-files.json"
REVISION_FILE = "release-revision.txt"


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
    for source, relative in copied:
        expected_bytes = source.read_bytes().replace(b"ORIGIN", origin.encode("utf-8"))
        if expected_bytes != (destination / relative).read_bytes():
            changed.append(relative.as_posix())
    if changed:
        raise ValueError("artifact files differ from substituted sources: " + ", ".join(changed))
    unresolved = [path.relative_to(destination).as_posix()
                  for path in destination.rglob("*")
                  if path.is_file() and b"ORIGIN" in path.read_bytes()]
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
    for source, relative in copied:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes().replace(b"ORIGIN", origin.encode("utf-8")))
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
