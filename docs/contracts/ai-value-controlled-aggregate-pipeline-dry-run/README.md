# AI Value Controlled Aggregate Pipeline Dry Run Contract

Validator/runner: `scripts/run_ai_value_controlled_aggregate_pipeline_dry_run.mjs`

## Purpose

Controlled Aggregate Pipeline Dry Run is the executable bridge from a
BigQuery/Sigma-shaped scrubbed aggregate export manifest into the existing
source-review and Measurement Cell candidate path.

It runs only this controlled path:

```text
BigQuery/Sigma-shaped dry-run manifest
+ saved scrubbed aggregate fixture
-> manifest boundary validation
-> Controlled Aggregate Fixture Review
-> Real Data Intake Packet Runner
-> Pilot Intake Runner / Source Packages
-> Source Package Review Queue path proof
-> Controlled Measurement Cell Assembly
-> compact internal Measurement Cell candidate proof
```

It is not a live connector, ingestion job, persistence path, route, UI,
dashboard, customer export, or customer-facing output.

## Pass Boundary

A passed dry run means only:

```text
PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW
```

Passed output may include compact metadata only:

- dry-run id and source system;
- manifest ref and manifest hash;
- aggregate fixture hash;
- reviewed source-ref hash;
- reviewed aggregate-context hash;
- reviewed Blueprint expectation hash;
- Measurement Cell candidate ref;
- selected metric id;
- selected expectation path id;
- candidate integrity hash;
- source package count;
- compact validation summary;
- caveats, blocked uses, and false boundary policy.

The true feed is `measurement_cell_candidate_proof`. Actual
`measurement_cell_snapshot`, `measurement_cell_snapshot_candidate`,
Measurement Cell Series, evidence continuity, claim readiness, executive
readout, API export, customer share package, finance context, confidence model,
probability output, ROI, and customer-facing financial output remain false.

## Fail-Closed Rules

The dry run blocks before candidate assembly on:

- unsupported source systems;
- non-dry-run execution modes;
- live BigQuery, Sigma, Glean, or customer connector execution flags;
- connector job ids, API run ids, query job refs, active connector status, or
  ingestion jobs;
- query text, SQL text, Sigma queries, preview rows, raw rows, raw exports,
  records, samples, metric-value payloads, prompts, transcripts, file contents,
  or identifiers;
- unsafe source refs, including encoded-looking or opaque refs;
- org, client, workflow, function, cohort, baseline-window, or
  comparison-window drift;
- stale reviewed aggregate-context or Blueprint expectation hashes;
- missing source-owner approval, review, or attestation posture;
- full child payloads such as Measurement Plan, Data Spine Readiness,
  Real Data Intake Packet Run, Pilot Intake Run, Source Packages, Source
  Package Review Queue, Measurement Cell payload, or Measurement Cell Series;
- `payload_json`, `validation_json`, `source_refs_json`, or
  `blueprint_path_binding_json` smuggling;
- ROI, EBITA, EBITDA, finance-output, financial attribution, confidence,
  probability, p-value, causality, productivity, or customer-facing output
  fields.

When validation is fixture-bound, the script recomputes the aggregate fixture
hash, default manifest hash, and Measurement Cell candidate hash from the source
fixture. A hand-edited passed envelope is not accepted as provenance proof.
The shared validator treats `PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW` as
proof-valid only when the caller supplies the reviewed fixture plus expected
manifest hash, aggregate fixture hash, reviewed source-ref hash, and compact
Measurement Cell candidate ref from a fixture-bound rerun. Standalone compact
objects, held outputs, and blocked outputs are not valid pipeline proof.

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
npm run test:ai-value-controlled-aggregate-pipeline-dry-run
```

Executable sample:

```bash
npm run run:ai-value-controlled-aggregate-pipeline-dry-run
npm run run:ai-value-controlled-aggregate-pipeline-dry-run -- --source-system=sigma_export
```

Recommended adjacent checks:

```bash
npm run test:ai-value-controlled-aggregate-fixture-review
npm run test:ai-value-controlled-measurement-cell-assembly
npm run test:ai-value-real-data-intake-packet-runner
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-measurement-cell-assembly-runner
npm run test:ai-value-measurement-cell
```
