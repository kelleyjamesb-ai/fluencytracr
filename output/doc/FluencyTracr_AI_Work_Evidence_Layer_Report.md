# FluencyTracr AI Work Evidence Layer Report

External-facing working draft. This report explains the visual model for
FluencyTracr as an aggregate AI work evidence layer: what inputs it uses, which
behavioral primitives it observes, how those primitives support Velocity,
Depth, Reliability, Quality, Trust Calibration, and Time-Saved Defensibility,
and what executive outputs are safe to claim.

This report is evidence-bound. It does not claim ROI, causality, productivity
lift, employee fluency, team ranking, manager ranking, or output correctness.

## 1. Executive Summary

Most AI adoption dashboards show activity: logins, prompts, messages, users, or
tool launches. FluencyTracr is designed to answer a harder question:

```text
Is aggregate AI-assisted work actually moving, recovering, being verified, and
becoming embedded enough to support safer value-realization decisions?
```

FluencyTracr does this by converting governed aggregate telemetry into
behavioral evidence. The product does not inspect raw prompts or outputs. It
does not evaluate employees. It does not score individuals or rank teams. It
uses aggregate, fail-closed evidence to help leaders understand:

- where AI work appears ready to scale,
- where adoption is fast but shallow,
- where usage is deep but creating drag,
- where trust evidence is missing,
- where source coverage is too weak to interpret,
- where customer-owned outcome evidence is needed before value claims can be
  made.

The core operating model is:

```text
Aggregate inputs
-> behavioral primitives
-> confidence frameworks
-> executive readouts
```

The frameworks in the visual are:

- Behavioral Evidence Primitives
- Velocity
- Depth
- Velocity x Depth zones
- Reliability Factor
- Quality Multiplier
- Trust Calibration
- Source Coverage
- Outcome Readiness
- Value Hypotheses
- Time-Saved Defensibility Range

## 2. What FluencyTracr Takes In

FluencyTracr should ingest or receive only aggregate, governed evidence. The
customer-side or source-side transformer can compute over raw telemetry, but
FluencyTracr output should stay aggregate-only.

### 2.1 AI Surfaces

An AI surface is the place or mode where AI-assisted work happens.

Examples:

- Search
- Chat / assistant
- AI summaries
- embedded assist inside an application
- Skills
- named workflow agents
- autonomous agents
- ephemeral agents
- MCP or tool-mediated actions
- verification or feedback surfaces

Why this matters:

Surface context helps separate broad, coherent work integration from raw usage
volume. A cohort using Search, Chat, Skills, and a governed workflow agent is
showing a different pattern than a cohort sending many messages in one surface.

Safe interpretation:

```text
AI surface evidence helps explain work context. It is not a score, rank, or
proof of productivity.
```

### 2.2 Workflows

A workflow is the governed work context being evaluated.

Examples:

- support case resolution
- sales proposal drafting
- customer onboarding project planning
- employee policy question answering
- engineering incident triage
- research synthesis
- contract review support

Why this matters:

The same AI behavior can mean different things in different workflows. Low
verification might be acceptable for a low-risk summarization workflow, but
risky in a regulated or customer-facing decision workflow.

Safe interpretation:

```text
Workflow context determines how behavioral evidence should be interpreted.
```

### 2.3 Cohorts And Approved Segments

A cohort is an approved aggregate group. A segment is a customer-approved slice
of that cohort.

Examples:

- approved business function
- role family
- region
- tenure band
- workflow cohort
- AI surface cohort
- Velocity band
- Depth Repertoire band
- approved customer/account segment

Governance boundary:

Segments are intervention contexts, not performance groups. They must not be
used to rank employees, managers, teams, departments, or customers.

Suppression boundary:

Suppression must be evaluated independently for the exact suppression bucket,
including optional slice keys:

```text
(workflow_id, jbtd_id, persona_id)
```

If a readout cannot prove the exact suppression bucket, it should remain
suppressed or use evidence-gap language only.

### 2.4 Role Families And Functions

Role family or function can be useful when the customer approves it and the
segment is aggregate-safe.

Examples:

- Sales
- Support
- Engineering
- Customer Success
- Legal
- Finance
- Operations

Safe use:

```text
Role/function context can help explain workflow fit and intervention design.
```

Unsafe use:

```text
Role/function context must not become employee scoring, manager ranking, or
department productivity comparison.
```

### 2.5 Source Coverage

Source coverage describes which signals are observable and trustworthy enough to
interpret.

Coverage areas:

- trace keys
- run keys
- action keys
- session keys
- completion evidence
- continuation evidence
- failure / error evidence
- pause / skip / cancellation evidence
- feedback evidence
- citation or source evidence
- downstream outcome context

Why this matters:

If source coverage is incomplete, the safest interpretation may be an evidence
gap. Missing evidence must not be upgraded into healthy trust, poor trust,
value, or causality.

Current pilot example:

- 99.95% of product episodes had high-confidence trace, run, or action coverage.
- 0.5% of all episodes were folded into evidence-gap language because boundary
  ambiguity remained.

### 2.6 Outcome Evidence

Outcome evidence is customer-owned aggregate KPI context.

Examples:

- support ticket response time
- support ticket age
- onboarding project duration
- implementation milestone timing
- renewal or expansion context
- quality review outcomes
- approved operational KPIs

Governance boundary:

Outcome evidence can support value investigation. It does not automatically
prove attribution, causality, or ROI.

For Time-Saved range eligibility, an approved aggregate behavior-to-outcome join
key is required. A no-attribution caveat is not enough to emit a range.

### 2.7 Interventions

Interventions are customer-declared events, not inferred from enablement-system
access.

Examples:

- workflow redesign launched
- source coverage improved
- new agent enabled
- verification step added
- policy or playbook introduced
- training or enablement event declared by the customer

Safe use:

```text
Interventions can be used as context for later aggregate comparison.
```

Unsafe use:

```text
Do not infer training impact from enablement-system access, HR records, or
person-level participation.
```

## 3. Behavioral Evidence Primitives

Behavioral primitives are the smallest aggregate observations FluencyTracr uses
to describe AI-assisted work. They do not prove value by themselves. They become
useful when combined with workflow context, suppression gates, source coverage,
and customer-approved outcome evidence.

### 3.1 Disposition

Canonical observation:

```text
FT_V1_DISPOSITION_OBSERVED
```

Definition:

Disposition describes what happened to the AI-assisted output or step.

Allowed states:

- `ACCEPT`
- `EDIT`
- `REJECT`
- `ABANDON`

How it is measured:

The detector looks for structural disposition evidence such as an accepted,
edited, rejected, or abandoned AI output. If an output is accepted only after
prior edits or retries, the interpretation is more cautious than a simple
direct accept.

Example:

```text
AI drafts a response.
User edits it before sending.
Disposition = EDIT.
```

Executive meaning:

Disposition helps distinguish direct acceptance, productive refinement,
rejection, and abandonment. It is the basic signal for what the workflow did
next.

What it does not mean:

Acceptance does not prove correctness. Rejection does not prove the tool is bad.
Edit does not prove inefficiency. Interpretation depends on workflow risk.

### 3.2 Iteration Depth

Canonical observation:

```text
FT_V1_ITERATION_DEPTH_OBSERVED
```

Definition:

Iteration Depth describes how much retry, refinement, or friction-loop behavior
appears in the episode.

Current detector logic:

- no retry sequence = `LOW`
- one retry sequence = `NORMAL`
- two or more retry sequences = `HIGH`

Example:

```text
User asks AI for an answer.
Output fails or is rejected.
User retries twice before work continues.
Iteration Depth = HIGH.
```

Executive meaning:

Iteration can be useful refinement or costly rework. High iteration becomes more
concerning when paired with long latency, abandonment, or weak recovery.

Frameworks using it:

- Depth
- Reliability Factor
- Quality Multiplier
- Velocity x Depth interpretation

### 3.3 Verification Presence

Canonical observation:

```text
FT_V1_VERIFICATION_PRESENCE_OBSERVED
```

Definition:

Verification Presence indicates whether the episode contains structural evidence
that the AI-assisted work was checked, validated, reviewed, or corroborated.

Measured from:

- explicit verification signal,
- validation tool call,
- validation check,
- structural verification flag,
- retrieval/search event only when it carries explicit verification evidence.

Important boundary:

Search or retrieval is not verification by name alone. A citation being
available is not the same as a citation being checked.

Example:

```text
AI gives an answer with sources.
User opens the source or triggers a validation check.
Verification Presence = true.
```

Executive meaning:

Verification strengthens trust evidence, especially in higher-risk workflows.
Low verification can mean several different things: low-risk work, earned trust,
alternative review paths, missing instrumentation, or possible overtrust.

This is why verification should be interpreted inside Trust Calibration, not as
a standalone score.

### 3.4 Recovery

Canonical observation:

```text
FT_V1_RECOVERY_OBSERVED
```

Definition:

Recovery means work continued in a usable direction after friction or failure.

Current detector logic:

Recovery requires:

1. an explicit error,
2. a retry sequence anchored to that error,
3. later continuation or success, such as accepted/edited output or successful
   terminal execution.

Example:

```text
Agent fails on a task.
User retries or redirects the workflow.
The workflow later succeeds or produces edited/accepted output.
Recovery = true.
```

Executive meaning:

Recovery is one of the strongest trust-adjacent behavioral signals because it
shows that AI-assisted work can absorb friction instead of collapsing.

Frameworks using it:

- Reliability Factor
- Quality Multiplier
- Depth
- Trust Episode Boundary
- Trust Calibration

### 3.5 Latency

Canonical observation:

```text
FT_V1_LATENCY_OBSERVED
```

Definition:

Latency measures elapsed time across the episode when timestamps are valid.

Current detector logic:

```text
latency_ms = timestamp(last ordered event) - timestamp(first ordered event)
```

Governance boundary:

Latency is corroborative only. It cannot independently trigger surfacing,
suppression override, reliability disclosure, or value claims.

Example:

```text
Short latency + direct accept + no verification
may suggest fast but shallow use.

Long latency + high iteration + recovery
may suggest serious work with friction.
```

Executive meaning:

Latency helps qualify work movement, but it is not value by itself.

### 3.6 Abandonment

Canonical observation:

```text
FT_V1_ABANDONMENT_OBSERVED
```

Definition:

Abandonment means AI was invoked in a work episode, but the aggregate trace shows
the work stopped, was explicitly abandoned, or reached an abandoned execution
state without observed continuation or usable resolution.

Current detector logic:

Abandonment is true when one of these is observed:

- the source adapter marks `inactivity_abandonment = true`,
- execution state is `ABANDONED`,
- an `ai_abandonment` event appears,
- an AI output disposition is `abandoned`.

Important boundary:

FluencyTracr does not guess abandonment from missing data alone. If the source
cannot prove abandonment, the safer state is evidence gap.

Example:

```text
User invokes an assistant.
The workflow enters an abandoned execution state.
No later continuation or terminal success is observed.
Abandonment = true.
```

Executive meaning:

Abandonment shows where AI-assisted work may not be carrying work forward. It
lowers Reliability Factor and Quality Multiplier.

### 3.7 Frequency

Canonical observation:

```text
USER_FREQUENCY_OBSERVED
```

Definition:

Frequency measures runs per active day.

How it is emitted:

Only as cohort percentile distributions, such as p10, p50, p90, and p99.

Example:

```text
p50 frequency = 12 runs per active day
```

Executive meaning:

Frequency shows intensity among active users. High frequency alone does not
prove depth or value.

### 3.8 Engagement

Canonical observation:

```text
USER_ENGAGEMENT_OBSERVED
```

Definition:

Engagement measures active days per window.

How it is emitted:

Only as cohort percentile distributions.

Example:

```text
p50 engagement = 18 active days in a 60-day window
```

Executive meaning:

Engagement shows persistence. It helps distinguish durable use from one-time or
burst use.

### 3.9 Breadth

Canonical observation:

```text
USER_BREADTH_OBSERVED
```

Definition:

Breadth measures distinct AI surfaces touched per window.

How it is emitted:

Only as cohort percentile distributions.

Example:

```text
p50 breadth = 4 AI surfaces touched in the window
```

Executive meaning:

Breadth shows whether AI use is narrow or spread across multiple surfaces. It
does not automatically mean better use; the surface mix must be coherent for the
workflow.

## 4. Velocity

Velocity measures adoption energy.

It has three independent dimensions:

```text
Frequency = runs per active day
Engagement = active days per window
Breadth = distinct AI surfaces touched per window
```

Velocity is computed from aggregate distributions, not person-level output.

The current Velocity Index contract computes each sub-index against a governed
calibration reference:

```text
frequency_index  = observed_frequency_p50 / calibration_frequency_p50
engagement_index = observed_engagement_p50 / calibration_engagement_p50
breadth_index    = observed_breadth_p50 / calibration_breadth_p50

velocity_index = average(frequency_index, engagement_index, breadth_index)
```

Each sub-index is bounded by the governed contract.

Example:

```text
frequency_index = 1.08
engagement_index = 1.00
breadth_index = 0.93

velocity_index = (1.08 + 1.00 + 0.93) / 3
velocity_index = 1.003
```

Executive interpretation:

- High Frequency: active users are intense.
- High Engagement: use is persistent across the window.
- High Breadth: use spans more surfaces.
- High Velocity overall: adoption has energy.

What Velocity does not prove:

- workflow integration,
- output quality,
- trust,
- ROI,
- productivity,
- causality.

Velocity must be paired with Depth.

## 5. Depth

Depth measures work integration.

Repo shorthand:

```text
Depth = Surface Repertoire x Repeat Use / Refinement
```

Depth asks:

```text
Is AI being repeatedly integrated into real workflows, across coherent surfaces,
with enough verification, recovery, reuse, delegation, and judgment behavior to
support safer value claims?
```

Depth dimensions:

- Surface Repertoire Depth: repeated use across more than one AI surface.
- Repeat / Refinement Depth: returning to AI and refining work over time.
- Verification Depth: appropriate checking or review behavior.
- Workflow Repertoire Depth: use across coherent workflow contexts.
- Capability Repertoire Depth: span of retrieval, synthesis, transformation,
  delegation, reuse, and verification capabilities.
- Delegation Depth: use of agents, tools, MCP, or named workflow execution.
- Skill / Reuse Depth: movement from one-off prompting to governed reusable
  workflows or Skills.
- Recovery Depth: ability to continue after friction or failed attempts.
- Judgment / Override Depth: human intervention when automation should not
  proceed unchecked.

Executive interpretation:

Depth is the difference between activity and operating leverage.

High use in one surface can be useful, but it may still be shallow. Lower use
across a critical, repeatable, well-verified workflow may be more valuable than
high-volume shallow activity.

## 6. Velocity x Depth Framework

Velocity and Depth should be read together.

| Zone | Velocity | Depth | Meaning | Watch for |
| --- | --- | --- | --- | --- |
| Low Integration | Low | Low | AI is not yet part of real work patterns. | abandonment, human-only fallback, low recurrence, poor task fit |
| Fast But Shallow | High | Low | AI is helping with quick tasks, but may not be embedded. | immediate accept, low verification, thin workflow presence, possible blind trust |
| Deep But Slow | Low | High | AI is used seriously, but may create drag. | rework loops, heavy iteration, long latency, workflow mismatch |
| High-Fluency Flow | High | High | AI is embedded into work and helps work resolve. | repeat use, verification, productive refinement, faster resolution |

The point of the matrix is not to rank teams. It is to help leaders decide what
kind of intervention is needed.

Examples:

### Low Integration

The cohort has low engagement, low breadth, and low repeat behavior. AI may be
available, but it is not yet part of the workflow.

Likely next action:

```text
Improve workflow fit or source coverage before claiming value.
```

### Fast But Shallow

The cohort uses AI frequently, but mostly in one surface with limited
verification and weak workflow continuation.

Likely next action:

```text
Add workflow design, verification loops, or better source coverage before scale.
```

### Deep But Slow

The cohort uses multiple surfaces and shows refinement/recovery, but latency and
iteration are heavy.

Likely next action:

```text
Reduce friction, simplify workflow design, or package repeatable patterns.
```

### High-Fluency Flow

The cohort shows persistent usage, coherent surface repertoire, verification or
trust evidence, recovery after friction, and work resolution.

Likely next action:

```text
Study and package the repeatable pattern for customer-owned scale review.
```

## 7. Reliability Factor

Reliability Factor asks whether surfaced aggregate workflow evidence looks
operationally dependable.

Formula:

```text
reliability_factor =
  clamp01(
    0.5
    + 0.25 * verification_presence_rate
    + 0.25 * recovery_success_rate
    - 0.25 * abandonment_rate
    - 0.25 * friction_loop_rate
  )
```

Component definitions:

- `verification_presence_rate`: share of aggregate workflow executions where
  verification behavior is observed.
- `recovery_success_rate`: share where recovery behavior resolves into usable
  continuation rather than abandonment.
- `abandonment_rate`: share where the observed workflow is abandoned.
- `friction_loop_rate`: share showing repeated retry/friction-loop behavior.

Example:

```text
verification_presence_rate = 0.70
recovery_success_rate = 0.60
abandonment_rate = 0.10
friction_loop_rate = 0.20

reliability_factor =
  0.5
  + 0.25 * 0.70
  + 0.25 * 0.60
  - 0.25 * 0.10
  - 0.25 * 0.20

reliability_factor =
  0.5 + 0.175 + 0.150 - 0.025 - 0.050

reliability_factor = 0.750
```

Executive interpretation:

```text
This workflow has moderate-to-strong operational dependability evidence, but
the interpretation still depends on source coverage, workflow risk, and
suppression status.
```

Suppression rule:

If the verdict is `SUPPRESS`, Reliability Factor must be null. There is no
fallback value.

## 8. Quality Multiplier

Quality Multiplier asks whether a raw time-saved assumption should be
discounted, left neutral, or amplified based on behavioral quality evidence.

Formula:

```text
raw_multiplier =
  1.0
  + 0.30 * verification_presence_rate
  + 0.25 * recovery_success_rate
  - 0.35 * abandonment_rate
  - 0.30 * friction_loop_rate

quality_multiplier = clamp(raw_multiplier, 0.5, 1.5)
```

Using the same example:

```text
verification_presence_rate = 0.70
recovery_success_rate = 0.60
abandonment_rate = 0.10
friction_loop_rate = 0.20

raw_multiplier =
  1.0
  + 0.30 * 0.70
  + 0.25 * 0.60
  - 0.35 * 0.10
  - 0.30 * 0.20

raw_multiplier =
  1.0 + 0.210 + 0.150 - 0.035 - 0.060

quality_multiplier = 1.265
```

If a source time-saved estimate were 300 hours, a purely illustrative
quality-adjusted estimate would be:

```text
300 * 1.265 = 379.5 hours
```

Important boundary:

This is not ROI. It is not realized savings. It should not be emitted unless
the underlying evidence clears suppression gates and the time-saved claim is
customer-owned or otherwise approved for the use case.

## 9. Time-Saved Defensibility Range

Time-Saved Defensibility Range qualifies a claimed time-saved estimate.

It does not prove financial ROI. It does not prove causality. It should be used
as a bounded defensibility range, not a single value claim.

Required inputs:

- raw time-saved claim,
- customer-owned workflow volume assumption,
- customer-owned baseline time assumption,
- customer-owned recapture or scenario assumption,
- surfaced aggregate behavior evidence,
- support or other outcome context where available,
- approved aggregate behavior-to-outcome join key,
- `NOT_CAUSAL` status unless a separately governed causal design exists.

If any required input is missing, the range must be null or absent.

Example from the documentation-stage contract:

```json
{
  "raw_time_saved_claim_hours": 300,
  "defensibility_range_hours": {
    "conservative": 120,
    "expected": 180,
    "upside": 240
  },
  "causality_status": "NOT_CAUSAL",
  "confidence_band": "MEDIUM"
}
```

Executive interpretation:

```text
The range qualifies how much of a claimed estimate is defensible under current
aggregate evidence. It does not prove realized ROI or productivity lift.
```

Current gating principle:

An explicit no-attribution caveat is not an alternate path to range output. It
can allow outcome context to travel as investigation context, but the range
remains held until an approved aggregate behavior-to-outcome join exists.

## 10. Trust Calibration And Trust Episode Boundary

Trust Calibration asks whether aggregate AI-assisted work shows enough evidence
to interpret trust behavior safely.

Trust Episode Boundary looks at aggregate work episodes and asks whether work:

- resolved with corroboration,
- resolved without explicit verification,
- recovered after friction,
- stalled after AI assistance,
- showed explicit negative feedback,
- remained an evidence gap.

Current pilot numbers:

```text
Total aggregate AI work episodes: 88,028,657
```

Pattern summary:

| Pattern | Episodes | Share |
| --- | ---: | ---: |
| Work resolved with corroboration | 3,567,326 | 4.1% |
| Work resolved without explicit verification | 30,676,071 | 34.8% |
| Work recovered after friction | 15,826,000 | 18.0% |
| Evidence gap remains | 37,959,260 | 43.1% |

Evidence gap composition:

| Gap component | Episodes | Interpretation |
| --- | ---: | --- |
| True downstream-evidence gap | 37,484,844 | Episode exists, but downstream behavior is not enough to classify resolution, recovery, stall, or verification. |
| Ambiguous boundary fold-in | 474,414 | Trace, run, session, or action keys may overlap, so rows stay inside evidence-gap language. |
| Small-cell safety fold-in | withheld | Rare cells are acknowledged without publishing exact values. |

Evidence quality and reliability context:

| Measure | Value | Meaning |
| --- | ---: | --- |
| Raw candidate keys | 246,962,102 | Pre-dedup candidate episode keys. |
| Aggregate AI work episodes | 88,028,657 | Product-episode normalized count. |
| Dedup ratio | 2.8x | Prevents raw candidate-key overcount from entering the executive readout. |
| High-confidence coverage | 99.95% | Episodes with trace, run, or action coverage. |
| Interpretation completeness | 56.9% | Episodes with enough aggregate evidence to classify as resolved, resolved without explicit verification, or recovered after friction. |
| Boundary ambiguity | 0.5% | Episodes folded into evidence-gap language instead of precise stalled values. |

Executive interpretation:

The pilot shows that citation clicks alone would be a weak trust anchor.
FluencyTracr gets closer to trust evidence by looking at continuation, recovery,
resolution, feedback, boundary confidence, and evidence gaps.

What this does not prove:

- output correctness,
- healthy or unhealthy trust by itself,
- ROI,
- causality,
- individual behavior,
- team performance.

## 11. Source Coverage Layer

Source Coverage tells leaders whether the data is interpretable enough to trust
the readout.

Important source coverage questions:

- Do we have stable trace/run/action keys?
- Can we distinguish candidate keys from product episodes?
- Do session or trace boundaries overlap?
- Can we observe continuation after AI use?
- Can we observe completion or terminal state?
- Can we observe failures, pauses, skips, and cancellations?
- Can we observe feedback or verification behavior?
- Can we tell when source/citation behavior was available versus used?
- Can we join to customer-owned aggregate outcomes?

Coverage outputs should include:

- high-confidence coverage share,
- ambiguous-boundary share,
- evidence-gap share,
- source-family coverage,
- known caveats,
- withheld small-cell notes.

Safe interpretation:

```text
Source coverage is measurement readiness. It is not value.
```

## 12. Outcome Readiness Layer

Outcome Readiness tells leaders whether aggregate behavioral evidence can be
connected to business-owned outcome context.

Examples:

- support ticket response metrics,
- support ticket age,
- onboarding project dates,
- implementation milestone duration,
- quality review outcomes,
- approved customer/account metrics.

Current support outcome context example:

| Window | Support tickets | p50 days elapsed | p90 days elapsed | p50 business minutes to first response |
| --- | ---: | ---: | ---: | ---: |
| window_1 | 4,469 | 13 | 26 | 183 |
| window_2 | 4,549 | 15 | 35 | 212 |
| window_3 | 4,163 | 15 | 43 | 218 |

Safe interpretation:

```text
Outcome context can support value investigation, but stronger interpretation is
held until an approved aggregate behavior-to-outcome join key exists.
```

## 13. Value Hypotheses

Value hypotheses route evidence into a safe business question.

Current AIVM value types:

- `ACCELERATION`
- `QUALITY_PREMIUM`
- `NET_NEW`
- `UNCLASSIFIED`

### Acceleration

Question:

```text
Is AI helping work move faster?
```

Evidence that can support investigation:

- lower latency where corroborated,
- low abandonment,
- recovery after friction,
- repeated usage in a workflow,
- customer-owned outcome context.

Blocked claim:

```text
AI saved X dollars.
```

### Quality Premium

Question:

```text
Is AI improving work quality, reviewability, or decision support?
```

Evidence that can support investigation:

- verification presence,
- edited rather than blindly accepted output,
- recovery after failed attempts,
- lower rework loops,
- customer-owned quality outcomes.

Blocked claim:

```text
AI improved quality by X%.
```

### Net New

Question:

```text
Is AI enabling work that was not previously feasible or routinely performed?
```

Evidence that can support investigation:

- new workflow surface adoption,
- delegation depth,
- reusable workflow patterns,
- customer-declared intervention,
- customer-owned outcome context.

Blocked claim:

```text
AI created net-new business value without customer-owned evidence.
```

### Unclassified

Question:

```text
Do we have enough evidence to classify the value path?
```

If not, evidence should stay unclassified or held.

## 14. Executive Outputs

The visual's bottom band shows what FluencyTracr can safely produce for leaders.

### Scale Readiness

Meaning:

```text
Aggregate evidence suggests a workflow or segment may be ready for customer-
owned scale-and-measure review.
```

Required evidence:

- surfaced aggregate evidence,
- adequate suppression bucket proof,
- Velocity and Depth context,
- Reliability/Quality context where aligned,
- source coverage caveats,
- no blocked claims violated.

### Trust Evidence Gaps

Meaning:

```text
The workflow has AI activity, but trust interpretation is held because source
coverage, verification, continuation, or boundary evidence is incomplete.
```

Safe next action:

```text
Repair verification and feedback loops or improve source coverage.
```

### Workflow Redesign Needs

Meaning:

```text
Behavior suggests friction, heavy iteration, abandonment, shallow adoption, or
misfit between AI surface and workflow.
```

Safe next action:

```text
Redesign the workflow before scaling.
```

### Source Coverage Gaps

Meaning:

```text
The data cannot yet support interpretation.
```

Safe next action:

```text
Fix trace/run/action/continuation/outcome coverage before making claims.
```

### Value Investigation Path

Meaning:

```text
Evidence is strong enough to ask a business value question, but not to claim ROI
or causality.
```

Safe next action:

```text
Attach customer-owned assumptions and approved aggregate outcome evidence.
```

## 15. Worked Example

Assume a customer-approved support workflow has:

```text
cohort_size = 120
window_days = 90
verification_presence_rate = 0.70
recovery_success_rate = 0.60
abandonment_rate = 0.10
friction_loop_rate = 0.20
frequency_index = 1.08
engagement_index = 1.00
breadth_index = 0.93
raw_time_saved_claim_hours = 300
```

### Velocity

```text
velocity_index = (1.08 + 1.00 + 0.93) / 3
velocity_index = 1.003
```

Interpretation:

```text
Adoption energy is near calibration reference, but subdimensions should remain
visible because frequency, engagement, and breadth mean different things.
```

### Reliability

```text
reliability_factor =
  0.5 + 0.175 + 0.150 - 0.025 - 0.050

reliability_factor = 0.750
```

Interpretation:

```text
Operational dependability evidence is moderately strong, assuming the workflow
clears suppression gates.
```

### Quality Multiplier

```text
quality_multiplier =
  1.0 + 0.210 + 0.150 - 0.035 - 0.060

quality_multiplier = 1.265
```

Illustrative adjusted assumption:

```text
300 claimed hours * 1.265 = 379.5 hours
```

Boundary:

This is not a realized savings claim. It is only an illustration of how the
multiplier works after gates clear and assumptions are approved.

### Time-Saved Range

If the customer has not provided an approved aggregate behavior-to-outcome join
key, the Time-Saved Defensibility Range remains held:

```json
{
  "raw_time_saved_claim_hours": 300,
  "defensibility_range_hours": null,
  "time_saved_gate_state": "HELD_FOR_APPROVED_AGGREGATE_JOIN",
  "causality_status": "NOT_CAUSAL"
}
```

Interpretation:

```text
The evidence supports value investigation, not a range output.
```

## 16. What Makes FluencyTracr Different

FluencyTracr is not unique because it counts usage. Usage counts are easy to
replicate.

The defensible uniqueness is the evidence model:

1. It separates activity from work movement.
2. It separates Velocity from Depth.
3. It treats verification and recovery as trust context, not simplistic thumbs
   or citation-click metrics.
4. It preserves evidence gaps instead of hiding them.
5. It requires source coverage before interpretation.
6. It keeps suppressed evidence null rather than filling in fallback values.
7. It blocks ROI, causality, and productivity claims until customer-owned
   outcome evidence and approved assumptions exist.
8. It stays organizational and aggregate, not individual or surveillance-based.

The commercial message should be:

```text
FluencyTracr turns aggregate AI telemetry into governed evidence about whether
AI-assisted work is moving, recovering, being verified, and becoming embedded
enough to support safer value-realization decisions.
```

## 17. Non-Goals

FluencyTracr does not:

- calculate ROI,
- prove causality,
- prove output correctness,
- measure individual productivity,
- score employees,
- rank teams,
- rank managers,
- create maturity scores,
- inspect raw prompts,
- inspect raw outputs,
- require HR data,
- require survey joins,
- require enablement-system access,
- convert missing evidence into positive or negative claims.

## 18. Source Files Behind This Report

Primary repo-grounded references:

- `AGENTS.md`
- `docs/concepts/VELOCITY.md`
- `docs/concepts/DEPTH.md`
- `docs/contracts/velocity-index.md`
- `docs/contracts/reliability-factor.md`
- `docs/contracts/quality-multiplier.md`
- `docs/contracts/value-confidence/time-saved-defensibility-range.md`
- `docs/contracts/value-confidence/trust-episode-boundary-input.md`
- `docs/contracts/value-confidence/internal-scale-readiness-readout.md`
- `backend/src/services/signal-detectors.ts`
- `shared/src/fluencyTracrV1Signal.ts`
- `dogfood-output/trust-episode-boundary-pilot/TRUST_EPISODE_PILOT_EXECUTIVE_READOUT.md`
