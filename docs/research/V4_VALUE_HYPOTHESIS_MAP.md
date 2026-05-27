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
- support outcome context from
  [V4 Support Outcome Join Test Readout](./V4_SUPPORT_OUTCOME_JOIN_TEST_READOUT.md),
- support join-key limitations from
  [V4 Support Join-Key Test Readout](./V4_SUPPORT_JOIN_KEY_TEST_READOUT.md),
- Time-Saved Defensibility readiness from
  [V4 Time-Saved Defensibility Test Plan](./V4_TIME_SAVED_DEFENSIBILITY_TEST_PLAN.md),
- customer-owned outcome evidence when separately provided and governed,
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

## Current Dogfood Evidence Status

The measurement-build sequence has now tested the bridge inputs through the
support outcome and Time-Saved Defensibility slices.

Current promoted scope:

| Evidence layer | Current decision | Allowed use |
| --- | --- | --- |
| Velocity x Depth behavior cohorts | `PROMOTE_DEPTH_AND_VELOCITY_BEHAVIOR_COHORT_AXES` | Internal readiness and value-investigation routing. |
| Behavior segment overlay | `PROMOTE_BEHAVIOR_SEGMENT_OVERLAY_TESTING` | Internal research overlays using behavior bands and readout zones. |
| Intervention tracking design | `PROMOTE_INTERVENTION_TRACKING_RESEARCH_DESIGN` | Descriptive movement model only; actual testing held for a ledger. |
| Support outcome source | `PROMOTE_SUPPORT_OUTCOME_SOURCE_TEST` | Support outcome context for the same fixed windows. |
| Support outcome context join | `PROMOTE_SUPPORT_OUTCOME_CONTEXT_JOIN` | Economic Impact Bridge routing and support value investigation. |
| Support join-key requirements | `PROMOTE_SUPPORT_JOIN_KEY_REQUIREMENTS` | Requirements for future support attribution. |
| Time-Saved Defensibility gate | `PROMOTE_TSDR_RESEARCH_GATE` | Range-readiness gate and blocked-range fixture. |

Current held scope:

| Held item | Current decision | Why held |
| --- | --- | --- |
| Support behavior attribution | `HOLD_SUPPORT_BEHAVIOR_ATTRIBUTION` | No approved aggregate join key connects behavior cohorts to support outcomes. |
| Time-Saved range output | `HOLD_TSDR_RANGE_OUTPUT` | Raw time-saved claim, customer-owned assumptions, support attribution, and causal design are missing or held. |
| Customer-facing economic output | Blocked | Current evidence supports investigation routing, not external economic claims. |
| ROI and productivity claims | Blocked | No governed causal design or customer-owned economic model exists. |

The current bridge can say:

```text
This aggregate behavior pattern plus available outcome context warrants a
business-owned value investigation.
```

It cannot say:

```text
This aggregate behavior pattern created economic value.
```

## Zone To Hypothesis Map

| Zone or evidence pattern | Allowed AIVM hypothesis | Required next evidence | Allowed next action |
| --- | --- | --- | --- |
| `SCALE_CANDIDATE` with stable Velocity, stable Depth Repertoire, and usable reliability context. | `ACCELERATION` candidate, or `QUALITY_PREMIUM` candidate if quality evidence is present. | Customer-owned baseline cycle time, workflow volume, review-pass rate, quality KPI, or accepted outcome template. | Run a business-owned value investigation with explicit assumptions and caveats. |
| `FOCUSED_EXPERT_USE` with strong Depth Repertoire in a narrower aggregate pocket. | `NET_NEW` candidate if the business owner confirms a new workflow; `QUALITY_PREMIUM` candidate if the outcome is better work quality. | Business owner confirmation, aggregate outcome evidence, workflow context, and decision on whether to expand. | Study the workflow and decide whether expansion is plausible. |
| `SHALLOW_ADOPTION` with high activity but weak Depth, reliability, recovery, verification, or trust context. | `UNCLASSIFIED`; possible friction or enablement investigation. | Verification evidence, recovery evidence, trust attribution, and customer-owned outcome evidence after workflow repair. | Improve usage quality before economic interpretation. |
| `TRUST_EVIDENCE_GAP` where activity or Depth exists but trust attribution is missing, aliased, or held. | `UNCLASSIFIED`; possible trust-loop or review-quality investigation. | Strict attribution, feedback-loop coverage, verification evidence, and aggregate outcome evidence. | Repair trust evidence before value investigation. |
| Support outcome context aligned by fixed window, with no approved behavior-to-support join key. | `ACCELERATION` or `QUALITY_PREMIUM` investigation context only; no attribution. | Approved aggregate join key, customer-owned support metric interpretation, and assumption ledger. | Route a support value investigation while preserving `NOT_CAUSAL` and attribution-held caveats. |
| Time-Saved Defensibility gate passes as a method but suppresses range values. | No AIVM value type upgrade; range-readiness method only. | Raw time-saved claim, customer-owned assumptions, approved aggregate join key, and governed caveats. | Use the gate to explain why a range is held and what evidence is missing. |
| `INSTRUMENTATION_HOLD`. | No value hypothesis beyond source-readiness remediation. | Required aggregate source coverage and key alignment. | Fix instrumentation. |
| `SUPPRESSED`. | No value hypothesis. | Eligible future window or repaired aggregate inputs that pass existing gates. | Do not interpret. |

## Outcome Context To Hypothesis Map

Support is the first tested outcome context. It is useful because it has
window-aligned Zendesk metrics and enough volume for aggregate analysis.

Support finding:

| Window | Tickets | p50 days elapsed | p90 days elapsed | p50 business minutes to first response | Scale candidate share | Trust evidence gap share |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `window_1` | 4,469 | 13 | 26 | 183 | 2.32% | 97.30% |
| `window_2` | 4,549 | 15 | 35 | 212 | 2.10% | 97.59% |
| `window_3` | 4,163 | 15 | 43 | 218 | 1.19% | 98.67% |

Safe support hypothesis:

```text
Support outcome context improved from the earliest to latest fixed window while
the V4 behavior readout showed a modest increase in scale-candidate share. This
warrants support value investigation, not ROI, productivity, prediction, or
causal interpretation.
```

Blocked support hypothesis:

```text
AI behavior reduced support cycle time.
```

That statement remains blocked because support behavior attribution is held.

## Time-Saved Defensibility Map

Time-Saved Defensibility is now a research gate, not an emitted range.

| Gate input | Current state | Bridge effect |
| --- | --- | --- |
| Raw time-saved claim | Missing | Blocks range output. |
| Customer-owned assumptions | Missing | Blocks range output. |
| Support outcome context | Ready | May travel as caveat/context. |
| Behavior evidence | Ready | May route investigation and qualify caveats. |
| Behavior-to-support attribution | Held | Blocks attribution and stronger economic interpretation. |
| Causal design | Not present | Keeps all movement `NOT_CAUSAL`. |
| Depth Repertoire | Caveat only | Must not adjust range values, confidence, eligibility, or economics. |

Allowed Time-Saved statement:

```text
Current V4 evidence can explain why a time-saved range is held and what inputs
are required before a range could be tested.
```

Blocked Time-Saved statement:

```text
Current V4 evidence supports a defensible time-saved range.
```

That statement remains blocked until a raw time-saved claim, customer-owned
assumptions, and an approved aggregate join key exist.

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

For support specifically, strengthening also requires an approved aggregate
behavior-to-support join key. The current fixed-window join is not enough.

For Time-Saved Defensibility specifically, strengthening requires a raw
time-saved claim and a customer-owned assumption ledger. Behavior evidence and
support context alone are not enough.

Even then, FluencyTracr should describe the economic interpretation as
customer-owned and evidence-bound. It should not compute or claim dollarized
ROI unless a later governance decision explicitly authorizes a separate scope.

## Relationship To Strategy Routing

The companion
[V4 Value Realization Strategy Layer](./V4_VALUE_REALIZATION_STRATEGY_LAYER.md)
turns these hypotheses into internal action postures: scale-and-measure,
coach-or-redesign, study-and-package, repair trust loops, fix instrumentation,
or hold interpretation.

That strategy layer may state stakeholder value questions, stakeholder evidence
needs, and required monetary-value evidence. It must not calculate monetary
value from behavior evidence alone.

## Current Bridge Decision

`PROMOTE_ECONOMIC_BRIDGE_INVESTIGATION_ROUTING`

Also:

`HOLD_CUSTOMER_FACING_ECONOMIC_OUTPUT`

The Economic Hypothesis Map is now strong enough to route internal
value-investigation conversations across the organization when valid aggregate
evidence exists. It is not strong enough to emit customer-facing economic
outputs, Time-Saved Defensibility range values, ROI, productivity claims,
prediction, or causal impact.

The next governance decision should decide whether to close this V4 measurement
build as:

- internal investigation-routing only,
- contract-hardening candidate for the investigation map,
- or held pending an assumption ledger and approved aggregate outcome join key.
