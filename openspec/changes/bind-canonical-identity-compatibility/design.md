## Context

Slice B established server-owned exact-slice Outcome Evidence admission. Slice
C.1 binds one atomic two-window comparison projection to that exact slice.
Slice D revalidates those authorities, derives one fixed
`OBSERVED_NON_ATTRIBUTABLE` movement, and stores a content-addressed claim,
packet, and manifest. Slice D intentionally stores commitments instead of raw
slice and source identifiers, and explicitly leaves canonical identity to
Slice E.

The repository already persists Value Hypothesis, Measurement Plan, and
Measurement Cell Snapshot records append-only by `(org, stable id, version)`.
A Measurement Cell carries the selected value hypothesis ref, metric
definition ref/hash, workflow, aggregate cohort, approved Blueprint path, and
baseline/comparison windows. It does not currently bind the full canonical
`(workflow_id, jbtd_id, persona_id)` tuple used by Outcome Evidence.

The current HTML route sets `x-ai-value-source-bound: true` whenever the Slice
D bundle revalidates. That proves evidence and claim authority, but not the
complete Discovery-to-readout identity chain required by Slice E.

## Goals

- Bind one approved Discovery hypothesis and one exact measurement version to
  the exact evidence and readout produced by Slice D.
- Make identity content-addressed, append-only, version-exact, tenant-exact,
  and fail-closed across every compatibility edge.
- Reject stale, foreign, mutable, ambiguous, forked, downgraded, or
  cross-spliced lineage.
- Preserve existing consumers additively while removing source-bound or
  canonical authority from mutable and unbound selectors.
- Store no user-identifiable or raw event content in the binding.

## Non-Goals

- Slice F read-only claim trace or any new trace endpoint.
- Replacing the existing Value Hypothesis, Measurement Plan, Measurement Cell,
  C.1, or Slice D stores.
- A new universal metric taxonomy, hypothesis taxonomy, canonical event,
  suppression reason, threshold, override, score, or ranking.
- Customer-facing output, model execution, ROI, causality, attribution,
  productivity, prediction, or production migration application.

## Decisions

### Exact approved measurement-side slice

An E-capable Value Hypothesis version requires a server-owned
`canonical_value_hypothesis_creation_attestation_v1` in its stored validation
envelope. Inside the trusted hypothesis append transaction, the service
allocates the exact internal row key, takes the hypothesis family advisory
lock, validates the complete authority-bearing semantic projection and
approval/status, and computes
`FT_CANONICAL_VALUE_HYPOTHESIS_CREATION_ATTESTATION_V1`. The preimage binds
the authenticated organization, exact internal row key, stable hypothesis ID,
version, strict semantic commitment, approval/status, and either the fixed V1
root marker or the exact predecessor internal row key, stable ID, version,
semantic commitment, and verified creation-attestation commitment. Only the
key ID and MAC are stored with the record. Existing unattested hypotheses
remain valid for existing consumers but `UNBOUND`.

The Measurement Plan contract gains an optional
`canonical_slice_binding_v1`. Existing plans without it remain valid for
existing planning consumers, but cannot enter Slice E.

An E-capable plan also requires a server-owned
`canonical_hypothesis_edge_v1` in its stored validation envelope. The plan
append path loads the exact same-organization Value Hypothesis version,
computes its strict semantic commitment, and stamps the stable hypothesis ID,
exact version, and commitment while it holds the hypothesis source-family
lock. It then computes
`FT_CANONICAL_HYPOTHESIS_EDGE_ATTESTATION_V1` with the Slice E service key
over the authenticated organization, plan identity/version and strict
authority-bearing semantic projection, exact plan internal row key, exact
parent internal row key/identity/version/commitment, the verified hypothesis
creation-attestation commitment, approval state, exact slice binding, and
canonical metric identity. Only the key ID and MAC are stored beside the edge.
The hypothesis creation attestation must verify before the plan edge is
signed. Caller payload bytes and a direct database writer without the key
cannot supply or replace a valid edge.

For Slice E the binding is required on the exact selected Measurement Plan
version and contains:

- domain-separated commitments for the exact `workflow_id`, `jbtd_id`, and
  `persona_id`;
- exact baseline and comparison window boundaries;
- exact metric ID, version-bearing metric-definition ref, separate canonical
  metric-definition commitment, outcome source system, measurement unit, and
  approved direction;
- the approved aggregate grain;
- fixed `aggregate_only: true`;
- approval timestamp, one compiled non-personal approver-role code, and its
  domain-separated commitment; and
- a domain-separated slice commitment derived from the complete tuple, the
  authenticated organization, and the exact plan version.

All four bound window values use one canonical UTC millisecond representation
(`YYYY-MM-DDTHH:mm:ss.sssZ`) before commitment or persistence. The containing
plan's stable Value Hypothesis ID and persistence version must exactly equal
the nested hypothesis ID and bound `plan_version`; caller metadata cannot
silently select a different durable parent or version.

The raw tuple does not enter the E-capable Measurement Plan binding. The
server recomputes domain-separated workflow, JBTD, and persona commitments
from the authoritative aggregate slice before granting authority. The
reserved canonical binding artifact stores only the complete tuple
commitment. Email-like, person-shaped, raw user, or otherwise unsafe
identifiers remain rejected.

An E-capable Measurement Cell Snapshot requires a server-owned
`canonical_measurement_lineage_v1` in its stored validation envelope. The
cell append path loads and locks the exact same-organization plan and
hypothesis and stamps their stable IDs, exact versions, strict semantic
commitments, and the plan's approved aggregate grain. Caller payload bytes
cannot supply or replace this edge. It then computes
`FT_CANONICAL_MEASUREMENT_LINEAGE_ATTESTATION_V1` over the authenticated
organization, cell identity/version and strict authority-bearing semantic
projection, exact cell internal row key, exact plan and hypothesis internal
row keys/identities/versions/commitments, the verified hypothesis and plan-edge
attestation commitments, approved aggregate grain, approval state,
slice/window state, and canonical metric identity. Only the key ID and MAC are
stored beside the edge. The cell's plan and hypothesis commitments must
exact-match the plan's source-owned hypothesis edge, and the hypothesis plus
both source-edge MACs must verify before any source enters Slice E authority.

Each source-attestation semantic projection includes every authority-bearing
byte and exact internal row key but excludes only its own attestation key ID
and MAC, making the construction non-circular. Copying an attestation after a
delete/reinsert under a new internal row key therefore fails even when stable
IDs, versions, and payload bytes match.

The selected Measurement Cell Snapshot must be an exact explicit version,
have no superseding child, and agree with those stored parent edges and the
plan on hypothesis ref, workflow, metric, unit, direction, aggregate grain,
and both windows. Its Blueprint and metric-owner approval states must be
`approved`, both stored validation results must be valid, and its metric
definition ref must be version-bearing.

The Measurement Cell's `aggregate_source_system` names the governed aggregate
pipeline boundary and must be `bigquery_export` or `sigma_export`. It is
separate from the plan/metric/C.1 outcome source system and must not be
compared to customer source names such as `customer_crm`.

The authoritative D metrics-library entry for the selected metric gains
an optional additive `metric_definition_ref` and separately named
`canonical_metric_definition_commitment_v1`. They remain optional for
existing D consumers but are required for Slice E. The legacy Measurement
Cell `metric_definition_hash` retains its existing projection and meaning; it
is never reinterpreted as Slice E authority.

For a bound path, exactly one metrics-library entry may match the metric ID and
version-bearing definition ref. The server recomputes
`FT_CANONICAL_METRIC_DEFINITION_V1` over the metric ID, definition ref,
definition, governed source-system projection, measurement unit, direction,
approved aggregate grain, allowed claim ceiling, and required blocked claims.
The resulting commitment must exact-match the separate E commitment stored by
the plan and Measurement Cell as well as the authoritative D source graph.
Zero or multiple matches hold. A schema-valid metric ID, caller-provided hash,
or the legacy cell hash never establishes definition identity.

### Exact source versions, never latest authority

The caller may supply only this additive equality-selector object:

```text
canonical_identity_selector:
  value_hypothesis_id
  value_hypothesis_version
  measurement_plan_id
  measurement_plan_version
  measurement_cell_id
  measurement_cell_version
```

Each version is mandatory when the selector is present. The server loads every
record under the authenticated organization, verifies the exact immutable
version and same-row supersession chain, requires that no later record
supersedes the selected row, and exact-compares the selector to the
source-owned plan and cell parent edges. Missing, zero, multiple, forked,
skipped, cross-organization, no-longer-current, or compatible-looking but
historically unrelated records hold.

The IDs never enter a reserved claim or binding payload as raw text. The
server locks the selected rows by their internal database row keys and binds
their strict semantic hashes. A selector chooses no semantics and confers no
authority.

### Durable monotonic family-head authority

Valid HMACs on remaining rows cannot prove that a newer legitimate tail was
not deleted. Slice E therefore adds one internal append-only PostgreSQL table,
`ai_value_canonical_identity_family_head_journal`, through an additive
migration artifact. It records, for each hypothesis, plan, and Measurement
Cell family:

- fixed source-family kind;
- organization and stable source ID in the private database boundary;
- exact monotonically increasing version;
- exact internal source row key and predecessor row key;
- source semantic and verified source-attestation commitments; and
- server timestamp.

There is no mutable head pointer. The highest journaled version is the durable
head. A fixed-security-definer insert-trigger function with pinned
`search_path` runs on every source-table insert. It takes the same
source-family transaction advisory lock, loads the journal tail, requires V1
to have the fixed root/no-predecessor shape, or requires every later insert to
be exactly `tail.version + 1` and to supersede the exact tail row key, then
appends the new journal entry in the same transaction. Gap, fork,
wrong-predecessor, duplicate-row, or non-monotonic insert fails.

The migration takes write-conflicting table locks on all three canonical
source tables before historical validation or backfill and holds them through
append-trigger installation and commit. It then deterministically backfills
all existing source families in version order before enabling enforcement and
fails rather than silently accepting any historical gap, fork, duplicate, or
wrong predecessor. Existing rows without Slice E HMAC attestations can be
journaled for append-only continuity and remain valid for existing consumers,
but they stay `UNBOUND`.

Fixed BEFORE UPDATE OR DELETE guards reject mutation of all three source
tables and the journal. Runtime roles retain only their exact existing source
SELECT/INSERT posture needed by append paths; they receive no direct journal
INSERT, UPDATE, DELETE, TRUNCATE, trigger-management, function-ownership,
table-ownership, `BYPASSRLS`, superuser, or role-escalation authority. The
trigger owner is a non-login owner role, and the trigger function is the only
journal writer. Structural readiness and the PostgreSQL verifier exact-check
these owners, ACLs, function definitions, triggers, constraints, and absence
of privilege drift.

All Slice E source reads, writes, and family locks use the dedicated
`fluencytracr_slice_e_runtime` login configured by
`SLICE_E_RUNTIME_DATABASE_URL`. Runtime readiness proves that this connection
targets the same PostgreSQL server and database as the primary application
connection, then runs family-head structural readiness on that runtime target.
A missing URL, different database identity, different login, elevated login,
invalid active HMAC write key, or invalid retained-read-key configuration
fails health/readiness and Slice E authority closed. The source-family runtime
transaction holds its locks across the separate atomic four-artifact D/E seal,
preserving the historical C.1 RLS posture on `ai_value_objects`.

E sealing and every readout must lock and exact-match the selected source row,
version, predecessor, semantic commitment, and verified source-attestation
commitment to the durable journal head. Deleting or rewriting a legitimate
tail therefore fails at the database guard, and an unattested direct insert
can only advance the durable head into a fail-closed `UNBOUND` state; it
cannot resurrect or authorize an older version. Database owner/superuser or
physical-storage compromise remains outside the modeled runtime-writer
boundary.

On PostgreSQL 17 the non-superuser migration owner may retain only the
unavoidable admin-only creator membership for each Slice E role, with
`inherit_option = false` and `set_option = false`. The database owner cannot
assume those roles or alter the owner-transferred source/journal objects; any
broader membership or privilege remains fail-closed drift.

### Canonical identity core

After the existing D source graph and C.1 comparison pass, the server builds
`FT_CANONICAL_IDENTITY_CORE_V1`. Its ordered commitments bind:

1. authenticated organization;
2. exact Value Hypothesis row key, version, semantic hash, and verified
   creation-attestation commitment;
3. exact Measurement Plan row key, version, and semantic hash;
4. exact Measurement Cell Snapshot row key, version, and semantic hash;
5. domain-separated commitments to the verified plan and cell source-edge
   attestations;
6. version-bearing metric definition ref and
   `canonical_metric_definition_commitment_v1`;
7. the plan's canonical exact-slice commitment;
8. exact baseline/comparison window commitment;
9. Slice D source-graph, accepted-export, review, admission, C.1 receipt, and
   complete-projection commitments;
10. fixed claim policy and template versions; and
11. fixed canonical readout renderer schema/template/projection version.

The server exact-compares every shared field before building the core:

- hypothesis record to the plan's server-stamped exact parent edge;
- plan and hypothesis records to the cell's server-stamped exact parent edges;
- plan and cell to the D authoritative source graph;
- plan slice commitment to the server-derived D exact slice;
- canonical metric-definition commitment, source, unit, direction, aggregate
  grain, and windows to the complete C.1 projection and accepted export.

No alias, normalization, compatible-looking value, mutable source ref, or
caller-provided hash may close a mismatch. Direction may be omitted only where
the existing D template already permits omission; when present it must match
the approved Measurement Cell direction exactly.

### D artifact integration without circular identity

The canonical core commitment is an optional additive field in the Slice D
claim, packet, manifest core, and authorized response schemas. When the
selector is absent, existing Slice D authorization may still produce its
existing internal descriptive result, but `canonical_identity_state` is
`UNBOUND` and no source-bound/canonical label is authorized.

When the selector is present:

1. the complete canonical core is built before D artifact IDs;
2. the fixed `FT_CANONICAL_READOUT_RENDERER_V1`
   schema/template/projection version is already inside that core;
3. the core commitment enters the D claim, packet, and manifest core;
4. D claim, packet, and manifest hashes and IDs therefore change with any
   identity-chain byte;
5. after the final D IDs exist, the fixed
   `FT_CANONICAL_READOUT_RENDERER_V1` builds the exact UTF-8 HTML response body
   without a binding ID, request-local data, or authority headers;
6. a final `FT_CANONICAL_IDENTITY_BINDING_V1` is built from the core, the
   final D claim, packet, and manifest IDs/content hashes, and
   `FT_CANONICAL_READOUT_BYTES_V1(exact_html_bytes)`; and
7. the binding ID is derived from the final packet ID under a separate fixed
   domain, so readout can resolve it without a caller-supplied binding key.

The final binding is a fourth reserved internal `ai_value_objects` type. It is
excluded from generic create, read, list, and upsert paths. Its public-safe
payload contains commitments, versions, policy/schema identifiers, state, and
D artifact hashes only. Exact internal source-row locators may exist only in
the reserved validation envelope for current server readback; they are never
returned, rendered, or exposed through Slice F by implication.

One packet can have only one binding. An exact replay returns the existing
bytes. Different bytes at the deterministic ID hold and are never overwritten.
A corrected hypothesis, plan, cell, metric definition, slice, evidence pair,
readout projection, renderer version, or rendered body requires a new
authorization bundle and binding; it cannot rewrite the old chain. A renderer
correction therefore requires a new renderer version, which changes the core,
D IDs, packet, and binding ID. Same-version byte drift, unknown renderer
versions, or byte mismatches hold.

### Non-forgeable source-edge and bundle creation authority

Generic API isolation and deterministic hashes do not prove which principal
created otherwise valid source records, source edges, or reserved rows. Slice
E therefore uses one Slice-E-specific service-held key family with separate
domain strings for Value Hypothesis creation, the plan edge, Measurement Cell
edge, and four-artifact bundle. Source attestations are created inside their
trusted append transactions and must verify before their committed envelopes
enter the canonical core. Existing unattested hypothesis/plan/cell records
remain valid for existing consumers but `UNBOUND`.

After the claim, packet, manifest, and final binding bytes are complete, the
service computes `FT_CANONICAL_ARTIFACT_CREATION_ATTESTATION_V1` over the
authenticated organization commitment, binding ID, canonical core commitment,
and complete attestable semantic hashes of all four reserved artifacts. The
binding's attestable projection includes every authority-bearing binding
content byte but excludes the private creation-attestation key ID and MAC, so
the construction is non-circular. The private binding validation envelope
stores only the attestation key ID and MAC.
Secrets remain outside PostgreSQL and source control. Application
configuration provides exactly one active-write key and may retain explicitly
identified read keys for earlier exact bundles. Missing, unknown, ambiguous,
or invalid key state holds for both source edges and bundles.

The hypothesis creation and source-edge MACs are verified before compatibility
authority, then their committed envelopes are bound into the plan edge and
core. The bundle MAC is verified only after the service has rebuilt the
complete current source/C.1/D/E chain and exact artifact bytes. Copying any
source or bundle attestation to another organization, internal row, child,
parent, version, binding, packet, or changed projection fails; exact-byte
replay may pass. These attestations are independent of C.1: Slice E does not
read, write, reuse, extend, or change the C.1 key registry, activation or
revocation journals, provisioner, functions, roles, or migration.

### Serializable lock and staged revalidation

The existing Slice D staged sandwich remains:

1. load and validate the exact hypothesis, plan, cell, D source graph, and C.1
   comparison;
2. perform the pre-seal C.1 readback;
3. enter one `SERIALIZABLE` general-store transaction;
4. take deterministic transaction advisory locks for each selected
   `(organization, source family, stable source id)` in hypothesis, plan, then
   Measurement Cell order;
5. lock each exact durable family-head journal row, then the exact hypothesis,
   plan, Measurement Cell, D source rows, and any current superseding rows in
   deterministic table/key order;
6. reload and exact-hash every source and re-check that no selected version is
   stale, forked, different from its durable family head, inconsistent with
   its server-stamped parent edges, or protected by an invalid
   hypothesis/source-edge attestation;
7. build the final rendered-body hash and Slice E creation attestation, then
   atomically insert-or-exact-compare the D claim, packet, manifest, and final
   canonical binding;
8. commit;
9. repeat current C.1 readback; and
10. reload every source and all four artifacts, rebuild the complete identity
    core, D bundle, rendered bytes, and creation attestation, and exact-compare
    before returning bound authority.

No C.1 and general-store transactions overlap. Serialization failure,
mutation, new supersession, binding conflict, missing row, or any changed
commitment holds. Already inserted content-addressed rows remain
non-renderable as canonical without a later successful full readback.

The hypothesis, plan, and Measurement Cell append writers take the identical
source-family advisory lock before checking currentness and inserting a child.
Their source-table insert triggers take that same lock and atomically advance
the durable journal. This serializes an absent future child with E sealing;
row locks and `SERIALIZABLE` isolation alone are insufficient to lock that
absent supersession predicate. Tests cover a child or fork queued before and
during sealing and both possible commit orders.

### Readout and compatibility semantics

Current readout first performs all Slice D checks. It sets
`x-ai-value-source-bound: true` and
`x-ai-value-canonical-identity-bound: true` only after it resolves the
deterministic binding, reloads the exact source rows, confirms none is stale,
exact-matches all three durable family heads, verifies the hypothesis creation
and both source-edge attestations, rebuilds the canonical core and D bundle,
verifies the Slice E bundle creation attestation, rebuilds the declared
renderer version and exact UTF-8 body, and exact-compares all four reserved
artifacts and the rendered-body hash. The route returns those exact rebuilt
bytes; no independently generated body may receive bound headers.

A valid Slice D bundle without a Slice E binding may retain the existing
internal descriptive rendering for additive compatibility, but both headers
are `false` and the HTML must not call it source-bound or canonical. Legacy
mutable `measurement_plan_id`, object IDs, latest-version queries, packet IDs,
or direct object validity remain lookup/filter compatibility only.

If a request supplies `canonical_identity_selector` and any binding check
fails, the request returns the existing fixed redacted D hold. It must not
silently downgrade to an unbound authorization result. Existing callers that
omit the selector remain on the explicit `UNBOUND` compatibility path.

This Slice E meaning of canonical identity applies to the MCII
Discovery-to-claim/readout journey. It does not silently redefine unrelated
docs-only contracts that use “source-bound” for a narrower internal posture.

### Privacy and failure posture

The public-safe binding payload contains no raw events, member tokens, user
IDs, emails, names, prompts, responses, transcripts, source payloads,
arbitrary prose, attestation MAC, key ID, or customer-facing content. It
stores only aggregate-safe version numbers, fixed-schema states,
domain-separated commitments, renderer version, rendered-body hash, and
artifact hashes. The key ID and MAC exist only in the private validation
envelope.

Every external failure returns the existing fixed D hold without source
selectors, row locators, commitments, hashes, competing candidates, or
diagnostics. Stored raw aggregate slice keys remain only in their governed
source records; reserved artifacts contain commitments.

## Attack-to-oracle matrix

| Attack | Required oracle |
| --- | --- |
| Omit versions and rely on latest | Fixed hold; no latest lookup becomes authority |
| Select another organization's row | Fixed hold indistinguishable from missing |
| Bind old hypothesis/plan/cell after a new superseding row | Fixed hold before and after persistence |
| Fork or skip the supersession chain | Fixed hold |
| Queue a child/fork while E seals the current parent | Shared family lock serializes both commit orders; stale or forked result holds |
| Directly insert, copy, or reinsert an approved-looking hypothesis | Domain-bound hypothesis creation MAC or internal-row-key match fails |
| Delete a newer legitimately attested source tail | Source/journal mutation guard rejects; durable head cannot roll back |
| Insert a gap, fork, or wrong predecessor through direct SQL | Source insert trigger rejects before journal advancement |
| Directly advance a family with an unattested row | Durable head advances but E holds; no older source can resurrect |
| Pair a plan with another compatible hypothesis version | Server-stamped hypothesis version/commitment mismatch and fixed hold |
| Pair a cell with another compatible plan version | Server-stamped plan version/commitment mismatch and fixed hold |
| Directly insert or copy a consistent plan/cell parent edge | Domain-bound source-edge MAC verification fails |
| Pair a cell with another metric definition, unit, direction, grain, workflow, or window | Canonical metric/source-edge mismatch and fixed hold |
| Pair another JBTD/persona slice with compatible workflow/metric/windows | Plan slice commitment mismatch and fixed hold |
| Swap accepted export, C.1 receipt/projection, D manifest, packet, or claim | Full rebuild mismatch and fixed hold |
| Mutate a selected row between load, lock, commit, or readout | Serialization/reconciliation hold |
| Submit an invalid selector and depend on unbound fallback | Fixed hold, never downgrade |
| Rebind one packet to different source versions | Deterministic-ID conflict and fixed hold |
| Coherently rehash all four reserved artifacts | Current source and C.1 rebuild mismatch and fixed hold |
| Directly insert source-consistent reserved artifacts | Slice E creation-attestation verification fails |
| Copy a valid attestation to another org/packet/binding | Domain-bound MAC verification fails |
| Change renderer code or returned HTML bytes | Renderer version or exact rendered-body hash mismatch and fixed hold |
| Read/list/write the reserved binding through generic APIs | Not found, empty list, or rejected write |
| Guess another tenant's packet/binding | Fixed held readout with no distinguishing data |

## Implementation map

- `shared/src/aiValueEngine/measurementPlan.ts`: additive exact-slice binding
  schema and validation without reinterpreting caller fields as parent
  authority.
- `shared/src/aiValueEngine/metrics.ts`: additive version-bearing definition
  ref and separate canonical metric commitment validation for E-bound
  metrics-library entries.
- `shared/src/aiValueEngine/canonicalIdentityBinding.ts`: strict contracts,
  source-edge projections, canonical hashing, renderer/body commitments,
  core/binding builders, deterministic IDs, and complete reconciliation.
- `shared/src/aiValueEngine/aggregateClaimAuthorization.ts`: optional core
  commitment in D artifacts and bundle rebuild.
- `shared/src/aiValueEngine/index.ts`: exports.
- `backend/src/repositories/ai-value-minimal-persistence.repository.ts`:
  Value Hypothesis creation attestation, source-owned E edge stamping,
  exact-version loaders, semantic projections, domain-separated source
  attestations, family advisory locks, durable-head readback, supersession
  validation, and transaction record access.
- `backend/prisma/migrations/<slice-e-family-head>/migration.sql` and
  `backend/src/canonical-identity-family-head-structure.ts`: one internal
  append-only head journal, deterministic backfill, source/journal mutation
  guards, insert triggers, fixed owners/ACLs, and structural readiness.
- `backend/src/repositories/ai-value-object.repository.ts`: fourth reserved
  type, deterministic insert-or-exact persistence, private creation
  attestation envelope, and private binding readback.
- `backend/src/services/aggregate-claim-authorization.service.ts`: server-side
  compatibility resolution, Slice E creation attestation, full rebuild, and
  no-downgrade integration.
- `backend/src/ai_value_routes.ts`: additive selector validation, versioned
  deterministic rendering, and truthful source-bound/canonical headers.
- `schemas/ai-value/canonical-identity-binding.schema.json` and
  `docs/contracts/ai-value-canonical-identity-binding/README.md`: synchronized
  machine and human contracts.
- Focused shared/backend tests plus
  `scripts/verify_canonical_identity_binding_postgres.mjs`: fail-first and real
  PostgreSQL attack oracles.

One additive Slice E migration artifact is required for the durable family-head
journal, source-table append-only guards, insert triggers, owners, and ACLs.
It is applied only to disposable local/CI PostgreSQL for verification in this
slice. It is not applied to production, and this packet gives no deployment or
production migration authority. The migration does not modify C.1 tables,
keys, journals, provisioner, functions, roles, or privileges.
