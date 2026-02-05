## ADDED Requirements
### Requirement: WAIM Descriptive-Only Artifact
The system SHALL provide a descriptive-only WAIM v2 document that is not executable and does not alter system behavior.

#### Scenario: Descriptive-only guard
- **WHEN** WAIM v2 is present
- **THEN** runtime, CI, and tests SHALL not parse or depend on it

### Requirement: Archive Executable WAIM Artifacts
The system SHALL archive any executable WAIM artifacts and mark them as superseded.

#### Scenario: Superseded notice
- **WHEN** an executable WAIM artifact is archived
- **THEN** it SHALL include a superseded notice forbidding runtime/CI/test usage

### Requirement: Governance Index Guardrail
The system SHALL include a governance note stating WAIM is descriptive-only and must not be used by runtime/CI/tests.

#### Scenario: Guardrail documented
- **WHEN** governance index is read
- **THEN** it states WAIM execution_authority is NONE and non-executable

### Requirement: Remove WAIM Runtime Usage
The system SHALL remove or disable any WAIM usage from runtime, configuration, CI, or tests.

#### Scenario: No WAIM runtime dependency
- **WHEN** WAIM files are removed
- **THEN** system behavior SHALL not change
