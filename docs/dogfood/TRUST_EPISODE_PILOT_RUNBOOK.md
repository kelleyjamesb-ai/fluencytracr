# Trust Episode Boundary Pilot Runbook

## Purpose

This runbook turns approved aggregate Trust Episode Boundary BigQuery output
into an executive-safe Trust Calibration context readout.

No API is required for this phase. The pilot path is:

1. Run the approved Trust Episode Boundary aggregate query in BigQuery.
2. Export only the final aggregate rows as CSV.
3. Generate Markdown, JSON, and summary CSV output locally with
   `run_trust_episode_pilot_readout.py`.

This does not ingest raw traces into FluencyTracr, does not persist customer
telemetry, and does not call a production backend.

## Required Input

Aggregate CSV export from
[`trust_episode_boundary_diagnostic.sql`](../../sql/dogfood/trust_episode_boundary_diagnostic.sql)
or a customer-approved equivalent.

Required columns:

- `episode_pattern`
- `episode_count`

Supported pattern values:

- `resolved_with_confidence`
- `resolved_without_verification_signal`
- `recovered_after_failure`
- `stalled_after_ai_assist`
- `explicit_negative_feedback`
- `evidence_gap`

The CSV may contain additional aggregate columns from the diagnostic, but it
must not contain raw event rows, user IDs, emails, names, prompts, outputs,
transcripts, employee labels, manager fields, team rankings, or person-level
metrics.

## Command

```bash
python scripts/dogfood/run_trust_episode_pilot_readout.py \
  --input-csv dogfood-output/trust-episode-boundary-pilot/trust_episode_pilot_input_run_first.csv \
  --output-dir dogfood-output/trust-episode-boundary-pilot \
  --customer-label "Glean dogfood aggregate run-first sample" \
  --window-label "Seven approved business days"
```

Outputs:

- `TRUST_EPISODE_PILOT_EXECUTIVE_READOUT.md`
- `trust_episode_pilot_summary.json`
- `trust_episode_pilot_pattern_summary.csv`

## Governance Boundary

Use only customer-approved aggregate scope: workflow, AI surface, cohort,
approved segment, role family, or function where approved and aggregate-safe.

This pilot:

- does not ingest raw traces,
- does not add canonical events,
- does not add suppression reasons,
- does not create schemas, endpoints, or runtime output,
- does not calculate ROI,
- does not establish causality,
- does not identify, score, rank, or evaluate employees,
- does not rank teams or managers,
- does not require enablement-system, training-record, survey, HR, or
  person-level joins.

If source coverage is incomplete or ambiguous, use evidence-gap language and do
not emit Trust Episode Boundary pattern values.

## Required Citations

Any pilot readout must cite:

- [trust-episode-boundary-input.md](../contracts/value-confidence/trust-episode-boundary-input.md)
- [V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md](../research/V4_TRUST_EPISODE_BOUNDARY_VALIDATION_READOUT.md)
- [TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md](../../dogfood-output/trust-episode-boundary/TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md)
- [TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md](../../dogfood-output/trust-episode-boundary/TRUST_PRODUCT_EPISODE_DEDUP_BIGQUERY_READOUT.md)
- [TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md](../../dogfood-output/trust-episode-boundary/TRUST_KEY_CONFIDENCE_BIGQUERY_READOUT.md)

Customer-facing artifacts should replace dogfood citations with the
customer-approved aggregate evidence package for that customer run.
