## ADDED Requirements

### Requirement: Slice C And Comparison Proof Share One Irreversible Reservation

Slice C and the C.0 comparison-proof path SHALL derive one canonical
reservation key from exact organization, workflow, JBTD, and persona only.
They SHALL reserve that key through one database-unique create-once retained
tombstone inside their respective advisory-lock-governed `ReadCommitted`
transactions. Metric, source,
unit, window, evidence, value, slot, contribution, producer, and path-specific
fields SHALL NOT alter the key.
The database SHALL reject reservation `UPDATE` and `DELETE`, and every hash
lookup SHALL compare the stored exact typed tuple before replay.

#### Scenario: Slice C releases before C.0

- **WHEN** Slice C owns the canonical reservation and a C.0 proof later targets
  the same exact slice
- **THEN** C.0 SHALL `HOLD`
- **AND** the reservation SHALL NOT be reassigned, updated, or deleted

#### Scenario: A pre-migration Slice C release exists

- **WHEN** a Slice C journal exists without a shared reservation
- **THEN** only an exact Slice C replay MAY atomically adopt its own
  `SLICE_C_FIXED_WINDOW` reservation
- **AND** C.0 SHALL `HOLD` and SHALL NOT adopt or replace that owner

#### Scenario: C.0 reserves before Slice C

- **WHEN** C.0 owns the canonical reservation and Slice C later targets the
  same exact slice
- **THEN** Slice C SHALL `HOLD`
- **AND** no alternate slot, window, source, metric, or contribution set SHALL
  create another owner

#### Scenario: Cross-authority first writers race

- **WHEN** Slice C and C.0 concurrently attempt the first reservation for the
  same canonical key
- **THEN** database uniqueness and advisory-lock-governed `ReadCommitted`
  transactions SHALL permit at most one owner
- **AND** the losing transaction SHALL leave no orphan journal, proof,
  reservation, or contribution claims

#### Scenario: Exact owner replays

- **WHEN** the same owner kind, reference, content hash, and exact slice replay
  an existing reservation
- **THEN** the retained reservation MAY replay byte-stably
- **AND** every changed owner or content attempt SHALL `HOLD`

#### Scenario: Authority or evidence changes during commit

- **WHEN** an Outcome Evidence write, authority revocation, Slice C writer, or
  C.0 writer races the proof transaction
- **THEN** every path SHALL acquire its shared advisory transaction locks
  before governed reads, in canonical outcome-family then producer-key order
- **AND** post-wait `ReadCommitted` statement snapshots SHALL expose one
  complete before-or-after state
- **AND** state effective at or before C.0 commit SHALL be rechecked before any
  proof journal or reservation is retained

### Requirement: Reservation And Proof Holds Are Value Independent

Every external C.0 or shared-reservation failure SHALL use one fixed held
posture and SHALL NOT expose values, cohort sizes, evidence IDs, commitments,
hashes, slots, proof identities, authority details, or collision diagnostics.

#### Scenario: Missing and conflicting authority are compared

- **WHEN** authorized callers compare missing, invalid, expired, revoked,
  conflicting, or already-reserved attempts
- **THEN** their external status, body, ordering, error, audit, and log
  transcripts SHALL be equivalent after only enumerated transport volatility
- **AND** no independent baseline or comparison read SHALL be introduced
