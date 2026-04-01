# Glean Integration Overview (Glean-first)

## Purpose
This pack defines the Glean-first integration pattern for FluencyTracr.
It uses EvidenceBundle v1 as the stable evidence contract and `/api/ingest` as the partner-facing intake facade.

References:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- `/api/ingest` API doc: `docs/api/ingest.md`
- **Glean/platform data access RFI** (vendor questionnaire; join keys, export parity, governance logs): `artifacts/DATA_ACCESS_CONTRACT_RFI.md`

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

### Shipped now (v1-ready contracts and API parity)
- EvidenceBundle v1 contract documentation and JSON schema (`window`: `daily`, `weekly`, and all **`FluencyWindow`** tokens: `30d`, `60d`, `90d`, `180d`, `360d`, `3m`, `6m`, `12m`).
- Backend evidence routes accept the same window set as the executive dashboard rolling windows (`GET /api/evidence/bundles|coverage|controls/:orgId`).
- `/api/patterns`, `/api/coverage`, `/orgs/:orgId/telemetry/index`, `/api/orientation/:orgId`, and `/api/board-snapshot/:orgId` accept any valid **`FluencyWindow`** (schema-validated); inference record matching uses `WINDOW_DAYS` per token.
- Glean indexing documentation and acceptance scenarios in this pack.
- MCP adapter **contract** and tool surface specification: `docs/mcp/fluencytracr-mcp-server.md` (aligned window enums with evidence API).

### Later (runtime and automation)
- Deployed MCP server binary and hosted adapter rollout for production agent orchestration.
- Automated EvidenceBundle publisher (scheduled jobs) and CI enforcement for indexing/guardrails.
- Expanded agentic coverage for additional oversight and reliability evidence beyond the bounded question classes in `03-glean-agent-tooling.md`.

## Multi-agent readiness boundaries
- Agentic emitters and human telemetry emitters are both in scope.
- All published and queried outputs stay org-level and aggregate.
- No individual attribution and no ranking outputs.
- Suppression state and suppression reasons are preserved end-to-end.

## Non-negotiable boundaries
- No individual attribution.
- No rankings or performance score proxies.
- Suppression rules apply before indexing and before agent answer generation.
