# Blueprint Measurement Contract Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing Blueprint-to-Measurement Cell alignment path so customer-approved Blueprint expectations carry expected behaviors, selected metrics, lag, and governed value-driver context without creating a new Blueprint Hypothesis or Measurement Plan object.

**Architecture:** Keep the existing spine: Blueprint Extraction Draft -> Blueprint Operator Source Handoff -> Measurement Cell -> Value Hypothesis Readiness. Add additive contract fields and fail-closed validation only where those fields are present or produced by builders. Do not add schemas, UI, routes, persistence, connectors, confidence math, ROI, causality, productivity, or customer-facing finance output.

**Tech Stack:** TypeScript shared engine, Node test runner, Markdown contract docs.

---

### Task 1: Blueprint Expectation Tests

**Files:**
- Modify: `scripts/validate_ai_value_blueprint_extraction_draft.test.mjs`
- Modify: `scripts/validate_ai_value_blueprint_operator_source_handoff.test.mjs`

- [x] **Step 1: Write failing extraction draft test**

Add a test that builds an approved Blueprint extraction with:

```js
expectedBehaviorPathways: [
  {
    behavior: "knowledge_retrieval",
    expected_vbd_signal: "depth",
    system_recommended: true,
    customer_selected: true
  }
],
metricCandidates: [
  {
    metric_id: "marketing_campaign_cycle_days",
    metric_name: "Campaign cycle time",
    expected_direction: "decrease",
    expected_lag_days: 60,
    system_recommended: true,
    customer_selected: true,
    value_driver: "capacity"
  }
]
```

Assert that the draft is valid, the approved Blueprint validation input remains valid, and no output feeds Measurement Cell directly.

- [x] **Step 2: Write failing handoff test**

Assert that a ready Blueprint handoff carries:

```js
expected_behavior_pathways
expected_metric_lag_days
expected_metric_system_recommended
expected_metric_customer_selected
value_driver
```

and still has `feeds.measurement_cell_direct_feed === false`, `feeds.confidence_model === false`, and `source_package_reference === null`.

- [x] **Step 3: Add adversarial handoff test**

Mutate a ready handoff so `expected_metric_customer_selected = false`, `value_driver = "ebitda"`, or an expected behavior contains raw prompt/probability language. Assert validation fails and all feed states are false.

- [x] **Step 4: Run RED**

Run:

```bash
npm run test:ai-value-blueprint-extraction-draft
npm run test:ai-value-blueprint-operator-source-handoff
```

Expected: new tests fail because fields are not implemented yet.

### Task 2: Shared Engine Additive Fields

**Files:**
- Modify: `shared/src/aiValueEngine/blueprintExtractionDraft.ts`
- Modify: `shared/src/aiValueEngine/blueprintOperatorSourceHandoff.ts`
- Modify: `shared/src/aiValueEngine/measurementCell.ts`

- [x] **Step 1: Add governed behavior and value-driver constants**

Use compiled constants only:

```ts
const ALLOWED_EXPECTED_BEHAVIORS = new Set([
  "knowledge_retrieval",
  "reuse",
  "delegation",
  "verification"
]);

const ALLOWED_EXPECTED_VBD_SIGNALS = new Set([
  "velocity",
  "breadth",
  "depth",
  "integration",
  "not_selected"
]);

const ALLOWED_VALUE_DRIVERS = new Set([
  "revenue",
  "cost",
  "capacity",
  "quality",
  "risk",
  "not_selected"
]);
```

- [x] **Step 2: Build Blueprint extraction fields**

Add optional input support for `expectedBehaviorPathways`. Normalize missing values to `[]`. Preserve metric candidate flags and lag values in `extracted_fields` and `blueprint_validation_input.source_requirements.approved_aggregate_inputs.outcome_signals`.

- [x] **Step 3: Validate additive Blueprint expectation fields**

Fail closed when:

- behavior or VBD signal is outside the governed set;
- `system_recommended` or `customer_selected` is not boolean;
- a ready customer-approved expectation marks `customer_selected !== true`;
- `expected_lag_days` is present and not a non-negative finite number;
- `value_driver` is outside the governed set.

- [x] **Step 4: Propagate into Blueprint Operator Source Handoff**

Emit expectation fields only as `blueprint_alignment_context`:

```ts
expected_behavior_pathways
expected_metric_lag_days
expected_metric_system_recommended
expected_metric_customer_selected
value_driver
```

Keep direct Measurement Cell feed, finance context, confidence model, and customer-facing financial output false.

- [x] **Step 5: Carry into Measurement Cell builder**

Add optional `blueprint_alignment.expected_behavior_pathways`, metric recommendation flags, and `value_driver`. Validate only if present, and reject unsafe values.

### Task 3: Docs And Scope Guardrails

**Files:**
- Modify: `docs/contracts/ai-value-blueprint-extraction-draft/README.md`
- Modify: `docs/contracts/ai-value-blueprint-operator-source-handoff/README.md`
- Modify: `docs/contracts/ai-value-measurement-cell/README.md`

- [x] **Step 1: Keep Measurement Plan out of scope**

Do not add `hypothesis_measurement_contract`, `recommended_metrics[]`,
`expected_lag_windows[]`, or `value_driver_pathways[]` to Measurement Plan.
Those would create a second planning contract surface and duplicate existing
Measurement Plan / Metrics Library responsibilities.

- [x] **Step 2: Document Blueprint expectation context only**

Document that this is a hardening of existing Blueprint Extraction Draft,
Blueprint Operator Source Handoff, and Measurement Cell `blueprint_alignment`
context. Use `value_driver`, not EBITDA driver fields; `expected_lag_days`
is descriptive customer-approved context only, not a threshold or confidence
model input.

### Task 4: Verification

**Files:**
- No new files beyond the plan, tests, shared engine, and docs.

- [x] **Step 1: Run focused tests**

```bash
npm run test:ai-value-blueprint-extraction-draft
npm run test:ai-value-blueprint-operator-source-handoff
npm run test:ai-value-measurement-cell
```

- [x] **Step 2: Run adjacent build**

```bash
npm run build --workspace shared
```

- [x] **Step 3: Review dirty worktree carefully**

Confirm no unrelated dirty review-gate files were modified or reverted.
