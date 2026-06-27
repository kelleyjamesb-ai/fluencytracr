# AI Value Reviewer-Approved Measurement Plan Contract

Status:
`REVIEWER_APPROVED_MEASUREMENT_PLAN_CONTRACT_NOT_EVIDENCE`

Runner:
`scripts/run_ai_value_reviewer_approved_measurement_plan_contract.mjs`

Schema:
none

## Purpose

The Reviewer-Approved Measurement Plan Contract reconciles the product path
from a client Blueprint hypothesis to an approved aggregate measurement plan
that future aggregate data can later be evaluated against.

Core principle:

```text
FluencyTracr should not ask "what does the data prove?" until it has first
locked "what did we agree to measure?"
```

It answers:

```text
Has a reviewer/customer approved the selected aggregate metric, expected
direction, lag, baseline posture, comparison condition, milestone schedule,
cohort, workflow/function identity, and aggregate Measurement Cell grain needed
to begin aggregate data-collection planning?
```

It does not answer:

```text
Does observed aggregate data exist?
Is any evidence dimension satisfied?
Is comparison_design_adequacy satisfied?
Is the Bayesian chain ready?
Can posterior interpretation, confidence, probability, ROI, finance,
causality, productivity, customer-facing economic output, live connectors,
routes, schemas, persistence, or exports be created?
```

## Roadmap Reconciliation

Recommended roadmap direction:

```text
Blueprint-to-Approved Measurement Plan Spine first, aggregate data collection
planning second, evidence assessment third, Bayesian/model review later.
```

The product and governance sequence is:

```text
Client Blueprint hypothesis
-> LLM candidate metric recommendations from approved metric libraries
-> reviewer metric-selection draft
-> reviewer/customer-approved measurement plan
-> aggregate data collection planning/readiness
-> later EvidenceAssessment after real aggregate data exists
-> later Bayesian/model review after governed evidence exists
```

This contract is the first point where selected metric approval may be true. It
does not make the recommendation evidence, does not create observed data, and
does not make MeasurementSpec / MetricSpec a Bayesian artifact.

The current bounded implementation slice is the Reviewer-Approved Measurement
Plan Contract. It encodes the approval boundary after the draft intake and
before any aggregate data collection planning/readiness slice.

## Product Language Mapping

| Current/internal concept | Product language | Boundary |
| --- | --- | --- |
| Blueprint Hypothesis | Client measurement hypothesis | Defines the measurement context only. |
| Candidate Metric Recommendation | Recommended aggregate metrics | LLM planning input only; not selected, approved, or evidence. |
| Reviewer Metric Selection Draft | Draft selected metric and measurement plan | Local/review preparation only; not approval. |
| Reviewer-Approved Measurement Plan | Approved measurement plan | Allows aggregate data-collection planning only. |
| MeasurementSpec / MetricSpec | Internal measurement contract draft | Operational definition and source posture; not Bayesian readiness. |
| EvidenceAssessment | Later evidence review | Requires real aggregate data; not created here. |
| ClaimDecision | Later allowed-language decision | Remains blocked here. |
| Measurement Cell | Aggregate alignment grain | Future aggregate data binding; no raw or person-level data. |
| Comparison Design Source Package | Internal comparison-design review package | Can be prepared after approval, but does not satisfy adequacy here. |

## Required Held States

The end-to-end spine must be able to hold at:

```text
HELD_FOR_BLUEPRINT_HYPOTHESIS
HELD_FOR_CANDIDATE_METRIC_RECOMMENDATION
HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN
HELD_FOR_AGGREGATE_DATA_COLLECTION
HELD_FOR_EVIDENCE_ASSESSMENT
HELD_FOR_MODEL_REVIEW
```

This contract emits:

```text
HELD_FOR_BLUEPRINT_HYPOTHESIS
HELD_FOR_CANDIDATE_METRIC_RECOMMENDATION
HELD_FOR_REVIEWER_APPROVED_MEASUREMENT_PLAN
REVIEWER_APPROVED_MEASUREMENT_PLAN_READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING
```

Later contracts must own the aggregate data collection, EvidenceAssessment, and
model-review holds.

## Required Approval Fields

A reviewer/customer-approved measurement plan requires:

```text
reviewer_approved_measurement_plan_ref
source_blueprint_hypothesis_ref
source_candidate_metric_recommendation_ref
selected_metric_id
selected_metric_family
selected_measurement_unit
metric_owner_role_ref
expected_movement_direction
expected_lag_definition
baseline_value_source_ref
comparison_condition_ref
milestone_schedule_ref
milestone_window_refs
cohort_identity
workflow_function_identity
aggregate_measurement_cell_grain
suppression_missing_held_precheck_posture
approval_state
approval_role_ref
reviewer_decision_ref
```

Required approval state:

```text
APPROVED_FOR_AGGREGATE_DATA_COLLECTION_PLANNING
```

Draft, local, pending, generated, fixture, template, runtime-only, or
source-hash-only approval posture must hold closed.

## Required Milestone Schedule

The approved planning schedule is:

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

Each milestone requires an aggregate window ref. Missing, unsafe, stale,
suppressed, held, or misaligned windows keep data-collection planning held.
This schedule remains planning-only. It does not alter existing Measurement
Cell Series, persistence, diagnostics, or Bayesian contracts.

## Ready To Connect Data

`ready for future aggregate data to be evaluated against an approved plan`
means:

```text
The selected aggregate metric and measurement plan have been approved, and a
future aggregate data-collection plan can be prepared against that approved
plan.
```

It does not mean:

```text
Real data already exists.
Evidence has been assessed.
Diagnostics evidence is satisfied.
Comparison-design adequacy is satisfied.
Bayesian/model review is ready.
Any customer-facing economic claim is allowed.
```

Ready state:

```text
REVIEWER_APPROVED_MEASUREMENT_PLAN_READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING
```

Allowed next step:

```text
aggregate_data_collection_planning_only
```

Data-collection readiness state:

```text
READY_FOR_AGGREGATE_DATA_COLLECTION_PLANNING_ONLY
```

The next contract defines how future aggregate data collection is planned,
reviewed, and held without creating data, evidence, connector execution,
persistence, export behavior, or a customer-facing readout:

```text
docs/contracts/ai-value-aggregate-data-collection-planning-contract/README.md
```

## Source Binding

The contract must bind to a validated Hypothesis-to-Metric Recommendation plan.
The selected metric must match the source candidate recommendation:

```text
selected_metric_id -> candidate_metric_id
selected_metric_family -> candidate_metric_family
selected_measurement_unit -> measurement_unit
metric_owner_role_ref -> metric_owner_role_ref
```

Forged recommendation refs, mismatched selected metrics, invalid recommendation
plans, or missing source recommendation hashes hold closed.

## Comparison-Design Fit

The existing comparison-design source package work fits after this contract:

```text
Reviewer-Approved Measurement Plan
-> aggregate data-collection planning
-> comparison-design source package preparation
-> comparison-design adequacy evidence review
```

This contract may make comparison-design intake understandable, but it does not
create a source package, create reviewed source evidence, emit evidence hashes,
mark `comparison_design_adequacy_satisfied=true`, or feed the Governed
Diagnostics Sufficiency Evidence Source.

Comparison-design source package work fits after the approved measurement plan
because it needs the approved selected metric, direction, lag, milestone
schedule, baseline posture, comparison condition, cohort, workflow/function
identity, and aggregate Measurement Cell grain. It is not a substitute for
approval, observed data, evidence assessment, or model review.

## Non-Authorization

This contract must not:

- create runtime evidence;
- mark diagnostics evidence satisfied;
- authorize Bayesian promotion;
- authorize posterior interpretation;
- emit confidence or probability output;
- emit ROI, finance, causality, productivity, economic, or customer-facing
  economic output;
- execute live BigQuery, Sigma, Glean, or other connectors;
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

## Downstream Planning Contract

The downstream planning contract is:

```text
Aggregate Data Collection Planning Contract
```

That contract defines the internal-only, aggregate-only planning contract for
future aggregate data collection against a reviewer-approved measurement plan.
It must not connect live systems, create evidence, assess evidence, satisfy
diagnostics, authorize Bayesian promotion, create routes, schemas, persistence,
exports, customer-facing output, or emit confidence/probability, ROI, finance,
causality, productivity, or economic claims.

## Validation

Run:

```bash
npm run test:ai-value-reviewer-approved-measurement-plan-contract
```
