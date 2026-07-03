## ADDED Requirements

### Requirement: Inference Boundary Separation

The system SHALL compute all statistics exclusively in the pinned Python inference package and perform all governance and artifact validation exclusively in TypeScript, with artifacts crossing the boundary only as JSON validated by the `ConfidenceModel` schemas and the existing confidence-engine gates.

#### Scenario: Valid artifact crosses the boundary

- **GIVEN** the Python inference package emits a JSON artifact shaped for the confidence-engine contract
- **WHEN** the TypeScript side validates the artifact against the `ConfidenceModel` schemas and confidence-engine gates
- **THEN** the artifact validates and is admitted for governance processing

#### Scenario: Artifact with unknown fields is rejected

- **GIVEN** a JSON artifact containing fields not declared by the `ConfidenceModel` schemas
- **WHEN** the TypeScript side validates the artifact
- **THEN** validation rejects the artifact and no governance processing occurs

#### Scenario: No statistics computed in Node

- **GIVEN** the TypeScript governance code path is processing an inference artifact
- **WHEN** any posterior, diagnostic, or other statistical quantity is required
- **THEN** the value is read from the validated Python-emitted artifact and is never computed in Node

### Requirement: Computed Diagnostics Gate

The system SHALL emit a confidence-bearing artifact only when every required diagnostic is computed as a real value and passes its numeric gate: R-hat <= 1.05 as a hard fail bound with <= 1.01 as target, bulk-ESS >= 400, posterior predictive p-values within [0.05, 0.95], prior-sensitivity posterior-mean shift < 0.5 posterior SD, and the pre-period pseudo-effect 80% credible interval including 0.

#### Scenario: All diagnostics computed and passing

- **GIVEN** a fitted model whose diagnostics are all computed values
- **WHEN** every diagnostic passes its numeric gate
- **THEN** the system emits an eligible confidence-bearing artifact

#### Scenario: Any diagnostic failure yields a HOLD-state artifact

- **GIVEN** a fitted model where at least one computed diagnostic fails its numeric gate
- **WHEN** the artifact is emitted
- **THEN** the artifact is in HOLD state and names the failing diagnostic

#### Scenario: Missing diagnostic yields HOLD

- **GIVEN** a fitted model where at least one required diagnostic is absent or not computed as a real value
- **WHEN** the artifact is emitted
- **THEN** the artifact is in HOLD state and identifies the missing diagnostic

### Requirement: Synthetic Proof Before Real Data

The proof harness SHALL demonstrate known-effect recovery and calibration coverage on synthetic data — with the 80% credible interval covering the injected effect in 74–86% of at least 200 seeded replications and null-effect false-eligibility at or below 5% — before any real-observation execution is proposed.

#### Scenario: Calibration within band records proof

- **GIVEN** at least 200 seeded synthetic replications with injected known effects
- **WHEN** the 80% credible interval covers the injected effect in 74–86% of replications and null-effect false-eligibility is at or below 5%
- **THEN** the harness records the calibration proof

#### Scenario: Calibration outside band blocks real-data proposals

- **GIVEN** a completed synthetic replication run
- **WHEN** coverage falls outside the 74–86% band or null-effect false-eligibility exceeds 5%
- **THEN** the harness is blocked from proposing any real-observation execution

#### Scenario: Real data input is rejected

- **GIVEN** the proof harness receives input data
- **WHEN** the input is real customer or production observation data rather than synthetic data
- **THEN** the harness rejects the input and does not fit the model

### Requirement: Comparison Cohort Rule

The system SHALL emit no causal number when no credible comparison cohort exists; in that case only an evidence-tier label MAY be emitted.

#### Scenario: Adequate cohort enables causal-number eligibility

- **GIVEN** an analysis with a present and credible comparison cohort
- **WHEN** the artifact is evaluated for emission
- **THEN** the artifact is eligible to carry a causal number

#### Scenario: Absent or inadequate cohort limits output to an evidence-tier label

- **GIVEN** an analysis with no comparison cohort or an inadequate one
- **WHEN** the artifact is evaluated for emission
- **THEN** only an evidence-tier label is emitted and no causal number is present

#### Scenario: Forcing a causal number without a cohort is rejected

- **GIVEN** an analysis with no credible comparison cohort
- **WHEN** a caller attempts to force emission of a causal number
- **THEN** the attempt is rejected

### Requirement: Milestone Peeking Control

The system SHALL apply always-valid or sequential correction, consistent with the internal A/B testing playbook, to any repeated evaluation across the Day 0/30/60/90/180/365 milestones and across multiple metrics.

#### Scenario: Corrected sequential evaluation is allowed

- **GIVEN** repeated evaluation of an effect across multiple milestones and metrics
- **WHEN** always-valid or sequential correction consistent with the internal A/B testing playbook is applied
- **THEN** the evaluation proceeds and the artifact remains eligible

#### Scenario: Naive repeated evaluation marks the artifact ineligible

- **GIVEN** repeated evaluation across milestones or metrics
- **WHEN** no always-valid or sequential correction is applied
- **THEN** the artifact is marked ineligible

### Requirement: Prior Policy

Priors SHALL be weakly informative and empirically justified, prior-sensitivity analysis SHALL always be run and reported, and an artifact whose conclusion is prior-driven SHALL hold.

#### Scenario: Justified prior with sensitivity report is eligible

- **GIVEN** a model whose priors are weakly informative with documented empirical justification
- **WHEN** the prior-sensitivity analysis is run and reported alongside the artifact
- **THEN** the artifact is eligible

#### Scenario: Unjustified or undocumented prior yields HOLD

- **GIVEN** a model whose priors lack empirical justification or documentation
- **WHEN** the artifact is emitted
- **THEN** the artifact is in HOLD state

#### Scenario: Prior-driven conclusion yields HOLD naming prior sensitivity

- **GIVEN** a completed prior-sensitivity analysis
- **WHEN** the posterior-mean shift is at or above 0.5 posterior SD
- **THEN** the artifact is in HOLD state and names prior sensitivity as the cause

### Requirement: Internal-Only Probability Representations

Threshold-probability and expected-loss representations SHALL be internal-only with `customer_output_authorized` pinned false, and any customer-facing probability language SHALL require a separate recorded human promotion decision.

#### Scenario: Internal representation validates with authorization pinned false

- **GIVEN** an artifact carrying threshold-probability or expected-loss representations
- **WHEN** the artifact is validated
- **THEN** it validates only with `customer_output_authorized` equal to false

#### Scenario: Representation claiming customer authorization is rejected

- **GIVEN** an artifact carrying a probability representation with `customer_output_authorized` set to true
- **WHEN** the artifact is validated
- **THEN** validation rejects the artifact

#### Scenario: Exposure blocked without a recorded promotion decision

- **GIVEN** a request to expose probability language to customers
- **WHEN** no separate human promotion decision is recorded
- **THEN** the exposure is blocked

### Requirement: Aggregate Floor Enforcement

Cohort evidence SHALL respect the k>=5 schema floor with cross-validation against the stated floor, and series display SHALL respect the k>=10 floor.

#### Scenario: Cohort below the schema floor is rejected

- **GIVEN** cohort evidence with fewer than 5 members
- **WHEN** the artifact is validated
- **THEN** validation rejects the artifact

#### Scenario: Cohort below its stated floor is rejected

- **GIVEN** cohort evidence declaring a stated floor of 10 with an actual cohort size of 7
- **WHEN** the stated floor is cross-validated against the cohort size
- **THEN** validation rejects the artifact

#### Scenario: Compliant cohort is accepted

- **GIVEN** cohort evidence meeting the k>=5 schema floor, consistent with its stated floor, and meeting the k>=10 series display floor where series are displayed
- **WHEN** the artifact is validated
- **THEN** the artifact is accepted
