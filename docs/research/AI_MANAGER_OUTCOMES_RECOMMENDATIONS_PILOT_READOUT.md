# AI Manager Outcomes Recommendations Pilot Readout

## Purpose

This readout manually applies the AI Manager Outcomes Recommendations model to
the current internal AI Work Evidence pilot packet.

It tests whether the model gives executives a clearer next step:

```text
Which internal outcome data should we connect next to test value?
```

It does not implement runtime logic, schemas, APIs, SQL, new canonical events,
new suppression reasons, ROI calculation, causality, productivity measurement,
person assessment, comparative group evaluation, manager-group comparison, or
customer-facing economic output.

## Source Context

Internal pilot packet:

- `dogfood-output/internal-pilot-packet-2026-05-28/episode_journey_microcosm_full_run.aggregate.csv`
- `output/internal-pilot-packet-2026-05-28/FluencyTracr_Internal_Pilot_Report.md`
- `output/internal-pilot-packet-2026-05-28/FluencyTracr_Internal_Pilot_Deck.pptx`
- `output/internal-pilot-packet-2026-05-28/FluencyTracr_Pilot_Decision_Memo.md`

Fresh aggregate AI work pattern totals from the internal pilot:

| AI-service workflow family | AI work pattern tier | Aggregate work patterns | Interpretation |
| --- | --- | ---: | --- |
| Assistive search or answer surface | High Volume Assistive Surface | 25,081 | Broad AI presence, weak workflow value evidence by itself. |
| Search-to-agent workflow | Post Friction Continuation | 891 | Recovery-like continuation worth testing against friction or completion outcomes. |
| Agent or action execution workflow | Execution Linked Workflow | 478 | AI appears attached to workflow execution. |
| Search-to-agent workflow | Search To Agent Escalation | 442 | Work moved from search into agent context. |
| Source-linkage or boundary repair | Weak Linkage Context | 388 | Source coverage or attribution needs repair. |
| Verification or feedback-attached workflow | Verification Attached Workflow | 214 | Strongest trust-adjacent workflow lane. |
| Residual linked context | Other Linked Context | 96 | Residual linked context. |

Existing V4 readout context:

- trust-evidence gap remains the largest lane;
- scale-candidate rows remain the clearest scale-and-measure population;
- outcome and customer-owned assumption data remain missing or held;
- skill-read parent join coverage is strong in retained exports, but still
  subject to governance caveats.

These AI-service workflow families incorporate the service-level findings from
the episode journey run. They are explanatory context only. They do not add a
canonical event, suppression reason, score, taxonomy requirement, or
customer-facing value claim.

## Recommendation 1: Support Friction Value Test

Observed pattern:

Search-to-agent escalation and post-friction continuation appear in the fresh
aggregate run.

Likely value routes:

- `COST_REDUCTION`;
- `EXPERIENCE_IMPROVEMENT`;
- `QUALITY_IMPROVEMENT` where reopen or escalation outcomes exist.

Recommended outcome data:

- resolution time;
- escalation rate;
- reopen rate;
- support backlog movement;
- CSAT or support sentiment, if already governed and aggregate-safe.

Recommended source type:

- support system.

Formula template:

```text
Resolution movement =
baseline median resolution time
minus AI-assisted median resolution time
```

```text
Friction movement =
baseline escalation or reopen rate
minus AI-assisted escalation or reopen rate
```

Readiness:

`OUTCOME_EVIDENCE_MISSING`

Boundary:

This would test whether AI-assisted support workflows align with lower
friction. It would not prove AI caused the movement without an approved
aggregate attribution design.

## Recommendation 2: Workflow Execution Capacity Test

Observed pattern:

Execution-linked workflow patterns appear in the fresh aggregate run.

Likely value routes:

- `CAPACITY_CREATION`;
- `COST_REDUCTION`;
- `REVENUE_EXPANSION` if the workflow is sales or pipeline-related.

Recommended outcome data:

- completed work volume;
- cycle time;
- backlog movement;
- stage progression where the workflow belongs to CRM or revenue operations.

Recommended source types:

- operations or workflow system;
- CRM for revenue workflows;
- support system for support workflows.

Formula template:

```text
Throughput movement =
AI-assisted completed work per period
minus baseline completed work per period
```

```text
Cycle-time movement =
baseline median workflow cycle time
minus AI-assisted median workflow cycle time
```

Readiness:

`OUTCOME_EVIDENCE_MISSING`

Boundary:

This tests whether execution-linked AI use is associated with more completed
work or faster workflow movement. It does not calculate productivity or ROI.

## Recommendation 3: Verification Quality And Risk Test

Observed pattern:

Verification-attached workflow patterns appear in the fresh aggregate run, while
trust attribution remains a major product problem in the wider V4 exports.

Likely value routes:

- `QUALITY_IMPROVEMENT`;
- `RISK_REDUCTION`.

Recommended outcome data:

- QA pass rate;
- defect rate;
- correction rate;
- reopen rate;
- approval coverage;
- audit exception rate.

Recommended source types:

- QA or review system;
- support system;
- governance or audit system where already approved and aggregate-safe.

Formula template:

```text
Quality movement =
baseline defect, reopen, correction, or QA-fail rate
minus AI-assisted defect, reopen, correction, or QA-fail rate
```

```text
Exception movement =
baseline policy exception rate
minus AI-assisted policy exception rate
```

Readiness:

`TRUST_ATTRIBUTION_HOLD`

Boundary:

This is a strong candidate once verification can be attached to parent
workflow paths. It should not rely on citation clicks alone and should not
infer trust from missing citation behavior.

## Recommendation 4: Onboarding Or Ramp Evidence Test

Observed pattern:

The current pilot packet can identify aggregate AI surfaces, repeat-use
patterns, source coverage, and workflow paths. If a customer sees these
patterns in onboarding, help, or knowledge-discovery workflows, the next
internal outcome source can be onboarding milestones.

Likely value routes:

- `CAPACITY_CREATION`;
- `EXPERIENCE_IMPROVEMENT`;
- `COST_REDUCTION`.

Recommended outcome data:

- time to first approved milestone;
- time to role readiness milestone;
- onboarding support-ticket volume;
- help-request rate;
- completion of customer-declared onboarding steps.

Recommended source types:

- onboarding system;
- help system;
- learning system, only when customer-approved and aggregate-safe;
- HRIS only for approved aggregate milestones or segment labels, never
  person-level rows.

Formula template:

```text
Ramp movement =
baseline median days to approved onboarding milestone
minus AI-assisted median days to the same milestone
```

Readiness:

`RESEARCH_ONLY`

Boundary:

This is valuable as a customer pilot option, but it is not supported by the
current internal packet unless the customer has a governed aggregate
onboarding milestone export.

## Recommendation 5: Trust Evidence Repair Before Economic Test

Observed pattern:

The larger V4 packet shows trust-evidence gap as the dominant lane. The fresh
pilot also separates weak linkage context from stronger verification-attached
workflow evidence.

Likely value routes:

- `RISK_REDUCTION`;
- `QUALITY_IMPROVEMENT`, held until trust attribution improves.

Recommended outcome data:

- verification coverage;
- feedback-loop coverage;
- correction or override rate;
- unresolved trust-gap rate;
- source coverage and attribution completeness.

Recommended source types:

- AI telemetry source;
- QA or review system;
- governance system where already approved and aggregate-safe.

Formula template:

```text
Trust coverage =
verified, approved, corrected, recovered, or feedback-attached episodes
divided by interpretable AI work episodes
```

Readiness:

`SOURCE_COVERAGE_HOLD`

Boundary:

This should be presented as a proof-loop repair agenda. It is not an
economic-value test yet.

## Executive Implication

The model strengthens the product because it changes the end of a FluencyTracr
run from:

```text
Here is what AI activity looked like.
```

to:

```text
Here is the smallest internal outcome evidence needed to test whether that AI
activity matters economically.
```

The strongest commercial claim is:

```text
FluencyTracr recommends the customer-owned outcome signals and aggregate
testing formulas needed to investigate cost, revenue, quality, capacity, risk,
or experience value routes.
```

Blocked claims remain:

- ROI calculation;
- causal impact;
- productivity lift;
- employee assessment;
- comparative group evaluation;
- manager-group comparison;
- department ranking;
- HR surveillance;
- broad required client data access at pilot start.

## Decision

Recommendation:

`PROMOTE_DOCS_ONLY_CONTRACT_HARDENING`

Rationale:

- the model is source-neutral;
- it makes the executive packet more useful;
- it preserves the aggregate-only and fail-closed posture;
- it does not require customer outcome data before the first pilot;
- it creates a clear next data ask after observed AI Work Evidence exists.

Held scope:

- runtime implementation;
- schemas;
- APIs;
- automated recommendation engine;
- formula execution;
- outcome joins;
- ROI calculation;
- customer-facing economic claims.
