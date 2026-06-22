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

Top-level `source_refs` must match the nested source refs on Blueprint,
AI Fluency, VBD, selected metric, and token context lanes when those refs are
present. Source-ref drift fails validation.

## Blueprint Expectation Context

`blueprint_alignment` may carry customer-approved expectation context prepared
by the Blueprint Operator Source Handoff:

- `blueprint_expectation_ref`
- `blueprint_customer_approval_state`
- `blueprint_customer_approver_role`
- `expected_behavior_pathways`
- `expected_metric_id`
- `expected_metric_name`
- `expected_metric_direction`
- `expected_metric_lag_days`
- `expected_metric_system_recommended`
- `expected_metric_customer_selected`
- `value_driver`
- `baseline_window`
- `comparison_window`

These fields keep the customer-approved theory of change visible when the
Measurement Cell aligns observed aggregate evidence. They are not a separate
Blueprint Hypothesis object, Measurement Plan object, confidence model, formula,
weight, coefficient, ROI field, causality claim, or customer-facing financial
output.

When expectation context is present, the validator fails closed on unsafe
behavior labels, unsafe VBD-signal labels, unapproved metric selection, negative
lag values, unsafe `value_driver` values, Blueprint source-ref drift, metric lag
drift, and Blueprint window drift. Absent/null expectation fields remain
compatible with legacy Measurement Cells.

Explicit expectation context must carry `blueprint_expectation_ref`,
`blueprint_customer_approval_state: approved`, and
`blueprint_customer_approver_role`. Legacy Measurement Cells that carry only
older metric id/direction/lag alignment fields remain valid without upgrading
into customer-approved expectation context.

`expected_metric_lag_days` is descriptive review context only. It must not be
used as a threshold, surfacing gate, confidence input, model parameter, or
timing promise.

## Non-Goals

The Measurement Cell must not:

- calculate ROI, EBITA, EBITDA, savings, financial impact, or value-at-risk;
- emit a confidence percentage, probability, attribution score, or prediction;
- prove causality, productivity, or finance movement;
- turn Blueprint expectation context into a confidence score, probability,
  threshold, or economic dependency;
- rescue suppressed VBD, AI Fluency, metric, or governance evidence;
- use token intensity as value proof or as a hidden VBD formula modifier;
- store raw prompts, responses, transcripts, rows, query text, or file content;
- store user IDs, employee IDs, emails, names, hashed IDs, or joinable person
  identifiers;
- must not support individual attribution, manager ranking, team ranking, department
  ranking, HR analytics, people decisioning, headcount reduction, compensation
  inference, performance inference, promotion inference, discipline inference,
  or attrition prediction;
- create schemas, backend routes, persistence, ingestion jobs, frontend UI, or
  customer-facing exports.

The validator also rejects unsafe claim language in normal text fields, such as
phrasing that says AI proved ROI, created savings, drove EBITDA impact, or
produced a contribution probability. Governance caveats and blocked-use lists
may name prohibited claims only to block them.

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

## Time Window Modes

Measurement Cells support two time-window modes:

- `milestone` for launch-anchored executive progression checkpoints.
- `rolling_30_day` for operating and momentum context between milestones.

Each `time_window` should document:

- `window_mode`: either `milestone` or `rolling_30_day`.
- `anchor_date`: the checkpoint or measurement anchor date used to interpret
  the cell, normally the comparison-window end date for milestone and rolling
  reviews.
- `days_since_launch`: the launch-relative day represented by the cell, such as
  `0`, `30`, `60`, `90`, `180`, or `365` for milestone checkpoints.
- `cadence`: the review rhythm represented by the cell, such as `milestone`
  or `rolling_30_day`.
- `baseline_window`: the aggregate pre-period or launch baseline used for
  review context.
- `comparison_window`: the aggregate period being evaluated for this cell.
- `prior_window_ref`: the prior Measurement Cell or time-window reference used
  only for progression, continuity, or momentum review.

`milestone` windows support executive progression across Day 0, Day 30, Day
60, Day 90, Day 180, and Day 365. They are appropriate for launch-readiness
review, post-launch progression review, and internal evidence handoffs where
leaders need a stable sequence of aggregate checkpoints.

`rolling_30_day` windows provide operating and momentum context only. They may
help reviewers see whether aggregate evidence is continuing, weakening, or
stabilizing between milestone checkpoints, but they must not be treated as ROI
proof, causality evidence, productivity evidence, financial attribution,
confidence percentages, probabilities, or customer-facing output. Overlapping
rolling windows are not independent attribution samples. They must not feed
finance-context investigation planning or Bayesian research design planning
unless a later governed decision explicitly promotes that scope.

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
