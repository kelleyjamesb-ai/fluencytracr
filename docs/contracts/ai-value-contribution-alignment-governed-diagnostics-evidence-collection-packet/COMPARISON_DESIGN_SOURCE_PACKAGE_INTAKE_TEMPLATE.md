# Comparison Design Source Package Intake Template

Status:
`DOCS_ONLY_INTAKE_TEMPLATE_NOT_EVIDENCE`

Runner:
none

Schema:
none

## Purpose

This is the reviewer intake scaffold for collecting aggregate comparison-design
inputs before a later Comparison Design Adequacy Evidence Review evaluates a
real source package.

It is not evidence. It is not a gate. It does not satisfy
`comparison_design_adequacy`. It does not emit hashes, satisfaction fields,
promotion fields, or downstream feeds.

The selected metric fields in this template are derived from the docs-only
Blueprint Hypothesis Measurement Mapping contract. They are collected here as
comparison-design source package preparation context only. They do not create a
separate Selected Metric Review Packet and do not satisfy any diagnostics
evidence dimension.

This template is not admissible evidence and is not valid input to any runner,
gate, packet, source, orchestrator, artifact, connector, route, UI, schema,
persistence, or export path. Any document derived from this template remains a
reviewer-preparation draft until a separate Comparison Design Adequacy Evidence
Review evaluates an independently reviewed source package. Any template-derived
document that contains non-blank evidence hashes, positive satisfaction or
promotion fields, evidence-review approval state, downstream feed, executable
next-step field, live connector handle, raw row, identifier, query text, prompt,
transcript, or person-level field must be rejected as boundary leakage.

Authoritative follow-on contracts:

- `docs/contracts/ai-value-blueprint-hypothesis-measurement-mapping/README.md`
  owns the upstream Blueprint hypothesis, selected metric, expected direction,
  milestone window, and Measurement Cell planning prerequisites that must be
  approved before this intake template can be completed.
- `docs/contracts/ai-value-contribution-alignment-comparison-design-adequacy-evidence-review/README.md`
  owns the later review behavior.
- `docs/contracts/ai-value-contribution-alignment-governed-diagnostics-sufficiency-evidence-source/README.md`
  owns any future seven-dimension source binding behavior.

## Non-Authorization

This template must not:

- create evidence;
- create synthetic evidence;
- validate evidence;
- create a separate Selected Metric Review Packet;
- bind evidence into the Governed Diagnostics Sufficiency Evidence Source;
- mark `comparison_design_adequacy` satisfied;
- emit reviewed source evidence hashes;
- emit source evidence hashes;
- set evidence satisfaction;
- set promotion authorization;
- authorize posterior interpretation;
- emit confidence or probability output;
- emit customer-facing, economic, ROI, finance, causality, or productivity
  output;
- run live BigQuery, Sigma, Glean, or other connectors;
- create routes, UI, schemas, exports, persistence, or storage writes;
- include raw rows, identifiers, query text, prompts, transcripts, or
  person-level data.

## Reviewer Intake Fields

Complete these fields in a reviewer-owned source package outside this template.
Use aggregate-only descriptions and reviewer-owned refs. Do not paste raw data,
queries, prompts, transcripts, identifiers, or connector outputs.

```text
template_status:
DOCS_ONLY_INTAKE_TEMPLATE_NOT_EVIDENCE

review_target:
comparison_design_adequacy

future_reviewed_source_ref_namespace_for_later_package:
internal_diagnostics_sufficiency_evidence.comparison_design_adequacy.2026_06
namespace_hint_only=true
template_supplies_or_reserves_reviewed_source_ref=false
template_validates_or_binds_reviewed_source_ref=false

blueprint_hypothesis_measurement_mapping:
mapping_contract_ref=docs/contracts/ai-value-blueprint-hypothesis-measurement-mapping/README.md
source_blueprint_hypothesis_ref=<reviewer-owned Blueprint hypothesis ref>
source_blueprint_hypothesis_mapping_ref=<reviewer-owned mapping ref>
mapping_status=<docs-only planning input; not evidence>
mapping_review_notes=<aggregate-only notes>

candidate_metric_family_recommendations:
candidate_metric_family_refs=<reviewer-owned aggregate metric family refs>
candidate_metric_family_names=<aggregate metric family names from mapping>
candidate_metric_family_notes=<aggregate-only notes>
candidate_metric_family_state=<candidate planning input only; not selected evidence>

reviewer_approved_metric_selection:
approved_metric_selection_ref=<reviewer-owned selected metric ref>
source_blueprint_hypothesis_ref=<reviewer-owned Blueprint hypothesis ref>
selected_metric_id=<reviewer-selected aggregate metric candidate approved for intake preparation only>
selected_metric_family=<reviewer-selected aggregate metric family approved for intake preparation only>
selected_measurement_unit=<aggregate unit label>
metric_owner_role_ref=<role ref only, no person name>
baseline_value_source_ref=<reviewed aggregate source ref or HOLD>
comparison_condition_ref=<reviewer-approved comparison condition ref or HOLD>
approval_state=<APPROVED_FOR_COMPARISON_DESIGN_INTAKE | HOLD_FOR_REVIEW>
approval_role_ref=<reviewer role ref only, no person name>
selected_metric_notes=<aggregate-only preparation notes>

selected_metric_boundary:
selected_metric_context_state=COMPARISON_DESIGN_PREPARATION_CONTEXT_ONLY_NOT_EVIDENCE
selected_metric_review_packet_created=false
selected_metric_review_packet_ref=null
selected_metric_evidence_dimension=null
selected_metric_diagnostics_evidence_authorized=false
selected_metric_hash_authorized=false
selected_metric_manifest_entry_authorized=false
selected_metric_governed_source_binding_authorized=false
selected_metric_promotion_feed_authorized=false

expectation_path_direction_lag_context:
approved_expectation_path_ref=<reviewer-owned expectation path ref>
source_blueprint_hypothesis_ref=<reviewer-owned Blueprint hypothesis ref>
selected_metric_id=<approved aggregate metric id>
expected_movement_direction=<increase | decrease | maintain | directional_review_required>
expected_lag_definition=<reviewer-approved aggregate lag context or none>
direction_derivation_notes=<aggregate-only notes>
lag_derivation_notes=<aggregate-only notes>
approval_state=<APPROVED_FOR_COMPARISON_DESIGN_INTAKE | HOLD_FOR_REVIEW>

milestone_schedule:
milestone_schedule_ref=<reviewer-owned schedule ref>
source_blueprint_hypothesis_ref=<reviewer-owned Blueprint hypothesis ref>
selected_metric_id=<approved aggregate metric id>
approved_expectation_path_ref=<reviewer-owned expectation path ref>
baseline_window=<aggregate baseline window ref>
milestone_windows=<T0/T30/T60/T90/T120 aggregate window refs>
required_milestones=<T0, T30, T60, T90, T120>
milestone_contract_scope=docs-only comparison-design intake preparation only
milestone_contract_modifies_measurement_cell_or_series=false
milestone_contract_modifies_persistence_promotion_or_bayesian_planning=false
T0_window_ref=<aggregate baseline window ref>
T30_window_ref=<aggregate milestone window ref>
T60_window_ref=<aggregate milestone window ref>
T90_window_ref=<aggregate milestone window ref>
T120_window_ref=<aggregate milestone window ref>
window_alignment_state=<ALIGNED_FOR_INTAKE | HOLD_FOR_WINDOW_REVIEW>
suppression_missing_held_review_state=<CLEAR | HOLD_FOR_SUPPRESSED_MISSING_HELD_WINDOW_REVIEW>
staleness_review_state=<CURRENT | HOLD_FOR_STALE_WINDOW_REVIEW>
milestone_alignment_notes=<aggregate-only notes>

baseline_source_posture:
baseline_source_ref=<reviewer-owned aggregate source ref or HOLD>
baseline_source_type=<customer-owned aggregate export | reviewed aggregate fixture summary metadata only | not_selected>
baseline_review_notes=<aggregate-only notes>

comparison_condition:
comparison_condition_ref=<reviewer-owned comparison condition ref or HOLD>
comparison_condition_type=<governed comparison group | staggered rollout | HOLD>
other_aggregate_design_state=HOLD_UNLESS_LATER_COMPARISON_DESIGN_REVIEW_CONTRACT_EXPLICITLY_ACCEPTS_IT
comparison_condition_notes=<aggregate-only notes>

treatment_group_definition:
aggregate_measurement_cell_role=treatment
definition=<aggregate-only treatment group definition>
reviewer_notes=<aggregate-only notes>

comparison_group_definition:
aggregate_measurement_cell_role=comparison
definition=<aggregate-only comparison group definition>
reviewer_notes=<aggregate-only notes>

rollout_or_comparison_design_type:
design_type=<governed comparison group or staggered rollout comparison>
design_notes=<aggregate-only notes>

baseline_window:
window_role=baseline
window_start=<aggregate window start>
window_end=<aggregate window end>
alignment_notes=<aggregate-only notes>

comparison_window:
window_role=comparison_or_post
window_start=<aggregate window start>
window_end=<aggregate window end>
alignment_notes=<aggregate-only notes>

metric_direction_and_lag:
metric_id=<approved aggregate metric id>
direction=<expected aggregate movement direction>
lag=<approved lag definition>
source_mapping_ref=<reviewer-owned mapping ref>

approved_expectation_path:
expectation_path_id=<approved aggregate expectation path id>
expectation_path_review_ref=<reviewer-owned ref>

cohort_identity:
cohort_id=<approved aggregate cohort id>
cohort_scope=<aggregate-only cohort description>
cohort_review_ref=<reviewer-owned ref>

workflow_function_identity:
workflow_id=<approved aggregate workflow id>
function_id=<approved aggregate function id>
identity_alignment_notes=<aggregate-only notes>

aggregate_measurement_cell_grain:
grain_definition=<workflow_or_function_identity + cohort_scope + selected_metric_id + approved_expectation_path_ref + milestone_window_ref>
grain_review_notes=<aggregate-only notes>

suppression_missing_held_window_review:
precheck_state=<CLEAR or HOLD_FOR_SUPPRESSED_MISSING_HELD_WINDOW_REVIEW>
missing_window_review=<reviewer-owned ref or notes>
suppressed_window_review=<reviewer-owned ref or notes>
held_window_review=<reviewer-owned ref or notes>
review_notes=<aggregate-only notes>

cross_slice_aggregation_prohibition_check:
unsupported_cross_slice_aggregation_present=<yes/no in later reviewed package>
review_notes=<aggregate-only notes>

person_level_identifier_exclusion_check:
raw_row_absence_review=<reviewer-owned ref or notes>
identifier_absence_review=<reviewer-owned ref or notes>
query_text_absence_review=<reviewer-owned ref or notes>
prompt_absence_review=<reviewer-owned ref or notes>
transcript_absence_review=<reviewer-owned ref or notes>
person_level_data_absence_review=<reviewer-owned ref or notes>
review_notes=<aggregate-only notes>

causality_claim_exclusion_check:
causality_claim_absence_review=<reviewer-owned ref or notes>
review_notes=<aggregate-only notes; do not include causality wording>

reviewer_roles:
data_science_reviewer_role_ref=<role ref only, no person name>
governance_reviewer_role_ref=<role ref only, no person name>
review_committee_ref=<optional internal review-body ref, no person name>

review_decision_placeholder:
HOLD_FOR_MORE_EVIDENCE

later_hash_ref_fields:
must_be_generated_by_later_reviewed_evidence_package_only

selected_metric_hash_boundary:
selected_metric_context_must_not_generate_source_package_hash=true
selected_metric_context_must_not_generate_reviewed_source_evidence_hash=true
selected_metric_context_must_not_generate_source_evidence_hash=true
selected_metric_context_must_not_generate_reviewed_evidence_manifest_hash=true
selected_metric_context_must_not_appear_as_manifest_dimension_entry=true
```

The later reviewed evidence package, not this template, owns any future reviewed
source reference, reviewed source evidence hash, source evidence hash, source
package hash, reviewed evidence manifest hash, source package state, executable
next-step field, downstream feed field, evidence satisfaction field, or
promotion field.

## Selected Metric Boundary

Selected metric context is collected inside this comparison-design intake so
reviewers can prepare one coherent source package. It must remain derived from
the Blueprint Hypothesis Measurement Mapping contract:

```text
submitted Blueprint hypothesis
-> candidate aggregate metric family recommendations
-> reviewer-approved aggregate metric selection
-> expected movement direction and lag context
-> milestone schedule
-> comparison-design source package preparation
```

This selected metric context is not a separate packet, not diagnostics
evidence, not a reviewed source evidence hash, not a source evidence hash, not
`evidence_satisfied`, and not `comparison_design_adequacy` satisfaction.
Reviewer metric approval in this template means approved for comparison-design
intake preparation only.

Forbidden selected-metric packet aliases:

```text
Selected Metric Review Packet
selected_metric_review_packet
selected_metric_evidence_packet
selected_metric_source_evidence
metric_selection_evidence
metric_selection_review_packet
selected_metric_reviewed_source_evidence_hash
selected_metric_source_evidence_hash
selected_metric_manifest_entry
```

The selected metric context must fail closed if:

- the source Blueprint hypothesis ref is missing;
- candidate metric families are not traceable to the mapping contract;
- no reviewer-approved metric selection is present;
- metric owner or reviewer role is missing;
- expected movement direction is not derived from the approved mapping;
- lag context is missing or stale;
- any T0, T30, T60, T90, or T120 milestone window is missing, suppressed, held,
  stale, or misaligned;
- the T0/T30/T60/T90/T120 schedule is treated as modifying Measurement Cell,
  Measurement Cell Series, persistence, promotion, or Bayesian planning
  milestone contracts;
- baseline source posture is missing or unreviewed;
- baseline posture relies on generated fixture defaults, template examples, or
  runtime fields instead of reviewed aggregate summary metadata;
- comparison condition is missing or unreviewed;
- comparison condition uses any aggregate design other than governed comparison
  group or staggered rollout without a later comparison-design review contract
  explicitly accepting it;
- cohort identity, workflow/function identity, or Measurement Cell grain is
  inconsistent;
- the suppression/missing/held precheck is not clear;
- template prose, mapping prose, source refs alone, fixture defaults, generated
  examples, or runtime fields are used as evidence.
- selected metric context is copied, renamed, hashed, manifested, or promoted
  as reviewed diagnostics source evidence, source diagnostics sufficiency
  evidence, comparison-design source evidence, a reviewed evidence manifest
  dimension entry, a reviewed source evidence hash, a source evidence hash,
  evidence satisfaction, comparison-design adequacy satisfaction, or an allowed
  next step.

Copied selected metric fields may help reviewers prepare a later source
package, but they cannot satisfy or partially satisfy
`metric_direction_lag_expectation_path_cohort_workflow_function_identity_matched`
by themselves. That assertion belongs only to the later Comparison Design
Adequacy Evidence Review after independently reviewed comparison-design source
evidence exists.

## Blocked Content

Do not include:

- raw rows;
- identifiers;
- query text;
- prompts;
- transcripts;
- person-level data;
- live connector output;
- posterior interpretation;
- confidence or probability language;
- score-like output;
- customer-facing output;
- economic, ROI, finance, causality, or productivity language;
- route, UI, schema, persistence, export, or storage-write instructions.

## Review Handoff

After reviewers complete a real source package outside this template, the next
bounded slice may run the Comparison Design Adequacy Evidence Review against
that package. That later review may still hold or reject the package; this
handoff does not satisfy comparison design.

This template itself must remain outside the executable Bayesian hardening
chain.
