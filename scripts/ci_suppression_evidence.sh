#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${SUPPRESSION_EVIDENCE_DIR:-$ROOT_DIR/artifacts/phase3/suppression}"
mkdir -p "$OUT_DIR"

TIMESTAMP_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
COMMIT_SHA="$(git -C "$ROOT_DIR" rev-parse HEAD)"
MANIFEST="$OUT_DIR/suppression_evidence_manifest.json"
LOG_FILE="$OUT_DIR/suppression_test_output.log"

TEST_PATHS=(
  "tests/suppression.test.ts"
  "tests/behavioral_signals.test.ts"
)

{
  echo "[suppression-evidence] timestamp_utc=$TIMESTAMP_UTC"
  echo "[suppression-evidence] commit_sha=$COMMIT_SHA"
  echo "[suppression-evidence] node_env=${NODE_ENV:-}"
  echo "[suppression-evidence] database_url_set=$([[ -n "${DATABASE_URL:-}" ]] && echo true || echo false)"
  echo "[suppression-evidence] running test paths: ${TEST_PATHS[*]}"
} | tee "$LOG_FILE"

set +e
npm run test:ci --workspace backend -- --runTestsByPath "${TEST_PATHS[@]}" 2>&1 | tee -a "$LOG_FILE"
TEST_EXIT=${PIPESTATUS[0]}
set -e

PASS=false
if [[ "$TEST_EXIT" -eq 0 ]]; then
  PASS=true
fi

cat > "$MANIFEST" <<EOF
{
  "generated_at_utc": "$TIMESTAMP_UTC",
  "commit_sha": "$COMMIT_SHA",
  "suite": "suppression-regression",
  "test_paths": [
    "${TEST_PATHS[0]}",
    "${TEST_PATHS[1]}"
  ],
  "database_url_set": $([[ -n "${DATABASE_URL:-}" ]] && echo true || echo false),
  "node_env": "${NODE_ENV:-}",
  "pass": $PASS,
  "exit_code": $TEST_EXIT,
  "log_file": "$(basename "$LOG_FILE")"
}
EOF

if [[ "$TEST_EXIT" -ne 0 ]]; then
  echo "[suppression-evidence] FAIL: suppression regression suite failed" | tee -a "$LOG_FILE"
  exit "$TEST_EXIT"
fi

echo "[suppression-evidence] PASS: evidence artifacts written to $OUT_DIR" | tee -a "$LOG_FILE"
