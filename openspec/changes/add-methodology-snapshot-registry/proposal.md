# Change: Add Methodology Snapshot Registry

## Why

AI value claims depend on mutable assumptions: base rates, quality multipliers, excluded surfaces, dedupe policy, recapture rules, cost model, and approval state. Without frozen methodology lineage, two QBRs can show different value claims for the same work because the measurement method changed.

FluencyTracr should govern which AI value claims are admissible. That requires a methodology snapshot registry that records how estimates were produced before Strongest Safe Claim language can prepare internal financial-review language. Customer-facing ROI, payback, and economic output remain blocked unless a later exact-scope governance decision authorizes them.

## What Changes

- Add a `MSR_2026_05` Methodology Snapshot Registry contract in shared schemas.
- Add synthetic Nielsen-style methodology snapshots for Glean Time-Saves, internal financial-review, agentic work placeholder methods, and suppressed unapproved models.
- Wire Strongest Safe Claim generation to methodology approval state so financial-review language is internal-only, caveated, or suppressed unless later exact-scope governance authorizes customer-facing economic output.
- Add docs and tests that preserve the governance boundary: no raw prompts, raw responses, transcripts, query text, file contents, direct identifiers, rankings, manager views, or productivity scoring.

## Impact

- Affected specs: methodology-snapshot-registry
- Affected code: `shared/src/aiWorkValueGraphSchemas.ts`, backend contract tests, docs under `docs/contracts/`
- Affected outputs: Strongest Safe Claim may downgrade financial language when a methodology snapshot is missing, unapproved, expired, rejected, or internal-only.
