# GET /api/traces/reconstructed

**Auth:** `ADMIN` or `ENABLEMENT_LEAD`  
**Purpose:** PRD Phase 1 — read reconstructed **execution traces** (ordered events, retry pairs, stage groups) for debugging and downstream analytics pipelines. Not a product “observability surface” (Phase 4).

## Query parameters

| Name | Required | Description |
| --- | --- | --- |
| `workflow_id` | one of | Filter events to this `workflow_id`. |
| `execution_id` | one of | Filter to a single normalized execution (see ingest). |

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

## Related

- `POST /api/events` — returns parallel `execution_ids` for each ingested event.
- `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md` — Phase 1 scope.
