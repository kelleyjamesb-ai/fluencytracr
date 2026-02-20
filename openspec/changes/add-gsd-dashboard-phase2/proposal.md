# Change: Add GSD Dashboard Phase 2 — Mode Toggle, Policy KPI, Control Drift, Auto Org-Init

## Why

After V1.1 landed explainability and timeline filtering, the Operator layer
still presented three deferred stubs (compliance mode toggle, control drift
table, fail-closed warning feed) and the Exec board had no quick view of
policy coverage. Backend org-initialization was also manual, blocking fresh
deployments from reaching a useful state without a separate seed step.

## What Changes

- **MODIFIED** `OperatorView` — replaces compliance-mode stub with a live
  toggle (shadow ↔ enforced) that calls the existing `PATCH /compliance/mode`
  endpoint and reflects current state on load.
- **MODIFIED** `OperatorView` — replaces Control Drift stub with a live table
  showing per-control status, days-since-last-update, and a ⚠ indicator for
  controls stale >30 days.
- **MODIFIED** `ExecBoardView` — adds a Policy Coverage KPI card showing
  "X of Y policies mapped" and total unresolved clause count, fetched
  alongside existing board signals.
- **MODIFIED** `backend/src/index.ts` — auto-initializes org on startup from
  `SEED_ORG_ID` + `SEED_ORG_NAME` env vars so fresh deployments are
  immediately usable.

## Impact

- Affected capability: `gsd-dashboard-phase2` (new)
- Affected code:
  - `frontend/src/components/gsd/OperatorView.tsx`
  - `frontend/src/components/gsd/ExecBoardView.tsx`
  - `backend/src/index.ts`
- No new backend endpoints — all calls use existing API surface
- Risk: low (additive inline edits; no existing render paths removed)
