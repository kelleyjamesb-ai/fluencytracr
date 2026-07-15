# Change: Add AI Fluency Longitudinal SEM Calibration Proof

Human approval: James Kelley, 2026-07-14.

## Why

The accepted longitudinal outcome model can consume aggregate AI Fluency
context, but the current dimension means cannot establish that the 24-item
instrument measures the same constructs across baseline and follow-up. A
privacy-safe measurement-evidence package and synthetic ordinal calibration
proof are required before real-data admission or product wiring can be
considered.

## What Changes

- Freeze the exact `ai_fluency_long_v1` 24-item manifest, eight first-order
  constructs, five-dimension second-order Fluency structure, and ordered
  five-category response scale.
- Mark `ai_fluency_short_v1` as pulse-only until a separate equating study is
  proposed and accepted.
- Define and validate an aggregate-only evidence package containing item
  category counts and complete pairwise 5x5 tables with source, wave, privacy,
  and hash bindings.
- Add a synthetic-only ordinal-probit measurement proof for reliability,
  configural structure, loading stability, and threshold stability.
- Add a fixed 800-slot full-study plan (200 seeds in each of invariant,
  invariant-latent-shift, loading-drift, and threshold-drift scenarios) and a
  reduced smoke mode. Reduced or incomplete evidence remains HOLD and cannot
  complete parent task `5.5`.
- Add a paste-in Google Apps Script adapter that computes only aggregate
  sufficient statistics inside the workbook and refuses sparse output.
- Keep the six observed usage-behavior questions separate from the Fluency
  factor and all calibration, eligibility, and outcome estimates.

## Impact

- Affected specs:
  `bayesian-ai-value-realization-and-human-transformation-model-family`
- Affected code: `inference/`, `integrations/google-apps-script/`, focused
  tests, and calibration contract/status documentation after verification.
- No real, customer, production, or live data is admitted or executed.
- No route, UI, persistence, schema, public export, connector execution,
  customer readout, confidence/probability output, ROI, causality,
  productivity, new canonical event, new suppression reason, tunable
  threshold, or promotion decision is added.
