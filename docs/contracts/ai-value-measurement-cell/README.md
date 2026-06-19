# AI Value Measurement Cell Contract

Schema version: `FT_AI_VALUE_MEASUREMENT_CELL_2026_06`

## Purpose

The Measurement Cell is the canonical cross-source alignment object for the
Blueprint-to-finance-review readiness spine.

It binds the same aggregate grain across:

```text
org_id
+ function_area
+ workflow_id or workflow_family
+ cohort_key
+ time_window
+ metric_id
```

Its job is to decide whether evidence sources are aligned enough to feed
internal review objects. It is not a score, model output, financial readout, or
claim upgrade.

## Non-Goals

The Measurement Cell must not:

- calculate ROI, EBITA, EBITDA, savings, financial impact, or value-at-risk;
- emit a confidence percentage, probability, attribution score, or prediction;
- prove causality, productivity, or finance movement;
- rescue suppressed VBD, AI Fluency, metric, or governance evidence;
- use token intensity as value proof or as a hidden VBD formula modifier;
- store raw prompts, responses, transcripts, rows, query text, or file content;
- store user IDs, employee IDs, emails, names, hashed IDs, or joinable person
  identifiers;
- support individual attribution, manager ranking, team ranking, department
  ranking, HR analytics, people decisioning, headcount reduction, compensation
  inference, performance inference, promotion inference, discipline inference,
  or attrition prediction;
- create schemas, backend routes, persistence, ingestion jobs, frontend UI, or
  customer-facing exports.

## Required Inputs

Each Measurement Cell must carry:

- `org_id`
- `function_area`
- `workflow_family`
- `workflow_id` when available
- `cohort_key`
- `time_window`
- `blueprint_alignment`
- `ai_fluency_context`
- `vbd_context`
- `selected_metric`
- `metric_movement`
- `token_context`
- `yield_context`
- `confounders`
- `evidence_design`
- `finance_review_context`
- `governance`
- `allowed_uses`
- `blocked_uses`
- `value_proof_policy`
- `persistence_policy`
- `source_refs`
- `required_caveats`

The shared validator lives at
[`shared/src/aiValueEngine/measurementCell.ts`](../../../shared/src/aiValueEngine/measurementCell.ts).

## Derived Context

The builder may derive:

```text
VBD Momentum =
current overall VBD score - prior overall VBD score
```

```text
Metric Yield =
direction-adjusted selected metric delta / sustained VBD exposure
```

```text
Token Efficiency Yield =
direction-adjusted selected metric delta / token intensity
```

These are review-context fields only. They must not become ROI proof,
productivity scoring, financial attribution, or hidden economic multipliers.

## Evidence Design Strength

Evidence design strength caps future research. Supported design types are:

- `assumption_only`
- `baseline_only`
- `pre_post`
- `repeated_pre_post`
- `matched_comparison`
- `staggered_rollout`
- `controlled_test`
- `calibrated_historical_model`

Finance-review-ready cells require documented confounders and
`evidence_design.controls_documented: true`.

## Allowed Uses

Allowed uses are limited to:

- `measurement_cell_alignment`
- `internal_evidence_review`
- `value_hypothesis_readiness_input`
- `business_owner_metric_review`
- `finance_context_investigation_planning`
- `bayesian_research_design_planning`

`bayesian_research_design_planning` means research planning only. It does not
authorize Bayesian model execution, probabilities, confidence percentages,
customer-facing prediction, or financial attribution.

## Blocked Uses

Every Measurement Cell must block:

- `realized_roi`
- `ebita_claim`
- `ebitda_claim`
- `financial_attribution`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `department_ranking`
- `people_decisioning`
- `customer_facing_financial_output`
- `customer_facing_prediction`

## Examples

Validator-backed examples:

- [`examples/valid-finance-review-measurement-cell.json`](./examples/valid-finance-review-measurement-cell.json)
- [`examples/suppressed-measurement-cell.json`](./examples/suppressed-measurement-cell.json)
- [`examples/metric-window-mismatch-measurement-cell.json`](./examples/metric-window-mismatch-measurement-cell.json)

The mismatch example is intentionally invalid. It exists to prove that selected
metrics cannot drift away from Blueprint metric IDs or measurement windows.

## Validation

Run:

```bash
npm run build --workspace shared
node --test scripts/validate_ai_value_measurement_cell.test.mjs
```
