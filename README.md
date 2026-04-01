# LearnAIR_Engable_Tool
This is a way to capture organizational signals on AI Fluency using passive data.

## Scope guardrails
This project intentionally rejects surveillance and scope creep. Please read and follow
the guardrails in [SCOPE_GUARDRAILS.md](SCOPE_GUARDRAILS.md) before proposing changes.

## FluencyTracr V1 Confidence & Signal Layer
The confidence layer enforces inference safety invariants for behavioral signals:
- Outputs are signals, not facts, and are strictly binary: `SURFACE` or `SUPPRESS`.
- Default state is `SUPPRESS`; ambiguity is first-class and always suppressive.
- No content storage or individual attribution is permitted.
- Latency is corroborative only and never triggers surfacing on its own.
- No tunable thresholds or admin overrides are allowed; constants are compiled into code.

Suppression reason codes (one-hot, immutable):
- `INSUFFICIENT_TIME`
- `INSUFFICIENT_VOLUME`
- `NO_CONVERGENCE`
- `BASELINE_UNSTABLE`
- `HIGH_AMBIGUITY`

## Canonical docs
- AI / agent navigation (harness, evaluation, task contracts): [docs/agent/README.md](docs/agent/README.md)
- Partner ingestion facade: [docs/api/ingest.md](docs/api/ingest.md)
- Architecture map: [docs/ARCHITECTURE_MAP.md](docs/ARCHITECTURE_MAP.md)
- Connector mapping spec: [docs/CONNECTOR_MAPPING_SPEC.md](docs/CONNECTOR_MAPPING_SPEC.md)
- EvidenceBundle v1 contract: [docs/contracts/evidence-bundle/v1/README.md](docs/contracts/evidence-bundle/v1/README.md)
- Glean integration pack: [docs/integrations/glean/01-overview.md](docs/integrations/glean/01-overview.md)
- Behavioral Signals spec: [docs/BEHAVIORAL_SIGNALS_SPEC.md](docs/BEHAVIORAL_SIGNALS_SPEC.md)
- MCP adapter server: [docs/mcp/fluencytracr-mcp-server.md](docs/mcp/fluencytracr-mcp-server.md)
- API reference: [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md)
- System architecture overview: [docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md](docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md)
