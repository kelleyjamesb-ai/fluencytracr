# Velocity

## 1. Purpose

This document defines Velocity as a future V2 primitive for FluencyTracr. It establishes the conceptual basis before any code is written, before any schema is changed, and before any product surface depends on it. The document is load-bearing on the governance posture: Velocity may only advance if it preserves the V1 invariants, the scope guardrails, and the aggregate-only evidence model.

## 2. The Variable Aggregate Signals Miss

Aggregate completion, recovery, and abandonment rates are necessary, but they conflate different behaviors. A cohort can show the same average runs per user while hiding three different populations: one person using AI every workday across many surfaces, one person using it heavily for a single burst, and one person touching it once a week in one narrow workflow. The average looks identical; the reality does not.

That is the gap the AI Fluency Instrument was created to address through stated evidence: confidence, behavior change, intent, and perceived impact are not visible from aggregate workflow totals alone. Velocity is the behavioral counterpart. It observes whether AI use is frequent, persistent, and broad enough at the cohort distribution level to make value-realization claims more defensible without identifying any person.

## 3. Definition: What Velocity Is

Velocity is a cohort-distribution-level observation of three independent dimensions of individual AI use:

- **FREQUENCY** - runs per active day
- **ENGAGEMENT** - active days per window
- **BREADTH** - distinct surfaces touched per window

Each dimension is computed from per-user usage records, but FluencyTracr may only emit cohort percentile distributions: p10, p50, p90, and p99. The system does not name, rank, inspect, or report any person. Velocity exists to describe the shape of adoption in a cohort, not the behavior of any member of that cohort.

## 4. Why Three Dimensions, Not One

The empirical evidence from scio-prod shows that the three dimensions vary independently across populations.

At Glean, where dogfood usage is saturated, frequency dominates. Engagement is effectively at ceiling: many active users appear on nearly every day of the observed window. Breadth is also broadly saturated. In that environment, the diagnostic question is less "are people showing up?" and more "how intensely are they using available surfaces?"

At customers, the expected shape will be different. Engagement and breadth will usually dominate because mixed adoption populations often include users who have access but do not return consistently or who stay inside one narrow entry point. Frequency may be more uniform among active users.

Composing the three dimensions into a single index too early would erase the signal that makes Velocity useful. The framework keeps FREQUENCY, ENGAGEMENT, and BREADTH independent. A composite Velocity Index may be derived downstream, but it is not the fundamental signal.

## 5. The Calibration Cohort

Velocity is meaningful only relative to a baseline. FluencyTracr uses a calibration cohort: a stable, observed-fluency-saturated reference population that defines percentile anchors. Customer cohorts are evaluated relative to the calibration cohort, never on an absolute universal scale.

This matters because AI use norms vary by customer, role, deployment maturity, and surface availability. A raw frequency count has no durable meaning across contexts. A relative cohort distribution asks a narrower question: how does this cohort's observed usage shape compare with a known high-exposure reference population?

The calibration cohort is not a target every customer must mimic. It is an anchor for interpretation, not a universal standard.

## 6. How Velocity Preserves the Governance Posture

Velocity must preserve all nine invariants:

1. **No new canonical events.** Velocity is a future V2 concept and does not add to the locked V1 event set.
2. **No new suppression reasons.** V1 suppression reasons remain unchanged. Any future Velocity implementation must reuse or explicitly govern any suppression behavior before code exists.
3. **No tunable thresholds.** Percentile anchors and gates, if implemented, must be compiled constants or governed artifacts, not admin-adjustable knobs.
4. **No admin overrides.** A suppressed Velocity distribution cannot be manually surfaced.
5. **No individual scoring.** The math may run over per-user usage rows, but only cohort percentile distributions may be emitted.
6. **Default verdict is SUPPRESS.** Cohorts with fewer than five users suppress automatically, identical to the existing fail-closed gate.
7. **Latency is corroborative only.** Velocity does not make latency a trigger. It describes usage distribution, not speed as standalone value.
8. **Assurance Harness stays green.** Any implementation PR must preserve the assurance harness and add coverage before use.
9. **Per-slice independence.** Velocity distributions are computed independently per workflow, JBTD, and persona slice. Small slices suppress independently; they are not rescued by broader aggregation.

Velocity is allowed only if these constraints remain stronger than the feature pressure to expose more detail.

## 7. What Velocity Is Not

Velocity is NOT an individual fluency score.

Velocity is NOT a productivity surveillance signal.

Velocity is NOT a leaderboard or user ranking.

Velocity is NOT a predictor of any specific person's behavior.

Velocity is NOT a hiring, performance, or evaluation input.

Velocity is NOT a replacement for the AI Fluency Instrument's stated-evidence layer.

Any implementation, dashboard, analysis, or customer narrative that uses Velocity to identify, compare, pressure, or evaluate people is out of scope. That is not a product gap. It is a hard stop.

## 8. How Velocity Will Connect to V2 Outputs (forward-looking)

This section is forward-looking and does not commit FluencyTracr to any specific implementation.

Velocity may eventually inform the Quality Multiplier by distinguishing broad, persistent use from thin or episodic use. It may also support a Velocity Index as a derived output, provided the underlying FREQUENCY, ENGAGEMENT, and BREADTH distributions remain visible and independently governed. Finally, Velocity may strengthen the convergence diagnostic with the AI Fluency Instrument by comparing stated evidence with observed aggregate behavior: what people report and what the cohort distribution shows.

These connections are possible V2 uses. They do not alter V1 behavior.

## 8a. Relationship to Depth

Velocity measures adoption energy. Depth measures work integration.

High Velocity without Depth may indicate fragile scale: the cohort is active,
but the evidence may not show durable workflow integration, reuse,
verification, recovery, or judgment behavior.

High Depth with low Velocity may indicate focused expertise, limited rollout,
or a narrow workflow that is integrated but not yet broadly adopted.

Economic confidence requires both. V4 should use Velocity and Depth together to
distinguish activity from durable operating leverage.

## 9. Empirical Foundation

This concept is motivated by a velocity diagnostic run on scio-prod over a 60-day window. The data reflects internal Glean usage and should be treated as a calibration-cohort reference, not a customer baseline.

| Observation | Value |
| --- | ---: |
| Distinct users | 1,553 |
| Active days p50 | 61 |
| Active days p90 | 61 |
| Frequency p10 | 11 runs/active-day |
| Frequency p50 | 71 runs/active-day |
| Frequency p99 | 701 runs/active-day |
| Breadth p50 | 7 distinct surfaces/window |
| Breadth p99 | 12 distinct surfaces/window |

The key finding is not that Glean users are a universal benchmark. The finding is that frequency, engagement, and breadth separate in ways aggregate workflow quality signals cannot express on their own.

## 10. Open Questions

These questions are deliberately open and must be resolved before any V2 implementation:

- What normalization function should produce a composite Velocity Index?
- Should Velocity Index ever participate in SURFACE/SUPPRESS decisions, or remain corroborative only?
- How should windows shorter than 60 days handle the ENGAGEMENT dimension?
- Should per-slice independent gating apply to each dimension separately, or only to the composite output?

## 11. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The velocity-as-AI-fluency bridge insight is credited to James Kelley and grounded in the scio-prod 60-day empirical diagnostic summarized above.
