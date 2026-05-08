## ADDED Requirements

### Requirement: Document-Derived Nielsen Claim Mapping

The system SHALL provide a review-only Nielsen Source Evidence Trial that maps sanitized source artifact references into claim candidates and a generated Aggregate Evidence Import package.

#### Scenario: Reviewer maps Nielsen value narrative into evidence posture

- **GIVEN** a Nielsen Source Evidence Trial package with sanitized source artifacts, claim candidates, and a generated Aggregate Evidence Import package
- **WHEN** the trial review helper evaluates the package
- **THEN** it emits document-derived candidate counts, accepted candidate IDs, withheld candidate IDs, blocked claim effects, upgrade actions, and the nested Aggregate Evidence Import review
- **AND** it emits `claim_readiness_effect: no_readiness_upgrade`

### Requirement: Source Document Claims Must Not Become Observed Evidence

The system SHALL keep deck-derived financial, survey, external outcome, and telemetry-dependent claims behind their required source-system or approval gates.

#### Scenario: Financial and external outcome claims are present in source documents

- **GIVEN** a Nielsen Source Evidence Trial package containing financial and external outcome claim candidates from sanitized document references
- **WHEN** the trial review helper evaluates the package
- **THEN** financial language remains blocked until finance/customer-safe approval is attached
- **AND** external outcome movement remains blocked until aggregate external outcome export is approved
- **AND** no ROI calculation, live ingestion, persistence, or readiness upgrade occurs

### Requirement: Forbidden Raw and Person-Level Fields Are Rejected

The system SHALL reject Nielsen Source Evidence Trial packages that include raw or person-level fields.

#### Scenario: Candidate includes forbidden raw field

- **GIVEN** a Nielsen Source Evidence Trial package with a forbidden raw or person-level field in a claim candidate
- **WHEN** the package is parsed
- **THEN** validation fails

