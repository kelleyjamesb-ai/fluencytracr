## Context

The Section 7.4 attestation contract authenticates and consumes an opaque
pre-execution record. It deliberately does not own the record schema,
reservation ordinal, or durable anti-replay transition. Section 7.6.1 must
define those inputs without claiming actual boot truth, terminal state, retry
eligibility, or runtime authority.

## Goals / Non-Goals

- Goals: byte-pin Sections 7.2 through 7.5 and the unique human queue row;
  close the plan, allocation, parent envelope, lineage, head, reservation,
  token-consumption, write-ahead, expected-request, and opaque record schemas;
  derive monotonic ordinals; require one atomic transition and exact readback;
  and expose only a nonauthorizing opaque record to Section 7.4.
- Non-goals: Section 7.4 acceptance issuance, actual boot/runtime attestation,
  terminal classification, retry eligibility, favorable-retry decisions,
  retry-token issuance, authority mutation, runtime/GCP/persistence
  implementation, model execution, qualification, or customer output.

## Decisions

- Admit exactly four compile-pinned contract byte resources: the Section 7.2
  runtime object, Section 7.3 security authority, Section 7.4 attestation and
  receipt contract, and Section 7.5 full closure. The last decision must equal
  `SECTION_7_5_CONTRACT_CLOSED`.
- Admit exactly one human-authored queue projection over `id`, `title`, `bound`,
  and `risk`; status may be `in_progress` or `done`. Queue bytes and status do
  not become runtime authority.
- Treat the parent attempt envelope, initial token, opaque retry authorization,
  and current family head as authenticated inputs. Their hashes are consistency
  nodes, not authenticity roots. Section 7.6.1 independently derives attempt
  and retry ordinals and rejects caller-selected identity, ordinal, or status,
  including JSON Boolean values in integer positions.
- For initial lineage, derive attempt ordinal `head.attempt + 1` and retry
  ordinal `0` from an authenticated empty head. For opaque retry lineage, derive
  both ordinals as the authenticated head value plus one; Section 7.6.1 does
  not decide whether a retry is favorable or issue its token.
- The canonical reservation key binds keyed tenant commitment, runtime profile,
  allocation incarnation, numerical body, plan, allocation, lineage, derived
  ordinals, parent envelope, expected-request lineage, and the single-use claim.
  No raw identifier is admitted.
- The modeled transaction reads the authenticated head, proves reservation and
  token absence, and atomically writes the reservation, token-consumption
  marker, write-ahead marker, new head, and expected-request link in that order.
  It commits, reads back exact bytes, and only then exposes the opaque record.
  An unknown commit performs same-reservation-key readback and never allocates
  a new ordinal.
- Section 7.6.1 binds only expected allocation/runtime identity. Section 7.4
  remains the owner of actual boot and runtime truth.
- The opaque record supplies the record-bound context, parent, single-use,
  authentication, freshness, single-use-verification, and approved-contract
  inputs required by Section 7.4. It never contains or issues
  `pre_execution_attempt_acceptance_hash`, Section 7.4 PASS booleans, a
  terminal state, retry eligibility, or authority mutation.
- Public projection is limited to opaque commitments and fixed decisions.
  Hashing never substitutes for authentication or anonymization.

## Risks / Trade-offs

- A self-consistent forged closure could pass if any candidate hash becomes a
  trust root. The readiness attacks reseal every attacker-owned descendant and
  require rejection against byte pins and authenticated anchors.
- A crash after commit could tempt a caller to allocate a second ordinal. The
  frozen unknown-commit rule permits same-key exact readback only.
- A one-process happy path could hide replay races. The test-owned stateful
  replay session and concurrency barrier prove duplicate and interleaved cases
  before the future verifier is loaded.

## Migration Plan

None. This task freezes OpenSpec/readiness evidence only. Any docs-contract or
offline-verifier implementation requires exact-packet CODE, BUG, and
ADVERSARIAL `READINESS_GO` first.
