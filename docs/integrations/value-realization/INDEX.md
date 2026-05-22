# Value Realization Contracts

FluencyTracr is the behavioral evidence layer for Glean value realization. It
starts from the time-saved pipeline gap: roughly 64% of chat runs have no
quality signal today. These contracts define the evidence services that qualify
raw acceleration before it becomes a customer-facing value claim.

Each contract preserves the same posture:

- Aggregate workflow evidence only.
- No individual attribution, ranking, or productivity scoring.
- Fail-closed `SURFACE` / `SUPPRESS` disclosure.
- AIVM vocabulary at the aggregate verdict layer: `value_type` and
  `evidence_grade`, preserved by value-realization services when they consume
  verdict metadata.
- No ROI computation, statistical-significance claim, or hidden causal proof.

## Contract Map

| Contract | Canonical doc | Role in the value pipeline |
| --- | --- | --- |
| Quality Multiplier | [quality-multiplier.md](./quality-multiplier.md) | Discounts, preserves, or amplifies time-saved estimates when observed aggregate workflow quality supports it. |
| Causal Delta | [../../contracts/causal-delta.md](../../contracts/causal-delta.md) | Compares pre/post aggregate workflow patterns around a rollout or change moment without claiming statistical causality. |
| Reliability Factor | [reliability-factor.md](./reliability-factor.md) and [../../contracts/reliability-factor.md](../../contracts/reliability-factor.md) | Qualifies whether surfaced evidence looks operationally dependable based on verification, recovery, abandonment, and friction-loop behavior. |
| Outcome Evidence | [outcome-evidence.md](./outcome-evidence.md) | Stores and replays customer-attested aggregate systems-of-record metrics next to unchanged workflow verdicts. |
| Velocity Index | [../../contracts/velocity-index.md](../../contracts/velocity-index.md) | Adds V2 aggregate velocity context through frequency, engagement, and breadth distributions, surfaced only after fail-closed gates clear. |

## How To Read The Set

Quality Multiplier answers whether the time-saved estimate should be adjusted
for observed workflow quality. Causal Delta answers whether the aggregate
pattern moved after a known change. Reliability Factor answers whether the
surfaced signal is dependable enough to use carefully. Outcome Evidence stores
external aggregate metrics beside verdicts without computing correlation,
causation, or dollarized ROI.

Together, they let AIOMs, value-realization PMs, and CIOs separate raw usage or
time saved from defensible value realization. Velocity Index adds a governed V2
behavioral-distribution layer for teams that need adoption depth context without
person-level reporting.

## Running Multi-Surface Dogfood

1. Export BigQuery surface aggregates to CSV with the columns shown in [`examples/dogfood/example_multi_surface_input.csv`](../../../examples/dogfood/example_multi_surface_input.csv).
2. Run `python3 scripts/dogfood/run_multi_surface.py --input <csv>`.
3. Open `dogfood-output/READOUT.md`.
4. Review per-surface `SURFACE` / `SUPPRESS`, AIVM tags, Reliability Factor, and Quality Multiplier.
5. Use the weighted headline as a read-only summary; each surface is evaluated independently first.

## Running Velocity-Aware Dogfood

1. Export taxonomy-aware velocity distributions with [`sql/dogfood/velocity_diagnostic.sql`](../../../sql/dogfood/velocity_diagnostic.sql).
2. Keep workflow surfaces as `workflow:<surface>` and standalone surfaces as `standalone:<surface>`.
3. Run `python3 scripts/dogfood/run_multi_surface.py --input <surface-csv> --velocity-input <velocity-csv>`.
   Set `BACKEND_URL=http://localhost:4000` when you want the driver to exercise the live V2 ingest, Velocity Index, and velocity-aware Quality Multiplier endpoints.
4. Review the overall velocity-adjusted Quality Multiplier and the workflow vs standalone category split.
5. Treat the velocity section as aggregate context only; each surface still clears or suppresses independently.

The CSV files are the current developer dogfood adapter. They should be replaced
by a direct aggregate feed when this moves toward real-time internal data, using
the same aggregate-only fields and suppression posture.

### Agent Sub-Surface Composition

When AGENT sub-surfaces are present, the consolidated readout includes:

```markdown
## AGENT sub-surface composition

Legacy AGENT derived cohort: 100
Legacy AGENT derived velocity-adjusted Quality Multiplier: 1.495

| sub-surface | runs | AGENT mix | velocity_adjusted_QM |
| --- | ---: | ---: | ---: |
| autonomous | 60 | 60% | 1.495 |
| workflow_named | 30 | 30% | 1.495 |
| ephemeral | 10 | 10% | 1.495 |
```

The three sub-surfaces are evaluated independently before the legacy AGENT
summary is derived.

## Complementary Stated-Evidence Layer

The AI Fluency Instrument remains useful as stated evidence: what people say
about their adoption, confidence, and practice. It should be paired with these
contracts when teams want to compare stated evidence with observed aggregate
workflow behavior. It is complementary to the value-realization evidence layer,
not the lead narrative for this repository.
