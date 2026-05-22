# GET /api/observability/:orgId

**Auth:** `ADMIN`, `GOV_OPERATOR`, `EXEC_VIEWER`, or `ENABLEMENT_LEAD`  
**PRD:** Phase 4 — workflow-level **aggregates only** (no execution IDs, no ranks, no time series).

## Query

| Name | Default | Description |
| --- | --- | --- |
| `window` | `60d` | Rolling observation window. Any **`FluencyWindow`** token: **`30d`**, **`60d`**, **`90d`**, **`180d`**, **`360d`** (365 calendar days), plus **`3m`** (90d), **`6m`** (180d), **`12m`** (365d). Invalid tokens → **`400`** `Invalid query`. |

## Local dev: `Org not found`

The backend keeps orgs in an **in-memory** store. After a restart, **`org-1` does not exist** until you create it:

```bash
curl -sS -X POST 'http://127.0.0.1:4000/orgs' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Local Dev","org_id":"org-1","min_group_size":1}'
```

Then call `GET /api/observability/org-1` with `x-role` and `x-org-id` as usual. Ingest events with `org_unit: "org:org-1"` so rollups are non-empty.

`POST /api/events` requires **`X-FluencyTracr-Schema-Version: 0.1`** and role **`ADMIN`** or **`ENABLEMENT_LEAD`**. Minimal sample (five executions × two `ai_output_disposition` events each, matches test fixture shape):

```bash
curl -sS -X POST 'http://127.0.0.1:4000/api/events' \
  -H 'Content-Type: application/json' \
  -H 'X-FluencyTracr-Schema-Version: 0.1' \
  -H 'x-role: ADMIN' \
  -H 'x-org-id: org-1' \
  -d "$(python3 -c "
import json
from datetime import datetime, timezone
now = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
def pair(run):
  return [
    {'event_type':'ai_output_disposition','timestamp':now,'risk_class':'low','org_unit':'org:org-1','workflow_id':'wf-demo','disposition':'accepted','edit_distance_bucket':'none','verification_present':True,'time_to_action_ms':50,'run_id':run},
    {'event_type':'ai_output_disposition','timestamp':now,'risk_class':'low','org_unit':'org:org-1','workflow_id':'wf-demo','disposition':'accepted','edit_distance_bucket':'none','verification_present':False,'time_to_action_ms':50,'run_id':run},
  ]
ev = []
for i in range(5):
  ev.extend(pair(f'r{i}'))
print(json.dumps({'events': ev}))
")"
```

## Org scoping

- Path **`orgId`** must exist in the org store (`404` if not).
- Events are included only when `org_unit` is `org:<orgId>` or starts with `org:<orgId>:` (fail-closed if `org_unit` is missing).
- If the request carries **`authOrgId`** (JWT), it must match **`orgId`** or the server returns **`403`**.

## Response (validated with `ObservabilityResponseSchema`)

- **`org_id`**, **`observation_window`**
- **`workflows`**: sorted by `workflow_id` (lexicographic), not by counts.
  - **`executions_total`**, **`executions_disclosed`**, **`executions_suppressed`** (Phase 3 disclosure per execution).
  - **`disclosure`**: `ALLOWED` | `SUPPRESSED` at **workflow** level if disclosed execution count &lt; `MIN_COHORT_SIZE` (same env as fluency cohort guardrails).
  - **`pattern_distribution`**: counts per `FluencyPatternName` when workflow disclosure is `ALLOWED`; otherwise **`null`**. Per-execution patterns use **workflow-scoped baselines** over the same observation window (PRD §16); counts are aggregates only—no numeric baselines in the JSON.
  - **`reliability_factor`**: bounded aggregate factor in `[0.0, 1.0]` when workflow disclosure is `ALLOWED`; otherwise **`null`**. This is output-only and does not change disclosure.
  - **`reliability_components`**: component rates for `abandonment_rate`, `friction_loop_rate`, `recovery_success_rate`, and `verification_presence_rate` when workflow disclosure is `ALLOWED`; otherwise **`null`**.
  - **`allowed_interpretation_hints`**: qualitative strings only (`recovery_behavior`, `friction_patterns`, `undertrust_signals`) when workflow is `ALLOWED`.

## Implementation

- `backend/src/observability_aggregate.ts` — rollup from in-memory fluency events using Phase 1–3 pipeline (trace → signals → pattern → disclosure), with `buildWorkflowPhase2ThresholdMap` for PRD §16 thresholds per `workflow_id`.

## Related

- `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md` — §7–§8.
