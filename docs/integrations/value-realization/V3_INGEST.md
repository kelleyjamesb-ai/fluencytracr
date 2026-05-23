# V3 Production Ingest

This guide shows the V3 production path: customer-side transformation,
aggregate ingest, governed calibration, and verdict replay. Raw GCE stays in
the customer environment. FluencyTracr receives only cohort-level aggregate
records.

## Flow

1. Customer schedules the transformer in their cloud environment.
2. Transformer reads the approved GCE export or warehouse table.
3. Transformer computes per-user velocity locally, then aggregates to p10, p50,
   p90, and p99 distributions.
4. Transformer writes one JSON payload per `(cohort_id, workflow_id, window)`.
5. Customer posts each payload to `POST /api/v3/ingest/aggregate`.
6. FluencyTracr validates the calibration baseline, rejects person-level fields,
   computes a fail-closed verdict, and stores the immutable verdict.
7. Consumers read verdicts from `GET /api/v3/verdicts?cohort_id=...`.

## 1. List Governed Calibration Baselines

```bash
curl -fsS "$FLUENCYTRACR_URL/api/v3/calibration/baselines" \
  -H "x-role: EXEC_VIEWER" \
  -H "x-org-id: $FLUENCYTRACR_ORG_ID"
```

The initial baseline is:

```json
{
  "calibration_id": "scio-prod-60d-2026-05",
  "source": "scio-prod scrubbed GCE, 1553 distinct users, 60-day window"
}
```

Calibration IDs are governed reference versions, not tunable thresholds.

## 2. Run the Customer-Side Transformer

The transformer is designed to run in the customer's environment:

The BigQuery path enforces the governed surface taxonomy before writing
payloads. It emits workflow-run surfaces plus SEARCH, AUTOCOMPLETE, MCP_USAGE,
AI_SUMMARY, and non-overlapping GLEAN_BOT_ACTIVITY. CLIENT_EVENT,
PRODUCT_SNAPSHOT, LLM_CALL, and ACTION stay corroborative only. Verification
and feedback signals are joined to parent surfaces, and AGENT is split into
`workflow:agent:autonomous`, `workflow:agent:workflow_named`, and
`workflow:agent:ephemeral`.

```bash
python transformer/glean_gce_transformer.py \
  --project "$GCE_PROJECT" \
  --dataset "$GCE_DATASET" \
  --table "$GCE_TABLE" \
  --window-start "2026-03-23T00:00:00Z" \
  --window-end "2026-05-22T00:00:00Z" \
  --cohort-id "customer-aiom-60d" \
  --calibration-id "scio-prod-60d-2026-05" \
  --output-dir ./out/fluencytracr-v3
```

For local dry runs with pre-aggregated data:

```bash
cat > /tmp/customer-aggregate.csv <<'CSV'
workflow_id,cohort_size,completion_rate,error_rate,abandonment_rate,recovery_rate,verification_rate,p50_latency_ms,p95_latency_ms,freq_p10,freq_p50,freq_p90,freq_p99,engagement_p10,engagement_p50,engagement_p90,engagement_p99,breadth_p10,breadth_p50,breadth_p90,breadth_p99
workflow:CHAT,50,0.92,0.03,0.01,0.8,0.4,1000,3000,3,14,40,80,5,30,55,60,1,3,7,10
CSV

python transformer/glean_gce_transformer.py \
  --project "customer-project" \
  --dataset "gce" \
  --table "events" \
  --window-start "2026-03-23T00:00:00Z" \
  --window-end "2026-05-22T00:00:00Z" \
  --cohort-id "customer-aiom-60d" \
  --calibration-id "scio-prod-60d-2026-05" \
  --input-csv /tmp/customer-aggregate.csv \
  --output-dir ./out/fluencytracr-v3
```

## 3. Aggregate Payload Shape

```json
{
  "schema_version": "FT_V3_2026_05",
  "cohort_id": "customer-aiom-60d",
  "workflow_id": "workflow:CHAT",
  "window_start": "2026-03-23T00:00:00.000Z",
  "window_end": "2026-05-22T00:00:00.000Z",
  "cohort_size": 50,
  "calibration_id": "scio-prod-60d-2026-05",
  "velocity": {
    "frequency": { "p10": 3, "p50": 14, "p90": 40, "p99": 80 },
    "engagement": { "p10": 5, "p50": 30, "p90": 55, "p99": 60 },
    "breadth": { "p10": 1, "p50": 3, "p90": 7, "p99": 10 }
  },
  "quality_signals": {
    "completion_rate": 0.92,
    "error_rate": 0.03,
    "abandonment_rate": 0.01,
    "recovery_rate": 0.8,
    "verification_rate": 0.4,
    "p50_latency_ms": 1000,
    "p95_latency_ms": 3000
  },
  "privacy": { "person_level_fields_included": false }
}
```

Any person-level field, raw prompt, raw output, message text, or raw event list
is rejected at the boundary.

## 4. Post Aggregate Payloads

```bash
for payload in ./out/fluencytracr-v3/*.json; do
  curl -fsS -X POST "$FLUENCYTRACR_URL/api/v3/ingest/aggregate" \
    -H "Content-Type: application/json" \
    -H "x-role: ADMIN" \
    -H "x-org-id: $FLUENCYTRACR_ORG_ID" \
    --data-binary "@$payload"
done
```

Successful response:

```json
{
  "accepted": true,
  "verdict": {
    "cohort_id": "customer-aiom-60d",
    "workflow_id": "workflow:CHAT",
    "verdict": "SURFACE",
    "suppression_reason": null,
    "calibration_id": "scio-prod-60d-2026-05",
    "velocity_index": 0.67,
    "quality_multiplier": 1.19
  }
}
```

If a payload references an unknown `calibration_id`, FluencyTracr rejects it.
If the same immutable aggregate key is posted twice, FluencyTracr rejects the
second write instead of mutating history.

## 5. Read Stored Verdicts

```bash
curl -fsS "$FLUENCYTRACR_URL/api/v3/verdicts?cohort_id=customer-aiom-60d" \
  -H "x-role: EXEC_VIEWER" \
  -H "x-org-id: $FLUENCYTRACR_ORG_ID"
```

The response contains the stored aggregate verdicts for that cohort. Suppressed
records keep `multiplier`, `velocity_index`, and derived values null.

## Scheduling

See:

- [examples/orchestrator/cron.sh](../../../examples/orchestrator/cron.sh)
- [examples/orchestrator/airflow_dag.py](../../../examples/orchestrator/airflow_dag.py)

These are examples only. Customers own the runtime, service account, warehouse
permissions, and scheduler.
