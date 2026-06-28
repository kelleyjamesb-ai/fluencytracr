# AI Value Connector Promotion Readiness Sequence

Validator/runner:
`scripts/run_ai_value_connector_promotion_readiness_sequence.mjs`

Schema version:
`FT_AI_VALUE_CONNECTOR_PROMOTION_READINESS_SEQUENCE_2026_06`

## Purpose

Connector Promotion Readiness Sequence records the four next actions after
Compact Source Wiring Hardening, without crossing into live execution or model
math.

It answers:

```text
What exact promotion gates must exist before live connector implementation or
weights/Bayesian research readiness can be considered?
```

It does not answer:

```text
Can FluencyTracr run BigQuery, Sigma, or Glean?
What are the weights?
What is the Bayesian model?
Can model, probability, confidence, or finance output be emitted?
```

## Sequence

The executable sequence is:

```text
Compact Source Wiring Hardening
-> non-live connector promotion decision requirements
-> held Glean source adapter boundary plan
-> source descriptor promotion checklist for human review
-> exact-scope BigQuery/Sigma live connector promotion gate design
```

Ready state:

```text
CONNECTOR_PROMOTION_READINESS_SEQUENCE_DESIGNED_NON_LIVE
```

Held or rejected states:

```text
HOLD_FOR_COMPACT_SOURCE_WIRING_HARDENING
REJECTED_FOR_BOUNDARY_LEAKAGE
```

## The Four Actions

### 1. Non-Live Connector Promotion Requirements

State:

```text
READY_REQUIREMENTS_DRAFT_ONLY
```

This action documents what a later connector promotion decision must prove. It
does not authorize a connector implementation.

Required posture:

- prepared sources are `bigquery_export` and `sigma_export` descriptors only;
- no credentials, SQL, query text, raw rows, dashboard rows, project/dataset/
  table/job/workbook handles, or connector run ids enter FluencyTracr;
- all live execution feeds stay false;
- the next review owner is human.

### 2. Held Glean Source Adapter Boundary

State:

```text
HELD_NON_LIVE_GLEAN_ADAPTER_BOUNDARY_REQUIRED
```

Glean remains held. This sequence does not prepare Glean query execution or
Glean live wiring. A later exact-scope non-live adapter boundary plan must exist
before Glean can even join descriptor-promotion review.

### 3. Source Descriptor Promotion Checklist

State:

```text
READY_FOR_HUMAN_REVIEW_CHECKLIST
```

The checklist is a human review checkpoint. It should prove that compact
descriptors are non-live, non-customer-facing, non-joinable, and not source
handles. It must happen before any live connector gate can be reviewed.

### 4. Exact-Scope Live Connector Promotion Gate Design

State:

```text
DESIGNED_EXACT_SCOPE_GATE_REQUIREMENTS_ONLY
```

This is a gate design, not a live connector. The design may define what a future
BigQuery/Sigma live connector promotion gate would require, but it must keep all
execution false until a later human-approved implementation decision exists.

## Weights And Bayesian Readiness

The sequence names the target:

```text
full_data_model_with_weights_and_bayesian_ready
```

Current state:

```text
not_ready_requirements_and_gate_design_only
```

Required future prerequisites:

- source descriptor promotion human review passed;
- exact-scope live connector promotion gate approved;
- live connector execution boundary implemented upstream only;
- research math data model source binding revalidated;
- numeric weight candidate review promoted;
- Bayesian design review promoted.

This sequence explicitly keeps these false:

- `numeric_weights_authorized`;
- `bayesian_model_authorized`;
- `model_output_authorized`.

## Non-Authorization

This contract does not authorize:

- live BigQuery execution;
- live Sigma execution;
- live Glean queries;
- customer connector execution;
- credentials, service accounts, OAuth handles, tokens, or secrets;
- query execution or SQL/query-text storage;
- project, dataset, table, job, dashboard, workbook, warehouse, connector-run,
  API-run, or export handles;
- raw rows, dashboard rows, prompts, responses, transcripts, file contents,
  identifiers, row ids, span ids, emails, employee/person aliases, or hashed
  identifiers;
- Source Package clearance;
- Measurement Cell creation;
- Measurement Cell snapshot writes;
- Measurement Cell Series persistence;
- Evidence Continuity persistence;
- backend routes, frontend UI, exports, rendered readouts;
- research-model feeds, statistical model equations, numeric weights, Bayesian
  model execution, confidence output, probability output, score output, finance
  output, ROI, causality, productivity, customer-facing output, or
  customer-facing economic output.

Rejected records do not echo unsafe values.

## Validation

Run:

```bash
npm run test:ai-value-connector-promotion-readiness-sequence
```

Executable sample:

```bash
npm run run:ai-value-connector-promotion-readiness-sequence
```

Recommended adjacent checks:

```bash
npm run test:ai-value-compact-source-wiring-hardening
npm run test:ai-value-contribution-alignment-internal-research-math-data-model
```
