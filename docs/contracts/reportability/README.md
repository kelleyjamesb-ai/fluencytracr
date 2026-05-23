# FluencyTracr Reportability Contract

Schema version: `FT_REPORTABILITY_2026_05`

## Purpose

The reportability contract turns an evidence-readiness map into a customer-safe claim decision. It is the boundary between Glean metrics and customer-facing ROI, agent insight, skills, MCP, readiness, or transformation reporting.

FluencyTracr does not own raw usage metrics, time-saved formulas, dollar value, individual productivity, team maturity, or causal productivity lift. It owns the decision about whether evidence can support a claim, which caveats must travel with that claim, and which claims are blocked.

## Supported Contexts

V1 implements:

- `report_context: "roi"`
- `report_context: "agent_insights"`
- `report_context: "skills_reporting"`
- `report_context: "mcp_reporting"`

The ROI gate answers:

- Which covered Glean surfaces are reportable?
- Which surfaces are excluded because evidence is missing, suppressed, or not computed?
- Is the ROI claim reportable, reportable with caveats, suppressed, or unsupported?
- What language is allowed?
- What language is blocked?

The agent insights gate answers:

- Is agent-run or agent-step evidence structurally observable?
- Which adjacent surfaces, such as MCP or Skills, are included or excluded?
- Can agent evidence support observability or workflow-coverage claims?
- Which claims remain blocked, especially agent success, ROI, causality, individual productivity, and team ranking?

The skills reporting gate answers:

- Is skill lifecycle evidence structurally observable?
- Are adjacent agent or MCP surfaces included or excluded?
- Can the report claim skill lifecycle visibility?
- Which claims remain blocked, especially skill invocation, quality, ROI, causality, individual productivity, and team ranking?

The MCP reporting gate answers:

- Is MCP tool usage structurally observable?
- Are adjacent agent or skill surfaces included or excluded?
- Can the report claim MCP usage visibility?
- Which claims remain blocked, especially MCP success, ROI, causality, individual productivity, and team ranking?

## Reportability States

| State | Meaning |
| --- | --- |
| `REPORTABLE` | Required evidence is present and no surface caveats are needed. |
| `REPORTABLE_WITH_CAVEATS` | A bounded claim is allowed only with required caveats. |
| `INTERNAL_ONLY` | Evidence may support internal analysis but not customer-facing reporting. Reserved for later contexts. |
| `SUPPRESSED` | Evidence exists but fails governance, ambiguity, cohort, or evidence-safety gates. |
| `UNSUPPORTED` | Evidence is missing or not computable for the requested claim. |

## ROI Surface Mapping

| Report surface | Signal family input | Required for V1 ROI? |
| --- | --- | --- |
| `chat` | `assistant` | Yes |
| `search` | `search_document_retrieval` | Yes |
| `ai_answers` | `insights` | Yes |
| `agents` | `agent_run`, `agent_step` | No |
| `skills` | `skill_lifecycle` | No |
| `mcp` | `mcp_usage` | No |
| `apis` | `api_usage` | No |
| `gleanbot` | `gleanbot` | No |

Required surfaces determine whether a covered ROI claim can be made. Optional advanced surfaces are included when present and listed as exclusions when missing, suppressed, or not computed.

## Required Guardrail

The shared contract exposes `REPORTABILITY_CLAIM_TAXONOMY` so downstream reporting systems use controlled claim language instead of ad hoc strings.

| Claim type | Default disposition | Why |
| --- | --- | --- |
| `covered_time_saved` | Allowed | Covered-surface estimates are allowed when at least one required ROI surface is present and caveats travel with the estimate. |
| `surface_adoption` | Allowed | Surface coverage can be reported as observation, not as maturity, causality, or productivity. |
| `total_productivity_impact` | Blocked | A covered-surface estimate cannot support total organizational AI productivity claims. |
| `causal_productivity_lift` | Blocked | Readiness and usage evidence do not establish causality. |
| `individual_productivity` | Blocked | FluencyTracr is aggregate-first and does not report individual performance. |
| `team_ranking` | Blocked | Ranking teams or managers creates governance risk and exceeds the evidence boundary. |

Every generated decision also blocks excluded-surface inclusion claims, such as:

- agent ROI is included
- skills ROI is included
- MCP ROI is included
- API ROI is included
- Gleanbot ROI is included

Those claims may only move out of blocked status after the related report context has explicit readiness and value-estimation rules.

## Always Blocked

- total AI productivity impact
- causal productivity lift
- individual productivity
- team or manager ranking

This keeps FluencyTracr useful as a claim-safety layer without turning it into another analytics dashboard or ROI calculator.

## Example Shape

```json
{
  "schema_version": "FT_REPORTABILITY_2026_05",
  "org_id": "org-northstar-enterprise",
  "window": "weekly",
  "generated_at": "2026-05-01T12:00:00.000Z",
  "source_system": "FluencyTracr",
  "report_context": "roi",
  "reportability": "REPORTABLE_WITH_CAVEATS",
  "evidence_confidence": "MEDIUM",
  "included_surfaces": ["chat", "search", "ai_answers"],
  "excluded_surfaces": ["agents", "skills", "mcp"],
  "required_caveats": [
    "ROI claims must be limited to covered surfaces; excluded surfaces: agents, skills, mcp.",
    "Do not claim total AI productivity impact, individual productivity, team ranking, or causal productivity lift."
  ],
  "allowed_claims": [
    {
      "claim_type": "covered_time_saved",
      "claim": "Estimated time saved on covered Glean surfaces."
    }
  ],
  "blocked_claims": [
    {
      "claim_type": "total_productivity_impact",
      "claim": "Total AI productivity impact across the organization."
    }
  ]
}
```

## Generate The Seeded Example

```bash
npm run reportability:roi
npm run reportability:appendix
npm run reportability:agent-insights
npm run reportability:agent-appendix
npm run reportability:skills
npm run reportability:skills-appendix
npm run reportability:mcp
npm run reportability:mcp-appendix
```

Default ROI decision input:

`docs/contracts/glean-signal-readiness/examples/org-northstar-weekly-readiness-map.json`

Default ROI decision output:

`docs/contracts/reportability/examples/org-northstar-roi-reportability-decision.json`

Default customer appendix output:

`docs/contracts/reportability/examples/org-northstar-customer-evidence-appendix.json`

Default agent insights outputs:

- `docs/contracts/reportability/examples/org-northstar-agent-insights-reportability-decision.json`
- `docs/contracts/reportability/examples/org-northstar-agent-insights-evidence-appendix.json`

Default skills and MCP outputs:

- `docs/contracts/reportability/examples/org-northstar-skills-reportability-decision.json`
- `docs/contracts/reportability/examples/org-northstar-skills-evidence-appendix.json`
- `docs/contracts/reportability/examples/org-northstar-mcp-reportability-decision.json`
- `docs/contracts/reportability/examples/org-northstar-mcp-evidence-appendix.json`

## Customer Evidence Appendix

The customer evidence appendix is a customer-facing rollup generated from the reportability decision. It is designed for QBRs, ROI packets, renewal decks, and transformation reports.

It includes:

- reportability state
- evidence confidence
- covered surfaces
- excluded surfaces and reasons
- required caveats
- blocked claims
- evidence gaps
- governance posture
- next actions

It does not include:

- raw prompts or outputs
- transcripts
- message text
- file content
- user identifiers
- individual productivity scores
- team rankings

## Relationship To Other Contracts

- Glean Signal Readiness Map: input evidence availability and computability.
- EvidenceBundle v1: aggregate evidence posture.
- Reportability Decision: claim-level allowed, caveated, suppressed, or blocked output.
- Customer Evidence Appendix: customer-facing explanation of the reportability decision.
- Reportability Gate: downstream integration boundary for requested claims. See [integration-boundary.md](integration-boundary.md).
- Operating handoff: practical adoption rules for reporting systems. See [operating-handoff.md](operating-handoff.md).

## Relationship to V4 Value Confidence

V4 Value Confidence may become an upstream source for reportability decisions by
providing defensible value ranges, leakage maps, scale readiness, and trust
calibration caveats.

Reportability remains the claim-safety boundary. V4 artifacts must preserve
reportability's blocked claims, fail-closed suppression, aggregate-only posture,
and caveat propagation. Suppressed V4 evidence cannot make a reportable claim
or expose economic values.
