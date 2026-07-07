# FluencyTracr inference proof harness (`inference/`)

Internal-only Python package for the Bayesian inference proof harness
(OpenSpec change `add-bayesian-inference-proof-harness`, slice 2). It is the
Python side of the boundary defined in
[`docs/contracts/confidence-inference-methodology/README.md`](../docs/contracts/confidence-inference-methodology/README.md):
Python owns all statistical computation (PyMC + ArviZ); TypeScript
(`packages/confidence-engine`) owns all governance and validation. Artifacts
cross only as JSON validated by the `ConfidenceModel` Zod schemas.

## Posture

- **Synthetic data only.** Harness inputs come from synthetic generators;
  real observations are rejected. No network, BigQuery, or connector imports
  (enforced by `tests/test_no_connector_imports.py`).
- **Internal only.** No customer-facing output, no probability or confidence
  output, no persistence, no routes or UI. Every proof artifact pins
  `internal_only: true` and `customer_output_authorized: false`.
- **Isolated environment.** This package has its own pinned environment
  (`requirements.lock`). It adds nothing to the root `pyproject.toml` or
  `requirements.txt`.

## Environment

Requires Python 3.13 (pinned via `requires-python`). Create the environment
from the lockfile — the lockfile, not the `pyproject.toml` pins, is the
source of truth for the full transitive set:

```bash
cd inference
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
```

To change dependencies: edit the direct pins in `pyproject.toml`, reinstall,
then regenerate the lockfile with `.venv/bin/pip freeze > requirements.lock`.

## Simulation design

The calibration study is a synthetic stress test for the inference harness.
It does **not** use customer data, Glean telemetry, BigQuery, connector rows,
survey rows, or person-level records. Every row is generated inside
`fluencytracr_inference.synthetic` from a fixed seed and carries an injected
ground truth so the harness can be audited.

The generated rows are aggregate Measurement Cell windows:

- one row = one aggregate cohort/window observation;
- `k` = the aggregate cohort count per treated or comparison arm;
- `members` = the aggregate denominator used only to weight standard error;
- `treated` and `post` define the difference-in-differences contrast;
- `time_index` supplies pre/post milestone windows;
- expectation path, workflow, function, cohort, and organization labels are
  synthetic grouping labels for partial pooling;
- `injected_effect_sd` is the known contribution-alignment effect in standard
  deviation units.

The main calibration grid is:

- injected effects: `0`, `0.2`, and `0.5` SD;
- floor-eligible cohort counts: `k=12` and `k=16`;
- at least `200` seeded replications per effect/cohort cell;
- an 80% credible interval must cover the injected effect in `74%` to `86%`
  of replications for each cell.

The runner also computes:

- pooled null false-eligibility across the `0`-effect cells, capped at `5%`;
- floor checks: `k=4` must reject, `k=8` must remain internal-only, and
  `k=12`/`k=16` must be eligible for the display floor;
- named negative controls for no comparison cohort, violated pre-trend,
  mismatched comparison, prior-dominated weak data, missing/suppressed
  windows, and repeated milestone peeking.

Run the calibration runner from the locked inference environment:

```bash
cd inference
.venv/bin/python -m fluencytracr_inference.calibration --smoke --calibration-only
```

The smoke path proves the runner, seed grid, checkpointing, and sampler loop
with fewer replications. The full study is intentionally expensive:

```bash
cd inference
.venv/bin/python -m fluencytracr_inference.calibration
```

If a cell is shown to be biased under the cheap calibration instrument, rerun
that cell with the full-quality sampler settings instead of relaxing the
coverage gate:

```bash
cd inference
PYTHONPATH=src .venv/bin/python -m fluencytracr_inference.calibration \
  --full-quality-cell effect-0.5-k16 \
  --checkpoint-summary-only

PYTHONPATH=src .venv/bin/python -m fluencytracr_inference.calibration \
  --full-quality-cell effect-0.5-k16 \
  --calibration-only
```

`--checkpoint-summary-only` is read-only and never launches sampler workers.
It is the safe way to check a long-running rerun before resuming it. For the
current `effect-0.5-k16` investigation, the recovered full-quality checkpoint
state has 50 unique completed replications out of 200, with 0.78 interim
coverage and 150 replications still pending. That is promising, but it is
not passing proof until the cell reaches the 200-replication minimum and the
rebuilt study result passes every acceptance field.

Checkpoint files live under `inference/.calibration-cache/` and are ignored.
Do not treat a generated `calibration_study_results.json` as proof unless all
acceptance fields pass; failing results are diagnostic evidence, not
authorization for customer-facing intervals or probability/confidence output.

## Package layout (Slice 2 Phase B1/B2)

Under `src/fluencytracr_inference/`:

- `constants.py` — numeric gates and vocabularies mirrored from the TS
  contract module (`INFERENCE_PROOF_*`), hardcoded with the TS constant
  named per value and guarded by `tests/test_constants_mirror.py`.
- `hashing.py` — byte-parity Python port of the TS `stableStringify` +
  sha256 spine, including ECMAScript number formatting, so
  `hash_bindings.artifact_self_hash` matches what the TypeScript boundary
  recomputes.
- `synthetic.py` — seeded synthetic generators for aggregate Measurement
  Cell windows (treated + comparison cohorts, pre/post windows, known
  injected effect in SD units) plus the negative-control generators
  (violated pre-trend, mismatched/no comparison cohort, missing/suppressed
  windows, prior-dominated weak data) consumed by Phase B2.
- `model.py` — the contract's implementation-grade equation: hierarchical
  Bayesian DiD with mean-zero partially pooled expectation-path / workflow /
  function / cohort / organization effects, estimand `delta` sampled as
  `contribution_alignment_effect`, normal continuous aggregate path with
  identity link only (any other family raises `HoldViolation`), cohort-size
  weighted known aggregate SE, seeded NUTS (2 chains, `cores=1`).
- `diagnostics.py` — every gate computed as a real value: R-hat, bulk/tail
  ESS, MCSE ratios, divergences, max-treedepth/BFMI backend warnings, the
  five fixed posterior predictive checks, prior sensitivity across the
  declared prior family (>= 3 scalings), the pre-trend pseudo-effect check,
  and compact rank/energy numeric summaries for the internal report.
- `artifact.py` — the `InferenceProofArtifactSchema`-shaped emitter:
  eligible only when every gate, floor, window, comparison-rubric, and
  peeking check passes; otherwise HOLD naming every failing diagnostic.
  `run_proof(dataset, ...)` is the single entry point (fit + diagnostics +
  artifact); Phase B2's calibration study drives it per replication.
- `calibration.py` — seeded synthetic calibration-study runner and summary
  builder for task 3.3. It can resume from checkpointed JSONL records and
  reports per-cell coverage, null false-eligibility, floor checks, and
  negative controls.

## Running the tests

```bash
cd inference
.venv/bin/python -m pytest tests/ -q
```

The suite includes a full recovery smoke (session-scoped: one complete
pipeline run on a clean k=16 / 0.5 SD synthetic scenario, asserting an
eligible artifact with every gate passing), per-gate HOLD tests (each gate
individually forced to fail must name exactly that diagnostic), self-hash
parity fixtures generated with Node against the TS implementation, and the
artifact JSON-shape test pinning the schema's exact top-level field list.
`tests/test_environment_smoke.py` proves the pinned stack works end to end
and that fixed seeds reproduce draws in-process;
`tests/test_no_connector_imports.py` is a static source scan guarding the
no-network / no-connector posture. Expect ~6-8 minutes warm (NUTS fits
dominate; the first pytensor compile adds ~25s cold).

CI runs the same suite in `.github/workflows/inference-harness.yml`.
