# Frontend GSD Governance-by-Design Checklist

Date: 2026-02-16  
Scope: FluencyTracr frontend redesign and implementation on Vercel  
Status: Draft for approval at Agreement Gate

## 1) Product Intent Lock

This frontend plan is valid only if all changes preserve these invariants:

1. FluencyTracr reports organizational signals, not individual surveillance.
2. Ambiguity and low confidence default to suppressive outcomes.
3. No raw prompt/content payloads or direct identifiers are exposed in UI.
4. Outputs are directional guidance, not factual claims.
5. Governance and access decisions are auditable at the organization level.

Primary references:
- `/Users/jkelley/Desktop/FluencyTracr/README.md`
- `/Users/jkelley/Desktop/FluencyTracr/SCOPE_GUARDRAILS.md`
- `/Users/jkelley/Desktop/FluencyTracr/openspec/project.md`
- `/Users/jkelley/Desktop/FluencyTracr/docs/PHASE2_PROD_CLOSURE_2026-02-10.md`
- `/Users/jkelley/Desktop/FluencyTracr/docs/CI_GOVERNANCE_GATES.md`

## 2) Governance Gates by Milestone

## Milestone A: IA and UX Blueprint

Gate A1: Aggregation-Only Information Architecture  
Owner: Frontend Engineer, Governance Reviewer  
Check:
1. No page supports individual-level drilldown or per-person ranking.
2. Navigation is scoped to org/team-safe aggregate views only.
Evidence:
1. Site map artifact.
2. Screen inventory with allowed data classes.

Gate A2: Language Semantics  
Owner: Frontend Engineer, Governance Reviewer  
Check:
1. UI copy uses directional language (for example, "signals suggest", "observed posture").
2. UI copy never presents inferred state as fact.
Evidence:
1. Copy deck reviewed against semantic checklist.

## Milestone B: Frontend Architecture Refactor

Gate B1: Auth and Role Boundaries  
Owner: Frontend Engineer, Backend Engineer, Governance Reviewer  
Check:
1. Route guards align with backend role semantics.
2. Admin actions are hidden or blocked for non-admin roles.
3. Fail-closed behavior on missing role/session context.
Evidence:
1. Route-policy matrix.
2. Negative test cases for `EXEC_VIEWER` and `ENABLEMENT_LEAD`.

Gate B2: Data Handling and Forbidden Fields  
Owner: Frontend Engineer, Governance Reviewer  
Check:
1. Forbidden/sensitive fields are never rendered, stored, or exported in client flows.
2. Frontend data models align with shared schema contracts.
Evidence:
1. Data contract map (endpoint -> field allowlist).
2. Static search report for forbidden field names in frontend source.

## Milestone C: Design System and Componentization

Gate C1: Risk-Safe Components  
Owner: Frontend Engineer, Governance Reviewer  
Check:
1. Components that display confidence/suppression states use consistent, explicit semantics.
2. No visual treatment implies certainty when state is suppressed or ambiguous.
Evidence:
1. Component catalog with state matrix.
2. Screenshot set for all governance states.

Gate C2: Accessibility as Governance Support  
Owner: Frontend Engineer, QA Engineer  
Check:
1. Suppression and warning states are perceivable without color alone.
2. Keyboard and screen-reader flows include governance-critical interactions.
Evidence:
1. Accessibility checklist pass.

## Milestone D: Feature Slice Delivery

Gate D1: Safe Defaults in Workflows  
Owner: Frontend Engineer, Governance Reviewer  
Check:
1. Default view favors suppressed or withheld states when uncertainty exists.
2. Mode-changing actions require explicit confirmation and role eligibility.
Evidence:
1. Workflow decision table.
2. Interaction recordings for mode changes.

Gate D2: Audit and Transparency Paths  
Owner: Backend Engineer, Frontend Engineer  
Check:
1. UI surfaces event history and state provenance where required.
2. Error handling preserves explainability (what failed, what is safe fallback).
Evidence:
1. Screenshot evidence of timeline, status, and fallback states.

## Milestone E: Validation and Release Hardening

Gate E1: Governance E2E Pack  
Owner: QA Engineer  
Check:
1. Role boundary tests pass.
2. Suppression/ambiguity states pass.
3. Fail-closed and timeout/retry safe behavior pass.
Evidence:
1. Playwright run artifacts and logs.

Gate E2: Pre-Production Governance Review  
Owner: Governance Reviewer, Project Lead  
Check:
1. All gates A through E are marked passed with evidence links.
2. Any exception is documented with mitigation and expiry date.
Evidence:
1. Signed governance readiness note.

## 3) Release Blockers

Any one of the following blocks Vercel promotion:

1. Any gate above is missing evidence.
2. Any role boundary test failure.
3. Any exposure of forbidden fields.
4. Any UI copy that converts directional signal into certainty statement.
5. Any unresolved governance exception without mitigation owner and due date.

## 4) Team Coverage Required

Required attendees for governance checkpoints:

1. Project Lead (Codex): integration decision and acceptance authority.
2. Frontend Engineer: UX and component implementation owner.
3. Backend Engineer: contract and role enforcement alignment.
4. QA/Test Engineer: governance scenario coverage and regression.
5. Infrastructure/DevOps: Vercel rollout controls and environment gating.
6. Governance Reviewer: final compliance and guardrail signoff.

Optional:
1. Data Engineer only if analytics instrumentation changes event semantics.

## 5) Skills Required During Execution

1. `ui-ux-pro-max`: produce governance-safe IA, copy, and component decisions.
2. `playwright`: execute governance-critical browser validation.
3. `security-best-practices`: review auth/session and client-side secure defaults.
4. `gh-fix-ci` only if CI governance checks fail.

## 6) Acceptance Checklist (Go/No-Go)

Mark each item `PASS` before production release:

1. Product intent lock preserved.
2. Gates A1-A2 passed.
3. Gates B1-B2 passed.
4. Gates C1-C2 passed.
5. Gates D1-D2 passed.
6. Gates E1-E2 passed.
7. Release blockers checklist clear.

Decision:
- GO: all items `PASS`.
- NO-GO: any item not `PASS`.

