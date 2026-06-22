# VBD Token Aggregate Intake

This contract normalizes scrubbed aggregate Glean/BigQuery VBD and token
summaries into Data Spine and Measurement Cell context.

It does not run BigQuery, pull live Glean data, ingest raw rows, store SQL,
persist outputs, create routes/UI, compute ROI, prove causality, emit
productivity claims, create confidence percentages, or create customer-facing
financial output.

## Role In The Evidence Spine

```text
Scrubbed aggregate Glean / BigQuery export summary
-> VBD Token Aggregate Intake
-> VBD + Token Operator Source Handoff
-> Operator Intake Adapter
-> Data Spine VBD-token source and Measurement Cell VBD/token context fragments
```

The operator handoff prepares source and context fragments only. Reviewed
Layer 1 Source Package clearance remains owned by Source Package Review Queue.

## VBD Formulas

```text
Overall VBD Score =
  0.30(Velocity)
+ 0.30(Breadth)
+ 0.40(Depth)

Integration Score =
  0.40(Breadth)
+ 0.60(Depth)
```

The fixed quadrant threshold is `60` on a 0-100 scale. Token usage is a
spend/intensity overlay only and does not change the VBD score, integration
score, quadrant assignment, claim readiness, or finance-context readiness.

## Required Alignment Keys

- `org_id`
- `client_id`
- `workflow_family`
- `workflow_id` where available
- `function_area`
- `cohort_key`
- `baseline_window`
- `comparison_window`
- `source_ref`
- `source_owner_role`
- `source_owner_attestation`
- `k_min_posture`

## Current BigQuery Status

This repo has scrubbed aggregate export intake infrastructure. It does not yet
have live BigQuery query execution infrastructure for this product spine. A
future adapter can produce these aggregate objects upstream, but this contract
only accepts the approved aggregate summary.

## Tests

Run:

```bash
npm run test:ai-value-vbd-token-aggregate-intake
```
