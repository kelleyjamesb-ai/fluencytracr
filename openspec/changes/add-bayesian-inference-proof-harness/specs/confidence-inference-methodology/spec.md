## ADDED Requirements

### Requirement: Inference Boundary Separation

The system SHALL compute all statistics exclusively in the pinned Python inference package and perform all governance and artifact validation exclusively in TypeScript, with artifacts crossing the boundary only as JSON validated by the `ConfidenceModel` schemas, including the internal-only `InferenceProofArtifactSchema`, and the existing confidence-engine gates.

#### Scenario: Valid artifact crosses the boundary

- **GIVEN** the Python inference package emits a JSON artifact shaped for the confidence-engine contract
- **WHEN** the TypeScript side validates the artifact against the `ConfidenceModel` schemas and confidence-engine gates
- **THEN** the artifact validates and is admitted for governance processing

#### Scenario: Artifact with unknown fields is rejected

- **GIVEN** a JSON artifact containing fields not declared by the `ConfidenceModel` schemas
- **WHEN** the TypeScript side validates the artifact
- **THEN** validation rejects the artifact and no governance processing occurs

#### Scenario: Artifact self-hash is recomputed before acceptance

- **GIVEN** a JSON artifact whose `hash_bindings.artifact_self_hash` does not match the canonical hash of the artifact body
- **WHEN** the TypeScript side validates the artifact
- **THEN** validation rejects the artifact and no governance processing occurs

#### Scenario: No statistics computed in Node

- **GIVEN** the TypeScript governance code path is processing an inference artifact
- **WHEN** any posterior, diagnostic, or other statistical quantity is required
- **THEN** the value is read from the validated Python-emitted artifact and is never computed in Node

#### Scenario: Numeric proof values remain internal validation inputs

- **GIVEN** the Python inference package emits computed posterior and diagnostic values in an internal proof artifact
- **WHEN** the TypeScript side validates that artifact
- **THEN** numeric values are accepted only inside the internal-only proof schema, with customer, confidence, and probability output authorization pinned false

### Requirement: Model Equation Binding

The proof harness SHALL implement the hierarchical Bayesian difference-in-differences equation recorded in the methodology contract: aggregate Measurement Cell window outcomes are modeled with an approved likelihood family and link; the linear predictor includes baseline, post-period, treatment, treatment-by-post `delta`, expectation-path, workflow, function, cohort, and organization effects; and suppressed, stale, or missing windows HOLD rather than being imputed.

#### Scenario: Normal continuous aggregate path is implemented first

- **GIVEN** a Slice 2 synthetic proof run for the normal continuous aggregate metric family
- **WHEN** the model is fitted
- **THEN** the harness uses the contract equation with identity link, cohort-size-weighted aggregate variance, and no person-level rows

#### Scenario: Unsupported likelihood family cannot become eligible by declaration alone

- **GIVEN** an artifact declares a non-normal likelihood family
- **WHEN** the Slice 2 implementation has not implemented that sampler, diagnostics, and synthetic recovery suite
- **THEN** the artifact HOLDS and cannot become contribution-estimate eligible

#### Scenario: Missing or suppressed windows do not impute into eligibility

- **GIVEN** an aggregate Measurement Cell window is suppressed, stale, or missing
- **WHEN** the proof harness evaluates the model input
- **THEN** the artifact HOLDS naming missing or suppressed windows rather than imputing the window

#### Scenario: Measurement Cell window evidence is explicit

- **GIVEN** a proof artifact declares missing-or-suppressed window hold semantics
- **WHEN** the artifact is validated
- **THEN** it records required, observed, missing, suppressed, stale, and imputed Measurement Cell window evidence with one compact window ref per milestone day in each bucket, and any unavailable or imputed window blocks eligibility unless the artifact HOLDS naming missing or suppressed windows

### Requirement: Computed Diagnostics Gate

The system SHALL emit a confidence-bearing artifact only when every required diagnostic is computed as a real value and passes its numeric gate: sampler diagnostics include the selected-metric movement estimand parameter, R-hat <= 1.01 for all parameters (if any parameter's R-hat > 1.01 the artifact HOLDS naming R-hat), post-warmup divergent transitions = 0, max-treedepth saturation rate = 0, bulk-ESS >= 400, tail-ESS >= 400, MCSE for posterior mean and interval endpoints <= 0.1 posterior SD, posterior predictive p-values within [0.05, 0.95] for the fixed designated statistics, prior-sensitivity posterior-mean shift < 0.5 posterior SD, and the pre-period pseudo-effect 80% credible interval including 0. Rank and energy plots SHALL be recorded in the internal report artifact.

#### Scenario: All diagnostics computed and passing

- **GIVEN** a fitted model whose diagnostics are all computed values
- **WHEN** every diagnostic passes its numeric gate
- **THEN** the system emits an eligible confidence-bearing artifact

#### Scenario: Any diagnostic failure yields a HOLD-state artifact

- **GIVEN** a fitted model where at least one computed diagnostic fails its numeric gate
- **WHEN** the artifact is emitted
- **THEN** the artifact is in HOLD state and names the failing diagnostic

#### Scenario: Missing diagnostic yields HOLD

- **GIVEN** a fitted model where at least one required diagnostic, including the selected-metric movement estimand sampler diagnostic, is absent or not computed as a real value
- **WHEN** the artifact is emitted
- **THEN** the artifact is in HOLD state and identifies the missing diagnostic

#### Scenario: Divergence or weak tail support yields HOLD

- **GIVEN** a fitted model with any post-warmup divergent transition, positive max-treedepth saturation rate, tail-ESS below 400, or MCSE above the declared relative threshold
- **WHEN** the artifact is emitted
- **THEN** the artifact is in HOLD state and names the failing sampler diagnostic

#### Scenario: Posterior predictive statistics are fixed and complete

- **GIVEN** a fitted model with posterior predictive checks
- **WHEN** the artifact is emitted
- **THEN** it includes `pre_post_mean_movement`, `between_cohort_variance`, `within_cohort_variance`, `tail_or_extreme_cell_statistic`, and `difference_in_differences_contrast`, each with statistic name, observed value, posterior predictive 80% interval summary, p-value, and pass/fail

### Requirement: Synthetic Proof Before Real Data

The proof harness SHALL demonstrate known-effect recovery and calibration coverage on synthetic data — with the 80% credible interval covering the injected effect in 74–86% of at least 200 seeded replications per effect-size/cohort-size/scenario cell and null-effect false-eligibility at or below 5%, both computed on floor-eligible cohorts only (cohort counts k = 12 and k = 16) — before any real-observation execution is proposed. Synthetic cohorts at and around the floors SHALL test floor enforcement itself: k = 4 cohorts as floor-rejection tests (below the k>=5 schema floor, artifacts rejected) and k = 8 cohorts as internal-only-path tests (passing the k>=5 schema floor but below the k>=10 series display floor — valid but display-ineligible). The artifact SHALL report binomial uncertainty around observed coverage for every calibration cell.

#### Scenario: Calibration within band records proof

- **GIVEN** at least 200 seeded synthetic replications per injected-effect and cohort-size scenario cell on floor-eligible cohorts (k = 12 and k = 16)
- **WHEN** the 80% credible interval covers the injected effect in 74–86% of replications, the reported coverage standard error is derived from coverage rate and replication count, and null-effect false-eligibility is at or below 5%
- **THEN** the harness records the calibration proof

#### Scenario: Calibration outside band blocks real-data proposals

- **GIVEN** a completed synthetic replication run
- **WHEN** coverage falls outside the 74–86% band or null-effect false-eligibility exceeds 5%
- **THEN** the harness is blocked from proposing any real-observation execution

#### Scenario: Real data input is rejected

- **GIVEN** the proof harness receives input data
- **WHEN** the input is real customer or production observation data rather than synthetic data
- **THEN** the harness rejects the input and does not fit the model

#### Scenario: Negative controls prove fail-closed behavior

- **GIVEN** synthetic negative-control inputs for no credible comparison cohort, violated pre-trend, badly mismatched comparison cohort, prior-dominated weak data, missing or suppressed windows, and naive repeated milestone peeking
- **WHEN** the harness evaluates those inputs
- **THEN** each artifact is rejected, HOLD, or evidence-tier-only with the relevant failing condition named

### Requirement: Comparison Cohort Rule

The system SHALL emit no comparison-supported contribution estimate when no credible comparison cohort exists; in that case only an evidence-tier label MAY be emitted. A credible comparison cohort SHALL pass the runnable rubric in the methodology contract: same selected metric definition, aligned milestone windows, same metric direction, approved lag handling, same expectation path/workflow/function/cohort context unless explicitly justified by a reviewer-owned comparison-design adequacy reference, similar pre-period level/trend, no contamination, adequate aggregate floors, and no suppressed or stale windows. Causal language remains separately gated by the claim ladder (approved comparison evidence design at the validated rung); this rule's outputs are contribution estimates, never causal claims.

#### Scenario: Adequate cohort enables contribution-estimate eligibility

- **GIVEN** an analysis with a present and credible comparison cohort
- **WHEN** the artifact is evaluated for emission
- **THEN** the artifact is eligible to carry a comparison-supported contribution estimate

#### Scenario: Absent or inadequate cohort limits output to an evidence-tier label

- **GIVEN** an analysis with no comparison cohort or an inadequate one
- **WHEN** the artifact is evaluated for emission
- **THEN** only an evidence-tier label is emitted and no comparison-supported contribution estimate is present

#### Scenario: Forcing a contribution estimate without a cohort is rejected

- **GIVEN** an analysis with no credible comparison cohort
- **WHEN** a caller attempts to force emission of a comparison-supported contribution estimate
- **THEN** the attempt is rejected

#### Scenario: Missing comparison rubric check blocks contribution estimate

- **GIVEN** an analysis whose comparison cohort fails any required rubric check
- **WHEN** the artifact is evaluated for contribution-estimate eligibility
- **THEN** the artifact HOLDS or emits evidence-tier-only status and does not carry a comparison-supported contribution estimate

### Requirement: Milestone Peeking Control

The system SHALL treat Slice 2 inference proof artifacts as fixed-horizon, one-look artifacts unless the implementation proves a named always-valid sequential procedure in synthetic null simulations across the full Day 0/30/60/90/180/365 milestone, metric, and cohort family. The peeking-control milestone family SHALL match the artifact's required Measurement Cell window-evidence milestone family, and those required windows SHALL be observed, unsuppressed, fresh, and unimputed before eligibility.

#### Scenario: Fixed-horizon one-look artifact is allowed

- **GIVEN** a proof artifact with exactly one planned look and one included milestone
- **WHEN** no repeated evaluation across milestones, metrics, or cohorts occurred
- **THEN** the fixed-horizon artifact remains eligible if all other gates pass

#### Scenario: Proven sequential evaluation is allowed only with null proof

- **GIVEN** repeated evaluation of an effect across multiple milestones, metrics, or cohorts
- **WHEN** a named always-valid sequential procedure is implemented and its synthetic null proof demonstrates the declared false-eligibility bound
- **THEN** the evaluation may proceed only when the artifact records the method name, proof hash, completed Day 0/30/60/90/180/365 milestone schedule, and metric-family and cohort-family bindings

#### Scenario: Naive repeated evaluation marks the artifact ineligible

- **GIVEN** repeated evaluation across milestones, metrics, or cohorts
- **WHEN** no named always-valid procedure and synthetic null proof is present
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
