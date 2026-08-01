## Context

The immutable Section 7.5A registry assigns persistence and anchor gaps to P04,
P10, P11, parts of P07, and the Section 7.5 mechanism portion of P19. This
slice owns only the three replay-retention P07 nodes. Network-local nodes are
already closed by Section 7.5.2; audit mapping remains later-owned.

## Goals / Non-Goals

- Goals: define one closed docs-only contract, synthetic vectors, offline
  verifier, and exact ownership projection for Section 7.5.3.
- Non-goals: runtime satisfaction, live GCP, credentials, provisioning,
  persistent resources, deployment, qualification, model execution, audit
  mapping, attempt or terminal-state semantics, or later-section activation.

## Decisions

- Preserve the 20-row Section 7.5A registry byte-for-byte and project
  ownership instead of rewriting historical rows, states, owners, or edges.
- Bind checkpoint lineage to one exact predecessor, adjacent sequence, and an
  authenticated current head under serializable single-successor concurrency.
- Represent immutable GCS retention with exact object-generation and policy
  bindings and no replacement; do not claim batch atomicity or mutable-latest
  discovery.
- Require a previously begun serializable Spanner read-write transaction.
  Resolve unknown commits by the exact idempotency-key reread and prohibit
  blind transport retry. Provider commit time is not a uniqueness key.
- Require a separately authenticated nonrollbackable currentness anchor with
  linearizable check-and-use, restore detection, and both recovery edges.
- Use exactly three synthetic replay-retention phases. Synthetic records close
  shape only and remain separate from empty runtime evidence registries.
- Reuse the descriptor-relative no-follow loader so explicit source locators
  reject symlinks, nonregular files, duplicate keys, and source-pin drift.

## Risks / Trade-offs

- Structural vectors could be mistaken for live proof. Authority is `NONE`, all
  runtime registries are empty, and the decision is explicitly evidence-absent.
- Persistence retry language could trespass into Section 7.6. This contract
  covers only provider-transport duplicate prevention; it explicitly rejects
  attempt reservation, consumption, retry eligibility, tokens, and terminal
  state or precedence.
- An immutable object alone does not establish currentness. The independent
  nonrollbackable anchor and exact checkpoint lineage remain separate required
  records.

## Migration Plan

No migration exists. This is a docs/OpenSpec/offline-verifier contract only.

## Open Questions

None inside this bounded slice. Runtime evidence and actual mechanisms require
separate future authority.
