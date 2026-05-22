# Progress

## Last Completed

- Multi-surface dogfood review fix: updated PR #238 branch worktree `/Users/jkelley/.codex/worktrees/review-91baf9-FluencyTracr` so `scripts/dogfood/run_multi_surface.py` sends short-window and 5-99 real-cohort rows through canonical `run_end_to_end.py` verdicting instead of skipping them with ad-hoc reasons, and preserves real cohort count for cohorts below 5 so canonical `INSUFFICIENT_VOLUME` applies; per-surface readout now includes canonical suppression reason alongside AIVM tags.
- Glean trust-layer deep dive: created `artifacts/glean_trust_layer_deep_dive_2026-05-07.md` and plan artifact on branch `cursor/glean-trust-layer-deep-dive-c7e6`; no queue status changed because this was a bounded user-requested strategy slice.
- Agent governance wiring: `.project/*`, `agents/core`, `agents/review`, `agents/README.md`.
- Implementation blueprint: `artifacts/FLUENCYTRACR_V1_IMPLEMENTATION_BLUEPRINT.md` (v1 build plan §1–17).
- Frontend CI matcher regression repair: realigned `frontend/package.json` with locked `vite`/`vitest` versions, eliminating invalid workspace resolutions and restoring `ProtectedRoute.test.tsx`.
- Backend tenant-isolation repair: fixed cross-org unified telemetry ingest, reconstructed trace leakage, and workflow aggregate mixing for shared workflow IDs.
- OpenSpec tooling + Vercel planning slice: added root `@fission-ai/openspec`, created `openspec/changes/update-vercel-single-project-services/`, and passed `npx openspec validate update-vercel-single-project-services --strict`.
- Explicit user-requested Glean addition: added the Glean Signal Readiness Map contract, shared validation schema, strict `fluency.get_agent_evidence_summary` MCP tool, and OpenSpec change `add-glean-signal-readiness-map`.
- Explicit user-requested Glean addition: added seeded Glean readiness inventory, generator, CLI command, generated demo map, and stakeholder demo summary.
- Glean readiness roadmap Phase 1: added strict Glean-style source fixture adapter for WorkflowRun, MCP Usage, and AI Security source records.
- Glean readiness roadmap Phase 2: added source-to-readiness CLI and source-derived Northstar readiness map artifact.
- Glean readiness roadmap Phase 7: added Glean readiness example validator and wired it into docs contract sweep.
- Glean readiness roadmap Phase 3: added readiness-to-Unified-Telemetry bridge for present entries plus non-computable signal metadata.
- Glean readiness roadmap Phase 4: added validated EvidenceBundle derivation from Glean readiness, including schema-checked demo fixture.
- Glean readiness roadmap Phase 5: added MCP readiness map and summary tools for aggregate Glean readiness questions.
- Glean readiness roadmap Phase 6: added stakeholder demo guide connecting maps, EvidenceBundle fixture, MCP summary tool, validation commands, and non-goals.
- Glean readiness roadmap Phase 8: added live-data access decision gate; Path C is the current pilot default until Path A/B evidence is confirmed.
- Glean readiness executive prototype: added a static synthetic-data HTML demo with first-screen executive graphs, drill-down click paths, an Agent Brief view, docs links, and a dedicated validator.
- Vercel Services + Supabase RLS hardening: root Services config now owns frontend/backend deployment, old backend Vercel project is disconnected from GitHub, production Supabase envs are fixed, authenticated DB health is green, and the live Prisma RLS migration covers public application tables.
- QBR Narrative View for Glean Claim Packet Export: added a shared `GCP_2026_05` narrative formatter, a `/methodology-review` QBR prep section, synthetic packet evidence for suppressed ROI/MCP claims, and tests preserving internal-only/suppressed boundaries.
- Product framing audit: tightened docs/UI copy around methodology-governed claim packaging, QBR-prep artifacts, not-an-ROI-calculator language, synthetic Nielsen fixtures, and strongest safe claim framing.
- QBR Readiness Summary: added a plain-language selected-packet summary for customer-safe, caveated, internal-only, suppressed/not-computed claims, top blockers, and next upgrade action without ROI calculation or readiness upgrades.
- Glean Claim Packet real-source readiness doc: added documentation-only fixture replacement gates for source inputs, mappings, unknowns, blockers, privacy, approvals, and minimum acceptance criteria without ingestion.
- Real Source Readiness Manifest: added `RSRM_2026_05`, source readiness review helper, synthetic manifest fixture, docs, and `/methodology-review` source-readiness section without ingestion, ROI calculation, or claim readiness upgrades.
- Aggregate Evidence Import Stage 1: added `AEI_2026_05`, a review-only admin-exported aggregate upload package, shared review helper, synthetic fixture/docs, backend/frontend tests, and `/methodology-review` Source Evidence Import section without live ingestion, persistence, ROI calculation, or claim readiness upgrades.
- Nielsen Source Evidence Trial Stage 2: added `NSETR_2026_05`, a document-derived claim mapping wrapper for the Nielsen value deck and Time-Saves packet; the trial maps 6 candidates, accepts 2 for review, withholds 4 behind source-system/approval gaps, and preserves no live ingestion, no persistence, no ROI calculation, and no claim readiness upgrades.
- Glean dogfood E2E harness slice: added pure-stdlib mocked GCE fixture generation, no-network dogfood runner, healthy/regressed/sparse unittest coverage, docs, and a PR-gating `dogfood-e2e` job in the Assurance Harness workflow.
- README/Glean value-realization repositioning slice: rewrote the public narrative around the 64% no-quality-signal gap, Quality Multiplier, Causal Delta, Reliability Factor, AIVM fields, and added the value-realization contract index; GitHub repo description/topics updated.
- JBTD/persona join-key slice: added optional opaque `jbtd_id` / `persona_id` across ingest schemas, persistence columns, classification aggregates, observability, Quality Multiplier, Causal Delta, and contract docs; cohort gates now apply per `(workflow_id, jbtd_id, persona_id)` slice and suppressed keyed slices are hidden from public observability.
- Outcome Evidence ingestion contract slice: added storage-only `POST`/`GET /api/v1/outcome-evidence`, Prisma `outcome_evidence` persistence, aggregate-only gates, OpenAPI/schema/OpenSpec/docs, attribution/README updates, and LMSYS assurance scenarios for `SURFACE + outcomes`, `SUPPRESS + outcomes`, and `no outcomes`.

## Current Status

- Queue uses **7 phased items** aligned with blueprint **§17** (`WORK_QUEUE.json` → `blueprint_ref`).
- **`phase-03-fsc-min-signal`** is **in_progress** (FSC + minimum signal gates before classification).
- Temporary frontend CI repair slice is complete; durable queue focus remains **`phase-03-fsc-min-signal`**.
- Temporary backend tenant-isolation repair slice is complete; durable queue focus remains **`phase-03-fsc-min-signal`**.
- The Glean readiness addition was completed as a bounded user-requested slice; queue status was not changed.
- The seeded readiness generator addition was completed as a bounded user-requested slice; queue status was not changed.
- Roadmap execution is on branch `codex/OrgFluency-glean-readiness-execution`; Phases 1 through 8 are complete and harness-verified.
- The executive HTML prototype is complete as a bounded user-requested slice; queue status was not changed.
- Out-of-band Vercel Services implementation is deployed to production at `https://learn-air-engable-tool-frontend.vercel.app`; authenticated `/health` returns `db: "ok"`.
- Out-of-band Glean trust-layer strategy artifact is complete; the referenced enclosed paper was not found on disk and should be added by path before a paper-specific appendix is written.
- Out-of-band Glean Value Evidence execution plan is complete; it reframes the insertable product around Glean client value evidence across Search/Chat, Skills, Auto Mode Agents, triggered Agents, MCP/actions, embedded hosts, artifacts, and Protect/runtime controls.
- Glean Value Evidence Pack contract slice is complete: OpenSpec `add-glean-value-evidence-pack`, shared `GVE_2026_05` Zod schema, contract docs, synthetic example, and backend schema tests.
- Glean Claim Registry contract slice is complete: OpenSpec `add-glean-claim-registry`, shared `GCR_2026_05` schemas, default 10-template registry, org-window evaluation example, registry-aware mapping into Value Evidence Pack claim readiness, and a Glean value governance gate.
- Glean Assumption Ledger contract slice is complete: OpenSpec `add-glean-assumption-ledger`, shared `GAL_2026_05` schema, Time-Saves-seeded assumption ledger example, targeted tests, and governance gate coverage for low-confidence/high-sensitivity customer-facing assumptions.
- Glean Skills + Auto Mode Agent readiness slice is complete: source readiness adapter supports `agent_run` and `skill_lifecycle`, source fixtures use closed note/action codes, source-derived readiness map includes Skills and Auto Mode Agents as current value surfaces, and privacy tests reject arbitrary free text.
- Glean AI Work Evidence adapter slice is complete: OpenSpec `add-glean-ai-work-evidence-adapter`, shared `GAW_2026_05` metadata-only schema, readiness inventory mapping, registry-aware claim evaluation mapping, docs/example, and targeted tests.
- Glean Value Evidence MCP tools slice is complete: OpenSpec `add-glean-value-evidence-mcp-tools`, strict value evidence summary helper, four bounded MCP tools, docs updates, audit/error hardening, and MCP tests.
- Glean Value Evidence Pack prototype slice is complete: static synthetic HTML prototype, validator, and demo-guide links for QBR-safe claim readiness, evidence coverage, instrumentation gaps, and Glean Agent answer flow.
- QBR Narrative View slice is complete as a bounded user-requested addition; it renders the existing claim packet for QBR prep without ROI calculation, readiness upgrade, or raw content ingestion.
- Product framing audit is complete as a bounded user-requested copy/docs slice; no claim behavior changed.
- QBR Readiness Summary slice is complete as a bounded user-requested addition; it summarizes existing claim packet buckets only.
- Glean Claim Packet real-source readiness doc is complete as a bounded documentation-only slice; it does not implement ingestion, ROI calculation, or claim readiness upgrades.
- Real Source Readiness Manifest slice is complete as a bounded user-requested addition; it shows which synthetic Claim Packet inputs are ready, blocked, unknown, or approval-dependent before ingestion exists.
- Aggregate Evidence Import Stage 1 is complete as a bounded user-requested addition; it reviews admin-exported aggregate metadata against the Real Source Readiness Manifest and separates accepted vs withheld evidence without storing data or changing claim readiness.
- Nielsen Source Evidence Trial Stage 2 is complete as a bounded user-requested addition; it shows that the Nielsen deck can be mapped into FluencyTracr as document-derived claim candidates, while survey, CS/CX outcome, financial, and customer telemetry claims remain withheld until real aggregate exports or approvals are attached.
- Outcome Evidence ingestion contract is complete as a bounded user-requested addition; it stores and replays aggregate KPI outcomes beside unchanged workflow verdicts and does not compute correlation, causation, attribution, dollarization, or readiness upgrades.

## Blockers

- None for the completed Vercel/Supabase slice.

## Next Step

- Finish **phase-03**: §18 FSC evaluator, §20 minimum signal gate, wire §21 steps 1–2 with reasons `INCOMPLETE_EXECUTION` / `INSUFFICIENT_SIGNAL`; tests.
- Then **phase-04** → **phase-05** → **phase-06** → **phase-07** per `WORK_QUEUE.json` order.
- Phases **01–02**: confirm against repo vs blueprint done criteria; flip to `done` when verified, without skipping tests.
- Archive or review the Glean readiness OpenSpec changes after human approval; do not implement live Glean ingestion until the Phase 8 gate evidence is confirmed.
- Use `docs/integrations/glean/prototypes/executive-readiness-demo.html` for the executive clickable demo; keep it synthetic until live-data gate evidence is approved.
- If the human accepts the Glean Value Evidence program as a queue track, add bounded `glean-value-*` queue items before further implementation; remaining hardening should include full-suite verification, optional linkcheck, and review/archive decisions for completed OpenSpec changes.
- Review/archive OpenSpec `add-qbr-narrative-view` after human approval.
- Stage 2 for Source Evidence Import should define the reviewer workflow around uploaded aggregate packages before implementing any persistence or live source connection.
- Next Source Evidence Import step should decide whether to add a reviewer upload/workspace for sanitized aggregate packages, or first define the exact Glean/customer export templates needed for survey, external outcomes, financial approvals, and customer-level product telemetry.
