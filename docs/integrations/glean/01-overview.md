# Glean Value Realization Evidence Layer

## Purpose

This pack positions FluencyTracr as the behavioral evidence layer for Glean
value realization. The gap is concrete: the existing time-saved pipeline can
estimate acceleration, but roughly 64% of chat runs have no quality signal
today. Without a quality signal, value teams risk turning raw time saved into a
business claim before the workflow evidence is strong enough.

FluencyTracr adds three bounded services on top of the time-saved pipeline:

- **Quality Multiplier:** adjusts a raw time-saved estimate using aggregate
  workflow quality behavior.
- **Causal Delta:** compares pre/post aggregate workflow patterns around a
  known change moment.
- **Reliability Factor:** qualifies whether surfaced evidence appears
  operationally dependable.

The aggregate verdict layer uses AIVM vocabulary consistently. `value_type`
describes the value mechanism, and `evidence_grade` describes the support level:
`OBJECTIVE`, `CALIBRATED`, or `QUALITATIVE`. Value-realization services should
preserve those fields when they consume verdict metadata.

Audience: AIOMs, value-realization PMs, and CIOs. This is not an HR, L&D, or
individual-performance integration.

References:

- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- Value-realization contracts: `docs/integrations/value-realization/INDEX.md`
- `/api/ingest` API doc: `docs/api/ingest.md`
- Glean/platform data access RFI: `artifacts/DATA_ACCESS_CONTRACT_RFI.md`

## Pipeline Fit

FluencyTracr does not replace Glean Insights, MUSE, Sigma, or the time-saved
pipeline. It qualifies value evidence before that evidence becomes a claim.

| Existing question | Added evidence layer |
| --- | --- |
| How much time may have been saved? | Was the workflow quality strong enough to trust the estimate? |
| Did usage increase after rollout? | Did the aggregate pattern improve, hold, regress, or suppress after the change? |
| Can this become a customer-facing value story? | Does the surfaced signal have a defensible `value_type`, `evidence_grade`, and reliability posture? |

Suppression remains fail-closed. If evidence does not clear the gates,
downstream systems should preserve `SUPPRESS` and the suppression reason rather
than inserting a default multiplier, shift, or reliability value.

## Integration Modes

### Mode 1: Publish EvidenceBundle documents via Glean Indexing API

- FluencyTracr produces org-level EvidenceBundle snapshots.
- The integration service publishes bundles into Glean as searchable evidence
  documents.
- Documents remain suppression-safe, aggregate-only, and non-attributive.

### Mode 2: Agent tool calls to read-only evidence APIs

- Governance assistants and executive agents call bounded read-only endpoints.
- Agent responses stay within approved question classes and suppression-safe
  outputs.
- `/api/ingest` remains available for upstream metadata/event intake from
  partner systems.

## Shipped Now

- EvidenceBundle v1 contract documentation and JSON schema.
- Backend evidence routes with validated rolling windows.
- Glean indexing documentation and acceptance scenarios in this pack.
- MCP adapter contract and tool surface specification:
  `docs/mcp/fluencytracr-mcp-server.md`.
- Value-realization docs for Quality Multiplier, Causal Delta, Reliability
  Factor, and outcome evidence:
  `docs/integrations/value-realization/INDEX.md`.
- Glean readiness demo and live-data decision gate:
  `docs/integrations/glean/06-readiness-demo-guide.md`,
  `docs/integrations/glean/07-live-data-access-decision-gate.md`.

## Later

- Deployed MCP server binary and hosted adapter rollout for production agent
  orchestration.
- Automated EvidenceBundle publisher and CI enforcement for
  indexing/guardrails.
- Expanded agentic coverage for additional oversight and reliability evidence
  beyond the bounded question classes in `03-glean-agent-tooling.md`.
- Live Glean ingestion or Glean-hosted MCP/read access after the gate in
  `07-live-data-access-decision-gate.md` is satisfied.

## Complementary Stated-Evidence Layer

The AI Fluency Instrument should stay connected as a complementary
stated-evidence layer. It captures reported practice, confidence, and adoption
signals that can be compared with observed aggregate workflow behavior.

Use the instrument for stated evidence. Use FluencyTracr for aggregate observed
behavior, suppression, `value_type`, `evidence_grade`, Quality Multiplier,
Causal Delta, and Reliability Factor. The pairing is useful; the repository
narrative should still lead with Glean value realization.

## Boundaries

- Agentic emitters and human telemetry emitters are both in scope.
- All published and queried outputs stay org-level and aggregate.
- No individual attribution, rankings, productivity scores, or manager views.
- No raw prompts, raw responses, transcripts, query text, or file content.
- Suppression state and suppression reasons are preserved end-to-end.
- Governance invariants are the credibility proof behind the value story, not a
  separate compliance product.
