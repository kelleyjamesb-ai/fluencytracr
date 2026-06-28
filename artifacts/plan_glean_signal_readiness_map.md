# Plan: Glean Signal Readiness Map

## Scope

Build one bounded addition:

1. Add a machine-checkable Glean Signal Readiness Map contract that explains which Glean signal families can support FluencyTracr evidence, which fields are required, and whether a signal is present, missing, suppressed, or not computable.
2. Add a strict Glean Agent MCP summary tool that returns the existing `AgentEvidenceResponse` template instead of raw EvidenceBundle JSON.

## In

- `docs/contracts/glean-signal-readiness/`
- `shared/src/gleanSignalReadinessSchemas.ts`
- `packages/fluencytracr-mcp/src/tools.ts`
- targeted tests for shared contract parsing and MCP tool output
- MCP/Glean docs updates

## Out

- No direct ingestion from real Glean logs.
- No individual, team, manager, role, ranking, or productivity scoring fields.
- No changes to existing queue task `phase-03-fsc-min-signal`.
- No frontend surface in this slice.

## Verification

- Red/green targeted tests for the readiness schema and strict MCP summary tool.
- `npm run build --workspace shared`
- `npm test --workspace @fluencytracr/fluencytracr-mcp`
- `npm run build --workspace @fluencytracr/fluencytracr-mcp`

## Risks

- Glean log field availability is deployment-dependent, so this slice documents computability and readiness rather than asserting all signals are available.
- The strict summary tool must avoid leaking raw EvidenceBundle fields not approved for agent responses.
