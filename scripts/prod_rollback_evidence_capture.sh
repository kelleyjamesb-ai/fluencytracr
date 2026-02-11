#!/usr/bin/env bash
set -euo pipefail

# Runs production rollback drill and captures required evidence snapshots.
#
# Required env vars:
#   BASE_URL
#   ORG_ID
#
# Optional env vars:
#   ADMIN_ROLE       default: ADMIN
#   OUT_DIR          default: artifacts/phase3/rollback
#   SCHEMA_VERSION   default: 0.1

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq

BASE_URL="${BASE_URL:-}"
ORG_ID="${ORG_ID:-}"
ADMIN_ROLE="${ADMIN_ROLE:-ADMIN}"
SCHEMA_VERSION="${SCHEMA_VERSION:-0.1}"
OUT_DIR="${OUT_DIR:-artifacts/phase3/rollback}"

if [[ -z "$BASE_URL" || -z "$ORG_ID" ]]; then
  echo "BASE_URL and ORG_ID are required." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$OUT_DIR/rollback_evidence_${ORG_ID}_${TS}"
mkdir -p "$RUN_DIR"

# 1) Execute rollback drill
BASE_URL="$BASE_URL" ORG_ID="$ORG_ID" ADMIN_ROLE="$ADMIN_ROLE" SCHEMA_VERSION="$SCHEMA_VERSION" OUT_DIR="$RUN_DIR" \
  ./scripts/prod_enforcement_rollback_drill.sh | tee "$RUN_DIR/rollback_drill.log"

ROLLBACK_REPORT="$(ls -t "$RUN_DIR"/rollback_drill_*.json 2>/dev/null | head -n 1 || true)"
if [[ -z "$ROLLBACK_REPORT" ]]; then
  echo "Rollback report not found after drill run." >&2
  exit 1
fi

# 2) Capture required evidence snapshots
curl -sS "$BASE_URL/orgs/$ORG_ID/compliance/events?event_type=compliance_mode_updated&limit=50" \
  -H "x-role: $ADMIN_ROLE" | jq . > "$RUN_DIR/compliance_mode_events_snapshot.json"

curl -sS "$BASE_URL/ops/metrics" \
  -H "x-role: $ADMIN_ROLE" | jq . > "$RUN_DIR/ops_metrics_snapshot.json"

curl -sS "$BASE_URL/ops/failclosed" \
  -H "x-role: $ADMIN_ROLE" | jq . > "$RUN_DIR/ops_failclosed_snapshot.json"

curl -sS "$BASE_URL/orgs/$ORG_ID/compliance/status" \
  -H "x-role: $ADMIN_ROLE" | jq . > "$RUN_DIR/final_compliance_status_snapshot.json"

# 3) Build evidence index
jq -n \
  --arg generated_at_utc "$TS" \
  --arg org_id "$ORG_ID" \
  --arg rollback_report "$ROLLBACK_REPORT" \
  --arg events_snapshot "$RUN_DIR/compliance_mode_events_snapshot.json" \
  --arg metrics_snapshot "$RUN_DIR/ops_metrics_snapshot.json" \
  --arg failclosed_snapshot "$RUN_DIR/ops_failclosed_snapshot.json" \
  --arg final_status_snapshot "$RUN_DIR/final_compliance_status_snapshot.json" \
  '{
    generated_at_utc: $generated_at_utc,
    org_id: $org_id,
    artifacts: {
      rollback_report: $rollback_report,
      compliance_mode_events_snapshot: $events_snapshot,
      ops_metrics_snapshot: $metrics_snapshot,
      ops_failclosed_snapshot: $failclosed_snapshot,
      final_compliance_status_snapshot: $final_status_snapshot
    }
  }' > "$RUN_DIR/evidence_index.json"

cat "$RUN_DIR/evidence_index.json"
echo "Rollback evidence capture complete: $RUN_DIR"
