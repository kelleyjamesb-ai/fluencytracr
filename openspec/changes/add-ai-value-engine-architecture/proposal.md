# Change: Phase 0 — AI Value Engine architecture decision

## Why

The AI Value Intelligence V1 spine (MVP Phases 0–13) is complete locally, but
its logic lives in disconnected pieces: per-phase JSON Schemas under
`schemas/ai-value-intelligence/`, standalone Node validators and generators
under `scripts/` (`validate_ai_value_*.mjs`, `generate_ai_value_*.mjs`), the
agent handoff harness, and the React `AIValueWorkspace`. The architecture doc
([docs/concepts/AI_VALUE_PLATFORM_ARCHITECTURE.md](../../../docs/concepts/AI_VALUE_PLATFORM_ARCHITECTURE.md))
names a "Canonical Object Layer" as the platform spine but never decides where
it lives, so each consumer re-implements object loading, validation ordering,
and governance gating. Before any Phase 1 implementation work, the project
needs one recorded architecture decision: what the AI Value Engine is, where
its boundary sits, and what every consumer must delegate to it.

## What Changes

- Record the Phase 0 architecture decision: the AI Value Engine is a single
  local, deterministic module that owns the canonical AI value object spine
  (Blueprint → Metrics Library → Value Scenario → Evidence Readiness → Claim
  Boundary → Executive Packet) and its governance gates; validators, the agent
  harness, and the workspace UI become thin consumers of that engine.
- Add a docs-only AI Value Engine boundary contract under
  `docs/concepts/` defining the engine surface: object validation, pipeline
  ordering, fail-closed governance invariants, and deterministic local
  execution with no network or runtime services.
- Add the `ai-value-engine` capability spec deltas codifying the engine
  contract that later phased changes implement.
- Defer all consolidation/implementation work to a follow-up Phase 1 change
  (`add-ai-value-engine-core`); this change moves no code and changes no
  runtime behavior.
- Non-goals (unchanged boundaries): no production connectors, no customer
  telemetry, no APIs, no storage, no canonical events, no suppression reasons,
  no ROI calculation, no causality claims, no productivity measurement, no
  individual scoring, no HR analytics, no ranking, no customer-facing economic
  output.

## Impact

- Affected specs: `ai-value-engine` (new capability; ADDED requirements only).
- Affected code: none in this change. Future consumers identified for the
  Phase 1 migration plan: `scripts/validate_ai_value_blueprint.mjs`,
  `scripts/validate_ai_value_metrics.mjs`,
  `scripts/validate_ai_value_scenario.mjs`,
  `scripts/validate_ai_value_agent_harness.mjs`,
  `scripts/validate_ai_value_readiness.mjs`,
  `scripts/validate_ai_value_claim_boundary.mjs`,
  `scripts/generate_ai_value_executive_packet.mjs`,
  `scripts/generate_ai_value_support_pack.mjs`,
  `frontend/src/pages/AIValueWorkspace.tsx`.
- Affected docs: `docs/concepts/AI_VALUE_PLATFORM_ARCHITECTURE.md` gains a
  resolved-decision pointer; new `docs/concepts/AI_VALUE_ENGINE_CONTRACT.md`.
