# Plan: FluencyTracr v1 boundary adaptation layer

## Harness
- Read `harness/README.md`; verify with `npm run test:ci --workspace backend`.
- Track in `harness/feature_list.json` (`prd-boundary-v1`).

## Scope
- `backend/src/boundary/*`: actor adapter, execution-id resolver, Zod boundary schemas, ingest mapper, wiring example.
- Fail-closed: no canonical type widening; compatibility only at boundary.

## Verification
- New Jest tests under `backend/tests/boundary/`.
- Full backend `test:ci` green.
