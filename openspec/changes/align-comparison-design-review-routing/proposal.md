# Change: Align comparison-design review routing

## Why

Natural-language requests to compare cohorts, review pre/post structure, assess
matching, or evaluate whether a design could fit DiD can be misread as model
execution requests. The model-family contract needs an explicit docs-only map
to the existing reviewer-owned comparison-design collection and adequacy-review
chain without creating a new trigger or changing the incomplete DiD proof.

## Approval

James Kelley approved this bounded docs-only change on 2026-07-10 through the
current user directive.

## What Changes

- Document the existing comparison-design review prerequisites when a
  natural-language comparison request is received, without invoking a selector
  or setting `evidence_design`.
- Preserve the existing preparation-binding prerequisite, collection states,
  and fail-closed held behavior.
- Advance only a collected reviewer-owned source package through the existing
  `run_comparison_design_adequacy_evidence_review_only` selector.
- Clarify that a qualifying one-dimension adequacy review may support a later
  human reprioritization decision but cannot execute or modify DiD.
- Keep the Bayesian DiD proof explicitly incomplete.

## What Does Not Change

- No new schemas, tokens, selectors, suppression reasons, code, parser,
  normalization, runtime triggers, model selection, or model execution.
- No DiD implementation, calibration, artifact, task-status, or completion
  change.
- No customer output or real/customer/live data authorization.
- No routes, UI, persistence, exports, migrations, or connector behavior.
- No promotion, posterior interpretation, confidence, probability, ROI,
  finance, causality, productivity, or economic-output authorization.

## Impact

- Affected specs:
  `bayesian-ai-value-realization-and-human-transformation-model-family`.
- Affected docs:
  `docs/contracts/bayesian-ai-value-realization-and-human-transformation-model-family/README.md`.
- Affected code: none.
