# Hypothesis And Metric Longitudinal Admission

Status: `ADMISSION_BOUNDARY_DEFINED_NOT_IMPLEMENTED`

Owning model family:
`bayesian_ai_value_realization_and_human_transformation_model_family`

## Purpose

This contract defines how an enterprise portfolio of approved value hypotheses
and company-defined aggregate metrics may be prepared for later review against
the single longitudinal Bayesian model family.

It answers:

```text
What exactly is one analysis unit, and is its selected metric compatible with
the model specification that has actually been proved?
```

It does not execute a model, admit real data, or authorize a report.

## Portfolio And Catalog Grain

An enterprise may maintain multiple hypotheses and a reusable company metric
catalog. The catalog has no arbitrary product-level metric-count cap and does
not require one universal metric taxonomy. Different companies may define
different metrics appropriate to their workflows and outcome systems.

That flexibility applies to planning and registration, not statistical
eligibility. Catalog membership, recommendation, selection, or approval does
not create evidence and does not guarantee that a metric can use the current
longitudinal likelihood.

Metrics may be reused across hypotheses. Reuse does not merge hypotheses,
cohorts, windows, suppression decisions, or results.

The existing Hypothesis-to-Metric Recommendation runner remains limited to its
three current allowlisted fixture libraries. This contract does not expand that
allowlist. Existing metric-library `valid`, customer-metric intake `READY`,
Measurement Plan readiness, and Measurement Cell readiness states remain
planning/data-spine states only and do not establish longitudinal admission.

## Required Metric Definition

Every metric considered for later model review must bind:

- stable `metric_id`;
- immutable `metric_definition_ref` carrying the version and a separate
  `metric_definition_hash` SHA-256 binding;
- metric name and operational definition;
- metric family and link/scale posture;
- measurement unit;
- normalization denominator or exposure basis where applicable;
- approved aggregate grain;
- predeclared direction;
- transformation and revision policy;
- missingness and censoring posture;
- aggregate uncertainty derivation;
- reviewed evidence that the aggregate sampling distribution and standard-error
  derivation match the declared metric family;
- source-system ref, source ref, and source hash;
- non-personal source-owner and metric-owner role refs;
- owner approval, review, and freshness posture;
- `aggregate_only=true` and no person-level or identifying fields.

Each `(metric_id, metric_definition_ref)` must resolve to exactly one
`metric_definition_hash`. Duplicate IDs, conflicting hashes, or two definitions
claiming the same ID/version reject before admission.

The definition and hypothesis plan must be registered, timestamped, and hashed
before any post-baseline outcome access. A source-bound
`outcome_access_receipt` must record `plan_frozen_at`, `attested_at`, its
receipt ref/hash, and the exact attestation
`post_baseline_outcome_accessed_before_freeze=false`. When an earliest
post-baseline outcome-access timestamp is known, it must be later than
`plan_frozen_at`. Missing, unknown, true, stale, hash-invalid, or
chronologically inconsistent posture HOLDS. A later change to unit,
denominator, transformation, direction, source, or family creates a new metric
version; it cannot rewrite an observed result. Retrospective or
outcome-informed registration does not satisfy longitudinal admission and
remains `HOLD` under this contract.

## Immutable Analysis Unit

One longitudinal analysis family binds one hypothesis-plan version and one
primary metric for one frozen decision horizon. Within that family, one
longitudinal analysis unit is:

```text
analysis_family_id
x analysis_unit_id
x hypothesis_id
x hypothesis_plan_hash
x primary_metric_id
x metric_definition_ref
x metric_definition_hash
x ordered_panel_group_manifest_and_hash
  (one exact canonical slice tuple, cohort hash, ordered windows,
   per-window gate-receipt hashes, and per-window aggregate k)
x window_plan_and_hash
x expected_outcome_signal_lag_windows
x expected_metric_direction
x evidence_design
x predeclared_evidence_design_claim_cap
x model_slice_and_model_specification_hash
x approved_control_set_hash
x velocity_and_breadth_definition_source_hashes
x depth_context_binding_hash
x baseline_fluency_snapshot_refs_and_source_hashes
x baseline_fluency_definition_source_hash
x predeclared_evidence_dependency_keys
x predeclared_fit_key
x plan_freeze_timestamp_and_outcome_access_receipt_hash
x fixed_analysis_cutoff_and_terminal_look_id
```

The canonical body above produces an immutable `analysis_unit_hash`. Changing
any bound field creates a new off-plan unit and leaves the original unit
reportable as its result or `HOLD`.

Each unit has exactly one primary metric, and one hypothesis-plan version may
bind only that primary metric for its frozen decision horizon. Additional
primary outcomes require a separately preregistered analysis family and cannot
be counted as independent confirmation of the first.

Supporting metrics are mechanism evidence. Guardrail metrics test quality,
risk, or unintended consequences. They must not replace the primary metric,
enter its likelihood without a separately approved specification, or be
combined into one composite. Primary, supporting, and guardrail metric sets
must be internally unique and mutually disjoint.

Shared evidence and shared fits have different dependency identities:

- each predeclared `evidence_dependency_key` is the SHA-256 of its planned
  source-commitment hash, metric-definition hash,
  panel-group/canonical-slice binding, windows, and cutoff; reused source
  commitments must share that key even when they feed different fits; and
- the predeclared `fit_key` is the SHA-256 of the model-specification hash and
  every planned statistical-input binding, including metric, panel manifest,
  windows, lag, direction, baseline-Fluency, Velocity/Breadth, controls,
  cutoff, and terminal look.

Both key sets are part of `analysis_unit_hash`. The future outcome values are
not in either predeclared key. A completed result must bind its actual source
evidence content hashes inside the exact `prepared_input_hash`, then bind that
hash and `fit_summary_hash` through
`fit_result_binding_hash = sha256(fit_key, model_specification_hash,
prepared_input_hash, fit_summary_hash)`. The same prepared input and model
specification cannot appear under different fit keys, and repeated evidence,
source-content, prepared-input, or fit-summary hashes cannot count as
independent replication or corroboration. A pre-fit HOLD keeps the predeclared
keys and uses explicit null prepared/fit hash slots with its HOLD reason; it
cannot disappear from the manifest.

Approved controls must be frozen and source/hash bound before post-baseline
outcome access. Post-treatment controls, colliders, or controls selected after
observing results are prohibited.

Each panel group in the ordered manifest must map one-to-one to exactly one
canonical `(workflow_id, jbtd_id, persona_id)` tuple. Every window in that
group must independently carry a source-bound receipt showing that existing
compiled suppression and cohort gates cleared. No panel group may combine
canonical tuples, and no tuple may use another group's volume to clear a gate.
The fixed state-space model may jointly fit and partially pool only the 6 or 12
independently cleared aggregate panel groups inside the accepted synthetic
envelope; it never pools raw events or overrides a per-slice HOLD. Suppressed
slices contribute nothing. No current runtime object carries this complete
manifest, receipt, and unit binding, so current planning/readiness objects
remain non-admissive.

## Current Model Eligibility

The accepted longitudinal synthetic proof covers exactly:

- `primary_metric_family=continuous_normal_identity`;
- finite aggregate observations;
- finite, known, positive aggregate standard errors;
- balanced, contiguous, ordered panel windows;
- sufficient pre/post history under compiled rules;
- predeclared expected direction and lag;
- approved aggregate controls;
- baseline aggregate AI Fluency context;
- separate lagged Velocity and Breadth exposures;
- Depth as context outside the likelihood;
- every existing structural, diagnostic, source/hash, concordance,
  calibration, null, floor, lag, shock, and negative-control gate.

The replicated calibration envelope used 12 pre windows, 6 post windows,
panel-group counts of 6 or 12, and aggregate `k=16`. Floor controls separately
proved fail-closed behavior at `k=4,8,12,16`; they did not broaden the
replicated calibration grid. A metric or panel shape outside the accepted
envelope is not covered merely because the implementation can fit it and must
HOLD pending separate synthetic validation.

This is model-validation eligibility, not real-data or production eligibility.

Open metric intake does not authorize automatic likelihood selection. Counts,
unsupported rates or proportions, bounded or ordinal scores, time-to-event
metrics, zero-inflated outcomes, financial translations, unknown families, and
metrics without known positive aggregate uncertainty remain `HOLD` until a
separate proposal implements and validates that exact likelihood.

The exact family token is `continuous_normal_identity`; no alias is accepted.
The system must not infer a likelihood from a metric name or unit, transform a
metric after observing results, or force an unsupported metric through the
normal model. Every observation in one unit must bind the same metric ID,
definition ref/hash, unit, denominator or exposure basis, transformation, and
positive standard-error derivation.

## Evidence Roles

| Evidence | Role in the proved specification |
| --- | --- |
| Primary company metric | Business-outcome estimand. |
| Supporting metrics | Mechanism context only. |
| Guardrail metrics | May cap or block interpretation; cannot strengthen it. |
| Baseline AI Fluency | Aggregate readiness/capability context. |
| Retest AI Fluency | Co-evidence for later pathway review, not a same-window causal driver. |
| Velocity | Separate lagged behavioral exposure. |
| Breadth | Separate lagged behavioral exposure. |
| Depth | Aggregate pathway context outside the proved likelihood. |
| Finance pathway | Owner-reviewed context only; never a prior or claim upgrade. |
| Approved controls | Predeclared aggregate controls only; post-treatment controls and colliders are prohibited. |

These roles remain separate even when they move in the same direction.
Directional coherence is not causal attribution.

## Portfolio Accountability

The accepted `4.5%` null false-signal result applies to each of the two fixed
null cells in the synthetic validation plan. It is not a multi-hypothesis,
multi-metric, or enterprise-wide false-claim guarantee.

Any future portfolio runner must:

- assign every unit to a predeclared `analysis_family_id`;
- freeze, timestamp, and hash a complete planned-unit manifest before any
  post-baseline outcome access;
- predeclare hypotheses, primary metrics, directions, lags, windows, and
  evidence designs;
- declare reused metric definitions, shared cohorts, overlapping windows,
  `evidence_dependency_key` values, and shared `fit_key` dependencies;
- require exact set equality between planned units and stable ordered results;
- retain every unavailable or invalid planned unit as an explicit hash-bound
  HOLD record;
- reject missing, duplicate, off-plan, selectively omitted, or post-outcome
  edited units;
- permit exactly one fixed-horizon terminal look until a separate sequential or
  always-valid procedure is implemented and validated; and
- avoid any cross-hypothesis probability, confidence rating, ranking,
  composite index, or enterprise attribution rollup.

No current portfolio-wide multiplicity procedure is implemented or authorized.
Portfolio inference remains HOLD regardless of how many individual units look
aligned.

## Observed Movement, Model Contrast, And Attribution

Four concepts must remain separate:

`selected_metric_movement`

- Existing customer-owned descriptive baseline/comparison metric context in its
  original unit.
- Not a posterior quantity and not an attribution result.

`longitudinal_movement`

- Existing implementation quantity name for a direction-adjusted associational
  Velocity/Breadth-outcome contrast.
- Expressed in pre-period outcome standard-deviation units and conditional on
  the historical trend, approved controls, group effects, and AR(1) structure.
- Not a raw KPI delta, original-unit movement, counterfactual impact, or AI
  attribution estimate.

`outcome_movement_state`

- Existing reporting state for descriptive aggregate movement refs.
- Cannot be populated or upgraded from an internal posterior quantity by this
  contract.

`evidence_design_claim_cap`

- Existing categorical governance cap derived from the approved evidence
  design, then frozen and hash bound before outcome access.
- Diagnostics, confounding, adverse/missing guardrails, and governance review
  may only lower the cap or HOLD interpretation after estimation.
- Cannot be upgraded by precision, multiple aligned metrics, AI Fluency,
  telemetry, finance context, targets, or sponsor intent.
- Never becomes a probability or confidence percentage.

A claim cap cannot rescue a held estimate. Supporting metrics never strengthen
it, and missing or adverse guardrails may only cap or HOLD interpretation.

The current longitudinal specification may support internal noncausal
contribution-alignment review only. Numeric `ai_attribution_confidence`,
probability that AI caused a result, and customer-facing confidence remain
blocked.

## Fail-Closed Conditions

Admission remains `HOLD` when any required binding is missing, stale,
suppressed, unsafe, changed after outcome review, or incompatible with the
proved specification, including:

- unapproved hypothesis or metric definition;
- missing/duplicate/off-plan analysis unit;
- missing or drifted `analysis_family_id`, analysis-unit hash, hypothesis-plan
  hash, model-specification hash, control-set hash, exposure/source hashes,
  ordered panel manifest, canonical slice receipts, baseline-Fluency
  snapshot/definition hashes, dependency keys, fixed cutoff, or terminal-look
  identity;
- missing, unknown, true, stale, hash-invalid, or chronologically inconsistent
  pre-outcome access attestation;
- unknown or unsupported metric family;
- missing unit, denominator/exposure basis, transformation, aggregate grain,
  missingness, censoring, or revision posture;
- missing or nonpositive aggregate uncertainty;
- mixed metric versions within one unit;
- metric ID/version pairs resolving to conflicting hashes;
- primary, supporting, and guardrail metric sets that overlap or contain
  duplicates;
- observations with mixed units, denominators, transformations, or uncertainty
  derivations;
- changed direction, lag, windows, cohort, or evidence design after outcome
  review;
- incomplete, imputed, stale, suppressed, or misordered required windows;
- a canonical slice/window without an independent passing suppression/cohort
  gate receipt, or a panel group containing more than one canonical tuple;
- any interim, repeated, or post-hoc look beyond the one frozen terminal look;
- a post-treatment/collider control or post-outcome control selection;
- supporting or guardrail metric substituted for the primary metric;
- cross-hypothesis pooling, raw cross-slice aggregation, or partial pooling
  outside the exact independently cleared panel manifest;
- missing, inconsistent, or falsely independent evidence/fit dependency keys,
  or a completed fit without valid prepared-input, fit-summary, and fit-result
  binding hashes;
- omitted unfavorable, null, failed, or held planned units;
- manifest/result set inequality or a missing explicit HOLD record;
- real/customer/live/production data flags;
- person-level, identifying, HR, manager, productivity, prompt, transcript,
  query, or raw-row content; or
- any output, promotion, causal, confidence, probability, ROI, finance, or
  customer authorization flag set true.

These HOLD conditions are internal admission/review states. They do not add to
or alter FluencyTracr's five canonical suppression reasons.

## Non-Authorization

This contract does not authorize:

- a runtime metric registry or production schema;
- a model-family router;
- model fitting or likelihood selection;
- real-data admission or connector execution;
- persistence, routes, UI, exports, or migrations;
- a hypothesis-level or enterprise report;
- customer-facing confidence or probability;
- AI attribution, causality, ROI, productivity, finance, or economic output;
- individual scoring, HR analytics, or ranking;
- model promotion;
- a new canonical event or suppression reason;
- tunable thresholds or admin overrides; or
- completion of AI Fluency measurement-model calibration, VBD trajectory
  calibration, or unfinished DiD work.

## Allowed Next Step

After independent acceptance, a separate exact-scope proposal may implement a
synthetic-only admission validator and immutable planned-unit manifest for the
current supported metric family. It must not admit real data, execute the
model, emit posterior/customer output, or create production schemas, routes,
persistence, exports, connectors, or UI.
