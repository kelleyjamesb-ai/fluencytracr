## ADDED Requirements

### Requirement: Glean source readiness adapter

The system SHALL map strict Glean-style source export records into a `GSR_INVENTORY_2026_05` readiness inventory before readiness-map generation. The adapter SHALL support WorkflowRun, MCP Usage, and AI Security source families and SHALL reject unsafe fields before inventory generation.

#### Scenario: WorkflowRun source is present

- **WHEN** a WorkflowRun source record is available, scrubbed, has stable join keys, and declares derived dimensions
- **THEN** the generated inventory contains a `workflow_run` signal entry
- **AND** the readiness generator can mark it `present`

#### Scenario: MCP Usage source is not computed

- **WHEN** an MCP Usage source record is approved pending export or has unknown scrub status
- **THEN** the generated inventory contains an `mcp_usage` signal entry
- **AND** the readiness generator marks it `not_computed`

#### Scenario: AI Security source is suppressed

- **WHEN** an AI Security source record is available but under governance hold
- **THEN** the generated inventory contains an `ai_security` signal entry with suppression applied
- **AND** the readiness generator marks it `suppressed`

#### Scenario: Unsafe field is rejected

- **WHEN** a source record includes direct identifiers, raw prompts, model output, transcripts, message text, ranking, or team/manager fields
- **THEN** adapter validation fails before any inventory is generated
