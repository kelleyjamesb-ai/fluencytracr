# Operator Source Handoff Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete productization parts 1-4 by landing VBD + Token handoff, adding Customer Metric handoff, normalizing ROI Assumption and Governance handoffs, and bundling all governed operator source handoffs without adding UI, routes, persistence, schemas, live connectors, financial output, or confidence math.

**Architecture:** Mirror the existing Blueprint, AI Fluency, and VBD + Token operator source handoff pattern. Each lane emits an operator-safe `operator_source`, context fragments for downstream Measurement Cell input where appropriate, and a Source Package alignment hint only; Source Package Review Queue and Measurement Cell Assembly remain the real gates. The bundle composes validated handoffs and refuses to become a bypass, direct Measurement Cell feed, finance-context feed, or customer-facing output.

**Tech Stack:** TypeScript shared engine module, Node test runner, contract READMEs, package scripts, existing Data Spine / Source Package Review Queue / Operator Intake Adapter tests.

---

### Task 1: Preserve VBD + Token Handoff Baseline

**Files:**
- Existing: `shared/src/aiValueEngine/vbdTokenOperatorSourceHandoff.ts`
- Existing: `scripts/validate_ai_value_vbd_token_operator_source_handoff.test.mjs`
- Existing: `docs/contracts/ai-value-vbd-token-operator-source-handoff/README.md`
- Existing: `scripts/validate_ai_value_operator_intake_adapter.test.mjs`

- [x] Confirm the current VBD + Token handoff emits only `operator_source`, `vbd_context`, `token_context`, and `source_package_reference`.
- [x] Confirm held/suppressed aggregate telemetry cannot carry stale contexts.
- [x] Confirm unsafe refs, raw fields, query text, prompts, transcripts, identifiers, ROI, causality, productivity, probability, confidence, finance output, routes, persistence, UI, and schema side doors fail closed.
- [x] Confirm a valid handoff cannot clear Operator Intake without a matching feedable Layer 1 Source Package.
- [x] Run `npm run test:ai-value-vbd-token-operator-source-handoff`.
- [x] Run `npm run test:ai-value-operator-intake-adapter`.

### Task 2: Customer Metric Operator Source Handoff

**Files:**
- Create: `shared/src/aiValueEngine/customerMetricOperatorSourceHandoff.ts`
- Create: `scripts/validate_ai_value_customer_metric_operator_source_handoff.test.mjs`
- Create: `docs/contracts/ai-value-customer-metric-operator-source-handoff/README.md`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/contracts/ai-value-customer-metric-intake/README.md`
- Modify: `docs/contracts/ai-value-operator-intake-adapter/README.md`
- Modify: `scripts/validate_ai_value_operator_intake_adapter.test.mjs`

- [ ] Write the failing handoff tests first.
  - Ready Customer Metric Intake must produce `operator_source`, `selected_metric_context`, `metric_movement_context`, `layer_3_metric_context`, and `source_package_reference.source_refs.aggregate_outcome_export_id`.
  - Held/stale/unapproved/customer metric evidence must remain structurally valid but non-feedable with all fragments null.
  - Invalid input, drift across org/client/workflow/function/cohort/window/metric/source refs, unsafe refs, raw rows, query text, prompts, transcripts, user identifiers, ROI, causality, productivity, probability, confidence, finance output, routes, persistence, UI, schema fields, and direct Measurement Cell feeds must fail closed.
  - A valid handoff without a matching Layer 3 Source Package must keep Operator Intake held.
- [ ] Run `npm run build --workspace shared && node --test scripts/validate_ai_value_customer_metric_operator_source_handoff.test.mjs` and confirm the expected missing export failure.
- [ ] Implement the shared helper by reusing `validateCustomerMetricIntake`.
- [ ] Export the schema version, builder, validator, and types from `shared/src/aiValueEngine/index.ts`.
- [ ] Add `test:ai-value-customer-metric-operator-source-handoff` to `package.json`.
- [ ] Document the contract and update upstream/downstream docs.
- [ ] Run `npm run test:ai-value-customer-metric-operator-source-handoff`.
- [ ] Run `npm run test:ai-value-customer-metric-intake`.
- [ ] Run `npm run test:ai-value-operator-intake-adapter`.

### Task 3: ROI Assumption / Governance Source Handoff Normalization

**Files:**
- Create: `shared/src/aiValueEngine/assumptionGovernanceOperatorSourceHandoff.ts`
- Create: `scripts/validate_ai_value_assumption_governance_operator_source_handoff.test.mjs`
- Create: `docs/contracts/ai-value-assumption-governance-operator-source-handoff/README.md`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/contracts/ai-value-operator-intake-adapter/README.md`
- Modify: `scripts/validate_ai_value_operator_intake_adapter.test.mjs`

- [x] Write the failing normalization tests first.
  - Ready `assumption` input must produce an operator source and `source_package_reference.source_refs.assumption_approval_export_id`.
  - Ready `governance` input must produce an operator source and `source_package_reference.source_refs.governance_control_export_id`.
  - Held/missing/submitted/rejected/suppressed assumption or governance posture must stay non-feedable.
  - Invalid lane keys, unsafe source refs, raw rows, query text, prompts, transcripts, user identifiers, ROI, causality, productivity, probability, confidence, finance output, routes, persistence, UI, schema fields, and direct Measurement Cell feeds must fail closed.
  - A valid assumption/governance handoff without matching Source Package must keep Operator Intake held.
- [x] Run `npm run build --workspace shared && node --test scripts/validate_ai_value_assumption_governance_operator_source_handoff.test.mjs` and confirm the expected missing export failure.
- [x] Implement one shared normalizer with lane-specific constants for `assumption` and `governance`.
- [x] Export the schema version, builder, validator, and types from `shared/src/aiValueEngine/index.ts`.
- [x] Add `test:ai-value-assumption-governance-operator-source-handoff` to `package.json`.
- [x] Document the normalization boundary.
- [x] Run `npm run test:ai-value-assumption-governance-operator-source-handoff`.
- [ ] Run `npm run test:ai-value-source-package-review-queue`.
- [x] Run `npm run test:ai-value-operator-intake-adapter`.

### Task 4: Operator Source Handoff Bundle

**Files:**
- Create: `shared/src/aiValueEngine/operatorSourceHandoffBundle.ts`
- Create: `scripts/validate_ai_value_operator_source_handoff_bundle.test.mjs`
- Create: `docs/contracts/ai-value-operator-source-handoff-bundle/README.md`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/contracts/ai-value-operator-intake-adapter/README.md`

- [ ] Write the failing bundle tests first.
  - Bundle accepts validated Blueprint, AI Fluency, VBD + Token, Customer Metric, Assumption, and Governance handoffs.
  - Bundle emits `operator_sources`, `measurement_cell_context_fragments`, and `source_package_references` only.
  - Bundle holds if any lane is missing, held, blocked, invalid, stale, misaligned, or unsafe.
  - Bundle rejects duplicated lane refs, cross-lane org/client/workflow/function/cohort/window drift, stale embedded validation, direct Measurement Cell feeds, finance/confidence/customer-facing feeds, raw rows, query text, prompts, transcripts, user identifiers, ROI, causality, productivity, probability, confidence, route, persistence, UI, or schema side doors.
- [ ] Run `npm run build --workspace shared && node --test scripts/validate_ai_value_operator_source_handoff_bundle.test.mjs` and confirm the expected missing export failure.
- [ ] Implement the bundle as a thin contract helper over existing lane validators.
- [ ] Export the schema version, builder, validator, and types from `shared/src/aiValueEngine/index.ts`.
- [ ] Add `test:ai-value-operator-source-handoff-bundle` to `package.json`.
- [ ] Document bundle purpose, flow, blocked uses, and explicit non-goals.
- [ ] Run `npm run test:ai-value-operator-source-handoff-bundle`.
- [ ] Run `npm run test:ai-value-operator-intake-adapter`.

### Task 5: Final Verification And Handoff

**Files:**
- Modify: `.project/PROGRESS.md`
- Optional append: `harness/agent-progress.txt`

- [ ] Run `npm run test:ai-value-vbd-token-operator-source-handoff`.
- [ ] Run `npm run test:ai-value-customer-metric-operator-source-handoff`.
- [ ] Run `npm run test:ai-value-assumption-governance-operator-source-handoff`.
- [ ] Run `npm run test:ai-value-operator-source-handoff-bundle`.
- [ ] Run `npm run test:ai-value-customer-metric-intake`.
- [ ] Run `npm run test:ai-value-data-spine-readiness`.
- [ ] Run `npm run test:ai-value-source-package-review-queue`.
- [ ] Run `npm run test:ai-value-operator-intake-adapter`.
- [ ] Run `npm run test:ai-value-measurement-cell-assembly-runner`.
- [ ] Run `npm run build --workspace shared`.
- [ ] Run `bash scripts/ci_docs_contract_sweep.sh`.
- [ ] Run `python3 scripts/ci_v1_governance_gates.py`.
- [ ] Run `git diff --check`.
- [ ] Update `.project/PROGRESS.md` with completed scope, verification evidence, and remaining risk.
