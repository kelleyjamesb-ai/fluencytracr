# Progress

## Last Completed

- Trust Episode Boundary research slice: added aggregate-only V4 research framing for AI work episodes, a dogfood BigQuery diagnostic for trust episode pattern shape, and regression checks preserving research-only governance. The live one-day BigQuery probe validated against scrubbed Glean customer-event and agent-span tables and produced an interpretable aggregate episode matrix; counts remain candidate episode-key counts, not deduplicated product episode totals.
- Trust Episode Boundary BigQuery readout: ran the diagnostic across three comparable business-day windows (2026-05-20, 2026-05-21, 2026-05-22) and recorded the aggregate pattern summary in `dogfood-output/trust-episode-boundary/TRUST_EPISODE_BOUNDARY_BIGQUERY_READOUT.md`; result remains `HOLD_FOR_RESEARCH` pending deduplication and formal V4 validation.
- Security check auth hardening: fixed critical `POST /auth/token` exposure by requiring a server-side issuer secret outside local development/test, making production/managed runtime JWT signing fail closed without `JWT_SECRET`, documenting `AUTH_TOKEN_ISSUER_SECRET`, removing the token-minting escape hatch from production runtimes, and preserving local/test fallback behavior only for development. Scan report: `/tmp/codex-security-scans/FluencyTracr/c7bfb4a_20260524T070208Z/report.md`.
- Reuse propagation diagnostic review fix: updated `snapshot_join_coverage` so candidate and unmatched coverage fields count distinct workflows instead of runs; focused SQL contract test passed.
- PR #275 conflict reconciliation: merged current `main` into `dogfood/fix-reuse-propagation-diagnostic`, preserving `main`'s V4 join-key diagnostic/readout and keeping the PR's separate reusable workflow propagation diagnostic plus workflow-granularity coverage test.
- V4 signal discovery review fix: corrected the delegation probe so `bucket_event_share` uses the full taxonomy-event denominator and named workflow agents can contribute to both `structured_delegation` and `reusable_leverage`; no runtime, schema, endpoint, migration, frontend, canonical event, or suppression reason changes.
- V4 signal discovery probe pack: added research-only signal promotion criteria, V4 discovery probe framing, and aggregate-only BigQuery probes for rapid refinement behavior, delegation depth, and reusable workflow propagation; no runtime, schema, endpoint, migration, frontend, canonical event, or suppression reason changes.
- PR #255 ingest concept conflict resolution: merged current `main` into `docs/ingest-concept`, preserving the V3 ingest privacy-boundary concept alongside the newly merged calibration concept and links.
- Velocity diagnostic verification attribution fix: added parent-surface join aliases so verification signals with only `session_token` still attribute to surfaces whose canonical key is `workflow_run_id`.
- Velocity review fixes: bounded the org-scope rejection to durable persistence mode, preserved in-memory velocity ingest without `x-org-id`, accepted integral `velocity_index` values in the dogfood multiplier fallback, and deduped standalone bot activity against all workflow-run sessions in the diagnostic SQL.
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

- Out-of-band security check is complete. One critical auth issue was fixed and production token minting cannot bypass the issuer-secret gate; no critical npm advisories were open. Two high, non-critical transitive dependency advisories remain deferred for a separate dependency-update slice.
- Queue uses **7 phased items** aligned with blueprint **§17** (`WORK_QUEUE.json` → `blueprint_ref`).
- All 7 phased queue items are marked **done** in `WORK_QUEUE.json`; no durable queue item is currently `in_progress`.
- Temporary frontend CI repair slice is complete; no original blueprint phase remains active.
- Temporary backend tenant-isolation repair slice is complete; no original blueprint phase remains active.
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
- Trust Episode Boundary is research-only and remains `HOLD_FOR_RESEARCH`: it can inform Trust Calibration investigation but does not productize a trust metric, add canonical events or suppression reasons, create ROI or causality claims, or permit individual/team ranking.
- Trust Product Episode Dedup readout is complete as a bounded dogfood research slice: seven completed business days compress 246,962,102 raw candidate keys into about 87.6M-88.0M aggregate product episodes, recovered-after-failure remains stable at about 18%, citation clicks remain under 1%, explicit feedback remains under 0.1%, and evidence-gap/key-confidence caveats remain blocking before any productization.
- Trust Key Confidence readout is complete as a bounded dogfood research slice: preserving the deduped product-episode definition shows about 99.95% of episodes have trace/run/action coverage, recovered-after-failure remains about 18% inside that high-confidence coverage, medium tracking-token-only and low session/workflow-only tiers are negligible, and the evidence gap remains about 42%.
- Trust Episode Boundary V4 validation is complete with decision `PROMOTE`: the signal is eligible for later Trust Calibration productization review, not automatically productized; the validation readout records seven comparable business-day windows, high trace/run/action coverage, stable recovered-after-failure behavior, aggregate-only governance, customer-safe output language, and required follow-up product contract work.
- Trust Episode Boundary input contract proposal is complete as a bounded docs-only productization step: it codifies Trust Calibration evidence handling, fail-closed evidence-gap behavior, customer-safe output language, citation requirements, and explicit non-goals without adding runtime output, schemas, APIs, canonical events, suppression reasons, ROI, or causality claims.

## Blockers

- None for the completed security check.

## Next Step

- Add a new bounded queue item before starting the next durable implementation track; the original 7-phase blueprint queue is complete.
- Archive or review the Glean readiness OpenSpec changes after human approval; do not implement live Glean ingestion until the Phase 8 gate evidence is confirmed.
- Use `docs/integrations/glean/prototypes/executive-readiness-demo.html` for the executive clickable demo; keep it synthetic until live-data gate evidence is approved.
- If the human accepts the Glean Value Evidence program as a queue track, add bounded `glean-value-*` queue items before further implementation; remaining hardening should include full-suite verification, optional linkcheck, and review/archive decisions for completed OpenSpec changes.
- Review/archive OpenSpec `add-qbr-narrative-view` after human approval.
- Stage 2 for Source Evidence Import should define the reviewer workflow around uploaded aggregate packages before implementing any persistence or live source connection.
- Next Source Evidence Import step should decide whether to add a reviewer upload/workspace for sanitized aggregate packages, or first define the exact Glean/customer export templates needed for survey, external outcomes, financial approvals, and customer-level product telemetry.
- Next Trust Episode Boundary step, if approved by the human, is a separate readout implementation or executive artifact wiring pass that uses the contract proposal; do not add schemas, APIs, new canonical events, new suppression reasons, ROI, or causality claims without another explicit approval.
