# AI Value Intelligence MVP

## 1. Purpose

This document defines the MVP for an AI Value Intelligence System built on
FluencyTracr's existing evidence-governance model.

The system should help organizations answer:

```text
Where is AI being used, what work is changing, what business value may be
emerging, and which ROI or value claims are supported, caveated, missing, or
unsafe?
```

The MVP is docs-first. It does not add schemas, APIs, storage, canonical
events, suppression reasons, thresholds, runtime services, dashboards, customer
connectors, ROI calculations, causality claims, or frontend surfaces.

## 2. Product Thesis

Organizations do not need another AI usage dashboard. Usage volume alone does
not explain whether AI is changing work or creating value.

The product thesis is:

```text
AI Value Intelligence converts aggregate AI activity into governed value
evidence, so leaders can see which business-value claims are defensible, which
need caveats, which need more data, and which must remain blocked.
```

The product should position FluencyTracr as the evidence spine between:

- AI activity and workflow telemetry;
- stated human readiness evidence;
- workflow and process libraries;
- customer-owned systems of record;
- value hypotheses and outcome metrics;
- reportability and claim governance.

## 3. Target Users

Primary users:

- AI Outcomes Managers;
- value-realization PMs;
- CIO staff and AI program owners;
- business sponsors accountable for AI adoption and business impact.

Secondary users:

- enablement leaders;
- transformation leads;
- operations analysts;
- customer success and renewal teams.

The system must not be used for employee productivity management, manager
comparison, rank-ordering groups, or surveillance.

## 4. Core Questions

The MVP should answer five executive questions:

| Question | MVP answer |
| --- | --- |
| Where is AI being used? | Aggregate AI work patterns by approved workflow, surface, window, and safe segment. |
| What work is changing? | Evidence of repeated use, delegation, reuse, verification, recovery, quality, or friction. |
| What value may be emerging? | Candidate value routes such as cost, capacity, quality, risk, revenue, or experience. |
| What evidence is missing? | Source coverage, baseline, outcome, trust, workflow, or assumption gaps. |
| What can we safely claim? | Reportable, caveated, unsupported, internal-only, suppressed, or blocked value language. |

## 5. First Pilot Slice

The first pilot slice should be one workflow family, not the whole diagram.

Recommended first pilot:

```text
Customer Support AI Value Evidence Pack
```

Why this slice:

- Support work has clear workflow systems and outcome measures.
- Time, quality, escalation, and experience metrics are easier to define than
  broad enterprise ROI.
- Glean-style search, assistant, Skills, agents, and knowledge workflows can
  plausibly affect support behavior.
- Claims can stay bounded to cycle time, handling time, escalation, rework,
  knowledge reuse, and customer/employee experience.

The first pilot should not require broad HRIS ingestion. HRIS or directory data
may be used only for coarse, customer-approved aggregate role/function context
if needed.

## 6. MVP Inputs

The MVP consumes governed aggregate inputs only.

### Required inputs

- AI Work Evidence for one workflow family;
- workflow or surface coverage for the pilot window;
- source coverage and data-quality posture;
- one pre/post or baseline/current window definition;
- reportability and blocked-claim rules.

### Recommended pilot inputs

- Glean search, Assistant, Skill, agent, or workflow activity aggregates;
- support workflow aggregate data, such as ticket volume, handling time,
  resolution time, escalation rate, reopen rate, QA pass rate, or backlog;
- AI Fluency or adoption pulse at aggregate level;
- process or workflow catalog metadata;
- customer-owned assumptions for any capacity or cost scenario.

### Optional later inputs

- HRIS function or role-family segment, aggregate only;
- learning or enablement participation, aggregate only;
- finance or workforce planning assumptions, customer-owned only;
- customer experience metrics, such as CSAT or NPS;
- revenue or renewal context when the workflow is sales, CS, or retention.

Raw HR records, employee IDs, emails, names, manager chains, ticket text,
prompts, responses, transcripts, file content, and person-level usage rows must
not enter FluencyTracr.

## 7. MVP Outputs

The MVP produces one evidence pack for the pilot workflow family.

Required outputs:

- `workflow_value_hypothesis`: the bounded value story being tested;
- `ai_work_evidence_summary`: aggregate observed AI work patterns;
- `work_change_evidence`: what appears to be changing in the workflow;
- `value_routes`: candidate routes such as cost, capacity, quality, risk,
  revenue, or experience;
- `outcome_signal_recommendations`: customer-owned metrics that can test the
  hypothesis;
- `evidence_readiness`: present, missing, suppressed, not computed, or held;
- `claim_confidence`: reportable, reportable with caveats, internal only,
  unsupported, suppressed, or blocked;
- `required_caveats`: language that must travel with the readout;
- `blocked_claims`: claims the system refuses to make;
- `next_actions`: the smallest data, workflow, or enablement step to improve
  confidence.

The output should be executive-readable and machine-checkable. The first
version can be Markdown plus seeded JSON examples before implementation.

## 8. Value Routes

The MVP should use the value routes already defined in AI Manager Outcomes
Recommendations:

| Value route | What it tests | Support pilot examples |
| --- | --- | --- |
| `COST_REDUCTION` | Less time, rework, escalation, or manual effort. | Handling-time movement, escalation-rate movement, rework movement. |
| `CAPACITY_CREATION` | More work handled without proportional headcount growth. | Tickets resolved per period, backlog movement, cases handled. |
| `QUALITY_IMPROVEMENT` | Fewer defects, reopens, corrections, or QA failures. | Reopen rate, QA pass rate, correction rate. |
| `RISK_REDUCTION` | Safer, more verified, less ambiguous AI use. | Verification coverage, unresolved trust gaps, policy exceptions. |
| `EXPERIENCE_IMPROVEMENT` | Better customer or employee experience. | CSAT, NPS, employee friction pulse, help-request rate. |
| `REVENUE_EXPANSION` | Faster or better revenue workflows. | Out of scope for the support MVP unless tied to renewals or expansion. |

Routes are investigation lanes. They are not proof that value was realized.

## 9. Claim Confidence Ladder

The MVP should distinguish five claim states:

| State | Meaning |
| --- | --- |
| `SUPPORTED` | Aggregate evidence and outcome context support bounded language with caveats. |
| `CAVEATED` | Directional evidence exists, but assumptions or gaps must travel with the claim. |
| `INTERNAL_ONLY` | Useful for planning, not customer-facing or executive external reporting. |
| `MISSING` | The required outcome, source, baseline, or trust evidence is absent. |
| `BLOCKED` | The claim would violate governance, privacy, causality, or evidence boundaries. |

These are MVP claim-confidence states, not new suppression reasons. Existing
`SURFACE` / `SUPPRESS` verdict posture and the five suppression reasons remain
authoritative.

## 10. Safe And Blocked Claims

### Safe language

When gates clear, the MVP may say:

- "Aggregate evidence suggests this workflow is a candidate for value
  investigation."
- "Observed AI work patterns align with a capacity-creation hypothesis."
- "Support workflow data can test whether AI-assisted work is associated with
  resolution-time or escalation-rate movement."
- "This claim is reportable with caveats because outcome evidence is present
  but causality is not established."

### Blocked language

The MVP must not say:

- "Glean proved ROI."
- "Glean caused productivity lift."
- "This employee, team, function, or manager saved X hours."
- "This department is better at AI."
- "AI usage alone generated cost savings."
- "Suppressed evidence supports a value claim."

## 11. Build Path

### Phase 0: Contract and fixture

Define the docs-only concept, contract shape, and seeded support-workflow
example.

Deliverables:

- this concept document;
- a docs-only evidence pack contract;
- one seeded support-workflow example;
- blocked-claim examples;
- privacy and suppression review notes.

### Phase 1: Readiness and claim packet

Create a generated pilot packet from seeded aggregate inputs.

Deliverables:

- source readiness map for the pilot slice;
- AI work evidence summary;
- outcome signal recommendation;
- claim confidence decision;
- executive-readable evidence appendix.

### Phase 2: Local evaluator

Add a local evaluator that can ingest a bounded aggregate fixture and emit the
pilot packet.

Deliverables:

- fixture validation;
- fail-closed missing-data behavior;
- blocked-claim tests;
- no direct-identifier tests;
- documentation for how to interpret output.

### Phase 3: Customer-side pilot design

Define the real customer-side transformer boundary.

Deliverables:

- approved source list;
- aggregate fields allowed;
- customer-owned assumption ledger;
- baseline and post-period windowing;
- pilot acceptance criteria;
- handoff template for AIOM/value teams.

Phase 3 artifact:
[customer-support-pilot-design.md](../contracts/ai-value-intelligence/customer-support-pilot-design.md).

### Phase 4: Customer Support pilot dry run

Fill the AIOM handoff packet from the seeded evidence pack and Phase 3 pilot
design before any runtime implementation.

Deliverables:

- approved scope;
- source coverage;
- outcome signals;
- assumption ledger;
- safe and blocked language;
- readiness decision;
- next-step recommendation.

Phase 4 artifact:
[customer-support-pilot-dry-run.md](../contracts/ai-value-intelligence/customer-support-pilot-dry-run.md).

### Phase 5: Customer validation workshop kit

Turn the Phase 4 dry run into a customer-ready validation motion.

Deliverables:

- agenda;
- pre-read;
- approved aggregate data request;
- assumption-ledger worksheet;
- source-coverage checklist;
- decision gates;
- safe talk track;
- blocked language;
- post-workshop outcomes.

Phase 5 artifact:
[customer-support-validation-workshop-kit.md](../contracts/ai-value-intelligence/customer-support-validation-workshop-kit.md).

### Phase 6: Customer Support pilot validator

Convert the Phase 5 workshop response into a local machine-checkable readiness
decision before any runtime implementation.

Deliverables:

- seeded customer workshop response fixture;
- local validator script;
- tests for proceed, hold-for-assumptions, hold-for-source-coverage,
  hold-for-baseline, and stop-for-governance-review;
- npm commands for validation and verification.

Phase 6 artifacts:

- [customer-support-workshop-response.json](../contracts/ai-value-intelligence/examples/customer-support-workshop-response.json)
- [`scripts/validate_ai_value_support_pilot.mjs`](../../scripts/validate_ai_value_support_pilot.mjs)
- [`scripts/validate_ai_value_support_pilot.test.mjs`](../../scripts/validate_ai_value_support_pilot.test.mjs)

### Phase 7: AI Value Blueprint Engine

Convert Blueprint / Process Discovery into reusable local software that feeds
the pilot validator and evidence-pack path.

Deliverables:

- structured blueprint schema;
- seeded Customer Support blueprint fixture;
- local blueprint validator;
- tests for workflow fields, value route, source requirements, assumption
  ledger, blocked claims, and governance boundaries;
- adapter from blueprint to workshop response;
- adapter from blueprint to evidence-pack input.

Phase 7 artifacts:

- [blueprint.schema.json](../../schemas/ai-value-intelligence/blueprint.schema.json)
- [customer-support-blueprint.json](../contracts/ai-value-intelligence/examples/customer-support-blueprint.json)
- [`scripts/validate_ai_value_blueprint.mjs`](../../scripts/validate_ai_value_blueprint.mjs)
- [`scripts/validate_ai_value_blueprint.test.mjs`](../../scripts/validate_ai_value_blueprint.test.mjs)

### Phase 8: Metrics Library Engine

Convert Metrics Library guidance into reusable local software that feeds
Metrics Mapping from a Blueprint.

Deliverables:

- structured metric definition schema;
- seeded Customer Support metrics fixture;
- local metrics validator;
- tests for metric name, definition, value route, source system, measurement
  unit, baseline/comparison rules, owner, allowed claim level, and blocked
  claims;
- adapter from Blueprint workflow family and value routes to recommended
  metrics.

Phase 8 artifacts:

- [metric-definition.schema.json](../../schemas/ai-value-intelligence/metric-definition.schema.json)
- [customer-support-metrics-library.json](../contracts/ai-value-intelligence/examples/customer-support-metrics-library.json)
- [`scripts/validate_ai_value_metrics.mjs`](../../scripts/validate_ai_value_metrics.mjs)
- [`scripts/validate_ai_value_metrics.test.mjs`](../../scripts/validate_ai_value_metrics.test.mjs)

### Phase 9: Value Scenario Engine

Convert the value calculator concept into reusable governed software that can
draft pre-ROI value scenarios from a validated Blueprint and Metrics Library
recommendation.

Deliverables:

- structured value scenario input schema;
- structured value scenario output schema;
- seeded Customer Support value scenario fixture;
- local scenario validator;
- tests for workflow family, value route, metric references, customer-owned
  assumptions, scenario bands, output units, claim state, blocked claims, and
  governance boundaries;
- adapter from Blueprint plus Metrics Library recommendation to a governed
  Value Scenario draft.

Phase 9 remains local and pre-readout. It does not create production
connectors, dashboards, realized ROI calculations, causality claims,
individual scoring, HR analytics, runtime services, or customer-facing
economic output.

Phase 9 artifacts:

- [value-scenario-input.schema.json](../../schemas/ai-value-intelligence/value-scenario-input.schema.json)
- [value-scenario-output.schema.json](../../schemas/ai-value-intelligence/value-scenario-output.schema.json)
- [customer-support-value-scenario.json](../contracts/ai-value-intelligence/examples/customer-support-value-scenario.json)
- [`scripts/validate_ai_value_scenario.mjs`](../../scripts/validate_ai_value_scenario.mjs)
- [`scripts/validate_ai_value_scenario.test.mjs`](../../scripts/validate_ai_value_scenario.test.mjs)

### Phase 9.5: Agentic Platform Harness

Define the development-infrastructure harness that lets specialist agents work
on AI Value objects through structured handoffs, validators, and local ledger
references.

Deliverables:

- provider-neutral AI Value agent handoff schema;
- seeded Customer Support scenario-to-readiness handoff fixture;
- local handoff validator;
- tests for agent role definitions, object handoff payloads, model-selection
  policy, tool-permission boundaries, verification routing, ledger references,
  blocked data capture, and governance boundaries;
- concept doc that maps future OpenAI Agents SDK, Codex, Cursor, Claude, Glean,
  Waldo, or MCP adapters back to one local handoff shape.

Phase 9.5 is development infrastructure only. It does not create customer
telemetry, production agent runtime, autonomous customer actions, raw prompt or
response storage, direct identifier capture, ROI calculation, causality claims,
individual scoring, HR analytics, or customer-facing economic output.

Phase 9.5 artifacts:

- [AI_VALUE_AGENTIC_PLATFORM_HARNESS.md](./AI_VALUE_AGENTIC_PLATFORM_HARNESS.md)
- [agent-handoff.schema.json](../../schemas/ai-value-intelligence/agent-handoff.schema.json)
- [customer-support-agent-handoff.json](../contracts/ai-value-intelligence/examples/customer-support-agent-handoff.json)
- [`scripts/validate_ai_value_agent_harness.mjs`](../../scripts/validate_ai_value_agent_harness.mjs)
- [`scripts/validate_ai_value_agent_harness.test.mjs`](../../scripts/validate_ai_value_agent_harness.test.mjs)

### Phase 10: Evidence Readiness Engine

Convert Evidence Readiness into reusable local software that decides whether a
validated workflow can move toward claim review.

Phase 10 artifacts:

- [evidence-readiness.schema.json](../../schemas/ai-value-intelligence/evidence-readiness.schema.json)
- [customer-support-evidence-readiness.json](../contracts/ai-value-intelligence/examples/customer-support-evidence-readiness.json)
- [`scripts/validate_ai_value_readiness.mjs`](../../scripts/validate_ai_value_readiness.mjs)
- [`scripts/validate_ai_value_readiness.test.mjs`](../../scripts/validate_ai_value_readiness.test.mjs)

### Phase 11: Claim Boundary Engine

Convert readiness decisions into safe, caveated, blocked, and required-caveat
language before any executive packet is generated.

Phase 11 artifacts:

- [claim-boundary.schema.json](../../schemas/ai-value-intelligence/claim-boundary.schema.json)
- [customer-support-claim-boundary.json](../contracts/ai-value-intelligence/examples/customer-support-claim-boundary.json)
- [`scripts/validate_ai_value_claim_boundary.mjs`](../../scripts/validate_ai_value_claim_boundary.mjs)
- [`scripts/validate_ai_value_claim_boundary.test.mjs`](../../scripts/validate_ai_value_claim_boundary.test.mjs)

### Phase 12: Executive Validation Packet Generator

Generate a local JSON and Markdown packet from the validated V1 spine.

Phase 12 artifacts:

- [executive-packet.schema.json](../../schemas/ai-value-intelligence/executive-packet.schema.json)
- [customer-support-executive-packet.json](../contracts/ai-value-intelligence/examples/customer-support-executive-packet.json)
- [customer-support-executive-packet.md](../contracts/ai-value-intelligence/examples/customer-support-executive-packet.md)
- [`scripts/generate_ai_value_executive_packet.mjs`](../../scripts/generate_ai_value_executive_packet.mjs)
- [`scripts/generate_ai_value_executive_packet.test.mjs`](../../scripts/generate_ai_value_executive_packet.test.mjs)
- [`scripts/ai_value_v1_spine.test.mjs`](../../scripts/ai_value_v1_spine.test.mjs)

### Phase 13: Local Workspace UI

Add a local React workspace that exposes the V1 spine as a usable work surface.

Phase 13 artifacts:

- [`frontend/src/pages/AIValueWorkspace.tsx`](../../frontend/src/pages/AIValueWorkspace.tsx)
- [`frontend/src/pages/AIValueWorkspace.test.tsx`](../../frontend/src/pages/AIValueWorkspace.test.tsx)
- [`frontend/src/constants/aiValueWorkspace.ts`](../../frontend/src/constants/aiValueWorkspace.ts)

Phase 10-13 remains local V1 software. It does not add production connectors,
customer-facing economic output, causality claims, individual scoring, HR
analytics, or realized ROI.

## 12. Quality Gates

No pilot readout should be generated unless these questions pass:

| Gate | Required question |
| --- | --- |
| Workflow fit | Is the workflow family narrow enough to interpret? |
| Source coverage | Are AI activity, workflow, and outcome sources present or clearly marked missing? |
| Baseline discipline | Is there a baseline, pre/post, or current-vs-reference window? |
| Outcome fit | Does the outcome metric test the value hypothesis? |
| Aggregate safety | Can the readout be produced without person-level rows or identifiable groups? |
| Confounder awareness | Are obvious alternate explanations named? |
| Claim governance | Are unsupported, causal, ROI, productivity, and ranking claims blocked? |
| Suppression propagation | Does suppression block downstream value language? |

If any gate fails, the output should become `MISSING`, `INTERNAL_ONLY`, or
`BLOCKED`, depending on the failure.

## 13. Relationship To Existing Concepts

AI Value Intelligence MVP composes existing FluencyTracr concepts:

- **AI Work Evidence:** source-neutral aggregate work pattern layer.
- **Velocity:** adoption energy.
- **Depth:** durable work integration.
- **Quality Multiplier:** evidence-quality adjustment for time-saved claims.
- **Reliability Factor:** operational dependability.
- **Outcome Evidence:** customer-attested KPI context.
- **Economic Impact Bridge:** maps evidence to value investigation, not ROI.
- **AI Manager Outcomes Recommendations:** recommends customer-owned outcome
  signals and testing formulas.
- **Reportability Contract:** determines what language is allowed, caveated,
  unsupported, suppressed, or blocked.
- **Skills Measurement:** treats Skills as aggregate evidence readiness, not
  skill scoring or Skills ROI.

The MVP should not bypass any of these boundaries.

## 14. What To Validate First

The first validation question is:

```text
Can FluencyTracr produce a support-workflow evidence pack that clearly says
what changed, what value route may be emerging, what data supports it, what is
missing, and what claims remain unsafe?
```

Success means the output helps an executive make a better next decision
without pretending to prove ROI.

## 15. Open Decisions

- Which support workflow should be the first seeded pilot: case resolution,
  escalation reduction, knowledge reuse, QA review, or backlog reduction?
- Should the first packet use a `SUPPORTED` state, or only `CAVEATED`,
  `MISSING`, and `BLOCKED` until real outcome evidence exists?
- What minimum baseline window is acceptable for the pilot fixture?
- Should the first implementation emit Markdown only, JSON only, or both?
- Which value route should be primary for pilot storytelling: capacity,
  quality, cost, or experience?

## 16. Attribution

See [ATTRIBUTION.md](../../ATTRIBUTION.md) for intellectual provenance. This
MVP is credited to James Kelley and synthesizes the Whole System ROI diagram,
FluencyTracr's V4 value-confidence direction, and the principle that evidence
discipline is the missing layer between AI activity and defensible business
value.
