# AI Value Contribution Evidence Alignment Result Contract

Status:
`DOCS_ONLY_INTERNAL_REVIEW_BOUNDARY_NOT_EVIDENCE`

Runner:
none

Schema:
none

## Purpose

AI Value Contribution Evidence Alignment Result defines the internal,
aggregate-only review-boundary shape that summarizes which aggregate refs are
present, missing, held, suppressed, or directionally consistent before Bayesian
or other statistical modeling is ready.

It connects:

```text
said evidence from approved AI Fluency and Blueprint hypothesis inputs
+ unsaid aggregate behavioral/workflow evidence
+ aggregate outcome movement from selected metrics
+ measurement readiness and comparison-design posture
+ model-review input posture
```

It answers:

```text
Which aggregate refs and review postures can reviewers triage without creating
evidence, model output, claim publication, or gate movement?
```

It does not answer:

```text
Did AI cause the outcome movement?
How confident are we?
What is the probability?
What is the ROI or financial impact?
Should Bayesian promotion advance?
Can customer-facing economic output be emitted?
```

This contract creates no runtime artifact, runner, schema, persistence path,
route, UI, export, live connector, model, posterior interpretation, diagnostics
evidence, model result, customer-facing output, customer-publishable claim, or
promotion authority.

## Chain Position

This contract sits after planning and aggregate evidence alignment, and before
any governed diagnostics evidence source or model review can be completed:

```text
Blueprint Hypothesis Measurement Mapping
-> reviewer-approved selected metric / expectation path / milestone schedule
-> aggregate said evidence refs
-> aggregate unsaid behavioral evidence refs
-> aggregate outcome Measurement Cell refs
-> AI Value Contribution Evidence Alignment Result
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

This result does not complete that step. It may help reviewers understand which
source packages or aggregate evidence refs are missing before the separate
Governed Diagnostics Sufficiency Evidence Source can complete that step.

## Non-Authorization

This contract must not:

- create evidence;
- create synthetic evidence;
- mark any diagnostics evidence dimension satisfied;
- emit reviewed source evidence hashes for diagnostics sufficiency;
- emit source evidence hashes for diagnostics sufficiency;
- emit reviewed diagnostics source evidence manifest entries;
- emit `evidence_satisfied=true`;
- emit `eligible_for_satisfied_representation=true`;
- emit `all_required_evidence_satisfied=true`;
- emit packet projections;
- create a governed diagnostics evidence manifest;
- authorize promotion;
- authorize posterior interpretation;
- emit posterior, confidence, probability, score-like, customer-facing
  economic, ROI, finance, causality, or productivity output;
- run or implement Bayesian diagnostics;
- run live BigQuery, Sigma, Glean, or other connectors;
- create routes, UI, schemas, exports, persistence, or storage writes;
- include raw rows, identifiers, query text, prompts, transcripts, or
  person-level data;
- create new canonical events, suppression reasons, tunable thresholds, or
  admin overrides.

Any implementation or example that sets `promotion_authorized=true`, sets a
diagnostics evidence satisfaction field, generates diagnostics source hashes,
stores raw data, creates a customer-facing economic result, or treats this
result as a reviewed evidence source must be rejected as boundary leakage.

## Required Inputs

An Evidence Alignment Result must use refs and aggregate posture only. It must
not inline raw source content, row-level data, query text, prompts, transcripts,
or identifiers.

Required input fields:

```text
result_input_ref=<internal aggregate alignment input ref>
blueprint_hypothesis_ref=<reviewer-owned Blueprint hypothesis ref>
selected_metric_ref=<reviewer-approved selected aggregate metric ref>
selected_metric_id=<approved aggregate metric id>
expected_movement_direction=<increase | decrease | maintain | directional_review_required>
approved_expectation_path_ref=<reviewer-approved expectation path ref>
milestone_windows=<T0/T30/T60/T90/T120 aggregate window refs>
said_evidence_refs=<AI Fluency aggregate and Blueprint hypothesis refs>
unsaid_behavioral_evidence_refs=<aggregate behavioral/workflow evidence refs>
aggregate_outcome_measurement_cell_refs=<aggregate Measurement Cell refs>
suppression_missing_held_status=<CLEAR | HELD | SUPPRESSED | MISSING | MISALIGNED>
comparison_condition_status=<READY_FOR_REVIEW | HOLD_FOR_REVIEW | MISSING | MISALIGNED>
source_package_refs=<reviewer-owned source package refs or HOLD>
```

### Said Evidence Refs

Said evidence captures aggregate stated intent, experience, or hypothesis
context that reviewers have approved for measurement planning.

Allowed said-evidence ref families:

```text
approved_ai_fluency_aggregate_ref
approved_blueprint_hypothesis_ref
approved_blueprint_measurement_mapping_ref
approved_expectation_path_ref
approved_metric_selection_ref
```

Said evidence must remain aggregate-only. It must not include individual survey
responses, names, emails, employee IDs, direct quotes tied to people, raw
transcripts, prompt text, or person-level labels.

### Unsaid Behavioral Evidence Refs

Unsaid evidence captures aggregate behavioral or workflow evidence that can be
observed without treating people as scored units.

Allowed unsaid-evidence ref families:

```text
aggregate_workflow_evidence_ref
aggregate_measurement_cell_ref
aggregate_vbd_context_ref
aggregate_source_readiness_ref
aggregate_operator_review_ref
```

Unsaid evidence must not be individual attribution, productivity measurement,
manager or team ranking, department ranking, HR analytics, surveillance, or
performance inference.

### Aggregate Outcome Measurement Cell Refs

Outcome movement must be represented through aggregate Measurement Cell refs
bound to the approved selected metric, expected movement direction, expectation
path, cohort, workflow/function identity, and milestone windows.

Required posture fields:

```text
measurement_cell_ref
metric_id
milestone_window_ref
measurement_cell_grain
window_alignment_state
suppression_state
missing_state
held_state
outcome_movement_direction_observed=<aligned | not_aligned | mixed | not_available>
```

Outcome movement is descriptive aggregate context only. It must not be
described as caused by AI, attributed to AI, converted into ROI, converted into
finance output, converted into productivity output, or used as probability or
confidence language.

## Required Outputs

An Evidence Alignment Result must emit the following output fields:

```text
schema_version=FT_AI_VALUE_CONTRIBUTION_EVIDENCE_ALIGNMENT_RESULT_2026_06
result_state=<same value as evidence_alignment_state>
result_class=ai_value_contribution_evidence_alignment_result
internal_only=true
aggregate_only=true
measurement_readiness_state
said_evidence_state
unsaid_evidence_state
outcome_movement_state
evidence_alignment_state
comparison_design_posture
evidence_gap_list
model_eligibility_status
customer_safe_interpretation
blocked_claims
allowed_next_step
customer_publishable=false
source_bound=false
validation_current=false
promotion_authorized=false
bayesian_promotion_authorized=false
diagnostics_evidence_satisfied=false
diagnostics_sufficiency_authorized=false
model_adequacy_authorized=false
posterior_interpretation_authorized=false
confidence_probability_authorized=false
customer_economic_output_authorized=false
feeds.governed_diagnostics_sufficiency_evidence_source=false
feeds.diagnostics_evidence_packet=false
feeds.internal_diagnostics_model_adequacy_review=false
feeds.bayesian_promotion_decision_gate=false
feeds.promotion_gate_passed_artifact_handoff=false
feeds.internal_bayesian_execution_artifact_v1=false
feeds.posterior_interpretation_specification_gate=false
```

The result may include source refs, source package refs, and Measurement Cell
refs. It must not include diagnostics sufficiency hashes, reviewed diagnostics
source evidence hashes, posterior values, model estimates, row samples,
identifiers, query text, prompts, transcripts, or person-level fields.

`source_bound=false` and `validation_current=false` mean this docs-only result
cannot claim current hash-bound validation. If a later executable slice is
approved, current validation must be recomputed by the existing source-bound
runner or gate that owns the relevant chain step.

## Evidence Alignment States

Allowed `evidence_alignment_state` values:

```text
NOT_READY
HELD_FOR_MISSING_SAID_EVIDENCE
HELD_FOR_MISSING_UNSAID_EVIDENCE
HELD_FOR_MISSING_OUTCOME_EVIDENCE
HELD_FOR_SUPPRESSED_OR_MISALIGNED_WINDOWS
DIRECTIONALLY_ALIGNED_INTERNAL_ONLY
READY_FOR_MODEL_REVIEW
```

### State Semantics

`NOT_READY` means the result cannot distinguish said, unsaid, and outcome
evidence posture from aggregate refs. The result must hold.

`HELD_FOR_MISSING_SAID_EVIDENCE` means Blueprint or AI Fluency aggregate
planning refs are missing, held, stale, or not reviewer-approved.

`HELD_FOR_MISSING_UNSAID_EVIDENCE` means aggregate behavioral/workflow evidence
refs are missing, held, suppressed, stale, or not aligned to the approved grain.

`HELD_FOR_MISSING_OUTCOME_EVIDENCE` means selected-metric Measurement Cell refs
or aggregate outcome movement posture are missing or not reviewer-owned.

`HELD_FOR_SUPPRESSED_OR_MISALIGNED_WINDOWS` means any required T0, T30, T60,
T90, or T120 milestone window is missing, suppressed, held, stale, out of order,
or not aligned to the same selected metric, expectation path, cohort,
workflow/function identity, and Measurement Cell grain.

`DIRECTIONALLY_ALIGNED_INTERNAL_ONLY` means said evidence, unsaid evidence, and
aggregate outcome movement refs share the same pre-approved direction label for
internal review. This state does not authorize model review by itself, does not
increase confidence, does not imply contribution or lift, does not support
attribution, and does not create a claim that AI caused the movement.

`READY_FOR_MODEL_REVIEW` means the aggregate evidence alignment result is ready
to be considered as one internal input to model-review preparation only. It
does not mean a model is adequate, does not mean the Bayesian chain is ready,
does not complete comparison-design adequacy, diagnostics sufficiency, Bayesian
promotion, Artifact v1, posterior interpretation, or customer-facing output.

## Output Field Rules

### `measurement_readiness_state`

Allowed values:

```text
MEASUREMENT_NOT_READY
HELD_FOR_MISSING_BLUEPRINT_MAPPING
HELD_FOR_MISSING_SELECTED_METRIC
HELD_FOR_MISSING_MILESTONE_WINDOWS
HELD_FOR_SUPPRESSED_OR_MISALIGNED_WINDOWS
AGGREGATE_MEASUREMENT_CONTEXT_READY_INTERNAL_ONLY
```

This field reports readiness of the aggregate measurement context only. It does
not indicate diagnostics sufficiency or model adequacy.

### `said_evidence_state`

Allowed values:

```text
MISSING
HELD
PARTIAL
PRESENT_AGGREGATE_REVIEWED_REFS
```

This field reports whether reviewer-owned said-evidence refs exist. It does
not summarize individual responses or create psychometric interpretation.

### `unsaid_evidence_state`

Allowed values:

```text
MISSING
HELD
SUPPRESSED
PARTIAL
PRESENT_AGGREGATE_REVIEWED_REFS
```

This field reports whether aggregate behavioral/workflow evidence refs exist.
It must never score individuals, teams, managers, departments, or functions.

### `outcome_movement_state`

Allowed values:

```text
MISSING
HELD
SUPPRESSED
MISALIGNED
NO_OBSERVED_AGGREGATE_MOVEMENT
MIXED_AGGREGATE_MOVEMENT
DIRECTIONALLY_ALIGNED_WITH_EXPECTATION_PATH
```

This field compares aggregate outcome movement direction to the approved
expectation path. It must not report attribution, probability, confidence,
financial impact, or productivity impact.

### `comparison_design_posture`

Allowed values:

```text
NOT_STARTED
INTAKE_TEMPLATE_ONLY
SOURCE_PACKAGE_IN_PREPARATION
HOLD_FOR_SOURCE_PACKAGE_REVIEW
READY_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW
```

This field reports comparison-design posture only. It must not mark
`comparison_design_adequacy` satisfied. Only the separate Comparison Design
Adequacy Evidence Review can do that after real reviewed source evidence is
supplied.

### `evidence_gap_list`

`evidence_gap_list` must name missing or held aggregate refs without exposing
raw data. Valid gap families include:

```text
missing_blueprint_hypothesis_ref
missing_selected_metric_ref
missing_expected_movement_direction
missing_milestone_window_ref
missing_said_evidence_ref
missing_unsaid_behavioral_evidence_ref
missing_outcome_measurement_cell_ref
suppressed_window
held_window
misaligned_metric
misaligned_cohort
misaligned_workflow_function_identity
missing_comparison_condition
missing_source_package_ref
comparison_design_source_package_not_reviewed
diagnostics_sufficiency_not_reviewed
```

Gaps are diagnostic only. They are not evidence, not a score, and not a
permission to advance a gate.

### `model_eligibility_status`

Allowed values:

```text
NOT_ELIGIBLE_FOR_MODEL_REVIEW
HELD_FOR_EVIDENCE_GAPS
HELD_FOR_COMPARISON_DESIGN_REVIEW
HELD_FOR_DIAGNOSTICS_SUFFICIENCY_REVIEW
ELIGIBLE_FOR_INTERNAL_MODEL_REVIEW_INPUT_ONLY
```

`model_eligibility_status` is a compatibility field name for model-review input
posture only. It must stay separate from `customer_safe_interpretation`. A
result can describe evidence alignment while still reporting that model review
is held.

This field must not say that a Bayesian gate passed, that a model is adequate,
that posterior interpretation is allowed, or that promotion is authorized.

### `customer_safe_interpretation`

`customer_safe_interpretation` is a required compatibility field name for a
short, caveated internal operator wording note about alignment or missing
evidence. It is internal safe-language guidance only, not a customer-facing
economic artifact, not customer delivery approval, not economic reporting, and
not permission to publish a claim.

It may say:

```text
Aggregate stated evidence refs, aggregate workflow evidence refs, and
selected-metric movement refs share the approved expectation-path direction
label for internal review.
Model review remains separate and requires governed diagnostics evidence.
```

It may say:

```text
The result is held because the selected-metric Measurement Cell refs are
missing or misaligned for one or more milestone windows.
```

It must not say:

```text
AI caused the metric movement.
The model is confident.
There is a probability of impact.
The customer achieved ROI.
The team became more productive.
The result is ready for customer-facing economic reporting.
```

Customer-safe interpretation must keep model status separate from the evidence
alignment statement. A held model status must remain visible even when the
evidence alignment statement is directionally aligned. Every result must also
carry `customer_publishable=false`.

### `blocked_claims`

`blocked_claims` must include, at minimum:

```text
causality_claim
ai_contribution_claim
impact_claim
financial_attribution
confidence_output
probability_output
posterior_interpretation
score_like_output
roi_output
finance_output
economic_output
productivity_output
customer_facing_economic_output
customer_publishable_claim
model_adequacy_claim
bayesian_promotion_claim
diagnostics_sufficiency_claim
individual_scoring
manager_or_team_ranking
department_ranking
team_productivity_claim
department_performance_claim
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
promotion_authorization
diagnostics_evidence_satisfaction
```

Blocked claims may be named only as blocked claims.

### `allowed_next_step`

Allowed values:

```text
complete_missing_evidence_alignment_inputs
prepare_comparison_design_source_package_only
run_comparison_design_adequacy_evidence_review_only
identify_inputs_for_governed_diagnostics_sufficiency_review_only
hold_for_reviewer_evidence_collection
```

`allowed_next_step` must be derived from the result state and evidence gaps. It
must not override the Bayesian Hardening Orchestrator, the Governed Diagnostics
Sufficiency Evidence Source, the Diagnostics Evidence Packet, the Internal
Diagnostics and Model Adequacy Review, the Bayesian Promotion Decision Gate,
the Promotion Gate Passed Artifact Handoff, or Internal Bayesian Execution
Artifact v1.

When the Bayesian Hardening Orchestrator reports
`complete_governed_diagnostics_sufficiency_evidence_source`, this result may
only report
`identify_inputs_for_governed_diagnostics_sufficiency_review_only` as its local
next action. Only the Governed Diagnostics Sufficiency Evidence Source can
complete that step. This result does not satisfy the step.

## Fail-Closed Rules

The result must be held unless all of the following are true:

- Blueprint hypothesis ref is present and reviewer-owned;
- selected metric is reviewer-approved;
- expected movement direction is derived from the approved expectation path;
- T0, T30, T60, T90, and T120 milestone window refs are present;
- said evidence refs are aggregate-only and reviewer-owned;
- unsaid behavioral evidence refs are aggregate-only and reviewer-owned;
- aggregate outcome Measurement Cell refs exist for the selected metric and
  milestone windows;
- suppression, missing, held, stale, and misalignment checks are clear;
- comparison condition status is not missing or misaligned;
- source package refs are present when the next step requires source-package
  review;
- blocked claims remain blocked;
- no raw rows, identifiers, query text, prompts, transcripts, or person-level
  fields are present;
- no source hash alone, template prose, runtime flag, selected metric context,
  stale window, generated example, fixture default, or posterior-like prototype
  value is treated as evidence.

Any missing, suppressed, held, stale, misaligned, non-aggregate, non-reviewed,
or boundary-leaking input must force a held alignment state.

## Non-Executing Examples

### Held For Missing Outcome Evidence

```text
evidence_alignment_state=HELD_FOR_MISSING_OUTCOME_EVIDENCE
measurement_readiness_state=HELD_FOR_MISSING_MILESTONE_WINDOWS
said_evidence_state=PRESENT_AGGREGATE_REVIEWED_REFS
unsaid_evidence_state=PRESENT_AGGREGATE_REVIEWED_REFS
outcome_movement_state=MISSING
comparison_design_posture=SOURCE_PACKAGE_IN_PREPARATION
model_eligibility_status=HELD_FOR_EVIDENCE_GAPS
customer_safe_interpretation=The aggregate stated and behavioral refs are present, but selected-metric Measurement Cell refs are missing for one or more milestone windows. Model-review input remains held.
allowed_next_step=complete_missing_evidence_alignment_inputs
customer_publishable=false
promotion_authorized=false
```

### Directionally Aligned Internal Only

```text
evidence_alignment_state=DIRECTIONALLY_ALIGNED_INTERNAL_ONLY
measurement_readiness_state=AGGREGATE_MEASUREMENT_CONTEXT_READY_INTERNAL_ONLY
said_evidence_state=PRESENT_AGGREGATE_REVIEWED_REFS
unsaid_evidence_state=PRESENT_AGGREGATE_REVIEWED_REFS
outcome_movement_state=DIRECTIONALLY_ALIGNED_WITH_EXPECTATION_PATH
comparison_design_posture=READY_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW
model_eligibility_status=HELD_FOR_COMPARISON_DESIGN_REVIEW
customer_safe_interpretation=Aggregate stated evidence refs, aggregate workflow evidence refs, and selected-metric movement refs share the approved expectation-path direction label for internal review. Comparison-design adequacy and diagnostics sufficiency remain separate reviewed steps.
allowed_next_step=run_comparison_design_adequacy_evidence_review_only
customer_publishable=false
promotion_authorized=false
```

### Ready For Model Review Input Only

```text
evidence_alignment_state=READY_FOR_MODEL_REVIEW
measurement_readiness_state=AGGREGATE_MEASUREMENT_CONTEXT_READY_INTERNAL_ONLY
said_evidence_state=PRESENT_AGGREGATE_REVIEWED_REFS
unsaid_evidence_state=PRESENT_AGGREGATE_REVIEWED_REFS
outcome_movement_state=DIRECTIONALLY_ALIGNED_WITH_EXPECTATION_PATH
comparison_design_posture=READY_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEW
model_eligibility_status=ELIGIBLE_FOR_INTERNAL_MODEL_REVIEW_INPUT_ONLY
customer_safe_interpretation=Aggregate evidence refs are complete for internal model-review input preparation, but model adequacy, diagnostics sufficiency, and any later promotion remain governed by separate gates.
allowed_next_step=identify_inputs_for_governed_diagnostics_sufficiency_review_only
customer_publishable=false
promotion_authorized=false
```

These examples are not source packages, not evidence, not runner fixtures, and
not valid input to the Governed Diagnostics Sufficiency Evidence Source.

## Relationship To Existing Contracts

- Blueprint Hypothesis Measurement Mapping owns the upstream planning logic for
  selected metric, expected direction, lag context, and milestone windows.
- The Comparison Design Source Package Intake Template collects reviewer-owned
  comparison-design inputs. It remains a template and does not create evidence.
- Measurement Cell owns aggregate grain and source alignment for selected
  metric movement.
- Comparison Design Adequacy Evidence Review owns whether a real reviewed
  comparison-design source package can satisfy that single dimension.
- Governed Diagnostics Sufficiency Evidence Source owns seven-dimension
  diagnostics sufficiency evidence binding.
- The Bayesian Hardening Orchestrator reports the gate-derived next step but
  does not authorize promotion.

This result may reference those contracts, but it cannot bypass or replace any
of them.

If this result and the Bayesian Hardening Orchestrator disagree, the
gate-derived next step reported by the orchestrator controls scope selection.
This result cannot create permission, promotion, readiness, or evidence
satisfaction.

## Review Checklist

Before accepting a future implementation of this contract, reviewers must
confirm:

- result is internal-only and aggregate-only;
- all input fields are refs or aggregate posture fields;
- no raw rows, identifiers, query text, prompts, transcripts, or person-level
  data are present;
- `customer_safe_interpretation` describes alignment refs or missing evidence
  only and carries `customer_publishable=false`;
- causality, confidence, probability, ROI, finance, economic, productivity, and
  customer-facing economic claims are absent;
- model eligibility remains separate from interpretation;
- diagnostics evidence satisfaction remains false;
- promotion authorization remains false;
- all feeds remain false;
- no reviewed/source hash, manifest entry, or packet projection is emitted;
- allowed next step does not override the gate-derived next step;
- no route, UI, schema, persistence, export, or live connector behavior is
  created.
