# AI Value Contribution Alignment Internal Bayesian Execution Runtime

Validator/runner:
`scripts/run_ai_value_contribution_alignment_internal_bayesian_execution_runtime.mjs`

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_2026_06`

## Purpose

Internal Bayesian Execution Runtime is the internal-only aggregate runtime after
Internal Bayesian Execution Gate. It fits the governed difference-in-differences
candidate against aggregate Measurement Cell windows and creates an internal
posterior candidate artifact that is held for review.

It answers:

```text
Can the source-bound Bayesian model contract run on aggregate-only windows and produce an internal fit artifact for review?
```

It does not answer:

```text
Can posterior, confidence, or probability language be shown?
Can the result become customer-facing confidence, ROI, finance, causality, or productivity output?
```

## States

```text
INTERNAL_BAYESIAN_EXECUTION_RUNTIME_READY_FOR_OUTPUT_REVIEW
HOLD_FOR_INTERNAL_BAYESIAN_EXECUTION_GATE
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Ready means only this:

```text
Send the internal fit artifact to a later posterior/output review gate.
```

Ready does not authorize posterior output, confidence output, probability
output, score-like output, weighted internal model output, aggregate score
output, research model feed, finance output, ROI, causality, productivity,
persistence, routes, UI, schemas, exports, live connectors, or customer-facing
output.

## Source Gate

The runtime must bind to:

- the Internal Bayesian Execution Gate schema version;
- the Internal Bayesian Execution Gate id;
- the Internal Bayesian Execution Gate ready state;
- the Internal Bayesian Execution Gate hash;
- `runtime_implementation_authorized=true`;
- aggregate-only runtime prerequisites;
- `posterior_output_authorized=false`;
- `confidence_output_authorized=false`;
- `probability_output_authorized=false`;
- `customer_output_authorized=false`.

If the execution gate drifts, the runtime must hold.

## Aggregate Input Contract

Runtime input is limited to four aggregate Measurement Cell windows:

```text
ai_exposed / baseline
ai_exposed / comparison
comparison / baseline
comparison / comparison
```

Each aggregate window may contain only:

```text
aggregate_window_id
comparison_role
window_role
selected_metric_mean
selected_metric_standard_error
cohort_size
```

The runtime rejects raw rows, records, query text, identifiers, prompts,
transcripts, URLs, warehouse references, dashboards, probability output,
confidence output, finance output, ROI, causality, productivity, and
customer-facing output.

## Model Equation

The implemented internal model equation is:

```text
did_observed_estimate ~ Normal(delta_ai_post, did_standard_error)
delta_ai_post ~ Normal(0, 1)
```

The conceptual linear predictor is:

```text
mu_cell_window = alpha + alpha_cell + beta_post + beta_ai_exposed + delta_ai_post + weighted_covariate_terms
```

The runtime uses the closed-form normal-normal update for the internal candidate
fit:

```text
posterior_variance = 1 / (1 / prior_variance + 1 / did_variance)
posterior_mean = posterior_variance * (prior_mean / prior_variance + did_observed_estimate / did_variance)
```

The internal posterior candidate remains held for output review. It is not
customer-facing output and is not confidence or probability language.

## Authorized Next Step

The only authorized next step is:

```text
posterior_output_review_gate_only
```

The runtime may set:

```text
feeds.posterior_output_review_gate=true
```

The runtime must keep:

```text
confidence_output=false
probability_output=false
score_like_output=false
weighted_internal_model_output=false
aggregate_score_output=false
research_model_feed=false
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

- posterior output;
- confidence output;
- probability output;
- score-like output;
- weighted internal model output;
- aggregate score output;
- research model feed;
- finance output;
- ROI;
- causality claims;
- productivity measurement;
- customer-facing output;
- routes, UI, schemas, exports, persistence writes, or live connector execution.

## Validation

Run:

```bash
npm run test:ai-value-contribution-alignment-internal-bayesian-execution-runtime
```

Executable sample:

```bash
npm run run:ai-value-contribution-alignment-internal-bayesian-execution-runtime
```
