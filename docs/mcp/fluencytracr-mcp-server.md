# FluencyTracr MCP Adapter Server

References:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- `/api/ingest` contract: `docs/api/ingest.md`
- Glean integration overview: `docs/integrations/glean/01-overview.md`

## Architecture and data flow to `/api/ingest`

Flow:
1. Agent emitter or governance assistant invokes MCP tool.
2. Adapter validates tool input schema (bounded enums and constrained fields only).
3. Adapter enforces org scope and service identity policy.
4. Ingest tool path forwards payload to `/api/ingest` with required headers.
5. Read tools query evidence endpoints and return suppression-safe aggregate output.

Data boundaries:
- Adapter is a tool surface, not a data lake.
- No raw prompt content, model output content, or transcript storage.
- Metadata and event sequences only.

## Tool schemas and validation

Tool list:
- `fluency.ingest_events`
- `fluency.get_evidence_bundle`
- `fluency.get_control_evidence`
- `fluency.get_coverage_map`

`fluency.ingest_events` input contract:
- `org_id` (string, required)
- `window` (enum: `daily|weekly|30d|60d|90d|180d|360d|3m|6m|12m`)
- `events` (array of metadata events, required)
- `idempotency_key` (string, required)
- `schema_version` (string, required)

Read tool input contract:
- `org_id` (string, required)
- `window` (enum: `daily|weekly|30d|60d|90d|180d|360d|3m|6m|12m`)
- optional bounded filters:
  - `workflow_category` (enum)
  - `risk_class` (enum)
  - `tool_class` (enum)

Validation rules:
- Reject free-form content fields.
- Reject unknown enums and out-of-bound values.
- Reject forbidden dimensions (`team_id`, `manager_id`, `role_id`, `user_id`) for executive-safe tools.

## Forbidden fields enforcement

Forbidden payload examples:
- `prompt_text`
- `model_output_text`
- `transcript`
- `message_text`
- direct identifiers such as `email`, `employee_id`, `user_id`

Enforcement behavior:
- Fail request with deterministic reason and `field_path`.
- Do not partially process rejected requests.
- Emit audit event for every blocked payload.

## Audit logging

Required audit fields:
- `timestamp_utc`
- `request_id`
- `org_id`
- `actor_identity`
- `tool_name`
- `operation`
- `schema_version`
- `idempotency_key` (ingest calls)
- `result` (`success|rejected|suppressed|error`)
- `suppression_applied`
- `suppression_reasons`

Audit requirements:
- Logs must be immutable and append-only.
- Logs must not include raw content in any path.

## Local dev setup

Prerequisites:
- FluencyTracr backend running locally
- MCP-enabled agent runtime
- service token for local dev org

Environment:
```bash
MCP_ENABLED=true
FLUENCYTRACR_BASE_URL=http://localhost:3000
FLUENCYTRACR_SERVICE_TOKEN=dev_token_value
```

Sample MCP server config:
```json
{
  "name": "fluencytracr-mcp",
  "transport": "stdio",
  "command": "python",
  "args": ["src/tools/fluencytracr_mcp_server.py"],
  "enabled": true,
  "env": {
    "FLUENCYTRACR_BASE_URL": "${FLUENCYTRACR_BASE_URL}",
    "FLUENCYTRACR_SERVICE_TOKEN": "${FLUENCYTRACR_SERVICE_TOKEN}"
  }
}
```

Smoke checks:
1. Call `fluency.ingest_events` with metadata-only sample and verify `/api/ingest` acceptance.
2. Call `fluency.get_evidence_bundle` and verify suppression-safe aggregate response.
3. Submit a forbidden field sample and verify deterministic rejection plus audit event.

