# AI Value Comparison Design Source Package Preparation Binding

Status:
`COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_BINDING_NOT_EVIDENCE`

Runner:
`scripts/run_ai_value_comparison_design_source_package_preparation_binding.mjs`

Schema:
none

## Purpose

The Comparison Design Source Package Preparation Binding is the bounded
planning/preparation layer after the Aggregate Data Collection Planning
Contract.

It answers:

```text
Given a validated reviewer-approved measurement plan and a validated aggregate
data collection planning contract, can FluencyTracr prepare the internal
reviewer collection checklist and source-bound planning posture needed before a
future reviewer-owned comparison-design source package is collected?
```

It does not answer:

```text
Has a reviewer-owned source package been collected?
Has reviewed evidence been created?
Is comparison_design_adequacy satisfied?
Is diagnostics sufficiency satisfied?
Is Bayesian/model review ready?
Can posterior interpretation, confidence, probability, ROI, finance,
causality, productivity, economic, customer-facing economic output, live
connectors, routes, schemas, persistence, or exports be created?
```

## Chain Position

```text
Client Blueprint hypothesis
-> LLM candidate metric recommendations from approved metric libraries
-> reviewer metric-selection draft
-> reviewer/customer-approved measurement plan
-> aggregate data collection planning/readiness
-> comparison-design source package preparation binding
-> later reviewer-owned comparison-design source package collection
-> later comparison-design adequacy evidence review
-> later EvidenceAssessment after real aggregate data exists
-> later Bayesian/model review after governed evidence exists
```

This contract is the preparation stop. It is not reviewer collection,
reviewer attestation, evidence creation, evidence assessment,
comparison-design adequacy, diagnostics sufficiency, or Bayesian readiness.

## Required Sources

The preparation binding must bind to validated upstream sources:

```text
sourceReviewerApprovedMeasurementPlan
sourceRecommendationPlan
sourceAggregateDataCollectionPlanningContract
```

The Reviewer-Approved Measurement Plan Contract must be ready at:

```text
REVIEWER_APPROVED_MEASUREMENT_PLAN_READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING
```

The Aggregate Data Collection Planning Contract must be ready at:

```text
AGGREGATE_DATA_COLLECTION_PLANNING_READY_FOR_COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION
```

and must have:

```text
allowed_next_step=prepare_comparison_design_source_package_only
```

Self-consistent preparation hashes alone are not enough. Ready validation
requires the original source contracts so the source hashes, contract hashes,
refs, metric selection, direction, lag, baseline posture, comparison condition,
cohort, workflow/function identity, Measurement Cell grain, and collection
precheck can be recomputed.

## Preparation Artifact Fields

The preparation artifact emits:

```text
preparation_state
artifact_class
source_reviewer_approved_measurement_plan_ref
source_reviewer_approved_measurement_plan_hash
source_aggregate_data_collection_planning_ref
source_aggregate_data_collection_planning_hash
source_blueprint_hypothesis_ref
selected_metric_id
selected_metric_family
selected_measurement_unit
expected_movement_direction
expected_lag_definition
milestone_schedule
baseline_source_posture
comparison_condition
cohort_identity
workflow_function_identity
aggregate_measurement_cell_grain
suppression_missing_held_precheck_posture
forbidden_input_boundaries
blocked_claims
reviewer_collection_checklist
reviewer_role_placeholder
review_decision_placeholder
evidence_satisfied
comparison_design_adequacy_satisfied
promotion_authorized
allowed_next_step
preparation_hash
```

The artifact is source-ref-only. It must not include raw rows, identifiers,
query text, prompts, transcripts, person-level data, source-system credentials,
warehouse handles, dashboard URLs, or person/team scoring fields.

## Reviewer Collection Checklist

The preparation artifact requires the reviewer collection checklist to include:

```text
treatment group definition
comparison group definition
rollout/comparison design type
baseline window
comparison window
metric, direction, and lag confirmation
approved expectation path / Blueprint hypothesis binding
cohort identity confirmation
workflow/function identity confirmation
aggregate Measurement Cell grain confirmation
milestone schedule confirmation: T0, T30, T60, T90, T120, T180, T270, T365
suppression/missing/held window review
cross-slice aggregation prohibition check
person-level/identifier exclusion check
raw rows/query text/prompts/transcripts exclusion check
causality-claim exclusion check
ROI/finance/productivity/economic-output exclusion check
reviewer role
reviewer decision placeholder
```

Checklist presence is preparation only. It is not reviewer attestation, reviewed
evidence, comparison-design adequacy, diagnostics sufficiency, or Bayesian
promotion authority.

## Ready State

Ready state:

```text
COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_READY_FOR_REVIEWER_COLLECTION
```

Allowed next step:

```text
collect_reviewer_owned_comparison_design_source_package_only
```

This means the next bounded slice may request reviewer-owned collection of a
future comparison-design source package against the approved measurement plan
and aggregate collection plan. It does not collect that package, record
reviewer attestation, create reviewed evidence, satisfy
`comparison_design_adequacy`, or feed the Governed Diagnostics Sufficiency
Evidence Source.

## Held States

This contract may hold at:

```text
HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN
HELD_FOR_AGGREGATE_DATA_COLLECTION_PLANNING_CONTRACT
```

Held contracts must keep:

```text
preparation_ready=false
allowed_next_step matching the held state
```

## Non-Authorization

This contract must not:

- create a reviewed comparison-design source package;
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
Reviewer-Owned Comparison Design Source Package Collection
```

That slice should collect or bind a reviewer-owned comparison-design source
package against this preparation binding. It must still not create synthetic
evidence, satisfy `comparison_design_adequacy`, run diagnostics, authorize
Bayesian promotion, create live connectors, routes, schemas, persistence,
exports, or emit confidence/probability, ROI, finance, causality,
productivity, economic, or customer-facing economic output.

## Validation

Run:

```bash
npm run test:ai-value-comparison-design-source-package-preparation-binding
```
