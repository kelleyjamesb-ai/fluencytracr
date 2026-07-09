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

## Package layout (Slice 2 Phase B2)

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
- `synthetic_study.py` — computed synthetic calibration/null/floor study
  runner. The full path covers effect sizes `{0, 0.2, 0.5}` and cohort
  sizes `{12, 16}` at `>=200` seeded replications per cell, reports binomial
  uncertainty, measures two-sided null false-eligibility conservatively by
  worst null cell against the `<=5%` gate with a compiled finite-sample
  correction, and computes floor checks for `k=4`, `k=8`, `k=12`, and `k=16`.
  Smoke studies are allowed for local mechanics checks but cannot be converted
  into artifact inputs. This runner is a fast
  aggregate Bayesian DiD approximation used to replace Phase B1 fixture study
  sections; it is not sampler-level replicated PyMC calibration evidence by
  itself.
- `negative_control_study.py` — internal sidecar verifier for the task-3.3
  negative-control and floor-control suite. It generates synthetic-only
  control datasets, validates emitted artifacts through their internal-only
  pins and self-hash, and reports whether required controls HOLD or remain
  internal-only as expected. Floor controls now verify the emitted artifact's
  floor-check section directly, so governance labels alone cannot satisfy the
  control. The report is not an artifact schema field and
  explicitly does not authorize OpenSpec task completion, customer output,
  probability/confidence output, ROI, causality, productivity, routes, UI,
  persistence, exports, or connectors.
- `acceptance_study.py` — internal sidecar metadata for the remaining task-3.3
  acceptance gap. It records whether evidence is
  `aggregate_approximation` or `sampler_artifact`, supports reduced-draw
  sampler-artifact smoke batches plus full-settings sampler-artifact batches
  for the required effect/cohort grid through `run_proof`, emits a
  deterministic stdout-only full-run plan for the required 1200
  sampler-artifact slots, combines non-overlapping batches in memory for
  resumable proof runs, and verifies the exact planned slot grid so counts
  cannot mask skipped or substituted replication indexes. It computes
  aggregate posterior CI coverage and governance-level artifact false
  eligibility over valid/bound null artifacts, and separately reports a
  non-authorizing posterior null-guard audit matching the artifact's
  contribution-estimate authorization rule. The guard does not decide artifact
  validity: valid null/uncertain artifacts stay internal-valid and
  non-authorizing. Full generated evidence must carry the sidecar's
  runner-generation proof hash; direct result construction, rehydrated
  reports, and plan-only metadata cannot self-certify. It refuses to produce
  artifact inputs because no current method is approved as full sampler-level
  acceptance evidence. Reports omit per-replication posterior interval bounds,
  can be strictly rehydrated from sanitized sidecar JSON for cross-process
  chunk combination, and mark rehydrated evidence as non-authorizing.
  Coverage summaries separate valid/bound posterior-available rows from hard
  failures and report diagnostic HOLD counts by cell; clean-data
  `HOLD(pre_trend)` rows remain unusable artifacts but can be counted in the
  calibration recovery denominator when their posterior interval is hash-bound
  and available. Invalid, unbound, runner-error, malformed-hash, missing
  posterior/hash-mismatch, off-plan, non-`pre_trend` diagnostic-HOLD, or
  semantically failed artifacts remain hard failures for acceptance
  observation. Per-replication runner exceptions are captured as
  invalid/unusable sidecar rows with only the exception type recorded; details,
  traces, posterior values, and artifacts are not emitted. Rehydrated chunk-report
  evidence is token-gated and review-only: SHA-shaped source hashes in JSON do
  not self-certify, mixed live/rehydrated combines fail closed on source
  provenance, and runner acceptance plus artifact-input authorization remain
  false for rehydrated reports. The CLI exposes stdout/stdin-only acceptance
  sidecar modes; it does not write checkpoints or reports.
- `task_3_3_evidence.py` — internal recompute-first required-evidence ledger
  for OpenSpec task 3.3. It accepts an in-memory sampler-artifact
  `AcceptanceStudyResult` plus negative-control and floor-control artifact
  maps, recomputes the control sidecar reports from those artifacts, summarizes
  and hashes component reports, and remains non-authorizing. Sidecar JSON
  reports, plan-only metadata, missing controls, failed controls, and
  rehydrated sampler evidence HOLD rather than completing task 3.3.
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
  Contribution-estimate authorization is narrower than artifact validity:
  eligible internal artifacts authorize the estimate only when the compiled
  null false-eligibility guard excludes zero. Valid null/uncertain artifacts
  remain internal-valid and non-authorizing. `run_proof(dataset, ...)` is the
  single entry point (fit + diagnostics + artifact) and accepts the computed
  Phase B2 study sections from `synthetic_study.py`. Missing or incomplete
  study sections fail closed to HOLD.

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
