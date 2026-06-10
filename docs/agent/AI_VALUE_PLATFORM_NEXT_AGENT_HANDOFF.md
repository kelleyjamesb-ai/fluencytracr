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

Latest completed slice:

```text
Evidence-Aware Executive Readout HTML
```

What is now in place:

- The opened/generated Executive Readout HTML now includes a Customer Outcome
  Evidence section with sponsor decision, next action, and caveat language.
- Missing evidence routes to a data-owner request.
- Submitted evidence tells the sponsor review is pending.
- Accepted evidence routes to caveated sponsor review only; the language
  explicitly says it is not ROI proof and does not establish causality.
- Rejected evidence requests corrected aggregate evidence before stronger value
  language.
- The backend readout endpoint gathers only sanitized evidence-review context
  from stored objects and validates accepted evidence against the packet's
  Blueprint and Metrics Library before rendering it as caveated support.
- Mismatched accepted exports are ignored, so stale or wrong-window accepted
  evidence cannot become sponsor-supporting readout language.
- The generated example HTML was refreshed and no longer exposes the internal
  packet id in the footer.

Verification completed:

- Red test first:
  `npm run test:ci --workspace backend -- ai_value_objects_api.test.ts -t "evidence-aware executive readout"`
- `npm run test:ci --workspace backend -- ai_value_objects_api.test.ts`
- `npm run build --workspace backend`
- `node --test scripts/generate_ai_value_readout_html.test.mjs`
- `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx`
- `npm test --workspace frontend`
- `npm run build --workspace frontend`
- `npm run test:ai-value-roi-scenario`
- `npm run test:ai-value-agent-harness`
- `bash scripts/ci_docs_contract_sweep.sh`
- `node scripts/ci_semantic_drift_guard.mjs`
- `node scripts/ci_glean_value_governance_gates.mjs`
- `git diff --check`
- Generated HTML content audit: no raw packet ids, object type names, uppercase
  evidence-state codes, schema names, or workflow/metric state keys appear in
  the checked-in example readout.

Recommended next slice:

```text
Executive Readout Preview And Share Workflow
```

Goal:

Make Journey and Workspace show a sponsor-readable preview of the Executive
Readout before the user opens or shares it. The preview should explain which
evidence state will control the readout language, what the sponsor can do next,
and what must remain attached as caveats.

Acceptance criteria:

- Journey and Workspace should show a compact "Executive Readout Preview" or
  equivalent beside the existing Executive Operating Packet.
- The preview should use the same Customer Evidence Review state as the opened
  HTML: accepted, submitted, rejected, or missing.
- The preview should make the share/open action understandable to a client:
  what will be included, what is still held, and who owns the next action.
- Accepted evidence may be described only as caveated support for sponsor
  review, not ROI proof.
- Submitted, rejected, and missing evidence must not imply value has been
  validated.
- "Open executive readout" must keep working from Journey and Workspace.
- Do not add production connectors, autonomous customer actions, raw
  prompts/responses, direct identifiers, unsupported ROI proof, causality
  claims, individual scoring, HR analytics, productivity ranking, or
  customer-facing dollarized output.
- Add focused frontend tests and a browser smoke if visual/interaction behavior
  changes.

Suggested files:

- `frontend/src/hooks/useAiValueJourney.ts`
- `frontend/src/pages/AIValueJourney.tsx`
- `frontend/src/pages/AIValueWorkspace.tsx`
- `frontend/src/pages/AIValueJourney.test.tsx`
- `frontend/src/pages/AIValueWorkspace.test.tsx`
- `shared/src/aiValueEngine/readoutHtml.ts` only if preview wording should be
  shared with the renderer instead of duplicated in the view model.

## Next-Agent Prompt

Use this prompt to continue:

```text
Create the Executive Readout Preview and Share Workflow product slice for the
AI Value Platform. Journey and Workspace should show a sponsor-readable preview
of the readout before opening it, using the same Customer Evidence Review state
that drives the generated HTML: accepted evidence routes to caveated sponsor
review, submitted evidence routes to reviewer action, rejected evidence routes
to corrected-export request, and missing evidence routes to data-owner request.
The preview should explain what will be included in the packet, what language
remains held, who owns the next action, and why caveats must travel with the
readout. Do not add production connectors, autonomous customer actions, raw
prompts/responses, direct identifiers, unsupported ROI proof, causality claims,
individual scoring, HR analytics, productivity ranking, or customer-facing
dollarized output. Add focused frontend tests and keep frontend, backend object
API, ROI scenario, agent-harness, build, and governance checks green.
```

## What To Validate First

Validate the current Journey and Workspace open-readout path and the existing
Executive Operating Packet / Client Value Questions placement. The preview
should reduce confusion and should not become another dense panel full of object
state.

The current biggest risk is adding another panel that repeats existing language
without helping a sponsor understand what they are about to open or share.
Prefer one compact preview with a clear action, caveat, and owner over a large
new dashboard section.
