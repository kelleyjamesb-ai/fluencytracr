## Context

This preimplementation packet implements the approved Rule-Ledger V4 design.
It is a compact source for later test-only builders and oracles, not a runtime
contract or a system under test.

## Decisions

- The packet pins only the protocol and five current-main parent identities;
  it does not copy parent bytes, a signature, envelope hash, generated ledger,
  filesystem locator, or answer-key input.
- Public candidate, signed-context, bundle, and result domains are closed.
  All public strings are exact enums, hash/fingerprint/time forms, member
  names, governed role keys, or context-bound synthetic aliases.
- A future evaluator receives a harness-admitted final directory descriptor;
  no locator field is present. Future structural signatures use an out-of-band,
  harness-owned ephemeral P-256 anchor and remain `HOLD` for HSM and production
  authority.
- Structural signatures use the versioned
  `GCP_SECTION_7_5_1_SIGNATURE_PROJECTION_V1` preimage:
  `FLUENCYTRACR:GCP_SECTION_7_5_1_SIGNED_CONTEXT:V1 || 0x00 ||
  canonical(payload without key_id)`. The excluded `key_id` is acceptance-bound
  to the exact `P256_SPKI_SHA256` fingerprint of the out-of-band admitted SPKI;
  it cannot select or substitute the verifier anchor.
- The independent oracle uses the packet's fixed precedence. It shares no
  decision helper with a future evaluator and records command exit separately
  from disposition.
- The packet enumerates every permitted decision/reason/claim-grade tuple.
  Oracle projection is a lookup in that closed mapping; arbitrary reasons or
  mismatched decision/claim-grade combinations are invalid.

## Boundaries

The packet preserves the five-project, fourteen-role, sixteen-capability, and
two-HSM-purpose ceilings. Current parent owners and later-section owners remain
unchanged. All P00-P19 prerequisites are `OPEN_BLOCKING`; no structural
signature or internally consistent hash authenticates a parent or closes an
obligation.

The Section 7.3 controller oracle retains declared cycles through the least
fixed point, derives every role's transitive upstream controller set including
the role alias itself, and then enforces the exact parent-declared forbidden
pair set. Unknown or unviewable edges still `HOLD`; malformed graphs,
cross-object pair splices, or any forbidden upstream intersection reject.

## Risks and mitigations

- Dynamic evidence must not be frozen: later tests generate it per run.
- A descriptor number must not become an answer key: metamorphic cases vary it
  and use opposing semantics at one normalized value.
- Compactness must not hide coverage: later builders mechanically reconcile
  parent and closed dynamic paths to templates, oracle precedence, attacks, and
  all environment cells.
