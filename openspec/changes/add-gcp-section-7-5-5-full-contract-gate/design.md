## Context

The immutable Section 7.5A registry remains open-blocking runtime truth. Its
merged descendants close only documentation interfaces and mechanism
contracts. This gate projects those facts without rewriting the registry.

## Goals / Non-Goals

- Goals: exact source pins, exact bidirectional edges, unique semantic-portion
  ownership, P17 machine-distinct queue proof, and total CLOSED-or-HOLD logic.
- Non-goals: runtime satisfaction, actual aliases or approvals, live evidence,
  Section 7.7/7.8 decisions, SUT implementation, GCP, deployment, or execution.

## Decisions

- Admit exactly five byte-pinned sources: Section 7.5A and Sections 7.5.1-7.5.4.
- Preserve all 20 registry rows and all forward/reverse edges byte-derived.
- Model shared prerequisites as uniquely named portions, each with one existing
  owner. Do not create a new integration authority.
- Treat P13's Section 7.7 decision portion as later blocking context; exclude
  P15/P16 entirely from Section 7.5 closure acceptance.
- Return `SECTION_7_5_CONTRACT_CLOSED` only for the exact predecessor decision
  tuple. Any predecessor HOLD, mismatch, missing input, or invalid projection
  deterministically returns HOLD with `authority_effect: NONE`.

## Migration Plan

None. This is docs/OpenSpec/offline verification only.
