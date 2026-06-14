# Depth Repertoire Contract

## Purpose

Depth Repertoire defines the aggregate V4 contract for representing whether AI
use spans multiple governed surfaces and returns to those surfaces repeatedly.

It is the first hardened sub-contract under the broader Depth contract. It does
not create an API, runtime service, schema file, frontend surface, economic
readout, or customer-facing value claim.

## Contract Status

Status: documentation-stage hardened contract.

Promotion source:
[V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md](../../research/V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md)

Value-confidence calibration source:
[V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md](../../research/V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md)

Depth Repertoire was promoted for contract hardening and later approved only as
aggregate caveat/context in V4 value-confidence artifacts. It is not approved as
an economic dependency and must not adjust confidence bands, surfacing
eligibility, Time-Saved Defensibility Range, ROI language, causal claims,
prediction claims, or any customer-facing economic number.

## Signal Definition

```text
Depth Repertoire = Surface Repertoire x Repeat Use / Refinement
```

The contract preserves both components:

- `surface_repertoire`: distinct governed AI surfaces or workflows observed in
  aggregate use.
- `repeat_use_refinement`: return use to those surfaces or workflows, expressed
  as repeated-surface and multi-day-surface aggregate distributions.

The product of the two may be emitted as `depth_repertoire_candidate`, but the
components must remain visible. The candidate value must not become a universal
score, product threshold, calibration value, or default.

## Required Inputs

Depth Repertoire may consume only aggregate outputs derived from governed
surface taxonomy events:

- workflow surfaces,
- standalone non-workflow surfaces,
- AGENT sub-surfaces when available,
- repeated-surface counts,
- multi-day-surface counts,
- cohort size,
- fixed window metadata.

Per-user computation may happen only inside the customer-side transformer,
BigQuery diagnostic, or equivalent customer-boundary aggregation process. The
contract output must contain only aggregate percentile distributions.

## Minimal Output Shape

```json
{
  "schema_version": "FT_DEPTH_REPERTOIRE_2026_05_DOCS_ONLY",
  "cohort_id": "customer-aiom-60d",
  "window_start": "2026-03-23T00:00:00Z",
  "window_end": "2026-05-22T00:00:00Z",
  "verdict": "SURFACE",
  "suppression_reason": null,
  "cohort_size": 12345,
  "surface_repertoire": {
    "p10": 1,
    "p50": 2,
    "p90": 5,
    "p99": 7
  },
  "repeat_use_refinement": {
    "repeated_surfaces": {
      "p10": 1,
      "p50": 1,
      "p90": 5,
      "p99": 7
    },
    "multi_day_surfaces": {
      "p10": 1,
      "p50": 1,
      "p90": 4,
      "p99": 6
    }
  },
  "depth_repertoire_candidate": {
    "p50": 2,
    "p90": 25,
    "p99": 49
  },
  "band": "INTERPRETABLE",
  "required_caveats": []
}
```

`schema_version` is a documentation marker. It is not a shipped API schema.

## Value-Confidence Caveat Use

Depth Repertoire may be included in V4 value-confidence artifacts only as
aggregate context explaining cross-surface return use. The context must preserve
the visible components: `surface_repertoire`, `repeat_use_refinement`, and
`depth_repertoire_candidate` when emitted.

Depth Repertoire caveat context must not:

- alter confidence bands,
- determine surfacing eligibility,
- adjust Time-Saved Defensibility Range,
- create ROI, causal, prediction, or productivity claims,
- become a hidden multiplier, threshold, benchmark, default, or score,
- reconstruct suppressed values downstream.

Suppressed or insufficient Depth Repertoire evidence must remain null or absent
in any value-confidence artifact.

## Allowed Bands

### INTERPRETABLE

The aggregate distribution is sufficiently covered and stable enough to read as
Depth Repertoire evidence.

### INSUFFICIENT_EVIDENCE

The aggregate distribution exists but is not stable, covered, or complete enough
to interpret.

### SUPPRESSED

The readout failed existing fail-closed gates. Values must be null or absent.

This contract does not add new suppression reasons.

## Suppression Behavior

Default state is `SUPPRESS`.

Suppressed Depth Repertoire readouts must not expose hidden reconstructed
values, economic values, hours saved, upside estimates, portfolio totals,
person-level fields, raw prompts, raw outputs, transcripts, or raw event rows.

## Required Caveats

Every surfaced Depth Repertoire readout must include caveats stating:

- Depth Repertoire is aggregate evidence of cross-surface return use.
- Glean dogfood values used in research are not product thresholds,
  calibration values, defaults, or customer benchmarks.
- Depth Repertoire does not prove causality, ROI, productivity lift, or future
  behavior.
- Depth Repertoire must not be used to evaluate specific people, managers,
  departments, or customers.
- Economic dependency requires a later promotion decision; current approved use
  is caveat-only context.

## Non-Capabilities

Depth Repertoire does not calculate ROI.

Depth Repertoire does not prove causality.

Depth Repertoire does not predict future behavior.

Depth Repertoire does not create person-level labels.

Depth Repertoire does not override suppression.

Depth Repertoire does not authorize Time-Saved Defensibility Range.

Depth Repertoire does not modify value-confidence bands or eligibility.

## Future Work

Future work may add a JSON schema after the contract is reviewed. Any schema PR
must preserve aggregate-only outputs, existing suppression reasons, fail-closed
behavior, and the visible separation between surface repertoire and repeat-use
components.
