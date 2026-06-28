# AI Value Reviewer-Owned Comparison Design Source Package Collection

Status:
`REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTION_NOT_EVIDENCE`

Runner:
`scripts/run_ai_value_reviewer_owned_comparison_design_source_package_collection.mjs`

Schema:
none

## Purpose

The Reviewer-Owned Comparison Design Source Package Collection contract is the
bounded collection layer after the Comparison Design Source Package Preparation
Binding.

It answers:

```text
Given a validated comparison-design preparation binding, has a reviewer supplied
an aggregate-only comparison-design source package that can be routed to a
later comparison-design adequacy evidence review?
```

It does not answer:

```text
Has comparison_design_adequacy been satisfied?
Has reviewed diagnostics evidence been created?
Does aggregate production data exist?
Is any evidence assessment complete?
Is Bayesian/model review ready?
Can posterior interpretation, confidence, probability, ROI, finance,
causality, productivity, economic output, customer-facing economic output, live
connectors, routes, UI, schemas, persistence, or exports be created?
```

## Chain Position

```text
Client Blueprint hypothesis
-> LLM candidate metric recommendations from approved metric libraries
-> reviewer/customer-approved measurement plan
-> aggregate data collection planning/readiness
-> comparison-design source package preparation binding
-> reviewer-owned comparison-design source package collection
-> later comparison-design adequacy evidence review
-> later EvidenceAssessment after real aggregate data exists
-> later Bayesian/model review after governed evidence exists
```

This contract is the reviewer-owned package collection stop. It is not
comparison-design adequacy, diagnostics sufficiency, evidence assessment,
Bayesian readiness, or promotion authority.

## Corrected Execution Prompt

Use this scope selector:

```text
collect_reviewer_owned_comparison_design_source_package_only
```

Collect only explicitly supplied reviewer-owned, aggregate-only comparison
design information. If reviewer-owned comparison-design values are not
explicitly supplied, emit a held package collection posture, not a completed
source package.

Do not request or store raw data, SQL, query text, prompts, transcripts,
identifiers, employee names, customer-sensitive rows, or person-level detail.
Do not fabricate observations or production data. If a required binding or
source artifact does not exist yet, use `HOLD_FOR_BINDING` or
`HOLD_FOR_MORE_INFORMATION`.

Preferred defaults may appear only when explicitly supplied by the reviewer in
the source package. They are draft defaults, not reviewer-owned facts, reviewed
evidence, approval, production observations, or diagnostics satisfaction.

Boundary checks may be `CLEAR` only when the submitted reviewer-owned package
explicitly confirms the relevant exclusion.

## Required Source Binding

The collection contract must bind to:

```text
sourceComparisonDesignSourcePackagePreparationBinding
sourceReviewerApprovedMeasurementPlan
sourceAggregateDataCollectionPlanningContract
sourceRecommendationPlan
```

The source preparation binding must validate and be ready at:

```text
COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_READY_FOR_REVIEWER_COLLECTION
```

with:

```text
allowed_next_step=collect_reviewer_owned_comparison_design_source_package_only
```

Self-consistent collection hashes alone are not enough. Ready validation
requires the original preparation binding and its upstream source chain.

## Reviewer-Owned Package Fields

The reviewer-owned comparison-design source package must explicitly supply:

```text
reviewer_owned_source_package_ref
source_blueprint_hypothesis_ref
business_function
prioritized_use_case
workflow
workflow_step
cohort
metric
evidence_source
observation_window
governance_state
treatment_group_definition
comparison_group_definition
rollout_or_comparison_design_type
baseline_source_posture
comparison_condition
baseline_window
comparison_window
expected_movement_direction
expected_lag_definition
metric_direction_lag_confirmation_ref
approved_expectation_path_blueprint_hypothesis_binding_ref
cohort_identity_confirmation_ref
workflow_function_identity_confirmation_ref
aggregate_measurement_cell_grain_confirmation_ref
aggregate_measurement_cell_grain
milestone_schedule_confirmation_refs
suppression_missing_held_window_review
boundary_checks
reviewer_role_ref
review_decision
```

Required `review_decision` for a collected package:

```text
COLLECTED_FOR_REVIEW_ONLY
```

Default held `review_decision`:

```text
HOLD_FOR_MORE_INFORMATION
```

## Evidence Framing

The package uses this evidence architecture framing only:

```text
Blueprint Hypothesis = source of truth for the measurement plan
AI Fluency Instrument / SED = stated evidence posture
VBD = observed behavioral evidence posture
Business and operational metrics = downstream outcome evidence posture
```

Those postures are not evidence assessment, model readiness, posterior
interpretation, confidence, probability, causality, ROI, finance, productivity,
or customer-facing economic output.

## Aggregate Measurement Cell Grain

The collection record uses Measurement Cell as the aggregate alignment object.
It does not introduce an Evidence Cell or any new atomic evidence object.

Required aggregate grain:

```text
Blueprint Hypothesis x Business Function x Prioritized Use Case x Workflow x Workflow Step x Cohort x Metric x Evidence Source x Milestone Window
```

The atomic grain support list is:

```text
blueprint_hypothesis
business_function
prioritized_use_case
workflow
workflow_step
cohort
metric
evidence_source
observation_window
governance_state
```

## Required Milestone Schedule

The package must explicitly confirm aggregate milestone refs for:

```text
T0_baseline
T30
T60
T90
T120
T180_6_month
T270_9_month
T365_12_month
```

`T365+` is represented as a later extended-window posture and must remain held
until a reviewer-owned aggregate window ref is supplied.

Missing, unsafe, stale, suppressed, held, or misaligned milestone refs keep the
contract held.

The reviewer-owned package must align back to the validated preparation binding
for Blueprint hypothesis ref, selected metric, expected movement direction,
expected lag definition, baseline source posture, comparison condition, cohort,
workflow/function identity, and aggregate Measurement Cell grain. Safe-looking
package text is not enough.

## Required Boundary Checks

Every collected package must explicitly mark these as `CLEAR`:

```text
raw_rows_absent
identifiers_absent
query_text_absent
prompts_transcripts_absent
person_level_data_absent
causality_claim_absent
roi_finance_productivity_claims_absent
confidence_probability_output_absent
live_connector_persistence_export_authorization_absent
cross_slice_aggregation_prohibition_clear
```

`CLEAR` does not override unsafe package content. If the package contains raw
rows, identifiers, query text, prompts, transcripts, person-level data, causal
claims, ROI/finance/productivity claims, confidence/probability output, live
connector authorization, persistence authorization, export authorization, or
unsupported cross-slice aggregation, validation fails closed.

## Ready State

Ready state:

```text
REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTED_FOR_REVIEW_ONLY
```

Allowed next step:

```text
run_comparison_design_adequacy_evidence_review_only
```

This means a later bounded adequacy-review slice may evaluate the reviewer-owned
source package. It does not mean `comparison_design_adequacy` is satisfied.

## Held States

This contract may hold at:

```text
HOLD_FOR_BINDING
HOLD_FOR_MORE_INFORMATION
```

`HOLD_FOR_BINDING` means a required source artifact or source binding is
missing or invalid.

`HOLD_FOR_MORE_INFORMATION` means the source binding is valid, but explicit
reviewer-owned package fields or boundary confirmations are missing, unsafe, or
held.

Held contracts must keep:

```text
source_package_collected=false
review_decision=HOLD_FOR_MORE_INFORMATION
```

## Non-Authorization

This contract must not:

- create reviewed evidence;
- mark evidence satisfied;
- mark `comparison_design_adequacy` satisfied;
- complete the Governed Diagnostics Sufficiency Evidence Source;
- authorize Bayesian promotion;
- authorize posterior interpretation;
- emit confidence or probability output;
- emit ROI, finance, causality, productivity, economic, or customer-facing
  economic output;
- connect live BigQuery, Sigma, Glean, or other systems;
- create routes, UI, schemas, persistence, or exports;
- include raw rows, identifiers, query text, prompts, transcripts,
  person-level data, individual scoring, or team scoring;
- create new canonical events, suppression reasons, tunable thresholds, or
  admin overrides.

The Bayesian hardening chain remains held at:

```text
HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE
```

The Bayesian gate-derived next step remains:

```text
complete_governed_diagnostics_sufficiency_evidence_source
```

## Exact Next Bounded Implementation Slice

The exact next bounded implementation slice is:

```text
Comparison Design Adequacy Evidence Review binding to reviewer-owned package
```

That slice may review the reviewer-owned comparison-design source package. It
must still not fabricate evidence, satisfy unrelated diagnostics dimensions,
run Bayesian diagnostics, authorize promotion, create live connectors, routes,
schemas, persistence, exports, or emit confidence/probability, ROI, finance,
causality, productivity, economic, or customer-facing economic output.

## Validation

Run:

```bash
npm run test:ai-value-reviewer-owned-comparison-design-source-package-collection
```
