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
Customer Evidence Request Packet from ROI Scenario Readiness
```

What is now in place:

- `useAiValueJourney` now builds a `CustomerEvidenceRequest` view model from
  the latest governed ROI scenario object and selected Blueprint handoff.
- `/ai-value-journey` and `/ai-value-workspace` show a client-readable
  "Customer Evidence Request" panel with the exact aggregate export to ask for,
  customer system, outcome metric, approved export level, baseline/comparison
  window rules, data owners, review step, caveat, and blocked value language.
- The Executive Operating Packet and Client Value Questions now use the request
  packet as the recommended next client action when a mapped opportunity exists.
- Missing states remain actionable: finish Blueprint and outcome mapping before
  asking the client for an aggregate export.
- The implementation stays UI/view-model only: no production connector, no
  autonomous customer action, no ROI proof, no causality claim, no individual
  scoring, no HR analytics, no productivity ranking, and no customer-facing
  dollarized output.

Verification completed:

- Red test first:
  `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx -t "customer evidence request"`
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
  Customer Evidence Request, show the Support Operations export ask, show
  blocked value language, expose no unsafe/internal terms, have no console
  warnings/errors, and have no horizontal overflow at 390px or 1440px.

Recommended next slice:

```text
Customer Evidence Review Workbench from the Request Packet
```

Goal:

Turn the submitted/accepted/rejected outcome evidence state into a clearer
review workbench that answers whether the requested customer export has arrived,
who must review it, whether it matches the request packet, and what language is
still blocked before the sponsor readout. This should make the evidence-review
step feel like an operating workflow instead of a raw object list.

Acceptance criteria:

- Replace the current raw-feeling "Customer Evidence Review" area with a
  sponsor-readable review workbench derived from Customer Evidence Request plus
  `outcome_evidence_export` review state.
- Show whether the requested export is missing, submitted, accepted, or rejected
  in client language, including what is safe to do next for each state.
- Surface reviewer action buttons only for submitted evidence and preserve the
  existing role-gated review API behavior.
- Reference the request packet fields rather than internal export IDs wherever
  possible; if an export ID remains visible, it should be secondary/supporting
  detail, not the primary label.
- Keep accepted evidence as caveated support only. Do not calculate ROI, claim
  causality, rank people/teams/managers, introduce HR analytics, create a
  production connector, or emit customer-facing dollarized output.
- Add focused tests for missing, submitted, accepted, and rejected states where
  feasible, plus the existing Journey/Workspace and governance checks.

Suggested files:

- `frontend/src/pages/AIValueJourney.tsx`
- `frontend/src/hooks/useAiValueJourney.ts`
- `frontend/src/pages/AIValueWorkspace.tsx`
- `frontend/src/components/CustomerEvidenceRequestPanel.tsx`
- `frontend/src/pages/AIValueJourney.test.tsx`
- `frontend/src/pages/AIValueWorkspace.test.tsx`

## Next-Agent Prompt

Use this prompt to continue:

```text
Create the Customer Evidence Review Workbench product slice for the AI Value
Platform. Use the existing Customer Evidence Request, ROI Scenario Readiness,
and Outcome Evidence review state to show whether the requested aggregate export
is missing, submitted, accepted, or rejected; who needs to review it; whether it
matches the requested metric/source/window/grain; and what value language
remains blocked. Surface this in `/ai-value-journey` and keep `/ai-value-workspace`
aligned if useful. Preserve the existing role-gated review API for submitted
exports. Do not add production connectors, autonomous customer actions, raw
prompts/responses, direct identifiers, unsupported ROI proof, causality claims,
individual scoring, HR analytics, productivity ranking, or customer-facing
dollarized output. Add focused tests and keep ROI scenario, agent-harness,
frontend, backend object API, build, and governance checks green.
```

## What To Validate First

Validate the evidence-review experience before adding more engines.

The current biggest risk is that the platform can now ask for the right export
but still makes review feel like a raw object list. The next slice should make
the evidence-review step operational, readable, and visibly governed.
