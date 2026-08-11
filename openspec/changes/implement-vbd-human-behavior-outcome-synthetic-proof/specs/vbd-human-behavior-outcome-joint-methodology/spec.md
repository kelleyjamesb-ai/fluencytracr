## ADDED Requirements

### Requirement: Synthetic Proof Requires Human-Authored Queue Admission

The implementation SHALL remain blocked until a human explicitly directs one
exact bounded high-risk queue item for the synthetic joint proof and that item
exists as the sole active queue row. OpenSpec validation alone SHALL NOT
substitute for the repository's human-owned queue state.

#### Scenario: Proposal exists without queue item

- **GIVEN** the implementation proposal is valid and steps 5 through 8 were
  approved in conversation
- **WHEN** no matching human-authored queue item exists
- **THEN** no runtime code or model execution SHALL begin
- **AND** the proposal SHALL remain `BLOCKED_PENDING_HUMAN_QUEUE_ITEM`.

### Requirement: Synthetic Panels Are Exact Single-Slice Units

Every synthetic panel SHALL map one-to-one to one exact
`(workflow_id, jbtd_id, persona_id)` tuple, one aggregate cohort hash, and one
disjoint family-registry root. A family SHALL appear in exactly one panel. Each
panel SHALL clear structural and suppression gates independently before any
partial pooling.

The proof SHALL emit no cross-slice derived count, percentage, organization
rollup, per-slice coefficient, or per-slice latent path. Another panel's volume
or evidence SHALL NOT rescue a held panel.

#### Scenario: Independently clear synthetic panels enter preparation

- **GIVEN** every synthetic panel has a unique slice and family-registry root
- **AND** every panel independently clears its gates
- **WHEN** deterministic preparation runs
- **THEN** model-level partial pooling MAY be prepared
- **AND** the prepared record SHALL contain only opaque aggregate bindings.

#### Scenario: Family appears in two panels

- **GIVEN** one family allocation appears under two slice or registry roots
- **WHEN** preparation validates the registry commitments
- **THEN** the full analysis SHALL HOLD before fitting
- **AND** rehashing the duplicate allocation SHALL NOT admit it.

### Requirement: Aggregate Preparation Fails Closed

The synthetic proof SHALL define strict immutable types and deterministic
preparation for the analysis plan, family-state checkpoints and transitions,
stated capability, continuous-normal outcome, safe controls, alignment, and
pre-outcome freeze receipt.

Preparation SHALL reject missing, stale, suppressed, incomparable, nonfinal,
misaligned, outcome-informed, unsafe, or algebraically duplicated evidence. It
SHALL enforce every checkpoint and transition identity and SHALL preserve
missing or held values as unavailable rather than zero.

#### Scenario: Fully bound aggregate unit prepares deterministically

- **GIVEN** one synthetic unit satisfies every immutable binding, count
  identity, source-coverage rule, gate, alignment rule, and freeze receipt
- **WHEN** preparation runs twice
- **THEN** both prepared projections SHALL be byte-identical
- **AND** they SHALL have the same hierarchical content hash.

#### Scenario: Derived behavior predictors are duplicated

- **GIVEN** a plan includes the latent embedded state together with Coverage,
  Persistence, Net Coverage Velocity, or transition counts as independent
  outcome predictors
- **WHEN** preparation validates the frozen behavior basis
- **THEN** the unit SHALL HOLD before fitting
- **AND** post-result term selection SHALL NOT repair it.

### Requirement: Joint Model Propagates Measurement Uncertainty

The synthetic joint model SHALL fit aggregate retention, new-embedding, and
active-nonembedded likelihoods, a stated-capability measurement-error
likelihood, and the supported continuous-normal aggregate outcome likelihood.
It SHALL propagate capability uncertainty into predeclared capability-to-
behavior terms and propagate behavior and capability uncertainty into
predeclared lagged outcome terms and capability moderation.

The full model SHALL have one frozen no-behavior restricted companion using
the same outcome rows, likelihood, controls, time structure, and shared priors.
The model SHALL remain noncausal.

#### Scenario: Valid synthetic unit enters the full and restricted models

- **GIVEN** a valid prepared synthetic unit and frozen model specification
- **WHEN** the approved internal fit path runs
- **THEN** the full and restricted fits SHALL bind the same prepared input
- **AND** only the full fit SHALL contain the predeclared behavior pathway.

#### Scenario: Unsupported outcome family is offered

- **GIVEN** a count, rate, proportion, ordinal, bounded, time-to-event, or
  zero-inflated outcome is offered
- **WHEN** the joint proof checks current eligibility
- **THEN** the unit SHALL HOLD before fitting
- **AND** it SHALL NOT be coerced into `continuous_normal_identity`.

### Requirement: Committed Outputs Are Sanitized Internal Summaries

Any committed synthetic artifact SHALL contain only immutable hashes,
categorical states, aggregate coefficient summaries, interval endpoints,
truth-recovery error, diagnostics, predictive-comparison summaries, caveats,
and blocked-output booleans fixed to false.

The artifact SHALL NOT contain posterior draws, latent paths, family-level
values, per-slice estimates, raw observations, member rows, direct identifiers,
prompts, outputs, transcripts, action rows, or raw events. It SHALL NOT authorize
customer-facing confidence, probability, causal impact, productivity, ROI,
ranking, or economic output.

#### Scenario: Posterior draws are offered for persistence

- **GIVEN** a fit completes successfully
- **WHEN** an artifact includes posterior draws or latent paths
- **THEN** artifact validation SHALL reject it
- **AND** the successful fit SHALL create no evidence or integration authority.

### Requirement: Synthetic Validation Is Frozen And Fail Closed

Before an evidence run, the proof SHALL freeze model geometry, priors, panel
shape, Eligible counts, lags, seeds, sampler settings, validation limits,
scenarios, and artifact shape. Validation SHALL include truth recovery, null,
lag, confounding, capability-error, source-drift, cohort-alignment, algebraic-
duplication, and future-window predictive cases.

A failed run SHALL remain HOLD. Model or threshold repair SHALL require a new
frozen revision and SHALL NOT silently rerun the failed evidence universe.

#### Scenario: Frozen synthetic validation passes

- **GIVEN** every planned case and recomputation completes under the frozen
  design
- **WHEN** all structural, numerical, recovery, null, predictive, and artifact
  gates clear
- **THEN** the proof MAY proceed to independent review
- **AND** it SHALL NOT automatically authorize real data or product integration.

#### Scenario: Evidence failure triggers tuning

- **GIVEN** a planned recovery or diagnostic gate fails
- **WHEN** a model parameter, prior, sampler setting, threshold, or scenario is
  changed
- **THEN** the original evidence universe SHALL remain HOLD
- **AND** the repair SHALL require a new reviewed design identity.

### Requirement: Step Eight Produces A Non-Authorizing Decision

After synthetic validation and review, step 8 SHALL record exactly one of:
`HOLD_FOR_MODEL_REPAIR`, `HOLD_FOR_MORE_SYNTHETIC_VALIDATION`,
`PROMOTE_NEXT_SYNTHETIC_SCOPE`, or
`PROPOSE_BOUNDED_REAL_AGGREGATE_ADMISSION_REVIEW`.

No decision SHALL directly authorize real data, runtime schemas, services,
APIs, persistence, UI, deployment, customer output, causal claims,
productivity, ROI, ranking, or economic output.

#### Scenario: Synthetic proof supports a later real-data proposal

- **GIVEN** the complete synthetic evidence and independent review clear
- **WHEN** step 8 selects `PROPOSE_BOUNDED_REAL_AGGREGATE_ADMISSION_REVIEW`
- **THEN** only a new docs and OpenSpec review MAY begin
- **AND** no real data SHALL be accessed or executed under this decision.
