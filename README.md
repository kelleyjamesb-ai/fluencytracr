# LearnAIR_Engable_Tool
![Assurance Harness](https://github.com/kelleyjamesb-ai/fluencytracr/actions/workflows/assurance-harness.yml/badge.svg)

This is a way to capture organizational signals on AI Fluency using passive data.

## AI assistants — start every session here

Long-form or multi-session coding **must** begin with **[`docs/agent/SESSION_START.md`](docs/agent/SESSION_START.md)** so work stays bounded, verified, and grounded in repo memory (queue + harness + git), not chat context alone. That doc aligns with [Anthropic’s guidance on long-running agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) as implemented under [`harness/`](harness/README.md).

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
- **Every session (mandatory for agents):** [docs/agent/SESSION_START.md](docs/agent/SESSION_START.md)
- AI / agent navigation (harness, evaluation, task contracts): [docs/agent/README.md](docs/agent/README.md)
- Cursor agent harness rules: [docs/agent/cursor-agent-harness.md](docs/agent/cursor-agent-harness.md)
- Optional OpenAI Agents SDK development harness: [docs/agent/openai-agents-harness.md](docs/agent/openai-agents-harness.md)
- Partner ingestion facade: [docs/api/ingest.md](docs/api/ingest.md)
- Unified telemetry ingest (UT_2026_04, feature-flagged): [docs/api/ingest-unified-telemetry.md](docs/api/ingest-unified-telemetry.md)
- Trace reconstruction (PRD Phase 1, admin): [docs/api/traces-reconstructed.md](docs/api/traces-reconstructed.md)
- Workflow observability rollup (PRD Phase 4): [docs/api/observability-org.md](docs/api/observability-org.md)
- Architecture map: [docs/ARCHITECTURE_MAP.md](docs/ARCHITECTURE_MAP.md)
- Connector mapping spec: [docs/CONNECTOR_MAPPING_SPEC.md](docs/CONNECTOR_MAPPING_SPEC.md)
- EvidenceBundle v1 contract: [docs/contracts/evidence-bundle/v1/README.md](docs/contracts/evidence-bundle/v1/README.md)
- Reportability contract: [docs/contracts/reportability/README.md](docs/contracts/reportability/README.md)
- Agent-run development harness contract: [docs/contracts/agent-run/README.md](docs/contracts/agent-run/README.md)
- Unified cross-surface telemetry (UT_2026_04): [docs/contracts/unified-telemetry/README.md](docs/contracts/unified-telemetry/README.md)
- Glean integration pack: [docs/integrations/glean/01-overview.md](docs/integrations/glean/01-overview.md)
- Glean readiness demo guide: [docs/integrations/glean/06-readiness-demo-guide.md](docs/integrations/glean/06-readiness-demo-guide.md)
- Glean executive readiness prototype: [docs/integrations/glean/prototypes/executive-readiness-demo.html](docs/integrations/glean/prototypes/executive-readiness-demo.html)
- Glean live-data decision gate: [docs/integrations/glean/07-live-data-access-decision-gate.md](docs/integrations/glean/07-live-data-access-decision-gate.md)
- Behavioral Signals spec: [docs/BEHAVIORAL_SIGNALS_SPEC.md](docs/BEHAVIORAL_SIGNALS_SPEC.md)
- MCP adapter server: [docs/mcp/fluencytracr-mcp-server.md](docs/mcp/fluencytracr-mcp-server.md)
- API reference: [docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md)
- System architecture overview: [docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md](docs/architecture/SYSTEM_ARCHITECTURE_OVERVIEW.md)
