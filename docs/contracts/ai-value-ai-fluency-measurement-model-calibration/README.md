# AI Fluency Measurement-Model Calibration

Contract status: `PREREQUISITES_DEFINED_CALIBRATION_INCOMPLETE`

Owning model-family component:
`bayesian_fluency_measurement_model`

## Purpose

This contract defines the calibration gate for future aggregate AI Fluency
measurement modeling inside the Bayesian AI Value Realization And Human
Transformation model family.

It is a documentation and specification boundary only. It does not implement a
Bayesian measurement model, fit latent dimensions, create posterior output,
authorize confidence or probability output, create persistence, expose a route,
render UI, run connectors, ingest respondent rows, or produce customer-facing
economic output.

## Current Decision

The current state is:

```text
PREREQUISITES_DEFINED_CALIBRATION_INCOMPLETE
```

Meaning:

- Aggregate snapshot-context prerequisites and missing calibration inputs are
  defined.
- Calibration has not been executed.
- The current dimension-level snapshots are not sufficient to calibrate a
  latent measurement model or establish comparable change across waves.
- No model output is authorized.
- No customer-facing output is authorized.
- Future implementation requires a separate exact-scope proposal, artifacts,
  validation, and independent review.

## Snapshot Context Is Not Calibration Evidence

Validated `AIFluencyInstrumentSnapshot` waves may provide aggregate baseline or
retest context to an otherwise approved longitudinal analysis. Their overall
and dimension estimates, standard errors, reliability summaries, and coverage
posture do not by themselves identify an AI Fluency measurement model.

A future measurement-model proposal must define two immutable, hash-bound
aggregate input lanes: validated snapshot context and a separately approved
privacy-safe aggregate measurement-evidence artifact that supports the chosen
likelihood. The second lane does not exist today. At minimum, it must bind:

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

The exact sufficient-statistics representation, privacy floors, likelihood,
invariance tests, and compiled calibration acceptance gates require a separate
OpenSpec proposal. This contract does not authorize creating or exporting them.

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

This lane is not implemented or authorized. A future OpenSpec proposal must
define a strict artifact carrying only the privacy-safe aggregate sufficient
statistics required by its selected likelihood, along with the form,
item-to-dimension, scoring, coverage, equating, invariance, source, and privacy
bindings above. Missing, sparse, suppressed, unreviewed, incompatible, or
unbound evidence in this lane HOLDS calibration.

The model family may review baseline and retest snapshots only as independently
traceable aggregate wave snapshots. Source-supplied movement deltas are not
durable authority by themselves.

## Calibration Gates

A future calibration artifact must remain `HOLD` unless every gate below is
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
| `aggregate_sufficient_statistics_gate` | A later approved privacy-safe aggregate statistics contract supplies the information required by the selected measurement likelihood; dimension summaries alone do not pass. |
| `measurement_invariance_gate` | Predeclared cross-wave invariance checks are present and pass before latent change is interpreted. |
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

- Bayesian measurement-model runtime code;
- latent trait estimation;
- posterior intervals;
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
- exports;
- a dedicated `ai_fluency_instrument_snapshots` table;
- use of raw respondent rows to fill aggregate uncertainty gaps;
- treating dimension means, standard errors, or reliability summaries as
  sufficient evidence for latent measurement-model calibration.

## Allowed Next Step

The only allowed next step is a separate exact-scope proposal for the missing
privacy-safe aggregate measurement evidence and synthetic calibration design.
It must define the sufficient-statistics shape, supported instrument forms,
likelihood, form-equating and longitudinal-invariance gates, fixed validation
rules, synthetic fixtures, artifact shape, independent review, and fail-closed
HOLD behavior before any calibration run exists. OpenSpec task `5.5` remains
incomplete until that calibration is implemented, executed, and independently
accepted.
