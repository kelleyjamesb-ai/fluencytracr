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

Recommended next slice:

```text
AI Value Platform Product Spine V1
```

Goal:

Make `/ai-value-journey` the clear first-screen product experience that turns
the diagrams into a usable, phase-based client workflow.

Acceptance criteria:

- The journey shows the six operating phases in plain client language.
- Each phase has inputs, current outputs, missing capabilities, and next action.
- Blueprint is presented as a collaborative workflow-design workspace.
- Metrics are presented as outcome signals and value routes, not abstract
  database columns.
- FluencyTracr evidence is presented as aggregate evidence readiness and safe
  interpretation, not raw telemetry.
- Value realization shows scenario/readiness status, not unsupported ROI proof.
- Each phase uses the previous phase's object outputs where available.
- The experience makes it obvious what the next user action is.
- Tests cover the journey state, missing-data states, and link paths into
  discovery/workspace/readout surfaces.

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
Create AI Value Platform Product Spine V1. Turn the attached whole-system
diagrams into a clear client-facing phase experience. Start from main. Make
/ai-value-journey the product home for the value-realization lifecycle:
Human Readiness -> Blueprint -> Execution Instrumentation -> Evidence And
Measurement -> Value Realization -> Whole-System Outcomes. Each phase should
show what has been captured, what is missing, what object feeds the next phase,
and the next user action. Rename technical/internal labels into client
language. Make Blueprint feel like a collaborative workshop, Metrics feel like
outcome signals/value routes, and FluencyTracr feel like the aggregate evidence
governance layer. Keep ROI governed: scenario/readiness language is allowed,
but no unsupported ROI proof, causality claims, individual scoring, HR
analytics, productivity ranking, or customer-facing dollar output. Add focused
frontend/shared tests and keep existing AI value engine and governance tests
green.
```

## What To Validate First

Validate the user experience before adding more engines.

The current biggest risk is that the software has many correct objects but the
client cannot understand what they are doing or why they matter. A clearer
journey surface will expose which backend objects are actually needed next.
