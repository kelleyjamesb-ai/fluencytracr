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
