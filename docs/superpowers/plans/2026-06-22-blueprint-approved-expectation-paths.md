# Blueprint Approved Expectation Paths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add approved Blueprint expectation paths so one approved Blueprint can carry multiple customer-approved metric pathways while each Measurement Cell remains bound to exactly one path.

**Architecture:** Extend existing Blueprint Extraction Draft, Blueprint Operator Source Handoff, and Measurement Cell `blueprint_alignment` context with path references. Preserve current single-metric compatibility by keeping existing top-level expectation fields as the selected/default path view. Do not add Measurement Plan objects, schemas, UI, routes, persistence, confidence math, ROI, causality, productivity, or customer-facing financial output.

**Tech Stack:** TypeScript shared engine, Node test runner, Markdown contract docs.

---

### Task 1: Red Tests

**Files:**
- Modify: `scripts/validate_ai_value_blueprint_extraction_draft.test.mjs`
- Modify: `scripts/validate_ai_value_blueprint_operator_source_handoff.test.mjs`
- Modify: `scripts/validate_ai_value_measurement_cell.test.mjs`

- [x] **Step 1: Add extraction draft test for multiple approved paths**

Assert that an approved draft can preserve two `approvedExpectationPaths`, including primary and supporting metric roles, without feeding Measurement Cell directly.

- [x] **Step 2: Add handoff test for path registry plus selected path**

Assert that Blueprint Operator Source Handoff carries `approved_expectation_paths` and a selected `expectation_path_id` while keeping direct Measurement Cell, finance, confidence, and customer-facing feeds false.

- [x] **Step 3: Add Measurement Cell test for one-path binding**

Assert that one Measurement Cell binds to exactly one approved expectation path and fails closed when the selected metric drifts from the referenced path.

- [x] **Step 4: Run RED**

Run focused tests and confirm the new assertions fail because path registry support is not implemented yet.

### Task 2: Shared Engine Implementation

**Files:**
- Modify: `shared/src/aiValueEngine/blueprintExtractionDraft.ts`
- Modify: `shared/src/aiValueEngine/blueprintOperatorSourceHandoff.ts`
- Modify: `shared/src/aiValueEngine/measurementCell.ts`

- [x] **Step 1: Add approved path normalization**

Create `approved_expectation_paths` from explicit `approvedExpectationPaths` when present, otherwise derive a compatible single-path view from existing metric candidates.

- [x] **Step 2: Validate path fields**

Fail closed on missing path id, invalid metric role, invalid value driver, unsafe behavior/VBD labels, missing approval state/approver, unselected approved metric, negative lag, and path/source drift.

- [x] **Step 3: Propagate paths through handoff**

Carry the full approved path registry plus selected path id in `blueprint_alignment_context`; keep `source_package_reference: null` and all forbidden feeds false.

- [x] **Step 4: Bind Measurement Cell to one path**

Add optional `expectation_path_id` and `approved_expectation_path` to `blueprint_alignment`; validate one selected metric against one path while preserving legacy cells when explicit path context is absent.

### Task 3: Docs And Verification

**Files:**
- Modify: `docs/contracts/ai-value-blueprint-extraction-draft/README.md`
- Modify: `docs/contracts/ai-value-blueprint-operator-source-handoff/README.md`
- Modify: `docs/contracts/ai-value-measurement-cell/README.md`

- [x] **Step 1: Document path registry boundary**

State that approved paths are measurement contract context only, not confidence math, ROI, finance output, causality, productivity, or customer-facing output.

- [x] **Step 2: Run focused and adjacent tests**

Run Blueprint extraction, Blueprint handoff, Measurement Cell, Measurement Cell Assembly Runner, Operator Intake Adapter, Measurement Plan guardrail, shared build, and `git diff --check`.
