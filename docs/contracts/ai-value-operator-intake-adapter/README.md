# AI Value Operator Intake Adapter Contract

Schema version: `FT_AI_VALUE_OPERATOR_INTAKE_ADAPTER_RUN_2026_06`

Validator: `shared/src/aiValueEngine/operatorIntakeAdapter.ts`

## Purpose

The Operator Intake Adapter is a contract-only composer for operator-selected,
already-parsed, aggregate-safe source objects.

It assembles the governed pipe:

```text
approved aggregate source references
-> Data Spine Readiness
-> Source Package Review Queue
-> Real Data Intake Packet Run
-> Measurement Cell Assembly Run
-> governed time-series run references
```

It exists so future confidence-model work can consume repeatable governed run
references instead of ad hoc rows, manual demos, or unreviewed exports.

## Inputs

Required:

- `orgId`
- `clientId`
- `workflowFamily`
- `functionArea`
- `cohortKey`
- `baselineWindow`
- `comparisonWindow`
- `sources`
- `measurementPlan`
- `measurementCellInput`

Optional:

- `sourcePackages`
- `scrubbedGleanExports`
- `runId`
- `generatedAt`

All inputs must be already-parsed aggregate-safe structured objects. The
adapter does not parse files, read Google Sheets, run BigQuery, or inspect raw
customer exports.

For the AI Fluency source lane, the recommended upstream bridge is the
AI Fluency Operator Source Handoff:

```text
AI Fluency Aggregate Export Parser
-> AI Fluency Dashboard Import Runner
-> AI Fluency Operator Source Handoff
-> Operator Intake Adapter
```

That handoff can provide the `sources.aiFluency` operator source, the
operator-provided `measurementCellInput.aiFluencyContext` fragment, and the
layer-2 `source_refs.aggregate_export_id` reference for Source Package review.
It remains a source-preparation object only; it does not validate Measurement
Cells, feed finance-context investigation, feed a confidence model, or create
customer-facing financial output.

For the VBD/token source lane, the recommended upstream bridge is the
VBD + Token Operator Source Handoff:

```text
VBD Token Aggregate Intake
-> VBD + Token Operator Source Handoff
-> Operator Intake Adapter
```

That handoff can provide the `sources.vbdToken` operator source plus
operator-provided `measurementCellInput.vbdContext` and
`measurementCellInput.tokenContext` fragments. Its
`source_package_reference.source_refs.aggregate_probe_id` is an alignment hint
only. A matching valid, feedable, aligned Layer 1 Source Package remains
required before Source Package Review Queue can clear the `vbd_token` lane.

For the customer metric lane, the recommended upstream bridge is the Customer
Metric Operator Source Handoff:

```text
Customer Metric Intake
-> Customer Metric Operator Source Handoff
-> Operator Intake Adapter
```

That handoff can provide the `sources.customerMetric` operator source plus
operator-provided `measurementCellInput.selectedMetric` context. Its
`source_package_reference.source_refs.aggregate_outcome_export_id` is an
alignment hint only. A matching valid, feedable, aligned Layer 3 Source Package
remains required before Source Package Review Queue can clear the
`customer_metric` lane. Customer metric movement is descriptive customer-owned
aggregate movement only, not AI impact proof, ROI, causality, productivity,
confidence, probability, finance output, or customer-facing financial output.

For assumption and governance lanes, the recommended upstream bridge is the
Assumption / Governance Operator Source Handoff:

```text
Approved aggregate assumption or governance source posture
-> Assumption / Governance Operator Source Handoff
-> Operator Intake Adapter
```

That handoff can provide `sources.assumption` and `sources.governance` source
objects plus package reference hints using `assumption_approval_export_id` and
`governance_control_export_id`. Assumption approval is not ROI or finance
approval, and governance attestation is not an override. Matching valid,
feedable, aligned Source Packages remain required before Source Package Review
Queue can clear either lane.

For cross-lane preparation, the Operator Source Handoff Bundle can compact the
VBD/token, customer metric, assumption, and governance handoffs into a
preparation manifest:

```text
Governed lane handoffs
-> Operator Source Handoff Bundle
-> Operator Intake Adapter
```

The bundle remains preparation-only. It does not clear Source Package Review
Queue, validate Measurement Cell readiness, feed finance-context
investigation, feed a confidence model, or create customer-facing output.

## Decisions

- `READY_FOR_VALUE_HYPOTHESIS_PACKET_PREPARATION`: Data Spine, Source Package
  Review Queue, Real Data Intake, and Measurement Cell Assembly all validate.
- `HELD_FOR_DATA_SPINE`: source lanes are not ready for Measurement Cell
  preparation.
- `HELD_FOR_SOURCE_PACKAGE_REVIEW`: Data Spine is ready, but reviewed Source
  Packages are missing, held, suppressed, or misaligned.
- `HELD_FOR_REAL_DATA_INTAKE`: reviewed source posture clears, but aggregate
  evidence input cannot prepare Measurement Cell assembly.
- `HELD_FOR_MEASUREMENT_CELL_ASSEMBLY`: intake clears, but Measurement Cell
  Assembly cannot produce a validated handoff.
- `BLOCKED`: source identity, source refs, windows, metric binding, unsafe
  fields, or nested validations fail closed.

## Source Package Context

Source Package Review Queue still owns source-review posture. When Source
Packages carry optional context fields such as `client_id`, `workflow_family`,
`function_area`, `cohort_key`, `metric_id`, or `baseline_window`, those values
must align to the Data Spine source lane. Same-org, same-window, same-ref
packages cannot clear the queue if their optional context points to another
workflow, function, cohort, or metric.

## Downstream Boundary

The adapter may produce governed time-series run references for later review.
It does not feed:

- Value Hypothesis packet execution;
- finance-context investigation;
- confidence modeling;
- customer-facing financial output.

Those feeds remain false. A later confidence model would require a separately
promoted contract that explicitly defines what it can consume.

## Non-Goals

This adapter does not:

- parse Blueprint documents;
- parse Google Sheets, CSV, JSON, dashboard, PDF, PPT, DOC, or customer files;
- run BigQuery or Glean queries;
- ingest raw rows;
- persist source data;
- create migrations, Prisma schemas, backend routes, frontend UI, or ingestion
  jobs;
- create Value Hypothesis packets directly;
- calculate ROI, EBITA, EBITDA, causality, productivity, financial
  attribution, confidence percentages, or probabilities;
- create customer-facing financial output.

## Blocked Uses

The adapter must always block:

- realized ROI;
- EBITA or EBITDA claims;
- financial attribution;
- causality claims;
- productivity claims;
- headcount reduction claims;
- individual attribution;
- manager/team ranking;
- people decisioning;
- customer-facing financial output;
- confidence percentages;
- probability output.

## Validation

Run:

```bash
npm run test:ai-value-operator-intake-adapter
```

Recommended adjacent checks:

```bash
npm run test:ai-value-data-spine-readiness
npm run test:ai-value-source-package-review-queue
npm run test:ai-value-real-data-intake-packet-runner
npm run test:ai-value-measurement-cell-assembly-runner
npm run test:ai-value-value-hypothesis-readiness-packet-runner
```
