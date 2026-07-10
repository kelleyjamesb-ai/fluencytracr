## ADDED Requirements

### Requirement: Model Family Decision Record

The system SHALL document `bayesian_ai_value_and_behavioral_evidence_model_family` as the canonical Bayesian architecture family for AI value and behavioral evidence while preserving the current Bayesian DiD implementation as `comparison_supported_bayesian_did_module`.

#### Scenario: DiD remains specialized

- **GIVEN** the current Bayesian proof harness is evaluated for future use
- **WHEN** the evidence design is not a valid two-group pre/post comparison-supported design
- **THEN** the current DiD implementation is not treated as the universal model and the evidence design must HOLD or route to a future approved model

#### Scenario: Model-family components are architecture concepts

- **GIVEN** the model-family decision record names future components such as `bayesian_fluency_measurement_model`, `bayesian_vbd_behavioral_trajectory_model`, `bayesian_hypothesis_outcome_model`, and `bayesian_economic_value_model`
- **WHEN** the record is interpreted
- **THEN** those components are treated as architecture concepts only until a later approved proposal implements and validates them

### Requirement: Current DiD Module Scope

The current DiD module SHALL be used only when the evidence design and comparison adequacy gates support a two-group pre/post comparison, and it SHALL NOT claim support for staggered rollout under the current implementation.

#### Scenario: Two-group pre/post comparison routes to DiD

- **GIVEN** an approved hypothesis has evidence design `TWO_GROUP_PRE_POST_COMPARISON`
- **WHEN** the comparison cohort, window, floor, diagnostic, calibration, peeking, and synthetic-only gates pass
- **THEN** the hypothesis may route to `comparison_supported_bayesian_did_module`

#### Scenario: Staggered rollout holds

- **GIVEN** an approved hypothesis has evidence design `STAGGERED_ROLLOUT`
- **WHEN** only the current two-group DiD implementation is available
- **THEN** the hypothesis must HOLD until true event-time, calendar-time, and not-yet-treated logic exists and is calibrated

#### Scenario: Matched comparison must still satisfy two-group assumptions

- **GIVEN** an approved hypothesis has evidence design `MATCHED_COMPARISON`
- **WHEN** the matched comparison does not satisfy true two-group pre/post assumptions
- **THEN** the hypothesis must not route to the current DiD module

### Requirement: Evidence Design Vocabulary

The architecture SHALL define additive evidence-design vocabulary consisting of `CONTROLLED_TEST`, `TWO_GROUP_PRE_POST_COMPARISON`, `STAGGERED_ROLLOUT`, `MATCHED_COMPARISON`, `HISTORICAL_STATE_SPACE`, `REPEATED_PRE_POST`, and `BASELINE_ONLY`.

#### Scenario: Unsupported designs fail closed

- **GIVEN** an evidence design requires a model not currently implemented
- **WHEN** the system evaluates routing
- **THEN** the design HOLDS rather than being forced through the current DiD module

#### Scenario: Baseline only produces no contribution confidence

- **GIVEN** an approved hypothesis has evidence design `BASELINE_ONLY`
- **WHEN** the architecture evaluates the hypothesis
- **THEN** it must not produce contribution confidence

#### Scenario: Historical and repeated designs require future longitudinal models

- **GIVEN** an approved hypothesis has evidence design `HISTORICAL_STATE_SPACE` or `REPEATED_PRE_POST`
- **WHEN** only the current DiD implementation exists
- **THEN** the design must HOLD pending a future longitudinal model proposal

### Requirement: Hypothesis Measurement Plan Boundary

The architecture SHALL define a Hypothesis Measurement Plan as the future governing input concept for model-family routing, including hypothesis identity, workflow scope, cohort scope, value route, expected behavior and outcome lags, primary metric, supporting metrics, guardrail metrics, relevant fluency dimensions, expected VBD signature, windows, source references, non-personal role/group/process owner references, minimum worthwhile change, known confounders, evidence design, finance pathway reference, and approval state.

#### Scenario: Owner references are non-personal governance references

- **GIVEN** a Hypothesis Measurement Plan declares metric or business owner references
- **WHEN** those references are recorded
- **THEN** they must identify roles, groups, review boards, or process records and must not contain named people, emails, user IDs, direct identifiers, or person-level owner fields

#### Scenario: Primary metric is the principal estimand

- **GIVEN** a Hypothesis Measurement Plan declares a primary metric and supporting metrics
- **WHEN** a future model evaluates the business-outcome estimand
- **THEN** only the approved primary metric is treated as the principal business-outcome estimand

#### Scenario: Supporting and guardrail metrics remain distinct

- **GIVEN** a Hypothesis Measurement Plan declares supporting metrics and guardrail metrics
- **WHEN** model-family routing or review interprets the plan
- **THEN** supporting metrics are mechanism evidence and guardrail metrics test risk, quality, or unintended consequences

#### Scenario: Metrics are not blended into a fixed weighted score

- **GIVEN** a Hypothesis Measurement Plan contains multiple metrics
- **WHEN** the architecture interprets those metrics
- **THEN** metrics must not be blended into an arbitrary fixed weighted score

#### Scenario: Blueprint target values are not priors

- **GIVEN** a Hypothesis Measurement Plan declares a Blueprint target value or minimum worthwhile change
- **WHEN** future Bayesian priors are specified
- **THEN** Blueprint target values must not be used as priors

### Requirement: Non-Authorization Boundary

The model-family decision SHALL preserve aggregate-only, synthetic/internal proof boundaries and SHALL NOT authorize runtime model-family code, production schemas, artifact schema changes, routes, UI, persistence, exports, migrations, live connector reads, customer-facing confidence percentages, probability output, ROI proof, finance output, productivity measurement, HR decisioning, ranking surfaces, or causality claims.

#### Scenario: Docs-only decision does not implement runtime behavior

- **GIVEN** the model-family decision record is present
- **WHEN** the repository is inspected for runtime behavior changes from this proposal
- **THEN** no runtime model code, schemas, routes, UI, persistence, exports, migrations, or live connector reads are added

#### Scenario: Existing DiD proof tasks remain incomplete

- **GIVEN** the model-family direction is adopted
- **WHEN** the existing `add-bayesian-inference-proof-harness` OpenSpec tasks are reviewed
- **THEN** tasks `3.3`, `3.4`, `4.2`, and `5.1` are not marked complete because of this decision alone

#### Scenario: Unsafe output remains blocked

- **GIVEN** a model-family component is named in architecture documentation
- **WHEN** a consumer attempts to use that name to emit customer-facing confidence, probability, ROI, finance, causality, productivity, HR, or ranking output
- **THEN** the output remains blocked until a later explicit approved proposal authorizes that exact scope
