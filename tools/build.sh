#!/usr/bin/env bash
# Regenerate committed derived artifacts. This script does not inspect or
# modify git state and never deploys.

set -euo pipefail
cd "$(dirname "$0")/.." || exit 2

WITH_CAPTURES=0
case "${1:-}" in
  "") ;;
  --with-captures) WITH_CAPTURES=1 ;;
  -h|--help)
    echo "Usage: tools/build.sh [--with-captures]"
    echo "Regenerates derived artifacts; does not stage, commit, push, or deploy."
    exit 0
    ;;
  *) echo "build: unknown flag $1" >&2; exit 2 ;;
esac
[ "$#" -le 1 ] || { echo "build: too many arguments" >&2; exit 2; }

if [ "$WITH_CAPTURES" = "1" ]; then
  exec python3 tools/rebuild.py --with-captures
fi
exec python3 tools/rebuild.py
