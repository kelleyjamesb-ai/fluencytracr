# AI Contribution Reporting Spine Contract

Status:
`INTERNAL_CUSTOMER_SAFE_REPORTING_SPINE_ONLY`

Runner:
`scripts/run_ai_value_contribution_reporting_spine.mjs`

Schema:
none

## Purpose

AI Contribution Reporting Spine defines the governed aggregate reporting model
that lets FluencyTracr guide a customer-facing workflow from:

```text
Blueprint hypothesis
-> candidate metric recommendations
-> reviewer-approved measurement plan posture
-> reviewer-approved measurement plan contract
-> evidence alignment status
-> evidence gaps / next evidence action
-> existing AI Value Journey / Workspace / Readout integration
```

This spine is a reporting/data-contract layer only. It does not create evidence,
does not approve metrics by recommendation, does not satisfy diagnostics
evidence, does not advance Bayesian promotion, and does not create a new UI,
route, schema, persistence path, export, or live connector.

## Chain Position

```text
Blueprint Hypothesis Measurement Mapping
-> Hypothesis-to-Metric Recommendation and Milestone Planning
-> Reviewer-Approved Measurement Plan Contract
-> AI Contribution Reporting Spine
-> Existing AI Value Journey / Workspace Reporting Integration
```

The Bayesian hardening chain remains held unless real governed diagnostics
sufficiency evidence is supplied through the governed diagnostics source path:

```text
HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE
```

The gate-derived next step for the Bayesian chain remains:

```text
complete_governed_diagnostics_sufficiency_evidence_source
```

## Required Inputs

The spine accepts source refs and aggregate posture only:

```text
blueprint_hypothesis_ref
blueprint_hypothesis_statement
value_route
workflow_function_scope
cohort_scope
metric_library_refs
selected_metric_approval
milestone_window_status
said_evidence_refs
unsaid_behavioral_evidence_refs
aggregate_outcome_measurement_cell_refs
comparison_design_source_package_ref
comparison_design_posture
```

The submitted hypothesis statement may be used only to evaluate clarity. It is
not emitted by the reporting spine.

## Metric Recommendation Boundary

Metric recommendations are imported from the existing
Hypothesis-to-Metric Recommendation and Milestone Planning runner. They must:

- come from allowlisted metric library refs;
- remain candidate-only;
- remain aggregate-only;
- remain source-ref-only;
- keep `recommendation_is_evidence=false`;
- keep `selected_metric_approved=false`;
- keep `evidence_satisfied=false`;
- not create diagnostics evidence;
- not create promotion authority.

Recommended metrics are not selected metrics. A selected metric exists only when
a reviewer/customer approval object is supplied with:

```text
approved_metric_selection_ref
source_blueprint_hypothesis_ref
selected_metric_id
selected_metric_family
selected_measurement_unit
metric_owner_role_ref
expected_movement_direction
expected_lag_definition
baseline_value_source_ref
comparison_condition_ref
milestone_schedule_ref
approval_state
approval_role_ref
```

The required approval state is:

```text
APPROVED_FOR_AGGREGATE_DATA_COLLECTION_PLANNING
```

Expected direction and lag must come from the approved Blueprint hypothesis /
expectation path. Placeholder direction or lag keeps the spine held for
expectation-path approval.

The product-level approval posture should now map to the bounded
Reviewer-Approved Measurement Plan Contract:

```text
docs/contracts/ai-value-reviewer-approved-measurement-plan-contract/README.md
```

That contract can unlock `aggregate_data_collection_planning_only`. It does not
mean observed aggregate data exists, evidence assessment has passed,
comparison-design adequacy is satisfied, or Bayesian/model review is ready.

## Milestone Measurement Planning

The reporting spine supports this planning schedule:

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

These are reporting/planning milestones. They do not change current Measurement
Cell or Measurement Cell Series milestone-day authority. Unsupported milestone
days must stay explicitly held for milestone reconciliation and must not be
fabricated, coerced, or treated as diagnostics evidence.

Milestone readiness requires:

```text
schedule_ref
window_alignment_state=ALIGNED_FOR_REPORTING
suppression_missing_held_review_state=CLEAR
staleness_review_state=CURRENT
milestone_refs for T0/T30/T60/T90/T120/T180/T270/T365
unsupported_milestone_days_hold_for_reconciliation=true
milestone_reconciliation_state=RECONCILED_FOR_REPORTING_INPUT_ONLY
```

## Evidence Alignment Reporting Model

The spine separates these concepts:

```text
candidate_metric_recommendation_state
selected_metric_approval_state
measurement_readiness_state
said_evidence_state
unsaid_evidence_state
outcome_movement_state
comparison_design_posture
evidence_alignment_state
model_review_input_posture
customer_safe_interpretation_guidance
customer_safe_interpretation
model_eligibility_status
source_bound=false
validation_current=false
```

Evidence alignment may report missing or held inputs without satisfying any
diagnostics evidence dimension.

Allowed evidence alignment states:

```text
NOT_READY
HELD_FOR_SUPPRESSED_OR_MISALIGNED_WINDOWS
HELD_FOR_MISSING_SAID_EVIDENCE
HELD_FOR_MISSING_UNSAID_EVIDENCE
HELD_FOR_MISSING_OUTCOME_EVIDENCE
DIRECTIONALLY_ALIGNED_INTERNAL_ONLY
READY_FOR_MODEL_REVIEW
```

The reporting spine reuses the Evidence Alignment Result enum. Local holds for
reviewer metric approval, expectation-path approval, or comparison-design source
package work must be represented as `evidence_gap_list`,
`selected_metric_approval_state`, `comparison_design_posture`, and
`model_eligibility_status`, not as new evidence-alignment states.

`READY_FOR_MODEL_REVIEW` means aggregate reporting inputs are present for
internal model-review input preparation. It does not satisfy diagnostics
sufficiency evidence, does not complete comparison-design adequacy, and does
not authorize Bayesian promotion.

## Evidence Gap / Next Action Model

The spine reports held or missing:

```text
missing_blueprint_hypothesis_ref
missing_blueprint_hypothesis_statement
ambiguous_blueprint_hypothesis_statement
unsupported_value_route
missing_metric_library_refs
unsupported_metric_library_ref
missing_reviewer_metric_approval
missing_expected_direction_or_lag_approval
missing_baseline_value_source_ref
missing_comparison_condition_ref
missing_or_misaligned_milestone_windows
missing_said_evidence_refs
missing_unsaid_behavioral_evidence_refs
missing_outcome_measurement_cell_refs
missing_comparison_design_source_package
missing_diagnostics_sufficiency_evidence
```

The first unresolved gap drives `allowed_next_evidence_action`, for example:

```text
complete_reviewer_metric_selection_approval
approve_expected_direction_and_lag
complete_milestone_window_review
supply_said_evidence_refs
supply_unsaid_behavioral_evidence_refs
supply_outcome_measurement_cell_refs
complete_comparison_design_source_package
collect_governed_diagnostics_sufficiency_evidence
```

The reporting spine's product next step is separate:

```text
allowed_next_step=<gap-driven evidence-alignment next step>
product_next_step=existing_ai_value_journey_workspace_reporting_integration_only
```

Allowed `allowed_next_step` values are inherited from the Evidence Alignment
Result contract:

```text
complete_missing_evidence_alignment_inputs
prepare_comparison_design_source_package_only
run_comparison_design_adequacy_evidence_review_only
identify_inputs_for_governed_diagnostics_sufficiency_review_only
hold_for_reviewer_evidence_collection
```

## Existing UI/UX Integration Readiness

The spine is a downstream view-model contract for existing surfaces only:

```text
frontend/src/pages/AIValueJourney.tsx
frontend/src/pages/AIValueWorkspace.tsx
frontend/src/pages/AIValueReadoutPrototype.tsx
frontend/src/components/ClientQuestionMetricBridgePanel.tsx
frontend/src/lib/aiValueMetricSelection.ts
```

Safe render fields:

```text
blueprint_hypothesis_ref
candidate_metric_recommendations
selected_metric_approval_state
milestone_measurement_plan
evidence_alignment_state
evidence_gap_list
allowed_next_evidence_action
model_review_input_posture
blocked_claims
```

This slice does not create UI work. UI integration remains the next bounded
product step.

## Non-Authorization

The spine must not:

- create evidence;
- mark diagnostics evidence satisfied;
- approve selected metrics from recommendations;
- authorize Bayesian promotion;
- authorize posterior interpretation;
- emit confidence or probability output;
- emit ROI, finance, economic, causality, productivity, or customer-facing
  economic output;
- emit raw rows, identifiers, query text, prompts, transcripts, or person-level
  data;
- execute live BigQuery, Sigma, Glean, or other connectors;
- create routes, UI, schemas, persistence, or exports.

## Validation

Run:

```bash
npm run test:ai-value-contribution-reporting-spine
```
