# Value Hypothesis Productization Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productize Value Hypothesis Readiness as a governed data spine that can move from approved Blueprint, AI Fluency, VBD/token, customer metrics, assumptions, and governance evidence into Measurement Cells and internal readiness packets.

**Architecture:** The shared engine remains contract-first and non-persisted. Upload parsers, live BigQuery queries, UI, backend routes, schemas, migrations, and persistence stay outside the first architecture pass; the shared layer accepts already-parsed, aggregate-safe, source-bound objects and fails closed on misalignment.

**Tech Stack:** TypeScript shared engine, Node test runner, contract docs, validator-backed JSON examples.

---

## Phase 1: Data Spine Intake Readiness

**Goal:** Establish the alignment gate for all source lanes before Measurement Cell assembly.

**Files:**
- Create: `shared/src/aiValueEngine/dataSpineReadiness.ts`
- Create: `scripts/validate_ai_value_data_spine_readiness.test.mjs`
- Create: `docs/contracts/ai-value-data-spine-readiness/README.md`
- Create: `docs/contracts/ai-value-data-spine-readiness/examples/aligned-measurement-cell-ready.json`
- Create: `docs/contracts/ai-value-data-spine-readiness/examples/blueprint-approval-held.json`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`

- [x] **Step 1: Add failing tests for aligned, held, drifted, missing, manual, and unsafe source states**

Run:

```bash
npm run build --workspace shared && node --test scripts/validate_ai_value_data_spine_readiness.test.mjs
```

Expected before implementation: named export or contract missing.

- [x] **Step 2: Implement Data Spine Intake Readiness builder and validator**

The builder must align `org_id`, `client_id`, `workflow_family`, `function_area`,
`cohort_key`, `baseline_window`, and `comparison_window` across Blueprint,
AI Fluency, VBD/token, customer metric, assumption, and governance lanes.

- [x] **Step 3: Document boundaries**

The README must say scrubbed aggregate Glean/BigQuery summaries are supported,
but live BigQuery querying, upload parsing, raw-row ingestion, routes, UI,
persistence, ROI, causality, productivity, financial attribution, confidence
percentages, and probabilities are out of scope.

- [x] **Step 4: Verify examples**

Run:

```bash
npm run test:ai-value-data-spine-readiness
```

Expected: all tests pass.

## Phase 2: Blueprint Extraction Draft Contract

**Goal:** Turn uploaded Blueprint documents into governed review drafts before they can become approved Blueprint objects.

**Files:**
- Create: `shared/src/aiValueEngine/blueprintExtractionDraft.ts`
- Create: `scripts/validate_ai_value_blueprint_extraction_draft.test.mjs`
- Create: `docs/contracts/ai-value-blueprint-extraction-draft/README.md`
- Create: `docs/contracts/ai-value-blueprint-extraction-draft/examples/pending-approval-blueprint-extraction.json`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Test pending extraction does not feed Measurement Cell assembly**

Expected: a parsed draft with source refs and unmapped fields validates as
reviewable but has no Measurement Cell feed.

- [ ] **Step 2: Test approved extraction can become a Blueprint validation input**

Expected: approval state, owner role, workflow family, value route, metric
candidates, windows, and assumptions are present before it can feed downstream.

- [ ] **Step 3: Test unsafe document-derived content fails**

Expected: raw excerpts beyond bounded source refs, person-level fields, direct
identifiers, raw prompts/responses, ROI proof, causality, confidence, and
financial attribution fail closed.

## Phase 3: AI Fluency Client Import Adapter

**Goal:** Normalize aggregate AI Fluency dashboard exports by `client_id` and `org_id` into the existing AI Fluency baseline and intake bridge path.

**Files:**
- Create: `shared/src/aiValueEngine/aiFluencyClientImport.ts`
- Create: `scripts/validate_ai_value_ai_fluency_client_import.test.mjs`
- Create: `docs/contracts/ai-value-ai-fluency-client-import/README.md`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Test valid aggregate dashboard export**

Expected: aggregate cohort counts, construct scores, collection mode, instrument
ID, baseline/follow-up window, `client_id`, and `org_id` validate.

- [ ] **Step 2: Test suppression and small cohort behavior**

Expected: suppressed cohorts carry no scores and cannot feed Measurement Cell
or packet readiness by themselves.

- [ ] **Step 3: Test client/org mismatch**

Expected: `client_id` or `org_id` drift fails closed.

## Phase 4: Scrubbed Glean VBD And Token Intake

**Goal:** Bind existing scrubbed Glean export conversion, Token Efficiency, and VBD-token contracts to Data Spine Readiness without adding a live BigQuery connector.

**Files:**
- Create: `shared/src/aiValueEngine/vbdTokenAggregateIntake.ts`
- Create: `scripts/validate_ai_value_vbd_token_aggregate_intake.test.mjs`
- Create: `docs/contracts/ai-value-vbd-token-aggregate-intake/README.md`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Test valid scrubbed aggregate VBD/token summary**

Expected: VBD/token evidence aligns by org, workflow, function, cohort, window,
k-min, source ref, and source owner attestation.

- [ ] **Step 2: Test live BigQuery fields fail**

Expected: SQL text, raw rows, query text, table row samples, prompts,
responses, and direct identifiers fail closed.

- [ ] **Step 3: Test token usage remains cost/intensity context**

Expected: token data cannot change VBD formulas, upgrade claim readiness, or
feed finance-context readiness.

## Phase 5: Customer Metric Intake

**Goal:** Normalize customer-owned metric imports or manual aggregate entries into validated source-bound metric evidence.

**Files:**
- Create: `shared/src/aiValueEngine/customerMetricIntake.ts`
- Create: `scripts/validate_ai_value_customer_metric_intake.test.mjs`
- Create: `docs/contracts/ai-value-customer-metric-intake/README.md`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Test manual aggregate metric entry**

Expected: source owner, metric owner approval, metric ID, direction, denominator
or metric-definition context, baseline/comparison windows, and source ref are
required before downstream use.

- [ ] **Step 2: Test aggregate export metadata entry**

Expected: customer system-of-record export metadata can become Layer 3 evidence
only when validated and approved.

- [ ] **Step 3: Test stale, window-drifted, or owner-missing metrics hold**

Expected: no Measurement Cell or finance-context feed.

## Phase 6: Measurement Cell Assembly Runner

**Goal:** Build Measurement Cells only from aligned Data Spine Readiness plus validated source objects.

**Files:**
- Create: `shared/src/aiValueEngine/measurementCellAssemblyRunner.ts`
- Create: `scripts/validate_ai_value_measurement_cell_assembly_runner.test.mjs`
- Create: `docs/contracts/ai-value-measurement-cell-assembly-runner/README.md`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Test aligned data spine builds a Measurement Cell**

Expected: only `MEASUREMENT_CELL_READY` spines can feed builder input.

- [ ] **Step 2: Test held or suppressed source lanes block assembly**

Expected: missing evidence remains explicit and no packet runner feed appears.

- [ ] **Step 3: Test milestone and rolling windows**

Expected: milestone windows can support finance-context investigation only
through the existing Measurement Cell gate; rolling 30-day windows remain
operating context only.

## Phase 7: Real Data Intake Packet Runner

**Goal:** Compose already-parsed aggregate-safe inputs into the existing evidence assembly, Measurement Cell, and Value Hypothesis Readiness packet path.

**Files:**
- Create: `shared/src/aiValueEngine/realDataIntakePacketRunner.ts`
- Create: `scripts/validate_ai_value_real_data_intake_packet_runner.test.mjs`
- Create: `docs/contracts/ai-value-real-data-intake-packet-runner/README.md`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Test happy path from parsed aggregate inputs**

Expected: valid objects produce a non-persisted internal packet and source-bound
Measurement Cell.

- [ ] **Step 2: Test source drift across lanes**

Expected: drifted org, client, workflow, function, cohort, metric, source ref,
or window fails before packet assembly.

- [ ] **Step 3: Test forbidden side doors**

Expected: raw rows, document text, direct identifiers, person-level fields,
ROI, causality, productivity, confidence, probability, persistence, routes, UI,
and customer-facing financial output fail closed.

## Phase 8: Adversarial Client Fixture Pack

**Goal:** Prevent synthetic happy-path bias by adding messy, realistic packet fixtures.

**Files:**
- Create: `docs/contracts/ai-value-real-data-intake-packet-runner/examples/`
- Create: `scripts/validate_ai_value_adversarial_client_fixture_pack.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add fixture for mismatched windows**

Expected: packet is held before Measurement Cell assembly.

- [ ] **Step 2: Add fixture for missing metric owner approval**

Expected: customer metric lane is held and finance-context readiness is blocked.

- [ ] **Step 3: Add fixture for k-min failure and suppressed slices**

Expected: suppressed evidence cannot be rescued by other lanes.

- [ ] **Step 4: Add fixture for partial AI Fluency and missing Layer 3**

Expected: readiness can remain planning or evidence-review only.

## Phase 9: Thin UI Output Contract

**Goal:** Define what the UI may display after the deterministic packet exists.

**Files:**
- Create: `shared/src/aiValueEngine/valueHypothesisUiOutput.ts`
- Create: `scripts/validate_ai_value_ui_output_contract.test.mjs`
- Create: `docs/contracts/ai-value-ui-output/README.md`
- Modify: `shared/src/aiValueEngine/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Test UI output displays readiness, gaps, held lanes, caveats, and blocked claims**

Expected: UI output cannot display ROI proof, financial attribution,
confidence percentages, probabilities, productivity claims, or customer-facing
financial output.

- [ ] **Step 2: Test upload/review queue state**

Expected: UI output shows source lane status and next action, not a polished
executive proof dashboard.

---

## Current Productization Position

The architecture is ready to move from contract hardening into real intake
orchestration. It is not ready for live upload parsing, live BigQuery pulls,
persistence, backend routes, or customer-facing financial output.

The next implementation slice after Phase 1 is Phase 2 or Phase 7 depending on
the desired sequence:

- choose Phase 2 if Blueprint upload/review is the next user-facing intake
  risk;
- choose Phase 7 if packet orchestration across already-parsed aggregate
  inputs is the next system risk.
