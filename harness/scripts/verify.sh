#!/usr/bin/env bash
# Evaluator: Python tests (pytest; discovers unittest.TestCase and pytest-style tests).
# CI job `python-tests` uses the same command — keep in sync with `.github/workflows/ci.yml`.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

"$ROOT/harness/scripts/bootstrap.sh"

echo "== Harness verify: install Python deps (requirements.txt) =="
python3 -m pip install -q -r "$ROOT/requirements.txt"

echo "== Harness verify: pytest tests/ (see docs/agent/EVALUATION.md) =="
python3 -m pytest "$ROOT/tests" -q
echo "== Harness verify: OK =="
