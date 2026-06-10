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
Governed ROI / Value Scenario UX
```

What is now in place:

- `/ai-value-journey` includes a sponsor-readable Governed Scenario Builder.
- The builder shows customer-owned assumptions, baseline/comparison window
  status, customer outcome export status, scenario-band readiness, and unlock
  conditions for stronger value language.
- Scenario bands are explicitly framed as planning ranges, not proof.
- The view model derives this from existing readiness, scenario, evidence-review,
  and opportunity objects.

Recommended next slice:

```text
Discovery -> Journey continuity
```

Goal:

Make the first workflow selected in Discovery / Blueprint visibly carry into
the Journey, Value Workshop, Scenario Builder, and Executive Operating Packet so
the software feels like one guided client workspace instead of adjacent modules.

Acceptance criteria:

- The selected Blueprint workflow appears consistently across Discovery,
  Journey, Value Workshop, Scenario Builder, and Executive Packet.
- The Journey explains which workflow object feeds each downstream object.
- The Value Workshop opens with the same workflow, value route, and evidence
  status the Journey just summarized.
- Empty/missing states tell the client what to finish in Blueprint before
  modeling value.
- No unsupported ROI proof, causality claim, individual scoring, HR analytics,
  productivity ranking, or customer-facing dollarized output is introduced.
- Tests cover the handoff path and missing-workflow states.

Suggested files:

- `frontend/src/pages/AIValueJourney.tsx`
- `frontend/src/hooks/useAiValueJourney.ts`
- `frontend/src/lib/aiValueViewModel.ts`
- `frontend/src/components/AiValueJourneyRail.tsx`
- `frontend/src/pages/AIValueWorkspace.tsx`
- `shared/src/aiValueEngine/valueChain.ts`
- `shared/src/aiValueEngine/readiness.ts`
- `shared/src/aiValueEngine/executivePacket.ts`
- `backend/src/ai_value_routes.ts`
- `docs/contracts/ai-value-intelligence/examples/*`

## Next-Agent Prompt

Use this prompt to continue:

```text
Create the Discovery -> Journey continuity slice for the AI Value Platform.
Make the first selected Blueprint workflow carry cleanly into /ai-value-journey,
/ai-value-workspace, the Governed Scenario Builder, and the Executive Operating
Packet. The user should understand which workflow was chosen with the client,
which value route it maps to, what Glean/FluencyTracr can show now, what
customer-owned evidence is missing, and what the next action is. Keep all
language client-facing. Keep ROI governed: scenario/readiness language is
allowed, but no unsupported ROI proof, causality claims, individual scoring, HR
analytics, productivity ranking, autonomous customer actions, or customer-facing
dollar output. Add focused frontend tests and keep existing AI value and
agent-harness checks green.
```

## What To Validate First

Validate the user experience before adding more engines.

The current biggest risk is that the software has many correct objects but the
client cannot understand what they are doing or why they matter. A clearer
journey surface will expose which backend objects are actually needed next.
