## ADDED Requirements

### Requirement: Confidence-engine series read-path decision

The system SHALL provide a hold-by-default decision artifact that evaluates
whether durable Measurement Cell Series persistence is authorized as internal
confidence-engine observation input. The decision SHALL consume the customer
evidence history read-path proof and a confidence-engine observation
requirement statement, and SHALL emit exactly one of:
`SERIES_PERSISTENCE_AUTHORIZED_FOR_INTERNAL_CONFIDENCE_OBSERVATIONS`,
`HOLD_FOR_CONFIDENCE_OBSERVATION_REQUIREMENT`, or
`REJECTED_FOR_BOUNDARY_LEAKAGE`.

#### Scenario: Authorization with valid proofs

- **WHEN** the customer evidence history read-path proof is valid and the
  confidence-engine observation requirement statement proves the internal
  engine requires append-only, gate-cleared milestone observations with
  admission metadata that compact customer data model rows cannot provide
- **THEN** the decision emits
  `SERIES_PERSISTENCE_AUTHORIZED_FOR_INTERNAL_CONFIDENCE_OBSERVATIONS` with
  every blocked feed false except `research_model_feed`, which carries the
  scoped token `internal_confidence_engine_only`

#### Scenario: Hold without a proven requirement

- **WHEN** the confidence-engine observation requirement statement is missing,
  unproven, or supplied only as caller-provided proof strings
- **THEN** the decision emits `HOLD_FOR_CONFIDENCE_OBSERVATION_REQUIREMENT`
  and authorizes nothing

#### Scenario: Rejection on boundary leakage

- **WHEN** any input or requested feed includes backend routes, frontend UI,
  exports, rendered readouts, customer-facing output, customer-facing
  financial or economic output, finance output, live BigQuery/Sigma/Glean
  execution, customer connector execution, ROI, causality claims, or
  productivity measurement
- **THEN** the decision emits `REJECTED_FOR_BOUNDARY_LEAKAGE`

### Requirement: Internal confidence observation store scope

An authorized confidence observation store SHALL be append-only, SHALL contain
compact references only, SHALL be org-scoped, SHALL contain only aggregates
meeting the k>=10 cohort minimum, SHALL restrict milestone days to
[0, 30, 60, 90, 180, 365], and SHALL record a machine-readable admission or
exclusion reason code for every observation.

#### Scenario: Non-conforming observation rejected

- **WHEN** an observation carries a milestone day outside
  [0, 30, 60, 90, 180, 365], lacks an admission or exclusion reason code,
  carries non-compact references, or aggregates a cohort smaller than 10
- **THEN** validation rejects the observation and the store remains unchanged

#### Scenario: Existing customer-history decision preserved

- **WHEN** the confidence-engine series read-path decision authorizes the
  observation store
- **THEN** the durable Series read-path decision for the customer evidence
  history consumer continues to serve reads from compact
  `ai_value_customer_data_model_snapshots` rows, unchanged

### Requirement: Promotion gate acceptance of the confidence read path

The Measurement Cell Series persistence promotion gate SHALL accept the
confidence-engine series read-path decision as an alternative READY path
toward the separate Measurement Cell Series snapshot implementation decision,
and SHALL require the full confidence proof set rather than any subset of the
customer-history proof set.

#### Scenario: Gate ready via confidence path

- **WHEN** the confidence-engine series read-path decision state is
  `SERIES_PERSISTENCE_AUTHORIZED_FOR_INTERNAL_CONFIDENCE_OBSERVATIONS` and the
  repeated pilot evidence package and Measurement Cell Series contract output
  remain valid
- **THEN** the gate emits
  `READY_FOR_SEPARATE_MEASUREMENT_CELL_SERIES_SNAPSHOT_IMPLEMENTATION_DECISION`

#### Scenario: Gate holds when confidence proof incomplete

- **WHEN** the confidence-engine series read-path decision is held or any of
  its proof fields are missing
- **THEN** the gate holds and no implementation decision is authorized
