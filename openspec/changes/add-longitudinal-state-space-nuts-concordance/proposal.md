# Change: Add Longitudinal State-Space And NUTS Concordance

## Why

The current longitudinal V2 artifact is an intentionally nonauthorizing
closed-form smoke regression. It does not model the declared AR(1) state,
partial pooling, sampler diagnostics, posterior predictive checks, or
cross-engine agreement required before replicated longitudinal validation can
begin.

## What Changes

- Add a separate synthetic-only internal validation artifact for the
  longitudinal Gaussian state-space model. The smoke V1/V2 artifacts remain
  unchanged.
- Implement a deterministic Gaussian state-space integration engine and a
  PyMC NUTS reference engine for the same likelihood, priors, standardization,
  zero-sum panel-group effects, and estimands.
- Implement fixed concordance and sampler gates for five seeds in each cell of
  effects `{0, 0.2, 0.5}` SD by panel-group counts `{6, 12}`.
- Make every missing, incomplete, off-plan, sampler-failing, PPC-failing, or
  cross-engine-discordant result HOLD.
- Add a strict TypeScript validation bridge for the new artifact without
  changing DiD or longitudinal smoke schemas.

No real, customer, production, or live data is admitted. This change adds no
route, UI, persistence, export, connector, customer-facing readout,
confidence/probability output, ROI, causality, productivity measurement,
canonical event, suppression reason, tunable threshold, or promotion
decision.

## Impact

- Affected specs:
  `bayesian-ai-value-realization-and-human-transformation-model-family`
- Affected code: `inference/`, `packages/confidence-engine/src/`,
  `packages/confidence-engine/test/`, and documentation/status files after
  verification
- Compatibility: additive internal artifact only; existing DiD and
  longitudinal smoke artifacts remain byte- and behavior-compatible

## Approval

The decision owner approved implementation of the Longitudinal Bayesian Proof
Roadmap and explicitly activated this bounded queue item on 2026-07-12.
