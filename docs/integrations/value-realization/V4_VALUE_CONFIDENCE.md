# V4 Value Confidence for Glean Value Realization

## Purpose

V4 explains how FluencyTracr can extend Glean value realization with bounded executive economic decision artifacts.

FluencyTracr does not replace Glean's time-saved pipeline. FluencyTracr qualifies which parts of the claim are defensible. V4 makes Glean value claims safer, more bounded, and more useful to CFOs, CIOs, and CEOs.

## How V4 Extends V3

V3 establishes the production evidence foundation:

- raw GCE stays in the customer environment,
- the customer-side transformer emits aggregate cohort distributions,
- FluencyTracr validates governed calibration,
- fail-closed verdicts are stored immutably,
- reportability consumers can replay verdicts.

V4 composes those governed outputs into executive artifacts. It does not add a raw-data path, new canonical events, new suppression reasons, or suppression overrides.

## Input: Glean Time-Saved Estimate

The Glean time-saved estimate remains the commercial anchor. V4 treats it as an input claim that needs defensibility qualification.

The estimate should be preserved as source context, not rewritten as FluencyTracr-owned ROI.

## Input: FluencyTracr V3 Verdicts

V3 verdicts determine whether aggregate evidence can be used. Suppressed V3 verdicts block V4 economics.

If a V3 verdict is `SUPPRESS`, V4 must not expose dollar values, hours saved, upside estimates, or portfolio totals for that slice.

## Input: Velocity

Velocity measures adoption energy through aggregate frequency, engagement, and breadth distributions.

Velocity helps V4 distinguish isolated use from broad, persistent usage patterns.

## Input: Depth

Depth measures work integration through aggregate evidence of verification, workflow repertoire, reuse, recovery, and judgment behavior.

Depth helps V4 distinguish raw activity from durable operating leverage.

Depth Repertoire is currently approved only as aggregate caveat/context in V4
value-confidence artifacts. It must not change confidence bands, surfacing
eligibility, Time-Saved Defensibility Range, leakage severity, scale-readiness
zones, trust labels, ROI language, causal claims, prediction claims, or any
customer-facing economic number unless a later calibration decision explicitly
promotes that use.

## Output: Time-Saved Defensibility Range

The Time-Saved Defensibility Range qualifies the raw time-saved estimate using governed aggregate evidence.

It should present conservative, expected, and upside scenarios only when evidence is surfaced and caveated. It is not realized financial ROI.

## Output: AI Value Leakage Map

The AI Value Leakage Map shows where AI investment may not be converting into defensible value.

Leakage may reflect velocity, depth, reuse, verification, recovery, or friction gaps. Any estimate based on potential value must be labeled scenario-based unless validated by outcome evidence.

Depth Repertoire may appear in the leakage map only as aggregate
caveat/context. The
[V4 AI Value Leakage Map Caveat Propagation Decision](../../research/V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md)
records `PASS_CAVEAT_PROPAGATION` for that narrow use; it does not authorize
leakage severity adjustment, value-at-risk adjustment, surfacing eligibility
changes, or economic dependency.

## Output: AI Scale Readiness Portfolio

The AI Scale Readiness Portfolio maps workflows into investment zones such as scale, harvest, coach, redesign, govern, or suppress.

This is a workflow investment signal. It is not a team ranking, employee capability label, or maturity score.

## Output: Trust Calibration Index

The Trust Calibration Index evaluates whether verification behavior appears appropriate for workflow risk and available evidence.

It does not reward maximum verification. It interprets trust behavior with quality, recovery, risk, and outcome context.

## CFO-Safe Caveats

Every V4 readout should carry CFO-safe caveats:

- The readout qualifies claim defensibility; it does not prove realized ROI.
- Default causality status is `NOT_CAUSAL`.
- Estimates are bounded by evidence grade and suppression state.
- Customer-stated assumptions cannot upgrade evidence grade.
- Outcome evidence can strengthen confidence but does not automatically establish causality.

## What Glean Can Claim

When evidence surfaces and caveats travel with the readout, Glean can claim:

- which parts of a time-saved estimate are better supported,
- where aggregate evidence suggests value conversion is strong or weak,
- which workflows are ready for scale, harvest, coach, redesign, or govern decisions,
- which trust behaviors appear calibrated or ambiguous.

## What Glean Must Not Claim

Glean must not claim:

- FluencyTracr calculates realized ROI,
- FluencyTracr proves causal productivity lift,
- suppressed evidence supports economic values,
- customer-stated assumptions upgrade evidence grade,
- V4 predicts future value without validation,
- V4 ranks individuals, teams, managers, departments, or customers.

## Example Executive Readout

```markdown
Workflow: workflow:CHAT
V3 verdict: SURFACE
Velocity: medium adoption energy
Depth: medium work integration
Trust calibration: calibrated with caveats
Time-saved defensibility: conservative to expected range only
Causality status: NOT_CAUSAL
Caveat: This readout qualifies the Glean time-saved estimate. It does not prove realized financial ROI or causal productivity lift.
```

## Implementation Readiness Checklist

- [ ] V4 Markdown concepts and contracts are reviewed.
- [ ] Caveat propagation is validated with [V4 Value Confidence Caveat
      Propagation Runbook](../../research/V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md).
- [ ] Readout-specific caveat decisions are recorded, including
      [TSDR](../../research/V4_TSDR_CAVEAT_PROPAGATION_DECISION.md) and
      [AI Value Leakage Map](../../research/V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md).
- [ ] Suppressed economics behavior is specified and tested before implementation.
- [ ] Depth mapping is defined from existing aggregate evidence only.
- [ ] Trust Calibration interpretation is risk-adjusted and caveated.
- [ ] Reportability integration preserves blocked claims and caveats.
- [ ] No runtime implementation begins before governance review.
