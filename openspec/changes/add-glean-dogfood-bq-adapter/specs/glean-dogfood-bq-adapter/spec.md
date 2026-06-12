## ADDED Requirements

### Requirement: Read-only scrubbed BigQuery adapter

The system SHALL provide an internal-only Glean dogfood BigQuery adapter that
reads the scrubbed date-sharded table families
`scrubbed_llm_call_*`, `scrubbed_client_analytics_*`, and
`scrubbed_workflows_*` without DML, DDL, service account keys, customer data, or
production connector behavior.

#### Scenario: Date-sharded source tables are selected

- **WHEN** the adapter builds a query for the three supported table keys
- **THEN** the query targets the `scio-apps.scrubbed_*` sharded table patterns
- **AND** the query includes `_TABLE_SUFFIX BETWEEN <start> AND <end>`
- **AND** unsupported table keys are rejected.

### Requirement: Broad source awareness with narrow aggregate output

The system SHALL pin broad table-specific source allowlists in code while
emitting only the existing `FT_V3_2026_05` aggregate payload shape.

#### Scenario: Source schema breadth is preserved

- **WHEN** the adapter table specs are inspected
- **THEN** each in-scope source has a table-specific allowlist covering real
  scrubbed source fields
- **AND** the emitted payload still contains only cohort/workflow/window
  metadata, velocity distributions, quality signals, calibration metadata, and
  `privacy.person_level_fields_included = false`.

### Requirement: Connector boundary guards

The system SHALL fail closed on forbidden field names, missing partition guards,
oversized dry-run scan estimates, and sub-minimum slices before emitting V3
aggregate payloads.

#### Scenario: Unsafe fields and sparse slices are blocked

- **WHEN** a row contains a forbidden field name such as `email`, `userid`,
  `query`, `prompt`, `response`, `output`, `url`, or `skill_name`
- **THEN** the adapter rejects the row before payload emission.
- **WHEN** a slice has `cohort_size < 5`
- **THEN** the adapter suppresses that slice with `INSUFFICIENT_VOLUME`
- **AND** no payload is emitted for that slice.

#### Scenario: Unsafe queries are refused

- **WHEN** a wildcard query lacks `_TABLE_SUFFIX`, `_PARTITIONTIME`, or
  `_PARTITIONDATE`
- **THEN** the adapter refuses to run it.
- **WHEN** dry-run estimated bytes exceed 100 GB
- **THEN** the adapter refuses the query unless `--allow-large-scan` is passed.
