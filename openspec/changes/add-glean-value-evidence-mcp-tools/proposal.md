# Change: Add Glean Value Evidence MCP Tools

## Why
Glean Agents need bounded read access to FluencyTracr value evidence without seeing raw source records. Existing MCP tools expose EvidenceBundle summaries and signal readiness; they do not yet expose Value Evidence Pack posture or per-claim safety.

## What Changes
- Add strict value evidence response helpers for `GVE_2026_05`.
- Add MCP tools for value evidence pack access, value claim readiness summary, single-claim safety, and non-computable claims.
- Update Glean Agent and MCP docs with allowed value-readiness question classes.
- Preserve strict input validation and suppression-safe outputs.

## Impact
- Affected specs: `fluencytracr-mcp-adapter`
- Affected docs: `docs/mcp/fluencytracr-mcp-server.md`, `docs/integrations/glean/03-glean-agent-tooling.md`
- Affected code: `packages/fluencytracr-mcp/src/`
- Affected tests: MCP package tests
