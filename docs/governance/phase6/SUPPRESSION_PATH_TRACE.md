# Phase 6 — Suppression Path Trace

**Scope:** All ingestion paths.
**Constraint:** Suppression must occur before persistence, caching, and logging.

---

## Ingestion Path Inventory

7 ingestion paths identified in `backend/src/app.ts`:

| # | Path | Method | Middleware Chain | Verdict |
|---|------|--------|-----------------|---------|
| 1 | `/api/v1/decision` | POST | rbac → forbiddenFields → Zod → evaluateDecision → surfaceDecision | **PASS** |
| 2 | `/api/v1/ingest` | POST | rbac → forbiddenFields → Zod → appendPhase1Events | **FAIL** |
| 3 | `/api/ingest` | POST | schemaVersion → forbiddenFields → ambiguity → 202 | **PASS** |
| 4 | `/api/events` | POST | rbac → schemaVersion → forbiddenFields → ambiguity → Zod → insertFluencyEvent | **PASS** (pre-persistence gates) |
| 5 | `/orgs/:orgId/groups` | POST | schemaVersion → forbiddenFields → Zod → upsertGroup | **PASS** (no suppression-relevant data) |
| 6 | Governance-suppressed endpoints (11 endpoints) | Various | schemaVersion → forbiddenFields → 404 | **PASS** (no data path exists) |
| 7 | `/api/orientation/:orgId` | GET | rbac → hardcoded SUPPRESSED | **PASS** |

---

## Path-by-Path Analysis

### PATH 1: `/api/v1/decision` — PASS

```
Request → forbiddenFieldsMiddleware → Phase1IngestPayloadSchema.safeParse
  → evaluateDecision(events) → surfaceDecision(decision) → Response
```

- **Suppression before persistence:** YES — evaluateDecision runs on in-memory events. No data is persisted to any store. The response contains only `{ decision }`.
- **Suppression before caching:** YES — No caching layer exists.
- **Suppression before logging:** YES — No event data is logged. Only the decision is returned.

### PATH 2: `/api/v1/ingest` — FAIL

```
Request → forbiddenFieldsMiddleware → Phase1IngestPayloadSchema.safeParse
  → appendPhase1Events(parsed.data.events) → 202 Accepted
```

- **FAILURE:** Events are appended to the in-memory `phase1Events` array BEFORE any suppression evaluation. `evaluateDecision()` is never called on this path.
- **Ambiguous events with `ambiguity_flag: true` are persisted as-is.**
- **Suppression before persistence:** NO.

### PATH 3: `/api/ingest` — PASS

```
Request → schemaVersionMiddleware → forbiddenFieldsMiddleware
  → ambiguityMiddleware → 202 Accepted
```

- **Suppression before persistence:** YES — ambiguityMiddleware rejects ambiguous payloads (400) before the handler runs. The handler itself does not persist data.
- **Forbidden fields rejected at middleware layer, before any handler logic.**

### PATH 4: `/api/events` — PASS (with caveat)

```
Request → rbacMiddleware → schemaVersionMiddleware → forbiddenFieldsMiddleware
  → ambiguityMiddleware → FluencyEventIngestSchema.safeParse → insertFluencyEvent
```

- **Suppression before persistence:** YES — forbiddenFields and ambiguity middleware run before Zod parse and `insertFluencyEvent`.
- **Caveat:** Events that pass all gates ARE persisted to `store.fluencyEvents`. The gates (forbidden fields, ambiguity) are the suppression mechanism.

### PATH 5: `/orgs/:orgId/groups` — PASS

- Group upserts contain org/team/role metadata. No behavioral signals, no suppression-relevant data.

### PATH 6: Governance-Suppressed Endpoints — PASS

11 endpoints return `404 "Governance suppressed"` after middleware:
- `/orgs/:orgId/metrics/import`
- `/orgs/:orgId/controls/import`
- `/orgs/:orgId/enablement/import`
- `/orgs/:orgId/behavior/import`
- `/orgs/:orgId/roster/import`
- `/orgs/:orgId/dashboard/overview`
- `/orgs/:orgId/dashboard/export.csv`
- `/orgs/:orgId/dashboard/export.pdf`
- `/orgs/:orgId/telemetry/index`
- `/orgs/:orgId/behavior/signals`
- `/orgs/:orgId/behavior/patterns`

No data path exists. Handlers are `(_req, res) => respondGovernanceSuppressed(res)`.

### PATH 7: `/api/orientation/:orgId` — PASS

- Observation state is hardcoded to `"SUPPRESSED"` (line 566 in app.ts).
- No data is read from stores. Response is constructed from constants.

---

## Legacy Suppression Functions — FAIL

| Function | File | Status |
|----------|------|--------|
| `applySuppression()` | `suppression.ts` | Returns `[]` — NOT IMPLEMENTED |
| `rollupSuppressedToOrg()` | `suppression.ts` | Returns `[]` — NOT IMPLEMENTED |
| `suppressAndRollup()` | `suppression.ts` | Returns `[]` — NOT IMPLEMENTED |
| `applySuppression()` | `behavioral_signals.ts` | Returns `[]` — NOT IMPLEMENTED |
| `suppressAndRollup()` | `behavioral_signals.ts` | Returns `[]` — NOT IMPLEMENTED |

These are dead code (not called by any active endpoint) but represent unimplemented k-anonymity enforcement.

---

## Verdict

| Requirement | Status |
|-------------|--------|
| Suppression before persistence (Phase 1 decision) | **PASS** |
| Suppression before persistence (Phase 1 ingest) | **FAIL** — events stored before evaluation |
| Suppression before caching | **PASS** — no caching layer |
| Suppression before logging | **PASS** — no event data logged |
| Ambiguity defaults to SUPPRESS | **PASS** — evaluateDecision and ambiguityMiddleware both enforce |
| Legacy suppression implemented | **FAIL** — returns `[]` |

**Overall: FAIL.** Path 2 (`/api/v1/ingest`) persists data before suppression evaluation.
