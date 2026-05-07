#!/usr/bin/env bash
set -euo pipefail

# Executes an org-scoped enforced->shadow rollback drill and records evidence.
#
# Required env vars:
#   BASE_URL         e.g. https://www.fluencytracr.com
#   ORG_ID           pilot-allowlisted org id
#
# Optional env vars:
#   ADMIN_ROLE       default: ADMIN
#   SCHEMA_VERSION   default: 0.1
#   OUT_DIR          default: artifacts/phase3/rollback

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
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

ts="$(date -u +%Y%m%dT%H%M%SZ)"
report="$OUT_DIR/rollback_drill_${ORG_ID}_${ts}.json"

patch_mode() {
  local mode="$1"
  local rationale="$2"
  local out="$3"
  local status
  status="$(curl -sS -o "$out" -w "%{http_code}" \
    -X PATCH "$BASE_URL/orgs/$ORG_ID/compliance/mode" \
    -H "Content-Type: application/json" \
    -H "x-role: $ADMIN_ROLE" \
    -H "X-FluencyTracr-Schema-Version: $SCHEMA_VERSION" \
    -d "$(jq -cn --arg mode "$mode" --arg rationale "$rationale" '{mode:$mode,rationale:$rationale}')")"
  echo "$status"
}

enforced_out="$workdir/enforced.json"
rollback_out="$workdir/rollback.json"
events_out="$workdir/events.json"
status_out="$workdir/status.json"

enforce_status="$(patch_mode "enforced" "Phase 3 rollback drill: enter enforced mode" "$enforced_out")"
if [[ "$enforce_status" != "200" ]]; then
  echo "Failed to enter enforced mode (status $enforce_status)" >&2
  cat "$enforced_out" >&2
  exit 1
fi

rollback_status="$(patch_mode "shadow" "Phase 3 rollback drill: immediate rollback to shadow" "$rollback_out")"
if [[ "$rollback_status" != "200" ]]; then
  echo "Failed to rollback to shadow (status $rollback_status)" >&2
  cat "$rollback_out" >&2
  exit 1
fi

events_status="$(curl -sS -o "$events_out" -w "%{http_code}" \
  "$BASE_URL/orgs/$ORG_ID/compliance/events?event_type=compliance_mode_updated&limit=20" \
  -H "x-role: $ADMIN_ROLE")"
if [[ "$events_status" != "200" ]]; then
  echo "Failed to fetch compliance mode events (status $events_status)" >&2
  cat "$events_out" >&2
  exit 1
fi

current_status_code="$(curl -sS -o "$status_out" -w "%{http_code}" \
  "$BASE_URL/orgs/$ORG_ID/compliance/status" \
  -H "x-role: $ADMIN_ROLE")"
if [[ "$current_status_code" != "200" ]]; then
  echo "Failed to fetch compliance status (status $current_status_code)" >&2
  cat "$status_out" >&2
  exit 1
fi

has_enforced="$(jq -r 'any(.events[]?; .metadata.previous_mode == "shadow" and .metadata.next_mode == "enforced")' "$events_out")"
has_rollback="$(jq -r 'any(.events[]?; .metadata.previous_mode == "enforced" and .metadata.next_mode == "shadow" and .metadata.rollback == true)' "$events_out")"
current_mode="$(jq -r '.mode' "$status_out")"

pass=false
if [[ "$has_enforced" == "true" && "$has_rollback" == "true" && "$current_mode" == "shadow" ]]; then
  pass=true
fi

jq -n \
  --arg ts "$ts" \
  --arg org_id "$ORG_ID" \
  --arg enforce_status "$enforce_status" \
  --arg rollback_status "$rollback_status" \
  --arg current_mode "$current_mode" \
  --argjson has_enforced "$has_enforced" \
  --argjson has_rollback "$has_rollback" \
  --argjson pass "$pass" \
  --arg enforced_event_id "$(jq -r '.source_event_id // empty' "$enforced_out")" \
  --arg rollback_event_id "$(jq -r '.source_event_id // empty' "$rollback_out")" \
  '{
    generated_at_utc: $ts,
    org_id: $org_id,
    enforce_status_code: ($enforce_status|tonumber),
    rollback_status_code: ($rollback_status|tonumber),
    current_mode: $current_mode,
    evidence: {
      has_enforced_transition: $has_enforced,
      has_rollback_transition: $has_rollback,
      enforced_event_id: $enforced_event_id,
      rollback_event_id: $rollback_event_id
    },
    pass: $pass
  }' > "$report"

cat "$report"
if [[ "$pass" != "true" ]]; then
  exit 1
fi

echo "Rollback drill passed. Report: $report"
