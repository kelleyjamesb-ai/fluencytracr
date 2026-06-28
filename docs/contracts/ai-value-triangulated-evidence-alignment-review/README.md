# AI Value Triangulated Evidence Alignment Review

Validator/runner:
`scripts/run_ai_value_triangulated_evidence_alignment_review.mjs`

Schema version:
`FT_AI_VALUE_TRIANGULATED_EVIDENCE_ALIGNMENT_REVIEW_2026_06`

## Purpose

The Triangulated Evidence Alignment Review is an internal-only,
aggregate-only, source-ref-only review object for directional posture across
three reviewer-owned aggregate evidence-stream refs:

```text
SED / AI Fluency Instrument = stated aggregate evidence
VBD = observed aggregate behavioral evidence
Operational or business metric = downstream aggregate outcome evidence
```

It answers:

```text
Do explicitly supplied reviewer-owned aggregate SED, VBD, and outcome source
refs share the same governed Blueprint hypothesis, cohort, workflow/function,
prioritized use case, selected metric context, and observation window, and does
the reviewer classify their source-ref alignment posture for internal review?
```

It does not answer:

```text
Are Bayesian convergence diagnostics satisfied?
Is diagnostics sufficiency satisfied?
Is evidence globally satisfied?
Is Bayesian/model review ready?
Is promotion allowed?
Can posterior interpretation, confidence, probability, customer-facing,
economic, ROI, finance, causality, productivity, route, UI, schema,
persistence, export, live connector, raw-row, query, prompt, transcript,
identifier, person-level, individual-scoring, or team-scoring behavior be
created?
```

## States

```text
ALIGNED_FOR_REVIEW
DIVERGENT_FOR_REVIEW
PARTIAL_ALIGNMENT_FOR_REVIEW
HOLD_FOR_GOVERNED_EVIDENCE
```

The three review states are descriptive internal source-ref postures only. They
are not governed evidence-content validation, Bayesian convergence diagnostics,
diagnostics sufficiency, causal proof, model adequacy, confidence, probability,
ROI, productivity, or promotion.

Default behavior is fail closed:

```text
triangulated_evidence_alignment_review_state=HOLD_FOR_GOVERNED_EVIDENCE
alignment_review_hash=null
reviewed_source_evidence_hash=null
source_evidence_hash=null
convergence_diagnostics_satisfied=false
diagnostics_sufficiency_satisfied=false
promotion_authorized=false
```

## Required Inputs

The reviewer-owned source package must supply scalar strings for:

```text
reviewer_owned_triangulated_evidence_alignment_ref
reviewer_owned_triangulated_evidence_alignment_hash
source_blueprint_hypothesis_ref
source_comparison_design_adequacy_review_hash
source_sed_aggregate_evidence_ref
source_sed_aggregate_evidence_hash
source_vbd_aggregate_evidence_ref
source_vbd_aggregate_evidence_hash
source_outcome_metric_aggregate_evidence_ref
source_outcome_metric_aggregate_evidence_hash
observation_window_ref
cohort_ref
workflow_function_ref
prioritized_use_case_ref
metric_ref
source_sed_* context refs
source_vbd_* context refs
source_outcome_* context refs
source_sed_evidence_status
source_vbd_evidence_status
source_outcome_evidence_status
reviewer_role_ref
alignment_review_decision
alignment_review_notes
boundary_checks_clear
reviewer_attestations_complete
aggregate_only_scope
placeholder_evidence
generated_fixture_evidence
```

The source comparison-design adequacy review must be present and hash-bound.
It must be ready only for the one `comparison_design_adequacy` dimension and
must keep all downstream feeds and promotion/boundary authorization fields
false.

Self-consistent alignment report hashes alone are not enough. Ready validation
requires the original reviewer-owned triangulated alignment source object and
the source Comparison Design Adequacy Evidence Review object.

## Ready Requirements

The review may emit one of the three ready review states only when:

- comparison-design adequacy review hash is present and valid;
- SED aggregate evidence ref/hash is present, reviewer-owned, current, and
  aggregate-only;
- VBD aggregate evidence ref/hash is present, reviewer-owned, current, and
  aggregate-only;
- outcome metric aggregate evidence ref/hash is present, reviewer-owned,
  current, and aggregate-only;
- SED, VBD, and outcome refs align to the same Blueprint hypothesis, cohort,
  workflow/function, prioritized use case, selected metric context, and
  observation window;
- evidence statuses are all `CLEAR`;
- boundary checks are `CLEAR`;
- reviewer attestations are complete;
- aggregate-only scope is explicit;
- placeholder and generated fixture evidence are explicitly `NO`.

When ready, the object may emit:

```text
alignment_review_hash=<source-bound review hash>
triangulated_evidence_alignment_review_state=<ALIGNED_FOR_REVIEW | DIVERGENT_FOR_REVIEW | PARTIAL_ALIGNMENT_FOR_REVIEW>
```

It must still emit:

```text
reviewed_source_evidence_hash=null
source_evidence_hash=null
convergence_diagnostics_satisfied=false
diagnostics_sufficiency_satisfied=false
bayesian_readiness_authorized=false
promotion_authorized=false
```

It must not emit a global `evidence_satisfied` field.

## Hold Requirements

The review must hold if any required ref/hash is missing, non-scalar, stale,
unsafe, suppressed, missing, held, person-level, raw, fixture-derived,
template-derived, runtime-derived, generated, or not reviewer-owned.

The review must also hold if any evidence stream does not match the governed
Blueprint hypothesis, cohort, workflow/function, prioritized use case, selected
metric context, and observation window.

Held output must not emit an alignment review hash, reviewed source evidence
hash, source evidence hash, convergence diagnostics satisfaction, diagnostics
sufficiency satisfaction, Bayesian readiness, promotion, or global evidence
satisfaction.

## Non-Authorization

All of these remain false:

```text
convergence_diagnostics_satisfied=false
diagnostics_sufficiency_satisfied=false
bayesian_readiness_authorized=false
promotion_authorized=false
posterior_interpretation_authorized=false
confidence_probability_authorized=false
customer_economic_output_authorized=false
blocked_outputs.*=false
feeds.*=false
```

This review is source-ref posture only. It creates no route, UI, schema,
persistence, export, live connector, raw row intake, SQL/query-text intake,
prompt/transcript intake, identifier intake, person-level output, individual
scoring, team scoring, posterior interpretation, confidence/probability output,
ROI, finance, causality, productivity, or customer-facing economic output.

## Validation

Run:

```bash
npm run test:ai-value-triangulated-evidence-alignment-review
```
