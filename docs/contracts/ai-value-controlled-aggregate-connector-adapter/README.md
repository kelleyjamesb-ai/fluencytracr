# AI Value Controlled Aggregate Connector Adapter Contract

Validator/runner: `scripts/run_ai_value_controlled_aggregate_connector_adapter.mjs`

## Purpose

Controlled Aggregate Connector Adapter is the credential-safe bridge after the
Controlled Aggregate Pipeline Dry Run. It proves that a reviewed
BigQuery/Sigma-shaped aggregate export can be represented as an internal
connector review packet without running a connector.

It runs only this controlled path:

```text
saved scrubbed aggregate fixture
-> Controlled Aggregate Pipeline Dry Run
-> credential-safe aggregate connector manifest
-> connector adapter boundary validation
-> compact internal connector review packet
```

It is not a live BigQuery connector, Sigma connector, Glean query runner,
customer connector, ingestion job, persistence path, route, UI, dashboard,
customer export, or customer-facing output.

## Pass Boundary

A passed adapter run means only:

```text
PASSED_INTERNAL_CONNECTOR_ADAPTER_REVIEW
```

Passed output may include compact metadata only:

- adapter run id and source system;
- connector manifest ref and connector manifest hash;
- aggregate export ref;
- org, client, workflow, function, cohort, and window binding;
- owner approval and attestation posture;
- compact pipeline dry-run ref;
- Measurement Cell candidate proof reference;
- internal connector review packet;
- caveats, blocked uses, false boundary policy, and validation summary.

The true feeds are:

- `aggregate_connector_adapter_review`;
- `connector_review_packet`;
- `pipeline_dry_run_review`;
- `measurement_cell_candidate_proof`.

Actual live BigQuery execution, live Sigma execution, live Glean query,
customer connector execution, credential access, query execution, raw-row
ingestion, durable connector-run storage, Source Package clearance, Measurement
Cell snapshot candidate, Measurement Cell snapshot, Measurement Cell Series,
evidence continuity, claim readiness, executive readout, API export, customer
share package, finance context, research model feed, ROI, and customer-facing
financial output remain false.

## Fail-Closed Rules

The adapter blocks on:

- unsupported source systems;
- non-reviewed aggregate-export adapter modes;
- live BigQuery, Sigma, Glean, or customer connector execution flags;
- credential, query, raw-row, prompt, transcript, or identifier indicators;
- connector job ids, API run ids, query refs, active connector status, or
  ingestion jobs;
- unsafe aggregate export refs, including encoded-looking or opaque refs;
- org, client, workflow, function, cohort, baseline-window, or
  comparison-window drift from the pipeline dry run;
- source-owner role or attestation drift;
- missing owner approval, clear review, or attestation posture;
- stale connector manifest hash;
- stale or hand-edited pipeline dry-run refs;
- full child payloads such as Source Packages, client evidence entries,
  Measurement Cell payloads, Measurement Cell Series, or source package payloads;
- `payload_json`, `validation_json`, `source_refs_json`, or
  `blueprint_path_binding_json` smuggling;
- ROI, EBITA, EBITDA, finance-output, financial attribution, confidence,
  probability, p-value, causality, productivity, or customer-facing output
  fields.

When validation is fixture-bound, the script recomputes the controlled pipeline
dry run, connector manifest hash, and compact dry-run ref from the source
fixture. A hand-edited passed adapter envelope is not accepted as connector
review proof.

## Non-Authorization

This contract does not authorize:

- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- customer connector execution;
- credential handling;
- raw-row parsing or ingestion;
- SQL or query-text storage;
- output-file writes;
- persistence;
- Prisma schemas or migrations;
- repositories;
- backend routes;
- frontend UI;
- Source Package clearance;
- Measurement Cell snapshot persistence;
- Measurement Cell Series persistence;
- finance-context investigation;
- confidence math;
- probability output;
- ROI, EBITA, EBITDA, causality, productivity, or financial attribution;
- customer-facing output or customer-facing financial output.

## Validation

Run:

```bash
npm run test:ai-value-controlled-aggregate-connector-adapter
```

Executable sample:

```bash
npm run run:ai-value-controlled-aggregate-connector-adapter
npm run run:ai-value-controlled-aggregate-connector-adapter -- --source-system=sigma_export
```

Recommended adjacent checks:

```bash
npm run test:ai-value-controlled-aggregate-pipeline-dry-run
npm run test:ai-value-controlled-aggregate-fixture-review
npm run test:ai-value-controlled-measurement-cell-assembly
npm run test:ai-value-real-data-intake-packet-runner
npm run test:ai-value-source-package-review-queue
```
