## ADDED Requirements

### Requirement: Exact Two-Window Outcome Evidence Privacy Is Atomic

The system SHALL evaluate one exact baseline/comparison Outcome Evidence family
through a server-owned comparison privacy authority before the pair can become
a future claim input. The authority SHALL bind organization, workflow, JBTD,
persona, metric, source, unit, exact windows, opaque evidence lineage, cohort
context, aggregate values, current Slice B admission, current C.0 proof
authority, and the complete stored projection atomically. Admission, review,
readiness, a copied receipt, or two independently available values SHALL NOT
establish comparison privacy.

#### Scenario: Exact current C.0 family releases

- **WHEN** the signed C.0 proof handoff revalidates exactly one current
  server-loaded admitted pair and its existing shared reservation
- **THEN** C.1 MAY commit one immutable atomic comparison projection
- **AND** it SHALL return only a bounded non-authorizing receipt and the exact
  stored projection
- **AND** neither component window SHALL become independently queryable

#### Scenario: C.0 or admission authority is missing

- **WHEN** the proof, authority epoch, admission, C.0 journal, shared
  reservation, exact evidence pair, or persistence is missing, stale, revoked,
  conflicting, unavailable, or cross-slice
- **THEN** comparison privacy SHALL remain `HOLD`
- **AND** no caller metadata or another slice's volume SHALL rescue it

### Requirement: C.1 Reuses The C.0 Shared Reservation

C.1 SHALL require the existing exact-slice reservation to be owned by the
verified C.0 proof journal as `OUTCOME_COMPARISON_PROOF`. It SHALL NOT create,
adopt, replace, or mutate a reservation, cohort manifest, population
commitment, member token, or contribution claim.

#### Scenario: Reservation owner or reference differs

- **WHEN** the reservation is absent or any owner kind, owner reference,
  content hash, organization, workflow, JBTD, or persona differs
- **THEN** C.1 SHALL `HOLD` without writing a comparison row

#### Scenario: Slice C already owns the domain

- **WHEN** the shared reservation belongs to `SLICE_C_FIXED_WINDOW`
- **THEN** C.1 SHALL `HOLD`
- **AND** it SHALL NOT adopt the Slice C row or mint another reservation key

### Requirement: Comparison Replay And Differencing Fail Closed

The system SHALL permit only exact replay of the first immutable comparison
release bound to a C.0 proof journal and shared reservation. Changed, partial,
alternate, shifted, overlapping, reordered, time-advanced, aliased, or
cross-slice comparisons SHALL NOT create a second projection.

Before any initial or replay return, the system SHALL reload the immutable C.1
row, fully parse `projection_json` with the shared projection schema,
revalidate every typed column against the parsed projection, recompute and
compare `projection_hash`, and rebuild and compare the complete content
commitment from the reloaded C.1/C.0/evidence/reservation lineage. Database
checks and JSON-schema shape alone SHALL NOT substitute for these comparisons,
including cross-field date overlap, negative-zero rejection, or
scalar-to-projection/hash parity.

Every C.1 row SHALL also carry a database-stamped creation attestation. The
repository SHALL present the configured active key ID and provisioned C.1
secret only after the current C.0 handoff and exact evidence revalidation
succeed. It SHALL use parameterized transaction-local `set_config(..., true)`;
SQL interpolation, persistent session settings, and logging are prohibited.
A database `BEFORE INSERT` guard SHALL reject missing, malformed, mismatched,
or revoked keys before uniqueness can be occupied, force a UTC millisecond
database creation time, bind the row to the active key ID, and stamp
HMAC-SHA-256 over the complete immutable release identity.

Secrets SHALL be canonical unpadded base64url encodings of exactly 32 bytes.
The attestation SHALL use the exact versioned length-framed binary codec in the
change design: UTF-8 text, native UUID/int/float/bool send encodings, decoded
hash bytes, epoch-millisecond time, fixed field order, and domain
`FT_C1_CREATION_ATTESTATION_V1`. The append-only versioned key registry and
activation/revocation journals, `pgcrypto`, restricted
runtime/deployment-provisioner role boundary, insert guard, verifier, and
matching configured active and retained keys SHALL be readiness prerequisites.
The runtime role SHALL have no direct read or mutation authority on any of the
three key journals. The secret SHALL NOT be stored, logged, returned, or
included in the receipt. Database
owner/superuser or deployment-provisioner compromise is outside this
runtime-writer control. A protected append-only activation journal SHALL make
its greatest committed epoch the only key eligible for new creation. The
release creation time SHALL be stored as `TIMESTAMPTZ(3)` and encoded only as
signed epoch milliseconds.

The trigger SHALL identify its invoker with
`session_user = 'fluencytracr_c1_runtime'`, and runtime connections SHALL
authenticate directly as that role rather than connect as an owner/provisioner
and use `SET ROLE`. The runtime role SHALL receive only the table/RLS/function
permissions required by the exact C.0 handoff and C.1 release transaction.
Outcome Evidence and AI Value SHALL preserve their historical RLS posture.
C.1 SHALL add exact runtime-scoped `SELECT` policies for both and an AI Value
`UPDATE` policy with a false write check for row locking. Readiness SHALL fail
if RLS or any exact policy drifts. Runtime SHALL have no Outcome Evidence write
authority, only the guarded AI Value `UPDATE` needed for row locking, and no
access to aggregate privacy manifests or contribution claims.

Structural readiness SHALL bind every governed trigger to the exact
public-schema function `regprocedure` OID and reject unexpected non-internal
triggers. The governed set SHALL include the Outcome Evidence family-lock
trigger, with exact enabled, row-level, `BEFORE INSERT OR UPDATE OR DELETE`,
no-condition, zero-argument, and empty trigger-column posture. Readiness SHALL
reject a same-name `UPDATE OF` replacement that can skip family locking for a
slice-identity update and a later-sorting trigger that can rewrite slice
identity after that lock. It
SHALL attest both the family-lock trigger function and its four-field key
codec by exact signature, owner, language, volatility, parallel and strict
attributes, security posture, search path, body, and owner-only execute ACL.
It SHALL attest the runtime lock-only function's exact signature,
owner, language, binary/source, volatility, parallel and strict attributes,
security posture, search path, body, and execute ACL. It SHALL also attest the
exact database-owner `pgcrypto` `digest` and `hmac` C-function definitions,
extension dependencies, configuration, attributes, and owner-only execute
ACLs. Same-named cross-schema functions, no-op replacements, owner drift,
family-lock/codec body drift, execute-grant drift, source-table RLS drift, and
missing or forbidden runtime table privileges SHALL fail closed.
The provisioner SHALL have exactly `SELECT` and `INSERT` on the three key
journals, exactly `USAGE` and `SELECT` on the activation sequence, and no
privilege on any other public table or sequence. Additional provisioner
authority SHALL fail structural readiness.

#### Scenario: Exact replay returns stored projection

- **WHEN** the identical current server-derived family is evaluated again
- **AND** the final locked reload proves every typed column, parsed projection
  field, projection hash, and complete content commitment are identical
- **THEN** the authority SHALL return the original receipt and stored
  projection byte-stably
- **AND** it SHALL NOT trust or return a caller-supplied projection

#### Scenario: Any bound input changes

- **WHEN** a value, window, evidence ID or content hash, cohort context,
  metric, source, unit, proof, admission, slice, or projection changes
- **THEN** the candidate SHALL `HOLD` without mutating the first release

#### Scenario: Evidence family mutates during commit

- **WHEN** an Outcome Evidence row is inserted, updated, deleted, or moved
  between exact families before or during C.1 commit
- **THEN** the database mutation trigger and repository SHALL acquire the same
  exact family advisory lock, with deterministic old/new ordering
- **AND** C.1 SHALL use a plain post-advisory-lock exact-ID read and full
  revalidation, not `SELECT ... FOR UPDATE`
- **AND** if direct `UPDATE` or `DELETE` already owns a row lock while waiting
  for the family lock, C.1 SHALL read the last committed version without
  deadlocking and the mutation SHALL not commit until after the C.1 decision
- **AND** C.1 SHALL never commit from a stale or partially changed pair

#### Scenario: Direct database writer attempts to mint a release

- **WHEN** a database writer copies genuine immutable C.0 references, chooses
  arbitrary comparison values, and recomputes every public hash
- **BUT** it does not present the provisioned C.1 creation secret
- **THEN** the `BEFORE INSERT` guard SHALL reject the row before either
  immutable uniqueness key can be occupied
- **AND** a missing, wrong, or drifted creation attestation SHALL remain
  `HOLD` on commit, replay, and readback

#### Scenario: Runtime writer attempts to squat the key registry

- **WHEN** the restricted runtime writer attempts to read, insert, update,
  delete, truncate, trigger, or own a creation key, activation, or revocation
  row
- **THEN** PostgreSQL SHALL deny it
- **AND** provisioning SHALL insert-or-exact-verify under the separate
  deployment-only role without replacing or adopting a mismatch
- **AND** neither the runtime nor provisioner role SHALL have effective
  `CREATE` authority on schema `public`, whether granted directly, through
  `PUBLIC`, or through role membership
- **AND** any such effective schema authority SHALL fail structural readiness
- **AND** direct key-journal reads SHALL remain denied while a bounded
  security-definer readiness function accepts parameterized validated key
  arrays and returns only boolean/closed diagnostics

#### Scenario: Attestation key rotates or is revoked

- **WHEN** a new non-revoked key is registered but remains inactive and
  unreferenced
- **THEN** existing instances configured with the current active key SHALL
  remain ready during the staging interval
- **BUT WHEN** the new registered key becomes active and the prior key and secret
  remain retained
- **THEN** new releases SHALL bind the new key and old releases SHALL continue
  exact replay/readback under their stored key IDs
- **BUT WHEN** a key is revoked or a non-revoked referenced secret is missing
  or mismatched
- **THEN** releases bound to that key and readiness SHALL fail closed as
  specified, without re-attesting or mutating an old row
- **AND** the greatest committed activation SHALL reject new creation from a
  concurrently running instance that still presents the prior key
- **AND** if that greatest activation is revoked, creation and readiness SHALL
  hold until a later activation is appended and SHALL NOT fall back to an
  older key
- **AND** creation under one non-UTC session `TimeZone` SHALL verify under
  another

### Requirement: Comparison Receipt And Readback Are Non-Authorizing

The receipt SHALL contain only bounded opaque policy and hash references and
fixed false authorization flags. A future internal consumer SHALL present
exactly one receipt and one expected exact slice and SHALL read the exact
immutable C.1 row, referenced C.0 proof journal, shared reservation, and
current revocation state for the stored producer key/version before receiving
the stored atomic projection. Readback SHALL use the durable decision
committed while the signed proof was current; ordinary proof expiry SHALL NOT
erase it, but later authority revocation SHALL make future readback hold. The
receipt SHALL contain no aggregate value, cohort size, evidence ID, member
data, claim text, model state, or economic interpretation.

Readback SHALL acquire the expected-slice family lock first, perform only the
minimum immutable C.1/C.0 discovery read needed to identify the stored producer
key/version, acquire that producer lock second, and then reload and compare the
complete C.1 row, C.0 journal, reservation, receipt, expected slice, and
revocation state. The discovery read is non-authorizing and SHALL NOT return a
projection or value.

After both locks are held, readback SHALL reload the complete chain, fully
schema-parse the stored projection JSON, compare every typed scalar column to
the parsed projection, recompute the projection hash, and rebuild and compare
the complete content commitment before returning. It SHALL then present the
configured secret for the row's stored key ID transaction-locally and invoke
the database verifier to reload the protected key/revocation state and
recompute and compare the creation HMAC. Initial post-insert final reload,
replay, and readback SHALL all perform this verification. Any mismatch,
revoked key, missing retained secret, configuration or registry drift, parse
failure, or attestation failure SHALL remain `HOLD`; initial post-insert
failure SHALL throw and roll back.

#### Scenario: Receipt is copied or journal readback fails

- **WHEN** a caller supplies matching-looking receipt metadata or exact
  readback of the immutable C.1 row, referenced C.0 journal, and shared
  reservation owner/reference does not succeed
- **THEN** the comparison SHALL remain `HOLD`
- **AND** readback SHALL NOT rerun or extend the short-lived signed proof
- **AND** no claim, model, ROI, causality, productivity, prediction, ranking,
  publication, or customer-facing output SHALL be authorized

#### Scenario: Proof expires or authority is revoked after release

- **WHEN** the short-lived signed proof expires after a valid C.1 commit
- **THEN** exact immutable readback MAY still return the stored projection
- **BUT WHEN** the stored producer key/version is later revoked
- **THEN** every future readback SHALL `HOLD` without mutating the C.1 row

#### Scenario: Consumer attempts cross-slice composition

- **WHEN** a consumer presents multiple receipts or attempts to combine
  individually valid C.1 rows from different exact slices
- **THEN** C.1 SHALL `HOLD`
- **AND** it SHALL expose no list, multi-read, or cross-slice composition path
- **AND** sequential privileged single-slice readbacks SHALL remain
  non-authorizing and SHALL NOT establish a C.1 cross-slice privacy guarantee
