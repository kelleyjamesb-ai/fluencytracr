# Glean Agent Tooling (Bounded Executive Usage)

References:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- Glean Signal Readiness Map: `docs/contracts/glean-signal-readiness/README.md`
- `/api/ingest` API doc: `docs/api/ingest.md`
- Glean integration overview: `docs/integrations/glean/01-overview.md`

## Supported bounded executive questions
- "What is the current org-level exposure posture for this window?"
- "Are calibration signals present or suppressed for this org?"
- "Which fragility indicators are elevated at org level?"
- "What source coverage is missing for this org?"
- "Is learning trend improving, stable, degrading, suppressed, or not computed?"
- "Which Glean signal families are ready for evidence derivation?"
- "Which Glean signal families are missing, suppressed, or not computed, and what needs to unlock them?"
- "Which Glean value claims are safe, caveated, suppressed, or not computed for this org-window?"
- "Is a specific Glean value claim safe to use in a QBR or renewal packet?"

### Expanded org-level classes (still executive-safe)
- "Which expected instrumentation sources are present versus missing for this org-window?" (coverage only; no team slice)
- "Is suppression active and which reason codes apply?" (reason codes and flags only; no reconstruction of masked metrics)
- "Is safe-path escalation signal present, absent, suppressed, or not computed for this org-window?"
- "For this window, is verification presence signal present, absent, suppressed, or not computed?"
- "What is ready now versus blocked in the Glean Signal Readiness Map?" (readiness status only; no raw source records)

Machine-checked template builder (strict JSON, no extra keys): `@fluencytracr/fluencytracr-mcp` exports `buildAgentEvidenceResponse` / `validateAgentEvidenceResponse`.
Preferred MCP read tool for Glean Agents: `fluency.get_agent_evidence_summary`.
Preferred MCP readiness tool for Glean Agents: `fluency.get_signal_readiness_summary`.
Preferred MCP value-readiness tool for Glean Agents: `fluency.get_value_claim_readiness_summary`.

Out of scope question classes:
- Any team-level or manager-level comparison request
- Any ranking, scoring, or individual attribution request
- Any request to infer hidden suppressed values

## Callable FluencyTracr endpoints
Agent tools may call only bounded, read-only evidence routes plus ingestion facade where needed for partner relay:
- `fluency.get_agent_evidence_summary` for the strict agent-safe summary template
- `fluency.get_signal_readiness_summary` for agent-safe Glean readiness counts, non-computable families, suppression state, and next actions
- `fluency.get_signal_readiness_map` for trusted aggregate readiness map access when the full `GSR_2026_05` contract is required
- `fluency.get_value_claim_readiness_summary` for agent-safe Glean value claim posture, customer-safe claims, non-computable claims, and next instrumentation actions
- `fluency.evaluate_claim_safety` for one registered claim's readiness and language state
- `fluency.get_non_computable_value_claims` for suppressed or not-computed value claims and reason codes
- `fluency.get_value_evidence_pack` for trusted aggregate `GVE_2026_05` access when the full contract is required
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
- For readiness responses, agent must preserve readiness enum semantics (`present`, `missing`, `suppressed`, `not_computed`) and must not convert blocked families into evidence claims.

## Prohibited outputs and safeguards
- Prohibited:
  - person-level attribution
  - rank ordering by performance proxy
  - hidden-value reconstruction from suppressed fields
- raw prompt/output/transcript content
- raw Glean source records, validation samples, join-key expansion, or deployment-specific identifiers
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

## Value readiness response template
Required fields:
- `org_id`
- `window`
- `generated_at`
- `source_system`
- `value_posture`
- `evidence_lanes`
- `claim_readiness_counts`
- `customer_safe_claims`
- `non_computable_claims`
- `next_instrumentation_actions`
- `decision_safe_guidance`

## Readiness response template
Required fields:
- `org_id`
- `window`
- `generated_at`
- `source_system`
- `readiness_counts`
- `ready_signal_families`
- `non_computable_signal_families`
- `next_actions`
- `suppression_applied`
- `suppression_reasons`
- `decision_safe_guidance`
