# Project Handoff: Phase 3 Kickoff

Date: 2026-02-10
Prepared by: Codex
Repository: `/Users/jkelley/Desktop/FluencyTracr`
Primary Branch Context: `codex/fix-api-events-ledger-ci` (work merged toward production path)

## 1) Phase 2 End State (Starting Point for Phase 3)

Phase 2 internal admin beta has been validated in production on `https://www.fluencytracr.com` with core workflows working:
- org bootstrap
- compliance status retrieval
- policy upload
- policy mapping
- non-admin blocked from admin-only mode update (`403`)

Reference closure report:
- `/Users/jkelley/Desktop/FluencyTracr/docs/PHASE2_PROD_CLOSURE_2026-02-10.md`

## 2) What Was Shipped During Phase 2 Closure

### Backend/runtime hardening
- Vercel serverless compatibility fix (default export of app).
- Backend build reliability for Vercel TypeScript pipeline.
- Serverless org hydration/persistence bridge to reduce cold-start state loss.
- Hydration fallback improvements for legacy/missed-config-event orgs.

### Policy/compliance flow
- Production policy upload/mapping/status endpoints verified live.
- Role-based protection verified (non-admin blocked from admin mode change).

### UI reliability
- Dashboard compliance timeline handlers now catch async failures and show user-facing errors.

## 3) Critical Operational Note for Phase 3

`BETA_ORG_ALLOWLIST` must be actively managed and re-validated before widening access.

Required before any broader rollout:
1. Reinstate strict allowlist values.
2. Redeploy production.
3. Verify approved-org success and non-allowlisted `403` denial.

## 4) Known Constraints / Risks Carrying Into Phase 3

1. Durable org/config model is still bridge-based
- Current persistence/hydration works for beta continuity but should be normalized into a first-class durable model.

2. `min_group_size` behavior
- Requested values currently return with defaulted effective value in observed flows.
- Requires explicit product/governance decision for enforcement semantics.

3. Governance consistency requirements
- Compliance mode and org-level governance settings must remain deterministic across cold starts and deployments.

## 5) Phase 3 Objective

Move from beta operation to governance-grade continuous compliance operations while keeping fail-safe behavior.

Primary targets:
1. Continuous compliance reevaluation lifecycle.
2. Governance-ready reporting exports.
3. Controlled enforcement pilot criteria (feature-flagged and reversible).

## 6) Phase 3 Kickoff Workstreams

### Workstream A: Durable org/governance domain
Owner: Backend
- Replace bridge-style hydration with durable org/config persistence contract.
- Persist and retrieve:
  - org identity and display name
  - min group size policy
  - compliance mode state and history
- Add migration-backed schema and compatibility adapters.

### Workstream B: Continuous compliance reevaluation
Owner: Backend + Data
- Recompute posture on policy/map/decision/evidence events.
- Attach causal metadata links from source event to reevaluation event.
- Keep unresolved ambiguity explicit and non-silent.

### Workstream C: Governance exports
Owner: Backend + Frontend
- Deliver export package containing:
  - org compliance summary
  - control-level status
  - unresolved decisions and rationale history
  - compliance mode transitions
- Ensure UTC/time-bound deterministic export behavior.

### Workstream D: Enforcement pilot controls
Owner: Governance + Backend + QA
- Define objective pilot entry criteria.
- Keep pilot gated by allowlist + feature flags.
- Preserve immediate rollback path to `shadow` mode.

## 7) Required Acceptance Gates for Phase 3 Start

1. Data durability gate
- Org/config survives deploys and cold starts without behavior drift.

2. Governance traceability gate
- Every compliance-affecting action has auditable event linkage.

3. Access control gate
- Admin actions restricted; unauthorized and non-allowlisted org requests denied.

4. Regression gate
- Backend deterministic suite green.
- No regression in Phase 2 admin flow.

## 8) Recommended First 5 Tickets (Execution Order)

1. Define durable org/config schema + migration plan.
2. Implement org/config repository layer and replace bridge hydration.
3. Add reevaluation trigger pipeline with source-event linkage.
4. Add governance export endpoints and contract tests.
5. Add end-to-end pilot gating tests (allowlist + rollback behavior).

## 9) Validation Playbook at Phase 3 Start

Run baseline before new feature merges:
- `npm run build --workspace backend`
- `npm run test:ci --workspace backend`
- Production smoke:
  - create org
  - status
  - upload
  - map
  - role-denial check

## 10) Handoff Decision

Phase 3 may begin.

Condition: keep governance guardrails (`shadow` default, allowlist discipline, explicit ambiguity handling) intact while introducing durability and operational scale features.
