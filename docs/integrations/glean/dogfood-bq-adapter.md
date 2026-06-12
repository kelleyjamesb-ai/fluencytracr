# Glean Dogfood BigQuery Adapter

Status: internal-only, read-only adapter scaffold.

This adapter lets FluencyTracr exercise the existing V3 aggregate ingest path
against Glean dogfood scrubbed BigQuery tables. It does not add a production
connector, customer data path, dashboard, ROI calculation, causality engine, or
person-level surface.

## What It Does

- Reads only date-sharded scrubbed Glean dogfood tables in `scio-apps`.
- Builds a BigQuery aggregate query guarded by `_TABLE_SUFFIX BETWEEN ...`.
- Enforces a 100 GB dry-run estimate cap unless `--allow-large-scan` is passed.
- Applies connector-side k-min suppression before V3 payload emission.
- Emits only `FT_V3_2026_05` aggregate payloads shaped for
  `POST /api/v3/ingest/aggregate`.
- Writes a local run report with estimated bytes, emitted payload count, and
  suppressed slices.

## What It Does Not Do

- No DML, DDL, or writes to BigQuery.
- No service account keys in the repo.
- No raw rows, prompts, responses, messages, transcripts, URLs, raw skill names,
  email, actor IDs, user IDs, or hashed user IDs emitted from the connector.
- No new canonical events, suppression reasons, thresholds, admin overrides,
  endpoints, frontend surfaces, ROI output, or causality claims.
- No customer-facing economic output.

## Cost Guardrail

Do not run all-time wildcard scans. A careless scan across large sharded tables
can become a multi-TB query quickly. The adapter exists specifically to avoid
the "16 TB / about $1k" anti-pattern:

1. use explicit `--start-date` and `--end-date`;
2. default to dry-run;
3. refuse estimates above 100 GB unless the operator explicitly passes
   `--allow-large-scan`; and
4. log estimated bytes scanned in `run-report.json`.

## Source Tables

| Key | BigQuery pattern | Current role |
| --- | --- | --- |
| `scrubbed_llm_call` | `scio-apps.scrubbed_llm_call.scrubbed_llm_call_*` | LLM invocation, model, token, workflow, and latency aggregates. |
| `scrubbed_client_analytics` | `scio-apps.scrubbed_client_analytics.scrubbed_client_analytics_*` | Surface engagement and client interaction aggregate context. |
| `scrubbed_workflows` | `scio-apps.scrubbed_workflows.scrubbed_workflows_*` | Workflow, agent, step, citation, trigger, model, and execution aggregates. |

The real tables are date-sharded. Use shard suffix filters such as
`_TABLE_SUFFIX BETWEEN '20260611' AND '20260611'`; do not target non-sharded
table names.

## Schema Breadth Boundary

The source schema is intentionally broad. The adapter pins table-specific source
allowlists in `src/connectors/glean_dogfood_bq/adapter.py`:

- `scrubbed_llm_call`: 41 allowed source paths.
- `scrubbed_client_analytics`: 50 allowed source paths.
- `scrubbed_workflows`: 126 allowed source paths.

Those allowlists document the scrubbed table fields the connector may use while
aggregating inside BigQuery. The emitted FluencyTracr payload is intentionally
much narrower:

```json
{
  "schema_version": "FT_V3_2026_05",
  "cohort_id": "glean-dogfood",
  "workflow_id": "workflow:assistant",
  "jbtd_id": null,
  "persona_id": null,
  "window_start": "2026-04-12T00:00:00Z",
  "window_end": "2026-06-11T00:00:00Z",
  "cohort_size": 8,
  "calibration_id": "scio-prod-60d-2026-05",
  "velocity": {
    "frequency": { "p10": 1, "p50": 3, "p90": 9, "p99": 14 },
    "engagement": { "p10": 2, "p50": 7, "p90": 22, "p99": 31 },
    "breadth": { "p10": 1, "p50": 2, "p90": 4, "p99": 5 }
  },
  "quality_signals": {
    "completion_rate": 0.93,
    "error_rate": 0.02,
    "abandonment_rate": 0.01,
    "recovery_rate": 0.7,
    "verification_rate": 0.4,
    "p50_latency_ms": 1400,
    "p95_latency_ms": 4100
  },
  "privacy": { "person_level_fields_included": false }
}
```

This is the key design point: robust source awareness, narrow governed output.

## Forbidden-Field Guard

The connector fails closed if any row or emitted payload includes field names
matching these blocked keys:

`email`, `user_id`, `actor_id`, `userId`, `userid`, `query`, `query_text`,
`prompt`, `response`, `output`, `message`, `transcript`, `body`,
`document_url`, `url`, `skill_name`, `actor_email`.

These fields may exist in the underlying scrubbed source schemas for internal
aggregation or scrubbing context, but they must not leave the connector
boundary.

## Dev Loop

Authenticate with Application Default Credentials:

```bash
gcloud auth application-default login
```

Run a synthetic fixture dry-run:

```bash
python3 scripts/run_dogfood_bq_ingest.py \
  --start-date 2026-04-12 \
  --end-date 2026-06-11 \
  --tables scrubbed_llm_call,scrubbed_client_analytics,scrubbed_workflows \
  --fixture-dir tests/fixtures/glean_dogfood_bq \
  --output-dir /tmp/fluencytracr-dogfood-bq-fixture
```

Run a live BigQuery dry-run:

```bash
python3 scripts/run_dogfood_bq_ingest.py \
  --start-date 2026-06-11 \
  --end-date 2026-06-11 \
  --tables scrubbed_llm_call,scrubbed_client_analytics,scrubbed_workflows \
  --output-dir /tmp/fluencytracr-dogfood-bq-dry-run
```

As of the checked implementation, the one-day `2026-06-11` dry-run compiles
against the real sharded schemas and estimates about 19 GB scanned, under the
100 GB cap.

## Worked Synthetic Example

The synthetic fixture directory includes three emitted aggregate slices and one
sub-minimum slice:

- SURFACE-ready fixture slices:
  - `workflow:assistant`
  - `standalone:client-analytics`
  - `workflow:agent:workflow_named`
- SUPPRESS fixture slice:
  - `workflow:small-cohort`
  - `cohort_size: 4`
  - `suppression_reason: INSUFFICIENT_VOLUME`

The fixture run writes three V3 payload files plus `run-report.json`.

## Verification

Focused checks:

```bash
python3 -m pytest tests/test_glean_dogfood_bq_adapter.py -q
npm run build --workspace shared
node scripts/lmsys_harness_selftest.mjs
python3 scripts/run_dogfood_bq_ingest.py --start-date 2026-06-11 --end-date 2026-06-11 --tables scrubbed_llm_call,scrubbed_client_analytics,scrubbed_workflows --output-dir /tmp/fluencytracr-dogfood-bq-dry-run
```
