# Change: PRD Phase 3 — Execution disclosure (governance on trace read)

## Why

PRD Phase 3 requires **fail-closed** behavior: interpretive outputs (`signals`, `pattern`) must be **ALLOWED** or **SUPPRESSED** with reasons, defaulting to suppression on ambiguity.

## What changes

- New `backend/src/execution_disclosure.ts`: `evaluateExecutionDisclosure`, `applyDisclosureToTraces`.
- `GET /api/traces/reconstructed?include_signals=true` always applies disclosure; when `SUPPRESSED`, `signals`, `pattern`, and `pattern_confidence_tier` are `null`.
- Env `FLUENCY_MIN_EXECUTION_EVENTS_FOR_DISCLOSURE` (default 2).

## Impact

- Backend + tests + trace API doc; no ingest schema change.
