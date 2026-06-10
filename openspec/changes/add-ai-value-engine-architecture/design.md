# Design — Phase 0: AI Value Engine architecture decision

## Context

MVP Phases 0–13 produced a complete local V1 spine for AI Value Intelligence:
JSON Schemas, seeded Customer Support fixtures, standalone `.mjs` validators
and generators with tests, a provider-neutral agent handoff harness, and a
local React workspace. The pieces share a conceptual pipeline but no shared
implementation: each script loads schemas and fixtures independently, the
workspace re-describes the spine in frontend constants, and pipeline ordering
(an executive packet must come from a validated claim boundary, which must
come from a validated readiness decision, and so on) is enforced only by
convention and per-script checks.

The architecture doc defines six system layers and names the Canonical Object
Layer as "the platform spine," but leaves open where that layer lives and how
consumers reach it. This change resolves that as the Phase 0 decision of the
Value Engine track.

## Goals / Non-Goals

- Goals:
  - Record one durable architecture decision for the AI Value Engine boundary.
  - Define the engine surface that all spine consumers must delegate to.
  - Codify governance invariants (fail-closed, aggregate-only, blocked-claim
    propagation) as engine-level requirements rather than per-script habits.
  - Give Phase 1 (`add-ai-value-engine-core`) an unambiguous target and
    migration order.
- Non-Goals:
  - No code moves, refactors, or new runtime behavior in this change.
  - No new schemas, APIs, storage, canonical events, suppression reasons,
    connectors, dashboards, or customer-facing output.
  - No change to existing validator CLI behavior or npm commands.
  - No decision yet on Workbench UI architecture beyond "UI consumes the
    engine; it does not implement value logic" (already a guardrail).

## Decisions

- Decision: **The AI Value Engine is a single local, deterministic library
  module that owns the canonical object spine and its governance gates.**
  Validators/generators under `scripts/`, the agent handoff harness, and the
  workspace UI are thin consumers. The engine owns: schema validation per
  object type, pipeline ordering (a stage refuses input that has not passed
  upstream validation), claim-state and blocked-claim enforcement, and
  suppression propagation. The engine runs with no network access and no
  runtime services; given the same input objects it produces the same
  decisions.
- Decision: **Engine placement: a dedicated local module, not `backend/` and
  not `frontend/`.** Target location is decided in Phase 1 (leading candidate:
  `shared/` so TypeScript consumers and Node scripts both reach it), but the
  boundary decided now is placement-independent: nothing imports schema files
  or re-implements spine validation outside the engine once migration
  completes.
- Decision: **Migration is incremental and behavior-preserving.** Each
  existing `.mjs` validator keeps its CLI contract and tests while its logic
  moves behind the engine, one phased change per stage, starting from the
  upstream end of the spine (Blueprint) so ordering enforcement composes as it
  lands.
- Alternatives considered:
  - *Status quo (standalone scripts forever):* lowest effort, but every new
    stage re-implements loading/validation/governance and drift between the
    scripts, harness, and UI is already visible; rejected.
  - *Backend service:* contradicts the docs-first, local, no-runtime-services
    boundary the whole track depends on; rejected for V1.
  - *UI-embedded logic:* violates the existing guardrail that the workbench
    must not implement value logic in React components; rejected.

## Risks / Trade-offs

- Risk: consolidation quietly changes validator verdicts. → Mitigation:
  migration is behavior-preserving per stage; existing `.mjs` tests are kept
  and must pass unchanged before a stage's logic is considered moved.
- Risk: the engine becomes a kitchen sink (intake adapters, libraries, UI
  state). → Mitigation: the engine owns only the canonical object layer and
  governance gates; intake adapters, library content, and UI remain separate
  layers per the architecture doc.
- Risk: deciding placement too early. → Mitigation: this change fixes the
  boundary and contract only; placement is a Phase 1 decision with the
  contract as the acceptance test.

## Migration Plan

1. Phase 0 (this change): decision record, engine boundary contract doc, spec
   deltas. No code changes; rollback is deleting the change directory.
2. Phase 1 (`add-ai-value-engine-core`): create the engine module, move
   Blueprint validation behind it, keep CLI/tests unchanged.
3. Phases 2+: migrate Metrics, Scenario, Readiness, Claim Boundary, Executive
   Packet, support pack, and the agent harness stage by stage; then point the
   workspace UI at engine-derived state.
4. Archive each phased change only after its stage's existing tests pass
   against the engine-backed path.

## Open Questions

- Should the engine expose a single `runSpine(objects)` pipeline entry in
  addition to per-stage entries, or per-stage only in Phase 1?
- Should the Process/Metrics libraries be seeded catalogs the engine reads, or
  inputs the caller supplies (open question 1–2 from the architecture doc)?
- Does the agent handoff harness validate through the engine in Phase 1, or
  after the six spine stages migrate?
