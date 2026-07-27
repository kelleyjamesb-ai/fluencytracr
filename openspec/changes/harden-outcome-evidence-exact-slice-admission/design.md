## Context

The current system has three distinct boundaries:

1. `POST/GET /api/v1/outcome-evidence` stores and replays aggregate customer
   attestations, including legacy records without JBTD/persona keys.
2. The real-evidence materializer pairs stored records and produces an
   `outcome_evidence_export`.
3. Export review and downstream consumers decide whether evidence can attach
   to readiness or a readout.

The materializer currently queries a workflow-wide date range and pairs on
metric/unit/source only. The export then drops the exact source slice, and
human acceptance can later enable attachment. That makes storage, pairing,
review, and use look like one authority when they are not.

## Goals

- Make exact-slice admission one pure, reusable, fail-closed decision.
- Preserve storage-only compatibility for incomplete legacy records.
- Prevent baseline/comparison rescue across workflow, JBTD, persona, or window.
- Preserve independent privacy, suppression, review, readiness, model, and
  claim decisions.
- Keep Slice E cryptographic/canonical identity work out of Slice B.

## Non-Goals

- Complementary suppression, differencing, or repeated-query privacy.
- Claim-language templates, ROI, causality, prediction, or economic output.
- Append-only identity hashes, canonical trace, deployment, or live proof.
- New canonical events, suppression reasons, tunable thresholds, or overrides.

## Decisions

### One admission evaluator

A shared evaluator receives:

- the expected non-empty `workflow_id`, `jbtd_id`, and `persona_id`;
- exact canonical RFC3339 baseline and comparison instants; and
- stored aggregate Outcome Evidence records.

It returns `ADMITTED` or `HELD`, admission-specific reason codes, exact admitted
pairs, rejected source evidence IDs, and a bounded receipt containing only the
slice, windows, and admitted evidence IDs. Admission reason codes are not
canonical suppression reasons.

### Storage remains storage

Existing ingestion/replay keeps optional join keys as specified by
`add-outcome-evidence-ingestion`. Missing-key records can be stored and replayed
but never appear in an admitted pair. The JSON schema is reconciled with this
storage-only behavior.

### Exact means exact

Admission compares normalized canonical instants, not date tokens or containing
ranges. Baseline and comparison must each have exactly one record for a given
metric/unit/source. Missing or duplicate candidates hold that metric; no
insertion-order selection is permitted.

### Export carries the admission receipt

Materialized exports carry the exact aggregate slice, exact windows, and source
evidence IDs. The receipt is revalidated structurally at each attachment
boundary. It is not a cryptographic or append-only identity and does not
preempt Slice E.

### Review is non-authorizing

Human `ACCEPTED` review remains necessary but is not sufficient for attachment.
A direct or legacy export without a valid admission receipt can remain stored
and reviewed but cannot upgrade readiness, model eligibility, claim
authorization, or readout evidence.

## Risks and Mitigations

- Legacy exports stop attaching without provenance: they remain readable and
  reviewable, with attachment held until rematerialized through the authority.
- Aggregate `persona_id` resembles forbidden person-level fields: allow only
  the exact governed receipt path; retain all broad identifier/content bans.
- Repository filtering could hide a caller bug: exercise the pure evaluator
  directly with cross-slice and ambiguous candidates, and exercise the real
  materializer end to end.

## Migration

No backfill or identity inference. New materialization emits receipts. Existing
storage records and exports remain readable; incomplete records and unbound
exports remain non-admissive.
