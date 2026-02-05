## ADDED Requirements
### Requirement: Forbidden Key Enforcement
The system SHALL hard-reject any ingestion payload containing forbidden keys that enable ordering, scoring, aggregation, or cross-window linkage.

#### Scenario: Forbidden keys rejected at ingestion
- **WHEN** a payload includes a forbidden key (e.g., "rank", "count", "window_start")
- **THEN** ingestion is rejected with a validation error

### Requirement: Schema and Contract Linting
The system SHALL fail CI if any schema or contract includes forbidden keys.

#### Scenario: CI blocks forbidden schema keys
- **WHEN** a schema includes a forbidden key
- **THEN** CI fails with a forbidden-key lint error

### Requirement: Single Global Enforcement Flag
The system SHALL read the enforcement flag once at startup and fail fast if any conflicting source exists.

#### Scenario: Conflicting enforcement sources
- **WHEN** multiple enforcement sources disagree
- **THEN** startup fails with a configuration error

### Requirement: Window Isolation
The system SHALL operate inference/evaluation on exactly one window at a time and SHALL NOT persist or reuse cross-window state.

#### Scenario: Consecutive runs are isolated
- **WHEN** two consecutive runs occur for the same window
- **THEN** outputs are identical and no state accumulates

### Requirement: Suppression Before Surfacing
The system SHALL apply suppression before any serialization, response, or export.

#### Scenario: Suppressed output never appears
- **WHEN** suppression applies to an artifact
- **THEN** the artifact is not present in API responses or exports

### Requirement: Ambiguity Fail-Closed
The system SHALL reject or suppress ambiguous or malformed inputs without best-guess parsing.

#### Scenario: Ambiguous input is rejected
- **WHEN** an input is ambiguous
- **THEN** ingestion is rejected or output is suppressed

### Requirement: Absence Is Neutral
The system SHALL omit concepts when evidence is absent and SHALL NOT encode absence as negative values.

#### Scenario: Missing evidence yields no output
- **WHEN** evidence for a concept is absent
- **THEN** the concept is not present in the output

### Requirement: Binary Visibility Only
The system SHALL emit only SURFACED or SUPPRESSED visibility states.

#### Scenario: No partial visibility
- **WHEN** evaluation completes
- **THEN** visibility is SURFACED or SUPPRESSED only

### Requirement: Non-Ordinal Labels
The system SHALL use categorical labels without numeric encoding or implied ordering.

#### Scenario: Label schema is categorical
- **WHEN** a label field is defined
- **THEN** it is a string category with no numeric encoding

### Requirement: Aggregation Blocking
The system SHALL not expose outputs that enable ordering, trend, or aggregation reconstruction.

#### Scenario: Aggregation route blocked
- **WHEN** a request attempts multi-window or aggregation output
- **THEN** the response is suppressed or the route is disabled
