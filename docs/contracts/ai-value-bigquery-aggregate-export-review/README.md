# AI Value BigQuery Aggregate Export Review

Runner: `scripts/run_ai_value_bigquery_aggregate_export_review.mjs`

## Purpose

BigQuery Aggregate Export Review is a non-live executable layer for reviewing a
BigQuery-shaped aggregate export package after the Aggregate Connector Boundary
Plan passes.

It runs only this saved-fixture path:

```text
saved scrubbed aggregate fixture
-> Aggregate Connector Boundary Plan
-> BigQuery Aggregate Export Review
-> internal operator-review result
```

It is not a live BigQuery connector, query runner, credential handler, ingestion
job, persistence path, Source Package clearance, Measurement Cell creation,
route, UI, export, research model, finance output, or customer-facing output.

## Pass Boundary

A passed review means only:

```text
PASSED_BIGQUERY_AGGREGATE_EXPORT_REVIEW
```

Passed output may include:

- `source_system: bigquery_export`;
- source owner role and aggregate-only attestation;
- upstream BigQuery execution boundary;
- no-live-execution posture;
- upstream dry-run attestation ref, not job metadata;
- aggregate definition ref, not SQL text;
- aggregate output ref, not raw output or table ref;
- approved aggregate output fields;
- workflow, function, cohort, window, metric, and expectation-path alignment;
- k-min, suppression, freshness, and legal/trust posture;
- compact Aggregate Connector Boundary Plan ref;
- false feeds, false boundary policy, blocked uses, caveats, and validation
  summary.

The only true feeds are:

- `bigquery_aggregate_export_review`;
- `aggregate_connector_boundary_plan_reference`.

All live execution, credentials, query execution, job metadata, project/dataset
/table refs, raw-row ingestion, persistence, Source Package clearance,
Measurement Cell, Measurement Cell Series, continuity, claim/readout, export,
finance, research, and customer-facing feeds must remain false.

## Fail-Closed Rules

The review blocks on:

- non-BigQuery source systems;
- failed Aggregate Connector Boundary Plan validation;
- source-owner role, attestation, review-state, or source-system drift;
- missing or unsafe aggregate definition refs;
- SQL, query text, query plans, job IDs, query IDs, BigQuery job metadata, API
  run IDs, connector job IDs, active run handles, credentials, or secrets;
- project, dataset, or table identifiers exposed to FluencyTracr;
- retained BigQuery dry-run cost details such as bytes processed or slot
  metadata;
- raw rows, dashboard rows, row IDs, span IDs, prompts, transcripts, files,
  direct identifiers, hashed identifiers, or joinable person keys;
- non-governed aggregate output fields;
- missing or non-terminal k-min, suppression, freshness, or legal/trust
  posture;
- feed, boundary-policy, validation-summary, or wrapper-key tampering;
- stale or hand-edited saved-fixture review output;
- Source Package clearance aliases;
- Measurement Cell readiness, snapshot, or Series aliases;
- ROI, EBITDA, finance-output, financial attribution, causality, productivity,
  probability, score-like, research-model, or customer-facing output fields;
- JSON-style smuggling through payload, validation, source refs, path binding,
  caveats, blocked uses, compact refs, or posture fields.

## Non-Authorization

This contract does not authorize:

- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- customer connector execution;
- credential handling;
- query execution;
- SQL or query-text storage;
- BigQuery job metadata retention;
- project/dataset/table-ref retention;
- raw-row parsing or ingestion;
- dashboard-row ingestion;
- output-file writes;
- persistence;
- Prisma schemas or migrations;
- repositories;
- backend routes;
- frontend UI;
- Source Package clearance;
- Measurement Cell creation;
- Measurement Cell snapshot persistence;
- Measurement Cell Series persistence;
- evidence continuity persistence;
- finance-context investigation;
- research-model promotion;
- probability output;
- ROI, EBITDA, causality, productivity, or financial attribution;
- customer-facing output or customer-facing financial output.

## Validation

Run:

```bash
npm run test:ai-value-bigquery-aggregate-export-review
```

Executable sample:

```bash
npm run --silent run:ai-value-bigquery-aggregate-export-review
```

Recommended adjacent checks:

```bash
npm run test:ai-value-aggregate-connector-boundary-plan
npm run test:ai-value-controlled-aggregate-manifest-validation
npm run test:ai-value-controlled-aggregate-connector-adapter
npm run test:ai-value-controlled-aggregate-pipeline-dry-run
```
