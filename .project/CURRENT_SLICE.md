# Current Slice Contract

- Work item id: `backend-tenant-isolation-fixes`
- Title: `Backend tenant isolation fixes for ingest, reconstructed traces, and aggregates`
- Status: `completed`

## Summary

Fixed three tenant-boundary bugs validated from review feedback: unified telemetry ingest now fail-closes on nested `org_id` mismatch, reconstructed trace queries are scoped to `req.authOrgId`, and workflow aggregate refresh is org-scoped when workflow IDs overlap across tenants.

## Scope Paths

- `backend/src/app.ts`
- `backend/src/services/classification-pipeline.service.ts`
- `backend/src/repositories/classification.repository.ts`
- `backend/tests/unified_telemetry_ingest.test.ts`
- `backend/tests/contracts.test.ts`
- `backend/tests/services/classification-pipeline.service.test.ts`
- `backend/tests/auth_hardening.test.ts`

## Key Risks

- Route-level auth can appear correct while nested event payloads bypass org checks.
- Reconstructed trace filtering must not break legitimate same-org access.
- Aggregate refresh changes can regress classification persistence or repository behavior if interface updates are incomplete.

## Planned Checks

- Add failing tests for cross-org unified telemetry ingest rejection.
- Add failing tests for reconstructed trace tenant scoping.
- Add failing tests for workflow aggregate refresh with same workflow ID across orgs.
- Run targeted backend Jest suites for the touched paths.

## Evaluator Command Profile

`targeted` by default:

- `npm run test:ci --workspace backend -- --runTestsByPath tests/unified_telemetry_ingest.test.ts tests/contracts.test.ts tests/services/classification-pipeline.service.test.ts`
- `npm run test:ci --workspace backend -- --runTestsByPath tests/auth_hardening.test.ts`

Escalate to `strict` only if the slice becomes cross-cutting:

- `./harness/scripts/verify.sh`
- `npm run build --workspace shared`
- `npm run test:ci --workspace backend`
- `npm test --workspace frontend`

## Evaluator Pass Criteria

- Only declared scope paths are changed.
- Unified telemetry ingest rejects nested `org_id` mismatches with no cross-org persistence.
- `/api/traces/reconstructed` returns only traces for the authenticated org.
- Workflow aggregate refresh excludes outcomes from other orgs that share the workflow ID.
- Targeted backend tests pass.
- No blocker remains unrecorded in `.project/PROGRESS.md`.

## Specialists To Consult

- Backend/auth specialist if RBAC scoping behavior is ambiguous.
- Review specialist if evaluator results suggest collateral tenancy risk.

## Next Handoff Note

Completed with targeted regression coverage and targeted backend verification. Next bounded unit should return to the declared phase-03 queue item unless new review findings justify another isolated repair slice.
