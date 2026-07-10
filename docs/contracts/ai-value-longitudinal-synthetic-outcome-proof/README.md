# Longitudinal Synthetic Outcome Proof

Schema version: `FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07`

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
- separate lagged Velocity, Breadth, and Depth exposures;
- synthetic aggregate business controls;
- known aggregate standard errors;
- a Gaussian posterior smoke calculation;
- explicit AR(1) residual diagnostic posture;
- internal-only artifact emission;
- TypeScript validation with self-hash and source-hash checks.

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
- replicated longitudinal calibration;
- non-normal likelihoods;
- staggered event-study logic.

## Historical Counterfactual

The internal estimand is:

```text
historical_counterfactual_outcome_movement
```

It is the direction-adjusted posterior difference between the modeled observed
pathway and a historical baseline counterfactual across approved post-period
evaluation windows.

The counterfactual:

- retains the historical time trend;
- retains approved synthetic business controls;
- uses pre-period reference values for AI-enabled pathway exposures;
- does not set every predictor to zero;
- never uses future VBD values;
- remains internal validation input only.

Permitted internal description:

```text
Model-based historical contribution-alignment movement for the selected metric,
conditional on the approved historical model, controls, lag structure,
measurement plan, and assumptions.
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
- unrecorded common shock;
- temporary-only movement;
- real/customer/production/live data flags;
- respondent-level leakage.

Unsafe HR/personnel/productivity controls are redacted from emitted HOLD
artifacts before the Python-to-TypeScript bridge. Rehashed artifacts that try
to smuggle unsafe control names or source refs are rejected by the TypeScript
schema.

## Relationship To DiD

The existing DiD implementation remains
`comparison_supported_bayesian_did_module`. It is not modified by this
contract, and the existing `InferenceProofArtifactSchema` remains DiD-specific.

This longitudinal proof uses a separate artifact schema and bridge test.
Existing DiD proof tasks remain incomplete until separately verified.
