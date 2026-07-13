# Design: Hypothesis and metric longitudinal admission boundary

## Design Decision

The company-facing planning model and the statistical execution unit are
different grains:

```text
enterprise
-> hypothesis portfolio
-> reusable company metric catalog
-> approved Hypothesis Measurement Plan
-> one immutable primary-metric analysis unit
-> current model-family eligibility review
```

The catalog has no arbitrary count cap. Statistical review remains bounded to
one primary outcome metric per analysis unit so the estimand, likelihood,
uncertainty, windows, and claim cap stay inspectable.

## Immutable Analysis Unit

The conceptual identity is:

```text
analysis_family_id
x hypothesis_id
x hypothesis_plan_hash
x primary_metric_id
x metric_definition_ref
x metric_definition_hash
x ordered_panel_group_manifest_hash
x per-panel canonical-slice, cohort, window, gate-receipt,
  and per-window k bindings
x predeclared_outcome_lag
x expected_metric_direction
x evidence_design
x predeclared_claim_cap
x model_specification_hash
x control_set_hash
x Velocity/Breadth source hashes
x baseline-Fluency snapshot and definition source hashes
x evidence dependency keys
x predeclared fit key
x plan-freeze timestamp and outcome-access receipt hash
x fixed terminal look
```

Every element is registered, timestamped, and source/hash bound before any
post-baseline outcome access. The receipt must attest exactly that no
post-baseline outcome was accessed before freeze; missing, unknown, true,
hash-invalid, stale, or chronologically inconsistent posture HOLDS. Changing
any element creates a different off-plan unit; it cannot rewrite or rescue an
existing result. Retrospective or outcome-informed units do not satisfy
admission.

Each panel group maps one-to-one to one canonical
`(workflow_id, jbtd_id, persona_id)` tuple and carries independently passing
per-window gate receipts. The fixed state-space model may partially pool only
the 6 or 12 independently cleared aggregate panel groups in its accepted
envelope. A panel group cannot combine tuples, raw evidence is never pooled
across slices, and another group's volume cannot rescue a held slice.

Evidence reuse and fit reuse are separate. Deterministic
`evidence_dependency_key` values bind shared planned source commitments without
claiming future outcome values are known. A predeclared `fit_key` binds the
planned statistical inputs and model specification. A completed result binds
actual source-content hashes inside `prepared_input_hash` and then binds that
hash plus `fit_summary_hash` into `fit_result_binding_hash`; duplicate
evidence-content, prepared-input, or fit-summary hashes never become
independent corroboration. Pre-fit HOLD records retain their planned keys and
explicit null fit hashes.

## Open Intake, Closed Eligibility

Companies may register metrics that differ by workflow, business process,
source system, unit, or outcome family. Registration does not imply the metric
can enter the longitudinal model.

The current proved specification accepts only the internal
`continuous_normal_identity` family with finite aggregate observations, known
positive aggregate standard errors, complete balanced ordered panels, approved
aggregate controls, and every existing structural and diagnostic gate.
Counts, proportions, rates with unsupported variance treatment, bounded or
ordinal scores, time-to-event outcomes, zero-inflated outcomes, financial
translations, and unknown families remain outside current eligibility.

The accepted replicated envelope is narrower than mathematical fit support: 12
pre windows, 6 post windows, panel-group counts of 6 or 12, and aggregate
`k=16`. Other panel shapes or metric sampling distributions remain outside the
proved envelope. Current planning/readiness states and the three-library
recommendation allowlist do not establish longitudinal admission.

## Evidence Roles

- The primary metric is the business-outcome estimand.
- Supporting metrics provide mechanism context only.
- Guardrail metrics may cap or block interpretation but cannot strengthen it.
- Baseline AI Fluency is aggregate context; retest Fluency is co-evidence.
- Velocity and Breadth remain separate lagged exposures.
- Depth remains aggregate pathway context outside the proved likelihood.
- Controls are predeclared and source-bound; post-treatment controls and
  colliders are prohibited.

No role may silently substitute for another, and metrics are not combined into
one composite.

## Portfolio Accountability

The accepted synthetic null rate is a per-cell model-validation result, not an
enterprise-wide false-claim guarantee. A future portfolio runner must freeze
and hash the planned unit manifest before post-baseline outcome access, declare
shared metric/cohort/evidence/fit dependencies, and enforce exact set equality
between planned units and stable ordered result or explicit HOLD records. Missing,
duplicate, off-plan, selectively omitted, or post-outcome-edited units fail the
portfolio review. One fixed terminal look is allowed; no sequential procedure
is implemented. Portfolio inference remains HOLD, and no cross-hypothesis
probability, confidence rating, or index is created by this contract.

## Interpretation Boundary

Existing `selected_metric_movement` remains descriptive customer-owned
baseline/comparison context, and existing `outcome_movement_state` remains a
reporting state for aggregate movement refs.

The implementation quantity `longitudinal_movement` is different. It is a
direction-adjusted associational Velocity/Breadth-outcome contrast in
pre-period outcome standard-deviation units, conditional on trend, approved
controls, group effects, and AR(1) structure. It is not raw KPI movement,
original-unit change, counterfactual impact, or AI attribution.

`evidence_design_claim_cap` remains the existing categorical governance cap. It
is derived from the evidence design and frozen before outcome access, then
enforced after estimation. Diagnostics, confounding, guardrails, and governance
may only lower it or HOLD interpretation. It cannot be upgraded by a narrow
interval, multiple aligned metrics, AI Fluency movement, telemetry movement,
finance context, or a desired target. No numeric
`ai_attribution_confidence` is authorized.

## Non-Authorization

This design adds documentation only. It does not authorize runtime code,
schemas, model execution, real data, customer output, confidence/probability,
causality, ROI, productivity, finance, HR analytics, ranking, persistence,
routes, UI, exports, connectors, promotion, new canonical events, new
suppression reasons, tunable thresholds, or admin overrides.
