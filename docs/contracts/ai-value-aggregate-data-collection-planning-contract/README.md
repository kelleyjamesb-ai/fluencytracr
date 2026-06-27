# AI Value Aggregate Data Collection Planning Contract

Status:
`AGGREGATE_DATA_COLLECTION_PLANNING_CONTRACT_NOT_DATA_NOT_EVIDENCE`

Runner:
`scripts/run_ai_value_aggregate_data_collection_planning_contract.mjs`

Schema:
none

## Purpose

The Aggregate Data Collection Planning Contract is the bounded planning layer
after the Reviewer-Approved Measurement Plan Contract.

It answers:

```text
Given a validated reviewer-approved measurement plan, has a reviewer prepared
an internal aggregate-only future data collection plan against that approved
metric, milestone schedule, comparison condition, cohort, workflow/function
identity, and aggregate Measurement Cell grain?
```

It does not answer:

```text
Does aggregate data exist?
Has any evidence been assessed?
Is comparison_design_adequacy satisfied?
Is diagnostics evidence satisfied?
Is Bayesian/model review ready?
Can live connectors, routes, schemas, persistence, exports, posterior
interpretation, confidence, probability, ROI, finance, causality, productivity,
economic, or customer-facing economic output be created?
```

## Chain Position

```text
Client Blueprint hypothesis
-> LLM candidate metric recommendations from approved metric libraries
-> reviewer metric-selection draft
-> reviewer/customer-approved measurement plan
-> aggregate data collection planning/readiness
-> comparison-design source package preparation
-> later EvidenceAssessment after real aggregate data exists
-> later Bayesian/model review after governed evidence exists
```

This contract is the planning/readiness stop. It is not data connection, data
observation, evidence assessment, comparison-design adequacy, diagnostics
sufficiency, or Bayesian readiness.

## Required Source

The contract must bind to a validated Reviewer-Approved Measurement Plan
Contract:

```text
docs/contracts/ai-value-reviewer-approved-measurement-plan-contract/README.md
```

Ready validation requires both:

```text
sourceReviewerApprovedMeasurementPlan
sourceRecommendationPlan
```

The source reviewer-approved measurement plan must validate against its source
Hypothesis-to-Metric Recommendation plan. Self-consistent hashes alone are not
enough.

## Required Collection Plan Fields

An aggregate data collection plan requires:

```text
aggregate_data_collection_plan_ref
source_reviewer_approved_measurement_plan_ref
collection_owner_role_ref
aggregate_source_posture_ref
source_system_posture_ref
aggregate_export_manifest_plan_ref
measurement_cell_binding_plan_ref
planned_collection_window_refs
suppression_missing_held_collection_precheck_posture
privacy_boundary_attestation_ref
raw_data_exclusion_attestation_ref
live_connector_exclusion_attestation_ref
reviewer_decision_ref
planning_state
```

Required planning state:

```text
APPROVED_FOR_AGGREGATE_COLLECTION_PLANNING
```

The source measurement-plan ref must match the validated source
Reviewer-Approved Measurement Plan Contract.

Ready validation must also bind the emitted source measurement-plan projection
back to the validated Reviewer-Approved Measurement Plan Contract for:

```text
selected_metric_id
selected_metric_family
expected_movement_direction
expected_lag_definition
baseline_value_source_ref
comparison_condition_ref
cohort_identity
workflow_function_identity
aggregate_measurement_cell_grain
```

## Required Milestone Schedule

The planned collection schedule must include:

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

Missing, unsafe, stale, suppressed, held, or misaligned planned collection
windows keep the contract held.

## Ready State

Ready state:

```text
AGGREGATE_DATA_COLLECTION_PLANNING_READY_FOR_COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION
```

Allowed next step:

```text
prepare_comparison_design_source_package_only
```

This means a reviewer may prepare the comparison-design source package against
the approved measurement plan and aggregate collection plan. It does not create
the source package, create evidence, assess evidence, satisfy
comparison_design_adequacy, or feed the Governed Diagnostics Sufficiency
Evidence Source.

## Held States

This contract may hold at:

```text
HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN
HELD_FOR_AGGREGATE_DATA_COLLECTION_PLANNING
HELD_FOR_AGGREGATE_MILESTONE_COLLECTION_PLAN
```

Held contracts must keep:

```text
aggregate_data_collection_planning_ready=false
allowed_next_step matching the held state
```

## Non-Authorization

This contract must not:

- connect live systems;
- execute BigQuery, Sigma, Glean, or other connectors;
- create or observe aggregate data;
- create runtime evidence;
- assess evidence;
- mark diagnostics evidence satisfied;
- mark comparison_design_adequacy satisfied;
- authorize Bayesian promotion;
- authorize posterior interpretation;
- emit confidence or probability output;
- emit ROI, finance, causality, productivity, economic, or customer-facing
  economic output;
- create routes, UI, schemas, persistence, or exports;
- include raw rows, identifiers, query text, prompts, transcripts, person-level
  data, individual scoring, or team scoring;
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
Comparison Design Source Package Preparation Binding
```

That slice should bind the existing comparison-design intake/source-package
preparation path to the validated Reviewer-Approved Measurement Plan Contract
and this Aggregate Data Collection Planning Contract. It must still not create
evidence, satisfy comparison_design_adequacy, run diagnostics, authorize
Bayesian promotion, create live connectors, routes, schemas, persistence,
exports, or emit confidence/probability, ROI, finance, causality, productivity,
economic, or customer-facing economic output.

## Validation

Run:

```bash
npm run test:ai-value-aggregate-data-collection-planning-contract
```
