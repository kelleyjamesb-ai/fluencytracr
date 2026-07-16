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
- `design_router.py` — additive model-family route vocabulary for the first
  longitudinal slice. It preserves current DiD routing for valid two-group
  pre/post comparison designs and keeps unsupported designs such as staggered
  rollout fail-closed.
- `longitudinal_types.py`, `longitudinal_synthetic.py`,
  `longitudinal_model.py`, and `longitudinal_artifact.py` — isolated
  synthetic-only Phase 2B prototype for
  `first_longitudinal_synthetic_model_slice`. The path uses aggregate
  Hypothesis Measurement Plan metadata, source-bound aggregate AI Fluency
  snapshot refs, separate lagged Velocity/Breadth exposures, Depth as
  synthetic pathway context only, synthetic aggregate controls, known aggregate
  SE, and a post-hoc AR(1) residual diagnostic. The V2 calculation is a
  closed-form Gaussian analytic smoke regression with an independent Gaussian
  likelihood. It does not use NUTS, model AR(1) in the likelihood, implement
  partial pooling, or produce a historical forecast. A real pre-period
  placebo, posterior predictive checks, sampler diagnostics,
  prior-sensitivity refits, and full
  counterfactual-stability analysis are `NOT_RUN`, never passing. Every
  non-HOLD V2 result is `valid_internal_smoke_non_authorizing`; replicated
  calibration and production promotion remain false. It emits the separate
  `FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07_V2` artifact,
  while the confidence boundary retains read-only compatibility with legacy
  V1 smoke artifacts. Both versions are validated by
  `packages/confidence-engine/src/longitudinalSyntheticOutcomeProof.ts`. Full
  V2 validation independently derives no-fit HOLD reasons and compiled smoke
  thresholds. Hierarchical commitments bind emitted inputs beneath the
  synthetic-input root, diagnostics beneath the diagnostics-fit root, and the
  posterior summary, analytic draw count, and pathway evidence beneath the
  final fit-summary root; unsafe
  personnel/control metadata rejects before emission. The dataset carries no
  fixture scenario or ground-truth oracle sidecars, requires JavaScript-safe
  nonnegative seeds and RFC3339 generation timestamps, and admits only
  compiled synthetic control identity/source pairs. Unknown and DiD-routed
  designs cannot emit through the longitudinal schema. Replicated interval coverage,
  longitudinal null false-eligibility, lag recovery, common-shock robustness,
  model-selection validation, real-data promotion, persistence, routes, UI,
  exports, customer-facing confidence/probability, ROI, causality,
  productivity, and finance output remain blocked future work.
  Posterior draw shares are emitted only as boxed internal diagnostics, not as
  probability output, confidence output, or customer-facing language.
- `longitudinal_validation_synthetic.py`, `longitudinal_state_space.py`,
  `longitudinal_nuts.py`, `longitudinal_concordance.py`, and
  `longitudinal_concordance_artifact.py` implement the separate synthetic-only
  state-space/NUTS concordance gate. Both engines consume one
  pre-period-standardized aggregate input for
  `y[c,t] = X[c,t] beta + u[c] + r[c,t] + epsilon[c,t]`, with stationary AR(1)
  state, zero-sum panel-group effects, known aggregate SE, and compiled priors.
  The deterministic primary integrates Gaussian states and coefficients before
  8,192-point Sobol cubature; the reference uses four PyMC NUTS chains, 1,000
  retained draws, 2,000 tuning draws, `target_accept=0.99`, and
  `max_treedepth=15`. The exact five-seed grid over effects `{0, 0.2, 0.5}` and
  panel-group counts `{6, 12}` passed all 30 slots. The full artifact binds the
  compiled Python range, exact `requirements.lock` hash, and generation runtime
  package manifest. The committed artifact and compact numerical summary keep
  independent acceptance and replicated unblocking false. The separate
  source-bound `longitudinal_state_space_nuts_concordance_acceptance_2026_07.json`
  record binds the reviewed implementation commit and exact evidence tuple and
  unblocks only the next replicated synthetic-validation PR.
  The generated artifact records the numerical gate but cannot self-certify
  independent acceptance or unblock later execution; reduced, partial,
  copied, reordered, mode-mismatched, malformed, duplicated, runner-error,
  diagnostic-failing, PPC-failing, or
  discordant evidence remains HOLD. Replicated calibration, null, floor, lag,
  shock, and negative-control validation remain separate future work.
- `longitudinal_replicated_validation.py`,
  `longitudinal_replicated_validation_controls.py`,
  `longitudinal_replicated_validation_artifact.py`, and
  `longitudinal_replicated_validation_cli.py` implement the runner for that
  separate future evidence step. The compiled plan contains exactly 1,200
  deterministic state-space rows across effects `{0, 0.2, 0.5}`, panel-group
  counts `{6, 12}`, and replication indexes `{0..199}`, with fixed `k=16`
  aggregate Measurement Cell provenance. It uses 20 create-once atomic chunks,
  strict resume/combine recomputation, per-cell `148..172/200` coverage,
  worst-cell null signals at most `10/200`, floor controls at `k=4,8,12,16`,
  lag recovery, and fixed shock/negative controls. Checkpoint workspaces must
  remain outside the repository and reject child symlinks. Exact runtime,
  lockfile, source, TypeScript verifier-chain, and accepted-concordance byte
  commitments are required. Runner errors remain durable HOLD evidence, and
  combine is idempotent. Smoke/canary/partial artifacts always HOLD; even a
  complete numerical pass remains internal synthetic nonauthorizing until a
  separate evidence PR receives independent acceptance. The runner PR contains
  no full generated evidence and does not complete parent tasks.
- `ai_fluency_measurement_manifest.py`,
  `ai_fluency_measurement_evidence.py`,
  `ai_fluency_measurement_synthetic.py`,
  `ai_fluency_ordinal_measurement.py`,
  `ai_fluency_measurement_diagnostics.py`, and
  `ai_fluency_measurement_calibration*.py` implement the separate AI Fluency
  measurement-proof runner. The frozen `ai_fluency_long_v1` manifest contains
  24 ordered items across eight three-item constructs; five core constructs
  feed the second-order Fluency structure, while Attitude, Behavioral Intent,
  and Perceived Impact remain separate. The model consumes only complete
  aggregate item counts and all 276 pair tables per wave. It uses a
  regularized ordinal-probit pairwise-composite Laplace approximation, frees
  construct-level follow-up latent means before threshold-invariance review,
  preserves joint cumulative-threshold and shared-loading covariance, uses
  exact nonlinear loading curvature, and emits no respondent scores, latent
  states, or posterior draws. The fixed
  full plan has 200 seeds in each of four scenarios (800 slots), and artifact
  emission freshly recomputes all slots. The full evidence path uses 20 fixed
  serial chunks in each of two distinct phases: create-once primary checkpoints
  followed by separately identified fresh recomputation checkpoints. The
  external workspace binds the clean source commit, governed implementation
  files, lockfile, pinned runtime, immutable plan, phase manifests, and exact
  slot hashes; malformed, partial, stale, copied-across-phase, off-plan, or
  mismatched checkpoints fail closed. Checkpoints stay outside the repository,
  and only the summary-only artifact is atomically published. Smoke or
  incomplete evidence always HOLDS. The accepted full run completed all 800
  primary slots and all 800 separate recomputations with zero runner errors;
  the full artifact, compact summary, and self-hashed independent acceptance
  record are committed under `inference/evidence/`. Parent task `5.5` is
  complete only for this internal synthetic measurement-calibration boundary.
- `vbd_trajectory_types.py` — strict synthetic-only aggregate records for the
  three primitive frequency, engagement, and Breadth lanes. It binds canonical
  V2 event/schema identity, exact denominators and source definitions, joint
  covariance, independently derived cohort and gate receipts, ordered
  manifests, Python/NumPy/SciPy runtime identity, seed ancestry, and a separate
  nonnumeric Depth-context root. Unknown, mutable, subclassed, real-data,
  composite, person-level, malformed, or self-rehashed substitutions reject.
- `vbd_trajectory_synthetic.py` — development-smoke PCG64DXSM generator for
  the frozen 12-pre/6-post aggregate panel. Validation regenerates the DGP from
  the declared seed and plan metadata, so changing seed/hash metadata cannot
  legitimize copied observations. Truth and latent paths remain sidecars and
  never enter the panel or prepared input.
- `vbd_trajectory_bootstrap_conformance.py` — process-local integer fixture
  proving synchronized type-7 source-bootstrap covariance behavior against the
  frozen oracle. Fixture rows, private root, and bootstrap seed are absent from
  the returned summary and cannot enter a numerical study input.
- `vbd_trajectory_preparation.py` — deterministic pre-period-only lane
  preparation with immutable arrays, exact time/zero-sum/contrast structures,
  inherited `k` floors, and mandatory reconciliation to the validated source
  panel. Transform provenance is included in the prepared context commitment;
  Depth status never enters numerical inputs or eligibility.
- `vbd_trajectory_statistics.py` — exact `weighted_quantile_v1` midpoint
  quantiles and pinned 16-point `normal_quadrature_v1` support. It rejects
  nonfinite values, nonpositive total weight, negative weight, duplicate or
  noncanonical support indexes, and malformed probabilities before summary.
- `vbd_trajectory_state_space.py` — primary deterministic Gaussian
  state-space integration over 8,192 unscrambled Sobol supports. It computes
  the exact fixed-interval smoothed latent contrast, expands conditional
  movement uncertainty beneath each retained original Sobol ordinal, and
  emits only hash-bound 80%/99% movement summaries and diagnostics.
- `vbd_trajectory_nuts.py` — matched PyMC marginalized state-space reference,
  explicit chain/PPC seed boundary, exact conditional movement draw, strict
  sampler diagnostics, and the five frozen conditional-smoothed-path PPCs.
  Development smoke is permanently nonaccepting. Full settings are compiled,
  and every full call verifies the exact clean manifest-only freeze before seed
  admission or sampling. No posterior draws, latent paths, or PPC replicates
  leave the fit function. Concordance execution, replicated evidence, parent
  task `5.6`, real data, and UI remain incomplete.
- `vbd_trajectory_concordance.py`,
  `vbd_trajectory_concordance_execution.py`,
  `vbd_trajectory_concordance_resumable.py`, and
  `vbd_trajectory_concordance_cli.py` implement the frozen 30-bundle
  state-space/NUTS gate without executing it. The external create-once
  workspace owns 30 primary processes and 90 separate deterministic
  recomputation processes, independently reconstructs typed fit summaries and
  all sampler/PPC/cross-engine gates, rederives each compiled bundle's source
  roots, preserves every child HOLD, and publishes only a hash-bound compact
  diagnostic summary plus a workspace-verifiable receipt. Cross-engine checks
  cover both endpoints of the 80% and 99% intervals. Full generator or
  NUTS admission requires exact clean freeze `F`; direct pre-freeze execution
  fails closed. Child execution uses isolated Python and a deny-by-default
  in-memory loader only after every reviewed Git source byte matches the freeze
  manifest.
- `vbd_trajectory_artifact.py` — runner-owned, summary-only three-lane
  development-smoke artifact. It binds prepared inputs, deterministic fit
  summaries, diagnostics, transform/source roots, model/runtime identity, and
  canonical nonnumeric Depth context while keeping NUTS, concordance, canary,
  replicated, floor, negative-control, and acceptance evidence `NOT_RUN` or
  zero. The strict confidence-engine bridge independently rederives the
  emitted binding graph, rejects malformed or unsafe coordinated rewrites,
  and permits only permanent `HOLD` smoke evidence. The VBD bridge remains an
  internal module and is intentionally absent from the confidence-engine
  package-root exports.
- `vbd_trajectory_validation_plan.py`,
  `vbd_trajectory_validation_controls.py`,
  `vbd_trajectory_validation_execution.py`,
  `vbd_trajectory_validation_study.py`,
  `vbd_trajectory_validation_resumable.py`, and
  `vbd_trajectory_validation_cli.py` implement the nonexecuted proof runner.
  The immutable plan contains exactly 2,000 original slots and 2,000 separately
  regenerated recomputation slots in 40 ordered chunks, plus four ordered
  full-setting canaries. Every child launch uses a create-once receipt with an
  inherited frozen-source, one-time capability, and parent-liveness pipes.
  Locked JSON I/O is descriptor-relative with root and admitted-subdirectory
  inode binding. Workspace path and
  inode identity, plan/freeze/concordance bytes, launch ordering, process
  attestations, phase roots, exact evidence bytes, and final combined readback
  fail closed. A copied or renamed workspace rejects, incomplete or malformed
  evidence HOLDS, and `combined.json` is not committed until a separate marker
  binds its hash and unchanged evidence snapshot. Review refs are unique GO
  references bound to candidate commit `S`; Git identity queries use a fixed
  system binary, a strict environment allowlist, explicit work-tree binding,
  and disabled executable local helpers. The complete compiled control set
  exercises production validation boundaries, including an explicit all-lane
  common-availability shock, a generated all-lane zero-variance panel through
  production preparation, and recomputation-shaped copied-checkpoint rejection
  at execution attestation. Canonical concordance admission persists the
  external receipt path/hash/device/inode and accepts only a receipt reverified
  from its complete external workspace on every load. No replacement acceptance seed, concordance fit,
  acceptance canary, or 2,000-slot evidence row has run in this source slice;
  exact candidate commit `S`, four independent GO reviews, and manifest-only
  freeze child `F` remain mandatory before execution.
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

Run the fast measurement-proof smoke artifact (always `HOLD`):

```bash
PYTHONPATH=inference/src inference/.venv/bin/python \
  -m fluencytracr_inference.ai_fluency_measurement_calibration_cli --mode smoke
```

The fixed full evidence path is intentionally serial and not configurable.
Run primary and recomputation as separate commands so either phase can resume
after interruption:

```bash
export PYTHONDONTWRITEBYTECODE=1
export PYTHONPATH=inference/src
export WORKSPACE=/private/tmp/fluencytracr-ai-fluency-measurement-calibration
export OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
export VECLIB_MAXIMUM_THREADS=1 NUMEXPR_NUM_THREADS=1

inference/.venv/bin/python \
  -m fluencytracr_inference.ai_fluency_measurement_calibration_resumable_cli \
  run-primary --workspace "$WORKSPACE"

inference/.venv/bin/python \
  -m fluencytracr_inference.ai_fluency_measurement_calibration_resumable_cli \
  run-recompute --workspace "$WORKSPACE"

inference/.venv/bin/python \
  -m fluencytracr_inference.ai_fluency_measurement_calibration_resumable_cli \
  combine --workspace "$WORKSPACE"
```
