# Frontend Governance Semantics Contract

Date: 2026-02-16  
Scope: FluencyTracr frontend content and interaction semantics  
Status: Draft, proposed for Agreement Gate adoption

## 1) Purpose

This contract prevents governance drift between:

1. UI copy and labels
2. Role permissions
3. API-backed state and evidence behavior
4. Export and audit semantics

All frontend pages must use these canonical terms and behaviors.

## 2) Canonical Terms

| Term | Canonical Definition | Data Source (Expected) | Allowed Roles (View) | Exportable | Fail Behavior |
|---|---|---|---|---|---|
| `Shadow` | Advisory governance mode. Signals and checks visible; enforcement actions are non-blocking. | Compliance mode endpoint | `ADMIN`, `EXEC_VIEWER`, `ENABLEMENT_LEAD` | Yes (mode metadata) | If mode unavailable: show `System not ready` and disable mode-sensitive actions |
| `Enforced` | Active governance mode where policy gates block non-compliant transitions/actions. | Compliance mode endpoint | `ADMIN`, `EXEC_VIEWER`, `ENABLEMENT_LEAD` | Yes (mode metadata) | If gate evaluation unavailable: fail closed and block protected actions |
| `Blocked` | Action/state prevented by policy, role, allowlist, or precondition gate. | Action response + policy gate status | All roles (within page scope) | Yes (event + reason code) | Keep blocked state visible with reason; never auto-retry silently |
| `Degraded` | System partially available; evidence or readiness is incomplete/unreliable. | Readiness and subsystem health | All roles | Yes (health metadata) | Show persistent warning banner; disable mutating controls |
| `Suppressed` | Output withheld due to confidence/safety constraints or minimum-volume rules. | Signal/evidence endpoints | All roles | Yes (suppression reason only) | Show suppression reason; do not show inferred replacement values |
| `Needs Review` | Human decision required before progression to next governance state. | Workflow/action status | `ADMIN`, scoped reviewers | Yes (status + audit references) | Freeze transition and require explicit decision event |
| `Recompute Compliance` | Re-run mapping/evaluation pipeline against current policy version and data snapshot. | Recompute action endpoint + audit log | `ADMIN` | Yes (job/event metadata) | On failure: create failed audit event and show deterministic error summary |
| `Rollback` | Controlled return from current enforced state to prior safe state with evidence capture. | Rollback endpoint + evidence timeline | `ADMIN` | Yes (rollback packet metadata) | If preconditions unmet: block action and show blocking condition list |
| `Explainability` | Causal references showing how a status was derived, without exposing raw content. | Timeline/ledger references | All roles (redacted by role) | Yes (reference graph metadata) | If chain incomplete: mark as `Degraded` and withhold certainty copy |
| `Allowlist` | Explicit org scope permitted for pilot/enforcement operations. | Org config/governance settings | `ADMIN` full; others read-only summary | Yes (org-level metadata) | If allowlist unknown: block enforcement actions |
| `Schema Version` | Contract version used by governed endpoints and exports. | Response headers/payload metadata | All roles | Yes (always included in export metadata) | If missing/mismatch: block export and show contract mismatch |

## 3) Role-Normalized Capability Model

| Capability | ADMIN | EXEC_VIEWER | ENABLEMENT_LEAD |
|---|---|---|---|
| View governance overview | Allow | Allow (read-only) | Allow (read-only) |
| View policy versions/mapping status | Allow | Allow (read-only summary) | Allow (operational summary) |
| Upload policy | Allow | Deny | Deny |
| Recompute compliance | Allow | Deny | Deny |
| Toggle mode (`Shadow`/`Enforced`) | Allow | Deny | Deny |
| Rollback | Allow | Deny | Deny |
| View explainability references | Allow | Allow (redacted) | Allow (redacted) |
| Export governed bundle | Allow | Allow (summary export only, if enabled) | Deny by default |

Notes:
1. Denied actions must be both hidden and API-hard-denied.
2. Role capability checks must be evaluated at route and action levels.

## 4) Layer-by-Layer Binding

| UI Layer | Required Content | Data Contract Needs | Governance Rules |
|---|---|---|---|
| Layer 0: Global Context Bar | Org, Environment, Schema Version, Mode, Readiness | Config + readiness + schema metadata | Always present. Missing context = fail-closed banner. |
| Layer 1: Page Intent Header | What decision this page supports and its scope | Static copy + role context | Directional language only. No certainty claims. |
| Layer 2: State Chips | `Shadow`, `Enforced`, `Blocked`, `Degraded`, `Suppressed`, `Needs Review` | State enums from APIs | Canonical labels only; no synonyms in production UI. |
| Layer 3: Evidence Panels | Posture summary, policy status, timeline snapshots | Aggregated evidence endpoints | No identity-level detail or raw prompt/content. |
| Layer 4: Explainability | Causal chain references and as-of context | Timeline/ledger references | References only; redact sensitive details by role. |
| Layer 5: Action Rail | Recompute, mode toggle, rollback, export | Role + precondition + mutation endpoints | Every mutation requires audit warning and confirmation. |

## 5) Export Semantics Contract

Exports must always include:

1. `schema_version`
2. `generated_at` timestamp
3. deterministic content hash
4. mode and environment metadata
5. role context for export actor (or system actor)

Exports must never include:

1. direct identifiers
2. raw prompt/output content
3. identity-level ranking fields

## 6) Fail-Closed UX Rules

When any required dependency is unavailable, frontend must:

1. show explicit `System not ready` state
2. disable mutating actions
3. preserve evidence visibility when safe
4. log/view an operational warning event
5. avoid ambiguous empty-state copy (`not found`, `n/a`, blank panels)

## 7) Copy Rules

Approved language style:

1. Use: `signals indicate`, `observed posture`, `suppressed due to constraints`.
2. Avoid: `proves`, `definitive`, `employee performance score`.
3. Always attach a reason code/condition for blocked or suppressed states.

## 8) Pre-Implementation Checklist

1. Canonical term mapping accepted by Project Lead + Governance Reviewer.
2. Role-capability matrix accepted by Backend + Frontend + QA.
3. Each planned screen section mapped to:
   - term(s)
   - data field(s)
   - endpoint
   - allowed roles
   - fail behavior
4. Test plan includes deny-path and fail-closed scenarios.
5. Export contract validated for deterministic metadata presence.

