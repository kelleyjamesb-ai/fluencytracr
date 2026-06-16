# AI Value VBD x Token Pilot Runner Contract

Schema version: `FT_AI_VALUE_VBD_TOKEN_PILOT_RUN_2026_06`

## Purpose

The VBD x Token Pilot Runner composes multiple VBD x Token Efficiency Maps into
an aggregate pilot time series. It is designed for a governed rehearsal or pilot
motion where FluencyTracr needs to show movement over time across the same
approved workflow, function, and aggregate grain.

The runner answers:

- where aggregate work-integration posture moved;
- where aggregate token intensity improved or worsened;
- which strategy posture should be reviewed next.

It does not answer whether ROI was realized, whether productivity improved,
whether Glean caused a business outcome, or whether a customer-facing financial
claim is allowed.

## Inputs

The runner accepts a sequence of approved windows. Each window must provide:

- a valid AI Value Evidence Snapshot with VBD posture;
- a valid Token Efficiency Signal for the same org, workflow family, window,
  and approved aggregate grain.

The first product rehearsal target is the synthetic 50-person Customer Success
fixture. Real pilots must replace the synthetic fixture with customer-owned,
scrubbed, aggregate evidence.

## Outputs

The runner emits:

- `window_sequence`: ordered VBD/token map posture per window;
- `movement_summary`: aggregate movement between the first and latest window;
- `recommended_next_motion`: strategy posture only;
- caveats, blocked uses, false value-proof flags, false downstream feeds, and
  false persistence policy.

## Recommended Motions

| Motion | When it appears | Meaning |
| --- | --- | --- |
| `replicate_governed_pattern` | Latest window is `replicate_pattern`. | Replicate the aggregate workflow pattern inside the approved pilot scope. |
| `optimize_cost` | Latest window is `optimize_cost`. | Review prompt design, workflow design, and model routing. |
| `activate_workflow` | Latest window is `activate_workflow`. | Improve use case design and enablement before stronger interpretation. |
| `mitigate_friction` | Latest window is `mitigate_friction`. | Diagnose friction before expanding the workflow. |
| `hold_for_evidence` | Any window is held, suppressed, unsafe, invalid, or not enough windows exist. | Preserve caveats and do not interpret movement. |

## Required Boundaries

The runner must not:

- persist data;
- create migrations;
- create Prisma schema edits;
- create backend routes;
- create frontend UI;
- create ingestion jobs;
- create Claim Readiness Snapshots;
- create Executive Readout Snapshots;
- create reportability readiness output;
- create customer-facing financial output;
- compute ROI, EBITA, productivity, causality, headcount reduction, individual
  attribution, comparative manager/team output, or people decisioning.

## Required Blocked Uses

Every pilot run must block:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

## Relationship To The Playbook

This runner is a Layer 1 strategy lens. It can help explain whether aggregate
AI fluency and token efficiency are moving in a healthier operating direction,
but it cannot upgrade Playbook coverage. Full Playbook-backed claims still
require Layer 2 user voice, Layer 3 system-of-record outcomes, governance
evidence, approved assumptions, k-min clearance, and safe privacy posture.

## Examples

Validator-backed example:

- [`examples/customer-success-50-synthetic-pilot-run.json`](./examples/customer-success-50-synthetic-pilot-run.json)

## Validation

Run:

```bash
npm run test:ai-value-vbd-token-pilot-runner
```
