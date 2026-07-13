## Context

The accepted state-space/NUTS concordance proves agreement between the
deterministic primary engine and a sampled reference. It does not prove
frequentist interval calibration, null false-signal control, floor behavior,
lag recovery, or robustness controls. The replicated runner must make those
studies executable and resumable without allowing partial evidence to look
complete.

## Goals

- Make the full synthetic study deterministic, exact, resumable, and
  independently inspectable.
- Keep statistical computation in Python and governance validation in
  TypeScript.
- Preserve every existing DiD, longitudinal smoke, and concordance contract.
- Produce only summary-level synthetic evidence, never posterior draws or
  latent states.

## Non-Goals

- Generating or accepting the full evidence set in this runner PR.
- Real/customer/live/production data, production execution, customer output,
  model promotion, public interfaces, or economic interpretation.
- Re-running the already accepted 30 NUTS concordance fits.

## Compiled Calibration Plan

- Plan version: `1.0.0`.
- Cells: effects `{0, 0.2, 0.5}` crossed with panel-group counts `{6, 12}`.
- Replication indexes: exactly `{0..199}` per cell.
- Aggregate Measurement Cell provenance: fixed `k=16` for every calibration
  row. Panel-group count is a different quantity and cannot satisfy the `k`
  floor.
- Total: exactly 1,200 unique slots in effect, group-count, replication-index
  order.
- Chunks: exactly 20. Chunk `i` owns replication indexes
  `[10*i, 10*i+10)` across all six cells, exactly 60 slots.
- Calibration seed base: `202607130`. The seed is
  `base + effect_ordinal*100000 + group_ordinal*1000 + replication_index`.
  Floor, lag, and negative-control namespaces start at `203010000`,
  `203020000`, and `203100000`; all calibration, control, and accepted
  concordance seeds are globally disjoint. Seeds are not CLI inputs.

Each slot binds its compiled identity, truth receipt, synthetic input,
prepared input, model/context roots, deterministic fit summary, integration
diagnostics, execution environment, implementation hash, and result hash.

## Calibration And Null Decisions

The primary 80% interval for `longitudinal_movement` is compared with the
external injected effect in standardized outcome units. Every cell must have
exactly 200 rows and `148..172` covered rows, inclusive. The artifact reports
the rate and binomial standard error, but the integer count is the compiled
gate.

For zero-effect rows, the internal validation signal predicate is two-sided:

```text
abs(posterior_mean / posterior_sd) > 1.959963984540054
```

This predicate is an internal synthetic validation diagnostic, not customer
probability, confidence, eligibility, or authorization. Each zero-effect
cell must have at most `10/200` signals; the worst-cell rate is reported.
Null measurement never reads customer/output authorization flags.

Every planned row remains in the denominator. A runner error or hard failure
cannot improve a rate and independently fails the study.

## Floor Controls

Floor provenance is bound separately from panel-group count:

- `k=4`: reject before preparation or fitting.
- `k=8`: exercise a valid aggregate internal-only path below the compiled
  validation floor.
- `k=12`: pass the validation floor and remain nonauthorizing.
- `k=16`: pass the validation floor and remain nonauthorizing.

The aggregate provenance floor inherited by this validation artifact is
`k>=5`; it is not a field in the longitudinal model input. The separate
replicated-validation floor is `k>=10`. Neither threshold is runtime
configurable.

## Lag Selection

- True lags: `{1,2,3}` windows.
- Candidate lags: `{0,1,2,3,4}` windows.
- Replications: 30 per true lag.
- Every candidate receives the same synthetic outcome/noise realization and a
  candidate-lagged exposure projection.
- Selection minimizes the deterministic engine's negative integrated
  log-posterior-at-mode score. A non-finite score or absolute tie within
  `1e-9` HOLDS that replication.
- Exact true-lag recovery must be at least `24/30` for each true lag.

Candidate `0` means a zero-window exposure projection. The governed model
input retains its existing minimum one-window evaluation horizon, recorded as
`declared_input_lag_windows=1`; the two fields are separately hash-bound. All
five candidates for one replication bind the same final outcome/noise truth
receipt. Lag truth is an external synthetic sidecar, and its true-lag label is
not supplied to candidate fitting.

## Shock And Negative Controls

The fixed control manifest covers:

- uncontrolled common shock: truth-bound unmeasured confounding forces HOLD;
- approved-control shock: the approved control path must fit without an
  internal null signal;
- unrelated outcome shock: must not create an internal null signal;
- temporary movement: a late-window persistence refit must not validate a
  sustained signal;
- weak history, missing windows, unsafe data, unsupported route, and target
  contamination: reject before fitting.

Any missing, substituted, malformed, or unexpectedly passing/failing control
fails the control manifest.

The measured `approved_control_shock` robustness control is distinct from the
older smoke fixture named `approved_control_common_shock`: the former asks
whether a correctly represented synthetic control avoids a null signal in the
state-space validation study; the latter remains a smoke-path sensitivity HOLD
and is not reclassified.

## Resumable Execution

The CLI exposes only compiled operations: print plan, run one named chunk,
run fixed controls, run a bounded canary, and combine a workspace. It exposes
no threshold, cell, seed, replication-count, or chunk-size controls.

Per-slot files and `longitudinal_replicated_validation_chunk_v1`
chunk/control manifests use plan version `1.0.0` and are written atomically. A
valid existing exact slot is reused; a malformed or provenance-mismatched
existing slot fails closed instead of being silently accepted. Combine
requires the exact 20 chunk manifests, exact control manifests, one
implementation hash, the exact Python and Node lockfiles, one runtime manifest,
and one entirely clean worktree at the bound source commit.

Checkpoint roots and every child path reject repository-local placement,
symlinks, and resolved path escape. Runner-error rows are durable exact
checkpoints that remain in the fixed denominator and force HOLD. Repeating
`combine` reuses the existing artifact timestamp and requires byte-equivalent
regeneration, so a valid combine is idempotent while a drifted artifact fails.

The implementation manifest binds the runner, control, artifact, CLI,
state-space, synthetic-generator, type/router/hash dependencies, the strict
TypeScript boundary plus its hashing/export chain, this change's design/spec,
the Python and Node lockfiles, and the accepted concordance
artifact/summary/review record. The runner hashes the actual accepted full
artifact and compact-summary bytes before execution. The execution identity
also binds exact package versions, platform, architecture, Python
implementation, NumPy build configuration, BLAS thread environment, and proof
that reviewed concordance commit
`6c0b0faa7511dc0cdc7119c2856bdbe0ad06ad5c` is an ancestor of the execution
commit.

## Artifact Boundary

The separate V1 artifact includes compiled plans, sanitized slot summaries,
aggregate counts, diagnostic summaries, source/runtime commitments, hashes,
and blocked-output pins. It contains no raw posterior draws, latent states,
raw data rows, prompts, responses, direct identifiers, or customer data.

Smoke, canary, partial, and incomplete artifacts are HOLD. An exact full
study passing every compiled gate may be
`valid_internal_validation_non_authorizing`, while independent acceptance,
production promotion, and every customer/output authorization remain false.
A later evidence PR binds the generated artifact to CODE, BUG, and
ADVERSARIAL decisions.

Full evidence-generation completeness is derived from exact manifests, not
from numerical success. A complete study that misses a numerical or control
gate records complete evidence and remains HOLD.

## Risks And Mitigations

- **Denominator gaming:** exact 200-row manifests and hard-failure gates.
- **Clone/rebind substitution:** slot identity, case, truth, input, fit,
  runtime, implementation, and result hashes are all bound and duplicates
  rejected.
- **Resume corruption:** atomic writes and strict revalidation before reuse.
- **Mixed executions:** combine rejects mixed commit, implementation,
  lockfile, runtime, plan, or execution mode.
- **Overclaim from synthetic evidence:** all outputs remain internal,
  synthetic, noncausal, and nonauthorizing.
