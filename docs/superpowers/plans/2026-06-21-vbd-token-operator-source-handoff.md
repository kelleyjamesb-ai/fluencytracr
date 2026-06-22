# VBD Token Operator Source Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a contract-first VBD + Token Operator Source Handoff that converts a validated aggregate VBD/token intake into operator-safe source/context fragments for the existing operator spine.

**Architecture:** Mirror the existing Blueprint and AI Fluency operator source handoffs. The new helper validates an already-built VBD Token Aggregate Intake, emits a `vbd_token` operator source plus separate `vbd_context` and `token_context` fragments, and emits a Layer 1 telemetry Source Package alignment reference through `source_refs.aggregate_probe_id`. Source Package Review Queue still owns reviewed package clearance.

**Tech Stack:** TypeScript shared engine module, Node test runner, contract README, package script.

---

### Task 1: Red Test

**Files:**
- Create: `scripts/validate_ai_value_vbd_token_operator_source_handoff.test.mjs`

- [x] Write tests proving a valid aggregate intake prepares only `operator_source`, `vbd_context`, `token_context`, and Layer 1 package alignment reference.
- [x] Write tests proving held/suppressed intake cannot feed operator intake.
- [x] Write tests proving context drift, unsafe refs, raw/query/person fields, and finance/confidence/probability side doors fail closed.
- [x] Run `npm run build --workspace shared && node --test scripts/validate_ai_value_vbd_token_operator_source_handoff.test.mjs` and confirm the expected red failure is a missing export.

### Task 2: Shared Contract Helper

**Files:**
- Create: `shared/src/aiValueEngine/vbdTokenOperatorSourceHandoff.ts`
- Modify: `shared/src/aiValueEngine/index.ts`

- [x] Implement `AI_VALUE_VBD_TOKEN_OPERATOR_SOURCE_HANDOFF_SCHEMA_VERSION`.
- [x] Implement `buildVbdTokenOperatorSourceHandoff(input)`.
- [x] Implement `validateVbdTokenOperatorSourceHandoff(handoff)`.
- [x] Reuse `validateVbdTokenAggregateIntake`.
- [x] Fail closed unless the aggregate intake validates and feeds Data Spine / Measurement Cell context.
- [x] Keep `source_package_reference` as an alignment hint; do not certify reviewed package clearance.
- [x] Keep all downstream financial, confidence, route, persistence, schema, UI, and raw-data feeds false.
- [x] Export the builder, validator, schema version, and types from the shared index.

### Task 3: Contract And Script

**Files:**
- Create: `docs/contracts/ai-value-vbd-token-operator-source-handoff/README.md`
- Modify: `package.json`

- [x] Document purpose, flow, produced fragments, feed rules, source package reference, boundaries, and validation commands.
- [x] Add `test:ai-value-vbd-token-operator-source-handoff`.

### Task 4: Verification

**Files:**
- Verify changed files only plus adjacent contract checks.

- [x] Run `npm run test:ai-value-vbd-token-operator-source-handoff`.
- [x] Run `npm run test:ai-value-vbd-token-aggregate-intake`.
- [x] Run `npm run test:ai-value-operator-intake-adapter`.
- [x] Run `npm run test:ai-value-source-package-review-queue`.
- [x] Run `npm run build --workspace shared`.
- [x] Run `bash scripts/ci_docs_contract_sweep.sh`.
- [x] Run `python3 scripts/ci_v1_governance_gates.py`.
- [x] Run `git diff --check`.
