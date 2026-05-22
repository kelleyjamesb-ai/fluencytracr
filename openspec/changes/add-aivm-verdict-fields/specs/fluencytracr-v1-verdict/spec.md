## ADDED Requirements

### Requirement: AIVM Verdict Metadata
FluencyTracr V1 verdict payloads SHALL include additive `value_type` and `evidence_grade` fields without changing `SURFACE` / `SUPPRESS` behavior.

#### Scenario: Default metadata is emitted
- **WHEN** a verdict is emitted without deterministic AIVM evidence
- **THEN** `value_type` is `UNCLASSIFIED`
- **AND** `evidence_grade` is `QUALITATIVE`

#### Scenario: Acceleration is derived
- **WHEN** canonical evidence contains `FT_V1_LATENCY_OBSERVED`
- **AND** low `FT_V1_ABANDONMENT_OBSERVED` dominates observed abandonment
- **AND** acceleration evidence dominates quality evidence
- **THEN** `value_type` is `ACCELERATION`

#### Scenario: Quality premium is derived
- **WHEN** canonical evidence contains both `FT_V1_VERIFICATION_PRESENCE_OBSERVED` and `FT_V1_RECOVERY_OBSERVED`
- **AND** quality evidence dominates acceleration evidence
- **THEN** `value_type` is `QUALITY_PREMIUM`

#### Scenario: Objective grade is gated
- **WHEN** `cohort_size` is at least 30
- **AND** the verdict window is at least 90 days
- **THEN** `evidence_grade` is `OBJECTIVE`

#### Scenario: Suppression is unchanged
- **WHEN** an existing fail-closed gate produces `SUPPRESS`
- **THEN** the original `decision` and `suppress_reason_code` are preserved
- **AND** AIVM metadata remains descriptive only
