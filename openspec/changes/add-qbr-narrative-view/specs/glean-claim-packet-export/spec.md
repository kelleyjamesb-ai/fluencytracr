## ADDED Requirements

### Requirement: QBR Narrative Formatter

The system SHALL format a `GCP_2026_05` claim packet into human-readable QBR narrative sections without calculating ROI, ingesting raw content, or upgrading claim readiness.

#### Scenario: Narrative includes required sections

- **GIVEN** a valid claim packet
- **WHEN** the QBR narrative is built
- **THEN** it includes executive decision, strongest safe claim, caveated claims, internal-only claims, suppressed or not-computed claims, evidence gaps, upgrade actions, governance boundaries, and methodology snapshot summary

#### Scenario: Internal-only financial posture remains internal-only

- **GIVEN** the packet contains finance-approved financial language that is not customer-safe
- **WHEN** the QBR narrative is built
- **THEN** the narrative keeps that language in the internal-only section

#### Scenario: Suppressed claims remain separated

- **GIVEN** the packet contains suppressed or not-computed claims
- **WHEN** the QBR narrative is built
- **THEN** the narrative renders those claims separately from caveated and internal-only claims

### Requirement: QBR Narrative UI

The Methodology Review Workspace SHALL render a QBR narrative view for the selected claim packet.

#### Scenario: Selected packet narrative

- **GIVEN** a reviewer opens `/methodology-review`
- **WHEN** the selected methodology snapshot changes
- **THEN** the QBR narrative updates its methodology snapshot summary and keeps evidence gaps, upgrade actions, and governance boundaries visible

### Requirement: QBR Narrative Privacy Boundary

The QBR narrative SHALL NOT render raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, or productivity scoring.

#### Scenario: Forbidden fields

- **GIVEN** a QBR narrative is rendered
- **WHEN** the rendered text is inspected
- **THEN** forbidden raw or person-level fields are not present
