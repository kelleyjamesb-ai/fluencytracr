# Add AI Fluency Snapshot And Longitudinal Synthetic Proof

## Why

The Bayesian model-family decision selected
`first_longitudinal_synthetic_model_slice` as the first non-DiD candidate, but
left runtime work explicitly unimplemented. The next safe step is not a
production confidence model. It is an exact-scope synthetic prototype that
proves three boundaries:

- AI Fluency Instrument evidence can normalize into a source-independent
  aggregate snapshot independent of Google Sheets, controlled JSON, or future
  API sources.
- Historical longitudinal outcome evidence can run in an isolated
  synthetic-only Python path without mutating the existing DiD harness.
- Python-emitted longitudinal artifacts can cross the TypeScript boundary as
  strict internal JSON with self-hash, source-hash, and blocked-output pins.

## What Changes

- Add a source-independent `AIFluencyInstrumentSnapshot` validator in the
  shared AI Value engine.
- Add docs contracts for the snapshot boundary and the historical
  longitudinal synthetic proof artifact.
- Add sibling Python inference modules for the first longitudinal synthetic
  outcome proof: design routing, typed aggregate inputs, synthetic generator,
  Gaussian longitudinal smoke model, diagnostics, and artifact emission.
- Add a new confidence-engine Zod schema and bridge tests for the
  longitudinal synthetic artifact.
- Record that this is synthetic smoke proof only; replicated calibration,
  NUTS sampler hardening, real-data promotion, persistence, backend routes,
  frontend UI, exports, customer-facing confidence/probability, ROI,
  causality, productivity, and finance output remain blocked.

## What Does Not Change

- The existing Bayesian DiD harness and `InferenceProofArtifactSchema` remain
  specialized for comparison-supported two-group pre/post DiD.
- Existing DiD OpenSpec tasks `3.3`, `3.4`, `4.2`, and `5.1` are not completed
  by this work.
- No Prisma schema, migration, backend repository write path, route, UI,
  export, connector execution, live data path, customer readout, or persistence
  write is added.
- No customer-facing confidence percentage, probability, ROI, finance,
  causality, productivity, HR, ranking, or economic output is authorized.

## Impact

- Affected code:
  - `shared/src/aiValueEngine/aiFluencyInstrumentSnapshot.ts`
  - `inference/src/fluencytracr_inference/longitudinal_*.py`
  - `packages/confidence-engine/src/longitudinalSyntheticOutcomeProof.ts`
- Affected docs:
  - snapshot contract
  - longitudinal synthetic proof contract
  - inference README
  - model-family contract implementation status
  - `.project/PROGRESS.md`
