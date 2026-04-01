# System Architecture Overview (Canonical)

References:
- API reference: `docs/api/API_REFERENCE.md`
- Ingest facade: `docs/api/ingest.md`
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- MCP adapter server: `docs/mcp/fluencytracr-mcp-server.md`
- Glean integration overview: `docs/integrations/glean/01-overview.md`
- Behavioral signals: `docs/BEHAVIORAL_SIGNALS_SPEC.md`

## Layered architecture

### 1) Ingest layer
- Entry surfaces:
  - `POST /api/ingest` partner-facing async facade
  - `POST /api/events` strict canonical validator
- Inputs:
  - human telemetry metadata
  - agent emitter metadata
- Constraints:
  - no raw content payloads
  - idempotent ingest semantics and schema-version checks

### 2) Processing layer
- Canonical event validation and forbidden-field enforcement
- Sequence-based behavior computation
- Aggregation and suppression logic
- Fail-closed behavior on invalid or unsafe inputs

### 3) Evidence layer
- EvidenceBundle generator component (v1)
- Read-only evidence surfaces for executive and governance use
- Coverage map computation:
  - instrumented sources
  - missing sources
  - coverage notes
- Suppression-aware exports for all supported windows

### 4) Integrations layer
- Glean publisher component for indexed EvidenceBundle documents
- MCP adapter server component as tool surface for governance assistants
- Partner connectors that ingest through `/api/ingest`

## EvidenceBundle generator component
- Inputs:
  - aggregated behavioral and governance evidence
  - coverage metadata
  - suppression metadata
- Outputs:
  - `schema_version=evidence_bundle.v1`
  - window-scoped evidence payload (`daily`, `weekly`, plus all shared `FluencyWindow` tokens)  - suppression state and reasons
- Guarantees:
  - additive-compatible v1 behavior
  - non-attribution and non-ranking outputs

## Glean publisher component
- Publishes EvidenceBundle snapshots into Glean indexing pipeline
- Applies org-scoped permissions and retention policy
- Preserves suppression semantics during indexing and retrieval

## MCP adapter server component
- Exposes bounded tools:
  - `fluency.ingest_events`
  - `fluency.get_evidence_bundle`
  - `fluency.get_control_evidence`
  - `fluency.get_coverage_map`
- Enforces enum-bounded input schemas and org scope
- Rejects free-form raw content inputs

## Fail-closed and suppression enforcement points
- Ingest boundary:
  - schema version gate
  - forbidden field rejection
  - role and org scope checks
- Processing boundary:
  - deterministic validation and aggregation
  - suppression rules and reason coding
- Evidence and integration boundary:
  - suppression propagation to API responses
  - suppression propagation to Glean documents and MCP responses

## Coverage map concept
- Coverage map is a required evidence surface for trust in observed posture.
- Includes:
  - `instrumented_sources`
  - `missing_sources`
  - narrative `coverage_notes`
- Used to qualify confidence in executive decisions without person-level attribution.

## Multi-agent roadmap note
- Current state:
  - supports agent emitters via metadata/event envelopes
  - supports governance assistants through MCP adapter tool calls
- Next expansion:
  - deeper agentic oversight evidence classes
  - stronger automated guardrail checks in CI for integration drift

## Canonical format note
- Markdown files under `docs/**` are canonical sources.
- PDFs are generated exports and not canonical sources of truth.

