# Design: Bayesian AI Value Evidence Model Family

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
model families or must HOLD.

## Goals

- Preserve the current DiD proof harness as
  `comparison_supported_bayesian_did_module`.
- Establish `bayesian_ai_value_and_behavioral_evidence_model_family` as the
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
bayesian_ai_value_and_behavioral_evidence_model_family
```

Treat these as conceptual architecture components only:

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

## Routing Principles

- `TWO_GROUP_PRE_POST_COMPARISON` may route to the current DiD module when all
  gates pass.
- `MATCHED_COMPARISON` may route to DiD only when matching still yields a true
  two-group pre/post design.
- `STAGGERED_ROLLOUT` must HOLD under the current implementation until true
  event-time, calendar-time, and not-yet-treated logic exists and is
  calibrated.
- `HISTORICAL_STATE_SPACE` and `REPEATED_PRE_POST` require future longitudinal
  models.
- `BASELINE_ONLY` must not produce contribution confidence.
- `CONTROLLED_TEST` requires explicit approved design and validation before any
  stronger interpretation.

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
Blueprint target values must not be used as priors.

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

Phase 0 records the audit and decision. Later phases may introduce docs-first
contract hardening, then a first longitudinal synthetic prototype, then
replicated validation. Runtime implementation requires its own approved
OpenSpec work.

## Rollback

Rollback is deleting this OpenSpec change and the docs-only decision record.
No runtime behavior changes.
