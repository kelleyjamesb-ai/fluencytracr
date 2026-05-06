# Change: PRD Phase 2 — Per-execution signals and pattern classification

## Why

PRD v1 §14–§15 require deterministic **behavioral signals** and **exactly one pattern per execution**, building on Phase 1 traces (`retry_sequences`, ordered events).

## What changes

- New module `backend/src/execution_signals.ts`: `SIGNAL_REGISTRY`, `computeExecutionSignals`, `classifyExecutionPattern`, `attachPhase2ToTraces`.
- `GET /api/traces/reconstructed?include_signals=true` returns `signals`, `pattern`, `pattern_confidence_tier` on each trace.
- Default thresholds (`DEFAULT_PHASE2_THRESHOLDS`) until workflow-relative baselines (PRD §16) are wired.

## Impact

- Backend only; no shared schema version bump for ingest payloads.
- Docs: `docs/api/traces-reconstructed.md`.
