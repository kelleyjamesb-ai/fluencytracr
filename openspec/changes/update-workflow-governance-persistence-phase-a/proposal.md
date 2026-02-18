# Change: Update Workflow Governance Persistence (Phase A)

## Why
Dashboard V1 governance currently persists workflow visibility controls using per-workflow policy records and audit coupling. Phase A requires a normalized governance model with explicit workflow version history, current pointers, org-level control config versions, and baseline reset events.

## What Changes
- Add new Prisma enums and persistence models:
  - `RiskClass`
  - `VisibilityState`
  - `DominantPattern`
  - `WorkflowRegistryVersion`
  - `WorkflowRegistryCurrent`
  - `ControlConfigVersion`
  - `BaselineResetEvent`
- Refactor backend workflow registry and visibility persistence to use new models.
- Keep governance API responses deterministic and suppression-first.
- Add/adjust regression tests for:
  - deterministic visibility
  - high-risk verification requirement
  - suppression fail-closed behavior
  - registry RBAC enforcement
  - control config version + reset event creation
- Run a security pass focused on TypeScript/Express backend paths touched by this phase.

## Impact
- Affected specs: `deployment`
- Affected code:
  - `backend/prisma/schema.prisma`
  - `backend/prisma/migrations/*`
  - `backend/src/store.ts`
  - `backend/src/workflow_registry.ts`
  - `backend/src/workflow_registry_persistence.ts`
  - `backend/src/workflow_visibility.ts`
  - `backend/src/workflow_visibility_policy.ts`
  - `backend/src/app.ts`
  - `backend/tests/*governance*.test.ts`
