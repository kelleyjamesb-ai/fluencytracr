# Change: Add VBD Trajectory Calibration Contract

Draft authorization: James Kelley, 2026-07-15.

Implementation approval: `PENDING`.

## Why

The accepted longitudinal outcome proof used synthetic scalar Velocity and
Breadth placeholders, but it did not calibrate their source definitions or
measurement uncertainty. The current product `velocity_index` already averages
frequency, engagement, and breadth, so using it beside a separate Breadth term
would double-count Breadth. Legacy weighted VBD scores also lack an admitted
uncertainty model. Parent task `5.6` therefore needs an exact, non-overlapping
trajectory contract before implementation or real-data admission can proceed.

## What Changes

- Define three independent primitive aggregate trajectory lanes: frequency,
  engagement, and Breadth. Preserve canonical Velocity unchanged and outside
  this likelihood.
- Bind each lane to one canonical aggregate event statistic, an exact
  transformation, known aggregate uncertainty, immutable window/slice/source
  identity, and pre-period-only standardization.
- Reject the composite `velocity_index`, legacy `overall_vbd_score`,
  `integration_score`, quadrants, and other source-supplied VBD scores as model
  inputs.
- Keep Depth as source-bound aggregate context outside every likelihood,
  trajectory estimand, eligibility rule, and numerical artifact; missing Depth
  context cannot block numerical trajectory acceptance.
- Specify a synthetic-only Gaussian state-space proof plan with deterministic
  primary integration, PyMC NUTS concordance, a fixed six-cell 1,200-slot
  primary study, 360 targeted lane-separation slots, 360 replicated drift
  slots, 12 fixed floor controls, 68 fixed negative controls, fresh
  recomputation of all 2,000 cases, four predeclared full-setting canaries,
  immutable hashes, and fail-closed HOLD behavior.
- Freeze quantile/denominator definitions, state-space priors and time encoding,
  DGP truth, seed namespaces, non-overlapping panel privacy, exact slot-set
  equality, pre-execution commit ancestry, and independent lane acceptance
  before execution.
- Record that the existing scalar `velocity_exposure` outcome-model interface
  cannot consume this three-lane definition without a separately approved
  integration change and renewed affected-model validation; that separate
  integration does not become part of parent task `5.6`.
- Leave implementation, execution, evidence generation, independent
  acceptance, and parent task `5.6` incomplete.

## Impact

- Affected specs:
  `bayesian-ai-value-realization-and-human-transformation-model-family`.
- Affected docs: the VBD calibration contract, model-family status, bounded
  internal-dogfood prerequisite status, and capability ledger.
- Future implementation scope, only after separate approval: `inference/` and
  a strict internal confidence-engine bridge.
- No inference runtime, schema, route, UI, persistence, connector, export,
  real/customer/live data, respondent row, customer output,
  confidence/probability output, ROI, causality, productivity, finance,
  ranking, new canonical event, new suppression reason, tunable product
  threshold, DiD work, or promotion decision is added by this proposal.
