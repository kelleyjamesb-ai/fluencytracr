## ADDED Requirements

### Requirement: Reviewer Decision Memo Export

The system SHALL generate a copyable plain-English decision memo for a selected methodology snapshot review.

#### Scenario: Memo includes required sections

- **GIVEN** a Methodology Review Workspace
- **WHEN** a reviewer generates a memo for a selected snapshot
- **THEN** the memo includes decision state, selected methodology snapshot, approval state, financial claim effect, strongest safe language, blocked claim language, why stronger claims are blocked, high-sensitivity assumptions, covered surfaces, excluded surfaces, caveats, and upgrade actions

#### Scenario: Finance-approved memo

- **GIVEN** a selected snapshot is `finance_approved`
- **WHEN** the memo is generated
- **THEN** the memo says financial claims are internal-only

#### Scenario: Customer-safe memo

- **GIVEN** a selected snapshot is `customer_safe` and enables customer-safe claim language
- **WHEN** the memo is generated
- **THEN** the memo allows customer-safe financial language when evidence supports it

#### Scenario: Suppressed memo

- **GIVEN** a selected snapshot is rejected, draft, expired, or suppresses claims
- **WHEN** the memo is generated
- **THEN** the memo says financial claim language is suppressed

### Requirement: Memo Privacy Boundary

The decision memo SHALL NOT include raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, or productivity scoring.

#### Scenario: Forbidden fields

- **GIVEN** a decision memo is generated
- **WHEN** the memo text is inspected
- **THEN** no forbidden raw or person-level fields are present

### Requirement: Review Workspace Memo UI

The Methodology Review Workspace SHALL expose the selected snapshot decision memo as copyable plain text.

#### Scenario: Selected snapshot memo

- **GIVEN** a reviewer opens `/methodology-review`
- **WHEN** the reviewer changes the selected snapshot
- **THEN** the "Reviewer decision memo" output updates to the selected snapshot
