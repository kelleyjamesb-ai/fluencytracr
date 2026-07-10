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

#### Scenario: Two-group pre/post comparison is contract-eligible for DiD

- **GIVEN** an approved hypothesis has evidence design `TWO_GROUP_PRE_POST_COMPARISON`
- **WHEN** the comparison cohort, window, floor, diagnostic, calibration, peeking, and synthetic-only gates pass
- **THEN** the hypothesis is contract-eligible for `comparison_supported_bayesian_did_module`

#### Scenario: Staggered rollout holds

- **GIVEN** an approved hypothesis has evidence design `STAGGERED_ROLLOUT`
- **WHEN** only the current two-group DiD implementation is available
- **THEN** the hypothesis must HOLD until true event-time, calendar-time, adoption-time, and not-yet-treated logic exists and is calibrated

#### Scenario: Matched comparison must still satisfy two-group assumptions

- **GIVEN** an approved hypothesis has evidence design `MATCHED_COMPARISON`
- **WHEN** the matched comparison does not satisfy true two-group pre/post assumptions
- **THEN** the hypothesis must not route to the current DiD module

### Requirement: Evidence Design Router Vocabulary

The architecture SHALL define additive evidence-design router vocabulary consisting of `CONTROLLED_TEST`, `TWO_GROUP_PRE_POST_COMPARISON`, `STAGGERED_ROLLOUT`, `MATCHED_COMPARISON`, `HISTORICAL_STATE_SPACE`, `REPEATED_PRE_POST`, and `BASELINE_ONLY`, with contract support status, current contract-eligible module, required gates, claim cap, and unsupported/HOLD behavior for each design.

#### Scenario: Unsupported designs fail closed

- **GIVEN** an evidence design requires a model not currently implemented
- **WHEN** the system evaluates routing
- **THEN** the design HOLDS rather than being forced through the current DiD module

#### Scenario: Economic assumptions cannot upgrade routing

- **GIVEN** a hypothesis contains finance pathway refs, economic assumptions, Blueprint promises, sponsor goals, or target values
- **WHEN** the evidence design is weak or unsupported
- **THEN** those assumptions must not upgrade the allowed route, claim cap, or design strength

#### Scenario: Baseline only produces no contribution confidence

- **GIVEN** an approved hypothesis has evidence design `BASELINE_ONLY`
- **WHEN** the architecture evaluates the hypothesis
- **THEN** it must not produce contribution confidence

#### Scenario: Historical and repeated designs require future longitudinal models

- **GIVEN** an approved hypothesis has evidence design `HISTORICAL_STATE_SPACE` or `REPEATED_PRE_POST`
- **WHEN** only the current DiD implementation exists
- **THEN** the design must HOLD pending a future longitudinal model proposal

#### Scenario: Staggered rollout requires future event logic

- **GIVEN** an approved hypothesis has evidence design `STAGGERED_ROLLOUT`
- **WHEN** event-time, calendar-time, adoption-time, and not-yet-treated comparison logic are not implemented and calibrated
- **THEN** the design must HOLD and must not route to the current two-group DiD module

### Requirement: Hypothesis Measurement Plan Boundary

The architecture SHALL define a Hypothesis Measurement Plan as the future governing input concept for model-family routing, including hypothesis identity, workflow scope, cohort scope, value route, expected behavior and outcome lags, primary metric, supporting metrics, guardrail metrics, relevant fluency dimensions, expected VBD signature, windows, source references, non-personal role/group/process owner references, minimum worthwhile change, known confounders, evidence design, finance pathway reference, and approval state.

The required conceptual fields SHALL be `hypothesis_id`, `hypothesis_statement`, `function_area`, `workflow_family`, `cohort_scope`, `value_route`, `expected_work_change`, `expected_metric_direction`, `expected_behavior_signal_lag`, `expected_outcome_signal_lag`, `primary_metric_id`, `primary_metric_family`, `supporting_metric_ids`, `guardrail_metric_ids`, `relevant_fluency_dimensions`, `expected_vbd_signature`, `baseline_window`, `observation_schedule`, `source_system_ref`, `metric_owner_ref`, `business_owner_ref`, `minimum_worthwhile_change`, `known_confounders`, `evidence_design`, `finance_pathway_ref`, and `approval_state`.

`approval_state` SHALL be one of `draft`, `approved_for_internal_review`, `hold`, or `rejected`; only `approved_for_internal_review` may proceed to future routing. `expected_metric_direction` SHALL be predeclared before outcome review and SHALL NOT be changed after observing outcomes to rescue a claim. Owner refs SHALL be non-personal role, group, review-board, or process refs.

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

- **GIVEN** a Hypothesis Measurement Plan declares a Blueprint target value, sales promise, minimum worthwhile change, OKR, sponsor goal, desired outcome, or finance assumption
- **WHEN** future Bayesian priors are specified
- **THEN** those planning contexts must not be used as priors, likelihood anchors, calibration targets, posterior eligibility thresholds, or claim-cap upgrades

#### Scenario: Measurement contexts remain separate

- **GIVEN** a Hypothesis Measurement Plan contains fluency context, VBD context, operational outcome metrics, and finance pathway refs
- **WHEN** model-family routing interprets the plan
- **THEN** those contexts remain distinct and must not be blended into one fixed weighted score

### Requirement: Pathway Coherence Review Boundary

The architecture SHALL define `posterior_pathway_coherence_review` as an internal future review concept that may review whether the predeclared theory of change is directionally coherent across relevant aggregate Fluency evidence, expected VBD behavior, and primary business outcome movement, while not authorizing causal probability, ROI proof, productivity proof, probability that Glean caused an outcome, customer-facing confidence, or economic output.

#### Scenario: Coherence review remains internal and non-causal

- **GIVEN** fluency evidence, VBD behavior, and primary outcome movement appear directionally aligned
- **WHEN** pathway coherence is reviewed
- **THEN** the review may record internal directional coherence only and must not produce customer-facing confidence, causal probability, ROI proof, productivity proof, or economic output

### Requirement: Evidence Design Claim Cap

The architecture SHALL define `evidence_design_claim_cap` as an internal governance concept applied after statistical estimation and before interpretation, so narrow posterior intervals under weak or unsupported evidence designs cannot create stronger claims than the approved design allows.

#### Scenario: Claim cap follows evidence design strength

- **GIVEN** a posterior estimate has a narrow interval
- **WHEN** the underlying evidence design is baseline-only, unsupported, or weaker than the requested claim
- **THEN** the claim remains capped by the evidence design and unsupported designs HOLD

#### Scenario: Finance context cannot strengthen claim cap

- **GIVEN** finance assumptions or economic pathway context are present
- **WHEN** claim caps are reviewed
- **THEN** finance context must not upgrade design strength, authorize ROI proof, or authorize customer-facing economic output

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
