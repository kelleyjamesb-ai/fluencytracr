## ADDED Requirements

### Requirement: Exact Longitudinal Replicated Calibration Plan

The system SHALL define exactly 1,200 synthetic state-space calibration slots
from effects `{0, 0.2, 0.5}` SD, panel-group counts `{6, 12}`, and replication
indexes `{0..199}`. Every calibration row SHALL bind aggregate Measurement
Cell `k=16`; panel-group count SHALL NOT substitute for `k`.

#### Scenario: Exact full plan is assembled

- **WHEN** all 20 compiled chunks contribute their exact 60 non-overlapping slots
- **THEN** every one of the six cells contains exactly 200 rows
- **AND** the full manifest contains exactly 1,200 unique rows in compiled order

#### Scenario: Plan evidence is incomplete or substituted

- **WHEN** evidence is missing, duplicated, off-plan, reordered, malformed,
  hash-invalid, runner-failed, hard-diagnostic, mixed-runtime, mixed-commit,
  mixed-lockfile, or mixed-implementation
- **THEN** the study SHALL HOLD

### Requirement: Compiled Longitudinal Calibration And Null Gates

The system SHALL require each 200-row cell to contain `148..172` rows whose
80% interval covers the injected standardized effect. It SHALL derive
binomial standard error for every cell. For each zero-effect cell, it SHALL
derive the two-sided internal validation signal predicate
`abs(posterior_mean/posterior_sd) > 1.959963984540054` and require at most
`10/200` signals. The worst null-cell rate SHALL be at most `0.05`.

#### Scenario: Calibration and null gates pass

- **WHEN** every cell has exactly 200 usable planned rows, every coverage
  count is within `148..172`, each null signal count is at most `10`, and no
  row has a hard failure
- **THEN** the numerical calibration/null gate MAY pass internally
- **AND** no customer, confidence, probability, causal, economic, or promotion authorization is created

#### Scenario: A row fails or a rate misses its gate

- **WHEN** any planned row fails or any cell falls outside a compiled integer gate
- **THEN** the study SHALL HOLD
- **AND** failed rows SHALL remain in the fixed 200-row denominator

### Requirement: Separate Longitudinal Floor Controls

The system SHALL test aggregate Measurement Cell floors at `k=4`, `k=8`,
`k=12`, and `k=16` separately from panel-group count. The compiled aggregate
provenance floor for the validation artifact SHALL be `k>=5`; `k` SHALL NOT
become a longitudinal model-input field. The compiled replicated-validation
floor SHALL be `k>=10`.

#### Scenario: Floor behavior matches the compiled policy

- **WHEN** the four floor controls execute
- **THEN** `k=4` rejects before fit, `k=8` remains valid internal-only below
  the validation floor, and `k=12` and `k=16` pass the validation floor while
  remaining nonauthorizing

#### Scenario: Floor and panel-group concepts are conflated

- **WHEN** a result uses panel-group count as aggregate `k` or attempts to fit `k=4`
- **THEN** the control manifest SHALL fail and the study SHALL HOLD

### Requirement: Fixed Lag Recovery And Robustness Controls

The system SHALL validate true lags `{1,2,3}` against candidate lags
`{0,1,2,3,4}` using the compiled deterministic selection procedure over 30
replications per true lag, and SHALL require at least `24/30` exact recoveries
for each true lag. It SHALL also execute the compiled uncontrolled common
shock, approved-control shock, unrelated outcome shock, temporary movement,
weak history, missing windows, unsafe data, unsupported route, and target
contamination controls.

#### Scenario: Lag and control evidence is complete

- **WHEN** every lag replication and every fixed control is present,
  hash-valid, on-plan, and matches its expected fail-closed behavior
- **THEN** the lag/control gate MAY pass internally

#### Scenario: A lag or control result is absent or unsafe

- **WHEN** a candidate score is missing/non-finite/tied, a true-lag recovery
  rate is below `24/30`, a negative control unexpectedly authorizes a signal,
  or any required control is missing or substituted
- **THEN** the study SHALL HOLD

### Requirement: Resumable Summary-Only Longitudinal Validation Artifact

The system SHALL support fixed plan, chunk, resume, control, canary, and
combine operations with atomic metadata-only checkpoints. It SHALL emit the
result only through a separate strict synthetic-only longitudinal validation
artifact that binds the plan, source commit, implementation, lockfile,
runtime, slot/control evidence, aggregate summaries, and hierarchical hashes.

#### Scenario: Smoke or partial execution is emitted

- **WHEN** a smoke, canary, partial, or incomplete execution is emitted
- **THEN** the artifact state SHALL be HOLD

#### Scenario: Exact full numerical evidence passes

- **WHEN** the complete exact study passes every compiled calibration, null,
  floor, lag, shock, negative-control, provenance, and hash gate
- **THEN** the artifact state MAY be `valid_internal_validation_non_authorizing`
- **AND** independent acceptance remains incomplete
- **AND** real/customer/live/production data, posterior draws, latent states,
  public interfaces, customer readouts, confidence/probability output, ROI,
  causality, productivity, finance output, and promotion remain absent or false
