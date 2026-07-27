## ADDED Requirements

### Requirement: Exact-Slice Outcome Evidence Admission Is Authoritative

The system SHALL evaluate Outcome Evidence admission through one fail-closed
policy that requires one exact non-empty `(workflow_id, jbtd_id, persona_id)`
tuple and exact canonical baseline and comparison observation windows.
Storage, replay, or human review SHALL NOT establish admission.

#### Scenario: Exact unambiguous pair is admitted

- **WHEN** baseline and comparison records carry the exact required tuple,
  exact required windows, and one unambiguous metric/unit/source identity
- **THEN** the policy SHALL admit that pair
- **AND** it SHALL emit only a bounded slice/window/source-evidence receipt

#### Scenario: Missing or cross-slice identity holds

- **WHEN** a candidate lacks a required join key or differs on workflow, JBTD,
  persona, baseline window, or comparison window
- **THEN** that candidate SHALL NOT enter an admitted pair
- **AND** another slice's volume or matching metric SHALL NOT rescue it

#### Scenario: Duplicate pair is ambiguous

- **WHEN** more than one baseline or comparison candidate exists for the same
  exact tuple, window, metric, unit, and source
- **THEN** the metric pair SHALL HOLD as ambiguous
- **AND** insertion order SHALL NOT select a winner

### Requirement: Storage-Only Compatibility Remains Non-Admissive

The existing aggregate Outcome Evidence ingestion and replay path SHALL
continue to store and replay legacy records with optional join keys, but SHALL
classify storage/replay as non-admissive until the exact-slice policy passes.
The system SHALL NOT infer or backfill missing slice identity.

#### Scenario: Legacy record remains readable but cannot attach

- **WHEN** a valid aggregate storage record omits JBTD or persona identity
- **THEN** storage and replay MAY succeed
- **AND** materialization, readiness attachment, model eligibility, and claim
  authorization SHALL remain held

#### Scenario: Legacy aggregate push remains storage-only

- **WHEN** a legacy aggregate push package omits both JBTD and persona
- **THEN** V3 and Outcome Evidence storage payloads MAY still be prepared
- **AND** the plan SHALL omit materialization rather than infer the missing
  exact slice
