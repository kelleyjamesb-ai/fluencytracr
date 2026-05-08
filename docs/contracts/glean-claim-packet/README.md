# Glean Claim Packet Export

Schema version: `GCP_2026_05`

## Purpose

The Claim Packet Export is a QBR-prep artifact for one account and reporting window. It packages methodology review, strongest safe claim language, value evidence posture, caveated claims, internal-only claims, suppressed claims, evidence gaps, upgrade actions, and governance boundaries.

It is a packaging layer, not a value calculator. It does not compute ROI independently and does not override source-system estimates, methodology approval, or Strongest Safe Claim gates.

## Required top-level fields

- `claim_packet_id`
- `org_id`
- `window`
- `generated_at`
- `selected_methodology_snapshot_id`
- `reviewer_decision_memo`
- `strongest_safe_claim`
- `caveated_claims`
- `internal_only_claims`
- `suppressed_claims`
- `evidence_gaps`
- `upgrade_actions`
- `governance_boundaries`

## Privacy boundary

The packet is aggregate-only. It must not include raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, or productivity scoring.

See `examples/nielsen-style-qbr-claim-packet.json` for a complete synthetic packet.
