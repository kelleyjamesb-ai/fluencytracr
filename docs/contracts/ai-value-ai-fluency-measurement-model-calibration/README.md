# AI Fluency Measurement-Model Calibration

Contract status: `CONTRACT_READY_NOT_RUN`

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
CONTRACT_READY_NOT_RUN
```

Meaning:

- The required aggregate evidence and validation gates are defined.
- Calibration has not been executed.
- No model output is authorized.
- No customer-facing output is authorized.
- Future implementation requires a separate exact-scope proposal, artifacts,
  validation, and independent review.

## Required Aggregate Inputs

A future calibration run may use only validated aggregate
`AIFluencyInstrumentSnapshot` records. Each candidate wave must have:

- source-independent snapshot validation complete;
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

The model family may review baseline and retest waves only as independently
traceable aggregate wave snapshots. Source-supplied movement deltas are not
durable authority by themselves.

## Calibration Gates

A future calibration artifact must remain `HOLD` unless every gate below is
satisfied:

| Gate | Required behavior |
| --- | --- |
| `aggregate_snapshot_gate` | Every input is a valid aggregate `AIFluencyInstrumentSnapshot`. |
| `uncertainty_gate` | Overall and dimension uncertainty are finite, nonnegative, and complete. |
| `wave_identity_gate` | Each wave has immutable source refs, source hashes, and windows. |
| `coverage_gate` | Eligible population, response count, response rate, missingness, and composition posture are present for every wave. |
| `reliability_gate` | Reliability or sufficient aggregate precision evidence is present at the overall and dimension level. |
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
- use of raw respondent rows to fill aggregate uncertainty gaps.

## Allowed Next Step

The only allowed next step is a separate exact-scope implementation proposal
for an internal aggregate calibration artifact. That proposal must define the
artifact shape, fixed validation gates, synthetic or approved aggregate fixture
inputs, independent review requirements, and fail-closed HOLD behavior before
any calibration run exists.
