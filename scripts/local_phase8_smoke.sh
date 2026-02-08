#!/usr/bin/env bash
set -euo pipefail

# =========================
# Phase 8 smoke test
#
# Validates:
#   - Postgres container boots
#   - Prisma migration applies
#   - Backend boots with GOVERNANCE_ENFORCEMENT=ON
#   - Cookie auth can be issued via POST /auth/login
#   - POST /api/events returns 200 {status:"accepted", event_ids:[...]}
#   - FluencyEventIngest row exists in Postgres after acceptance
#   - Fail-closed: if DB is down, /api/events returns non-200 (503)
#
# Usage:
#   PORT=4000 ./scripts/local_phase8_smoke.sh
#   REQUIRE_DB_WRITE=1 PORT=4000 ./scripts/local_phase8_smoke.sh
# =========================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---- Helpers ----
log() { echo "[$(date +%H:%M:%S)] $*"; }
require() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }; }

# ---- Config ----
BACKEND_DIR="${BACKEND_DIR:-$ROOT_DIR/backend}"
PORT="${PORT:-4000}"
API_BASE="http://localhost:${PORT}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
LOGIN_PATH="/auth/login"
EVENTS_PATH="/api/events"

# DB (local docker Postgres)
PG_CONTAINER="${PG_CONTAINER:-fluencytracr-pg}"
PG_PORT="${PG_PORT:-5433}"
PG_USER="${PG_USER:-fluency}"
PG_PASS="${PG_PASS:-fluency}"
PG_DB="${PG_DB:-fluencytracr}"
export DATABASE_URL="${DATABASE_URL:-postgres://${PG_USER}:${PG_PASS}@localhost:${PG_PORT}/${PG_DB}}"

# Auth + governance
export JWT_SECRET="${JWT_SECRET:-dev_secret_change_me}"
export NODE_ENV="${NODE_ENV:-development}"
export GOVERNANCE_ENFORCEMENT="${GOVERNANCE_ENFORCEMENT:-ON}"

# Seed user setup
LOGIN_USERNAME="${LOGIN_USERNAME:-admin}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-admin}"
LOGIN_ROLE="${LOGIN_ROLE:-ADMIN}"

# Controls whether we enforce DB persistence + fail-closed checks
REQUIRE_DB_WRITE="${REQUIRE_DB_WRITE:-0}"

cleanup() {
  set +e
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" >/dev/null 2>&1; fi
  if [[ "${LEAVE_PG_RUNNING:-0}" == "0" ]]; then docker stop "$PG_CONTAINER" >/dev/null 2>&1; fi
  rm -f "${COOKIE_JAR:-}" /tmp/phase8_resp.json
}
trap cleanup EXIT

require docker
require psql
require curl
require node

# ---- 0) Prepare AUTH_SEED_USERS ----
log "Preparing AUTH_SEED_USERS (username:bcrypt_hash:ROLE)..."
PASSWORD_HASH="$(cd "$BACKEND_DIR" && node -e "const bcrypt=require('bcryptjs'); process.stdout.write(bcrypt.hashSync('${LOGIN_PASSWORD}',4));")"
if [[ -z "${PASSWORD_HASH}" ]]; then
  echo "FAIL: could not generate bcrypt hash (bcryptjs missing?)" >&2
  exit 1
fi
export AUTH_SEED_USERS="${LOGIN_USERNAME}:${PASSWORD_HASH}:${LOGIN_ROLE}"
log "AUTH_SEED_USERS prepared for user=${LOGIN_USERNAME} role=${LOGIN_ROLE}"

# ---- 1) Start Postgres ----
log "Starting Postgres container ${PG_CONTAINER} on port ${PG_PORT}..."
docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$PG_CONTAINER" \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD="$PG_PASS" \
  -e POSTGRES_DB="$PG_DB" \
  -p "${PG_PORT}:5432" \
  postgres:16 >/dev/null

log "Waiting for Postgres..."
for _ in $(seq 1 30); do
  if PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c "select 1" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# ---- 2) Run Prisma migration ----
log "Running Prisma migrations..."
(cd "$BACKEND_DIR" && npx prisma migrate deploy 2>&1) || {
  echo "FAIL: Prisma migration failed" >&2
  exit 1
}
log "Migrations applied."

# ---- 3) Baseline DB count ----
BASE_COUNT="0"
if PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc \
  "select 1 from information_schema.tables where table_name = 'FluencyEventIngest';" | grep -q 1; then
  BASE_COUNT="$(PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc \
    'select count(*) from "FluencyEventIngest";' | tr -d '[:space:]')"
  log "Baseline FluencyEventIngest count: ${BASE_COUNT}"
else
  log "WARNING: FluencyEventIngest table not found after migration."
fi

# ---- Port guard ----
if command -v lsof >/dev/null 2>&1 && lsof -i :"$PORT" >/dev/null 2>&1; then
  echo "FAIL: port $PORT already in use. Stop existing backend first." >&2
  lsof -i :"$PORT"
  exit 1
fi

# ---- 4) Start backend ----
log "Starting backend from ${BACKEND_DIR}..."
(cd "$BACKEND_DIR" && npm run dev) &
BACKEND_PID=$!

log "Waiting for backend readiness at ${API_BASE}${HEALTH_PATH}..."
for _ in $(seq 1 30); do
  if curl -sS "${API_BASE}${HEALTH_PATH}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Verify it's actually up
if ! curl -sS "${API_BASE}${HEALTH_PATH}" >/dev/null 2>&1; then
  echo "FAIL: backend did not become ready within 30s" >&2
  exit 1
fi
log "Backend is ready."

# ---- 5) Login and capture cookie ----
log "Logging in to obtain auth cookie..."
COOKIE_JAR="$(mktemp)"

LOGIN_RESP="$(curl -sS -c "$COOKIE_JAR" -X POST "${API_BASE}${LOGIN_PATH}" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${LOGIN_USERNAME}\",\"password\":\"${LOGIN_PASSWORD}\"}")"

if ! grep -q "token" "$COOKIE_JAR"; then
  echo "FAIL: login did not set token cookie. Response: ${LOGIN_RESP}" >&2
  exit 1
fi
log "Login cookie acquired."

# ---- 6) POST to /api/events using cookie jar ----
EVENT_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

log "Posting event to ${API_BASE}${EVENTS_PATH}..."

HTTP_CODE="$(curl -sS -o /tmp/phase8_resp.json -w "%{http_code}" \
  -X POST "${API_BASE}${EVENTS_PATH}" \
  -H "Content-Type: application/json" \
  -H "X-FluencyTracr-Schema-Version: 0.1" \
  -b "$COOKIE_JAR" \
  -d "{
    \"events\": [
      {
        \"event_type\": \"ai_output_disposition\",
        \"timestamp\": \"${EVENT_TS}\",
        \"risk_class\": \"low\",
        \"workflow_id\": \"wf-smoke-test\",
        \"disposition\": \"accepted\",
        \"edit_distance_bucket\": \"none\",
        \"verification_present\": false,
        \"time_to_action_ms\": 500
      }
    ]
  }")"

RESP="$(cat /tmp/phase8_resp.json)"
log "Response (HTTP ${HTTP_CODE}): ${RESP}"

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "FAIL: /api/events HTTP ${HTTP_CODE}. Response: ${RESP}" >&2
  exit 1
fi

# Validate response shape: {status:"accepted", event_ids:[...]}
node -e "
const resp = JSON.parse(process.argv[1]);
if (resp.status !== 'accepted') { console.error('status != accepted'); process.exit(2); }
if (!Array.isArray(resp.event_ids) || resp.event_ids.length === 0) { console.error('missing event_ids'); process.exit(2); }
console.log('event_id=' + resp.event_ids[0]);
" "$RESP" || { echo "FAIL: response shape mismatch. Response: ${RESP}" >&2; exit 1; }

EVENT_ID="$(node -e "console.log(JSON.parse(process.argv[1]).event_ids[0]);" "$RESP")"
log "Ingest returned accepted. event_id=${EVENT_ID}"

# ---- 7) DB persistence check ----
if [[ "${REQUIRE_DB_WRITE}" != "1" ]]; then
  log "SKIP: DB persistence check (set REQUIRE_DB_WRITE=1 to enable)."
  log "Phase 8 smoke test PASSED (ingest-only mode)."
  exit 0
fi

log "Checking DB row count increased..."
NEW_COUNT="$(PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc \
  'select count(*) from "FluencyEventIngest";' | tr -d '[:space:]')"
log "New count: ${NEW_COUNT} (was: ${BASE_COUNT})"

if [[ "$NEW_COUNT" -le "$BASE_COUNT" ]]; then
  echo "FAIL: DB row count did not increase (base=$BASE_COUNT new=$NEW_COUNT)" >&2
  exit 1
fi
log "PASS: DB write verified."

# Verify specific event_id
ROW_EXISTS="$(PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc \
  "select count(*) from \"FluencyEventIngest\" where event_id = '${EVENT_ID}';" | tr -d '[:space:]')"
if [[ "$ROW_EXISTS" != "1" ]]; then
  echo "FAIL: event_id=${EVENT_ID} not found in FluencyEventIngest" >&2
  exit 1
fi
log "PASS: event_id=${EVENT_ID} found in DB."

# ---- 8) Fail-closed check ----
log "Fail-closed check: stopping DB and retrying ingest..."
docker stop "$PG_CONTAINER" >/dev/null
sleep 1

HTTP_CODE_DOWN="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "${API_BASE}${EVENTS_PATH}" \
  -H "Content-Type: application/json" \
  -H "X-FluencyTracr-Schema-Version: 0.1" \
  -b "$COOKIE_JAR" \
  -d "{
    \"events\": [
      {
        \"event_type\": \"ai_output_disposition\",
        \"timestamp\": \"${EVENT_TS}\",
        \"risk_class\": \"low\",
        \"workflow_id\": \"wf-smoke-failclosed\",
        \"disposition\": \"accepted\",
        \"edit_distance_bucket\": \"none\",
        \"verification_present\": false,
        \"time_to_action_ms\": 100
      }
    ]
  }")"

if [[ "$HTTP_CODE_DOWN" == "200" ]]; then
  echo "FAIL: returned 200 accepted even though DB is down. Must fail-closed." >&2
  exit 1
fi
log "PASS: fail-closed observed (HTTP ${HTTP_CODE_DOWN})."

log "Phase 8 smoke test COMPLETE. All checks passed."
