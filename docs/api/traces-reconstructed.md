# GET /api/traces/reconstructed

**Auth:** `ADMIN` or `ENABLEMENT_LEAD`  
**Purpose:** Reconstructed **execution traces** (Phase 1) plus optional **signals + pattern** (Phase 2) for internal analytics. Not the Phase 4 product observability surface.

## Query parameters

| Name | Required | Description |
| --- | --- | --- |
| `workflow_id` | one of | Filter events to this `workflow_id`. |
| `execution_id` | one of | Filter to a single normalized execution (see ingest). |
| `include_signals` | no | If `true`, `1`, or `yes`, each trace includes `signals`, `pattern`, and `pattern_confidence_tier` (PRD Phase 2). |

At least one of `workflow_id` or `execution_id` must be provided.

## Response

```json
{
  "traces": [
    {
      "execution_id": "exec:workflow-1:run:abc",
      "workflow_id": "workflow-1",
      "ordered_event_ids": ["…"],
      "retry_sequences": [
        { "failure_event_id": "…", "subsequent_event_id": "…" }
      ],
      "step_groups": [{ "group_id": "stage_group_0", "event_ids": ["…"] }],
      "tool_groups": []
    }
  ]
}
```

`execution_id` is assigned at ingest via `resolveFluencyExecutionId` (`shared/src/fluencyExecutionId.ts`): `run_id` → `workflow_run_id` → per-event singleton.

### Phase 2 + Phase 3 fields (`include_signals=true`)

Each trace may include:

- **`disclosure`** — `state`: `ALLOWED` | `SUPPRESSED`, `reasons`: string[] (PRD Phase 3). When `SUPPRESSED`, interpretive fields below are **`null`**; structural trace fields remain (`ordered_event_ids`, `retry_sequences`, etc.).
- **`signals`** — `event_count`, `iteration_depth` (from retry sequences), `verification_present`, `recovery_present`, `abandonment_present`, `latency_ms`, `last_disposition`, `has_ai_usage`, `confidence_tier`.
- **`pattern`** — one of `FluencyPatternName` (mutually exclusive, PRD §15 priority).
- **`pattern_confidence_tier`** — `high` | `medium` | `low` from event count (not a product score).

**Suppression reasons (non-exhaustive):** `insufficient_event_count`, `low_confidence_tier`, `invalid_timestamps`. Minimum event count for disclosure defaults to **2**; override with `FLUENCY_MIN_EXECUTION_EVENTS_FOR_DISCLOSURE`.

Default iteration/latency thresholds: `backend/src/execution_signals.ts` (`DEFAULT_PHASE2_THRESHOLDS`). Workflow-relative baselines (PRD §16) are not yet applied to thresholds; numeric baselines are not returned on this route.

## Related

- `POST /api/events` — returns parallel `execution_ids` for each ingested event.
- `backend/src/execution_signals.ts` — signal registry + classification.
- `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md` — PRD §14–§15.
