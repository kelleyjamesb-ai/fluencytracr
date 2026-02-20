# Design: GSD Enablement Role View

## Context

Three role views drive the demo narrative. Exec and Operator are
substantive. EnablementView is one component + a stub. This closes it.
All data needed is already fetched elsewhere in the app.

## Goals / Non-Goals

- Goals: complete the three-role story; reuse existing API calls; no stubs
- Non-Goals: individual attribution; new backend endpoints; V2 LMS integration

## Decisions

- **Pass policies down from EnablementView** rather than fetching again
  in each sub-component. Single fetch, prop-drilled — acceptable at this
  component count; avoids three redundant network calls.
- **Compute hotspots client-side** — policy list is small (<100 items in
  any realistic org); no need for a dedicated ranking endpoint.
- **Reuse `RagChip` and `FreshnessChip`** already in `gsd/` — no new
  visual primitives.

## Risks / Trade-offs

- Controls endpoint may not return `training_attached` field — if absent,
  ReadinessCoverageCard should degrade to "coverage data unavailable"
  rather than 0%. Check field name against current API response before
  implementing task 2.2.

---

## Retrospective (V1 → Phase 2)

### What worked
- **Incremental slicing** — each phase had a tight scope and shipped
  without destabilizing prior work. Zero regressions across 228 tests.
- **Reusing existing endpoints** — policy KPI, control drift, and mode
  toggle all landed with no new backend surface. Fast and safe.
- **OpenSpec after the fact** — even retroactive proposals created useful
  spec truth. Worth formalizing earlier next time.

### What didn't
- **Phase 2 shipped before a proposal existed.** The four features were
  built in one commit without a spec. Worked out, but the approval gate
  exists for a reason — a breaking change here would have had no audit trail.
- **EnablementView was left as a stub for two phases.** The third role
  should have been scoped in V1.1 or Phase 2. Demo-readiness suffered.
- **Control drift used inline JSX** rather than a dedicated component.
  It lives inside OperatorView.tsx, making it harder to test in isolation.

---

## What I Would Refactor

### High priority
1. **Extract inline ControlDriftPanel** from `OperatorView.tsx` into
   `frontend/src/components/gsd/ControlDriftPanel.tsx`. Currently ~80
   lines of JSX embedded in the parent; should be a named component with
   typed props.
2. **Centralise policy + control fetches** into a `useGsdData()` hook.
   `ExecBoardView`, `OperatorView`, and `EnablementView` each fetch
   overlapping data independently. A shared hook with a simple cache
   (SWR or React Query) would eliminate ~3 duplicate fetch calls per
   page load and make loading states consistent.

### Medium priority
3. **Mode toggle state** is local to `OperatorView`. If the exec or
   enablement views ever need to reflect current mode, it will need to
   be lifted. Move to a lightweight context or Zustand slice now before
   it becomes a drilling problem.
4. **RAG chip colour logic** is duplicated between `RagChip.tsx` and
   inline styles in `ExecutiveHeatmapV1`. Single source of truth needed.

### Low priority
5. **`gsd-stub-card` CSS class** is used as a placeholder pattern but
   will leave visual debt if any stub survives to production. Add a
   lint rule or ESLint comment convention to catch it in CI.
