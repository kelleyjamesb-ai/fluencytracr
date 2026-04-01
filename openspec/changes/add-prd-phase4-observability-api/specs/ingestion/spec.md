## ADDED Requirements

### Requirement: Workflow observability read API

The server SHALL expose `GET /api/observability/:orgId` for governance-approved roles, returning only workflow-level aggregates: execution counts, optional fixed-key pattern counts, and qualitative interpretation hints—without execution identifiers, event identifiers, sorted-by-metric leaderboards, or time-series arrays.

#### Scenario: Unsupported observation window rejected

- **WHEN** `window` is not `30d` or `60d`
- **THEN** the server responds with 400 and lists supported windows

#### Scenario: Org JWT scope mismatch forbidden

- **WHEN** the caller presents `authOrgId` that differs from `:orgId`
- **THEN** the server responds with 403
