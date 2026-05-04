# Executive surface redesign — design brief (repo-grounded)

This document **re-imagines** the FluencyTracr frontend as a **C-suite command surface**, aligned with **recent repo capabilities** (roughly: v1 ingest boundary, EvidenceBundle v1, observability executive boundary, Glean publisher + MCP pack, governance regression hardening) and **first principles**: aggregate signals, explicit suppression, no individual performance story.

**Companion artifact:** open [`c-suite-prototype/index.html`](./c-suite-prototype/index.html) in a browser (with [`glean-brand.css`](./glean-brand.css)) for a static visualization of the same ideas.

---

## 1. Why the current shell under-serves executives

The primary React route today emphasizes **governance concept + compliance** APIs (`compliance/status`, `compliance/events`) via [`useHeroActionWorkspace`](../../frontend/src/hooks/useHeroActionWorkspace.ts). That answers **“are controls mapped / what happened in the audit log?”** — essential for operators — but not **“what is our organizational AI fluency posture this quarter?”**

**Richer, exec-shaped contracts already exist** and should anchor the new UI:

| Contract | Role in exec story |
|----------|-------------------|
| **`GET /api/observability/:orgId`** | Workflow-level **volume** (`executions_*`), **disclosure** (`ALLOWED` / `SUPPRESSED`), **`pattern_distribution`** (five pattern counts). See [`ObservabilityResponseSchema`](../../shared/src/fluencyTracrSchemas.ts). |
| **`GET /api/evidence/bundles|coverage|controls/:orgId`** | **EvidenceBundle-shaped** org snapshots: `EvidenceStatus` per signal, suppression object, **coverage** (`instrumented_sources` / `missing_sources`). See [`evidence-bundle/v1/README.md`](../../docs/contracts/evidence-bundle/v1/README.md). |
| **`GET /api/board-snapshot/:orgId`** | **Visibility** counts (`VISIBLE` / `NOT_ENOUGH_DATA_YET` / `NOT_SHOWN_SAFETY`) per workflow — exec-friendly “how much can we responsibly show?” |
| **Compliance APIs** (current hero) | **Policy/mode** narrative — stays in the stack but **below** or **beside** the fluency pulse, not alone above the fold. |

The **frontend file set** to evolve: treat [`GovernanceConcept.tsx`](../../frontend/src/pages/GovernanceConcept.tsx) as a **shell** that composes **(A) Glean gap + fluency pulse**, **(B) persona-focused strips**, **(C) governance depth**, not as the only story. Extend [`governanceApi.ts`](../../frontend/src/lib/governanceApi.ts) (or a sibling `executiveApi.ts`) to call observability + evidence + board-snapshot with the same auth headers.

---

## 2. How FluencyTracr fills a gap **in Glean** (demo this explicitly)

**What Glean is brilliant at:** making work **faster** — search, assistants, copilots, agents over **documents, tickets, CRM**, and connected apps. Executives experience Glean as **access, answers, automation**.

**What Glean is not (by design of this product):** a **system of record for organizational AI *fluency* evidence** — i.e. aggregate, governance-safe answers to:

- Are we seeing **calibrated** use vs **blind acceptance** vs **friction** vs **undertrust** at **workflow** scope?
- Where is evidence **suppressed** or **not computed**, and **why** (k-min, disclosure rules)?
- What is **instrumented** vs **missing** in our telemetry/coverage map?
- What **bounded evidence** can agents and leaders cite without scraping prompts or ranking people?

**FluencyTracr fills that gap** by:

1. **Ingesting** minimal, purpose-limited **metadata/events** (`/api/ingest`, MCP `fluency.ingest_events`) — not content surveillance.
2. **Computing** pipeline outputs with **hard executive boundaries** (recent governance/observability hardening in repo history).
3. **Publishing** **EvidenceBundle** documents **into Glean** (indexing contract in [`02-evidencebundle-to-glean-indexing.md`](../../docs/integrations/glean/02-evidencebundle-to-glean-indexing.md)) so fluency evidence is **discoverable where leaders already work**.
4. **Exposing** read tools (`fluency.get_evidence_bundle`, `get_control_evidence`, `get_coverage_map`) so **Glean-side agents** answer **approved question classes** with **suppression-safe** payloads ([`fluencytracr-mcp-server.md`](../../docs/mcp/fluencytracr-mcp-server.md)).

**One-line for slides:** *Glean accelerates work; FluencyTracr proves whether AI use is **safe, measured, and governable** — and puts that proof where Glean users can find it.*

**UI treatment:** a persistent **“Glean · FluencyTracr”** strip: left = what Glean delivers; right = what only FluencyTracr measures; center = arrow “Evidence flows into Glean search + agents”.

---

## 3. Imagined layout (single page, three bands)

### Band A — **Gap + trust** (15 seconds)

- **Dual headline** (non-technical): speed vs safety/evidence.
- **Three bullets** tied to real artifacts: ingest → bundles → Glean index fields (`suppression_applied`, `coverage_*`, status columns from [`02-evidencebundle-to-glean-indexing.md`](../../docs/integrations/glean/02-evidencebundle-to-glean-indexing.md)).
- **No fake ROI**; use **status** and **coverage** language from EvidenceBundle.

### Band B — **Org pulse** (numbers everyone shares)

Derived from observability (aggregated client-side or small backend rollup later):

- **Disclosed execution volume** (window) — “how much activity sits in the cohort we’re allowed to describe.”
- **Share disclosed vs suppressed** — transparency, not blame.
- **Pattern mix %** (five names) — only across **disclosed** workflows; same vocabulary as PRD.
- **Workflows visible vs withheld** — from `disclosure` row counts.
- **Board snapshot header** (optional second row): `visible` / `not_enough_data_yet` / `not_shown_safety` from [`BoardSnapshotResponseSchema`](../../shared/src/fluencyTracrSchemas.ts).

Every metric: **tooltip** “Reflects / Does not mean” (reuse patterns from [`governanceConcept.ts`](../../frontend/src/constants/governanceConcept.ts)).

### Band C — **Persona lenses** (same data, different emphasis)

Not different databases — **different framing** of the same aggregates:

| Persona | Job to be done | Primary widgets (from real fields) |
|--------|----------------|-------------------------------------|
| **CEO** | Strategic posture & narrative for board | Pattern **mix** summary, **disclosure** coverage headline, “where we withhold and why” count |
| **CFO** | Economic prudence & risk of unmanaged AI | **Coverage gaps** (`coverage_missing_sources`), **shadow / unsanctioned** *status* fields from evidence index (risk framing, not productivity $) |
| **CISO** | Defensibility, audit, suppression honesty | **Suppression** reasons, compliance **mode**, event **timeline**, EvidenceBundle **suppression** object |
| **CTO** | Instrumentation & reliability | **Instrumented sources**, workflow **observability** table, MCP/ingest **health** (when wired), window selector |

### Band D — **Depth**

- Existing **governance workspace** (policies, mode change, timeline) as **accordion** or second tab “Governance operations.”

---

## 4. Interaction principles

- **Window** selector: same **`FluencyWindow`** tokens everywhere ([`01-overview.md`](../../docs/integrations/glean/01-overview.md)).
- **No leaderboard** of workflows by “badness”; sort **neutral** (e.g. `workflow_id`) or user-chosen **filter**, never default “worst first.”
- **Drill-down** stops at **workflow / org aggregate** — no person row.
- **“Show withheld”** toggle educates on k-min and disclosure.

---

## 5. What to build next (engineering)

1. Add API clients for **`/api/observability/:orgId`**, **`/api/board-snapshot/:orgId`**, and **evidence bundle** (read-only) to the frontend with existing auth.
2. Implement **org-level rollups** for pattern mix and execution totals (client-side sum is acceptable for v1).
3. Refactor **`GovernanceConcept`** into sections matching Bands A–D; move **session controls** behind dev flag or footer.
4. Optional: publish **link-out** “View evidence in Glean” using doc title convention from indexing doc (future deep link).

---

## 6. Changelog awareness (why “think differently now”)

Recent integration work (see `git log` on your branch) expanded **Glean-facing** surfaces: **EvidenceBundle** contract discipline, **publisher** package, **MCP** tools with forbidden-field scans, **observability** executive boundary tests — the UI should **sell** those capabilities, not only legacy compliance cards.

This brief is the **intent**; the **c-suite-prototype** is the **sketch**. Iterate both as APIs and copy tighten.
