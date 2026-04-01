## Context
Phase 3 kickoff needs immediate hardening without blocking ongoing production validation. The current architecture mixes in-memory runtime state with DB-backed audit continuity.

## Goals / Non-Goals
- Goals:
- Preserve fail-closed governance behavior.
- Provide deterministic, auditable reevaluation traceability.
- Provide PM/governance-consumable compliance export surface.
- Non-Goals:
- Full schema migration for complete org domain replacement in this initial slice.
- Customer-wide enforcement rollout.

## Decisions
- Decision: Add causal metadata to `compliance_status_refreshed` events.
- Rationale: makes reevaluations traceable to triggering actions.

- Decision: Add `/orgs/:orgId/compliance/export` (JSON/CSV) with deterministic ordering and UTC timestamps.
- Rationale: gives governance teams exportable evidence without frontend-only scraping.

- Decision: Accept both camelCase and snake_case org creation payloads.
- Rationale: stabilizes operational scripts and API integrations.

## Risks / Trade-offs
- Risk: export payload includes metadata JSON that may need future field-level curation.
- Mitigation: keep endpoint role-gated and governed by allowlist policy.

## Migration Plan
- Current slice is additive and backward-compatible.
- Future slice will move to migration-backed durable org/config source-of-truth.

## Open Questions
- Should governance exports include signed hash chains or external attestations in Phase 3 or Phase 4?
