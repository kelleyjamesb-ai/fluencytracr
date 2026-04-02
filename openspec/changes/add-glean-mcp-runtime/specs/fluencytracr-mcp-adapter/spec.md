## ADDED Requirements

### Requirement: MCP tool surface for ingest and evidence reads

The FluencyTracr MCP adapter SHALL expose the tools `fluency.ingest_events`, `fluency.get_evidence_bundle`, `fluency.get_control_evidence`, and `fluency.get_coverage_map` with inputs validated by constrained schemas (enums and bounded fields only). The adapter SHALL forward `fluency.ingest_events` to `POST /api/ingest` with headers `X-FluencyTracr-Schema-Version`, `Idempotency-Key`, and `Content-Type: application/json`. Read tools SHALL call `GET /api/evidence/bundles/:orgId`, `GET /api/evidence/controls/:orgId`, and `GET /api/evidence/coverage/:orgId` respectively with query `window` in the accepted evidence window enum.

#### Scenario: Ingest forwards metadata-only batch

- **WHEN** a client calls `fluency.ingest_events` with a valid `events` array, `idempotency_key`, `schema_version`, and `org_id`, and no forbidden fields
- **THEN** the adapter sends `POST /api/ingest` with body `{ events }` and the idempotency header
- **AND** returns the backend JSON response as tool output

#### Scenario: Forbidden field rejection

- **WHEN** the ingest payload contains a key in the shared forbidden / non-collectable field sets at any depth
- **THEN** the adapter rejects the tool call with a deterministic error referencing `field_path`
- **AND** does not call `/api/ingest`

### Requirement: Dual transport MCP runtime

The MCP adapter SHALL support **stdio** transport for local clients and **Streamable HTTP** transport for remote clients on a configurable port, using the MCP Streamable HTTP session pattern (initialize then `mcp-session-id` on follow-on requests). An optional env `MCP_HTTP_BEARER_TOKEN` SHALL be enforced as `Authorization: Bearer <token>` on HTTP requests when set.

#### Scenario: HTTP bearer gate

- **WHEN** `MCP_HTTP_BEARER_TOKEN` is set and a client POSTs to the MCP HTTP endpoint without a matching bearer token
- **THEN** the server responds with `401` and does not initialize an MCP session

### Requirement: Audit records without raw content

The adapter SHALL emit one audit record per tool invocation including `timestamp_utc`, `request_id`, `org_id`, `actor_identity`, `tool_name`, `operation`, `schema_version`, `idempotency_key` when applicable, `result`, `suppression_applied`, and `suppression_reasons`. Audit output SHALL NOT include raw prompts, model output, transcripts, or message body text.

#### Scenario: Rejected ingest audit

- **WHEN** an ingest tool call is rejected for a forbidden field
- **THEN** an audit record is written with `result` `rejected` and the `field_path` in a structured error field (not echoing forbidden values)
