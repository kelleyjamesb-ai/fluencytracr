## ADDED Requirements

### Requirement: Longitudinal Smoke V2 Is Structurally Bound And Truthful

The longitudinal synthetic proof SHALL emit a V2 internal smoke artifact only
after validating finite aligned aggregate arrays, positive aggregate outcome
uncertainty, a balanced ordered panel, valid windows and evaluation refs,
aligned approved controls, nonempty aggregate AI Fluency snapshots with
measurement uncertainty, an approved hypothesis plan, and synthetic-only data
flags. Fixture scenario and ground-truth oracle fields SHALL NOT be model
inputs. Seeds SHALL be nonnegative JavaScript-safe integers, generation
timestamps SHALL be timezone-aware RFC3339 values, and business controls SHALL
use compiled synthetic identity/source pairs. Unknown designs and DiD-routed
designs SHALL reject before longitudinal artifact emission; known unsupported
negative-control designs SHALL remain bridge-valid HOLD artifacts. The fit
SHALL bind to the exact synthetic input hash, diagnostics SHALL
bind to the exact fit-summary hash, and the artifact SHALL carry and validate
both bindings. Structural or binding mismatches SHALL reject before
interpretation and SHALL NOT be repaired by rehashing.

For V2, the TypeScript bridge SHALL derive no-fit HOLD reasons in the same
precedence order as the Python input gates and SHALL recompute the compiled
backtest, lag, and temporary-persistence thresholds from their emitted
operands. Unsafe personnel or control metadata SHALL reject before Python
artifact emission; a redacted V2 privacy-violation artifact SHALL also reject
at the bridge.

The synthetic-input and diagnostics-fit consistency roots SHALL each bind an
emitted evidence hash plus a private remainder hash. The final fit-summary root
SHALL bind the synthetic-input root, diagnostics-fit root, and emitted
fit-output evidence covering the posterior summary, analytic draw count, and
pathway evidence. Rewriting
emitted input, diagnostic, or fit-output operands while retaining the original
root SHALL reject. Replacing every unkeyed root remains outside authenticity
guarantees and requires a separately approved trusted envelope.

#### Scenario: Fit from another dataset rejects

- **GIVEN** a valid fit and diagnostics generated from one synthetic dataset
- **WHEN** an emitter attempts to attach them to a different synthetic dataset
- **THEN** V2 artifact emission rejects before interpretation
- **AND** refreshing an artifact self-hash cannot make that mismatch valid

#### Scenario: Malformed aggregate structure rejects

- **GIVEN** a longitudinal dataset with mismatched lengths, non-finite values,
  nonpositive aggregate standard error, invalid panel indices, malformed
  controls, invalid windows, missing snapshots, or an unapproved plan
- **WHEN** fitting or artifact emission is attempted
- **THEN** the input rejects before posterior interpretation

#### Scenario: Coordinated threshold or HOLD relabel rejects

- **GIVEN** a V2 artifact whose emitted threshold or no-fit HOLD reason is
  changed without changing the evidence from which it is derived
- **WHEN** both unkeyed artifact hashes are recomputed
- **THEN** the TypeScript bridge independently derives the contradiction and
  rejects the artifact

#### Scenario: Unsafe metadata emits no V2 artifact

- **GIVEN** a synthetic input carrying unsafe personnel or control metadata
- **WHEN** the longitudinal runner is invoked
- **THEN** structural validation rejects before artifact emission
- **AND** the TypeScript bridge rejects any forged redacted V2 privacy artifact

### Requirement: Longitudinal Smoke V2 Makes No Sampler Or Forecast Claim

V2 SHALL identify the implementation as closed-form Gaussian analytic smoke
regression with an independent Gaussian likelihood and a post-hoc AR(1)
diagnostic only. V2 SHALL pin NUTS usage, modeled AR(1), partial pooling,
historical forecasting, and MCMC chain count to false or zero. Posterior
predictive checks, sampler diagnostics, actual prior-sensitivity refits, a real
pre-period placebo study, and full counterfactual-stability analysis SHALL be
`NOT_RUN` and SHALL NOT carry a passing result. Every non-HOLD V2 artifact SHALL use
`valid_internal_smoke_non_authorizing`.

V2 hashes SHALL detect inconsistent or partial rebinding. They SHALL NOT be
described as trusted signatures or as proof of authenticity against coordinated
payload-and-hash replacement.

#### Scenario: Clean smoke remains nonauthorizing

- **GIVEN** a structurally valid clean synthetic dataset whose executed smoke
  checks pass
- **WHEN** the V2 artifact is emitted
- **THEN** its state is `valid_internal_smoke_non_authorizing`
- **AND** all output and promotion authorizations remain false
- **AND** replicated calibration remains incomplete

#### Scenario: Rehashed model overclaim rejects

- **GIVEN** a V2 artifact whose model fields are changed to claim NUTS,
  modeled AR(1), partial pooling, historical forecasting, MCMC chains, PPC,
  sampler diagnostics, prior sensitivity, or full counterfactual stability
- **WHEN** its self-hash is recomputed
- **THEN** the TypeScript bridge still rejects the artifact

### Requirement: V1 Remains Legacy-Readable But Cannot Satisfy V2

The confidence-engine boundary SHALL retain an explicit V1 validator for
historical synthetic smoke fixtures and SHALL expose V1/V2 version-aware
validation. A V1 artifact SHALL remain legacy internal smoke evidence only and
SHALL NOT satisfy V2, state-space, NUTS, concordance, or replicated-validation
requirements.

#### Scenario: Historical V1 fixture remains readable

- **GIVEN** an unchanged valid V1 synthetic longitudinal smoke fixture
- **WHEN** it is validated through the version-aware bridge
- **THEN** it remains readable as V1 legacy smoke evidence
- **AND** it cannot be treated as current V2 or future sampler evidence

### Requirement: Longitudinal Boundary Preserves All Non-Authorizations

The change SHALL add no DiD behavior, real/customer/live/production data path,
route, UI, persistence, export, connector, customer output,
confidence/probability output, ROI, finance, causality, productivity, economic
output, canonical event, suppression reason, tunable threshold, admin override,
or promotion decision.

#### Scenario: Boundary inspection finds no product authorization

- **GIVEN** the V2 smoke boundary implementation
- **WHEN** code, contracts, and artifacts are inspected
- **THEN** every prohibited output and promotion flag remains false
- **AND** the DiD implementation and its incomplete tasks remain unchanged
