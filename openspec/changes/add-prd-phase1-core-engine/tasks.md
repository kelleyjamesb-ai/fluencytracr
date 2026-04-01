# Tasks — add-prd-phase1-core-engine

- [x] Add optional correlation fields to `FluencyEventBaseSchema` (strict union-safe).
- [x] Implement `resolveFluencyExecutionId` and `buildFluencyEventRecord`.
- [x] Wire `/api/events` and `/api/ingest` fluency paths to `buildFluencyEventRecord`.
- [x] Implement `trace_engine` (sort, retries, stage groups, query helper).
- [x] Add `GET /api/traces/reconstructed` with Zod query validation.
- [x] Tests: `trace_engine.test.ts`, fix fixtures for `execution_id`.
- [x] Document API (`docs/api/traces-reconstructed.md`).
