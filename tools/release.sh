#!/usr/bin/env bash
# Explicit authorized release flow. This command intentionally commits, merges
# history, pushes main, and polls production.

set -euo pipefail
cd "$(dirname "$0")/.." || exit 2

YES=0
VERIFY=1
SKIP_CAPTURES=0
STAGE_FILES=()
while [ "$#" -gt 0 ]; do
  case "$1" in
    --yes) YES=1 ;;
    --no-verify) VERIFY=0 ;;
    --skip-captures) SKIP_CAPTURES=1 ;;
    --stage)
      [ "$#" -ge 2 ] || { echo "release: --stage requires a path" >&2; exit 2; }
      STAGE_FILES+=("$2")
      shift
      ;;
    -h|--help)
      cat <<'EOF'
Usage: tools/release.sh [--stage PATH ...] [--skip-captures] [--no-verify] [--yes]

Builds and checks, stages only each explicit --stage path, commits, preserves
origin/main history, pushes main, and verifies production. A dirty tree requires
--stage for every intended changed/untracked path; unreviewed changes abort.
--yes confirms the release non-interactively; it is not a dry-run flag.
EOF
      exit 0
      ;;
    *) echo "release: unknown argument $1" >&2; exit 2 ;;
  esac
  shift
done

step() { printf '\n\033[1;36m== %s\033[0m\n' "$1"; }
pass() { printf '\033[32m   ✓ %s\033[0m\n' "$1"; }
fail() { printf '\033[31m   ✗ %s\033[0m\n' "$1" >&2; }
die() { fail "$1"; exit "${2:-1}"; }
confirm() {
  [ "$YES" = "1" ] && return 0
  read -r -p "$1 [y/N] " REPLY
  [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ] || die "release aborted" 2
}

step "RELEASE PRECONDITIONS"
[ "$(git branch --show-current)" = "main" ] || die "release must run from local main" 2
git diff --cached --quiet || die "staged changes already exist; unstage and use --stage PATH" 2
git config user.name >/dev/null && git config user.email >/dev/null || die "git identity not set" 2
git remote get-url origin >/dev/null 2>&1 || die "origin remote is not configured" 2
for state in MERGE_HEAD CHERRY_PICK_HEAD REVERT_HEAD; do
  [ ! -e "$(git rev-parse --git-path "$state")" ] || die "Git operation in progress ($state)" 2
done
[ ! -d "$(git rev-parse --git-path rebase-merge)" ] || die "rebase in progress" 2
[ ! -d "$(git rev-parse --git-path rebase-apply)" ] || die "rebase in progress" 2
confirm "Release local main to origin/main? This will build, commit, push, and deploy."

git fetch -q origin main || die "could not fetch origin/main — check auth"
git merge-base --is-ancestor origin/main HEAD 2>/dev/null \
  || die "local main diverges from origin/main; reconcile it without discarding remote changes" 2
if [ -n "$(git log --format=%H origin/main..HEAD)" ]; then
  echo "   commits that will be published:"
  git log --oneline origin/main..HEAD
  confirm "Include these existing local commits in the release?"
fi

step "BUILD"
if [ "$SKIP_CAPTURES" = "1" ]; then
  tools/build.sh
else
  tools/build.sh --with-captures
fi

step "STAGE REVIEWED FILES"
is_requested() {
  local changed=$1 requested
  for requested in "${STAGE_FILES[@]}"; do
    [ "$changed" = "$requested" ] && return 0
  done
  return 1
}

UNREVIEWED=0
while IFS= read -r -d '' path; do
  if ! is_requested "$path"; then
    echo "   unreviewed change: $path" >&2
    UNREVIEWED=1
  fi
done < <(git diff --name-only -z)
while IFS= read -r -d '' path; do
  if ! is_requested "$path"; then
    echo "   unreviewed untracked file: $path" >&2
    UNREVIEWED=1
  fi
done < <(git ls-files --others --exclude-standard -z)
[ "$UNREVIEWED" = "0" ] \
  || die "review every changed path and pass each intended file with --stage" 2

if [ "${#STAGE_FILES[@]}" -gt 0 ]; then
  printf '   explicit staging set:\n'
  printf '     %s\n' "${STAGE_FILES[@]}"
  confirm "Stage exactly these paths?"
  for path in "${STAGE_FILES[@]}"; do
    [ ! -d "$path" ] || die "--stage accepts files, not directories: $path" 2
    [ -e "$path" ] || git ls-files --error-unmatch -- "$path" >/dev/null 2>&1 \
      || die "--stage path is neither an existing file nor a tracked deletion: $path" 2
  done
  git --literal-pathspecs add -- "${STAGE_FILES[@]}"
fi

if ! git diff --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  git status --short >&2
  die "unstaged or untracked changes remain; review them and pass each intended path with --stage" 2
fi

CHECKED_HEAD=$(git rev-parse HEAD)
CHECKED_INDEX=$(git diff --cached --binary | shasum -a 256)
step "CHECK STAGED TREE AND DEPLOY ARTIFACT"
CHECK_ARGS=()
[ "$SKIP_CAPTURES" = "1" ] && CHECK_ARGS+=(--skip-captures)
step "DEVELOPER AND BROWSER CONTRACT"
npm run check
step "SCENE AND DEPLOY ARTIFACT CONTRACT"
tools/check.sh "${CHECK_ARGS[@]}"
[ "$CHECKED_HEAD" = "$(git rev-parse HEAD)" ] \
  || die "HEAD changed while checks ran; release stopped" 2
[ "$CHECKED_INDEX" = "$(git diff --cached --binary | shasum -a 256)" ] \
  || die "staged tree changed while checks ran; release stopped" 2
git diff --quiet || die "working tree changed while checks ran; release stopped" 2
[ -z "$(git ls-files --others --exclude-standard)" ] \
  || die "untracked files appeared while checks ran; release stopped" 2

if git diff --cached --quiet; then
  pass "working tree clean — no commit needed"
else
  git diff --cached --stat
  confirm "Commit the reviewed staged changes?"
  if [ "$SKIP_CAPTURES" = "1" ]; then
    PREFLIGHT_DONE=1 SKIP_SCENE_CHECK=1 git commit -m "Deploy pre-flight (captures skipped): $(git diff --cached --stat | tail -1 | sed 's/ *$//')"
  else
    PREFLIGHT_DONE=1 git commit -m "Deploy pre-flight: $(git diff --cached --stat | tail -1 | sed 's/ *$//')"
  fi
fi

step "PUSH ORIGIN/MAIN"
confirm "Push main to origin/main and trigger Railway deployment?"
git push -q origin main || die "push failed"
pass "pushed $(git rev-parse HEAD)"

[ "$VERIFY" = "1" ] || { echo "   deploy triggered; URL verification skipped"; exit 0; }
step "VERIFY DEPLOYMENT"
umask 077
DEPLOY_TMP=$(mktemp -d /tmp/glowshroom-deploy.XXXXXX) \
  || die "could not create deployment verification directory" 3
trap 'rm -rf "$DEPLOY_TMP"' EXIT
RELEASED_REVISION=$(git rev-parse HEAD)
DEADLINE=$(( $(date +%s) + 900 ))
while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  CACHE_BUST=$(date +%s)
  if curl -fsS --max-time 20 "https://www.banodoco.ai/release-revision.txt?release=$CACHE_BUST" \
      -o "$DEPLOY_TMP/actual-revision.txt" 2>/dev/null \
    && [ "$(tr -d '\r\n' < "$DEPLOY_TMP/actual-revision.txt")" = "$RELEASED_REVISION" ]; then
    pass "www.banodoco.ai serving revision $RELEASED_REVISION"
    exit 0
  fi
  sleep 20
done
die "deploy not verified within 15 min — check Railway dashboard" 3
