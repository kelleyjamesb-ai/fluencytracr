# Aggregate Evidence Import

Schema version: `AEI_2026_05`

## Purpose

Aggregate Evidence Import is the Stage 1 source-evidence bridge for Glean Claim Packet work.

It validates a prepared, admin-exported aggregate evidence package. It does not implement live ingestion, write to persistence, calculate ROI, or upgrade claim readiness.

Product copy should call this **Source Evidence Import** or **Aggregate Evidence Upload**, not broad data ingestion.

## Required top-level fields

- `import_id`
- `org_id`
- `window`
- `generated_at`
- `import_path`
- `real_source_readiness_manifest`
- `aggregate_evidence`
- `governance_boundaries`

## Accepted path

V1 accepts only:

- `admin_exported_aggregate_upload`

Glean-hosted MCP/read access and live event ingestion remain future paths behind separate approved source-contract work.

## Review behavior

`buildAggregateEvidenceImportReview` classifies records as:

- accepted: aggregate evidence from a `ready` source input with approved privacy boundaries
- withheld: evidence from blocked, unknown, approval-dependent, synthetic-only, missing, or non-present sources

The review always emits:

- `import_effect: review_only_no_persistence`
- `claim_readiness_effect: no_readiness_upgrade`

## Privacy boundary

The package is aggregate-only and metadata-only. It must not include raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, or hidden reconstruction of suppressed values.

See `examples/glean-aggregate-evidence-import.sample.json` for a complete synthetic Stage 1 package.
