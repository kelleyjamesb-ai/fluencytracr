#!/usr/bin/env bash
set -euo pipefail

# Aggregates Phase 3 evidence artifacts into one bundle directory and summary.
#
# Required env vars:
#   BASE_URL
#   ORG_ID                 allowlisted org id for replay/export checks
#
# Optional env vars:
#   PILOT_ORG_ID           org id for rollback drill (defaults to ORG_ID)
#   BLOCKED_ORG            blocked org id for access-control script
#   ADMIN_ROLE             default: ADMIN
#   OUT_DIR                default: artifacts/phase3/bundle
#   RUN_ACCESS_CONTROL     default: 1
#   RUN_ROLLBACK_DRILL     default: 1
#   RUN_SUPPRESSION_EVIDENCE default: 1

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
PILOT_ORG_ID="${PILOT_ORG_ID:-${ORG_ID:-}}"
BLOCKED_ORG="${BLOCKED_ORG:-org-not-allowlisted}"
ADMIN_ROLE="${ADMIN_ROLE:-ADMIN}"
OUT_DIR="${OUT_DIR:-artifacts/phase3/bundle}"
RUN_ACCESS_CONTROL="${RUN_ACCESS_CONTROL:-1}"
RUN_ROLLBACK_DRILL="${RUN_ROLLBACK_DRILL:-1}"
RUN_SUPPRESSION_EVIDENCE="${RUN_SUPPRESSION_EVIDENCE:-1}"

if [[ -z "$BASE_URL" || -z "$ORG_ID" ]]; then
  echo "BASE_URL and ORG_ID are required." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
ts="$(date -u +%Y%m%dT%H%M%SZ)"
bundle_dir="$OUT_DIR/phase3_evidence_${ts}"
mkdir -p "$bundle_dir"
summary="$bundle_dir/summary.json"

capture_json() {
  local path="$1"
  local out="$2"
  curl -sS "$BASE_URL$path" -H "x-role: $ADMIN_ROLE" | jq . > "$out"
}

# Snapshot ops state
capture_json "/health" "$bundle_dir/health.json"
capture_json "/ops/db/readiness" "$bundle_dir/db_readiness.json"
capture_json "/ops/metrics" "$bundle_dir/metrics.json"
capture_json "/ops/failclosed" "$bundle_dir/failclosed.json"

access_control_status="skipped"
if [[ "$RUN_ACCESS_CONTROL" == "1" ]]; then
  if BASE_URL="$BASE_URL" ALLOWLISTED_ORG="$ORG_ID" BLOCKED_ORG="$BLOCKED_ORG" ADMIN_ROLE="$ADMIN_ROLE" ./scripts/prod_access_control_validation.sh > "$bundle_dir/access_control.log" 2>&1; then
    access_control_status="pass"
  else
    access_control_status="fail"
  fi
fi

replay_status="fail"
if BASE_URL="$BASE_URL" ORG_ID="$ORG_ID" ADMIN_ROLE="$ADMIN_ROLE" OUT_DIR="$bundle_dir" ./scripts/prod_replay_determinism_validation.sh > "$bundle_dir/replay.log" 2>&1; then
  replay_status="pass"
fi
replay_report="$(ls -t "$bundle_dir"/replay_determinism_*.json 2>/dev/null | head -n 1 || true)"

export_status="fail"
if BASE_URL="$BASE_URL" ORG_ID="$ORG_ID" ADMIN_ROLE="$ADMIN_ROLE" OUT_DIR="$bundle_dir" ./scripts/prod_export_reproducibility_cert.sh > "$bundle_dir/export.log" 2>&1; then
  export_status="pass"
fi
export_report="$(ls -t "$bundle_dir"/export_repro_cert_*.json 2>/dev/null | head -n 1 || true)"

rollback_status="skipped"
rollback_report=""
if [[ "$RUN_ROLLBACK_DRILL" == "1" ]]; then
  if BASE_URL="$BASE_URL" ORG_ID="$PILOT_ORG_ID" ADMIN_ROLE="$ADMIN_ROLE" OUT_DIR="$bundle_dir" ./scripts/prod_enforcement_rollback_drill.sh > "$bundle_dir/rollback.log" 2>&1; then
    rollback_status="pass"
  else
    rollback_status="fail"
  fi
  rollback_report="$(ls -t "$bundle_dir"/rollback_drill_*.json 2>/dev/null | head -n 1 || true)"
fi

suppression_status="skipped"
if [[ "$RUN_SUPPRESSION_EVIDENCE" == "1" ]]; then
  if SUPPRESSION_EVIDENCE_DIR="$bundle_dir/suppression" ./scripts/ci_suppression_evidence.sh > "$bundle_dir/suppression.log" 2>&1; then
    suppression_status="pass"
  else
    suppression_status="fail"
  fi
fi

overall_pass=false
if [[ "$replay_status" == "pass" && "$export_status" == "pass" ]]; then
  if [[ "$RUN_SUPPRESSION_EVIDENCE" == "1" && "$suppression_status" != "pass" ]]; then
    overall_pass=false
  else
  if [[ "$RUN_ROLLBACK_DRILL" == "1" ]]; then
    if [[ "$rollback_status" == "pass" ]]; then
      overall_pass=true
    fi
  else
    overall_pass=true
  fi
  fi
fi

jq -n \
  --arg generated_at_utc "$ts" \
  --arg base_url "$BASE_URL" \
  --arg org_id "$ORG_ID" \
  --arg pilot_org_id "$PILOT_ORG_ID" \
  --arg access_control "$access_control_status" \
  --arg replay "$replay_status" \
  --arg export "$export_status" \
  --arg rollback "$rollback_status" \
  --arg suppression "$suppression_status" \
  --arg replay_report "$replay_report" \
  --arg export_report "$export_report" \
  --arg rollback_report "$rollback_report" \
  --argjson overall_pass "$overall_pass" \
  '{
    generated_at_utc: $generated_at_utc,
    base_url: $base_url,
    org_id: $org_id,
    pilot_org_id: $pilot_org_id,
    checks: {
      access_control_validation: $access_control,
      replay_determinism: $replay,
      export_reproducibility: $export,
      rollback_drill: $rollback,
      suppression_regression: $suppression
    },
    reports: {
      replay_report: $replay_report,
      export_report: $export_report,
      rollback_report: $rollback_report
    },
    overall_pass: $overall_pass
  }' > "$summary"

cat "$summary"
echo "Evidence bundle written to: $bundle_dir"
if [[ "$overall_pass" != true ]]; then
  exit 1
fi
