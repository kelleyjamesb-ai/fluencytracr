# FluencyTracr API Reference (Canonical)

References:
- Ingest facade contract: `docs/api/ingest.md`
- EvidenceBundle v1 contract: `docs/contracts/evidence-bundle/v1/README.md`
- MCP adapter server: `docs/mcp/fluencytracr-mcp-server.md`
- Glean integration overview: `docs/integrations/glean/01-overview.md`

## Ingest

### `POST /api/ingest` partner async facade
- Canonical docs: `docs/api/ingest.md`
- Role: partner-facing asynchronous ingestion facade
- Purpose:
  - accepts metadata/event envelopes from partner integrations
  - supports idempotent replay safety and intake acknowledgment
  - aligns validation semantics with strict canonical event rules
- Required headers include:
  - `X-FluencyTracr-Schema-Version`
  - `Idempotency-Key`

### `POST /api/events` strict validator
- Role: strict canonical event validation and ingest path
- Purpose:
  - enforces event schema and forbidden-field policies
  - returns deterministic validation failures for invalid payloads
- Relationship to ingest facade:
  - `/api/ingest` is the partner async entrypoint
  - `/api/events` is the strict canonical validator

## Evidence

### EvidenceBundle v1 contract and export
- Canonical contract: `docs/contracts/evidence-bundle/v1/README.md`
- Schema: `docs/contracts/evidence-bundle/v1/evidence-bundle.schema.json`
- Window support: `daily`, `weekly`, and all shared **`FluencyWindow`** tokens (`30d`, `60d`, `90d`, `180d`, `360d`, `3m`, `6m`, `12m`; `360d` spans 365 days in `WINDOW_DAYS`)
- Evidence semantics:
  - evidence presence states, not compliance scoring
  - suppression state and reason codes are first-class

### Evidence endpoints (read-only) and suppression semantics
Read-only evidence surfaces are expected to provide:
- org-scoped aggregate evidence only
- suppression metadata (`suppression_applied`, `suppression_reasons`)
- no individual attribution

Representative read-only routes for integration planning:
- `GET /api/evidence/bundles/:orgId?window=<daily|weekly|30d|60d|90d|180d|360d|3m|6m|12m>`
- `GET /api/evidence/coverage/:orgId?window=<...>` (same enum)
- `GET /api/evidence/controls/:orgId?window=<...>` (same enum)

Suppression semantics:
- suppressed fields remain suppressed
- clients must not reconstruct suppressed values
- suppression reasons must propagate to downstream integrations and agent responses

## Auth and scoping
- Service identities for integration and MCP tool calls
- Org-bound scope on all ingest and evidence access
- Role checks and scope checks enforced at API boundary
- Cross-org requests denied

## Versioning policy links
- EvidenceBundle versioning: `docs/contracts/evidence-bundle/v1/README.md`
- Ingest schema-version header contract: `docs/api/ingest.md`
- Governance gate policy: `docs/CI_GOVERNANCE_GATES.md`

## Explicit non-goals
- No individual scoring.
- No punitive outputs.
- No ranking or leaderboard outputs.
- No raw prompt, output, or transcript content in evidence APIs.

