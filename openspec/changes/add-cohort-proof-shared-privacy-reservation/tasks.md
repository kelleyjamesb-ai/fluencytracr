## 1. Contract

- [x] 1.1 Add the strict proof, immutable authority epoch, append-only
      revocation, reservation, journal, and receipt types plus the shared
      byte-exact codec and JSON schemas.
- [x] 1.2 Add the standard-library Node Ed25519 customer-boundary proof
      producer with no member/key output or persisted commitment.
- [x] 1.3 Add contract documentation and exact canonicalization vectors.
- [x] 1.4 Add create-only Prisma models, append-only database guards, readiness
      checks, and an unapplied migration.

## 2. Verification and reservation

- [x] 2.1 Add the fail-closed organization-bound Ed25519 verifier with immutable
      public-key epoch/fingerprint binding, freshness, expiry, and append-only
      revocation.
- [x] 2.2 Inside the commit transaction, resolve the accepted server-owned
      Slice B export/readiness, reload exact evidence, recompute exact
      evidence/receipt hashes, and require one total admitted pair and one
      evidence ID per window with canonical metric-library identity.
- [x] 2.3 Add the create-once shared reservation and C.0 proof journal in one
      advisory-lock-governed `ReadCommitted` transaction with all required
      locks acquired before governed reads.
- [x] 2.4 Require the same shared reservation inside the Slice C release
      transaction; allow only Slice C to adopt its exact pre-migration journal
      and make C.0 hold on every legacy Slice C row.
- [x] 2.5 Keep C.0 proof, receipt, commitments, hashes, and diagnostics off all
      HTTP, AI Value, audit, error, and log surfaces.
- [x] 2.6 Make the C.1 handoff load the exact C.0 journal and replay its
      existing reservation owner/reference; do not implement C.1 release.

## 3. Verification

- [x] 3.1 Add fail-first producer/codec vectors for unequal, invalid,
      duplicate, Unicode, delimiter-looking, reordered, and missing members;
      count mismatch; timestamp/number canonicalization; and no
      member/key/commitment leakage.
- [x] 3.2 Add verifier tests for unknown, invalid, expired, revoked, stale,
      cross-org/public-key reuse, cross-slice, evidence/receipt/policy mismatch,
      aliases, multi-metric receipts, future issuance, and exact replay.
- [ ] 3.3 Add both release orders and concurrent Slice C/C.0 first-writer tests
      including a legacy Slice C row, evidence insertion, revocation, simulated
      hash collision, tombstone mutation, and all relevant unique-constraint
      races, proving at most one owner and no orphan state after fresh clients.
- [ ] 3.4 Run focused/full tests, builds, Prisma validation, Assurance Harness,
      V1 governance, docs sweep, strict OpenSpec, and exact
      CODE/BUG/ADVERSARIAL review.
