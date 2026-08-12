## ADDED Requirements

### Requirement: VBD Is A Separate Aggregate Human-Behavior Pathway

The methodology SHALL treat stated capability, observed VBD family-state
behavior, and the customer-owned primary outcome as three distinct evidence
lanes. A future joint model MAY connect those lanes only through separately
specified measurement and outcome components with propagated uncertainty. It
SHALL NOT average, weight, or collapse the lanes into an overall VBD, value,
capability, maturity, or attribution score.

The observed behavior lane SHALL use the updated Eligible, Active, Embedded,
retained, newly embedded, lapsed, and remaining nonembedded family-state
evidence. The legacy frequency, engagement, and Breadth trajectory SHALL remain
a separately versioned held research estimand and SHALL NOT be relabeled or
aliased as the updated behavior pathway.

#### Scenario: Three aligned lanes remain distinct

- **GIVEN** aggregate stated capability, VBD family-state evidence, and one
  customer-owned outcome are available for the same frozen analysis unit
- **WHEN** the docs-only joint methodology describes their relationship
- **THEN** each lane retains its own measurement role and uncertainty
- **AND** no overall score or interchangeable proxy is created.

#### Scenario: Legacy trajectory is offered as updated VBD

- **GIVEN** frequency, engagement, and Breadth trajectory summaries exist
- **WHEN** a consumer attempts to rename them as Eligible, Active, Embedded, or
  family-state transition evidence
- **THEN** the updated joint methodology SHALL remain unavailable
- **AND** the legacy evidence MAY remain only under its own held research
  contract.

### Requirement: Aggregate Family-State Records Are Immutable And Comparable

The methodology SHALL define immutable analysis-plan, checkpoint, and
transition records. Each checkpoint SHALL bind one prospectively frozen
Eligible family registry, approved aggregate cohort, canonical-slice manifest,
window, cadence, finality state, qualifying-activity rule, recurrence rule,
semantic-policy version, observable source universe, source-coverage receipt,
gate-receipt root, evidence revision, and append-only record hash.

For every checkpoint, `0 <= Embedded <= Active <= Eligible` SHALL hold. Every
adjacent transition SHALL bind exact checkpoint hashes and authenticated
aggregate intersection evidence proving:

```text
Retained + Lapsed = Embedded_previous
Retained + Newly = Embedded_current
Retained + Lapsed + Newly + RemainingNonembedded = Eligible
```

Arithmetic agreement without the intersection receipt SHALL be insufficient.
Held, missing, stale, suppressed, or incomparable evidence SHALL remain
unavailable and SHALL NOT be converted to zero or imputed.

#### Scenario: Comparable aggregate transition is admitted to design review

- **GIVEN** two finalized adjacent checkpoints share the same registry, source
  universe, cadence, semantic policy, cohort, and independently cleared slice
  gates
- **AND** the transition counts satisfy every identity and bind an authenticated
  intersection receipt
- **WHEN** the transition is prepared for a future synthetic design
- **THEN** its retained, newly embedded, lapsed, and remaining nonembedded
  counts MAY inform the family-state component
- **AND** no family identifier or raw row crosses the source boundary.

#### Scenario: Connector expansion resembles adoption

- **GIVEN** a later checkpoint adds a connector, surface, workflow mapping, or
  required feed
- **WHEN** its Active or Embedded count increases
- **THEN** the prior and later checkpoints SHALL be incomparable
- **AND** the trajectory and every dependent transition SHALL break rather than
  describe adoption movement.

### Requirement: Cross-Lane Alignment And Pre-Outcome Freeze Are Exact

Before any future joint fit, one alignment receipt SHALL bind exact equality of
organization, approved aggregate cohort, workflow-family registry,
canonical-slice manifest, ordered windows, finality, evidence revisions,
intervention exposure, comparator definition, lags, source coverage, and plan
hashes across capability, behavior, and outcome evidence.

The immutable analysis unit SHALL freeze one primary metric definition,
evidence design, claim cap, behavior basis, capability factor, interactions,
lags, controls, model specifications, full-versus-restricted comparison, and
fixed terminal look before post-baseline outcome access. A source-bound receipt
SHALL prove that no post-baseline outcome was accessed before freeze.

#### Scenario: Broader capability cohort remains context

- **GIVEN** capability evidence was measured for a broader cohort than the VBD
  and outcome evidence
- **WHEN** a joint fit is requested
- **THEN** the fit SHALL HOLD for alignment mismatch
- **AND** the broader capability evidence MAY remain separately reported
  context but SHALL NOT be rescaled into the fitted cohort.

#### Scenario: Outcome-informed model edit cannot rescue a unit

- **GIVEN** the plan was frozen before post-baseline outcome access
- **WHEN** a capability factor, behavior term, lag, interaction, control, or
  model comparison is changed after outcome inspection
- **THEN** the prior analysis unit SHALL remain off plan
- **AND** the edit SHALL create a different non-admitted unit rather than repair
  or replace the original result.

### Requirement: Joint Bayesian Design Uses Separate Measurement Components

The future methodology SHALL define an aggregate family-state component with a
retention process for previously Embedded families, a new-embedding process for
previously nonembedded families, and an active-nonembedded process for currently
nonembedded families. These processes SHALL produce uncertain embedded and
active-nonembedded behavior states.

The stated-capability component SHALL use one factor selected before outcome
access with admitted aggregate measurement uncertainty. Multiple capability
factors SHALL require their joint covariance. The methodology SHALL NOT create
a perception-versus-behavior score.

When the capability snapshot precedes a behavior transition and its role and
lag were frozen before outcome access, the family-state component MAY include a
separately predeclared lagged capability term for retention, new embedding, or
active-nonembedded behavior. The capability measurement uncertainty SHALL
propagate into that association, which SHALL remain noncausal under this
change.

The outcome component SHALL propagate the uncertain lagged behavior and
capability states. For the current eligible family, it SHALL retain a
continuous-normal aggregate likelihood with known positive aggregate outcome
standard error, predeclared time structure, approved controls, and an optional
predeclared capability-by-embedded interaction.

#### Scenario: Family states and capability enter jointly

- **GIVEN** aligned aggregate family-state counts, one predeclared capability
  factor with uncertainty, and a supported continuous-normal outcome panel
- **WHEN** a future approved joint model is specified
- **THEN** behavior and capability SHALL retain separate latent measurement
  components
- **AND** their posterior uncertainty SHALL propagate into the outcome
  association and moderation estimands.

#### Scenario: Prior capability qualifies later behavior

- **GIVEN** an aligned aggregate capability snapshot temporally precedes a VBD
  transition and its factor, role, and lag were frozen before outcome access
- **WHEN** a future approved family-state model is specified
- **THEN** the latent capability factor MAY estimate its association with later
  retention, new embedding, or active-nonembedded behavior
- **AND** the result SHALL NOT be described as a causal capability effect.

#### Scenario: Capability covariance is missing

- **GIVEN** a plan attempts to fit multiple aggregate capability dimensions
- **WHEN** only marginal standard errors are supplied
- **THEN** the joint methodology SHALL HOLD
- **AND** it SHALL NOT assume those dimensions are independent.

### Requirement: Algebraically Dependent Behavior Predictors Are Prohibited

The outcome component SHALL use one frozen, nonduplicative behavior basis.
Retention, new-embedding, and lapse counts MAY inform the latent family-state
transition. They SHALL NOT also enter the outcome equation as independent terms
when represented by that transition.

Adoption Reach, Persistence, Coverage, Net Coverage Velocity, Active,
Embedded, and their transition decomposition SHALL NOT be entered together as
if they were independent. The future plan SHALL specify the embedded state and
MAY predeclare the active-nonembedded state as the outcome predictors.

#### Scenario: Derived ratios are offered together

- **GIVEN** Coverage equals Adoption Reach multiplied by Persistence before
  rounding and Net Coverage Velocity is derived from adjacent Coverage
- **WHEN** a plan offers all of those values as independent outcome predictors
- **THEN** the plan SHALL HOLD for duplicated algebraic evidence
- **AND** a post-result term-selection procedure SHALL NOT choose among them.

#### Scenario: Transition counts inform states once

- **GIVEN** retained, newly embedded, lapsed, and remaining nonembedded counts
  define the aggregate transition
- **WHEN** the family-state model consumes those counts
- **THEN** the resulting embedded state MAY enter the outcome component
- **AND** the same transition counts SHALL NOT be added again as separate
  outcome predictors.

### Requirement: Predictive Contribution And Claim Ceiling Remain Noncausal

The analysis plan SHALL freeze one full model containing the approved behavior
terms and one restricted companion model without those terms. The models SHALL
use identical outcome rows, windows, likelihood, controls, time structure, and
shared-parameter priors. A future-window prediction scheme SHALL exclude each
evaluated future window from its training data.

Internal differences in Bayesian R-squared and future-window predictive fit
MAY describe incremental predictive contribution. They SHALL NOT be labeled as
percent of variance caused by AI, percent impact, causal attribution,
productivity, ROI, economic value, or proof of why the outcome changed.

Without a separately approved identification design, every coefficient,
contrast, moderation term, predictive diagnostic, and posterior interval SHALL
remain internal and noncausal. Diagnostics MAY lower the claim cap or HOLD the
analysis and SHALL NOT raise it.

#### Scenario: Behavior improves predictive fit

- **GIVEN** the frozen full model predicts held-out future windows better than
  the frozen restricted model
- **WHEN** the result is interpreted
- **THEN** it MAY be described internally as evidence that aggregate behavior
  added predictive information under the model
- **AND** it SHALL NOT be described as AI causing a share of the outcome change.

#### Scenario: Precise association is offered as impact

- **GIVEN** a behavior-associated outcome contrast has a narrow posterior
  interval
- **WHEN** no separately approved causal identification design exists
- **THEN** the maximum interpretation SHALL remain internal association
- **AND** customer-facing impact, attribution confidence, probability, ROI,
  productivity, and economic output SHALL remain blocked.

### Requirement: Steps One Through Four Are Documentation Only

The methodology MUST remain documentation-only after steps 1 through 4.
Completing methodology direction, governance reconciliation, the aggregate
data contract, and the joint Bayesian design SHALL NOT create runtime or
execution authority. A later implementation SHALL require a separately
approved OpenSpec scope after resolving family-to-canonical-slice allocation
and derived-scope privacy.

This change SHALL create no runtime schema, validator, endpoint, service, UI,
persistence, export, connector, synthetic fixture, model fit, sampler launch,
posterior artifact, real-data path, customer output, canonical event, or
canonical suppression reason.

#### Scenario: Completed documentation is offered as execution authority

- **GIVEN** steps 1 through 4 are complete and this change validates strictly
- **WHEN** a consumer attempts to implement, fit, persist, expose, or deploy the
  joint methodology
- **THEN** the attempt SHALL remain unauthorized
- **AND** steps 5 through 7 SHALL remain not started until separately approved.
