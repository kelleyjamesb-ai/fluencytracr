# Frontend Screen-Section Matrix

Date: 2026-02-16  
Scope: Planned FluencyTracr governance-first frontend screens  
Depends on: `/Users/jkelley/Desktop/FluencyTracr/docs/governance/FRONTEND_GOVERNANCE_SEMANTICS_CONTRACT_2026-02-16.md`

## 1) Matrix Schema

Each section below maps:

1. Screen Section
2. Layer (0-5)
3. Canonical Terms
4. Data Fields
5. Endpoint(s)
6. Roles
7. States (loading, empty, error/fail-closed)
8. Governance Checks

## 2) Post-Login Landing

| Screen Section | Layer | Canonical Terms | Data Fields | Endpoint(s) | Roles | States | Governance Checks |
|---|---:|---|---|---|---|---|---|
| Global Context Bar | 0 | `Schema Version`, `Shadow`, `Enforced`, `Degraded` | `org_id`, `environment`, `schema_version`, `mode`, `db_readiness` | `GET /orgs/:orgId/compliance/status`, `GET /ops/db/readiness` | All | Loading: skeleton chips. Error: `System not ready` banner and lock mutating actions. | Context bar always visible; missing mode/schema blocks action rail. |
| Org Context Card | 1 | `Allowlist` | `org_id`, allowlist eligibility summary | (existing) org config endpoint; interim from policy/compliance availability | All | Empty: no org selected. Error: explicit org access issue. | No implicit org switching without confirmation. |
| Readiness Panel | 2 | `Degraded`, `Blocked` | `status`, `missing_tables`, readiness counters | `GET /ops/db/readiness`, `GET /ops/metrics`, `GET /ops/failclosed` | All | Error: show unavailable reason; no ambiguous empty text. | Fail-closed banner required when status != `ready` or `not_configured`. |
| Role Capabilities Snapshot | 2 | `Blocked` | computed capability booleans by role | UI policy map + backend role | All | Empty not allowed. Error: deny-by-default. | Show denied actions clearly; do not render actionable controls for denied role. |

## 3) Governance Overview (Home)

| Screen Section | Layer | Canonical Terms | Data Fields | Endpoint(s) | Roles | States | Governance Checks |
|---|---:|---|---|---|---|---|---|
| Page Intent Header | 1 | `Explainability` | static decision-support copy + scope | N/A | All | Always visible | Must use directional language (`signals indicate`) only. |
| Compliance Posture Summary | 3 | `Shadow`, `Enforced`, `Suppressed`, `Degraded` | `mode`, `overall_status`, `counts`, `as_of`, `freshness` | `GET /orgs/:orgId/compliance/status` | All | Loading: card skeleton. Empty: no controls yet. Error: fail-closed card. | Never show certainty claims when stale or degraded. |
| Evidence Freshness and Last Export | 3 | `Explainability` | `last_event_at`, last export metadata | `GET /orgs/:orgId/compliance/status`, `GET /orgs/:orgId/compliance/export` | All | Empty: no exports yet. | Display timestamps in UTC + local label to avoid ambiguity. |
| Operational Warnings | 2 | `Blocked`, `Degraded` | fail-closed totals/top routes/reasons | `GET /ops/failclosed`, `GET /ops/metrics` | All | Error: show warning unavailable and keep controls disabled. | Warning visibility required; do not hide when degraded. |
| Pilot Eligibility Tile | 2 | `Allowlist`, `Blocked` | enforcement pilot eligibility, unresolved threshold status | `PATCH /orgs/:orgId/compliance/mode` precondition response | All (read-only except admin controls) | Empty: `unknown`. | If eligibility unknown, mode escalation must be blocked. |

## 4) Policy Workspace

| Screen Section | Layer | Canonical Terms | Data Fields | Endpoint(s) | Roles | States | Governance Checks |
|---|---:|---|---|---|---|---|---|
| Policy Upload | 5 | `Needs Review`, `Blocked` | `file_name`, `content_type`, upload result (`policy_id`, `clause_count`) | `POST /orgs/:orgId/policies/upload` | `ADMIN` | Denied for non-admin. Error: explicit reason. | Pre-submit warning: action creates audit event. |
| Policy Versions List | 3 | `Explainability` | `policy_id`, `file_name`, `source_format`, `clause_count`, `created_at`, latest mapping summary | `GET /orgs/:orgId/policies` | All | Empty: no policies uploaded. | No raw policy content in table/list view. |
| Mapping Status Panel | 3 | `Needs Review`, `Suppressed` | `mapping_id`, `generated_at`, controls, unresolved clause count | `GET /orgs/:orgId/policies/:policyId/mapping` | All | Empty: mapping absent for selected policy. | Show unresolved clauses count prominently before mode changes. |
| Recompute Compliance Action | 5 | `Recompute Compliance` | mutation status + source event ids | `POST /orgs/:orgId/policies/:policyId/map` | `ADMIN` | Error: deterministic error summary. | Confirmation required; always log/refresh timeline after completion. |
| Unresolved Clause Decision Panel | 4/5 | `Needs Review`, `Blocked` | clause id/text/reason, decision payload, resulting status | `PATCH /orgs/:orgId/policies/:policyId/mapping/unresolved/:clauseId` | `ADMIN` | Empty: no unresolved clauses. | Decision rationale required; decision id should be visible in audit view. |

## 5) Compliance Status + Timeline

| Screen Section | Layer | Canonical Terms | Data Fields | Endpoint(s) | Roles | States | Governance Checks |
|---|---:|---|---|---|---|---|---|
| Current Compliance Status | 3 | `Shadow`, `Enforced`, `Suppressed`, `Degraded` | `overall_status`, `counts`, `controls[]`, `as_of` | `GET /orgs/:orgId/compliance/status` | All | Error: fail-closed card + warning banner. | No identity-level control attribution. |
| As-Of Reconstruction Picker | 4 | `Explainability` | `as_of` query + reconstructed status | `GET /orgs/:orgId/compliance/status?as_of=` | All | Invalid input: explicit validation error. | Must label reconstructed view clearly to avoid present-state confusion. |
| Timeline Feed | 4 | `Explainability`, `Blocked`, `Needs Review` | paged event records, metadata, source_event refs | `GET /orgs/:orgId/compliance/events` | All | Empty: no events in selected filter. | Preserve event ordering and source references. |
| Explainability Side Panel | 4 | `Explainability`, `Degraded` | event causal links (`source_event_id`, `source_event_type`, `recomputed_at`) | `GET /orgs/:orgId/compliance/events` | All (role-redacted) | Incomplete chain: mark as degraded. | Show references only; no raw content exposure. |
| Export Controls (JSON/CSV) | 5 | `Schema Version`, `Explainability` | `format`, export metadata and hash | `GET /orgs/:orgId/compliance/export?format=json|csv` | `ADMIN`, `EXEC_VIEWER` (summary) | Error: explicit export failure; do not emit partial file silently. | Export must include schema version and deterministic metadata. |

## 6) Enforcement Controls (Admin Only)

| Screen Section | Layer | Canonical Terms | Data Fields | Endpoint(s) | Roles | States | Governance Checks |
|---|---:|---|---|---|---|---|---|
| Mode Toggle Control | 5 | `Shadow`, `Enforced`, `Blocked` | current mode, target mode, rationale, result event id | `PATCH /orgs/:orgId/compliance/mode` | `ADMIN` | Non-admin: hidden + hard deny. | Confirmation text: action creates audit event. |
| Preconditions Panel | 2/4 | `Allowlist`, `Needs Review`, `Blocked` | pilot eligibility, unresolved threshold, unresolved outstanding | error/details from mode patch + status summaries | `ADMIN` full, others read-only | If unknown: block toggle and show reason. | Must be visible before enabling action. |
| Rollback Control | 5 | `Rollback`, `Blocked` | previous mode, rollback flag, updated_at, source_event_id | `PATCH /orgs/:orgId/compliance/mode` (`enforced -> shadow`) | `ADMIN` | If precondition fail: explicit block reason list. | Rollback must create evidence event and be discoverable in timeline. |
| Rollback Evidence View | 4 | `Explainability`, `Rollback` | rollback events and linked context | `GET /orgs/:orgId/compliance/events` (filtered) | All (role scoped) | Empty: no rollback events yet. | Never allow rollback without recorded evidence pointer. |

## 7) Evidence Exports

| Screen Section | Layer | Canonical Terms | Data Fields | Endpoint(s) | Roles | States | Governance Checks |
|---|---:|---|---|---|---|---|---|
| Export History List | 3/4 | `Explainability` | export id/name/timestamp/actor/schema version/hash | `GET /orgs/:orgId/compliance/export` + persisted export registry (planned) | `ADMIN`, `EXEC_VIEWER` summary | Empty: no exports available. | History should be immutable and sortable by UTC timestamp. |
| Reproducibility Check | 4 | `Schema Version`, `Degraded` | `schema_version`, `generated_at`, deterministic hash, mode/environment | export payload metadata | `ADMIN`, `EXEC_VIEWER` summary | Mismatch: `Degraded` and block package certification. | Require hash + schema version for all governance packets. |
| Download Governance Packet | 5 | `Explainability` | bundle reference + selected format | `GET /orgs/:orgId/compliance/export?format=` | `ADMIN`; optional restricted summary for `EXEC_VIEWER` | Denied roles: hard deny + explanation. | Packet must exclude forbidden fields and raw content. |

## 8) Global State Mapping (Cross-Screen)

| State | Trigger | Required UI Behavior | Action Availability |
|---|---|---|---|
| `Loading` | Request in-flight | Section skeleton + disabled mutation buttons | Read actions available where safe; writes disabled |
| `Empty` | Valid request, no data | Explicit empty-copy with next step | Mutations available by role |
| `Error` | Non-fail-closed transport/validation error | Clear error text with retry | Mutations disabled until retry result |
| `Fail-Closed` | Readiness or governance dependency failure | Persistent `System not ready` banner + reason | All mutating controls blocked |
| `Denied` | RBAC or policy deny | Show `Blocked` state with reason | No fallback control rendering |

## 9) Open Planning Gaps to Resolve Before Build

1. Final endpoint for org allowlist visibility on landing/home sections.
2. Dedicated export-history endpoint if historical packet metadata is not retained in current export route.
3. Final rule for `EXEC_VIEWER` export scope in production policy.
4. Canonical schema-version retrieval method for context bar (header vs payload field).

