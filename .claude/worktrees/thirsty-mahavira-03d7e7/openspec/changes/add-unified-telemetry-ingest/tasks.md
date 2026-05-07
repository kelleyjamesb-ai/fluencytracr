## 1. Implementation

- [x] 1.1 Add Zod schemas in `shared/src/unifiedTelemetrySchemas.ts` and export from `shared/src/index.ts`
- [x] 1.2 Add `unifiedTelemetryEvents` map and `insertUnifiedTelemetryEvent` in `backend/src/store.ts`
- [x] 1.3 Add `POST /api/ingest/unified-telemetry` in `backend/src/app.ts` with idempotency + forbidden-field checks
- [x] 1.4 Add `backend/tests/unified_telemetry_ingest.test.ts`
- [x] 1.5 Document env flags in `.env.example` and API in `docs/api/ingest-unified-telemetry.md`

## 2. Follow-up (not in this change)

- [ ] 2.1 Derive EvidenceBundle or fluency rollups from `unifiedTelemetryEvents` (separate change)
- [ ] 2.2 CI job: validate sample payloads against JSON Schema (optional `ajv` script)
