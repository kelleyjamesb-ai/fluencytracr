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
Workspace Page Handoff Navigation
```

What is now in place:

- Every focused `/ai-value-workspace/*` page now ends with a Workspace Handoff
  navigation block.
- The block shows what the current page feeds next, a Back link to the prior
  phase, and a Continue link to the next phase.
- Sponsor Decisions loops back to Blueprint Workshop, so the workspace now reads
  as an operating cycle rather than a set of disconnected pages.
- The block derives from the existing `workspacePages` structure only; it does
  not add a new backend object, schema, runtime service, or connector.
- This is UI/comprehension work only. No production connector, runtime service,
  autonomous customer action, unsupported ROI proof, causality claim, individual
  scoring, HR analytics, productivity ranking, raw prompt/response storage,
  direct identifiers, or customer-facing dollar output was added.

Verification completed:

- Red test first:
  `npm test --workspace frontend -- AIValueWorkspace.test.tsx -t "clear previous and next handoff" --reporter=basic`
- `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx --reporter=basic`
- `npm test --workspace frontend -- --reporter=basic`
- `npm run build --workspace frontend`
- `node scripts/ci_semantic_drift_guard.mjs`
- `node scripts/ci_glean_value_governance_gates.mjs`
- `git diff --check`
- In-app browser smoke for
  `/ai-value-workspace/readiness`, `/blueprint`, `/metrics`, `/evidence`,
  `/scenario`, `/readout`, and `/decisions` at 1440px and 390px: handoff
  navigation present, expected next link correct, no unsafe internal terms/state
  codes, no console warnings/errors, and no horizontal overflow.

Recommended next slice:

```text
Human Review / PR Decision
```

Pause for human review of `/ai-value-journey` and all `/ai-value-workspace`
routes, then decide whether to push/open a PR or start a new bounded slice from
observed review gaps. Keep the same governance boundary: no ROI proof, no
causality, no individual scoring, no HR analytics, no productivity ranking, and
no customer-facing dollar output unless a later governed value-modeling contract
explicitly promotes that exact scope.

Previously completed slice:

```text
Guided Sponsor Operating Workflow
```

What is in place:

- `/ai-value-workspace/readout` and `/ai-value-workspace/decisions` share a
  Sponsor Operating Workflow panel.
- The panel connects Readout preview, Sponsor decision, Handoff draft, and Next
  operating loop so the sponsor path feels like one operating workflow rather
  than disconnected panels.
- The panel derives from existing Executive Readout Preview and Sponsor Decision
  Loop objects only; it does not add a new backend object, schema, runtime
  service, or connector.
- The footer keeps the handoff boundary explicit: no task is created and no
  customer action is automated.

Previously completed slice:

```text
Evidence To Value Language Path
```

What is in place:

- `/ai-value-workspace/evidence` and `/ai-value-workspace/scenario` share an
  Evidence to Value Language Path panel.
- The panel connects aggregate work evidence, customer outcome evidence,
  scenario readiness, safe value language, blocked stronger claims, and the next
  governed action.
- The panel gives explicit handoff links to Scenario Builder and Executive
  Readout so Evidence and Scenario feel like one governed path rather than two
  disconnected panels.
- Blocked value language keeps the highest-risk boundaries visible: no realized
  ROI claim, no customer-facing economic figures, and no causality claim.

Previously completed slice:

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

Latest completed slice:

```text
Executive Readout Preview And Share Workflow
```

What is now in place:

- Journey and Workspace show a compact sponsor-readable Executive Readout
  Preview before opening the generated readout.
- The preview uses the same Customer Evidence Review state as the opened HTML:
  accepted evidence routes to caveated sponsor review, submitted evidence routes
  to reviewer action, rejected evidence routes to corrected-export request, and
  missing evidence routes to data-owner request.
- The preview explains what will open, what language remains held, who owns the
  next action, and which caveat must travel with the readout.
- Accepted evidence is described only as caveated support; submitted, rejected,
  and missing evidence never imply validated value.
- `Open executive readout` still works from Journey and Workspace through the
  shared preview panel.

Verification completed:

- Red test first:
  `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx -t "previews"`
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
- Playwright CLI mocked-route smoke: Journey and Workspace render the preview
  at 1440px and 390px, expose no unsafe internal state/object terms, have no
  console warnings/errors, have no horizontal overflow, and opening the readout
  creates the generated readout tab.

Latest completed slice:

```text
Sponsor Decision And Follow-Up Loop
```

What is now in place:

- Journey and Workspace show a shared, compact Sponsor Decision panel near the
  Executive Readout Preview and Executive Operating Packet.
- The recommendation is derived from Customer Evidence Review state:
  accepted evidence recommends caveated expansion review; submitted evidence
  recommends reviewer action; rejected evidence recommends corrected export;
  missing evidence recommends the data-owner request; not-ready evidence returns
  to Blueprint.
- The sponsor sees five action-oriented choices: `Expand workflow`,
  `Collect stronger evidence`, `Request corrected export`, `Hold value
  language`, and `Return to Blueprint`.
- Each option explains what it feeds next: Blueprint, Customer Evidence Request,
  Evidence Review, ROI Scenario Readiness, or Executive Operating Packet.
- Agentic follow-up stays bounded to handoff preparation only. No production
  connector, autonomous customer action, raw prompts/responses, direct
  identifiers, unsupported ROI proof, causality claim, individual scoring, HR
  analytics, productivity ranking, or customer-facing dollarized output was
  added.

Verification completed:

- Red test first:
  `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx -t "sponsor decision follow-up loop"`
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
- Playwright mocked-route smoke: Journey and Workspace render Sponsor Decision
  at 1440px and 390px, expose no unsafe internal terms or uppercase evidence
  state codes in DOM text, have no console warnings/errors, and have no
  horizontal overflow.

Latest completed slice:

```text
Decision Selection Handoff Preview And Copy-Ready Draft
```

What is now in place:

- Journey and Workspace let the sponsor select one of the five Sponsor Decision
  moves and see the selected handoff update locally.
- The selected handoff preview shows selected move, owner, target
  object/workflow, required evidence or input, safe next action, and the caveat
  that must stay attached.
- A separate copy-ready local draft mirrors the selected handoff and can be
  copied to the clipboard.
- Copying does not persist anything, create a task, call an API, trigger a
  runtime service, or automate customer action.
- Accepted evidence remains caveated support only, not ROI proof or causality.
  Submitted, rejected, missing, and hold-language paths keep stronger value
  language gated.
- No production connector, autonomous customer action, raw prompt/response
  storage, direct identifiers, unsupported ROI proof, causality claim,
  individual scoring, HR analytics, productivity ranking, or customer-facing
  dollarized output was added.

Verification completed:

- Red test first:
  `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx -t "copies .* decision handoff"`
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
- Playwright CLI smoke: seeded the local API with governed Customer Support
  examples, then verified Journey and Workspace at 1440px and 390px. The
  copy-ready draft renders, selecting `Hold value language` updates the draft,
  `Copy handoff draft` shows copied status, no unsafe internal terms appear, no
  AI Value API failures occur, and no horizontal overflow appears.

Latest completed slice:

```text
Client Value Questions To Metrics Mapping Bridge
```

What is now in place:

- Journey and Workspace now show a shared `Questions to Metrics Bridge` panel.
- The bridge connects the sponsor question `Where is the ROI opportunity?` to
  the client success measure, recommended governed metric, value route, customer
  source system, measurement unit, comparison rule, data owner, evidence status,
  allowed claim language, and downstream handoff.
- The view model is derived from existing objects only: Engagement success
  measures, Client Value Questions, Metrics Library / Value Opportunity mapping,
  ROI Scenario Readiness, Customer Evidence Request, and Customer Evidence
  Review.
- The bridge focuses on the success-measure path before deeper opportunity
  mapping, so Metrics read as an answer to the client value question rather than
  as schema rows.
- It feeds ROI Scenario Readiness and Customer Evidence Request without adding a
  production connector, second metrics system, runtime service, autonomous
  customer action, direct identifiers, raw prompt/response storage, unsupported
  ROI proof, causality claim, individual scoring, HR analytics, productivity
  ranking, or customer-facing dollarized output.

Verification completed:

- Red test first:
  `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx -t "bridges"`
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
- Playwright CLI smoke against built preview: mocked governed Customer Support
  objects, verified Journey and Workspace at 1440px and 390px, confirmed the
  bridge renders, no horizontal overflow occurs, and no console warnings/errors
  remain after stubbing local Vercel Speed Insights.

Latest completed slice:

```text
Client Value Spine Trace
```

What is now in place:

- Journey and Workspace now show a shared `Client Value Spine Trace` panel
  immediately after the Questions to Metrics Bridge.
- The trace makes the product spine readable as a client value path:
  Blueprint decision -> Outcome metric -> Customer evidence -> Value language
  -> Sponsor decision.
- Each step shows the current answer, current status, and what it feeds next,
  so users can see how a Blueprint workshop decision becomes a governed metric,
  an aggregate customer evidence request, caveated scenario language, and a
  sponsor action.
- The trace is derived only from existing governed view models: Workflow
  Handoff, Questions to Metrics Bridge, Customer Evidence Request, Customer
  Evidence Review, ROI Scenario Readiness, and Sponsor Decision.
- This is a comprehension layer, not a new engine, connector, workflow runner,
  or value calculator. No production connector, runtime service, autonomous
  customer action, direct identifiers, raw prompt/response storage,
  unsupported ROI proof, causality claim, individual scoring, HR analytics,
  productivity ranking, or customer-facing dollarized output was added.

Verification completed:

- Red test first:
  `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx -t "value spine trace"`
- `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx`
- `npm test --workspace frontend`
- `npm run build --workspace frontend`
- `node scripts/ci_semantic_drift_guard.mjs`
- `node scripts/ci_glean_value_governance_gates.mjs`
- `git diff --check`
- In-app browser smoke against the local preview: Journey and Workspace render
  the unauthenticated trace empty state at 1440px and 390px, with no console
  warnings/errors and no horizontal overflow. Populated trace steps are covered
  by route-level tests with governed Customer Support objects.

Pause checkpoint:

- Stop here for human review before starting another product slice.
- Inspect `/ai-value-journey` and `/ai-value-workspace`, especially the flow:
  Client Value Questions -> Questions to Metrics Bridge -> ROI Scenario
  Readiness -> Customer Evidence Request -> Sponsor Decision.
- The main UX question to validate is whether the Questions to Metrics Bridge
  plus Client Value Spine Trace make the platform feel like one connected
  client value workflow instead of a set of database-backed panels.

Latest requested adjustment:

```text
Multi-Page Workspace IA
```

What changed after the checkpoint:

- `/ai-value-workspace` is now the Workspace Home / command center instead of
  the long all-in-one page.
- The workspace has focused route-based pages:
  `/ai-value-workspace/readiness`, `/blueprint`, `/metrics`, `/evidence`,
  `/scenario`, `/readout`, and `/decisions`.
- The old tab-like six-panel workshop flow was replaced with persistent page
  navigation and focused page bodies.
- Existing governed components were preserved and moved to the page where a
  client would expect them: Blueprint workshop canvas, Questions to Metrics
  Bridge, Customer Evidence Request/Review, ROI Scenario Readiness, Executive
  Readout Preview, Executive Operating Packet, Sponsor Decision Loop, and Safe
  Value Language.
- One handoff label was made more client-readable: "Target object or workflow"
  became "Where this goes next."
- This is IA and comprehension work only. It does not add a production
  connector, runtime service, autonomous customer action, unsupported ROI proof,
  causality claim, individual scoring, HR analytics, productivity ranking, raw
  prompt/response storage, direct identifiers, or customer-facing dollarized
  output.

Verification completed for the adjustment:

- `npm test --workspace frontend -- AIValueWorkspace.test.tsx --reporter=basic`
- `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx --reporter=basic`
- `npm test --workspace frontend -- --reporter=basic`
- `npm run build --workspace frontend`
- `node scripts/ci_semantic_drift_guard.mjs`
- `node scripts/ci_glean_value_governance_gates.mjs`
- `git diff --check`
- In-app browser smoke for Home, Blueprint, Metrics, Evidence, Scenario,
  Readout, and Decisions at 1440px and 390px: no missing expected headings, no
  cross-page heading bleed-through, no unsafe internal terms, no console
  warnings/errors, and no horizontal overflow.

Latest requested adjustment:

```text
Blueprint Workshop Board
```

What changed after the multi-page split:

- `/ai-value-workspace/blueprint` now behaves like a client workshop board
  instead of a static record panel.
- The Blueprint page shows current workflow and target workflow lanes so the
  client can see what changes.
- Open client decisions are interactive. Choosing a decision updates the
  workshop focus, owner, and next step.
- The page now gives explicit handoffs into Metrics mapping, Evidence planning,
  and the governed Scenario builder.
- This is page-level interaction and comprehension work only. It does not add a
  production connector, runtime service, autonomous customer action,
  unsupported ROI proof, causality claim, individual scoring, HR analytics,
  productivity ranking, raw prompt/response storage, direct identifiers, or
  customer-facing dollarized output.

Verification completed for the adjustment:

- `npm test --workspace frontend -- AIValueWorkspace.test.tsx -t "interactive client workshop board" --reporter=basic`
- `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx --reporter=basic`
- `npm test --workspace frontend -- --reporter=basic`
- `npm run build --workspace frontend`
- `node scripts/ci_semantic_drift_guard.mjs`
- `node scripts/ci_glean_value_governance_gates.mjs`
- `git diff --check`
- In-app browser smoke for Blueprint at 1440px and 390px: decision focus
  interaction updates the owner and next step, Metrics/Evidence/Scenario
  handoff links render, no unsafe internal terms appear, no console
  warnings/errors occur, and there is no horizontal overflow.

Latest requested adjustment:

```text
Metrics Opportunity Map
```

What changed after the Blueprint workshop board:

- `/ai-value-workspace/metrics` now opens with an Outcome and ROI opportunity
  map instead of a value-signal table.
- The map connects the Blueprint route, client value question, outcome metric,
  customer data need, evidence gap, safe value language, and next gated action.
- The page now hands off directly into Evidence planning and the governed
  Scenario builder.
- The page has a governed example opportunity path before live evidence is
  connected, so the client can understand what Metrics is for in example mode.
- Metric candidates now render as cards rather than a table.
- This is page-level interaction and comprehension work only. It does not add a
  production connector, runtime service, autonomous customer action,
  unsupported ROI proof, causality claim, individual scoring, HR analytics,
  productivity ranking, raw prompt/response storage, direct identifiers, or
  customer-facing dollarized output.

Verification completed for the adjustment:

- Red test first:
  `npm test --workspace frontend -- AIValueWorkspace.test.tsx -t "outcome and ROI opportunity map" --reporter=basic`
- `npm test --workspace frontend -- AIValueWorkspace.test.tsx -t "outcome and ROI opportunity map" --reporter=basic`
- `npm test --workspace frontend -- AIValueJourney.test.tsx AIValueWorkspace.test.tsx --reporter=basic`
- `npm test --workspace frontend -- --reporter=basic`
- `npm run build --workspace frontend`
- `node scripts/ci_semantic_drift_guard.mjs`
- `node scripts/ci_glean_value_governance_gates.mjs`
- `git diff --check`
- In-app browser smoke for Metrics at 1440px and 390px: the opportunity map
  renders in example mode, the old recommended value-signal table is absent,
  Evidence and Scenario handoff links render, no unsafe internal terms appear,
  no console warnings/errors occur, and there is no horizontal overflow.

## Next-Agent Prompt

Use this prompt only after the human reviews the checkpoint and wants to keep
building:

```text
Continue the AI Value Platform product spine after the checkpoint review.
First inspect Journey and the multi-page Workspace as a user: Workspace Home,
Blueprint, Metrics, Evidence, Scenario, Readout, and Decisions. Check whether
the page split, Blueprint workshop board, and Metrics opportunity map make the
platform easier to understand, especially the path: Blueprint decision ->
Metrics opportunity map -> Evidence readiness -> ROI Scenario Readiness ->
Sponsor Decision. Identify the next bounded product slice that makes the
platform more understandable or useful without expanding governance risk. The
likely next slice is making Evidence and Scenario feel like one governed path
from aggregate evidence to value language rather than separate panels.
Keep FluencyTracr as aggregate evidence and keep ROI/value language governed:
no production connector, runtime service, autonomous customer action, direct
identifiers, raw prompt/response storage, unsupported ROI proof, causality
claim, individual scoring, HR analytics, productivity ranking, or
customer-facing dollarized output.
```

## What To Validate First

Validate the working product experience, not the object model. The current
biggest risk is still client comprehension: Blueprint and Metrics now have
clearer working surfaces, but Scenario/Evidence still need to feel like a
governed path to value language rather than database state.
