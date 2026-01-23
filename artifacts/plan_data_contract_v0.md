# Plan: V0 Data Contract Enforcement

## Scope
- Add forbidden-field validation with path reporting.
- Enforce schema version header on ingest endpoints.
- Quarantine unknown connector events with 202 response.
- Add contract tests and documentation.

## Steps
1. Add `backend/src/validation/forbiddenFields.ts` with recursive path detection.
2. Add middleware for forbidden fields and schema version.
3. Extend in-memory store with connector quarantine map.
4. Update connector service to expose known event types and detect unknowns.
5. Wire middleware and quarantine logic into ingest endpoints.
6. Add tests in `backend/tests/contracts.test.ts`.
7. Add `docs/V0_DATA_CONTRACT.md`.
