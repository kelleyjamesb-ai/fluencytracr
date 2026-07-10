# Design: Bayesian AI Value Realization And Human Transformation Model Family

## Context

The existing proof harness is a strong specialized module. It uses PyMC and
ArviZ to fit a hierarchical Bayesian difference-in-differences model over
synthetic aggregate Measurement Cell windows. It validates artifacts through
the TypeScript confidence-engine boundary and keeps customer, probability,
confidence, finance, ROI, causality, productivity, routes, UI, persistence,
exports, and live connectors blocked.

The architectural issue is not that DiD is invalid. The issue is that DiD is
too narrow to be the universal statistical architecture for FluencyTracr value
evidence. Baseline-only, repeated pre/post, staggered rollout, historical
state-space, and broader longitudinal behavioral trajectories need different
approved modules within the single canonical family or must HOLD.

## Goals

- Preserve the current DiD proof harness as
  `comparison_supported_bayesian_did_module`.
- Establish `bayesian_ai_value_realization_and_human_transformation_model_family` as the
  canonical architecture name.
- Separate fluency, VBD, primary customer metric, mechanism evidence,
  guardrails, and finance pathway assumptions.
- Define evidence-design routing vocabulary without implementing a router.
- Keep unsupported evidence designs fail-closed.

## Non-Goals

- No runtime model family implementation.
- No router implementation.
- No schema, endpoint, UI, persistence, export, migration, or connector work.
- No customer-facing confidence or probability output.
- No ROI proof, productivity measurement, finance output, or causality claim.
- No task-completion claim for the existing Bayesian DiD proof harness.

## Decision

Adopt the model-family name:

```text
bayesian_ai_value_realization_and_human_transformation_model_family
```

This is the single canonical Bayesian architecture family name. "Human
transformation" means aggregate work-pattern and capability-change context
only. It does not authorize HR analytics, individual scoring, employee
productivity measurement, manager/team ranking, person-level fields, runtime
model execution, production schemas, customer-facing confidence/probability
output, ROI proof, finance output, causality claims, or economic output.

Treat these as conceptual architecture components only:

- `first_longitudinal_synthetic_model_slice`
- `bayesian_fluency_measurement_model`
- `bayesian_vbd_behavioral_trajectory_model`
- `bayesian_hypothesis_outcome_model`
- `bayesian_economic_value_model`
- `posterior_pathway_coherence_review`
- `evidence_design_claim_cap`
- `enterprise_hypothesis_portfolio`

Treat the current DiD implementation as:

```text
comparison_supported_bayesian_did_module
```

It may be routed only from evidence designs that truly satisfy two-group
pre/post comparison assumptions and all comparison adequacy gates.

## Phase 2A Slice Selection

Phase 2A selects `first_longitudinal_synthetic_model_slice` as a docs-only
candidate for a later approved Phase 2B proposal. The candidate is bounded to
one approved hypothesis, one approved primary continuous normal outcome,
aggregate Measurement Cell windows, multiple time windows, baseline AI Fluency
context, separate lagged Velocity, Breadth, and Depth exposures, function or
workflow partial pooling, explicit time trend, known aggregate observation
uncertainty, synthetic-only inputs, and internal validation/review inputs only.

The selected slice is not implemented in this change. It creates no runtime
model code, router, TypeScript schema, artifact schema, endpoint, UI,
persistence, export, migration, connector read, real/customer/live data
authorization, customer-facing confidence/probability output, ROI proof,
productivity measurement, finance output, economic output, causality claim,
promotion decision, new canonical event, new suppression reason, tunable
threshold, or admin override.

The rationale for selecting this slice first is that it tests the broader
longitudinal model-family shape without forcing non-DiD evidence into the
current two-group pre/post DiD module. It keeps VBD dimensions separate,
treats baseline AI Fluency as context/moderator evidence rather than observed
behavior, treats retest Fluency as co-evidence rather than a same-window causal
driver, and keeps the approved primary outcome movement as the principal
business-outcome estimand.

Staggered rollout remains unsupported by both the current DiD module and the
Phase 2A slice. Any staggered-rollout interpretation must HOLD until a later
approved proposal implements, calibrates, and validates true event-time,
calendar-time, adoption-time, and not-yet-treated comparison logic.

## Routing Principles

- `TWO_GROUP_PRE_POST_COMPARISON` is contract-eligible for the current DiD
  module when all gates pass.
- `MATCHED_COMPARISON` is contract-eligible for DiD only when matching still
  yields a true two-group pre/post design.
- `STAGGERED_ROLLOUT` must HOLD under the current implementation until true
  event-time, calendar-time, adoption-time, and not-yet-treated logic exists
  and is calibrated.
- `HISTORICAL_STATE_SPACE` and `REPEATED_PRE_POST` require future longitudinal
  models.
- `BASELINE_ONLY` must not produce contribution confidence.
- `CONTROLLED_TEST` requires explicit approved design and validation before any
  stronger interpretation.
- Economic assumptions, finance pathway refs, Blueprint promises, sponsor
  goals, and target values cannot upgrade design strength or claim caps.
- Claim caps apply after statistical estimation and before interpretation, so a
  narrow posterior interval under a weak evidence design cannot create a
  stronger claim than the design allows.

## Hypothesis Measurement Plan

Future routing should be governed by a Hypothesis Measurement Plan. The plan
names the hypothesis, workflow, cohort, primary metric, supporting metrics,
guardrails, evidence design, expected lags, source references, non-personal
role/group/process owner references, minimum worthwhile change, confounders,
finance pathway reference, and approval state.

The approved primary metric is the principal business-outcome estimand.
Supporting metrics are mechanism evidence. Guardrail metrics test risk,
quality, or unintended consequences. Metrics must not be blended into an
arbitrary fixed weighted score.
Blueprint target values, sales promises, minimum worthwhile change, OKRs,
sponsor goals, desired outcomes, and finance assumptions must not be used as
priors, likelihood anchors, calibration targets, posterior eligibility
thresholds, or claim-cap upgrades.

## Pathway Coherence And Claim Cap

`posterior_pathway_coherence_review` is an internal future review concept. It
may review whether the predeclared theory of change is directionally coherent
across relevant Fluency evidence, expected VBD behavior, and primary business
outcome movement. It is not causal probability, ROI proof, productivity proof,
probability that Glean caused the outcome, customer-facing confidence, or an
economic output.

`evidence_design_claim_cap` caps interpretation by the approved evidence
design after estimation. Unsupported designs HOLD, and finance assumptions
cannot upgrade a weak design.

## Risks

- Risk: the model-family name is mistaken for implemented runtime support.
  Mitigation: every document states that components are architecture concepts
  until future proposals implement them.
- Risk: staggered rollout is interpreted as already covered by the current
  DiD proof harness. Mitigation: the decision record and spec require HOLD for
  staggered rollout under the current implementation.
- Risk: economic model language is read as ROI proof. Mitigation:
  `bayesian_economic_value_model` is future internal architecture only and
  cannot emit ROI, finance output, customer-facing economic output, causality,
  or productivity claims.
- Risk: multi-metric plans collapse into one arbitrary index. Mitigation: one
  approved primary metric is the principal estimand; supporting metrics and
  guardrails have separate roles.
- Risk: Blueprint target values are mistaken for prior evidence. Mitigation:
  target values may express direction, lag, and minimum worthwhile change, but
  must not become prior parameters.

## Migration Plan

Phase 0 records the audit and decision. Phase 1 records docs-first contract
hardening and router vocabulary. Phase 2A selects and specifies
`first_longitudinal_synthetic_model_slice` as a docs-only candidate. Phase 2B
may later implement a first longitudinal synthetic prototype in an isolated
synthetic-only path after approval. Phase 3 may later run replicated
calibration, null, floor, and negative-control validation after the prototype
exists. Runtime implementation requires its own approved OpenSpec work.

## Rollback

Rollback is deleting this OpenSpec change and the docs-only decision record.
No runtime behavior changes.
