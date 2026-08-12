# VBD Coverage Trajectory

## Status

`SYNTHETIC_V4_REPLICATED_VALIDATION_PROTOCOL_FROZEN`

Current decision: `HOLD_FOR_MODEL_REPAIR`

James Kelley approved steps 1 through 4 of this methodology direction on
2026-08-11: direction approval, governance reconciliation, an aggregate data
contract, and a joint Bayesian design. The approved direction replaces
FluencyTracr's illustrative weighted VBD posture with a governed work-pattern
adoption trajectory and treats that trajectory as the observed human-behavior
pathway in a future joint outcome analysis.

The required six-criterion review for Adoption Reach, Persistence, and Embedded
Adoption Coverage is recorded in the
[VBD Coverage Trajectory Signal Promotion Decision](../research/VBD_COVERAGE_TRAJECTORY_SIGNAL_PROMOTION_DECISION.md).
That decision promotes docs-only aggregate methodology terms and grants no
runtime or product authority.

James Kelley separately approved synthetic-only steps 5 through 8 on
2026-08-11. The isolated aggregate joint model and bounded smoke matrix now
exist, and the replicated validation protocol is frozen, but the current
decision remains `HOLD_FOR_MODEL_REPAIR`. The protocol has not run. This does
not approve real data, runtime integration, or product output.

It does **not** authorize:

- changes to the nine canonical events or five suppression reasons;
- new runtime schemas, routes, APIs, model execution, or customer output;
- live connectors, private data, credentials, or source-system execution;
- customer-facing causal, productivity, ROI, ranking, or maturity claims;
- use of exploratory dogfood results as admitted evidence.

The existing frequency/engagement/Breadth trajectory research and weighted VBD
frontend remain unchanged until a later exact-scope implementation decision
supersedes them. Their current outputs must not be presented as implementations
of this concept.

## Proposed direction summary

Under this approved docs-only direction, FluencyTracr distinguishes three
independent evidence lanes:

1. **AI Fluency:** aggregate human-capability and perception evidence.
2. **VBD Coverage Trajectory:** aggregate evidence that AI-supported work is
   becoming active, repeated, and embedded.
3. **Targeted Metric Trajectory:** longitudinal evidence about movement in a
   predeclared customer-owned business or operational metric.

The lanes may be interpreted together by the evidence-qualification layer, but
they must not be averaged, weighted, or collapsed into an overall score.

The VBD trajectory remains deterministic at its product boundary. A future
joint Bayesian research model may connect the three lanes without collapsing
them. It must contain a separate aggregate family-state transition component
for VBD, a measurement component for stated capability, and an outcome
component for the customer-owned metric. Uncertainty must pass between those
components. The model cannot reuse the existing frequency, engagement, and
Breadth likelihood by relabeling its inputs.

The joint model is intended to answer whether observed AI-enabled work adds
explanatory and predictive information about outcome movement, and whether
stated capability qualifies that relationship. Under the default claim cap,
that relationship is associative, not causal.

### Current repository state versus proposed destination

| Lane | Current repository state | Proposed destination |
| --- | --- | --- |
| AI Fluency | Synthetic calibration accepted; real-data admission and product output remain blocked. | Aggregate human-capability context admitted under its own future contract. |
| VBD | Weighted frontend is illustrative; frequency/engagement/Breadth Bayesian research is held and has a different estimand. | Deterministic family-count Coverage Trajectory plus a separately designed, aggregate family-state Bayesian component after implementation approval. |
| Targeted metric | Longitudinal admission is contract-stage and limited to a narrow synthetic continuous-normal proof; model output is not authorized. | Governed longitudinal change estimation for explicitly supported metric families and study designs. |
| Evidence qualification | Multiple internal contract and projection layers exist; broader customer model output remains gated. | Alignment, claim ceiling, caveats, and next evidence action without a combined score. |

The architecture below is a destination model, not a diagram of currently
integrated runtime capability.

## Product boundary

FluencyTracr is not intended to duplicate an upstream measurement data plane.
It should consume governed aggregate evidence produced by telemetry, artifact,
action, quality, cost, and customer-metric systems.

The intended division of responsibility is:

```text
Upstream measurement data plane
telemetry, actions, artifacts, quality, costs, metric feeds,
intervention timing, comparator definitions, study metadata
                              |
                              v
Governed aggregate evidence packages
                              |
              +---------------+----------------+
              |               |                |
              v               v                v
        AI Fluency       VBD Coverage      Targeted Metric
       capability lane  behavior pathway   outcome trajectory
              |               |                |
              +---------------+----------------+
                              |
                   future joint Bayesian model
                 separate measurement components
                  with uncertainty propagation
                              |
                              v
FluencyTracr evidence qualification
admission, suppression, alignment, claim ceiling, caveats,
next evidence action, intervention routing, executive readout
```

Upstream systems own source instrumentation and source-level measurement.
FluencyTracr owns the bounded decision about what the admitted aggregate
evidence can responsibly support.

## Reporting units

The primary reporting unit is:

```text
Organization x Eligibility universe x Measurement window
```

A future function drilldown would use:

```text
Organization x Approved function x Eligibility universe x Measurement window
```

Function drilldowns remain **held** until FluencyTracr approves an aggregate
function join, function taxonomy, and independent suppression design. The
standalone prototype's function taxonomy is a candidate input, not a canonical
FluencyTracr contract.

The organization trajectory must be separately supplied against a complete,
deduplicated organization family universe. It must never be calculated by
averaging or summing function percentages.

If later approved, functions are contextual drilldowns in an approved stable
order. They are not rankings, benchmarks, maturity grades, or comparative
performance groups.

### Canonical slice and derived-scope boundary

This proposal does not bypass independent suppression at the repository's
canonical `(workflow_id, jbtd_id, persona_id)` slice. A future family or
function producer must prove all of the following before a derived value may
surface:

- every contributing canonical slice independently cleared its gates;
- a surfaced slice cannot rescue, impute, or reveal a suppressed slice;
- family identity and root allocation prevent duplicate qualification;
- complementary organization/function views cannot reveal a held small group;
- the derived scope independently satisfies its compiled privacy minimum;
- complete eligible, active, and embedded counts can be computed without using
  held evidence as zero or as negative evidence.

If that proof is absent, the derived metric is unavailable and the plotted path
breaks. Family-to-canonical-slice reconciliation is an unresolved blocking
contract decision, not an implementation detail.

## Vocabulary reconciliation

FluencyTracr already uses **Breadth** for distinct AI surfaces touched and
**Depth** for cross-surface repertoire and integration qualified by behavioral
evidence. This proposal therefore retains **VBD Coverage Trajectory** only as
the umbrella name and gives its family-funnel ratios distinct names:

- **Adoption Reach** for `Active / Eligible`;
- **Persistence** for `Embedded / Active`;
- **Velocity Index Breadth** remains the existing distinct-surfaces concept;
- **Depth Repertoire** remains the existing cross-surface integration concept.

Adoption Reach and Persistence are supporting funnel ratios. They do not
redefine canonical Velocity, Breadth, or Depth, and they must not be exported
under ambiguous `breadth` or `depth` field names.

Approval of this proposal would not silently redefine existing events,
contracts, schemas, or historical outputs. A later reconciliation must rename,
retire, or version every ambiguous field before runtime migration.

## Work-pattern family funnel

A governed work-pattern family is the metric unit beneath an organization or
function scope. Registered workflows are evidence beneath a family; workflow
identifiers are not the denominator.

For each scope and checkpoint:

```text
Eligible work-pattern families
        |
        v
Active work-pattern families
        |
        v
Embedded work-pattern families
```

The required count invariant is:

```text
0 <= Embedded <= Active <= Eligible
Eligible > 0
```

One stable eligibility count and universe binding must apply across the
trajectory being compared.

`Eligible > 0` is a hard availability condition for Adoption Reach and
Coverage. A zero Eligible count makes every ratio and dependent velocity
unavailable; it must not be coerced to zero or treated as evidence of no
adoption.

### Observable source universe

The observable source universe must also remain stable across every compared
checkpoint. Each checkpoint and transition must carry one source-coverage
receipt that binds:

- the governed source adapters and source revisions;
- the observable AI surfaces, workflows, and family mappings;
- the required feeds and their completeness state;
- the instrumentation and qualification-policy versions; and
- the exact measurement window covered by each source.

Adding a connector, instrumenting another surface, changing a source-to-family
mapping, or losing required coverage can change Active and Embedded counts even
when behavior is unchanged. Such a change starts a new trajectory segment. It
must never be interpreted as adoption movement, backfilled into an earlier
checkpoint, or normalized away. If stable source coverage cannot be proven,
the plotted path breaks and all dependent transition metrics are unavailable.

### Eligible

A family is Eligible when a governed, prospectively frozen registry declares it
within the scope's opportunity universe. Eligibility must not be selected from
run outcomes, observed usage, model confidence, performance, or post-period
results.

### Active

A family is Active when admitted aggregate evidence from the frozen observable
source universe records qualifying activity in the current checkpoint.

### Embedded

A family is Embedded only when admitted evidence proves that the **same frozen
family** qualified in the current and two immediately preceding contiguous,
finalized windows under one declared cadence, recurrence policy, eligibility
universe, observable source universe, compatible semantic-policy version, and
completion definition. The recurrence receipt must bind the exact checkpoint
evidence and source-coverage revision for each contributing window.

The aggregate count must satisfy:

```text
Embedded_t <= min(Active_t-2, Active_t-1, Active_t)
```

That bound is necessary but does not prove same-family set intersection. A
producer must prove the intersection or supply an authenticated aggregate
recurrence result derived from it. Count coincidence, mixed cadence policies,
non-final windows, or changing family semantics make Embedded and all dependent
metrics unavailable rather than zero.

## Metrics

### Adoption Reach

```text
Adoption Reach = Active / Eligible
```

Adoption Reach answers:

> How much of the expected AI-supported work appeared at least once in this
> checkpoint?

### Persistence

```text
Persistence = Embedded / Active
```

Persistence is available only when `Active > 0`. When `Active = 0`, Persistence
is `null`. It is denominator-sensitive supporting context and must not be
presented as independent progress or intensity.

Persistence answers:

> Of the work that appeared in this checkpoint, how much also met the recurrence
> rule?

### Embedded Adoption Coverage

```text
Coverage = Embedded / Eligible
```

When `Active > 0`, Coverage is algebraically equivalent to:

```text
Adoption Reach x Persistence
```

before display rounding. Coverage is movement toward embedded adoption; it is
not proof or declaration of full adoption.

Coverage answers:

> How much of the expected AI-supported work is happening repeatedly?

### Net Coverage Velocity

```text
Net Coverage Velocity =
  (Coverage_current - Coverage_previous)
  x 100
  x (30 / actual_days_between_checkpoints)
```

The unit is percentage points per 30 days. Net Coverage Velocity is available only
for adjacent, contiguous, finalized checkpoints with the same schedule policy,
recurrence horizon, eligibility universe, observable source universe, and
compatible semantic-policy version. The velocity receipt must bind both
endpoint checkpoint evidence and source-coverage revisions.
Correcting or reissuing a checkpoint invalidates every dependent recurrence and
velocity transition until each is recomputed and rebound. Actual-day
normalization proves rate arithmetic; it does not make different cadence or
qualification policies semantically comparable.

Net Coverage Velocity is the primary trajectory axis. Adoption Reach Change may
remain an early supporting indicator, but it is not evidence of recurrence and
must not replace Net Coverage Velocity.

Net Coverage Velocity answers:

> Is repeated use expanding or contracting relative to the previous checkpoint?

### Embedded-family transition decomposition

Net movement can conceal churn. Every surfaced Net Coverage Velocity transition
must therefore include privacy-safe aggregate counts for:

```text
Retained Embedded = count of families embedded in both checkpoints
Newly Embedded    = count embedded now but not previously
Lapsed Embedded   = count embedded previously but not now
```

The transition must satisfy:

```text
Retained Embedded + Newly Embedded = Embedded_current
Retained Embedded + Lapsed Embedded = Embedded_previous
Net Embedded Change = Newly Embedded - Lapsed Embedded
```

The producer must compute these counts from the same frozen family identities
without emitting family-level rows or identifiers. Each count remains subject
to the aggregate privacy and suppression boundary. If the complete retained,
newly embedded, and lapsed decomposition cannot surface safely, the net
transition and Net Coverage Velocity are unavailable rather than presented as
a churn-free result.

## Primary product geometry

The primary VBD visualization is:

```text
X-axis: Embedded Adoption Coverage
Y-axis: Net Coverage Velocity
```

The visual uses `0 pp/30d Net Coverage Velocity` as a neutral direction
reference. A `50% Coverage` visual midpoint is not approved by this proposal;
if a later UI
decision retains it, it must remain an explicitly non-statistical visual guide
with no effect on labels, eligibility, interpretation, or claims. Neither line
is a target, threshold, grade, stage, benchmark, or named quadrant.

Adoption Reach, Persistence, and the embedded-family transition decomposition
remain visible as supporting metrics. There is no weighted Integration score
and no overall VBD score.

## Availability and suppression

Availability is metric-specific. A checkpoint may have Adoption Reach while
Embedded, Persistence, Coverage, or Net Coverage Velocity is held.

Zero Active does not itself authorize zero Coverage. Coverage may be published
as zero only after eligibility, recurrence, completeness, finality, revision,
and suppression gates clear and the admitted Embedded count is exactly zero.
If Embedded evidence is unavailable, Coverage and Net Coverage Velocity remain
unavailable.

The product must preserve explicit states for:

- unavailable evidence;
- warm-up windows;
- held or suppressed evidence;
- unsupported recurrence;
- not-computed values;
- zero Active with `Persistence = null`;
- invalid denominator or registry bindings;
- changed or incomplete observable source coverage;
- incomplete retained/newly embedded/lapsed transition evidence;
- broken adjacent-window continuity.

Held or unavailable checkpoints must break the plotted trajectory. Missing
values must never be inferred as zero.

The repository's canonical suppression rules continue to apply independently
at their governed slice boundary. This concept does not add a suppression
reason or authorize cross-slice joins that could re-identify people.

## Longitudinal Bayesian role

The docs-only joint methodology is defined in
[`docs/contracts/ai-value-vbd-human-behavior-outcome-joint-methodology/README.md`](../contracts/ai-value-vbd-human-behavior-outcome-joint-methodology/README.md).

### Human-behavior pathway

The future joint model must represent observed behavior from the admitted
family-state counts, not from an overall VBD score. Its behavioral measurement
component uses:

- the fixed Eligible universe;
- Active and Embedded counts at each checkpoint; and
- retained, newly embedded, and lapsed counts between checkpoints.

Those counts identify a transition process between embedded and nonembedded
family states and an active-nonembedded state. Retention and new-embedding
rates inform the latent Embedded Coverage trajectory. They are not additional
outcome predictors when they are algebraically represented by the same state
transition.

The outcome component may use the uncertain lagged embedded state and, when
predeclared, the active-nonembedded state. It may also use one predeclared
aggregate stated-capability factor with admitted measurement uncertainty and a
predeclared capability-by-behavior interaction. It must not treat Adoption
Reach, Persistence, Coverage, Net Coverage Velocity, and their component counts
as independent predictors in the same equation.

When a capability snapshot temporally precedes a behavior transition, the
family-state component may also estimate the predeclared association between
stated capability and later retention, new embedding, or active-nonembedded
behavior. This is the modeled capability-to-behavior link. It remains
associative unless a later identification design authorizes a stronger claim.

### Candidate internal estimands

A future admitted joint component may evaluate a predeclared targeted metric
under a governed study design. It may estimate only quantities authorized by
its metric-family and study-design contract, such as:

- direction and magnitude of metric movement;
- the lagged association between the modeled behavior state and the outcome;
- the association between stated capability and later behavior transitions;
- whether a predeclared stated-capability factor moderates that association;
- posterior uncertainty and credible intervals for internal review;
- the incremental predictive contribution of the behavior pathway under a
  frozen full-versus-restricted model comparison;
- modeled difference between observed and counterfactual trajectories when a
  credible comparator design exists.

Incremental predictive contribution may be summarized internally through a
predeclared change in Bayesian R-squared and future-window predictive fit. It
is not a unique share of variance caused by AI, a percentage of business
impact, or evidence about why the metric changed. Shared causes, measurement
error, interactions, and collinearity prevent that interpretation.

A customer-declared `minimum_worthwhile_change` or similar planning field must
not set a posterior threshold, decision statistic, surfacing rule, or other
statistical quantity under the current repository contract.

Examples of targeted metrics include cycle time, resolution time, conversion,
rework, quality, escalation, completion, or customer-experience measures. The
metric definition, source, owner, expected direction, intervention timing,
window, and comparator must be declared before interpretation.

### Claim ceiling

A longitudinal trend without a credible comparator can support descriptive or
associative language only. It does not prove AI caused the movement.

Future stronger causal interpretation would require a separately approved
identification design, potentially including randomized rollout, a credible
comparison group, difference in differences, interrupted time series, or
synthetic control. These examples are future design possibilities, not current
router support. Staggered rollout and other unsupported designs continue to
HOLD, and the current accepted proof remains limited to its documented narrow
synthetic continuous-normal specification.

The model must not turn posterior probability, a coefficient, a modeled
contrast, Bayesian R-squared, or predictive-fit improvement into any of the
following prohibited outputs: customer-facing attribution confidence, ROI,
productivity scoring, a percent impact statement, or a claim that AI caused an
outcome. A later governed contract would need to authorize the exact claim.

## Interpreting the three lanes

The evidence-qualification layer may describe alignment without averaging or
scoring the lanes. A future internal joint model may connect them only as
separately measured, predeclared terms under the contract above.

### Cross-lane alignment receipt

No row in the interpretation table may be used unless one alignment receipt
binds all three lanes to the same analytical question. The receipt must bind:

- the exact organization and approved aggregate cohort definition;
- the work-pattern family and workflow mapping;
- the baseline, comparison, and observation windows;
- the intervention exposure and timing, including an explicit no-intervention
  state when applicable;
- the targeted metric definition, unit, owner, direction, and revision;
- the VBD eligibility and observable source universes; and
- the exact evidence-package and checkpoint revisions used by every lane.

An explicit governed mapping is required when AI Fluency is collected for a
broader cohort than the workflow outcome. If cohort, family or workflow,
windows, exposure, metric definition, or evidence revisions do not align, the
lanes must be reported separately. Directional similarity alone must not be
described as aligned evidence.

| AI Fluency | VBD trajectory | Targeted metric | Bounded interpretation |
| --- | --- | --- | --- |
| Improving | Improving | Improving | Capability, adoption, and outcome evidence are directionally aligned. |
| Improving | Flat | Flat | Capability may not yet be translating into embedded work. |
| Flat | Improving | Improving | Adoption may be changing without corresponding perceived-capability movement. |
| Improving | Improving | Flat | Adoption is expanding, but the selected outcome has not shown corresponding movement. |
| Flat | Flat | Improving | The outcome moved, but current evidence does not connect that movement to AI adoption. |
| Unavailable | Improving | Improving | Behavioral and outcome evidence exist; no capability conclusion is available. |

These are diagnostic interpretations after the alignment receipt clears. They
are not maturity labels, rankings, causal claims, or evidence that one lane
produced movement in another.

## Relationship to existing FluencyTracr work

### Proposed replacement

This concept is intended to replace, after a separate implementation decision:

- hard-coded function coordinates;
- synthetic function lift factors;
- `Integration = 40% Breadth + 60% Depth`;
- weighted overall VBD posture;
- threshold-based or named quadrants;
- Velocity x Integration product geometry;
- function averaging as an organization result.

### Preserved foundations

The following FluencyTracr foundations remain applicable:

- aggregate-only privacy boundary;
- fail-closed admission and suppression;
- append-only evidence snapshots;
- source, revision, scope, and window bindings;
- candidate function-taxonomy work, subject to a future approved aggregate join;
- measurement-plan and targeted-metric workflow;
- posterior diagnostics and synthetic Bayesian validation infrastructure;
- claim ceilings, caveats, and next-evidence routing;
- separation of AI Fluency, observed behavior, and customer outcomes.

### Legacy research status

The existing frequency/engagement/Breadth Bayesian trajectory contract remains
held research. Its estimand and likelihood are not this VBD Coverage Trajectory.
Its three pending queue items remain dormant behind their recorded prerequisites
and separate human activation; the roadmap is retained as legacy planning
context, not as completed work or the runtime implementation of this replacement
concept.

## Implementation sequence

| Step | Scope | State |
| --- | --- | --- |
| 1 | Approve the methodology direction that VBD is the observed human-behavior pathway between stated capability and customer-owned outcomes. | `COMPLETE_DOCS_ONLY` |
| 2 | Reconcile vocabulary, the nine invariants, independent slice suppression, function-join HOLDs, legacy VBD versioning, evidence roles, and the noncausal default. | `COMPLETE_DOCS_ONLY` |
| 3 | Specify the aggregate checkpoint, transition, alignment, capability, outcome, and control data contract. | `COMPLETE_DOCS_ONLY` |
| 4 | Specify the joint Bayesian family-state measurement and outcome methodology, uncertainty propagation, estimands, model comparison, and claim ceiling. | `COMPLETE_DOCS_ONLY` |
| 5 | Implement internal aggregate types, deterministic preparation, and synthetic family-state fixtures under the separately proposed OpenSpec scope. | `COMPLETE_SYNTHETIC_ONLY` |
| 6 | Implement the synthetic joint family-state, stated-capability, and continuous-normal outcome model with internal-only summaries. | `COMPLETE_SYNTHETIC_ONLY` |
| 7 | Validate the synthetic joint model through recovery, calibration, sensitivity, negative-control, and full-versus-restricted predictive checks. | `BOUNDED_SMOKE_COMPLETE_FULL_VALIDATION_PENDING` |
| 8 | Record a governed integration decision for any future runtime, real aggregate data, API, persistence, or readout scope. | `HOLD_FOR_MODEL_REPAIR` |

Completing steps 1 through 4 did not satisfy or bypass any gate in steps 5
through 8. James Kelley approved planning and execution of steps 5 through 8
on 2026-08-11, bounded to synthetic aggregate work and an integration decision.
The bounded smoke result is recorded in
[`docs/research/VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_DECISION.md`](../research/VBD_HUMAN_BEHAVIOR_OUTCOME_SYNTHETIC_DECISION.md).
Smoke fits are permanently nonqualifying, and the current decision creates no
real-data or product authority.

No implementation step should silently copy exploratory dogfood denominators,
source names, query identifiers, job metadata, or observed values into universal
FluencyTracr contracts or fixtures.

## Current implementation truth

As of PR #485 head `c3734c7f6192918088b9fe2184620ff7b6620966`,
merged as `a6924e3e371428d955fe255ddee79e736228a9a4`:

- **Source disclosure:** James Kelley supplied the work-pattern-family adoption
  funnel and coverage-trajectory framing. A separate local-first prototype is
  reported to implement related formulas and governance rules, but its
  repository, source bytes, and results are unavailable here. No code, data,
  thresholds, or execution evidence were imported from it, and it grants no
  authority in FluencyTracr;
- the reusable V4 synthetic model path now preserves exact preparation
  provenance, deterministic slot seeds and settings, and fail-closed
  diagnostics while reaching the existing full joint likelihood;
- the replicated runner, claims, checkpoints, namespace combination, timeout
  supervision, and sanitized study artifact are removable validation
  scaffolding, not a sustained execution platform;
- the FluencyTracr runtime has **not** been migrated;
- the existing weighted VBD UI remains illustrative;
- the existing Bayesian VBD trajectory remains held research with a different
  estimand;
- exploratory source-taxonomy family evidence outside this repository remains
  unverified here and not admitted VBD;
- no authenticated producer, governed real organization registry, customer
  connector, causal output, ROI output, or production admission is authorized.

## Privacy lifecycle requirements

Any future source or derived feature must document approved purpose,
participant/customer disclosure where applicable, source-owner authorization,
data minimization, aggregate-only transfer, retention and deletion policy,
sunset criteria, and prevention of complementary differencing. The producer
must emit no identities, raw prompts, responses, transcripts, action rows, raw
events, or suppressed small-group values.

## Review questions

A collaborator reviewing this direction should focus on:

1. Is the work-pattern family the correct governed unit for adoption?
2. Is `Embedded / Eligible` the right primary adoption axis?
3. Is adjacent Coverage change the right primary net velocity definition, and
   are retained, newly embedded, and lapsed counts sufficient to expose churn?
4. What exact source-coverage receipt is required to prove trajectory
   comparability across checkpoints?
5. What aggregate recurrence or transition evidence is needed for valid
   uncertainty estimation?
6. Is the embedded-state plus active-nonembedded basis sufficient to represent
   observed behavior without creating an overall VBD score?
7. Which cross-lane bindings are required before capability, adoption, and
   outcome movement may be interpreted together?
8. Which targeted customer metrics and counterfactual designs are credible for
   longitudinal Bayesian analysis?
9. What evidence would be required before an associative modeled contrast could
   support a stronger contribution or causal claim?
