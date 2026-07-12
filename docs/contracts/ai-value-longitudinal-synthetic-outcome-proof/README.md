# Longitudinal Synthetic Outcome Proof

Current schema version:
`FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07_V2`

Legacy read-only schema version:
`FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07`

Python emitter: `inference/src/fluencytracr_inference/longitudinal_artifact.py`

TypeScript validator:
`packages/confidence-engine/src/longitudinalSyntheticOutcomeProof.ts`

## Purpose

This contract defines the first runtime slice for
`first_longitudinal_synthetic_model_slice`, the first non-DiD candidate inside
`bayesian_ai_value_realization_and_human_transformation_model_family`.

It is a synthetic-only smoke proof. It validates the model-input boundary,
counterfactual artifact shape, diagnostics HOLD paths, source hash binding,
and Python-to-TypeScript bridge. It is not production calibration and not a
real-data promotion.

## Implemented Scope

The proof supports:

- one approved synthetic hypothesis;
- one continuous normal identity primary metric;
- ordered aggregate pre/post windows;
- at least 8 pre-period windows and 3 post-period windows;
- clean synthetic path using 12 pre-period and 6 post-period windows;
- baseline aggregate AI Fluency context;
- separate lagged Velocity and Breadth exposures;
- Depth carried as synthetic aggregate pathway context only, not as a model
  coefficient;
- synthetic aggregate business controls;
- known aggregate standard errors;
- a closed-form Gaussian analytic smoke regression with an independent
  Gaussian likelihood;
- post-hoc AR(1) residual diagnostic posture only;
- internal-only artifact emission;
- V2 synthetic-input, fit-summary, diagnostics, self-hash, and source-hash
  consistency checks;
- V1 legacy read compatibility that cannot satisfy V2 or future proof gates.

V2 does not use NUTS, model AR(1) in the likelihood, implement partial
pooling, or produce a historical forecast. Its pre-period placebo,
posterior-predictive, sampler, prior-sensitivity-refit, and full
counterfactual-stability checks are `NOT_RUN`, never passing. Every non-HOLD
V2 result is `valid_internal_smoke_non_authorizing`.

Posterior draw shares, when present, are boxed as
`internal_draw_share_diagnostics`. They are not probability output, not
customer-facing, not causal probability, and not confidence language. The CLI
emits JSON only for internal bridge verification; no route, UI, export,
readout, or customer output is authorized.

The artifact records:

- `synthetic_smoke_only=true`;
- `replicated_calibration_complete=false`;
- `full_pathway_coherence_authorized=false`;
- all customer/probability/confidence/ROI/finance/causality/productivity output
  authorizations false;
- no promotion decision.

The hashes detect accidental drift and semantically inconsistent rebinding
inside this internal bridge. They are not a trusted signature and cannot prove
artifact authenticity against an actor who can rewrite every hash and payload
field together. Authenticity would require a separately approved trusted
signature/envelope, which this smoke slice does not add.

V2 uses hierarchical consistency commitments. The emitted input-evidence hash
and private dataset-remainder hash compose the synthetic-input root. The
emitted diagnostics-evidence hash and private fit-remainder hash compose the
diagnostics-fit root. The synthetic-input root, diagnostics-fit root, and a
fit-output evidence hash covering the posterior summary, analytic draw count,
and pathway evidence compose the final fit-summary root. Input, diagnostic, or
fit-output operands changed beneath an unchanged root reject. Replacing every
root and all of its unkeyed components remains the trusted-envelope limitation
above.

The V2 dataset contract carries no fixture `scenario` or `ground_truth` oracle
sidecars. Fixture selection stays outside model input, and synthetic truth is
not accepted by the artifact path. Seeds must be nonnegative integers within
the JavaScript-safe range, `generated_at` must be a timezone-aware RFC3339
timestamp, and business controls must use compiled synthetic control
identity/source pairs. Unknown designs and two-group DiD designs reject before
a longitudinal artifact can be emitted; known unsupported controlled, matched,
staggered, and baseline-only designs remain fail-closed HOLD controls.

## Non-Implemented Scope

This slice does not implement:

- real/customer/production/live data;
- direct Google Sheets, Apps Script, Instrument database, frontend state, or
  connector reads;
- production ingestion;
- backend routes;
- frontend UI;
- persistence;
- exports;
- customer-facing confidence/probability;
- ROI, finance output, causality, productivity, HR analytics, ranking, or
  economic output;
- full Bayesian Fluency measurement modeling;
- repeated Fluency-wave modeling;
- complete multivariate VBD state-space modeling;
- NUTS longitudinal sampler hardening;
- a real pre-period placebo intervention study;
- replicated longitudinal calibration;
- non-normal likelihoods;
- staggered event-study logic.

## Internal In-Sample VBD Contrast

The internal estimand is:

```text
internal_in_sample_vbd_contrast
```

It is the direction-adjusted posterior difference between the fitted synthetic
post-period pathway and the same in-sample fitted pathway with post-period VBD
exposures reset to their pre-period reference values.

The contrast:

- is an in-sample smoke diagnostic, not a historical forecast;
- retains the fitted time trend;
- retains approved synthetic business controls;
- uses pre-period reference values for Velocity/Breadth pathway exposures;
- retains Depth as context rather than changing it in the fitted contrast;
- does not set every predictor to zero;
- never uses future VBD values;
- remains internal validation input only.

Permitted internal description:

```text
Internal in-sample contribution-alignment smoke contrast for the selected
synthetic metric, conditional on the approved model inputs, controls, lag
structure, measurement plan, and assumptions.
```

Forbidden description:

```text
Probability Glean caused the metric to improve.
```

## HOLD And Rejection Controls

The implementation holds or rejects for:

- insufficient history;
- missing, suppressed, stale, or imputed required windows;
- missing aggregate measurement uncertainty;
- collinear or weakly identified VBD dimensions;
- unsupported likelihood families;
- target values used as priors;
- staggered rollout misrouting;
- baseline-only contribution-confidence attempts;
- unsafe HR/personnel controls;
- wrong lag;
- approved-control common-shock sensitivity;
- temporary-only movement;
- real/customer/production/live data flags;
- respondent-level leakage.

Unsafe HR/personnel/productivity controls reject before artifact emission.
The V2 TypeScript bridge also rejects coordinated rehash attempts that relabel
no-fit HOLD reasons, rewrite compiled diagnostic thresholds or fit outputs, or
introduce a redacted privacy-violation artifact.

## Relationship To DiD

The existing DiD implementation remains
`comparison_supported_bayesian_did_module`. It is not modified by this
contract, and the existing `InferenceProofArtifactSchema` remains DiD-specific.

This longitudinal proof uses a separate artifact schema and bridge test.
Existing DiD proof tasks remain incomplete until separately verified.
