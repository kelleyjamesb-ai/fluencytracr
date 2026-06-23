# AI Value Pipeline Run Review Manifest

Status: contract design only. This document does not authorize live BigQuery,
Sigma, Glean, or customer connector execution; credentials; raw-row ingestion;
persistence writes; backend routes; frontend UI; schemas; migrations;
confidence math; ROI; causality; productivity; probability; exports; rendered
readouts; or customer-facing financial output.

## Purpose

The Pipeline Run Review Manifest is the internal operator review packet that
binds source inventory and aggregate extraction manifests to the existing
FluencyTracr evidence spine.

It answers:

```text
Did the aggregate extraction package pass source, suppression, alignment, and
review checks for manual operator review against existing intake contracts?
```

It does not authorize live connector execution or downstream output.

## Required Shape

Required manifest fields:

- `pipeline_run_review_manifest_id`
- `schema_version`
- `pipeline_review_state`
- `source_inventory_manifest_ref`
- `aggregate_extraction_manifest_ref`
- `operator_role`
- `source_owner_role`
- `org_id`
- `client_id`
- `measurement_plan_id`
- `workflow_family`
- `workflow_id`
- `function_area`
- `cohort_key`
- `baseline_window`
- `comparison_window`
- `metric_id`
- `expectation_path_id`
- `reviewed_aggregate_source_refs`
- `data_spine_alignment_envelope`
- `source_package_review_queue_posture_ref`
- `validation_result_refs`
- `allowed_uses`
- `blocked_claims`
- `blocked_uses`
- `boundary_policy`
- `required_caveats`
- `stop_conditions`
- `generated_at`

Allowed `pipeline_review_state` values:

- `ELIGIBLE_FOR_OPERATOR_PROMOTION_REVIEW`
- `HELD_FOR_SOURCE_INVENTORY`
- `HELD_FOR_AGGREGATE_EXTRACTION`
- `HELD_FOR_SUPPRESSION_REVIEW`
- `HELD_FOR_SOURCE_PACKAGE_QUEUE_REF`
- `HELD_FOR_DATA_SPINE_ALIGNMENT`
- `BLOCKED`

`ELIGIBLE_FOR_OPERATOR_PROMOTION_REVIEW` means the manifest is complete enough
for manual promotion review only. It does not move data into intake, create or
update records, clear Source Package Review Queue, assemble Measurement Cells,
persist snapshots, export, render readouts, or trigger downstream output.

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
- `writes_persistence`
- `creates_route`
- `creates_ui`
- `creates_schema`
- `creates_export`
- `renders_readout`
- `feeds_research_model`
- `emits_probability`
- `computes_roi`
- `emits_financial_output`
- `emits_customer_facing_output`

## Required Alignment Envelope

The review manifest must bind:

- source lane;
- source system;
- source ref;
- source owner role;
- org;
- client;
- measurement plan;
- workflow family;
- workflow id when present;
- function area;
- cohort key;
- baseline window;
- comparison window;
- selected metric;
- expectation path id, version, and hash when selected-path context exists;
- approved Blueprint payload hash when selected-path context exists;
- approval state, approved timestamp, and approver role when selected-path
  context exists.

## Required Source Package Queue Posture Ref

`source_package_review_queue_posture_ref` is a compact reference to a separately
recomputed Source Package Review Queue state. It is not a clearance decision.

Allowed referenced queue states are only the canonical Source Package Review
Queue states:

- `DATA_SPINE_REVIEW_READY`
- `HELD_FOR_SOURCE_REVIEW`
- `BLOCKED_FOR_DATA_SPINE_VALIDATION`

`DATA_SPINE_REVIEW_READY` is eligibility context only. It does not mean Source
Package clearance by this manifest, Measurement Cell readiness, snapshot
persistence, finance output, or customer-facing output. The manifest must not
introduce queue aliases such as `CLEARED`, `APPROVED`, `PASSED`,
`SOURCE_PACKAGE_CLEARED`, or `READY_FOR_MEASUREMENT`.

## Fail-Closed Rules

The manifest must fail closed when:

- Source Inventory Manifest or Aggregate Extraction Manifest validation is
  missing, stale, or contradictory;
- source inventory and extraction refs drift;
- Data Spine alignment envelope is incomplete;
- Source Package Review Queue posture ref is missing, held, suppressed,
  blocked, stale, hand-edited, or not recomputed;
- any reviewed aggregate source ref is unsafe or unapproved;
- reviewed aggregate source refs contain connector job ids, API run ids, query
  refs, active connector status, ingestion jobs, dashboard or export URLs,
  executable links, credential-bearing refs, live execution state, or
  encoded-looking / opaque refs;
- selected metric or expectation path drifts;
- k-min, suppression, held, missing, rejected, or blocked evidence is hidden;
- validation summary is copied instead of recomputed;
- JSONB-bearing fields smuggle raw rows, SQL, prompts, transcripts, identifiers,
  full Source Packages, full Measurement Cells, full handoff bundles, full
  expectation-path registries, ROI, EBITDA, causality, productivity,
  probability, model scores, or customer-facing financial output;
- stop conditions are absent.

## Non-Authorization

An eligible Pipeline Run Review Manifest is complete enough for manual operator
promotion review only. It does not feed the governed aggregate intake path,
create or update records, clear source review, assemble Measurement Cells,
persist snapshots, export, render readouts, or trigger downstream output.

If later promoted by a separate Pipeline Promotion Decision, any future
implementation may be reviewed only against the existing governed aggregate
intake path after validation. The manifest is not:

- live connector authorization;
- Source Package clearance by itself;
- Measurement Cell proof by itself;
- Measurement Cell snapshot persistence;
- Measurement Cell Series persistence;
- customer projection approval;
- export approval;
- research-model input;
- ROI, EBITDA, causality, productivity, probability, or finance output.

## Promotion Dependency

The promotion ladder remains:

```text
Source Inventory Manifest
-> Aggregate Extraction Manifest
-> Pipeline Run Review Manifest
-> Pipeline Promotion Decision
```

Only a later Pipeline Promotion Decision may choose one of:

- `HOLD_FOR_CONTROLLED_AGGREGATE_PILOT`
- `HOLD_FOR_SOURCE_INVENTORY`
- `HOLD_FOR_SUPPRESSION_REVIEW`
- `HOLD_FOR_SECURITY_AND_TRUST_REVIEW`
- `PROMOTE_SAVED_AGGREGATE_FIXTURE_ADAPTER`
- `PROMOTE_SEPARATE_LIVE_PIPELINE_CONCEPT_REVIEW`
- `REJECT_CURRENT_PIPELINE_SCOPE`
