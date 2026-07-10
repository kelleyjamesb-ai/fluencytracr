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

## Model-Family Decision

The governed architecture is:

```text
bayesian_ai_value_and_behavioral_evidence_model_family
```

This is an architecture family, not a set of implemented runtime modules. It
may later contain these conceptual components:

| Component | Role | Runtime status |
| --- | --- | --- |
| `bayesian_fluency_measurement_model` | Models aggregate AI Fluency movement and measurement uncertainty. | Not implemented. |
| `bayesian_vbd_behavioral_trajectory_model` | Models Velocity, Breadth, and Depth movement over time at approved aggregate cells. | Not implemented. |
| `bayesian_hypothesis_outcome_model` | Models customer-owned primary metric movement for approved hypotheses. | Not implemented. |
| `bayesian_economic_value_model` | Reviews finance-pathway assumptions after outcome evidence exists. It must not emit ROI proof or customer-facing economic output. | Not implemented. |
| `posterior_pathway_coherence_review` | Reviews whether fluency, behavior, outcome, and finance assumptions tell a coherent bounded story. | Not implemented. |
| `evidence_design_claim_cap` | Caps model interpretation by evidence design strength and governance clearance. | Not implemented. |
| `enterprise_hypothesis_portfolio` | Tracks multiple approved hypotheses without blending them into one arbitrary enterprise index. | Not implemented. |

The current implemented module is:

```text
comparison_supported_bayesian_did_module
```

It may be used only when the evidence design and comparison adequacy gates
support a two-group pre/post comparison. It must not be used to claim support
for staggered rollout.

## Evidence-Design Vocabulary

The model family uses this additive evidence-design vocabulary:

| Evidence design | Required interpretation |
| --- | --- |
| `CONTROLLED_TEST` | Future controlled-test models may route here after approved design, diagnostics, and validation. The current DiD module may be relevant only if the data reduce to a valid two-group pre/post contrast. |
| `TWO_GROUP_PRE_POST_COMPARISON` | May route to `comparison_supported_bayesian_did_module` when comparison adequacy, windows, floors, diagnostics, and calibration gates pass. |
| `STAGGERED_ROLLOUT` | Must HOLD as unsupported by the current DiD implementation until true event-time, calendar-time, and not-yet-treated logic exists and is calibrated. |
| `MATCHED_COMPARISON` | May route to DiD only when the matched comparison truly satisfies two-group pre/post assumptions and all comparison adequacy gates pass. Otherwise HOLD or route to a future model. |
| `HISTORICAL_STATE_SPACE` | Requires a future longitudinal state-space model. The current DiD module must not claim support. |
| `REPEATED_PRE_POST` | Requires a future longitudinal repeated-window model. The current fixed-horizon one-look DiD proof does not authorize it. |
| `BASELINE_ONLY` | Must not produce contribution confidence. Baseline-only evidence can support planning context only. |

Routing must fail closed. Unsupported designs HOLD rather than being forced
through the current DiD module.

## Hypothesis Measurement Plan

The governing input concept for future model-family routing is a Hypothesis
Measurement Plan. It is conceptual in this task and does not create a schema.

Required conceptual fields:

- `hypothesis_id`
- `hypothesis_statement`
- `function_area`
- `workflow_family`
- `cohort_scope`
- `value_route`
- `expected_work_change`
- `expected_metric_direction`
- `expected_behavior_signal_lag`
- `expected_outcome_signal_lag`
- `primary_metric_id`
- `primary_metric_family`
- `supporting_metric_ids`
- `guardrail_metric_ids`
- `relevant_fluency_dimensions`
- `expected_vbd_signature`
- `baseline_window`
- `observation_schedule`
- `source_system_ref`
- `metric_owner_ref`
- `business_owner_ref`
- `minimum_worthwhile_change`
- `known_confounders`
- `evidence_design`
- `finance_pathway_ref`
- `approval_state`

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
- No causal claims without an approved design.
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
