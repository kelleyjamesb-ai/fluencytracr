# V4 Support Join-Key Test Readout

## Purpose

This readout records the V4 support join-key test. The goal was to determine
whether support outcome movement can be connected to V4 behavior cohorts through
a governed aggregate key without emitting individual-level output.

This is research-only. It does not authorize APIs, schemas, runtime services,
customer-facing economic readouts, ROI calculations, causal claims, prediction
claims, individual scoring, comparative team evaluation, comparative department
evaluation, productivity measurement, maturity scoring, or automated
recommendations.

## Inputs Reviewed

Support outcome inputs:

- `scio-apps.dashboards.zendesk_ticket_details`
- `scio-apps.zendesk.all_tickets`
- `redacted_person_scoped_zendesk_staging_alias_a`
- `redacted_person_scoped_zendesk_staging_alias_b`

Person-scoped staging schema names are intentionally redacted in this retained
readout. Use governed source aliases for research artifacts unless a source name
is approved for aggregate output.

Behavior and metadata inputs:

- retained V4 behavior-window exports,
- retained V4 segment-overlay export,
- aggregate GCE org-metadata coverage query across the three fixed windows.

Generated aggregate outputs:

- `dogfood-output/v4-support-join-key-test/v4_support_join_key_candidate_inventory.csv`
- `dogfood-output/v4-support-join-key-test/v4_gce_org_metadata_join_coverage.csv`

No raw user IDs, employee IDs, emails, ticket text, ticket subjects, ticket
descriptions, account names, raw prompts, raw outputs, transcripts, raw event
rows, or raw skill names are emitted.

## Candidate Support Keys Tested

The live support table supports these aggregate keys:

| Candidate key | Result |
| --- | --- |
| `org_id` | Usable for customer/account outcome context, but sparse and not linked to V4 internal behavior cohorts. |
| `account_id` | Usable for customer/account outcome context, but sparse and not linked to V4 internal behavior cohorts. |
| `ticket_status` | Usable as outcome breakdown only; not a behavior or organization join. |
| `ticket_priority` | Usable as outcome breakdown only; not a behavior or organization join. |
| `tags_present` | Too coarse; not a meaningful join key. |

Support key coverage:

| Window | Key | Aggregate keys | Tickets | Keys meeting min 5 | Keys below min 5 | Median tickets per key |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `window_1` | `account_id` | 521 | 4,455 | 242 | 279 | 4 |
| `window_1` | `org_id` | 527 | 4,469 | 242 | 285 | 4 |
| `window_2` | `account_id` | 524 | 4,540 | 258 | 266 | 4 |
| `window_2` | `org_id` | 528 | 4,549 | 258 | 270 | 4 |
| `window_3` | `account_id` | 498 | 4,141 | 223 | 275 | 4 |
| `window_3` | `org_id` | 503 | 4,163 | 224 | 279 | 4 |

Interpretation:

- Customer/account keys exist.
- Many customer/account keys are too sparse for independent interpretation.
- These keys do not connect to the retained V4 internal behavior cohorts.
- They are useful for customer outcome context, not internal behavior
  attribution.

## GCE Metadata Coverage Finding

The GCE org-metadata coverage test found:

| Window | Distinct users | Users with department | Users with job function | Users with department ID | Users with title | Users with manager ID |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `window_1` | 2,238,618 | 0 | 0 | 2,238,618 | 0 | 0 |
| `window_2` | 2,222,648 | 0 | 0 | 2,222,648 | 0 | 0 |
| `window_3` | 2,219,652 | 0 | 0 | 2,219,652 | 0 | 0 |

Interpretation:

- `department_id` is populated and could support a future aggregate internal
  segment test if a governed mapping exists.
- Department names, job functions, titles, and manager IDs are not available in
  this export path.
- `department_id` is high-cardinality and unlabeled in the current output; it
  should not be used as a stakeholder-facing segment without an approved
  aggregate mapping and suppression review.

## Behavior Export Join-Key Finding

The retained V4 behavior exports expose:

- fixed windows,
- Velocity bands,
- Depth Repertoire bands,
- trust classifications,
- AGENT delegation classifications,
- Skill Read presence classifications,
- readout zones.

They do not expose:

- support organization,
- account,
- support group,
- queue,
- assignee,
- department name,
- job function,
- role family,
- region,
- manager or IC segment.

Therefore, the current retained behavior exports can join to support only by
fixed window context.

## Decision

`HOLD_SUPPORT_BEHAVIOR_ATTRIBUTION`

Also:

`PROMOTE_SUPPORT_JOIN_KEY_REQUIREMENTS`

Support should remain promoted as outcome context, but support behavior
attribution remains held. The current data cannot safely connect support
outcome movement to Velocity, Depth Repertoire, AI Scale Readiness zone, or
organizational segment beyond fixed-window context.

## Required Join Key For Promotion

To promote support beyond `OUTCOME_CONTEXT_ONLY`, one of the following must
exist as an approved aggregate export:

1. **Support segment join.** A governed support group, queue, or function segment
   that can be joined to aggregate V4 behavior cohorts without individual
   output.
2. **Department ID mapping.** A reviewed department-ID-to-aggregate-segment map
   computed inside the Glean boundary, with independent suppression per segment.
3. **Customer/account behavior context.** A customer/account-level behavior
   signal that matches support `org_id` or `account_id`, only if the analysis is
   about customer outcome context rather than internal employee behavior.

If none exists, support remains valuable context for the Economic Impact Bridge
but must not be used for attribution, ROI, or Time-Saved Defensibility Range
productization.

## What Remains Blocked

The following remain blocked:

- behavior-to-support attribution,
- department-level economic claims,
- support-team performance claims,
- ROI,
- dollarized savings,
- productivity measurement,
- causal impact,
- prediction,
- customer-facing economic output,
- Time-Saved Defensibility Range productization,
- individual, team, manager, department, customer, or skill ranking.

## Open Questions

- Can the external Zendesk table be reauthorized with Drive-scoped CLI access to
  inspect live assignee and group coverage?
- Is there a governed department ID mapping that can collapse high-cardinality
  department IDs into safe aggregate segments?
- Should the first promoted support join remain customer/account outcome
  context rather than internal behavior attribution?
- Which support owner should validate whether support `org_id` or `account_id`
  should be used for customer-facing outcome context in a future customer-owned
  analysis?
