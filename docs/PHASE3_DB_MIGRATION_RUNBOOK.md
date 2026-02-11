# Phase 3 DB Migration Runbook

## Purpose
Apply Phase 3 compliance persistence tables before enabling durable-read paths in production.

## Migration Included
- `backend/prisma/migrations/20260211_phase3_compliance_persistence/migration.sql`

Creates:
- `PolicyDocument`
- `PolicyMapping`
- `CanonicalControlStateHistory`
- `ComplianceEvent`
- `ComplianceDecision`

## Preconditions
1. `DATABASE_URL` points to the production pooled Supabase URL.
2. `DIRECT_URL` points to the production direct Supabase URL (port `5432`).
3. Existing baseline tables already exist:
- `Organization`
- `AuditEvent`

## Apply (from repository root)
```bash
cd /Users/jkelley/Desktop/FluencyTracr
npm exec --workspace backend prisma migrate deploy
```

## Validate
1. Health check
```bash
curl -s https://www.fluencytracr.com/health | jq
```
Expected after migration:
- `status: "ok"`
- `db: "ok"`

2. DB readiness check
```bash
curl -s https://www.fluencytracr.com/ops/db/readiness -H "x-role: ADMIN" | jq
```
Expected after migration:
- `status: "ready"`
- `required_tables` populated
- no `missing_tables`

## Failure Modes
1. `database_schema_incomplete`
- Run `prisma migrate deploy` and redeploy application.

2. `database_unavailable`
- Verify `DATABASE_URL` and `DIRECT_URL` credentials and connectivity.

## Rollback
This migration only adds tables/indexes and does not drop existing structures.
Operational rollback path remains application-level:
1. Keep `COMPLIANCE_MODE=shadow`.
2. Keep pilot allowlists scoped.
3. If needed, redeploy previous app version while retaining schema additions.
