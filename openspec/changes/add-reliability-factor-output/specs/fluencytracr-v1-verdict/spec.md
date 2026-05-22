## ADDED Requirements

### Requirement: Reliability Factor Verdict Metadata
FluencyTracr V1 aggregate verdict payloads SHALL include additive `reliability_factor` and `reliability_components` fields without changing `SURFACE` / `SUPPRESS` behavior.

#### Scenario: Surfaced verdict emits Reliability Factor
- **WHEN** an aggregate verdict decision is `SURFACE`
- **THEN** `reliability_factor` is a number between `0.0` and `1.0`
- **AND** `reliability_components` contains `abandonment_rate`, `friction_loop_rate`, `recovery_success_rate`, and `verification_presence_rate`
- **AND** every component rate is between `0.0` and `1.0`

#### Scenario: Suppressed verdict nulls Reliability Factor
- **WHEN** an aggregate verdict decision is `SUPPRESS`
- **THEN** `reliability_factor` is `null`
- **AND** `reliability_components` is `null`

#### Scenario: Reliability Factor is output-only
- **WHEN** Reliability Factor is computed
- **THEN** it does not alter the verdict decision
- **AND** it does not introduce new canonical events, suppression reasons, tunable thresholds, or individual fields
