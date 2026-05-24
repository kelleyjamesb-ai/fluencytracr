# Value Confidence Contract

## Purpose

The Value Confidence contract defines the parent V4 contract for executive economic decision artifacts. It composes governed aggregate behavioral evidence into bounded, caveated confidence readouts.

V4 qualifies the defensibility of AI value claims. It does not calculate realized ROI.

## Contract Status

Status: documentation-stage concept contract. No runtime implementation exists in this PR.

## Supported Economic Readouts

V4 may support:

- Time-Saved Defensibility Range,
- AI Value Leakage Map,
- AI Scale Readiness Portfolio,
- Trust Calibration Index.

Each readout is aggregate-only, caveated, and fail-closed.

## Inputs

### V3 aggregate verdicts

V3 verdicts provide the fail-closed foundation. Suppressed verdicts remain suppressed.

### Velocity

Velocity measures adoption energy across frequency, engagement, and breadth distributions.

### Depth

Depth measures work integration through verification, repertoire, reuse, recovery, and judgment evidence.

Depth Repertoire is hardened as a Depth sub-contract, but it is not yet approved
as an input to V4 economic readouts. A later value-confidence review must
explicitly allow it before Time-Saved Defensibility Range, AI Value Leakage Map,
AI Scale Readiness Portfolio, Trust Calibration Index, or any customer-facing
economic artifact may depend on it.

### Quality Multiplier

Quality Multiplier qualifies time-saved estimates using aggregate workflow quality evidence.

### Reliability Factor

Reliability Factor qualifies whether surfaced evidence is operationally dependable.

### Outcome Evidence

Outcome Evidence stores customer-attested aggregate KPI evidence. Outcome evidence may strengthen confidence but does not automatically establish causality.

### Raw time-saved claim

The raw time-saved claim remains an input anchor. FluencyTracr qualifies the claim; it does not replace the source estimate.

## Output Shape

A Value Confidence readout should include:

- `schema_version`,
- `org_id`,
- `cohort_id`,
- `workflow_id` or portfolio key,
- `verdict`,
- `suppression_reason`,
- `economic_readout_type`,
- `causality_status`,
- `evidence_grade`,
- `confidence_band`,
- readout-specific aggregate fields,
- `required_caveats`,
- `blocked_claims`.

Suppressed readouts must not include economic values, hours saved, upside estimates, or portfolio totals.

## Causality Status

### NOT_CAUSAL

Default status. The readout is bounded evidence for claim safety, not causal proof.

### ASSOCIATIONAL

Aggregate evidence is directionally aligned with the claim, but confounding remains.

### VALIDATED_LEADING_INDICATOR

Evidence has been validated as an indicator in governed historical or holdout analysis, but still does not prove direct causality.

### EXPERIMENTAL_EVIDENCE

Evidence comes from a governed experimental design with explicit limitations and caveats.

Default causality_status is NOT_CAUSAL.

## Evidence Grades

V4 should preserve existing evidence grade language:

- `OBJECTIVE`
- `CALIBRATED`
- `QUALITATIVE`

Customer-stated assumptions cannot upgrade evidence grade.

## Required Caveats

Every economic readout must carry caveats. Caveats should state:

- what evidence supports the readout,
- what evidence is missing or suppressed,
- whether the readout is non-causal,
- whether any estimate is scenario-based,
- what claims remain blocked.

## Suppression Rules

Default verdict is `SUPPRESS`.

Suppressed evidence cannot produce dollar values, hours saved, upside estimates, or portfolio totals.

Suppression reasons remain the existing five. This contract does not add suppression reasons.

Outcome Evidence cannot elevate a suppressed verdict.

## Blocked Claims

V4 blocks claims that imply:

- realized ROI calculation,
- causal productivity lift,
- person-level attribution,
- team or manager ranking,
- productivity measurement,
- customer-facing prediction without validation,
- hidden reconstruction of suppressed economics.

## Non-Capabilities

V4 is not an ROI calculator.

V4 is not a prediction engine.

V4 is not a maturity scorer.

V4 is not a surveillance or enforcement system.

V4 is not a replacement for Glean's time-saved pipeline.

## Example Economic Readout

```json
{
  "schema_version": "FT_VALUE_CONFIDENCE_2026_05_DOCS_ONLY",
  "org_id": "org-northstar-enterprise",
  "cohort_id": "customer-aiom-60d",
  "workflow_id": "workflow:CHAT",
  "verdict": "SURFACE",
  "suppression_reason": null,
  "economic_readout_type": "TIME_SAVED_DEFENSIBILITY_RANGE",
  "causality_status": "NOT_CAUSAL",
  "evidence_grade": "CALIBRATED",
  "confidence_band": "MEDIUM",
  "time_saved_defensibility_range": {
    "unit": "hours",
    "conservative": 120,
    "expected": 180,
    "upside": 240
  },
  "required_caveats": [
    "This range qualifies a claimed time-saved estimate; it does not prove realized financial ROI.",
    "Default causality status is NOT_CAUSAL.",
    "Every downstream claim must preserve these caveats."
  ],
  "blocked_claims": [
    "realized ROI",
    "causal productivity lift",
    "individual productivity",
    "team ranking"
  ]
}
```

## Future Schema Work

Future work may add minimal schemas for each readout after the Markdown contracts stabilize. Schema work must preserve fail-closed suppression, aggregate-only outputs, and caveat propagation.
