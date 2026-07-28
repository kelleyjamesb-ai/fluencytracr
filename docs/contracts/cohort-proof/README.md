# Cohort Equality Proof And Shared Privacy Reservation

Policy version: `FT_COHORT_EQUALITY_PRIVACY_POLICY_2026_07`

This internal C.0 contract proves only that one exact baseline/comparison
Outcome Evidence pair used the same aggregate population. It does not disclose
members, authorize a comparison, create a claim, or permit a cross-slice join.

The customer-boundary Node producer:

- rejects invalid or duplicate local handles before set construction;
- length-frames and byte-sorts handles without trimming, case-folding, or
  Unicode normalization;
- binds the population commitment to the exact organization, workflow, JBTD,
  and persona;
- checks each local cardinality against the exact aggregate evidence record;
- binds the current Slice B receipt and complete evidence content hashes; and
- signs the strict proof with a customer-held Ed25519 private key.

Only the signed aggregate proof crosses the boundary. Member handles,
population keys, and private signing keys never cross. The verifier keeps the
raw proof and population commitment in memory only. Neither is stored or
logged.

FluencyTracr stores immutable Ed25519 public-key epochs with strictly
increasing versions and non-overlapping validity windows. Revocation is a
separate append-only row. Verification locks every epoch for the producer,
accepts only the one epoch active at database decision time, uses one database
decision time, reloads the deterministic accepted Slice B export/readiness
chain and current Outcome Evidence, recomputes admission, and requires exactly
one admitted pair and one evidence ID per window. Alternate metric, unit, or
source representations are not normalized and hold.

Slice C and C.0 hash the same shared codec bytes over only
`(org_id, workflow_id, jbtd_id, persona_id)`. The resulting reservation is a
database-unique, update/delete-guarded tombstone. Slice C may adopt its own
exact pre-migration journal; C.0 may never adopt a legacy Slice C row. Either
release order and concurrent first writers therefore produce at most one
owner.

The internal receipt has `claim_authority_effect: NONE` and all claim, model,
publication, and customer-facing flags false. It is not exposed through an
HTTP endpoint or AI Value payload. A future C.1 implementation must present
the signed proof and expected exact organization/slice to the internal
handoff verifier inside its advisory-lock-governed `ReadCommitted` release
transaction, reload the current authority/evidence/admission and exact C.0
journal, and reuse the existing reservation owner/reference. It may not mint
a replacement.

Schemas:

- [`cohort_equality_proof.schema.json`](../../../schemas/cohort_equality_proof.schema.json)
- [`cohort_proof_privacy_receipt.schema.json`](../../../schemas/cohort_proof_privacy_receipt.schema.json)

This slice adds code and an unapplied migration only. It provisions no live
key, ingests no live proof, applies no migration, deploys nothing, and grants
no Slice C.1 or Slice D authority.
