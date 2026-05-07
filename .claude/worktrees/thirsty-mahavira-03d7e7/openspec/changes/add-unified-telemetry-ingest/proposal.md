# Change: Unified telemetry ingest (UT_2026_04)

## Why

Cross-surface behavioral telemetry needs a validated partner path into FluencyTracr without overloading the legacy `event_type` ingest union. A dedicated route and shared Zod contract align runtime enforcement with `schemas/unified_telemetry/ut_event_union.schema.json`.

## What changes

- Add `POST /api/ingest/unified-telemetry` behind `FLUENCY_UNIFIED_TELEMETRY_INGEST=true`.
- Add `shared/src/unifiedTelemetrySchemas.ts` (Zod mirror of the unified JSON Schema).
- Persist accepted events in `store.unifiedTelemetryEvents` (does not yet merge into fluency pattern pipelines).
- Document API and env flags; OpenSpec **ingestion** capability requirements.

## Impact

- Affected specs: new `ingestion` capability (delta in this change).
- Affected code: `shared/`, `backend/src/store.ts`, `backend/src/app.ts`, tests.
