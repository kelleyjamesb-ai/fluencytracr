## ADDED Requirements

### Requirement: Exact predecessor source admission

The closure gate SHALL admit exactly the byte-pinned Section 7.5A registry and
Sections 7.5.1-7.5.4 contracts. It SHALL reject ambient fallback, locator
substitution, nonregular resources, byte drift, shape drift, or an unknown
predecessor decision.

#### Scenario: Exact predecessor set
- **WHEN** all five explicit sources match their admitted bytes and decisions
- **THEN** source admission may proceed without creating runtime authority

#### Scenario: Missing or changed predecessor
- **WHEN** any source is absent, partial, corrupt, substituted, or held
- **THEN** the aggregate decision is HOLD

### Requirement: Total ownership and edge reconciliation

The gate SHALL reconcile P00-P14 and P17-P19 against every exact registry
forward and reverse edge. Every semantic parent, mechanism, retention, audit,
network, local-enforcement, and anchor portion SHALL have one existing owner.
P15 and P16 SHALL remain opaque later-section exclusions.

#### Scenario: Exact bidirectional projection
- **WHEN** all rows, portions, owners, states, and edges agree exactly
- **THEN** the ownership and dependency projection clears structurally

#### Scenario: Projection drift
- **WHEN** a row, portion, owner, state, forward edge, or reverse edge is
  missing, duplicated, reordered, or added
- **THEN** the aggregate decision is HOLD

### Requirement: Closed or held decision totality

The successful documentation decision SHALL be exactly
`SECTION_7_5_CONTRACT_CLOSED`. Any predecessor HOLD or invalid closure SHALL
deterministically produce HOLD. Both outcomes SHALL have authority effect
`NONE`; no other decision or authority tuple is admitted.

#### Scenario: All documentation predecessors close
- **WHEN** every exact predecessor decision and projection clears
- **THEN** the result is `SECTION_7_5_CONTRACT_CLOSED` with no runtime authority

#### Scenario: Any predecessor holds
- **WHEN** one or more predecessor decisions hold
- **THEN** the result is HOLD regardless of the remaining predecessors

### Requirement: Privacy and nonauthorization ceiling

The closure artifacts SHALL contain no direct identifier, customer/live data,
credential, raw evidence, approval, runtime record, or deployment authority.
They SHALL keep live execution `NOT_AUTHORIZED` / `NOT_RUN`.

#### Scenario: Structural vector only
- **WHEN** the synthetic vector validates
- **THEN** it remains non-evidence and non-authorizing

#### Scenario: Private field or authority is injected
- **WHEN** an identifier-bearing field, runtime record, or non-NONE authority appears
- **THEN** the aggregate decision is HOLD
