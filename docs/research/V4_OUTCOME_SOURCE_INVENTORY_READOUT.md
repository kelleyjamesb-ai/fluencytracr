# V4 Outcome Source Inventory Readout

## Purpose

This readout records the first BigQuery source-inventory test for V4 outcome
joins. The goal was to identify whether internal Glean data can provide a
safe, aggregate, window-aligned business outcome metric for the V4 Economic
Impact Bridge.

This is research-only. It does not authorize APIs, schemas, runtime services,
customer-facing economic readouts, ROI calculations, causal claims, prediction
claims, individual scoring, comparative team evaluation, comparative department
evaluation, productivity measurement, maturity scoring, or automated
recommendations.

## Sources Tested

The inventory reviewed candidate internal BigQuery sources for support,
onboarding, and later sales analysis.

| Domain | Candidate source | Result |
| --- | --- | --- |
| Support | `dashboards.zendesk_ticket_details` | Best first source for aggregate outcome testing |
| Support | `zendesk.all_tickets` | Semantically useful, but external-table read needs Drive-scoped CLI access |
| Support | `redacted_person_scoped_zendesk_staging_alias_a` | Stale for the V4 fixed windows |
| Support | `redacted_person_scoped_zendesk_staging_alias_b` | Stale for the V4 fixed windows |
| Onboarding | `rocketlane.project` | Usable as secondary source, but smaller volume |
| Sales | `salesforce.opportunity` | Rich source, but held for later because attribution is noisier |

Person-scoped staging schema names were redacted from this retained readout.
Future source inventories should use governed source aliases unless a source name
is approved for aggregate research output.

Saved aggregate exports:

- `dogfood-output/v4-outcome-source-inventory/zendesk_support_outcome_inventory.csv`
- `dogfood-output/v4-outcome-source-inventory/rocketlane_project_outcome_inventory.csv`

## Support Finding

The strongest first test source is:

```text
scio-apps.dashboards.zendesk_ticket_details
```

It has live 2026 coverage and can produce aggregate ticket response and age
metrics across the same three V4 fixed windows.

| Window | Tickets | Rows with first-response metrics | p50 days elapsed | p90 days elapsed | p50 business minutes to first response |
| --- | ---: | ---: | ---: | ---: | ---: |
| `window_1` | 4,469 | 4,392 | 13 | 26 | 183 |
| `window_2` | 4,549 | 4,485 | 15 | 35 | 212 |
| `window_3` | 4,163 | 4,095 | 15 | 43 | 218 |

Interpretation:

- Support has enough aggregate volume for outcome-source testing.
- The metric shape is operationally meaningful.
- The source is better than sales for the first bounded outcome test.
- The current safe join is strongest at the fixed-window and customer-org
  outcome-context level.

Important caveat:

This source does not by itself prove that AI behavior caused support movement.
It also does not yet provide a clean internal employee-segment join to
Velocity, Depth Repertoire, or department-level behavior cohorts. It can support
economic investigation routing, not ROI or causal output.

## Onboarding Finding

The onboarding candidate is:

```text
scio-apps.rocketlane.project
```

It has clean project dates, status, company key, and budgeted-hour fields, but
the volume is smaller.

| Window | Projects | Rows with due date | Rows with status | Rows with company key | p50 days start to due | p90 days start to due |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `window_1` | 32 | 31 | 32 | 32 | 131 | 503 |
| `window_2` | 51 | 51 | 51 | 51 | 131 | 501 |
| `window_3` | 93 | 92 | 93 | 93 | 131 | 503 |

Interpretation:

- Rocketlane is usable as a secondary onboarding source.
- It is likely better for project delivery or implementation timing than broad
  employee onboarding.
- The small sample size means it should not be the first economic bridge test
  unless Support is blocked.

## Source Gaps

The inventory found three important gaps:

1. The external Zendesk table needs Drive-scoped CLI access before it can be
   queried repeatably from the command line.
2. The native Zendesk staging tables inspected are stale for the 2026 fixed
   windows and should not drive the current test.
3. The live Zendesk dashboard table supports aggregate outcome context, but not
   a clean internal department/persona/Velocity/Depth segment join by itself.

These are evidence gaps, not negative outcome signals.

## Decision

`PROMOTE_SUPPORT_OUTCOME_SOURCE_TEST`

Also:

`HOLD_FOR_BEHAVIOR_TO_OUTCOME_JOIN_KEY`

Support is the best first outcome source for a bounded V4 test. The next test
should use support as an aggregate outcome-context layer and then separately
validate whether an approved aggregate join key can connect support movement to
Velocity, Depth Repertoire, AI Scale Readiness zone, or organizational segment.

## Required Next Test

Create a support outcome join fixture with:

- `window_id`
- `outcome_domain = SUPPORT`
- `source_system = Zendesk`
- `outcome_metric_name`
- `outcome_unit`
- `aggregate_join_key_type`
- `aggregate_join_key`
- `baseline_window`
- `comparison_window`
- `baseline_value`
- `comparison_value`
- `cohort_size`
- `source_coverage_status`
- `customer_owned_assumption_status`
- `causality_status = NOT_CAUSAL`
- `allowed_interpretation`

The first join should remain descriptive:

```text
Support outcome context is available for the same windows as V4 behavior
evidence. A stronger behavior-to-outcome interpretation remains held until an
approved aggregate join key exists.
```

## What Remains Blocked

The following remain blocked:

- ROI,
- guaranteed savings,
- productivity measurement,
- causal impact,
- prediction,
- customer-facing economic output,
- Time-Saved Defensibility Range productization,
- individual, team, manager, department, customer, or skill ranking,
- department-level economic claims without an approved aggregate segment join.

## Open Questions

- Can the external Zendesk source be reauthorized with Drive-scoped CLI access
  to inspect assignee/group coverage safely?
- Is there an approved aggregate Support team join key that can connect support
  outcome movement to behavior cohorts without individual-level output?
- Should the first support join use `window` only, customer organization, or a
  governed support segment?
- Should Rocketlane remain a secondary onboarding source or become a separate
  implementation-delivery outcome test?
