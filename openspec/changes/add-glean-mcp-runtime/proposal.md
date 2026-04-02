# Change: Glean-facing FluencyTracr MCP runtime (stdio + Streamable HTTP)

## Why

Production agent orchestration needs a validated MCP tool surface that forwards metadata-only ingest to `/api/ingest` and reads suppression-safe evidence endpoints, without introducing a Python-only server path that diverges from the TypeScript stack.

## What Changes

- Specify the **FluencyTracr MCP adapter** as a **Node/TypeScript** implementation using `@modelcontextprotocol/sdk` with **stdio** and **Streamable HTTP** (SSE-capable) transports.
- Require tool contracts aligned with `docs/mcp/fluencytracr-mcp-server.md`: `fluency.ingest_events`, `fluency.get_evidence_bundle`, `fluency.get_control_evidence`, `fluency.get_coverage_map`.
- Require optional **HTTP bearer** gate (`MCP_HTTP_BEARER_TOKEN`) for the hosted transport and structured **audit records** (no raw content) for blocked or completed tool calls.
- Update sample MCP config to invoke the Node entrypoint instead of the non-existent Python sample path.

## Impact

- Affected specs: `fluencytracr-mcp-adapter` (new capability delta).
- Affected code: `packages/fluencytracr-mcp/`, `docs/mcp/fluencytracr-mcp-server.md`, root workspace config, CI.
