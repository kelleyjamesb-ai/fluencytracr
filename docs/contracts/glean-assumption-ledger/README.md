# Glean Assumption Ledger

Schema version: `GAL_2026_05`

## Purpose

The Glean Assumption Ledger makes value assumptions explicit, reviewable, and governable before they influence Glean customer-facing ROI or value language.

It covers assumptions such as:

- base-rate manual counterfactual durations
- quality multipliers
- blended hourly rates
- productivity recapture discounts
- cost model inputs
- confidence discounts
- customer overrides
- benchmark mappings

The ledger does not calculate ROI. It records whether assumptions are approved, customer-safe, internal-only, high sensitivity, low confidence, or suppressed.

## Assumption entry

Each assumption includes:

- `assumption_id`
- `assumption_kind`
- scope (`global_default`, `org_window`, or `customer_override`)
- description and value label
- claim ids and claim types that depend on it
- source and source note
- confidence
- sensitivity tier/rank
- approval state
- customer-claim approval flag
- claim language constraint
- customer visibility
- last reviewed timestamp
- caveats

## Approval states

Allowed approval states are:

- `draft`
- `internal_only`
- `finance_reviewed`
- `customer_safe`
- `rejected`

An assumption can set `approved_for_customer_claims: true` only when `approval_state` is `customer_safe`.

Low-confidence or high-sensitivity assumptions cannot be approved for customer-facing claims.

## Claim language constraints

Allowed constraints are:

- `customer_safe_allowed`
- `customer_safe_with_caveats`
- `internal_only`
- `suppressed`

`customer_safe_allowed` requires customer-claim approval. Suppressed assumptions must not be customer visible.

## Required top-level fields

Every ledger must include:

- `schema_version`
- `ledger_id`
- `generated_at`
- `source_system`
- optional `org_id`
- optional `window`
- `summary`
- non-empty `assumptions`

See `examples/default-assumption-ledger.json` for a complete valid payload seeded from the Time-Saves MVP review packet themes.

Runtime validation lives in `shared/src/gleanAssumptionLedgerSchemas.ts` and is exported through `@fluencytracr/shared`.

## Relationship to other contracts

- **Claim Registry (`GCR_2026_05`)**: references claims that depend on assumptions.
- **Value Evidence Pack (`GVE_2026_05`)**: summarizes assumption posture in the `assumptions` lane.
- **EvidenceBundle v1**: remains the executive-safe evidence posture contract.

Customer-facing ROI/value claims must remain internal-only or suppressed when the ledger shows low-confidence, high-sensitivity, or unapproved assumptions dominate the result.
