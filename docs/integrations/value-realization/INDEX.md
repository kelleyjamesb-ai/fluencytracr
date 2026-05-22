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
| Outcome Evidence | [../../contracts/outcome-instrumentation-map/README.md](../../contracts/outcome-instrumentation-map/README.md) | Defines which customer-attested aggregate systems-of-record metrics can later support claim readiness. |

## How To Read The Set

Quality Multiplier answers whether the time-saved estimate should be adjusted
for observed workflow quality. Causal Delta answers whether the aggregate
pattern moved after a known change. Reliability Factor answers whether the
surfaced signal is dependable enough to use carefully. Outcome Evidence defines
what external aggregate metrics are required before a claim can advance beyond
behavioral evidence.

Together, they let AIOMs, value-realization PMs, and CIOs separate raw usage or
time saved from defensible value realization.

## Complementary Stated-Evidence Layer

The AI Fluency Instrument remains useful as stated evidence: what people say
about their adoption, confidence, and practice. It should be paired with these
contracts when teams want to compare stated evidence with observed aggregate
workflow behavior. It is complementary to the value-realization evidence layer,
not the lead narrative for this repository.
