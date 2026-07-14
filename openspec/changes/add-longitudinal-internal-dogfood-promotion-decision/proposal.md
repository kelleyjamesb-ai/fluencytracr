# Change: Record The Longitudinal Internal-Dogfood Promotion Decision

## Why

The longitudinal Gaussian state-space model has an accepted synthetic proof,
but its acceptance record deliberately leaves promotion unset and holds for
measurement-model calibration, trajectory-model calibration, and real-data
governance. A separate decision is required to define whether that exact model
may advance toward bounded Glean-internal dogfood use without implying that
execution, reporting, or customer use is available now.

## What Changes

- Record `CONDITIONAL_PROMOTION_TO_BOUNDED_INTERNAL_DOGFOOD` for one exact
  `HISTORICAL_STATE_SPACE` model path.
- Keep the effective execution state
  `HOLD_PENDING_LONGITUDINAL_DOGFOOD_PREREQUISITES` until every named
  prerequisite is separately completed and hash bound.
- Define the restricted internal audience and method-review purpose.
- Require AI Fluency measurement-model calibration, VBD trajectory-model
  calibration, real-data admission and source binding, runtime monitoring and
  fail-closed behavior, approved readout/HOLD language, a frozen non-activating
  pilot manifest, and a later explicit human real-data execution decision
  before activation.
- Preserve all blocked outputs and explicitly exclude DiD, repeated-pre/post,
  customer, production, UI, route, persistence, connector, and economic scope.
- Clarify that this decision is not the customer-facing promotion contemplated
  by the confidence-inference methodology and does not complete OpenSpec tasks
  `5.5` through `5.8`.

## Impact

- Affected capability:
  `bayesian-ai-value-realization-and-human-transformation-model-family`
- Affected docs:
  `docs/contracts/ai-value-longitudinal-internal-dogfood-promotion-decision/README.md`,
  the model-family contract, the hypothesis/metric longitudinal-admission
  contract, and the confidence-inference methodology contract
- Affected code: none
- No schemas, runtime behavior, routes, UI, persistence, connectors, exports,
  real data, customer output, confidence/probability output, ROI, causality,
  productivity, finance output, canonical events, suppression reasons,
  thresholds, or DiD implementation are added or changed.
