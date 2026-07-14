# ROI Scenario Product Governance Decision

Decision date: 2026-07-13

Decision owner: James Kelley

Decision: **HOLD pending an explicit, exact-scope product-governance decision**

This decision takes precedence over older conditional-permission language in
the AI Value contracts. Evidence-gate or schema success may establish review
eligibility, but it cannot release a held product lane.

## Scope

The local ROI Scenario schema can represent several legacy
financial-claim-gate outputs for read compatibility. The validator rejects
their activation. The following `financial_claim_gate.allowed_outputs` lanes must
remain `false` in product, production, customer, and internal dogfood execution:

- `dollarized_output`
- `causality_language`
- `aggregate_workflow_productivity`

This HOLD is mechanically enforced by ROI validation and downstream financial
translation/readout guards. It is not a new runtime state, suppression reason,
schema enum, threshold, override, route, or readout.

## Existing Blocks

These lanes remain blocked exactly as before:

- `realized_roi_calculation`
- `customer_facing_economic_output`
- person-level or named productivity
- individual attribution, scoring, or people decisioning
- team or manager ranking

When a held lane is enabled, validation is invalid and all value-modeling and
executive-readout execution feeds remain `false`. Existing stored source
objects are revalidated before evidence-case assembly, and downstream EBITA or
executive packet builders reduce held sources to no financial translation.

Unaffected capabilities remain available: non-dollarized ROI metric routing,
customer-owned assumption references, non-causal Causal Delta, and aggregate
capacity context that is not framed as measured productivity.

## Required Future Decision

A later proposal may release only one explicitly named lane at a time. It must
bind the permitted audience, aggregate data boundary, evidence requirements,
claim language, execution path, review owner, test coverage, and blocked
outputs. Approval of one lane must not implicitly approve another.

Until that decision is merged, no product code or readout may infer permission
from schema presence, prerequisite satisfaction, evidence-gate success, or a
synthetic fixture.
