# AI Value VBD x Token Efficiency Map Contract

Schema version: `FT_AI_VALUE_VBD_TOKEN_EFFICIENCY_MAP_2026_06`

## Purpose

The VBD x Token Efficiency Map combines aggregate VBD work-integration posture
with aggregate token intensity/efficiency to produce strategy zones for
enablement, workflow design, model routing, and cost exposure review.

It is not ROI, productivity measurement, causality, financial output,
individual attribution, comparative manager/team output, people decisioning, or
customer-facing economic evidence.

## Inputs

The map is built from:

- a valid AI Value Evidence Snapshot with `vbd_operating_map`
- a valid Token Efficiency Signal for the same org, workflow family, window, and
  approved aggregate grain

Both inputs must remain aggregate-only and must preserve k-min, suppression,
privacy, source-readiness, and caveat boundaries.

## Strategy Zones

| Zone | Meaning | Action |
| --- | --- | --- |
| `replicate_pattern` | High or emerging work integration with efficient token posture. | Study and replicate the workflow pattern. |
| `optimize_cost` | High or emerging work integration with moderate or high token intensity. | Optimize prompts, agents, model routing, or workflow design. |
| `activate_workflow` | Shallow work integration with efficient or moderate token posture. | Improve use cases, workflow design, and enablement. |
| `mitigate_friction` | Shallow work integration with high token intensity. | Diagnose friction before stronger interpretation. |
| `hold_for_evidence` | Missing, held, suppressed, unsafe, or mismatched evidence. | Preserve caveats and do not interpret. |

## Required Boundaries

The map must not:

- persist data
- create migrations
- create Prisma schema edits
- create backend routes
- create frontend UI
- create ingestion jobs
- create Claim Readiness Snapshots
- create Executive Readout Snapshots
- create reportability readiness output
- create customer-facing financial output
- compute ROI, EBITA, productivity, causality, headcount reduction, individual
  attribution, comparative manager/team output, or people decisioning

## Required Blocked Uses

Every map must block:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

## Value-Proof Policy

The following flags must be false:

- `map_is_roi_proof`
- `map_is_productivity_proof`
- `map_is_financial_output`
- `map_computes_causality`
- `map_allows_person_or_team_comparison`
- `downstream_claim_strength_upgrade_allowed`

## Relationship to Evidence Snapshot and Token Efficiency

VBD remains Layer 1 work-integration posture only. Token Efficiency remains
Layer 1 cost/intensity context only. The map can help route aggregate strategy
work, but it cannot upgrade Playbook coverage, claim readiness, financial
permission, reportability, or customer-facing economic output.

## Examples

Validator-backed examples:

- [`examples/valid-replicate-map.json`](./examples/valid-replicate-map.json)
- [`examples/valid-mitigate-map.json`](./examples/valid-mitigate-map.json)
- [`examples/held-map.json`](./examples/held-map.json)

## Validation

Run:

```bash
npm run test:ai-value-vbd-token-efficiency-map
```
