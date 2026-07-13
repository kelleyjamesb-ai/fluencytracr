# Change: Add longitudinal replicated-validation runner

## Why

The longitudinal Gaussian state-space engine has passed the separate 30-slot
PyMC NUTS concordance gate, but the proof remains incomplete without a
resumable, exact-slot replicated validation path. The next bounded step is the
runner and validation boundary only; generated full-study evidence remains a
separate reviewed PR.

## What Changes

- Add a synthetic-only deterministic plan for exactly 1,200 state-space
  calibration slots: effects `{0, 0.2, 0.5}` by panel-group counts `{6, 12}`
  by replication indexes `{0..199}`.
- Add fixed plan, chunk, resume, combine, and exact-manifest validation with
  atomic metadata-only checkpoints.
- Add computed 80% interval coverage and two-sided 95% internal null-signal
  measurement, with compiled gates of `148..172` covered rows per 200-row
  cell and at most `10/200` null signals in each null cell.
- Add separate aggregate Measurement Cell floor controls for `k=4,8,12,16`,
  lag recovery for true lags `{1,2,3}` against candidates `{0,1,2,3,4}`, and
  shock/negative-control execution.
- Add a separate strict longitudinal replicated-validation artifact and
  TypeScript bridge. Full exact evidence may record a numerical pass but
  remains synthetic-only, internal-only, noncausal, nonauthorizing, and
  subject to independent acceptance.
- Keep smoke/canary, partial, missing, duplicate, off-plan, malformed,
  hash-invalid, mixed-runtime, mixed-commit, runner-error, and hard-diagnostic
  evidence fail-closed to HOLD.

## Impact

- Affected specs:
  `bayesian-ai-value-realization-and-human-transformation-model-family`
- Affected code: `inference/`, `packages/confidence-engine/` bridge/schema
  coverage, and this OpenSpec change
- No public API, route, UI, persistence service, connector, export, customer
  readout, real-data admission, confidence/probability output, ROI, causality,
  productivity, finance output, canonical event, suppression reason, tunable
  threshold, or promotion decision

## Approval

Approved by the decision owner through the requested Longitudinal Bayesian
Proof Roadmap implementation and active goal continuation. This approval is
limited to the runner-only PR; the full evidence run and acceptance remain a
separate bounded queue item.
