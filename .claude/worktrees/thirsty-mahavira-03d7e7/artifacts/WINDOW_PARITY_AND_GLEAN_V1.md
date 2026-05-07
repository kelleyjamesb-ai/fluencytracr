# Window parity + Glean v1 doc alignment (session)

## Backend (`backend/src/app.ts`)

- **`matchesWindow`**: compares record span to `WINDOW_DAYS[FluencyWindow]` for all fluency tokens.
- **Removed** `SUPPORTED_INFERENCE_WINDOWS`; `/api/patterns`, `/api/coverage`, and `/orgs/:orgId/telemetry/index` rely on `FluencyWindowSchema` + `matchesWindow`.
- **`/api/patterns`**: `coverage` denominator uses `WINDOW_DAYS[window]` (not 30/60 only).
- **`/api/orientation/:orgId`**, **`/api/board-snapshot/:orgId`**: accept any parsed `FluencyWindow`.
- **Evidence APIs**: `EVIDENCE_WINDOWS` = `daily`, `weekly`, …`FLUENCY_WINDOW_VALUES`; `EvidenceBundleWindow` type; `evidenceWindowDays` uses `WINDOW_DAYS` for fluency tokens; learning trend split when span ≥ 14 days; `supported_windows` responses use `Array.from(EVIDENCE_WINDOWS)`.

## Contracts & tests

- `docs/contracts/evidence-bundle/v1/evidence-bundle.schema.json` — extended `window` enum.
- `backend/tests/orientation_api.test.ts` — extended windows return 200.

## Docs

- Glean pack `01`–`03`, `docs/api/API_REFERENCE.md`, `docs/mcp/fluencytracr-mcp-server.md`, `docs/en|zh|es/MCP_INTEGRATION.md`, `docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md`.

## Verify

- `npm run build --workspace shared`
- `npm run test:ci --workspace backend` (302 tests)
