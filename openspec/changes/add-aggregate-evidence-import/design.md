## Context

The product currently shows whether synthetic Claim Packet inputs are ready to be replaced by real sources. The next safest step is to validate an aggregate upload package that reviewers can inspect before any persistent ingestion or live Glean access exists.

## Goals

- Parse a prepared aggregate evidence package.
- Validate the package against the Real Source Readiness Manifest.
- Accept aggregate evidence only for source inputs marked `ready`.
- Withhold blocked, unknown, approval-dependent, or synthetic-only source records while preserving blockers and upgrade actions.
- Render import review in `/methodology-review`.

## Non-Goals

- No raw event ingestion.
- No persistence or database write.
- No file upload widget.
- No live Glean API, export, or MCP/read access.
- No ROI calculation.
- No claim readiness upgrade.
- No raw prompts, raw responses, transcripts, query text, tool payloads, file contents, direct identifiers, rankings, manager views, productivity scoring, or hidden reconstruction.

## Decisions

- Name the product surface "Source Evidence Import" and the contract "Aggregate Evidence Import" to avoid implying broad raw ingestion.
- Keep `AEI_2026_05` separate from `RSRM_2026_05`: readiness says whether a source can be used; import says what aggregate records were presented and accepted or withheld.
- In v1, accepted means "valid aggregate evidence from a ready source", not "customer-safe claim enabled."
- The first supported path is `admin_exported_aggregate_upload`.

## Risks / Trade-Offs

- Risk: users may expect import to store data. Mitigation: explicit non-persistent review copy.
- Risk: accepted aggregate records may be read as claim upgrades. Mitigation: review always emits `claim_readiness_effect: no_readiness_upgrade`.
- Risk: schema becomes too flexible. Mitigation: strict enums, bounded aggregate values, forbidden-field validation, and source-id cross-checks.
