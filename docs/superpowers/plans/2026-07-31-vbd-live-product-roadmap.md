# VBD Live Product Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the aggregate VBD trajectory work from held synthetic research
to a qualified internal production readout in the existing AI Value Workspace.

**Architecture:** Statistical acceptance, canonical-runtime qualification, and
product exposure remain separate promotion tracks. They converge only through
a compact fail-closed backend projection that exposes an accepted state,
caveats, and evidence lineage to the existing aggregate-only workspace. The
first live surface is internal and read-only; customer-facing confidence,
probability, causal, productivity, ROI, and financial claims remain blocked.

**Tech Stack:** Python/PyMC research runner, GCP Confidential Space candidate,
TypeScript shared contracts, Node/Express backend, Prisma/PostgreSQL only when
separately promoted, React frontend, OpenSpec, Assurance Harness.

## Global Constraints

- Preserve all nine invariants in `AGENTS.md`.
- Keep the existing nine canonical events and five suppression reasons locked.
- Use aggregate cohort evidence only; no person-level inputs, storage, output,
  scoring, ranking, prompts, transcripts, raw event rows, or direct identifiers.
- Default to `HOLD`/`SUPPRESS`; missing, stale, ambiguous, unqualified, or
  unauthenticated evidence cannot reach the product readout.
- Preserve the frozen VBD model, priors, estimand, seeds, and `<=0.10` MCSE
  threshold unless a separately human-authored methodology decision changes
  the exact contract.
- A contract merge, deployment, or successful synthetic run is not live proof.
- Each numbered slice below is a separate queue item, branch, exact-tree review,
  and PR. A predecessor `HOLD` blocks its successors.
- GCP access, credentials, provisioning, migrations, deployment, qualification
  execution, and production activity require fresh action-specific authority.

---

## Definition of Live

The first acceptable live state is:

```text
INTERNAL_VBD_EVIDENCE_STATUS_LIVE
```

It requires all of the following to be true at the same merged SHA lineage:

1. VBD synthetic methodology and evidence are accepted.
2. Sections 7.5, 7.6, and 7.7 are closed without `HOLD`.
3. Section 7.8 qualification plan and authorized qualification execution pass.
4. The canonical runtime processes only approved aggregate inputs and emits a
   compact authenticated result projection.
5. The backend persists or projects only the promoted compact product record.
6. The internal AI Value Workspace reads that record and fails closed on every
   missing, stale, mismatched, or held state.
7. Production deployment is traceable to the merged SHA and passes an
   authenticated correct-account smoke test.

This state does not authorize customer-facing posterior values, confidence or
probability language, ROI, causality, productivity, ranking, or financial
output.

## Current State

- Section 7.5.1 is merged through PR #477 at merge commit
  `7efdf82a9aaefb7e78fcc253f2705ea2b8061a67`.
- Section 7.5.2 is the next architecture slice and remains `pending`.
- The VBD trajectory implementation remains
  `SYNTHETIC_IMPLEMENTATION_HELD_FOR_NUMERICAL_PRECISION_REPAIR`.
- Task 2.6, replacement precision canaries, concordance, full evidence, and
  human evidence acceptance remain incomplete.
- No canonical-runtime SUT, qualified GCP runtime, live model output, or VBD UI
  wiring exists.

## Task 1: Close the Statistical Acceptance Track

**Files:**
- Modify through separately authorized slices:
  `openspec/changes/add-vbd-trajectory-calibration-contract/`
- Modify through separately authorized slices:
  `docs/contracts/ai-value-vbd-trajectory-model-calibration/`
- Modify through separately authorized slices: `.project/WORK_QUEUE.json`
- Modify through separately authorized slices: `.project/PROGRESS.md`

**Produces:** One exact accepted VBD evidence record that may be consumed by a
qualified internal runtime. It does not produce a product readout.

- [ ] Add one human-authored bounded replacement item for task 2.6; do not
  revive the permanently held canary-0 or PR #434 execution lineages.
- [ ] Implement and review only the approved numerical-precision repair.
- [ ] Pass both replacement non-admissible precision canaries.
- [ ] Freeze and pass the 30-bundle source/NUTS concordance gate.
- [ ] Run the full synthetic evidence plan once on the final reviewed SHA.
- [ ] Record the nondelegable human exact-byte evidence acceptance.

**Exit gate:** `VBD_TRAJECTORY_SYNTHETIC_EVIDENCE_ACCEPTED` on one immutable
lineage. Any failed canary, MCSE breach, source mismatch, or review `HOLD` keeps
the product track blocked.

## Task 2: Close the Canonical Runtime Architecture

**Files:**
- Modify through existing human-authored queue items:
  `docs/contracts/canonical-inference-gcp-transport-persistence-constraints/`
- Modify through existing human-authored queue items:
  `docs/contracts/canonical-inference-gcp-runtime-candidate/README.md`
- Modify through existing human-authored queue items: `.project/WORK_QUEUE.json`
- Modify through existing human-authored queue items: `.project/PROGRESS.md`

**Produces:** An internally consistent, implementation-ready contract set. It
does not produce infrastructure or runtime authority.

- [ ] Complete Section 7.5.2 network/channel/local-ephemeral enforcement.
- [ ] Complete Section 7.5.3 persistence/retention/anchor contract.
- [ ] Complete Section 7.5.4 audit completeness/privacy contract.
- [ ] Pass the Section 7.5.5 full-contract closure gate.
- [ ] Complete Sections 7.6.1 and 7.6.2 attempt-ledger contracts.
- [ ] Pass the Section 7.6.3 full-contract closure gate.
- [ ] Pass the Section 7.7 whole-system integration and threat-model gate.

**Exit gate:** `SECTION_7_7_GO`. Every slice uses its existing fail-closed queue
contract; no new architecture layer is added.

## Task 3: Plan and Execute Section 7.8 Qualification

**Files:**
- Create after `SECTION_7_7_GO`:
  `docs/contracts/canonical-inference-gcp-qualification/README.md`
- Create after `SECTION_7_7_GO`:
  `openspec/changes/add-gcp-canonical-runtime-qualification/`
- Modify after `SECTION_7_7_GO`: `.project/WORK_QUEUE.json`
- Modify after `SECTION_7_7_GO`: `.project/PROGRESS.md`

**Produces:** A reviewed qualification plan, followed by a separately
authorized execution result for exact hosts, zones, images, processes, probes,
cost/quota ceilings, and failure decisions.

- [ ] Create the human-authored Section 7.8 qualification-plan queue item only
  after the merged Section 7.7 result is exactly `GO`.
- [ ] Freeze the exact qualification inventory and decision mapping.
- [ ] Obtain separate authority for GCP access, credentials, provisioning, and
  qualification execution.
- [ ] Execute qualification without customer or production data.
- [ ] Freeze the qualification result and run exact-SHA CODE, BUG, and
  ADVERSARIAL review.

**Exit gate:** `SECTION_7_8_QUALIFICATION_GO`. A docs-only plan, provisioned
resource, or partially passing probe is insufficient.

## Task 4: Implement the Smallest Internal Runtime

**Files:**
- Create only after Tasks 1 and 3 pass: `backend/src/vbd-runtime/`
- Create only after Tasks 1 and 3 pass: `backend/src/vbd-runtime/__tests__/`
- Modify only after Tasks 1 and 3 pass: `backend/src/app.ts`
- Test only after Tasks 1 and 3 pass: `backend/tests/health_postgres.test.ts`
- Modify only after Tasks 1 and 3 pass: `shared/src/aiValueEngine/index.ts`

**Produces:** One internal asynchronous execution path from an authenticated,
approved aggregate input envelope to an authenticated compact result reference.

- [ ] Define the compact runtime request and result projections from the
  accepted VBD and Section 7.8 contracts.
- [ ] Add fail-first tests for stale lineage, replay, wrong tenant/runtime,
  missing reservation, incomplete terminal evidence, and privacy leakage.
- [ ] Implement one server-owned submission path; callers cannot choose
  acceptance, retry, or output posture.
- [ ] Implement readback that returns `HOLD` unless reservation, runtime,
  terminal, receipt, and accepted-evidence lineages all agree.
- [ ] Add readiness checks that distinguish configured, reachable, qualified,
  and healthy states.

**Exit gate:** The runtime passes focused attack tests, the PostgreSQL verifier
when persistence is promoted, the full required suite once on the reviewed SHA,
and a synthetic non-production smoke test. It remains internal-only.

## Task 5: Add the Internal Product Projection

**Files:**
- Create: `shared/src/aiValueEngine/vbdEvidenceStatus.ts`
- Test: `shared/src/aiValueEngine/vbdEvidenceStatus.test.ts`
- Modify: `backend/src/ai_value_routes.ts`
- Test: `backend/tests/ai_value_vbd_evidence_status_api.test.ts`
- Modify: `frontend/src/lib/aiValueApi.ts`
- Modify: `frontend/src/pages/AIValueWorkspace.tsx`
- Test: `frontend/src/pages/AIValueWorkspace.test.tsx`

**Produces:** A compact read-only internal product record containing only:

```text
state
methodology_version
aggregate_window_label
evidence_posture
required_caveats
blocked_uses
next_evidence_action
observed_at
```

- [ ] Write shared contract tests that reject posterior samples, raw numeric
  posterior values, probability/confidence percentages, identifiers, source
  payloads, prompts, transcripts, ROI, causality, productivity, and finance.
- [ ] Add one authenticated backend read route over the compact projection.
- [ ] Add API tests for correct-account access, stale/mismatched lineage, held
  evidence, unsupported methods, and sanitized errors.
- [ ] Add one AI Value Workspace panel that shows accepted/held posture,
  caveats, blocked uses, and next evidence action.
- [ ] Verify the UI never upgrades missing or held evidence to accepted and
  never derives a customer claim from the status record.

**Exit gate:** The existing internal AI Value Workspace renders the compact
status from backend readback with all language/privacy guards green.

## Task 6: Release a Restricted Live Internal Pilot

**Files:**
- Modify under a separate release item: `.project/WORK_QUEUE.json`
- Modify under a separate release item: `.project/PROGRESS.md`
- Modify as required by deployment: `vercel.json`
- Modify as required by deployment: backend/frontend environment documentation

**Produces:** A production deployment visible only to authorized internal users
and traceable to one merged SHA.

- [ ] Obtain explicit migration and deployment authority for the exact reviewed
  release SHA.
- [ ] Apply only promoted migrations through the repository-authoritative
  migration path.
- [ ] Deploy the backend; deploy the frontend only if Task 5 changed it.
- [ ] Verify database, runtime qualification, evidence acceptance, and compact
  projection readiness independently.
- [ ] Run an authenticated correct-account smoke test on the canonical domain.
- [ ] Record deployed SHA, deployment IDs, readiness results, and remaining
  customer-facing blocks in `.project/PROGRESS.md`.

**Exit gate:** `INTERNAL_VBD_EVIDENCE_STATUS_LIVE` with merged, deployed,
authenticated, and correct-account proof all present.

## Deferred Customer-Facing Promotion

Customer-facing VBD results are a separate future program. It requires a new
human-authored promotion decision and evidence that the proposed language and
fields do not become confidence scoring, probability claims, causal claims,
productivity measurement, rankings, ROI, or financial output. The internal live
roadmap does not authorize that program.
