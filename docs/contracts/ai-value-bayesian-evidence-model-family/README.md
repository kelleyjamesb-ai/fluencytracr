# Bayesian AI Value And Behavioral Evidence Model Family

## Purpose

This decision record reframes the current Bayesian confidence architecture from
one universal Bayesian DiD model into a governed model family:

```text
bayesian_ai_value_and_behavioral_evidence_model_family
```

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
  `bayesian_hierarchical_difference_in_differences_candidate` as the candidate
  model family.
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
bayesian_ai_value_and_behavioral_evidence_model_family
```

This contract defines architecture and routing semantics only. It does not
create runtime routing code, production schemas, artifact schemas, endpoints,
UI, persistence, exports, migrations, connector reads, or customer-facing
outputs.

| Module or component | Contract role | Implemented today | Current contract eligibility |
| --- | --- | --- | --- |
| `comparison_supported_bayesian_did_module` | Specialized current module for two-group pre/post comparison-supported hypotheses. | Yes, only as the existing synthetic/internal PyMC DiD proof harness and TypeScript validation boundary. | Eligible only for `TWO_GROUP_PRE_POST_COMPARISON` or `MATCHED_COMPARISON` that reduces to a valid two-group pre/post design, with every DiD gate passing. |
| `bayesian_fluency_measurement_model` | Future model for aggregate AI Fluency movement and measurement uncertainty. | No. | Documentation-only future module. |
| `bayesian_vbd_behavioral_trajectory_model` | Future model for Velocity, Breadth, and Depth movement over time at approved aggregate cells. | No. | Documentation-only future module. |
| `bayesian_hypothesis_outcome_model` | Future model for customer-owned primary metric movement for approved hypotheses. | No. | Documentation-only future module. |
| `bayesian_economic_value_model` | Future internal review component for finance-pathway assumptions after outcome evidence exists. It must not emit ROI proof or customer-facing economic output. | No. | Documentation-only future component; cannot upgrade claim caps. |
| `posterior_pathway_coherence_review` | Future internal review of whether predeclared fluency, behavior, and outcome evidence is directionally coherent. | No. | Documentation-only review concept; not a customer-facing probability, confidence, ROI, causality, or productivity output. |
| `evidence_design_claim_cap` | Future claim-cap review applied after estimation and before interpretation. | No. | Documentation-only governance concept; unsupported designs HOLD. |
| `enterprise_hypothesis_portfolio` | Future internal portfolio view of multiple approved hypotheses without blending them into one arbitrary enterprise index. | No. | Documentation-only portfolio concept. |

The current DiD module remains valid only for two-group pre/post
comparison-supported designs. It does not support staggered rollout and does
not authorize real/customer/live data or customer-facing confidence,
probability, ROI, causality, productivity, or economic output.

## Evidence-Design Router Vocabulary

The model family uses this additive router vocabulary. This is a contract for
future routing behavior, not an implemented router.

| Evidence design | Contract support status | Current contract-eligible module | Required gates before eligibility | Claim cap | Unsupported / HOLD behavior |
| --- | --- | --- | --- | --- | --- |
| `CONTROLLED_TEST` | Future contract route only unless the data reduce to a valid two-group pre/post contrast. | No standalone current controlled-test module. Contract-eligible for `comparison_supported_bayesian_did_module` only if the approved design is also a valid two-group pre/post comparison and every DiD gate passes. | Approved design record; aggregate-only Measurement Cell windows; no contamination; comparison adequacy if DiD-eligible; floors; diagnostics; calibration; peeking control; synthetic/internal proof boundary. | Internal-only design context or internal contribution-estimate eligibility if reduced to valid DiD; no customer-facing confidence, probability, ROI, causality, productivity, or finance output. | HOLD if the controlled-test design cannot be represented by the current DiD module or lacks validation. |
| `TWO_GROUP_PRE_POST_COMPARISON` | Current specialized contract eligibility. | `comparison_supported_bayesian_did_module`. | Credible comparison cohort; exact baseline/post windows; same selected metric and direction; declared lag; aggregate floors; no suppressed/stale/missing/imputed windows; pre-trend check; sampler diagnostics; posterior predictive checks; prior sensitivity; calibration/null/floor proof; fixed-horizon peeking control; TypeScript artifact validation. | Internal-only comparison-supported contribution-estimate eligibility at most; no customer-facing confidence/probability and no causal, ROI, productivity, or economic claim. | HOLD or evidence-tier-only if any comparison, window, floor, diagnostic, calibration, peeking, source-binding, or artifact-validation gate fails. |
| `MATCHED_COMPARISON` | Conditional current contract eligibility. | `comparison_supported_bayesian_did_module` only when matching still yields a true two-group pre/post design at the aggregate Measurement Cell grain. | Reviewer-owned matching/design adequacy memo; matched cohorts remain aggregate-only and non-identifying; same metric/window/direction/lag; balance and pre-period plausibility reviewed; every DiD gate above passes. | Internal-only matched-comparison-ready context or DiD contribution-estimate eligibility when all gates pass; no causal language from matching alone. | HOLD or remain future-model-only if matching does not reduce to a valid two-group pre/post DiD design. |
| `STAGGERED_ROLLOUT` | Unsupported by the current DiD module. | None. | Future event-time, calendar-time, adoption-time, and not-yet-treated comparison logic must be implemented, calibrated, and validated in a separate approved proposal before any contract eligibility exists. | HOLD only under the current implementation. | Must HOLD as unsupported; must not be coerced into current two-group DiD or treated as current event-study support. |
| `HISTORICAL_STATE_SPACE` | Future longitudinal contract route only. | None. | Future state-space model, longitudinal priors, time-varying uncertainty, missingness policy, diagnostics, calibration, and negative controls must be approved and verified. | HOLD only under the current implementation. | Must HOLD; historical context may support planning but not contribution confidence. |
| `REPEATED_PRE_POST` | Future longitudinal repeated-window contract route only. | None. | Future repeated-window model and a governed repeated-look or always-valid sequential procedure must be implemented and calibrated. | HOLD only under the current implementation. | Must HOLD; repeated looks must not bypass peeking controls or current fixed-horizon one-look limits. |
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
- `HISTORICAL_STATE_SPACE` and `REPEATED_PRE_POST` require future
  longitudinal models.
- `BASELINE_ONLY` cannot produce contribution confidence.
- Economic assumptions, finance pathway references, sponsor goals, and
  Blueprint promises cannot upgrade evidence-design strength or claim caps.

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
| `expected_metric_direction` | Required enum: `increase`, `decrease`, or `stable_or_guardrail`. | Sets interpretation direction before review; cannot be changed after observing outcomes to rescue a claim. |
| `expected_behavior_signal_lag` | Required duration/window ref. | Expected lag before behavior evidence should move; not a prior. |
| `expected_outcome_signal_lag` | Required duration/window ref. | Expected lag before outcome evidence should move; not a prior. |
| `primary_metric_id` | Required stable metric ref. | Principal business-outcome estimand. |
| `primary_metric_family` | Required controlled family/ref. | Future likelihood context; today only the current normal continuous aggregate DiD path is implemented. |
| `supporting_metric_ids` | Optional list of stable metric refs. | Mechanism evidence only; cannot replace or average into the primary estimand. |
| `guardrail_metric_ids` | Optional list of stable metric refs. | Tests quality, risk, or unintended consequences; may cap/block interpretation, not strengthen it. |
| `relevant_fluency_dimensions` | Optional list of governed dimension refs. | Aggregate readiness/context evidence only. |
| `expected_vbd_signature` | Optional governed VBD descriptor/ref. | Expected aggregate behavior pattern; mechanism context only. |
| `baseline_window` | Required window ref. | Planned baseline window; missing/stale/suppressed/imputed windows fail closed. |
| `observation_schedule` | Required schedule/list of window refs. | Planned observation cadence; repeated looks require governed peeking controls. |
| `source_system_ref` | Required reviewed aggregate source ref. | Source context only; does not authorize connector reads. |
| `metric_owner_ref` | Required non-personal role/group/process ref. | Governance owner ref only; no named people, emails, user IDs, or direct identifiers. |
| `business_owner_ref` | Required non-personal role/group/process ref. | Governance owner ref only; no named people, emails, user IDs, or direct identifiers. |
| `minimum_worthwhile_change` | Optional decision-context value/ref. | Planning threshold only; cannot set priors, likelihood anchors, calibration targets, posterior thresholds, or claim caps. |
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
- `primary_metric_family` selects the metric family context for future
  likelihood review; only the current normal continuous aggregate DiD path is
  implemented today.
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

`evidence_design_claim_cap` applies after statistical estimation and before any
interpretation. A narrow posterior interval under a weak evidence design cannot
produce a stronger claim than the design allows. Finance assumptions, economic
pathway context, Blueprint promises, or sponsor goals cannot upgrade design
strength. Unsupported designs HOLD.

Claim caps remain internal-only in this Phase 1 contract:

| Evidence design state | Maximum current interpretation |
| --- | --- |
| Unsupported design | HOLD. |
| Baseline-only context | Planning context only; no contribution confidence. |
| Directional or mechanism evidence without valid comparison | Internal directional context only. |
| Valid two-group pre/post DiD contract eligibility with all gates passing | Internal-only comparison-supported contribution-estimate eligibility; no customer-facing confidence/probability, ROI, causality, productivity, or economic output. |
| Future longitudinal, staggered, controlled, or economic contract route | HOLD until a later approved proposal implements and validates that exact route. |

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

Not implemented now:

- Runtime model family.
- Router.
- Hypothesis Measurement Plan schema.
- TypeScript production schema changes.
- Artifact schema changes.
- Longitudinal, state-space, event-study, controlled-test, or economic value
  models.
- Customer-facing confidence, probability, ROI, causality, productivity, or
  finance output.

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
