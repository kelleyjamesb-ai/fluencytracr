# PRD §16 + §13 implementation (session)

## §16 Baseline computation

- **Module:** `backend/src/workflow_baseline.ts`
- **Behavior:** Per-`workflow_id` Phase 2 thresholds from iteration-depth and latency distributions (p50 / p75) over the caller’s windowed events; fallback to global defaults when execution count &lt; `WORKFLOW_BASELINE_MIN_EXECUTIONS` (default 3).
- **Wiring:** `buildObservabilityRollup` (same org + observation window as the API); `attachPhase2ToTraces` uses **`baseline_window`** (default **90d** on `GET /api/traces/reconstructed` when `include_signals`) unless overridden via `AttachPhase2Options`.
- **API:** No new fields; numeric baselines are not exposed.

## §13 Execution lifecycle

- **Module:** `backend/src/execution_lifecycle.ts`
- **Behavior:** `computeExecutionLifecycle(ordered, trace, opts)` → `state` + `retry_sequence_count`. Terminal and open states inferred from dispositions, retry sequences, inactivity vs `now`, and max execution span.
- **API:** `GET /api/traces/reconstructed?include_signals=true` includes **`lifecycle`** on each trace; still present when disclosure suppresses `signals` / `pattern`.

## Tests

- `backend/tests/workflow_baseline.test.ts`
- `backend/tests/execution_lifecycle.test.ts`
- `backend/tests/contracts.test.ts` (lifecycle on include_signals)
- `backend/tests/execution_disclosure.test.ts` (lifecycle when suppressed)
