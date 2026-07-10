## ADDED Requirements

### Requirement: Model Family Decision Record

The system SHALL document `bayesian_ai_value_realization_and_human_transformation_model_family` as the single canonical Bayesian architecture family for AI value realization and human transformation while preserving the current Bayesian DiD implementation as `comparison_supported_bayesian_did_module`. "Human transformation" SHALL mean aggregate work-pattern and capability-change context only; it SHALL NOT authorize HR analytics, individual scoring, employee productivity measurement, manager/team ranking, person-level fields, runtime model execution, production schemas, customer-facing confidence/probability output, ROI proof, finance output, causality claims, or economic output. All named modules SHALL remain subordinate conceptual components inside this single family unless a later approved OpenSpec change implements and validates that exact scope.

#### Scenario: DiD remains specialized

- **GIVEN** the current Bayesian proof harness is evaluated for future use
- **WHEN** the evidence design is not a valid two-group pre/post comparison-supported design
- **THEN** the current DiD implementation is not treated as the universal model and the evidence design must HOLD or route to a future approved model

#### Scenario: Model-family components are architecture concepts

- **GIVEN** the model-family decision record names future components such as `bayesian_fluency_measurement_model`, `bayesian_vbd_behavioral_trajectory_model`, `bayesian_hypothesis_outcome_model`, and `bayesian_economic_value_model`
- **WHEN** the record is interpreted
- **THEN** those components are treated as architecture concepts only until a later approved proposal implements and validates them

### Requirement: First Longitudinal Synthetic Model Slice

The architecture SHALL specify `first_longitudinal_synthetic_model_slice` as the first selected non-DiD longitudinal model candidate for a later approved synthetic-only Phase 2B proposal, bounded to one approved hypothesis, one approved primary continuous normal outcome, aggregate Measurement Cell windows only, multiple time windows, baseline Fluency context, separate lagged Velocity, Breadth, and Depth exposures, function or workflow partial pooling, explicit time trend, known aggregate observation uncertainty, synthetic-only inputs, and internal validation/review inputs only with no emitted product or customer output.

Approved hypothesis SHALL mean approved for internal specification and contract review only; it SHALL NOT authorize execution, data access, persistence, customer output, or model output.

The specification SHALL include a docs-only conceptual model equation:

```text
Y[h,c,t] ~ Normal(mu[h,c,t], se[h,c,t])

mu[h,c,t] =
    alpha[h]
  + u_function_or_workflow[c]
  + baseline_trend[h,c,t]
  + beta_velocity[h] * lagged_velocity_exposure[c,t]
  + beta_breadth[h] * lagged_breadth_exposure[c,t]
  + beta_depth[h] * lagged_depth_exposure[c,t]
  + beta_fluency[h] * baseline_fluency[c]
  + beta_fluency_x_vbd[h] * baseline_fluency[c] * lagged_vbd_exposure[c,t]
  + gamma[h] * approved_business_controls[c,t]
  + residual_time_structure[h,c,t]
```

The specification SHALL define every term and SHALL state that Velocity, Breadth, and Depth remain separate, baseline Fluency is context/moderator evidence rather than observed behavior, retest Fluency is co-evidence rather than a same-window causal driver, cohort refs remain aggregate and non-identifying, outcome movement is the primary business-outcome estimand, and the slice is associational/contribution-alignment unless a stronger evidence design is separately implemented and approved.

The slice SHALL NOT authorize staggered-rollout, event-study, adoption-time, calendar-time, or not-yet-treated comparison logic. Any staggered-rollout interpretation HOLDS until a separate approved proposal implements, calibrates, and validates that exact route.

#### Scenario: Phase 2A remains specification-only

- **GIVEN** `first_longitudinal_synthetic_model_slice` is documented
- **WHEN** the change is inspected
- **THEN** no Python runtime model code, TypeScript schemas, artifact schemas, routes, UI, persistence, exports, migrations, connector reads, customer-facing outputs, real/customer/live data authorization, ROI proof, productivity measurement, causality claims, confidence percentages, probability output, or economic output are added
- **AND** no new canonical event, suppression reason, tunable threshold, admin override, promotion decision, or output authorization is added

#### Scenario: Required future synthetic inputs are aggregate-only

- **GIVEN** a later approved Phase 2B proposal prepares synthetic inputs for the first longitudinal slice
- **WHEN** the inputs are reviewed
- **THEN** they include `hypothesis_id`, `cohort_id`, `function_area` or `workflow_family`, `time_window_id`, `primary_metric_value`, `primary_metric_se`, `primary_metric_family = normal_continuous_aggregate`, `lagged_velocity_exposure`, `lagged_breadth_exposure`, `lagged_depth_exposure`, `baseline_fluency_estimate`, `baseline_fluency_se`, `optional_retest_fluency_estimate`, `optional_retest_fluency_se`, `approved_business_controls`, `window_evidence`, `suppression_context`, `source_quality_context`, `known_confounders`, and `evidence_design`
- **AND** person-level fields, raw prompts, transcripts, direct identifiers, raw event rows, emails, user IDs, query text, and connector payloads are forbidden
- **AND** synthetic business controls are placeholders only in Phase 2A, with real/customer/live business controls unauthorized

#### Scenario: Internal estimands do not become outputs

- **GIVEN** a later approved Phase 2B proposal computes `direction_adjusted_outcome_movement`, a posterior interval for movement, an internal threshold-crossing validation diagnostic for movement above `minimum_worthwhile_change`, pathway coherence review status, or an evidence-design claim cap
- **WHEN** those fields are interpreted
- **THEN** they remain internal validation and review inputs only and must not emit customer-facing confidence, probability, ROI, causality, productivity, finance, HR, ranking, or economic output
- **AND** `minimum_worthwhile_change` remains decision context and must not become a prior, likelihood anchor, calibration target, posterior eligibility threshold, or claim cap
- **AND** numeric readout, export, customer authorization, confidence authorization, and probability authorization remain false

#### Scenario: Invalid first-slice inputs hold

- **GIVEN** a future first-slice input has a non-normal metric family, missing approved hypothesis, missing primary metric, missing or suppressed required windows, missing aggregate SE, missing Velocity/Breadth/Depth exposure context, Fluency substituted for VBD, VBD substituted for outcome, a supporting metric substituted for the primary metric, a Blueprint target value used as prior evidence, a baseline-only design attempting contribution confidence, staggered rollout routed to current DiD, real/customer/live/production data flags, person-level fields, or true output-authorization flags
- **WHEN** future contract review or eligibility is evaluated
- **THEN** the slice must HOLD or reject before interpretation
- **AND** unsupported, incomplete, unsafe, missing, suppressed, stale, imputed, or repeatedly peeked evidence must HOLD or reject before interpretation

#### Scenario: Future validation scenarios are not complete in Phase 2A

- **GIVEN** the first longitudinal slice is specified
- **WHEN** future Phase 2B or Phase 3 validation is planned
- **THEN** required scenarios include clean longitudinal pathway, VBD-only movement, Fluency-only movement, outcome-only unrelated shock, common-shock confounder, wrong-lag scenario, placebo intervention date, missing or suppressed windows, weak historical baseline, comparison-supported two-group routing to the existing DiD module, claimed staggered rollout HOLD, and financial double-counting HOLD
- **AND** smoke validation, replicated calibration, and negative controls remain separately labeled
- **AND** replicated calibration is not marked complete by this specification-only phase

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
