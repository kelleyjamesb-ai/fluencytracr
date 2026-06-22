# AI Value Controlled Measurement Cell Assembly Contract

Validator/runner: `scripts/run_ai_value_controlled_measurement_cell_assembly.mjs`

## Purpose

Controlled Measurement Cell Assembly is the controlled executable gate after
Controlled Aggregate Fixture Review.

It runs a saved aggregate fixture through the existing governed path:

```text
Saved aggregate fixture
-> Controlled Aggregate Fixture Review
-> reviewed source-ref hash check
-> reviewed aggregate-context hash check
-> reviewed Blueprint expectation hash check
-> rebuilt Data Spine Readiness
-> actual Real Data Intake source-package owner/attestation/ref/grain cross-check
-> rebuilt Source Package Review Queue metadata
-> rebuilt Blueprint Operator Source Handoff from reviewed Blueprint expectation input
-> fixture-derived aggregate AI Fluency, VBD, token, metric, governance, and
   assumption context checks
-> Real Data Intake Packet Runner
-> existing Measurement Cell Assembly Runner
-> compact internal Measurement Cell candidate metadata
```

This layer reuses the canonical Measurement Cell Assembly Runner and Measurement
Cell builder. It does not create a second Measurement Cell model.

The wrapper must not manufacture evidence defaults. Passed candidates require
the reviewed aggregate fixture to carry reviewed Blueprint expectation input,
the aggregate VBD summary, token summary, AI Fluency summary, selected metric
values, and governed context source refs needed by the existing Measurement
Cell Assembly Runner.

## Pass Boundary

A passed candidate means only:

```text
PASSED_INTERNAL_MEASUREMENT_CELL_CANDIDATE_REVIEW
```

The output is compact internal candidate metadata. It may include:

- fixture id;
- compact candidate integrity hash;
- controlled review state and reviewed source refs hash;
- reviewed aggregate context hash;
- reviewed Blueprint expectation hash;
- assembly run id and Measurement Cell reference;
- selected metric id;
- selected expectation path id;
- source package count;
- validation summary;
- caveats and blocked uses.

Passed-candidate validation is source-fixture-bound. The compact candidate
integrity hash is a tamper check for the emitted object, not an authorization
signature. A passed candidate must validate against a fresh rerun from the
reviewed source fixture; standalone compact-object validation is not sufficient
to certify provenance.

The output must not include full child objects such as:

- Measurement Plan;
- Data Spine Readiness;
- Source Package Review Queue;
- Real Data Intake Packet Run;
- Pilot Intake Run;
- Source Packages;
- Blueprint Operator Source Handoff;
- Measurement Cell input;
- Measurement Cell payload;
- Measurement Cell Series;
- evidence snapshots, claim handoffs, executive packets, or customer exports.

## Fail-Closed Rules

The runner holds or blocks before Measurement Cell Assembly when the controlled
aggregate fixture review is not passed, including:

- missing, held, suppressed, or unknown aggregate telemetry;
- missing Layer 1 VBD summary;
- source-ref drift against the Data Spine;
- stale reviewed source-ref hashes;
- stale reviewed aggregate-context hashes, including source package window,
  source-owner, attestation, privacy, allowed/blocked-use, VBD, token, AI
  Fluency, source provenance, and selected metric context drift;
- stale reviewed Blueprint expectation hashes, including selected path, metric,
  lag, approval, owner, source, window, and expected behavior drift;
- aggregate metric summary drift against the selected customer metric;
- unsupported or drifted source-lane aggregate grain;
- scrubbed export owner, approver, or attestation drift against governed lane
  expectations;
- Real Data Intake source-package owner, attestation, source ref, or
  aggregate-grain drift;
- unsafe source refs, including lane-prefixed encoded-looking refs;
- raw rows, query text, prompts, transcripts, file contents, or identifiers;
- nested payload smuggling through compact arrays, policy maps, validation gaps,
  missing-evidence lists, required caveats, refs, or internal metadata;
- mirrored compact hash tampering, recomputed self-hash forgery, or hand-filled
  passed-candidate metadata that does not match a fixture-bound rerun;
- generic `ai_value_objects`, `payload_json`, `validation_json`,
  `source_refs_json`, or full-payload authority;
- live BigQuery, Sigma, Glean query, connector, ingestion-job, route, UI,
  repository, migration, schema, persistence, or output-file fields;
- ROI, EBITA, EBITDA, financial attribution, causality, productivity,
  probability, confidence, p-value, finance-output, or customer-facing
  economic-output fields.

If the controlled review passes, the runner still re-executes the existing
Measurement Cell Assembly Runner and validates the assembled run. A fixture pass
does not bypass Source Package Review Queue, Blueprint selected-path validation,
Data Spine, Measurement Plan, Real Data Intake, or Measurement Cell validation.
Any underlying assembly-runner decision surfaced in the compact reference is
internal diagnostic evidence only. This wrapper keeps downstream Value
Hypothesis, finance-context, confidence, probability, persistence, and
customer-facing feeds false.

## Non-Authorization

This contract does not authorize:

- persistence;
- Prisma schemas or migrations;
- repositories;
- backend routes;
- frontend UI;
- live BigQuery, Sigma, Glean, or customer connector execution;
- output-file writes;
- Measurement Cell snapshots or series persistence;
- Value Hypothesis packet execution;
- confidence math;
- probability output;
- ROI, EBITA, EBITDA, causality, productivity, or financial attribution;
- customer-facing output or customer-facing financial output.

## Validation

Run:

```bash
npm run test:ai-value-controlled-measurement-cell-assembly
```

Executable sample:

```bash
npm run run:ai-value-controlled-measurement-cell-assembly
```

Recommended adjacent checks:

```bash
npm run test:ai-value-controlled-aggregate-fixture-review
npm run test:ai-value-real-data-intake-packet-runner
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-measurement-cell-assembly-runner
npm run test:ai-value-measurement-cell
```
