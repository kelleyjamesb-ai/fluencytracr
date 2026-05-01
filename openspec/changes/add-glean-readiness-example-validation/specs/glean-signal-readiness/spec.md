## ADDED Requirements

### Requirement: Glean readiness example validation

The system SHALL provide a local validation script that checks all Glean readiness example JSON files without network access. The script SHALL validate `GSR_2026_05` readiness maps, `GSR_INVENTORY_2026_05` inventories, and source fixture records.

#### Scenario: Valid examples pass

- **WHEN** the validator runs against `docs/contracts/glean-signal-readiness/examples`
- **THEN** every committed example file is parsed and validated by the matching shared schema

#### Scenario: Invalid example fails

- **WHEN** an example contains unknown fields, unsafe raw-content fields, or an unsupported schema version
- **THEN** the validator exits non-zero

### Requirement: Docs contract sweep includes readiness validation

The docs contract sweep SHALL run the Glean readiness example validator.

#### Scenario: Docs sweep

- **WHEN** `bash scripts/ci_docs_contract_sweep.sh` runs
- **THEN** malformed Glean readiness examples fail the sweep
