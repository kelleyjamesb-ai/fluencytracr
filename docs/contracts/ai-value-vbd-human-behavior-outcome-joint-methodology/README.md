# VBD Human-Behavior And Outcome Joint Methodology

Contract status: `SYNTHETIC_V4_REPLICATED_VALIDATION_PROTOCOL_FROZEN`

Methodology direction approval:
`APPROVED_BY_JAMES_KELLEY_2026_08_11_FOR_STEPS_1_THROUGH_4_ONLY`

Synthetic implementation authorization:
`APPROVED_BY_JAMES_KELLEY_2026_08_11_FOR_STEPS_5_THROUGH_8`

OpenSpec change:
`add-vbd-human-behavior-outcome-joint-methodology`

Implementation OpenSpec change:
`implement-vbd-human-behavior-outcome-synthetic-proof`

Current decision:
`HOLD_FOR_MODEL_REPAIR`

Replicated validation protocol:
[`REPLICATED_VALIDATION_PROTOCOL.md`](REPLICATED_VALIDATION_PROTOCOL.md)

The replicated protocol is frozen before implementation or execution. It
defines 400 synthetic datasets, 600 qualifying fits, two nonqualifying
preflight stages, exact seed namespaces, all-must-pass gates, runtime bounds,
and sanitized ensemble output. Its status grants no sampler, real-data,
product, or customer-output authority by itself.

## Purpose

This contract defines how a future FluencyTracr model may evaluate whether
observed aggregate AI-enabled work adds information about movement in a
customer-owned outcome while accounting separately for what the cohort reports
about its AI capability.

It formalizes three evidence lanes:

1. **Stated capability:** what an approved aggregate cohort reports about its
   AI capability, confidence, and working conditions.
2. **Observed behavior:** what admitted aggregate evidence shows about active,
   repeated, and embedded AI-enabled work.
3. **Customer outcome:** how one predeclared customer-owned metric changes for
   the same analytical unit and period.

The lanes remain distinct evidence. A future joint Bayesian model may connect
them through separately specified measurement and outcome components. It must
not average them into a score or treat them as interchangeable.

## Approved Analytical Question

For one predeclared aggregate cohort, workflow-family universe, and measurement
horizon:

> How did the customer-owned outcome move, how was that movement associated
> with the observed AI-enabled work trajectory, and did stated capability
> qualify that relationship?

Under the default evidence-design claim cap, this is an associational and
predictive question. It is not the causal question, "How much of the outcome
change was caused by AI?"

## Evidence Roles

| Evidence | Model role | Prohibited substitution |
| --- | --- | --- |
| Customer-owned primary metric | Principal outcome estimand | It cannot be replaced by time saved, usage, VBD, or a scenario value. |
| VBD family-state evidence | Observed human-behavior pathway | It cannot be replaced by the legacy weighted VBD score, Velocity Index, or frequency, engagement, and Breadth trajectory output. |
| Aggregate stated capability | Measurement-error-aware context and optional moderator | It cannot be treated as observed behavior or selected after outcome access. |
| Supporting metrics | Mechanism context | They cannot replace or be averaged into the primary metric. |
| Guardrail metrics | Interpretation cap or HOLD input | They cannot strengthen a claim. |
| Approved controls | Predeclared aggregate adjustment terms | Post-treatment variables, colliders, person-level data, and outcome-selected controls are prohibited. |
| Depth Repertoire | Caveat or context only under current governance | It cannot change the likelihood, estimate, eligibility, confidence, or outcome number. |

## Governance Reconciliation

This methodology preserves the repository's nine invariants.

| Constraint | Methodology effect |
| --- | --- |
| Nine canonical events remain locked | The family-state package is a docs-only derived aggregate proposal. It adds no event. |
| Five suppression reasons remain locked | Admission reuses existing independent slice gates. Contract HOLD conditions are not new canonical suppression reasons. |
| No tunable thresholds | Future priors, validation limits, and eligibility rules require compiled, versioned approval. No operator or admin threshold is created here. |
| Default is SUPPRESS | Missing, stale, misaligned, incomparable, or unsafe evidence never becomes zero and never enters a fit. |
| No individual scoring | The contract permits only aggregate counts, aggregate capability summaries, aggregate outcomes, and opaque source bindings. |
| Independent slice suppression | Every contributing `(workflow_id, jbtd_id, persona_id)` slice must clear independently. Cross-slice volume cannot rescue a held slice. |
| Latency remains corroborative | Latency is not a family-state or outcome surfacing trigger. |
| Function drilldowns remain held | No function, department, manager, or other organizational drilldown is authorized. |
| Legacy VBD remains versioned research | Its likelihood and estimands are not aliases for this methodology. |

Family-to-canonical-slice allocation, complementary differencing prevention,
and derived-scope admission remain blocking design problems for implementation.
This document states the proof a future producer must supply. It does not claim
that proof exists.

## Immutable Analysis Unit

One joint analysis unit is:

```text
analysis_family_id
x hypothesis_id and frozen hypothesis_plan_hash
x organization_ref
x approved aggregate cohort_ref and cohort_hash
x workflow_family_registry_ref and registry_hash
x canonical_slice_manifest_root
x ordered checkpoint_plan_hash
x stated_capability_definition_ref and hash
x primary_metric_definition_ref and hash
x outcome family, unit, direction, and owner role
x evidence_design and predeclared_claim_cap
x behavior, capability, and outcome lags
x intervention and comparator design refs
x approved control_set_hash
x behavior_model_specification_hash
x capability_model_specification_hash
x outcome_model_specification_hash
x frozen full_and_restricted_model_comparison_hash
x plan_freeze_timestamp
x outcome_access_receipt_hash
x fixed terminal look
```

Every element must be frozen before any post-baseline outcome access. Changing
an element creates a new off-plan analysis unit. It cannot rewrite, repair, or
rescue the prior unit.

## Aggregate Data Contract

This is a documentation contract, not a runtime schema. Field names describe
the minimum conceptual record. A future schema must be separately proposed,
reviewed, and tested.

### Analysis plan record

| Field group | Required binding |
| --- | --- |
| Identity | `analysis_unit_id`, `analysis_family_id`, `hypothesis_id`, and content hashes for the complete frozen plan. |
| Aggregate scope | Opaque organization reference, approved cohort reference and hash, workflow-family registry reference and hash, and canonical-slice manifest root. |
| Time | Ordered checkpoint IDs, half-open window bounds, cadence, intervention timing, comparator windows, lags, and fixed terminal look. |
| Outcome | One primary metric ID, versioned definition, family, unit, expected direction, non-personal owner role, source reference, and source hash. |
| Evidence design | Approved design token, comparator definition, claim cap, and design-router version. |
| Models | Separate behavior, capability, outcome, and full-versus-restricted comparison specification refs and hashes. |
| Freeze | Plan-freeze timestamp and source-bound receipt proving no post-baseline outcome was accessed before freeze. |

### VBD checkpoint record

Each record represents one approved aggregate scope and one finalized
checkpoint.

| Field | Requirement |
| --- | --- |
| `checkpoint_id`, `checkpoint_revision`, `record_hash` | Immutable identity and append-only correction chain. |
| `window_start`, `window_end`, `cadence_policy_ref` | Exact half-open period and frozen cadence. |
| `registry_ref`, `registry_hash`, `eligible_family_count` | Prospectively frozen Eligible universe; the count must be greater than zero. |
| `qualifying_activity_policy_ref`, `semantic_policy_hash` | Exact rule for Active qualification. |
| `recurrence_policy_ref`, `recurrence_horizon` | Exact rule and contiguous-window horizon for Embedded qualification. |
| `observable_source_universe_ref`, `source_coverage_receipt_hash` | Source adapters, revisions, governed surfaces, mappings, completeness, and window coverage. |
| `active_family_count` | Count of Eligible families with qualifying activity in the checkpoint. |
| `embedded_family_count` | Count of the same frozen families that satisfy the recurrence rule. |
| `canonical_slice_gate_receipt_root` | Proof that every contributing canonical slice cleared independently. |
| `derived_scope_admission_receipt_hash` | Future proof against suppressed-slice rescue, duplicate allocation, and complementary differencing. |
| `finalized_at`, `evidence_cutoff_at` | Finality and source cutoff. |
| `aggregate_only`, `person_level_data_present`, `raw_rows_present` | Must be `true`, `false`, and `false`, respectively. |

The checkpoint must satisfy:

```text
0 <= Embedded <= Active <= Eligible
Eligible > 0
```

If `Eligible = 0`, Adoption Reach, Coverage, and every dependent transition
velocity are unavailable. Implementations must not coerce an undefined ratio
to zero.

### VBD transition record

Each adjacent transition binds exactly two admitted checkpoint hashes and the
same frozen family universe.

| Field | Requirement |
| --- | --- |
| `previous_checkpoint_hash`, `current_checkpoint_hash` | Exact endpoint evidence. |
| `retained_embedded_count` | Embedded in both checkpoints. |
| `newly_embedded_count` | Nonembedded previously and Embedded currently. |
| `lapsed_embedded_count` | Embedded previously and nonembedded currently. |
| `remaining_nonembedded_count` | Nonembedded in both checkpoints. |
| `transition_intersection_receipt_hash` | Authenticated aggregate derivation from the same family identities without emitting those identities. |
| `transition_hash` | Hash of endpoints, counts, policies, source coverage, and derivation receipt. |

The transition must satisfy:

```text
Retained + Lapsed = Embedded_previous
Retained + Newly  = Embedded_current
Retained + Lapsed + Newly + RemainingNonembedded = Eligible
Net Embedded Change = Newly - Lapsed
```

Counts that merely happen to satisfy the equations are insufficient. The
intersection receipt is required.

### Stated-capability record

| Field | Requirement |
| --- | --- |
| `capability_snapshot_id`, `definition_ref`, `definition_hash` | Versioned aggregate measurement identity. |
| `cohort_ref`, `cohort_hash`, `window_ref` | Exact analytical cohort and temporally ordered measurement window. |
| `predeclared_factor_id` | One factor or dimension selected before outcome access. |
| `aggregate_estimate` | Aggregate factor estimate from the admitted measurement model. |
| `aggregate_standard_error` or `aggregate_covariance` | Measurement uncertainty aligned to the selected factor set. |
| `measurement_model_ref`, `measurement_model_hash` | Source-bound calibration and scoring definition. |
| `aggregate_only`, `person_level_data_present` | Must be `true` and `false`. |

If multiple capability dimensions enter one future model, their joint
covariance is required. Marginal standard errors must not be treated as joint
independence. Missing uncertainty HOLDS the joint analysis.

### Outcome record

| Field | Requirement |
| --- | --- |
| `metric_id`, `metric_definition_ref`, `metric_definition_hash` | Exact customer-owned primary metric identity. |
| `metric_family`, `unit`, `expected_direction` | Frozen likelihood family and interpretation. |
| `cohort_ref`, `cohort_hash`, `workflow_family_registry_hash` | Exact analytical scope. |
| `window_ref`, `window_start`, `window_end`, `revision` | Exact aligned observation window and revision. |
| `aggregate_value` | Aggregate outcome observation. |
| `known_aggregate_standard_error` or family-specific sufficient statistics | Measurement uncertainty required by the approved likelihood. |
| `source_ref`, `source_hash`, `owner_role_ref` | Governed source and non-personal accountability. |
| `comparison_receipt_hash` | Exact-slice baseline and comparison admission when the design requires it. |

The current proved longitudinal family remains only
`continuous_normal_identity` with finite aggregate values and known positive
aggregate standard errors. Other likelihood families remain unsupported until
separately proposed and validated.

### Control record

Every control must bind a safe aggregate name, source reference and hash,
window, value, uncertainty where required, and a predeclared causal role. The
plan must explain why the control precedes the modeled outcome and is not a
mediator, collider, person-level attribute, workforce-performance variable, or
outcome-selected adjustment.

## Cross-Lane Alignment Receipt

The joint model requires one receipt that binds exact set equality across the
three lanes for:

- organization and approved aggregate cohort;
- workflow-family registry and canonical-slice manifest;
- checkpoint schedule, window bounds, finality, and revisions;
- intervention exposure and comparator definitions;
- behavior, capability, and outcome lags;
- primary metric definition, unit, owner, and source revision;
- eligibility and observable source universes;
- evidence-package hashes and gate receipts; and
- plan-freeze and outcome-access receipts.

A broader capability cohort cannot be rescaled into a narrower outcome cohort.
It may remain report context, but it cannot enter the joint likelihood. Any
scope, mapping, timing, revision, source-coverage, or finality mismatch HOLDS
the joint analysis and leaves the lanes separately reportable if their own
contracts clear.

## Joint Bayesian Methodology

The model has three connected components. Connection does not collapse their
evidence roles.

### 1. Aggregate family-state component

For aggregate panel `c` and checkpoint `t`, define:

```text
E_c,t = Eligible family count
A_c,t = Active family count
M_c,t = Embedded family count
R_c,t = retained Embedded count from t-1 to t
N_c,t = newly Embedded count from t-1 to t
L_c,t = lapsed Embedded count from t-1 to t
U_c,t = remaining nonembedded count from t-1 to t
```

Stable eligibility requires `E_c,t = E_c` for the compared trajectory. The
transition factorization is:

```text
R_c,t | M_c,t-1 ~ Binomial(M_c,t-1, retention_c,t)
N_c,t | E_c - M_c,t-1 ~ Binomial(E_c - M_c,t-1, embedding_c,t)

L_c,t = M_c,t-1 - R_c,t
U_c,t = E_c - M_c,t-1 - N_c,t
M_c,t = R_c,t + N_c,t
```

Among families that are not Embedded in the current checkpoint:

```text
A_c,t - M_c,t ~ Binomial(E_c - M_c,t, active_nonembedded_c,t)
```

Logit retention, new embedding, and active-nonembedded rates use a future
predeclared hierarchical time-series specification with aggregate panel effects
and temporal structure. When the frozen plan binds a capability snapshot that
precedes the transition, each rate may include a separately predeclared lagged
capability term. That term estimates whether stated capability is associated
with later behavior transition probabilities. Its measurement uncertainty must
propagate into the family-state component.

Priors and numerical settings are not approved here. They require a separate
frozen synthetic design and validation plan.

The uncertain latent behavior basis passed to the outcome component is:

```text
embedded_state_c,t
active_nonembedded_state_c,t
```

Retention, new embedding, and lapse counts inform those states. They are not
also added as independent outcome predictors. Adoption Reach, Persistence,
Coverage, and Net Coverage Velocity remain deterministic product summaries of
the admitted counts, not additional likelihood terms.

For decimal Coverage values, the normalized velocity unit is defined exactly
as:

```text
Net Coverage Velocity (pp/30d) =
  (Coverage_current - Coverage_previous)
  x 100
  x (30 / actual_days_between_checkpoints)
```

### 2. Stated-capability measurement component

For one predeclared aggregate factor:

```text
capability_observed_c,t ~ Normal(capability_latent_c,t,
                                 capability_standard_error_c,t)
```

A multivariate capability term requires the admitted joint covariance. The
capability factor may enter as baseline context, a temporally ordered predictor,
or a moderator of the behavior association only when that role and lag were
frozen before outcome access.

The model must not create a perception-versus-behavior score. Perception and
behavior remain separate terms. Their interaction may be estimated only when
predeclared.

### 3. Outcome component

For the currently supported continuous-normal aggregate family:

```text
outcome_observed_c,t ~ Normal(outcome_mean_c,t,
                              sqrt(known_outcome_se_c,t^2
                                   + residual_scale^2))

outcome_mean_c,t =
    panel_intercept_c
  + predeclared_time_structure_t
  + approved_controls_c,t * control_coefficients
  + behavior_embedded_coefficient
      * embedded_state_c,t-lag_embedded
  + behavior_active_coefficient
      * active_nonembedded_state_c,t-lag_active
  + capability_coefficient
      * capability_latent_c,t-lag_capability
  + capability_behavior_coefficient
      * capability_latent_c,t-lag_capability
      * embedded_state_c,t-lag_embedded
  + predeclared_residual_time_structure_c,t
```

The active-nonembedded term and the capability interaction may be excluded only
by the frozen plan, not after outcome inspection. Unsupported metric families,
lags, time structures, control roles, comparison designs, or panel shapes HOLD.

Because behavior and capability may be post-intervention variables, the default
joint model is not a total-effect model. A future causal or mediation model
would require its own identification assumptions, estimand, design router,
synthetic validation, and explicit human approval.

## Full-Versus-Restricted Model Comparison

To address whether observed behavior adds useful information, the plan freezes:

- one full model containing the approved behavior terms;
- one restricted companion model without those behavior terms;
- the same outcome likelihood, rows, windows, controls, time structure, and
  shared-parameter priors in both models;
- one future-window prediction scheme that never trains on the evaluated
  future window; and
- internal Bayesian R-squared and predictive-fit summaries.

The internal behavior contribution diagnostic may report the posterior
difference in Bayesian R-squared and future-window predictive fit between the
two frozen models. It must not be labeled as percent of variance caused by AI,
percent of outcome impact, financial attribution, or proof of why the metric
changed. A result may be small, negative, or uncertain and must never be
selectively omitted.

## Internal Estimands

| Estimand | Meaning | Claim ceiling |
| --- | --- | --- |
| `selected_metric_movement` | Customer-owned baseline to comparison movement in the metric's unit. | Descriptive movement only. |
| `embedded_behavior_movement` | Change in the posterior embedded-state trajectory over the frozen horizon. | Aggregate behavior movement only. |
| `capability_associated_behavior_transition` | Association between a temporally prior stated-capability factor and later retention, new embedding, or active-nonembedded behavior. | Internal association, not a causal capability effect. |
| `behavior_associated_outcome_contrast` | Difference in expected outcome between two predeclared behavior states, conditional on the fitted model. | Internal association, not causal impact. |
| `capability_behavior_moderation` | Difference in the behavior association across predeclared capability states. | Internal moderation context, not person-level or causal evidence. |
| `behavior_incremental_predictive_contribution` | Full-versus-restricted difference in frozen predictive summaries. | Internal predictive relevance, not variance caused or ROI. |
| `design_supported_effect` | A future effect estimand under a separately approved identification design. | HOLD under this contract. |

All posterior quantities, latent paths, draws, model comparisons, and
diagnostics remain internal. No customer-facing probability or confidence
percentage is authorized.

## Claim Ceiling

Without a separately approved causal identification design, allowed internal
language is bounded to:

> The customer-owned metric moved by X over the approved period. The aggregate
> AI-enabled work trajectory was associated with the modeled outcome trajectory,
> with the stated strength, uncertainty, limitations, and predictive relevance.

This contract does not authorize:

> AI usage caused X change in Y.

It also does not authorize "X percent of the change was due to human behavior"
or "AI explained X percent of business impact." A later contract may permit a
stronger statement only when the evidence design identifies that exact
estimand and all governance, calibration, and claim-review gates clear.

## HOLD Conditions

The joint analysis remains unavailable when any required element is missing,
held, stale, suppressed, misaligned, unverifiable, or off plan, including:

- an independently held contributing canonical slice;
- unresolved family allocation or complementary differencing risk;
- changing eligibility, source coverage, mappings, cadence, or semantic policy;
- incomplete transition intersections or invalid count identities;
- a broader or differently defined capability cohort;
- missing capability or outcome uncertainty;
- an unsupported outcome likelihood or panel shape;
- outcome-informed factor, lag, interaction, control, or model selection;
- algebraically dependent behavior predictors;
- missing plan freeze or outcome-access proof;
- post-treatment controls or colliders;
- missing full-versus-restricted results;
- any attempt to create customer-facing probability, attribution, causality,
  productivity, ROI, ranking, or economic output.

These are contract admission states. They do not add canonical suppression
reasons.

## Non-Authorization

Steps 1 through 4 authorize documentation only. This contract creates no:

- runtime schema, endpoint, service, UI, persistence, export, or connector;
- model implementation, fit, sampler launch, posterior artifact, or evidence;
- synthetic or real-data execution;
- canonical event or suppression reason;
- function, team, department, manager, or person-level output;
- customer-facing confidence, probability, impact percentage, causal claim,
  productivity claim, ROI, or financial attribution;
- permission to use Depth Repertoire as a model input; or
- permission to migrate or relabel the legacy VBD trajectory implementation.

## Next Authorization Gate

James Kelley approved proceeding with steps 5 through 8 on 2026-08-11, bounded
to aggregate-only synthetic implementation, synthetic model validation, and a
governed integration decision. The exact proposed scope is recorded in
`implement-vbd-human-behavior-outcome-synthetic-proof`.

That proposal resolved the first implementation boundary by requiring one
exact canonical slice per synthetic panel, a disjoint family registry per
slice, no cross-slice derived metric, and no per-slice model output. Code and
model execution were admitted only for that synthetic scope by the matching
high-risk item in `.project/WORK_QUEUE.json`.

The nonqualifying V1 smoke matrix and integration decision are recorded in
[`docs/research/VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_DECISION.md`](../../research/VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_DECISION.md).
Independent review changed the decision to `HOLD_FOR_MODEL_REPAIR`. The V2
repair is frozen in the implementation design before any replacement sampler
run. V2 structural verification, smoke validation, and fresh independent
review remain incomplete. Real data, runtime integration, and customer output
remain unauthorized.
