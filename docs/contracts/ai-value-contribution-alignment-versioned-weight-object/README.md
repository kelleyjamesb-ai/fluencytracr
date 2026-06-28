# AI Value Contribution Alignment Versioned Weight Object

Validator/runner:
`scripts/run_ai_value_contribution_alignment_versioned_weight_object.mjs`

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_2026_06`

## Purpose

Versioned Weight Object is the internal-only weight set after Internal Numeric
Weight Decision. It creates a reproducible structural weight object only when
the source decision and Feature Stability Review remain source-bound and clean.

It answers:

```text
Which internal structural weights may a later weighted internal model frame use?
```

It does not answer:

```text
What is the weighted model output?
What is the contribution confidence?
Can Bayesian execution start?
Can confidence, probability, ROI, finance, or customer-facing output be emitted?
```

## States

```text
VERSIONED_INTERNAL_WEIGHT_OBJECT_READY
HOLD_FOR_INTERNAL_NUMERIC_WEIGHT_DECISION
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Ready means only this:

```text
Feed a later weighted internal model frame.
```

Ready does not authorize weighted model output, research model feed, model
output, confidence output, probability output, Bayesian execution, score-like
output, finance output, ROI, causality, productivity, persistence, routes, UI,
schemas, exports, live connectors, or customer-facing output.

## Source Gate

The object must bind to:

- the Internal Numeric Weight Decision schema version;
- the Internal Numeric Weight Decision id;
- the Internal Numeric Weight Decision ready state;
- the Internal Numeric Weight Decision hash;
- the Feature Stability Review schema version;
- the Feature Stability Review id;
- the Feature Stability Review ready state;
- the Feature Stability Review hash;
- `versioned_weight_object_authorized=true`;
- `weight_values_present=false` in the source decision;
- `weighted_model_frame_authorized=false` in the source decision;
- `bayesian_execution_authorized=false` in the source decision.

If the source decision or source review drifts, the object must hold.

## Weight Policy

The initial version is:

```text
internal_structural_equal_weights_2026_06
```

The calibration state is:

```text
initial_internal_structural_weights_not_empirical_confidence
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

Each ready feature receives:

```text
weight=0.1
source_bound=true
rationale=neutral_initial_structural_weight
```

The weights must sum to one. These are neutral initial structural weights, not
empirical confidence, posterior probability, customer value, ROI, or a model
result.

## Authorized Next Step

The only authorized next step is:

```text
weighted_internal_model_frame_only
```

The object may set:

```text
feeds.weighted_internal_model_frame=true
```

The object must keep:

```text
weighted_internal_model_output=false
research_model_feed=false
model_output=false
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
npm run test:ai-value-contribution-alignment-versioned-weight-object
```

Executable sample:

```bash
npm run run:ai-value-contribution-alignment-versioned-weight-object
```
