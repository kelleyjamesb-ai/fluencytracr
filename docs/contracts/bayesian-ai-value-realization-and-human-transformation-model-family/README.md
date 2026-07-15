# Bayesian AI Value Realization And Human Transformation Model Family

## Purpose

This decision record reframes the current Bayesian confidence architecture from
one universal Bayesian DiD model into a governed model family:

```text
bayesian_ai_value_realization_and_human_transformation_model_family
```

This is the single canonical Bayesian architecture family name. "Human
transformation" means aggregate work-pattern and capability-change context
only; it does not authorize HR analytics, individual scoring, employee
productivity measurement, manager/team ranking, person-level fields, runtime
model execution, production schemas, customer-facing confidence/probability
output, ROI proof, finance output, causality claims, or economic output. All
named modules are subordinate conceptual components inside this single family
unless a later approved OpenSpec change implements and validates that exact
scope.

The current PyMC implementation remains valid as:

```text
comparison_supported_bayesian_did_module
```

That module is one optional design module for two-group pre/post
comparison-supported hypotheses. It is not the universal model for every AI
value evidence pathway.

This record is docs-only. It does not implement runtime model code, schemas,
routes, UI, persistence, exports, migrations, customer-facing outputs, ROI
proof, productivity measurement, causality claims, confidence percentages, or
probability output.

## Current-State Audit

The current Bayesian proof harness and TypeScript boundary were audited across:

- `inference/README.md`
- `inference/src/fluencytracr_inference/model.py`
- `inference/src/fluencytracr_inference/synthetic.py`
- `inference/src/fluencytracr_inference/synthetic_study.py`
- `inference/src/fluencytracr_inference/acceptance_study.py`
- `inference/src/fluencytracr_inference/artifact.py`
- `inference/src/fluencytracr_inference/diagnostics.py`
- `docs/contracts/confidence-inference-methodology/README.md`
- `docs/contracts/ai-value-contribution-alignment-bayesian-model-specification/README.md`
- `docs/concepts/BLUEPRINT_TO_FINANCE_REVIEW_READINESS_SPINE.md`
- `docs/concepts/AI_VALUE_MEASUREMENT_MODEL.md`
- `packages/confidence-engine/src/confidenceModel.ts`
- `packages/confidence-engine/src/bayesianModelSpecification.ts`
- `packages/confidence-engine/src/internalBayesianExecutionGate.ts`
- `openspec/changes/add-bayesian-inference-proof-harness/`
- `.project/PROGRESS.md`

Confirmed current facts:

- The current PyMC model is hierarchical Bayesian difference-in-differences.
- Its estimand is the treated-by-post coefficient. The PyMC variable and
  sampler diagnostic parameter are named `contribution_alignment_effect`.
- The current implementation supports only the normal continuous aggregate
  likelihood with identity link.
- The current implementation assumes treated/comparison and pre/post structure.
- The current proof harness is synthetic-only and internal-only.
- The current proof harness does not authorize real customer data or
  customer-facing confidence output.
- The current implementation does not implement a complete staggered-rollout
  event-study model.
- The current sampler-artifact calibration work remains incomplete; progress
  notes record stopped full-settings attempts with hard failures and
  non-`pre_trend` diagnostic HOLDs before the required full evidence set was
  completed.
- OpenSpec tasks `3.3` and `4.2` in
  `add-bayesian-inference-proof-harness` remain incomplete.
- Adopting this model-family direction does not make any existing Bayesian DiD
  proof task complete. Tasks `3.3`, `3.4`, `4.2`, and `5.1` must remain
  unchecked unless separately verified.

## Where DiD Is Currently Treated As The Main Model

The current documentation and validation boundary are DiD-centered:

- `docs/contracts/confidence-inference-methodology/README.md` names the
  hierarchical Bayesian DiD methodology as the normative inference methodology
  for the internal confidence engine.
- `docs/contracts/ai-value-contribution-alignment-bayesian-model-specification/README.md`
  names `bayesian_hierarchical_did_spec_2026_06` and
  `bayesian_hierarchical_difference_in_differences_candidate` as legacy/current
  DiD proof-artifact field values. They are not the canonical architecture
  family name.
- `packages/confidence-engine/src/bayesianModelSpecification.ts` and
  `packages/confidence-engine/src/internalBayesianExecutionGate.ts` preserve
  that candidate DiD family in their non-executing governance records.
- `packages/confidence-engine/src/confidenceModel.ts` validates proof artifacts
  whose `model_spec_binding.model_family` is
  `bayesian_hierarchical_difference_in_differences_candidate`.
- `inference/src/fluencytracr_inference/model.py` implements the DiD equation
  directly.
- `inference/src/fluencytracr_inference/synthetic.py`,
  `synthetic_study.py`, and `acceptance_study.py` generate and evaluate
  DiD-shaped synthetic data.

Those assumptions are valid for the current proof harness. They are too narrow
for the broader value-evidence architecture because not every hypothesis has a
credible two-group pre/post comparison design.

## Reusable Infrastructure

The following infrastructure remains reusable across future Bayesian modules:

- PyMC and ArviZ isolated inference environment.
- Synthetic-only proof harness posture.
- Sampler diagnostics and posterior diagnostic reporting patterns.
- Prior-sensitivity reporting as a required review input.
- Artifact self-hashing and synthetic input hash binding.
- TypeScript validation boundary and strict Zod schema validation.
- Fail-closed governance semantics.
- Internal-only blocked-use pins.
- Measurement Cell window evidence checks.
- Comparison adequacy gates for designs that actually use comparison cohorts.
- Floor checks and aggregate-only cohort constraints.
- Synthetic study infrastructure and negative-control discipline.
- OpenSpec task gating and progress-file limitations.

## Non-Reusable Assumptions

The following assumptions belong to the current DiD module and must not be
treated as model-family defaults:

- One treated indicator.
- One post indicator.
- One universal `delta` estimand.
- Mandatory comparison cohort for every evidence pathway.
- One normal likelihood as the only implemented runtime family.
- Identity link for all future metrics.
- The idea that every value hypothesis is a two-group pre/post comparison.
- The idea that a staggered rollout can be represented by the current
  two-group DiD implementation without a separate event-study or longitudinal
  model.

## Phase 1 Contract: Model Family And Module Status

The governed architecture is:

```text
bayesian_ai_value_realization_and_human_transformation_model_family
```

This contract defines architecture and routing semantics only. It does not
create runtime routing code, production schemas, artifact schemas, endpoints,
UI, persistence, exports, migrations, connector reads, or customer-facing
outputs.

| Module or component | Contract role | Implemented today | Current contract eligibility |
| --- | --- | --- | --- |
| `comparison_supported_bayesian_did_module` | Specialized current module for two-group pre/post comparison-supported hypotheses. | Yes, only as the existing synthetic/internal PyMC DiD proof harness and TypeScript validation boundary. | Eligible only for `TWO_GROUP_PRE_POST_COMPARISON` or `MATCHED_COMPARISON` that reduces to a valid two-group pre/post design, with every DiD gate passing. |
| `first_longitudinal_synthetic_model_slice` | First selected non-DiD longitudinal candidate for synthetic/internal historical outcome proof mechanics. | Yes, as a smoke prototype followed by state-space/NUTS concordance and accepted 1,200-slot replicated synthetic validation. | Completed internal synthetic proof. A separate decision conditionally selects only its `HISTORICAL_STATE_SPACE` route for docs/OpenSpec prerequisite hardening while execution remains HOLD. It does not authorize real data, runtime routing or execution promotion, customer output, confidence/probability output, ROI, causality, productivity, finance output, persistence, routes, UI, or exports. |
| `bayesian_fluency_measurement_model` | Future model for aggregate AI Fluency movement and measurement uncertainty. | Synthetic runner and full 800-slot evidence independently accepted. | State is `SYNTHETIC_CALIBRATION_ACCEPTED_REAL_DATA_PENDING`; the frozen long form, aggregate count contract, ordinal proof, full primary study, and separate 800-slot recomputation passed exact-byte review. Dimension summaries alone still do not identify latent change. No real-data model, customer posterior output, persistence, UI, routes, public exports, connectors, ROI, causality, productivity, finance output, or promotion is authorized. |
| `bayesian_vbd_behavioral_trajectory_model` | Future model for non-overlapping aggregate frequency, engagement, and Breadth primitive movement, with optional Depth context only; canonical Velocity remains unchanged. | Contract and synthetic proof plan only; no implementation or execution. | State is `CONTRACT_DEFINED_SYNTHETIC_IMPLEMENTATION_PENDING`. Composite Velocity/VBD values are inadmissible; implementation, evidence, independent acceptance, and parent task `5.6` remain incomplete. Downstream integration is a separate blocker. |
| `bayesian_hypothesis_outcome_model` | Future model for customer-owned primary metric movement for approved hypotheses. | No. | Documentation-only future module. |
| `bayesian_economic_value_model` | Future internal review component for finance-pathway assumptions after outcome evidence exists. It must not emit ROI proof or customer-facing economic output. | No. | Documentation-only future component; cannot upgrade claim caps. |
| `posterior_pathway_coherence_review` | Future internal review of whether predeclared fluency, behavior, and outcome evidence is directionally coherent. | No. | Documentation-only review concept; not a customer-facing probability, confidence, ROI, causality, or productivity output. |
| `evidence_design_claim_cap` | Future claim-cap review derived from the approved design at plan freeze and enforced after estimation. | No. | Documentation-only governance concept; later diagnostics/governance may only lower the cap or HOLD, and unsupported designs HOLD. |
| `enterprise_hypothesis_portfolio` | Internal portfolio view of multiple approved hypotheses without blending them into one arbitrary enterprise index. | Docs-only admission boundary. | Company metric catalogs have no arbitrary count cap, while each immutable analysis unit binds one hypothesis and one primary metric version; no runtime, model execution, or portfolio confidence output is authorized. |

The current DiD module remains valid only for two-group pre/post
comparison-supported designs. It does not support staggered rollout and does
not authorize real/customer/live data or customer-facing confidence,
probability, ROI, causality, productivity, or economic output.

## Bounded Internal-Dogfood Decision

The separate
[Longitudinal Internal-Dogfood Promotion Decision](../ai-value-longitudinal-internal-dogfood-promotion-decision/README.md)
records both:

```text
CONDITIONAL_PROMOTION_TO_BOUNDED_INTERNAL_DOGFOOD
HOLD_PENDING_LONGITUDINAL_DOGFOOD_PREREQUISITES
```

The decision selects only the `HISTORICAL_STATE_SPACE` route using the accepted
artifact `model_slice=longitudinal_state_space_replicated_validation` with
`gaussian_longitudinal_zero_sum_ar1_state_space` and
`continuous_normal_identity`. That artifact slice is the accepted validation
implementation under the conceptual component
`first_longitudinal_synthetic_model_slice`; the conceptual name is not an
alternate artifact `model_slice` value. The decision does not select
`REPEATED_PRE_POST`, DiD, controlled-test, staggered-rollout,
alternate-likelihood, or economic routes.

No execution is authorized. AI Fluency measurement-model calibration is now
accepted only at the internal synthetic boundary. The VBD trajectory-model
contract and proof plan are defined, while implementation, full calibration,
and downstream integration reconciliation remain incomplete. Real-data
admission/source binding, runtime monitoring/fail-closed
behavior, readout language/HOLD presentation, and a frozen non-activating pilot
manifest remain conjunctive prerequisites. A separate explicit human real-data
execution decision must then bind that exact manifest and every passing
prerequisite before access, preparation, fitting, or artifact emission. The
manifest cannot activate itself. OpenSpec tasks `5.6` through `5.8` remain
incomplete. Customer output,
confidence/probability language, AI-impact attribution, ROI, causality,
productivity, finance, routes, UI, persistence, connectors, exports, schemas,
new events/reasons/thresholds, and DiD work remain blocked.

## Evidence-Design Router Vocabulary

The model family uses this additive router vocabulary. Production routing
remains future work, but the exact-scope
`first_longitudinal_synthetic_model_slice` has completed its fixed internal
synthetic proof for historical/repeated longitudinal fixtures only.

| Evidence design | Contract support status | Current contract-eligible module | Required gates before eligibility | Claim cap | Unsupported / HOLD behavior |
| --- | --- | --- | --- | --- | --- |
| `CONTROLLED_TEST` | Future contract route only unless the data reduce to a valid two-group pre/post contrast. | No standalone current controlled-test module. Contract-eligible for `comparison_supported_bayesian_did_module` only if the approved design is also a valid two-group pre/post comparison and every DiD gate passes. | Approved design record; aggregate-only Measurement Cell windows; no contamination; comparison adequacy if DiD-eligible; floors; diagnostics; calibration; peeking control; synthetic/internal proof boundary. | Internal-only design context or internal contribution-estimate eligibility if reduced to valid DiD; no customer-facing confidence, probability, ROI, causality, productivity, or finance output. | HOLD if the controlled-test design cannot be represented by the current DiD module or lacks validation. |
| `TWO_GROUP_PRE_POST_COMPARISON` | Current specialized contract eligibility. | `comparison_supported_bayesian_did_module`. | Credible comparison cohort; exact baseline/post windows; same selected metric and direction; declared lag; aggregate floors; no suppressed/stale/missing/imputed windows; pre-trend check; sampler diagnostics; posterior predictive checks; prior sensitivity; calibration/null/floor proof; fixed-horizon peeking control; TypeScript artifact validation. | Internal-only comparison-supported contribution-estimate eligibility at most; no customer-facing confidence/probability and no causal, ROI, productivity, or economic claim. | HOLD or evidence-tier-only if any comparison, window, floor, diagnostic, calibration, peeking, source-binding, or artifact-validation gate fails. |
| `MATCHED_COMPARISON` | Conditional current contract eligibility. | `comparison_supported_bayesian_did_module` only when matching still yields a true two-group pre/post design at the aggregate Measurement Cell grain. | Reviewer-owned matching/design adequacy memo; matched cohorts remain aggregate-only and non-identifying; same metric/window/direction/lag; balance and pre-period plausibility reviewed; every DiD gate above passes. | Internal-only matched-comparison-ready context or DiD contribution-estimate eligibility when all gates pass; no causal language from matching alone. | HOLD or remain future-model-only if matching does not reduce to a valid two-group pre/post DiD design. |
| `STAGGERED_ROLLOUT` | Unsupported by the current DiD module. | None. | Future event-time, calendar-time, adoption-time, and not-yet-treated comparison logic must be implemented, calibrated, and validated in a separate approved proposal before any contract eligibility exists. | HOLD only under the current implementation. | Must HOLD as unsupported; must not be coerced into current two-group DiD or treated as current event-study support. |
| `HISTORICAL_STATE_SPACE` | Fixed synthetic specification has completed smoke, concordance, and replicated validation. A separate decision conditionally selects prerequisite docs/OpenSpec hardening only; real-data/runtime contract eligibility remains future work and execution remains HOLD. | `first_longitudinal_synthetic_model_slice` for internal synthetic validation artifacts only; accepted artifact identity uses `model_slice=longitudinal_state_space_replicated_validation`. | Aggregate synthetic inputs; approved hypothesis metadata; complete ordered windows; aggregate AI Fluency snapshot context; separate lagged Velocity/Breadth exposures; Depth as context only; approved synthetic controls; source hashes; state-space/NUTS diagnostics; TypeScript validation; accepted replicated calibration/null/floor/lag/shock evidence. | Internal synthetic noncausal contribution-alignment review only. Conditional promotion permits prerequisite contract hardening, not execution or output; no customer-facing confidence/probability, ROI, causality, productivity, finance, persistence, routes, UI, or exports. | HOLD or reject for real/customer/live data, incomplete windows, unsupported likelihoods, missing uncertainty, unsafe controls, respondent leakage, failed diagnostics, or any execution/output-promotion side door. |
| `REPEATED_PRE_POST` | Fixed synthetic specification has completed validation only under its compiled historical-window rules; real-data/runtime repeated-window eligibility remains future work. | `first_longitudinal_synthetic_model_slice` for internal synthetic validation artifacts only. | Same accepted synthetic longitudinal gates as `HISTORICAL_STATE_SPACE`; no sequential or always-valid repeated-look production procedure is implemented. | Internal synthetic noncausal contribution-alignment review only; no customer-facing confidence/probability, ROI, causality, productivity, finance, persistence, routes, UI, exports, or promotion. | HOLD if compiled historical-window requirements fail, real data are supplied, or repeated looks are used to bypass peeking controls. |
| `BASELINE_ONLY` | Planning context only. | None. | Aggregate source review, suppression checks, and metric definition review may support planning context only. | Context-only; no contribution confidence, no comparison-supported estimate, no probability/confidence output. | HOLD for contribution-confidence or causal/economic interpretation. |

Router contract rules:

- Routing must fail closed. Unsupported designs HOLD rather than being forced
  through the current DiD module.
- `TWO_GROUP_PRE_POST_COMPARISON` is contract-eligible for current DiD only
  when comparison adequacy and all DiD gates pass.
- `MATCHED_COMPARISON` is contract-eligible for current DiD only when it
  reduces to a valid two-group pre/post design.
- `STAGGERED_ROLLOUT` must HOLD until event-time, calendar-time, adoption-time,
  and not-yet-treated comparison logic are implemented and calibrated.
- `HISTORICAL_STATE_SPACE` and `REPEATED_PRE_POST` can route only to the
  synthetic/internal `first_longitudinal_synthetic_model_slice` when its
  compiled smoke gates pass; full calibrated longitudinal models remain future
  work.
- `BASELINE_ONLY` cannot produce contribution confidence.
- Economic assumptions, finance pathway references, sponsor goals, and
  Blueprint promises cannot upgrade evidence-design strength or claim caps.

## Natural-Language Comparison Request Review Mapping

A natural-language request to compare cohorts, review pre/post structure,
assess matching, or evaluate whether a design could fit DiD is documentation-
level review intent only. It does not set `evidence_design`, select or execute
a model, invoke a selector or runner, or create reviewed evidence. The response
may point to the existing comparison-design review prerequisites:

```text
natural-language comparison request
-> documentation pointer to existing preparation and collection contract
-> separately supplied reviewer-owned aggregate source package
-> separately run existing adequacy review
-> one reviewed diagnostics dimension only
```

The request is not reviewer-owned source-package information or reviewed
evidence. It cannot satisfy a required source ref, hash, review decision, or
boundary check, and it does not invoke either existing runner. Collection
still accepts only explicitly supplied reviewer-owned, aggregate-only
comparison-design information under the existing collection contract.

The first step remains subject to the existing preparation prerequisite:

```text
COMPARISON_DESIGN_SOURCE_PACKAGE_PREPARATION_READY_FOR_REVIEWER_COLLECTION
allowed_next_step=collect_reviewer_owned_comparison_design_source_package_only
```

A missing or invalid source binding remains `HOLD_FOR_BINDING`. A valid
binding with missing, unsafe, or held reviewer-owned package information
remains `HOLD_FOR_MORE_INFORMATION`. Only this existing collection state may
advance:

```text
REVIEWER_OWNED_COMPARISON_DESIGN_SOURCE_PACKAGE_COLLECTED_FOR_REVIEW_ONLY
review_decision=COLLECTED_FOR_REVIEW_ONLY
allowed_next_step=run_comparison_design_adequacy_evidence_review_only
```

The adequacy review preserves its existing states:

```text
COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING
HOLD_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE
REJECTED_FOR_BOUNDARY_LEAKAGE
```

These selectors and states remain owned by:

- `docs/contracts/ai-value-reviewer-owned-comparison-design-source-package-collection/README.md`
- `docs/contracts/ai-value-contribution-alignment-comparison-design-adequacy-evidence-review/README.md`

This mapping does not duplicate or change those contracts. They remain the
sole owners of their selectors, states, recovery transitions, and allowed next
steps. The names `HOLD_FOR_BINDING`, `HOLD_FOR_MORE_INFORMATION`, and
`HOLD_FOR_COMPARISON_DESIGN_ADEQUACY_EVIDENCE` are review/workflow states, not
canonical FluencyTracr suppression reasons. This documentation creates no new
token, selector, parser, normalization rule, schema, code path, runtime
trigger, suppression reason, route, UI, persistence, export, customer output,
or real/customer/live data authorization.

A qualifying
`COMPARISON_DESIGN_ADEQUACY_EVIDENCE_REVIEWED_FOR_GOVERNED_SOURCE_BINDING`
result is one reviewed diagnostics dimension only. It may be supporting
context in a later, separate human decision to reprioritize unfinished DiD
proof work, but it
cannot execute, modify, calibrate, promote, or complete DiD and cannot satisfy
the full Governed Diagnostics Sufficiency Evidence Source. The existing
Bayesian DiD proof remains incomplete, including tasks `3.3`, `3.4`, `4.2`,
and `5.1` in `add-bayesian-inference-proof-harness`.

Even after that one-dimension review, every independent DiD gate remains
required: a true two-group design, comparison-cohort adequacy, complete
windows, aggregate floors, sampler diagnostics, posterior predictive checks,
prior sensitivity, replicated calibration and null evidence, peeking control,
synthetic-only proof boundaries, source binding, and TypeScript artifact
validation.

## Hypothesis Measurement Plan Contract Semantics

The governing input concept for future model-family routing is a Hypothesis
Measurement Plan. It is contract language only in Phase 1 and does not create a
schema, API, persistence model, runtime router, or artifact field.

Required conceptual fields:

| Field | Shape | Phase 1 contract semantics |
| --- | --- | --- |
| `hypothesis_id` | Required stable string ref. | Identifies one approved value hypothesis; does not authorize execution. |
| `hypothesis_statement` | Required text, aggregate/workflow scoped. | States the predeclared theory of change without customer-facing claim language. |
| `function_area` | Required controlled text/ref. | Defines the aggregate function context; no person-level or HR fields. |
| `workflow_family` | Required controlled text/ref. | Defines the workflow family or approved workflow grouping. |
| `cohort_scope` | Required aggregate cohort descriptor/ref. | Defines the aggregate slice; must satisfy suppression and no-identifiers boundaries. |
| `value_route` | Required value-route enum/ref. | Planning context for the business-value pathway; not a finance result. |
| `expected_work_change` | Required text/ref. | Predeclared behavior-change expectation; mechanism context only. |
| `expected_metric_direction` | Required enum: `increase`, `decrease`, or `stable_or_guardrail`. | Must be registered and hash bound before post-baseline outcome access; cannot be changed after observing outcomes to rescue a claim. |
| `expected_behavior_signal_lag` | Required duration/window ref. | Expected lag before behavior evidence should move; not a prior. |
| `expected_outcome_signal_lag` | Required duration/window ref. | Expected lag before outcome evidence should move; not a prior. |
| `primary_metric_id` | Required stable metric ref. | Principal business-outcome estimand. |
| `primary_metric_family` | Required controlled family/ref. | Likelihood context; the accepted longitudinal synthetic proof supports only the exact `continuous_normal_identity` aggregate family with known positive uncertainty. Real-data/runtime eligibility remains unimplemented. |
| `supporting_metric_ids` | Optional list of stable metric refs. | Mechanism evidence only; cannot replace or average into the primary estimand. |
| `guardrail_metric_ids` | Optional list of stable metric refs. | Tests quality, risk, or unintended consequences; may cap/block interpretation, not strengthen it. |
| `relevant_fluency_dimensions` | Optional list of governed dimension refs. | Aggregate readiness/context evidence only. |
| `expected_vbd_signature` | Optional governed VBD descriptor/ref. | Expected aggregate behavior pattern; mechanism context only. |
| `baseline_window` | Required window ref. | Planned baseline window; missing/stale/suppressed/imputed windows fail closed. |
| `observation_schedule` | Required schedule/list of window refs. | Planned observation cadence; repeated looks require governed peeking controls. |
| `source_system_ref` | Required reviewed aggregate source ref. | Source context only; does not authorize connector reads. |
| `metric_owner_ref` | Required non-personal role/group/process ref. | Governance owner ref only; no named people, emails, user IDs, or direct identifiers. |
| `business_owner_ref` | Required non-personal role/group/process ref. | Governance owner ref only; no named people, emails, user IDs, or direct identifiers. |
| `minimum_worthwhile_change` | Optional decision-context value/ref. | Planning context only; cannot set priors, likelihood anchors, calibration targets, diagnostic thresholds, posterior thresholds, or claim caps. |
| `known_confounders` | Optional list of reviewed confounder refs. | Caps interpretation unless addressed by the evidence design. |
| `evidence_design` | Required enum from the router vocabulary. | Selects the contract router entry; unsupported entries HOLD. |
| `finance_pathway_ref` | Optional reviewed aggregate finance-pathway ref. | Context only; cannot authorize ROI, economic output, or stronger claim caps. |
| `approval_state` | Required enum: `draft`, `approved_for_internal_review`, `hold`, or `rejected`. | Only `approved_for_internal_review` may proceed to future routing; all other states HOLD. |

Owner references are governance references only. `metric_owner_ref` and
`business_owner_ref` must resolve to roles, groups, review boards, or process
records; they must not contain named people, emails, user IDs, direct
identifiers, or person-level owner fields.

Only the approved primary metric is the principal business-outcome estimand.
Supporting metrics are mechanism evidence. Guardrails test risk, quality, or
unintended consequences. Metrics must not be blended into an arbitrary fixed
weighted score.

Blueprint target values must not be used as priors. A Blueprint may state
expected direction, minimum worthwhile change, lag expectations, and business
owner intent, but target values are not evidence and must not become prior
parameters.

Fluency, VBD, customer metrics, and financial assumptions remain distinct:

- AI Fluency explains aggregate readiness and capability movement.
- VBD explains aggregate work-pattern movement.
- The approved primary metric is the business-outcome estimand.
- Supporting metrics explain mechanism plausibility.
- Guardrails bound risk and unintended consequences.
- Finance pathway references remain owner-reviewed context and do not become
  ROI proof.

Contract semantics:

- `hypothesis_id` and `hypothesis_statement` identify the approved hypothesis;
  they do not authorize execution.
- `function_area`, `workflow_family`, and `cohort_scope` define the aggregate
  slice and must not contain user-identifiable fields.
- `value_route` describes the business-value pathway under review; it is not a
  financial result.
- `expected_work_change`, `expected_metric_direction`,
  `expected_behavior_signal_lag`, and `expected_outcome_signal_lag` are
  predeclared theory-of-change context. They may guide review windows and
  coherence review, but they must not become statistical priors.
- `primary_metric_id` is the principal business-outcome estimand for future
  model-family routing.
- `primary_metric_family` selects the metric family context for likelihood
  review; the accepted longitudinal synthetic proof supports only the exact
  `continuous_normal_identity` aggregate family with known positive
  uncertainty, and it does not authorize real-data/runtime execution.
- `supporting_metric_ids` are mechanism evidence only and must not replace or
  average into the primary estimand.
- `guardrail_metric_ids` test quality, risk, or unintended consequences and
  may cap or block interpretation; they do not strengthen claims.
- `relevant_fluency_dimensions` and `expected_vbd_signature` are mechanism and
  readiness context, not business-outcome estimands.
- `baseline_window` and `observation_schedule` define planned windows. Missing,
  stale, suppressed, imputed, or repeatedly peeked windows fail closed.
- `source_system_ref` and `finance_pathway_ref` are reviewed aggregate
  references only; they do not authorize connector reads.
- `minimum_worthwhile_change` is decision context only. It must not set prior
  means, prior scales, likelihood anchors, calibration targets, posterior
  eligibility thresholds, or any other statistical quantity.
- `known_confounders` cap interpretation unless addressed by the approved
  evidence design.
- `evidence_design` is the only field that can select a router vocabulary
  entry, and unsupported entries HOLD.
- `approval_state` must be approved before future routing; unapproved,
  missing, or drifted plans HOLD.
- Blueprint target values, sales promises, OKRs, sponsor goals, desired
  outcomes, and finance assumptions are planning context only and must not
  enter statistical priors or upgrade claim caps.

Metrics must not be blended into arbitrary fixed weighted scores. The
enterprise may review a portfolio of hypotheses, but each hypothesis preserves
its own primary metric, supporting mechanisms, guardrails, evidence design, and
claim cap.

## Hypothesis And Metric Admission Boundary

The docs-only contract
`docs/contracts/ai-value-hypothesis-metric-longitudinal-admission/README.md`
defines the bridge from a company's hypotheses and metric catalog to later
review against the proved longitudinal specification.

The company metric catalog has no arbitrary product-level count cap and does
not require one universal taxonomy. Model eligibility remains closed: each
immutable analysis unit binds one approved hypothesis, one primary metric
definition ref/hash, an ordered panel manifest whose groups each map one-to-one
to one canonical aggregate slice with independent per-window gate receipts,
one ordered window plan, one predeclared lag and direction, one evidence
design/claim cap, the fixed model/control/exposure/baseline-Fluency hashes,
separate evidence and fit dependency keys, a hash-bound pre-outcome access
receipt, and one terminal look. Current metric/readiness validators remain
non-admissive. Model-level partial pooling is limited to the 6 or 12
independently cleared aggregate panel groups in the accepted synthetic
envelope; raw cross-slice pooling and gate rescue are prohibited.

The current longitudinal proof admits only the exact synthetic
`continuous_normal_identity` aggregate outcome family with known positive
uncertainty and every existing compiled gate. Unsupported families HOLD rather
than selecting a second estimator or being coerced through the normal model.
The accepted replicated envelope remains 12 pre windows, 6 post windows,
panel-group counts of 6 or 12, and aggregate `k=16`; mathematical fit support
outside that envelope is not calibrated evidence.

Supporting metrics, guardrails, AI Fluency, Velocity, Breadth, Depth, and
finance context retain their distinct roles. Existing
`selected_metric_movement` is descriptive original-unit context. The fitted
`longitudinal_movement` quantity is a direction-adjusted associational
Velocity/Breadth-outcome contrast in pre-period outcome SD units, conditional
on trend, approved controls, group effects, and AR(1) structure. Both stay
separate from the prebound categorical `evidence_design_claim_cap`; none
creates numeric AI-attribution confidence or customer output.

For multiple hypotheses, a future portfolio runner must freeze and completely
account for every planned analysis unit with exact manifest/result equality,
explicit HOLD records, one fixed terminal look, and declared reused
metric/cohort/evidence/fit dependencies. Completed fits additionally bind the
prepared-input and fit-summary hashes; pre-fit HOLDs retain their planned keys
and explicit null fit hashes. The accepted per-cell synthetic null rate is not
an enterprise-wide false-claim guarantee; portfolio inference remains HOLD
without a separately validated multiplicity procedure, and no portfolio
probability, confidence rating, composite index, or attribution rollup is
authorized.

## Phase 2A Contract: `first_longitudinal_synthetic_model_slice`

The first longitudinal model candidate selected for a later approved Phase 2B
proposal is:

```text
first_longitudinal_synthetic_model_slice
```

This subsection records the original docs-only Phase 2A specification. The
later Phase 2B smoke implementation is described under **Current V2 Smoke
Boundary** below. Neither phase authorizes routes, UI, persistence, exports,
migrations, connector reads, customer-facing outputs, real/customer/live data,
ROI proof, productivity measurement, causality claims, confidence percentages,
probability output, or economic output.

The slice is bounded to:

- one approved hypothesis;
- one approved primary continuous normal outcome;
- aggregate Measurement Cell windows only;
- multiple time windows;
- baseline AI Fluency context;
- separate lagged Velocity and Breadth exposures, with Depth carried only as
  synthetic aggregate pathway context unless a later promotion authorizes
  Depth as a model dependency;
- function or workflow partial pooling;
- explicit time trend;
- known aggregate observation uncertainty;
- synthetic-only inputs;
- internal validation/review inputs only; no emitted product or customer
  output.

Approved hypothesis means approved for internal specification and contract
review only. It does not authorize execution, data access, persistence,
customer output, or model output.

The existing DiD module remains `comparison_supported_bayesian_did_module`.
It remains synthetic-only/internal-only, valid only for two-group pre/post
comparison-supported designs with every DiD gate passing. It does not support
staggered rollout. Existing DiD proof tasks `3.3`, `3.4`, `4.2`, and `5.1`
in `add-bayesian-inference-proof-harness` remain incomplete.

This slice does not authorize staggered-rollout, event-study, adoption-time,
calendar-time, or not-yet-treated comparison logic. Any staggered-rollout
interpretation HOLDS until a separate approved proposal implements,
calibrates, and validates that exact route.

### Conceptual Model Equation

If a later approved Phase 2B proposal implements this slice, its contract
review should use a longitudinal aggregate model over approved Measurement
Cell windows:

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

Term definitions:

| Term | Meaning |
| --- | --- |
| `Y[h,c,t]` | Approved primary business-outcome aggregate value for hypothesis `h`, Measurement Cell `c`, and time window `t`. |
| `se[h,c,t]` | Known aggregate observation standard error for the approved primary metric in that cell/window. Missing SE HOLDS. |
| `mu[h,c,t]` | Latent expected aggregate primary outcome value for the same cell/window. |
| `alpha[h]` | Hypothesis-specific intercept for the approved hypothesis. |
| `u_function_or_workflow[c]` | Partial-pooling deviation for the approved aggregate function area or workflow family. |
| `baseline_trend[h,c,t]` | Explicit predeclared historical or calendar time trend for the approved metric and cell. Weak or missing baseline trend evidence caps or HOLDS interpretation. |
| `beta_velocity[h]` | Hypothesis-specific association between lagged Velocity exposure and primary outcome movement. |
| `beta_breadth[h]` | Hypothesis-specific association between lagged Breadth exposure and primary outcome movement. |
| `beta_fluency[h]` | Hypothesis-specific baseline AI Fluency context coefficient. |
| `baseline_fluency[c]` | Aggregate baseline AI Fluency estimate for the Measurement Cell, used as readiness/context evidence only. |
| `gamma[h]` | Hypothesis-specific coefficients for approved aggregate business controls. |
| `approved_business_controls[c,t]` | Predeclared aggregate controls such as seasonality, staffing mix, volume mix, campaign timing, or policy changes. |
| `residual_time_structure[h,c,t]` | Remaining aggregate time-series error structure; a later approved Phase 2B proposal must define diagnostics and HOLD behavior before implementation. |

Cohort refs must remain aggregate, non-identifying, independently suppressed
per slice, and unable to support cross-slice re-identification.

### Current V2 Smoke Boundary

The implemented V2 smoke artifact is deliberately narrower than the conceptual
state-space model above. It validates the input, hash, diagnostic, and bridge
mechanics using closed-form Gaussian analytic regression with an independent
Gaussian likelihood. It does not claim or implement:

- NUTS or any MCMC chain;
- AR(1) likelihood structure (AR(1) is a post-hoc residual diagnostic only);
- function/workflow partial pooling;
- historical counterfactual forecasting;
- replicated calibration or promotion.

The V2 artifact binds the exact synthetic input, diagnostics, and emitted fit
outputs through hierarchical fit-summary commitments. It marks the pre-period
placebo, posterior predictive checks, sampler diagnostics, prior-sensitivity
refits, and full counterfactual-stability analysis `NOT_RUN`. These unkeyed
hashes provide internal consistency and drift detection, not trusted artifact
authenticity;
a coordinated payload rewrite requires a separately approved trusted
signature/envelope. Every non-HOLD V2 artifact is
`valid_internal_smoke_non_authorizing`. The TypeScript boundary retains V1
legacy read compatibility, but V1 cannot satisfy V2, state-space, NUTS,
concordance, or replicated-validation requirements.

The V2 consistency binding is hierarchical: emitted input evidence plus the
private dataset remainder compose the synthetic-input root; emitted diagnostic
evidence plus the private fit remainder compose the diagnostics-fit root; and
the synthetic-input root, diagnostics-fit root, and fit-output evidence
covering the posterior summary, analytic draw count, and pathway evidence
compose the final fit-summary root. This
detects operand changes beneath unchanged roots without claiming signature-grade
authenticity when an actor replaces every unkeyed root.

### Current State-Space And NUTS Concordance Boundary

The exact-scope change `add-longitudinal-state-space-nuts-concordance`
implements a separate synthetic-only internal validation artifact for:

```text
y[c,t] = X[c,t] beta + u[c] + r[c,t] + epsilon[c,t]
r[c,t] = rho * r[c,t-1] + eta[c,t]
```

Both engines consume one canonical pre-period-standardized aggregate input.
The deterministic primary analytically integrates the Gaussian state,
zero-sum panel-group effects, and fixed coefficients before deterministic
Sobol cubature over covariance hyperparameters. The PyMC reference uses four
chains, 1,000 retained draws, 2,000 tuning draws, `target_accept=0.99`, and
`max_treedepth=15`. Compiled sampler, posterior-predictive, and cross-engine
gates fail closed.

All 30 full-setting slots passed: five fixed seeds in each cell formed by
effects `{0, 0.2, 0.5}` SD and panel-group counts `{6, 12}`. Durable evidence
is committed under `inference/evidence/` without raw posterior draws or latent
states. The generated artifact records that the numerical concordance gate
passed, while independent acceptance and replicated-validation execution
remain false inside that artifact. The separate reviewed evidence record may
unblock the next synthetic validation PR only after CODE, BUG, and ADVERSARIAL
acceptance.

The artifact binds the compiled Python range, exact `requirements.lock` hash,
and generation runtime package manifest. Python accepts only the exact
in-process registered runner study and recomputes slot hashes, compiled order,
execution modes, and study fields before emission; copied or substituted study
objects cannot emit a PASS artifact.

This concordance does not complete replicated interval coverage, null
false-validation-signal measurement, floor, lag, shock, model-selection, or
negative-control studies. It adds no real-data admission, production runtime,
route, UI, persistence, export, connector, customer readout,
confidence/probability output, ROI, causality, productivity, finance output,
new canonical event, suppression reason, tunable threshold, or promotion
decision.

### Current Replicated-Validation Runner Boundary

The exact-scope change `add-longitudinal-replicated-validation-runner`
implements the synthetic-only execution path for the remaining replicated
study. It compiles exactly 1,200 deterministic state-space calibration slots,
20 create-once atomic chunks, strict resume/combine recomputation, separate
aggregate `k` floor controls, fixed lag recovery, and shock/negative controls.
The strict sibling TypeScript artifact schema independently recomputes slot
identity, seeds, manifests, interval coverage, null z diagnostics, integer
gates, binomial standard errors, control outcomes, lag selection, hashes, and
HOLD/non-HOLD state.

The runner implementation is not generated evidence. Smoke, canary, partial,
mixed-provenance, malformed, or incomplete results HOLD. The later exact full
run recorded the numerical `valid_internal_validation_non_authorizing` state;
the generated artifact itself retains false independent-acceptance and
proof-completion fields because it cannot self-certify review.

The accepted runner pins exact Python/package runtime, Python and Node
lockfiles, the TypeScript hashing/export chain, and the actual accepted
concordance artifact/summary bytes. Checkpoint child symlinks reject, runner
errors remain durable HOLD evidence, and repeated combine must regenerate the
same artifact timestamp and content. Exact evidence completeness is tracked
separately from numerical success.

### Accepted Replicated-Validation Evidence

The 2026-07-13 evidence run completed all 1,200 state-space calibration slots
across effects `{0, 0.2, 0.5}` SD and panel-group counts `{6, 12}`. Per-cell
80% interval coverage ranged from `74.5%` to `81.5%`; both null cells produced
a `4.5%` false-validation-signal rate, below the compiled `5%` maximum. All
four floor controls passed, each true lag `{1,2,3}` was recovered `30/30`
times, all nine shock/negative controls passed, and there were no hard,
missing, duplicate, or off-plan rows.

The full artifact, compact summary, and separate independent acceptance record
are committed under `inference/evidence/`. CODE, BUG, and ADVERSARIAL review
returned GO against the exact full-artifact bytes generated on branch review
ref `2ab71e19`. The durable acceptance gate is the committed full-artifact
SHA-256 plus artifact self-hash, not reachability of that branch ref after a
squash merge. The record also binds artifact payload hash, calibration/control
plans and results, combined-study hash, execution identity, implementation,
runtime, lockfile, source commit, compact-summary bytes, and reviewer IDs.

This completes only the synthetic longitudinal state-space model proof and
model-family Phase 3. It does not complete AI Fluency measurement-model or VBD
trajectory-model calibration, and it authorizes no production promotion,
customer output, confidence/probability output, ROI, causality, productivity,
finance output, route, UI, persistence, export, readout, or connector. The DiD
module remains isolated and incomplete.

### AI Fluency Measurement-Model Calibration Contract

The exact-scope contract
`docs/contracts/ai-value-ai-fluency-measurement-model-calibration/README.md`
defines the gate for the future `bayesian_fluency_measurement_model`.

Current state:

```text
SYNTHETIC_CALIBRATION_ACCEPTED_REAL_DATA_PENDING
```

The contract now defines aggregate snapshot-context prerequisites plus the
implemented synthetic measurement-evidence and runner boundary:

- validated aggregate `AIFluencyInstrumentSnapshot` waves only;
- immutable baseline/retest wave identity;
- source refs and source hashes;
- finite, nonnegative, complete aggregate uncertainty for the overall estimate
  and all five dimensions;
- reliability or sufficient aggregate precision evidence;
- coverage, missingness, and respondent-composition posture;
- k-min posture at the aggregate cohort grain;
- exact instrument, form, item-set, item-to-dimension, and scoring-derivation
  versions;
- a frozen privacy-safe aggregate sufficient-statistics contract with all 24
  item marginals and 276 pair tables per wave;
- same-form compatibility or an approved cross-form equating record;
- predeclared longitudinal measurement-invariance gates;
- CODE, BUG, and ADVERSARIAL review against exact artifact bytes for any later
  implementation.

The current runtime is isolated to synthetic aggregate validation. It uses a
regularized ordinal-probit pairwise-composite Laplace proof, frees
construct-level follow-up latent means before threshold-invariance review, and
freshly recomputes every study slot before artifact emission. Smoke, partial,
off-plan, unsafe, real-source, or hash-invalid evidence HOLDS. The fixed full
plan is 200 seeds in each of invariant, invariant-latent-shift, loading-drift,
and threshold-drift scenarios. All 800 primary slots and all 800 separate fresh
recomputations completed with zero runner errors. The observed expected-result
counts were `199`, `198`, `194`, and `200`; all four recovery counts were
`200/200`. The summary-only full artifact and compact summary are byte-bound to
a self-hashed CODE/BUG/ADVERSARIAL acceptance record under
`inference/evidence/`.

No respondent latent traits, customer posterior intervals, probability output,
confidence output, production runtime, schemas, persistence, routes, UI,
public exports, live connectors, customer readouts, real-data admission, ROI,
causality, productivity, finance output, or economic output is authorized.
Dimension summaries remain context only and cannot replace item-level aggregate
sufficient statistics.

### VBD Trajectory-Model Calibration Contract

The exact-scope contract
`docs/contracts/ai-value-vbd-trajectory-model-calibration/README.md` records:

```text
CONTRACT_DEFINED_SYNTHETIC_IMPLEMENTATION_PENDING
```

It resolves the existing exposure-definition ambiguity before implementation.
The product `velocity_index` already contains Breadth, so it cannot appear
beside a separate Breadth term. Legacy weighted VBD scores also lack admitted
aggregate uncertainty. The selected future proof instead keeps three active
likelihood lanes separate:

- p50 frequency in runs per active day, transformed with `log1p`;
- p50 engagement as an eligible-day share, transformed with
  `asin(sqrt(proportion))`; and
- p50 Breadth as an eligible-surface share under one immutable taxonomy,
  transformed with `asin(sqrt(proportion))`.

The proof does not estimate or redefine canonical Velocity. Frequency,
engagement, and Breadth remain separate primitive trajectories. Depth may remain
a non-numeric source-bound aggregate context reference outside every
likelihood, estimand, eligibility rule, and numerical artifact. Missing Depth
context cannot change trajectory acceptance.

The proposal specifies a future independent Gaussian state-space block per
active lane, deterministic-primary/PyMC-NUTS concordance, a fixed six-cell
1,200-slot primary study, 360 targeted lane-separation slots, 360 replicated
drift slots, 12 floor controls, 68 fixed negative controls, fresh recomputation
of all 2,000 cases, four predeclared full-setting canaries, a familywise `<=5%` null gate,
floor checks at `k={4,5,8,10,12,16}`, drift and negative controls, exact hash
bindings, and fail-closed behavior. These are internal synthetic proof
requirements only.

The accepted longitudinal outcome proof currently consumes one scalar Velocity
term and one scalar Breadth term. This contract therefore does not authorize
integration. A later approved change must reconcile the exact three-lane
interface and rerun all affected outcome-model proof gates. That integration is
a separate blocker before dogfood execution, not part of task `5.6`.
Implementation approval, execution, evidence, independent acceptance, explicit
human acceptance, and parent task `5.6` remain incomplete.

V2 accepts no fixture scenario or ground-truth oracle fields in its dataset
contract. It also requires JavaScript-safe nonnegative seeds, timezone-aware
RFC3339 generation timestamps, and compiled synthetic control identity/source
pairs. Unknown designs and designs routed to the isolated DiD module reject
before longitudinal artifact emission; supported negative-control designs emit
only bridge-valid HOLD artifacts.

Velocity and Breadth remain separate in the model. Depth is synthetic
aggregate pathway context in this slice, not an authorized coefficient,
eligibility input, confidence-band adjustment, or economic dependency. Any
future Depth coefficient, interaction, or composite VBD term requires a later
promotion decision that authorizes that exact dependency and defines the
derivation.

Baseline AI Fluency is context/moderator evidence, not observed AI work
behavior. Retest AI Fluency is co-evidence for readiness movement and pathway
review; it is not a same-window causal driver of the primary outcome.

Outcome movement in the approved primary metric is the primary business-outcome
estimand. This slice is associational/contribution-alignment only unless a
stronger evidence design is separately implemented, calibrated, and approved.

### Future Synthetic Inputs

A later approved Phase 2B proposal for this slice must accept only synthetic
aggregate inputs with these required conceptual fields:

| Field | Required semantics |
| --- | --- |
| `hypothesis_id` | One approved hypothesis ref. Missing or unapproved hypotheses HOLD. |
| `cohort_id` | Approved aggregate cohort ref; no direct identifiers. |
| `function_area` or `workflow_family` | One approved aggregate partial-pooling context. |
| `time_window_id` | Approved Measurement Cell window ref. |
| `primary_metric_value` | Aggregate value for the approved primary outcome metric. |
| `primary_metric_se` | Known aggregate SE for the primary metric value. |
| `primary_metric_family` | Must equal the exact token `continuous_normal_identity` for this first slice; aliases HOLD. |
| `lagged_velocity_exposure` | Predeclared aggregate Velocity exposure at the approved lag. |
| `lagged_breadth_exposure` | Predeclared aggregate Breadth exposure at the approved lag. |
| `lagged_depth_context` | Optional synthetic aggregate Depth pathway context at the approved lag; context only, not a model coefficient in this slice. |
| `baseline_fluency_estimate` | Aggregate baseline Fluency estimate for context/moderation. |
| `baseline_fluency_se` | Known aggregate uncertainty for baseline Fluency context. |
| `optional_retest_fluency_estimate` | Optional aggregate retest co-evidence, not a same-window causal driver. |
| `optional_retest_fluency_se` | Optional aggregate uncertainty for retest Fluency co-evidence. |
| `approved_business_controls` | Predeclared aggregate controls and encodings. Synthetic business controls are placeholders only in Phase 2A; real/customer/live business controls are not authorized. |
| `window_evidence` | Source-bound Measurement Cell window evidence; missing/suppressed windows HOLD. |
| `suppression_context` | Aggregate suppression and floor context. |
| `source_quality_context` | Source freshness, alignment, and review context. |
| `known_confounders` | Reviewed confounder refs that may cap interpretation. |
| `evidence_design` | Router vocabulary entry; unsupported designs HOLD. |

Person-level fields, raw prompts, transcripts, direct identifiers, raw event
rows, emails, user IDs, query text, and connector payloads are forbidden. Any
attempt to include them HOLDS or rejects before interpretation.

### Internal-Only Estimands

The first slice may define these internal validation inputs only:

- `direction_adjusted_outcome_movement`;
- posterior interval for movement;
- internal draw-share validation diagnostic only against a compiled synthetic
  smoke constant. `minimum_worthwhile_change` remains decision context and must
  not become a prior, likelihood anchor, calibration target, customer
  threshold, posterior eligibility threshold, tunable diagnostic threshold, or
  claim cap;
- pathway coherence review status, not causal probability;
- evidence-design claim cap.

All posterior intervals, internal draw-share diagnostics, coherence review
fields, and claim-cap fields are internal validation/review inputs only; they
are not customer outputs. Draw-share diagnostics are not probability output,
causal probability, or confidence language. They must not emit ROI, causality,
productivity, finance, HR, ranking, confidence percentage, probability output,
customer-facing output, or economic output. Numeric readout, export, customer
authorization, confidence authorization, and probability authorization remain
false.

### HOLD Behavior

The first longitudinal slice must HOLD or reject before interpretation when any
of these cases appear:

- non-normal metric family;
- missing approved hypothesis;
- missing primary metric;
- missing or suppressed required windows;
- missing aggregate SE;
- missing Velocity, Breadth, or Depth exposure context;
- AI Fluency substituted for VBD;
- VBD substituted for the primary outcome;
- supporting metric substituted for the primary metric;
- Blueprint target value used as prior evidence;
- baseline-only design attempting contribution confidence;
- staggered rollout routed to current DiD;
- real/customer/live/production data flags;
- person-level fields, raw prompts, transcripts, direct identifiers, or raw
  event rows;
- output authorization flags set true.

Unsupported, incomplete, or unsafe evidence remains `HOLD`. This section does
not create a new canonical event, suppression reason, tunable threshold, admin
override, promotion decision, or output authorization.

Unsupported, incomplete, unsafe, missing, suppressed, stale, imputed, or
repeatedly peeked evidence HOLDS or rejects before interpretation.

### Synthetic Validation Record

Phase 2B/3 work distinguished smoke validation, replicated calibration, and
negative controls. The smoke artifact proved only that the bounded synthetic
path executed. Later state-space/NUTS concordance and the accepted 1,200-slot
replicated-validation evidence completed the synthetic longitudinal proof.

The accepted synthetic evidence covers:

- clean longitudinal pathway;
- VBD-only movement;
- Fluency-only movement;
- outcome-only unrelated shock;
- common-shock confounder;
- wrong-lag scenario;
- placebo intervention date;
- missing or suppressed windows;
- weak historical baseline;
- comparison-supported two-group scenario routed to existing DiD;
- claimed staggered rollout HOLD;
- financial double-counting attempt HOLD.

This completion is limited to the synthetic longitudinal state-space proof. AI
Fluency synthetic measurement calibration is accepted, while real aggregate AI
Fluency calibration, VBD trajectory calibration, real-data admission, runtime
routing, persistence, and customer-facing interpretation remain incomplete. No
current evidence authorizes customer-facing
confidence/probability, ROI, causality, productivity, finance, or economic
output.

## Pathway Coherence And Claim Cap

`posterior_pathway_coherence_review` is a future internal review concept. It
may review whether the predeclared theory of change is directionally coherent
across:

- relevant aggregate AI Fluency evidence;
- expected VBD behavior or trajectory;
- primary business outcome movement.

It may identify coherence, tension, or insufficient evidence for internal
review. It must not be described as:

- causal probability;
- ROI proof;
- productivity proof;
- probability that Glean caused the outcome;
- customer-facing confidence.

`evidence_design_claim_cap` is derived from the approved evidence design and
hash bound at plan freeze before post-baseline outcome access, then enforced
after statistical estimation and before interpretation. Diagnostics,
confounding, guardrails, and governance may only lower it or HOLD. A narrow
posterior interval under a weak evidence design cannot produce a stronger claim
than the design allows. Finance assumptions, economic pathway context,
Blueprint promises, or sponsor goals cannot upgrade design strength.
Unsupported designs HOLD.

Claim caps remain internal-only in this docs-only Phase 1/2A contract:

| Evidence design state | Maximum current interpretation |
| --- | --- |
| Unsupported design | HOLD. |
| Baseline-only context | Planning context only; no contribution confidence. |
| Directional or mechanism evidence without valid comparison | Internal directional context only. |
| Valid two-group pre/post DiD contract eligibility with all gates passing | Internal-only comparison-supported contribution-estimate eligibility; no customer-facing confidence/probability, ROI, causality, productivity, or economic output. |
| Accepted synthetic historical/repeated longitudinal proof with compiled gates passing | Internal synthetic noncausal contribution-alignment review only by default. The separate dogfood decision permits docs/OpenSpec prerequisite hardening for `HISTORICAL_STATE_SPACE` only; no real-data/runtime execution, customer-facing confidence/probability, ROI, causality, productivity, finance, persistence, routes, UI, or exports. |
| Real-data longitudinal, staggered, controlled, or economic contract route | HOLD until a later approved proposal implements, validates, and promotes that exact route. |

## Claim Boundary

The model family preserves all current governance invariants:

- Aggregate-only data.
- No person-level scoring.
- No employee productivity measurement.
- No manager, team, department, or employee ranking.
- No HR decisioning.
- No raw prompts, transcripts, query text, direct identifiers, or person-level
  fields.
- No customer-facing confidence percentages.
- No ROI proof.
- No causality claims or causal-probability output are authorized by this
  Phase 1 contract.
- No live connector reads.
- No persistence, routes, UI, exports, or migrations.
- Fail-closed behavior.
- Source and artifact hash binding.
- No runtime-tunable thresholds.
- No admin overrides.

This decision does not weaken comparison adequacy gates, sampler diagnostics,
or internal-only proof-artifact boundaries. It narrows the current DiD module
to its valid evidence design and creates a future vocabulary for routing other
designs only after separate contract and validation work.

## Implementation Status

Implemented now:

- Docs-only architecture audit.
- Docs-only model-family decision record.
- Docs-only evidence-design vocabulary.
- Docs-only Hypothesis Measurement Plan outline.
- OpenSpec proposal for phased future work.
- Docs-only Phase 1 router contract vocabulary.
- Docs-only Hypothesis Measurement Plan contract semantics.
- Docs-only pathway coherence and claim-cap semantics.
- Docs-only hypothesis and company-defined metric longitudinal admission
  boundary.
- Docs-only Phase 2A selection and specification of
  `first_longitudinal_synthetic_model_slice`.

Not implemented by the original Phase 1/2A decision itself:

- Runtime model family.
- Production model-family router.
- Hypothesis Measurement Plan schema.
- TypeScript production schema changes.
- Production artifact schema changes. The separate V1
  `FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07` and V2
  `FT_AI_VALUE_LONGITUDINAL_SYNTHETIC_OUTCOME_PROOF_2026_07_V2` smoke artifacts
  are internal-only and belong to OpenSpec changes
  `add-ai-fluency-instrument-snapshot-longitudinal-proof` and
  `harden-longitudinal-smoke-proof-boundary`.
- Production longitudinal runtime model code, state-space models, event-study
  models, controlled-test models, or economic value models.
- Customer-facing confidence, probability, ROI, causality, productivity, or
  finance output.

Implemented by the later exact-scope Phase 2B smoke change
`add-ai-fluency-instrument-snapshot-longitudinal-proof`:

- Source-independent aggregate `AIFluencyInstrumentSnapshot` validator.
- Adapter parity tests for Apps Script-shaped, controlled JSON, and future API
  fixtures.
- Isolated synthetic-only longitudinal proof path under `inference/`.
- Structurally validated, source-bound V2 smoke artifacts with immutable
  synthetic-input, diagnostics-fit, and fit-output bindings.
- Separate confidence-engine V1/V2 Zod schemas for internal smoke artifacts,
  including rehashed-overclaim rejection and V1 legacy readability.
- Negative/HOLD controls for unsupported routes, missing inputs, wrong lag,
  common shock, and temporary-only movement, plus pre-emission rejection for
  unsafe controls, real-data flags, and respondent leakage.

Implemented by the later exact-scope concordance change
`add-longitudinal-state-space-nuts-concordance`:

- Shared pre-period-standardized Gaussian state-space preparation with known
  aggregate SE, zero-sum panel-group effects, stationary AR(1), separate
  Velocity/Breadth terms, baseline Fluency context, approved controls, and
  Depth context excluded from the likelihood.
- Deterministic Gaussian integration and a matched full-setting PyMC NUTS
  reference with fixed sampler, PPC, and cross-engine gates.
- Exact 30-slot synthetic concordance evidence, strict Python/TypeScript hash
  and manifest validation, and commit-and-evidence-bound independent
  CODE/BUG/ADVERSARIAL acceptance.
- Separate summary-only evidence that does not contain posterior draws or
  authorize replicated execution, customer output, or production use.
- The separate acceptance record was the prerequisite later consumed by the
  replicated-validation change; concordance alone did not mark replication or
  the full longitudinal proof complete.

Implemented by the later exact-scope replicated-validation runner and evidence
changes:

- Exact 1,200-slot deterministic state-space calibration across the six
  compiled effect/group cells.
- Accepted interval coverage, null false-signal, floor, lag-recovery, shock,
  and negative-control evidence with strict resumable combination and
  artifact-byte review binding.
- Separate compact summary and CODE/BUG/ADVERSARIAL acceptance record that
  authorize only the completed internal synthetic longitudinal proof.

Still incomplete after the accepted longitudinal replicated-validation and AI
Fluency measurement evidence:

- Governed real aggregate AI Fluency calibration.
- VBD trajectory-model implementation, execution, exact-byte acceptance, and
  explicit human acceptance.
- Downstream three-lane outcome-model integration and renewed affected proof.
- AI Fluency snapshot persistence promotion.
- Backend read projection or UI integration.

## Remaining DiD Proof Status

The existing Bayesian DiD proof harness remains incomplete until its own
OpenSpec tasks are separately satisfied. The current migration decision does
not complete task `3.3`, task `3.4`, task `4.2`, or task `5.1` in
`add-bayesian-inference-proof-harness`.

The remaining blocker before calling the Bayesian DiD proof complete is still
reviewed full sampler-artifact evidence, including the required replicated
calibration, null false-eligibility, negative-control, and floor-control
evidence, or a later governed methodology change that explicitly changes that
requirement.
