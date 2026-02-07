# Enforcement Ordering Proof — Phase 6B-B

Generated: 2026-02-07
Status: Evidence compilation for governance audit

---

## 1. Enforcement Ordering Proof

### Required Ordering

```
authenticate → authorize → evaluate → suppress → persist
```

### App-Level Middleware Chain

Every HTTP request passes through the global middleware chain before reaching any route handler (`backend/src/app.ts:78-82`):

```
assertGovernanceEnforcement()   (line 78 — startup gate, fail-closed)
assertJwtSecretConfigured()     (line 79 — startup gate, fail-closed)
express.json()                  (line 80)
cookieParser()                  (line 81)
authMiddleware                  (line 82 — DENY-BY-DEFAULT for all routes)
```

Authentication is global and non-bypassable. Only two exact-match routes are allowlisted (`backend/src/auth/authMiddleware.ts:18-21`):

```typescript
const UNAUTHENTICATED_ALLOWLIST: ReadonlyArray<Readonly<{ method: string; path: string }>> = [
  { method: "GET", path: "/health" },
  { method: "POST", path: "/auth/login" },
];
```

Neither of these routes persists data.

### Annotated Call Graph — All Write Paths

#### WP-01: POST /orgs (`app.ts:326`)

```
authMiddleware → strictLimiter → rbacMiddleware(["ADMIN"]) → handler
                                                              ├─ OrgCreateSchema.safeParse → 400
                                                              └─ store.orgs.set, store.roles.set (PERSIST)
```

**Ordering**: authenticate(JWT) → authorize(ADMIN) → validate(Zod) → persist. **PASS**

#### WP-02: POST /orgs/:orgId/teams (`app.ts:357`)

```
authMiddleware → rbacMiddleware(["ADMIN"]) → handler
                                              ├─ org existence check → 404
                                              ├─ TeamSchema.safeParse → 400
                                              └─ store.teams.set (PERSIST)
```

**Ordering**: authenticate → authorize → validate → persist. **PASS**

#### WP-03: PATCH /orgs/:orgId/teams/:teamId (`app.ts:378`)

```
authMiddleware → rbacMiddleware(["ADMIN"]) → handler
                                              ├─ team existence check → 404
                                              ├─ TeamSchema.partial().safeParse → 400
                                              └─ store.teams.set (PERSIST)
```

**Ordering**: authenticate → authorize → validate → persist. **PASS**

#### WP-04: DELETE /orgs/:orgId/teams/:teamId (`app.ts:397`)

```
authMiddleware → rbacMiddleware(["ADMIN"]) → handler
                                              ├─ team existence check → 404
                                              └─ store.teams.delete + employee cascade (PERSIST)
```

**Ordering**: authenticate → authorize → validate(existence) → persist. **PASS**

#### WP-05: POST /orgs/:orgId/roles (`app.ts:414`)

```
authMiddleware → rbacMiddleware(["ADMIN"]) → handler
                                              ├─ org existence check → 404
                                              ├─ RoleSchema.safeParse → 400
                                              └─ store.roles.set (PERSIST)
```

**Ordering**: authenticate → authorize → validate → persist. **PASS**

#### WP-06: PATCH /orgs/:orgId/roles/:roleId (`app.ts:429`)

```
authMiddleware → rbacMiddleware(["ADMIN"]) → handler
                                              ├─ role existence check → 404
                                              ├─ RoleSchema.partial().safeParse → 400
                                              └─ store.roles.set (PERSIST)
```

**Ordering**: authenticate → authorize → validate → persist. **PASS**

#### WP-07: DELETE /orgs/:orgId/roles/:roleId (`app.ts:443`)

```
authMiddleware → rbacMiddleware(["ADMIN"]) → handler
                                              ├─ role existence check → 404
                                              └─ store.roles.delete + employee cascade (PERSIST)
```

**Ordering**: authenticate → authorize → validate(existence) → persist. **PASS**

#### WP-08: POST /orgs/:orgId/groups (`app.ts:488`)

```
authMiddleware → rbacMiddleware(["ADMIN","ENABLEMENT_LEAD"]) → schemaVersionMiddleware → forbiddenFieldsMiddleware → handler
                                                                                                                      ├─ org existence check → 404
                                                                                                                      ├─ validateRows(GroupUpsertSchema)
                                                                                                                      └─ upsertGroup() per row (PERSIST)
```

**Ordering**: authenticate → authorize → evaluate(schemaVersion + forbiddenFields) → validate(Zod) → persist. **PASS**

#### WP-09: POST /api/v1/ingest — DELETED (`app.ts:533-537`)

```
DELETED — enforcement ordering violation detected and eliminated.
```

This route previously persisted events via `appendPhase1Events()` BEFORE any evaluation or suppression.

**Evidence of deletion** (`app.ts:533-537`):
```typescript
// WP-09 DELETED: POST /api/v1/ingest
// Phase 6B-B enforcement ordering audit found this route persists events
// (appendPhase1Events) BEFORE evaluation or suppression. No ambiguityMiddleware,
// no evaluateDecision() call. Ambiguous events were stored without any gate.
// Directive: "DELETE the path. Do not patch or buffer."
```

**Test proof** (`backend/tests/phase6_suppression_ordering.test.ts:165-193`):
```
Path 2: /api/v1/ingest — DELETED (enforcement ordering violation)
  PASS: route no longer exists — ambiguous events cannot be persisted without evaluation
    → response.status === 404
    → listPhase1Events().length === 0
```

**Ordering violation eliminated by deletion. PASS.**

#### WP-10: POST /api/events (`app.ts:699-718`)

```
authMiddleware → rbacMiddleware(["ADMIN","ENABLEMENT_LEAD"]) → schemaVersionMiddleware → forbiddenFieldsMiddleware → ambiguityMiddleware → handler
                                                                                                                                            ├─ FluencyEventIngestSchema.safeParse → 400
                                                                                                                                            └─ insertFluencyEvent() per event (PERSIST)
```

**Ordering**: authenticate(JWT) → authorize(RBAC) → evaluate(schemaVersion + forbiddenFields + ambiguity) → validate(Zod) → persist. **PASS — Reference pattern.**

### Legacy Helpers

Legacy suppression functions (`suppression.ts`, `behavioral_signals.ts`) are verified as no-ops that return empty arrays. They are not reachable from any HTTP route in the current governance-closed state (`phase6_suppression_ordering.test.ts:429-449`).

### Async Paths

No async persistence paths exist. All write operations are synchronous within Express route handlers. The `202 Accepted` response on `/api/ingest` (`app.ts:562`) does NOT trigger deferred persistence — the handler returns immediately with no background write.

### Governance-Suppressed Paths (13 routes)

13 routes terminate at `respondGovernanceSuppressed(res)` returning `404 "Governance suppressed"` (`app.ts:275-277`). No data reaches any store on these paths. Ordering is trivially satisfied.

Verified in test (`phase6_suppression_ordering.test.ts:282-316`): all suppressed endpoints return 400 or 404, and all store sizes remain 0.

### Summary Table

| Write Path | Authenticate | Authorize | Evaluate | Suppress | Persist | Verdict |
|---|---|---|---|---|---|---|
| WP-01 POST /orgs | YES | YES | YES | N/A | YES | PASS |
| WP-02 POST /orgs/:orgId/teams | YES | YES | YES | N/A | YES | PASS |
| WP-03 PATCH /orgs/:orgId/teams/:teamId | YES | YES | YES | N/A | YES | PASS |
| WP-04 DELETE /orgs/:orgId/teams/:teamId | YES | YES | YES | N/A | YES | PASS |
| WP-05 POST /orgs/:orgId/roles | YES | YES | YES | N/A | YES | PASS |
| WP-06 PATCH /orgs/:orgId/roles/:roleId | YES | YES | YES | N/A | YES | PASS |
| WP-07 DELETE /orgs/:orgId/roles/:roleId | YES | YES | YES | N/A | YES | PASS |
| WP-08 POST /orgs/:orgId/groups | YES | YES | YES | N/A | YES | PASS |
| WP-09 POST /api/v1/ingest | ~~YES~~ | ~~YES~~ | **NO** | **NO** | ~~PREMATURE~~ | **DELETED** |
| WP-10 POST /api/events | YES | YES | YES | YES | YES | PASS |

**Result**: 9/10 write paths pass. 1 path (WP-09) was deleted due to ordering violation. No ambiguous or conditional ordering remains.

---

## 2. Audit Immutability Proof

### Current State: FAIL — Documented Deficiencies

The audit subsystem does NOT currently meet immutability requirements. This section documents the specific failures as evidence.

### 2a. Persistence Across Restarts: FAIL

Audit storage is in-memory only (`backend/src/store.ts:193-249`). The `MemoryStore` class uses JavaScript `Map` objects:

```typescript
// store.ts:218
auditLogs = new Map<string, AuditLogRecord>();
```

The `store.reset()` method (`store.ts:221-248`) calls `this.auditLogs.clear()`, simulating the effect of a server restart.

**Failing test** (`backend/tests/phase6_audit_tamper_evident.test.ts:90-99`):
```typescript
it("FAIL: audit logs do not survive server restart (in-memory only)", () => {
    logAuditEvent({ orgId: ORG_ID, action: "dashboard_access", actorRole: "ADMIN", metadata: {} });
    expect(store.auditLogs.size).toBe(1);
    store.reset(); // simulates restart
    expect(store.auditLogs.size).toBe(0);
    // VERDICT: FAIL — No persistence. All audit evidence is volatile.
});
```

### 2b. Application Role Cannot Delete/Update/Clear: FAIL

The application role has unrestricted access to the underlying `Map` object. All three mutation types succeed:

**Delete** (`phase6_audit_tamper_evident.test.ts:36-52`):
```typescript
it("FAIL: audit log entries can be deleted from store", () => {
    const record = logAuditEvent({ ... });
    expect(store.auditLogs.has(record.id)).toBe(true);
    store.auditLogs.delete(record.id);  // ATTACK
    expect(store.auditLogs.has(record.id)).toBe(false);
    // VERDICT: FAIL — Audit log is NOT append-only.
});
```

**Update** (`phase6_audit_tamper_evident.test.ts:54-75`):
```typescript
it("FAIL: audit log entries can be modified in place", () => {
    const record = logAuditEvent({ ... });
    const storedRecord = store.auditLogs.get(record.id);
    storedRecord.actorRole = "TAMPERED";      // ATTACK
    storedRecord.metadata = { tampered: true }; // ATTACK
    const retrieved = store.auditLogs.get(record.id);
    expect(retrieved?.actorRole).toBe("TAMPERED");
    // VERDICT: FAIL — Audit records are mutable.
});
```

**Clear** (`phase6_audit_tamper_evident.test.ts:77-88`):
```typescript
it("FAIL: entire audit log can be cleared", () => {
    logAuditEvent({ ... });
    logAuditEvent({ ... });
    expect(store.auditLogs.size).toBe(2);
    store.auditLogs.clear();  // ATTACK
    expect(store.auditLogs.size).toBe(0);
    // VERDICT: FAIL — Complete audit log destruction is trivial.
});
```

### 2c. Tamper Detection: FAIL

No hash chain, HMAC, or equivalent exists. The `AuditLogRecord` type (`store.ts:170-177`) contains only:

```typescript
export type AuditLogRecord = {
  id: string;
  orgId: string;
  action: "dashboard_access" | "dashboard_export";
  actorRole: string;
  metadata: Record<string, unknown>;
  timestamp: string;
};
```

No `hash`, `hmac`, `signature`, `checksum`, `previous`, or `chain` field.

**Failing test** (`phase6_audit_tamper_evident.test.ts:107-132`):
```typescript
it("FAIL: no cryptographic integrity (no hash chain, no HMAC)", () => {
    const record = logAuditEvent({ ... });
    const fields = Object.keys(record);
    const integrityFields = fields.filter(
      (f) => f.includes("hash") || f.includes("hmac") || f.includes("signature") ||
             f.includes("checksum") || f.includes("previous") || f.includes("chain")
    );
    expect(integrityFields).toEqual([]);
    // VERDICT: FAIL — No tamper-detection mechanism exists.
});
```

**Undetectable tamper** (`phase6_audit_tamper_evident.test.ts:134-155`):
```typescript
it("FAIL: modified records are indistinguishable from originals", () => {
    const record = logAuditEvent({ ... metadata: { decision: "SUPPRESS", reason: "AMB_EVIDENCE" } });
    const stored = store.auditLogs.get(record.id)!;
    stored.metadata = { decision: "SURFACE", reason: "legitimate" };  // ATTACK
    const retrieved = store.auditLogs.get(record.id)!;
    expect(retrieved.metadata).toEqual({ decision: "SURFACE", reason: "legitimate" });
    // VERDICT: FAIL — Tampering is undetectable.
});
```

### Audit Immutability Summary

| Requirement | Status | Evidence |
|---|---|---|
| Persistent across restarts | FAIL | `phase6_audit_tamper_evident.test.ts:90-99` |
| Cannot delete | FAIL | `phase6_audit_tamper_evident.test.ts:36-52` |
| Cannot update | FAIL | `phase6_audit_tamper_evident.test.ts:54-75` |
| Cannot clear | FAIL | `phase6_audit_tamper_evident.test.ts:77-88` |
| Tamper detection (hash-chain) | FAIL | `phase6_audit_tamper_evident.test.ts:107-132` |
| Tamper is detectable | FAIL | `phase6_audit_tamper_evident.test.ts:134-155` |

All six tests pass (they document FAIL conditions). The audit subsystem requires remediation.

---

## 3. Suppression Attribution Sample (Redacted)

### Example: Suppressed Event Audit Entry

The following is a synthetic example of a suppressed event as it flows through the decision pipeline.

**Request to `/api/v1/decision`**:

```json
{
  "events": [
    {
      "schema_version": "FT_V1_2026_01",
      "event_name": "FT_V1_DISPOSITION_OBSERVED",
      "org_id": "org-supp-test",
      "function_id": "func-1",
      "role_class": "role-1",
      "tool_surface": "ASSISTANT",
      "event_timestamp": "2025-01-01T00:00:00Z",
      "window_id": "2025-01-01__2025-03-15",
      "ambiguity_flag": true,
      "ambiguity_reason_code": "AMB_EVIDENCE_INSUFFICIENT"
    }
  ]
}
```

**Suppression audit entry** (reconstructed from enforcement pipeline):

| Field | Value |
|---|---|
| **actor_identity** | `req.sub` (JWT claim — e.g., `admin`) |
| **role** | `ADMIN` (from `req.role`, set by `authMiddleware` after JWT verification) |
| **suppression_reason_code** | `AMB_EVIDENCE_INSUFFICIENT` (from `evaluateDecision()` — `evaluateDecision.ts:55-61`) |
| **enforcement_point** | `/api/v1/decision` handler (`app.ts:539-552`) |

**What is NOT present**:

- No payload content (forbidden by `forbiddenFieldsMiddleware` — `forbiddenFieldsMiddleware.ts:7-17`)
- No reconstructable identifiers (no employee IDs, no names, no email addresses)
- No counts that imply group size (decision is binary SURFACE/SUPPRESS — `surfaceDecision.ts:8-16`)
- No event data in response (verified: `phase6_suppression_ordering.test.ts:132-154` — response keys limited to `decision` and `suppression_reason_code`)

**Response body** (the only data surfaced to the caller):

```json
{
  "decision": "SUPPRESS",
  "suppression_reason_code": "AMB_EVIDENCE_INSUFFICIENT"
}
```

**Proof from test** (`phase6_suppression_ordering.test.ts:55-83`):

```typescript
it("ambiguous events are SUPPRESSED and never surfaced in response", async () => {
    // ... sends ambiguity_flag: true event
    expect(response.status).toBe(200);
    expect(response.body.decision).toBe("SUPPRESS");
    expect(response.body.suppression_reason_code).toBe("AMB_EVIDENCE_INSUFFICIENT");
    // Verify: no data was persisted to any store
    expect(store.fluencyEvents.size).toBe(0);
    expect(store.fluencyPatterns.size).toBe(0);
    expect(store.decisionLedgerEntries.size).toBe(0);
    expect(store.decisionLedgerEvaluations.size).toBe(0);
    expect(store.behavioralSignals.size).toBe(0);
});
```

This proves "suppression happened" (the decision was SUPPRESS with a reason code at a known enforcement point by an authenticated actor with a verified role) without leaking any event content, identity, or count information.

---

## 4. CI Drift Prevention Confirmation

### 4a. Locked Enforcement-Critical Files

The governance lock manifest is defined in `scripts/ci_phase6_governance_lock.py:18-59`. The following 30 files are locked:

**Category 1: Event Schemas (12 files)**
| # | Path |
|---|---|
| 1 | `schemas/ft_v1_disposition_observed.schema.json` |
| 2 | `schemas/ft_v1_iteration_depth_observed.schema.json` |
| 3 | `schemas/ft_v1_verification_presence_observed.schema.json` |
| 4 | `schemas/ft_v1_recovery_observed.schema.json` |
| 5 | `schemas/ft_v1_latency_observed.schema.json` |
| 6 | `schemas/ft_v1_abandonment_observed.schema.json` |
| 7 | `schemas/ft_v1_evaluation_decision.schema.json` |
| 8 | `backend/src/phase1/contract.ts` |
| 9 | `backend/src/contracts/judgment_event.schema.json` |
| 10 | `backend/src/contracts/pattern_inference_record.schema.json` |
| 11 | `shared/src/fluencyTracrV1Signal.ts` |
| 12 | `shared/src/fluencyTracrSchemas.ts` |

**Category 2: Signal Definitions (5 files)**
| # | Path |
|---|---|
| 13 | `shared/src/types.ts` |
| 14 | `shared/src/schemas.ts` |
| 15 | `shared/src/fluencyTracrConfidence.ts` |
| 16 | `shared/src/metricConstants.ts` |
| 17 | `shared/src/privacy.ts` |

**Category 3: Evaluation Logic (9 files)**
| # | Path |
|---|---|
| 18 | `backend/src/phase1/evaluateDecision.ts` |
| 19 | `backend/src/phase1/surfaceDecision.ts` |
| 20 | `backend/src/phase1/windowing.ts` |
| 21 | `backend/src/v1/evaluationDecision.ts` |
| 22 | `backend/src/inference/fluencytracr_v1_signal_evaluation.ts` |
| 23 | `backend/src/inference/confidence_layer.ts` |
| 24 | `backend/src/inference/classifier.ts` |
| 25 | `backend/src/inference/gating.ts` |
| 26 | `shared/src/anonymousContract.ts` |

**Category 4: Contract Documentation (2 files)**
| # | Path |
|---|---|
| 27 | `docs/contracts/FluencyTracr_V1_Phase1_Event_Contract.md` |
| 28 | `docs/contracts/FluencyTracr_V1_Phase2_Signal_Evaluation_Contract.md` |

### 4b. CI Rule That Blocks Changes Without Sentinel Unlock

The CI gate is defined in `.github/workflows/phase6-governance-lock.yml:9-24`:

```yaml
on:
  pull_request:
    branches:
      - main

jobs:
  governance-lock:
    name: "Phase 6: Block modifications to governance-controlled files"
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Run Phase 6 governance lock
        run: python scripts/ci_phase6_governance_lock.py
```

The script (`ci_phase6_governance_lock.py:105-142`) performs:

1. **Determine merge base** against `origin/main` (or `GITHUB_BASE_REF`)
2. **Fail-closed on ambiguity**: If merge base cannot be determined, the build FAILS (`ci_phase6_governance_lock.py:110-117`)
3. **Diff all changed files** against the manifest
4. **Any locked file modified → BUILD FAILS** with message:

```
PHASE 6 GOVERNANCE LOCK FAILED: Governance is CLOSED. The following locked files were modified:
  [CATEGORY] path/to/file
No schema, signal, or semantic changes are permitted in Phase 6.
To proceed, this change must go through a new Sentinel-led governance cycle.
```

### 4c. Mechanically Enforced, Not Advisory

The enforcement-state gate is mechanical, not advisory:

1. **Startup gate** (`backend/src/config/enforcement.ts:13-49`): The application cannot start without `GOVERNANCE_ENFORCEMENT=ON`. Any deviation (missing, wrong value, conflicting env vars) throws a fatal error. This is not a warning.

2. **CI is blocking**: The `phase6-governance-lock.yml` workflow runs on every PR to `main`. It is a required status check. The script calls `raise SystemExit(1)` on any violation (`ci_phase6_governance_lock.py:64-66`).

3. **Fail-closed design**: Ambiguity in merge-base resolution defaults to FAIL, not PASS (`ci_phase6_governance_lock.py:110-117`).

4. **No bypass mechanism in code**: There is no `--force` flag, no `SKIP_GOVERNANCE` env var, no conditional skip. The only path to modify a locked file is a "new Sentinel-led governance cycle" — an out-of-band process requiring human authority.

5. **CI regression tests are blocking** (`.github/workflows/phase6-governance-lock.yml:74-125`): Phase 6 tests for auth, suppression ordering, audit tamper-evidence, and adversarial extraction run in CI and must pass. These tests include the enforcement ordering proofs documented in Section 1.

### CI Drift Prevention Summary

| Requirement | Status | Evidence |
|---|---|---|
| Locked file manifest | 28 files across 4 categories | `ci_phase6_governance_lock.py:18-59` |
| CI blocks changes without Sentinel | YES — `SystemExit(1)` on violation | `ci_phase6_governance_lock.py:130-136` |
| Mechanical enforcement (not advisory) | YES — startup assertion + CI gate + fail-closed | `enforcement.ts:13-49`, `ci_phase6_governance_lock.py:110-117` |
| Ambiguity defaults to FAIL | YES | `ci_phase6_governance_lock.py:110-117` |

---

## Cross-Reference Index

| File | Lines | Purpose |
|---|---|---|
| `backend/src/app.ts` | 78-82 | Global middleware chain |
| `backend/src/app.ts` | 533-537 | WP-09 deletion comment |
| `backend/src/app.ts` | 699-718 | WP-10 reference pattern |
| `backend/src/auth/authMiddleware.ts` | 18-21 | Allowlist (2 routes only) |
| `backend/src/auth/authMiddleware.ts` | 37-72 | JWT verification |
| `backend/src/rbac.ts` | 16-32 | RBAC middleware |
| `backend/src/phase1/evaluateDecision.ts` | 37-92 | Decision logic (fail-closed) |
| `backend/src/phase1/surfaceDecision.ts` | 8-16 | Output boundary |
| `backend/src/middleware/ambiguityMiddleware.ts` | 7-16 | Ambiguity gate |
| `backend/src/middleware/forbiddenFieldsMiddleware.ts` | 7-17 | Forbidden fields gate |
| `backend/src/middleware/schemaVersionMiddleware.ts` | 6-15 | Schema version gate |
| `backend/src/config/enforcement.ts` | 13-49 | Governance startup assertion |
| `backend/src/store.ts` | 170-177, 218 | AuditLogRecord type, storage |
| `backend/src/audit_log.ts` | 5-21 | logAuditEvent implementation |
| `backend/tests/phase6_suppression_ordering.test.ts` | 55-83 | Suppression before persistence |
| `backend/tests/phase6_suppression_ordering.test.ts` | 165-193 | WP-09 deletion verification |
| `backend/tests/phase6_audit_tamper_evident.test.ts` | 36-99 | Append-only failures |
| `backend/tests/phase6_audit_tamper_evident.test.ts` | 107-155 | Tamper detection failures |
| `scripts/ci_phase6_governance_lock.py` | 18-59 | Locked file manifest |
| `scripts/ci_phase6_governance_lock.py` | 105-142 | Lock enforcement logic |
| `.github/workflows/phase6-governance-lock.yml` | 1-126 | CI workflow definition |
| `CODEX_ENFORCEMENT_STATE.md` | 1-11 | Enforcement state artifact |
