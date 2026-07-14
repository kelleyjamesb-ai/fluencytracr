# Longitudinal Internal-Dogfood Promotion Decision

Decision date: 2026-07-13

Decision owner: James Kelley

Decision:

```text
CONDITIONAL_PROMOTION_TO_BOUNDED_INTERNAL_DOGFOOD
```

Current effective execution state:

```text
HOLD_PENDING_LONGITUDINAL_DOGFOOD_PREREQUISITES
```

Both statements are required. The first selects one model path for later
bounded contract hardening. The second means no dogfood execution, real-data
admission, runtime routing, or result presentation is authorized today.

## Decision

The accepted longitudinal synthetic proof is sufficient to select one exact
historical state-space model for a future, tightly restricted Glean-internal
dogfood review. It is not sufficient to run that model on Glean-internal data.

Only separate docs/OpenSpec proposals for these prerequisites may proceed under
this decision. Each proposal still requires its own approval before any
implementation:

1. AI Fluency measurement-model calibration.
2. VBD trajectory-model calibration.
3. Governed real-data admission and immutable source binding.
4. Runtime monitoring and fail-closed execution contracts.
5. Restricted readout language and HOLD presentation.
6. A frozen pilot-manifest review that records exact immutable analysis and
   prerequisite bindings without activating execution.
7. A separate explicit human-approved real-data execution decision that binds
   the exact manifest and every passing prerequisite before access,
   preparation, fitting, or artifact emission.

No step may be skipped, inferred, or satisfied by another step. A proposal,
contract, schema, fixture, or manifest cannot self-authorize its implementation
or execution. The sequence does not authorize UI integration; UI remains a
separate later decision.

## Accepted Evidence Binding

The decision is valid only for these committed evidence bytes:

| Binding | Required value |
| --- | --- |
| Full replicated-validation artifact | `inference/evidence/longitudinal_replicated_validation_full_2026_07.json` |
| Full artifact SHA-256 | `2fa64551fa49f1f606ccbea6146622171e12c0b6d8df4f1bb4d2350b48de0490` |
| Full artifact self-hash | `0ce4ff124f82f529739a8c4b19212a03d13b6a8168f48761c12f4a84f75c751f` |
| Acceptance record | `inference/evidence/longitudinal_replicated_validation_acceptance_2026_07.json` |
| Acceptance record SHA-256 | `bb3cff4fd8c852417044a3413905877f4f71f2a7279b4961f32cfd012eb09857` |
| Acceptance record self-hash | `8bcfd788fc1ebf4941bd13ad34036c7c19a0a001651759d46177ab9b710cdf9a` |
| Acceptance decision | `GO` |

The acceptance record itself says:

```text
action=hold_for_separate_measurement_model_and_trajectory_calibration
ai_fluency_measurement_model_calibration_complete=false
vbd_trajectory_model_calibration_complete=false
production_promotion_complete=false
```

This decision preserves those facts. Hash drift or a different acceptance
state returns the pathway to HOLD pending a new independent review.

## Exact Model Path

Only this line is conditionally selected:

```text
evidence_design=HISTORICAL_STATE_SPACE
artifact.model_family=bayesian_ai_value_realization_and_human_transformation_model_family
artifact.model_slice=longitudinal_state_space_replicated_validation
artifact.model_specification.model_kind=gaussian_longitudinal_zero_sum_ar1_state_space
artifact.model_specification.likelihood_family=continuous_normal_identity
artifact.model_specification.link_function=identity
```

`longitudinal_state_space_replicated_validation` is the accepted artifact
`model_slice` under the conceptual model-family component
`first_longitudinal_synthetic_model_slice`. The conceptual component name is
not an alternate artifact `model_slice` value and cannot be used as an alias.

Its validated equation is:

```text
y[c,t] = X[c,t] beta + u[c] + r[c,t] + epsilon[c,t]
r[c,t] = rho r[c,t-1] + eta[c,t]
```

The accepted synthetic validation configuration remains:

- 12 pre-period windows and 6 post-period windows;
- synthetic aggregate panel-group counts of 6 or 12;
- aggregate Measurement Cell `k=16` as replicated synthetic-proof provenance;
- known finite positive synthetic aggregate standard errors;
- pre-period-only standardization;
- zero-sum group effects and bounded AR(1) structure;
- separate lagged Velocity and Breadth terms;
- aggregate baseline AI Fluency context;
- Depth as context only, outside the likelihood;
- accepted state-space/NUTS concordance; and
- passing replicated calibration, null, floor, lag, shock, and negative-control
  synthetic studies.

Those are synthetic proof facts only. They do not establish real-source
clearance, independently passing panel/window gate receipts, immutable real-data
analysis-unit admission, a valid pre-outcome access posture, or a fixed
real-data terminal look. Those remain future prerequisites below.

The `k=16` value records where replicated synthetic calibration was accepted.
This decision does not compile, configure, or authorize it as a dogfood runtime
threshold. A later admission and execution decision must reconcile the exact
aggregate floor with the proved envelope and existing invariants; separate
`k=4,8,12,16` floor controls are not replicated calibration evidence.

The estimand remains `longitudinal_movement`: a direction-adjusted,
associational Velocity/Breadth-outcome contrast in pre-period outcome standard
deviation units, conditional on trend, approved controls, group effects, and
AR(1) structure. It is not raw KPI movement, a historical counterfactual,
AI-attributed impact, or a causal effect.

Not selected:

- `REPEATED_PRE_POST`;
- `comparison_supported_bayesian_did_module`;
- controlled-test or staggered-rollout routes;
- alternate likelihoods or links;
- Fluency measurement, VBD trajectory, hypothesis-outcome, economic, or
  pathway-coherence components as separately executable model families.

## Audience And Purpose

The future bounded dogfood audience is restricted to immutable, non-personal
role refs in one frozen pilot manifest:

- internal model operator;
- statistical methodology reviewer;
- value governance reviewer;
- decision owner.

The manifest must not contain names, emails, user IDs, or other direct
identifiers.

The purpose is to challenge aggregate source admission, model adequacy,
diagnostics, and fail-closed HOLD behavior on approved Glean-internal evidence.
It is not an executive readout, seller tool, customer artifact, product route,
or production capability. Broad internal distribution is not authorized.

## Conjunctive Prerequisites

| Prerequisite | Current state | Required before any dogfood activation |
| --- | --- | --- |
| Accepted longitudinal synthetic proof | `PASS` | Evidence and acceptance hashes above remain exact. |
| AI Fluency measurement-model calibration | `NOT_COMPLETE` | Implemented, executed, and independently accepted without respondent-level export. |
| VBD trajectory-model calibration | `NOT_COMPLETE` | Implemented, executed, and independently accepted for the exact aggregate exposure definitions. |
| Real-data admission and source binding | `NOT_DEFINED` | Separate OpenSpec and contract admit exact Glean-internal aggregate sources, units, uncertainty, lineage, privacy posture, source hashes, access posture, and immutable analysis units. |
| Runtime monitoring and fail-closed behavior | `NOT_DEFINED` | Separate implementation proves pre-fit admission, hard diagnostic HOLD, immutable prepared-input/fit/result bindings, error handling, audit evidence, and no partial release. |
| Readout language and HOLD presentation | `NOT_DEFINED` | Separate decision defines restricted-review fields and language, withheld states, and blocked interpretations. |
| Frozen pilot manifest | `NOT_DEFINED` | Exact units, one canonical tuple per panel group, independent per-window gate receipts, immutable source and analysis bindings, fixed terminal look, hash-bound pre-outcome access receipt, prerequisite hashes, and non-personal role refs are recorded without activating execution. |
| Explicit human real-data execution decision | `NOT_DEFINED` | A separate decision binds the exact frozen manifest and every passing prerequisite before access, preparation, fitting, or artifact emission. |

Every prerequisite is required. Missing, stale, malformed, conflicting,
failed, hash-invalid, off-plan, off-manifest, suppressed, or unreviewed inputs
keep the pathway held. Planning readiness, schema presence, fixture success,
synthetic acceptance, or partial completion cannot substitute for a missing
gate. No threshold configuration, administrative override, or cross-slice
suppression rescue is permitted.

The existing
[Glean Dogfood BigQuery Adapter](../../integrations/glean/dogfood-bq-adapter.md)
is not source-package clearance, Measurement Cell proof, or confidence-model
input admission. Its existing aggregate output cannot satisfy this chain.

The future real-data admission contract must bind one canonical
`(workflow_id, jbtd_id, persona_id)` tuple per panel group; independent
per-window gate receipts; immutable metric, source, cohort, control, exposure,
baseline-Fluency, window, and uncertainty refs/hashes; one fixed terminal look;
and a hash-bound pre-outcome access receipt. Retrospective plans, post-outcome
repair, replacement, or outcome-informed rebinding remain invalid.

## HOLD Behavior

The default and current state is HOLD before data access or fit. A later path
must also HOLD before interpretation when any source, privacy, window, floor,
metric-family, uncertainty, plan-freeze, terminal-look, diagnostic, calibration,
hash, monitoring, reviewer, or language gate fails.

HOLD here is an internal admission/execution posture. It is not a sixth
canonical FluencyTracr suppression reason and does not change the five locked
reasons.

## Blocked Outputs And Actions

This decision does not authorize:

- execution on Glean-internal, real, live, customer, or production data now;
- customer-facing or broad internal output;
- confidence or probability language/output;
- a claim that AI, Glean, AI Fluency, Velocity, or Breadth caused a metric
  change;
- ROI, dollarized value, productivity measurement, finance output, prediction,
  ranking, HR analytics, or score-like output;
- every posterior or derived model-result output, including summaries,
  intervals, coefficients, direction, magnitude, diagnostics-derived claims,
  raw draws, and execution artifacts;
- routes, UI, APIs, schemas, persistence, connectors, exports, or migrations;
- new canonical events, suppression reasons, tunable thresholds, or admin
  overrides;
- DiD work, repeated-pre/post promotion, or another model-family route;
- completion of OpenSpec tasks `5.5` through `5.8`.

The existing contained-fixture Bayesian Promotion Decision Gate does not
satisfy this decision. This decision also does not satisfy the separate future
customer-facing promotion contemplated by the confidence-inference methodology.

## Next Authorized Move

The next bounded modeling PR is the privacy-safe AI Fluency measurement-model
calibration proposal already allowed by its prerequisite contract. A separate
docs/OpenSpec real-data admission and source-binding proposal may also be
drafted only after it reconciles the current synthetic-only admission-validator
sequence. Neither proposal is implementation or execution authority, and
neither may access, prepare, fit, or emit an artifact from real data.
