## Context

The registry stores methodology snapshots, and Strongest Safe Claim now gates financial claims by methodology approval. The missing experience is reviewability: a human should understand the approval gate and claim effect before value language is used in executive or customer-facing materials.

## Goals

- Make methodology approval state and customer-safe claim effect inspectable.
- Summarize each snapshot without exposing raw prompts, responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, or productivity scoring.
- Show why a claim is customer-safe, internal-only, caveated, or suppressed.
- Keep the first version static/prototype-friendly while using real shared contract helpers.

## Non-Goals

- No approval mutation workflow.
- No finance calculation engine.
- No live Glean data ingestion.
- No person-level, manager-level, or team-ranking UI.

## Design

The shared helper derives a compact review workspace from a Methodology Snapshot Registry:

- snapshot list fields: ID, label, approval state, claim effect, covered/excluded surfaces
- selected detail fields: gate explanation, financial claim effect, high-sensitivity assumptions, caveats, blocked claim effects, sensitivity tests, and examples

The frontend route uses the synthetic Nielsen-style snapshots and lets reviewers switch snapshots locally. It is intentionally explanatory and static so reviewers can validate product framing before a persistent workflow is added.

Strongest Safe Claim remains the enforcement point. The review workspace is the human-readable preflight layer.
