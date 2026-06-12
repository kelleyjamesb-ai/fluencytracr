## ADDED Requirements

### Requirement: EvidenceBundle may mirror surfaced forwarded distribution

EvidenceBundle v1 SHALL allow an optional `forwarded_distribution` block only
when `suppression.suppression_applied` is `false`.

#### Scenario: Surfaced bundle includes forwarded aggregate block

- **WHEN** an EvidenceBundle represents a surfaced aggregate evidence posture
- **THEN** it MAY include `forwarded_distribution`
- **AND** the block SHALL remain aggregate-only and schema-bounded

#### Scenario: Suppressed bundle omits forwarded aggregate block

- **WHEN** `suppression.suppression_applied` is `true`
- **THEN** the bundle SHALL NOT include `forwarded_distribution`
