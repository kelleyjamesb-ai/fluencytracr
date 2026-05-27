# V4 Measurement Build Plan

## Purpose

This plan defines how FluencyTracr should build the next measurement layer
step by step, test each candidate signal, and promote only what survives
aggregate dogfood validation.

The goal is to shape the value story without jumping straight to canonical
contracts, customer-facing economic outputs, ROI, causality, prediction,
individual scoring, comparative team evaluation, comparative department
evaluation, productivity measurement, maturity labels, automated
recommendations, raw skill-name readouts, or new canonical events.

## Operating Rule

Every measurement starts in research.

The promotion path is:

```text
research question
-> aggregate diagnostic or saved CSV review
-> three-window dogfood test
-> evidence readout
-> promotion / hold / reject decision
-> contract hardening only if promoted
```

No measurement should become canonical because it is intuitively useful. It
must prove that it is stable, aggregate-safe, interpretable, and materially
different from existing signals.

## Current Baseline

The following pieces are already available for internal V4 research:

| Measurement | Current state | Use now |
| --- | --- | --- |
| Velocity band | Promoted as internal behavior-cohort axis | Adoption energy and spread |
| Depth Repertoire band | Promoted as internal behavior-cohort axis | Cross-surface work integration |
| Velocity x Depth zone | Tested across saved fixed-window outputs | Internal readout-zone evidence |
| AGENT delegation band | Context-only | Interpret delegation presence, not trust or value |
| Skill Read presence | Context-only | Instrumentation context, not reusable leverage proof |
| Narrow trust classification | Partial | `CHAT_FEEDBACK` and `SEARCH_FEEDBACK` only |
| Trust Episode Boundary | Research/pilot | Attribution method candidate |
| Value Realization Strategy Layer | V0 internal only | Human-reviewed strategy routing |
| Economic Impact Bridge | Conceptual/research | Value investigation routing only |

## Initial Saved-Data Test Result

This plan was tested against the saved V4 research exports before moving to the
next measurement slice.

Inputs reviewed:

- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_summary_safe.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`
- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_summary.csv`

Observed export coverage:

| Export | Aggregate rows |
| --- | ---: |
| Velocity x Depth summary | 174 |
| Behavior cohort joint summary | 173 |
| Readout zone summary | 19 |

Velocity x Depth zone results:

| Readout zone | Summary rows | Aggregate cohort rows | Stable three-window rows | Interpretation |
| --- | ---: | ---: | ---: | --- |
| `SCALE_CANDIDATE` | 12 | 125,100 | 12 | Strong enough for internal scale-and-measure review. |
| `FOCUSED_EXPERT_USE` | 6 | 1,250 | 3 | Useful for study-and-package review, but narrower. |
| `SHALLOW_ADOPTION` | 8 | 17,241 | 6 | Useful for coaching or workflow-redesign review. |
| `TRUST_EVIDENCE_GAP` | 111 | 6,537,249 | 92 | Largest pattern; blocks broad economic interpretation. |
| `SUPPRESSED` | 37 | 0 | 3 | Existing gates block interpretation. |

The test supports the plan's starting claim: Velocity x Depth can separate
scale candidates, focused expert use, shallow adoption, trust evidence gaps,
and suppressed evidence in a way that is stable enough for internal research
readouts.

The test also shows the central blocker: the largest observed pattern is not a
value proof pattern. It is a trust evidence gap. That means the next measurement
build should not jump to ROI. It should add segment overlay and outcome joins
only after preserving the evidence-gap distinction.

Current test decision:

`PASS_INITIAL_MEASUREMENT_BUILD_TEST`

Allowed next step:

Proceed to Segment Overlay Test Plan.

Still blocked:

- customer-facing economic output,
- ROI,
- productivity claims,
- causal claims,
- prediction claims,
- individual, team, manager, department, customer, or skill ranking,
- Time-Saved Defensibility Range productization.

## Measurement Build Sequence

### Step 1: Velocity x Depth Cohort Map

Status: complete for internal research.

Question:

> Which aggregate cohorts show adoption energy, cross-surface work integration,
> both, or neither?

Primary inputs:

- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_summary_safe.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`
- [V4 Behavior Cohort Promotion Decision](./V4_BEHAVIOR_COHORT_PROMOTION_DECISION.md)

Current decision:

`PROMOTE_DEPTH_AND_VELOCITY_BEHAVIOR_COHORT_AXES`

Allowed use:

- internal AI Scale Readiness interpretation,
- internal Economic Impact Bridge routing,
- aggregate cohort explanation,
- non-dollarized value investigation prompts.

Blocked use:

- ROI,
- productivity claims,
- causal claims,
- customer-facing economic output,
- scoring or ranking.

### Step 2: Segment Overlay

Status: next build.

Question:

> Do safe aggregate segments reveal different Velocity x Depth patterns that
> suggest different interventions?

Allowed segment sources:

- tenure cohort derived from first observed activity,
- Velocity band,
- Depth Repertoire band,
- approved HRIS or directory attributes only inside the customer or Glean
  boundary,
- department/function, role family, level band, manager/IC, and region only as
  aggregate segment distributions after coverage and suppression gates clear.

Test artifact:

`docs/research/V4_SEGMENT_OVERLAY_TEST_PLAN.md`

Expected export shape:

- fixed window,
- segment dimension,
- segment band,
- Velocity band,
- Depth Repertoire band,
- readout zone,
- cohort size,
- suppression status,
- source coverage status.

Promotion gate:

Segment overlay can promote only if it shows stable aggregate differences
without becoming a person, manager, department, region, or team ranking.

### Step 3: Intervention Tracking Model

Status: design next after segment overlay.

Question:

> When an enablement, workflow redesign, Skill rollout, agent deployment, or
> trust-loop intervention happens, does aggregate behavior move in the intended
> direction?

Candidate intervention types:

- enablement session,
- workflow redesign,
- prompt/template rollout,
- Skill rollout,
- agent deployment,
- trust-loop change,
- leadership campaign,
- policy or governance change.

Expected research shape:

- intervention ID,
- intervention type,
- aggregate target segment or workflow,
- pre-window,
- post-window,
- expected movement,
- observed Velocity movement,
- observed Depth Repertoire movement,
- trust or reliability movement where available,
- evidence caveat.

Promotion gate:

The model can promote only if it remains descriptive. It may show movement
after an intervention, but it must not claim the intervention caused the
movement without a separately approved causal design.

### Step 4: Outcome Metric Join

Status: research design.

Question:

> Which business outcome metric should be attached to the behavior evidence for
> a value investigation?

Recommended first outcome domains:

| Domain | Why first | Example metric |
| --- | --- | --- |
| Support | Cleaner operational cycle-time data than sales | time to resolution, reopen rate, escalation rate |
| Onboarding | Strong fit for tenure and ramp cohorts | time to first productive action, ramp milestone completion |
| Sales | High strategic value but noisier attribution | stage velocity, qualified pipeline, win-rate movement |

Expected export shape:

- fixed window,
- aggregate segment or workflow,
- outcome metric name,
- outcome unit,
- baseline value,
- comparison value,
- cohort size,
- source system,
- coverage status,
- customer-owned assumption status.

Promotion gate:

Outcome joins can promote only as aggregate outcome evidence. They do not prove
ROI or causality. They support correlation, trend review, and customer-owned
value investigation.

### Step 5: Time-Saved Defensibility Range

Status: contract exists, productization blocked.

Question:

> Can time saved be represented as a caveated range that is adjusted by
> evidence quality and customer-owned assumptions, without becoming a false ROI
> claim?

Safe formula shape:

```text
customer-owned workflow volume
x customer-owned baseline time assumption
x observed eligible workflow share
x Quality Multiplier / Reliability context
= defensibility range for investigation
```

Rules:

- Time saved must be a range, not a single absolute claim.
- Customer-owned assumptions must be explicit.
- Suppressed evidence cannot contribute to a range.
- Depth and Velocity may provide caveat context only until a later decision
  explicitly promotes them as economic dependencies.

Promotion gate:

Time-Saved Defensibility Range remains blocked from productization until an
outcome-join test proves that the caveats travel without creating ROI,
productivity, or causality claims.

### Step 6: Economic Hypothesis Map

Status: available as research strategy layer.

Question:

> Given the behavior evidence, which economic value investigation is warranted?

Allowed outputs:

- candidate impact area,
- value hypothesis,
- plausible value mechanism,
- required outcome evidence,
- missing assumptions,
- source coverage gaps,
- blocked claims.

Blocked outputs:

- proven ROI,
- guaranteed savings,
- productivity lift,
- causal economic impact,
- forecasted value,
- automated recommendation.

Promotion gate:

The Economic Impact Bridge can promote only as investigation routing until a
separate monetary-value decision proves that outcome evidence, assumptions,
and caveats are safe enough for customer-facing use.

## Test Before Canonical Checklist

Each measurement must answer yes to all of the following before contract
hardening:

| Gate | Required answer |
| --- | --- |
| Aggregate-only | Does the output avoid user IDs, emails, raw prompts, raw outputs, transcripts, raw skill names, and row-level events? |
| Stable windows | Does the signal behave consistently across three fixed windows? |
| Distinct value | Does it explain something that Velocity, Depth, Quality Multiplier, or Reliability Factor alone does not? |
| Suppression-safe | Does it preserve fail-closed suppression without reconstructing held values? |
| Segment-safe | Does it avoid ranking people, teams, managers, departments, customers, or skills? |
| Economic-safe | Does it avoid ROI, productivity, causality, prediction, and guaranteed-savings claims? |
| Actionable | Does it suggest a human-reviewed action or investigation path? |
| Boundary clear | Does the readout distinguish low readiness from insufficient data? |

If any gate fails, the measurement remains research-only or is rejected.

## Recommended Next Three PRs

### PR 1: Segment Overlay Test Plan

Create:

- `docs/research/V4_SEGMENT_OVERLAY_TEST_PLAN.md`

Purpose:

Define safe aggregate segmentation, required source coverage, and the first
test shape for segment x Velocity x Depth analysis.

Decision target:

`HOLD_FOR_APPROVED_SEGMENT_EXPORT` or `PROMOTE_SEGMENT_OVERLAY_TESTING`

### PR 2: Intervention Tracking Research Design

Create:

- `docs/research/V4_INTERVENTION_TRACKING_RESEARCH_DESIGN.md`

Purpose:

Define how interventions are recorded and tested without causal claims.

Decision target:

`PROMOTE_INTERVENTION_LEDGER_RESEARCH_TEST` or `HOLD_FOR_INTERVENTION_SOURCE`

### PR 3: Outcome Join And Time-Saved Range Test

Create:

- `docs/research/V4_OUTCOME_JOIN_TEST_PLAN.md`
- `docs/research/V4_TIME_SAVED_DEFENSIBILITY_TEST_PLAN.md`

Purpose:

Define one support or onboarding outcome join and the exact conditions under
which time saved can become a defensibility range.

Decision target:

`PROMOTE_TIME_SAVED_RANGE_RESEARCH_TEST` or
`HOLD_FOR_CUSTOMER_OWNED_ASSUMPTIONS`

## Recommended Order

The safest order is:

1. Segment overlay.
2. Intervention tracking.
3. Outcome metric join.
4. Time-saved defensibility range.
5. Economic hypothesis map update.
6. Canonical contract decision.

That order keeps the story honest:

```text
Who is using AI differently?
-> What changed after we intervened?
-> Did a business outcome move?
-> Is a time-saved range defensible?
-> Is economic investigation warranted?
```

## Decision

`PROMOTE_MEASUREMENT_BUILD_AS_RESEARCH_SEQUENCE`

Velocity x Depth is already safe enough for internal behavior-cohort review.
The next measurements must remain research-only until each one passes the
test-before-canonical checklist above.
