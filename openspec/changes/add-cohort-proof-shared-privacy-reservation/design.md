## Context

Outcome Evidence currently contains aggregate values, cohort sizes, exact
slice keys, metric/source/unit identity, windows, and opaque evidence IDs. It
does not contain population membership or a safe equality proof. Raw membership
must remain in the customer environment.

Slice C has an immutable single-window journal with a privacy-domain
fingerprint over `(org_id, workflow_id, jbtd_id, persona_id)`. That uniqueness
exists only inside the Slice C table. A future C.1 table could independently
claim the same domain.

## Goals

- Prove, through an authenticated customer-boundary producer, that two exact
  aggregate evidence windows use the same population without transmitting
  member material.
- Bind the proof to the exact current Slice B receipt and evidence content.
- Give Slice C and the future C.1 path one atomic, irreversible reservation.
- Keep every external HOLD transcript value-independent.

## Non-Goals

- Independent verification of customer source rows inside FluencyTracr.
- Transmitting member handles, reusable member hashes, raw rows, prompts,
  outputs, or attestations.
- C.1 comparison release, claim semantics, model authority, public proof
  reads, deployment, or live key provisioning.
- Canonical metric/source/unit aliasing; unknown or changed representations
  hold.

## Decisions

### Customer-boundary aggregate proof

A separate Node CLI runs beside the existing customer-side transformer and
imports the shared proof codec used by the backend. It uses only Node's
standard `crypto` implementation. This avoids a second-language
canonicalization or cryptography implementation. It consumes locally:

- the exact baseline and comparison member handles;
- the exact server-owned Slice B admission receipt and export reference;
- the exact aggregate baseline and comparison evidence records;
- one customer-held population HMAC key; and
- one organization-bound Ed25519 private signing key.

Member handles are opaque strings, not email addresses or reusable member
hashes in the proof contract. Each handle must be a valid Unicode scalar
sequence whose UTF-8 encoding is 1 through 256 bytes and contains no C0
control. The producer performs no trimming, case-folding, or Unicode
normalization. It rejects invalid handles and rejects duplicate UTF-8 byte
strings before constructing either set; it never silently deduplicates.

For each window the producer sorts handles by unsigned UTF-8 byte order and
encodes `u32be(member_count)`, followed by each
`u32be(byte_length) || member_utf8`. It computes:

`HMAC-SHA256(population_key, framed("FT_COHORT_EQUALITY_COMMITMENT_V1", org_id, workflow_id, jbtd_id, persona_id, encoded_members))`

The population key is at least 32 random bytes and is independent of the
Ed25519 key. Binding the exact slice makes commitments from different slices
unlinkable. Member handles and keys never appear in output, logs, errors,
fixtures, or persisted artifacts. The two commitments must match and each
local set cardinality must equal its exact evidence `cohort_size`.

The producer then emits a strict proof containing:

- compiled proof and producer policy versions;
- proof ID, organization, producer key ID, issued-at, and expires-at;
- exact workflow/JBTD/persona and metric/source/unit identity;
- exact baseline/comparison windows and cohort sizes;
- canonical hashes of the exact baseline and comparison evidence records,
  including evidence ID, org, slice, metric/source/unit, window, IEEE-754
  aggregate value, cohort size, aggregate kind, safely canonicalized source
  attestation, and ingestion time;
- canonical hash of the complete server-owned Slice B admission receipt;
- the equal aggregate population commitment;
- the canonical shared reservation key; and
- an Ed25519 signature over the exact domain-separated unsigned proof bytes.

Only this aggregate proof crosses the boundary. The commitment is keyed,
slice-local, group-level, and non-member-addressable. The raw proof and
commitment exist only for the duration of verification and are not persisted.

### Byte-exact codec

One shared `FT_COHORT_PROOF_CODEC_V1` module defines all proof, evidence,
receipt, reservation, public-key fingerprint, and member-set bytes. Every
transcript starts with an ASCII purpose/version domain and encodes each field
as an explicit tag, type, and `u32be` length. Strings are exact UTF-8 after
rejecting unpaired surrogates; integers are unsigned big-endian; aggregate
values are finite IEEE-754 binary64 big-endian bytes with negative zero
rejected; booleans are one byte; timestamps are exact RFC3339 millisecond UTC
strings; hashes are 32 raw bytes internally and lowercase 64-character hex at
contract boundaries; signatures are raw 64-byte Ed25519 values encoded as
unpadded base64url.

The source-attestation field uses versioned canonical JSON: objects have
unique keys sorted by unsigned UTF-8 key bytes; arrays retain order; strings
use exact UTF-8; numbers use finite ECMAScript `JSON.stringify` spelling with
negative zero rejected; and `null`/booleans use their lowercase JSON tokens.
Undefined values, sparse arrays, non-finite numbers, unpaired surrogates,
duplicate parsed keys, and unsupported values hold. There are no optional
fields in a signed transcript: absence is an explicit tagged `null`.

The contract publishes cross-process golden vectors for reordered sets,
delimiter-looking handles, raw and canonical duplicates, Unicode variants,
empty/invalid handles, timestamps, negative zero, evidence content, admission
receipt, reservation key, public-key fingerprint, unsigned proof bytes, proof
hash, and signature. Producer and verifier must pass the same vectors.

### Organization-bound producer authentication

FluencyTracr loads a pre-existing producer-authority row by exact
`(org_id, producer_key_id, authority_version)`. Each authority epoch is
immutable and binds:

- expected proof and producer policy versions;
- a DER-SPKI Ed25519 public verification key;
- a globally unique public-key fingerprint;
- validity start and exclusive expiry; and
- immutable organization, key ID, and authority version.

The fingerprint is SHA-256 over a domain-separated, length-framed DER-SPKI
public key and is lowercase hex. A database uniqueness constraint rejects the
same public key across organizations. Revocations are append-only rows keyed
to the immutable authority epoch; authority rows are never updated to express
revocation.

The backend verifies with the public key and therefore cannot sign a proof.
The exact org, key ID, authority version, proof/producer policy versions, and
every proof field are inside the signature transcript. Unknown key, malformed
public key, fingerprint mismatch, resolver substitution, bad signature,
invalid time, expired or revoked epoch, policy mismatch, or proof beyond the
compiled maximum lifetime holds. These are internal diagnostic enums only.

The transaction obtains one database `clock_timestamp()` as `commit_time` and
enforces, without configurable skew:

`authority.valid_from <= proof.issued_at <= commit_time < proof.expires_at <= authority.expires_at`

and `proof.expires_at - proof.issued_at <= COMPILED_MAX_PROOF_LIFETIME`.
Authority registration takes a producer-key advisory lock, requires strictly
increasing versions, and rejects overlapping validity windows. Verification
takes that same lock, locks every epoch for the organization/key, and requires
exactly one epoch active at the database decision time. That active immutable
authority version must equal the signed version. A scheduled future epoch does
not supersede the current epoch before its `valid_from`; once the next epoch is
active, the prior epoch is necessarily expired and cannot sign or replay.
Signature and hash comparisons decode to fixed-length bytes first and use
constant-time equality where equality is not already established by Ed25519
verification.

### Exact evidence and admission binding

The caller supplies no authoritative evidence IDs, receipt, metric choice, or
export reference. From the exact signed slice/windows, the receiver resolves
the accepted server-owned Slice B export and matching readiness record,
reloads current Outcome Evidence records, and recomputes current Slice B
admission. The exported Slice B receipt hash helper becomes a shared public
codec function. The receiver recomputes:

- baseline evidence content hash;
- comparison evidence content hash; and
- the complete admission receipt hash.

The admission must have `admitted_pairs.length === 1`, and each receipt window
must contain exactly one evidence ID for that pair. The pair's
metric/source/unit must equal the server-owned materialized metric-library
selection already enforced by Slice B. Unknown metric definitions and every
alternate representation hold; C.0 performs no trimming, normalization, or
semantic alias matching. Different evidence, a copied receipt, or a
caller-selected receipt/export also holds.

All authority, evidence, admission, proof, time, and legacy-state checks occur
inside the committing `ReadCommitted` transaction. Outcome Evidence writes and
C.0 acquire the same exact family advisory transaction lock before reading or
writing the two windows. Every governed transaction acquires all required
advisory locks first in canonical outcome-family then producer-key order so
later statements use post-wait snapshots while relevant writers remain
excluded. The C.0 transaction then locks the immutable
authority epoch row; revocation insertion must acquire that same row lock.
This gives an explicit ordering for concurrent evidence mutation and
revocation. A concurrent duplicate/replacement evidence write, authority
revocation, or changed accepted export serializes before or after C.0; if it is
effective at or before C.0 commit, C.0 holds and writes no state. Repository
helpers accept the transaction client and C.0 has no in-memory fallback.

### One canonical shared reservation

Both Slice C and C.0 derive exactly:

`SHA-256(FT_COHORT_PROOF_CODEC_V1.reservation_bytes(org_id, workflow_id, jbtd_id, persona_id))`

No metric, source, unit, window, evidence ID, value, slot, contribution,
producer, or path-specific field enters this key.

A new `aggregate_privacy_reservations` table has a database-unique
`(org_id, reservation_key)` and stores:

- immutable owner kind: `SLICE_C_FIXED_WINDOW` or
  `OUTCOME_COMPARISON_PROOF`;
- immutable owner reference and owner content hash;
- exact slice fields; and
- creation time.

There is no application update or delete path, and the migration installs a
database guard that rejects `UPDATE` and `DELETE`. Rows are retained
tombstones. Every lookup compares the exact stored tuple in addition to the
hash so a hash collision holds. Exact replay requires the same owner kind,
reference, content hash, and slice. Any other owner or content holds.

Slice C reserves this row inside its advisory-lock-governed `ReadCommitted`
release transaction before its journal row and contribution claims commit. A
pre-migration Slice C
journal exact replay may atomically create its own missing
`SLICE_C_FIXED_WINDOW` reservation; C.0 may never adopt a legacy Slice C row
and holds if any matching Slice C privacy-domain journal already exists. C.0
checks that legacy table before creating its proof journal and reservation in
the same transaction. Database uniqueness, exact domain advisory locking, and
post-wait `ReadCommitted` snapshots make both release orders and concurrent
cross-authority first writers converge on at most one owner. Any transaction
failure or uniqueness race holds with no orphan reservation, proof, journal,
or claims.

### C.0 proof journal and replay

The C.0 journal never stores the signed proof or population commitment. It
stores proof ID, proof hash, authority version, evidence hashes, admission
hash, exact typed slice/evidence tuples, reservation key, and decision. It is
unique by organization/proof ID, proof hash, admission hash, evidence-pair
hash, and reservation key. Exact replay reacquires the locks and re-verifies
current authority/revocation, current evidence, current admission, proof
signature, proof freshness, exact stored tuples, and the retained reservation
before returning only a bounded non-authorizing receipt.

Deleted, replaced, superseded, expired, revoked, policy-mismatched, stale, or
unreadable authority holds. Historical reservation rows remain and are never
reassigned.

The later C.1 path must present the signed proof plus its expected
organization/slice to the internal handoff verifier inside the same
advisory-lock-governed `ReadCommitted` transaction used for the future release.
That verifier reruns
current authority, revocation, freshness, accepted Slice B chain, evidence,
admission, journal, and reservation checks; matches every typed field,
non-authorizing flag, hash, ID, count, and window; and returns the existing
`OUTCOME_COMPARISON_PROOF` reservation owner/reference and content hash. C.1
may not mint a second owner or reservation. C.0 proves exact
baseline/comparison population equality only; it does not prove lack of
partial overlap with other independently suppressed slices, and authorizes no
cross-slice joins.

### Safe receipt and transcripts

The internal receipt contains only proof policy version, proof journal ID,
proof hash,
reservation key, authority version, `comparison_privacy_only: true`,
`claim_authority_effect: "NONE"`, `claim_authorized: false`,
`model_authorized: false`, and `customer_publishable: false`.

C.0 adds no HTTP endpoint and does not attach the proof, commitment, receipt,
or hashes to AI Value payloads, list/get responses, materializer results,
errors, audits, or logs. External HOLD behavior is one fixed posture without
values, counts, evidence IDs, hashes, slots, proof details, or diagnostic
differences.

## Risks and Mitigations

- **Customer producer could attest bad source rows.** Producer authentication
  proves provenance and integrity, not independent source truth. The exact
  organization-bound authority is a deliberate trust root; unknown or revoked
  producers hold.
- **Commitment could become a pseudonymous cohort identifier.** It is keyed,
  bound to one exact slice, used in memory only, and never persisted or
  exposed. Cross-slice population tracking is deliberately not introduced.
- **Shared reservation could over-hold legitimate work.** That is intentional:
  the invariant prefers false HOLD over a second equation.
- **Secrets could leak.** The customer private/population keys never cross the
  boundary; the backend stores only a public key, and fixtures use synthetic
  isolated values.

## Migration Plan

Add immutable producer-authority epochs, append-only revocations, proof
journal, and guarded shared-reservation models plus an unapplied migration.
Register all required tables/columns and database guards in readiness checks.
Do not provision live keys, ingest a live proof, apply the migration, or
deploy. Existing Slice C journals are handled only by the fail-closed
legacy-adoption rule above; no bulk backfill runs in this slice.
