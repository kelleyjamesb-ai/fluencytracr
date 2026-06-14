## ADDED Requirements

### Requirement: Workflow observability read API

The server SHALL expose `GET /api/observability/:orgId` for governance-approved roles, returning only workflow-level aggregates: execution counts, optional fixed-key pattern bands, residual observability state, Reliability Factor metadata, and qualitative interpretation hints—without execution identifiers, event identifiers, sorted-by-metric leaderboards, or time-series arrays.

#### Scenario: Unsupported observation window rejected

- **WHEN** `window` is not `30d` or `60d`
- **THEN** the server responds with 400 and lists supported windows

#### Scenario: Org JWT scope mismatch forbidden

- **WHEN** the caller presents `authOrgId` that differs from `:orgId`
- **THEN** the server responds with 403

#### Scenario: Reliability Factor follows workflow disclosure

- **WHEN** workflow disclosure is `ALLOWED`
- **THEN** `reliability_factor` is a bounded value between `0.0` and `1.0`
- **AND** `reliability_components` contains the four aggregate component rates
- **WHEN** workflow disclosure is `SUPPRESSED`
- **THEN** both Reliability Factor fields are `null`
