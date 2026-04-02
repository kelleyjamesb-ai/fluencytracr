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
