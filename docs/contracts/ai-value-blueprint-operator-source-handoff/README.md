# Blueprint Operator Source Handoff

Schema version: `FT_AI_VALUE_BLUEPRINT_OPERATOR_SOURCE_HANDOFF_2026_06`

Validator: `shared/src/aiValueEngine/blueprintOperatorSourceHandoff.ts`

## Purpose

The Blueprint Operator Source Handoff bridges a validated Blueprint Extraction
Draft into the existing Operator Intake Adapter source shape.

It exists to prevent operators from manually stitching together:

- approved Blueprint extraction metadata;
- Data Spine Blueprint source posture;
- source owner role;
- selected metric promise;
- assumption references; and
- Measurement Cell Blueprint alignment context.

## Flow

```text
Blueprint document / deck / PDF
-> upstream structured extraction
-> Blueprint Extraction Draft
-> human approval
-> Blueprint Operator Source Handoff
-> Operator Intake Adapter
```

The handoff produces:

- `operator_source` for the Data Spine `blueprint` lane;
- `blueprint_alignment_context` for the operator-provided Measurement Cell
  input, including org/client/workflow/function/cohort/window/source alignment
  keys, selected Blueprint promise context, and approved expectation context;
  and
- `source_package_reference: null`, because Blueprint is reviewed as an
  approved structured source lane, not a package-backed evidence lane.

## Blueprint Alignment Context

When present on the approved Blueprint Extraction Draft,
`blueprint_alignment_context` carries:

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

This context is source-bound preparation for Measurement Cell alignment only.
It does not feed Measurement Cell directly, clear Source Package Review Queue,
authorize finance-context investigation, feed confidence modeling, or create
customer-facing financial output.

`value_driver` is bounded to `revenue`, `cost`, `capacity`, `quality`, `risk`,
or `not_selected`. The handoff must reject `ebitda`, ROI, probability,
confidence, productivity, raw prompt/transcript, direct identifier, or ranking
language in these expectation fields.

The handoff must not infer missing customer metric approval. Approved
expectation context must arrive from the validated Blueprint Extraction Draft
with explicit `expected_metric_customer_selected: true`.

## Feed Rules

The handoff can be `READY_FOR_OPERATOR_INTAKE` only when:

- the Blueprint Extraction Draft validates;
- the draft is approved;
- the draft can feed Blueprint validation and Data Spine Blueprint source
  alignment;
- the operator source has `state: present`;
- the source is aggregate-only, source-bound, owner-role tagged, approved, and
  clear; and
- the Blueprint alignment context matches the operator source identity and
  carries only governed expectation context.

Pending or unapproved drafts are `HELD_FOR_BLUEPRINT_APPROVAL`. Invalid,
rejected, or blocked drafts are `BLOCKED`.

## Boundaries

The handoff does not:

- parse Blueprint uploads;
- read Docs, Slides, Sheets, PDFs, or PPTs;
- store uploaded files or raw document text;
- run BigQuery or Glean queries;
- persist data;
- create migrations, Prisma schemas, backend routes, frontend UI, or ingestion
  jobs;
- feed Measurement Cell directly;
- validate a Measurement Cell;
- feed finance-context investigation;
- feed confidence modeling;
- calculate ROI, EBITA, EBITDA, causality, productivity, financial
  attribution, confidence percentages, or probabilities;
- create customer-facing financial output; or
- include respondent-level, person-level, team-ranking, or manager-ranking
  data.

## Validation

Run:

```bash
npm run test:ai-value-blueprint-operator-source-handoff
```

Recommended adjacent checks:

```bash
npm run test:ai-value-blueprint-extraction-draft
npm run test:ai-value-operator-intake-adapter
npm run test:ai-value-data-spine-readiness
npm run test:ai-value-source-package-review-queue
```
