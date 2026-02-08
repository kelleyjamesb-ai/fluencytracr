#!/usr/bin/env bash
set -euo pipefail

# CI bootstrap for audit database: creates schema and restricted role.
# Requires: DATABASE_URL, AUDIT_WRITER_PASSWORD

DB_URL="${DATABASE_URL:?DATABASE_URL must be set}"
AUDIT_PW="${AUDIT_WRITER_PASSWORD:?AUDIT_WRITER_PASSWORD must be set}"

# Extract database name from URL for GRANT
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

echo "Bootstrapping audit database..."

# Step 1: Run schema migration
psql "$DB_URL" -f backend/sql/001_create_audit_log.sql

# Step 2: Create audit_writer role and grants
psql "$DB_URL" \
  -v audit_writer_password="$AUDIT_PW" \
  -v dbname="$DB_NAME" \
  -f backend/sql/bootstrap_audit_roles.sql

echo "Audit database bootstrap complete."
