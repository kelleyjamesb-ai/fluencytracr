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

Latest completed slice:

```text
ROI Scenario Readiness in Journey / Workspace
```

What is now in place:

- Backend AI value objects support `roi_scenario` through the governed
  `validateRoiScenario` path and derive `workflow_family` from the ROI scenario
  workflow payload.
- `useAiValueJourney` now builds a `RoiScenarioReadiness` view model from the
  latest governed ROI scenario object.
- `/ai-value-journey` shows ROI Scenario Readiness with workflow, value route,
  outcome signal, source system, baseline/comparison state, customer-owned
  assumptions, outcome evidence review state, scenario bands, safe value
  language, blocked outputs, and executive handoff language.
- `/ai-value-workspace` shows the same readiness handoff above the workshop tabs
  so the value-modeling state follows the user into the working surface.
- Tests verify the UI stays sponsor-readable and does not expose internal
  contract/database language.

Verification completed:

- `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx`
- `npm test --workspace frontend`
- `npm run build --workspace frontend`
- `npm run test:ci --workspace backend -- ai_value_objects_api.test.ts`
- `npm run test:ci --workspace backend`
- `npm run test:ai-value-roi-scenario`
- `npm run test:ai-value-agent-harness`
- `bash scripts/ci_docs_contract_sweep.sh`
- `node scripts/ci_semantic_drift_guard.mjs`
- `node scripts/ci_glean_value_governance_gates.mjs`
- `git diff --check`
- Browser smoke with mocked governed objects: Journey and Workspace render ROI
  Scenario Readiness, show `Median resolution time`, show safe caveat language,
  expose no unsafe/internal terms, have no console errors, and have no
  horizontal overflow at 390px or 1440px.

Recommended next slice:

```text
Customer Evidence Request Packet from ROI Scenario Readiness
```

Goal:

Turn the ROI Scenario Readiness handoff into reusable software that tells a
client exactly what aggregate evidence is needed to strengthen the value model:
which customer system export, metric, approved grain, baseline window,
comparison window, owner, review state, and remaining claim limits are required.
This should make the value conversation operational without building a
production connector or producing customer-facing economic output.

Acceptance criteria:

- Add a governed local request-packet view model or schema derived from
  Blueprint + Metrics Library + ROI Scenario Readiness + Outcome Evidence state.
- Journey and/or Workspace show a client-readable "Customer Evidence Request"
  panel with required aggregate export, source system, metric, baseline and
  comparison window needs, owner, review step, and what language remains
  blocked until evidence is reviewed.
- Missing states are actionable: "ask Support Ops for aggregate resolution-time
  export for these windows" rather than internal object/schema language.
- Executive Operating Packet can reference the request packet as the next
  action, but still cannot claim realized ROI, causality, individual scoring, HR
  analytics, productivity ranking, or customer-facing economic figures.
- Add focused tests for complete and missing request states.
- Keep ROI scenario, agent harness, frontend, backend object API, build, and
  governance checks green.

Suggested files:

- `frontend/src/pages/AIValueJourney.tsx`
- `frontend/src/hooks/useAiValueJourney.ts`
- `frontend/src/pages/AIValueWorkspace.tsx`
- `frontend/src/pages/AIValueJourney.test.tsx`
- `frontend/src/pages/AIValueWorkspace.test.tsx`
- Optional if a reusable contract is needed:
  `shared/src/aiValueEngine/*`,
  `docs/contracts/ai-value-intelligence/`,
  `scripts/validate_ai_value_*`
- `docs/contracts/ai-value-intelligence/examples/customer-support-roi-scenario.json`

## Next-Agent Prompt

Use this prompt to continue:

```text
Create the Customer Evidence Request Packet product slice for the AI Value
Platform. Use the existing Blueprint, Metrics Library, ROI Scenario Readiness,
and Outcome Evidence state to show the client which aggregate data export is
needed to strengthen the value model: source system, metric, approved grain,
baseline window, comparison window, owner, review state, and remaining blocked
claims. Surface it in `/ai-value-journey` and/or `/ai-value-workspace` in
plain client language, and let the Executive Operating Packet reference it as
the next action. Do not add production connectors, autonomous customer actions,
raw prompts/responses, direct identifiers, unsupported ROI proof, causality
claims, individual scoring, HR analytics, productivity ranking, or
customer-facing dollarized output. Add focused tests and keep ROI scenario,
agent-harness, frontend, backend object API, build, and governance checks green.
```

## What To Validate First

Validate the data request experience before adding more engines.

The current biggest risk is that the platform can say "value modeling needs
evidence" but cannot tell the client, in operational language, exactly what to
export, who owns it, and how it changes the safe value story.
