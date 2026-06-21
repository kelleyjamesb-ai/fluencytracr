# AI Value Hypothesis Readiness Contract

## Purpose

Value Hypothesis Readiness is an internal operating packet for deciding whether
a workflow-level value hypothesis is ready for planning, evidence review,
business-owner review, or finance-context investigation.

It is not an ROI calculator, confidence percentage, attribution model,
customer-facing economic readout, productivity system, or causality engine.

## Product Spine

```text
Blueprint
-> AI Fluency Dashboard
-> Glean / BigQuery VBD + Token Context
-> Customer Business Metrics
-> ROI Bot / ROI Sheet Assumptions
-> Governance Review
-> Value Hypothesis Readiness
-> Decision / Retest
```

Every source must align on the same aggregate slice before it can feed the
packet:

- `org_id`
- `workflow_id` or `workflow_family`
- `function_area`
- `cohort_key`
- `baseline_window`
- `comparison_window`
- `metric_id`
- `source_ref`
- `owner_role`
- `review_state`

## Allowed Readiness States

These are review states, not value claims:

- `SUPPRESSED`
- `NOT_READY`
- `PLANNING_READY`
- `EVIDENCE_REVIEW_READY`
- `BUSINESS_OWNER_REVIEW_READY`
- `FINANCE_CONTEXT_INVESTIGATION_READY`

`FINANCE_CONTEXT_INVESTIGATION_READY` means an internal packet may be prepared
for finance-context review. It does not allow financial output, customer-facing
economic output, ROI proof, or causality language.

## Contribution Evidence Tier

The contribution layer is non-percent and non-causal:

- `NONE`
- `DIRECTIONAL_ALIGNMENT`
- `PRE_POST_SUPPORTED`
- `MATCHED_COMPARISON_READY`
- `CONTROLLED_TEST_READY`
- `CALIBRATED_ATTRIBUTION_READY`

This phase does not expose contribution confidence percentages. The validator
rejects probability, confidence percent, ROI proof, raw/person-level fields,
unsafe financial language, and customer-facing financial permissions.

## Agentic Operating Model

Agents are evidence workers:

- Blueprint Agent extracts workflow, value route, metric candidates, owners,
  and assumptions.
- AI Fluency Agent ingests aggregate instrument results and tracks
  function-level movement.
- VBD Agent summarizes Velocity, Breadth, Depth, integration, and token
  intensity by window.
- Metric Agent maps selected customer-owned metrics to source systems and
  expected direction.
- ROI Assumption Agent carries source tags, pull dates, and owner approval
  state as scenario context only.
- Governance Agent blocks unsafe claims, missing evidence, weak assumptions,
  and person-level risk.
- Readiness Agent assembles the final internal packet.

Each output must be structured, source-bound, aggregate-only, and caveated.

## Non-Capabilities

This contract does not authorize:

- schemas under `schemas/`,
- backend routes,
- persistence,
- frontend UI,
- customer-facing exports,
- financial output,
- ROI proof,
- causality claims,
- productivity claims,
- person-level analytics,
- manager or team ranking,
- confidence percentages.

## Examples

See `examples/` for validating internal packets:

- `planning-ready-value-hypothesis-readiness.json`
- `business-owner-review-ready-value-hypothesis-readiness.json`
- `finance-context-investigation-ready-value-hypothesis-readiness.json`

## Packet Runner

The packet runner lives at
[`../ai-value-hypothesis-readiness-packet-runner/README.md`](../ai-value-hypothesis-readiness-packet-runner/README.md).
It assembles internal review packets from validated readiness inputs. It does
not add formulas, confidence percentages, UI, routes, schemas, persistence, or
customer-facing economic output.
