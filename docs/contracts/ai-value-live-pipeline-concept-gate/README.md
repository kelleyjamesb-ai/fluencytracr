# AI Value Live Pipeline Concept Gate

Status: executable internal gate only. This contract does not authorize backend
routes, frontend UI, Prisma schema changes, migrations, repository methods,
persistence writes, live Glean, Sigma, or BigQuery execution, ingestion jobs,
export packages, rendered customer readouts, contribution-model math, ROI,
causality, productivity, probability, or customer-facing financial output.

The Live Pipeline Concept Gate is the next safety layer after a reviewed
aggregate package has successfully reached Measurement Cell preflight and the
backend-internal `measurement_cell_snapshots` landing point.

It answers one question:

```text
Can the team draft a separate live-pipeline concept review without weakening
the upstream aggregate boundary?
```

It does not answer:

```text
Can FluencyTracr run BigQuery or Sigma?
```

## Inputs

The executable runner starts from the existing controlled aggregate fixture and
recomputes the Measurement Cell preflight proof:

```text
saved scrubbed aggregate fixture
-> Measurement Cell preflight runner
-> compact snapshot-candidate aggregate-boundary proof
-> Live Pipeline Concept Gate
```

The gate requires:

- source system: `bigquery_export` or `sigma_export`;
- valid Measurement Cell preflight proof;
- compact snapshot-candidate ref;
- compact aggregate export review ref;
- compact aggregate source export ref;
- aggregate export review hash;
- pipeline dry-run ref;
- pipeline-boundary hash;
- Measurement Cell snapshot promotion already in place;
- manifest persistence still false;
- Series persistence still false;
- customer projection still false;
- export governance still false;
- research-model promotion still false;
- finance output promotion still false.

## Output

The only ready state is:

```text
READY_FOR_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW
```

Ready means the next document or implementation plan may propose an exact-scope
live-pipeline concept review. It does not authorize live execution.

Held or rejected states:

```text
HOLD_FOR_VALID_MEASUREMENT_CELL_PREFLIGHT
REJECTED_FOR_BOUNDARY_LEAKAGE
```

## Required False Feeds

These feeds must remain false:

- live BigQuery execution;
- live Sigma execution;
- live Glean query;
- customer connector execution;
- credential access;
- query execution;
- raw-row ingestion;
- dashboard-row ingestion;
- connector-run storage;
- pipeline-run storage;
- manifest storage;
- Measurement Cell Series persistence;
- customer projection;
- export creation;
- research-model feed;
- finance output.

## Fail-Closed Rules

The gate fails closed on:

- credentials, secrets, tokens, service-account refs, or OAuth handles;
- SQL, query text, query refs, job ids, API run handles, project refs, dataset
  refs, table refs, dashboard URLs, export URLs, or connector job handles;
- raw rows, dashboard rows, files, prompts, responses, transcripts, ticket
  contents, file contents, or action rows;
- direct identifiers, row ids, span ids, respondent ids, employee ids, user
  ids, emails, hashed identifiers, or joinable person keys;
- Source Package clearance aliases;
- Measurement Cell readiness aliases;
- Measurement Cell Series persistence aliases;
- customer-facing projection or export aliases;
- ROI, EBITDA, finance-output, causality, workforce productivity measurement,
  probability, contribution-model, research-model, or score-like fields;
- JSON payload aliases such as `payload_json`, `validation_json`,
  `source_refs_json`, or `blueprint_path_binding_json`.

## Runner

The executable runner lives at:

```text
scripts/run_ai_value_live_pipeline_concept_gate.mjs
```

Narrow verification:

```bash
npm run test:ai-value-live-pipeline-concept-gate
```

CLI example:

```bash
npm run run:ai-value-live-pipeline-concept-gate
```

Use `--source-system=sigma_export` to review the Sigma-shaped path.

## Boundary

This gate deliberately keeps FluencyTracr on the safe side of the boundary:

```text
approved Glean/customer execution environment
-> aggregate extraction and suppression upstream
-> reviewed aggregate manifests and compact refs
-> FluencyTracr validation
```

Blocked boundary:

```text
FluencyTracr receives credentials
-> FluencyTracr runs SQL/dashboard/API queries
-> raw rows or query text enter FluencyTracr
-> pipeline runs, exports, or customer-facing outputs are created
```
