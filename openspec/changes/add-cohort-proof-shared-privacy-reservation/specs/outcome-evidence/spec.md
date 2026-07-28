## ADDED Requirements

### Requirement: Two-Window Cohort Equality Proof Is Authenticated And Aggregate

The system SHALL accept a two-window cohort-equality proof only from an exact
organization-bound producer authority whose integrity, policy version,
validity, expiry, and revocation posture verify mechanically. The producer
SHALL compute population equality inside the customer boundary and SHALL NOT
transmit or persist member handles, member hashes, raw rows, or signing keys.
The producer SHALL sign with an Ed25519 private key that never crosses the
customer boundary; FluencyTracr SHALL retain only an immutable public-key epoch
and append-only revocation state. Authority versions SHALL increase strictly,
validity windows SHALL NOT overlap, and only the one epoch active at database
decision time SHALL verify.

#### Scenario: Authenticated exact proof verifies

- **WHEN** an active organization-bound producer signs one aggregate proof
  whose baseline and comparison commitments match, local cardinalities match
  both evidence cohort sizes, and every policy and validity check passes
- **THEN** the verifier MAY admit the proof to the C.0 reservation transaction
- **AND** only the aggregate signed proof SHALL cross the customer boundary
- **AND** the raw proof and population commitment SHALL NOT be persisted

#### Scenario: Producer authority is unavailable or invalid

- **WHEN** the key is unknown, missing, fingerprint-mismatched, expired,
  revoked, policy-mismatched, outside its validity interval, or the signature
  is invalid
- **THEN** the proof SHALL `HOLD`
- **AND** no caller assertion or matching cohort count SHALL substitute

#### Scenario: Populations or counts differ

- **WHEN** the local baseline and comparison population commitments differ,
  either member set contains duplicates, or either cardinality differs from
  its exact evidence cohort size
- **THEN** the producer SHALL emit no positive proof
- **AND** FluencyTracr SHALL receive no member-level diagnostic material

#### Scenario: Backend verification state is compromised

- **WHEN** a party obtains FluencyTracr's public verification key and authority
  rows without the customer-held Ed25519 private key
- **THEN** it SHALL NOT be able to manufacture a valid producer proof
- **AND** cross-organization public-key reuse SHALL `HOLD`

#### Scenario: A signing authority rotates

- **WHEN** a newer producer epoch becomes active
- **THEN** the prior non-overlapping epoch SHALL be expired and SHALL `HOLD`
- **AND** a scheduled future epoch SHALL NOT supersede the current epoch before
  its immutable validity start

### Requirement: Proof Bytes Are Versioned And Unambiguous

The system SHALL use one shared, domain-separated, length-framed byte codec for
member sets, evidence, receipts, reservations, public-key fingerprints,
unsigned proofs, hashes, and signatures. Invalid Unicode, duplicate canonical
members, ambiguous framing, non-finite values, negative zero, non-canonical
timestamps, unknown fields, and unsupported JSON values SHALL `HOLD`.

#### Scenario: Ambiguous or reordered member inputs are compared

- **WHEN** member sets contain delimiter-looking values, ambiguous
  concatenations, duplicate byte strings, Unicode variants, or a different
  insertion order
- **THEN** published golden vectors SHALL prove byte-stable set ordering and
  unambiguous framing
- **AND** duplicates and invalid values SHALL emit no positive proof

### Requirement: Cohort Proof Binds Current Exact Evidence

The receiver SHALL reload current Outcome Evidence, recompute Slice B
admission inside the committing transaction, and require the proof to bind the exact admission receipt plus exact
baseline and comparison evidence content hashes, slice, metric, source, unit,
windows, and cohort sizes. The full admission SHALL contain exactly one
admitted pair and exactly one evidence ID in each window.

#### Scenario: Proof is copied to another evidence pair

- **WHEN** a real proof is attached to different evidence, a changed value,
  another receipt, another slice, another window, or an alternate
  metric/source/unit representation
- **THEN** the proof SHALL `HOLD`
- **AND** aliases, case changes, whitespace, or caller hashes SHALL NOT mint a
  valid replacement

#### Scenario: Admission has multiple eligible metric pairs or evidence IDs

- **WHEN** admission contains zero or more than one pair, or either window
  contains zero or more than one evidence ID
- **THEN** all pairs SHALL `HOLD` atomically
- **AND** iteration or insertion order SHALL NOT choose a winner

### Requirement: Cohort Proof Has No Downstream Authority

A verified C.0 proof or receipt SHALL have `claim_authority_effect: NONE` and SHALL
NOT authorize C.1 comparison release, claim language, model execution, ROI,
causality, productivity, prediction, ranking, or customer publication.

#### Scenario: Verified proof is presented to a downstream consumer

- **WHEN** a downstream caller presents a valid-looking C.0 receipt
- **THEN** the receipt alone SHALL confer no authority
- **AND** C.1 and Slice D SHALL remain independently fail-closed

#### Scenario: C.1 later consumes a C.0 journal

- **WHEN** C.1 cannot present the signed proof and expected exact
  organization/slice inside its release transaction and exactly reverify the
  current authority, server-owned C.0 journal, evidence/admission bindings,
  non-authorizing flags, and retained reservation owner
- **THEN** C.1 SHALL `HOLD`
- **AND** C.1 SHALL NOT mint a replacement owner or reservation
