## Context

`docs/mcp/fluencytracr-mcp-server.md` referenced a Python entrypoint that does not exist. The backend is TypeScript (Express, Zod); the MCP server should reuse shared privacy field sets and call the existing HTTP API.

## Goals / Non-Goals

- Goals: stdio for local/IDE clients; Streamable HTTP for remote agents; strict forbidden-field scanning on ingest payloads; audit lines without PII/content.
- Non-Goals: OAuth resource server for MCP in v1 (optional static bearer only); team/manager-scoped tools; storing transcripts or model text.

## Decisions

- **Runtime**: TypeScript on Node 18+, `@modelcontextprotocol/sdk` `McpServer` + `StdioServerTransport` + `StreamableHTTPServerTransport` with session map pattern from SDK examples.
- **Backend auth**: Forward `Authorization: Bearer <FLUENCYTRACR_SERVICE_TOKEN>` when set; otherwise for dev/test forward `x-role` + `x-org-id` when `FLUENCYTRACR_DEV_HEADERS=true` (matches backend `authMiddleware` test/dev behavior).
- **Ingest mapping**: MCP tool accepts `org_id`, `window`, `events`, `idempotency_key`, `schema_version`; HTTP body to `/api/ingest` is `{ events }` only; validate `org_id` matches each event `org_unit` prefix `org:<org_id>` when `org_unit` is present.
- **Read tools**: Query params `window` only (optional filters in the markdown spec are not yet on the REST API—omit from v1 tool inputs to avoid silent no-ops).

## Risks / Trade-offs

- Stateful HTTP sessions require cleanup on process exit; map keyed by `mcp-session-id`.
- Bearer token for MCP is separate from FluencyTracr JWT—operators must configure both layers for production.
