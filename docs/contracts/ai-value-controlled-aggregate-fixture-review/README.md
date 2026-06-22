# AI Value Controlled Aggregate Fixture Review Contract

Validator/runner: `scripts/run_ai_value_controlled_aggregate_fixture_review.mjs`

## Purpose

Controlled Aggregate Fixture Review is the first executable controlled fixture
review path for the AI Value spine. It runs saved, aggregate-only fixture inputs
through the existing governed objects:

```text
Saved aggregate fixture
-> Data Spine Intake Readiness
-> Real Data Intake Packet Runner
-> Pilot Intake Runner
-> compact internal fixture review package
```

It is a test harness, not a live data pipeline, route, repository, ledger,
dashboard, or customer-facing output.

## Pass Boundary

A passed review means only:

```text
READY_FOR_MEASUREMENT_CELL_ASSEMBLY
```

The harness does not assemble a Measurement Cell, clear Source Package Review
Queue as durable proof, create series snapshots, write artifacts, or promote
confidence/finance/customer output.

## Fail-Closed Rules

The harness blocks or holds before engine execution on:

- unsafe source refs;
- source-ref drift against the Data Spine;
- missing, held, suppressed, or unknown aggregate telemetry;
- missing Layer 1 VBD summary or non-aggregate Layer 1 posture;
- raw rows, query text, prompts, transcripts, file contents, or identifiers;
- unsafe raw or identifier text in saved fixture context, nested blocked-use
  arrays, or externally loaded Measurement Plans;
- generic `ai_value_objects`, `executive_packet`, HTML readout, API export, or
  full-payload authority;
- live BigQuery, Sigma, Glean query, connector, ingestion-job, route, UI,
  repository, migration, schema, persistence, or output-file fields;
- ROI, EBITA, EBITDA, financial attribution, causality, productivity,
  probability, confidence, p-value, or customer-facing economic-output fields.

Passed reviews include a compact reviewed-source-ref hash for stale review
validation. The hash is review consistency metadata only; it is not a durable
signature, persistence record, Source Package clearance, or customer-facing
artifact.

## Validation

Run:

```bash
npm run test:ai-value-controlled-aggregate-fixture-review
```

Executable sample:

```bash
npm run run:ai-value-controlled-aggregate-fixture-review
```
