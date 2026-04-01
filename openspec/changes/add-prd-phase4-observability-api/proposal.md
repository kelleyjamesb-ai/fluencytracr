# Change: PRD Phase 4 — Workflow observability API

## Why

PRD §7–§8 require an **observability** read path that exposes only **workflow-level** distributions and qualitative hints, without ranks, trends, or individual execution identifiers.

## What changes

- `GET /api/observability/:orgId?window=30d|60d` with roles aligned to board snapshot consumers.
- `backend/src/observability_aggregate.ts` builds rollups from fluency events (org_unit scoping, window filter, per-execution Phase 2/3 pipeline).
- Shared `ObservabilityResponseSchema` and related row/distribution schemas.

## Impact

- Backend + shared Zod; docs + README. Response validated before send.
