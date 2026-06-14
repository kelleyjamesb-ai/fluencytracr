## ADDED Requirements

### Requirement: Glean Claim Packet Export

The system SHALL generate a privacy-safe account/window claim packet that packages methodology review, selected methodology snapshot, strongest safe claim, evidence posture, and upgrade actions for QBR preparation.

#### Scenario: Packet includes required sections

- **GIVEN** a Methodology Review Workspace, selected methodology snapshot, Strongest Safe Claim result, and Value Evidence Pack or AI Work Value Graph fixture
- **WHEN** the claim packet is generated
- **THEN** it includes claim packet id, org id, window, generated timestamp, selected methodology snapshot id, reviewer decision memo, strongest safe claim, caveated claims, internal-only claims, suppressed claims, evidence gaps, upgrade actions, and governance boundaries

### Requirement: Claim Language Buckets

The claim packet SHALL classify claim language into caveated, internal-only, and suppressed buckets without upgrading claim readiness beyond the source evidence and methodology gates.

#### Scenario: Internal-only financial claim

- **GIVEN** the selected methodology snapshot is finance-approved but not customer-safe
- **WHEN** the packet is generated
- **THEN** financial claim language appears as internal-only or suppressed, not customer-safe

#### Scenario: Suppressed evidence claim

- **GIVEN** a Value Evidence Pack claim is suppressed or not computed
- **WHEN** the packet is generated
- **THEN** that claim appears in suppressed claims with reason codes or blocker language

### Requirement: Claim Packet Privacy Boundary

The claim packet SHALL NOT include raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, or productivity scoring.

#### Scenario: Forbidden fields

- **GIVEN** a claim packet is built or parsed
- **WHEN** forbidden raw or person-level fields are present
- **THEN** validation fails

### Requirement: Methodology Review Packet UI

The Methodology Review Workspace SHALL expose a copyable claim packet export for the selected snapshot when synthetic demo inputs are available.

#### Scenario: Selected snapshot packet updates

- **GIVEN** a reviewer opens `/methodology-review`
- **WHEN** the reviewer changes the selected snapshot
- **THEN** the "Export claim packet" output updates to the selected methodology snapshot

### Requirement: Real-Source Readiness Documentation

The contract documentation SHALL define the minimum source, privacy, approval, and acceptance requirements for replacing synthetic Glean Claim Packet Export fixtures without implementing ingestion.

#### Scenario: Readiness gate before fixture replacement

- **GIVEN** a reviewer is evaluating whether synthetic claim packet fixtures can be replaced with real source inputs
- **WHEN** they inspect the Glean Claim Packet Export contract docs
- **THEN** the docs identify required source inputs, fixture-to-real mapping, unknown fields, production blockers, privacy boundaries, approval workflow requirements, and minimum acceptance criteria
- **AND** the docs state that ingestion, ROI calculation, and claim readiness upgrades are out of scope
