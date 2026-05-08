# Real Source Readiness Manifest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a metadata-only Real Source Readiness Manifest and `/methodology-review` section that show which synthetic Claim Packet inputs can be replaced by real sources.

**Architecture:** Add a standalone shared contract `RSRM_2026_05`, a synthetic fixture, and a review helper that can reference a claim packet but never mutate or upgrade it. Render the review in the existing Methodology Review Workspace alongside the methodology details, claim packet JSON export, QBR narrative, and QBR readiness summary.

**Tech Stack:** TypeScript, Zod, Jest, React, Vitest, OpenSpec.

---

### Task 1: Shared Contract and Fixture

**Files:**
- Create: `shared/src/realSourceReadinessSchemas.ts`
- Modify: `shared/src/index.ts`
- Create: `docs/contracts/real-source-readiness/README.md`
- Create: `docs/contracts/real-source-readiness/examples/glean-claim-packet-real-source-readiness.json`
- Modify: `docs/contracts/glean-claim-packet/REAL_SOURCE_READINESS.md`

- [ ] Write backend tests that fail because the schema/helper do not exist.
- [ ] Add Zod schemas for manifest, source inputs, field status, privacy boundary, approval state, affected buckets, ingestion path, and review summary.
- [ ] Add forbidden-field recursive validation.
- [ ] Add synthetic manifest fixture.
- [ ] Export from shared index.

### Task 2: Claim-Packet Review Helper

**Files:**
- Modify: `shared/src/realSourceReadinessSchemas.ts`
- Test: `backend/tests/real_source_readiness_manifest.test.ts`

- [ ] Build `buildRealSourceReadinessReview({ manifest, claim_packet })`.
- [ ] Return overall state, source counts/lists, affected claim buckets, top blockers, next upgrade action, ingestion decision, and `claim_readiness_effect: "no_readiness_upgrade"`.
- [ ] Assert no ROI calculation and no claim-bucket mutation.

### Task 3: Methodology Review UI

**Files:**
- Create: `frontend/src/constants/realSourceReadiness.ts`
- Modify: `frontend/src/pages/MethodologyReviewWorkspace.tsx`
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/pages/MethodologyReviewWorkspace.test.tsx`

- [ ] Import the manifest fixture and review helper.
- [ ] Add a Real-source readiness section.
- [ ] Show ready, blocked, unknown, approval-required sources, affected claim buckets, top blockers, next action, recommended ingestion path, and no-ingestion copy.
- [ ] Keep existing JSON export and QBR sections unchanged.

### Task 4: Spec and Verification

**Files:**
- Modify: `openspec/changes/add-real-source-readiness-manifest/*`
- Modify: `.project/PROGRESS.md`
- Modify: `harness/agent-progress.txt`

- [ ] Mark OpenSpec tasks complete.
- [ ] Run shared build, targeted backend tests, targeted frontend tests, frontend build/tests, docs sweep, OpenSpec validation, and `git diff --check`.
- [ ] Commit and push the branch.
