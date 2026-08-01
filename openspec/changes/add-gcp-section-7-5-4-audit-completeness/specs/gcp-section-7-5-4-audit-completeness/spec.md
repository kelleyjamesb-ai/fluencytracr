## ADDED Requirements

### Requirement: Exact Section 7.5.4 ownership projection

The contract SHALL close only `S75A-P12`, the audit-mapping portion of P07,
and the Section 7.5 mechanism portion of P13. It SHALL preserve the immutable
registry and inventory and SHALL exclude the other P07 nodes and Section 7.7
decision authority.

#### Scenario: Exact projection validates
- **WHEN** only the named prerequisite portions and audit P07 node are claimed
- **THEN** the verifier accepts the ownership boundary

#### Scenario: Section 7.7 or another node is claimed
- **WHEN** a later decision or excluded P07 node is added
- **THEN** the verifier rejects ownership expansion

### Requirement: Complete audit universe and total classifier

The contract SHALL classify exactly all 89 pinned inventory rows, including 88
method rows and the sink-error platform log. It SHALL require Data Access,
total applicable Policy Denied coverage, the denied AsymmetricSign canary,
explicit path applicability, and all five exclusion-method dispositions.

#### Scenario: Exact classifier universe validates
- **WHEN** every pinned row and named classifier obligation is present
- **THEN** the universe gate clears structurally

#### Scenario: Method or classification is absent
- **WHEN** any mapping row, mode, denied applicability, or exclusion method is missing
- **THEN** the verifier holds

### Requirement: Independently rooted full-route timeline

The contract SHALL require a nonempty full timeline with complete route,
configuration, source-project, destination, and independent observation roots.
Policy Denied SHALL have no exclusion, and router buffering SHALL NOT substitute
for completeness.

#### Scenario: Full independent timeline validates
- **WHEN** every route and exclusion method is observed for the whole interval
- **THEN** the route gate clears structurally

#### Scenario: Route, root, or interval is incomplete
- **WHEN** any route is missing, evidence roots are reused, or the timeline is empty
- **THEN** the verifier holds

### Requirement: Exact delivery completeness

Expected and observed service-method keysets and row counts SHALL match the
pinned inventory. Source, destination, and independent delivery evidence SHALL
have distinct roots; sink errors SHALL be checked; missing method, route, and
Policy Denied counts SHALL all be zero.

#### Scenario: Exact delivery set validates
- **WHEN** keysets, counts, routes, and independent receipts agree
- **THEN** delivery clears structurally without becoming live proof

#### Scenario: Any expected coverage is absent
- **WHEN** a method, route, denied record, service, or sink-error check is missing
- **THEN** the verifier holds

### Requirement: Privacy-safe projection

Raw AuditLog evidence SHALL remain restricted. The public projection SHALL use
only the six fixed aggregate fields and SHALL exclude authentication,
authorization, principal, resource, request, response, and metadata content.
The verifier SHALL canonicalize the complete projection preimage and verify
its exact keyset, types, interval, service/method keyset, and record digest.

#### Scenario: Aggregate projection validates
- **WHEN** its keyset is exact and all raw-field exclusions are true
- **THEN** the privacy gate clears structurally

#### Scenario: Raw or unknown field enters the projection
- **WHEN** identifier-bearing content or an unapproved key is present
- **THEN** the verifier rejects privacy or boundary leakage

### Requirement: Exact Section 7.4 audit mapping

The audit mapping SHALL bind the exact Section 7.4 audit node/formula, bounded
field profile, authentication and freshness evidence, and the other four audit
records.

#### Scenario: Mapping bindings agree
- **WHEN** every exact parent and record hash matches
- **THEN** the audit P07 interface clears structurally

#### Scenario: Parent, profile, or child record differs
- **WHEN** any binding conflicts
- **THEN** the verifier rejects the mapping

### Requirement: Evidence-absent authority hold

The contract SHALL keep runtime registries empty, authority effect `NONE`, and
emit only the evidence-absent held decision. It SHALL NOT authorize live GCP,
logging resources, a SUT, deployment, qualification, or Section 7.7.

#### Scenario: Structural closure has no live evidence
- **WHEN** the docs contract and synthetic vectors validate
- **THEN** documentation closure is reported while runtime authority stays held

#### Scenario: Runtime evidence or authority is injected
- **WHEN** a registry becomes nonempty or authority changes
- **THEN** the verifier rejects
