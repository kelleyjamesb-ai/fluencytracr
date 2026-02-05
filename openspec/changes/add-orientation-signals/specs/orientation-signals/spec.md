## ADDED Requirements
### Requirement: Orientation-Only Signal Response
The system SHALL expose an orientation-only response that does not include metrics, counts, trends, deltas, or aggregation and does not introduce persistence or cross-session memory.

#### Scenario: Default suppression
- **WHEN** session context is missing or ambiguous
- **THEN** the response SHALL default to SUPPRESSED

#### Scenario: Schema validation
- **WHEN** the response is produced
- **THEN** it SHALL conform to the orientation response schema

### Requirement: Fail-Closed Under Ambiguity
The system SHALL fail closed when ambiguity is present in the session context.

#### Scenario: Ambiguous session start
- **WHEN** session_start is missing or invalid
- **THEN** the observation state SHALL be SUPPRESSED
