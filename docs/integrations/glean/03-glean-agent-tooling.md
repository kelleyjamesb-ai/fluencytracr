# Glean Agent Tooling (Bounded Executive Usage)

References:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- `/api/ingest` API doc: `docs/api/ingest.md`
- Glean integration overview: `docs/integrations/glean/01-overview.md`

## Supported bounded executive questions
- "What is the current org-level exposure posture for this window?"
- "Are calibration signals present or suppressed for this org?"
- "Which fragility indicators are elevated at org level?"
- "What source coverage is missing for this org?"
- "Is learning trend improving, stable, degrading, suppressed, or not computed?"

Out of scope question classes:
- Any team-level or manager-level comparison request
- Any ranking, scoring, or individual attribution request
- Any request to infer hidden suppressed values

## Callable FluencyTracr endpoints
Agent tools may call only bounded, read-only evidence routes plus ingestion facade where needed for partner relay:
- `GET /api/evidence/bundles/:orgId?window=<daily|weekly|30d|60d|90d|180d|360d|3m|6m|12m>`
- `GET /api/evidence/coverage/:orgId?window=<...>` (same window enum as bundles)
- `GET /api/evidence/controls/:orgId?window=<...>` (same window enum as bundles)
- `POST /api/ingest` for metadata/event intake from approved integration pipelines

## Suppression propagation into agent responses
- If bundle suppression is active, agent must return:
  - suppression state
  - suppression reason codes
  - allowed aggregate context only
- Agent must not fabricate proxy values for suppressed fields.
- Agent must preserve EvidenceBundle enum semantics (`present`, `not_present`, `suppressed`, `not_computed`).

## Prohibited outputs and safeguards
- Prohibited:
  - person-level attribution
  - rank ordering by performance proxy
  - hidden-value reconstruction from suppressed fields
  - raw prompt/output/transcript content
- Safeguards:
  - strict response template with allowed fields only
  - query guard that rejects forbidden dimensions
  - final response validator that enforces suppression-safe output

## Agent response template
Required fields:
- `org_id`
- `window`
- `generated_at`
- `suppression_applied`
- `suppression_reasons`
- `exposure`
- `calibration`
- `fragility`
- `coverage_summary`
- `decision_safe_guidance`

