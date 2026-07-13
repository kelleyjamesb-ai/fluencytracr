## ADDED Requirements

### Requirement: Company Metrics Remain Flexible Without Automatic Model Eligibility

The model-family architecture SHALL permit an enterprise to maintain multiple
approved hypotheses and a reusable catalog of company-defined aggregate metric
definitions without an arbitrary product-level metric-count cap. A metric
definition MAY be linked to more than one hypothesis. Catalog registration,
recommendation, selection, owner approval, or reuse SHALL NOT by itself create
evidence, authorize model execution, or establish model eligibility.

Each metric definition considered for later model review SHALL bind a stable
metric ID, immutable version-bearing `metric_definition_ref`, separate
`metric_definition_hash`, definition, measurement unit, metric family,
aggregate grain, denominator or exposure basis where applicable,
transformation, missingness and censoring posture, uncertainty derivation and
reviewed aggregate sampling-distribution evidence, revision policy, source refs
and hashes, non-personal owner role, freshness, approval state, and
aggregate-only/privacy posture. Each `(metric_id, metric_definition_ref)` SHALL
resolve to exactly one hash; duplicates or conflicts SHALL reject.

The existing three-library Hypothesis-to-Metric Recommendation allowlist SHALL
remain unchanged. Existing metric-library `valid`, customer-metric intake
`READY`, Measurement Plan readiness, and Measurement Cell readiness states
SHALL remain non-admissive planning/data-spine states.

#### Scenario: Company catalog has no arbitrary metric-count cap

- **GIVEN** a company defines different aggregate metrics for different value hypotheses
- **WHEN** the catalog is documented for planning and review
- **THEN** no universal list or arbitrary count cap is imposed
- **AND** every metric retains its own immutable definition and source binding
- **AND** catalog membership does not authorize model eligibility or output

#### Scenario: Existing readiness does not imply longitudinal admission

- **GIVEN** a metric library, customer-metric intake, Measurement Plan, or
  Measurement Cell passes its current validator
- **WHEN** longitudinal admission is reviewed
- **THEN** that current readiness state does not establish metric version/hash,
  model-ready uncertainty, canonical slice receipts, or analysis-unit identity
- **AND** longitudinal admission remains HOLD until this separate boundary is
  satisfied by a future implementation

#### Scenario: Duplicate or conflicting metric identity rejects

- **GIVEN** duplicate metric IDs, conflicting hashes for one definition ref, or
  one metric ID/version mapped to different definitions
- **WHEN** catalog admission is reviewed
- **THEN** the definitions reject before any analysis unit is formed

#### Scenario: Incomplete metric definitions hold

- **GIVEN** a selected metric lacks a version/hash, family, unit, denominator or
  applicable exposure basis, aggregate grain, uncertainty derivation,
  missingness/censoring posture, source binding, owner approval, freshness, or
  privacy posture
- **WHEN** longitudinal admission is reviewed
- **THEN** the metric HOLDS before model interpretation
- **AND** the HOLD is an internal admission state, not a new canonical
  FluencyTracr suppression reason

### Requirement: Longitudinal Analysis Unit Is Immutable And Single-Estimand

The architecture SHALL define a preregistered `analysis_family_id` that binds
one hypothesis-plan version and one primary metric for one fixed decision
horizon. Each longitudinal analysis unit in that family SHALL hash-bind its
analysis-unit ID, hypothesis ID and plan hash, primary metric ID/definition
ref/hash, ordered panel-group manifest hash, per-group canonical
`(workflow_id, jbtd_id, persona_id)` tuple/cohort/window/gate-receipt/per-window-k
bindings, ordered window-plan hash, predeclared outcome lag and direction,
evidence design and predeclared claim cap, model slice and specification
version/hash, approved control-set hash, Velocity and Breadth
definition/source hashes, Depth context-binding hash, baseline-Fluency snapshot
refs/source hashes and definition-source hash, evidence-dependency keys,
predeclared fit key, plan-freeze timestamp and outcome-access receipt hash,
fixed analysis cutoff, and terminal-look ID.

The plan and unit SHALL be registered, timestamped, and hashed before any
post-baseline outcome access. A source-bound outcome-access receipt SHALL bind
`plan_frozen_at`, `attested_at`, its receipt ref/hash, and the exact attestation
`post_baseline_outcome_accessed_before_freeze=false`. A known earliest
post-baseline access timestamp SHALL be later than `plan_frozen_at`. Missing,
unknown, true, stale, hash-invalid, or chronologically inconsistent posture
SHALL HOLD. Changing any bound element SHALL create a different off-plan unit
and SHALL NOT rewrite, replace, or rescue the original unit. Retrospective or
outcome-informed registration SHALL NOT satisfy longitudinal admission.

Each unit SHALL contain exactly one primary metric. Supporting metrics SHALL
remain mechanism evidence and guardrail metrics SHALL remain risk/quality
evidence. Supporting or guardrail metrics SHALL NOT replace the primary metric,
enter the primary likelihood without a separately approved specification, or be
combined into one composite. Primary, supporting, and guardrail sets SHALL be
unique and mutually disjoint. One hypothesis-plan version SHALL bind only one
primary metric for its frozen horizon; another primary outcome requires a
separately preregistered analysis family and cannot count as independent
confirmation.

Each analysis-unit hash SHALL bind an ordered panel-group manifest. Each panel
group SHALL map one-to-one to exactly one canonical
`(workflow_id, jbtd_id, persona_id)` tuple and SHALL bind its cohort hash,
ordered windows, per-window gate-receipt hashes, and per-window aggregate `k`.
It SHALL also bind baseline-Fluency snapshot refs/source hashes and the
applicable Fluency-definition source hash. Every slice/window SHALL independently clear
the existing compiled suppression and cohort gates. No panel group may combine
canonical tuples, and another group's volume SHALL NOT rescue a gate. The
fixed model MAY jointly fit and partially pool only the 6 or 12 independently
cleared aggregate panel groups in the accepted synthetic envelope; raw
cross-slice aggregation and suppression override are prohibited.

Shared evidence and shared fits SHALL use separate dependency identities. Each
predeclared `evidence_dependency_key` SHALL hash-bind its planned
source-commitment hash, metric-definition hash, panel-group/canonical-slice
binding, windows, and cutoff without including future outcome values. The
predeclared `fit_key` SHALL hash-bind the model-specification hash and every
planned statistical-input binding, including metric, panel manifest, windows,
lag, direction, baseline Fluency, Velocity/Breadth, controls, cutoff, and
terminal look. Both SHALL be part of `analysis_unit_hash`.

A completed result SHALL bind its actual source-evidence content hashes inside
`prepared_input_hash`, then bind that hash and `fit_summary_hash` through
`fit_result_binding_hash = sha256(fit_key, model_specification_hash,
prepared_input_hash, fit_summary_hash)`. The same prepared input/model
specification SHALL NOT appear under different fit keys, and repeated
source-content, prepared-input, or fit-summary hashes SHALL NOT count as
independent replication. A pre-fit HOLD SHALL retain its planned dependency
keys and explicit null prepared/fit hash slots. Controls SHALL be predeclared
and source/hash bound; post-treatment controls, colliders, and controls
selected after outcome access SHALL be prohibited. Gate receipts and HOLDs are
analysis bindings, not new canonical suppression reasons.

#### Scenario: Multiple hypotheses remain independent analysis units

- **GIVEN** an enterprise reviews multiple hypotheses or reuses one metric
  definition across hypotheses
- **WHEN** longitudinal admission units are formed
- **THEN** each hypothesis/primary-metric binding remains a separate immutable unit
- **AND** no cross-hypothesis pooling, cross-slice suppression override, or
  enterprise confidence index is inferred
- **AND** reused evidence shares its `evidence_dependency_key`, reused fits
  share their `fit_key` and result hashes, and neither is counted as independent
  corroboration

#### Scenario: Post-outcome edits cannot rescue a unit

- **GIVEN** a planned unit has been frozen before post-baseline outcome access
- **WHEN** its metric version, cohort, windows, lag, direction, or evidence
  design is changed after outcomes are observed
- **THEN** the original unit remains recorded and the edited definition is a
  new off-plan unit that HOLDS pending separate approval

#### Scenario: Canonical slice gates clear independently

- **GIVEN** an analysis unit contains 6 or 12 planned panel groups
- **WHEN** longitudinal admission is reviewed
- **THEN** each panel group maps one-to-one to one canonical
  `(workflow_id, jbtd_id, persona_id)` tuple and every window carries an
  independent passing suppression/cohort gate receipt
- **AND** model-level partial pooling may occur only after those aggregate gates
  pass
- **AND** no panel group combines tuples and no suppressed slice is rescued by
  raw pooling or another group's volume

#### Scenario: Pre-outcome access posture is hash bound

- **GIVEN** a plan lacks a valid source-bound receipt attesting that no
  post-baseline outcome was accessed before freeze
- **WHEN** longitudinal admission is reviewed
- **THEN** the unit HOLDS
- **AND** retrospective registration cannot receive a different key and pose as
  the prospectively frozen unit

#### Scenario: Shared evidence is not necessarily a shared fit

- **GIVEN** two planned units reuse source evidence but use different planned
  statistical inputs
- **WHEN** dependencies are recorded
- **THEN** they share the applicable `evidence_dependency_key`
- **AND** they use different predeclared `fit_key` values
- **AND** neither may count the shared evidence as independent corroboration

### Requirement: Current Longitudinal Eligibility Matches The Proved Specification

Current longitudinal model-family eligibility SHALL be limited to the fixed
synthetic specification already validated: `continuous_normal_identity`
aggregate primary outcomes, finite observations, known finite positive
aggregate standard errors, complete balanced ordered panels, predeclared lags
and directions, approved aggregate controls, baseline AI Fluency context,
separate Velocity and Breadth exposures, Depth outside the likelihood, and all
existing structural, diagnostic, source-binding, hash, calibration, null,
floor, lag, shock, and negative-control gates.

The accepted replicated calibration envelope SHALL remain explicit: 12 pre
windows, 6 post windows, panel-group counts of 6 or 12, and aggregate `k=16`.
The separate `k=4,8,12,16` floor controls SHALL NOT be interpreted as expanded
replicated calibration. A metric or panel shape outside this envelope SHALL
HOLD pending separate synthetic validation even if the implementation can
mathematically fit it.

Open company metric intake SHALL NOT cause automatic likelihood selection or
coercion. Counts, unsupported rates or proportions, bounded/ordinal scores,
time-to-event outcomes, zero-inflated outcomes, financial translations,
unknown families, or any metric lacking known positive aggregate uncertainty
SHALL HOLD until a separate proposal implements and validates that exact
likelihood. The system SHALL NOT select or introduce a second estimator through
this contract. `continuous_normal_identity` SHALL be the one exact token; no
alias, metric-name inference, unit inference, or post-outcome transformation is
allowed. Every observation in a unit SHALL bind the same metric ID, definition
ref/hash, unit, denominator/exposure basis, transformation, and finite positive
standard-error derivation.

#### Scenario: Compatible metric may reach internal synthetic review only

- **GIVEN** an immutable analysis unit uses the exact supported family and
  satisfies every compiled gate
- **WHEN** current eligibility is reviewed
- **THEN** it may be eligible only for the existing internal synthetic
  longitudinal validation boundary
- **AND** real-data execution, runtime routing, posterior publication, and
  customer output remain unauthorized

#### Scenario: Unsupported family fails closed

- **GIVEN** an analysis unit uses any unsupported or ambiguous metric family
- **WHEN** current eligibility is reviewed
- **THEN** it HOLDS before fit rather than being transformed, approximated, or
  forced through the continuous-normal model
- **AND** no alternate estimator or canonical suppression reason is created

#### Scenario: Mathematical fit does not expand the proof envelope

- **GIVEN** a continuous metric has a panel shape outside the accepted 12-pre,
  6-post, 6-or-12-group, `k=16` replicated envelope
- **WHEN** current proof coverage is reviewed
- **THEN** it HOLDS pending separate synthetic validation
- **AND** structural fit capability is not represented as calibrated evidence

### Requirement: Evidence Roles Remain Distinct

The approved primary metric SHALL remain the business-outcome estimand.
Baseline AI Fluency SHALL remain aggregate context, retest AI Fluency SHALL
remain co-evidence, Velocity and Breadth SHALL remain separate lagged behavioral
exposures, and Depth SHALL remain aggregate pathway context outside the proved
likelihood. Supporting metrics SHALL provide mechanism context and guardrail
metrics MAY cap or block interpretation. Alignment across these roles SHALL NOT
be combined into a composite or interpreted as causal attribution. Controls
SHALL be predeclared aggregate controls; post-treatment controls and colliders
SHALL be prohibited.

#### Scenario: Aligned evidence does not become attribution

- **GIVEN** AI Fluency, Velocity, Breadth, and a primary outcome move in the
  predeclared directions
- **WHEN** the pathway is reviewed
- **THEN** the evidence may support internal directional coherence only
- **AND** it does not produce a probability or confidence that AI caused the
  metric movement

### Requirement: Portfolio Review Requires Complete Planned-Unit Accounting

Any future portfolio review SHALL freeze, timestamp, and hash its planned
analysis-family/unit manifest before post-baseline outcome access; declare
reused metrics, shared cohorts, overlapping windows,
`evidence_dependency_key` values, and shared `fit_key` dependencies; and
enforce exact set equality between the manifest and stable ordered result
records. Every unavailable or invalid planned unit SHALL have an explicit
hash-bound HOLD record retaining its planned dependency keys and explicit
prepared/fit hash slots. Missing, duplicate, off-plan, selectively omitted, or
post-outcome-edited units SHALL fail the portfolio review.

Until a separate sequential procedure is implemented and validated, each unit
SHALL have exactly one fixed-horizon terminal look; interim, repeated, or
post-hoc looks SHALL HOLD. The accepted per-cell synthetic null false-signal
rate SHALL NOT be represented as an enterprise-wide or multi-hypothesis
false-claim rate, and portfolio inference SHALL remain HOLD until a separately
validated multiplicity procedure exists.

#### Scenario: Unfavorable or held units cannot be omitted

- **GIVEN** a frozen portfolio manifest contains multiple hypothesis units
- **WHEN** results are assembled for review
- **THEN** every planned unit must appear with its valid result or explicit
  hash-bound HOLD record
- **AND** removing null, unfavorable, failed, or incomplete units fails the
  portfolio review

#### Scenario: Repeated looks remain unsupported

- **GIVEN** a unit has one frozen terminal-look ID
- **WHEN** an interim, repeated, rolling, or post-hoc look is requested
- **THEN** the additional look HOLDS
- **AND** no sequential or always-valid interpretation is implied

#### Scenario: Portfolio has no combined probability

- **GIVEN** several units have narrow internal posterior intervals
- **WHEN** enterprise evidence is summarized
- **THEN** no cross-hypothesis probability, confidence percentage, composite,
  ranking, or enterprise attribution index is emitted

### Requirement: Observed Movement, Model Contrast, And Attribution Remain Separate

The architecture SHALL keep existing `selected_metric_movement` as descriptive
customer-owned baseline/comparison context and existing
`outcome_movement_state` as a reporting state for aggregate movement refs.
Neither SHALL be substituted by an internal posterior quantity.

The implementation quantity `longitudinal_movement` SHALL be described exactly
as a direction-adjusted associational Velocity/Breadth-outcome contrast in
pre-period outcome standard-deviation units, conditional on historical trend,
approved controls, group effects, and AR(1) structure. It SHALL NOT be labeled
as raw KPI change, original-unit movement, counterfactual impact, AI impact, or
attribution.

The categorical `evidence_design_claim_cap` SHALL be derived from the approved
evidence design and hash bound at plan freeze before post-baseline outcome
access. Diagnostics, confounding, adverse/missing guardrails, and governance
MAY only lower it or HOLD interpretation. A narrow interval, multiple aligned
metrics, metric reuse, AI Fluency movement, telemetry movement, finance context,
or desired target SHALL NOT upgrade it. A claim cap SHALL NOT rescue a held
estimate, and supporting metrics SHALL NOT strengthen it. Numeric
`ai_attribution_confidence`, probability that AI caused a result, and
customer-facing confidence SHALL remain unauthorized.

#### Scenario: Weak design caps a precise estimate

- **GIVEN** the internal `longitudinal_movement` contrast is statistically precise
- **WHEN** the approved evidence design is weak, unsupported, or baseline-only
- **THEN** the evidence-design claim cap remains HOLD or directional context
- **AND** precision does not create AI attribution

#### Scenario: Descriptive movement is not the fitted contrast

- **GIVEN** `selected_metric_movement` records an original-unit descriptive
  baseline/comparison delta
- **WHEN** `longitudinal_movement` is reviewed
- **THEN** the two remain separate quantities with separate units and semantics
- **AND** neither is labeled as AI impact or causal attribution

### Requirement: Admission Boundary Is Documentation Only

This change SHALL NOT create runtime code, production schemas, artifact schema
changes, model fitting, real/customer/live data admission, routes, UI,
persistence, exports, migrations, connectors, customer-facing output,
confidence/probability output, ROI, finance, causality, productivity, HR
analytics, ranking, model promotion, new canonical events, new suppression
reasons, tunable thresholds, or admin overrides. AI Fluency measurement-model
calibration, VBD trajectory calibration, DiD completion, runtime routing,
reporting, persistence, and UI SHALL remain separate future scopes.

#### Scenario: Documentation cannot execute the model

- **GIVEN** this admission boundary is accepted
- **WHEN** a consumer attempts to treat it as execution or output authority
- **THEN** the request HOLDS
- **AND** every existing synthetic-only, aggregate-only, fail-closed, and
  nonauthorizing boundary remains unchanged

## MODIFIED Requirements

### Requirement: First Longitudinal Synthetic Model Slice

The architecture SHALL specify `first_longitudinal_synthetic_model_slice` as the first selected non-DiD longitudinal model candidate for a later approved synthetic-only Phase 2B proposal, bounded to one approved hypothesis, one approved primary continuous normal outcome, aggregate Measurement Cell windows only, multiple time windows, baseline Fluency context, separate lagged Velocity and Breadth exposures, Depth as synthetic aggregate pathway context only unless a later promotion authorizes a model dependency, function or workflow partial pooling, explicit time trend, known aggregate observation uncertainty, synthetic-only inputs, and internal validation/review inputs only with no emitted product or customer output.

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
  + beta_fluency[h] * baseline_fluency[c]
  + gamma[h] * approved_business_controls[c,t]
  + residual_time_structure[h,c,t]
```

The specification SHALL define every term and SHALL state that Velocity and Breadth remain separate, Depth remains synthetic aggregate pathway context only unless a later promotion authorizes a model dependency, baseline Fluency is context/moderator evidence rather than observed behavior, retest Fluency is co-evidence rather than a same-window causal driver, cohort refs remain aggregate and non-identifying, outcome movement is the primary business-outcome estimand, and the slice is associational/contribution-alignment unless a stronger evidence design is separately implemented and approved.

The slice SHALL NOT authorize staggered-rollout, event-study, adoption-time, calendar-time, or not-yet-treated comparison logic. Any staggered-rollout interpretation HOLDS until a separate approved proposal implements, calibrates, and validates that exact route.

#### Scenario: Phase 2A remains specification-only

- **GIVEN** `first_longitudinal_synthetic_model_slice` is documented
- **WHEN** the change is inspected
- **THEN** no Python runtime model code, TypeScript schemas, artifact schemas, routes, UI, persistence, exports, migrations, connector reads, customer-facing outputs, real/customer/live data authorization, ROI proof, productivity measurement, causality claims, confidence percentages, probability output, or economic output are added
- **AND** no new canonical event, suppression reason, tunable threshold, admin override, promotion decision, or output authorization is added

#### Scenario: Required future synthetic inputs are aggregate-only

- **GIVEN** a later approved Phase 2B proposal prepares synthetic inputs for the first longitudinal slice
- **WHEN** the inputs are reviewed
- **THEN** they include `hypothesis_id`, `cohort_id`, `function_area` or `workflow_family`, `time_window_id`, `primary_metric_value`, `primary_metric_se`, `primary_metric_family = continuous_normal_identity`, `lagged_velocity_exposure`, `lagged_breadth_exposure`, optional `lagged_depth_context` as synthetic pathway context only, `baseline_fluency_estimate`, `baseline_fluency_se`, `optional_retest_fluency_estimate`, `optional_retest_fluency_se`, `approved_business_controls`, `window_evidence`, `suppression_context`, `source_quality_context`, `known_confounders`, and `evidence_design`
- **AND** person-level fields, raw prompts, transcripts, direct identifiers, raw event rows, emails, user IDs, query text, and connector payloads are forbidden
- **AND** synthetic business controls are placeholders only in Phase 2A, with real/customer/live business controls unauthorized

#### Scenario: Internal estimands do not become outputs

- **GIVEN** a later approved Phase 2B proposal computes `direction_adjusted_outcome_movement`, a posterior interval for movement, an internal draw-share validation diagnostic against a compiled synthetic smoke constant, pathway coherence review status, or an evidence-design claim cap
- **WHEN** those fields are interpreted
- **THEN** they remain internal validation and review inputs only and must not emit customer-facing confidence, probability, ROI, causality, productivity, finance, HR, ranking, or economic output
- **AND** `minimum_worthwhile_change` remains decision context and must not become a prior, likelihood anchor, calibration target, posterior eligibility threshold, tunable diagnostic threshold, or claim cap
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

### Requirement: Hypothesis Measurement Plan Boundary

The architecture SHALL define a Hypothesis Measurement Plan as the future governing input concept for model-family routing, including hypothesis identity, workflow scope, cohort scope, value route, expected behavior and outcome lags, primary metric, supporting metrics, guardrail metrics, relevant fluency dimensions, expected VBD signature, windows, source references, non-personal role/group/process owner references, minimum worthwhile change, known confounders, evidence design, finance pathway reference, approval state, plan-freeze timestamp, and a source/hash-bound post-baseline outcome-access receipt.

The required conceptual fields SHALL be `hypothesis_id`, `hypothesis_statement`, `function_area`, `workflow_family`, `cohort_scope`, `value_route`, `expected_work_change`, `expected_metric_direction`, `expected_behavior_signal_lag`, `expected_outcome_signal_lag`, `primary_metric_id`, `primary_metric_family`, `supporting_metric_ids`, `guardrail_metric_ids`, `relevant_fluency_dimensions`, `expected_vbd_signature`, `baseline_window`, `observation_schedule`, `source_system_ref`, `metric_owner_ref`, `business_owner_ref`, `minimum_worthwhile_change`, `known_confounders`, `evidence_design`, `finance_pathway_ref`, `approval_state`, `plan_frozen_at`, `outcome_access_receipt_ref`, and `outcome_access_receipt_hash`.

`approval_state` SHALL be one of `draft`, `approved_for_internal_review`, `hold`, or `rejected`; only `approved_for_internal_review` may proceed to future routing. `expected_metric_direction` SHALL be registered and hash bound before post-baseline outcome access and SHALL NOT be changed after observing outcomes to rescue a claim. The outcome-access receipt SHALL attest exactly `post_baseline_outcome_accessed_before_freeze=false`; missing, unknown, true, stale, hash-invalid, or chronologically inconsistent posture SHALL HOLD. Owner refs SHALL be non-personal role, group, review-board, or process refs.

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

#### Scenario: Outcome-access receipt fails closed

- **GIVEN** the plan lacks a valid receipt proving no post-baseline outcome was accessed before freeze
- **WHEN** routing or admission is reviewed
- **THEN** the plan HOLDS
- **AND** a retrospective plan cannot be represented as prospectively frozen

### Requirement: Evidence Design Claim Cap

The architecture SHALL define `evidence_design_claim_cap` as an internal governance concept derived from the approved evidence design and hash bound at plan freeze before post-baseline outcome access, then enforced after statistical estimation and before interpretation, so narrow posterior intervals under weak or unsupported evidence designs cannot create stronger claims than the approved design allows. Diagnostics, confounding, guardrails, and governance may only lower the cap or HOLD interpretation.

#### Scenario: Claim cap follows evidence design strength

- **GIVEN** a posterior estimate has a narrow interval
- **WHEN** the underlying evidence design is baseline-only, unsupported, or weaker than the requested claim
- **THEN** the claim remains capped by the evidence design and unsupported designs HOLD

#### Scenario: Finance context cannot strengthen claim cap

- **GIVEN** finance assumptions or economic pathway context are present
- **WHEN** claim caps are reviewed
- **THEN** finance context must not upgrade design strength, authorize ROI proof, or authorize customer-facing economic output
