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

#### Scenario: A locator is proposed as context

- **WHEN** a later closed-shape test provides a locator field or arbitrary text
- **THEN** admission rejects before semantic projection

### Requirement: Current ownership and blocker posture are preserved

The packet SHALL preserve the exact five parent owners, five-project,
fourteen-role, sixteen-capability, and two-HSM-purpose ceilings. P00-P19 SHALL
remain `OPEN_BLOCKING`; structural evidence SHALL NOT close HSM custody, P03,
P08, P14, production authority, or a later-section obligation.

#### Scenario: Exact parents are structurally valid

- **WHEN** all five parent identities match
- **THEN** the clean exact environment result remains
  `HOLD:CURRENT_PARENT_OBLIGATIONS_OPEN`
- **AND** authority remains `NONE`

### Requirement: Environment, oracle, and attack coverage is explicit

The packet SHALL define all twelve environment cells, the nine canonical
oracle classes, A001-A019, and V4 metamorphic cases M001-M004. Every live cell
SHALL be `NOT_AUTHORIZED` / `NOT_RUN`.

#### Scenario: Live exact state is inspected

- **WHEN** the `LIVE_RUNTIME × EXACT` environment cell is read
- **THEN** it is `NOT_AUTHORIZED`, `NOT_RUN`, `DESIGN_ONLY`, and `NONE`
