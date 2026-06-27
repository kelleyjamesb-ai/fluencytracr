# AI Value Blueprint Hypothesis Measurement Mapping Contract

Status:
`DOCS_ONLY_PLANNING_CONTRACT_NOT_EVIDENCE`

Runner:
none

Schema:
none

## Purpose

Blueprint Hypothesis Measurement Mapping defines how a submitted Blueprint
hypothesis is translated into internal aggregate measurement planning context
before comparison-design evidence can be reviewed.

It answers:

```text
Which aggregate metric family, expected movement direction, milestone windows,
baseline source posture, and comparison-design prerequisites must reviewers
approve before a comparison-design source package can be prepared?
```

It does not answer:

```text
Is comparison_design_adequacy satisfied?
Is any diagnostics evidence dimension satisfied?
Should the Bayesian chain advance?
Should promotion be authorized?
Can posterior interpretation, confidence, probability, customer-facing,
economic, ROI, finance, causality, productivity, route, UI, schema,
persistence, export, or live connector behavior be created?
```

This contract is upstream of the Comparison Design Source Package Intake
Template. It is documentation only. It is not evidence, not a gate, not a
runner, not a schema, not a persistence contract, and not an input to the
Bayesian Promotion Decision Gate.

## Chain Position

```text
Submitted Blueprint hypothesis
-> Blueprint Hypothesis Measurement Mapping
-> reviewer-approved selected metric / expectation path / milestone plan
-> Comparison Design Source Package Intake Template
-> Comparison Design Adequacy Evidence Review
-> Governed Diagnostics Sufficiency Evidence Source
```

The current Bayesian hardening chain remains held at:

```text
HOLD_FOR_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE
```

The gate-derived next step remains:

```text
complete_governed_diagnostics_sufficiency_evidence_source
```

This mapping contract does not complete that step. It only defines the planning
inputs that must exist before later governed comparison-design evidence can be
reviewed.

## Non-Authorization

This contract must not:

- create evidence;
- create synthetic evidence;
- run or implement Bayesian diagnostics;
- mark any diagnostics evidence dimension satisfied;
- emit reviewed source evidence hashes;
- emit source evidence hashes;
- set `promotion_authorized`;
- authorize posterior interpretation;
- emit posterior, confidence, probability, score-like, customer-facing,
  economic, ROI, finance, causality, or productivity output;
- run live BigQuery, Sigma, Glean, or other connectors;
- create routes, UI, schemas, exports, persistence, or storage writes;
- include raw rows, identifiers, query text, prompts, transcripts, or
  person-level data;
- create new canonical events, suppression reasons, tunable thresholds, or
  admin overrides.

## Submitted Blueprint Hypothesis Context

A submitted Blueprint hypothesis defines the measurement context. It must be
kept as a planning object until a reviewer approves a specific metric,
expectation path, comparison condition, and milestone schedule.

This section does not create a new runtime Blueprint object. It describes the
minimum approved context needed from existing Blueprint review lanes before
comparison-design intake can start.

Required planning fields:

```text
blueprint_hypothesis_ref=<reviewer-owned Blueprint hypothesis ref>
blueprint_hypothesis_statement=<aggregate business question, not a claim>
blueprint_value_route=<cost_context | delivery_flow | sales_cycle | quality | risk | experience | unclassified>
business_sponsor_role_ref=<role ref only, no person name>
workflow_or_function_scope=<aggregate workflow/function scope>
cohort_scope=<aggregate cohort scope>
submitted_at=<reviewer-controlled date>
review_state=<PENDING_REVIEW | APPROVED_FOR_MEASUREMENT_PLANNING | HELD_FOR_CLARIFICATION>
```

The hypothesis statement must not include proof, attribution, individual
scoring, person-level labels, customer-facing economic output, or unsupported
outcome claims. A held or unclear hypothesis cannot feed comparison-design
intake.

## Candidate Metric Recommendation Object

FluencyTracr may recommend candidate aggregate metric families for a Blueprint
hypothesis. Recommendations are planning inputs only. They are not evidence,
proof, model output, or permission to make a value claim.

Required recommendation fields:

```text
recommendation_ref=<internal planning ref>
source_blueprint_hypothesis_ref=<Blueprint hypothesis ref>
candidate_metric_family=<aggregate metric family>
candidate_metric_examples=<aggregate examples only>
recommended_measurement_unit=<aggregate unit label>
source_system_posture=<customer-owned aggregate export | reviewed aggregate fixture | not_selected>
expected_review_dependency=<what the reviewer must approve before selection>
blocked_claims=<blocked use list>
recommendation_state=<CANDIDATE_ONLY_NOT_SELECTED>
```

Candidate metric families may include:

```text
process_efficiency_context
workflow_cycle_context
delivery_flow_context
stage_progression_context
quality_exception_context
risk_review_context
customer_experience_context
```

Candidate recommendations must not become selected metrics automatically.
The listed families are non-authoritative examples, not a universal metric
taxonomy, not defaults, and not sufficient for metric selection.

## Reviewer-Approved Metric Selection Object

The customer or internal reviewer must approve one selected aggregate metric
for the Blueprint expectation path before comparison-design adequacy can be
reviewed.

Required selection fields:

```text
approved_metric_selection_ref=<reviewer-owned selected metric ref>
source_blueprint_hypothesis_ref=<Blueprint hypothesis ref>
selected_metric_id=<approved aggregate metric id>
selected_metric_family=<approved aggregate metric family>
selected_measurement_unit=<aggregate unit label>
metric_owner_role_ref=<role ref only, no person name>
baseline_value_source_ref=<reviewed aggregate source ref or HOLD>
comparison_condition_ref=<reviewer-approved comparison condition ref or HOLD>
approval_state=<APPROVED_FOR_COMPARISON_DESIGN_INTAKE | HOLD_FOR_REVIEW>
approval_role_ref=<reviewer role ref only, no person name>
```

Approval must be explicit. Template prose, fixture defaults, source hashes
alone, runtime design matrix fields, posterior-like prototype values, generated
examples, or aggregate windows without reviewed metric selection are not valid
approval.

## Expected Movement Direction And Lag

Metric direction and lag are not universal standalone fields. They are derived
from the approved Blueprint hypothesis and the approved expectation path.

Required expectation-path fields:

```text
approved_expectation_path_ref=<reviewer-owned expectation path ref>
source_blueprint_hypothesis_ref=<Blueprint hypothesis ref>
selected_metric_id=<approved aggregate metric id>
expected_movement_direction=<increase | decrease | maintain | directional_review_required>
expected_lag_definition=<reviewer-approved aggregate lag context or none>
direction_derivation_notes=<why the direction follows from the approved hypothesis>
lag_derivation_notes=<why the lag context is appropriate for this workflow>
approval_state=<APPROVED_FOR_COMPARISON_DESIGN_INTAKE | HOLD_FOR_REVIEW>
```

The direction and lag fields are descriptive review context. They must not be
used as tunable thresholds, model parameters, timing promises, confidence
inputs, probability inputs, economic dependencies, or customer-facing claims.
They also must not be copied as free-standing scalar fields. Direction and lag
must remain bound to an approved expectation path, selected metric, reviewer
role, approval state, source lineage, and comparison window. Any mismatch,
missing lineage, or stale approval keeps comparison-design intake in draft.

## Milestone Window Schedule

The reviewer must approve a milestone schedule before comparison-design intake.
The schedule must bind each window to the same Blueprint hypothesis, selected
metric, approved expectation path, cohort, workflow/function identity, and
aggregate Measurement Cell grain.

Required milestone windows:

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

This T0/T30/T60/T90/T120/T180/T270/T365 planning schedule is scoped to this
docs-only comparison-design preparation contract. It does not alter any
existing Measurement Cell, Measurement Cell Series, persistence, or
research-promotion milestone contract that uses a different governed sequence.
In particular, T120 and T270 are planning milestones only unless a later
governed contract explicitly reconciles them to a Measurement Cell or Series
milestone-day contract.
It cannot feed Measurement Cell Series, evidence continuity, Bayesian research
planning, diagnostics evidence, promotion gates, or Artifact v1 unless a later
governed slice reconciles the schedule to the applicable contract.

Required schedule fields:

```text
milestone_schedule_ref=<reviewer-owned schedule ref>
source_blueprint_hypothesis_ref=<Blueprint hypothesis ref>
selected_metric_id=<approved aggregate metric id>
approved_expectation_path_ref=<approved expectation path ref>
baseline_window=<aggregate baseline window ref>
milestone_windows=<T0/T30/T60/T90/T120/T180/T270/T365 aggregate window refs>
window_alignment_state=<ALIGNED_FOR_INTAKE | HOLD_FOR_WINDOW_REVIEW>
suppression_missing_held_review_state=<CLEAR | HOLD_FOR_SUPPRESSED_MISSING_HELD_WINDOW_REVIEW>
staleness_review_state=<CURRENT | HOLD_FOR_STALE_WINDOW_REVIEW>
```

Missing, suppressed, stale, held, out-of-order, or misaligned windows fail
closed. Rolling operating windows are not milestone windows unless a later
governed decision explicitly allows that scope.

## Baseline And Source Value Requirements

Baseline context must be aggregate-only and reviewer-approved before
comparison-design intake.

Required baseline fields:

```text
baseline_value_source_ref=<reviewer-owned aggregate source ref or HOLD>
baseline_source_type=<customer-owned aggregate export | reviewed aggregate fixture | not_selected>
baseline_window_ref=<T0 baseline window ref>
baseline_metric_id=<selected metric id>
baseline_aggregate_scope=<aggregate-only scope>
baseline_review_state=<APPROVED_FOR_COMPARISON_DESIGN_INTAKE | HOLD_FOR_BASELINE_REVIEW>
```

Forbidden baseline inputs:

- raw rows;
- identifiers;
- query text;
- prompts;
- transcripts;
- person-level data;
- live connector output;
- source hashes without reviewed aggregate source context;
- fixture defaults or template examples.

## Aggregate Measurement Cell Binding

Each approved mapping must bind to exactly one aggregate Measurement Cell grain
per milestone window:

```text
workflow_or_function_identity
+ cohort_scope
+ selected_metric_id
+ approved_expectation_path_ref
+ milestone_window_ref
```

The mapping must not combine unsupported slices, carry a full expectation-path
registry into a single Measurement Cell, or treat multiple selected metrics as
one cell. Each cell remains internal-only, aggregate-only, and fail-closed.
The handoff rule is one approved path, one selected metric, one milestone
window, and one aggregate grain.

## Comparison-Design Prerequisites

Comparison-design adequacy can be reviewed only after these inputs are defined
and approved:

```text
approved_blueprint_hypothesis_ref
approved_metric_selection_ref
selected_metric_id
expected_movement_direction
approved_expectation_path_ref
cohort_scope
workflow_or_function_identity
milestone_schedule_ref
baseline_value_source_ref
comparison_condition_ref
aggregate_measurement_cell_grain
suppression_missing_held_window_review
```

If any prerequisite is missing, stale, suppressed, held, misaligned, or
unapproved, the Comparison Design Source Package Intake Template must remain a
draft and the Comparison Design Adequacy Evidence Review must hold.

## Handoff Into Comparison Design Source Package Intake Template

After reviewers approve the mapping, the following fields may be copied into a
separate reviewer-owned comparison-design source package draft:

```text
metric_direction_and_lag.metric_id
metric_direction_and_lag.direction
metric_direction_and_lag.lag
approved_expectation_path.expectation_path_id
cohort_identity.cohort_id
workflow_function_identity.workflow_id
workflow_function_identity.function_id
aggregate_measurement_cell_grain.grain_definition
baseline_window
comparison_window
suppression_missing_held_window_review
```

The handoff remains a reviewer-preparation step. The intake template and any
template-derived draft are still not evidence until a later Comparison Design
Adequacy Evidence Review evaluates a real governed source package.

Copied mapping fields cannot satisfy
`metric_direction_lag_expectation_path_cohort_workflow_function_identity_matched`.
That boolean may be asserted only by a later reviewed source package that
independently proves the alignment with source-bound reviewer lineage for the
selected metric, expectation path, cohort, workflow/function identity, baseline,
comparison condition, and window alignment. Mapping approval alone is not
eligible evidence for that assertion.

## Inadmissible As Evidence

This mapping contract, its examples, and any draft derived from it must be
rejected if supplied as:

```text
reviewed_diagnostics_source_evidence
source_diagnostics_sufficiency_evidence
source_diagnostics_evidence_packet
packet-side sufficiency evidence
internal diagnostics review evidence
Bayesian promotion gate input
Promotion Gate Passed Artifact Handoff input
Internal Bayesian Execution Artifact v1 input
orchestrator explicit-path artifact
source hash substitute
reviewed hash substitute
satisfaction boolean substitute
allowed-next-step substitute
```

It also must be rejected if any metric family, direction, lag, milestone
schedule, baseline source posture, comparison condition, or example is used as a
default value, standalone proof, downstream feed, or evidence shortcut.

## Safe Non-Executing Examples

| Submitted hypothesis route | Candidate aggregate metric families | Required reviewer decision | Blocked interpretation |
| --- | --- | --- | --- |
| Cost-context hypothesis | process-efficiency context, workflow-cycle context, exception-rate context | Select one aggregate metric, approve direction, baseline source, milestone schedule, and comparison condition | No ROI calculation, finance output, or value proof |
| Engineering throughput hypothesis | delivery-flow context, workflow-cycle context, aggregate review-flow context | Select one aggregate delivery-flow metric and confirm it is not individual productivity measurement | No individual productivity, ranking, or person-level output |
| Sales velocity hypothesis | stage-progression context, aggregate cycle-time context, aggregate handoff context | Select one aggregate sales-cycle metric and define comparison condition | No revenue attribution, causality claim, or customer-facing economic output |
| Quality hypothesis | quality-exception context, rework-context, aggregate review outcome context | Select one aggregate quality metric and define suppression/missing/held window review | No score-like output or customer-facing proof |
| Risk hypothesis | risk-review context, policy-exception context, aggregate control-review context | Select one aggregate risk-context metric and define review owner role | No prediction or individual risk labeling |
| Customer experience hypothesis | aggregate experience-signal context, stage-resolution context, aggregate service-flow context | Select one aggregate experience metric and define baseline source posture | No customer-facing economic output or claim upgrade |

These examples are planning examples only. They do not generate metric
recommendations, approve selected metrics, satisfy comparison design, or feed
the Bayesian hardening chain.

## Failure Modes

The mapping must remain held if:

- the Blueprint hypothesis is missing or unclear;
- no reviewer-approved selected metric exists;
- the expected movement direction is not derived from the approved expectation
  path;
- milestone windows are missing, suppressed, stale, held, or misaligned;
- baseline value source posture is missing or unreviewed;
- comparison condition is missing or unreviewed;
- cohort or workflow/function identity is missing or inconsistent;
- unsupported cross-slice aggregation is present;
- raw rows, identifiers, query text, prompts, transcripts, live connector
  output, or person-level data are included;
- template prose, fixture defaults, runtime hashes, generated examples, or
  source hashes alone are used as evidence;
- any field implies evidence satisfaction, promotion authorization, posterior
  interpretation, confidence output, probability output, customer-facing
  output, economic output, ROI, finance output, causality, or productivity.

## Required Next Step

This contract does not change the Bayesian hardening gate state. Real governed
diagnostics evidence still needs to be collected and reviewed outside this
contract.

Exact next step:

```text
complete_governed_diagnostics_sufficiency_evidence_source
```
