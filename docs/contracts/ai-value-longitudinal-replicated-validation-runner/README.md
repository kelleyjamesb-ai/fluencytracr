# Longitudinal Replicated-Validation Runner Contract

## Status

Internal synthetic-validation runner implemented under OpenSpec change
`add-longitudinal-replicated-validation-runner`.

This contract does not record a completed 1,200-slot study. It does not
authorize real data, customer execution, confidence/probability output,
causal language, economic output, or production promotion.

## Purpose

The runner tests the deterministic longitudinal Gaussian state-space engine
after the separately accepted PyMC NUTS concordance gate. It provides the
resumable path for replicated interval calibration, null-signal measurement,
aggregate floor controls, lag recovery, and fixed robustness controls.

The 1,200 calibration runs use the deterministic state-space engine. They are
not 1,200 NUTS fits. The accepted 30-fit NUTS concordance evidence is bound by
hash and reviewed-commit ancestry and is not rerun by this study.

## Exact Calibration Plan

| Property | Compiled value |
| --- | --- |
| Effect sizes | `{0, 0.2, 0.5}` standardized outcome SD |
| Panel-group counts | `{6, 12}` modeled aggregate panel groups |
| Replication indexes | exactly `{0..199}` per cell |
| Calibration rows | exactly `1,200` |
| Aggregate Measurement Cell provenance | `k=16` for every calibration row |
| Chunks | `20` chunks, `60` rows each |
| Chunk ownership | ten replication indexes across all six cells |
| Coverage gate | `148..172` covered 80% intervals per 200-row cell |
| Null diagnostic | `abs(posterior_mean/posterior_sd) > 1.959963984540054` |
| Null gate | at most `10/200` signals in each zero-effect cell |

Panel-group count and aggregate Measurement Cell `k` are different concepts.
Neither can substitute for the other.

The null rule is a fixed synthetic z diagnostic. It is not a customer
probability, confidence score, eligibility output, or authorization rule.
Every planned row remains in the fixed denominator; any failed row also fails
the study.

## Resumable Execution

The CLI exposes only compiled operations:

```bash
PYTHONPATH=inference/src inference/.venv/bin/python \
  -m fluencytracr_inference.longitudinal_replicated_validation_cli plan

PYTHONPATH=inference/src inference/.venv/bin/python \
  -m fluencytracr_inference.longitudinal_replicated_validation_cli \
  canary --replication-index 0

PYTHONPATH=inference/src inference/.venv/bin/python \
  -m fluencytracr_inference.longitudinal_replicated_validation_cli \
  run-chunk --chunk-index 0 --workspace /private/tmp/ft-longitudinal-validation

PYTHONPATH=inference/src inference/.venv/bin/python \
  -m fluencytracr_inference.longitudinal_replicated_validation_cli \
  run-controls --workspace /private/tmp/ft-longitudinal-validation

PYTHONPATH=inference/src inference/.venv/bin/python \
  -m fluencytracr_inference.longitudinal_replicated_validation_cli \
  combine --workspace /private/tmp/ft-longitudinal-validation
```

Checkpoint workspaces must remain outside the repository. Per-slot records are
create-once and atomically published; an identical race converges, while a
conflicting existing record fails closed. Resume and combine reject missing,
extra, duplicate, off-plan, malformed, reordered, hash-invalid,
mixed-identity, mixed-runtime, mixed-commit, or mixed-lockfile evidence.
Workspace child symlinks and resolved path escapes reject. Runner errors remain
durable rows in the exact manifest, force HOLD, and cannot disappear from a
denominator. Repeating `combine` reuses the first artifact timestamp and
requires exact regeneration.

Combine regenerates every deterministic calibration and control case and
compares truth, synthetic input, prepared input, model/context, and case roots
before accepting the checkpoint manifest. Unkeyed hashes provide consistency
and drift detection, not signature-grade authenticity against a coordinated
rewrite; the later independent acceptance record binds the reviewed commit and
exact generated evidence.

Execution identity requires the exact Python 3.13 and locked package versions,
hashes both Python and Node lockfiles, binds the TypeScript hashing/export
chain, and verifies the actual accepted concordance artifact and compact
summary bytes before any full run.

## Floor Controls

- `k=4`: rejected before generation, preparation, or fitting because it is
  below the aggregate provenance floor.
- `k=8`: valid internal-only path below the replicated-validation floor.
- `k=12`: validation-floor pass, still nonauthorizing.
- `k=16`: validation-floor pass, still nonauthorizing.

The aggregate provenance floor is `k>=5`; it is not a field in the
longitudinal likelihood input. The replicated-validation floor is `k>=10`.
Both are compiled constants.

## Lag Recovery

True lags `{1,2,3}` are evaluated against candidate exposure projections
`{0,1,2,3,4}` over exactly 30 replications per true lag. Selection minimizes
the deterministic negative integrated log-posterior-at-mode score. A
non-finite score or absolute tie within `1e-9` fails the row. Each true lag
must be recovered at least `24/30` times.

Candidate projection lag `0` retains the governed minimum one-window
evaluation horizon as `declared_input_lag_windows=1`. Every candidate in a row
binds the same final outcome/noise truth receipt. The true-lag label is not
supplied to candidate fitting.

## Robustness Controls

The fixed manifest requires:

- uncontrolled common shock: HOLD for truth-bound unmeasured confounding;
- approved-control shock: fit without an internal null signal;
- unrelated outcome shock: no internal null signal;
- temporary movement: HOLD when a late-window refit finds no persistence;
- weak history, missing windows, unsafe data, unsupported route, and target
  contamination: reject before fitting.

`approved_control_shock` is a state-space validation control. It does not
reclassify the older smoke fixture `approved_control_common_shock`, which
remains a smoke sensitivity HOLD.

## Artifact Boundary

The V1 artifact schema is
`FT_AI_VALUE_LONGITUDINAL_REPLICATED_VALIDATION_2026_07_V1`. It contains only
compiled plans, sanitized synthetic slot summaries, control summaries,
diagnostic counts, source/runtime commitments, and hashes. It contains no raw
posterior draws, latent states, raw event rows, prompts, responses, direct
identifiers, or customer data.

Smoke, canary, partial, and incomplete artifacts are `HOLD`. A complete exact
study passing every numerical gate may become
`valid_internal_validation_non_authorizing`, while all of these remain false:

- independent acceptance complete;
- longitudinal proof complete;
- customer output authorized;
- confidence or probability output authorized;
- causal, ROI, finance, or productivity output authorized;
- routes, UI, persistence, exports, readouts, or connectors created;
- production promotion complete.

Evidence-generation completeness is separate from numerical success. An exact
full manifest with a failed row or gate remains complete evidence but is
`HOLD`; it cannot be relabeled as a numerical pass.

## Remaining Gate

The runner PR does not complete the longitudinal proof. A separate fresh PR
must run canaries, generate all 1,200 calibration rows and fixed controls,
combine the artifact, and bind it to independent CODE, BUG, and ADVERSARIAL
acceptance. Parent longitudinal validation tasks remain unchecked until that
review succeeds.
