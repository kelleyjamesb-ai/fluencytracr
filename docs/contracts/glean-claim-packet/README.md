# Glean Claim Packet Export

Schema version: `GCP_2026_05`

## Purpose

The Claim Packet Export is a methodology-governed claim packaging layer and QBR-prep artifact for one account and reporting window. It packages methodology review, strongest safe claim language, value evidence posture, caveated claims, internal-only claims, suppressed claims, evidence gaps, upgrade actions, and governance boundaries.

It is a packaging layer, not an ROI calculator. It does not compute ROI independently and does not override source-system estimates, methodology approval, or Strongest Safe Claim gates. It preserves the strongest safe claim, not the strongest possible claim.

The Methodology Review Workspace also renders a QBR Readiness Summary from the selected packet. That summary is plain-language packaging of the existing buckets: customer-safe claims, caveated claims, internal-only claims, suppressed or not-computed claims, top blockers, and next upgrade action.

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

See `examples/nielsen-style-qbr-claim-packet.json` for a complete synthetic packet. Nielsen appears only as a synthetic fixture for stress-testing the claim packaging path.
