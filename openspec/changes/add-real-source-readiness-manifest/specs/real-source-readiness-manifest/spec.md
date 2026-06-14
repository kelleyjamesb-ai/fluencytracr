## ADDED Requirements

### Requirement: Real Source Readiness Manifest

The system SHALL define a privacy-safe Real Source Readiness Manifest that records whether each source input needed by the Glean Claim Packet Export is ready, blocked, unknown, approval-dependent, synthetic-only, or not applicable.

#### Scenario: Manifest records source readiness

- **GIVEN** a synthetic Glean Claim Packet Export fixture path
- **WHEN** reviewers inspect the real-source readiness manifest
- **THEN** it identifies required source inputs, field status, privacy boundary status, approval status, blockers, upgrade actions, affected claim buckets, and recommended ingestion path

### Requirement: Source Readiness Review

The system SHALL summarize a Real Source Readiness Manifest in plain language without changing claim readiness or calculating ROI.

#### Scenario: Review does not upgrade claims

- **GIVEN** a claim packet with caveated, internal-only, suppressed, or not-computed claims
- **WHEN** a source readiness review is built from the manifest and claim packet
- **THEN** the review states `no_readiness_upgrade`
- **AND** no claim is moved to a stronger readiness bucket
- **AND** no ROI calculation is performed

### Requirement: Source Gap to Claim Bucket Mapping

The system SHALL show which source gaps affect customer-safe, caveated, internal-only, and suppressed/not-computed claim buckets.

#### Scenario: Blocked sources affect suppressed claims

- **GIVEN** MCP/action metadata or customer-safe financial approval is unknown, blocked, or approval-dependent
- **WHEN** the source readiness review is rendered
- **THEN** the affected claim bucket shows the relevant source inputs and blocker language

### Requirement: Real Source Readiness Privacy Boundary

The manifest SHALL NOT include raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, or hidden reconstruction of suppressed values.

#### Scenario: Forbidden fields are rejected

- **GIVEN** a manifest or source input contains forbidden raw or person-level fields
- **WHEN** it is parsed
- **THEN** validation fails

### Requirement: Methodology Review Real Source Section

The Methodology Review Workspace SHALL render a real-source readiness section for the selected claim-packet fixture path.

#### Scenario: Reviewer sees readiness before ingestion

- **GIVEN** a reviewer opens `/methodology-review`
- **WHEN** synthetic demo inputs are available
- **THEN** the workspace shows source readiness state, ready sources, blocked or unknown sources, approval needs, affected claim buckets, top blockers, next upgrade action, recommended ingestion path, and that no ingestion is implemented
