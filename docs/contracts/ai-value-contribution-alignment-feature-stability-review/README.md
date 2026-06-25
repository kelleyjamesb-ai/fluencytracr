# AI Value Contribution Alignment Feature Stability Review

Validator/runner:
`scripts/run_ai_value_contribution_alignment_feature_stability_review.mjs`

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_2026_06`

## Purpose

Feature Stability Review is the reviewer gate between the internal research
math data model and any later internal numeric weight decision.

It answers:

```text
Are the compact internal feature inputs stable enough to consider a separate
internal numeric weight decision?
```

It does not answer:

```text
What are the weights?
What is the weighted model output?
What is the contribution confidence?
Can Bayesian execution start?
What should the customer see?
```

## States

```text
FEATURE_STABILITY_REVIEW_PASSED_FOR_INTERNAL_WEIGHT_DECISION
HOLD_FOR_STABLE_INTERNAL_RESEARCH_MATH_DATA_MODEL
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Ready means only this:

```text
Open a separate internal numeric weight decision.
```

Ready does not authorize numeric weights, weight values, weighted model output,
research model feeds, confidence output, probability output, Bayesian
execution, finance output, ROI, causality, productivity, persistence, routes,
UI, schemas, exports, live connectors, or customer-facing output.

## Feature Inputs

The review binds to the existing internal research math data model and requires
the governed feature registry to remain stable:

- `hypothesis_binding`;
- `source_coverage`;
- `milestone_continuity`;
- `ai_fluency_construct_context_integrity`;
- `psychological_context_integrity`;
- `observed_vbd_alignment`;
- `selected_metric_movement`;
- `comparison_design_strength`;
- `assumption_governance`;
- `boundary_clearance`.

Each ready feature is:

```text
STABLE_FOR_INTERNAL_WEIGHT_DECISION
candidate_internal_weight_input
numeric_value_present=false
source_bound=true
```

The feature registry contains no weight values.

## Excellence Standard

This contract is the quality bar before weights:

- the source internal research math data model id and hash must be bound;
- the source data model hash must recompute cleanly;
- all required feature inputs must be present in the governed order;
- each feature must remain `context_only`, `not_emitted`, and numeric-role
  `none`;
- AI Fluency construct context, psychological context, observed VBD, and
  selected metric movement must remain distinct;
- Day 0 / 30 / 60 / 90 / 180 / 365 milestone context must remain required;
- all forbidden output feeds must remain false.

## Non-Authorization

This contract does not authorize:

- numeric weights or weight values;
- weighted model output;
- research model feed;
- model output;
- confidence output;
- probability output;
- Bayesian execution;
- score-like output;
- finance output;
- ROI;
- causality claims;
- productivity measurement;
- customer-facing output;
- routes, UI, schemas, exports, persistence writes, or live connector execution.

## Validation

Run:

```bash
npm run test:ai-value-contribution-alignment-feature-stability-review
```

Executable sample:

```bash
npm run run:ai-value-contribution-alignment-feature-stability-review
```
