# Phase 3 Governance Closure Checklist

Status: Draft for PM + Governance Review

## 1. Preconditions
1. `BETA_ORG_ALLOWLIST` is explicitly set in production.
2. `ENFORCEMENT_PILOT_ORG_ALLOWLIST` is explicitly set in production.
3. `DATABASE_URL` and `DIRECT_URL` are valid and tested.
4. Compliance persistence migration has been deployed.

## 2. Required Technical Evidence
1. DB readiness
- `GET /ops/db/readiness` returns `status = ready`
- no `missing_tables`

2. Health and fail-closed observability
- `GET /health` returns `status = ok`, `db = ok`
- `GET /ops/failclosed` available and populated
- fail-closed incidents recorded as durable `AuditEvent` entries (`eventType = fail_closed`)

3. SLI/SLO metrics surface
- `GET /ops/metrics` available
- includes `compliance_status_availability`
- includes `compliance_status_fail_closed_rate`
- severity mapping resolves (`ok|warning|critical`)

4. Suppression regression evidence
- Run `/Users/jkelley/Desktop/FluencyTracr/scripts/ci_suppression_evidence.sh`
- archive:
  - `artifacts/phase3/suppression/suppression_evidence_manifest.json`
  - `artifacts/phase3/suppression/suppression_test_output.log`
- require `pass = true` in manifest

5. Replay determinism
- Run `/Users/jkelley/Desktop/FluencyTracr/scripts/prod_replay_determinism_validation.sh`
- report indicates `pass = true`

6. Export reproducibility
- Run `/Users/jkelley/Desktop/FluencyTracr/scripts/prod_export_reproducibility_cert.sh`
- report indicates `pass = true`

7. Enforcement rollback drill
- Run `/Users/jkelley/Desktop/FluencyTracr/scripts/prod_rollback_evidence_capture.sh`
- verify `shadow -> enforced -> shadow`
- verify rollback metadata (`rollback = true`, `mode_transition = enforced->shadow`)

## 3. Access-Control Validation
Run:
- `/Users/jkelley/Desktop/FluencyTracr/scripts/prod_access_control_validation.sh`

Expected:
- allowlisted ADMIN flow: `200/201/200/200`
- non-admin mode change: `403`
- non-allowlisted org status: `403`

## 4. Evidence Bundle (Recommended)
Run:
- `/Users/jkelley/Desktop/FluencyTracr/scripts/phase3_collect_evidence_bundle.sh`

Archive outputs under:
- `artifacts/phase3/bundle/<timestamp>/`

## 5. Governance Signoff Fields
1. PM signoff: `pending|approved`
2. Governance reviewer signoff: `pending|approved`
3. Engineering signoff: `pending|approved`
4. Open P1/P2 risks: `none|list`
5. Phase 3 closure decision: `go|hold`

## 6. Hold Conditions
Hold closure if any of the following are true:
1. DB readiness is not `ready`
2. replay/export cert reports fail
3. rollback drill fails or missing audit evidence
4. unresolved P1/P2 governance risks remain
