# AI Value Contribution Alignment Internal Diagnostics and Model Adequacy Review

Validator/runner:
`scripts/run_ai_value_contribution_alignment_internal_diagnostics_model_adequacy_review.mjs`

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_2026_06`

## Purpose

Internal Diagnostics and Model Adequacy Review is the internal-only,
aggregate-only review after the contained Bayesian fixture/prototype runtime. It
reviews whether the fixture has documented data adequacy, comparison-design
adequacy, and model-diagnostic evidence for a later explicit promotion decision.

It answers:

```text
Is the contained Bayesian fixture documented well enough to create a later explicit promotion decision record?
```

It does not answer:

```text
Can posterior interpretation, confidence, probability, or customer-facing output be shown?
Can the result become ROI, finance, causality, productivity, or economic output?
```

## States

```text
INTERNAL_DIAGNOSTICS_AND_MODEL_ADEQUACY_REVIEW_COMPLETED_PROMOTION_BLOCKED
HOLD_FOR_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_SOURCE
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Completed means only this:

```text
The adequacy review record may feed a later explicit Bayesian Promotion Decision Gate.
```

Completed does not promote the fixture. It does not authorize posterior
interpretation, posterior output, confidence output, probability output,
score-like output, weighted internal model output, aggregate score output,
research model feed, finance output, ROI, causality, productivity, persistence,
routes, UI, schemas, exports, live connectors, or customer-facing output.

## Source Runtime

The review must bind to:

- the Internal Bayesian Execution Runtime schema version;
- the fixture/prototype containment state;
- `runtime_execution_class=internal_fixture_prototype_only`;
- the runtime id/hash;
- the internal fixture artifact state/hash;
- `allowed_next_step=internal_diagnostics_and_model_adequacy_review_only`;
- aggregate Measurement Cell window design metadata;
- diagnostic placeholder fields;
- false posterior, confidence, probability, finance, and customer-output policies.

If the source runtime drifts, the review must hold.

The review may also bind to an optional Governed Diagnostics Sufficiency
Evidence Source:

```text
schema_version=FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_2026_06
source_state=GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_READY_FOR_PACKET_REVIEW
allowed_next_step=diagnostics_evidence_packet_update_only
promotion_authorized=false
posterior_interpretation_authorized=false
confidence_output_authorized=false
probability_output_authorized=false
customer_output_authorized=false
```

The review stores both the governed source hash and the projected packet-side
evidence hash:

```text
source_governed_diagnostics_sufficiency_evidence_source_ref
source_diagnostics_sufficiency_evidence_ref
```

Direct packet-side sufficiency sidecars are not sufficient for satisfied
diagnostics/model adequacy evidence. They must be supplied through the governed
source contract so the review can bind the source artifact hash. The review does
not calculate diagnostics or embed raw diagnostic records.

## Required Review Dimensions

Data adequacy records:

```text
minimum_eligible_aggregate_windows_present
pre_post_window_sufficiency_present
treatment_comparison_available
suppression_status_respected
missing_or_suppressed_windows_fail_closed
missing_window_count_zero
suppressed_window_count_zero
held_window_count_zero
raw_row_count_zero
identifier_count_zero
query_text_absent
data_adequacy_satisfied
```

Comparison-design adequacy records without governed sufficiency evidence:

```text
aggregate_measurement_cell_grain
treatment_group_defined
comparison_group_defined
no_person_level_fields
no_unsupported_cross_slice_aggregation
comparison_design_review_present=false
comparison_design_adequacy_satisfied=false
causal_claim_authorized=false
```

Model diagnostics records without governed sufficiency evidence:

```text
convergence_diagnostics_required=true
convergence_diagnostics_satisfied=false
posterior_predictive_checks_required=true
posterior_predictive_checks_satisfied=false
prior_sensitivity_required=true
prior_sensitivity_satisfied=false
residual_fit_checks_required=true
residual_fit_checks_satisfied=false
calibration_backtest_required=true
calibration_backtest_satisfied=false
model_diagnostics_satisfied=false
```

With a governed sufficiency evidence source, the review may record:

```text
comparison_design_review_present=true
comparison_design_adequacy_satisfied=true
convergence_diagnostics_satisfied=true
posterior_predictive_checks_satisfied=true
prior_sensitivity_satisfied=true
residual_fit_checks_satisfied=true
calibration_backtest_satisfied=true
model_diagnostics_satisfied=true
```

That satisfied review state still keeps `promotion_authorized=false` and
`promotion_blocked=true`; it only feeds the Bayesian Promotion Decision Gate.

## Artifact Containment

The review may bind to the fixture artifact state, estimand parameter, and hash.
It must not echo numeric posterior values such as `posterior_mean_internal`,
`posterior_sd_internal`, `did_observed_estimate`, or `did_standard_error`.
Feature weights remain structural/internal only and must not be treated as
confidence scores, probability scores, weighted model output, aggregate scores,
or customer-facing model output.

The review must keep:

```text
posterior_interpretation_authorized=false
posterior_output_authorized=false
confidence_output_authorized=false
probability_output_authorized=false
finance_output_authorized=false
customer_output_authorized=false
promotion_authorized=false
promotion_blocked=true
```

## Authorized Next Step

The only authorized next step is:

```text
bayesian_promotion_decision_gate_only
```

The review may set:

```text
feeds.bayesian_promotion_decision_gate=true
```

The review must keep:

```text
posterior_interpretation=false
internal_posterior_interpretation_specification=false
posterior_output=false
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

- posterior interpretation;
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
npm run test:ai-value-contribution-alignment-internal-diagnostics-model-adequacy-review
```

Executable sample:

```bash
npm run run:ai-value-contribution-alignment-internal-diagnostics-model-adequacy-review
```
