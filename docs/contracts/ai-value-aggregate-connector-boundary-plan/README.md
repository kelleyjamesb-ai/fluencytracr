# AI Value Aggregate Connector Boundary Plan

Validator/runner: `scripts/run_ai_value_aggregate_connector_boundary_plan.mjs`

## Purpose

Aggregate Connector Boundary Plan is the non-live executable layer authorized by
the AI Value Pipeline Promotion Decision. It validates a reviewed
BigQuery/Sigma-shaped aggregate export plan before any live connector,
pipeline-run storage, manifest persistence, route, UI, export, research model,
finance output, or customer-facing output exists.

It runs only this saved-fixture path:

```text
saved scrubbed aggregate fixture
-> Controlled Aggregate Connector Adapter
-> Aggregate Connector Boundary Plan
-> internal operator-review boundary decision
```

It is not a live BigQuery connector, live Sigma connector, Glean query runner,
customer connector, ingestion job, manifest persistence path, pipeline-run
storage path, Source Package clearance, Measurement Cell creation, Measurement
Cell Series persistence, route, UI, customer export, confidence model, finance
output, or customer-facing output.

## Pass Boundary

A passed plan means only:

```text
PASSED_AGGREGATE_CONNECTOR_BOUNDARY_PLAN_REVIEW
```

Passed output may include:

- source system: `bigquery_export` or `sigma_export`;
- source owner role and attestation;
- approved upstream execution boundary;
- no-live-execution posture;
- aggregate definition ref, not SQL text;
- aggregate output ref, not raw output or a live handle;
- approved aggregate output fields;
- workflow, function, cohort, window, metric, and expectation-path alignment;
- k-min, suppression, freshness, and legal/trust posture;
- compact connector adapter refs;
- false feeds, false boundary policy, blocked uses, caveats, and validation
  summary.

The only true feeds are:

- `aggregate_connector_boundary_plan_review`;
- `saved_fixture_connector_adapter_candidate`.

All live execution, credentials, query execution, raw-row ingestion, dashboard
row ingestion, persistence, Source Package clearance, Measurement Cell,
Measurement Cell Series, continuity, claim/readout, export, finance, research,
and customer-facing feeds must remain false.

## Fail-Closed Rules

The plan blocks on:

- unsupported source systems;
- failed connector adapter review;
- source-owner role, attestation, review-state, or source-system drift;
- missing or unsafe aggregate definition refs;
- SQL, query text, job IDs, query IDs, API run IDs, dashboard URLs, export
  URLs, connector job IDs, active run handles, credentials, or secrets;
- project/dataset/table identifiers exposed to FluencyTracr;
- raw rows, dashboard rows, row IDs, span IDs, prompts, transcripts, files,
  direct identifiers, hashed identifiers, or joinable person keys;
- non-governed aggregate output fields;
- missing or non-terminal k-min, suppression, freshness, or legal/trust
  posture;
- boundary policy, feed, validation-summary, or wrapper-key tampering;
- stale or hand-edited saved-fixture plan output;
- Source Package clearance aliases;
- Measurement Cell readiness, snapshot, or Series aliases;
- ROI, EBITDA, finance-output, financial attribution, causality, productivity,
  probability, confidence, score-like, research-model, or customer-facing
  output fields;
- JSON-style smuggling through payload, validation, source refs, path binding,
  caveats, blocked uses, refs, manifests, boundary policy, or compact posture
  fields.

## Non-Authorization

This contract does not authorize:

- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- customer connector execution;
- credential handling;
- query execution;
- SQL or query-text storage;
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
- confidence math;
- probability output;
- ROI, EBITDA, causality, productivity, or financial attribution;
- customer-facing output or customer-facing financial output.

## Validation

Run:

```bash
npm run test:ai-value-aggregate-connector-boundary-plan
```

Executable samples:

```bash
npm run --silent run:ai-value-aggregate-connector-boundary-plan
npm run --silent run:ai-value-aggregate-connector-boundary-plan -- --source-system=sigma_export
```

Recommended adjacent checks:

```bash
npm run test:ai-value-controlled-aggregate-connector-adapter
npm run test:ai-value-controlled-aggregate-manifest-validation
npm run test:ai-value-controlled-aggregate-pipeline-dry-run
```
