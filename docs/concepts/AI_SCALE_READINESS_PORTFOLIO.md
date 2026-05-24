# AI Scale Readiness Portfolio

## 1. Purpose

This document defines the AI Scale Readiness Portfolio as a future V4 concept for FluencyTracr. It establishes the conceptual basis before any schema, endpoint, dashboard, contract hardening, or customer-facing readout depends on it. The portfolio is load-bearing on the governance posture because it converts aggregate behavioral evidence into executive action guidance: where to scale, where to coach, where to redesign, where to calibrate trust, and where to hold because evidence is not strong enough.

## 2. The Decision Gap

V1 and V2 can say whether aggregate evidence surfaces, whether observed workflow behavior looks reliable enough to qualify a value claim, and whether adoption has velocity. V3 can ingest aggregate distributions through a governed privacy boundary. V4 adds the Value Confidence Layer.

What is still missing is a practical investment lens. Executives do not only need to know that a workflow has activity or that a cohort has velocity. They need to know what action the evidence supports. High activity may mean a workflow is ready to scale, or it may mean the organization is spending energy in a shallow or brittle pattern. Low activity may mean poor adoption, or it may mean a narrow workflow that is deeply embedded for the right group.

The AI Scale Readiness Portfolio exists to keep that distinction explicit. It is the bridge from governed evidence to action planning, not a scorecard.

## 3. Definition

The AI Scale Readiness Portfolio is an aggregate executive readout that groups governed workflows, surfaces, or approved cohort segments into readiness zones. A zone is an action posture. It is not a grade, rank, maturity label, or performance judgment.

The portfolio composes existing and future-governed aggregate evidence:

- V3 aggregate verdicts and suppression state,
- V1 behavior signals such as completion, abandonment, recovery, verification, and latency as corroborative context,
- V2 Velocity distributions,
- Depth and Depth Repertoire where governance allows,
- Quality Multiplier,
- Reliability Factor,
- Trust Calibration,
- Outcome Evidence when customer-attested and aggregate,
- surface taxonomy and AGENT sub-surface context.

Depth Repertoire is currently hardened as a Depth sub-contract but remains held from value-confidence dependency until a later 60-day-compliant calibration decision explicitly allows it. Until that happens, the portfolio may reference Depth Repertoire as research context or caveat source only.

## 4. Readiness Zones

| Zone | Meaning | Action |
| --- | --- | --- |
| Ready To Scale | Aggregate evidence suggests the workflow or segment has enough usage, stability, quality, and integration context to consider broader rollout. | Scale playbooks and reinforce. |
| Enablement Opportunity | Usage exists, but repertoire, repeat use, or work-integration evidence is weak or uneven. | Coach and train. |
| Workflow Design Opportunity | Usage exists, but abandonment, friction, poor recovery, or quality patterns suggest the workflow may not fit the work. | Redesign workflow, prompt path, or operating process. |
| Trust Calibration Opportunity | Usage exists, but verification, feedback, recovery, or risk-adjusted trust evidence is weak, ambiguous, or mismatched. | Reinforce review, citation, feedback, or risk-boundary behavior. |
| Adoption Expansion Opportunity | Activation or surface repertoire is narrow, but there is enough aggregate evidence to target expansion. | Expand awareness and use cases. |
| Hold / Insufficient Evidence | Suppression, missing metadata, unstable windows, unresolved joins, or unsafe segment coverage prevents interpretation. | Do not act yet. |

These zones are intentionally action-oriented. The portfolio should answer what a value-realization team should do next, not which group is better.

## 5. Data Readiness Gate

Every portfolio readout must separate low readiness from insufficient evidence. Missing or incomplete data is not a negative signal.

The data readiness gate should report:

- surface coverage,
- segment coverage,
- verification signal availability,
- AGENT metadata availability,
- reusable workflow observability,
- suppression rate,
- window stability,
- HR or directory metadata availability,
- missing or unresolved joins.

If a gate fails, the portfolio should use Hold / Insufficient Evidence. It must not infer readiness from absence.

## 6. What This Is Not

The AI Scale Readiness Portfolio is not a scorecard.

It is not a comparative team evaluation.

It is not a manager ranking.

It is not a maturity label.

It is not a productivity measurement.

It is not an ROI calculator.

It is not a prediction engine.

It is not a causal claim.

It is not a way to rescue suppressed evidence.

It is not a substitute for business context. Decision zones are evidence-informed action postures that require customer and workflow context before action.

## 7. Relationship to Organizational Segmentation

Segmentation makes the portfolio operational. The same readiness zone can mean different actions for different aggregate groups. A new-hire cohort with low repertoire may need onboarding. A tenured manager cohort with high velocity but weak verification may need trust calibration. A function with high abandonment may need workflow redesign.

Segmentation must be aggregate-only and independently suppressed. Segments are intervention groups, not performance groups. Department, function, role family, level band, manager/IC status, region, tenure, Velocity band, or Depth Repertoire band may be useful only when computed inside the customer or Glean boundary and emitted as aggregate distributions.

## 8. Relationship to Economic Impact

The portfolio does not calculate economic impact. It identifies where an economic value investigation may be defensible.

For example, Ready To Scale may justify asking which playbooks can be expanded. Workflow Design Opportunity may justify investigating where friction consumes capacity. Trust Calibration Opportunity may justify investigating whether weak verification or recovery could undermine claimed value.

Any later economic interpretation must use governed caveats, customer-owned assumptions, and aggregate evidence. It must not claim realized ROI, causal productivity lift, guaranteed savings, or employee performance.

## 9. Glean Dogfood Validation

Before contract hardening, the portfolio should be tested against internal Glean aggregate evidence over three 60-day-compliant windows:

- 2026-03-23 to 2026-05-22,
- 2026-02-21 to 2026-04-22,
- 2026-01-22 to 2026-03-23.

Each window should include V1 behavior signals, V2 Velocity, surface taxonomy, AGENT sub-surfaces, Quality Multiplier, Reliability Factor, Trust Calibration evidence, reusable leverage where observable, and segmentation where safe.

The validation question is: does the portfolio explain something materially more useful than usage volume or Velocity alone?

## 10. Governance Invariants Preserved

The portfolio preserves all nine invariants:

1. **No new canonical events.** It composes existing governed evidence.
2. **No new suppression reasons.** Hold / Insufficient Evidence is a portfolio zone, not a suppression reason.
3. **No tunable thresholds.** Any future constants must be governed and compiled, not admin-adjustable.
4. **No admin overrides.** Suppressed evidence cannot be manually promoted into a zone.
5. **No individual scoring.** Outputs remain aggregate-only.
6. **Default verdict is SUPPRESS.** Portfolio interpretation requires surfaced evidence.
7. **Latency is corroborative only.** Latency can support workflow design context but cannot surface a zone alone.
8. **Assurance Harness stays green.** Any implementation must add coverage.
9. **Per-slice independence.** Each workflow, surface, and segment gates independently.

## 11. Open Questions

- Which zone language is clearest for AIOMs and executives without sounding like a score?
- Which evidence bundle is required before a workflow can leave Hold / Insufficient Evidence?
- Should portfolio zones remain qualitative or later map to bounded contract enums?
- How should Depth Repertoire appear while value-confidence calibration remains held?
- What level of segment coverage is required before segment-level portfolio readouts are useful?
- Which economic investigations are appropriate for each zone?

## 12. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The AI Scale Readiness Portfolio concept is credited to James Kelley: V4 must help leaders decide where AI is ready to scale, where enablement or workflow redesign is needed, and where evidence remains too weak to support action.
