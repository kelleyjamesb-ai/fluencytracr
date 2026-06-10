# Outcome Evidence Export Template

Schema: `FT_AI_VALUE_OUTCOME_EVIDENCE_EXPORT_2026_06`

This is the package a customer's operations team exports from their own
system (support case management, CRM, revenue reporting) so that an AI value
investigation can move from modeled assumptions to evidence-backed,
caveated findings. The customer owns the data; the platform validates,
holds it for human review, and attaches it only after explicit acceptance.

Example: [examples/customer-support-outcome-evidence-export.json](./examples/customer-support-outcome-evidence-export.json)

## What to export

One JSON file per workflow family per measurement cycle:

| Field | What it is |
| --- | --- |
| `export_id` | Stable identifier chosen by the exporter. |
| `org_id` | The engagement org id. |
| `workflow_family` | Must match the Workflow Blueprint exactly. |
| `source_system` | `source_type`, `source_name`, `approved_grain` — must match what the metrics library declares for the exported metrics. |
| `attestation` | `exported_by_role`, `approved_by_role` (roles, never names), `export_date`, and two flags that must be explicitly `false`: `contains_person_level_data`, `contains_raw_content`. |
| `windows` | `baseline` and `comparison` — must exactly equal the blueprint's windows. Exports with different windows are rejected. |
| `metrics[]` | One entry per metric: `metric_id` (must exist in the org's metrics library), `measurement_unit` (must match the library), `baseline_value`, `comparison_value`, `eligible_population` (aggregate case/record count). |

## What must never be in the export

- Ticket, case, or message text of any kind.
- Agent, employee, or user identifiers; names; emails.
- Per-person or per-team breakdowns. Aggregate workflow-window values only.
- Currency or dollar figures. Value translation happens later, customer-owned,
  under claim governance.

Exports containing any of the above are rejected at validation and never
stored.

## Lifecycle

1. **Submit** — upload through the governed API. The engine validates the
   shape; invalid exports are rejected (HTTP 422) and never stored. All
   uploads enter as `SUBMITTED`, regardless of what the file claims.
2. **Review** — a human reviewer (ADMIN or ENABLEMENT_LEAD) accepts or
   rejects the submitted export. Validation proves shape; acceptance proves
   trust. Decisions are terminal in v1.
3. **Attach** — when an `ACCEPTED` export passes cross-checks (metric ids and
   units against the metrics library, exact window and workflow-family match
   against the blueprint), value-chain runs upgrade the blueprint's outcome
   lane to evidence-backed. Accepted evidence that fails cross-checks halts
   the chain for alignment review instead of attaching.

## What attached evidence does — and does not — change

- Does: upgrades the `outcome` source-coverage lane, records the export id in
  the readiness object's source refs, and lets readiness reach
  `READY_FOR_EXECUTIVE_VALIDATION` on evidence rather than synthetic inputs.
- Does not: prove ROI, establish causality, score or compare people or teams,
  or remove any required caveat. Claim language remains governed by the claim
  boundary stage.
