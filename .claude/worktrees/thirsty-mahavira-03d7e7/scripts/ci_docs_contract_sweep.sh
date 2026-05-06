#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SEARCH_TOOL="rg"
if ! command -v rg >/dev/null 2>&1; then
  SEARCH_TOOL="grep"
fi

search_quiet() {
  local pattern="$1"
  shift
  if [[ "${SEARCH_TOOL}" == "rg" ]]; then
    rg -n -- "${pattern}" "$@" >/dev/null
  else
    grep -R -E -n -- "${pattern}" "$@" >/dev/null
  fi
}

search_print() {
  local pattern="$1"
  shift
  if [[ "${SEARCH_TOOL}" == "rg" ]]; then
    rg -n -- "${pattern}" "$@"
  else
    grep -R -E -n -- "${pattern}" "$@"
  fi
}

echo "[docs-sweep] Checking /api/ingest stub phrasing..."
if search_quiet "api/ingest.*stub|stub.*api/ingest" docs; then
  echo "[docs-sweep] Failed: found forbidden stub phrasing near /api/ingest." >&2
  search_print "api/ingest.*stub|stub.*api/ingest" docs >&2 || true
  exit 1
fi

echo "[docs-sweep] Checking forbidden exec phrasing..."
if search_quiet "leaderboard|team drilldown|team-drilldown|team drill-down" \
  docs/GSD_EXEC_DASHBOARD_SPEC_PACK.md \
  docs/governance/FRONTEND_GOVERNANCE_SEMANTICS_CONTRACT_2026-02-16.md >/dev/null; then
  echo "[docs-sweep] Failed: found forbidden executive phrasing." >&2
  search_print "leaderboard|team drilldown|team-drilldown|team drill-down" \
    docs/GSD_EXEC_DASHBOARD_SPEC_PACK.md \
    docs/governance/FRONTEND_GOVERNANCE_SEMANTICS_CONTRACT_2026-02-16.md >&2 || true
  exit 1
fi

echo "[docs-sweep] Checking behavior spec required sections..."
search_quiet "^## Human Signal Families \(v0\)$" docs/BEHAVIORAL_SIGNALS_SPEC.md
search_quiet "^## Agentic Oversight Signal Families \(v0\)$" docs/BEHAVIORAL_SIGNALS_SPEC.md
search_quiet "No raw content required" docs/BEHAVIORAL_SIGNALS_SPEC.md

echo "[docs-sweep] Checking required README links..."
search_quiet "docs/contracts/evidence-bundle/v1/README.md" README.md
search_quiet "docs/api/ingest.md" README.md
search_quiet "docs/integrations/glean/01-overview.md" README.md
search_quiet "docs/mcp/fluencytracr-mcp-server.md" README.md

echo "[docs-sweep] Passed."
