# Change: Harden hypothesis and metric admission for longitudinal analysis

## Why

The longitudinal state-space model has completed synthetic validation, but the
product path still lacks a precise boundary between a company's hypotheses and
metric catalog and the one fixed model specification that was actually proved.
Companies may define different aggregate metrics and may investigate multiple
hypotheses. That flexibility must not become automatic model eligibility,
metric-family coercion, result shopping, or a customer-facing claim that AI
caused an observed movement.

## Approval

James Kelley approved this bounded docs/OpenSpec change on 2026-07-13 through
the current directive to proceed with the single longitudinal Bayesian path,
support multiple company hypotheses, and avoid a fixed metric-count limit.

## What Changes

- Define a company metric catalog with no arbitrary product-level count cap.
- Bind each model-review unit to one approved hypothesis and exactly one
  versioned primary metric definition.
- Define the immutable analysis-unit identity across hypothesis, metric
  definition ref/hash, an ordered one-tuple-per-panel manifest and independent
  gate receipts, cohort/windows, lag, direction, evidence design/claim cap,
  model/control/exposure/baseline-Fluency hashes, dependency keys, a hash-bound
  pre-outcome access receipt, and one fixed terminal look.
- Keep open metric intake separate from current model eligibility.
- Limit current synthetic longitudinal eligibility to the exact proved
  continuous-normal identity aggregate outcome family with known positive
  uncertainty and all existing structural and diagnostic gates.
- Require complete planned-unit accounting and dependency declarations when an
  enterprise reviews multiple hypotheses or reuses metrics/cohorts.
- Separate shared-evidence identity from shared-fit identity and bind completed
  results to prepared-input and fit-summary hashes.
- Reconcile the exact `continuous_normal_identity` token and accepted
  state-space/NUTS/replicated-validation status in canonical contract metadata.
- Separate descriptive `selected_metric_movement`, the standardized
  associational `longitudinal_movement` contrast, reporting
  `outcome_movement_state`, and the prebound categorical evidence-design claim
  cap.

## What Does Not Change

- No new model, likelihood, model selection, model fitting, runtime router,
  production schema, artifact schema, route, UI, persistence, export,
  migration, connector, or real/customer/live data path.
- No customer-facing confidence, probability, attribution, ROI, finance,
  causality, productivity, HR, ranking, or economic output.
- No fixed metric-count threshold, tunable threshold, admin override, new
  canonical event, or new canonical suppression reason.
- No expansion of the existing three-library metric-recommendation allowlist.
- AI Fluency remains aggregate readiness/context evidence; Velocity and Breadth
  remain separate behavioral exposures; Depth remains context only for the
  proved longitudinal specification.
- DiD remains isolated and incomplete.

## Impact

- Affected spec:
  `bayesian-ai-value-realization-and-human-transformation-model-family`.
- Affected docs:
  - `README.md`
  - `docs/contracts/ai-value-hypothesis-metric-longitudinal-admission/README.md`
  - `docs/contracts/bayesian-ai-value-realization-and-human-transformation-model-family/README.md`
- Affected metadata:
  - `docs/contracts/ai-value-formula-registry/formula-registry.json`
  - `docs/contracts/ai-value-formula-registry/README.md`
- Affected contract test:
  - `scripts/validate_ai_value_formula_registry.test.mjs`
- Affected code: none.
