# V4 Value Leakage Caveat Propagation Decision

## Purpose

This document records the caveat-propagation review for whether the AI Value
Leakage Map contract can carry Depth Repertoire as aggregate caveat/context
without changing leakage types, aggregate severity, value-at-risk labels,
surfacing eligibility, economic interpretation, or blocked claims.

It applies the
[V4 Value Confidence Caveat Propagation Runbook](./V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md)
to the documentation-stage
[AI Value Leakage Map contract](../contracts/value-confidence/value-leakage-map.md).

This is a research and contract decision record. It adds no APIs, schemas,
Prisma migrations, runtime services, frontend surfaces, customer-facing
economic readouts, ROI calculation, causal claim, prediction claim,
person-level evaluation, group comparison, productivity measurement, or
maturity labels.

## Inputs Reviewed

- [AGENTS.md](../../AGENTS.md)
- [Value Confidence contract](../contracts/value-confidence/README.md)
- [AI Value Leakage Map contract](../contracts/value-confidence/value-leakage-map.md)
- [Depth Repertoire contract](../contracts/depth/depth-repertoire.md)
- [Depth Repertoire value-confidence calibration decision](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)
- [V4 Value Confidence Caveat Propagation Runbook](./V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md)

No generated BigQuery outputs, dogfood CSVs, row-level events, raw prompts, raw
outputs, transcripts, user identifiers, team identifiers, or customer-facing
economic artifacts were reviewed for this decision.

## Artifact Reviewed

Artifact: `AI_VALUE_LEAKAGE_MAP`

Review scope: documentation-stage contract only.

Depth Repertoire state tested: surfaced/interpretable by contract language,
insufficient/suppressed by null-or-absent propagation rule.

## Caveat Propagation Review

The reviewed contract allows Depth Repertoire to appear only in:

- `required_caveats`,
- `depth_repertoire_caveat_context`,
- clearly marked aggregate context about cross-surface return use.

The reviewed contract blocks Depth Repertoire from:

- leakage type assignment,
- aggregate severity bands,
- value-at-risk labels,
- surfacing eligibility,
- economic interpretation,
- ROI, dollars, hours-saved, upside, or portfolio totals,
- hidden multipliers, thresholds, benchmarks, defaults, calibration values, or
  scores,
- reconstruction of suppressed or insufficient Depth Repertoire values.

## Leakage Fields Confirmed Unchanged

Depth Repertoire caveat context does not change:

- `leakage_types`,
- `aggregate_severity`,
- `scenario_based_value_at_risk_label`,
- `verdict`,
- `suppression_reason`,
- `economic_interpretation`,
- `required_caveats`,
- `blocked_claims`.

The leakage map remains governed by the AI Value Leakage Map contract and the
parent Value Confidence contract. Depth Repertoire may explain caveats around
cross-surface return use, but it is not an input to leakage severity,
value-at-risk labeling, or economic interpretation.

## Suppression Review

Suppressed or insufficient Depth Repertoire must remain null or absent in AI
Value Leakage Map artifacts.

The contract does not permit downstream text, examples, fallback labels, or
ratios to reconstruct suppressed Depth Repertoire values.

Suppressed AI Value Leakage Map readouts must still expose no leakage values,
value-at-risk estimates, hours saved, upside estimates, or portfolio totals.

## Blocked Claims Confirmed Absent

This review confirms the contract does not authorize:

- realized ROI,
- causal productivity lift,
- customer-facing prediction,
- person-level evaluation,
- team, department, manager, customer, or cohort comparison,
- productivity measurement,
- maturity labels,
- economic dependency on Depth Repertoire,
- leakage severity or value-at-risk adjustment from Depth Repertoire.

## Decision

Decision: `PASS_CAVEAT_PROPAGATION`

Rationale: The AI Value Leakage Map contract can carry Depth Repertoire as
aggregate caveat/context while preserving the required boundary: Depth
Repertoire does not adjust leakage types, aggregate severity, value-at-risk
labels, surfacing eligibility, economic interpretation, or blocked claims.

This decision is deliberately narrow. Passing caveat propagation does not
authorize Depth Repertoire to become an economic dependency. It only permits
documentation-stage AI Value Leakage Map contract hardening that keeps Depth
Repertoire caveat-only.

## Required Contract Hardening

The AI Value Leakage Map contract should state locally that:

- Depth Repertoire may appear only as aggregate caveat/context.
- Depth Repertoire did not adjust leakage types, severity, value-at-risk labels,
  eligibility, or economic interpretation.
- Suppressed or insufficient Depth Repertoire remains null or absent.
- Glean dogfood values are not customer benchmarks, defaults, product
  thresholds, or calibration values.
- Any use beyond caveat/context requires a later explicit calibration decision.

## What Remains Blocked

The following remain blocked after this decision:

- V4 economic APIs,
- runtime AI Value Leakage Map implementation,
- schema hardening,
- Depth Repertoire dependency in leakage severity or value-at-risk logic,
- surfacing eligibility adjustment from Depth Repertoire,
- ROI, dollarized value, productivity, causal, prediction, maturity, or ranking
  claims.

## Open Questions

- What customer-attested aggregate Outcome Evidence is sufficient for any later
  economic-dependency review?
- Should value-at-risk examples remain qualitative until runtime schemas exist?
- Should future schema work make `depth_repertoire_caveat_context` a shared
  object across all V4 readouts or define readout-specific caveat fields?
