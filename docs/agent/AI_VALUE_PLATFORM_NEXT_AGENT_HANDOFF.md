# AI Value Platform Next-Agent Handoff

## Product North Star

Build the attached whole-system diagrams as reusable software.

The product is not a static dashboard and not a deck generator. It should be a
guided client value-realization workspace where each phase creates governed
objects that feed the next phase:

```text
Human Readiness
-> Workflow Discovery And Blueprint
-> Execution Instrumentation
-> Evidence And Measurement
-> Value Realization
-> Whole-System Outcomes
-> Renewal And Expansion
```

The first screen should make the system understandable to a client. If a user
cannot tell what Blueprint, Metrics, FluencyTracr evidence, outcome data, and
value realization are for, the experience is not working yet.

## Product Interpretation Of The Diagrams

The diagrams should be interpreted as a software spine:

| Diagram area | Product module | Existing software anchor | Next experience requirement |
| --- | --- | --- | --- |
| Human Readiness | Explore Your AI Fluency kickoff | `fluency_baseline` object | Show aggregate readiness and capability gaps as client-language kickoff context. |
| Workflow Discovery And Design | Blueprint workspace | `engagement`, `blueprint`, intake adapter | Make Blueprint feel like a collaborative client workshop, not a database record. |
| Execution Layer | Glean, MCP, agents, workflow telemetry | FluencyTracr aggregate evidence and future connectors | Show what can be instrumented and what is missing before claiming value. |
| Evidence And Measurement | FluencyTracr evidence layer | `evidence_readiness`, outcome evidence export | Explain what can be interpreted safely, what is suppressed, and why. |
| Value Realization | Metrics library and value scenario | `metrics_library`, `value_scenario`, outcome evidence | Map workflow changes to value routes, metrics, assumptions, and evidence gaps. |
| Whole-System Outcomes | Executive operating cadence | `executive_packet`, readout HTML, Value Journey | Turn validated objects into decision-ready next actions and review rhythm. |

## Governance Direction

Do not loosen FluencyTracr core governance casually.

Better move:

1. Keep FluencyTracr as the aggregate evidence and suppression layer.
2. Add a separate governed value-modeling lane in the AI Value Platform.
3. Allow ROI-style scenario outputs only when they are labeled as modeled,
   assumption-backed, and claim-governed.
4. Allow stronger value language only when customer-owned outcome evidence,
   source coverage, baseline/comparison windows, and human review support it.

Allowed future language:

- Modeled value scenario
- Estimated capacity range
- Cost-savings hypothesis
- Outcome evidence attached
- Reportable with caveats
- Value realized, customer-attested

Still blocked without an explicit future governance change:

- Glean proved ROI
- Glean caused productivity lift
- AI usage generated savings by itself
- Individual productivity
- Employee, manager, team, or department ranking
- Hidden causal or counterfactual claims

If the product needs customer-facing ROI or dollarized output, first add a
contract and tests for a governed `value_model` or `roi_scenario` object. Do
not bury ROI math inside the executive packet or UI.

## Next Build Slice

Completed latest slice:

```text
Governed value_model / roi_scenario contract
```

What is now in place:

- Added `FT_AI_VALUE_ROI_SCENARIO_2026_06` as the governed local value-modeling
  object above `value_scenario` and `evidence_readiness`.
- Added shared engine validation and builder in `shared/src/aiValueEngine`.
- Added `scripts/validate_ai_value_roi_scenario.mjs`, package scripts, seeded
  Customer Support fixture, and JSON schema.
- The object carries selected Blueprint workflow, value route, metric models,
  baseline/comparison rules, customer-owned assumptions, evidence status,
  scenario bands, safe value language, and economic-output policy.
- The validator rejects realized ROI, dollarized output, customer-facing
  economic output, causality claims, direct identifiers, raw prompts/responses,
  HR/people analytics, individual scoring, productivity fields, and autonomous
  customer actions.

Recommended next slice:

```text
ROI Scenario Readiness in Journey / Workspace
```

Goal:

Make the governed ROI scenario contract visible in the product experience. The
Journey and Value Workshop should show whether the selected workflow is ready
for value modeling, which inputs are still missing, and what safe value language
can move into the Executive Operating Packet.

Acceptance criteria:

- Journey shows a plain-English ROI Scenario Readiness section sourced from the
  governed ROI scenario object or derived view model.
- Workspace shows baseline/comparison, assumptions, evidence status, scenario
  bands, safe value language, and blocked outputs without database labels.
- Executive Operating Packet language can reference governed value modeling, but
  still cannot claim realized ROI, causality, individual scoring, HR analytics,
  productivity ranking, or customer-facing economic figures.
- Missing states make the client data request obvious.
- Focused frontend tests cover ready and missing-state behavior.
- Existing AI value engine, ROI scenario, agent harness, frontend, build, and
  governance checks remain green.

Suggested files:

- `frontend/src/pages/AIValueJourney.tsx`
- `frontend/src/hooks/useAiValueJourney.ts`
- `frontend/src/lib/aiValueViewModel.ts`
- `shared/src/aiValueEngine/*`
- `frontend/src/components/AiValueJourneyRail.tsx`
- `frontend/src/pages/AIValueWorkspace.tsx`
- `docs/contracts/ai-value-intelligence/examples/customer-support-roi-scenario.json`

## Next-Agent Prompt

Use this prompt to continue:

```text
Create the ROI Scenario Readiness product slice for the AI Value Platform.
Surface the governed `FT_AI_VALUE_ROI_SCENARIO_2026_06` object in
`/ai-value-journey` and `/ai-value-workspace` so a client can see whether the
selected Blueprint workflow is ready for value modeling, which
baseline/comparison, assumptions, evidence, and source-coverage inputs are
missing, and what safe value language can move into the Executive Operating
Packet. Keep all language client-facing. Do not add production connectors,
autonomous customer actions, raw prompts/responses, direct identifiers,
unsupported ROI proof, causality claims, individual scoring, HR analytics,
productivity ranking, or customer-facing dollarized output. Add focused
frontend tests and keep ROI scenario, AI value engine, frontend, build, and
agent-harness checks green.
```

## What To Validate First

Validate the user experience before adding more engines.

The current biggest risk is that the software has many correct objects but the
client cannot understand what they are doing or why they matter. A clearer
journey surface will expose which backend objects are actually needed next.
