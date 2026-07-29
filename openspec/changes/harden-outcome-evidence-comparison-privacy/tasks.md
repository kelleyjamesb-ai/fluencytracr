## 1. Contract

- [x] 1.1 Add the exact atomic comparison projection, policy, bounded receipt,
      canonical bytes, and internal diagnostics.
- [x] 1.2 Add additive JSON schemas and contract documentation for the stored
      projection and receipt.
- [x] 1.3 Add one create-only Prisma release model and unapplied migration with
      constraints, append-only guard, RLS, revoked Data API access, and
      readiness coverage. Add a database Outcome Evidence mutation trigger
      whose family advisory-lock key exactly matches the repository codec and
      whose old/new update keys use deterministic ordering. Add versioned
      append-only creation-key, activation, and revocation journals, exact restricted
      runtime/deployment-provisioner roles and ACLs, `pgcrypto`, release
      `BEFORE INSERT` HMAC-SHA-256 guard/verifier, separate insert-or-verify
      provisioning and revocation commands, and readiness checks for every
      required object, owner, ACL, configured key, and referenced retained
      key. Map creation time as `TIMESTAMPTZ(3)` and add a bounded
      security-definer key-readiness function that returns only boolean/closed
      diagnostics. Serialize stamp, verification, readiness, activation, and
      revocation on the same transaction advisory lock. Structurally attest
      exact extension members, roles and memberships, table owners/types/RLS,
      constraints/FKs, policies/ACLs, append-only and stamp triggers, and exact
      codec/stamp/verifier/readiness definitions.

## 2. Authority and integration

- [x] 2.1 Reverify the signed C.0 proof and exact Slice B pair inside the same
      lock-first `ReadCommitted` transaction.
- [x] 2.2 Reuse the existing C.0 reservation owner/reference and reject every
      path that would mint, adopt, or replace it.
- [x] 2.3 Derive and commit one complete projection only from the exact
      server-loaded evidence records bound by the handoff, using a plain
      post-family-lock exact-ID read and full revalidation. Before commit and
      before returning, parse the complete projection JSON with the shared
      schema, compare every typed scalar column to that parsed projection,
      recompute and compare the projection hash, and rebuild and compare the
      complete content commitment. Do not use `SELECT ... FOR UPDATE`, which
      would reverse the direct update/delete-trigger lock order. Only after
      those checks succeed, parse the exact high-entropy versioned key
      configuration and present the active key ID/secret through parameterized
      transaction-local settings so the database can stamp the exact
      length-framed HMAC-SHA-256.
      Invoke bounded attestation readiness at the start of the same
      transaction before the C.0 handoff so active-key rotation/revocation
      serializes with creation and stale configuration cannot reach replay or
      persistence.
- [x] 2.4 Return only exact replay of the immutable row; add an internal
      receipt-and-slice readback for a future Slice D consumer. Acquire the
      expected family lock, use a non-authorizing immutable discovery read to
      find the producer key, acquire the producer lock, then reload and compare
      the complete C.1/C.0/reservation/revocation chain. The final reload SHALL
      revalidate every typed column, fully schema-parse `projection_json`,
      compare every scalar-to-projection mapping, recompute `projection_hash`,
      and rebuild and compare the content commitment before returning any
      projection or receipt. Resolve the exact retained secret for the row's
      bound key ID, present it transaction-locally, and invoke the database
      creation-attestation verifier before the initial post-insert return and
      every replay/readback return; initial failure SHALL roll back. Run the
      same bounded active/key-set readiness before any replay/readback
      discovery or return.

## 3. Verification

- [x] 3.1 Add fail-first policy/repository tests for missing or copied
      authority, revoked/stale proof, zero/multiple pairs, changed value,
      shifted/overlapping/alternate window, cross-slice input, reservation
      mismatch, exact replay, repository and direct evidence INSERT/UPDATE/
      DELETE races, trigger/repository lock-key parity, concurrency, and
      unavailable persistence. Include the direct UPDATE/DELETE interleaving
      that owns the row lock before C.1 acquires the family lock, and prove the
      plain C.1 read neither deadlocks nor admits an uncommitted mutation.
      Prove raw C.1 inserts with missing or wrong creation secrets fail before
      uniqueness can be squatted and that registry or trigger drift fails
      readiness. Prove the runtime role cannot read, create, mutate, own, or
      trigger any key, activation, or revocation journal; provisioning cannot
      replace or adopt a mismatch; exact
      `pgcrypto`, function/trigger owner/ACL/search-path/source, role, policy,
      configured-key, and retained-key drift fails readiness.
      Prove direct runtime authentication and `session_user` enforcement,
      owner/provisioner `SET ROLE` cannot masquerade as runtime, direct journal
      reads remain denied while bounded readiness succeeds, old/new concurrent
      configs admit only the greatest activation, a revoked greatest
      activation without a later activation never falls back, and
      cross-`TimeZone` creation/verification is stable.
      Prove the runtime cannot INSERT, UPDATE, or DELETE C.0 authority,
      revocation, reservation, or journal rows; its only UPDATE grants are
      guarded row-lock capabilities on producer authority and AI Value rows.
      Preserve historical RLS on Outcome Evidence and AI Value, require exact
      runtime-scoped read policies plus the guarded AI Value lock-only update
      policy, and prove direct reads/row locking work while forbidden writes
      and unused aggregate manifest/contribution-claim reads are denied.
      Prove the provisioner has exact read/insert authority only on the three
      key journals, exact usage/read authority only on the activation
      sequence, and zero authority on every other public table or sequence.
      Force activation-first, creation-first activation, revocation-first, and
      creation-first revocation interleavings and prove lock ordering,
      post-mutation HOLD, and no post-rotation/revocation commit. Apply
      rollback-scoped live drift to roles, memberships, RLS, FKs, policies,
      exact trigger-function OID bindings, unexpected triggers, ACLs,
      runtime-guard bodies, and pgcrypto owner/body/ACL metadata and prove
      exact readiness fails. Bind the Outcome Evidence family-lock trigger to
      its exact public function OID, reject every additional trigger on that
      table, and pin both the trigger function and four-field family-key codec
      by exact owner/language/volatility/parallel/strict/security/search-path/
      body/ACL metadata. Prove a later-sorting identity-rewrite trigger,
      replacement of either function body, or either execute-ACL drift fails
      both transactional structural readiness and `/ops/db/readiness`.
      Require empty trigger-column metadata and prove a same-name
      `UPDATE OF` replacement that skips a slice-identity family lock also
      fails readiness and rolls back.
- [x] 3.2 Add regressions proving direct uploads, admission-only pairs, C.0
      receipts without journal readback, and caller projections never become
      C.1-authoritative. Prove expired or revoked proof before commit holds;
      commit replay still requires a current signed handoff; durable readback
      survives proof expiry but holds after authority revocation; tampered or
      missing C.1/C.0/reservation references hold; and no multi-receipt or
      cross-slice composition readback exists. Document and test that
      sequential privileged single-slice readbacks are not C.1 composition
      authority and remain prohibited as inputs to cross-slice aggregation.
      Prove the pre-producer-lock discovery read cannot return a projection or
      authorize a result, and that the complete chain is reloaded and compared
      after both locks. Prove a self-consistent forged C.1 row or receipt
      without a valid database-stamped creation attestation cannot become
      authoritative. Prove rotation preserves old-row readback with retained
      secrets, new rows bind the active key, and revoked or missing referenced
      keys hold.
- [x] 3.3 Run focused tests, full backend, builds, lint, Prisma validation,
      migration/readiness and PostgreSQL checks, Assurance Harness, V1
      governance, docs sweep, strict OpenSpec validation, and exact
      CODE/BUG/ADVERSARIAL review.
