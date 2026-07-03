# FluencyTracr UI → Figma Design Brief

**Date:** 2026-06-27
**Audience:** AIOMs, value-realization PMs, CIOs
**Product posture:** Value realization and governed aggregate evidence — not fluency scoring, not surveillance, not customer-facing ROI.

---

## 1. What changed in the recent UI/UX push

The latest frontend work (Jun 23–27, 2026) clusters around the **AI Value Platform spine** rather than the legacy fluency dashboard.

| Commit / slice | What shipped |
| --- | --- |
| `1a6042da` — Polish AI value report workspace UI | Major `AIValueWorkspace.tsx` refresh (+712 lines): multi-page workspace IA, executive readout preview, sponsor decision loop, expanded `styles.css` dark executive shell |
| `8f572829` / `b32e56f9` — AI value UI view model adapter | `aiValueUiViewModelAdapter.ts` centralizes visibility gates; `AiContributionReportingSpinePanel` surfaces measurement journey status, held requirements, and blocked language without recomputing adapter state |
| `5b5869e8` — Governed customer data model projection | Customer evidence status panel wiring in workspace (aggregate-only, caveated labels) |
| `5a3537c3` — Rename LearnAIR → FluencyTracr | Package/branding alignment; no semantic UI change |
| Earlier spine (Jun 11–12) | `/ai-value-journey`, `/ai-value-workspace/*` pages, `/ai-value-readout` prototype, evidence case panel, journey rail |

**UX patterns established:**

- **Dark executive shell** (`.ai-value-shell`): navy gradient `#090c14` → panels `#111a2a` / `#15233a`, high-contrast ink `#eef3fb`, muted copy `#b8c3d7`
- **Lime CTA accent** `#D8FD49` on primary actions (Open Workspace, refresh)
- **Status pills** with `good` / `warn` / `neutral` tones — never probability scores or dollar amounts
- **Next-action banner** — single governed “what to do next” above the fold
- **Context bar** — workflow, value route, evidence posture, financial-claim boundary (blocked by default)
- **Reporting spine panel** — adapter-driven sections that appear only when `can_show_*` flags allow; explicit “not yet evidence” and “held boundaries” lists
- **Warm governance concept** (`GovernanceConcept` at `/`): cream `#F6F3EB`, Glean-inspired primary `#343CED`, dark sidebar — separate visual lane from AI Value workspace

**Governance constraints reflected in UI (must carry into Figma):**

- No ROI numbers, EBITDA, or customer-facing economic output unless labeled **Blocked (mock)** or **Held**
- No individual scoring, manager/team ranking, or person-level fields
- Default verdict posture: **SUPPRESS / Held** until evidence gates clear
- Caveated language only for outcome movement; causality and productivity claims blocked

---

## 2. Frontend architecture summary

| Layer | Location | Notes |
| --- | --- | --- |
| Routing | `frontend/src/main.tsx` | Protected routes; default landing is `GovernanceConcept` (`/`, `/governance`); AI Value at `/ai-value-journey`, `/ai-value-workspace/:page`, `/ai-value-readout` |
| Pages | `frontend/src/pages/` | `AIValueWorkspace`, `AIValueJourney`, `AIValueReadoutPrototype`, `GovernanceConcept`, `AIValueDiscovery`, `MethodologyReviewWorkspace` |
| Components | `frontend/src/components/` | `AiContributionReportingSpinePanel`, `AiValueJourneyRail`, `ValueEvidenceCasePanel`, `ExecutiveReadoutPreviewPanel`, `SponsorDecisionLoopPanel`, governance concept set |
| State / API | `frontend/src/hooks/`, `frontend/src/lib/` | `useAiValueWorkspace`, `useAiValueJourney`, `aiValueApi`, `aiValueUiViewModelAdapter`, `aiValueContributionReportingSpine` |
| Tokens | `frontend/src/styles.css`, `frontend/src/lib/visualTokens.ts`, `frontend/tailwind.config.ts` | CSS variables for brand + posture; Tailwind extends posture/tint/pattern colors; DM Sans + Fira Code fonts |
| Styling approach | Plain CSS classes (not Tailwind-in-JSX for AI Value shell) | Large `styles.css` with `.ai-value-*` and `.gc-*` namespaces; component-scoped patterns |

**Primary user-facing surfaces (design priority):**

1. **Value Journey** (`/ai-value-journey`) — whole-system spine, phase progress, reporting spine
2. **AI Value Workspace** (`/ai-value-workspace/*`) — 7-step operator/sponsor flow: Blueprint → Fluency Baseline → Sources → Behavior/VBD → Metrics → Checkpoint → Executive Report
3. **Executive Readout prototype** (`/ai-value-readout`) — static governed packet: VBD posture, outcome evidence, financial claim gate, EBITA bridge status (held), blocked claims
4. **Governance Concept** (`/governance`) — org signal health, hero actions, document workspace (warm editorial lane)

---

## 3. Figma deliverable

**File:** [FluencyTracr Value Realization UI](https://www.figma.com/design/pwNcnlZTzdAp2dpebUyvHd)

| Screen frame | Intent | Status |
| --- | --- | --- |
| `01 — Value Journey Dashboard` | Executive overview: topbar, next-action banner, context bar, journey rail, reporting spine + summary cards | **In progress** — frame + tokens created; layout build paused at Figma MCP View-seat rate limit |
| `02 — Executive Readout` | Governed readout: VBD quadrant, outcome evidence (caveated), claim gate matrix, blocked outputs, next evidence actions | **Planned** — empty 1440×900 frame ready |

**Design system foundations created in file:**

- Variable collection **FluencyTracr Tokens**: `color/primary` (#343CED), `color/cta` (#D8FD49), `color/bg-dark`, `color/surface`, `color/ink`, `color/ink-muted`, `color/border`, `color/warn`, `color/success`, `color/bg-warm`, `radius/md|lg`, `space/sm|md|lg`
- Typography target: **DM Sans** (matches `styles.css`)

**Recommended screen composition (to finish in Figma):**

### Screen 1 — Value Journey Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ AI VALUE PLATFORM                    [4/8 ready] [Refresh]  │
│ Value Journey                                               │
│ Acme Corp — readiness → governed readout                    │
├─────────────────────────────────────────────────────────────┤
│ NEXT ACTION: Approve metric selection draft    [Open Workspace]│
├─────────────────────────────────────────────────────────────┤
│ Workflow │ Value route │ Evidence posture │ Financial (blocked)│
├─────────────────────────────────────────────────────────────┤
│ ● Readiness → Blueprint → … → Readout  (journey rail)       │
├──────────────────────────┬──────────────────────────────────┤
│ Measurement story        │ Whole-system spine + progress    │
│ (reporting spine panel)  │ Evidence ladder summary          │
│ Adapter status grid      │ Milestone chips T0…T365          │
│ Held requirements        │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

### Screen 2 — Executive Readout

```
┌─────────────────────────────────────────────────────────────┐
│ EXECUTIVE READOUT (internal / prototype)                      │
│ Customer Support Resolution · Q1→Q2                           │
├──────────────────────────┬──────────────────────────────────┤
│ VBD posture map          │ Outcome evidence (CAVEATED)        │
│ FAST_BUT_SHALLOW         │ Resolution cycle time · Improved   │
├──────────────────────────┴──────────────────────────────────┤
│ Financial claim gate — all outputs BLOCKED                    │
│ ✗ Dollarized  ✗ ROI  ✗ EBITA bridge  ✗ Causality            │
├─────────────────────────────────────────────────────────────┤
│ Required caveats · Blocked claims · Next evidence actions     │
└─────────────────────────────────────────────────────────────┘
```

Reference implementations: `frontend/src/pages/AIValueJourney.tsx`, `AiContributionReportingSpinePanel.tsx`, `AIValueReadoutPrototype.tsx`.

Existing HTML prototypes for visual direction: `artifacts/ui-prototypes/dark-command/` and `artifacts/ui-prototypes/EXECUTIVE_SURFACE_DESIGN.md`.

---

## 4. Recommended next development steps

1. **Complete Figma screens** (requires Figma seat with higher MCP limit or manual finish): populate frames `01` and `02` using token bindings; componentize Pill, Panel, MapCell, JourneyStage, ClaimGateRow.
2. **Review with product** — confirm Value Journey vs Workspace Checkpoint as first implementation target.
3. **Implement Screen 1 in code** — extract repeated `.ai-value-*` patterns into React components matching Figma component names; wire existing `AiValueUiViewModelPanel` data without duplicating adapter logic.
4. **Add Storybook or visual regression** for dark shell + pill variants (optional, high value for executive polish).
5. **Do not implement** until promoted: customer-facing dollar output, confidence percentages, Bayesian posterior UI, live BigQuery connectors.

**Suggested first code slice:** Value Journey header + next-action banner + context bar as a single `ValueJourneyHero` component — smallest diff with highest executive impact.

---

## 5. Verification note

No code changes in this exploration slice. Figma file created under org drafts; partial automation blocked by View-plan MCP rate limit after token + frame setup.
