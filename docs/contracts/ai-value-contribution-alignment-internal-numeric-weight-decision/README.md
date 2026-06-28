# AI Value Contribution Alignment Internal Numeric Weight Decision

Validator/runner:
`scripts/run_ai_value_contribution_alignment_internal_numeric_weight_decision.mjs`

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_2026_06`

## Purpose

Internal Numeric Weight Decision is the exact-scope promotion gate after Feature
Stability Review. It authorizes a later versioned internal weight object only
when the feature-stability review is source-bound and clean.

It answers:

```text
May the pipeline create a versioned internal weight object?
```

It does not answer:

```text
What are the weight values?
What is the weighted model output?
Can Bayesian execution start?
Can confidence, probability, ROI, finance, or customer-facing output be emitted?
```

## States

```text
PROMOTE_INTERNAL_NUMERIC_WEIGHT_OBJECT
HOLD_FOR_FEATURE_STABILITY_REVIEW
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Ready means only this:

```text
Create a versioned internal weight object.
```

Ready does not authorize weight values in this decision, weighted model output,
Bayesian execution, confidence output, probability output, score-like output,
finance output, ROI, causality, productivity, persistence, routes, UI, schemas,
exports, live connectors, or customer-facing output.

## Source Gate

The decision must bind to:

- the Feature Stability Review schema version;
- the Feature Stability Review id;
- the Feature Stability Review ready state;
- the Feature Stability Review hash;
- `weight_decision_ready=true`;
- stable source-bound feature registry entries;
- no existing numeric weights or weight values.

If the source feature-stability review drifts, the decision must hold.

## Authorized Next Step

The only authorized next step is:

```text
versioned_internal_weight_object_only
```

The decision may set:

```text
versioned_weight_object_authorized=true
```

The decision must keep:

```text
weight_values_present=false
weighted_model_frame_authorized=false
bayesian_execution_authorized=false
customer_output_authorized=false
```

## Non-Authorization

This contract does not authorize:

- weight values;
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
npm run test:ai-value-contribution-alignment-internal-numeric-weight-decision
```

Executable sample:

```bash
npm run run:ai-value-contribution-alignment-internal-numeric-weight-decision
```
