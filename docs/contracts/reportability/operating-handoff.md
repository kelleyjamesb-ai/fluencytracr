# Reportability Operating Handoff

## Recommended Operating Rule

No customer-facing ROI, agent insight, skills, MCP, readiness, or transformation claim should ship unless FluencyTracr returns that requested claim as `allowed` through `FT_REPORTABILITY_GATE_2026_05`.

## Current Supported Report Contexts

| Context | Status | Allowed claim posture |
| --- | --- | --- |
| `roi` | Implemented | Covered time saved and surface adoption, with caveats. |
| `agent_insights` | Implemented | Agent observability and workflow coverage, with caveats. |
| `skills_reporting` | Implemented | Skill lifecycle visibility, with caveats. |
| `mcp_reporting` | Implemented | MCP tool observability, with caveats. |
| `transformation_narrative` | Reserved | Fails closed until explicit rules are added. |

## Always Blocked

- Total organizational AI productivity impact
- Causal productivity lift
- Individual productivity or performance scoring
- Team or manager ranking
- Including excluded-surface ROI in covered-surface estimates

## How A Reporting System Should Use This

1. Build or fetch a valid `GSR_2026_05` Glean Signal Readiness Map.
2. Submit a `FT_REPORTABILITY_GATE_2026_05` request with:
   - `caller_system`
   - `report_context`
   - `requested_claims`
   - `readiness_map`
3. Use only claims returned as `allowed`.
4. Attach the returned required caveats and customer evidence appendix.
5. Remove or rewrite any blocked claim.

## Practical Examples

Allowed ROI language:

> Estimated time saved on covered Glean surfaces.

Required caveat pattern:

> This estimate is limited to covered surfaces and excludes surfaces that are missing, suppressed, or not computed for the reporting window.

Blocked language:

> Glean caused a productivity lift across the organization.

Safer replacement:

> For covered surfaces, available evidence supports a bounded estimate with caveats. It does not establish total productivity impact or causality.

## What To Build Next

1. Wire the gate into the ROI reporting path.
2. Add the `transformation_narrative` context after Product/GTM agrees on allowed language.
3. Decide whether Skills should remain lifecycle-only or add a separate, lower-confidence skill invocation readiness rule.
4. Decide whether MCP reporting should distinguish local MCP, remote MCP, and agent-mediated MCP usage.
