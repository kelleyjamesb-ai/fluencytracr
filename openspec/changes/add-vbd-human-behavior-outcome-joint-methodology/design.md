# Design: VBD Human-Behavior And Outcome Joint Methodology

## Context

The product question is whether and how human capability and actual AI-enabled
work relate to movement in a customer-owned metric. Existing repository
components do not yet answer that question as one governed statistical design:

- AI Fluency is stated aggregate capability evidence with its own measurement
  uncertainty and product gates.
- VBD Coverage Trajectory is a docs-only deterministic family-count concept.
- The legacy VBD trajectory models frequency, engagement, and Breadth and has a
  different estimand.
- The current longitudinal outcome path is narrow, synthetic-only, noncausal,
  and limited to a continuous-normal aggregate family.

## Goals

- Represent observed human behavior through aggregate work-pattern family
  states and transitions.
- Keep stated capability and observed behavior distinct.
- Carry uncertainty from both measurement components into the outcome model.
- Quantify internal association, moderation, and predictive relevance without
  overstating causality.
- Preserve every privacy, suppression, admission, and claim boundary.

## Non-Goals

- Runtime implementation or model execution.
- An overall VBD, capability, value, or maturity score.
- A unique causal variance decomposition.
- Function, department, team, manager, or person-level inference.
- New likelihood support beyond documentation of the currently proved
  continuous-normal outcome family.
- Customer-facing confidence, probability, impact percentage, ROI,
  productivity, or economic output.

## Decisions

### VBD Is The Observed Human-Behavior Pathway

The methodology interprets family-state movement as evidence of how AI-enabled
work is becoming active and embedded. This operationalizes the human-behavior
pathway without treating usage volume as value proof.

The deterministic product summaries remain Adoption Reach, Persistence,
Embedded Adoption Coverage, Net Coverage Velocity, and the embedded transition
decomposition. These summaries are not independent statistical predictors.

### The Legacy VBD Likelihood Is Not Reused

The frequency, engagement, and Breadth trajectory consumes aggregate
distribution percentiles and a Gaussian state-space likelihood. The updated
VBD methodology consumes finite family-state counts and transitions. Relabeling
the former as the latter would change the estimand without changing the data
generating model and is prohibited.

### Aggregate Transition Factorization

For a stable Eligible universe, the complete embedded-status transition is:

```text
previous Embedded -> current Embedded     = Retained
previous Embedded -> current nonembedded  = Lapsed
previous nonembedded -> current Embedded  = Newly Embedded
previous nonembedded -> current nonembedded = Remaining Nonembedded
```

The model factorizes that table into a retention process and a new-embedding
process. Active among currently nonembedded families supplies a third process.
The latent behavior basis is the embedded state and the active-nonembedded
state. Transition counts inform those states and do not also enter the outcome
equation as separate predictors.

When a capability snapshot precedes a transition and the role is frozen before
outcome access, lagged latent capability may enter the transition logits. This
defines the capability-to-behavior association while propagating capability
measurement uncertainty. It is not a causal capability effect.

### Capability Remains A Separate Measurement Component

One predeclared aggregate capability factor may enter with admitted standard
error. Multiple factors require joint covariance. Capability can be baseline
context, a temporally ordered predictor, or a predeclared moderator. It cannot
be used to manufacture a perception-versus-behavior score.

### Joint Outcome Model Is Noncausal By Default

The outcome equation combines the uncertain lagged behavior states, uncertain
capability, a predeclared capability-by-embedded interaction, approved
controls, and time structure. This answers whether behavior adds information
conditional on the model. It does not identify the total effect of an
intervention because capability and behavior may be post-intervention
variables.

A causal or mediation design requires a new approved estimand, identification
argument, router, validation plan, and exact implementation scope.

### Predictive Relevance Uses A Frozen Companion Model

The plan freezes one full model and one restricted model without the behavior
terms. Both use the same rows, outcome likelihood, controls, windows, time
structure, and shared-parameter priors. Future-window predictive fit and
Bayesian R-squared differences may be used only as internal predictive
diagnostics.

This comparison does not yield the percentage of outcome variance caused by
AI. Interactions, shared causes, measurement error, and collinearity prevent a
unique causal allocation.

### Exact Alignment Is Required For Joint Fitting

Capability, behavior, and outcome evidence must bind to the same organization,
aggregate cohort, workflow-family registry, canonical-slice manifest, windows,
exposure, lags, and evidence revisions. A broader capability cohort remains
context and cannot enter a narrower fitted unit.

### Outcome Eligibility Does Not Expand

The design is general enough to name future likelihood adapters, but the only
currently proved outcome family remains `continuous_normal_identity` with
known positive aggregate standard error. Counts, rates, proportions, bounded
scores, ordinal outcomes, time-to-event outcomes, and zero-inflated outcomes
remain held.

## Estimands

The design distinguishes:

- customer-owned metric movement in the original unit;
- movement in the modeled Embedded behavior state;
- the association between prior stated capability and later behavior
  transitions;
- the conditional behavior-associated outcome contrast;
- capability moderation of that association; and
- full-versus-restricted incremental predictive contribution.

None is a causal AI-impact quantity under this change.

## Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Aggregate counts are mistaken for individual behavior | Permit no family IDs, member rows, user fields, or person-level outputs. |
| Cross-slice aggregation reveals held groups | Require independent gate roots and a future derived-scope privacy proof before implementation. |
| Source expansion masquerades as adoption | Require a stable observable source universe or break the trajectory. |
| Derived predictors double-count the same evidence | Use one latent behavior basis and prohibit algebraically dependent summaries in the outcome equation. |
| Capability is selected to fit the outcome | Freeze the factor, lag, and role before post-baseline outcome access. |
| Predictive relevance is called impact | Preserve the noncausal claim cap and prohibited-language checks. |
| Post-treatment controls distort interpretation | Require a predeclared control role and exclude mediators and colliders. |
| Existing VBD code is treated as implementation | Keep explicit version and estimand separation. |

## Implementation Gate

No implementation follows from this design. Step 5 requires a separately
approved OpenSpec scope that first resolves family-to-slice allocation and
derived-scope privacy, then defines aggregate-only schemas, deterministic
preparation, and synthetic fixtures. Model execution remains a later gate.
