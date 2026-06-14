# Organizational Segmentation

## 1. Purpose

This document defines Organizational Segmentation as a future V4 concept for FluencyTracr. It establishes the conceptual basis before any schema, endpoint, transformer behavior, dashboard, or customer-facing readout depends on internal organization slices. Segmentation is load-bearing on the governance posture because it can make AI Scale Readiness more actionable, but it can also create ranking or surveillance risk if it is not constrained by aggregate-only boundaries.

## 2. The Actionability Gap

A single organization-level readout can show whether aggregate AI behavior is strong, weak, or incomplete. It cannot show where intervention should happen.

Executives and AIOMs need to know whether support should focus on new hires, managers, specific functions, role families, regions, or cohorts with high activity but weak work integration. Without segmentation, the organization sees a blended average and may miss where enablement, workflow redesign, or trust calibration is needed.

Segmentation exists to make aggregate readouts actionable without turning FluencyTracr into a people analytics or performance system.

## 3. Definition

Organizational Segmentation is the governed use of approved aggregate cohort labels to interpret FluencyTracr evidence. A segment is an intervention context, not an identity record.

Allowed segment families include:

- department or business function,
- role family,
- level band,
- manager vs IC,
- region,
- tenure cohort,
- Velocity band,
- Depth Repertoire band.

The first five usually require HRIS, Workday, directory, or customer-owned organization metadata. Those joins must happen inside the customer or Glean boundary. FluencyTracr may receive only aggregate distributions and safe segment labels. It must never receive raw HR records, employee identifiers, raw titles, manager chains, or person-level usage rows.

Behavior-derived segments such as Velocity band or Depth Repertoire band may be computed by the customer-side transformer, but only aggregate distributions may cross into FluencyTracr.

## 4. Customer-Side Join Boundary

The privacy boundary follows the V3 ingest model: raw GCE and raw organization data remain inside the customer environment.

The customer-side transformer may join approved GCE-derived per-user computations to approved organization metadata only inside that boundary. The output must aggregate before transfer. A valid output can say that a segment such as `tenure_cohort=0_90_days` has a cohort size and percentile distributions. It cannot include the people in that segment.

This makes segmentation structurally private rather than procedurally private. FluencyTracr does not need to promise not to inspect individual HR or usage data because it does not receive that data.

## 5. Segment Readiness And Coverage

Every segmented readout needs a segment coverage section. Coverage should show which segment families are available, which are missing, which are suppressed, and which are held because metadata is incomplete.

Coverage checks should include:

- segment population count,
- percent of events assignable to the segment family,
- number of surfaced slices,
- number of suppressed slices,
- missing metadata rate,
- unresolved join rate,
- whether the segment family is approved for interpretation.

Missing segment metadata is not a negative signal. It is a data readiness gap.

## 6. Per-Segment Suppression

Every segment gates independently. A suppressed segment must not be rescued by a broader organization-level aggregate.

For example, if a role family has fewer than five users in a window, it remains suppressed even if the parent department has enough volume. A readout may show that a slice was suppressed and why, but it must not expose reconstructed values, hidden distributions, or indirect rankings.

Cross-slice rollups must be read-only summaries after independent evaluation. They must not create a path to infer small segment behavior.

## 7. What This Is Not

Organizational Segmentation is not individual scoring.

It is not comparative team evaluation.

It is not manager ranking.

It is not comparative department evaluation.

It is not productivity measurement.

It is not employee performance inference.

It is not a people analytics replacement.

It is not an HR data ingestion strategy.

It is not a way to identify who is or is not using AI.

It is not a way to compare teams by "best" or "worst" AI behavior. Segment language must stay anchored to intervention: where to coach, where to scale, where to redesign, where to calibrate trust, and where to hold.

## 8. Relationship to AI Scale Readiness

AI Scale Readiness answers what action the evidence supports. Segmentation answers where that action may be needed.

The same readiness pattern can imply different interventions by segment. Low repertoire among new hires may be an onboarding gap. Low verification in a delegation-heavy segment may be a trust calibration gap. High abandonment in a role family may indicate a workflow design issue. A suppressed segment means no interpretation is allowed.

Segments make the portfolio operational only when they remain aggregate, independently gated, and non-comparative.

## 9. Relationship to Economic Impact

Segmentation can identify where economic value investigation may be focused, but it must not produce economic value by segment without separate governance approval.

A high-value function with low AI activation may point to unrealized value. A segment with strong repeat use and reliable workflow behavior may point to a scaling opportunity. Those are value hypotheses, not ROI proof.

Any economic interpretation must remain aggregate, caveated, customer-attested where outcome data is involved, and non-causal by default.

## 10. Glean Dogfood Path

For Glean internal dogfood, segmentation should proceed in layers:

1. Use tenure cohorts and behavior-derived cohorts first because they can be derived without raw HR attributes leaving the boundary.
2. Add department, function, level band, manager/IC, or region only if an approved aggregate join path exists.
3. Report unavailable segment families as data readiness gaps.
4. Evaluate three 60-day-compliant windows before any promotion decision.

The dogfood question is not which internal group performs best. The question is whether segmentation makes the AI Scale Readiness Portfolio more actionable without weakening the invariants.

## 11. Governance Invariants Preserved

Organizational Segmentation preserves all nine invariants:

1. **No new canonical events.** Segments are slice labels on aggregate evidence.
2. **No new suppression reasons.** Existing suppression reasons apply independently.
3. **No tunable thresholds.** Segment eligibility cannot be admin-adjusted.
4. **No admin overrides.** Suppressed segments remain suppressed.
5. **No individual scoring.** Raw person and HR data never cross the boundary.
6. **Default verdict is SUPPRESS.** Segment readouts require gates to clear.
7. **Latency is corroborative only.** It cannot surface a segment.
8. **Assurance Harness stays green.** Future implementation must test segment suppression.
9. **Per-slice independence.** Each segment is evaluated independently.

## 12. Open Questions

- Which segment families should be approved for Glean internal dogfood first?
- What bucket sizes are needed for level, tenure, and role family labels to avoid re-identification risk?
- How should missing HR or directory metadata be reported without implying poor readiness?
- Should behavior-derived segments be allowed in customer-facing readouts, or remain internal research first?
- What segment coverage is sufficient before a portfolio can be considered actionable?

## 13. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. The Organizational Segmentation concept is credited to James Kelley: FluencyTracr must help leaders identify which aggregate cohorts need support while preserving the boundary that segments are intervention contexts, not performance groups.
