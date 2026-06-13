# Real Source Readiness Manifest

Schema version: `RSRM_2026_05`

## Purpose

The Real Source Readiness Manifest records whether each source input required by a Glean Claim Packet Export is ready to replace a synthetic fixture.

It is a review layer only. It does not implement ingestion, calculate ROI, or upgrade claim readiness.

## Required top-level fields

- `manifest_id`
- `org_id`
- `window`
- `generated_at`
- `claim_packet_id`
- `selected_methodology_snapshot_id`
- `source_inputs`
- `ingestion_path`
- `governance_boundaries`

## Source input review

Each source input records:

- `source_input_id`
- `label`
- `source_type`
- `source_system`
- `readiness_state`
- `required_fields`
- `privacy_boundary`
- `approval_state`
- `affects_claim_buckets`
- `blockers`
- `upgrade_actions`

Readiness states are `ready`, `blocked`, `unknown`, `needs_approval`, `synthetic_only`, and `not_applicable`.

## Claim packet effect

The review helper always emits `claim_readiness_effect: no_readiness_upgrade`.

Source readiness can say a replacement path is ready, blocked, unknown, or approval-dependent. It cannot move a claim into a stronger bucket. The Claim Packet, Strongest Safe Claim, and Methodology Snapshot approval gates still decide customer-safe, caveated, internal-only, suppressed, and not-computed language.

## Ingestion path

The recommended sequence is:

1. `admin_exported_aggregate_upload`
2. `glean_hosted_mcp_read_access`
3. `live_event_ingestion`

The committed example keeps `implementation_state: not_implemented`.

## Privacy boundary

The manifest is aggregate-only and metadata-only. It must not include raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, or hidden reconstruction of suppressed values.

Real-source readiness may mark aggregate HRIS-derived workforce context as
ready, needs approval, blocked, or unknown. That context is allowed only as
cohort-safe, customer-approved source context for workflow-level value
measurement. Person-level HRIS records, direct identifiers, hashed or joinable
person identifiers, manager/team ranking, people decisioning,
compensation/performance inference, promotion/discipline inference, attrition
prediction, and HRIS inference from AI usage remain blocked.

See `examples/glean-claim-packet-real-source-readiness.json` for a complete synthetic fixture-replacement readiness manifest.

Stage 1 source evidence import is defined in [`../aggregate-evidence-import/README.md`](../aggregate-evidence-import/README.md). It validates a prepared admin-exported aggregate upload against this manifest, but remains review-only and does not persist records or upgrade claims.
