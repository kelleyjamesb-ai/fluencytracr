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
- `fluency.get_agent_evidence_summary`
- `fluency.get_signal_readiness_map`
- `fluency.get_signal_readiness_summary`
- `fluency.get_value_evidence_pack`
- `fluency.get_value_claim_readiness_summary`
- `fluency.evaluate_claim_safety`
- `fluency.get_non_computable_value_claims`
- `fluency.get_control_evidence`
- `fluency.get_coverage_map`

`fluency.ingest_events` input contract:
- `org_id` (string, required)
- `window` (enum: `daily|weekly|30d|60d|90d|180d|360d|3m|6m|12m`)- `events` (array of metadata events, required)
- `idempotency_key` (string, required)
- `schema_version` (string, required)

Read tool input contract:
- `org_id` (string, required)
- `window` (enum: `daily|weekly|30d|60d|90d|180d|360d|3m|6m|12m`)- optional bounded filters:
  - `workflow_category` (enum)
  - `risk_class` (enum)
  - `tool_class` (enum)

Signal readiness tool input contract:
- `org_id` (string, required)
- `window` (same bounded evidence window enum)

`fluency.get_signal_readiness_map` returns a validated `GSR_2026_05` aggregate readiness map from the configured readiness snapshot path. Default local snapshot: `docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json`. Override with `FLUENCYTRACR_GLEAN_READINESS_MAP_PATH`.

`fluency.get_signal_readiness_summary` is the preferred Glean Agent readiness tool. It returns a strict summary with counts, ready families, non-computable families, suppression state, next actions, and decision-safe guidance. It omits readiness `entries`, validation evidence, join keys, and any raw source records.

Value evidence tool input contract:
- `org_id` (string, required)
- `window` (same bounded evidence window enum)
- `claim_id` (string, required only for `fluency.evaluate_claim_safety`)

`fluency.get_value_evidence_pack` returns a validated aggregate `GVE_2026_05` Value Evidence Pack from the configured snapshot path. Default local snapshot: `docs/contracts/glean-value-evidence/examples/org-northstar-value-pack.json`. Override with `FLUENCYTRACR_GLEAN_VALUE_EVIDENCE_PACK_PATH`.

`fluency.get_value_claim_readiness_summary` is the preferred Glean Agent value-readiness tool. It returns a strict summary with value posture, evidence lanes, claim readiness counts, customer-safe claims, non-computable claims, next instrumentation actions, and decision-safe guidance. It omits source records and raw evidence details.

`fluency.evaluate_claim_safety` returns the readiness and language state for one registered Glean value claim.

`fluency.get_non_computable_value_claims` returns only claims whose value state is suppressed or not computed, with reason codes.

Validation rules:
- Reject free-form content fields.
- Reject unknown enums and out-of-bound values.
- Reject forbidden dimensions (`team_id`, `manager_id`, `role_id`, `user_id`) for executive-safe tools.

`fluency.get_agent_evidence_summary` is the preferred Glean Agent evidence tool. It calls the EvidenceBundle endpoint, then returns only the strict agent-safe response template: `org_id`, `window`, `generated_at`, `suppression_applied`, `suppression_reasons`, `exposure`, `calibration`, `fragility`, `coverage_summary`, and `decision_safe_guidance`. Use `fluency.get_evidence_bundle` only for trusted systems that need the full EvidenceBundle contract.

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
FLUENCYTRACR_GLEAN_READINESS_MAP_PATH=docs/contracts/glean-signal-readiness/examples/org-northstar-source-derived-readiness-map.json
FLUENCYTRACR_GLEAN_VALUE_EVIDENCE_PACK_PATH=docs/contracts/glean-value-evidence/examples/org-northstar-value-pack.json
```

Sample MCP server config (Node implementation in `packages/fluencytracr-mcp`):
```json
{
  "name": "fluencytracr-mcp",
  "transport": "stdio",
  "command": "node",
  "args": ["packages/fluencytracr-mcp/dist/stdio-main.js"],
  "enabled": true,
  "env": {
    "FLUENCYTRACR_BASE_URL": "${FLUENCYTRACR_BASE_URL}",
    "FLUENCYTRACR_SERVICE_TOKEN": "${FLUENCYTRACR_SERVICE_TOKEN}"
  }
}
```

Streamable HTTP (remote): run `node packages/fluencytracr-mcp/dist/http-main.js` with `MCP_HTTP_PORT`, optional `MCP_HTTP_BEARER_TOKEN`, and `MCP_HTTP_HOST` (default `127.0.0.1`). Clients use the MCP Streamable HTTP session flow against `POST`/`GET` `/mcp`.

Smoke checks:
1. Call `fluency.ingest_events` with metadata-only sample and verify `/api/ingest` acceptance.
2. Call `fluency.get_agent_evidence_summary` and verify the strict summary omits raw bundle-only fields.
3. Call `fluency.get_signal_readiness_summary` and verify it omits raw readiness entries and source records.
4. Call `fluency.get_value_claim_readiness_summary` and verify it omits raw source records and preserves suppressed ROI claim state.
5. Call `fluency.evaluate_claim_safety` for `glean.roi.customer_value_to_cost` and verify suppressed language mode.
6. Call `fluency.get_evidence_bundle`, `fluency.get_signal_readiness_map`, or `fluency.get_value_evidence_pack` only when the full trusted aggregate contract is required.
7. Submit a forbidden field sample and verify deterministic rejection plus audit event.
