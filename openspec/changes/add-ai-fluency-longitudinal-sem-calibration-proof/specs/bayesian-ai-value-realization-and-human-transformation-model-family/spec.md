## ADDED Requirements

### Requirement: Frozen AI Fluency Long-Form Measurement Manifest

The system SHALL freeze `ai_fluency_long_v1` as a 24-item, five-category
ordered instrument with eight first-order constructs of three items each. The
five core constructs Confidence, Usage Quality, Behavior Change, Leadership
Reinforcement, and Capability Growth SHALL load on a second-order AI Fluency
factor. AI Attitude, Behavioral Intent, and Perceived AI Impact SHALL remain
separate constructs. No item SHALL be reverse coded.

The conceptual model version SHALL remain separate from the technical form id.
Baseline and formal follow-up SHALL use the same 24-item form. The 14-item form
SHALL remain pulse-only until a separate equating study is accepted.

#### Scenario: Exact long form is admitted

- **GIVEN** two aggregate waves bind the exact 24 items, ordered anchors,
  construct mapping, and manifest hash
- **WHEN** the measurement boundary validates the forms
- **THEN** same-form calibration may proceed to aggregate evidence validation
- **AND** no respondent score, person-level record, or customer output is
  created

#### Scenario: Short or drifted form holds

- **GIVEN** a wave uses the 14-item pulse form or changes an item, item order,
  anchor, construct mapping, scoring rule, or manifest hash
- **WHEN** the measurement boundary validates the wave
- **THEN** calibration HOLDS for incompatible form evidence
- **AND** no implicit equating or item substitution occurs

### Requirement: Privacy-Safe Aggregate Ordinal Evidence Package

The system SHALL accept only hash-bound aggregate measurement evidence for two
independent repeated-cross-sectional waves of the same approved cohort. Every
wave SHALL contain all 24 item-category count vectors and all 276 unique 5x5
item-pair tables, with per-item and per-pair observed/missing counts and exact
form, cohort, wave, window, source, owner-review, privacy, and synthetic-only
bindings.

Pair-local reconciliation SHALL NOT be treated as proof of a global joint
respondent distribution. Before synthetic fitting, the system SHALL regenerate
the complete package from the bound generator, scenario, seed, and compiled
sample size and require exact equality. Real aggregate packages SHALL remain
inadmissible until a separate trusted-source contract is approved.

The package SHALL reject respondent rows, identifiers, raw answers, titles,
free text, profiles, HR/personnel fields, behavior fields, direct identifiers,
unsafe values, real/live/customer/production flags, sparse tables, missing or
duplicate cells, incompatible forms, invalid hashes, and output authorization
attempts. Source-side respondent joins MAY occur inside the workbook solely to
compute aggregates, but join keys SHALL NOT be emitted.

#### Scenario: Complete aggregate evidence enters synthetic proof

- **GIVEN** both waves contain the complete frozen item and pair grid, pass the
  fixed privacy floors, and bind valid hashes
- **WHEN** the aggregate evidence validator runs
- **THEN** the package may enter the synthetic measurement proof
- **AND** the package contains no respondent, profile, behavior, raw-answer,
  or customer-output fields

#### Scenario: Sparse or unsafe evidence fails closed

- **GIVEN** a candidate wave is sparse, incomplete, off-plan, unreviewed,
  hash-invalid, person-level, behavior-contaminated, or marked as real,
  customer, production, or live data
- **WHEN** the validator runs
- **THEN** the package rejects or HOLDS before model fitting
- **AND** sparse tables and unsafe values are not emitted

### Requirement: Synthetic Longitudinal Ordinal Measurement Proof

The system SHALL implement an aggregate-count-only synthetic ordinal-probit
measurement proof for the frozen long form. The proof SHALL compute exact
configural structure checks, eight first-order loading and ordinal reliability
summaries, five-core second-order structure summaries, cross-wave loading
stability, cross-wave threshold stability after freeing construct-level
follow-up latent means, and synthetic parameter-recovery diagnostics. It SHALL
NOT reconstruct or emit respondent scores, posterior draws, or latent states.

The runner SHALL provide a fixed full plan with 200 seeded replications in each
of invariant, invariant-latent-shift, loading-drift, and threshold-drift
scenarios and a reduced smoke mode. Artifact emission SHALL freshly recompute
every compiled slot through a separately identified resumable recomputation
phase, and atomic combine SHALL admit only exact primary and recomputation
checkpoint manifests bound to the same clean source, runtime, and immutable
plan. Smoke, partial, duplicate, off-plan,
malformed, hash-invalid, or runner-error evidence SHALL HOLD and SHALL NOT
complete parent task `5.5`.

#### Scenario: Invariant synthetic waves pass internal proof

- **GIVEN** complete synthetic aggregate evidence generated from the frozen
  same-form measurement structure
- **WHEN** all compiled reliability, recovery, loading-stability, and
  threshold-stability diagnostics pass
- **THEN** the artifact may record a valid internal synthetic non-authorizing
  result
- **AND** customer output, confidence/probability output, real-data admission,
  routes, UI, persistence, ROI, causality, and productivity remain false

#### Scenario: Drift controls are detected

- **GIVEN** synthetic follow-up data contains predeclared loading drift or
  threshold drift
- **WHEN** the corresponding control study runs
- **THEN** the artifact names the failed invariance diagnostic and HOLDS
- **AND** the failure cannot be rescued by behavior evidence or outcome data

#### Scenario: Genuine latent movement does not become item drift

- **GIVEN** the follow-up construct means move while the frozen item loadings
  and thresholds remain invariant
- **WHEN** the two-wave threshold diagnostic frees construct-level follow-up
  latent means
- **THEN** the invariant-latent-shift control passes
- **AND** latent movement is not mislabeled as threshold non-invariance

#### Scenario: Incomplete study remains HOLD

- **GIVEN** only smoke evidence or fewer than the fixed full replication slots
  are present
- **WHEN** the calibration artifact is emitted
- **THEN** its state is HOLD with incomplete-study evidence
- **AND** parent task `5.5` remains incomplete

### Requirement: Behavior Evidence Remains Outside AI Fluency Measurement

The six usage-behavior questions SHALL remain separate aggregate
pathway/corroboration evidence. They SHALL NOT load on the AI Fluency factor,
alter measurement-model eligibility, change a company metric estimate, or
rescue a HOLD calibration result.

#### Scenario: Behavior fields cannot contaminate calibration

- **GIVEN** measurement evidence contains a usage-behavior key, value,
  frequency, summary, or derived behavior score
- **WHEN** the measurement validator runs
- **THEN** the evidence rejects before fitting
- **AND** the behavior signal remains available only through a separately
  governed aggregate evidence lane

### Requirement: Measurement Proof Non-Authorization

The measurement proof SHALL remain synthetic-only, aggregate-only, internal,
noncausal, and nonauthorizing. It SHALL NOT add or authorize real/live/customer
data, routes, UI, persistence, schemas, connectors, public exports, customer
readouts, confidence or probability output, ROI, finance, causality,
productivity, ranking, individual scoring, new canonical events, new
suppression reasons, tunable thresholds, or a promotion decision.

#### Scenario: Passing synthetic proof does not authorize product use

- **GIVEN** every synthetic calibration diagnostic passes
- **WHEN** downstream governance reviews the artifact
- **THEN** all product and customer-output authorization flags remain false
- **AND** separate full-evidence, real-data admission, monitoring, language,
  persistence, and UI decisions remain required
