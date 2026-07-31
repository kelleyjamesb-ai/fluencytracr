## ADDED Requirements

### Requirement: V4 readiness packet remains compact and non-authorizing

The Section 7.5.1 V4 readiness packet SHALL bind the canonical protocol, base
commit, exact ordered five-member parent manifest, closed schemas, rule
templates, oracle precedence, all twelve environment cells, and attack catalog.
It SHALL have `authority_effect: NONE` and SHALL NOT contain copied parent
bytes, generated ledger rows, frozen signatures, dynamic envelope hashes,
filesystem locators, user-identifiable values, answer-key inputs, or an SUT.

#### Scenario: Structural packet is loaded

- **WHEN** the focused V4 packet test loads the fixture
- **THEN** it finds the V4 schema version, `authority_effect: NONE`, and five
  parent manifest entries
- **AND** it finds no generated ledger, parent snapshots, signature, or V4 SUT

### Requirement: Public boundaries are closed and locator-free

Candidate, signed-context, parent-bundle, and result rules SHALL admit only
exact enums, hashes, fixed UTC times, key fingerprints, synthetic aliases, and
fixed member names. The signed context SHALL use the exact key-id pattern
`^P256_SPKI_SHA256:[0-9a-f]{64}$` and SHALL exclude every filesystem locator.
The signature preimage SHALL use the packet's versioned, domain-separated
projection over the canonical payload without `key_id`; acceptance SHALL bind
that excluded field to the exact fingerprint of the out-of-band admitted SPKI.
The result SHALL be one of the packet-enumerated
decision/reason/authority-effect/claim-grade tuples.

#### Scenario: A locator is proposed as context

- **WHEN** a later closed-shape test provides a locator field or arbitrary text
- **THEN** admission rejects before semantic projection

#### Scenario: Anchor or result vocabulary is substituted

- **WHEN** a signed context supplies a key fingerprint that does not match the
  out-of-band admitted SPKI, the admitted anchor is substituted, or a result
  reason/decision/claim-grade tuple is outside the packet mapping
- **THEN** admission rejects without exposing input or verifier detail

### Requirement: Current ownership and blocker posture are preserved

The packet SHALL preserve the exact five parent owners, five-project,
fourteen-role, sixteen-capability, and two-HSM-purpose ceilings. P00-P19 SHALL
remain `OPEN_BLOCKING`; structural evidence SHALL NOT close HSM custody, P03,
P08, P14, production authority, or a later-section obligation.
The controller fixed point SHALL include each governed role alias in its
transitive upstream set and enforce the exact parent-declared forbidden role
pairs after retaining declared cycles. Direct, transitive, fan-out, malformed,
or cross-object-spliced controller intersections SHALL reject; unknown or
unviewable edges SHALL hold.

#### Scenario: Exact parents are structurally valid

- **WHEN** all five parent identities match
- **THEN** the clean exact environment result remains
  `HOLD:CURRENT_PARENT_OBLIGATIONS_OPEN`
- **AND** authority remains `NONE`

#### Scenario: Live context is malformed or replayed

- **WHEN** a cryptographically authenticated `LIVE_RUNTIME` context has an
  invalid registry/receipt/approval conjunction or reuses a nonce already
  admitted by the same oracle instance
- **THEN** it rejects before the live nonauthorization hold
- **AND** no parent resource is accessed

### Requirement: Environment, oracle, and attack coverage is explicit

The packet SHALL define all twelve environment cells, the nine canonical
oracle classes, A001-A019, and V4 metamorphic cases M001-M004. Every live cell
SHALL be `NOT_AUTHORIZED` / `NOT_RUN`.

#### Scenario: Live exact state is inspected

- **WHEN** the `LIVE_RUNTIME × EXACT` environment cell is read
- **THEN** it is `NOT_AUTHORIZED`, `NOT_RUN`, `DESIGN_ONLY`, and `NONE`

### Requirement: Final closure is a canonical nonauthorizing projection

The Section 7.5.1 closure artifact SHALL pin and recompute the unchanged
Section 7.5A registry byte hash. It SHALL derive the exact ordered P00-P19
owner/state rows and forward/reverse edges and bind those derived values by one
canonical projection digest. It SHALL pin the current Section 7.2, Section 7.3
authority and role-matrix, and Section 7.4 contract paths and byte hashes.
The projection and registry loaders SHALL reject duplicate JSON keys and
non-canonical JSON value domains before semantic comparison. Unknown fields,
source drift, registry drift, missing or extra prerequisites, cross-owned
closure, runtime satisfaction, live authority, or a full-Section 7.5-closed
alias SHALL reject.

The only closed documentation portions SHALL be P00 for Section 7.2; P01, P02,
P06, and the Section 7.3 portions of P05, P08, and P19; and P03, P14, the
Section 7.4 verification-time portions of P05 and P07, and the Section 7.4
approval-only portion of P19. P07 SHALL have no Section 7.3 portion and P08
SHALL have no Section 7.4 portion.

#### Scenario: Exact parent documentation is projected

- **WHEN** the offline verifier reads the unchanged registry, exact projection,
  and exact parent contract bytes
- **THEN** it validates
  `SECTION_7_5_1_PARENT_INTERFACES_CLOSED_FULL_SECTION_7_5_CONTRACT_OPEN_BLOCKING`
- **AND** every future/full Section 7.5 component plus P04, P09-P13, and
  P15-P18 remains `OPEN_BLOCKING`
- **AND** actual aliases, approvals, and live evidence remain absent
- **AND** `LIVE_RUNTIME` remains `NOT_AUTHORIZED` / `NOT_RUN`
- **AND** authority remains `NONE`

#### Scenario: Projection repeats an authority-bearing key

- **WHEN** a projection repeats `authority_effect` or `decision`, even when
  the final repeated value equals the expected value
- **THEN** strict loading rejects before semantic projection
