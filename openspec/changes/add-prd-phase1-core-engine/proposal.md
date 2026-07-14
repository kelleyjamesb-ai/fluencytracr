# Change: PRD Phase 1 — Core engine (normalization + trace reconstruction)

## Why

PRD v1 (`artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md`) requires an **execution boundary** and **trace reconstruction** on top of strict ingest. Canonical fluency events previously had no `execution_id` or structural retry/step grouping.

## What changes

- Optional correlation fields on fluency events: `run_id`, `workflow_run_id`, `agent_run_id`, `chat_id`.
- Deterministic `execution_id` at persist time (`resolveFluencyExecutionId`).
- Trace reconstruction: ordering, retry-sequence detection (15m window), workflow stage grouping, placeholder tool groups.
- `POST /api/events` response includes `execution_ids` aligned with `event_ids`.
- `GET /api/traces/reconstructed` (ADMIN / ENABLEMENT_LEAD) for internal verification.

## Impact

- **Shared:** `fluencyTracrSchemas`, new `fluencyExecutionId.ts`.
- **Backend:** `store.buildFluencyEventRecord`, `trace_engine.ts`, `app.ts` routes and ingest paths.
- **Docs:** `docs/api/traces-reconstructed.md`.

## Corrective Governance Approval

James Kelley approved the bounded governance-drift repair on 2026-07-13. The
repair removes the contradictory direct-chat `user_id` requirement, rejects
identifier-bearing connector batches without partial signals, pins the direct
chat connector to compiled declared input paths, and aligns the trace
documentation with the existing sanitized runtime output. It adds no new route,
event, suppression reason, threshold, or customer-facing field.
