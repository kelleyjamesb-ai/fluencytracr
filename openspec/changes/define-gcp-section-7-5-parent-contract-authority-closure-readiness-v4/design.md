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
- The independent oracle uses the packet's fixed precedence. It shares no
  decision helper with a future evaluator and records command exit separately
  from disposition.

## Boundaries

The packet preserves the five-project, fourteen-role, sixteen-capability, and
two-HSM-purpose ceilings. Current parent owners and later-section owners remain
unchanged. All P00-P19 prerequisites are `OPEN_BLOCKING`; no structural
signature or internally consistent hash authenticates a parent or closes an
obligation.

## Risks and mitigations

- Dynamic evidence must not be frozen: later tests generate it per run.
- A descriptor number must not become an answer key: metamorphic cases vary it
  and use opposing semantics at one normalized value.
- Compactness must not hide coverage: later builders mechanically reconcile
  parent and closed dynamic paths to templates, oracle precedence, attacks, and
  all environment cells.
