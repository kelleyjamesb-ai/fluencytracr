# AI Value Measurement Journey State Model

Runner:
`scripts/run_ai_value_measurement_journey_state_model.mjs`

Schema version:
`FT_AI_VALUE_MEASUREMENT_JOURNEY_STATE_MODEL_2026_06`

## Purpose

The Measurement Journey State Model is a product-facing, UI-safe view model
over the governed AI Value contract chain. It turns the current measurement
posture into one active journey state plus a separate model-review posture.

It is not a Bayesian model, diagnostics review, evidence generator, promotion
gate, route, schema, persistence path, export, live connector, or customer
economic readout.

## Contract Chain

```text
Blueprint hypothesis intake
-> Hypothesis-to-Metric Recommendation
-> Reviewer Metric Selection Draft Intake
-> Reviewer-Approved Measurement Plan Contract
-> Aggregate Data Collection Planning Contract
-> Comparison Design Source Package Preparation Binding
-> Reviewer-Owned Comparison Design Source Package Collection
-> Comparison Design Adequacy Evidence Review
-> Triangulated Evidence Alignment Review
-> Model-review posture remains blocked
```

The state model can show where the customer is in the journey, what is still
held, and what the next allowed product action is. It does not make the held
item true.

## Active-State Rule

Exactly one state is active.

The active state is the most advanced valid journey state whose dependencies
validate, while failing closed to the earliest unmet, unsafe, stale, held,
missing, or invalid prerequisite.

Later artifacts, hashes, or self-consistent reports cannot skip earlier
required source validation. Ready validation for downstream review states must
use the original source objects required by the source contracts.

## States

| State | Product label | Dependency | Next action |
| --- | --- | --- | --- |
| `NO_BLUEPRINT` | No Blueprint yet | Blueprint hypothesis intake | `complete_blueprint_hypothesis` |
| `BLUEPRINT_RECEIVED` | Blueprint received | Hypothesis-to-Metric Recommendation | `complete_candidate_metric_recommendation` |
| `METRICS_RECOMMENDED` | Metric options ready | Hypothesis-to-Metric Recommendation | `prepare_reviewer_metric_selection_draft` |
| `MEASUREMENT_PLAN_DRAFTED` | Draft measurement plan prepared | Reviewer Metric Selection Draft Intake | `complete_reviewer_approved_measurement_plan` |
| `MEASUREMENT_PLAN_APPROVED` | Measurement plan approved | Reviewer-Approved Measurement Plan Contract | `complete_aggregate_data_collection_planning` |
| `DATA_COLLECTION_PLANNING_READY` | Collection planning ready | Aggregate Data Collection Planning Contract | `collect_reviewer_owned_comparison_design_source_package` |
| `SOURCE_PACKAGE_COLLECTION_READY` | Source package received for review | Reviewer-Owned Comparison Design Source Package Collection | `run_comparison_design_adequacy_evidence_review` |
| `COMPARISON_DESIGN_REVIEWED` | Comparison design reviewed | Comparison Design Adequacy Evidence Review | `complete_triangulated_evidence_alignment_review` |
| `EVIDENCE_ALIGNMENT_HELD` | Evidence alignment held | Triangulated Evidence Alignment Review | `complete_governed_evidence_alignment_inputs` |
| `EVIDENCE_ALIGNMENT_PARTIAL` | Source refs partially align for review only | Triangulated Evidence Alignment Review | `review_partial_alignment_posture` |
| `EVIDENCE_ALIGNMENT_ALIGNED` | Source refs align for review only | Triangulated Evidence Alignment Review | `hold_for_governed_model_review_inputs` |
| `EVIDENCE_ALIGNMENT_DIVERGENT` | Source refs need reviewer interpretation | Triangulated Evidence Alignment Review | `review_divergent_alignment_posture` |
| `MODEL_REVIEW_BLOCKED` | Held before model-review input | Governed Diagnostics Sufficiency Evidence Source | `complete_governed_diagnostics_sufficiency_evidence_source` |

## Triangulated Alignment Mapping

The Triangulated Evidence Alignment Review maps directly into journey states:

```text
HOLD_FOR_GOVERNED_EVIDENCE -> EVIDENCE_ALIGNMENT_HELD
PARTIAL_ALIGNMENT_FOR_REVIEW -> EVIDENCE_ALIGNMENT_PARTIAL
ALIGNED_FOR_REVIEW -> EVIDENCE_ALIGNMENT_ALIGNED
DIVERGENT_FOR_REVIEW -> EVIDENCE_ALIGNMENT_DIVERGENT
```

These are internal source-ref review postures only. `EVIDENCE_ALIGNMENT_ALIGNED`
means reviewer-owned aggregate source refs share the expected context for
review. `EVIDENCE_ALIGNMENT_DIVERGENT` means reviewer-owned aggregate source
refs need reviewer interpretation. Neither state is a governed evidence-content
finding, causal finding, outcome verdict, model result, or Bayesian readiness
signal.

`MODEL_REVIEW_BLOCKED` may become active only after a source-bound
`EVIDENCE_ALIGNMENT_ALIGNED` review exists and a later explicit model-review
gate posture says the next visible action is model-review gating. Held,
partial, and divergent alignment states must remain visible as their specific
alignment states so UI does not hide the actual review posture.

## Required Output

The runner emits:

```text
measurement_journey_state
model_review_posture
current_blocker
next_allowed_action
customer_safe_summary
blocked_claims
not_yet_evidence
source_contract_refs
source_contract_hashes
ui_language_policy
state_model_hash
```

The default model-review posture is always:

```text
BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE
```

## Source Binding

The state model may expose source refs and source contract hashes for product
traceability, but it must not treat hashes alone as completed work.

Examples:

- a ready Comparison Design Adequacy Evidence Review does not advance the
  journey unless the source runtime and reviewer-owned source package collection
  are supplied for source-bound validation;
- a ready Triangulated Evidence Alignment Review does not map to an alignment
  state unless the reviewer-owned alignment source object and source
  comparison-design adequacy review validate;
- a draft selected metric does not become reviewer approval;
- candidate metric recommendations do not become evidence.

## Non-Authorization

The state model must keep these false or empty in every state:

```text
creates_evidence=false
diagnostics_evidence_satisfied=false
evidence_dimensions_satisfied=[]
bayesian_readiness_authorized=false
promotion_authorized=false
posterior_interpretation_authorized=false
confidence_probability_authorized=false
customer_economic_output_authorized=false
```

All `blocked_outputs.*` and downstream Bayesian/model/economic/UI/route/schema/
persistence/export/live-connector feeds remain false.

The state model must not emit `reviewed_source_evidence_hash`,
`source_evidence_hash`, or `evidence_satisfied`.

## UI Language Policy

UI may use language such as:

```text
planning input
review only
held
needs reviewer action
aggregate-only refs
model review remains blocked
```

UI must not render raw state tokens directly as customer-facing interpretation.
UI must not imply:

```text
posterior interpretation
confidence or probability output
ROI, finance, economic output, causality, or productivity
customer-facing economic output
individual or team scoring
success or failure
raw rows, identifiers, query text, prompts, transcripts, or person-level data
live connectors, routes, schemas, persistence, or exports
```

## Verification

Focused verification:

```bash
npm run test:ai-value-measurement-journey-state-model
```

Bounded slice verification also runs the upstream contract tests, docs sweep,
V1 governance gates, semantic drift guard, and diff check.
