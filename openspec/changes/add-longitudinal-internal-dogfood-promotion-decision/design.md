## Context

The accepted longitudinal evidence proves one synthetic Gaussian state-space
specification. It does not prove that Glean-internal aggregate sources satisfy
that specification, and it does not provide an execution, monitoring, or
readout contract. The accepted review record explicitly holds for separate AI
Fluency measurement-model and VBD trajectory-model calibration.

The word "promotion" is therefore split into a conditional scope decision and
an effective execution state. This prevents a docs-only decision from being
read as a runtime authorization.

## Goals / Non-Goals

### Goals

- Select one exact model path for future bounded internal dogfood hardening.
- Bind that path to the accepted synthetic evidence bytes and model identity.
- Define a conjunctive prerequisite chain and fail-closed current state.
- Define a restricted internal audience, purpose, and blocked outputs.
- Preserve the current incomplete state of tasks `5.5` through `5.8`.

### Non-Goals

- Execute the model on real, live, customer, production, or internal data.
- Create data admission, source binding, runtime monitoring, or readout logic.
- Create schemas, routes, UI, persistence, connectors, exports, or APIs.
- Authorize confidence/probability language, AI-impact attribution, ROI,
  causality, productivity, finance, or customer-facing output.
- Resume or promote the Bayesian DiD module.

## Decisions

### Decision: Select One Historical State-Space Path

The conditional decision applies only to:

```text
evidence_design=HISTORICAL_STATE_SPACE
artifact.model_family=bayesian_ai_value_realization_and_human_transformation_model_family
artifact.model_slice=longitudinal_state_space_replicated_validation
artifact.model_specification.model_kind=gaussian_longitudinal_zero_sum_ar1_state_space
artifact.model_specification.likelihood_family=continuous_normal_identity
artifact.model_specification.link_function=identity
```

The artifact slice is the accepted validation implementation under the
conceptual model-family component `first_longitudinal_synthetic_model_slice`.
That conceptual label is not an alternate artifact `model_slice` value.

`REPEATED_PRE_POST`, `comparison_supported_bayesian_did_module`, controlled
tests, staggered rollouts, unsupported likelihoods, and economic models are not
included.

### Decision: Promotion Is Conditional And Execution Remains Held

The decision token is:

```text
CONDITIONAL_PROMOTION_TO_BOUNDED_INTERNAL_DOGFOOD
```

The simultaneous effective state is:

```text
HOLD_PENDING_LONGITUDINAL_DOGFOOD_PREREQUISITES
```

Only separate docs/OpenSpec prerequisite proposals may proceed under this
decision. Each proposal still requires its own approval before implementation.
No implementation may infer that a future prerequisite passed merely because a
document, field, schema, fixture, or synthetic artifact exists. A frozen pilot
manifest is evidence for a later explicit, human-approved real-data execution
decision; it cannot activate itself.

### Decision: Prerequisites Are Conjunctive

The following remain mandatory:

1. Accepted synthetic proof identity remains hash valid.
2. AI Fluency measurement-model calibration is completed and accepted.
3. VBD trajectory-model calibration is completed and accepted.
4. A separate real-data admission and source-binding contract admits only the
   exact aggregate Glean-internal inputs required by the model.
5. A separate runtime-monitoring contract proves fail-closed behavior and
   immutable input, fit, diagnostic, and execution bindings.
6. A separate readout-language/HOLD contract defines what restricted reviewers
   may see and prohibits unsupported interpretation.
7. A frozen pilot manifest records the exact analysis units, non-personal role
   refs, source hashes, prerequisite hashes, and pre-outcome access posture.
8. A separate human-approved real-data execution decision binds the exact
   manifest and every passing prerequisite before access, preparation, fitting,
   or artifact emission.

Missing, stale, malformed, conflicting, failed, or unreviewed prerequisites
keep the pathway held. There is no partial activation or administrative
override.

The accepted aggregate `k=16` value records replicated synthetic proof
coverage. This docs-only decision does not compile, configure, or authorize a
dogfood runtime threshold. A later admission and execution decision must
reconcile the exact aggregate floor with the proved envelope and existing
invariants; it cannot treat the separate floor controls as replicated
calibration.

### Decision: Purpose Is Method Review, Not Impact Reporting

The future bounded dogfood purpose is to test source admission, model adequacy,
diagnostics, and HOLD behavior on approved aggregate Glean-internal evidence.
It is not to state that AI caused a metric change, produce a confidence or
probability claim, calculate ROI, measure productivity, or create a customer or
executive readout.

This decision authorizes no posterior or derived model-result output, including
summaries, intervals, coefficients, direction, magnitude, diagnostics-derived
claims, raw draws, or execution artifacts. Any later restricted-review fields
must be separately specified and approved without inheriting authorization from
this decision.

## Risks / Trade-offs

- **Promotion may be mistaken for current authorization.** Mitigation: record
  the conditional decision and effective HOLD state together everywhere.
- **Synthetic acceptance may be treated as real-data validation.** Mitigation:
  require separate admission, source binding, measurement calibration,
  trajectory calibration, and runtime monitoring.
- **The broader model-family vocabulary may widen the first pilot.**
  Mitigation: admit only `HISTORICAL_STATE_SPACE` and name excluded routes.
- **Internal results may drift into customer or economic claims.** Mitigation:
  block all readout and output lanes until a separate language contract, while
  keeping customer, confidence/probability, causal, productivity, ROI, and
  finance lanes prohibited by this decision.
- **A pilot manifest may be mistaken for execution authority.** Mitigation:
  require a later explicit human real-data execution decision; the manifest is
  a bound input to that decision only.

## Migration Plan

No migration exists because this change is documentation only. Later work must
arrive as separate OpenSpec changes in prerequisite order. The current state
remains HOLD if any later proposal is absent, incomplete, invalid, or rejected.

## Open Questions

None in this slice. The future admission contract must identify the exact
Glean-internal aggregate sources and the future readout contract must select
the permitted restricted-review language.
