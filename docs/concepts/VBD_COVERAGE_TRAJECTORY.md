# VBD Coverage Trajectory

## Status

`PROPOSED_REPLACEMENT_CONCEPT_NOT_RUNTIME`

This document proposes a candidate product direction for replacing
FluencyTracr's illustrative weighted VBD posture with a governed work-pattern
adoption trajectory. It is a documentation-stage proposal awaiting explicit
methodology approval.

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

If approved, FluencyTracr would distinguish three independent evidence lanes:

1. **AI Fluency:** aggregate human-capability and perception evidence.
2. **VBD Coverage Trajectory:** aggregate evidence that AI-supported work is
   becoming active, repeated, and embedded.
3. **Targeted Metric Trajectory:** longitudinal evidence about movement in a
   predeclared customer-owned business or operational metric.

The lanes may be interpreted together by the evidence-qualification layer, but
they must not be averaged, weighted, or collapsed into an overall score.

The proposed VBD trajectory is deterministic at its product boundary.
Longitudinal Bayesian modeling belongs primarily in the targeted-metric lane,
where a future admitted implementation may estimate change and uncertainty
under an explicitly governed study design. An optional future Bayesian VBD
component would need a separate family-state observation model; it cannot reuse
the existing frequency/engagement/Breadth likelihood by relabeling its inputs.

### Current repository state versus proposed destination

| Lane | Current repository state | Proposed destination |
| --- | --- | --- |
| AI Fluency | Synthetic calibration accepted; real-data admission and product output remain blocked. | Aggregate human-capability context admitted under its own future contract. |
| VBD | Weighted frontend is illustrative; frequency/engagement/Breadth Bayesian research is held and has a different estimand. | Deterministic family-count Coverage Trajectory after methodology, registry, suppression, and producer approval. |
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
       capability lane  adoption trajectory outcome trajectory
              |               |                |
              |               |          longitudinal Bayesian
              |               |           change estimation
              +---------------+----------------+
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

FluencyTracr currently uses **Breadth** for distinct AI surfaces touched and
**Depth** for cross-surface repertoire and integration qualified by behavioral
evidence. This proposal uses the same product letters for different family
ratios. Until an explicit supersession decision resolves the collision, all new
work must use the qualified names:

- **VBD Family Breadth** for `Active / Eligible`;
- **VBD Family Depth** for `Embedded / Active`;
- **Velocity Index Breadth** for the existing distinct-surfaces concept;
- **Depth Repertoire** for the existing cross-surface integration concept.

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
Embedded <= Active <= Eligible
```

One stable eligibility count and universe binding must apply across the
trajectory being compared.

### Eligible

A family is Eligible when a governed, prospectively frozen registry declares it
within the scope's opportunity universe. Eligibility must not be selected from
run outcomes, observed usage, model confidence, performance, or post-period
results.

### Active

A family is Active when admitted aggregate evidence records qualifying activity
in the current checkpoint.

### Embedded

A family is Embedded only when admitted evidence proves that the **same frozen
family** qualified in the current and two immediately preceding contiguous,
finalized windows under one declared cadence, recurrence policy, universe,
compatible semantic-policy version, and completion definition. The recurrence
receipt must bind the exact checkpoint evidence revision for each contributing
window.

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

### VBD Family Breadth

```text
VBD Family Breadth = Active / Eligible
```

VBD Family Breadth answers:

> How much of the expected AI-supported work appeared at least once in this
> checkpoint?

### VBD Family Depth

```text
VBD Family Depth = Embedded / Active
```

VBD Family Depth is available only when `Active > 0`. When `Active = 0`, VBD
Family Depth is `null`. It is denominator-sensitive supporting context and must
not be presented as independent progress or intensity.

VBD Family Depth answers:

> Of the work that appeared in this checkpoint, how much also met the recurrence
> rule?

### Embedded Adoption Coverage

```text
Coverage = Embedded / Eligible
```

When `Active > 0`, Coverage is algebraically equivalent to:

```text
VBD Family Breadth x VBD Family Depth
```

before display rounding. Coverage is movement toward embedded adoption; it is
not proof or declaration of full adoption.

Coverage answers:

> How much of the expected AI-supported work is happening repeatedly?

### Coverage Velocity

```text
Coverage Velocity =
  (Coverage_current - Coverage_previous)
  x (30 / actual_days_between_checkpoints)
```

The unit is percentage points per 30 days. Coverage Velocity is available only
for adjacent, contiguous, finalized checkpoints with the same schedule policy,
recurrence horizon, universe, and compatible semantic-policy version. The
velocity receipt must bind both endpoint checkpoint evidence revisions.
Correcting or reissuing a checkpoint invalidates every dependent recurrence and
velocity transition until each is recomputed and rebound. Actual-day
normalization proves rate arithmetic; it does not make different cadence or
qualification policies semantically comparable.

Coverage Velocity is the primary trajectory axis. VBD Family Breadth Change may
remain an early supporting indicator, but it is not evidence of recurrence and
must not replace Coverage Velocity.

Coverage Velocity answers:

> Is repeated use expanding or contracting relative to the previous checkpoint?

## Primary product geometry

The primary VBD visualization is:

```text
X-axis: Embedded Adoption Coverage
Y-axis: Coverage Velocity
```

The visual uses `0 pp/30d Velocity` as a neutral direction reference. A `50%
Coverage` visual midpoint is not approved by this proposal; if a later UI
decision retains it, it must remain an explicitly non-statistical visual guide
with no effect on labels, eligibility, interpretation, or claims. Neither line
is a target, threshold, grade, stage, benchmark, or named quadrant.

VBD Family Breadth and VBD Family Depth remain visible as separate supporting
metrics. There is no weighted Integration score and no overall VBD score.

## Availability and suppression

Availability is metric-specific. A checkpoint may have VBD Family Breadth while
Embedded, VBD Family Depth, Coverage, or Velocity is held.

Zero Active does not itself authorize zero Coverage. Coverage may be published
as zero only after eligibility, recurrence, completeness, finality, revision,
and suppression gates clear and the admitted Embedded count is exactly zero.
If Embedded evidence is unavailable, Coverage and Velocity remain unavailable.

The product must preserve explicit states for:

- unavailable evidence;
- warm-up windows;
- held or suppressed evidence;
- unsupported recurrence;
- not-computed values;
- zero Active with `VBD Family Depth = null`;
- invalid denominator or registry bindings;
- broken adjacent-window continuity.

Held or unavailable checkpoints must break the plotted trajectory. Missing
values must never be inferred as zero.

The repository's canonical suppression rules continue to apply independently
at their governed slice boundary. This concept does not add a suppression
reason or authorize cross-slice joins that could re-identify people.

## Longitudinal Bayesian role

### Future candidate model outputs

A future admitted longitudinal Bayesian component may evaluate a predeclared
targeted metric under a governed study design. It may estimate only quantities
authorized by its metric-family and study-design contract, such as:

- direction and magnitude of metric movement;
- posterior uncertainty and credible intervals;
- stability across checkpoints;
- sensitivity to preapproved specifications;
- modeled difference between observed and counterfactual trajectories when a
  credible comparator design exists.

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

The model must not turn posterior probability into customer-facing attribution
confidence, ROI, productivity scoring, or a claim that AI caused an outcome
unless a later governed contract explicitly authorizes that exact claim.

## Interpreting the three lanes

The evidence-qualification layer may describe alignment without combining the
lanes mathematically.

| AI Fluency | VBD trajectory | Targeted metric | Bounded interpretation |
| --- | --- | --- | --- |
| Improving | Improving | Improving | Capability, adoption, and outcome evidence are directionally aligned. |
| Improving | Flat | Flat | Capability may not yet be translating into embedded work. |
| Flat | Improving | Improving | Adoption may be changing without corresponding perceived-capability movement. |
| Improving | Improving | Flat | Adoption is expanding, but the selected outcome has not shown corresponding movement. |
| Flat | Flat | Improving | The outcome moved, but current evidence does not connect that movement to AI adoption. |
| Unavailable | Improving | Improving | Behavioral and outcome evidence exist; no capability conclusion is available. |

These are diagnostic interpretations, not maturity labels or rankings.

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
It may remain available as historical research evidence, but it must not be
presented as the runtime implementation of this replacement concept.

## Implementation sequence

The smallest safe migration is:

1. **Concept decision:** review and explicitly approve, reject, or revise this
   replacement direction.
2. **Vocabulary and invariant reconciliation:** resolve Breadth/Depth naming,
   canonical event compatibility, independent slice suppression, function-join
   HOLDs, and legacy-contract versioning.
3. **Producer contract:** define qualifying activity, immutable family identity,
   root allocation, registry and universe bindings, recurrence intersection,
   cadence, finality, compatible semantic-policy versions, checkpoint evidence
   revision chains and correction invalidation, privacy lifecycle, and source
   receipts.
4. **Synthetic evaluator:** after those contracts are fixed, implement the
   deterministic family-count evaluator using serialized aggregate-only fixtures.
5. **Synthetic organization UI:** render organization-first Coverage x Coverage
   Velocity with explicit availability states. Function drilldowns remain held
   until their aggregate join and suppression proof are approved.
6. **Targeted-metric Bayesian separation:** retain or adapt longitudinal model
   infrastructure only for currently supported synthetic specifications, then
   promote additional metric families or study designs through separate gates.
7. **Synthetic concordance:** prove formulas, trajectory breaks, recurrence
   bounds, suppression propagation, and UI projection against frozen fixtures.
8. **Private-data decision:** only then consider an approved aggregate producer
   or real-source pilot.

No implementation step should silently copy exploratory dogfood denominators,
source names, query identifiers, job metadata, or observed values into universal
FluencyTracr contracts or fixtures.

## Current implementation truth

As of this proposal:

- a separate local-first prototype is reported to implement and test related
  formulas and governance rules, but that evidence is not contained in or
  independently verifiable from this repository and grants no authority here;
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
3. Is adjacent Coverage change the right primary velocity definition?
4. What aggregate recurrence or transition evidence is needed for valid
   uncertainty estimation?
5. Which targeted customer metrics and counterfactual designs are credible for
   longitudinal Bayesian impact analysis?
6. Which upstream aggregate measurements should be consumed rather than rebuilt?
7. What evidence is required before descriptive movement can support a stronger
   contribution or causal claim?
