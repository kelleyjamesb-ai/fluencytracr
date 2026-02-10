#!/usr/bin/env bash
set -euo pipefail

# =========================
# Phase 8 smoke test
#
# Validates:
#   - Postgres container boots
#   - Prisma migration applies (FluencyEventIngest table created)
#   - Backend boots with GOVERNANCE_ENFORCEMENT=ON
#   - Cookie auth via POST /auth/login
#   - POST /api/events returns 200 {status:"accepted", event_ids:[...]}
#   - (REQUIRE_DB_WRITE=1) Row exists in Postgres after acceptance
#   - (REQUIRE_DB_WRITE=1) Fail-closed: DB down → non-200
#
# Usage:
#   PORT=4000 ./scripts/local_phase8_smoke.sh
#   REQUIRE_DB_WRITE=1 PORT=4000 ./scripts/local_phase8_smoke.sh
# =========================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---- Helpers ----
log() { echo "[$(date +%H:%M:%S)] $*"; }
die() { echo "FAIL: $*" >&2; exit 1; }
require() { command -v "$1" >/dev/null 2>&1 || die "Missing dependency: $1"; }

# ---- Config ----
BACKEND_DIR="${BACKEND_DIR:-$ROOT_DIR/backend}"
PORT="${PORT:-4000}"
API_BASE="http://localhost:${PORT}"
HEALTH_PATH="/health"
LOGIN_PATH="/auth/login"
EVENTS_PATH="/api/events"

# DB — Docker Postgres.
# IMPORTANT: Force-set DATABASE_URL so Prisma, backend, and psql all
# talk to the SAME database (the Docker container we start below).
# Any pre-existing DATABASE_URL in your shell is intentionally overridden.
PG_CONTAINER="${PG_CONTAINER:-fluencytracr-pg}"
PG_PORT="${PG_PORT:-5433}"
PG_USER="${PG_USER:-fluency}"
PG_PASS="${PG_PASS:-fluency}"
PG_DB="${PG_DB:-fluencytracr}"
export DATABASE_URL="postgres://${PG_USER}:${PG_PASS}@localhost:${PG_PORT}/${PG_DB}"
log "DATABASE_URL -> localhost:${PG_PORT}/${PG_DB} (Docker container)"

# Auth + governance
export JWT_SECRET="${JWT_SECRET:-dev_secret_change_me}"
export NODE_ENV="${NODE_ENV:-development}"
export GOVERNANCE_ENFORCEMENT="${GOVERNANCE_ENFORCEMENT:-ON}"
export PORT

# Seed user
LOGIN_USERNAME="${LOGIN_USERNAME:-admin}"
LOGIN_PASSWORD="${LOGIN_PASSWORD:-admin}"
LOGIN_ROLE="${LOGIN_ROLE:-ADMIN}"

REQUIRE_DB_WRITE="${REQUIRE_DB_WRITE:-0}"

# ---- Cleanup ----
cleanup() {
  set +e
  if [[ -n "${BACKEND_PID:-}" ]]; then kill "$BACKEND_PID" 2>/dev/null; wait "$BACKEND_PID" 2>/dev/null; fi
  if [[ "${LEAVE_PG_RUNNING:-0}" == "0" ]]; then docker stop "$PG_CONTAINER" >/dev/null 2>&1; fi
  rm -f "${COOKIE_JAR:-}" "${BACKEND_LOG:-}" /tmp/phase8_resp.json
}
trap cleanup EXIT

require docker
require psql
require curl
require node

# ---- 0) Prepare AUTH_SEED_USERS ----
log "Hashing seed password..."
PASSWORD_HASH="$(cd "$BACKEND_DIR" && node -e "process.stdout.write(require('bcryptjs').hashSync('${LOGIN_PASSWORD}',4))")"
[[ -n "$PASSWORD_HASH" ]] || die "bcrypt hash failed (run: cd backend && npm install)"
export AUTH_SEED_USERS="${LOGIN_USERNAME}:${PASSWORD_HASH}:${LOGIN_ROLE}"
log "Seed user ready: ${LOGIN_USERNAME} / ${LOGIN_ROLE}"

# ---- 1) Start Postgres ----
log "Starting Postgres container ${PG_CONTAINER} on port ${PG_PORT}..."
docker rm -f "$PG_CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$PG_CONTAINER" \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD="$PG_PASS" \
  -e POSTGRES_DB="$PG_DB" \
  -p "${PG_PORT}:5432" \
  postgres:16 >/dev/null

log "Waiting for Postgres to accept connections..."
for i in $(seq 1 30); do
  if PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c "select 1" >/dev/null 2>&1; then
    break
  fi
  if [[ "$i" == "30" ]]; then die "Postgres did not start within 30s"; fi
  sleep 1
done
log "Postgres ready."

# ---- 2) Prisma generate + migrate ----
log "Running prisma generate..."
(cd "$BACKEND_DIR" && npx prisma generate 2>&1) || die "prisma generate failed"

log "Running prisma migrate deploy..."
(cd "$BACKEND_DIR" && npx prisma migrate deploy 2>&1) || die "prisma migrate deploy failed"
log "Migrations applied."

# Verify the table exists
TABLE_EXISTS="$(PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc \
  "select count(*) from information_schema.tables where table_name = 'FluencyEventIngest';" | tr -d '[:space:]')"
if [[ "$TABLE_EXISTS" != "1" ]]; then
  die "FluencyEventIngest table not found after migration. Check schema.prisma and migrations/."
fi
log "FluencyEventIngest table confirmed."

BASE_COUNT="$(PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc \
  'select count(*) from "FluencyEventIngest";' | tr -d '[:space:]')"
log "Baseline row count: ${BASE_COUNT}"

# ---- 3) Port guard ----
if command -v lsof >/dev/null 2>&1 && lsof -i :"$PORT" >/dev/null 2>&1; then
  die "Port $PORT already in use. Run: kill -9 \$(lsof -ti :${PORT})"
fi

# ---- 4) Pre-compile shared + backend ----
# On iCloud-synced machines, ts-node transpilation at runtime takes minutes
# due to filesystem I/O contention. Pre-compile everything with tsc, then
# run with plain `node` which starts in <2s.
if [[ -f "$ROOT_DIR/shared/package.json" ]]; then
  log "Building shared..."
  (cd "$ROOT_DIR/shared" && npm run build 2>&1) || log "WARNING: shared build had errors (may be OK)"
fi

log "Building backend..."
# Main tsconfig includes "tests" which causes TS6059 (tests outside rootDir).
# Use a temporary tsconfig that only compiles src/.
cat > "$BACKEND_DIR/tsconfig.smoke.json" <<'TSCONF'
{
  "extends": "./tsconfig.json",
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
TSCONF
(cd "$BACKEND_DIR" && npx tsc -p tsconfig.smoke.json 2>&1) || die "Backend build failed. Check TypeScript errors above."
rm -f "$BACKEND_DIR/tsconfig.smoke.json"
log "Build complete."

# ---- 5) Start backend ----
# Run pre-compiled JS — no transpilation, no file watcher. Instant startup.
BACKEND_LOG="$(mktemp)"
log "Starting backend (port ${PORT})..."
log "Backend log: ${BACKEND_LOG}"
(cd "$BACKEND_DIR" && node dist/index.js 2>&1) > "$BACKEND_LOG" &
BACKEND_PID=$!

BACKEND_TIMEOUT="${BACKEND_TIMEOUT:-180}"
log "Waiting up to ${BACKEND_TIMEOUT}s for backend at ${API_BASE}${HEALTH_PATH}..."
for i in $(seq 1 "$BACKEND_TIMEOUT"); do
  if curl -sf "${API_BASE}${HEALTH_PATH}" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    log "--- Backend output ---"
    cat "$BACKEND_LOG" >&2
    log "--- End backend output ---"
    die "Backend process exited. See output above."
  fi
  if [[ "$i" == "$BACKEND_TIMEOUT" ]]; then
    log "--- Backend output (timeout) ---"
    cat "$BACKEND_LOG" >&2
    log "--- End backend output ---"
    die "Backend not ready within ${BACKEND_TIMEOUT}s"
  fi
  # Progress indicator every 15s
  if (( i % 15 == 0 )); then log "  ...still waiting (${i}s)"; fi
  sleep 1
done
log "Backend is ready."

# ---- 6) Login ----
log "Logging in as ${LOGIN_USERNAME}..."
COOKIE_JAR="$(mktemp)"
LOGIN_RESP="$(curl -sS -c "$COOKIE_JAR" -X POST "${API_BASE}${LOGIN_PATH}" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${LOGIN_USERNAME}\",\"password\":\"${LOGIN_PASSWORD}\"}")"

if ! grep -q "token" "$COOKIE_JAR"; then
  die "Login did not set token cookie. Response: ${LOGIN_RESP}"
fi
log "Login cookie acquired."

# ---- 7) POST /api/events ----
EVENT_TS="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
log "Posting event to ${EVENTS_PATH}..."

HTTP_CODE="$(curl -sS -o /tmp/phase8_resp.json -w "%{http_code}" \
  -X POST "${API_BASE}${EVENTS_PATH}" \
  -H "Content-Type: application/json" \
  -H "X-FluencyTracr-Schema-Version: 0.1" \
  -b "$COOKIE_JAR" \
  -d '{
    "events": [
      {
        "event_type": "ai_output_disposition",
        "timestamp": "'"${EVENT_TS}"'",
        "risk_class": "low",
        "workflow_id": "wf-smoke-test",
        "disposition": "accepted",
        "edit_distance_bucket": "none",
        "verification_present": false,
        "time_to_action_ms": 500
      }
    ]
  }')"

RESP="$(cat /tmp/phase8_resp.json)"
log "Response (HTTP ${HTTP_CODE}): ${RESP}"

[[ "$HTTP_CODE" == "200" ]] || die "/api/events HTTP ${HTTP_CODE}. Response: ${RESP}"

node -e "
  var r = JSON.parse(process.argv[1]);
  if (r.status !== 'accepted') process.exit(2);
  if (!Array.isArray(r.event_ids) || r.event_ids.length === 0) process.exit(2);
" "$RESP" || die "Response shape mismatch: ${RESP}"

EVENT_ID="$(node -e "console.log(JSON.parse(process.argv[1]).event_ids[0])" "$RESP")"
log "PASS: event accepted. event_id=${EVENT_ID}"

# ---- 8) DB persistence check (opt-in) ----
if [[ "$REQUIRE_DB_WRITE" != "1" ]]; then
  log "SKIP: DB checks (set REQUIRE_DB_WRITE=1 to enable)."
  log ""
  log "=== Phase 8 smoke test PASSED (ingest-only mode) ==="
  exit 0
fi

log "Checking DB persistence..."
NEW_COUNT="$(PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc \
  'select count(*) from "FluencyEventIngest";' | tr -d '[:space:]')"
log "Row count: ${BASE_COUNT} -> ${NEW_COUNT}"
[[ "$NEW_COUNT" -gt "$BASE_COUNT" ]] || die "Row count did not increase (${BASE_COUNT} -> ${NEW_COUNT})"
log "PASS: DB write verified."

ROW_EXISTS="$(PGPASSWORD="$PG_PASS" psql -h localhost -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -tAc \
  "select count(*) from \"FluencyEventIngest\" where event_id = '${EVENT_ID}';" | tr -d '[:space:]')"
[[ "$ROW_EXISTS" == "1" ]] || die "event_id=${EVENT_ID} not found in DB"
log "PASS: event_id=${EVENT_ID} found in DB."

# ---- 9) Fail-closed check ----
log "Fail-closed: stopping Postgres..."
docker stop "$PG_CONTAINER" >/dev/null
LEAVE_PG_RUNNING=1
sleep 2

HTTP_CODE_DOWN="$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "${API_BASE}${EVENTS_PATH}" \
  -H "Content-Type: application/json" \
  -H "X-FluencyTracr-Schema-Version: 0.1" \
  -b "$COOKIE_JAR" \
  -d '{
    "events": [
      {
        "event_type": "ai_output_disposition",
        "timestamp": "'"${EVENT_TS}"'",
        "risk_class": "low",
        "workflow_id": "wf-smoke-failclosed",
        "disposition": "accepted",
        "edit_distance_bucket": "none",
        "verification_present": false,
        "time_to_action_ms": 100
      }
    ]
  }')"

[[ "$HTTP_CODE_DOWN" != "200" ]] || die "Returned 200 with DB down — fail-closed violated."
log "PASS: fail-closed (HTTP ${HTTP_CODE_DOWN})."

log ""
log "=== Phase 8 smoke test COMPLETE. All checks passed. ==="
