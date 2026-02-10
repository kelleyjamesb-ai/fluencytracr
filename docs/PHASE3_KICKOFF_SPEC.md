# Phase 3 Kickoff Spec (Planning Only)

## Objective
Start controlled continuous compliance operations and governance-grade reporting without introducing unsafe enforcement behavior.

## Scope
- Continuous compliance reevaluation cadence
- Governance reporting exports for enterprise review
- Controlled enforcement pilot criteria (feature-flagged, reversible)

## Non-Goals
- Broad enforcement rollout in Phase 3 kickoff
- Removal of shadow-mode safety path
- Changes that bypass unresolved-clause decision workflow

## Workstreams

### 1) Continuous Reevaluation Engine
- Trigger compliance reevaluation on:
  - new policy mappings
  - unresolved-clause decisions
  - relevant ingest updates
- Persist evaluation freshness metadata and source event linkage.
- Ensure deterministic recomputation for same inputs.

### 2) Governance Reporting Exports
- Add governance export package including:
  - organization compliance summary
  - control-level posture (`enabled|disabled|partial|unknown`)
  - unresolved decision log with rationale
  - compliance mode change history
- Include UTC timestamps and pagination-safe export behavior.

### 3) Controlled Enforcement Pilot
- Add explicit pilot gate criteria:
  - minimum event coverage threshold
  - unresolved queue below agreed threshold
  - governance reviewer approval
- Keep pilot behind allowlist and org-level flag.
- Provide immediate rollback to `shadow` mode.

## Acceptance Criteria
1. Reevaluation events are auditable and linked to source actions.
2. Reporting export is complete, deterministic, and governance-consumable.
3. Pilot org can toggle between `shadow` and `enforced` with full audit trail.
4. Non-pilot orgs remain in shadow mode by default.

## Risks and Mitigations
- Risk: false confidence from low-quality mappings.
  - Mitigation: unresolved-first workflow and explicit review gates.
- Risk: metadata overexposure in reports.
  - Mitigation: governance field review before widening scope.
- Risk: enforcement leakage beyond pilot.
  - Mitigation: hard allowlist + feature flag checks at API boundary.

## Initial Ticket Set
1. Backend: reevaluation scheduler/event trigger integration.
2. Backend: governance export endpoint + CSV/JSON payload format.
3. Frontend: admin reporting panel for export and mode visibility.
4. QA: end-to-end tests for reevaluation and export determinism.
5. Governance: approval checklist for enforcement pilot readiness.
