## Context

Slice B established server-owned exact-slice Outcome Evidence admission.
Slice C.0 established the trusted equality proof and shared privacy
reservation. Slice C.1 now stores and revalidates one immutable, atomic
baseline/comparison projection for the exact organization, workflow, JBTD,
persona, metric, source, unit, windows, evidence IDs, cohort sizes, and
aggregate values. Its receipt exposes a content fingerprint that commits the
hidden proof, admission, evidence-hash, reservation, and projection lineage.

The current AI Value engine still treats a valid readiness object as
sufficient to build a claim boundary and executive packet. The generic object
API accepts schema-valid claim boundaries and packets, and the legacy HTML
readout checks their shape and selected source references without an
independent claim-authorization manifest.

Slice D must not merge adjacent decisions. Import/schema approval, accepted
review, exact-slice admission, C.1 comparison privacy, readiness, model
eligibility, and claim authorization remain separately observable policy
states. Claim authorization is an additional server-owned decision.

## Resolved prerequisite and retained boundary

C.0 PR #457 and C.1 PR #458 are merged on `main`. C.1 bounded readback accepts
one strict receipt plus one expected exact slice, reloads immutable server
state, revalidates current revocation and attestation posture, and returns
either the complete stored atomic projection or `HOLD`.

This resolves the earlier missing two-window privacy input, but does not
authorize a claim. The receipt contains no values and confers no authority.
Slice D must derive the expected slice from authoritative stored
evidence/readiness, pass the receipt only as an opaque selector, and reconcile
the complete returned projection plus receipt commitments against the
accepted server-owned records before evaluating claim authorization. C.1 does
not expose its raw proof, admission, or evidence hashes.

## Goals

- Make one backend authority the only route to an authorized aggregate claim.
- Permit only deterministic descriptive metric movement under
  `OBSERVED_NON_ATTRIBUTABLE`.
- Bind the exact server-owned inputs, independent policy states, template,
  claim boundary, and executive packet immutably.
- Fail closed on missing, mutable, stale, ambiguous, substituted, or
  cross-slice references.
- Preserve compatible storage and calculation while removing their ability to
  authorize or render a claim.

## Non-Goals

- Slice E canonical identity compatibility binding or Slice F claim trace.
- Model execution or model-output authorization.
- Customer-facing or economic output, ROI, causality, attribution,
  productivity, prediction, scores, rankings, or individual data.
- New persistence tables, endpoints, canonical events, suppression reasons,
  or tunable thresholds.
- Applying the C.1 migration, deploying, publishing, or establishing live
  readiness.

## Decisions

### Independent policy state

The backend authority evaluates these states independently:

- `evidence_schema_state`
- `evidence_review_state`
- `evidence_admission_state`
- `comparison_privacy_state`
- `readiness_state`
- `model_eligibility_state`
- `claim_authorization_state`

No state aliases another. For the MCII descriptive template,
`model_eligibility_state` is `NOT_REQUESTED` and `model_use_authorized` is
`false`; model eligibility is not required and cannot strengthen the
descriptive claim.

Claim authorization returns `AUTHORIZED` only when:

1. the Outcome Evidence export is stored under the authenticated organization;
2. the export and stored readiness record carry matching authoritative
   exact-slice admission receipts;
3. the reviewed export is `ACCEPTED` and validates against the stored
   blueprint and metrics library;
4. the backend derives the export, readiness, blueprint, metrics-library, and
   scenario identities from the authoritative admitted export/readiness
   lineage, and derives the expected organization/workflow/JBTD/persona slice
   from those records, never from caller-selected identity fields;
5. one strict C.1 receipt is loaded through bounded C.1 readback for that
   expected slice and returns `ATOMIC_COMPARISON_PRIVACY_RELEASED`;
6. every returned C.1 projection field plus the receipt's revalidated
   `content_fingerprint` and `projection_hash` reconciles with the accepted
   export, authoritative admission, expected metric/source/unit, and approved
   baseline/comparison windows;
7. the derived readiness object validates and permits internal claim review;
8. exactly one movement is produced by the fixed template; and
9. the immutable manifest and produced artifacts are committed against one
   locked, serializable source snapshot and reconcile exactly.

Missing database, runtime, journal, attestation, or key state; any mismatch;
or any caller-supplied claim, expected slice, policy state, or manifest
authority returns `HOLD`.

### Server-owned source graph

The real-evidence materializer creates the authoritative source graph before
claim authorization. It persists the exact server-generated scenario before
persisting readiness. For the export, it canonicalizes a strict immutable
evidence-content projection that excludes only the independently governed
`review` envelope; every other export field, including admission, attestation,
windows, metrics, source system, organization, workflow, schema, and export
ID, remains hash-bound. It separately canonicalizes the blueprint, metrics
library, and generated scenario under their own domains, then records their
exact IDs and hashes plus the export evidence-content hash and composite
source-graph hash in readiness validation. Only that materializer may set the
`source_graph_authoritative: true` validation marker; a generic readiness PUT
cannot assert or preserve it.

The authoritative readiness record is then resolved from the exact admitted
Outcome Evidence chain. Its stored validation must bind the accepted export
ID, exact admission receipt, and complete materializer-created source-graph
seal. Its payload `source_refs` must identify the same one blueprint, metrics
library, and persisted generated scenario. Those lineage-selected and
hash-sealed records, rather than request-selected records, form the only
eligible source graph. The accepted export must validate against that exact
blueprint and metrics library, and the readiness source references, canonical
hashes, workflow family, metric identity, windows, and admission slice must
all reconcile.

The expected human transition from `SUBMITTED` to terminal `ACCEPTED` changes
only the independently governed review envelope and therefore does not
invalidate the materializer seal. Claim authorization still requires
`ACCEPTED` and binds both the exact current review envelope and the complete
accepted export payload hash in the authorization manifest. Any non-review
export mutation breaks the evidence-content seal; any later review or full
payload mutation breaks manifest/readout reconciliation.

Request object IDs are compatibility selectors only. When present, each must
equal its server-derived lineage reference. A missing, ambiguous, incompatible,
or conflicting lineage reference holds. A second schema-valid blueprint,
metrics library, scenario, or readiness object cannot substitute even when it
shares workflow, window, metric, source, or unit fields. Mutation of a sealed
object under the same ID also holds until a fresh server-owned
real-evidence-materialization pass creates a new exact seal.

### C.1 readback is the sole movement input

The C.1 receipt is schema-validated but remains a non-authorizing opaque
selector. Baseline/comparison values, cohort sizes, metric identity, unit,
source, evidence IDs, and windows come only from the successful C.1 readback
projection. The readback receipt supplies the revalidated
`content_fingerprint` and `projection_hash`; the content fingerprint commits
the hidden proof, admission, evidence-hash, reservation, and projection
lineage without disclosing their raw hashes. Slice D never accepts parallel
caller values, reconstructs the pair from separately queryable windows, loads
hidden C.1 lineage separately, or uses the older single-window Slice C release
as comparison authority.

The authority compares the complete C.1 projection with the accepted
server-owned export and admission records. One invocation authorizes exactly
one metric movement from exactly one C.1 receipt. A second movement, second
metric, second receipt, changed expected slice, alternate evidence pair,
changed window, changed metric/source/unit, or incomplete comparison holds
before template generation. Multi-metric authorization requires a future
separately governed contract and is outside Slice D.

### Bounded descriptive template

Template `FT_AGGREGATE_DESCRIPTIVE_CLAIM_V1` emits exactly one structured
movement, never caller-authored prose:

- metric identifier from the compiled server-owned Slice D vocabulary and
  measurement unit from the compiled generic Slice D vocabulary;
- baseline and comparison values copied from C.1 readback;
- absolute delta computed as `comparison - baseline`;
- mechanical percent change computed as
  `((comparison - baseline) / baseline) * 100` only when the baseline is
  non-zero and the result is finite;
- observed direction `INCREASE`, `DECREASE`, or `NO_CHANGE`;
- the separately declared approved metric direction, when present; and
- mandatory label `OBSERVED_NON_ATTRIBUTABLE`.

Arithmetic follows a fixed JavaScript binary64 evaluation order: subtract
comparison minus baseline first, then compute percent change only from that
normalized delta. Finite endpoints whose subtraction produces a non-finite
absolute delta hold before artifact generation. Percent change is included
only for a non-zero baseline and finite result. Baseline, comparison, delta,
and percent change normalize negative zero to positive zero before
canonicalization or hashing.

The template never describes a movement as improvement, impact, contribution,
or caused value. Every rendered movement carries fixed aggregate-observation,
non-attribution, non-causality, and internal-only caveats. There are no fields
for ROI, money, productivity, prediction, confidence/probability, individual
performance, ranking, customer-facing approval, or model output.
The synchronized JSON Schema is the normative enumeration for both compiled
movement vocabularies and the compiled server-owned source-system vocabulary.
Upstream storage, accepted review, and C.1 release do not add metric
identifiers, measurement units, or source labels to Slice D authority.
Every slice, source-graph, readiness, and C.1 evidence identifier is
independently revalidated by the Slice D aggregate-safe identifier boundary
before it can enter a reserved artifact.

### Internal artifact namespace and non-circular identity

Authorized artifacts use reserved internal object types for the claim,
one-movement packet, and authorization manifest. Those types are not accepted
by the generic object PUT route, are excluded from generic object listing and
generic object readback, and are accessible only to the Slice D authority and
its authorized HTML readout path. Existing public `claim_boundary` and
`executive_packet` types remain non-authoritative compatibility objects.

Identity derivation is deterministic and non-circular:

1. build strict claim and packet content without their envelope IDs;
2. compute domain-separated claim-content and packet-content hashes;
3. build the manifest core from every server-owned input, independent policy
   state, template identity, and both artifact content hashes;
4. hash the manifest core to derive the manifest ID; and
5. derive the internal claim and packet object IDs from that same manifest
   hash under separate domains.

The HTML packet identifier therefore resolves the manifest deterministically
without trusting a caller-provided lookup key. Reconciliation recomputes
artifact content hashes without their deterministic envelope IDs and then
checks every derived ID and byte sequence.

### Content-addressed immutable bundle and linearization

The backend canonicalizes strict JSON with sorted object keys, frames
hash-critical payloads by domain, and hashes with SHA-256. The manifest core
binds:

- authenticated organization and server-derived exact
  workflow/JBTD/persona identity;
- accepted Outcome Evidence export ID, payload hash, review state, and
  authoritative admission receipt;
- the exact returned C.1 receipt, including its proof-journal ID, reservation
  key, content fingerprint, and projection hash, plus the complete returned
  projection bytes;
- blueprint, metrics library, scenario, and readiness object IDs/hashes;
- the complete independent policy-state projection;
- template ID/version;
- claim-boundary content hash; and
- one-movement executive-packet content hash.

The authority uses a staged sandwich protocol because C.1 readback and the
general AI Value store use separate least-privilege clients:

1. load the initial authoritative AI Value records and verify the export's
   immutable evidence-content hash plus the exact blueprint, metrics-library,
   and scenario hashes against the materializer-created readiness seal;
2. perform initial and pre-seal C.1 readbacks without holding general-store
   row locks;
3. begin a `SERIALIZABLE` general-store transaction;
4. lock the admitted export, readiness, and every blueprint, metrics-library,
   and scenario row selected by the readiness lineage in deterministic
   `(object_type, object_id)` order with `FOR UPDATE`;
5. reload the exact source rows, recompute their canonical bytes and hashes,
   and hold if they differ from either the materializer-created seal or the
   pre-seal snapshot;
6. atomically insert the internal claim, packet, and manifest with
   `INSERT ... ON CONFLICT DO NOTHING`, then reload and compare their exact
   canonical bytes; no update or generic upsert is permitted;
7. commit, which is the general-source linearization point;
8. perform a post-commit C.1 readback; and
9. reload and reconcile the current general source rows plus all three
   internal artifacts before returning `AUTHORIZED`.

Any serialization failure, missing row, changed source, conflicting artifact,
C.1 mismatch, or post-commit reconciliation failure returns `HOLD`. Inserted
content-addressed rows remain non-renderable unless a later readout independently
passes current C.1 and exact source/artifact/manifest reconciliation. The
protocol never holds C.1 and general-store transactions at the same time,
avoiding a cross-client row-lock cycle.

The manifest ID is content-derived. Persistence is create-or-exact-replay only:
an existing ID with different bytes fails closed and is never overwritten. An
immutable manifest records a historical point-in-time authorization decision
but is never current rendering authority by itself.

### Authority routing and compatibility

- Pure engine builders remain calculation helpers and explicitly confer no
  authority.
- Generic `/spine/run` may return compatible upstream non-claim stages, but
  claim and executive stages are replaced with a fixed held state without
  generated claim objects or text and are never authoritatively persisted.
- Direct `claim_boundary` and `executive_packet` PUTs remain compatible
  storage/review inputs, but validation records
  `claim_authorization_authoritative: false`; they cannot render.
- Existing `/value-chain/run` is the only Slice D authorization route. It may
  accept one strict C.1 receipt as an opaque selector, reloads every other
  source record, derives the expected slice server-side, invokes C.1 readback,
  and derives the authorization decision.
- Authorized internal claim, one-movement packet, and manifest use
  manifest-derived IDs and are atomically persisted at the locked
  general-source linearization point.
- HTML readout reloads the internal manifest, recomputes packet and claim
  content hashes and derived IDs, reloads and hashes current authoritative
  source rows, revalidates exact stored policy bindings, and repeats current
  C.1 readback. A legacy/direct packet or any mismatch returns a fixed held
  response with no claim text.

Revocation or loss of C.1 readiness after historical authorization therefore
holds every later render. Persistence, a manifest, or an earlier successful
response cannot bypass current comparison-privacy readback.

### Failure posture

Public failures disclose only a stable held state/reason family. They do not
return hidden values, movements, claim or packet objects, manifest or content
hashes, privacy diagnostics, raw evidence, person-level fields, or
caller-controlled prose.

On any hold, including `persist: false`, `/value-chain/run` returns only the
fixed closed state, stable reason family, and empty persisted-object
projection; the ordinary `run` payload is absent. `/spine/run` may retain
upstream non-claim compatibility output, but replaces claim and executive
stages with the fixed held state and emits no claim object or prose. HTML
readout for legacy, direct, missing, or invalid packets returns only the fixed
held response and no claim text.

## Verification design

Fail-first coverage must prove:

- schema-valid direct claim/packet upload cannot render;
- accepted review without authoritative admission cannot authorize;
- authoritative admission without successful C.1 readback cannot authorize;
- a C.1 receipt alone, a successful readback for another exact slice, or
  readiness/model flags alone cannot authorize;
- a compatible-looking alternate blueprint, metrics library, scenario, or
  readiness object selected by the caller cannot replace the lineage-derived
  source graph;
- same-ID mutation of hash-sealed export evidence content, blueprint, metrics
  library, or scenario holds; review-envelope mutation is independently bound
  by policy state and the full accepted-export manifest hash; and a generic
  readiness write cannot forge the materializer-only authoritative
  source-graph marker;
- cross-slice, stale-window, changed-payload, alternate-pair, template-swap,
  manifest-replay, packet-substitution, and claim-substitution attempts hold;
- a second movement or metric holds, rather than sharing one C.1 projection;
- concurrent authoritative-source mutation cannot cross the locked
  serializable snapshot or post-commit reconciliation boundary;
- generic API calls cannot create, read, list, or overwrite reserved internal
  artifact types, and manifest-derived packet lookup is non-circular;
- finite endpoints whose subtraction overflows hold, a non-zero baseline with
  non-finite mechanical percent change omits that field, a zero baseline omits
  it, and negative zero normalizes before hashing;
- every held value-chain, spine, and HTML response omits movement, claim,
  packet, manifest, hash, and claim-text material, including `persist: false`;
- revocation or C.1 readiness loss after persistence prevents rendering;
- forbidden causal, attribution, ROI, productivity, prediction, model, or
  customer-facing fields and language fail validation; and
- one exact server-owned path emits only bounded
  `OBSERVED_NON_ATTRIBUTABLE` movement and renders only after manifest and C.1
  revalidation.
