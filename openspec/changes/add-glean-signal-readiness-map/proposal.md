# Change: Add Glean Signal Readiness Map

## Why

FluencyTracr has an EvidenceBundle output and a Glean data-access RFI, but it does not yet have a computability layer that maps Glean-native telemetry families to evidence readiness. Operators need to know which Glean signals are available, which fields survive governance boundaries, and which FluencyTracr dimensions can be computed without inferring hidden values.

## What Changes

- Add a Glean Signal Readiness Map contract for org-window signal availability, required join keys, export/scrub status, derived evidence dimensions, and readiness status.
- Add shared Zod validation for the readiness map so future adapters can emit a consistent shape.
- Add an MCP tool for strict agent-safe EvidenceBundle summaries using the existing `AgentEvidenceResponse` template.
- Document the distinction between raw evidence endpoints and the agent-safe summary tool.

## Impact

- Affected specs: `glean-signal-readiness`, `glean-agent-tooling`
- Affected docs: `docs/contracts/glean-signal-readiness/`, `docs/mcp/fluencytracr-mcp-server.md`
- Affected code: `shared/src/`, `packages/fluencytracr-mcp/src/`
