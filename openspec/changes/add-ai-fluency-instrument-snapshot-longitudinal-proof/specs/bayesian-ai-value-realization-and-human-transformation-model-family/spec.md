## ADDED Requirements

### Requirement: Source-Independent AI Fluency Instrument Snapshot

The system SHALL define an aggregate-only, source-independent
`AIFluencyInstrumentSnapshot` contract for AI Fluency Instrument evidence. The
snapshot SHALL be producible from current Google Apps Script aggregate export
adapters, controlled JSON imports, controlled CSV imports, future Instrument
API fixtures, or future Instrument service fixtures without changing the
model-input contract.

The snapshot SHALL include schema version, snapshot id, client id, org id,
instrument id/version, collection wave id/mode, function area, workflow
family, cohort key, window start/end, eligible population count, response
count/rate, overall and five-dimension aggregate AI Fluency scores,
suppression state, k-min posture, source owner/review posture, source adapter,
source ref, source hash, caveats, `aggregate_only=true`, and
`person_level_data_present=false`.

#### Scenario: Current and future adapters normalize to one shape

- **GIVEN** an Apps Script-shaped aggregate export row, a controlled JSON
  aggregate import, and a future Instrument API fixture contain the same
  aggregate AI Fluency evidence
- **WHEN** each is normalized
- **THEN** the canonical snapshot fields match and the source adapter remains
  only lineage metadata

#### Scenario: Respondent leakage rejects

- **GIVEN** a snapshot input contains respondent IDs, employee IDs, emails,
  raw survey answers, free text, HRIS fields, manager fields, compensation,
  performance, productivity, probability, confidence-percentage, ROI,
  financial-attribution, route/UI/persistence, or raw-row fields
- **WHEN** the snapshot validator runs
- **THEN** validation fails and the snapshot cannot feed model context

#### Scenario: Missing measurement uncertainty is visible

- **GIVEN** an otherwise aggregate-safe AI Fluency snapshot lacks standard
  errors, reliability estimates, or sufficient aggregate uncertainty fields
- **WHEN** the snapshot is validated
- **THEN** missing uncertainty remains visible and full Fluency measurement
  model authorization remains false
- **AND** respondent-level export is not required or authorized to fill the gap

#### Scenario: Waves are immutable

- **GIVEN** baseline and retest AI Fluency snapshots exist for the same
  aggregate cohort
- **WHEN** they are normalized
- **THEN** they remain independently traceable by collection wave, window,
  source ref, and source hash rather than relying on a source-supplied movement
  delta as sole durable authority

### Requirement: AI Fluency Measurement-Model Calibration Contract

The system SHALL define a docs-only calibration contract for
`bayesian_fluency_measurement_model` with current state
`PREREQUISITES_DEFINED_CALIBRATION_INCOMPLETE`. The contract SHALL distinguish
validated aggregate `AIFluencyInstrumentSnapshot` context from measurement
calibration evidence. Dimension estimates, standard errors, reliability
summaries, coverage, missingness, respondent-composition, source refs, source
hashes, and k-min posture SHALL NOT by themselves authorize or identify a
latent measurement model or comparable cross-wave change.

Any later calibration proposal SHALL define two immutable, hash-bound aggregate
input lanes: validated snapshot context and a separately approved privacy-safe
aggregate measurement-evidence artifact containing the sufficient statistics
for its chosen likelihood. The second lane does not exist in this change. It
SHALL bind exact instrument/form/item-set/item-to-dimension/scoring-derivation
versions, same-form compatibility or an approved equating record, per-item
coverage and missingness, immutable source and cohort/wave identities, privacy
review, and predeclared longitudinal measurement-invariance gates.
Candidate snapshots SHALL have `suppression_state=none`,
`owner_approval_state=approved`, `review_state=approved_for_model_context`, and
a passing longitudinal-context feed before they may supply model context.

The calibration contract SHALL NOT implement a runtime model, fit latent
traits, emit posterior intervals, emit confidence or probability output,
authorize customer output, create schemas, persistence, routes, UI, exports,
connectors, real-data admission, ROI, finance, causality, productivity, HR
analytics, ranking, economic output, new canonical events, new suppression
reasons, tunable thresholds, or admin overrides.

#### Scenario: Calibration prerequisites are defined but incomplete

- **GIVEN** the model family has accepted the longitudinal synthetic proof
  evidence
- **WHEN** the AI Fluency measurement-model calibration contract is reviewed
- **THEN** the state is `PREREQUISITES_DEFINED_CALIBRATION_INCOMPLETE`
- **AND** OpenSpec task `5.5` remains incomplete
- **AND** no model result, posterior quantity, confidence percentage,
  probability, customer output, persistence, route, UI, export, connector, ROI,
  finance, causality, productivity, HR, ranking, or economic output is
  authorized

#### Scenario: Missing uncertainty holds calibration

- **GIVEN** an otherwise valid aggregate AI Fluency wave lacks complete
  aggregate uncertainty or reliability evidence
- **WHEN** the measurement-model calibration gate evaluates the wave
- **THEN** calibration remains HOLD
- **AND** respondent-level export, invented precision, or source-supplied
  movement deltas cannot fill the gap

#### Scenario: Dimension summaries do not calibrate latent change

- **GIVEN** baseline and retest snapshots contain complete dimension means,
  standard errors, reliability summaries, and coverage posture
- **WHEN** privacy-safe aggregate sufficient statistics, exact compatible form
  and scoring versions, equating where needed, or longitudinal invariance
  evidence are absent
- **THEN** measurement-model calibration remains incomplete and HOLDS
- **AND** the snapshots may be used only as otherwise approved aggregate
  longitudinal context

#### Scenario: Held source posture cannot enter calibration

- **GIVEN** a candidate snapshot is suppressed, lacks approved ownership, lacks
  `approved_for_model_context` review, or cannot feed longitudinal model context
- **WHEN** the measurement-model calibration gate evaluates the wave
- **THEN** calibration remains HOLD regardless of later artifact review

#### Scenario: Unsafe fields reject before calibration

- **GIVEN** a candidate calibration input contains respondent rows, raw
  answers, free text, direct identifiers, emails, employee IDs, respondent IDs,
  user IDs, HRIS fields, manager fields, level, tenure, compensation,
  performance, productivity, raw prompts, transcripts, query text, raw event
  rows, or output authorization flags
- **WHEN** the measurement-model calibration gate evaluates the input
- **THEN** the input is rejected before interpretation
- **AND** it cannot feed model context or customer-facing output

### Requirement: First Longitudinal Synthetic Proof Prototype

The system SHALL implement `first_longitudinal_synthetic_model_slice` as an
isolated synthetic-only prototype path under the Bayesian AI Value Realization
And Human Transformation model family. The prototype SHALL operate only on
aggregate synthetic inputs, one approved hypothesis, one continuous normal
identity primary metric, ordered pre/post windows, baseline AI Fluency context,
separate lagged Velocity/Breadth exposures, Depth as synthetic aggregate
pathway context only, approved synthetic aggregate controls, known aggregate
standard errors, and an explicit residual
serial-correlation diagnostic.

The prototype SHALL emit artifacts as internal validation inputs only with
`synthetic_smoke_only=true` and `replicated_calibration_complete=false`.
The posterior estimand and counterfactual-derivation estimand SHALL be exactly
`internal_in_sample_vbd_contrast`; the previous
`historical_counterfactual_outcome_movement` name SHALL NOT be emitted because
this prototype is an in-sample smoke contrast, not a historical forecast
counterfactual.

#### Scenario: Clean synthetic pathway passes smoke proof

- **GIVEN** a clean synthetic historical pathway with complete windows,
  approved aggregate baseline AI Fluency context, separated lagged VBD
  exposures, approved synthetic controls, known aggregate standard errors, and
  meaningful post-period outcome movement after the approved lag
- **WHEN** the longitudinal proof runner executes
- **THEN** it emits an internal-only smoke artifact with no failing diagnostics
- **AND** no customer-facing confidence, probability, ROI, finance, causality,
  productivity, full pathway coherence, route, UI, persistence, export, or
  readout is authorized

#### Scenario: Null pathway remains non-authorizing

- **GIVEN** a null synthetic historical pathway has no meaningful VBD or
  outcome movement
- **WHEN** the proof runner executes
- **THEN** the artifact may validate internally but remains
  non-authorizing for meaningful outcome movement

#### Scenario: Invalid longitudinal inputs hold or reject

- **GIVEN** the synthetic input has insufficient pre/post history, missing or
  suppressed required windows, stale or imputed windows, missing aggregate
  measurement uncertainty, collinear VBD dimensions, unsupported likelihood
  family, target contamination, real/customer/production/live data flags,
  respondent-level leakage, unsafe HR/personnel controls, wrong lag,
  approved-control common-shock sensitivity, temporary-only movement,
  baseline-only evidence, or staggered rollout misrouting
- **WHEN** the proof runner evaluates the input
- **THEN** it rejects before fitting or emits HOLD naming the specific failing
  diagnostic

#### Scenario: Staggered rollout remains unsupported

- **GIVEN** a hypothesis declares `STAGGERED_ROLLOUT`
- **WHEN** the current DiD module and first longitudinal synthetic prototype
  are the only implemented paths
- **THEN** the route HOLDS with unsupported staggered event-study status
- **AND** it is not coerced into the current DiD module or the longitudinal
  smoke proof

### Requirement: Longitudinal Artifact TypeScript Boundary

The TypeScript confidence-engine SHALL validate longitudinal synthetic proof
artifacts with a separate strict schema rather than weakening the existing DiD
`InferenceProofArtifactSchema`. TypeScript SHALL recompute artifact self-hash
and source-hash bindings and SHALL reject unknown fields, forged hashes,
source-hash mismatches, unsafe output flags, unsupported route claims,
respondent/person-level fields, HR/personnel fields, and any customer-facing
confidence, probability, ROI, finance, causality, productivity, route, UI,
persistence, export, or readout authorization.

#### Scenario: Python artifact crosses as strict internal JSON

- **GIVEN** Python emits clean, null, or HOLD longitudinal synthetic artifacts
- **WHEN** the TypeScript bridge schema validates them
- **THEN** valid artifacts parse only with internal-only, synthetic-only,
  smoke-only, non-customer-facing pins intact

#### Scenario: Hash drift rejects

- **GIVEN** a longitudinal artifact body or source hash is changed after
  emission
- **WHEN** the TypeScript bridge validates the artifact
- **THEN** validation rejects the artifact before governance processing

#### Scenario: Unsafe authorization rejects

- **GIVEN** a longitudinal artifact attempts to set customer output,
  probability output, confidence output, ROI output, finance output, causality
  output, productivity output, persistence, route, UI, export, readout, or
  connector authorization true
- **WHEN** the TypeScript bridge validates the artifact
- **THEN** validation rejects it

### Requirement: Persistence And UI Non-Authorization

This prototype SHALL NOT create or modify Prisma schemas, Postgres migrations,
backend repository write paths, backend routes, frontend UI, exports, live
connectors, production ingestion jobs, rendered readouts, or customer-facing
outputs. A future dedicated `ai_fluency_instrument_snapshots` projection SHALL
require a separate exact-scope persistence promotion decision before any table,
write path, route, or UI integration exists.

#### Scenario: No dedicated snapshot table is introduced

- **GIVEN** the Phase 2B synthetic prototype is implemented
- **WHEN** the repository diff is inspected
- **THEN** no backend/prisma schema, migration, repository, route, UI, export,
  or persistence write path has been added for AI Fluency snapshots

#### Scenario: Future persistence remains proposed only

- **GIVEN** a future physical projection is discussed
- **WHEN** this change is interpreted
- **THEN** the future projection remains a proposal and does not authorize
  generic JSON smuggling, existing-table writes, or a dedicated table
