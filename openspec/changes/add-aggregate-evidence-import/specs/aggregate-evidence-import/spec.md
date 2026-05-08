## ADDED Requirements

### Requirement: Aggregate Evidence Import Package

The system SHALL define a strict aggregate evidence import package for admin-exported account/window evidence.

#### Scenario: Valid aggregate package

- **GIVEN** a package contains `AEI_2026_05`, a `RSRM_2026_05` manifest, and aggregate evidence records
- **WHEN** the package is parsed
- **THEN** it validates only aggregate metadata, source references, evidence state, aggregate metric refs, and bounded aggregate values
- **AND** it does not require raw events or live access

### Requirement: Source-Readiness-Gated Import Review

The system SHALL accept aggregate evidence records only when their referenced source input is marked `ready`.

#### Scenario: Withhold blocked source evidence

- **GIVEN** an aggregate evidence record references a source input with `blocked`, `unknown`, `needs_approval`, or `synthetic_only` readiness
- **WHEN** the import review is built
- **THEN** that record is withheld with source blockers and upgrade actions
- **AND** the claim readiness effect remains `no_readiness_upgrade`

### Requirement: Aggregate Import Privacy Boundary

The import package SHALL NOT include raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, or hidden reconstruction.

#### Scenario: Forbidden field rejection

- **GIVEN** an import package includes forbidden raw or person-level fields
- **WHEN** it is parsed
- **THEN** validation fails

### Requirement: Methodology Review Import Section

The Methodology Review Workspace SHALL render a Source Evidence Import review section using the synthetic aggregate import package.

#### Scenario: Reviewer sees non-persistent import review

- **GIVEN** a reviewer opens `/methodology-review`
- **WHEN** the synthetic aggregate import package is available
- **THEN** the workspace shows accepted evidence, withheld evidence, blockers, next action, recommended path, and that no live ingestion or claim readiness upgrade occurred
