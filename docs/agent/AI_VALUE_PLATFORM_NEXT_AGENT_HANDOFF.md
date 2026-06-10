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
Customer Evidence Review Workbench from the Request Packet
```

What is now in place:

- `useAiValueJourney` now builds a `CustomerEvidenceReviewWorkbench` view model
  from Customer Evidence Request, governed ROI Scenario Readiness, and
  `outcome_evidence_export` review state.
- `/ai-value-journey` replaces the raw export-card list with a sponsor-readable
  "Customer Evidence Review" workbench.
- `/ai-value-workspace` shows the same review workbench beside the Customer
  Evidence Request Packet.
- The workbench shows whether the requested export is missing, submitted,
  accepted, or rejected; who reviews it; whether it matches requested metric,
  customer system, export level, and baseline/comparison windows; and what value
  language remains blocked.
- Accept and Reject actions appear only for submitted evidence and still call
  the existing role-gated review API. Export IDs are no longer primary UI copy.
- Accepted evidence remains caveated support only. No production connector,
  autonomous customer action, ROI proof, causality claim, individual scoring, HR
  analytics, productivity ranking, or customer-facing dollarized output was
  added.

Verification completed:

- Red test first:
  `npm test --workspace frontend -- AIValueJourney.test.tsx -t "customer evidence review"`
- `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx -t "customer evidence review"`
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
  Customer Evidence Request plus Customer Evidence Review, show the Support
  Operations review workflow, expose no unsafe/internal terms, have no console
  warnings/errors after stubbing the local-preview Speed Insights script, and
  have no horizontal overflow at 390px or 1440px.

Recommended next slice:

```text
Evidence-Aware Executive Operating Cadence
```

Goal:

Connect the accepted/rejected/missing evidence-review result into the executive
operating packet, client value questions, and agentic follow-up so the sponsor
can see whether value language can remain caveated, must be held, or needs
corrected/resubmitted evidence.

Acceptance criteria:

- Executive Operating Packet should use the Customer Evidence Review state, not
  only the request packet, when choosing sponsor decision and recommended next
  action.
- Client Value Questions should distinguish "export requested" from "export
  accepted", "awaiting review", and "rejected/resubmit."
- Agentic follow-up should route accepted evidence to caveated readout prep,
  submitted evidence to reviewer action, rejected evidence to corrected-export
  request, and missing evidence to data-owner request.
- Keep accepted evidence caveated. Do not calculate ROI, emit dollarized output,
  claim causality, rank people/teams/managers, introduce HR analytics, create a
  production connector, or add autonomous customer actions.
- Add focused Journey/Workspace tests for accepted, submitted, rejected, and
  missing executive-cadence language.

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
Create the Evidence-Aware Executive Operating Cadence product slice for the AI
Value Platform. Use the Customer Evidence Review Workbench state to update the
Executive Operating Packet, Client Value Questions, and agentic handoff language
so accepted, submitted, rejected, and missing exports produce different sponsor
next actions. Accepted evidence may support caveated value review only; rejected
or missing evidence must hold stronger value language. Do not add production
connectors, autonomous customer actions, raw prompts/responses, direct
identifiers, unsupported ROI proof, causality claims, individual scoring, HR
analytics, productivity ranking, or customer-facing dollarized output. Add
focused tests and keep ROI scenario, agent-harness, frontend, backend object
API, build, and governance checks green.
```

## What To Validate First

Validate that the executive packet is now driven by actual evidence-review
state, not merely by the existence of a request packet.

The current biggest risk is that the platform can request and review evidence,
but the sponsor-facing next action still sounds the same regardless of whether
the customer export is missing, submitted, accepted, or rejected.
