#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

STEP_TIMEOUT_SEC="${REVIEW_STEP_TIMEOUT_SEC:-900}"

print_timeout_diagnostics() {
  local step="$1"
  echo "ERROR: Step timed out: ${step} (${STEP_TIMEOUT_SEC}s)"
  echo "--- diagnostics: active review/build processes ---"
  ps -ef 2>/dev/null | rg "review.sh|node .*/node_modules/.bin/tsc|npm run build|npm run lint|jest" || true
  echo "--- diagnostics: shared tsconfig ---"
  cat shared/tsconfig.json || true
}

run_step() {
  local label="$1"
  local command="$2"

  echo "${label}"
  /bin/zsh -lc "$command" &
  local pid=$!
  local elapsed=0

  while kill -0 "$pid" 2>/dev/null; do
    if [ "$elapsed" -ge "$STEP_TIMEOUT_SEC" ]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      print_timeout_diagnostics "$label"
      exit 1
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  wait "$pid"
}

run_step "[1/7] Checking shared source hygiene..." "bash scripts/check-shared-ts-only.sh"
run_step "[2/7] Building shared..." "npx tsc -p shared/tsconfig.json"
run_step "[3/7] Building backend..." "npm run build --workspace backend"
run_step "[4/7] Building frontend..." "npm run build --workspace frontend"
run_step "[5/7] Linting backend..." "npm run lint --workspace backend"
run_step "[6/7] Linting frontend..." "npm run lint --workspace frontend"
run_step "[7/7] Running targeted backend policy tests..." "npm run test:policy --workspace backend"

echo "Review complete."
