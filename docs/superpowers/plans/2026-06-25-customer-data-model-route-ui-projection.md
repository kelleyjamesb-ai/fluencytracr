# Customer Data Model Route UI Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first non-financial customer evidence status route/UI projection over compact `ai_value_customer_data_model_snapshots`.

**Architecture:** Contract the boundary first, then add a source-bound backend projection endpoint that maps compact persisted snapshot fields into a safe allowlisted status response and render that response in the existing AI Value Workspace. BigQuery/Sigma live wiring, exports, rendered readouts, confidence math, finance output, and customer-facing economic output remain blocked.

**Tech Stack:** Express + TypeScript backend, Jest API tests, React + Vitest frontend, existing AI Value repository and workspace patterns.

---

### Task 1: Backend Projection Route

**Files:**
- Modify: `backend/src/ai_value_routes.ts`
- Test: `backend/tests/ai_value_customer_data_model_projection_api.test.ts`

- [x] **Step 1: Write failing API tests**

Add tests that seed compact `store.aiValueCustomerDataModelSnapshots`, call `GET /api/v1/ai-value/customer-data-model/projections?measurement_plan_id=...`, and assert org scoping, empty hold state, strict query rejection, latest-only behavior, and no full row/source/raw/economic/model fields.

- [x] **Step 2: Run red test**

Run: `npm test --workspace backend -- --runTestsByPath tests/ai_value_customer_data_model_projection_api.test.ts --runInBand`
Expected: FAIL because the route does not exist yet.

- [x] **Step 3: Implement minimal route mapper**

Add a strict query parser, call `listAiValueCustomerDataModelSnapshots`, map records into compact customer evidence status rows, set no-store/boundary headers, and return hold state when no rows exist.

- [x] **Step 4: Run green test**

Run: `npm test --workspace backend -- --runTestsByPath tests/ai_value_customer_data_model_projection_api.test.ts --runInBand`
Expected: PASS.

### Task 2: Frontend Projection Panel

**Files:**
- Modify: `frontend/src/lib/aiValueApi.ts`
- Modify: `frontend/src/pages/AIValueWorkspace.tsx`
- Modify: `frontend/src/pages/AIValueWorkspace.test.tsx`
- Modify: `frontend/src/styles.css`

- [x] **Step 1: Write failing UI tests**

Add tests that mock the projection endpoint and assert the workspace shows a customer evidence projection panel, safe empty state, compact metric/window/source posture, and blocked outputs without unsafe language.

- [x] **Step 2: Run red test**

Run: `npm test --workspace frontend -- AIValueWorkspace.test.tsx`
Expected: FAIL because the frontend API helper and panel do not exist yet.

- [x] **Step 3: Implement minimal frontend client and panel**

Add a typed `fetchCustomerDataModelProjections` helper and render a compact panel in the workspace home using safe labels and no raw source fields.

- [x] **Step 4: Run green test**

Run: `npm test --workspace frontend -- AIValueWorkspace.test.tsx`
Expected: PASS.

### Task 3: Contract Docs and Verification

**Files:**
- Create: `docs/contracts/ai-value-customer-data-model-route-projection/README.md`
- Modify: `README.md`
- Modify: `.project/PROGRESS.md`

- [x] **Step 1: Document contract boundary**

Document the route/UI projection as non-financial customer evidence status only, with live connectors and BigQuery/Sigma deferred.

- [x] **Step 2: Run focused verification**

Run backend route test, frontend workspace test, backend build, frontend build, and governance gates appropriate to the touched paths.

- [x] **Step 3: Update progress**

Record what changed, what was verified, and that BigQuery/Sigma live wiring remains last.
