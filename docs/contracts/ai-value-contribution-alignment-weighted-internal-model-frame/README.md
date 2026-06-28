# AI Value Contribution Alignment Weighted Internal Model Frame

Validator/runner:
`scripts/run_ai_value_contribution_alignment_weighted_internal_model_frame.mjs`

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_2026_06`

## Purpose

Weighted Internal Model Frame is the internal-only frame that attaches the
versioned structural weights to the governed contribution-alignment feature
registry.

It answers:

```text
What is the source-bound weighted feature composition a later internal model
readiness review may inspect?
```

It does not answer:

```text
What is the weighted model output?
What is the aggregate score?
What is the contribution confidence?
Can Bayesian execution start?
Can confidence, probability, ROI, finance, or customer-facing output be emitted?
```

## States

```text
WEIGHTED_INTERNAL_MODEL_FRAME_READY
HOLD_FOR_VERSIONED_WEIGHT_OBJECT
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Ready means only this:

```text
The internal weighted feature composition frame is ready for a later internal
Bayesian readiness review.
```

Ready does not authorize weighted internal model output, research model feed,
aggregate score output, model output, confidence output, probability output,
Bayesian execution, score-like output, finance output, ROI, causality,
productivity, persistence, routes, UI, schemas, exports, live connectors, or
customer-facing output.

## Source Gate

The frame must bind to:

- the Versioned Weight Object schema version;
- the Versioned Weight Object id;
- the Versioned Weight Object ready state;
- the Versioned Weight Object version;
- the Versioned Weight Object hash;
- the Internal Numeric Weight Decision id/hash ref;
- the Feature Stability Review id/hash ref;
- `weights_sum_to_one=true`;
- all weighted components source-bound;
- `weighted_model_output_authorized=false`;
- `bayesian_execution_authorized=false`.

If the versioned weight object or upstream refs drift, the frame must hold.

## Frame Policy

The frame version is:

```text
internal_weighted_feature_composition_frame_2026_06
```

The frame contains only weighted feature composition:

```text
feature_id
weight
source_bound
frame_role=internal_weighted_feature_component
value_output_present=false
```

The governed feature registry is:

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

Each ready feature retains:

```text
weight=0.1
source_bound=true
value_output_present=false
```

The composition weights must sum to one. This is still not a score, confidence
estimate, posterior probability, model result, customer value output, ROI, or
Bayesian execution.

## Authorized Next Step

The only authorized next step is:

```text
internal_bayesian_readiness_review_only
```

The frame may set:

```text
feeds.internal_bayesian_readiness_review=true
```

The frame must keep:

```text
weighted_internal_model_output=false
research_model_feed=false
aggregate_score_output=false
confidence_output=false
probability_output=false
bayesian_execution=false
score_like_output=false
finance_output=false
roi_output=false
causality_output=false
productivity_output=false
customer_facing_output=false
route_creation=false
ui_creation=false
schema_creation=false
persistence_write=false
export_creation=false
live_connector_execution=false
```

## Non-Authorization

This contract does not authorize:

- weighted internal model output;
- research model feed;
- aggregate score output;
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
npm run test:ai-value-contribution-alignment-weighted-internal-model-frame
```

Executable sample:

```bash
npm run run:ai-value-contribution-alignment-weighted-internal-model-frame
```
