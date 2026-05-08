# Nielsen Source Evidence Trial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Map Nielsen deck and Time-Saves packet claims into FluencyTracr as review-only document-derived claim candidates.

**Architecture:** Add a narrow `NSETR_2026_05` wrapper around the existing `AEI_2026_05` Aggregate Evidence Import package. The wrapper records sanitized source artifacts and claim candidates, then delegates accepted/withheld behavior to the existing Source Evidence Import review helper. This is a trial mapping, not live ingestion.

**Tech Stack:** TypeScript, Zod shared schemas, Jest backend contract tests, existing docs contract patterns.

---

### Task 1: Contract and Red Tests

**Files:**
- Create: `backend/tests/nielsen_source_evidence_trial.test.ts`
- Create: `docs/contracts/nielsen-source-evidence-trial/examples/nielsen-source-evidence-trial.sample.json`
- Modify: `shared/src/index.ts`
- Create: `shared/src/nielsenSourceEvidenceTrialSchemas.ts`

- [x] **Step 1: Write failing backend tests**

Add tests that load the Nielsen trial fixture, parse `NSETR_2026_05`, build a review, and assert:
- the trial is document-derived only
- generated aggregate import remains `review_only_no_persistence`
- financial/source-deck claims do not upgrade claim readiness
- CS outcome and survey claims are withheld until source-system evidence is approved
- no forbidden raw/person-level fields appear

- [x] **Step 2: Run the targeted backend test and verify RED**

Run: `npm run test:ci --workspace backend -- nielsen_source_evidence_trial.test.ts`

Expected: fail because `nielsenSourceEvidenceTrialSchemas` and the sample fixture do not exist.

### Task 2: Shared Schema and Fixture

**Files:**
- Create: `shared/src/nielsenSourceEvidenceTrialSchemas.ts`
- Modify: `shared/src/aggregateEvidenceImportSchemas.ts`
- Modify: `shared/src/index.ts`
- Create: `docs/contracts/nielsen-source-evidence-trial/examples/nielsen-source-evidence-trial.sample.json`

- [x] **Step 1: Add schema and helper**

Create `NielsenSourceEvidenceTrialPackageSchema` with sanitized `source_artifacts`, `claim_candidates`, and `generated_aggregate_import`. Add `buildNielsenSourceEvidenceTrialReview(raw)` that returns mapping counts, candidate treatments, aggregate import review, no readiness upgrade, and governance boundaries.

- [x] **Step 2: Add required units/evidence type if needed**

Extend `AggregateEvidenceValueSchema` only for safe aggregate financial/source values needed by the fixture: `months`, `ratio`, and `currency_usd_millions`; add `survey` evidence type.

- [x] **Step 3: Add sanitized Nielsen sample**

Build the fixture from local Nielsen deck/Time-Saves packet observations:
- deck opportunity map as accepted document-derived source coverage
- Time-Saves methodology context as accepted methodology context
- survey opportunity as withheld until survey export is approved
- CS/CX aggregate outcome as withheld until Staircase AI aggregate export is approved
- financial model claims as withheld/internal-only until finance/customer-safe approval exists
- product telemetry gap as withheld until Glean customer-level aggregate telemetry exists

### Task 3: Docs and OpenSpec

**Files:**
- Create: `docs/contracts/nielsen-source-evidence-trial/README.md`
- Create: `openspec/changes/add-nielsen-source-evidence-trial/proposal.md`
- Create: `openspec/changes/add-nielsen-source-evidence-trial/design.md`
- Create: `openspec/changes/add-nielsen-source-evidence-trial/tasks.md`
- Create: `openspec/changes/add-nielsen-source-evidence-trial/specs/nielsen-source-evidence-trial/spec.md`

- [x] **Step 1: Document the trial**

Document that this maps source documents into claim candidates only. It does not ingest live data, persist records, calculate ROI, include raw file content, or upgrade claim readiness.

- [x] **Step 2: Add OpenSpec delta**

Add a proposal and requirement for a review-only Nielsen source evidence trial that uses sanitized document-derived candidates and delegates aggregate acceptance to `AEI_2026_05`.

### Task 4: Verification and Handoff

**Files:**
- Modify: `.project/PROGRESS.md`
- Modify: `harness/agent-progress.txt`

- [x] **Step 1: Run verification**

Run:
- `npm run build --workspace shared`
- `npm run test:ci --workspace backend -- nielsen_source_evidence_trial.test.ts aggregate_evidence_import.test.ts`
- `bash scripts/ci_docs_contract_sweep.sh`
- `git diff --check`

- [x] **Step 2: Update progress and commit**

Mark OpenSpec tasks complete, append progress notes, commit, and push the branch.

