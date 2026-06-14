# Change: Add Glean Assumption Ledger

## Why
Glean value and ROI claims depend on base rates, quality multipliers, hourly rates, productivity recapture, cost-model choices, confidence discounts, and customer overrides. These assumptions need to be explicit, reviewable, and mechanically constrained before customer-facing value language can be trusted.

## What Changes
- Add a Glean Assumption Ledger contract for `GAL_2026_05`.
- Add shared Zod validation for assumption entries, summaries, approval state, confidence, sensitivity, and claim-language constraints.
- Add a Time-Saves-seeded example ledger that records high-leverage assumptions as internal-only unless approved.
- Extend the Glean value governance gate to validate the assumption ledger.

## Impact
- Affected specs: `glean-assumption-ledger`
- Affected docs: `docs/contracts/glean-assumption-ledger/`
- Affected code: `shared/src/`, `scripts/ci_glean_value_governance_gates.mjs`
- Affected tests: backend schema validation tests
