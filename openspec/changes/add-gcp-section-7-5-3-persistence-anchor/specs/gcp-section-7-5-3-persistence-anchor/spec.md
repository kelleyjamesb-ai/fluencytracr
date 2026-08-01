## ADDED Requirements

### Requirement: Exact Section 7.5.3 ownership projection

The contract SHALL close structurally only `S75A-P04`, `S75A-P10`, `S75A-P11`,
the Section 7.5 mechanism portion of `S75A-P19`, and the three owned replay-
retention P07 nodes. It SHALL exclude the six network-local and audit-mapping
P07 nodes and preserve the immutable registry bytes, rows, owners, states, and
edges.

#### Scenario: Exact owned projection validates
- **WHEN** the contract lists exactly the Section 7.5.3-owned projection
- **THEN** the offline verifier accepts the ownership boundary

#### Scenario: Later-owned or Section 7.6 scope is injected
- **WHEN** audit mapping, attempt semantics, or terminal-state semantics appear
- **THEN** the verifier rejects ownership expansion

### Requirement: Closed checkpoint lineage and currentness

The contract SHALL require an exact predecessor, sequence-plus-one,
authenticated current head, serializable single-successor concurrency,
linearizable check-and-use, fork and stale-reader rejection, and whole-state
restore detection.

#### Scenario: Exact successor validates structurally
- **WHEN** checkpoint and anchor bindings identify one adjacent current successor
- **THEN** the lineage gate clears without granting runtime authority

#### Scenario: Fork, stale head, or restore conflict appears
- **WHEN** predecessor, sequence, current-head, or restore evidence conflicts
- **THEN** the verifier rejects or holds according to the frozen precedence

### Requirement: Immutable GCS retention without replacement

The contract SHALL bind the exact bucket incarnation, object identity,
generation, metageneration, bytes, hash, length, retention guarantee, region,
CMEK, bucket lock, uniform access, public-access prevention, and
`ifGenerationMatch=0` no-replacement control. History SHALL explicitly cover
active, noncurrent, and declared soft-deleted objects.

#### Scenario: Exact immutable object validates structurally
- **WHEN** every named GCS control and exact object binding is present
- **THEN** the immutable-retention gate clears without creating a GCS object

#### Scenario: Replacement or retention evidence is incomplete
- **WHEN** generation precondition permits replacement or required history and
  retention evidence is missing
- **THEN** the verifier rejects replacement or holds the mechanism

### Requirement: Transaction idempotence without attempt semantics

The contract SHALL require a previously begun serializable Spanner read-write
transaction, exact idempotency key, provider-assigned commit timestamp, and
prohibited transport retry. An `UNKNOWN` commit SHALL be resolved only by reread
with the exact idempotency key. Commit timestamp SHALL NOT be a uniqueness key.

#### Scenario: Committed or unknown outcome follows the closed posture
- **WHEN** a committed record has a provider timestamp or an unknown outcome is
  reread by idempotency key without blind retry
- **THEN** transaction structure validates without defining attempt eligibility

#### Scenario: Single-use write or blind retry is proposed
- **WHEN** the transaction was not previously begun or transport retry is allowed
- **THEN** the verifier rejects the transaction posture

### Requirement: Independent nonrollbackable anchor and recovery

The contract SHALL require an independently authenticated, fresh,
nonrollbackable anchor bound to checkpoint state and heads, with linearizable
check-and-use, stale-reader rejection, whole-state restore detection, and both
before-commit and after-commit recovery evidence.

#### Scenario: Anchor and checkpoint agree
- **WHEN** the authenticated anchor names the exact state, current head, and
  predecessor and every recovery mechanism is present
- **THEN** the anchor structural gate clears

#### Scenario: Anchor can roll back or recovery is incomplete
- **WHEN** any named anchor or recovery mechanism is absent
- **THEN** the verifier holds rather than inferring currentness

### Requirement: Exactly three replay-retention phases

The contract SHALL require distinct closed schemas for exactly `INITIAL`,
`CURRENT`, and `FINAL` replay-retention records. Each SHALL bind its exact
Section 7.4 acceptance node and formula, the same immutable GCS record and
retention guarantee, a distinct authenticated one-time challenge with ordered
issue, verification, and expiry, its phase-specific required retrieved bytes,
and the exact target and challenge.

#### Scenario: Three exact phases validate structurally
- **WHEN** all three phase records satisfy their bindings and intervals
- **THEN** the owned P07 replay-retention projection clears structurally

#### Scenario: Phase, challenge, bytes, or retention differs
- **WHEN** a phase is missing or duplicated or a named binding is incomplete
- **THEN** the verifier rejects schema drift or holds retention

### Requirement: Evidence-absent authority hold

The contract SHALL keep all runtime evidence registries empty, set authority
effect to `NONE`, and emit only
`GCP_SECTION_7_5_3_PERSISTENCE_ANCHOR_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`.
It SHALL NOT authorize runtime satisfaction, GCP access, credentials,
provisioning, deployment, qualification, or model execution.

#### Scenario: Structural contract is complete without evidence
- **WHEN** exact pins, schemas, mechanics, and synthetic vectors validate
- **THEN** documentation closure is reported while runtime authority stays held

#### Scenario: Runtime evidence or authority is injected
- **WHEN** a runtime registry becomes nonempty or authority effect changes
- **THEN** the verifier rejects the contract
