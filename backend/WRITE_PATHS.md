# WRITE_PATHS.md — Phase 6B-B Enforcement Ordering Audit

Generated: 2026-02-07
Scope: Every code path that mutates persistent state in the backend.
Method: Static analysis of `store.*`, `phase1Events`, and all export functions that call `.set()`, `.push()`, or `.delete()`.

---

## Store Collections Inventory

| Store | Type | Source File |
|---|---|---|
| `store.orgs` | `Map` | store.ts |
| `store.teams` | `Map` | store.ts |
| `store.roles` | `Map` | store.ts |
| `store.employees` | `Map` | store.ts |
| `store.groups` | `Map` | store.ts |
| `store.metrics` | `Map` | store.ts |
| `store.controls` | `Map` | store.ts |
| `store.enablement` | `Map` | store.ts |
| `store.behavioralSignals` | `Map` | store.ts |
| `store.functions` | `Map` | store.ts |
| `store.fluencyEvents` | `Map` | store.ts |
| `store.fluencyPatterns` | `Map` | store.ts |
| `store.decisionLedgerEntries` | `Map` | store.ts |
| `store.decisionLedgerEvaluations` | `Map` | store.ts |
| `store.auditLogs` | `Map` | store.ts |
| `store.patternInferenceRecords` | `Array` | store.ts |
| `store.inferenceAuditLogs` | `Array` | store.ts |
| `phase1Events` | `Array` (module-local) | phase1/eventStore.ts |

---

## Write Paths — Routes That Persist

### WP-01: POST /orgs
- **File**: app.ts:327
- **Function**: Route handler (inline)
- **Trigger**: HTTP POST /orgs
- **Stores touched**: `store.orgs`, `store.roles`
- **Operations**: `store.orgs.set(id, ...)`, `store.roles.set(roleId, ...)` x3 (default roles)

### WP-02: POST /orgs/:orgId/teams
- **File**: app.ts:358
- **Function**: Route handler (inline)
- **Trigger**: HTTP POST /orgs/:orgId/teams
- **Stores touched**: `store.teams`
- **Operations**: `store.teams.set(teamId, record)`

### WP-03: PATCH /orgs/:orgId/teams/:teamId
- **File**: app.ts:379
- **Function**: Route handler (inline)
- **Trigger**: HTTP PATCH /orgs/:orgId/teams/:teamId
- **Stores touched**: `store.teams`
- **Operations**: `store.teams.set(team.id, updated)`

### WP-04: DELETE /orgs/:orgId/teams/:teamId
- **File**: app.ts:398
- **Function**: Route handler (inline)
- **Trigger**: HTTP DELETE /orgs/:orgId/teams/:teamId
- **Stores touched**: `store.teams`, `store.employees` (cascading cleanup)
- **Operations**: `store.teams.delete(team.id)`, `record.teamIds.delete(team.id)` per employee

### WP-05: POST /orgs/:orgId/roles
- **File**: app.ts:415
- **Function**: Route handler (inline)
- **Trigger**: HTTP POST /orgs/:orgId/roles
- **Stores touched**: `store.roles`
- **Operations**: `store.roles.set(roleId, record)`

### WP-06: PATCH /orgs/:orgId/roles/:roleId
- **File**: app.ts:430
- **Function**: Route handler (inline)
- **Trigger**: HTTP PATCH /orgs/:orgId/roles/:roleId
- **Stores touched**: `store.roles`
- **Operations**: `store.roles.set(role.id, updated)`

### WP-07: DELETE /orgs/:orgId/roles/:roleId
- **File**: app.ts:444
- **Function**: Route handler (inline)
- **Trigger**: HTTP DELETE /orgs/:orgId/roles/:roleId
- **Stores touched**: `store.roles`, `store.employees` (cascading cleanup)
- **Operations**: `store.roles.delete(role.id)`, `record.roleIds.delete(role.id)` per employee

### WP-08: POST /orgs/:orgId/groups
- **File**: app.ts:489
- **Function**: Route handler → `upsertGroup()` (store.ts:263)
- **Trigger**: HTTP POST /orgs/:orgId/groups
- **Stores touched**: `store.groups`
- **Operations**: `store.groups.set(key, record)` per accepted row

### WP-09: POST /api/v1/ingest [VIOLATION]
- **File**: app.ts:534
- **Function**: Route handler → `appendPhase1Events()` (phase1/eventStore.ts:5)
- **Trigger**: HTTP POST /api/v1/ingest
- **Stores touched**: `phase1Events` (module-local array)
- **Operations**: `phase1Events.push(event)` per event
- **VIOLATION**: Persists BEFORE evaluation or suppression. No `ambiguityMiddleware`. No `evaluateDecision()`. Events with `ambiguity_flag=true` are stored without any suppression gate.

### WP-10: POST /api/events
- **File**: app.ts:715
- **Function**: Route handler → `insertFluencyEvent()` (store.ts:268)
- **Trigger**: HTTP POST /api/events
- **Stores touched**: `store.fluencyEvents`
- **Operations**: `store.fluencyEvents.set(event.event_id, event)` per parsed event

---

## Write Paths — Governance-Suppressed (No Actual Persistence)

These routes have `respondGovernanceSuppressed(res)` as their terminal handler.
No data reaches any store. Listed for completeness.

| Route | Declared Write Function | Actually Called? |
|---|---|---|
| POST /orgs/:orgId/roster/import | `importRoster()` | NO — suppressed |
| POST /enablement/import | enablement CSV parse | NO — suppressed |
| POST /orgs/:orgId/tools | tool inventory | NO — suppressed |
| POST /orgs/:orgId/usage-shape | usage shape | NO — suppressed |
| POST /orgs/:orgId/metrics/import | `upsertMetric()` | NO — suppressed |
| POST /orgs/:orgId/controls/import | `upsertControl()` | NO — suppressed |
| POST /orgs/:orgId/enablement/import | `upsertEnablement()` | NO — suppressed |
| POST /orgs/:orgId/behavior/import | `upsertBehavioralSignal()` | NO — suppressed |
| POST /orgs/:orgId/behavior/connector/import | connector import | NO — suppressed |
| POST /api/ingest | legacy ingest | NO — handler returns 202 with no persistence |
| POST /api/seed | seed | NO — suppressed |
| POST /api/ledger | ledger create | NO — suppressed |
| POST /api/ledger/:id/evaluate | ledger evaluate | NO — suppressed |

---

## Write Paths — Internal (Not Route-Triggered)

| Function | File | Store | Reachable From HTTP? |
|---|---|---|---|
| `logAuditEvent()` | audit_log.ts:19 | `store.auditLogs` | Not directly — no route calls it in current governance-suppressed state |
| `upsertFunction()` | store.ts:313 | `store.functions` | Not directly — no route calls it |
| `upsertFluencyPattern()` | store.ts:272 | `store.fluencyPatterns` | Not directly — no route calls it |
| `insertDecisionLedgerEntry()` | store.ts:276 | `store.decisionLedgerEntries` | Not directly — route is governance-suppressed |
| `insertDecisionLedgerEvaluation()` | store.ts:280 | `store.decisionLedgerEvaluations` | Not directly — route is governance-suppressed |
| `runInference()` | inference/run_inference.ts | `store.patternInferenceRecords`, `store.inferenceAuditLogs` | Not directly — no route calls it |
| `store.reset()` | store.ts:222 | All stores | Tests only |

---

## Summary

| Category | Count |
|---|---|
| Routes with actual persistence | 10 |
| Routes governance-suppressed (no persistence) | 13 |
| Internal write functions (not HTTP-reachable) | 6 |
| **Ordering violations** | **1 (WP-09)** |
