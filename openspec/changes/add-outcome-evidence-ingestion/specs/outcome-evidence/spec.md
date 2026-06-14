## ADDED Requirements

### Requirement: Aggregate outcome evidence ingestion
The system SHALL accept only aggregate customer-attested KPI outcome evidence
for storage and replay, without row-level source data or connector logic.

#### Scenario: Valid aggregate KPI is stored
- **WHEN** an authorized caller posts workflow_id, outcome_metric,
  outcome_unit, period_start, period_end, aggregate_value, cohort_size,
  source_system, and optional join keys
- **THEN** the system stores the aggregate observation and returns evidence_id,
  accepted_at, and workflow_id

### Requirement: Aggregate-only fail-closed gates
The system SHALL reject outcome evidence with cohort_size below 5 unless the
caller sets aggregate_kind to team_level_kpi.

#### Scenario: Small cohort without aggregate attestation
- **WHEN** cohort_size is less than 5 and aggregate_kind is absent
- **THEN** the system rejects the payload with reason INSUFFICIENT_VOLUME

#### Scenario: Team-level KPI attestation
- **WHEN** cohort_size is 1 and aggregate_kind is team_level_kpi
- **THEN** the system accepts the payload as an opaque customer attestation

### Requirement: Outcome replay preserves verdicts
The system SHALL replay matching outcome evidence beside the existing workflow
verdict without computing correlation, causation, attribution, dollarization, or
claim-readiness upgrades.

#### Scenario: Suppressed workflow with outcome evidence
- **WHEN** a workflow verdict is SUPPRESS and matching outcome evidence exists
- **THEN** the GET endpoint returns SUPPRESS with the stored outcome evidence
  and does not elevate the verdict
