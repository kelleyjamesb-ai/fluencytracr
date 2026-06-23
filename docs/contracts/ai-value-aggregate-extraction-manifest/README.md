# AI Value Aggregate Extraction Manifest

Status: contract design only. This document does not authorize live BigQuery,
Sigma, Glean, or customer connector execution inside FluencyTracr; credentials;
query-text storage; raw-row ingestion; persistence writes; backend routes;
frontend UI; schemas; migrations; confidence math; ROI; causality;
productivity; probability; or customer-facing financial output.

## Purpose

The Aggregate Extraction Manifest binds a previously approved Source Inventory
Manifest to an aggregate extraction result produced inside the approved Glean or
customer boundary.

It answers:

```text
Was an approved source transformed into a scrubbed aggregate package with the
right grain, window, suppression posture, and source-owner review?
```

It does not authorize FluencyTracr to run BigQuery, run Sigma, store SQL, parse
raw rows, or create customer-facing output.

## Required Shape

Required manifest fields:

- `aggregate_extraction_manifest_id`
- `schema_version`
- `source_inventory_manifest_ref`
- `source_system`
- `execution_boundary`
- `approved_aggregate_definition_ref`
- `upstream_aggregate_attestation_ref`
- `org_id`
- `client_id`
- `workflow_family`
- `function_area`
- `cohort_key`
- `extraction_window`
- `aggregate_grain`
- `metric_definitions`
- `source_package_lane`
- `aggregate_output_ref`
- `aggregate_output_hash`
- `k_min_posture`
- `suppression_results`
- `freshness_state`
- `owner_review_state`
- `allowed_uses`
- `blocked_uses`
- `boundary_policy`
- `required_caveats`
- `generated_at`

`approved_aggregate_definition_ref` and `upstream_aggregate_attestation_ref`
are metadata references only. They must not contain SQL text, query text,
dashboard query text, BigQuery job ids, Sigma dashboard/export run URLs, API
run ids, connector job ids, row ids, span ids, active connector status,
credential-bearing refs, executable links, encoded-looking or opaque refs, live
execution state, or direct links to raw source records.

## Required Review States

Required terminal states:

- `owner_review_state`: `AGGREGATE_EXTRACTION_ATTESTED`
- `k_min_posture`: `K_MIN_ENFORCED`
- `freshness_state`: `CURRENT_FOR_APPROVED_WINDOW`

The manifest must not treat pending, held, rejected, stale, waived, unknown, or
not-reviewed states as extraction-review evidence.

## Allowed Execution Boundary

Allowed future execution boundary:

```text
approved Glean or customer environment
-> aggregate extraction
-> suppression and k-min enforcement
-> scrubbed aggregate manifest
-> FluencyTracr aggregate intake
```

Blocked execution boundary:

```text
FluencyTracr executes live query
-> raw rows enter FluencyTracr
-> query text or raw rows are stored
```

## Required False Boundary Policy

The manifest must keep these false:

- `fluencytracr_runs_bigquery`
- `fluencytracr_runs_sigma`
- `fluencytracr_runs_glean_query`
- `fluencytracr_uses_credentials`
- `query_text_stored`
- `raw_rows_present`
- `dashboard_rows_present`
- `prompts_present`
- `transcripts_present`
- `user_identifiers_present`
- `source_package_cleared`
- `measurement_cell_created`
- `measurement_cell_snapshot_created`
- `measurement_cell_series_created`
- `research_model_input_created`
- `probability_output_created`
- `roi_output_created`
- `financial_output_created`
- `customer_facing_output_created`

## Fail-Closed Rules

The manifest must fail closed when:

- the Source Inventory Manifest ref is missing or stale;
- source system, org, client, workflow, function, cohort, or window drift from
  the Source Inventory Manifest;
- aggregate grain is not approved;
- metric definitions are missing, unapproved, or drift from the Blueprint /
  Measurement Plan context;
- owner review state is missing, pending, held, rejected, stale, waived,
  unknown, not-reviewed, or non-aggregate;
- suppression or k-min posture is missing or softened;
- freshness state is stale or undefined;
- aggregate output hash is missing or non-deterministic;
- approved aggregate definition refs or upstream aggregate attestation refs
  contain job ids, query ids, API request ids, dashboard/export URLs,
  executable links, active connector status, ingestion jobs, raw table refs,
  credential-bearing refs, encoded-looking or opaque refs, replay handles, or
  inspection handles;
- aggregate output refs contain query text, raw-table detail, identifiers,
  finance claims, productivity language, probability language, model language,
  or customer-facing output language;
- any payload includes raw rows, SQL, prompts, transcripts, files, user IDs,
  emails, employee IDs, respondent IDs, row IDs, span IDs, hashed or joinable
  person identifiers, HRIS fields, rankings, ROI, EBITDA, causality,
  productivity, probability, model scores, or customer-facing financial output;
- allowed uses imply Source Package clearance, Measurement Cell readiness,
  persistence, export, research-model input, finance output, or customer-facing
  output.

## Non-Authorization

A valid Aggregate Extraction Manifest is only extraction-review evidence. It is
not:

- Source Package clearance;
- Data Spine clearance;
- Measurement Cell readiness;
- Measurement Cell snapshot persistence;
- live connector implementation approval;
- customer-facing output;
- finance output;
- research-model input.

## Promotion Dependency

The next contract in the pipeline is:

```text
Aggregate Extraction Manifest
-> Pipeline Run Review Manifest
```

No live connector implementation may start until a later Pipeline Promotion
Decision explicitly promotes the exact execution boundary.
