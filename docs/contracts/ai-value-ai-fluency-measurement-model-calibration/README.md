# AI Fluency Measurement-Model Calibration

Contract status: `SYNTHETIC_CALIBRATION_ACCEPTED_REAL_DATA_PENDING`

Owning model-family component:
`bayesian_fluency_measurement_model`

## Purpose

This contract defines the calibration gate for future aggregate AI Fluency
measurement modeling inside the Bayesian AI Value Realization And Human
Transformation model family.

The current implementation is an internal synthetic proof boundary only. It
does not authorize a real-data measurement model, respondent scores, customer
posterior output, confidence or probability output, persistence, routes, UI,
live connector execution, or customer-facing economic output.

## Current Decision

The current state is:

```text
SYNTHETIC_CALIBRATION_ACCEPTED_REAL_DATA_PENDING
```

Meaning:

- The exact 24-item `ai_fluency_long_v1` manifest, eight first-order
  constructs, five-core second-order structure, ordered response scale, and
  same-form wave policy are frozen.
- A source-side Google Sheets adapter computes item-category and all 276
  pairwise 5x5 aggregate count tables without emitting respondent join keys,
  raw answers, profiles, item text, or behavior fields. It is locked during
  publication, writes READY metadata last, binds canonical question/form and
  organization-overall cohort identities, and hashes only emitted aggregates.
- A synthetic-only aggregate ordinal-probit composite runner now computes
  reliability, loading recovery, second-order recovery, loading invariance,
  and threshold invariance after freeing construct-level follow-up latent
  means. Its Laplace uncertainty uses exact nonlinear loading curvature,
  shared-loading GLS propagation, and joint cumulative-Dirichlet threshold
  covariance.
- The fixed full plan executed 200 seeds in each of four scenarios, followed by
  a separate fresh recomputation of all 800 slots. Invariant acceptance was
  `199/200`, invariant-latent-shift acceptance was `198/200`, loading-drift
  detection was `194/200`, threshold-drift detection was `200/200`, and every
  scenario passed recovery `200/200` with zero runner errors.
- The full artifact, compact summary, and self-hashed acceptance record are
  committed under `inference/evidence/`. Independent CODE, BUG, and
  ADVERSARIAL reviewers returned GO against exact evidence commit `9c87dc26`.
- The current dimension-level snapshots are not sufficient to calibrate a
  latent measurement model or establish comparable change across waves.
- No model output is authorized.
- No customer-facing output is authorized.
- Parent OpenSpec task `5.5` is complete only for this accepted internal
  synthetic calibration boundary.

## Snapshot Context Is Not Calibration Evidence

Validated `AIFluencyInstrumentSnapshot` waves may provide aggregate baseline or
retest context to an otherwise approved longitudinal analysis. Their overall
and dimension estimates, standard errors, reliability summaries, and coverage
posture do not by themselves identify an AI Fluency measurement model.

A measurement-model calibration requires two immutable, hash-bound
aggregate input lanes: validated snapshot context and a separately approved
privacy-safe aggregate measurement-evidence artifact that supports the chosen
likelihood. The synthetic proof implements the second lane's strict shape. A
future real-data admission decision must separately approve its source use. The
lane binds:

- exact instrument, form, item-set, and scoring-derivation versions;
- the approved item-to-dimension map;
- aggregate item response distributions that have independently passed source
  admission and privacy-floor review, plus the joint moments or other aggregate
  sufficient statistics required by the chosen likelihood;
- per-item response counts and missingness posture;
- immutable cohort, wave, source-ref, and source-hash bindings;
- an approved same-form comparison or explicit cross-form equating record; and
- predeclared longitudinal measurement-invariance gates before change is
  interpreted.

The sufficient-statistics representation, privacy floors, likelihood,
invariance tests, and compiled synthetic acceptance gates are defined by
`add-ai-fluency-longitudinal-sem-calibration-proof`. This does not authorize
real-data ingestion or execution.

## Required Input Lanes

A future calibration run requires both lanes below. Neither may substitute for
the other, and both must bind to the same approved aggregate cohort and waves.

### Snapshot Context Lane

The snapshot-context lane may use only validated aggregate
`AIFluencyInstrumentSnapshot` records. Each candidate wave must have:

- source-independent snapshot validation complete;
- `suppression_state=none`;
- `owner_approval_state=approved`;
- `review_state=approved_for_model_context`;
- validated feed state `longitudinal_model_context=true`;
- immutable collection wave identity;
- aggregate-only posture;
- `person_level_data_present=false`;
- k-min posture reviewed at the aggregate cohort grain;
- source ref and source hash;
- owner/reviewer approval state;
- overall and dimension aggregate estimates;
- aggregate uncertainty for the overall estimate and each required dimension;
- reliability or sufficient aggregate precision metadata;
- missingness and respondent-composition posture.

The required dimensions are:

- overall AI Fluency;
- Confidence;
- Usage Quality;
- Behavior Change;
- Leadership Reinforcement;
- Capability Growth.

This lane is necessary but not sufficient for measurement-model calibration.

### Aggregate Measurement-Evidence Lane

The synthetic lane is implemented as a strict two-wave package containing all
24 item-category vectors and all 276 pairwise 5x5 tables per wave. It binds the
form manifest, cohort, wave, window, source, fixed aggregate observed-count
floor, generator identity, seed, scenario, and hierarchical hashes. Pair
margins must reconcile to item counts and missingness. Missing, sparse,
unreviewed, incompatible, off-plan, unsafe, non-synthetic, or hash-invalid
evidence rejects or HOLDS before fitting.

Pair-local margin reconciliation does not prove that arbitrary pair tables came
from one global 24-item respondent distribution. The synthetic model path
therefore regenerates the complete package from the bound generator, scenario,
seed, and compiled sample size and requires exact equality before fitting.
Future real aggregate evidence requires a separately approved trusted source
attestation; self-declared hashes cannot provide that admission.

The paste-in Google Apps Script adapter creates the same aggregate evidence
ingredients inside the beta workbook. It is not executed by this repository,
does not admit those counts into the model, and is not a live connector or
real-data promotion decision.

The model family may review baseline and retest snapshots only as independently
traceable aggregate wave snapshots. Source-supplied movement deltas are not
durable authority by themselves.

## Calibration Gates

A calibration artifact must remain `HOLD` unless every gate below is
satisfied:

| Gate | Required behavior |
| --- | --- |
| `aggregate_snapshot_gate` | Every input is a valid aggregate `AIFluencyInstrumentSnapshot`. |
| `source_admissibility_gate` | Every snapshot has `suppression_state=none`, approved owner review, `review_state=approved_for_model_context`, and a passing longitudinal-context feed. |
| `uncertainty_gate` | Overall and dimension uncertainty are finite, nonnegative, and complete. |
| `wave_identity_gate` | Each wave has immutable source refs, source hashes, and windows. |
| `coverage_gate` | Eligible population, response count, response rate, missingness, and composition posture are present for every wave. |
| `reliability_gate` | Reliability or sufficient aggregate precision evidence is present at the overall and dimension level. |
| `form_and_scoring_gate` | Exact form, item-set, item-to-dimension map, and scoring-derivation versions are immutable and compatible across waves or have an approved equating record. |
| `aggregate_sufficient_statistics_gate` | The complete 24-item and 276-pair aggregate grid reconciles, passes the fixed observed-count floor, and is form/source/hash bound; dimension summaries alone do not pass. |
| `measurement_invariance_gate` | Predeclared configural, loading, and threshold checks pass after construct-level follow-up latent means are free; latent movement cannot be mislabeled as threshold drift. |
| `replicated_study_gate` | All 200 compiled seeds in each invariant, invariant-latent-shift, loading-drift, and threshold-drift scenario are freshly recomputed; smoke or partial evidence HOLDS. |
| `construct_gate` | The five dimensions remain separate; no arbitrary composite or weighted score is introduced. |
| `privacy_gate` | No respondent rows, raw answers, free text, direct identifiers, HR/personnel fields, manager fields, or productivity fields are present. |
| `output_gate` | Confidence, probability, ROI, finance, causality, productivity, route, UI, export, persistence, connector, and customer-output authorizations remain false. |
| `review_gate` | CODE, BUG, and ADVERSARIAL review bind the exact artifact bytes before any later promotion decision can consume the evidence. |

These gates are calibration-contract gates, not FluencyTracr suppression
reasons. They do not add to or modify the five locked canonical suppression
reasons.

## HOLD Behavior

The calibration state must remain `HOLD` when any of the following are true:

- missing aggregate uncertainty;
- partial dimension uncertainty;
- negative or nonfinite uncertainty;
- missing reliability or aggregate precision evidence;
- missing source refs or source hashes;
- source `suppression_state` is not `none`;
- owner approval is not `approved`;
- review state is not `approved_for_model_context`;
- the validated snapshot cannot feed longitudinal model context;
- instrument, form, item-set, item-to-dimension, or scoring-derivation version
  is missing or incompatible across waves;
- different forms are compared without an approved equating record;
- privacy-safe aggregate sufficient statistics required by the selected
  likelihood are missing, incomplete, sparse, or not source-bound;
- longitudinal measurement-invariance evidence is missing or fails;
- source-supplied movement deltas without independently traceable wave
  snapshots;
- k-min posture missing or held;
- missingness or respondent-composition posture absent;
- respondent-level rows or raw answers present;
- direct identifiers, emails, employee IDs, respondent IDs, user IDs, raw
  prompts, transcripts, query text, or raw event rows present;
- HRIS, manager, level, tenure, compensation, performance, productivity, or
  people-decisioning fields present;
- any output authorization flag is true;
- any attempt is made to infer individual, team, department, manager, or
  employee performance;
- any attempt is made to emit customer-facing confidence, probability, ROI,
  finance, causality, productivity, or economic output.

## Non-Authorization

This contract does not authorize:

- production or real-data Bayesian measurement-model runtime code;
- latent trait estimation;
- respondent or customer posterior intervals;
- probability or confidence output;
- customer-facing readouts;
- ROI, finance, causality, productivity, HR analytics, ranking, or economic
  output;
- real-data admission;
- live connector reads;
- backend routes;
- frontend UI;
- Prisma schemas or migrations;
- persistence writes;
- public or downstream exports beyond the source-side aggregate evidence tabs;
- a dedicated `ai_fluency_instrument_snapshots` table;
- use of raw respondent rows to fill aggregate uncertainty gaps;
- treating dimension means, standard errors, or reliability summaries as
  sufficient evidence for latent measurement-model calibration.

## Allowed Next Step

The bounded synthetic calibration step is complete. The next model-family
prerequisite is the separately governed
[VBD trajectory-model calibration](../ai-value-vbd-trajectory-model-calibration/README.md)
under parent task `5.6`; its contract and proof plan are defined, but
implementation approval, execution, evidence acceptance, and downstream
integration reconciliation remain incomplete. It must not reuse this
measurement acceptance as outcome, causal, economic, or production
authorization.

Real aggregate calibration, immutable source admission, beta sample-size
adequacy, the 14-item equating study, structural Attitude/Intent/Impact paths,
persistence, runtime monitoring, customer language, and UI wiring remain
separate later decisions.
