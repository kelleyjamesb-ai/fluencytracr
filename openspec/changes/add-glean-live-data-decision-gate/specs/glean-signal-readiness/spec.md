## ADDED Requirements

### Requirement: Live data access decision gate

The repository SHALL document a live-data decision gate before implementing real Glean export ingestion or Glean-hosted MCP/read access.

#### Scenario: Pilot defaults to aggregate inventory upload

- **WHEN** live Glean field availability, scrub status, join keys, or governance approval are unconfirmed
- **THEN** the documented pilot path is admin-exported aggregate inventory upload
- **AND** unknown readiness remains `not_computed` or `suppressed`

#### Scenario: Live integration requires approved evidence

- **WHEN** a future change proposes customer event-log import or Glean-hosted MCP/read access
- **THEN** the change must document source fields, scrub status, join keys, allowed dimensions, retention terms, suppression policy, audit behavior, and rollback plan
