# /api/ingest Partner Ingestion API

## Overview
`/api/ingest` is the recommended partner-facing asynchronous ingestion facade for FluencyTracr.

It supports multi-agent readiness by accepting event batches from both:
- Human telemetry emitters
- Agentic workflow emitters

`/api/ingest` provides acknowledgment, queue intake semantics, idempotent replay safety, and row-level rejection details. Validation semantics are aligned to `/api/events` so partner payload rules remain consistent.

## Endpoint
- Method: `POST`
- Path: `/api/ingest`
- Mode: asynchronous facade that acknowledges accepted envelope intake

## Headers
Required headers:
- `X-FluencyTracr-Schema-Version`: schema version accepted by server policy
- `Idempotency-Key`: unique key for request dedupe and replay safety

Recommended headers:
- `Content-Type: application/json`
- `x-role: ADMIN` or integration role allowed by deployment policy

## Request Body
`/api/ingest` accepts an envelope that carries an `events` array compatible with `/api/events` validation rules.

Validation alignment:
- Event payload shape and constraints follow the same canonical schema rules as `/api/events`
- Forbidden fields and identifiers are blocked with the same privacy rule class
- Raw prompt or raw model output content is not allowed

Minimal envelope:

```json
{
  "events": [
    {
      "event_type": "ai_output_disposition",
      "timestamp": "2026-02-21T12:00:00.000Z",
      "risk_class": "low",
      "workflow_id": "wf-123",
      "disposition": "accepted",
      "edit_distance_bucket": "light",
      "verification_present": true,
      "time_to_action_ms": 830
    }
  ]
}
```

## Response Body
Acknowledgment response fields:
- `receipt_id`: server-generated receipt identifier for intake tracking
- `accepted_count`: number of accepted events in this request
- `rejected_count`: number of rejected events in this request
- `rejections[]`: row-level validation details with:
  - `index`: event index in submitted `events[]`
  - `reason_code`: stable machine-readable rejection reason
  - `field_path`: JSON path for the rejected field when applicable

Typical `202 Accepted` response:

```json
{
  "receipt_id": "rcpt_2fef4f0e",
  "accepted_count": 1,
  "rejected_count": 0,
  "rejections": []
}
```

## Idempotency and Dedupe
- Partners must send a unique `Idempotency-Key` per logical batch submission.
- FluencyTracr dedupes repeated submissions for a fixed dedupe window of 24 hours.
- Replay behavior inside dedupe window:
  - Same key with semantically identical payload returns the original acceptance outcome.
  - Same key with different payload is rejected to prevent key collision drift.
- Replay behavior outside dedupe window:
  - Request is treated as a new submission and processed again.

## Retry and Rate Limits
- `/api/ingest` is rate-limited and can return `429` under load.
- Current server-side strict limiter baseline is `60` requests per `60` seconds per client identity.
- Retry guidance:
  - Retry `429` and `5xx` responses with exponential backoff and jitter.
  - Respect `Retry-After` header when present.
  - Do not retry `4xx` validation failures without payload correction.

Recommended backoff profile:
- Initial delay: 1 second
- Backoff multiplier: 2
- Max delay: 32 seconds
- Jitter: random 0 to 500 ms

## Error Codes
- `400 invalid_schema_version`: header value missing or not accepted by server policy
- `400 invalid_payload`: request payload does not match canonical event schema rules
- `400 forbidden_field`: payload contains disallowed raw content or identifiers
- `401 unauthorized`: authentication failed
- `403 forbidden`: caller role or org scope not allowed
- `409 idempotency_conflict`: same `Idempotency-Key` with different payload
- `429 rate_limited`: request rate exceeded
- `500 internal_error`: unexpected ingestion failure

## Security
- No raw prompt content.
- No raw model output content.
- No direct user identifiers or person-level identifiers.
- Enforce org scoping with `org_id` consistent with integration credentials.
- Use least-privilege integration roles for partner emitters.

## V3 Aggregate Verdict Forwarding

The production aggregate path is `POST /api/v3/ingest/aggregate`, documented
in `docs/integrations/value-realization/V3_INGEST.md`. That endpoint accepts
pre-computed cohort distributions only. When a V3 aggregate verdict is
`SURFACE`, the stored verdict may include `forwarded_distribution`, an
aggregate-only block that downstream consumers such as Quality Multiplier can
re-check without raw telemetry.

This endpoint is bounded aggregate ingest. It is not live Sigma, Glean, or
BigQuery execution for the AI Value spine, not pipeline run persistence, not
source package clearance, and not customer-facing value output.

Suppressed V3 verdicts never include `forwarded_distribution`. The forwarded
block must not contain raw GCE rows, raw prompt or output text, transcripts,
raw skill names, action rows, direct identifiers, or any sub-5 cohort evidence.
This forwarding supports governed metric routing and scenario readiness; it
does not calculate ROI, prove causality, measure productivity, rank people or
teams, or produce customer-facing economic output.

## Examples
Successful request:

```bash
curl -X POST "https://api.fluencytracr.example/api/ingest" \
  -H "Content-Type: application/json" \
  -H "X-FluencyTracr-Schema-Version: 0.1" \
  -H "Idempotency-Key: 1e58f4ea-4be4-4da2-9a2a-0ea5a0fc7304" \
  -H "x-role: ADMIN" \
  -d '{
    "events": [
      {
        "event_type": "verification_signal",
        "timestamp": "2026-02-21T12:00:00.000Z",
        "risk_class": "medium",
        "workflow_id": "wf-ops-17",
        "verification_type": "policy_check",
        "verification_latency_ms": 1200
      }
    ]
  }'
```

Response with mixed acceptance:

```json
{
  "receipt_id": "rcpt_6b9f9a1f",
  "accepted_count": 1,
  "rejected_count": 1,
  "rejections": [
    {
      "index": 1,
      "reason_code": "forbidden_field",
      "field_path": "events[1].message_text"
    }
  ]
}
```
