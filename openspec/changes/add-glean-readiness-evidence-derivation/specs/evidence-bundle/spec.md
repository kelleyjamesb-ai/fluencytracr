## ADDED Requirements

### Requirement: Glean readiness EvidenceBundle derivation

The system SHALL derive EvidenceBundle v1 output from a validated Glean readiness map without inferring values from `missing`, `suppressed`, or `not_computed` signal families.

#### Scenario: Present entries contribute coverage

- **WHEN** a readiness map contains present Glean signal families
- **THEN** the derived EvidenceBundle includes those families in `coverage.instrumented_sources`

#### Scenario: Not-computed entries remain not computed

- **WHEN** a readiness map contains `mcp_usage` as `not_computed`
- **THEN** the derived EvidenceBundle does not mark MCP-derived controls as present
- **AND** includes the family in `coverage.missing_sources`

#### Scenario: Suppressed AI Security is preserved

- **WHEN** a readiness map contains suppressed `ai_security`
- **THEN** the derived EvidenceBundle uses EvidenceBundle-compatible suppression reason codes
- **AND** preserves the original readiness reason in coverage notes
