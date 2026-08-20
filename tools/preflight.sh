#!/usr/bin/env bash
# Safe compatibility entry point: verification only. For a release, use
# tools/release.sh explicitly.

set -euo pipefail
cd "$(dirname "$0")/.." || exit 2
exec tools/check.sh "$@"
