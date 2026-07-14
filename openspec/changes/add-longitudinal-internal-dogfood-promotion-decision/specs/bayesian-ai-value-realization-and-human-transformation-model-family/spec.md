## ADDED Requirements

### Requirement: Longitudinal Internal-Dogfood Promotion Is Exact And Conditional

The model family SHALL record
`CONDITIONAL_PROMOTION_TO_BOUNDED_INTERNAL_DOGFOOD` only for the exact
`HISTORICAL_STATE_SPACE` path identified by the accepted artifact fields
`model_family=bayesian_ai_value_realization_and_human_transformation_model_family`,
`model_slice=longitudinal_state_space_replicated_validation`,
`model_specification.model_kind=gaussian_longitudinal_zero_sum_ar1_state_space`,
`model_specification.likelihood_family=continuous_normal_identity`, and
`model_specification.link_function=identity`. The artifact slice is the
accepted validation implementation under the conceptual model-family component
`first_longitudinal_synthetic_model_slice`; that conceptual label SHALL NOT be
serialized as an alternate `model_slice` value or accepted as an alias. The
decision SHALL bind the accepted full evidence artifact SHA-256, artifact
self-hash, acceptance-record SHA-256, and acceptance-record self-hash.

The simultaneous effective execution state SHALL be
`HOLD_PENDING_LONGITUDINAL_DOGFOOD_PREREQUISITES`. The decision SHALL authorize
only later prerequisite contract hardening while that state applies. It SHALL
NOT authorize current model execution, data access, runtime routing, output, or
activation.

`REPEATED_PRE_POST`, the `comparison_supported_bayesian_did_module`, controlled
tests, staggered rollout, unsupported likelihoods, and economic model
components SHALL remain outside this decision.

#### Scenario: Exact accepted model advances only to prerequisite hardening

- **GIVEN** the accepted longitudinal evidence hashes and exact historical
  state-space model identity match the decision record
- **WHEN** the promotion decision is reviewed before later prerequisites exist
- **THEN** the conditional promotion may authorize only the named prerequisite
  contract sequence
- **AND** the effective execution state remains
  `HOLD_PENDING_LONGITUDINAL_DOGFOOD_PREREQUISITES`
- **AND** no model execution, data access, or output is authorized

#### Scenario: Another route cannot inherit the decision

- **GIVEN** an analysis requests repeated-pre/post, DiD, controlled-test,
  staggered-rollout, unsupported-likelihood, or economic-model behavior
- **WHEN** this promotion decision is presented
- **THEN** the request remains outside scope and HOLDS
- **AND** the decision cannot be relabeled, aliased, or generalized to admit it

#### Scenario: Evidence identity drift holds

- **GIVEN** any accepted evidence or acceptance-record hash differs from the
  decision binding
- **WHEN** the conditional promotion is reviewed
- **THEN** the pathway HOLDS pending a new independent evidence review

### Requirement: Longitudinal Dogfood Prerequisites Are Conjunctive And Fail Closed

Before any bounded internal-dogfood activation, the model family SHALL require
accepted AI Fluency measurement-model calibration, accepted VBD
trajectory-model calibration, an exact real-data admission and source-binding
contract, runtime monitoring and fail-closed validation, approved restricted
readout and HOLD-presentation language, one frozen pilot manifest, and a later
explicit human-approved real-data execution decision. The manifest SHALL bind
every analysis unit; one canonical `(workflow_id, jbtd_id, persona_id)` tuple
per panel group; independent per-window gate-receipt hashes; immutable metric,
source, cohort, control, exposure, baseline-Fluency, window, and uncertainty
refs/hashes; one fixed terminal look; a hash-bound pre-outcome access receipt;
non-personal operator/reviewer/decision-owner role refs; and every prerequisite
artifact/hash. Retrospective plan creation, repair, replacement, or outcome-
informed rebinding SHALL NOT satisfy admission.

The frozen manifest SHALL be evidence for, not authority to replace, the later
human execution decision. That decision SHALL bind the exact manifest and
record every required prerequisite as passing before any data access,
preparation, fit, or artifact emission. Missing, incomplete, stale, malformed,
conflicting, failed, hash-invalid, off-manifest, suppressed, or unreviewed
evidence SHALL keep execution held. Schema presence, fixture success, synthetic
acceptance, planning readiness, or partial prerequisite completion SHALL NOT
imply admission. The existing Glean Dogfood BigQuery Adapter SHALL NOT count as
source clearance or confidence-model input admission. No administrative
override, threshold configuration, partial activation, or cross-slice
suppression rescue is permitted.

Aggregate `k=16` SHALL remain accepted replicated synthetic-proof provenance,
not a threshold compiled, configured, or authorized for dogfood by this
decision. A later admission and execution decision SHALL reconcile its exact
aggregate floor with the proved envelope and existing invariants and SHALL NOT
represent separate floor-control results as replicated calibration.

#### Scenario: One missing prerequisite keeps execution held

- **GIVEN** any calibration, admission, source-binding, runtime, language,
  review, manifest, or explicit human execution-decision requirement is absent
  or not passing
- **WHEN** bounded internal-dogfood execution is requested
- **THEN** execution remains held before fit
- **AND** no available prerequisite may rescue the missing one

#### Scenario: Planning or synthetic readiness does not admit real data

- **GIVEN** a Measurement Plan, Measurement Cell, source package, fixture, or
  synthetic proof is ready
- **WHEN** the separate real-data admission and source-binding contract is
  absent or incomplete
- **THEN** Glean-internal, customer, production, and live data remain
  inadmissible

#### Scenario: Frozen manifest prevents scope expansion

- **GIVEN** a later human-approved real-data execution decision binds one exact
  frozen pilot manifest and every passing prerequisite
- **WHEN** an off-manifest analysis unit, source, metric family, model route, or
  reviewer is introduced
- **THEN** the new scope HOLDS and cannot inherit the manifest-bound execution
  decision

#### Scenario: Manifest cannot self-activate execution

- **GIVEN** a complete frozen pilot manifest exists
- **WHEN** no separate human-approved real-data execution decision binds that
  manifest and every passing prerequisite
- **THEN** data access, preparation, fitting, and artifact emission remain held

#### Scenario: Existing dogfood adapter is not model-source clearance

- **GIVEN** the Glean Dogfood BigQuery Adapter can emit its existing governed
  aggregate payload
- **WHEN** longitudinal model-source admission is reviewed
- **THEN** the adapter does not satisfy source binding, Measurement Cell proof,
  or confidence-model input admission
- **AND** the separate admission and execution decisions remain required

### Requirement: Internal Dogfood Purpose And Audience Remain Restricted

The future bounded internal-dogfood purpose SHALL be limited to reviewing
aggregate source admission, model adequacy, diagnostics, and fail-closed HOLD
behavior for the exact model path. The permitted audience SHALL be limited to
immutable non-personal role refs for an internal model operator, statistical
methodology reviewer, value governance reviewer, and decision owner recorded
in the frozen pilot manifest. Direct identifiers SHALL NOT enter that manifest.
The decision SHALL NOT authorize broad internal distribution, executive or
sales reporting, customer use, or production use.

This decision SHALL keep customer output, confidence output, probability
output, AI-impact attribution, causal claims, ROI, productivity measurement,
finance output, score-like output, ranking, HR analytics, routes, UI,
persistence, connectors, exports, schemas, APIs, canonical events, suppression
reasons, tunable thresholds, and admin overrides blocked. HOLD remains an
internal admission/execution posture and SHALL NOT create a sixth canonical
suppression reason.

This decision SHALL authorize no posterior or derived model-result output,
including summaries, intervals, coefficients, direction, magnitude,
diagnostics-derived claims, raw draws, or execution artifacts. A later
readout-language decision SHALL NOT infer permission from the existence of this
conditional promotion; it must define and separately approve every restricted
review field while preserving the blocked uses above.

#### Scenario: Method review does not become an impact claim

- **GIVEN** a future restricted reviewer observes model alignment or a passing
  diagnostic state
- **WHEN** the evidence is discussed or recorded
- **THEN** it may be used only for the approved internal method review
- **AND** it cannot be stated as confidence or probability that AI caused a
  metric change
- **AND** it cannot become ROI, productivity, finance, customer, executive, or
  score-like output

#### Scenario: Broad distribution remains blocked

- **GIVEN** a future artifact is requested for an executive, seller, customer,
  production route, UI, export, or connector
- **WHEN** this decision is cited as authority
- **THEN** the request is rejected or held
- **AND** no output surface is created

### Requirement: Promotion Decisions Do Not Imply One Another

This decision SHALL remain distinct from the existing contained-fixture
Bayesian Promotion Decision Gate and from any future customer-facing promotion
decision in the confidence-inference methodology. Passing or documenting any
one decision SHALL NOT satisfy another decision's source, diagnostic,
admission, audience, model-family, claim-language, or output requirements.

OpenSpec tasks `5.5` through `5.8` in
`add-ai-fluency-instrument-snapshot-longitudinal-proof` SHALL remain incomplete.
This decision SHALL NOT complete measurement-model calibration, VBD trajectory
calibration, AI Fluency snapshot persistence promotion, backend read
projection, or UI integration.

#### Scenario: Legacy promotion gate cannot activate longitudinal dogfood

- **GIVEN** the existing contained-fixture Bayesian Promotion Decision Gate
  passes for its own source chain
- **WHEN** longitudinal internal-dogfood eligibility is reviewed
- **THEN** none of the longitudinal prerequisites is inferred to pass
- **AND** the effective longitudinal state remains HOLD unless its own exact
  chain passes

#### Scenario: Conditional dogfood decision does not authorize customer output

- **GIVEN** this docs-only conditional decision exists
- **WHEN** customer-facing confidence, probability, attribution, or economic
  output is requested
- **THEN** the request remains unauthorized
- **AND** the customer-facing promotion requirement remains unsatisfied
