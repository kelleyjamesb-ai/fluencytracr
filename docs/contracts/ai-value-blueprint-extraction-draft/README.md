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

## Boundary

Source refs point to upstream-approved structured extraction outputs only. This
contract does not parse Blueprint uploads, run BigQuery, pull live Glean data,
or validate raw customer files.

## Tests

Run:

```bash
npm run test:ai-value-blueprint-extraction-draft
```
