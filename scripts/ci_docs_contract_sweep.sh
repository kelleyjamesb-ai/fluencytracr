#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[docs-sweep] Checking /api/ingest stub phrasing..."
if rg -n "api/ingest.*stub|stub.*api/ingest" docs >/dev/null; then
  echo "[docs-sweep] Failed: found forbidden stub phrasing near /api/ingest." >&2
  rg -n "api/ingest.*stub|stub.*api/ingest" docs >&2 || true
  exit 1
fi

echo "[docs-sweep] Checking forbidden exec phrasing..."
if rg -n "leaderboard|team drilldown|team-drilldown|team drill-down" \
  docs/GSD_EXEC_DASHBOARD_SPEC_PACK.md \
  docs/governance/FRONTEND_GOVERNANCE_SEMANTICS_CONTRACT_2026-02-16.md >/dev/null; then
  echo "[docs-sweep] Failed: found forbidden executive phrasing." >&2
  rg -n "leaderboard|team drilldown|team-drilldown|team drill-down" \
    docs/GSD_EXEC_DASHBOARD_SPEC_PACK.md \
    docs/governance/FRONTEND_GOVERNANCE_SEMANTICS_CONTRACT_2026-02-16.md >&2 || true
  exit 1
fi

echo "[docs-sweep] Checking behavior spec required sections..."
rg -n "^## Human Signal Families \(v0\)$" docs/BEHAVIORAL_SIGNALS_SPEC.md >/dev/null
rg -n "^## Agentic Oversight Signal Families \(v0\)$" docs/BEHAVIORAL_SIGNALS_SPEC.md >/dev/null
rg -n "No raw content required" docs/BEHAVIORAL_SIGNALS_SPEC.md >/dev/null

echo "[docs-sweep] Checking required README links..."
rg -n "docs/contracts/evidence-bundle/v1/README.md" README.md >/dev/null
rg -n "docs/api/ingest.md" README.md >/dev/null
rg -n "docs/integrations/glean/01-overview.md" README.md >/dev/null
rg -n "docs/mcp/fluencytracr-mcp-server.md" README.md >/dev/null

echo "[docs-sweep] Passed."
