# AI Value Hypothesis-to-Metric Recommendation and Milestone Planning Contract

Status:
`PLANNING_ONLY_NOT_EVIDENCE`

Runner:
`scripts/run_ai_value_hypothesis_to_metric_recommendation.mjs`

Schema:
none

## Purpose

Hypothesis-to-Metric Recommendation and Milestone Planning turns a submitted
Blueprint hypothesis into candidate aggregate metric-family options for
reviewer consideration only.

It answers:

```text
Which existing aggregate metric-library entries are plausible candidates for
the submitted Blueprint value route and workflow/function scope, and what must
reviewers approve before a selected metric can exist?
```

It does not answer:

```text
Which metric is selected?
Is any metric approved?
Is any evidence created?
Is comparison-design adequacy satisfied?
Should the Bayesian chain advance?
Can posterior interpretation, confidence, probability, ROI, finance,
causality, productivity, customer-facing economic output, routes, UI, schemas,
persistence, exports, or live connectors be created?
```

## Chain Position

```text
Submitted Blueprint hypothesis
-> Hypothesis-to-Metric Recommendation and Milestone Planning
-> reviewer/customer selected metric approval
-> Reviewer-Approved Measurement Plan Contract
-> Aggregate Data Collection Planning Contract
-> Comparison Design Source Package Intake Template
-> Comparison Design Adequacy Evidence Review
-> Governed Diagnostics Sufficiency Evidence Source
```

This slice is upstream of comparison-design evidence review and reporting data
model work. It does not supply governed diagnostics evidence.

The Bayesian hardening chain remains held at:

```text
HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE
```

The gate-derived next step remains:

```text
complete_governed_diagnostics_sufficiency_evidence_source
```

## Required Inputs

The runner accepts source refs and aggregate planning context only:

```text
blueprint_hypothesis_ref
blueprint_hypothesis_statement
value_route
workflow_function_scope
cohort_scope
metric_library_refs
```

Allowed metric library refs for this slice:

```text
docs/contracts/ai-value-intelligence/examples/customer-support-metrics-library.json
docs/contracts/ai-value-intelligence/examples/customer-success-50-synthetic-metrics-library.json
docs/contracts/ai-value-intelligence/examples/sales-pipeline-metrics-library.json
```

Metric IDs may be recommended only from supplied metric library refs. Free-text
metric names, template prose, fixture defaults, runtime hashes, source hashes
alone, or generated examples cannot become metric recommendations, evidence,
selected metrics, or approval.

## Required Outputs

The runner emits:

```text
candidate_metric_recommendations
recommendation_rationale
candidate_metric_family
candidate_metric_id
source_metric_library_ref
expected_source_system_posture
required_reviewer_approval_fields
blocked_claims
recommendation_state
local_planning_next_action
allowed_next_step
```

Ready planning state:

```text
CANDIDATE_METRIC_FAMILIES_DRAFTED_NOT_SELECTED_NOT_EVIDENCE
```

Ready recommendation state:

```text
CANDIDATE_RECOMMENDATIONS_ONLY_NOT_EVIDENCE
```

Held recommendation state:

```text
HELD_NOT_RECOMMENDED
```

## Recommendation Rules

Recommendations must:

- be candidate-only;
- be aggregate-only;
- cite the source metric library ref;
- match the normalized Blueprint value route;
- match the workflow/function scope;
- carry source-system posture as reviewer-required aggregate source context;
- keep `recommendation_is_evidence=false`;
- keep `selected_metric_approved=false`;
- keep `diagnostics_evidence_satisfied=false`;
- keep `promotion_authorized=false`;
- keep all downstream feeds false.

Missing, ambiguous, or unsupported hypotheses fail closed. Unsupported metric
library refs fail closed. A metric-library entry with a matching value route
but a different workflow/function scope is not recommended.

## Selected Metric Approval Requirements

Recommendations are not selected metrics. A selected metric requires explicit
reviewer/customer approval with these fields:

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

Until those fields are reviewer-owned and approved, approval state remains:

```text
HOLD_FOR_REVIEW
```

The runner emits:

```text
local_planning_next_action=prepare_reviewer_metric_selection_draft_only
```

This local action is not metric approval, not evidence creation, and not
comparison-design adequacy.

The later reviewer-approved measurement plan contract may represent approval of
one selected metric only when it binds back to a validated recommendation plan
and the selected metric matches the source candidate recommendation. The
recommendation itself remains planning input and remains `recommendation_is_evidence=false`.

## Direction And Lag

Expected movement direction and lag must be derived from the approved Blueprint
hypothesis and approved expectation path. They are not standalone universal
fields, tunable thresholds, model inputs, timing promises, confidence inputs,
probability inputs, ROI inputs, finance inputs, causality claims, productivity
claims, or customer-facing economic claims.

The runner must not emit draft direction or lag prose as approved-looking
measurement context. It may indicate only that direction and lag require
reviewer approval from the expectation path. The selected metric remains held
until a reviewer approves the expectation path.

## Milestone Schedule

The required planning milestone schedule is:

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

This sequence is planning-only. It does not alter existing Measurement Cell,
Measurement Cell Series, customer history, evidence continuity, Bayesian
research, diagnostics, promotion, persistence, route, UI, schema, or export
contracts. T120 and T270 are planning milestones only unless a later governed
contract explicitly reconciles them to a Measurement Cell or Series milestone
day contract.

Missing, duplicate, out-of-order, stale, suppressed, held, rolling-window, or
misaligned milestone windows fail closed.

## Non-Authorization

This contract and runner must not:

- create evidence;
- create synthetic evidence;
- mark any diagnostics evidence dimension satisfied;
- approve a selected metric;
- emit reviewed/source evidence hashes;
- create source packages;
- authorize comparison-design adequacy;
- authorize Bayesian promotion;
- authorize posterior interpretation;
- emit confidence, probability, score-like, ROI, finance, economic, causality,
  productivity, customer-facing economic, route, UI, schema, persistence,
  export, live connector, raw-row, identifier, query-text, prompt, transcript,
  or person-level output.

## Blocked Claims

Blocked claims include:

```text
recommendation_is_not_evidence
selected_metric_not_approved
diagnostics_evidence_satisfaction
bayesian_promotion
posterior_interpretation
confidence_output
probability_output
roi_output
finance_output
economic_output
causality_claim
productivity_output
customer_facing_economic_output
raw_rows
identifiers
query_text
prompts
transcripts
person_level_data
live_connector_execution
route_creation
ui_creation
schema_creation
persistence_write
export_creation
```

Blocked claims may be named only as blocked claims or false emitted-output
flags.

## Allowed Next Step

For ready planning output:

```text
allowed_next_step=ai_contribution_evidence_alignment_reporting_data_model_only
```

This is the next bounded product slice. It does not override the Bayesian
Hardening Orchestrator or the governed diagnostics source gate. The local
reviewer work remains selected-metric approval and comparison-design source
package preparation.

## Validation

Run:

```bash
npm run test:ai-value-hypothesis-to-metric-recommendation
```
