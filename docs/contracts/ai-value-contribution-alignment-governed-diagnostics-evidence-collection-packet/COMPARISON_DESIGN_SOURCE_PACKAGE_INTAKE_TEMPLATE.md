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

required_source_ref_format:
internal_diagnostics_sufficiency_evidence.comparison_design_adequacy.2026_06

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
grain_definition=<workflow_id + expectation_path_id + cohort_id + function_id + window role>
grain_review_notes=<aggregate-only notes>

suppression_missing_held_window_review:
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
```

The later reviewed evidence package, not this template, owns any future reviewed
source reference, reviewed source evidence hash, source evidence hash, source
package hash, reviewed evidence manifest hash, source package state, executable
next-step field, downstream feed field, evidence satisfaction field, or
promotion field.

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
that package.

This template itself must remain outside the executable Bayesian hardening
chain.
