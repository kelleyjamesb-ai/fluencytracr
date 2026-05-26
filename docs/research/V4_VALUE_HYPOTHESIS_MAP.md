# V4 Value Hypothesis Map

## Purpose

This document completes Workstream 3 from
[V4 Next Sprint Plan](./V4_NEXT_SPRINT_PLAN.md).

It maps aggregate V4 behavior evidence into non-dollarized AIVM value
hypotheses. A value hypothesis is a question worth investigating with the
customer. It is not economic proof, ROI, causality, prediction, productivity
measurement, or a customer-facing economic readout.

## Scope

The map may use:

- the [V4 Readout Zone Model](./V4_READOUT_ZONE_MODEL.md),
- promoted internal Velocity band and Depth Repertoire band,
- Reliability Factor and Quality Multiplier context where already aligned,
- trust attribution context where available,
- customer-owned outcome evidence when separately provided,
- customer-owned assumptions recorded outside FluencyTracr behavior evidence.

The map must not upgrade suppressed or held evidence. It must not attach dollars
to behavior-only observations.

## Hypothesis Rules

Every value hypothesis must carry:

- evidence basis,
- missing evidence,
- caveats,
- required customer-owned assumptions,
- required aggregate outcome evidence,
- blocked claims.

No hypothesis may include:

- dollars,
- ROI,
- guaranteed savings,
- causality,
- prediction,
- productivity lift,
- individual attribution,
- ranking of people, teams, departments, customers, managers, or skills,
- stronger status for a suppressed or held row.

## Zone To Hypothesis Map

| Zone or evidence pattern | Allowed AIVM hypothesis | Required next evidence | Allowed next action |
| --- | --- | --- | --- |
| `SCALE_CANDIDATE` with stable Velocity, stable Depth Repertoire, and usable reliability context. | `ACCELERATION` candidate, or `QUALITY_PREMIUM` candidate if quality evidence is present. | Customer-owned baseline cycle time, workflow volume, review-pass rate, quality KPI, or accepted outcome template. | Run a business-owned value investigation with explicit assumptions and caveats. |
| `FOCUSED_EXPERT_USE` with strong Depth Repertoire in a narrower aggregate pocket. | `NET_NEW` candidate if the business owner confirms a new workflow; `QUALITY_PREMIUM` candidate if the outcome is better work quality. | Business owner confirmation, aggregate outcome evidence, workflow context, and decision on whether to expand. | Study the workflow and decide whether expansion is plausible. |
| `SHALLOW_ADOPTION` with high activity but weak Depth, reliability, recovery, verification, or trust context. | `UNCLASSIFIED`; possible friction or enablement investigation. | Verification evidence, recovery evidence, trust attribution, and customer-owned outcome evidence after workflow repair. | Improve usage quality before economic interpretation. |
| `TRUST_EVIDENCE_GAP` where activity or Depth exists but trust attribution is missing, aliased, or held. | `UNCLASSIFIED`; possible trust-loop or review-quality investigation. | Strict attribution, feedback-loop coverage, verification evidence, and aggregate outcome evidence. | Repair trust evidence before value investigation. |
| `INSTRUMENTATION_HOLD`. | No value hypothesis beyond source-readiness remediation. | Required aggregate source coverage and key alignment. | Fix instrumentation. |
| `SUPPRESSED`. | No value hypothesis. | Eligible future window or repaired aggregate inputs that pass existing gates. | Do not interpret. |

## Example Hypothesis Records

### Acceleration Candidate

Evidence basis: stable Velocity and stable Depth Repertoire in an eligible
aggregate workflow population, with no blocking reliability caveat.

Missing evidence: baseline cycle time, workflow volume, and customer-owned
assumptions about what cycle-time reduction would mean operationally.

Required aggregate outcome evidence: customer-attested before/after cycle-time
or throughput metric aligned to the same workflow population.

Safe wording: "This pattern is a candidate for an acceleration value
investigation."

Blocked wording: "This pattern saved time" or "this pattern will reduce cost."

### Quality Premium Candidate

Evidence basis: stable Depth Repertoire plus verification, recovery, low
friction, or quality-related outcome context.

Missing evidence: customer-owned definition of quality, review-pass rate, error
rate, or rework metric.

Required aggregate outcome evidence: attested aggregate quality metric aligned
to the same workflow population.

Safe wording: "This pattern is a candidate for a quality-premium
investigation."

Blocked wording: "This pattern improved quality" without outcome evidence.

### Net New Candidate

Evidence basis: focused expert use or repeated cross-surface pattern that a
business owner recognizes as a workflow that was not previously feasible or
routine.

Missing evidence: business owner confirmation and outcome context.

Required aggregate outcome evidence: accepted aggregate KPI or customer-owned
description of the new workflow's business value.

Safe wording: "This pattern may indicate a net-new workflow worth studying."

Blocked wording: "This pattern created new economic value" without customer
validation.

## When Economic Suggestions Can Strengthen

Economic suggestions can move from "investigate" to "candidate economic
interpretation" only after all of the following exist:

- eligible aggregate behavior evidence,
- stable zone assignment across fixed windows,
- source coverage and trust context with no blocking hold,
- customer-owned assumptions,
- customer-attested aggregate outcome evidence,
- documented caveats,
- review that no suppressed or held evidence was upgraded.

Even then, FluencyTracr should describe the economic interpretation as
customer-owned and evidence-bound. It should not compute or claim dollarized
ROI unless a later governance decision explicitly authorizes a separate scope.

## Relationship To Strategy Routing

The companion
[V4 Value Realization Strategy Layer](./V4_VALUE_REALIZATION_STRATEGY_LAYER.md)
turns these hypotheses into internal action postures: scale-and-measure,
coach-or-redesign, study-and-package, repair trust loops, fix instrumentation,
or hold interpretation.

That strategy layer may state the CFO value question and required
monetary-value evidence. It must not calculate monetary value from behavior
evidence alone.
