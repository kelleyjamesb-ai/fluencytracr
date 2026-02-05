## ADDED Requirements
### Requirement: Phase 1 Event Contract Validation
The system SHALL accept only Phase 1 canonical events and SHALL hard-reject events with missing required fields, forbidden fields, or unknown fields.

#### Scenario: Accept valid event
- **WHEN** a Phase 1 event contains only required fields and valid enums
- **THEN** the event is accepted for evaluation

#### Scenario: Reject invalid event
- **WHEN** a Phase 1 event contains missing required fields or any unknown/forbidden fields
- **THEN** the event is rejected and not persisted

### Requirement: Deterministic Evaluation Decision
The system SHALL compute a deterministic decision using the Phase 1 governance rules and default to SUPPRESS under ambiguity or insufficiency.

#### Scenario: Ambiguity suppresses
- **WHEN** ambiguity is present in inputs
- **THEN** the decision is SUPPRESS with a suppression_reason_code

#### Scenario: Window length gate
- **WHEN** window_length_days is less than 60
- **THEN** the decision is SUPPRESS with a suppression_reason_code

### Requirement: Suppression Before Surfacing
The system SHALL ensure suppression occurs before any surfacing output is produced.

#### Scenario: Suppressed outputs do not surface
- **WHEN** evaluateDecision returns SUPPRESS
- **THEN** no surfaced artifact is emitted

### Requirement: Surfacing Allowlist
The system SHALL emit only the allowlisted surfacing schema: decision and optional suppression_reason_code.

#### Scenario: Surfacing allowlist enforced
- **WHEN** a surfacing output is produced
- **THEN** it contains no fields outside the allowlist

### Requirement: Deterministic Fixtures and CI Gates
The system SHALL include deterministic fixtures and CI checks for governance invariants.

#### Scenario: Deterministic output
- **WHEN** the same fixture input is evaluated multiple times
- **THEN** the output is byte-for-byte identical

#### Scenario: CI gating on window length
- **WHEN** window_length_days is less than 60
- **THEN** CI fails if any SURFACE output is produced
