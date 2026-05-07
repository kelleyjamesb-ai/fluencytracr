#!/usr/bin/env bash
# Canonical smoke checks before starting harness work. Safe to re-run.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "== Harness bootstrap (repo root: $ROOT) =="

if [[ -f package.json ]]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm -r exec -- pwd >/dev/null 2>&1 || true
  elif command -v npm >/dev/null 2>&1; then
    echo "(npm present; install deps in backend/frontend as needed)"
  fi
fi

if command -v python3 >/dev/null 2>&1; then
  python3 -m compileall -q src 2>/dev/null || true
fi

echo "Bootstrap done. Next: read harness/agent-progress.txt and harness/feature_list.json."
