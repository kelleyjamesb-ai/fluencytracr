# AI Value Source Inventory Manifest

Status: contract design only. This document does not authorize live BigQuery,
Sigma, Glean, or customer connector execution; credentials; query execution;
raw-row ingestion; persistence writes; backend routes; frontend UI; schemas;
migrations; confidence math; ROI; causality; productivity; probability; or
customer-facing financial output.

## Purpose

The Source Inventory Manifest is the first promotion contract before any live
BigQuery or Sigma pipeline work. It records which aggregate source surface may
be reviewed for AI Value intake, who owns it, which lane it may be reviewed
against, and which fields are explicitly blocked.

It answers:

```text
Is this source approved as an aggregate-only candidate before extraction?
```

It does not answer:

```text
Did a connector run?
Is a Source Package cleared?
Is a Measurement Cell ready?
Can anything be shown to a customer?
```

## Required Shape

Required manifest fields:

- `source_inventory_manifest_id`
- `schema_version`
- `source_lane`
- `source_system`
- `source_category`
- `source_owner_role`
- `source_owner_attestation`
- `org_id`
- `client_id`
- `workflow_family`
- `function_area`
- `cohort_key`
- `approved_source_ref`
- `approved_extraction_window`
- `approved_aggregate_grain`
- `approved_output_fields`
- `k_min_posture`
- `suppression_posture`
- `legal_trust_review_state`
- `allowed_uses`
- `blocked_uses`
- `boundary_policy`
- `required_caveats`
- `generated_at`

Allowed `source_lane` values must map to the existing operator lanes:

- `blueprint`
- `ai_fluency`
- `vbd_token`
- `customer_metric`
- `assumption`
- `governance`

Allowed `source_system` values for the next connector promotion slice are:

- `bigquery_export`
- `sigma_export`

Other source systems require a separate promotion decision.

## Required Review States

Required terminal states:

- `source_owner_attestation`: `AGGREGATE_ONLY_ATTESTED`
- `legal_trust_review_state`: `LEGAL_TRUST_REVIEW_APPROVED` or
  `LEGAL_TRUST_REVIEW_NOT_REQUIRED`
- `k_min_posture`: `K_MIN_POLICY_BOUND` or `K_MIN_ALREADY_ENFORCED_UPSTREAM`
- `suppression_posture`: `SUPPRESSION_POLICY_BOUND` or
  `SUPPRESSION_ALREADY_ENFORCED_UPSTREAM`

The manifest must not treat pending, held, rejected, stale, waived, unknown, or
not-reviewed states as source readiness.

## Required False Boundary Policy

The manifest must keep these false:

- `runs_live_connector`
- `executes_query`
- `uses_credentials`
- `stores_query_text`
- `stores_raw_rows`
- `stores_dashboard_rows`
- `stores_prompts`
- `stores_transcripts`
- `stores_user_identifiers`
- `creates_source_package`
- `clears_source_package_review`
- `creates_measurement_cell`
- `creates_measurement_cell_snapshot`
- `creates_measurement_cell_series`
- `feeds_research_model`
- `emits_probability`
- `computes_roi`
- `emits_financial_output`
- `emits_customer_facing_output`

## Fail-Closed Rules

The manifest must fail closed when:

- the source owner role is missing or mismatched;
- source-owner attestation is missing, stale, held, rejected, pending,
  not-reviewed, or non-aggregate;
- legal/trust review is missing, held, rejected, stale, pending, waived, or
  unknown when required;
- k-min or suppression posture is absent, held, stale, waived, softened, or
  not bound to a future extraction check;
- source lane does not match a governed operator source lane;
- source refs contain raw table names with sensitive detail, query text, user
  identifiers, finance claims, productivity language, probability language, or
  customer-facing output language;
- source refs contain connector job ids, API run ids, query refs, active
  connector status, ingestion jobs, dashboard or export URLs, executable links,
  credential-bearing refs, live execution state, or encoded-looking / opaque
  refs;
- the approved extraction window does not match the later aggregate extraction
  manifest;
- `approved_output_fields` include raw rows, SQL, prompts, transcripts, files,
  row IDs, span IDs, user IDs, employee IDs, respondent IDs, emails, names,
  hashed or joinable person identifiers, HRIS fields, ranking fields, ROI,
  EBITDA, causality, productivity, probability, model scores, or customer-facing
  financial output;
- any allowed use implies live execution, Source Package clearance, Measurement
  Cell readiness, persistence, export, model input, finance output, or
  customer-facing output.

## Non-Authorization

A clear Source Inventory Manifest is only source-inventory readiness. It is not:

- live connector authorization;
- aggregate extraction proof;
- Source Package clearance;
- Data Spine clearance;
- Measurement Cell readiness;
- Measurement Cell snapshot persistence;
- customer-facing output;
- research-model input;
- ROI or finance output.

## Promotion Dependency

The next contract in the pipeline is:

```text
Source Inventory Manifest
-> Aggregate Extraction Manifest
```

No live connector implementation may start until a later Pipeline Promotion
Decision explicitly promotes the exact execution boundary.
