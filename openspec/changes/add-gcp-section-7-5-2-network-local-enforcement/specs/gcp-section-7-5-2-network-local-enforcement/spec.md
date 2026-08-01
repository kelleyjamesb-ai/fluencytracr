## ADDED Requirements

### Requirement: Exact Section 7.5.2 ownership projection

The contract SHALL close structurally only `S75A-P09`, `S75A-P18`, and the five
owned trust/channel/transport P07 nodes. It SHALL exclude the audit-mapping and
three replay-retention P07 nodes and SHALL preserve the immutable Section 7.5A
registry bytes, rows, owners, states, and edges.

#### Scenario: Exact owned projection validates
- **WHEN** the contract lists exactly P09, P18, and the five owned P07 nodes
- **THEN** the offline verifier accepts the ownership projection

#### Scenario: Later-owned node is injected
- **WHEN** audit mapping or any replay-retention node is added to the projection
- **THEN** the verifier rejects ownership expansion

### Requirement: Closed authenticated record schemas

The contract SHALL define exactly six closed record schemas for trust
distribution, channel interval, quote transport, KMS-sign transport, network
control observations, and local ephemeral enforcement. Every schema SHALL bind
the exact full-Section-7.5 target, observation interval, authentication
verification, freshness/anti-replay verification, approved Section 7.5 contract,
and domain-separated record hash. Unknown fields SHALL be rejected.

#### Scenario: Canonical synthetic bundle validates
- **WHEN** all records have exact fields, types, bindings, and recomputed hashes
- **THEN** the structural bundle reaches the evidence-absent held decision

#### Scenario: Schema or hash drifts
- **WHEN** a nested field is missing or added, a Boolean is encoded as an
  integer, a time is noncanonical, or a record hash does not recompute
- **THEN** the verifier rejects before any positive decision

### Requirement: Whole-interval network and channel enforcement

The contract SHALL require private ingress and egress, UDS-only local delivery,
no relay, complete caller-by-method authentication, exact TLS target and
certificate binding, and complete DNS, firewall, route, and perimeter
observations for the same whole interval. The caller method set SHALL be exactly
`KMS_ASYMMETRIC_SIGN` and `STS_TOKEN_EXCHANGE`, bound to the corresponding
Section 7.3 authority-operation IDs.

#### Scenario: Network evidence is complete
- **WHEN** every network and channel mechanism covers the exact shared interval
- **THEN** the network/channel structural gate clears without granting authority

#### Scenario: Network evidence has a gap
- **WHEN** any interval edge, caller method, route, or named control is missing
- **THEN** the contract rejects authentication drift or returns a mechanism or
  interval `HOLD` according to the frozen precedence

### Requirement: Whole-interval local ephemeral enforcement

The contract SHALL require authenticated whole-interval proof of approved disk
policy, tmpfs-only ephemeral material, disabled swap, disabled prohibited
logging, and absence of unapproved local persistence.

#### Scenario: Local enforcement is complete
- **WHEN** every local control covers the exact shared interval
- **THEN** the local structural gate clears without granting authority

#### Scenario: Point-in-time or incomplete local evidence is supplied
- **WHEN** any local control is false or its interval differs
- **THEN** the contract returns a mechanism or interval `HOLD`

### Requirement: Exact Section 7.4 clock equality

The trust distribution record and token-freshness interface SHALL use the exact
same `section_7_5_trust_record_verified_at` value and trusted UTC clock policy
hash. Conversion, rounding, alternate timezone representation, and caller
replacement SHALL be rejected.

#### Scenario: Trust clock bindings are equal
- **WHEN** both interfaces use identical canonical UTC and policy values inside
  the observation interval
- **THEN** the freshness structural gate clears

#### Scenario: Trust clock bindings differ
- **WHEN** either time or policy value differs or the time is outside the interval
- **THEN** the verifier rejects authentication or freshness

### Requirement: Evidence-absent authority hold

The contract SHALL keep all runtime evidence registries empty, set authority
effect to `NONE`, and emit only
`GCP_SECTION_7_5_2_NETWORK_LOCAL_CONTRACT_CLOSED_EVIDENCE_ABSENT_RUNTIME_AUTHORITY_HELD`.
It SHALL NOT authorize runtime satisfaction, a SUT, GCP access, credentials,
provisioning, persistence, deployment, qualification, or model execution.

#### Scenario: Structural contract is complete without evidence
- **WHEN** the contract, source pins, schemas, and synthetic vectors validate
- **THEN** documentation closure is reported while runtime authority remains held

#### Scenario: Authority or live evidence is injected
- **WHEN** an authority-bearing field or nonempty runtime registry is supplied
- **THEN** the verifier rejects the contract
