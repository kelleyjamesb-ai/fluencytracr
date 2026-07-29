## Context

The merged authorities are intentionally separate:

1. Slice B admits exactly one server-loaded pair for an exact
   `(workflow_id, jbtd_id, persona_id, baseline_window, comparison_window)`.
2. Slice C keeps general multi-window and adjacent-window numeric reads held.
3. C.0 verifies a customer-signed aggregate same-population proof, reloads the
   current admitted pair, and owns the shared exact-slice reservation as
   `OUTCOME_COMPARISON_PROOF`.

C.0 stores exact evidence IDs and content hashes but no numeric projection for
downstream interpretation. C.1 must not reconstruct authority from two caller
values, copy C.0 metadata, or create a second contribution/reservation system.

## Goals

- Commit one exact atomic comparison projection from current server authority.
- Reuse and reverify the C.0 proof journal and shared reservation.
- Make replay durable and every changed or incomplete family fail closed.
- Give Slice D one opaque receipt plus journal readback, without authorizing
  Slice D semantics.

## Non-Goals

- General time series, rolling windows, query budgets, or separately readable
  component windows.
- A second cohort manifest, population commitment, member token, contribution
  claim, or privacy reservation.
- Claim language, model eligibility, publication, ROI, causality,
  productivity, prediction, ranking, or customer-facing output.

## Decisions

### C.0 handoff is the only positive privacy fact

The internal C.1 commit accepts a signed C.0 proof and an expected exact slice.
Inside one lock-first `ReadCommitted` transaction it calls
`verifyCohortProofPrivacyHandoff`. That verifier acquires the canonical
outcome-family lock and producer-key lock before governed reads, rechecks
current producer authority and revocation, accepted Slice B export/readiness,
the server-loaded evidence pair, admission receipt, C.0 proof journal, and the
shared reservation.

The handoff must identify `OUTCOME_COMPARISON_PROOF` and the exact existing
reservation owner/reference. Missing, stale, revoked, conflicting, aliased, or
unavailable authority returns `HOLD`. A receipt, validation object, evidence
count, equal cohort sizes, or caller hash is never a substitute.

### One server-derived metric pair

C.0 already requires the accepted export and current admission to contain
exactly one metric pair and one evidence ID per window. After the C.0 handoff,
C.1 performs a plain exact-ID read after acquiring the family advisory lock,
then rechecks every identity, window, cohort, metric, source, unit, value, and
content hash against the handoff before it builds the projection. It MUST NOT
use `SELECT ... FOR UPDATE`: PostgreSQL can acquire an `UPDATE` or `DELETE` row
lock before invoking the row-level mutation trigger, so an advisory-lock-first
C.1 transaction that then waits for that row lock would deadlock with the
writer waiting for the advisory lock. Under `ReadCommitted`, the plain
post-advisory-lock read sees the last committed row version without waiting for
that uncommitted writer. C.1 rejects zero, multiple, duplicate, reordered, or
extra records. Metric, source, and unit are exact strings; aliases are not
normalized.

The C.1 migration also adds a database trigger on Outcome Evidence `INSERT`,
`UPDATE`, and `DELETE`. The trigger derives the exact same value-framed family
advisory-lock key used by the repository from organization, workflow, JBTD, and
persona. For a family-changing update it acquires the old and new keys in
deterministic numeric order. Repository writes reenter the same transaction
lock. A privileged direct `UPDATE` or `DELETE` that already owns a row lock may
wait on the family lock; C.1's plain read then validates the last committed
version and may commit the immutable decision before the writer proceeds. A
privileged direct `INSERT` also waits on the same family lock. Thus no direct
mutation becomes committed between the post-lock read and the C.1 decision,
without creating a reverse-lock deadlock. Readiness verifies the trigger
binding, and the PostgreSQL harness proves exact key parity plus writer-first
and C.1-first direct insert/update/delete races, including the interleaving
where direct `UPDATE`/`DELETE` owns the row lock before C.1 acquires the family
lock.

Section 1 storage checks cannot establish complete projection parity.
Cross-field overlap and negative-zero JSON representation require the shared
projection parser, while scalar-to-JSON, projection-hash, and full content
commitment parity require recomputation from the loaded chain. Section 2 must
perform those full parse, typed-column comparison, hash recomputation, and
content-commitment comparison steps both before commit/return and after the
final locked reload. A database-ready row alone is never return authority.

The stored projection contains:

- projection policy version;
- organization, workflow, JBTD, and persona;
- metric, source, and unit;
- baseline window, opaque evidence ID, cohort size, and aggregate value;
- comparison window, opaque evidence ID, cohort size, and aggregate value.

The projection contains no member data, contribution token, claim text,
percent change, causal interpretation, ROI, productivity, prediction, ranking,
or publication state.

### Existing reservation, new immutable projection journal

C.1 creates no reservation. It verifies that the exact reservation row still
names the C.0 proof journal as owner/reference/content and stores those opaque
references on one new comparison release row.

The comparison content fingerprint covers the exact typed projection, C.0
proof journal/hash, admission receipt hash, evidence content hashes, and shared
reservation key. The projection hash covers canonical bytes of only the stored
projection. Database uniqueness permits one row per organization and C.0 proof
journal/reservation. The row is create-once and update/delete guarded.

Internal consistency is not creation authority. A database writer could
otherwise copy a genuine C.0 journal/reservation, choose arbitrary finite
values, recompute the public hashes, and insert a self-consistent C.1 row after
the signed proof or accepted handoff had become stale.

C.1 therefore uses three append-only, RLS-protected database journals:

- `outcome_comparison_attestation_keys` stores a versioned key ID, fixed
  `HMAC-SHA-256` algorithm identifier, SHA-256 hash of the canonical secret
  encoding, and provision time.
- `outcome_comparison_attestation_key_revocations` stores at most one
  revocation per key ID, including a bounded reason code and database time.
- `outcome_comparison_attestation_key_activations` stores a database-serialized
  activation epoch and registered key ID. The greatest committed epoch is the
  only key allowed to create new releases.

Only the deployment-only
`fluencytracr_c1_attestation_provisioner` role may insert those rows. The
`fluencytracr_c1_runtime` role may neither read nor
`INSERT/UPDATE/DELETE/TRUNCATE/TRIGGER` any key journal, cannot own a key
journal or its security-definer functions, and has no DDL or role-membership
authority. Provisioning is insert-or-exact-verify and never updates, deletes,
replaces, or adopts a mismatched row. A first-squat attempt by the runtime role
is denied. The database owner/superuser and deployment provisioner are explicit
administrative trust boundaries; their compromise is outside the ordinary
runtime-writer threat this mechanism closes.

Runtime configuration contains:

- `C1_CREATION_ATTESTATION_ACTIVE_KEY_ID`, matching
  `^FT_C1_HMAC_[A-Z0-9_]{1,48}$`; and
- `C1_CREATION_ATTESTATION_KEYS_JSON`, an object from key ID to an unpadded
  base64url string that decodes to exactly 32 bytes and round-trips to the same
  43-character encoding.

Secrets are treated as the UTF-8 bytes of that canonical 43-character encoding.
The registry stores lowercase hexadecimal SHA-256 of those bytes. PostgreSQL
`pgcrypto` supplies `extensions.digest` and `extensions.hmac` on hosted
Supabase PostgreSQL. `PUBLIC` and the application/API roles lose execute
authority; the existing platform `dashboard_user` execute ACL is preserved.
The repository passes the active key
ID and secret only through parameterized
`set_config('fluencytracr.c1_attestation_key_id', $1, true)` and
`set_config('fluencytracr.c1_attestation_secret', $2, true)` inside the current
transaction, immediately after the current C.0 handoff, evidence
revalidation, projection, and content commitment succeed. SQL interpolation,
session-persistent settings, and logging are prohibited. The database reads
them with `current_setting(..., true)` and treats missing or malformed values
as failure.

The creation message codec is
`FT_C1_CREATION_ATTESTATION_V1` followed by these binary fields in exact order:

1. attestation key ID;
2. release UUID;
3. `created_at` as signed big-endian epoch milliseconds;
4. policy version, organization, workflow, JBTD, and persona;
5. proof-journal UUID, proof hash, reservation key, and admission-receipt hash;
6. metric, unit, and source;
7. baseline start/end epoch milliseconds, evidence ID/hash, cohort size, and
   IEEE-754 binary64 aggregate value;
8. comparison start/end epoch milliseconds, evidence ID/hash, cohort size, and
   IEEE-754 binary64 aggregate value;
9. projection hash, content fingerprint, decision,
   `comparison_privacy_only`, `claim_authority_effect`, `claim_authorized`,
   `model_authorized`, and `customer_publishable`.

The domain and every field are independently framed as unsigned four-byte
big-endian byte length followed by bytes. Text is UTF-8; UUIDs use PostgreSQL
`uuid_send`; 64-hex hashes decode to 32 bytes; epoch milliseconds use
`int8send`; cohort sizes use `int4send`; values use `float8send`; booleans use
`boolsend`. The message has no session-time-zone-dependent text. The trigger
forces `created_at` to
`date_trunc('milliseconds', clock_timestamp())::timestamptz(3)` before
encoding, and the release column and Prisma mapping are explicitly
`TIMESTAMPTZ(3)` / `@db.Timestamptz(3)`. HMAC output is lowercase 64-hex.

A security-definer `BEFORE INSERT` trigger, owned by the migration owner with
fixed `search_path = pg_catalog, public` and no `PUBLIC` execute grant:

- requires `session_user = 'fluencytracr_c1_runtime'` on a direct runtime
  login, plus the greatest committed activation's registered, non-revoked key
  whose stored hash matches the supplied secret;
- overwrites caller-supplied creation time, key ID, and attestation;
- computes HMAC-SHA-256 over the exact codec; and
- rejects failure before either immutable release uniqueness key is occupied.

The runtime login authenticates directly as
`fluencytracr_c1_runtime`; it MUST NOT connect as an owner/provisioner and use
`SET ROLE`. `session_user`, unlike `current_user`, retains that invoker identity
inside the security-definer trigger. Table ACL/RLS grants release
`SELECT`/`INSERT` and the exact C.0/evidence transaction permissions only to
the runtime role. Historical RLS remains enabled on Outcome Evidence and AI
Value; C.1 adds exact runtime `SELECT` policies for both and a false-write-check
AI Value `UPDATE` policy for row locking. The provisioner has only
`SELECT`/`INSERT` on the three key journals and `USAGE`/`SELECT` on the
activation sequence, with zero privileges on every other public table or
sequence. The owner/provisioner has no release DML grant and cannot masquerade
as runtime through `SET ROLE`; owner/superuser ability to bypass or disable the
mechanism remains the declared administrative trust boundary.
The application supplies this least-privilege direct login through a dedicated
`C1_RUNTIME_DATABASE_URL`; it does not replace the general application
`DATABASE_URL`. Structural readiness may use the general connection, but the
bounded creation-attestation readiness function and every C.1 release
transaction must use the dedicated direct runtime connection.

The provision, activation, and revocation tools likewise authenticate
directly as `fluencytracr_c1_attestation_provisioner` through
`C1_ATTESTATION_PROVISIONER_DATABASE_URL`; they require both `session_user`
and `current_user` to equal that role and never use `SET ROLE`. PostgreSQL 17
may retain only the unavoidable database-owner admin-only creator membership
with no `INHERIT` or `SET` option. Every other membership is structural drift.

Each release binds its `attestation_key_id`. A security-definer verifier accepts
only release ID plus parameterized transaction-local key ID/secret, reloads the
row, key, and revocation internally, recomputes the exact message and HMAC, and
returns only a boolean. Initial post-insert final reload, exact replay, and
durable readback must invoke it after canonical locks and complete chain
revalidation before returning.

Rotation registers the new key, deploys a key map containing both old and new
secrets, and has the provisioner append a serialized activation row. The
greatest committed activation is database-authoritative for new creation, so
an old application instance presenting the prior key holds after activation.
The configured active ID must equal that row. Old releases continue to verify
by their bound key ID. Retirement is the act of activating another key; it
stops new creation with the old ID but retains its secret for readback.
Compromise appends a revocation, after which all rows bound to that key hold;
the revoked key cannot be the greatest activation. If a non-revoked key
referenced by an existing release is absent or mismatched in runtime
configuration, readiness and readback hold rather than silently invalidating
or re-attesting the row.

Readiness verifies exact `pgcrypto` availability; tables, constraints,
columns, indexes, RLS, owners, policies and ACLs; provisioner/runtime role
separation; function/trigger owner, source, signature, security mode, search
path, execute ACL and binding; the configured active key's exact registry hash
and non-revocation; and matching configured secrets for every non-revoked key
referenced by a release. Registry, trigger, function, configuration, or HMAC
drift fails closed.

The exact trigger set includes the Outcome Evidence family-lock trigger bound
to `public.lock_outcome_evidence_family_mutation()` by `regprocedure` OID.
Its `tgattr` must be empty so the `UPDATE` event cannot be narrowed to selected
columns and skip a slice-identity mutation. No additional non-internal trigger
is allowed on Outcome Evidence, including a later-sorting `BEFORE` trigger that
could rewrite slice identity after locking. The lock function and
`public.outcome_evidence_family_lock_key(text,text,text,text)` codec are pinned
by exact body hash and complete owner/language/volatility/parallel/strict/
security/search-path/ACL metadata. Both have owner-only execute ACLs.

Runtime has no direct key-journal `SELECT`, so key-state readiness uses a
bounded security-definer function owned by the migration owner with fixed
`search_path = pg_catalog, public`, no `PUBLIC` execute, and execute granted
only to `fluencytracr_c1_runtime`. The app validates configuration, then
parameterizes `active_key_id`, equal-length `key_ids[]`, and `secrets[]`. The
function revalidates all shapes, compares secret hashes internally, requires
the configured active ID to be present in the configured key array and to equal
the greatest committed activation, then separately requires that exact key to
be registered and non-revoked with a matching configured secret, checks every
non-revoked key referenced by a release, and returns only `ok boolean` plus a
closed array of diagnostic codes. It never skips a revoked greatest
activation; recovery requires appending a newer activation. It never returns
key IDs, hashes, secrets, journal rows, or release data and never stores or
logs input. Empty, duplicate, malformed, mismatched, missing, or unregistered
array entries fail closed. A registered, non-revoked key that is neither active
nor referenced by a release may remain absent from an instance configuration
while it is staged before activation; this is the only registry/configuration
set difference that remains ready.

Exact replay returns the original receipt and stored projection. Any changed
proof, value, evidence, window, slice, metric, source, unit, cohort context, or
hash holds without mutation. Transaction failure, uniqueness conflict,
creation-attestation failure, readback mismatch, or database unavailability
holds with no orphan row.

### Bounded receipt and internal readback

The receipt contains only policy version, opaque release ID, proof journal ID,
reservation key, content fingerprint, projection hash, and fixed false
authorization flags. It contains no values, cohort sizes, evidence IDs, claim
text, model state, or economic interpretation.

The internal readback accepts exactly one receipt plus one expected exact
slice. It first acquires the family lock derived only from that expected slice.
It then performs a non-authorizing discovery read of the receipt-named
immutable C.1 row and referenced immutable C.0 proof journal to obtain only the
stored producer key/version needed for the next lock. No projection, value, or
authority result may be returned from this discovery read. It acquires that
producer lock second, then reloads and compares the complete C.1 row, C.0 proof
journal, shared reservation owner/reference/content, receipt fields, expected
slice, and current append-only revocation state after both locks are held.
Missing or mismatched discovery data holds. This two-phase shape preserves
canonical family-then-producer ordering even though the receipt and expected
slice do not carry the producer key. Only the final locked reload may return
the stored atomic projection.

Before any initial, replay, or readback return, the repository selects the
stored row's bound key ID from the complete locked reload, resolves that exact
retained secret from validated runtime configuration, presents both
transaction-locally, and asks the database verifier to recompute the release
HMAC. The HMAC is verified only after canonical locks and complete chain
reload. A self-consistent row without this non-forgeable creation fact remains
`HOLD`.

Readback does not rerun proof signature or freshness after release: ordinary
expiry does not erase the durable privacy decision made while all mutable
authority was current. A later authority revocation does fail closed for future
readback without mutating the prior row. A structurally valid or
caller-supplied receipt without the exact journal chain and current
non-revocation state cannot authorize anything.

C.1 exposes no list, query, or multi-receipt readback. Uniqueness permits one
C.1 row per organization plus C.0 proof journal and per organization plus
shared reservation. The shared reservation prevents alternate metric, window,
source, or retry paths from releasing again within the exact slice. C.1 does
not claim that populations in different slices are disjoint and cannot prevent
a privileged internal consumer from making sequential valid single-slice
readbacks. Such readbacks remain non-authorizing. C.1 provides no batch or
composition authority; Slice D and every later consumer must accept one exact
slice per decision and remain prohibited from cross-slice aggregation.

## Migration Plan

Add one create-only comparison release table and three protected versioned key
journals plus checks, append-only guards, RLS, exact role policies/ACLs, and
revoked `PUBLIC`, `anon`, and `authenticated` access. Preserve historical RLS
on Outcome Evidence and AI Value and add only the exact C.1 runtime policies
needed for direct reads and AI Value row locking. Require `pgcrypto`. Add
the Outcome Evidence family-lock trigger, release `BEFORE INSERT`
guard/verifier, and identical bindings in the post-push companion and database
readiness. Add a separate direct-login provisioner role/bootstrap and
idempotent provision/activate/revoke commands; do not create credentials,
provision or revoke a live key, apply the
migration live, or deploy in this slice. Without a provisioned non-revoked
active key, matching retained secrets, current C.0 authority, and valid
committed C.1 row, every commit and readback remains held.
The real-role PostgreSQL proof must also show direct journal reads remain
denied while bounded readiness succeeds, owner/provisioner `SET ROLE` cannot
masquerade as the direct runtime login, simultaneous old/new runtime
configurations admit only the greatest activation, and creation under one
non-UTC `TimeZone` verifies under another.
