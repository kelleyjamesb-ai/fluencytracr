## ADDED Requirements

### Requirement: Exact predecessor and human authority admission

The Section 7.6.1 gate SHALL admit exactly the byte-pinned Section 7.2 runtime
object, Section 7.3 security authority, Section 7.4 attestation/receipt
contract, Section 7.5 full-closure contract, and one unique human-authored
queue projection. Section 7.5 SHALL decide exactly
`SECTION_7_5_CONTRACT_CLOSED`. Missing, partial, corrupt, substituted, ambient,
duplicate, stale, or held authority SHALL produce HOLD.

#### Scenario: Exact predecessors and unique queue row
- **WHEN** all four sources match their pinned bytes and the unique queue projection matches
- **THEN** structural admission may proceed with authority effect `NONE`

#### Scenario: A predecessor or queue root drifts
- **WHEN** any source or immutable queue field differs, or Section 7.5 is not closed
- **THEN** pre-execution record production is held

### Requirement: Closed authenticated input schemas

The gate SHALL use closed schemas for the plan manifest, allocation manifest,
initial-or-opaque-retry lineage, parent attempt envelope, authenticated current
attempt-family head, and expected-request lineage. Parent, token, retry, and
head records SHALL be authenticated inputs rather than Section 7.6.1 trust
roots. Hash equality alone SHALL NOT establish authenticity or anonymization.

#### Scenario: Exact authenticated records
- **WHEN** every record has exactly the required typed fields and independent authentication evidence
- **THEN** derivation may continue without transferring record ownership

#### Scenario: Caller controls a field or authentication proof
- **WHEN** identity, ordinal, status, authentication, or an extra nested field is caller-selected
- **THEN** the candidate is held

### Requirement: Verifier-derived monotonic ordinals

Section 7.6.1 SHALL derive attempt and retry ordinals from the authenticated
current head and the authenticated initial-or-retry lineage. It SHALL reject
negative, stale, repeated, skipped, caller-selected, wrong-type, or
Boolean-as-integer ordinals. Section 7.6.2 SHALL exclusively own retry
eligibility, favorable-retry decisions, retry-token issuance, crash/terminal
classification, terminal proof, and authority mutation.

#### Scenario: Initial lineage derives the first attempt
- **WHEN** an authenticated initial token is presented against an authenticated empty head
- **THEN** attempt ordinal `1` and retry ordinal `0` are derived

#### Scenario: Opaque retry lineage derives the next ordinals
- **WHEN** an authenticated Section 7.6.2 retry authorization is presented against the authenticated current head
- **THEN** both ordinals advance exactly once without a Section 7.6.1 retry decision

### Requirement: Canonical single-use reservation

The canonical reservation key SHALL bind keyed tenant commitment, runtime
profile, allocation incarnation, numerical body, plan, allocation,
initial-or-retry lineage, derived ordinals, parent envelope, expected-request
lineage, and single-use claim. Raw tenant, user, provider, token, credential,
key, signature, prompt, result, model/plan byte, request body, and restricted
authentication-reference fields SHALL be prohibited.

#### Scenario: Exact reservation preimage
- **WHEN** every admitted commitment and derived ordinal is present exactly once
- **THEN** one canonical reservation key is derived

#### Scenario: Reservation identity is replayed or spliced
- **WHEN** any commitment is substituted, cross-spliced, repeated, or resealed from attacker-controlled roots
- **THEN** the candidate is held

### Requirement: Atomic write-ahead transition and exact readback

The gate SHALL authenticate inputs, read the authenticated current head, prove
token and reservation absence, and atomically write reservation,
token-consumption marker, write-ahead marker, new head, and expected-request
link in the fixed order. It SHALL expose an opaque record only after commit and
exact-byte readback. Unknown commit SHALL use same-key readback and SHALL NOT
allocate a new ordinal.

#### Scenario: One complete atomic transition
- **WHEN** all absence proofs clear and the fixed write set commits and reads back exactly
- **THEN** one opaque pre-execution record may be exposed to Section 7.4

#### Scenario: Replay, duplicate, missing marker, or unknown commit
- **WHEN** a token or reservation exists, two callers race, write-ahead is missing or misordered, or commit outcome is unknown
- **THEN** no second ordinal is allocated and only deterministic HOLD or same-key readback is permitted

### Requirement: Section 7.4-only opaque handoff

The public projection SHALL contain only opaque commitments and fixed
nonauthorizing decisions. It SHALL bind the pre-ledger context, parent envelope,
single-use claim, record authentication, freshness, single-use verification,
and approved Section 7.6 contract inputs consumed by Section 7.4. It SHALL NOT
self-issue `pre_execution_attempt_acceptance_hash`, Section 7.4 PASS booleans,
actual boot/runtime truth, terminal state, retry decisions/tokens, or authority.

#### Scenario: Exact opaque record
- **WHEN** the committed state reads back exactly
- **THEN** Section 7.4 is the only admitted consumer and authority remains `NONE`

#### Scenario: Later-section or private data leaks
- **WHEN** a private/raw field, actual-runtime assertion, terminal/retry field, acceptance hash, PASS Boolean, or non-NONE authority appears
- **THEN** the candidate is held
