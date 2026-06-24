# AI Value Measurement Cell Preflight Runner

Validator/runner: `scripts/run_ai_value_measurement_cell_preflight_runner.mjs`

## Purpose

The Measurement Cell Preflight Runner is the executable bridge from reviewed
BigQuery/Sigma-style aggregate package evidence into a compact internal
Measurement Cell snapshot-candidate proof.

It runs this controlled path:

```text
Reviewed aggregate export boundary
-> Controlled Aggregate Pipeline Dry Run
-> Controlled Measurement Cell Assembly
-> compact Measurement Cell snapshot candidate ref
```

BigQuery uses the BigQuery Aggregate Export Review validator. Sigma-shaped
inputs use the Aggregate Connector Boundary Plan validator before they may be
represented as passed Sigma aggregate connector-boundary proof. The compact
reviewed boundary ref and pipeline dry-run ref must carry the same scrubbed
`source_export_ref`; source-ref mismatch fails closed.

It does not create a live connector, ingestion job, backend route, frontend UI,
schema, migration, persistent row, customer export, rendered readout, finance
output, ROI proof, causality claim, productivity claim, probability output, or
research-model feed.

## Pass Boundary

A passed preflight means only:

```text
PASSED_INTERNAL_MEASUREMENT_CELL_PREFLIGHT
```

Passed output may include compact metadata only:

- aggregate export review ref;
- controlled pipeline dry-run ref;
- Measurement Cell assembly ref;
- one snapshot-candidate ref with selected path, metric, window, source-ref
  binding, and compact aggregate-boundary proof;
- preflight and snapshot-candidate integrity hashes;
- compact validation summary;
- safe caveats, blocked uses, and false boundary policy.

The output must not include full child objects such as Measurement Plan, Data
Spine Readiness, Real Data Intake Packet Run, Pilot Intake Run, Source
Packages, Source Package Review Queue, Blueprint Operator Source Handoff,
Measurement Cell input, Measurement Cell payload, Measurement Cell Series,
payload JSON, validation JSON, source refs JSON, or Blueprint path binding JSON.

## Fail-Closed Rules

The preflight runner blocks or holds on:

- unsupported source systems;
- live BigQuery, Sigma, Glean, customer connector, or query execution flags;
- raw rows, dashboard rows, query text, SQL text, prompts, responses,
  transcripts, file contents, identifiers, job metadata, or project/dataset/table
  refs;
- held, missing, stale, or suppressed aggregate telemetry;
- source-ref drift;
- reviewed aggregate boundary / pipeline `source_export_ref` mismatch;
- snapshot-candidate aggregate-boundary proof drift, missing reviewed
  `source_export_ref`, missing review hash, mismatched pipeline source ref, or
  unsafe compact boundary refs;
- stale aggregate fixture, reviewed source-ref, aggregate-context, Blueprint
  expectation, candidate, snapshot-candidate, or preflight integrity hashes;
- org, client, workflow, function, cohort, selected metric, selected path,
  metric lag, approval, or window drift;
- hand-edited passed-state envelopes;
- full child payload smuggling;
- open-container payload smuggling through validation summary, feeds, boundary
  policy, blocked uses, caveats, or nested source refs;
- Measurement Plan overrides until the pipeline dry-run layer supports binding
  the same override;
- route, UI, schema, migration, repository, output-file, or persistence side
  doors;
- ROI, EBITDA, finance-output, causality, productivity, probability, score, or
  research-model fields.

Held snapshot candidates do not authorize source package clearance or snapshot
persistence. Passed snapshot candidates remain internal proof artifacts only.
The separately promoted backend-internal Measurement Cell Snapshot write path
must require a passed snapshot candidate ref, recompute the durable snapshot
binding, and reject the write if the candidate path, metric, window, source
refs, aggregate-boundary proof, hashes, approval, or source-bound lineage drift.

## Non-Authorization

This contract does not authorize:

- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- customer connector execution;
- raw-row parsing;
- SQL or query-text storage;
- output-file writes;
- persistence;
- Prisma schemas or migrations;
- repositories;
- backend routes;
- frontend UI;
- Source Package clearance;
- Measurement Cell snapshot persistence by this preflight runner;
- Measurement Cell Series persistence;
- finance-context investigation;
- confidence math;
- probability output;
- ROI, EBITDA, causality, productivity, or financial attribution;
- customer-facing output or customer-facing financial output.

## Validation

Run:

```bash
npm run test:ai-value-measurement-cell-preflight-runner
```

Executable samples:

```bash
npm run run:ai-value-measurement-cell-preflight-runner
npm run run:ai-value-measurement-cell-preflight-runner -- --source-system=sigma_export
```

Recommended adjacent checks:

```bash
npm run test:ai-value-bigquery-aggregate-export-review
npm run test:ai-value-controlled-aggregate-pipeline-dry-run
npm run test:ai-value-controlled-measurement-cell-assembly
npm run test:ai-value-controlled-aggregate-fixture-review
```
