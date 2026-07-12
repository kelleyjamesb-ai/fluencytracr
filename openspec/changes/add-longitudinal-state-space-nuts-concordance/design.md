## Context

Longitudinal smoke V2 truthfully implements independent Gaussian analytic
regression with a post-hoc AR(1) diagnostic. The next proof boundary must model
panel-group pooling and serial residual state directly, and must demonstrate
that a deterministic primary engine agrees with an independently sampled NUTS
reference before replicated validation may run.

## Goals

- Implement the synthetic aggregate model
  `y[c,t] = X[c,t] beta + u[c] + r[c,t] + epsilon[c,t]`, with
  `r[c,t] = rho r[c,t-1] + eta[c,t]`.
- Use one canonical preparation path so both engines consume identical
  pre-period-standardized arrays and estimands.
- Produce summary-only, hash-bound, environment-bound, fail-closed concordance evidence.
- Preserve all existing artifact and governance behavior.

## Non-Goals

- Replicated 1,200-slot interval-coverage validation, lag/shock/floor studies,
  real-data admission, production promotion, or customer execution.
- Routes, UI, persistence, exports, connectors, customer-facing
  confidence/probability, ROI, causality, productivity, finance output, or
  minimum-worthwhile-change thresholding.

## Model Decision

- Standardize the outcome, known aggregate SE, time, Velocity, Breadth,
  baseline Fluency context, and approved controls using pre-period rows only.
- Include distinct Velocity and Breadth coefficients. Baseline Fluency remains
  aggregate context. Depth is bound as context but is excluded from the
  likelihood and estimands.
- Represent panel-group effects in a `C-1` orthonormal zero-sum basis.
- Use known aggregate observation SE, a stationary AR(1) latent state with
  innovation scale, and no additional observation-scale parameter.
- Use `Normal(0, 1)` priors for standardized fixed coefficients,
  `HalfNormal(1)` priors for panel-group and AR(1) innovation scales, and a
  compiled uniform bound `-0.95 < rho < 0.95`.
- Minimum worthwhile change, targets, OKRs, sponsor goals, and desired outcomes
  never enter inference or concordance.

## Primary Engine Decision

The primary engine is deterministic and Rao-Blackwellized. It integrates the
Gaussian AR(1) states, zero-sum panel-group effects, and fixed coefficients
analytically, then integrates the three covariance hyperparameters with a
compiled deterministic Sobol cubature rule. It emits no posterior draws.

The cubature rule, support, priors, and point count are compiled constants and
hash-bound, never runtime tuning controls.

## Reference Engine Decision

The reference engine is PyMC NUTS over the same prepared model. Full settings
are four chains, 1,000 retained draws, 2,000 tuning draws,
`target_accept=0.99`, and `max_treedepth=15`. Reduced settings may exercise
mechanics locally, but their artifacts MUST HOLD and cannot satisfy a full
slot.

## Concordance Plan

- Required cells: effects `{0, 0.2, 0.5}` SD by panel-group counts `{6, 12}`.
- Required seeds: five compiled seeds per cell, exactly 30 full slots.
- Required quantities: every standardized fixed coefficient, panel-group
  scale, AR(1) innovation scale, `rho`, and longitudinal movement.
- Per quantity: mean difference at most `0.15` reference posterior SD; each 80%
  endpoint difference at most `0.20` reference posterior SD; SD ratio in
  `[0.85, 1.15]`.
- NUTS: finite positive R-hat at most `1.01`, bulk/tail ESS at least `400`, zero divergences,
  zero treedepth saturation, BFMI at least `0.3`, MCSE ratio at most `0.1`.
- Every compiled PPC p-value remains in `[0.05, 0.95]`.
- Missing, duplicate, malformed, off-plan, hash-invalid, runner-error,
  sampler-failing, PPC-failing, or discordant evidence HOLDS the study.

## Artifact Decision

The new V1 concordance artifact type is separate from longitudinal smoke
V1/V2. It contains only source commitments, prepared-input hashes, engine
specifications, posterior summaries, diagnostic aggregates, concordance
operands, compiled thresholds, plan metadata, governance pins, and
hierarchical hashes. It never contains raw posterior draws or latent states.
It binds the compiled Python range, the exact `requirements.lock` hash, and the
generation runtime package manifest; compatible Python patch releases may
differ inside the compiled 3.13 range, while dependency versions remain exact.

Only the complete 30-slot full-settings study can be
`valid_internal_validation_non_authorizing`. TypeScript recomputes hashes,
manifest completeness, runtime bindings, and semantic gates. Python emission
also requires the exact registered runner study and recomputes slot hashes,
compiled order, execution modes, and study fields. Unkeyed hashes prove consistency
and drift detection, not authenticity against coordinated replacement; a
trusted signature remains separate future scope.

The generated artifact records whether the numerical concordance gate passed,
but it always keeps independent acceptance incomplete and replicated
validation blocked. A separate durable review record may unblock the next
synthetic validation PR only after CODE, BUG, and ADVERSARIAL return GO.

## Risks And Mitigations

- **Cross-engine mismatch:** HOLD; do not relax a compiled gate.
- **NUTS runtime:** reduced mechanics tests plus resumable full evidence, while
  preserving full settings as the only qualifying mode.
- **Smoke regression:** sibling modules and schemas plus V1/V2 regression
  tests.
