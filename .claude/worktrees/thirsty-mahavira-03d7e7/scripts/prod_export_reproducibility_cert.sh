#!/usr/bin/env bash
set -euo pipefail

# Phase 3 governance export reproducibility certification.
#
# Required env vars:
#   BASE_URL    e.g. https://www.fluencytracr.com
#   ORG_ID      allowlisted org id
#
# Optional env vars:
#   ADMIN_ROLE  default: ADMIN
#   OUT_DIR     default: artifacts/phase3/export
#   LIMIT       default: 50

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
OUT_DIR="${OUT_DIR:-artifacts/phase3/export}"
LIMIT="${LIMIT:-50}"

if [[ -z "$BASE_URL" || -z "$ORG_ID" ]]; then
  echo "BASE_URL and ORG_ID are required." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

ts="$(date -u +%Y%m%dT%H%M%SZ)"
report="$OUT_DIR/export_repro_cert_${ORG_ID}_${ts}.json"

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

# JSON export determinism (normalize generated_at_utc)
json_a="$workdir/export_a.json"
json_b="$workdir/export_b.json"
request_json "/orgs/$ORG_ID/compliance/export" "$json_a"
request_json "/orgs/$ORG_ID/compliance/export" "$json_b"

jq -S 'del(.generated_at_utc)' "$json_a" > "$workdir/export_a_norm.json"
jq -S 'del(.generated_at_utc)' "$json_b" > "$workdir/export_b_norm.json"
json_sha_a="$(shasum -a 256 "$workdir/export_a_norm.json" | awk '{print $1}')"
json_sha_b="$(shasum -a 256 "$workdir/export_b_norm.json" | awk '{print $1}')"
json_match=false
if [[ "$json_sha_a" == "$json_sha_b" ]]; then
  json_match=true
fi

# CSV export determinism (byte stable expected)
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

# Pagination determinism for events endpoint
fetch_event_ids() {
  local out="$1"
  : > "$out"
  local cursor="0"

  while true; do
    local page="$workdir/page_${cursor}.json"
    request_json "/orgs/$ORG_ID/compliance/events?limit=${LIMIT}&cursor=${cursor}" "$page"
    jq -r '.events[]?.event_id' "$page" >> "$out"
    local next_cursor
    next_cursor="$(jq -r '.next_cursor // empty' "$page")"
    if [[ -z "$next_cursor" || "$next_cursor" == "null" ]]; then
      break
    fi
    cursor="$next_cursor"
  done
}

ids_a="$workdir/ids_a.txt"
ids_b="$workdir/ids_b.txt"
fetch_event_ids "$ids_a"
fetch_event_ids "$ids_b"
ids_sha_a="$(shasum -a 256 "$ids_a" | awk '{print $1}')"
ids_sha_b="$(shasum -a 256 "$ids_b" | awk '{print $1}')"
ids_match=false
if [[ "$ids_sha_a" == "$ids_sha_b" ]]; then
  ids_match=true
fi

event_count="$(wc -l < "$ids_a" | tr -d ' ')"

pass=false
if [[ "$json_match" == true && "$csv_match" == true && "$ids_match" == true ]]; then
  pass=true
fi

jq -n \
  --arg ts "$ts" \
  --arg org_id "$ORG_ID" \
  --argjson event_count "$event_count" \
  --arg json_sha_a "$json_sha_a" \
  --arg json_sha_b "$json_sha_b" \
  --arg csv_sha_a "$csv_sha_a" \
  --arg csv_sha_b "$csv_sha_b" \
  --arg ids_sha_a "$ids_sha_a" \
  --arg ids_sha_b "$ids_sha_b" \
  --argjson json_match "$json_match" \
  --argjson csv_match "$csv_match" \
  --argjson ids_match "$ids_match" \
  --argjson pass "$pass" \
  '{
    generated_at_utc: $ts,
    org_id: $org_id,
    event_count: $event_count,
    checks: {
      export_json_normalized: { match: $json_match, sha_a: $json_sha_a, sha_b: $json_sha_b },
      export_csv_byte_stable: { match: $csv_match, sha_a: $csv_sha_a, sha_b: $csv_sha_b },
      events_pagination_order: { match: $ids_match, sha_a: $ids_sha_a, sha_b: $ids_sha_b }
    },
    pass: $pass
  }' > "$report"

cat "$report"
if [[ "$pass" != true ]]; then
  exit 1
fi

echo "Export reproducibility certification passed. Report: $report"
