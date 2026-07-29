## ADDED Requirements

### Requirement: Independent aggregate claim authorization

The system SHALL evaluate claim authorization as a server-owned decision that
is separate from import/schema approval, accepted evidence review, exact-slice
evidence admission, C.1 comparison-privacy release, readiness, and model
eligibility.

#### Scenario: Adjacent approval attempts to authorize a claim

- **WHEN** any one or any incomplete subset of import/schema approval,
  accepted review, evidence admission, C.1 comparison privacy, readiness, or
  model eligibility is present
- **THEN** claim authorization SHALL remain held
- **AND** no claim boundary or executive packet SHALL be persisted or rendered
  as authorized

#### Scenario: Exact server-owned descriptive claim authorization

- **WHEN** accepted exact-slice evidence admission, successful C.1 readback,
  readiness, fixed template generation, and immutable manifest reconciliation
  all pass for the same server-derived organization, workflow, JBTD, persona,
  metric, source, unit, evidence pair, and windows
- **THEN** the system MAY authorize only the bounded internal descriptive claim
- **AND** model use and customer-facing output SHALL remain unauthorized

### Requirement: C.1 privacy input remains non-authorizing

The system SHALL use only the complete projection returned by bounded C.1
readback as the metric-movement input. The receipt SHALL remain an opaque
non-authorizing selector, and the expected exact slice SHALL be derived from
authoritative server records.

#### Scenario: Receipt or caller identity attempts to establish authority

- **WHEN** a caller supplies a valid receipt without matching authoritative
  evidence/readiness, supplies expected slice identity, or supplies parallel
  baseline/comparison values
- **THEN** claim authorization SHALL hold
- **AND** no caller field SHALL replace or strengthen the server-owned C.1
  readback projection

#### Scenario: Exact projection reconciliation

- **WHEN** C.1 readback returns the exact immutable projection for the
  server-derived slice
- **THEN** every metric, source, unit, evidence, cohort, value, window, and
  lineage commitment exposed by the exact receipt, `content_fingerprint`,
  `projection_hash`, and complete projection SHALL reconcile before template
  generation
- **AND** Slice D SHALL NOT require or separately load the hidden raw proof,
  admission, or evidence hashes committed by the C.1 content fingerprint
- **AND** a missing, partial, alternate, stale, or cross-slice pair SHALL hold

### Requirement: Authoritative source graph selection

The system SHALL derive the exact export, readiness, blueprint, metrics
library, and scenario identities and canonical hashes from the server-owned
real-evidence materialization and admitted export/readiness lineage. Request
IDs SHALL be compatibility selectors only and SHALL NOT choose claim
semantics.

#### Scenario: Materializer seals a complete source graph

- **WHEN** real-evidence materialization produces admitted Outcome Evidence
- **THEN** it SHALL persist the exact server-generated scenario before
  readiness
- **AND** readiness validation SHALL record materializer-only authoritative
  IDs, domain-separated canonical hashes, and one composite graph hash for the
  export's immutable evidence-content projection, blueprint, metrics library,
  and persisted scenario
- **AND** the export evidence-content projection SHALL exclude only the
  independently governed `review` envelope and bind every other export field
- **AND** generic readiness storage SHALL NOT set or preserve the
  materializer-only authoritative marker

#### Scenario: Human review completes after materialization

- **WHEN** the sealed export transitions from `SUBMITTED` to terminal
  `ACCEPTED` by changing only its governed review envelope
- **THEN** the materializer evidence-content seal SHALL remain stable
- **AND** claim authorization SHALL independently require accepted review and
  bind the exact current review envelope plus the full accepted-export payload
  hash into the authorization manifest

#### Scenario: Exact lineage-selected source graph

- **WHEN** authoritative readiness validation binds one accepted export plus
  its complete materializer-created source-graph seal, and its payload source
  references bind the same one blueprint, metrics library, and persisted
  scenario
- **THEN** only those exact server-derived records SHALL be eligible inputs
- **AND** every request selector, canonical hash, workflow family, metric
  identity, window, admission slice, and cross-object reference SHALL
  reconcile before C.1 readback or template generation

#### Scenario: Compatible-looking source substitution

- **WHEN** a caller supplies another stored blueprint, metrics library,
  scenario, or readiness object that is schema-valid or shares compatible
  workflow, window, metric, source, or unit fields but is not the exact
  lineage-selected object
- **THEN** claim authorization SHALL hold
- **AND** the substituted direction or claim context SHALL NOT reach the
  template, manifest, packet, or readout

#### Scenario: Same-ID mutation or forged readiness lineage

- **WHEN** sealed export evidence content, blueprint, metrics library, or
  scenario changes under the same ID, the accepted review/full export no
  longer matches the authorization manifest, or a generic readiness write
  attempts to assert authoritative lineage
- **THEN** the current canonical hashes or authoritative marker SHALL fail to
  reconcile with the materializer-created source-graph seal
- **AND** claim authorization SHALL hold; changed source content requires a
  fresh server-owned materialization seal, while any permitted review-envelope
  change requires a fresh exact authorization manifest

### Requirement: Bounded single-movement observed non-attributable template

The system SHALL generate exactly one authorized metric movement from exactly
one C.1 projection through the fixed aggregate descriptive template and SHALL
label that movement `OBSERVED_NON_ATTRIBUTABLE`.

#### Scenario: Mechanically valid movement

- **WHEN** finite baseline and comparison values arrive from successful exact
  C.1 readback
- **THEN** the template SHALL emit the baseline, comparison, absolute delta,
  and observed direction
- **AND** it SHALL emit mechanical percent change only when the baseline is
  non-zero and the computed result is finite
- **AND** it SHALL normalize negative zero and attach fixed aggregate,
  non-attribution, non-causality, and internal-only caveats
- **AND** the metric identifier and measurement unit SHALL each match their
  compiled Slice D vocabulary in the synchronized JSON Schema

#### Scenario: Unapproved metric identifier or measurement unit

- **WHEN** the selected C.1 movement contains a metric identifier or
  measurement unit outside the compiled Slice D vocabularies
- **THEN** claim authorization SHALL hold before artifact generation
- **AND** no identifier, unsupported semantic text, or source detail SHALL be
  returned in the fixed held response

#### Scenario: Unapproved source-system label

- **WHEN** the exact C.1 projection contains a source-system label outside the
  compiled server-owned Slice D vocabulary
- **THEN** claim authorization SHALL hold before manifest persistence
- **AND** the arbitrary label SHALL NOT enter an internal artifact or fixed
  held response

#### Scenario: Raw aggregate identity reaches the artifact boundary

- **WHEN** authoritative Slice D slice, source-graph, readiness, or C.1
  evidence identifiers are used to authorize one exact movement
- **THEN** the claim, packet, and manifest SHALL retain only domain-separated
  commitments to those identities and the complete C.1 projection
- **AND** no raw identifier SHALL enter an artifact payload or fixed held
  response
- **AND** reserved persistence SHALL keep the authenticated organization only
  as the tenant/RLS row envelope and SHALL store a null workflow family
- **AND** the commitments SHALL NOT define Slice E canonical identity
  compatibility

#### Scenario: Multiple movement or overflow attempt

- **WHEN** an invocation requests or derives a second movement or metric, or
  finite endpoints produce a non-finite absolute delta under fixed
  comparison-minus-baseline binary64 arithmetic
- **THEN** claim authorization SHALL hold before artifact generation
- **AND** baseline, comparison, delta, and percent change SHALL normalize
  negative zero before canonicalization and hashing

#### Scenario: Unsupported claim semantics

- **WHEN** a candidate includes causal, attribution, ROI, monetary,
  productivity, prediction, probability/confidence, model-output,
  individual-performance, ranking, improvement/impact, or customer-facing
  semantics
- **THEN** validation SHALL fail closed
- **AND** no authorized claim artifact SHALL be produced

### Requirement: Immutable exact artifact manifest

The system SHALL bind reserved internal authorized claim artifacts to a
content-addressed, create-or-exact-replay manifest derived from one locked
serializable server-owned source snapshot, the complete C.1 readback
projection, and independent policy state.

#### Scenario: Exact replay

- **WHEN** the same exact server-owned inputs, C.1 projection, policy state,
  template, claim artifact, and readout artifact are replayed
- **THEN** the existing immutable manifest MAY be reused without mutation

#### Scenario: Atomic source snapshot

- **WHEN** the authority seals an authorization bundle
- **THEN** it SHALL lock and reload the admitted export, readiness, and every
  blueprint, metrics-library, and scenario row selected by authoritative
  readiness lineage in deterministic order inside one serializable transaction
- **AND** every locked source hash SHALL match the materializer-created
  readiness seal as well as the pre-seal snapshot
- **AND** it SHALL atomically insert-or-exact-compare the internal claim,
  one-movement packet, and manifest without an update or generic upsert
- **AND** it SHALL perform post-commit C.1, source-row, artifact, and manifest
  reconciliation before returning authorized

#### Scenario: Concurrent source mutation

- **WHEN** any authoritative source changes across the pre-seal snapshot,
  locked transaction, or post-commit reconciliation
- **THEN** authorization SHALL hold
- **AND** any already inserted content-addressed rows SHALL remain
  non-renderable without a fresh exact authorization and readout revalidation

#### Scenario: Mutable or substituted artifact

- **WHEN** evidence, receipt, slice, projection, window, template, claim
  boundary, executive packet, or policy-state bytes differ from the manifest
- **THEN** authorization and readout SHALL hold
- **AND** the existing manifest SHALL NOT be overwritten

#### Scenario: Deterministic non-circular artifact lookup

- **WHEN** claim content, packet content, and the manifest core are sealed
- **THEN** claim and packet content hashes SHALL exclude deterministic
  envelope IDs
- **AND** the manifest hash SHALL derive the internal manifest, claim, and
  packet IDs under separate domains
- **AND** HTML packet lookup SHALL derive and reconcile the manifest identity
  without trusting a caller-supplied manifest key

#### Scenario: Privacy authority changes after persistence

- **WHEN** C.1 readback no longer succeeds because of revocation, readiness
  loss, unavailable state, or any later mismatch
- **THEN** the historical manifest SHALL NOT authorize current rendering
- **AND** readout SHALL return a fixed held response without claim text

### Requirement: Non-authoritative path demotion

The system SHALL preserve compatible calculation and storage paths without
allowing them to authorize or render claims.

#### Scenario: Direct valid object upload

- **WHEN** a schema-valid claim boundary or executive packet is submitted
  through the generic object API
- **THEN** it SHALL be marked non-authoritative
- **AND** it SHALL NOT render through the HTML readout

#### Scenario: Reserved internal artifact isolation

- **WHEN** a caller attempts to create, read, list, or overwrite an internal
  authorized claim, packet, or manifest through the generic object API
- **THEN** the generic API SHALL expose none of those internal artifact types
- **AND** no generic upsert SHALL mutate an authorization bundle

#### Scenario: Generic spine calculation

- **WHEN** the generic spine validates blueprint, metrics, scenario, and
  readiness without a backend claim-authorization result
- **THEN** claim and executive stages SHALL remain held from authoritative
  persistence and rendering

### Requirement: Redacted held responses

The system SHALL return fixed redacted held responses on every unauthorized,
unpersisted, legacy, or reconciliation-failed claim path.

#### Scenario: Value-chain hold or non-persisting request

- **WHEN** `/value-chain/run` holds for any reason or receives `persist: false`
- **THEN** its response SHALL contain only the fixed closed state, stable
  reason family, and empty persisted-object projection
- **AND** it SHALL omit the ordinary run payload, movements, claims, packets,
  manifests, hashes, and claim text

#### Scenario: Spine or HTML held path

- **WHEN** `/spine/run` lacks backend claim authorization or HTML readout
  receives a legacy, direct, missing, stale, or mismatched packet
- **THEN** claim and executive output SHALL be replaced by the fixed held state
- **AND** no generated claim object, claim prose, movement, manifest, or hash
  SHALL be returned or rendered
