#!/usr/bin/env bash
set -euo pipefail

# Production access-control validation for internal admin beta.
#
# Required environment variables:
#   BASE_URL                e.g. https://www.fluencytracr.com
#   ALLOWLISTED_ORG         org id expected to be beta-allowlisted
#
# Optional environment variables:
#   BLOCKED_ORG             default: org-not-allowlisted
#   ADMIN_ROLE              default: ADMIN
#   NON_ADMIN_ROLE          default: EXEC_VIEWER
#   POLICY_TEXT             default: sample policy text
#   SCHEMA_VERSION          default: 0.1
#
# Example:
#   BASE_URL="https://www.fluencytracr.com" \
#   ALLOWLISTED_ORG="org-123" \
#   BLOCKED_ORG="org-not-allowlisted" \
#   ./scripts/prod_access_control_validation.sh

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd curl
require_cmd jq

BASE_URL="${BASE_URL:-}"
ALLOWLISTED_ORG="${ALLOWLISTED_ORG:-}"
BLOCKED_ORG="${BLOCKED_ORG:-org-not-allowlisted}"
ADMIN_ROLE="${ADMIN_ROLE:-ADMIN}"
NON_ADMIN_ROLE="${NON_ADMIN_ROLE:-EXEC_VIEWER}"
POLICY_TEXT="${POLICY_TEXT:-AI enabled for approved workflows. External sharing disabled.}"
SCHEMA_VERSION="${SCHEMA_VERSION:-0.1}"

if [[ -z "$BASE_URL" || -z "$ALLOWLISTED_ORG" ]]; then
  echo "BASE_URL and ALLOWLISTED_ORG are required." >&2
  exit 1
fi

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

request() {
  local name="$1"
  local method="$2"
  local path="$3"
  local role="${4:-}"
  local data="${5:-}"
  local body_file="$tmpdir/${name}.json"
  local code

  local -a args
  args+=(-sS -X "$method" "${BASE_URL}${path}" -H "Content-Type: application/json")
  if [[ -n "$role" ]]; then
    args+=(-H "x-role: $role")
  fi
  if [[ "$method" != "GET" ]]; then
    args+=(-H "X-FluencyTracr-Schema-Version: ${SCHEMA_VERSION}")
  fi
  if [[ -n "$data" ]]; then
    args+=(-d "$data")
  fi

  code="$(curl "${args[@]}" -o "$body_file" -w "%{http_code}")"
  echo "$code"
}

assert_status() {
  local actual="$1"
  local expected="$2"
  local label="$3"
  local body_file="$4"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: ${label} (expected ${expected}, got ${actual})" >&2
    echo "Body:" >&2
    cat "$body_file" >&2
    exit 1
  fi
  echo "PASS: ${label} (${actual})"
}

echo "== Production Access-Control Validation =="
echo "BASE_URL=${BASE_URL}"
echo "ALLOWLISTED_ORG=${ALLOWLISTED_ORG}"
echo "BLOCKED_ORG=${BLOCKED_ORG}"

# 1) Allowlisted ADMIN success path
status_code="$(request allowlisted_status GET "/orgs/${ALLOWLISTED_ORG}/compliance/status" "$ADMIN_ROLE")"
assert_status "$status_code" "200" "allowlisted ADMIN compliance status" "$tmpdir/allowlisted_status.json"

upload_payload="$(jq -cn --arg content "$POLICY_TEXT" '{file_name:"prod-policy.txt",content:$content}')"
upload_code="$(request allowlisted_upload POST "/orgs/${ALLOWLISTED_ORG}/policies/upload" "$ADMIN_ROLE" "$upload_payload")"
assert_status "$upload_code" "201" "allowlisted ADMIN policy upload" "$tmpdir/allowlisted_upload.json"
policy_id="$(jq -r '.policy_id // empty' "$tmpdir/allowlisted_upload.json")"
if [[ -z "$policy_id" ]]; then
  echo "FAIL: upload did not return policy_id" >&2
  cat "$tmpdir/allowlisted_upload.json" >&2
  exit 1
fi
echo "INFO: policy_id=${policy_id}"

map_code="$(request allowlisted_map POST "/orgs/${ALLOWLISTED_ORG}/policies/${policy_id}/map" "$ADMIN_ROLE" '{}')"
assert_status "$map_code" "200" "allowlisted ADMIN policy map" "$tmpdir/allowlisted_map.json"

events_code="$(request allowlisted_events GET "/orgs/${ALLOWLISTED_ORG}/compliance/events" "$ADMIN_ROLE")"
assert_status "$events_code" "200" "allowlisted ADMIN compliance events" "$tmpdir/allowlisted_events.json"

# 2) Non-admin blocked for admin action
deny_code="$(request non_admin_mode PATCH "/orgs/${ALLOWLISTED_ORG}/compliance/mode" "$NON_ADMIN_ROLE" '{"mode":"enforced","rationale":"validation"}')"
assert_status "$deny_code" "403" "non-admin denied on compliance mode update" "$tmpdir/non_admin_mode.json"

# 3) Non-allowlisted org denied
blocked_code="$(request blocked_org_status GET "/orgs/${BLOCKED_ORG}/compliance/status" "$ADMIN_ROLE")"
assert_status "$blocked_code" "403" "non-allowlisted org denied" "$tmpdir/blocked_org_status.json"

echo "All production access-control checks passed."
