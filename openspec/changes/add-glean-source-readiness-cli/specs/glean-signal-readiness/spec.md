## ADDED Requirements

### Requirement: Source fixture readiness CLI

The system SHALL provide a deterministic CLI command that reads Glean-style source fixture files, maps them into `GSR_INVENTORY_2026_05`, generates a validated `GSR_2026_05` readiness map, and writes the map to a JSON artifact.

#### Scenario: Default source fixtures

- **WHEN** the operator runs `npm run glean:readiness:sources`
- **THEN** the command reads the default WorkflowRun, MCP Usage, and AI Security source fixtures
- **AND** writes `docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json`

#### Scenario: Expected readiness categories

- **WHEN** the default source-derived readiness map is generated
- **THEN** `workflow_run` is `present`
- **AND** `mcp_usage` is `not_computed`
- **AND** `ai_security` is `suppressed`
