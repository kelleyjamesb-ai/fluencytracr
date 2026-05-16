# Nielsen Source Evidence Trial

Schema version: `NSETR_2026_05`

## Purpose

The Nielsen Source Evidence Trial tests whether a real customer value narrative can be mapped into FluencyTracr without treating the deck as telemetry.

It maps sanitized Nielsen deck and Time-Saves packet observations into document-derived claim candidates, then generates an `AEI_2026_05` Aggregate Evidence Import package for review.

This is not live data ingestion.

## What This Trial Shows

The sample maps six claim candidates:

| Candidate | Treatment | Why |
| --- | --- | --- |
| Agent opportunity map | Directional | Deck-derived opportunity map is accepted for review, but not outcome evidence. |
| Time-Saves methodology context | Caveated | Methodology context is available, but customer-level telemetry is not attached. |
| Survey opportunity | Directional and withheld | Original aggregate survey export is not attached. |
| CS/CX outcome movement | Caveated and withheld | External outcome export and attribution caveat are not attached. |
| Financial model claim | Internal-only and withheld | Finance/customer-safe approval is not attached. |
| Product telemetry gap | Not computed and withheld | Customer-level aggregate telemetry is not attached. |

## Required Top-Level Fields

- `trial_id`
- `org_id`
- `window`
- `generated_at`
- `trial_effect`
- `source_artifacts`
- `claim_candidates`
- `generated_aggregate_import`
- `governance_boundaries`

## Review Behavior

`buildNielsenSourceEvidenceTrialReview` emits:

- `trial_effect: document_claim_mapping_only`
- `claim_readiness_effect: no_readiness_upgrade`
- accepted and withheld claim candidate IDs
- blocked claim effects
- next upgrade actions
- nested Aggregate Evidence Import review

## Privacy Boundary

The trial is metadata-only and aggregate-only. It must not include raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, hidden reconstruction, account names, or person-level metrics.

## Non-Goals

- No live Glean connection
- No source-system export ingestion
- No persistence
- No raw document contents
- No ROI calculation
- No claim readiness upgrade

See `examples/nielsen-source-evidence-trial.sample.json` for the committed Stage 2 sample.

