# Tasks: add-gsd-dashboard-phase2

## 1. OpenSpec scaffolding
- [x] 1.1 Create proposal.md, tasks.md, and spec delta

## 2. Compliance mode toggle (OperatorView)
- [x] 2.1 Fetch current compliance mode on mount (`GET /compliance/mode`)
- [x] 2.2 Render shadow ↔ enforced toggle in Operator section header
- [x] 2.3 Call `PATCH /compliance/mode` on toggle; reflect optimistic state

## 3. Control Drift live table (OperatorView)
- [x] 3.1 Fetch controls from existing endpoint on mount
- [x] 3.2 Render per-control row: name, status, days-since-update
- [x] 3.3 Flag rows with ⚠ when stale >30 days

## 4. Policy Coverage KPI card (ExecBoardView)
- [x] 4.1 Fetch policy list alongside existing board signals
- [x] 4.2 Render "X of Y policies mapped" count
- [x] 4.3 Show total unresolved clause count below primary KPI

## 5. Auto org-init (backend)
- [x] 5.1 Read `SEED_ORG_ID` + `SEED_ORG_NAME` from env on startup
- [x] 5.2 Upsert org record if both vars are present; skip silently if absent

## 6. Build verification
- [x] 6.1 npm run build --workspace frontend — zero TS errors
- [x] 6.2 npm run test:ci --workspace backend — all tests pass
