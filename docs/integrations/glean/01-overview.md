# Glean Integration Overview (Glean-first)

## Purpose
This pack defines the Glean-first integration pattern for FluencyTracr.
It uses EvidenceBundle v1 as the stable evidence contract and `/api/ingest` as the partner-facing intake facade.

References:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- `/api/ingest` API doc: `docs/api/ingest.md`

## Two integration modes

### Mode 1: Publish EvidenceBundle documents via Glean Indexing API
- FluencyTracr produces org-level EvidenceBundle snapshots.
- Integration service publishes bundles into Glean as searchable evidence documents.
- Documents remain suppression-safe and non-attributive.

### Mode 2: Agent tool calls to FluencyTracr Evidence API
- Governance assistants and executive agents call read-only evidence endpoints.
- Agent responses are bounded to approved question classes and suppression-safe outputs.
- `/api/ingest` remains available for upstream metadata/event intake from partner systems.

## Shipped now versus later

### Shipped now
- EvidenceBundle v1 contract documentation.
- `/api/ingest` partner facade contract documentation.
- Glean indexing documentation and acceptance scenarios in this pack.

### Later
- MCP adapter rollout for direct tool orchestration by governance assistants.
- Expanded agentic coverage for additional oversight and reliability evidence.
- Automated publisher and agent guardrail enforcement in CI.

## Multi-agent readiness boundaries
- Agentic emitters and human telemetry emitters are both in scope.
- All published and queried outputs stay org-level and aggregate.
- No individual attribution and no ranking outputs.
- Suppression state and suppression reasons are preserved end-to-end.

## Non-negotiable boundaries
- No individual attribution.
- No rankings or performance score proxies.
- Suppression rules apply before indexing and before agent answer generation.

