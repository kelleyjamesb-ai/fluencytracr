# Outcome Comparison Atomic Privacy Release

Policy version: `FT_OUTCOME_COMPARISON_PRIVACY_POLICY_2026_07`

This internal C.1 contract stores one exact baseline/comparison Outcome
Evidence pair as a single atomic projection. The projection is available only
after the current signed C.0 handoff revalidates the server-owned evidence
family and its existing `OUTCOME_COMPARISON_PROOF` reservation. C.1 does not
create, adopt, replace, or mutate a reservation.

The projection binds the exact organization, workflow, JBTD, persona, metric,
source, unit, windows, opaque evidence IDs, cohort sizes, and aggregate values.
It contains no member data, contribution token, delta, percent change, claim
text, causal interpretation, ROI, productivity, prediction, ranking, or
publication state. The two component windows are never independently
queryable through this contract.

The bounded receipt contains only opaque release, proof-journal, reservation,
content-fingerprint, and projection-hash references. Its claim, model, and
publication flags are fixed false. A receipt is non-authorizing. It does not authorize claim language, model execution, publication, customer output, or
cross-slice composition.

Canonical projection and receipt bytes are schema-validated, canonical-JSON
encoded, length-framed, and domain-separated. Internal diagnostics are a
closed implementation vocabulary and are not part of any HTTP response or
customer contract.

The content fingerprint is computed from the domain-separated canonical bytes
of one strict `OutcomeComparisonContentCommitment`. That commitment binds the
complete `projection` plus `proof_journal_id`, `proof_hash`,
`admission_receipt_hash`, `baseline_evidence_hash`,
`comparison_evidence_hash`, and `reservation_key`. Changing any projection,
lineage, evidence-content, admission, proof, or reservation field changes the
commitment bytes. A caller-provided fingerprint is never authority.

The database independently constrains opaque evidence-ID shape and
distinctness, bounded nonempty metric, unit, and source strings, valid
per-window ordering, non-overlapping typed timestamps, finite aggregate
values, and fixed non-authority fields. The JSON schema additionally requires
canonical millisecond UTC instants by combining exact-length/pattern checks
with `date-time` format validation.

Those storage constraints are necessary but are not complete replay
validation. Standard JSON Schema cannot express cross-field date overlap, and
PostgreSQL/JSON equality cannot preserve a negative-zero JSON representation
as a distinct authority fact. Database constraints also cannot prove that
every typed scalar column equals its corresponding `projection_json` field or
that the stored projection hash and content fingerprint were recomputed from
the complete loaded row and lineage. Section 2 therefore must fully parse the
stored projection with `OutcomeComparisonProjectionSchema`, revalidate every
typed column against that parsed projection, recompute and compare the
projection hash, rebuild and compare the complete content commitment, and
reload and repeat those comparisons before any projection or receipt is
returned. Section 1 does not implement that authority or readback.

Schemas:

- [`outcome_comparison_projection.schema.json`](../../../schemas/outcome_comparison_projection.schema.json)
- [`outcome_comparison_privacy_receipt.schema.json`](../../../schemas/outcome_comparison_privacy_receipt.schema.json)

There is no public endpoint, list path, multi-receipt read, or cross-slice
composition authority. This slice adds code and an unapplied migration only.
It applies no migration, provisions no live authority, deploys nothing, and
provides no live proof.

Runtime creation and attestation readiness use a dedicated direct PostgreSQL
login configured by `C1_RUNTIME_DATABASE_URL`. The general application
`DATABASE_URL` remains separate because the least-privilege C.1 role has only
the exact C.0 handoff and C.1 transaction permissions. Runtime key material is
configured by `C1_CREATION_ATTESTATION_ACTIVE_KEY_ID` and
`C1_CREATION_ATTESTATION_KEYS_JSON`; the dedicated URL must authenticate
directly as `fluencytracr_c1_runtime`, never through `SET ROLE`.

The runtime can select the existing C.0 authority, revocation, reservation,
journal, Outcome Evidence, release-journal, and AI Value rows required by the
exact transaction. It has no access to aggregate privacy manifests or
contribution claims and cannot insert or delete any source row. Its only C.0
`UPDATE` capability is the producer-authority row lock required by
`SELECT ... FOR UPDATE`; RLS has a false write check and
append-only/runtime-mutation triggers reject a real update. The AI Value
`UPDATE` capability is likewise lock-only and guarded. Outcome Evidence and AI
Value retain their historical RLS posture. C.1 adds exact runtime-scoped
`SELECT` policies for both plus an AI Value `UPDATE` policy whose false write
check permits row locking but not a replacement row. Readiness pins those
policies and the verifier proves direct runtime reads and AI Value row locking
plus denied writes. C.0 provisioning and reservation/journal creation remain
owned by the C.0 service path, not the C.1 runtime.

Every repository commit, exact replay, and durable readback begins by calling
the bounded key-readiness function inside its transaction. Readiness, release
stamping, release verification, activation, and revocation all acquire
`FT_C1_ATTESTATION_PROVISIONING_V1` as a transaction advisory lock before key
state. A creation that queues behind a committed activation or revocation
therefore rechecks the new state and holds; a creation already holding the
lock completes before the later mutation, after which stale replay/readback
holds.

Database readiness separately attests exact `pgcrypto` membership, direct
login role attributes, and the absence of effective `CREATE` authority on the
`public` schema for both restricted roles. On PostgreSQL 17, readiness permits
only the database owner's unavoidable admin-only creator membership with
`admin_option = true`, `inherit_option = false`, and `set_option = false`;
every other restricted-role membership is drift. It also attests
attestation table
ownership/types/nullability/RLS, constraints and foreign keys, the complete
policy and ACL set, append-only and creation-stamp trigger bindings, and exact
codec/stamp/verifier/readiness signatures, bodies, owners, volatility,
security-definer posture, search paths, and execute ACLs. Any mismatch is
fail-closed independently of live key-value readiness.

Trigger attestation resolves each expected function to its public-schema
`regprocedure` OID, compares the trigger's `tgfoid`, requires an empty `tgattr`
so `UPDATE` cannot be narrowed to `UPDATE OF` selected columns, and rejects any
additional non-internal trigger on a governed table. This includes the Outcome
Evidence family-lock trigger, so a slice-identity update cannot bypass the
family lock and a later-sorting trigger cannot rewrite slice identity after
the governed family lock. Both the family-lock trigger function and its
four-field key codec are attested with exact signature, owner, language,
volatility, parallel, strict, security, search-path, body-hash, and owner-only
execute ACLs. The runtime lock-only function has the same exact posture;
`PUBLIC` cannot execute any of them. The `digest`
and `hmac` dependencies are pinned in the hosted `extensions` schema as the
exact `pgcrypto` C functions owned by the database owner, with their expected
binary/source metadata, extension dependency, attributes, and configuration.
`PUBLIC`, the C.1 runtime, and the Supabase API roles cannot execute them; the
existing platform `dashboard_user` grant is the only allowed non-owner ACL. A
same-named function in another schema, a no-op replacement body, an unexpected
trigger, family-lock/codec replacement, pgcrypto owner/body/ACL drift,
source-table RLS drift, or required or forbidden runtime ACL drift therefore
makes structural readiness false.
The provisioner has exactly `SELECT` and `INSERT` on the three key journals,
exactly `USAGE` and `SELECT` on the activation sequence, and no privilege on
any other public table or sequence. Any additional grant fails readiness.

Deployment key lifecycle is explicit and append-only:

1. Run `provision_outcome_comparison_attestation_key.mjs` with
   `C1_ATTESTATION_PROVISIONER_DATABASE_URL` authenticated directly as
   `fluencytracr_c1_attestation_provisioner`, one canonical key ID, and one
   32-byte base64url secret.
2. Deploy the retained runtime key map and dedicated runtime URL.
3. Run `activate_outcome_comparison_attestation_key.mjs` through that same
   direct provisioner URL for the new key.
4. Remove an old retained secret only after no valid release references it.
5. For compromise response, run
   `revoke_outcome_comparison_attestation_key.mjs` through that same direct
   provisioner URL; revocation is irreversible and every release bound to that
   key holds.

Provisioning is insert-or-exact-verify. It never updates, replaces, adopts, or
prints a secret. An inactive, unreferenced registered key may be staged before
its configuration is deployed without making existing instances unready;
readiness still requires every configured key and every non-revoked
release-referenced key to have a valid retained secret. Activation is
serialized and greatest-epoch authoritative.
Revocation never falls back to an earlier activation.
All three lifecycle commands require both `session_user` and `current_user`
to equal the direct provisioner login and never use `SET ROLE`.
