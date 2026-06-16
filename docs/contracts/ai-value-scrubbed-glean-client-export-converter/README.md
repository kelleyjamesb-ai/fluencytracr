# AI Value Scrubbed Glean Client Export Converter

Schema version: `FT_AI_VALUE_SCRUBBED_GLEAN_CLIENT_EXPORT_2026_06`

## Purpose

The Scrubbed Glean Client Export Converter normalizes already-scrubbed,
aggregate Glean export summaries into governed AI Value evidence inputs.

The converter is the productized adapter between customer-safe Glean export
metadata and the existing Source Package / Client Evidence Entry contracts.

It answers:

- whether a scrubbed aggregate export can become a Source Package;
- whether non-Layer-1 evidence should first become a Client Evidence Entry;
- whether k-min, privacy, source, and caveat posture allow the export to feed
  Evidence Collection Assembly.

It does not collect raw Glean rows.

## Inputs

Input must be an already-parsed object representing a scrubbed aggregate export
summary. The converter does not parse CSV, JSONL, BigQuery result rows, files,
SQL, prompts, responses, transcripts, or user-level records.

Required input fields:

- `schema_version`
- `export_id`
- `org_id`
- `measurement_plan_id`
- `evidence_layer`
- `source_owner_role`
- `attestation`
- `generated_at`
- `covered_window`
- `aggregate_grain`
- `minimum_cohort_threshold`
- `k_min_posture`
- `privacy_boundary`

Layer 1 telemetry inputs must also include:

- `source_tables`
- `signal_families`

Layer 2, Layer 3, governance, assumption, and workforce-context exports must
include `request_id` so the output can remain bound to the customer evidence
request path.

## Outputs

The converter may return:

- a validated `layer_1_bigquery_telemetry_summary` Source Package for Layer 1
  Glean telemetry;
- a validated Client Evidence Entry plus derived Source Package for Layer 2,
  Layer 3, governance, assumption, or aggregate workforce context evidence;
- a fail-closed result with gaps and no output objects.

Output feeds are intentionally narrow:

- `client_evidence_entry`
- `source_package`
- `evidence_collection_input`

The following feeds are always false:

- `evidence_snapshot`
- `claim_readiness_snapshot`
- `executive_readout_snapshot`
- `customer_facing_financial_output`

## Evidence Layer Mapping

| Input `evidence_layer` | Output path |
| --- | --- |
| `layer_1_platform_telemetry` | Direct Source Package: `layer_1_bigquery_telemetry_summary` |
| `layer_2_user_voice_empirical` | Client Evidence Entry, then Source Package: `layer_2_user_voice_empirical_export` |
| `layer_3_business_system_outcomes` | Client Evidence Entry, then Source Package: `layer_3_business_system_of_record_outcome_export` |
| `governance_evidence` | Client Evidence Entry, then Source Package: `governance_control_export` |
| `assumption_evidence` | Client Evidence Entry, then Source Package: `assumption_approval_export` |
| `aggregate_workforce_context` | Client Evidence Entry, then Source Package: `aggregate_workforce_context_export` |

## Fail-Closed Rules

The converter rejects inputs that contain or imply:

- raw rows, raw files, records, samples, events, metric values, or raw exports;
- raw prompts, responses, transcripts, query text, SQL text, or file contents;
- direct identifiers, email addresses, user IDs, employee IDs, person IDs, or
  hashed/joinable person identifiers;
- person-level productivity, HRIS, compensation, performance, promotion,
  discipline, attrition, or people decisioning;
- ROI, EBITA, causality, productivity, headcount reduction, dollarized value,
  financial impact, or customer-facing economic output;
- `coverage_status: full_playbook_coverage`;
- fields claiming that Source Packages create claim readiness, executive
  readouts, routes, UI, ingestion jobs, persistence, or financial outputs.

## K-Min And Suppression

If the export is safe but `k_min_posture.cohort_threshold_met` is false, or
`suppressed_or_unknown_slices` is greater than zero, the converter preserves the
export as suppressed evidence. It must not emit present evidence from a
suppressed export.

Suppressed evidence may still feed evidence collection as caveat-bearing source
posture. It does not become full Playbook coverage.

## VBD Metadata

Layer 1 exports may carry aggregate VBD metadata only as context:

- `baseline_index`
- `comparison_index`
- `movement_direction`
- `aggregate_only`
- `caveats`

`aggregate_only` must be true. VBD metadata cannot authorize value claims,
financial translation, customer-facing output, reportability readiness, or full
Playbook coverage.

## Non-Goals

This converter does not:

- run BigQuery queries;
- store source files or raw rows;
- create migrations;
- add backend routes;
- add frontend UI;
- create ingestion jobs;
- persist Source Packages;
- persist Evidence Snapshots;
- create Claim Readiness Snapshots;
- create Executive Readout Snapshots;
- build Glean Signal Readiness Maps;
- run the Reportability Gate;
- compute ROI, EBITA, causality, productivity, or customer-facing financial
  output.

## Validation

Run:

```bash
npm run test:ai-value-scrubbed-glean-export-converter
```

Recommended adjacent checks:

```bash
npm run test:ai-value-source-packages
npm run test:ai-value-support-pilot-readiness-adapter
```
