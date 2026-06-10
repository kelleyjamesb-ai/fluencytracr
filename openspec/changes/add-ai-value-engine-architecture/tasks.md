## 1. Phase 0 - Architecture decision artifacts (this change)

- [x] 1.1 Confirm the decision record in `design.md` with the human owner
      (engine boundary, placement deferral, behavior-preserving migration).
- [x] 1.2 Add `docs/concepts/AI_VALUE_ENGINE_CONTRACT.md` describing the
      engine surface: per-stage validation entries, pipeline ordering rules,
      fail-closed governance invariants, deterministic local execution, and
      explicit non-goals (no connectors, APIs, storage, ROI, causality,
      individual scoring, ranking, HR analytics, customer-facing economic
      output).
- [x] 1.3 Add a resolved-decision pointer in
      `docs/concepts/AI_VALUE_PLATFORM_ARCHITECTURE.md` (Canonical Object
      Layer section) linking to the contract doc and this change.
- [x] 1.4 Run the docs contract sweep / semantic drift guard used by this
      repo's verification gates over the new and edited docs.
- [x] 1.5 Run `npx openspec validate add-ai-value-engine-architecture --strict`
      and resolve any issues.

## 2. Follow-up phased changes (not in this change)

- [ ] 2.1 Scaffold `add-ai-value-engine-core` (Phase 1): create the engine
      module, migrate Blueprint validation behind it with CLI/tests unchanged.
- [ ] 2.2 Plan stage-by-stage migration changes for Metrics, Scenario,
      Readiness, Claim Boundary, Executive Packet, support pack, agent
      harness, and finally the workspace UI.
