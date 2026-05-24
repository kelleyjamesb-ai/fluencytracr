# V4 Time-Saved Defensibility Range Caveat Propagation Decision

## Purpose

This document records the caveat-propagation review for whether the Time-Saved
Defensibility Range contract can carry Depth Repertoire as aggregate
caveat/context without changing any range value, confidence band, surfacing
eligibility decision, economic interpretation, or blocked claim.

It applies the
[V4 Value Confidence Caveat Propagation Runbook](./V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md)
to the documentation-stage
[Time-Saved Defensibility Range contract](../contracts/value-confidence/time-saved-defensibility-range.md).

This is a research and contract decision record. It adds no APIs, schemas,
Prisma migrations, runtime services, frontend surfaces, customer-facing
economic readouts, ROI calculation, causal claim, prediction claim, individual
evaluation, group ranking, productivity measurement, or maturity labels.

## Inputs Reviewed

- [AGENTS.md](../../AGENTS.md)
- [Value Confidence contract](../contracts/value-confidence/README.md)
- [Time-Saved Defensibility Range contract](../contracts/value-confidence/time-saved-defensibility-range.md)
- [Depth Repertoire contract](../contracts/depth/depth-repertoire.md)
- [Depth Repertoire value-confidence calibration decision](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)
- [V4 Value Confidence Caveat Propagation Runbook](./V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md)

No generated BigQuery outputs, dogfood CSVs, row-level events, raw prompts, raw
outputs, transcripts, user identifiers, team identifiers, or customer-facing
economic artifacts were reviewed for this decision.

## Artifact Reviewed

Artifact: `TIME_SAVED_DEFENSIBILITY_RANGE`

Review scope: documentation-stage contract only.

Depth Repertoire state tested: surfaced/interpretable by contract language,
insufficient/suppressed by null-or-absent propagation rule.

## Caveat Propagation Review

The reviewed contract allows Depth Repertoire to appear only in:

- `required_caveats`,
- `depth_repertoire_caveat_context`,
- clearly marked aggregate context about cross-surface return use.

The reviewed contract blocks Depth Repertoire from:

- conservative, expected, or upside range values,
- confidence-band calculation or adjustment,
- surfacing eligibility,
- economic interpretation,
- ROI, dollars, hours-saved, upside, or portfolio totals,
- hidden multipliers, thresholds, benchmarks, defaults, calibration values, or
  scores,
- reconstruction of suppressed or insufficient Depth Repertoire values.

## Economic Fields Confirmed Unchanged

Depth Repertoire caveat context does not change:

- `raw_time_saved_claim_hours`,
- `defensibility_range_hours.conservative`,
- `defensibility_range_hours.expected`,
- `defensibility_range_hours.upside`,
- `confidence_band`,
- `verdict`,
- `suppression_reason`,
- `causality_status`,
- `evidence_grade`.

The range remains governed by the Time-Saved Defensibility Range contract and
the parent Value Confidence contract. Depth Repertoire may explain caveats
around cross-surface return use, but it is not an input to the range.

## Suppression Review

Suppressed or insufficient Depth Repertoire must remain null or absent in
Time-Saved Defensibility Range artifacts.

The contract does not permit downstream text, examples, fallback labels, or
ratios to reconstruct suppressed Depth Repertoire values.

Suppressed Time-Saved Defensibility Range readouts must still expose no economic
values, hours saved, upside estimates, or portfolio totals.

## Blocked Claims Confirmed Absent

This review confirms the contract does not authorize:

- realized ROI,
- causal productivity lift,
- customer-facing prediction,
- individual scoring,
- team, department, manager, customer, or cohort ranking,
- no productivity scoring,
- no maturity scoring,
- economic dependency on Depth Repertoire,
- Time-Saved Defensibility Range adjustment from Depth Repertoire.

## Decision

Decision: `PASS_CAVEAT_PROPAGATION`

Rationale: The Time-Saved Defensibility Range contract can carry Depth
Repertoire as aggregate caveat/context while preserving the required boundary:
Depth Repertoire does not adjust range values, confidence bands, surfacing
eligibility, economic interpretation, or blocked claims.

This decision is deliberately narrow. Passing caveat propagation does not
authorize Depth Repertoire to become an economic dependency. It only permits
documentation-stage Time-Saved Defensibility Range contract hardening that keeps
Depth Repertoire caveat-only.

## Required Contract Hardening

The Time-Saved Defensibility Range contract should state locally that:

- Depth Repertoire may appear only as aggregate caveat/context.
- Depth Repertoire did not adjust the range, confidence band, eligibility, or
  economic number.
- Suppressed or insufficient Depth Repertoire remains null or absent.
- Glean dogfood values are not customer benchmarks, defaults, product
  thresholds, or calibration values.
- Any use beyond caveat/context requires a later explicit calibration decision.

## What Remains Blocked

The following remain blocked after this decision:

- V4 economic APIs,
- runtime Time-Saved Defensibility Range implementation,
- schema hardening,
- Depth Repertoire dependency in range math,
- confidence-band adjustment from Depth Repertoire,
- surfacing eligibility adjustment from Depth Repertoire,
- ROI, dollarized value, productivity, causal, prediction, maturity, or ranking
  claims.

## Open Questions

- What customer-attested aggregate Outcome Evidence is sufficient for any later
  economic-dependency review?
- Should Time-Saved Defensibility Range examples include only abstract
  placeholder numbers until runtime schemas exist?
- Should future schema work make `depth_repertoire_caveat_context` a shared
  object across all V4 readouts or define readout-specific caveat fields?
