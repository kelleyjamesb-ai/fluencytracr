# GET /api/observability/:orgId

**Auth:** `ADMIN`, `GOV_OPERATOR`, `EXEC_VIEWER`, or `ENABLEMENT_LEAD`  
**PRD:** Phase 4 — workflow-level **aggregates only** (no execution IDs, no ranks, no time series).

## Query

| Name | Default | Description |
| --- | --- | --- |
| `window` | `60d` | Observation window: **`30d`** or **`60d`** only. |

## Org scoping

- Path **`orgId`** must exist in the org store (`404` if not).
- Events are included only when `org_unit` is `org:<orgId>` or starts with `org:<orgId>:` (fail-closed if `org_unit` is missing).
- If the request carries **`authOrgId`** (JWT), it must match **`orgId`** or the server returns **`403`**.

## Response (validated with `ObservabilityResponseSchema`)

- **`org_id`**, **`observation_window`**
- **`workflows`**: sorted by `workflow_id` (lexicographic), not by counts.
  - **`executions_total`**, **`executions_disclosed`**, **`executions_suppressed`** (Phase 3 disclosure per execution).
  - **`disclosure`**: `ALLOWED` | `SUPPRESSED` at **workflow** level if disclosed execution count &lt; `MIN_COHORT_SIZE` (same env as fluency cohort guardrails).
  - **`pattern_distribution`**: counts per `FluencyPatternName` when workflow disclosure is `ALLOWED`; otherwise **`null`**.
  - **`allowed_interpretation_hints`**: qualitative strings only (`recovery_behavior`, `friction_patterns`, `undertrust_signals`) when workflow is `ALLOWED`.

## Implementation

- `backend/src/observability_aggregate.ts` — rollup from in-memory fluency events using Phase 1–3 pipeline (trace → signals → pattern → disclosure).

## Related

- `artifacts/PRD_V1_BEHAVIORAL_OBSERVABILITY.md` — §7–§8.
