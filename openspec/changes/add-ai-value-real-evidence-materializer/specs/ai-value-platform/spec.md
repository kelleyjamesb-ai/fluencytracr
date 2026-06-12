## ADDED Requirements

### Requirement: Real evidence materializer creates validated AI Value objects

The system SHALL provide a governed local materializer that reads existing
aggregate-only evidence stores and writes validated AI Value objects.

#### Scenario: Surfaced aggregate evidence materializes readiness

- **WHEN** a surfaced V3 aggregate verdict with a valid forwarded distribution
  is available for a requested cohort and workflow
- **THEN** the materializer SHALL generate a valid `evidence_readiness` object
- **AND** the readiness object SHALL record V3 evidence provenance
- **AND** the materializer SHALL upgrade only source-coverage lanes supported by
  surfaced aggregate evidence
- **AND** the materializer SHALL not emit customer-facing economic output

#### Scenario: Customer-attested outcome evidence materializes submitted export

- **WHEN** paired baseline and comparison outcome evidence records align to a
  metrics library metric and blueprint windows
- **THEN** the materializer SHALL generate a valid `outcome_evidence_export`
- **AND** the generated export SHALL start as `SUBMITTED`
- **AND** it SHALL not upgrade the outcome lane unless separately accepted

### Requirement: Held evidence remains held

The materializer SHALL preserve fail-closed evidence boundaries.

#### Scenario: Suppressed aggregate evidence does not upgrade lanes

- **WHEN** the matching V3 aggregate verdict is `SUPPRESS`
- **THEN** the materializer SHALL not upgrade AI activity, workflow, trust, or
  suppression source-coverage lanes from that verdict
- **AND** the readiness object SHALL remain held by existing source coverage
  gaps

#### Scenario: Low-trust surfaced evidence does not upgrade trust

- **WHEN** a surfaced V3 aggregate verdict lacks verification or recovery
  evidence
- **THEN** the materializer MAY upgrade AI activity, workflow, and suppression
  lanes
- **AND** it SHALL keep the trust lane held unless the blueprint already had
  trusted evidence
