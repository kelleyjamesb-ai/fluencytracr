# AI Fluency Client Import

This contract normalizes aggregate AI Fluency dashboard exports by `client_id`
and `org_id` into the existing Fluency Baseline and Data Spine source shapes.

It does not distribute instruments, collect person-level answers, persist
results, create routes/UI, score people, rank teams, compute ROI, prove
causality, emit productivity claims, create confidence percentages, or create
customer-facing financial output.

## Role In The Evidence Spine

```text
AI Fluency Dashboard export
-> AI Fluency Client Import
-> Fluency Baseline validation
-> Data Spine AI Fluency source
```

The import computes aggregate weighted construct means from approved cohort
summaries. Suppressed or small cohorts carry no scores and cannot feed the Data
Spine by themselves.

For dashboard-import Data Spine preparation, the single-row adapter also
requires at least 20 usable aggregate respondents. The lower Fluency Baseline
minimum remains a baseline-validation guard only; it is not enough to make a
dashboard import row feedable into the Data Spine. In plain terms, fewer than
5 remains the hard small-cohort floor, while 20 is the current aggregate import
readiness gate for this AI Fluency path.

For multi-row dashboard exports, use the AI Fluency Dashboard Import Runner
first. The runner batches already-parsed aggregate rows, then calls this
single-row adapter for each function/workflow row.

## Required Alignment Keys

- `org_id`
- `client_id`
- `workflow_family`
- `function_area`
- `cohort_key`
- `baseline_window`
- `comparison_window`
- `dashboard_export_id`
- `instrument_id`
- `collection_mode`
- `owner_approval_state`
- `review_state`

## Tests

Run:

```bash
npm run test:ai-value-ai-fluency-client-import
```
