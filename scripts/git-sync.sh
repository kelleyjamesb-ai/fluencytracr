#!/usr/bin/env bash
# Fast-forward the current branch from its configured upstream (default: origin).
# Usage: from repo root — bash scripts/git-sync.sh
# Env: GIT_SYNC_REMOTE=origin (override remote name)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

REMOTE="${GIT_SYNC_REMOTE:-origin}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "git-sync: not a git repository." >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" == "HEAD" ]]; then
  echo "git-sync: detached HEAD; checkout a branch first." >&2
  exit 1
fi

git fetch "$REMOTE"

if ! git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
  echo "git-sync: no upstream for '$branch'. Example: git branch -u ${REMOTE}/${branch}" >&2
  exit 1
fi

git pull --ff-only

echo "git-sync: OK ($branch is up to date with upstream)."
