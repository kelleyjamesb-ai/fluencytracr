# Change: Add Cohort Proof And Shared Privacy Reservation

## Why

Slice B admits exact Outcome Evidence records, but aggregate value and cohort
size do not prove that baseline and comparison describe the same population.
Slice C also owns a create-once single-window privacy journal, while C.1 will
need an atomic two-window journal. Separate reservation tables would allow both
authorities to release the same exact slice sequentially or concurrently.

Slice C.0 establishes the missing trusted customer-boundary proof and one
irreversible cross-authority reservation before C.1 implementation begins.

## What Changes

- Add a Node customer-boundary producer for an Ed25519-signed, organization-bound,
  non-member-level cohort-equality proof.
- Keep member handles and population keys inside the customer environment;
  the raw proof and population commitment are verification-time inputs only
  and are never persisted or logged.
- Add a fail-closed verifier backed by a pre-provisioned immutable
  organization/key epoch and append-only revocation record. FluencyTracr holds
  only the public verification key and cannot manufacture a producer proof.
- Add one canonical reservation key derived only from organization, workflow,
  JBTD, and persona.
- Add one create-once shared reservation/tombstone used atomically by Slice C
  and the accepted C.0 proof path.
- Recheck authority, exact evidence, Slice B admission, legacy Slice C state,
  freshness, and reservation ownership inside one serialized commit boundary.
- Preserve exact replay only and hold invalid, unknown, expired, revoked,
  stale, changed, cross-slice, aliased, or conflicting proof attempts.

## Impact

- Affected specs: `aggregate-disclosure`, `outcome-evidence`
- Affected code: customer-side transformer proof producer, shared proof
  contract, backend verifier/repository, Slice C release transaction, Prisma
  schema/migration, JSON schemas, documentation, and focused tests
- Compatibility: existing storage remains readable; an existing Slice C
  release may adopt only its own missing shared reservation, while C.0 holds
  whenever a legacy Slice C release already exists
- Governance: no C.1 comparison release, Slice D semantics, public proof
  endpoint, migration apply, deployment, publication, live proof, member
  tokens, individual fields, new event, new suppression reason, tunable
  threshold, score, ranking, ROI, causality, productivity, or prediction
