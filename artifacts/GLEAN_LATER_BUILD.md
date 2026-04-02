# Glean “Later” build — implementation notes

## Delivered

- **OpenSpec**: `add-glean-mcp-runtime`, `add-glean-publisher-and-ci`, `expand-glean-agent-tooling` under `openspec/changes/` (validated with `npx @fission-ai/openspec@latest validate <id> --strict`).
- **MCP**: `packages/fluencytracr-mcp` — stdio (`dist/stdio-main.js`), Streamable HTTP (`dist/http-main.js`), tools per `docs/mcp/fluencytracr-mcp-server.md`, optional `MCP_HTTP_BEARER_TOKEN`, audit via stderr or `FLUENCYTRACR_MCP_AUDIT_LOG`.
- **Publisher**: `packages/glean-publisher` — `buildGleanDocument`, CLI `dry-run` / `publish`, fixture validation `npm run validate:fixtures`.
- **CI**: `.github/workflows/ci.yml` builds/tests both packages and runs fixture validation; optional `.github/workflows/glean-publisher-scheduled.yml` (gated on `vars.GLEAN_PUBLISHER_ENABLED`).
- **Agent tooling**: `docs/integrations/glean/03-glean-agent-tooling.md` expanded classes; `buildAgentEvidenceResponse` in MCP package with Vitest coverage.

## Operator checklist

- MCP HTTP: set `MCP_HTTP_PORT`, optional `MCP_HTTP_BEARER_TOKEN`, `FLUENCYTRACR_*` auth envs as in `docs/mcp/fluencytracr-mcp-server.md`.
- Scheduled publish: set repository variable `GLEAN_PUBLISHER_ENABLED` to `true` and configure secrets listed in the workflow file.
