# Change: Harden longitudinal smoke proof boundary

## Why

The first longitudinal synthetic prototype proves basic plumbing, but its
artifact can currently bind a fit from one synthetic dataset to another and
uses model/diagnostic labels that overstate what the closed-form smoke path
actually executed. That boundary must be truthful before state-space, NUTS, or
replicated validation work begins.

## Approval

James Kelley approved this bounded prerequisite on 2026-07-10 through the
directive to implement the Longitudinal Bayesian Proof Roadmap.

## What Changes

- Add strict structural validation before longitudinal fitting or emission.
- Bind dataset, fit, diagnostics, and artifact through deterministic hashes.
- Add a V2 internal smoke artifact while retaining V1 read compatibility.
- Pin the V2 model to the literal closed-form analytic smoke implementation.
- Make every non-HOLD V2 artifact nonauthorizing.
- Mark sampler, posterior predictive, prior-sensitivity, and full
  counterfactual-stability checks as not run.
- Reject rehashed model, route, diagnostic, source, or authorization forgeries
  at the TypeScript bridge.

## What Does Not Change

- No state-space engine, NUTS proof, replicated calibration, null study, lag
  recovery, common-shock robustness proof, or promotion decision.
- No DiD implementation, artifact, diagnostic, acceptance, or task change.
- No real/customer/live/production data, routes, UI, persistence, exports,
  connectors, customer output, confidence/probability output, ROI, finance,
  causality, productivity, or economic output.
- No new canonical events, suppression reasons, tunable thresholds, or admin
  overrides.

## Impact

- Affected capability:
  `bayesian-ai-value-realization-and-human-transformation-model-family`.
- Affected code: longitudinal inference smoke modules and their internal
  confidence-engine bridge only.
