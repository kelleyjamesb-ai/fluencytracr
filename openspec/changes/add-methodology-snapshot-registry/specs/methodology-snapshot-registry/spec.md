## ADDED Requirements

### Requirement: Methodology Snapshot Registry Contract

The system SHALL provide a versioned Methodology Snapshot Registry contract that records frozen methodology lineage for AI value estimates.

#### Scenario: Valid registry

- **GIVEN** a registry with schema version `MSR_2026_05`
- **AND** each snapshot includes identity, source system, methodology version, effective date, reporting window, covered surfaces, excluded surfaces, assumption references, approval state, customer-safe claim effect, and caveats
- **WHEN** the registry is parsed
- **THEN** the registry is accepted

#### Scenario: Duplicate snapshot IDs

- **GIVEN** two snapshots with the same `methodology_snapshot_id`
- **WHEN** the registry is parsed
- **THEN** validation fails

### Requirement: Privacy-Safe Methodology Evidence

The system SHALL reject methodology registry payloads that include raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, or hidden reconstruction fields.

#### Scenario: Forbidden field

- **GIVEN** a methodology snapshot includes `query_text`
- **WHEN** the registry is parsed
- **THEN** validation fails

### Requirement: Customer-Safe Approval Gate

The system SHALL require `customer_safe` methodology approval before a methodology snapshot can enable customer-safe ROI, payback, or finance-approved value language.

#### Scenario: Customer-safe effect without approval

- **GIVEN** a snapshot has `customer_safe_claim_effect` set to `enables_customer_safe`
- **AND** `approval_state` is not `customer_safe`
- **WHEN** the registry is parsed
- **THEN** validation fails

### Requirement: Strongest Safe Claim Methodology Lineage

The system SHALL include methodology snapshot lineage and caveats when generating Strongest Safe Claim output from a selected methodology snapshot.

#### Scenario: Finance-approved but not customer-safe methodology

- **GIVEN** a value hypothesis has financial model evidence
- **AND** the selected methodology snapshot has `approval_state` set to `finance_approved`
- **WHEN** Strongest Safe Claim is generated
- **THEN** the financial claim is capped at `internal_only`
- **AND** the output explains that customer-facing ROI or payback requires customer-safe methodology approval

#### Scenario: Suppressed methodology

- **GIVEN** a selected methodology snapshot has a rejected, expired, draft, or suppressing state
- **WHEN** Strongest Safe Claim is generated for a financial claim
- **THEN** the claim is suppressed or downgraded
- **AND** stronger financial language is blocked
