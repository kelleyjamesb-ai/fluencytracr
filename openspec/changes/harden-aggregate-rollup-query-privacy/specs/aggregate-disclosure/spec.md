## ADDED Requirements

### Requirement: Aggregate Disclosure Is Authoritative And Fail Closed

For the enumerated Slice C surfaces, the system SHALL evaluate every aggregate
numeric disclosure through one authoritative policy over the complete privacy
equation domain before caller-selected filtering or response shaping. The
covered surfaces are legacy metric/dashboard, behavioral import/query/derived
consumers, workflow aggregate/observability, Outcome Evidence aggregate read,
and enablement/spread projection paths. Missing privacy context SHALL remain
storage-only and SHALL NOT disclose a numeric aggregate.

#### Scenario: Complete fixed family is released

- **WHEN** one complete fixed-window family carries a non-null exact
  `(workflow_id, jbtd_id, persona_id)` slice,
  server-owned cohort context, one server-proven disjoint hierarchy axis,
  server-owned complete atomic-child lineage, one approved temporal grid, and
  an exact value-bound content fingerprint, and every existing privacy and
  suppression gate passes
- **THEN** the policy MAY release its bounded aggregate values
- **AND** no other slice, axis, source mode, measure equation, or window SHALL
  contribute

#### Scenario: Legacy row lacks privacy context

- **WHEN** an otherwise valid legacy aggregate omits exact slice, cohort,
  lineage, or fixed-window context
- **THEN** ingestion and restricted storage MAY succeed
- **AND** aggregate disclosure and every derived consumer SHALL HOLD

#### Scenario: Caller claims completeness or disjointness

- **WHEN** caller-supplied rows claim a complete child universe, canonical
  source, or disjoint hierarchy without matching server-owned immutable
  privacy context
- **THEN** those assertions SHALL confer no disclosure authority
- **AND** the domain SHALL remain storage-only and HOLD

#### Scenario: Cross-measure equation is undeclared

- **WHEN** cells with different measure names are algebraically related but no
  complete privacy equation domain declares that relationship
- **THEN** every affected numeric disclosure SHALL HOLD
- **AND** splitting measures across query families SHALL NOT bypass the policy

#### Scenario: Alternate alias targets the same privacy population

- **WHEN** source, vendor, measure, or identifier aliases target the same
  privacy population and window
- **THEN** they SHALL resolve to one stable server-owned privacy slot
- **AND** an alias SHALL NOT create a fresh disclosure family
- **AND** organization-wide opaque contribution claims SHALL prevent the same
  canonical contribution from being released through a different slot

### Requirement: Complementary Suppression Is Value Independent

No observable response set SHALL permit recovery of a held child from a parent
total, sibling values, hidden cardinality, evidence metadata, or derived
pattern.

#### Scenario: Parent contains a suppressed child

- **WHEN** any atomic child in a hierarchy is suppressed, unknown, ambiguous,
  or storage-only
- **THEN** every dependent parent total SHALL be null, omitted, or held
- **AND** changing only the held child's exact value SHALL NOT change any
  observable response transcript

#### Scenario: Hierarchy axes are not proven disjoint

- **WHEN** team, role, or another cross-cutting axis could cover the same
  population
- **THEN** those axes SHALL be evaluated as separate partitions
- **AND** overlapping atomic lineage SHALL prevent alternate axes or sources
  from releasing separate caller-composable marginals

#### Scenario: Caller supplies parent and children

- **WHEN** a caller-supplied parent collides with server-derived children for
  the same release family
- **THEN** the family SHALL HOLD or reject as ambiguous
- **AND** neither the supplied nor recomputed parent SHALL disclose

### Requirement: Repeated And Temporal Queries Do Not Create New Equations

The system SHALL permit only value-equivalent replay of an already admitted
privacy equation domain. A server-owned receipt containing the domain/family
fingerprint, atomic-lineage fingerprint, public projection hash, fixed window,
canonical-contribution fingerprint, release version, and decision SHALL be
committed atomically with the admitted projection and opaque contribution
claims. Partial replacement, changed replay, mixed-source composition, and
overlapping or adjacent-window equations SHALL fail closed.

The journal SHALL be organization-wide, durable across restart, shared by all
authorized principals/processes/import modes, and transactionally serialize
compare, decision, version, and projection commits. The stable privacy slot
SHALL exclude mutable values and submitted membership; a separate canonical
content fingerprint SHALL cover ordered membership, values, lineage, source,
window, exact slice identity, and the public projection.

#### Scenario: Identical replay is stable

- **WHEN** the same complete family is imported or queried again without any
  value, membership, lineage, source, or window change
- **THEN** its disclosure decision and observable projection SHALL be
  byte-stable

#### Scenario: Partial or changed replacement follows disclosure

- **WHEN** a later import changes or omits any member of an already released
  family
- **THEN** the family SHALL become non-disclosable or the write SHALL conflict
- **AND** no new parent total SHALL coexist with stale sibling cells

#### Scenario: Concurrent or cross-worker replacement is attempted

- **WHEN** conflicting direct, connector, worker, process, or principal
  candidates target the same stable privacy slot
- **THEN** the durable journal SHALL serialize them
- **AND** at most one exact content fingerprint MAY affect disclosure history
- **AND** journal unavailability or transaction failure SHALL HOLD

#### Scenario: Adjacent or overlapping comparison lacks proof

- **WHEN** a query or derived consumer requests adjacent, rolling, overlapping,
  or multiple windows
- **THEN** numeric values, exact counts, trends, and derived patterns SHALL
  remain null, empty, or held unconditionally in Slice C
- **AND** only a later separately governed comparison contract MAY relax the
  hold

#### Scenario: Alternate fixed temporal grid is requested

- **WHEN** individually fixed windows use another width, granularity, union,
  order, or time-advanced moving boundary in the same privacy domain
- **THEN** the alternate numeric equation SHALL HOLD
- **AND** one fixed window on the server-approved non-overlapping grid SHALL be
  the only Slice C numeric release candidate
- **AND** changing slot, lineage, source, axis, grid, or contribution
  membership SHALL NOT create a second release for the same exact
  workflow/JBTD/persona slice

### Requirement: Exact Aggregate Slices Remain Independent

Workflow aggregates SHALL be evaluated independently by exact non-null
`(workflow_id, jbtd_id, persona_id)` tuple and unique opaque server-side
contribution token. The token SHALL be stable and canonical for the same
underlying contribution across direct/connector modes, source/vendor aliases,
caller identifiers, retries, workers, restarts, and replay.

#### Scenario: Same workflow has multiple slices

- **WHEN** otherwise matching records differ by JBTD or persona
- **THEN** each exact tuple SHALL receive an independent decision
- **AND** volume or disclosure from one tuple SHALL NOT rescue another

#### Scenario: Duplicate execution is repeated

- **WHEN** an opaque contribution token is missing or appears more than once in
  a candidate slice
- **THEN** duplicates SHALL NOT count toward the fixed cohort gate
- **AND** ambiguity SHALL fail closed
- **AND** the server SHALL NOT mint a fresh token for each representation
- **AND** the token SHALL NOT appear in public output or become a person
  identifier

#### Scenario: One contribution has alternate representations

- **WHEN** direct, connector, alias, retry, worker, restart, or caller-ID
  variants represent the same underlying contribution
- **THEN** they SHALL resolve to one canonical token or the domain SHALL HOLD
- **AND** five representations of one contribution SHALL NOT satisfy the
  existing cohort gate

### Requirement: Suppressed Aggregate Responses Expose No Exact Hidden Values

A suppressed or held response SHALL NOT expose aggregate values, cohort sizes,
evidence identifiers, original counts, exact allowed/suppressed splits, or
hidden-value-dependent result counts.

#### Scenario: Suppressed response is queried with debug-style filters

- **WHEN** an authorized caller requests suppressed rows, narrow siblings,
  parent groups, or alternate source modes
- **THEN** the response SHALL retain only value-independent suppression posture
- **AND** no filter combination SHALL expose a complementary equation

#### Scenario: Hidden dataset variants are transcript-compared

- **WHEN** two datasets differ only in a held value, held membership, or
  sub-threshold contribution count
- **THEN** authorized-caller transcripts SHALL be equivalent after normalizing
  only explicitly enumerated volatile transport fields
- **AND** status, body, ordering, import receipt, pagination/cursor, cache,
  audit/readback, debug, and derived-consumer surfaces SHALL NOT encode the
  difference
