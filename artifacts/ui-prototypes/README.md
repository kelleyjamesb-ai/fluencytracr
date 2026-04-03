# Executive UI prototypes (Phase 1)

Static HTML/CSS directions for an **executive-facing** FluencyTracr shell, aligned with **Glean brand** (colors + typography fallback). Same content skeleton in each folder so you can compare apples to apples. Copy is **aggregate and governance-safe** (aligned with product guardrails: signals, not surveillance; no person-level claims).

## Glean branding (these prototypes)

Shared tokens live in [`glean-brand.css`](./glean-brand.css):

- **Primary blue** `#343CED`, **CTA / bright green** `#D8FD49`, **oatmeal** `#F6F3EB`, **black** `#000000`, **white** `#FFFFFF`, **lavender surface tint** `#F0EFFF` — consistent with the app’s [`frontend/src/styles.css`](../../frontend/src/styles.css) “Glean-inspired” block and [Glean brand resources](https://www.glean.com/brand-resources).
- **Type:** **DM Sans** (Google Fonts) as the stand-in for **PolySans** where PolySans is not licensed; Glean documents DM Sans as a fallback in slide-style contexts.

Each page includes a **Glean · FluencyTracr** co-brand line. Official logos/wordmarks are **not** embedded here; use assets from Glean’s brand site for production.

## How to view

Open any `index.html` in a browser (double-click, or “Open with Live Server” if you use it). Fonts load from Google Fonts; network required on first view.

| Folder | Direction |
|--------|-----------|
| [light-editorial](./light-editorial/) | **Glean light** — oatmeal, primary blue, violet tints, lime micro-accent — editorial density |
| [dark-command](./dark-command/) | **Glean dark** — near-black shell, primary + lime accents — contrast / briefing room |
| [brand-forward](./brand-forward/) | **Glean brand-forward** — card chrome + gradient wash aligned to app tokens |
| [c-suite-prototype](./c-suite-prototype/) | **C-suite command (concept)** — Glean gap strip, org pulse numbers, CEO/CFO/CISO/CTO lenses (CSS tabs) |
| [EXECUTIVE_SURFACE_DESIGN.md](./EXECUTIVE_SURFACE_DESIGN.md) | **Design brief** — repo-grounded IA, API mapping, Glean gap narrative, build-next steps |

---

## Surface audit (current app vs. exec demo)

What stakeholders see today in roughly five minutes, and why it feels **engineering-first** rather than **board-ready**.

| Surface | Files | Issue for “executive” |
|---------|--------|------------------------|
| **Login** | [`frontend/src/pages/Login.tsx`](../../frontend/src/pages/Login.tsx), `.auth-*` in [`frontend/src/styles.css`](../../frontend/src/styles.css) | “Internal Admin Beta” and compliance-admin framing. |
| **Home / shell** | [`frontend/src/pages/GovernanceConcept.tsx`](../../frontend/src/pages/GovernanceConcept.tsx) | “Session Controls (Temporary)” is above the fold; breaks narrative before the hero. |
| **Workspace panels** | [`frontend/src/components/governanceConcept/HeroActionWorkspace.tsx`](../../frontend/src/components/governanceConcept/HeroActionWorkspace.tsx) | Useful API-driven blocks; not yet a single polished “brief” story. |
| **Executive copy blocks** | [`frontend/src/components/governanceConcept/ExecutiveSignalHealth.tsx`](../../frontend/src/components/governanceConcept/ExecutiveSignalHealth.tsx) and related | Strong intent; visually tied to `.gc-*` system that mixes with dev chrome. |

**Constraint (do not violate in real UI):** Backend governance regression tests reject outputs/copy that imply **rankings, individual exposure, score-like or ROI/productivity framing**. See [`artifacts/fluencytracr-v1-governance-regression.md`](../fluencytracr-v1-governance-regression.md) and [`SCOPE_GUARDRAILS.md`](../../SCOPE_GUARDRAILS.md).

---

## Decision rubric

Score each prototype **1–5** (1 = weak, 5 = strong). Total optional; use scores to force a conversation, not a fake precision.

| Criterion | What to ask |
|-----------|-------------|
| **Trust / calm** | Does it feel like serious governance, not a growth dashboard or game? |
| **Scannability (30s)** | Can an exec grasp mode, posture, and “what to do next” without training? |
| **Distinctiveness** | Does it avoid generic “AI SaaS purple gradient” *unless* you explicitly want brand-forward? |
| **Fit: signal-not-facts** | Does the visual tone support directional, aggregate language (no implied precision scoring)? |
| **Implementation cost** | How much of [`frontend/src/styles.css`](../../frontend/src/styles.css) / Tailwind tokens would you replace or align? |

### When to pick which direction

- **Light editorial (Glean light)** — Default **Glean oatmeal** story: maximum **trust** with non-tech executives; matches partner positioning with Glean Work AI.
- **Dark command (Glean dark)** — **Briefing-room** or security-heavy audiences; still **on-palette** (blue + lime), not a third-party dark theme.
- **Brand-forward** — Closest to **shipping the React app** today: same tokens as `styles.css`, with **DM Sans** and co-brand strip for demos.

---

## Phase 2 — Demo data seeding (follow-up; not implemented here)

**Goal:** Non-empty governance panels for a local demo (e.g. timeline, compliance status).

**Persistence model (backend):**

- **PostgreSQL + Prisma** when `DATABASE_URL` is set — see [`backend/prisma/schema.prisma`](../../backend/prisma/schema.prisma) (`Organization`, `AuditEvent`, `PolicyDocument`, `ComplianceEvent`, etc.).
- **In-process store** in [`backend/src/store.ts`](../../backend/src/store.ts) — orgs and compliance events can live in memory; `hydrateOrgFromDatabase` in [`backend/src/app.ts`](../../backend/src/app.ts) loads org config from `AuditEvent` rows when the DB is available.
- Many **tests** use [`backend/tests/helpers/in-memory-dependencies.ts`](../../backend/tests/helpers/in-memory-dependencies.ts) — not the same as running the HTTP server with a full DB.

**Fixture sources to reuse conceptually:**

- [`backend/tests/fixtures/canonical-events.fixtures.ts`](../../backend/tests/fixtures/canonical-events.fixtures.ts) — pipeline / observability happy paths.
- [`backend/tests/governance/fixtures/governance.fixtures.ts`](../../backend/tests/governance/fixtures/governance.fixtures.ts) — org/workflow IDs and negative controls for governance API contracts.

**Suggested next implementation (after design lock):**

1. Document a **fixed demo `org_id`** (e.g. match frontend default `org-1` or a UUID created in seed).
2. Add a **script or npm task** that: creates `Organization` if missing, inserts **sequenced `AuditEvent`** (`org_config`, etc.) and **`ComplianceEvent`** rows (or uses existing POST routes if they already emit `recordComplianceEvent`), mirroring shapes the UI expects.
3. Alternatively, for a **no-DB** smoke demo, document running against a **test stack** that preloads in-memory data — only if such a dev entrypoint exists or is added.

Exact API shapes for the React hooks (`useHeroActionWorkspace`, etc.) should be verified against [`docs/api/API_REFERENCE.md`](../../docs/api/API_REFERENCE.md) before writing seed payloads.

---

## After you choose a direction

1. Promote **design tokens** (CSS variables or Tailwind `theme.extend`) to a single source of truth; align [`frontend/tailwind.config.ts`](../../frontend/tailwind.config.ts) with body font imports.
2. **Relocate or gate** session controls (`GovernanceConcept` session card) — e.g. `import.meta.env.DEV`, collapsed footer, or separate `/dev/session` route; never first for `EXEC_VIEWER`.
3. Restyle **login** and **governance shell** to match the winning prototype; keep data-fetching components, change layout/tokens only where needed.
