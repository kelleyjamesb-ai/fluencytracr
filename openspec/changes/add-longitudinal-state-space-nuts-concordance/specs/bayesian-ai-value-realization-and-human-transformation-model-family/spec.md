## ADDED Requirements

### Requirement: Separate Longitudinal State-Space Validation Artifact

The system SHALL emit longitudinal state-space/NUTS concordance evidence only
through a separate synthetic-only internal validation artifact. Existing DiD
and longitudinal smoke artifact contracts SHALL remain unchanged.

#### Scenario: Complete study is separate and nonauthorizing

- **WHEN** all 30 required longitudinal concordance slots pass every compiled gate
- **THEN** the artifact state is `valid_internal_validation_non_authorizing`
- **AND** every customer, confidence, probability, ROI, causality,
  productivity, finance, route, UI, persistence, export, connector, and
  promotion authorization remains false or absent

#### Scenario: Smoke or partial evidence cannot impersonate validation

- **WHEN** smoke, reduced-setting, or partial evidence is presented as full validation
- **THEN** validation fails closed to HOLD or schema rejection

### Requirement: Matched Longitudinal State-Space Engines

The system SHALL fit the same pre-period-standardized Gaussian longitudinal
model with a deterministic integration engine and PyMC NUTS reference. The
model SHALL include zero-sum panel-group effects, bounded AR(1) state, known
aggregate SE, distinct Velocity and Breadth, baseline Fluency context, and
approved controls. Depth SHALL remain context only and minimum worthwhile
change SHALL not enter inference.

#### Scenario: Both engines consume one canonical input

- **WHEN** a synthetic concordance case executes
- **THEN** both engines bind the same prepared-input hash, parameter names,
  priors, standardization, covariance definition, and movement estimand

#### Scenario: Unsafe or contaminated input is supplied

- **WHEN** input contains real/customer/live/production data, person-level
  metadata, unsupported controls, missing uncertainty, target contamination,
  unapproved windows, unsupported routing, or malformed panels
- **THEN** no non-HOLD validation artifact can be emitted

### Requirement: Fixed Cross-Engine Concordance Gates

The system SHALL require per-quantity mean differences no greater than `0.15`
reference posterior SD, interval endpoint differences no greater than `0.20`
reference posterior SD, and primary/reference SD ratios in `[0.85, 1.15]`.

#### Scenario: Concordance operands pass

- **WHEN** all required summaries are finite, bound, and within every gate
- **THEN** concordance passes for that slot

#### Scenario: Concordance operand fails or is missing

- **WHEN** any required summary is absent, malformed, unbound, or outside a gate
- **THEN** the study state is HOLD

### Requirement: Fixed NUTS And Posterior Predictive Gates

The full reference SHALL use four chains, 1,000 draws, 2,000 tuning draws,
`target_accept=0.99`, and `max_treedepth=15`. It SHALL require finite positive R-hat at most
`1.01`, bulk/tail ESS at least `400`, zero divergences and treedepth
saturation, BFMI at least `0.3`, MCSE ratio at most `0.1`, and every compiled
PPC p-value in `[0.05, 0.95]`.

#### Scenario: Full reference diagnostics pass

- **WHEN** settings and every sampler/PPC gate pass
- **THEN** reference diagnostics pass for that slot

#### Scenario: Settings or diagnostics fail

- **WHEN** settings differ or a diagnostic is missing, non-finite, or failing
- **THEN** the study state is HOLD

### Requirement: Exact Six-Cell Five-Seed Concordance Plan

The system SHALL recognize only effects `{0, 0.2, 0.5}` SD crossed with group
counts `{6, 12}` and five compiled seeds per cell as complete concordance.

#### Scenario: Exact study is complete

- **WHEN** all 30 unique full-setting slots are present, on-plan, hash-valid,
  runner-generated, and passing
- **THEN** the generated artifact records a passed numerical concordance gate
- **AND** independent acceptance and replicated-validation execution remain
  false in that artifact
- **AND** a separate durable review record may unblock later replicated
  validation only after CODE, BUG, and ADVERSARIAL acceptance, without
  authorizing customer or production use

#### Scenario: Study evidence is incomplete or substituted

- **WHEN** a slot is missing, duplicate, off-plan, malformed, hash-invalid,
  runner-failed, reduced-setting, diagnostic-HOLD, PPC-HOLD, or discordant
- **THEN** the study HOLDS and replicated validation remains blocked
