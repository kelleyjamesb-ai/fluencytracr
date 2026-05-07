# Progress

## Last Completed

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

## Blockers

- None for the completed Vercel/Supabase slice.

## Next Step

- Finish **phase-03**: §18 FSC evaluator, §20 minimum signal gate, wire §21 steps 1–2 with reasons `INCOMPLETE_EXECUTION` / `INSUFFICIENT_SIGNAL`; tests.
- Then **phase-04** → **phase-05** → **phase-06** → **phase-07** per `WORK_QUEUE.json` order.
- Phases **01–02**: confirm against repo vs blueprint done criteria; flip to `done` when verified, without skipping tests.
- Archive or review the Glean readiness OpenSpec changes after human approval; do not implement live Glean ingestion until the Phase 8 gate evidence is confirmed.
- Use `docs/integrations/glean/prototypes/executive-readiness-demo.html` for the executive clickable demo; keep it synthetic until live-data gate evidence is approved.
- If the human accepts the Glean Value Evidence program as a queue track, add bounded `glean-value-*` queue items before further implementation; next slice should expose bounded read tools for Value Evidence Pack and claim safety through the MCP package.
