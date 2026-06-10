# AI Value Intelligence Evidence Pack

Schema version: `FT_AI_VALUE_SUPPORT_PACK_2026_06`

## Purpose

The AI Value Intelligence Evidence Pack is the first MVP contract for turning
aggregate AI work evidence into a bounded value-readiness packet.

The first slice is:

`Customer Support AI Value Evidence Pack`

It answers:

- where AI is being used in the support workflow slice;
- what support workflow behavior may be changing;
- which value routes may be emerging;
- which outcome signals can test the hypothesis;
- which value or ROI claims are safe, caveated, missing, suppressed, or
  blocked.

## Contract Status

Status: MVP contract and seeded example.

This contract may be used for seeded pilot packets, internal review, and
AIOM/value-team handoff. It does not authorize customer production ingest,
customer-facing ROI claims, schemas, APIs, storage, dashboards, direct HRIS
ingest, raw ticket ingestion, causality claims, or productivity measurement.

For the customer-side Phase 3 pilot design, use
[customer-support-pilot-design.md](./customer-support-pilot-design.md).

For the filled Phase 4 AIOM dry run, use
[customer-support-pilot-dry-run.md](./customer-support-pilot-dry-run.md).

For the Phase 5 customer validation workshop kit, use
[customer-support-validation-workshop-kit.md](./customer-support-validation-workshop-kit.md).

For the Phase 6 local pilot validator, use
[`scripts/validate_ai_value_support_pilot.mjs`](../../../scripts/validate_ai_value_support_pilot.mjs)
with the seeded workshop response fixture in
[`examples/customer-support-workshop-response.json`](./examples/customer-support-workshop-response.json).

For the Phase 7 Blueprint Engine, use
[`scripts/validate_ai_value_blueprint.mjs`](../../../scripts/validate_ai_value_blueprint.mjs)
with the seeded blueprint fixture in
[`examples/customer-support-blueprint.json`](./examples/customer-support-blueprint.json)
and schema in
[`schemas/ai-value-intelligence/blueprint.schema.json`](../../../schemas/ai-value-intelligence/blueprint.schema.json).

For the Phase 8 Metrics Library Engine, use
[`scripts/validate_ai_value_metrics.mjs`](../../../scripts/validate_ai_value_metrics.mjs)
with the seeded Customer Support metrics fixture in
[`examples/customer-support-metrics-library.json`](./examples/customer-support-metrics-library.json)
and schema in
[`schemas/ai-value-intelligence/metric-definition.schema.json`](../../../schemas/ai-value-intelligence/metric-definition.schema.json).

For the Phase 9 Value Scenario Engine, use
[`scripts/validate_ai_value_scenario.mjs`](../../../scripts/validate_ai_value_scenario.mjs)
with the seeded Customer Support scenario fixture in
[`examples/customer-support-value-scenario.json`](./examples/customer-support-value-scenario.json)
and schemas in
[`schemas/ai-value-intelligence/value-scenario-input.schema.json`](../../../schemas/ai-value-intelligence/value-scenario-input.schema.json)
and
[`schemas/ai-value-intelligence/value-scenario-output.schema.json`](../../../schemas/ai-value-intelligence/value-scenario-output.schema.json).

For the Phase 9.5 Agentic Platform Harness, use
[`scripts/validate_ai_value_agent_harness.mjs`](../../../scripts/validate_ai_value_agent_harness.mjs)
with the seeded Customer Support handoff fixture in
[`examples/customer-support-agent-handoff.json`](./examples/customer-support-agent-handoff.json)
or the seeded Executive Operating Packet handoff bundle in
[`examples/customer-support-agent-handoff-bundle.json`](./examples/customer-support-agent-handoff-bundle.json)
and schemas in
[`schemas/ai-value-intelligence/agent-handoff.schema.json`](../../../schemas/ai-value-intelligence/agent-handoff.schema.json)
and
[`schemas/ai-value-intelligence/agent-handoff-bundle.schema.json`](../../../schemas/ai-value-intelligence/agent-handoff-bundle.schema.json).

For Phase 10 Evidence Readiness, Phase 11 Claim Boundary, Phase 12 Executive
Packet, and Phase 13 Local Workspace UI, use the local validators and V1 spine
test:

- [`scripts/validate_ai_value_readiness.mjs`](../../../scripts/validate_ai_value_readiness.mjs)
- [`scripts/validate_ai_value_claim_boundary.mjs`](../../../scripts/validate_ai_value_claim_boundary.mjs)
- [`scripts/generate_ai_value_executive_packet.mjs`](../../../scripts/generate_ai_value_executive_packet.mjs)
- [`scripts/ai_value_v1_spine.test.mjs`](../../../scripts/ai_value_v1_spine.test.mjs)
- [`frontend/src/pages/AIValueWorkspace.tsx`](../../../frontend/src/pages/AIValueWorkspace.tsx)

## Required Inputs

The generator consumes only aggregate, privacy-safe inputs:

- `org_id`
- `window_id`
- `workflow_family`
- `workflow_value_hypothesis`
- `ai_work_evidence`
- `outcome_evidence`, when present
- `source_coverage`
- customer-owned `assumptions`, when present

Suppressed AI work evidence blocks downstream value language. Missing outcome
evidence emits `MISSING` claim confidence and no safe value claims.

## Required Output Fields

The generated packet includes:

- `schema_version`
- `org_id`
- `window_id`
- `workflow_family`
- `generated_at`
- `verdict`
- `suppression_reason`
- `workflow_value_hypothesis`
- `value_routes`
- `evidence_readiness`
- `ai_work_evidence_summary`
- `work_change_evidence`
- `outcome_signal_recommendations`
- `claim_confidence`
- `safe_claims`
- `blocked_claims`
- `required_caveats`
- `next_actions`
- `executive_summary`

## Claim Confidence States

| State | Meaning |
| --- | --- |
| `CAVEATED` | Aggregate AI work evidence and outcome signals align directionally, but ROI and causality are not proven. |
| `SUPPORTED` | The bounded value-investigation claim is supported by aggregate evidence, while economic proof remains blocked. |
| `MISSING` | Required outcome evidence is absent; no safe value claims are emitted. |
| `SUPPRESSED` | Existing suppression blocks downstream value language. |
| `BLOCKED` | Unsafe, identifying, or governance-breaking input prevents packet generation. |

`SUPPORTED` must only describe bounded investigation readiness. It must not be
used for ROI proof, causality, productivity lift, rankings, or realized savings.

## Value Routes

Allowed MVP routes:

- `COST_REDUCTION`
- `CAPACITY_CREATION`
- `QUALITY_IMPROVEMENT`
- `RISK_REDUCTION`
- `EXPERIENCE_IMPROVEMENT`
- `REVENUE_EXPANSION`
- `UNCLASSIFIED`

Routes are investigation lanes, not proof that value was realized.

## Forbidden Inputs

The MVP rejects fields that indicate raw or person-level data, including:

- emails
- employee IDs
- user identifiers
- manager chains
- raw prompts
- raw responses
- transcripts
- ticket text
- file content
- person-level usage rows

## Always Blocked Claims

- Glean proved ROI.
- Glean caused productivity lift.
- A person, creator, manager, team, function, or department saved a specific
  number of hours.
- One team or manager group performs better with AI.
- AI usage alone generated cost savings.
- Suppressed evidence supports a value claim.

## Generate The Seeded Example

```bash
npm run ai-value:mvp
```

Default input:

`docs/contracts/ai-value-intelligence/examples/customer-support-seeded-input.json`

Default outputs:

- `docs/contracts/ai-value-intelligence/examples/customer-support-value-evidence-pack.json`
- `docs/contracts/ai-value-intelligence/examples/customer-support-value-evidence-pack.md`

## Verify The MVP

```bash
npm run test:ai-value
```

The verifier covers:

- caveated packet generation from aggregate inputs;
- missing outcome evidence fail-closed behavior;
- suppressed evidence propagation;
- rejection of direct identifiers and raw text fields;
- prevention of unsafe claims in safe/customer-facing language.

## Phase 3 Pilot Design

The Phase 3 pilot packet defines the real customer-side design questions before
any runtime work begins:

- approved customer-side aggregate inputs;
- source-system requirements;
- baseline and comparison window rules;
- customer-owned assumption ledger;
- source-coverage checklist;
- fail-closed evidence states;
- AIOM handoff template;
- pilot acceptance criteria.

See
[customer-support-pilot-design.md](./customer-support-pilot-design.md).

## Phase 4 Dry Run

The Phase 4 dry run fills the AIOM handoff template with the seeded support
evidence pack. It is intended to test usability before any runtime work:

- approved scope;
- source coverage;
- outcome signals;
- assumption ledger;
- safe and blocked language;
- readiness decision;
- next-step recommendation.

See
[customer-support-pilot-dry-run.md](./customer-support-pilot-dry-run.md).

## Phase 5 Validation Workshop Kit

The Phase 5 workshop kit turns the dry run into a customer validation motion:

- customer pre-read;
- workshop agenda;
- approved aggregate data request;
- assumption-ledger worksheet;
- source-coverage checklist;
- decision gates;
- safe talk track;
- blocked language;
- post-workshop outcomes.

See
[customer-support-validation-workshop-kit.md](./customer-support-validation-workshop-kit.md).

## Phase 6 Pilot Validator

The Phase 6 validator converts the Phase 5 workshop response into a
machine-checkable readiness decision. It stays local and docs-backed:

- reads the seeded customer workshop response fixture;
- checks approved aggregate inputs;
- checks source coverage;
- checks baseline and comparison windows;
- checks assumption-ledger completeness;
- rejects blocked input fields;
- applies governance stop conditions;
- emits one pilot readiness decision.

Run:

```bash
npm run validate:ai-value-pilot
```

Verify:

```bash
npm run test:ai-value-pilot
```

Possible decisions:

- `PROCEED_TO_GOVERNED_PACKET`
- `HOLD_FOR_ASSUMPTIONS`
- `HOLD_FOR_SOURCE_COVERAGE`
- `HOLD_FOR_BASELINE`
- `STOP_FOR_GOVERNANCE_REVIEW`

## Phase 7 Blueprint Engine

The Phase 7 Blueprint Engine converts Blueprint / Process Discovery into a
reusable software object that can feed the existing pilot validator and
evidence-pack path:

- structured blueprint schema;
- seeded Customer Support blueprint fixture;
- local blueprint validator;
- adapter to the workshop response validator;
- adapter to the Customer Support evidence-pack input;
- tests for workflow fields, value routes, source requirements, assumptions,
  blocked claims, and governance boundaries.

Run:

```bash
npm run validate:ai-value-blueprint
```

Verify:

```bash
npm run test:ai-value-blueprint
```

## Phase 8 Metrics Library Engine

The Phase 8 Metrics Library Engine converts Metrics Library guidance into
reusable local software that can feed Metrics Mapping from a Blueprint:

- structured metric definition schema;
- seeded Customer Support metrics fixture;
- local metrics validator;
- adapter from Blueprint workflow family and value routes to recommended
  metrics;
- tests for metric name, definition, value route, source system, measurement
  unit, baseline/comparison rules, owner, allowed claim level, blocked claims,
  and no-match hold behavior.

Run:

```bash
npm run validate:ai-value-metrics
```

Verify:

```bash
npm run test:ai-value-metrics
```

## Phase 9 Value Scenario Engine

The Phase 9 Value Scenario Engine converts value calculator guidance into a
governed local software object that can draft a pre-ROI scenario from a
validated Blueprint and Metrics Library recommendation:

- structured value scenario input schema;
- structured value scenario output schema;
- seeded Customer Support value scenario fixture;
- local scenario validator;
- adapter from Blueprint plus Metrics Library recommendation to a governed
  Value Scenario draft;
- tests for workflow family, value route, metric references, customer-owned
  assumptions, scenario bands, output units, claim state, blocked claims,
  governance boundaries, and unsafe economic fields.

Run:

```bash
npm run validate:ai-value-scenario
```

Verify:

```bash
npm run test:ai-value-scenario
```

Phase 9 is planning software only. It does not produce realized ROI,
causality, productivity, HR analytics, individual scoring, runtime services,
dashboards, production connectors, or customer-facing economic output.

## Phase 9.5 Agentic Platform Harness

The Phase 9.5 Agentic Platform Harness converts agent coordination into a
governed local handoff contract:

- specialist agent roles for Blueprint, Metrics, Scenario, Evidence Readiness,
  Claim Boundary, Executive Readout, Review, Evaluation, and Integration;
- structured object handoffs instead of raw agent messages;
- model-selection policy;
- tool-permission boundaries;
- verification routing;
- local agent-run ledger references;
- Executive Operating Packet handoff bundles for governed follow-up;
- blocked data capture protections.

Run:

```bash
npm run validate:ai-value-agent-harness
```

Verify:

```bash
npm run test:ai-value-agent-harness
```

Phase 9.5 is development infrastructure only. It does not create customer
telemetry, production agent runtime, autonomous customer action, raw prompt or
response storage, direct identifiers, ROI calculation, causality claims,
individual scoring, or customer-facing economic output.

## Phase 10-13 Local V1 Spine

The remaining V1 phases connect the object model into a local product path:

```text
Blueprint
-> Metrics
-> Value Scenario
-> Evidence Readiness
-> Claim Boundary
-> Executive Packet
-> Local Workspace UI
```

Run:

```bash
npm run validate:ai-value-readiness
npm run validate:ai-value-claim-boundary
npm run generate:ai-value-executive-packet
```

Verify:

```bash
npm run test:ai-value-readiness
npm run test:ai-value-claim-boundary
npm run test:ai-value-executive-packet
npm run test:ai-value-v1-spine
npm test --workspace frontend -- AIValueWorkspace.test.tsx
```

The local workspace route is:

```text
/ai-value-workspace
```

This V1 remains local and governed. It does not authorize production
connectors, customer-facing economic output, realized ROI calculation,
causality claims, HR analytics, individual scoring, or productivity
measurement.

## Relationship To FluencyTracr Concepts

This contract implements the first slice of
[AI_VALUE_INTELLIGENCE_MVP.md](../../concepts/AI_VALUE_INTELLIGENCE_MVP.md).
It composes AI Work Evidence, Outcome Evidence, Economic Impact Bridge,
AI Manager Outcomes Recommendations, Reportability, and Skills Measurement
without changing canonical events, suppression reasons, thresholds, or
governance posture.
