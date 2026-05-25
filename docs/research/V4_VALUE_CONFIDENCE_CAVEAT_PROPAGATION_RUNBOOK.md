# V4 Value Confidence Caveat Propagation Runbook

## Purpose

This runbook defines how to validate that Depth Repertoire can travel through
V4 value-confidence artifacts as aggregate caveat/context without changing any
economic value, confidence band, eligibility decision, severity label, zone, or
trust interpretation.

It operationalizes the `PROMOTE_CAVEAT_ONLY` decision recorded in
[V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md).
It does not add APIs, schemas, runtime services, frontend surfaces, Prisma
migrations, customer-facing economic readouts, ROI calculations, causal claims,
prediction claims, person-level evaluation, group ranking, productivity
measurement, or maturity labels.

## Scope

This runbook applies to documentation-stage V4 value-confidence artifacts that
reference Depth Repertoire:

- Time-Saved Defensibility Range,
- AI Value Leakage Map,
- AI Scale Readiness Portfolio,
- Trust Calibration Index,
- any future V4 value-confidence artifact that includes
  `depth_repertoire_caveat_context`.

The validation target is caveat propagation only. It does not validate economic
dependency, confidence-band adjustment, eligibility use, or customer-facing
economic output.

## Inputs Required

A caveat propagation review requires:

- the candidate V4 artifact or contract under review,
- the parent [Value Confidence contract](../contracts/value-confidence/README.md),
- the [Depth Repertoire contract](../contracts/depth/depth-repertoire.md),
- the current calibration decision,
- any example artifact used to demonstrate caveat behavior.

Dogfood numbers may be cited only as research evidence in research documents.
They must not be copied into product defaults, benchmarks, thresholds, schema
examples, or customer-facing templates.

## Allowed Placement

Depth Repertoire may appear only in:

- `required_caveats`,
- `depth_repertoire_caveat_context`,
- clearly marked aggregate context text.

Depth Repertoire must not appear in:

- confidence-band formulas,
- surfacing eligibility logic,
- Time-Saved Defensibility Range inputs,
- leakage severity calculations,
- scale-readiness zone calculations,
- trust-calibration labels,
- ROI, dollar, hours-saved, upside, or portfolio total fields.

## Pass Conditions

A candidate artifact passes caveat propagation only if all checks are true:

- Depth Repertoire appears only as aggregate caveat/context.
- The artifact states that Depth Repertoire did not adjust its values, bands,
  zones, eligibility, or economic interpretation.
- Economic fields are unchanged with and without Depth Repertoire context.
- Suppressed or insufficient Depth Repertoire evidence is null or absent.
- Suppressed Depth Repertoire values are not reconstructed through narrative,
  ratios, examples, or fallback labels.
- Internal Glean dogfood values are not treated as customer benchmarks,
  product defaults, thresholds, scores, or calibration values.
- The artifact preserves the existing nine canonical events and five
  suppression reasons.
- The artifact includes no person-level fields, raw prompts, raw outputs,
  transcripts, raw event rows, group rankings, productivity measurement, ROI,
  causal claims, or prediction claims.

## Fail Conditions

A candidate artifact fails caveat propagation if it:

- changes a confidence band because of Depth Repertoire,
- changes surfacing eligibility because of Depth Repertoire,
- changes a Time-Saved Defensibility Range because of Depth Repertoire,
- changes a leakage severity, scale-readiness zone, or trust label because of
  Depth Repertoire,
- introduces a hidden multiplier, threshold, benchmark, default, or score,
- includes suppressed Depth Repertoire values in narrative or examples,
- implies causality, productivity lift, ROI, prediction, or ranking.

Any failed check keeps the artifact blocked from further V4 economic contract
hardening until the issue is removed and the review is rerun.

## Review Procedure

1. Identify every place the artifact references Depth, Depth Repertoire,
   repertoire, repeated use, work integration, or caveats.
2. Classify each reference as allowed caveat/context or blocked behavior.
3. Compare the artifact's economic fields, bands, zones, severity labels, and
   trust labels with and without Depth Repertoire context.
4. Confirm that any `SUPPRESS` or `INSUFFICIENT_EVIDENCE` Depth Repertoire
   state remains null or absent downstream.
5. Confirm that no dogfood value appears as a benchmark, threshold, default, or
   calibration constant.
6. Record the outcome as `PASS_CAVEAT_PROPAGATION` or
   `FAIL_CAVEAT_PROPAGATION`.

## Evidence To Record

The review record should include:

- artifact name,
- reviewer,
- review date,
- Depth Repertoire state tested: surfaced, insufficient, suppressed, or mixed,
- fields where Depth Repertoire appears,
- economic fields confirmed unchanged,
- blocked claims confirmed absent,
- decision,
- required follow-up.

## Decision States

### PASS_CAVEAT_PROPAGATION

The artifact may reference Depth Repertoire as caveat/context only. This does
not authorize economic dependency.

### FAIL_CAVEAT_PROPAGATION

The artifact must remain blocked until the caveat leak is removed.

### HOLD_FOR_EVIDENCE

The artifact cannot be reviewed because required examples, contracts, or
suppression cases are missing.

## What Remains Blocked

Passing this runbook does not authorize:

- Time-Saved Defensibility Range dependency,
- confidence-band adjustment,
- surfacing eligibility adjustment,
- leakage severity adjustment,
- scale-readiness zone assignment,
- trust-calibration label changes,
- ROI, dollar, hours-saved, upside, or portfolio total fields,
- causal, prediction, productivity, forecasting, maturity, or ranking claims.

Any future use beyond caveat/context requires a new explicit calibration
decision.

## Next Phase

After caveat propagation passes for a candidate artifact, the next phase is a
separate promotion decision. That decision must state whether the artifact
remains caveat-only, holds for more evidence, or is eligible for a narrower
contract-hardening phase. Passing this runbook is necessary but not sufficient
for any V4 economic implementation.
