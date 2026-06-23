# AI Value Controlled Aggregate Manifest Validation

Validator/runner: `scripts/run_ai_value_controlled_aggregate_manifest_validation.mjs`

## Purpose

Controlled Aggregate Manifest Validation is the executable saved-fixture layer
between the credential-safe connector adapter and any future pipeline promotion
decision. It proves that a reviewed BigQuery/Sigma-shaped aggregate adapter
packet can be represented as the three governed manifest contracts:

```text
saved scrubbed aggregate fixture
-> Controlled Aggregate Connector Adapter
-> Source Inventory Manifest
-> Aggregate Extraction Manifest
-> Pipeline Run Review Manifest
-> manifest-chain validation package
```

It is not manifest persistence, pipeline-run storage, Source Package clearance,
Measurement Cell creation, Measurement Cell snapshot persistence, Measurement
Cell Series persistence, live BigQuery/Sigma/Glean execution, a route, UI,
export, confidence model, finance output, or customer-facing output.

## Pass Boundary

A passed run means only:

```text
PASSED_CONTROLLED_AGGREGATE_MANIFEST_VALIDATION
```

Passed output may include:

- connector adapter ref;
- approved expectation-path binding;
- compact Source Inventory Manifest;
- compact Aggregate Extraction Manifest;
- compact Pipeline Run Review Manifest;
- manifest refs and hashes;
- Data Spine alignment envelope;
- Source Package Review Queue posture ref;
- validation summary;
- caveats, blocked uses, false feeds, and false boundary policy.

The Source Package Review Queue posture ref is deterministic eligibility
context only. Even when the posture state is `DATA_SPINE_REVIEW_READY`, this
package does not clear Source Package Review Queue review, create a Source
Package, or authorize Measurement Cell readiness.

The only true feeds are:

- `controlled_aggregate_manifest_validation`;
- `source_inventory_manifest_review`;
- `aggregate_extraction_manifest_review`;
- `pipeline_run_review_manifest_review`;
- `connector_adapter_review_reference`;
- `manual_operator_promotion_review`.

All live execution, persistence, Source Package clearance, Measurement Cell,
Series, evidence continuity, claim/readout, export, finance, research model,
and customer-facing feeds must remain false.

## Fail-Closed Rules

The package blocks on:

- unsupported source systems;
- failed connector adapter review;
- source inventory, aggregate extraction, or pipeline review validation failure;
- stale or hand-edited saved-fixture manifest refs;
- stale approved expectation-path binding;
- missing saved-fixture recomputation for passed packages;
- hand-edited wrapper state, feed, boundary, manifest, manifest-ref, caveat, or
  validation-summary fields;
- source lane, source system, org, client, workflow, function, cohort, window,
  metric, source-owner, or selected-path drift;
- unsafe source refs, including query/job/API/dashboard/export/live connector
  refs;
- raw rows, dashboard rows, query text, SQL text, prompts, transcripts, file
  contents, direct identifiers, row IDs, span IDs, hashed or joinable person
  identifiers;
- Source Package clearance aliases;
- Measurement Cell snapshot or Series aliases;
- ROI, EBITDA, finance-output, financial attribution, causality, productivity,
  probability, confidence, score-like, research-model, or customer-facing
  output fields;
- JSON-style smuggling through payload, validation, source refs, path binding,
  caveats, blocked uses, manifests, or compact posture fields.

## Non-Authorization

This contract does not authorize:

- manifest persistence;
- pipeline-run persistence;
- Prisma schemas or migrations;
- repositories;
- backend routes;
- frontend UI;
- ingestion jobs;
- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- credential handling;
- raw-row parsing or ingestion;
- SQL or query-text storage;
- Source Package clearance;
- Measurement Cell creation;
- Measurement Cell snapshot persistence;
- Measurement Cell Series persistence;
- evidence continuity persistence;
- finance-context investigation;
- confidence research input;
- probability output;
- ROI, EBITDA, causality, productivity, or financial attribution;
- customer-facing output or customer-facing financial output.

## Validation

Run:

```bash
npm run test:ai-value-controlled-aggregate-manifest-validation
```

Executable samples:

```bash
npm run run:ai-value-controlled-aggregate-manifest-validation
npm run run:ai-value-controlled-aggregate-manifest-validation -- --source-system=sigma_export
```

Recommended adjacent checks:

```bash
npm run test:ai-value-controlled-aggregate-manifests
npm run test:ai-value-controlled-aggregate-connector-adapter
npm run test:ai-value-controlled-aggregate-pipeline-dry-run
npm run test:ai-value-controlled-measurement-cell-assembly
```
