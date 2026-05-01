# Glean Readiness Integration Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build FluencyTracr's Glean integration from readiness proof to validated EvidenceBundle derivation without relying on individual-level data or unconfirmed Glean export assumptions.

**Architecture:** Keep the integration layered: Glean-style source records become a `GSR_INVENTORY_2026_05` inventory, the inventory becomes a validated `GSR_2026_05` readiness map, then only validated readiness outputs feed Unified Telemetry and EvidenceBundle derivation. Glean Agent access uses strict summary tools rather than raw internal structures.

**Tech Stack:** TypeScript, Zod, Jest, Node CLI scripts, OpenSpec, existing FluencyTracr shared/backend/MCP packages.

---

## Current Baseline

Already complete:

- `docs/contracts/glean-signal-readiness/README.md`: readiness map contract.
- `shared/src/gleanSignalReadinessSchemas.ts`: readiness map schema, seeded inventory schema, generator.
- `scripts/generate_glean_readiness_map.mjs`: seeded readiness generator CLI.
- `docs/contracts/glean-signal-readiness/examples/org-northstar-seeded-inventory.json`: seeded inventory.
- `docs/contracts/glean-signal-readiness/examples/org-northstar-weekly-readiness-map.json`: generated seeded readiness map.
- `docs/contracts/glean-signal-readiness/demo-org-northstar.md`: stakeholder demo summary.
- `packages/fluencytracr-mcp/src/tools.ts`: `fluency.get_agent_evidence_summary`.

Do not replace these. Build forward from them.

## End State

FluencyTracr should be able to:

1. Accept Glean-style source exports in a safe, local fixture format.
2. Map those source exports into `GSR_INVENTORY_2026_05`.
3. Generate a validated `GSR_2026_05` readiness map.
4. Convert approved readiness signals into Unified Telemetry coverage inputs.
5. Derive selected EvidenceBundle coverage/exposure/calibration values from those inputs.
6. Expose the result to Glean Agents through strict, suppression-safe MCP tools.
7. Produce a stakeholder-facing demo that explains measurable-now, blocked, suppressed, and missing signal families.

## Non-Negotiables

- No direct user identifiers.
- No team, manager, role, ranking, or productivity scoring outputs.
- No raw prompt text, model output, transcripts, message text, or file content.
- Unknown export status, unknown scrub status, missing join keys, or missing derived dimensions must become `not_computed`.
- Suppression always wins over derivation.
- Glean field availability must be treated as deployment-confirmed, not assumed.

---

## Phase 1: Glean-Style Source Fixture Adapter

**Outcome:** Realistic Glean-style fixture records can be mapped into the existing seeded inventory shape.

**Files:**

- Create: `docs/contracts/glean-signal-readiness/examples/source-fixtures/workflow-run.sample.json`
- Create: `docs/contracts/glean-signal-readiness/examples/source-fixtures/mcp-usage.sample.json`
- Create: `docs/contracts/glean-signal-readiness/examples/source-fixtures/ai-security.sample.json`
- Create: `shared/src/gleanSourceReadinessAdapter.ts`
- Modify: `shared/src/index.ts`
- Test: `backend/tests/glean_source_readiness_adapter.test.ts`
- OpenSpec: `openspec/changes/add-glean-source-readiness-adapter/`

**Implementation steps:**

- [x] Write a failing test that maps WorkflowRun-like source metadata to `signal_family: "workflow_run"` with `readiness_status: "present"` after generation.
- [x] Write a failing test that maps MCP Usage with unknown scrub status to `signal_family: "mcp_usage"` and `readiness_status: "not_computed"`.
- [x] Write a failing test that maps AI Security with governance hold to `signal_family: "ai_security"` and `readiness_status: "suppressed"`.
- [x] Add strict Zod schemas for Glean-style source fixture records in `shared/src/gleanSourceReadinessAdapter.ts`.
- [x] Add `mapGleanSourcesToReadinessInventory(records)` that emits `GSR_INVENTORY_2026_05`.
- [x] Reject unsafe fields using strict schemas and forbidden key tests.
- [x] Export adapter functions from `shared/src/index.ts`.
- [x] Verify with targeted backend tests and `npm run build --workspace shared`.

**Done when:**

- Source fixtures produce the same readiness classes as the seeded inventory.
- Unsafe fields fail validation before inventory generation.

---

## Phase 2: Source-to-Readiness CLI

**Outcome:** A local command can generate readiness maps from Glean-style source fixture files.

**Files:**

- Create: `scripts/generate_glean_readiness_from_sources.mjs`
- Modify: `package.json`
- Create: `docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json`
- Test: `backend/tests/glean_source_readiness_cli_contract.test.ts`

**Implementation steps:**

- [x] Write a failing test or script contract check that invokes source-to-inventory generation with the three source fixture files.
- [x] Add CLI arguments: `--workflow-run`, `--mcp-usage`, `--ai-security`, `--output`.
- [x] Default output to `docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json`.
- [x] Add root script `glean:readiness:sources`.
- [x] Run the CLI and commit the generated output.
- [x] Compare generated output against expected readiness statuses in a test.

**Done when:**

- `npm run glean:readiness:sources` generates a validated `GSR_2026_05` map.
- The generated source-derived map matches the seeded demo's intended status categories.

---

## Phase 3: Readiness-to-Unified-Telemetry Bridge

**Outcome:** Validated readiness entries produce aggregate Unified Telemetry coverage events without touching EvidenceBundle derivation yet.

**Files:**

- Create: `shared/src/gleanReadinessToUnifiedTelemetry.ts`
- Modify: `shared/src/index.ts`
- Test: `backend/tests/glean_readiness_to_unified_telemetry.test.ts`
- Docs: `docs/contracts/glean-signal-readiness/README.md`
- OpenSpec: `openspec/changes/add-glean-readiness-ut-bridge/`

**Implementation steps:**

- [x] Write a failing test that converts `present` readiness entries into UT coverage events.
- [x] Write a failing test that excludes `missing`, `suppressed`, and `not_computed` entries from computable UT events while preserving reason metadata in non-computable notes.
- [x] Implement `mapReadinessToUnifiedTelemetryCoverage(readinessMap)`.
- [x] Ensure generated UT events use `UT_2026_04` and org-window scope only.
- [x] Reject entries that imply user/team/manager/ranking dimensions.
- [x] Verify against `UnifiedTelemetryEventSchema`.

**Done when:**

- Readiness maps can safely produce UT coverage inputs.
- Non-computable signal families remain explicit and are not inferred.

---

## Phase 4: EvidenceBundle Derivation From Validated Readiness

**Outcome:** EvidenceBundle coverage and selected exposure/calibration fields can be derived from validated Glean readiness/UT inputs.

**Files:**

- Modify: `backend/src/app.ts` only if the current EvidenceBundle builder remains centralized there.
- Prefer create: `backend/src/evidence/gleanReadinessEvidence.ts`
- Test: `backend/tests/glean_readiness_evidence_bundle.test.ts`
- Create: `docs/contracts/evidence-bundle/v1/examples/glean-readiness-derived.json`
- Docs: `docs/contracts/evidence-bundle/v1/README.md`
- OpenSpec: `openspec/changes/add-glean-readiness-evidence-derivation/`

**Implementation steps:**

- [x] Write a failing test that present `workflow_run`, `agent_run`, and `search_document_retrieval` entries appear in EvidenceBundle coverage instrumentation.
- [x] Write a failing test that `mcp_usage` with `not_computed` remains in missing or not-computed coverage notes.
- [x] Write a failing test that suppressed `ai_security` does not produce exposure values but preserves suppression reasons.
- [x] Add a focused derivation module rather than expanding `backend/src/app.ts` unless unavoidable.
- [x] Wire the derivation into EvidenceBundle generation behind a fixture/demo path or explicit feature flag.
- [x] Verify EvidenceBundle v1 schema and suppression semantics.

**Done when:**

- EvidenceBundle output can explain what Glean signal families contributed.
- Suppressed and not-computed signals stay visible without being inferred.

---

## Phase 5: Glean Agent Readiness Tooling

**Outcome:** Glean Agents can ask both “what is the org evidence?” and “what Glean data is ready or missing?” through strict MCP tools.

**Files:**

- Modify: `packages/fluencytracr-mcp/src/tools.ts`
- Modify: `packages/fluencytracr-mcp/src/agentResponse.ts` if a new response template is needed.
- Test: `packages/fluencytracr-mcp/src/tools.test.ts`
- Docs: `docs/mcp/fluencytracr-mcp-server.md`
- Docs: `docs/integrations/glean/03-glean-agent-tooling.md`

**Implementation steps:**

- [ ] Add `fluency.get_signal_readiness_map` for trusted aggregate readiness access.
- [ ] Add `fluency.get_signal_readiness_summary` if the full map is too verbose for Glean Agent responses.
- [ ] Ensure both tools return strict templates and reject extra top-level fields.
- [ ] Audit every tool invocation without raw source records.
- [ ] Update Glean Agent docs with allowed question classes.

**Done when:**

- Agent tools answer readiness questions without exposing raw source fixtures or unsafe dimensions.

---

## Phase 6: Stakeholder Demo Package

**Outcome:** The repo contains a coherent demo package that explains FluencyTracr's Glean value path.

**Files:**

- Create: `docs/integrations/glean/06-readiness-demo-guide.md`
- Modify: `docs/contracts/glean-signal-readiness/demo-org-northstar.md`
- Modify: `README.md` only if the repo's canonical docs list needs the new demo link.

**Implementation steps:**

- [ ] Add a demo guide with a one-page narrative: measurable now, blocked, suppressed, missing, unlock next.
- [ ] Link seeded map, source-derived map, and strict MCP summary tool.
- [ ] Include validation commands.
- [ ] Include a “what this does not do” section covering surveillance/ranking/raw content.

**Done when:**

- A reviewer can understand the integration path without reading source code.

---

## Phase 7: CI and Regression Hardening

**Outcome:** Glean readiness contracts are validated automatically.

**Files:**

- Modify: `scripts/ci_docs_contract_sweep.sh`
- Create or modify: `scripts/validate_glean_readiness_examples.mjs`
- Modify: `.github/workflows/ci.yml` only if CI already runs comparable docs/contract checks for Node scripts.
- Test by running local scripts.

**Implementation steps:**

- [x] Add a validator that parses every JSON file under `docs/contracts/glean-signal-readiness/examples/`.
- [x] Validate inventories with `GleanSignalInventorySchema`.
- [x] Validate readiness maps with `GleanSignalReadinessMapSchema`.
- [x] Add the validator to docs contract sweep or CI.
- [x] Ensure validation does not require network access.

**Done when:**

- Invalid readiness examples fail locally and in CI.

---

## Phase 8: Live Data Access Decision Gate

**Outcome:** Decide whether to proceed to real Glean export ingestion, Glean MCP-hosted access, or keep the integration as a validated customer-supplied import path.

**Decision inputs:**

- Are WorkflowRun fields customer-accessible?
- Are MCP Usage fields customer-accessible?
- Which AI Security aggregate fields are approved for this product use?
- Can Skill lifecycle events be exported or queried safely?
- Are join keys stable across WorkflowRun, AgentRun, Actions, and MCP Usage?
- What retention and data processing terms apply?

**Possible paths:**

- Path A: Customer event-log import.
- Path B: Glean-hosted MCP/read tool access.
- Path C: Admin-exported aggregate inventory upload.

**Recommended default:** Path C for pilot safety, then Path A once export terms are confirmed.

---

## Verification Matrix

Run after each implementation phase:

```bash
npm test --workspace backend -- --runTestsByPath <phase-specific-test>
npm run build --workspace shared
bash scripts/ci_docs_contract_sweep.sh
bash scripts/ci_linkcheck_fluency_docs.sh
npx @fission-ai/openspec@latest validate <change-id> --strict --no-interactive
```

Run before merging the full roadmap:

```bash
npm test --workspace @learnaire/fluencytracr-mcp
npm run build --workspace @learnaire/fluencytracr-mcp
npm run glean:readiness
npm run glean:readiness:sources
```

## Recommended Build Order

1. Phase 1: Glean-style source fixture adapter.
2. Phase 2: Source-to-readiness CLI.
3. Phase 7: Example validation in CI.
4. Phase 3: Readiness-to-Unified-Telemetry bridge.
5. Phase 4: EvidenceBundle derivation.
6. Phase 5: Glean Agent readiness tooling.
7. Phase 6: Stakeholder demo package.
8. Phase 8: Live data access decision gate.

This keeps the build coherent while preserving reviewable implementation checkpoints.
