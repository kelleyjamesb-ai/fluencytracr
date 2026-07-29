## ADDED Requirements

### Requirement: Exact append-only canonical identity chain

The system SHALL bind one exact approved Value Hypothesis version,
Measurement Plan version, Measurement Cell Snapshot version, metric-definition
ref/canonical commitment, canonical slice/windows, admitted evidence
projection, claim manifest, and deterministic rendered readout in one
server-owned append-only canonical identity chain.

#### Scenario: Complete canonical chain

- **WHEN** every exact source version is current, approved, unambiguous, and
  compatible with the authoritative D source graph and current C.1 projection
- **THEN** the system MAY build one domain-separated canonical identity core
- **AND** the produced D artifacts SHALL bind that core before their
  content-addressed IDs are derived
- **AND** one final packet-derived binding SHALL bind the exact produced
  claim, packet, manifest, and readout

#### Scenario: Incomplete identity chain

- **WHEN** any required hypothesis, plan, cell, metric, slice, window,
  admission, comparison, claim, or readout identity is absent
- **THEN** canonical identity authority SHALL hold
- **AND** no source-bound or canonical label SHALL be emitted

### Requirement: Approved exact-slice Measurement Plan binding

The system SHALL support an additive `canonical_slice_binding_v1` on an exact
Measurement Plan version. Slice E authority SHALL require that binding to be
approved, aggregate-only, and exact for organization, workflow, JBTD, persona,
baseline window, comparison window, metric ID, version-bearing definition
ref/hash, outcome source, unit, direction, aggregate grain, and plan version.
The E-capable binding SHALL retain only domain-separated commitments for the
workflow, JBTD, and persona join keys, and the server SHALL recompute them from
the authoritative aggregate slice before granting authority. It SHALL retain
the approving role only as a compiled non-personal role code plus its
separately domain-separated commitment. Arbitrary or person-shaped approving
roles and caller-supplied role commitments SHALL hold.
All four bound window values SHALL be canonical UTC millisecond timestamps
before commitment or persistence. The containing plan's Value Hypothesis ID
and persistence version SHALL exactly equal its nested hypothesis ID and
bound `plan_version`.

#### Scenario: Existing plan omits Slice E binding

- **WHEN** an existing valid Measurement Plan has no
  `canonical_slice_binding_v1`
- **THEN** existing planning consumers MAY continue to use it
- **BUT** it SHALL NOT establish Slice E canonical identity or source-bound
  readout authority

#### Scenario: Exact slice agrees

- **WHEN** the approved plan binding commitment exactly matches the
  server-derived Slice D organization/workflow/JBTD/persona tuple and both C.1
  windows
- **THEN** the exact-slice edge MAY enter the canonical identity core

#### Scenario: Compatible-looking cross-slice substitution

- **WHEN** workflow, metric, source, unit, or windows look compatible but JBTD,
  persona, aggregate grain, organization, or any exact boundary differs
- **THEN** the plan-to-evidence compatibility check SHALL hold
- **AND** the system SHALL NOT normalize, alias, or infer equality

#### Scenario: Noncanonical or cross-spliced plan authority

- **WHEN** a bound window uses a date-only, offset, or non-millisecond
  representation, or caller metadata names a different hypothesis ID or plan
  version
- **THEN** plan validation or persistence SHALL reject it before attestation
  or durable source creation

### Requirement: Exact Slice E runtime and cutover readiness

The system SHALL require the dedicated Slice E runtime connection to target
the same PostgreSQL server and database as the primary application connection.
Credential and family-head structural readiness SHALL run against that runtime
target, and health/readiness SHALL also require valid Slice E active-write and
retained-read HMAC configuration. First-install and post-push journal cutover
SHALL block writes to all three canonical source tables from before historical
validation and backfill through append-trigger installation and commit.
The Measurement Cell aggregate pipeline source SHALL be independently
restricted to `bigquery_export` or `sigma_export`; it SHALL NOT be equated
with the customer outcome source carried by the plan, metric definition, and
C.1 comparison.

#### Scenario: Runtime database or configuration drift

- **WHEN** the Slice E runtime targets a different server or database, lacks
  the exact restricted credential, has invalid HMAC configuration, or its
  family-head structure drifts
- **THEN** health/readiness and Slice E authority SHALL fail closed

#### Scenario: Concurrent source write during cutover

- **WHEN** a writer attempts to insert, update, or delete a canonical source
  while journal history is being validated, backfilled, and triggers installed
- **THEN** the cutover transaction SHALL hold a write-conflicting table lock
  until enforcement is installed and committed

### Requirement: Authenticated source creation and parent-version edges

The system SHALL HMAC-attest each new E-capable Value Hypothesis version in
its trusted append transaction and SHALL stamp parent-version authority when
each E-capable child is created. The hypothesis attestation SHALL bind the
authenticated organization, exact internal row key, stable ID/version, strict
authority-bearing semantic projection, approval/status, and the fixed root
marker or exact predecessor row key/identity/version/semantic and attestation
commitments. The Measurement Plan validation envelope SHALL bind the exact
same-organization hypothesis row/version, strict semantic commitment, and
verified creation-attestation commitment. The Measurement Cell validation
envelope SHALL bind the exact same-organization plan and hypothesis
rows/versions, their strict semantic and verified source-attestation
commitments, and the plan's approved aggregate grain.

Caller payloads and selectors SHALL NOT supply or replace these attestations
or edges. Each source attestation SHALL carry a domain-separated Slice E HMAC
over its organization, exact internal child/parent row keys, child
identity/version and authority-bearing semantic projection, exact parent
identities/versions/commitments, approval/slice/metric state, and required
grain. Its non-circular projection SHALL exclude only its own key ID and MAC.

#### Scenario: Exact authenticated hypothesis creation

- **WHEN** an E-capable Value Hypothesis version is appended through the
  trusted service
- **THEN** the service SHALL allocate and bind its exact internal row key while
  holding the hypothesis source-family lock
- **AND** it SHALL HMAC-attest the complete hypothesis authority projection
  plus its fixed root marker or exact verified predecessor lineage
- **AND** later plan append and Slice E authorization SHALL require that
  creation attestation to verify

#### Scenario: Exact recorded lineage

- **WHEN** an E-capable plan and cell are created from exact current parents
- **THEN** the server SHALL load the parents while holding their source-family
  locks
- **AND** it SHALL stamp their exact versions and server-computed semantic
  commitments into the child validation envelopes
- **AND** it SHALL HMAC-attest each child edge inside that trusted append
  transaction under its distinct Slice E domain
- **AND** later Slice E authority SHALL require those recorded edges to
  exact-match the selected rows and the hypothesis plus both child
  attestations to verify

#### Scenario: Compatible current parent substitution

- **WHEN** a later hypothesis or plan version has compatible shared fields but
  was not the parent stamped when the child was created
- **THEN** the source-owned version or semantic commitment SHALL mismatch
- **AND** canonical identity authority SHALL hold

#### Scenario: Legacy source has no Slice E attestation or edge

- **WHEN** an otherwise valid existing hypothesis, plan, or cell lacks its E
  attestation or parent edge
- **THEN** existing consumers MAY continue to use that record
- **BUT** it SHALL remain `UNBOUND` and SHALL NOT establish Slice E authority

#### Scenario: Direct writer forges or copies a source record or child edge

- **WHEN** a database writer inserts an internally consistent hypothesis,
  plan, or cell without the Slice E service key, or copies a valid attestation
  to another organization, internal row key, child, version, parent, approval,
  slice, grain, or metric projection
- **THEN** the source attestation SHALL fail
- **AND** the legitimate authorization service SHALL NOT bless that lineage
  with a final bundle attestation

### Requirement: Explicit versions and strict supersession

The system SHALL treat caller IDs and versions as equality selectors only.
Every selected hypothesis, plan, and cell version SHALL be explicit, same-org,
present exactly once, linked without a supersession gap or fork, and not
superseded at authorization or readout.

#### Scenario: Latest-only or omitted version

- **WHEN** a binding request omits a version or relies on a latest-record query
- **THEN** canonical identity authority SHALL hold
- **AND** latest selection SHALL NOT choose authoritative lineage

#### Scenario: Stale or forked version

- **WHEN** the selected row has a superseding child, a skipped predecessor, two
  children, a foreign predecessor, or a conflicting immutable identity
- **THEN** canonical identity authority SHALL hold
- **AND** the historical row SHALL remain unchanged

#### Scenario: New version appears after persistence

- **WHEN** a selected source is superseded after an earlier binding
- **THEN** current readout SHALL no longer call the old binding source-bound or
  canonical
- **AND** a new exact authorization bundle SHALL be required for the new chain

#### Scenario: Child append races with E sealing

- **WHEN** a hypothesis, plan, or cell child or fork is queued before or during
  E sealing
- **THEN** both the append writer and E sealer SHALL take the same
  deterministic transaction advisory lock for that organization and stable
  source family
- **AND** the resulting commit order SHALL either bind the still-current
  source or hold the now-stale or forked source
- **AND** an absent future child SHALL NOT escape serialization

### Requirement: Durable non-rollback family-head authority

The system SHALL maintain one internal append-only PostgreSQL family-head
journal for Value Hypothesis, Measurement Plan, and Measurement Cell source
families. A source-table insert trigger SHALL take the deterministic family
advisory lock and atomically journal each exact row/version/predecessor plus
its semantic and verified source-attestation commitments. The journal tail
SHALL be the only current-head authority used by append, E sealing, and
readout.

#### Scenario: Exact monotonic append

- **WHEN** a source family has no row
- **THEN** only exact V1 with the fixed root/no-predecessor shape MAY append
- **WHEN** a source family has a durable journal tail
- **THEN** only `tail.version + 1` that supersedes the exact tail internal row
  key MAY append
- **AND** the source row and journal entry SHALL commit atomically

#### Scenario: Gap, fork, or wrong predecessor

- **WHEN** a direct or service insert skips a version, reuses a version, forks
  from a non-head row, or names any predecessor other than the exact durable
  tail row
- **THEN** the source insert trigger SHALL reject the transaction
- **AND** the durable head SHALL remain unchanged

#### Scenario: Newest legitimate version is deleted or rewritten

- **WHEN** a runtime database writer attempts to update or delete a source row
  or any family-head journal entry
- **THEN** fixed database mutation guards SHALL reject the operation
- **AND** an older valid HMAC chain SHALL NOT reappear as current

#### Scenario: Direct writer appends an unattested tail

- **WHEN** a direct runtime writer appends a structurally monotonic but
  unauthenticated source row
- **THEN** its insert trigger MAY advance the durable head
- **BUT** Slice E source-attestation verification SHALL hold
- **AND** no older source or binding SHALL regain authority

#### Scenario: Durable head exact readback

- **WHEN** E seals or renders a binding
- **THEN** it SHALL lock or reload the journal tail for each selected source
  family
- **AND** exact row key, version, predecessor, semantic commitment, and
  verified source-attestation commitment SHALL match the selected source
- **AND** any absence or mismatch SHALL hold

#### Scenario: Family-head privilege drift

- **WHEN** a runtime role can directly write, update, delete, truncate, own,
  disable triggers on, bypass RLS for, or escalate into ownership of the
  journal, source guards, or trigger function
- **THEN** structural readiness and PostgreSQL verification SHALL fail
- **AND** Slice E authority SHALL remain unavailable

#### Scenario: PostgreSQL 17 creator membership

- **WHEN** the non-superuser database owner creates the Slice E owner or
  runtime role
- **THEN** readiness MAY allow only that database owner's unavoidable
  admin-only membership with both `inherit_option` and `set_option` false
- **AND** the database owner SHALL NOT be able to assume either role
- **AND** every broader membership or owner-object privilege SHALL fail closed

#### Scenario: Elevated or missing Slice E runtime credential

- **WHEN** `SLICE_E_RUNTIME_DATABASE_URL` is missing
- **OR** its authenticated `session_user` and effective `current_user` are not
  both the exact `fluencytracr_slice_e_runtime` login
- **OR** that login is superuser, bypass-RLS, role-creating, or
  database-creating
- **THEN** Slice E source creation, loading, sealing, and readout authority
  SHALL remain unavailable
- **AND** the general database credential SHALL NOT substitute

#### Scenario: Historical backfill is inconsistent

- **WHEN** migration backfill finds an existing gap, fork, duplicate,
  non-monotonic version, or wrong predecessor
- **THEN** migration SHALL fail without enabling Slice E
- **AND** it SHALL NOT infer or repair historical lineage

### Requirement: Complete compatibility checks

The system SHALL exact-compare every shared identity field across the
hypothesis, plan, Measurement Cell, accepted evidence, C.1 projection, D source
graph, and produced readout before canonical binding.

#### Scenario: Cross-spliced source graph

- **WHEN** records are individually valid but the plan references another
  hypothesis, the cell references another plan, metric definition, source,
  unit, direction, workflow, slice, aggregate grain, or window, or the D
  artifacts reference another evidence graph
- **THEN** canonical identity authority SHALL hold
- **AND** no individually valid record SHALL repair another broken edge

#### Scenario: Metric ID without definition identity

- **WHEN** the D metrics-library entry shares a metric ID but omits or
  mismatches the version-bearing metric-definition ref or separately named
  `canonical_metric_definition_commitment_v1` carried by the plan and
  Measurement Cell
- **THEN** canonical identity authority SHALL hold
- **AND** schema validity, metric-name similarity, a caller hash, or the
  legacy Measurement Cell `metric_definition_hash` SHALL NOT establish
  compatibility

#### Scenario: Canonical metric definition is exact and unique

- **WHEN** Slice E resolves a selected metric
- **THEN** exactly one authoritative metrics-library entry SHALL match its
  metric ID and version-bearing definition ref
- **AND** the server SHALL recompute one domain/version-separated commitment
  over metric ID, definition ref, definition, governed source projection,
  unit, direction, aggregate grain, allowed claim ceiling, and required
  blocked claims
- **AND** the plan, cell, and current D source graph SHALL exact-match that
  commitment

#### Scenario: Same-ID mutation

- **WHEN** any exact source changes under the same row identity before lock,
  during persistence, after commit, or before readout
- **THEN** semantic-hash reconciliation SHALL fail
- **AND** canonical identity authority SHALL hold

### Requirement: Non-circular identity integration

The system SHALL bind the canonical identity core into D artifacts before
their IDs are derived, then derive the final canonical binding ID from the
final packet ID under a separate fixed domain. After the D IDs exist, it SHALL
render one fixed-version deterministic HTML body and bind the exact
rendered-byte hash into the final binding without including the binding ID in
those rendered bytes.
The fixed renderer schema/template/projection version SHALL be in the
canonical core before D IDs are derived; the final binding SHALL add the exact
rendered-byte hash.

#### Scenario: Deterministic exact replay

- **WHEN** the complete identity sources, D authority, C.1 projection, and
  produced artifacts are byte-identical
- **THEN** the existing final binding MAY be returned as an exact replay

#### Scenario: Rebind packet to different lineage

- **WHEN** the same packet-derived binding ID is presented with different
  hypothesis, measurement, metric, slice, evidence, or artifact bytes
- **THEN** persistence SHALL hold without overwrite
- **AND** neither binding SHALL be exposed as canonical

#### Scenario: Coherent reserved-artifact substitution

- **WHEN** claim, packet, manifest, and binding hashes are coherently replaced
  but differ from current server-loaded sources or C.1 projection
- **THEN** current readout SHALL rebuild the full chain and hold

#### Scenario: Renderer or body drift

- **WHEN** the renderer version is unknown, the same-version renderer
  projection changes, or the exact returned HTML bytes differ from the body
  hash in the binding
- **THEN** canonical identity authority SHALL hold
- **AND** neither source-bound nor canonical-identity-bound status SHALL be
  true

#### Scenario: Versioned renderer correction

- **WHEN** the deterministic renderer is deliberately corrected
- **THEN** it SHALL receive a new schema/template/projection version
- **AND** that core change SHALL produce new D artifact IDs, packet ID, and
  binding ID without overwriting the old bundle

### Requirement: Serializable append-only persistence

The system SHALL take deterministic source-family transaction advisory locks,
then lock exact hypothesis, plan, Measurement Cell, D source, and supersession
rows plus the exact durable journal heads in deterministic order within the
existing serializable general-store transaction. It SHALL atomically
insert-or-exact-compare the D claim, packet, manifest, and final canonical
binding.

#### Scenario: Concurrent source or supersession change

- **WHEN** a source mutates or a new superseding version appears across initial
  load, transaction lock, commit, or post-commit reconciliation
- **THEN** authorization SHALL hold
- **AND** any already inserted content-addressed rows SHALL remain
  non-canonical and non-source-bound

#### Scenario: Generic API attempts binding access

- **WHEN** a caller creates, reads, lists, or overwrites the reserved canonical
  binding through generic object APIs
- **THEN** the write SHALL be rejected and reads/lists SHALL expose no binding

### Requirement: Non-forgeable Slice E source and bundle creation authority

Canonical identity authority SHALL require a valid
`FT_CANONICAL_ARTIFACT_CREATION_ATTESTATION_V1` created with a
Slice-E-specific service-held HMAC key. The attestation SHALL bind the
authenticated organization commitment, binding ID, canonical core commitment,
and complete non-circular attestable semantic hashes of the claim, packet,
manifest, and binding. Only the key ID and MAC MAY be stored in the private
binding validation envelope.

The same Slice E key family SHALL create the Value Hypothesis, plan, and
Measurement Cell source attestations under separate fixed domains during
their trusted append transactions. All three source attestations SHALL verify;
the hypothesis attestation commitment SHALL enter the plan edge and canonical
core, and both edge commitments SHALL enter the core before a bundle
attestation may be created.

#### Scenario: Direct database writer inserts consistent artifacts

- **WHEN** a database writer inserts source-consistent claim, packet, manifest,
  and binding bytes without access to the Slice E service key
- **THEN** deterministic reconstruction alone SHALL NOT authorize them
- **AND** creation-attestation verification SHALL hold

#### Scenario: Direct database writer inserts consistent source lineage

- **WHEN** a database writer inserts an E-capable hypothesis, plan, or cell
  with internally consistent but unauthenticated
  predecessor/parent/approval/slice/metric lineage
- **THEN** source-attestation verification SHALL hold
- **AND** the service SHALL NOT create a final bundle attestation from those
  rows

#### Scenario: Source attestation is copied after reinsert

- **WHEN** otherwise identical source bytes are deleted and reinserted under a
  different internal row key or a MAC is copied to another predecessor or
  child row
- **THEN** the exact child/parent internal-row-key binding SHALL mismatch
- **AND** Slice E authority SHALL hold

#### Scenario: Attestation is copied or artifact bytes change

- **WHEN** a valid MAC is copied to another organization, binding, packet, or
  changed artifact bundle
- **THEN** the domain-bound attestation SHALL fail
- **AND** the response SHALL remain the existing fixed redacted hold

#### Scenario: Exact replay uses a retained read key

- **WHEN** all four attestable artifact projections are byte-identical and the
  recorded key ID resolves to an explicitly retained read key
- **THEN** the exact existing bundle MAY revalidate
- **AND** exactly one configured active-write key SHALL remain required for
  new bundles

#### Scenario: C.1 attestation isolation

- **WHEN** Slice E creates or verifies its artifact attestation
- **THEN** it SHALL NOT read, write, reuse, extend, or change the C.1 key
  registry, activation or revocation journals, provisioner, functions, roles,
  or migration

### Requirement: Truthful source-bound and canonical labeling

The system SHALL set MCII readout source-bound or canonical identity status
only after the deterministic binding and complete current chain revalidate.

#### Scenario: Fully bound current readout

- **WHEN** current D, C.1, source-version, supersession, compatibility, and
  final-binding checks all pass
- **AND** the Slice E creation attestation, declared renderer version, and
  exact rendered UTF-8 bytes all revalidate
- **THEN** the readout MAY return those exact bytes and set both source-bound
  and canonical-identity-bound status true

#### Scenario: Valid Slice D bundle without Slice E

- **WHEN** current D authorization passes but no canonical identity binding is
  present
- **THEN** the existing internal descriptive readout MAY remain available for
  additive compatibility
- **BUT** source-bound and canonical-identity-bound status SHALL both be false
- **AND** the readout SHALL NOT describe itself as canonical or source-bound

#### Scenario: Invalid supplied selector

- **WHEN** a caller supplies `canonical_identity_selector` and any binding
  check fails
- **THEN** the entire request SHALL return the existing fixed redacted hold
- **AND** it SHALL NOT silently downgrade to an unbound authorization result

### Requirement: Commitment-only binding privacy

The reserved canonical binding's public-safe payload SHALL contain no raw
source selectors, raw slice values, user-identifiable data, raw events, source
payloads, prompts, responses, transcripts, arbitrary prose, creation
attestation, or customer-facing content.

#### Scenario: Held or guessed identity

- **WHEN** a binding is missing, foreign, stale, ambiguous, changed, guessed,
  or cross-spliced
- **THEN** the response SHALL disclose only the existing fixed held state
- **AND** it SHALL omit selectors, row locators, commitments, hashes,
  candidates, and diagnostic differences

#### Scenario: Internal locator storage

- **WHEN** server-only row locators are needed for exact current readback
- **THEN** they MAY exist only in the reserved validation envelope
- **AND** generic APIs, HTML, authorized response payloads, and future Slice F
  projection SHALL receive no authority to expose them

#### Scenario: Private source and bundle attestation storage

- **WHEN** the Slice E service stores a hypothesis, source-edge, or
  bundle-attestation key ID and MAC
- **THEN** they SHALL exist only in the server-only source or reserved binding
  validation envelope
- **AND** the secret SHALL remain outside PostgreSQL and source control
- **AND** no generic API, HTML, authorized response payload, or future Slice F
  projection SHALL expose the key ID or MAC
