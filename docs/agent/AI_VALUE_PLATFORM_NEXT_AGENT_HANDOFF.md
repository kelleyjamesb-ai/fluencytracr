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
Evidence-Aware Executive Operating Cadence
```

What is now in place:

- `useAiValueJourney` now uses `CustomerEvidenceReviewWorkbench.reviewState`
  when building the Executive Operating Packet and Client Value Questions.
- Accepted evidence routes to caveated sponsor readout prep with blocked value
  language still attached.
- Submitted evidence routes to reviewer action before stronger value language.
- Rejected evidence routes to corrected-export request and keeps stronger value
  language held.
- Missing evidence routes to the data-owner request.
- `/ai-value-workspace` now renders the sponsor-facing Client Value Questions
  and Executive Operating Packet, so the workshop carries the same cadence as
  `/ai-value-journey`.
- Agentic follow-up now changes by evidence state: caveated readout prep,
  reviewer action, corrected-export request, or data-owner request.
- Accepted evidence remains caveated support only. No production connector,
  autonomous customer action, ROI proof, causality claim, individual scoring, HR
  analytics, productivity ranking, or customer-facing dollarized output was
  added.

Verification completed:

- Red test first:
  `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx -t "executive cadence"`
- `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx`
- `npm test --workspace frontend`
- `npm run build --workspace frontend`
- `npm run test:ci --workspace backend -- ai_value_objects_api.test.ts`
- `npm run test:ai-value-roi-scenario`
- `npm run test:ai-value-agent-harness`
- `bash scripts/ci_docs_contract_sweep.sh`
- `node scripts/ci_semantic_drift_guard.mjs`
- `node scripts/ci_glean_value_governance_gates.mjs`
- `git diff --check`
- Browser smoke with mocked governed objects: Journey and Workspace render
  Customer Evidence Review, Client Value Questions, and Executive Operating
  Packet; show the Support Operations reviewer-action cadence; expose no unsafe
  internal state codes or object terms; have no console warnings/errors; and
  have no horizontal overflow at 390px or 1440px.

Recommended next slice:

```text
Evidence-Aware Executive Readout HTML
```

Goal:

Make the opened/generated Executive Readout HTML reflect the same evidence-aware
cadence now shown in Journey and Workspace. The readout itself should tell a
sponsor whether customer outcome evidence is missing, awaiting review, accepted,
or rejected, and what that means for caveated value language.

Acceptance criteria:

- The readout HTML should include evidence-aware sponsor decision, next action,
  and caveat language derived from the current outcome evidence review state.
- Accepted evidence may appear only as caveated support for sponsor review, not
  ROI proof.
- Submitted evidence should tell the sponsor review is pending.
- Rejected evidence should request corrected aggregate evidence before stronger
  value language.
- Missing evidence should route to the data-owner request.
- Journey/Workspace "Open executive readout" behavior should remain working.
- Do not calculate ROI, emit dollarized output, claim causality, rank
  people/teams/managers, introduce HR analytics, create a production connector,
  or add autonomous customer actions.
- Add focused backend/readout tests plus any frontend smoke needed to prove the
  opened packet carries the same cadence as the page panels.

Suggested files:

- `frontend/src/pages/AIValueJourney.tsx`
- `frontend/src/hooks/useAiValueJourney.ts`
- `frontend/src/pages/AIValueWorkspace.tsx`
- `frontend/src/components/CustomerEvidenceReviewWorkbench.tsx`
- `frontend/src/pages/AIValueJourney.test.tsx`
- `frontend/src/pages/AIValueWorkspace.test.tsx`

## Next-Agent Prompt

Use this prompt to continue:

```text
Create the Evidence-Aware Executive Readout HTML product slice for the AI Value
Platform. The opened/generated Executive Readout should use the same Customer
Evidence Review state now used by Journey and Workspace: accepted evidence
routes to caveated readout language, submitted evidence routes to reviewer
action, rejected evidence routes to corrected-export request, and missing
evidence routes to data-owner request. Accepted evidence may support caveated
value review only; rejected or missing evidence must hold stronger value
language. Do not add production connectors, autonomous customer actions, raw
prompts/responses, direct identifiers, unsupported ROI proof, causality claims,
individual scoring, HR analytics, productivity ranking, or customer-facing
dollarized output. Add focused tests and keep ROI scenario, agent-harness,
frontend, backend object API, build, and governance checks green.
```

## What To Validate First

Validate where the Executive Readout HTML is rendered from stored objects, then
thread the evidence-review cadence into that renderer without duplicating
business rules in an unsafe way.

The current biggest risk is that Journey and Workspace now show the correct
evidence-aware cadence, but the opened executive readout could still sound
generic or stronger than the evidence state allows.
