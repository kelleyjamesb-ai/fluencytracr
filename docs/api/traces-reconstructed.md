# GET /api/traces/reconstructed

**Auth:** `ADMIN` or `ENABLEMENT_LEAD`  
**Purpose:** Reconstructed **execution traces** (Phase 1) plus optional **signals + pattern** (Phase 2) for internal analytics. Not the Phase 4 product observability surface.

## Query parameters

| Name | Required | Description |
| --- | --- | --- |
| `workflow_id` | one of | Filter events to this `workflow_id`. |
| `execution_id` | one of | Filter to a single normalized execution (see ingest). |
| `include_signals` | no | If `true`, `1`, or `yes`, each trace includes `signals`, `pattern`, `pattern_confidence_tier`, and `lifecycle` (PRD §13). |
| `baseline_window` | no | When `include_signals` is true, PRD §16 workflow baselines use this rolling window over stored events (default **`90d`**). Same token set as `FluencyWindow` (`30d` … `360d` where **`360d` spans 365 days**, `3m`, `6m`, `12m`). |

At least one of `workflow_id` or `execution_id` must be provided.

## Response

```json
{
  "traces": [
    {
      "workflow_id": "workflow-1",
      "retry_sequences": [
        { "sequence_index": 0 }
      ],
      "step_groups": [{ "group_id": "stage_group_0" }],
      "tool_groups": []
    }
  ]
}
```

Responses are sanitized by `sanitizeTraceForApi` before disclosure. Internal
`execution_id` and ordered event identifiers are omitted; retry pairs become
`sequence_index` entries, and step/tool groups expose only sanitized group
identifiers. `execution_id` remains available as an input filter on this route
but is never echoed in the response. Internally, it is assigned at ingest via
`resolveFluencyExecutionId` (`shared/src/fluencyExecutionId.ts`): `run_id` →
`workflow_run_id` → per-event singleton.

### Phase 2 + Phase 3 fields (`include_signals=true`)

Each trace may include:

- **`disclosure`** — `state`: `ALLOWED` | `SUPPRESSED`, `reasons`: string[] (PRD Phase 3). When `SUPPRESSED`, interpretive fields below are **`null`**; sanitized structural summaries such as retry indexes and step/tool group identifiers remain. **`lifecycle`** is still returned (structural / PRD §13).
- **`signals`** — `event_count`, `iteration_depth` (from retry sequences), `verification_present`, `recovery_present`, `abandonment_present`, `latency_ms`, `last_disposition`, `has_ai_usage`, `confidence_tier`.
- **`pattern`** — one of `FluencyPatternName` (mutually exclusive, PRD §15 priority).
- **`pattern_confidence_tier`** — `high` | `medium` | `low` from event count (not a product score).
- **`lifecycle`** — `state`: `INIT` | `ACTIVE` | `RETRY` | `COMPLETED` | `ERRORED` | `ABANDONED` (plus reserved `PAUSED` | `CANCELLED` in type for future events); `retry_sequence_count` matches trace retry sequences. Inferred from the ordered stream and optional wall clock (`now`); not a numeric baseline or trend.

**Suppression reasons (non-exhaustive):** `insufficient_event_count`, `low_confidence_tier`, `invalid_timestamps`. The minimum event count is compiled as `MIN_EVENT_COUNT_FOR_DISCLOSURE = 2` in `backend/src/execution_disclosure.ts`; it is not environment-configurable or request-tunable.

Phase 2 thresholds for pattern classification use **workflow-relative baselines** when `include_signals=true`: executions in the same `workflow_id` over **`baseline_window`** (default **90d**, from request-time `now`) drive internal percentiles (`backend/src/workflow_baseline.ts`). Fewer than `WORKFLOW_BASELINE_MIN_EXECUTIONS` executions (default **3**) per workflow fall back to `DEFAULT_PHASE2_THRESHOLDS`. Numeric baselines are **never** returned on this route (PRD §16.4).

## Related

- `POST /api/events` — returns counts only. A governed, non-personal `run_id` or `workflow_run_id` can establish deterministic execution grouping at ingest. The normalized `execution_id` may be used as a read filter when already known, but it is not returned by this route; events without caller-supplied execution lineage are available through `workflow_id` reconstruction only.
- `backend/src/execution_signals.ts` — signal registry + classification.
- `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md` — PRD §14–§15.
