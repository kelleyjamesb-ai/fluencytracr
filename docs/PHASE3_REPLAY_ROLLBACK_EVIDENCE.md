# Phase 3 Replay and Rollback Evidence Guide

## Purpose
Generate governance-ready evidence for Phase 3 exit gates:
1. Deterministic replay at `as_of` timepoints
2. Controlled enforcement rollback drill

## Scripts

1. Replay determinism validation
- Script: `/Users/jkelley/Desktop/FluencyTracr/scripts/prod_replay_determinism_validation.sh`
- Output: `artifacts/phase3/replay/replay_determinism_<org>_<timestamp>.json`

2. Enforcement rollback drill
- Script: `/Users/jkelley/Desktop/FluencyTracr/scripts/prod_enforcement_rollback_drill.sh`
- Output: `artifacts/phase3/rollback/rollback_drill_<org>_<timestamp>.json`

3. Rollback drill evidence capture (recommended)
- Script: `/Users/jkelley/Desktop/FluencyTracr/scripts/prod_rollback_evidence_capture.sh`
- Output directory:
  - rollback drill report
  - compliance mode events snapshot
  - `/ops/metrics` snapshot
  - `/ops/failclosed` snapshot
  - final compliance status snapshot
  - evidence index JSON

## Prerequisites
1. Org is internal beta allowlisted for compliance endpoints.
2. Org is in enforcement pilot allowlist for rollback drill.
3. Endpoint access role available (`x-role: ADMIN`).
4. Phase 3 compliance migration applied.

## Run Commands

### Replay Determinism
```bash
cd /Users/jkelley/Desktop/FluencyTracr
BASE_URL="https://www.fluencytracr.com" \
ORG_ID="org-<allowlisted-org-id>" \
./scripts/prod_replay_determinism_validation.sh
```

Pass criteria:
- `checks.status_replay.match = true`
- `checks.export_json.match = true` (normalized)
- `checks.export_csv.match = true`
- `pass = true`

### Rollback Drill
```bash
cd /Users/jkelley/Desktop/FluencyTracr
BASE_URL="https://www.fluencytracr.com" \
ORG_ID="org-<pilot-org-id>" \
./scripts/prod_enforcement_rollback_drill.sh
```

### Rollback Drill With Full Evidence Capture
```bash
cd /Users/jkelley/Desktop/FluencyTracr
BASE_URL="https://www.fluencytracr.com" \
ORG_ID="org-<pilot-org-id>" \
./scripts/prod_rollback_evidence_capture.sh
```

Pass criteria:
- mode transition `shadow -> enforced` observed
- mode transition `enforced -> shadow` observed with `rollback = true`
- current mode resolves to `shadow`
- `pass = true`

## Evidence Archiving Checklist
1. Save generated report files in project artifacts.
2. Capture matching `/orgs/:orgId/compliance/events?event_type=compliance_mode_updated` response snapshot.
3. Attach run timestamps, org ids, and commit SHA to governance review packet.
4. Record unresolved risks or anomalies in Phase 3 handoff.

## Failure Handling
1. If replay determinism fails:
- inspect event ordering and generated payload fields
- re-run with no data mutations between runs

2. If rollback drill fails:
- verify pilot allowlist and role permissions
- inspect compliance mode event chain
- revert org to `shadow` manually if needed
