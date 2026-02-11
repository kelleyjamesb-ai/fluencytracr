#!/usr/bin/env bash
set -euo pipefail

# Validates deterministic replay behavior for compliance status and exports.
#
# Required env vars:
#   BASE_URL         e.g. https://www.fluencytracr.com
#   ORG_ID           org id to validate
#
# Optional env vars:
#   ADMIN_ROLE       default: ADMIN
#   OUT_DIR          default: artifacts/phase3/replay

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq
require_cmd shasum

BASE_URL="${BASE_URL:-}"
ORG_ID="${ORG_ID:-}"
ADMIN_ROLE="${ADMIN_ROLE:-ADMIN}"
OUT_DIR="${OUT_DIR:-artifacts/phase3/replay}"

if [[ -z "$BASE_URL" || -z "$ORG_ID" ]]; then
  echo "BASE_URL and ORG_ID are required." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

ts="$(date -u +%Y%m%dT%H%M%SZ)"
report="$OUT_DIR/replay_determinism_${ORG_ID}_${ts}.json"

request_json() {
  local path="$1"
  local out="$2"
  local status
  status="$(curl -sS -o "$out" -w "%{http_code}" "$BASE_URL$path" -H "x-role: $ADMIN_ROLE")"
  if [[ "$status" != "200" ]]; then
    echo "Request failed for $path (status $status)" >&2
    cat "$out" >&2
    exit 1
  fi
}

request_text() {
  local path="$1"
  local out="$2"
  local status
  status="$(curl -sS -o "$out" -w "%{http_code}" "$BASE_URL$path" -H "x-role: $ADMIN_ROLE")"
  if [[ "$status" != "200" ]]; then
    echo "Request failed for $path (status $status)" >&2
    cat "$out" >&2
    exit 1
  fi
}

urlencode() {
  jq -rn --arg v "$1" '$v|@uri'
}

status_now="$workdir/status_now.json"
request_json "/orgs/$ORG_ID/compliance/status" "$status_now"
as_of="$(jq -r '.as_of' "$status_now")"
if [[ -z "$as_of" || "$as_of" == "null" ]]; then
  echo "No as_of returned from compliance status" >&2
  cat "$status_now" >&2
  exit 1
fi

status_a="$workdir/status_a.json"
status_b="$workdir/status_b.json"
encoded_as_of="$(urlencode "$as_of")"
request_json "/orgs/$ORG_ID/compliance/status?as_of=${encoded_as_of}" "$status_a"
request_json "/orgs/$ORG_ID/compliance/status?as_of=${encoded_as_of}" "$status_b"

jq -S 'del(.as_of)' "$status_a" > "$workdir/status_a_norm.json"
jq -S 'del(.as_of)' "$status_b" > "$workdir/status_b_norm.json"
status_sha_a="$(shasum -a 256 "$workdir/status_a_norm.json" | awk '{print $1}')"
status_sha_b="$(shasum -a 256 "$workdir/status_b_norm.json" | awk '{print $1}')"
status_match=false
if [[ "$status_sha_a" == "$status_sha_b" ]]; then
  status_match=true
fi

export_a="$workdir/export_a.json"
export_b="$workdir/export_b.json"
request_json "/orgs/$ORG_ID/compliance/export" "$export_a"
request_json "/orgs/$ORG_ID/compliance/export" "$export_b"

jq -S 'del(.generated_at_utc)' "$export_a" > "$workdir/export_a_norm.json"
jq -S 'del(.generated_at_utc)' "$export_b" > "$workdir/export_b_norm.json"
export_sha_a="$(shasum -a 256 "$workdir/export_a_norm.json" | awk '{print $1}')"
export_sha_b="$(shasum -a 256 "$workdir/export_b_norm.json" | awk '{print $1}')"
export_match=false
if [[ "$export_sha_a" == "$export_sha_b" ]]; then
  export_match=true
fi

csv_a="$workdir/export_a.csv"
csv_b="$workdir/export_b.csv"
request_text "/orgs/$ORG_ID/compliance/export?format=csv" "$csv_a"
request_text "/orgs/$ORG_ID/compliance/export?format=csv" "$csv_b"
csv_sha_a="$(shasum -a 256 "$csv_a" | awk '{print $1}')"
csv_sha_b="$(shasum -a 256 "$csv_b" | awk '{print $1}')"
csv_match=false
if [[ "$csv_sha_a" == "$csv_sha_b" ]]; then
  csv_match=true
fi

all_pass=false
if [[ "$status_match" == true && "$export_match" == true && "$csv_match" == true ]]; then
  all_pass=true
fi

jq -n \
  --arg ts "$ts" \
  --arg org_id "$ORG_ID" \
  --arg as_of "$as_of" \
  --arg status_sha_a "$status_sha_a" \
  --arg status_sha_b "$status_sha_b" \
  --arg export_sha_a "$export_sha_a" \
  --arg export_sha_b "$export_sha_b" \
  --arg csv_sha_a "$csv_sha_a" \
  --arg csv_sha_b "$csv_sha_b" \
  --argjson status_match "$status_match" \
  --argjson export_match "$export_match" \
  --argjson csv_match "$csv_match" \
  --argjson pass "$all_pass" \
  '{
    generated_at_utc: $ts,
    org_id: $org_id,
    as_of: $as_of,
    checks: {
      status_replay: { match: $status_match, sha_a: $status_sha_a, sha_b: $status_sha_b },
      export_json: { match: $export_match, sha_a: $export_sha_a, sha_b: $export_sha_b },
      export_csv: { match: $csv_match, sha_a: $csv_sha_a, sha_b: $csv_sha_b }
    },
    pass: $pass
  }' > "$report"

cat "$report"
if [[ "$all_pass" != true ]]; then
  exit 1
fi

echo "Replay determinism validation passed. Report: $report"
