# Claude Prompt: AI Value Platform North Star Continuation

Use this prompt to continue the FluencyTracr AI Value Platform work from the
current North Star reset.

## Prompt To Give Claude

You are working in the FluencyTracr repository.

Your job is to move the AI Value Platform forward from the current North Star
reset without drifting into UI polish, broad dashboards, unsupported ROI
claims, or academic measurement sprawl.

Start by reading these files in order:

1. `AGENTS.md`
2. `docs/agent/SESSION_START.md`
3. `.project/WORK_QUEUE.json`
4. `.project/PROGRESS.md`
5. `docs/concepts/AI_VALUE_MEASUREMENT_MODEL.md`
6. `docs/agent/AI_VALUE_PLATFORM_NEXT_AGENT_HANDOFF.md`
7. `docs/contracts/ai-value-intelligence/README.md`
8. `schemas/ai-value-intelligence/data-boundary-roi-evidence.schema.json`
9. `docs/contracts/ai-value-intelligence/examples/customer-support-data-boundary-roi-evidence.json`

Do not work from chat memory alone. Treat the repo as the source of truth.

## Product North Star

The AI Value Platform should help an organization answer:

```text
Are we building AI capability, is AI becoming real work, what outcome should
move, what proof do we have, and what should we change next?
```

This is the product spine:

```text
AI Fluency Baseline
-> VBD Operating Map
-> Function Outcome Metric
-> Value Evidence Case
-> Intervention / Retest
```

Blueprint, Metrics, Evidence Readiness, Scenario, Claim Boundary, Executive
Packet, Sponsor Decisions, and the local Workspace UI are supporting objects
inside this spine. They are not separate product destinations.

The product should feel like a business-facing diagnostic and action system,
not a generic usage dashboard, static deck generator, database viewer, or
academic research instrument.

## First-Principles Product Logic

Start with the end in mind.

A strong client outcome is not "people used AI more." A strong client outcome
is:

- the organization has a measurable AI capability baseline;
- AI adoption is spreading into real work;
- each function has a small set of outcome metrics that matter;
- aggregate AI work evidence and customer-owned outcome evidence can be
  compared against a baseline/comparison window;
- evidence quality determines what can be safely said;
- the platform recommends what to change next when value is not moving; and
- retesting shows whether the intervention improved VBD and the selected
  business outcome.

The platform should help leaders decide:

- where to scale AI;
- where to coach or redesign workflows;
- where evidence is too weak;
- where the value story is safe to tell;
- where stronger claims must remain blocked; and
- what data or intervention is needed next.

## Canonical VBD Definitions

Use these definitions exactly:

| Dimension | Definition | Product meaning |
| --- | --- | --- |
| Velocity | Speed to adoption. | How quickly a function or workflow moves from AI availability to active, repeated use. |
| Breadth | Spread across the organization, functions, roles, and workflows. | How widely AI capability is showing up across the client operating system. |
| Depth | Aggregate AI tool or surface repertoire. | How many AI tools or surfaces people use, exposed only as aggregate distributions. |

Do not use the older definition of Velocity as frequency of AI showing up in
the workflow. Do not use the older definition of Depth as "meaningfully changes
work" unless it is a qualitative interpretation layered on top of the aggregate
tool/surface repertoire.

VBD is an operating map. It is not value proof.

## Metric Pyramid

Keep the metric system small and decision-useful.

The metric pyramid is:

```text
Top:
Validated AI Value Movement

Supporting:
AI Work Integration / VBD
AI Capability Growth
```

Validated AI Value Movement means the share of prioritized workflow slices
where AI capability, VBD movement, customer-owned outcome movement, and
evidence quality support governed value language.

Do not create a sprawling catalog of 100 metrics. Use a small number of
captureable, function-specific outcome metrics with:

- source system;
- owner;
- measurement unit;
- baseline rule;
- comparison rule;
- evidence level;
- allowed claim level; and
- blocked claims.

## Data Boundary Position

We do want to understand what organizational data is useful for value and ROI
analysis.

But FluencyTracr must not ingest, store, expose, or score raw sensitive data.

The correct boundary is:

```text
Customer / Glean source systems
-> customer-approved or Glean-approved transformation boundary
-> aggregate, attested evidence package
-> FluencyTracr AI Value objects
```

Sensitive organizational data can be useful upstream, including:

- Glean and AI workflow telemetry;
- AI Fluency Instrument aggregate results;
- workflow/process systems;
- support, sales, product, engineering, customer success, and operations
  systems;
- finance-owned assumption bands;
- HRIS or org-context fields used only as approved aggregate context;
- enablement and intervention activity;
- revenue and customer-experience systems;
- quality, risk, and compliance systems.

Only aggregate, attested evidence may cross into FluencyTracr.

FluencyTracr must reject or block:

- raw rows;
- direct identifiers;
- employee IDs;
- user IDs;
- names;
- emails;
- manager chains;
- raw prompts;
- raw responses;
- transcripts;
- ticket text;
- file content;
- row-level HR data;
- individual scoring;
- manager/team/department ranking;
- productivity ranking;
- unsupported ROI proof;
- causality claims; and
- customer-facing dollarized economic output unless a future governed contract
  explicitly authorizes that exact scope.

Important nuance: do not write docs that imply HRIS, finance, revenue, or
workflow data is never useful. The correct statement is that such data can be
useful upstream, but it must be aggregated, attested, stripped of identifiers,
and governed before it crosses into FluencyTracr.

HRIS or org-context data may support internal segmentation, context, and
source-readiness planning. It must not become supported value proof inside
FluencyTracr.

## Current Repo State To Preserve

The repo already has:

- `docs/concepts/AI_VALUE_MEASUREMENT_MODEL.md`
- `docs/contracts/ai-value-intelligence/examples/customer-support-data-boundary-roi-evidence.json`
- `schemas/ai-value-intelligence/data-boundary-roi-evidence.schema.json`
- `shared/src/aiValueEngine/dataBoundary.ts`
- `scripts/validate_ai_value_data_boundary.mjs`
- `scripts/validate_ai_value_data_boundary.test.mjs`
- `docs/contracts/ai-value-intelligence/examples/customer-support-value-improvement-loop.json`
- `schemas/ai-value-intelligence/value-improvement-loop.schema.json`
- `shared/src/aiValueEngine/valueImprovement.ts`
- `scripts/validate_ai_value_improvement_loop.mjs`
- `scripts/validate_ai_value_improvement_loop.test.mjs`

The local product and docs now point to this narrower spine:

```text
AI Fluency Baseline
-> VBD Operating Map
-> Function Outcome Metric
-> Value Evidence Case
-> Intervention / Retest
```

Do not re-expand the product into the older broad diagram unless the work is
explicitly mapped back to this spine.

## Recommended Next Build Slice

Build the `Value Evidence Case Contract`.

This is the next layer after the Data Boundary and ROI Evidence Contract.

The Value Evidence Case should assemble:

- selected client/workflow context;
- AI Fluency baseline or follow-up summary;
- VBD state and movement;
- selected function outcome metric;
- data-boundary status;
- accepted, submitted, missing, rejected, or caveated outcome evidence;
- source coverage;
- baseline and comparison windows;
- customer-owned assumptions;
- evidence level;
- safe value language;
- blocked claims;
- scenario posture;
- sponsor decision;
- next intervention or retest action.

It should answer:

```text
For this workflow slice, what can we safely say about AI value, what evidence
supports it, what remains blocked, and what should the client do next?
```

## Expected Deliverables For The Next Slice

Use TDD. Write the failing tests first.

Add:

1. A schema:
   - `schemas/ai-value-intelligence/value-evidence-case.schema.json`

2. A seeded Customer Support fixture:
   - `docs/contracts/ai-value-intelligence/examples/customer-support-value-evidence-case.json`

3. A shared validator and optional builder:
   - `shared/src/aiValueEngine/valueEvidenceCase.ts`

4. An export from:
   - `shared/src/aiValueEngine/index.ts`

5. A CLI wrapper:
   - `scripts/validate_ai_value_evidence_case.mjs`

6. Tests:
   - `scripts/validate_ai_value_evidence_case.test.mjs`
   - Add narrow export coverage in `scripts/ai_value_engine.test.mjs`

7. Package scripts:
   - `validate:ai-value-evidence-case`
   - `test:ai-value-evidence-case`

8. Docs updates:
   - `docs/contracts/ai-value-intelligence/README.md`
   - `docs/concepts/AI_VALUE_MEASUREMENT_MODEL.md`
   - `docs/agent/AI_VALUE_PLATFORM_NEXT_AGENT_HANDOFF.md`
   - `README.md` if adding canonical docs links

Do not start with frontend UI. The contract comes first.

## Required Value Evidence Case Fields

The object should include, at minimum:

```text
schema_version
value_evidence_case_id
source_refs
client_context
workflow
ai_fluency_summary
vbd_summary
outcome_metric
data_boundary_status
outcome_evidence_status
baseline_comparison
customer_owned_assumptions
evidence_quality
safe_value_language
blocked_claims
scenario_posture
sponsor_decision
intervention_retest
economic_output_policy
governance_boundaries
```

Use existing objects where possible:

- Blueprint
- Metrics Library
- ROI Scenario
- Evidence Readiness
- Outcome Evidence Export
- Claim Boundary
- Executive Packet
- Value Improvement Loop
- Data Boundary and ROI Evidence Contract

Prefer composition over inventing a second parallel model.

## Evidence Levels

Use the evidence ladder from `AI_VALUE_MEASUREMENT_MODEL.md`:

| Evidence level | Meaning |
| --- | --- |
| Missing | Required workflow, metric, baseline, comparison, or outcome evidence is absent. |
| Directional | AI work evidence and early outcome or survey signals move in the expected direction, but rigor is weak. |
| Caveated | Same workflow slice and baseline/comparison windows exist, but assumptions or confounds remain. |
| Supported | Customer-owned aggregate outcome evidence, denominator integrity, baseline integrity, and claim review support bounded movement. |
| Strong | Repeated supported evidence or stronger causal design exists. |
| Blocked | Governance, privacy, evidence, or claim-boundary gates fail. |

Supported does not mean ROI proof. It means bounded value movement for the
workflow slice is supportable under caveats.

Strong should be allowed only as a contract state for future evidence design,
not as a default fixture output.

## Allowed Output Language

Safe language examples:

- "Aggregate evidence suggests this workflow is ready for value investigation."
- "The selected outcome metric can be tested against the approved baseline and
  comparison window."
- "Customer-owned outcome evidence supports a caveated value movement readout
  for this workflow slice."
- "This does not prove ROI or causality."
- "The next step is to improve the workflow or evidence gap and retest."

Blocked language examples:

- "Glean proved ROI."
- "Glean caused productivity lift."
- "AI usage generated savings by itself."
- "This employee/team/manager/department performs better with AI."
- "The organization saved $X."
- "Attrition improved because of Glean."
- "Usage alone proves value."

## Technical Guardrails

Preserve all FluencyTracr invariants in `AGENTS.md`.

Do not add:

- new canonical events;
- new suppression reasons;
- tunable thresholds;
- admin suppression overrides;
- production connectors;
- runtime services;
- customer-facing dollarized economic output;
- causality engine;
- statistical significance scoring;
- individual scoring;
- HR analytics surfaces;
- productivity ranking;
- manager/team/department ranking;
- raw prompt/response storage;
- raw ticket, email, transcript, or file-content ingestion;
- direct identifiers;
- autonomous customer actions.

If a requested implementation would violate those boundaries, stop and write a
clear concern, why it matters, better move, and decision point.

## UI Guidance

Do not lead with UI.

If UI work is later requested, the UI should use client-facing language:

- AI Fluency
- VBD Map
- Outcome Metric
- Value Evidence Case
- Intervention / Retest

Avoid internal labels like:

- workflow_state
- claim_boundary
- materializer
- real aggregate evidence status
- object id
- source refs
- validator state

The client should always understand:

- what happened before this page;
- what choice they are making now;
- what data informed the choice;
- what cannot be claimed yet; and
- where they go next.

## Verification Commands

At minimum, after the next slice:

```bash
npm run build --workspace shared
npm run test:ai-value-data-boundary
npm run test:ai-value-engine
./scripts/ci_docs_contract_sweep.sh
git diff --check
```

If you add the Value Evidence Case scripts, also run:

```bash
npm run validate:ai-value-evidence-case
npm run test:ai-value-evidence-case
```

If frontend files are touched, also run:

```bash
npm test --workspace frontend -- AIValueWorkspace.test.tsx
npm run build --workspace frontend
```

Report exactly what passed and what was not run.

## Success Criteria

The next slice is successful when:

- the Value Evidence Case is a reusable software object, not prose only;
- it composes existing contracts instead of duplicating them;
- it includes the Data Boundary status before value language is allowed;
- it carries corrected VBD definitions;
- it handles useful organizational data without allowing raw data into
  FluencyTracr;
- it distinguishes missing, directional, caveated, supported, strong, and
  blocked evidence;
- it keeps ROI and causality claims blocked unless explicitly authorized by a
  later governed contract;
- tests prove the safe path and unsafe path; and
- docs explain what this enables next.

## Recommended First Test Names

Start with tests like:

```text
seeded Customer Support value evidence case fixture is valid
builds a value evidence case from data boundary, ROI scenario, readiness, outcome evidence, and improvement loop
rejects customer-facing economic output and realized ROI fields
rejects raw data, direct identifiers, HR analytics, and productivity ranking
holds value language when outcome evidence is missing or rejected
keeps supported evidence caveated and non-causal
```

## Final Reminder

The product is not the full diagram yet. The product is the narrow spine.

Build the evidence object that makes the spine real:

```text
AI capability
-> real AI work
-> function outcome metric
-> governed proof
-> next action
```

If you are tempted to make the UI prettier before the contract is real, stop.
Build the pig before the lipstick.
