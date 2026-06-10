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
Discovery -> Journey continuity
```

What is now in place:

- `useAiValueJourney` now derives a selected-workflow handoff from the latest
  Blueprint, Metrics Library, and evidence-review objects.
- `/ai-value-journey` shows a Selected Workflow Handoff with workflow name,
  value route, evidence status, and links to continue or refine the Blueprint.
- `/ai-value-workspace` opens with the same Journey-derived workflow handoff.
- Missing-workflow states tell the client to finish Blueprint before modeling
  value.
- Browser checks verified the handoff at desktop and mobile widths with mocked
  AI Value API objects, no console errors, no horizontal overflow, and no unsafe
  internal labels.

Recommended next slice:

```text
Governed value_model / roi_scenario contract
```

Goal:

Define the technical contract for governed ROI/value modeling before the product
shows any stronger economic output. The contract should make customer-owned
assumptions, baseline/comparison windows, source coverage, value route, scenario
bands, allowed language, and blocked claims explicit.

Acceptance criteria:

- Add a schema or contract for a governed `value_model` / `roi_scenario` object.
- Validate metric references, value route, baseline/comparison rules,
  customer-owned assumptions, source coverage, scenario bands, and allowed claim
  level.
- Reject raw prompts/responses, direct identifiers, unsupported ROI proof,
  causality claims, productivity ranking, HR analytics, and individual scoring.
- Keep all outputs labeled as modeled scenarios or value hypotheses unless
  customer-owned outcome evidence and human review explicitly support stronger
  language.
- Add seeded Customer Support fixtures and focused tests/validators.
- Do not add production connectors, autonomous agent actions, or customer-facing
  dollarized output in this slice.

Suggested files:

- `frontend/src/pages/AIValueJourney.tsx`
- `frontend/src/hooks/useAiValueJourney.ts`
- `frontend/src/lib/aiValueViewModel.ts`
- `schemas/ai-value-intelligence/*`
- `docs/contracts/ai-value-intelligence/*`
- `scripts/*ai_value*`
- `shared/src/aiValueEngine/*`
- `frontend/src/components/AiValueJourneyRail.tsx`
- `frontend/src/pages/AIValueWorkspace.tsx`

## Next-Agent Prompt

Use this prompt to continue:

```text
Create the governed value_model / roi_scenario contract slice for the AI Value
Platform. Define the reusable object that turns a selected Blueprint workflow,
Metrics Library route, customer-owned assumptions, baseline/comparison windows,
source coverage, scenario bands, evidence status, and safe value language into a
validated value-modeling artifact. Keep it local and governed: no production
connector, no autonomous customer actions, no raw prompts/responses, no direct
identifiers, no unsupported ROI proof, no causality claim, no individual
scoring, no HR analytics, no productivity ranking, and no customer-facing
dollarized output. Add schemas/fixtures/validators/tests and keep the existing
frontend, build, and AI value agent-harness checks green.
```

## What To Validate First

Validate the user experience before adding more engines.

The current biggest risk is that the software has many correct objects but the
client cannot understand what they are doing or why they matter. A clearer
journey surface will expose which backend objects are actually needed next.
