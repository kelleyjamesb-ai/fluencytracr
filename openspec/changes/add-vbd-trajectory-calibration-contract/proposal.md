# Change: Add VBD Trajectory Calibration Contract

Draft authorization: James Kelley, 2026-07-15.

Implementation approval:
`APPROVED_BY_JAMES_KELLEY_2026_07_15_FOR_SYNTHETIC_TASKS_2_2_THROUGH_2_5`.

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
- Record that implementation and the sequential synthetic proof stages are now
  explicitly approved, while execution, evidence generation, independent
  acceptance, and parent task `5.6` remain incomplete until their exact gates
  pass.
- Record the post-bundle-0 numerical-precision amendment: replace the retired
  16-point conditional-Normal tail discretization with direct mixture-CDF
  inversion, increase fixed NUTS retained/tuning draws and target acceptance
  without rotating existing seeds or lowering any gate, preserve all five
  parameter MCSE values, retain the 4,000-replicate PPC through a fixed draw
  selector, and keep implementation plus replacement evidence unauthorized
  until a later bounded decision.
- Record the binary64 representable-retention amendment: generate every
  planned Sobol node, normalize every finite log weight in original ordinal
  order, retain and renormalize only normalized weights represented as finite
  and strictly positive binary64 values, then apply every unchanged retained-
  count, ESS, and maximum-weight gate. Commit generated/finite/retained counts
  and retained/excluded ordinal sets without adding a floor, tolerance, point,
  seed, model, threshold, or evidence-universe change.
- Record the post-canary MCSE diagnostic amendment: preserve the failed
  six-group precision canary as permanent HOLD, reserve one different
  synthetic six-group null case inside the smoke namespace, and define a
  create-once, non-evidentiary diagnostic that retains complete dimensionless
  parameter-level MCSE, ESS, prefix-scaling, and chain-tail disagreement
  information. The diagnostic cannot retry the canary, clear task `2.6`, select
  a replacement precision design, enter evidence, or authorize implementation
  or execution.
- Record that the consumed `vbd_precision_design_diagnostic_v1` launch is a
  permanent uninterpretable HOLD, not a statistical result and not a retryable
  attempt. Define a separate `vbd_precision_design_diagnostic_v2` identity with
  disjoint reserved smoke seeds, exact posterior-variable-set validation plus
  canonical name-based projection, a full-shape sampler-free conformance
  fixture using PyMC's natural storage order, and create-once hash-chained
  postmortem checkpoints that cannot enable resume or retry. The replacement
  still requires a reviewed implementation `D2`, manifest-only authorization
  `A2`, separate human authorization, and one new launch; this amendment does
  not implement or execute it.
- Record that the consumed `vbd_precision_design_diagnostic_v2` launch is also
  a permanent uninterpretable HOLD. Its samplers and in-memory projection
  completed, but canonical JSON serialization reordered a nested endpoint map
  that the strict validator incorrectly treated as insertion-ordered, and the
  bootstrap published without semantic readback. Define a separate
  `vbd_precision_design_diagnostic_v3` identity with disjoint reserved seeds
  and roots, exact order-insensitive object-key validation followed by
  canonical name-based traversal, and mandatory strict semantic/checkpoint
  revalidation of staged and final persisted bytes before success. V3 still
  requires a separately reviewed implementation `D3`, manifest-only
  authorization `A3`, separate human authorization, and one new launch; this
  amendment does not implement or execute it.

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
