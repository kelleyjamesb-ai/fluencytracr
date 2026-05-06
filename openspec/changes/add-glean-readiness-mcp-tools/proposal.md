# Change: Add Glean readiness MCP tools

## Why

Glean Agents need to answer readiness questions separately from EvidenceBundle evidence questions. The tool surface needs a safe way to expose validated aggregate readiness status without raw Glean source records or unsafe dimensions.

## What Changes

- Add `fluency.get_signal_readiness_map` for trusted aggregate `GSR_2026_05` readiness access.
- Add `fluency.get_signal_readiness_summary` for strict agent-safe readiness answers.
- Load readiness from a configured validated snapshot path until live-data access is approved.
- Reject extra readiness tool inputs and keep raw source records out of agent summaries.
- Update MCP and Glean Agent docs with allowed readiness question classes.

## Impact

- Affected specs: `fluencytracr-mcp-adapter`
- Affected code: `packages/fluencytracr-mcp/src/`
- Affected docs: `docs/mcp/fluencytracr-mcp-server.md`, `docs/integrations/glean/03-glean-agent-tooling.md`
