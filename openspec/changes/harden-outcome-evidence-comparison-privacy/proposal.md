# Change: Harden Outcome Evidence Comparison Privacy

## Why

Slice B admits one exact baseline/comparison Outcome Evidence pair, and Slice C
protects fixed-window aggregate releases from complementary suppression and
differencing. C.0 now provides the missing trusted same-population proof plus
one database-unique reservation shared by Slice C and comparison privacy.
Neither C.0 nor an admission receipt, however, stores an atomic numeric
comparison projection that a future claim policy can re-read.

Slice C.1 adds that narrow server-owned authority. It turns one currently valid
C.0 proof handoff into one immutable, atomic two-window projection without
making either window independently queryable and without authorizing claim
language.

## What Changes

- Add one exact comparison policy and bounded non-authorizing receipt.
- Reverify the signed C.0 proof and current Slice B authority inside the C.1
  release transaction.
- Reuse the existing C.0 `OUTCOME_COMPARISON_PROOF` reservation
  owner/reference; C.1 cannot mint, adopt, or replace a reservation.
- Build the projection only from the exact server-loaded evidence pair bound by
  the handoff, then store both windows and their values in one immutable row.
- Require a provisioned, versioned C.1 creation-attestation key whose immutable
  database hash is established by a deployment-only provisioner before
  readiness. The restricted C.1 runtime role cannot read or write the key,
  activation, or revocation journals. The database's greatest committed
  activation is the only key eligible for new creation. Present that active
  key ID and secret to PostgreSQL only
  after the current C.0 handoff and exact evidence revalidation succeed; a
  `BEFORE INSERT` trigger rejects every unattested direct row and stamps a
  domain-separated HMAC-SHA-256 over the immutable release. Retained keys
  preserve replay/readback across rotation; revoked or missing keys hold.
- Permit only exact replay of that row; changed, partial, alternate, shifted,
  overlapping, stale, cross-slice, or unavailable candidates hold.
- Provide an internal journal readback for a future Slice D policy; add no
  public numeric endpoint.

## Impact

- Affected specs: `outcome-evidence`, `aggregate-disclosure`
- Affected code: shared comparison contract, backend repository/readback,
  additive Prisma model and unapplied migration, readiness, schemas, contracts,
  creation-attestation provisioning, and focused tests
- Compatibility: Slice B admission, Slice C fixed-window behavior, C.0 proof
  verification, existing exports, and direct uploads remain unchanged
- Excluded: claim authorization or templates, canonical claim identity, claim
  trace, model execution, public/customer output, migration apply, deployment,
  live proof, new canonical events or suppression reasons, tunable thresholds,
  member tokens, individual fields, scoring, ranking, ROI, causality,
  productivity, or prediction
