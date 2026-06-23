# Controlled Aggregate Data Pipeline Dry-Run Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that a scrubbed BigQuery/Sigma-shaped aggregate export package can enter the existing source-package review and Measurement Cell snapshot candidate path without live connector execution.

**Architecture:** Add a thin shared dry-run builder/validator that accepts a connector run manifest plus already-scrubbed aggregate exports, validates the manifest boundary, delegates intake to the existing Real Data Intake Packet Runner, and delegates candidate proof to the existing controlled Measurement Cell assembly runner. The output is compact internal dry-run metadata only; it does not persist, execute queries, create UI/routes, or emit customer-facing value/finance/confidence output.

**Tech Stack:** TypeScript shared engine, Node test runner, existing AI Value contract scripts.

---

### Task 1: Red Tests

**Files:**
- Create: `scripts/validate_ai_value_controlled_aggregate_pipeline_dry_run.test.mjs`
- Modify: `package.json`

- [ ] Add tests for a valid BigQuery-shaped manifest that produces `PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW`.
- [ ] Add tests for a valid Sigma-shaped manifest that produces `PASSED_INTERNAL_PIPELINE_DRY_RUN_REVIEW`.
- [ ] Add fail-closed tests for live execution, query text, raw rows, unsafe identifiers, drifted org/window binding, unsafe source refs, and blocked output fields.
- [ ] Add tests that require all downstream feeds except Measurement Cell snapshot candidate proof to remain false.

### Task 2: Shared Dry-Run Builder

**Files:**
- Create: `shared/src/aiValueEngine/controlledAggregatePipelineDryRun.ts`
- Modify: `shared/src/aiValueEngine/index.ts`

- [ ] Export schema version, builder, validator, and types.
- [ ] Validate a compact manifest with source system `bigquery_export` or `sigma_export`, dry-run mode, owner role, reviewed state, source refs, identity binding, windows, and safety policies.
- [ ] Reject live execution, query text, raw rows, prompts, transcripts, identifiers, ROI/EBITDA/finance, causality, productivity, probability, confidence, and full child payload smuggling.
- [ ] Recompute the controlled Measurement Cell assembly output from the provided aggregate fixture and compare compact refs/hashes.

### Task 3: CLI Runner

**Files:**
- Create: `scripts/run_ai_value_controlled_aggregate_pipeline_dry_run.mjs`
- Modify: `package.json`

- [ ] Load the existing controlled aggregate fixture.
- [ ] Build a BigQuery-shaped dry-run package by default, with `--source-system=sigma_export` support.
- [ ] Print only compact dry-run status, manifest ref, source system, candidate ref, candidate hash, and validation summary.

### Task 4: Docs And Progress

**Files:**
- Create: `docs/contracts/ai-value-controlled-aggregate-pipeline-dry-run/README.md`
- Modify: `.project/PROGRESS.md`
- Modify: `README.md`

- [ ] Document what the dry-run layer does and does not authorize.
- [ ] State explicitly that BigQuery/Sigma live connectors remain unbuilt.
- [ ] Update progress with verification evidence after tests pass.

### Task 5: Review And Verification

**Files:**
- No direct implementation files.

- [ ] Run CODE, BUG/QA, and ADVERSARIAL review.
- [ ] Fix any findings.
- [ ] Run focused tests, docs sweep, governance gates, and diff check.
