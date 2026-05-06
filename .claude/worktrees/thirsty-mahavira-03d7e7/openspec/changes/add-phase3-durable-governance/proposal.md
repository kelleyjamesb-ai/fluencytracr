# Change: Add Phase 3 Durable Governance Operations

## Why
Phase 2 proved production beta viability, but governance-critical state is still partially bridge-based and vulnerable to cold-start drift. Phase 3 needs deterministic persistence, auditable causality, and governance exports before controlled enforcement pilot expansion.

## What Changes
- Add durable org/config handling semantics for governance-critical fields.
- Add compliance reevaluation causality metadata (`source_event_id`, `source_event_type`, `recomputed_at`).
- Add deterministic governance export endpoint for compliance events.
- Add payload compatibility for org creation (`min_group_size` and `minGroupSize`).
- Reinforce rollout requirement that strict `BETA_ORG_ALLOWLIST` is re-enabled before pilot widening.

## Impact
- Affected specs: `deployment`
- Affected code: `backend/src/app.ts`, `backend/tests/policy_compliance_api.test.ts`
- Risk: medium (governance behavior), mitigated by deterministic regression tests and fail-closed access controls.
