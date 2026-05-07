# Phase 3 SLO and Alerting Runbook

## Purpose
Define measurable operational checks for Phase 3 fail-closed governance posture.

## Data Sources
1. `GET /ops/metrics`
2. `GET /ops/failclosed`
3. `GET /ops/db/readiness`
4. `GET /health`

All ops endpoints require role header (`x-role`) with one of:
- `ADMIN`
- `EXEC_VIEWER`
- `ENABLEMENT_LEAD`

## Primary SLIs

1. Compliance status availability
- Field: `sli.compliance_status_availability.value`
- Formula: `compliance_status_success / compliance_status_requests`
- Target env var: `SLO_COMPLIANCE_STATUS_AVAILABILITY`
- Default target: `0.999`

2. Compliance status fail-closed rate
- Field: `sli.compliance_status_fail_closed_rate.value`
- Formula: `compliance_status_fail_closed / compliance_status_requests`
- Target max: `1 - SLO_COMPLIANCE_STATUS_AVAILABILITY`

3. DB readiness state
- Field: `db_readiness` from `/ops/metrics`
- Expected normal state: `ready` (or `not_configured` in local/test)

## Alert Policy

1. Critical
- Condition: `sli.compliance_status_availability.breached = true`
- Action: page on-call and force pilot org mode to `shadow` if currently `enforced`

2. Warning
- Condition: `alert_context.severity = "warning"`
- Action: investigate top routes from `alert_context.top_fail_closed_routes`

3. DB schema readiness failure
- Condition: `/ops/db/readiness` returns `schema_incomplete`
- Action: run migration deploy and redeploy

## Investigation Steps

1. Pull current metrics:
```bash
curl -s https://www.fluencytracr.com/ops/metrics -H "x-role: ADMIN" | jq
```

2. Inspect fail-closed route and reason distribution:
```bash
curl -s https://www.fluencytracr.com/ops/failclosed -H "x-role: ADMIN" | jq
```

3. Check DB readiness:
```bash
curl -s https://www.fluencytracr.com/ops/db/readiness -H "x-role: ADMIN" | jq
```

4. Validate health:
```bash
curl -s https://www.fluencytracr.com/health | jq
```

## Rollback Rule
If critical SLO breach persists for 15 minutes during pilot enforcement:
1. Switch affected org(s) to `shadow` mode via compliance mode endpoint.
2. Keep allowlists unchanged.
3. Capture `/ops/metrics` and `/ops/failclosed` snapshots for governance review.
