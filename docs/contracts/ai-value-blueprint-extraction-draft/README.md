# AI Value Blueprint Extraction Draft

This contract represents an upstream-parsed Blueprint document after it has
been converted into a structured review draft.

It does not parse uploads, store raw document text, run OCR, call a document
model, persist files, create backend routes, create UI, query BigQuery, compute
ROI, prove causality, emit productivity claims, create confidence percentages,
or create customer-facing financial output.

## Role In The Evidence Spine

```text
Blueprint upload
-> upstream extraction
-> Blueprint Extraction Draft
-> human approval
-> Blueprint validation input
-> Data Spine Blueprint source
```

Pending drafts are reviewable but cannot feed Measurement Cell assembly.
Approved drafts can feed Blueprint validation and Data Spine alignment only.

## Customer-Reviewed Expectation Context

Approved drafts may carry customer-reviewed expectation context in
`extracted_fields`:

- `blueprint_expectation_ref`
- `blueprint_customer_approval_state`
- `blueprint_customer_approver_role`
- `expected_behavior_pathways`
- `expected_metric_id`
- `expected_metric_name`
- `expected_metric_direction`
- `expected_metric_lag_days`
- `expected_metric_system_recommended`
- `expected_metric_customer_selected`
- `value_driver`
- `approved_expectation_paths`

These fields are hypothesis context only. They describe what the approved
Blueprint expects to observe; they do not create a new Blueprint Hypothesis
object, Measurement Plan object, confidence model input, ROI claim, causal
claim, productivity claim, or customer-facing financial output.

`approved_expectation_paths` is the customer-approved registry of behavior ->
VBD signal -> selected metric -> value-driver pathways. Each path carries:

- `expectation_path_id`
- `expected_behavior`
- `expected_vbd_signal`
- `expected_metric_id`
- `expected_metric_name`
- `expected_metric_direction`
- `expected_metric_lag_days`
- `expected_metric_system_recommended`
- `expected_metric_customer_selected`
- `value_driver`
- `metric_role`
- `customer_approval_state`
- `approver_role`
- `source_ref`

Approved drafts must include exactly one `metric_role: primary` path. Additional
paths may be `supporting`. The legacy flattened fields such as
`expected_metric_id`, `expected_metric_direction`, `expected_metric_lag_days`,
and `value_driver` are the selected primary-path projection, not a second source
of truth.

`expected_behavior_pathways` is constrained to governed behavior labels such as
`knowledge_retrieval`, `reuse`, `delegation`, and `verification`. These labels
must not become new canonical events, VBD sub-scores, Skill Read promotion, or
reuse-depth product claims.

`value_driver` is constrained to `revenue`, `cost`, `capacity`, `quality`,
`risk`, or `not_selected`. It is value-route context only. Do not emit
EBITDA driver fields, EBITDA values, financial attribution, or value proof.

`expected_metric_lag_days` is descriptive customer-approved context only. It is
not a tunable threshold, surfacing gate, confidence input, or timing promise.

Approved Blueprint expectation context must preserve explicit customer metric
selection. Missing `expected_metric_customer_selected` must not be defaulted to
approval, and approved drafts fail closed unless the selected metric carries
`expected_metric_customer_selected: true`.

Approved expectation paths are measurement contract context only. They do not
authorize schemas, persistence, routes, UI, live BigQuery/Glean execution,
confidence math, ROI calculation, EBITDA output, causality claims, productivity
claims, probabilities, or customer-facing financial output.

## Required Alignment Keys

- `org_id`
- `client_id`
- `workflow_family`
- `function_area`
- `cohort_key`
- `baseline_window`
- `comparison_window`
- `document_source_ref`
- `owner_role`
- `approval_state`
- `blueprint_expectation_ref` when customer-reviewed expectation context is
  present

## Boundary

Source refs point to upstream-approved structured extraction outputs only. This
contract does not parse Blueprint uploads, run BigQuery, pull live Glean data,
or validate raw customer files.

## Tests

Run:

```bash
npm run test:ai-value-blueprint-extraction-draft
```
