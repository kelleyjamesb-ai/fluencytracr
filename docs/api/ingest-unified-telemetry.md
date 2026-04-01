# POST /api/ingest/unified-telemetry

Feature-flagged intake for **unified telemetry** events (`UT_2026_04`). Contract: [`docs/contracts/unified-telemetry/README.md`](../contracts/unified-telemetry/README.md). JSON Schema: [`schemas/unified_telemetry/ut_event_union.schema.json`](../../schemas/unified_telemetry/ut_event_union.schema.json).

## Enablement

Set environment variable:

```bash
FLUENCY_UNIFIED_TELEMETRY_INGEST=true
```

If unset or not `true`, the route returns **403** with `reason_code: feature_disabled`.

## Headers

| Header | Required | Notes |
| --- | --- | --- |
| `X-FluencyTracr-Schema-Version` | yes | Must be accepted version (default list: `UT_2026_04`; override with `UNIFIED_TELEMETRY_SCHEMA_ACCEPTED_VERSIONS`) |
| `Idempotency-Key` | yes | Same semantics as `/api/ingest`; scoped to this route via internal key prefix |
| `Content-Type` | recommended | `application/json` |
| `x-role` | per deployment RBAC | Same as other ingest routes when applicable |

## Body

```json
{
  "events": [ { "...": "UnifiedTelemetryEvent" } ]
}
```

Each element MUST validate against the shared **Zod** mirror (`UnifiedTelemetryEventSchema` in `@learnaire/shared`), aligned with the JSON Schema union.

## Response

Same receipt shape as `/api/ingest`:

- `202 Accepted` with `receipt_id`, `accepted_count`, `rejected_count`, `rejections[]`
- Row-level `rejections` use `reason_code: invalid_payload` and a JSON-pointer-like `field_path`

## Storage

Accepted events are stored in-memory under `store.unifiedTelemetryEvents` keyed by `event_id`. They **do not** automatically feed legacy fluency pattern derivation; that is a separate product step (see OpenSpec change `add-unified-telemetry-ingest`).

## Forbidden fields

The same forbidden-field rules as `/api/ingest` apply (no raw content class fields anywhere in the body).
