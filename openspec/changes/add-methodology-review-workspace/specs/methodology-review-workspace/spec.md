## ADDED Requirements

### Requirement: Methodology Review Summary

The system SHALL provide a read helper that summarizes Methodology Snapshot Registry entries for human review.

#### Scenario: Reviewer summary

- **GIVEN** a valid Methodology Snapshot Registry
- **WHEN** the review helper summarizes it
- **THEN** each snapshot summary includes approval state, customer-safe claim effect, covered surfaces, excluded surfaces, high-sensitivity assumptions, caveats, blocked claim effects, and example claim posture

### Requirement: Methodology Claim Gate Explanation

The system SHALL explain how methodology approval affects financial and customer-facing claim language.

#### Scenario: Finance-approved snapshot

- **GIVEN** a snapshot with `approval_state` set to `finance_approved`
- **WHEN** the review helper summarizes it
- **THEN** the financial claim effect explains that customer-facing ROI/payback is capped at internal-only

#### Scenario: Customer-safe snapshot

- **GIVEN** a snapshot with `approval_state` set to `customer_safe`
- **AND** `customer_safe_claim_effect` set to `enables_customer_safe`
- **WHEN** Strongest Safe Claim is generated with the snapshot
- **THEN** customer-safe financial language can be emitted when evidence supports it

#### Scenario: Rejected, expired, or draft snapshot

- **GIVEN** a snapshot with `approval_state` set to `rejected`, `expired`, or `draft`
- **WHEN** Strongest Safe Claim is generated with the snapshot
- **THEN** financial claim language is suppressed

#### Scenario: Missing methodology snapshot

- **GIVEN** financial model evidence exists
- **AND** no methodology snapshot is selected
- **WHEN** Strongest Safe Claim is generated
- **THEN** customer-facing financial language is downgraded deterministically

### Requirement: Reviewer Workspace UI

The system SHALL provide a frontend or static prototype that lets a reviewer inspect a methodology snapshot and understand its claim effect.

#### Scenario: Snapshot inspection

- **GIVEN** the reviewer opens the methodology review workspace
- **WHEN** a snapshot is selected
- **THEN** the UI shows the snapshot list, selected snapshot detail, approval gate explanation, financial claim effect, dominant assumptions, sensitivity tests, and safe/internal-only/suppressed examples

### Requirement: Privacy And Governance Boundary

The review workspace SHALL NOT expose raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, or productivity scoring.

#### Scenario: Forbidden boundary

- **GIVEN** a review summary is generated
- **WHEN** the output is inspected
- **THEN** no forbidden raw content, direct identifier, ranking, manager view, or productivity scoring field is present
