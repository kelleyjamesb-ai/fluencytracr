## ADDED Requirements

### Requirement: Metadata-only Glean AI Work Evidence export

The system SHALL define a metadata-only Glean AI Work Evidence export contract for org-window aggregate records across surface usage, Skill lifecycle, Agent lifecycle, MCP/action boundary, artifact output, and control evidence lanes.

#### Scenario: Safe aggregate export

- **WHEN** a Glean AI Work Evidence export is validated
- **THEN** it accepts only aggregate metadata fields and closed note/action codes
- **AND** rejects raw prompts, responses, transcripts, query text, tool payloads, file content, direct identifiers, ranking fields, and arbitrary action text

### Requirement: Readiness mapping

The adapter SHALL map Glean AI Work Evidence records into Glean Signal Readiness inventory records.

#### Scenario: Work lanes map to readiness families

- **WHEN** the adapter receives safe metadata records for surface usage, Skill lifecycle, Agent lifecycle, MCP/action boundary, artifact output, and control evidence
- **THEN** it maps them to readiness signal families `assistant`, `skill_lifecycle`, `agent_run`, `mcp_usage`, `insights`, and `ai_security`

### Requirement: Claim evaluation mapping

The adapter SHALL map Glean AI Work Evidence records into deterministic Claim Evaluation records that can be validated against the Glean Claim Registry.

#### Scenario: Current value claims evaluated

- **WHEN** surface usage, Skill lifecycle, Agent lifecycle, and artifact output lanes are present
- **THEN** their corresponding value claims may be surfaced with caveats
- **AND** ROI remains suppressed until assumption governance explicitly allows customer-facing value language
- **AND** missing or uncomputed MCP/action boundary evidence remains not computed
