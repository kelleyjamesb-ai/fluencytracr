# AI Value Contribution Alignment Comparison Design Adequacy Evidence Review

Validator/runner:
`scripts/run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs`

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW_2026_06`

## Purpose

Comparison Design Adequacy Evidence Review is the internal-only,
aggregate-only review artifact for one governed diagnostics evidence dimension:

```text
comparison_design_adequacy
```

It answers:

```text
Has explicit reviewed comparison-design source evidence been supplied for later
Governed Diagnostics Sufficiency Evidence Source binding?
```

It does not answer:

```text
Are all diagnostics evidence dimensions satisfied?
Should the Bayesian fixture be promoted?
Can posterior interpretation, confidence, probability, customer-facing,
economic, ROI, finance, causality, productivity, route, UI, schema,
persistence, export, or live connector behavior be created?
```

## States

```text
COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING
HOLD_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Held is the default. Without an explicit reviewed comparison-design source
package, the review must hold and must not emit reviewed evidence hashes or mark
the dimension satisfied.

## Source Package Required

A reviewed source package must be supplied separately from the contained runtime
fixture. Runtime design matrix fields, aggregate windows, test fixtures, model
spec prose, template prose, posterior-like prototype values, source hashes
alone, and generated examples are not eligible evidence.

Required source package fields:

```text
schema_version=FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_COMPARISON_DESIGN_ADEQUACY_SOURCE_PACKAGE_2026_06
package_state=COMPARISON_DESIGN_ADEQUACY_SOURCE_PACKAGE_REVIEWED_INTERNAL_ONLY
internal_only=true
aggregate_only=true
reviewed_source_evidence_ref=internal_diagnostics_sufficiency_evidence.comparison_design_adequacy.2026_06
source_runtime_ref.runtime_hash=<current runtime hash>
source_runtime_ref.fixture_artifact_hash=<current fixture artifact hash>
treatment_definition.defined=true
treatment_definition.aggregate_measurement_cell_grain=true
comparison_definition.defined=true
comparison_definition.aggregate_measurement_cell_grain=true
pre_post_window_definition.pre_window_defined=true
pre_post_window_definition.post_window_defined=true
rollout_or_comparison_design_type=<governed comparison or staggered rollout design>
metric_direction_lag_expectation_path_cohort_workflow_function_identity_matched=true
suppression_missing_held_window_review.suppressed_missing_held_windows_clear=true
unsupported_cross_slice_aggregation_present=false
person_level_or_identifiable_fields_present=false
causality_claim_authorized=false
reviewer_role=data_science_reviewer+governance_reviewer
review_decision=APPROVED_FOR_GOVERNED_DIAGNOSTICS_SOURCE_BINDING
placeholder_evidence=false
generated_fixture_evidence=false
source_package_hash=<hash of reviewed source package body>
```

## Reviewed Output

When the source package validates, the review may emit:

```text
reviewed_source_evidence_ref=internal_diagnostics_sufficiency_evidence.comparison_design_adequacy.2026_06
reviewed_source_evidence_hash=<hash bound to the reviewed comparison-design package>
source_evidence_hash=<hash bound to reviewed hash, runtime hash, and fixture artifact hash>
aggregate_only_scope=true
suppressed_missing_held_windows_clear=true
eligible_for_satisfied_representation=true
placeholder_evidence=false
generated_fixture_evidence=false
evidence_satisfied=true
```

This is only a one-dimension review result. It does not complete the full
Governed Diagnostics Sufficiency Evidence Source, because the remaining
diagnostics and feature-weight dimensions still require their own reviewed
source evidence.

## Held Output

When reviewed comparison-design source evidence is missing or incomplete, the
review must emit:

```text
review_state=HOLD_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE
evidence_satisfied=false
reviewed_source_evidence_hash=null
source_evidence_hash=null
allowed_next_step=complete_governed_diagnostics_sufficiency_evidence_source
```

Missing evidence must name the absent comparison-design requirements, including
treatment definition, comparison definition, pre/post window definition, rollout
or comparison design type, aggregate Measurement Cell grain, matched metric
context, suppressed/missing/held window review, reviewer role, and review
decision.

## Non-Authorization

This review must keep:

```text
promotion_authorized=false
posterior_interpretation_authorized=false
confidence_probability_authorized=false
customer_economic_output_authorized=false
internal_bayesian_execution_artifact_v1_authorized=false
```

It must not feed the Diagnostics Evidence Packet, Bayesian Promotion Decision
Gate, Internal Bayesian Execution Artifact v1, Posterior Interpretation
Specification Gate, customer surfaces, route/UI/schema/persistence/export
paths, or live connector execution.

## Validation

Run:

```bash
npm run test:ai-value-contribution-alignment-comparison-design-adequacy-evidence-review
```

Default executable sample:

```bash
npm run run:ai-value-contribution-alignment-comparison-design-adequacy-evidence-review
```
