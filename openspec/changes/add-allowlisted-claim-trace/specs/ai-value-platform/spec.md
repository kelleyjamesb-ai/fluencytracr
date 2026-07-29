## ADDED Requirements

### Requirement: Binding-addressed allowlisted canonical claim trace

The system SHALL expose one read-only canonical claim trace only at
`GET /api/v1/ai-value/claim-trace/:bindingId`. `bindingId` SHALL match exactly
`canonical_identity_binding_<64 lowercase hexadecimal characters>` and select
only an exact current canonical identity binding. The system SHALL return only
the fixed allowlisted aggregate projection.

#### Scenario: Current exact binding authorizes a trace

- **WHEN** an ADMIN or ENABLEMENT_LEAD supplies a `bindingId` matching
  `canonical_identity_binding_<64 lowercase hexadecimal characters>` for an
  exact current binding at `GET /api/v1/ai-value/claim-trace/:bindingId`
- **THEN** the system revalidates hypothesis, measurement, evidence, policy,
  claim, binding, attestation, renderer, and current source heads
- **AND** returns `FT_CANONICAL_CLAIM_TRACE_V1` with `trace_state: AUTHORIZED`

#### Scenario: Any lookup or authority failure holds without an oracle

- **WHEN** authenticated `bindingId` input is malformed, missing, foreign,
  stale, revoked, tampered, cross-spliced, substituted, or changes before
  final projection
- **THEN** the system returns the byte-identical fixed `HOLD`
- **AND** exposes no cause-specific diagnostic

### Requirement: Claim trace preserves governed exclusions

The canonical claim trace SHALL be read-only and aggregate-only. It SHALL NOT
expose identifiers, commitments, hashes, MACs, attestations, journal data,
raw events, prompts, transcripts, emails, names, secrets, source payloads,
HTML, generic stored objects, mutation hints, or customer-facing output.
It SHALL create no mutation, database migration, persistence type, canonical
event, suppression reason, threshold, or override. `HOLD` SHALL be a transport
state and not a suppression reason.

#### Scenario: Poisoned source material cannot enter the projection

- **WHEN** a verified source or validation envelope contains an identifier,
  commitment, person-shaped value, raw material, secret, or arbitrary field
- **THEN** the response builder projects only its strict allowlisted fields
- **AND** the value SHALL NOT appear in either `AUTHORIZED` or fixed `HOLD`

### Requirement: Legacy readout is non-authoritative compatibility behavior

The system SHALL demote generic packet selection and legacy HTML from canonical
claim-trace authority. The legacy HTML path MAY remain for compatibility but
SHALL be read-only, retain fail-closed behavior, send fixed deprecation and
non-authoritative headers, and SHALL NOT redirect to or claim equivalence with
the JSON trace.

#### Scenario: Legacy packet cannot select a canonical trace

- **WHEN** a caller supplies or selects a generic executive packet
- **THEN** the packet SHALL NOT select or authorize a canonical claim trace
- **AND** only the exact current canonical identity binding MAY enter trace
  revalidation
