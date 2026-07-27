# Outcome Evidence Exact-Slice Admission

Policy version: `FT_OUTCOME_EVIDENCE_EXACT_SLICE_ADMISSION_2026_07`

## Purpose

This contract defines the single admission decision that may bind stored
aggregate outcome evidence to an AI Value evidence export. It prevents records
from different workflow, JBTD, persona, or observation-window slices from being
paired merely because their workflow family or calendar date is similar.

The receipt schema is
[`schemas/outcome_evidence_admission.schema.json`](../../../schemas/outcome_evidence_admission.schema.json).

## Storage Compatibility

`POST /api/v1/outcome-evidence` remains a storage and replay boundary.
`jbtd_id` and `persona_id` remain optional there so legacy aggregate records can
still be retained. Missing join keys make a record non-admissible; they do not
make the storage request invalid.

## Admission Rules

Admission requires:

- one non-empty `workflow_id`, `jbtd_id`, and `persona_id`;
- exact canonical RFC 3339 baseline and comparison instants;
- non-overlapping baseline and comparison windows;
- the same outcome metric, unit, and source system on each pair;
- exactly one baseline and one comparison record per metric key; and
- no record outside the requested exact slice.

Any missing identity, cross-slice record, shifted window, missing pair, or
duplicate candidate produces `HELD`. The evaluator never chooses among
ambiguous records by insertion order.

## Authority Boundary

Only the backend materializer may mark a stored export with
`admission_authoritative: true`. The materializer records a bounded receipt
containing the policy version, exact slice identity, exact windows, and admitted
aggregate evidence IDs. Receipt identity and evidence-reference strings are
restricted to opaque machine-safe forms; email-like or free-form values are
invalid.

Generic export uploads remain reviewable but are stored with
`admission_authoritative: false`. Human review can accept or reject an export,
but it cannot manufacture exact-slice admission. Downstream attachment requires
both human acceptance and a server-verified authoritative receipt that still
matches the stored payload.

The materializer also binds the same receipt and export ID to the exact
`evidence_readiness` record. Value-chain, evidence-case, and readout consumers
must compare the export receipt with that server-owned readiness receipt. An
export ID or caller-supplied receipt is not expected-slice authority. If a
consumer has no matching authoritative readiness record, the export remains
non-attaching.

Materialized export and readiness IDs use a reversible collision-free encoding
of the exact slice and window tuple. A terminal export may be reused only when
its authoritative receipt exactly matches the newly evaluated receipt. A
terminal direct upload or a mismatched terminal receipt is held and contributes
no export reference.

The public shared validator never authorizes evidence attachment; its
`feeds.evidence_attachment` result remains `false`. Only the backend route may
upgrade the outcome lane, after comparing the server-owned export and readiness
records and rerunning the shared structural/workflow/window checks.

The exported `runSpine` helper is a pure calculation primitive, not an
admission or persistence authority. A caller can supply contextual coverage and
reference inputs to that standalone calculation, so its returned readiness
object is non-authoritative by itself. Backend routes do not accept a
caller-created spine result or caller-created coverage upgrade. They derive
those inputs only after loading and comparing the stored authoritative export
and readiness records. `runValueChain` does not expose the spine coverage,
evidence-reference, or packet-context override fields.

Legacy aggregate API-push packages that omit both JBTD and persona remain valid
for V3 and Outcome Evidence storage. Their plans omit materialization and remain
non-admissive until both exact join keys are supplied.

## Independent Gates

This contract does not change suppression, privacy, model, readiness, review,
claim, or economic-output policy. Each remains independently fail-closed. It
adds no canonical event, suppression reason, threshold, person-level field,
score, ROI output, causal claim, or prediction.
