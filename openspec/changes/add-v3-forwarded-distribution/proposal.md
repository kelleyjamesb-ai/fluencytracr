# Change: Add V3 forwarded aggregate distribution

## Why

Value-realization consumers need a safe way to reuse the aggregate evidence
that already cleared V3 fail-closed gates. Without a forwarded aggregate block,
downstream consumers either recompute from raw events or lose the evidence
needed for bounded metric readiness.

## What Changes

- Add optional `forwarded_distribution` to surfaced V3 aggregate verdict
  payloads.
- Keep `forwarded_distribution` absent from every suppressed verdict.
- Allow EvidenceBundle v1 to mirror the same aggregate-only block only when
  suppression is not applied.
- Let Quality Multiplier consume the forwarded aggregate block after re-checking
  suppression gates and emit `QUALITY_PREMIUM` / `CALIBRATED`.

## Impact

- Affected specs: value-realization, evidence-bundle
- Affected code: backend V3 aggregate ingest and Quality Multiplier read path
- No new canonical events, suppression reasons, thresholds, admin overrides,
  production connectors, ROI proof, causality claims, productivity claims,
  HR analytics, ranking, or customer-facing economic output.
