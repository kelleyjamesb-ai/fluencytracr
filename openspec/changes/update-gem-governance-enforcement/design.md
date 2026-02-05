## Context
GEM TG5 FINAL mandates strict governance controls. Enforcement must be technical, deterministic, and fail-closed. The system must avoid any ordering, scoring, aggregation, or cross-window state.

## Goals / Non-Goals
- Goals:
  - Enforce GEM rules at ingestion, evaluation, and output boundaries.
  - Prove enforcement with deterministic tests and CI checks.
  - Fail closed when ambiguity or uncertainty exists.
- Non-Goals:
  - Adding new signals, metrics, UI, dashboards, or reporting.
  - Introducing ordering, scoring, trends, or temporal aggregation.

## Decisions
- Decision: Centralize forbidden keys in shared constants and enforce at ingestion and schema linting.
- Decision: Single global enforcement flag read once at startup, stored centrally, and used everywhere.
- Decision: Suppression gate runs before any response serialization or export.
- Decision: Remove unsafe contracts and routes rather than attempt partial compliance.

## Risks / Trade-offs
- Risk: Breaking API/contract changes for existing clients.
  - Mitigation: Provide clear tests and change mapping; suppress unsupported outputs.
- Risk: Hidden aggregation surfaces in legacy routes.
  - Mitigation: Default suppress or delete when safety cannot be proven.

## Migration Plan
1. Add enforcement scaffolding and CI checks.
2. Update contracts and serializers to remove prohibited fields.
3. Update inference and routes to enforce window isolation and suppression.
4. Add deterministic tests and wire into CI.

## Open Questions
- Are there any client integrations that require a compatibility period for removed schemas/routes?
