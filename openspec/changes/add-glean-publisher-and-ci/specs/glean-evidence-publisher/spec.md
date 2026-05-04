## ADDED Requirements

### Requirement: Glean document builder

The publisher SHALL transform an EvidenceBundle v1 JSON object into a Glean indexing document that includes all required indexed fields from `docs/integrations/glean/02-evidencebundle-to-glean-indexing.md`: `doc_id`, `org_id`, `schema_version`, `window`, `generated_at`, `suppression_applied`, `suppression_reasons`, exposure status fields, calibration presence fields, fragility status fields, `coverage_instrumented_sources`, and `coverage_missing_sources`, plus metadata keys `source_system`, `contract`, `window`, `suppression`, and `classification`.

#### Scenario: Deterministic doc_id

- **WHEN** building a document for org `acme`, window `weekly`, and bundle `generated_at` date `2026-03-31`
- **THEN** `doc_id` equals `org_acme_weekly_2026-03-31` (stable given the same inputs)

### Requirement: Publisher CLI

The CLI SHALL support `dry-run` (validate and print or write JSON) and `publish` (HTTP POST JSON to `GLEAN_INDEXING_URL` with optional `GLEAN_INDEXING_TOKEN` as Bearer). It SHALL accept `FLUENCYTRACR_BASE_URL`, auth headers consistent with the MCP adapter (`FLUENCYTRACR_SERVICE_TOKEN` or dev headers), and a comma-separated `GLEAN_PUBLISHER_ORG_IDS` list with per-org `window` defaulting to `weekly` unless overridden.

#### Scenario: Dry-run exits zero on valid bundle

- **WHEN** `dry-run` is run against a valid EvidenceBundle fixture
- **THEN** validation passes and the process exits with code 0

### Requirement: CI enforcement

The default CI pipeline SHALL run a script that validates at least one committed EvidenceBundle-shaped fixture against the Glean required-field contract without calling external Glean services.

#### Scenario: PR gate on fixture regression

- **WHEN** a fixture is modified to omit a required Glean field
- **THEN** the CI validation step fails

### Requirement: Optional scheduled automation

The repository MAY include a GitHub Actions workflow that on a schedule or `workflow_dispatch` runs the publisher CLI against configured secrets; the workflow SHALL be disabled by default if secrets are absent (documented in workflow comments).

#### Scenario: Manual dispatch

- **WHEN** a maintainer runs `workflow_dispatch` with secrets configured
- **THEN** the workflow runs the same CLI entrypoint as local `publish`
