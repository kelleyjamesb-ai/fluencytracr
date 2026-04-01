#!/usr/bin/env bash
# Evaluator: Python unittest suite (same discovery as CI python-tests "Run unit tests").
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

"$ROOT/harness/scripts/bootstrap.sh"

echo "== Harness verify: Python unittest (see docs/agent/EVALUATION.md) =="
python3 -m unittest discover -s tests -p "test_*.py"
echo "== Harness verify: OK =="
