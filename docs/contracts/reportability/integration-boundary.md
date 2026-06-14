# Reportability Gate Integration Boundary

Schema version: `FT_REPORTABILITY_GATE_2026_05`

## Purpose

Downstream systems should call the reportability gate before turning Glean evidence into customer-facing ROI, agent insight, skills, MCP, or transformation reporting.

The gate is the machine-readable boundary between a metric and a claim. It returns:

- a reportability decision
- a customer evidence appendix
- per-claim allowed or blocked results

## Callers

Allowed `caller_system` values:

- `roi_model`
- `agent_insights`
- `skills_reporting`
- `mcp_reporting`
- `transformation_report`
- `customer_evidence_appendix`

## Request Shape

```json
{
  "schema_version": "FT_REPORTABILITY_GATE_2026_05",
  "caller_system": "roi_model",
  "report_context": "roi",
  "requested_claims": [
    "covered_time_saved",
    "total_productivity_impact"
  ],
  "readiness_map": {}
}
```

`readiness_map` must be a valid `GSR_2026_05` Glean Signal Readiness Map.

## Response Shape

```json
{
  "schema_version": "FT_REPORTABILITY_GATE_2026_05",
  "caller_system": "roi_model",
  "report_context": "roi",
  "decision": {},
  "appendix": {},
  "requested_claim_results": [
    {
      "claim_type": "covered_time_saved",
      "disposition": "allowed",
      "reason": "Allowed only within ROI claims and required caveats."
    },
    {
      "claim_type": "total_productivity_impact",
      "disposition": "blocked",
      "reason": "Total AI productivity impact across the organization."
    }
  ]
}
```

## Integration Rule

No customer-facing ROI, agent insight, skills, MCP, readiness, or transformation report should publish a claim unless the gate returns that requested claim as `allowed`.

Blocked claims should either be removed or replaced with allowed claim language plus required caveats from the returned decision and appendix.

## Boundary

The gate does not:

- calculate time saved
- calculate dollar value
- prove productivity lift
- score individuals
- rank teams
- judge agent or skill output quality

The gate does:

- check evidence readiness
- produce reportability state
- attach caveats
- block unsupported claims
- produce customer-facing evidence appendix content
