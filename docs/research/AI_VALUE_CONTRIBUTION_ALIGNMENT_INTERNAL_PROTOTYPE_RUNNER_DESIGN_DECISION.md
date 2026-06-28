# AI Value Contribution Alignment Internal Prototype Runner Design Decision

Status: exact-scope design decision only. This document does not create
backend routes, frontend UI, Prisma schema changes, migrations, repositories,
persistence writes, exports, live Glean, BigQuery, or Sigma execution, model
math, numeric weights, model outputs, ROI, causality, productivity,
probability, score-like output, or customer-facing financial output.

Decision:
`PROMOTE_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_DESIGN__HOLD_RUNNER_IMPLEMENTATION`

Implementation posture: `HOLD_RESEARCH_PROTOTYPE_RUNNER_IMPLEMENTATION`

## 1. Decision

Promote only the design of a future internal prototype runner.

The promoted scope is a non-persistent internal prototype runner design that
would consume compact, source-bound packet refs only and emit an internal
review envelope with no model output.

This decision does not authorize implementing the runner.

## 2. Source Binding

This decision is bound to the current controlled pilot Research Promotion
Readiness Packet:

- Packet path:
  `docs/contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json`
- Packet id: `research_promotion_packet_1b0e65cdc29451d5`
- Packet integrity hash:
  `17cf73c5515ae5c5d21bbad7bc4020879157f998d0680d35519406b3603461ed`
- Packet decision: `READY_FOR_INTERNAL_RESEARCH_DESIGN`

This decision is also bound to the internal research-design draft:

- Design path:
  `docs/research/AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN.md`
- Design file hash:
  `be5722a843d259fe79ff7f7c3f4c13c3ac9530b92502ef9d9e6a6130fa0b3769`
- Design decision: `RECORD_INTERNAL_RESEARCH_DESIGN_DRAFT`
- Design posture: `HOLD_RESEARCH_MODEL_IMPLEMENTATION`

If either source object changes without this decision being updated and
revalidated, the prototype-runner design promotion is void.

## 3. Promoted Design Scope

The future runner design may specify how an internal-only prototype would:

- load a hash-bound Research Promotion Readiness Packet;
- confirm the packet still returns `READY_FOR_INTERNAL_RESEARCH_DESIGN`;
- confirm the internal research design still holds model implementation;
- produce a compact alignment-review envelope for internal reviewers;
- preserve the `METHOD_DESIGN_ONLY` cap;
- show all caveats, blocked uses, missing evidence, and source boundaries;
- keep AI Fluency construct context, psychological context, observed VBD
  context, and selected customer metric movement distinct.

The design may not specify numeric scoring logic, statistical model selection,
coefficient selection, weighting, probability estimation, finance translation,
or customer-facing report output.

## 4. Non-Goals

This decision does not authorize:

- code implementation;
- backend routes;
- frontend UI;
- schemas;
- migrations;
- repositories;
- persistence writes;
- exports;
- live BigQuery execution;
- live Sigma execution;
- live Glean execution;
- credential handling;
- query execution;
- raw rows;
- query text or SQL text;
- prompts, responses, transcripts, files, or raw text answers;
- item-level survey answers or respondent records;
- user identifiers, employee identifiers, row ids, span ids, hashed
  identifiers, or joinable person identifiers;
- model math;
- numeric weights;
- contribution output;
- probability output;
- score-like output;
- finance output;
- ROI;
- EBITDA;
- financial attribution;
- causality;
- productivity measurement;
- customer-facing output.

## 5. Future Runner Contract Shape

A later implementation proposal, if separately promoted, must define a
contract shape before code is written.

The contract shape must include:

- runner contract version;
- runner input packet ref;
- packet integrity hash;
- internal research design ref;
- design file hash;
- design-strength cap;
- selected expectation path identity;
- source lane refs;
- Measurement Cell milestone refs;
- observed VBD context ref;
- AI Fluency construct context ref;
- AI Fluency psychological context ref;
- selected customer metric movement ref;
- assumption governance ref;
- blocked uses;
- caveats;
- validation summary;
- next evidence required.

The contract shape must not include generic payload containers that can carry
raw source context, full source packages, full handoff bundles, full
Measurement Cell payloads, full Series payloads, raw rows, SQL text, prompts,
transcripts, identifiers, finance output, ROI, causality, productivity,
probability, score-like output, or customer-facing output.

## 6. Eligible Inputs

Eligible inputs are compact refs and hashes only:

- current controlled pilot Research Promotion Readiness Packet ref and hash;
- internal contribution-alignment research design ref and hash;
- approved Blueprint or value hypothesis ref;
- expectation path id, version, and hash;
- approved Blueprint payload hash;
- approved timestamp, approving role, and approval state;
- Day 0 / 30 / 60 / 90 / 180 / 365 Measurement Cell snapshot refs;
- Series contract continuity ref;
- Data Spine alignment ref;
- source lane refs for Blueprint, AI Fluency, VBD/token, customer metric, and
  assumption/governance;
- AI Fluency Confidence, Usage Quality, Behavior Change, Leadership
  Reinforcement, and Capability Growth context ref;
- aggregate psychological context ref for attitude, stated AI behavior
  orientation, behavioral intent, and perceived impact when present;
- observed VBD context ref for telemetry-derived Velocity, Breadth, and Depth;
- selected customer metric movement ref;
- blocked uses and required caveats.

## 7. Output Envelope

A later prototype-runner design may define only an internal review envelope.

Allowed envelope fields:

- review state;
- packet ref;
- packet integrity hash;
- design ref;
- design file hash;
- design-strength cap;
- source-bound posture;
- selected expectation path ref;
- milestone coverage posture;
- AI Fluency construct context posture;
- psychological context posture;
- observed VBD posture;
- selected customer metric movement posture;
- assumption governance posture;
- blocked uses;
- caveats;
- missing evidence;
- next evidence required.

The envelope must not contain a model result, contribution result, customer
metric verdict, finance result, economic result, numeric weight, probability,
score-like result, customer-facing result, route payload, UI payload, export
payload, source package payload, or raw evidence payload.

## 8. Interpretation Cap

The only allowed interpretation cap for the current packet is:

```text
METHOD_DESIGN_ONLY
```

That cap means the future runner design can help an internal reviewer see
whether the evidence package is organized enough to review. It does not mean
the initiative worked, that the approved hypothesis is validated, that AI
caused the selected metric to move, or that any financial claim is ready.

## 9. Fail-Closed Conditions

The future design must fail closed on:

- packet decision drift;
- packet id or integrity-hash drift;
- internal research-design hash drift;
- design posture drift;
- path drift;
- approval drift;
- metric drift;
- lag drift;
- value-driver drift;
- org/client/workflow/function/cohort/window drift;
- missing Day 0 / 30 / 60 / 90 / 180 / 365 milestones;
- held, suppressed, stale, missing, blocked, or rolling-window-only evidence;
- unsafe source refs;
- missing or mismatched selected customer metric movement;
- psychological-only evidence;
- collapsed AI Fluency stated behavior and observed VBD behavior;
- raw rows, query text, SQL text, prompts, responses, transcripts, files,
  item-level survey answers, respondent records, identifiers, or source
  package payloads;
- finance-output, ROI, EBITDA, causality, productivity, probability,
  score-like, customer-facing, export, route, UI, schema, persistence,
  live-connector, or model-output fields;
- JSON smuggling through compact refs, caveats, blocked uses, validation
  summaries, posture fields, wrapper objects, or future payload fields.

## 10. Validation Requirements

Before any later runner implementation proposal, add red/green tests that:

- reject missing packet id;
- reject packet hash drift;
- reject packet decision drift;
- reject internal design hash drift;
- reject design posture drift;
- reject missing selected expectation path identity;
- reject missing value hypothesis or approved Blueprint binding;
- reject any missing milestone;
- reject rolling 30-day context as milestone evidence;
- reject source freshness or window posture drift;
- reject metric id, metric unit, metric direction, or metric lag drift;
- reject AI Fluency construct context used as observed VBD;
- reject psychological context used as observed VBD or selected metric
  movement;
- reject raw rows, query text, SQL text, prompts, responses, transcripts,
  files, survey item answers, respondent records, identifiers, and source
  package payloads;
- reject finance-output, ROI, EBITDA, causality, productivity, probability,
  score-like, customer-facing, export, route, UI, schema, persistence,
  live-connector, model-output, and generic payload fields;
- reject unsafe language that says contribution has been proven, caused,
  predicted, scored, finance-ready, or customer-ready.

## 11. Security And Boundary Review

Security review is required before a later implementation proposal because a
runner could become a laundering path from compact evidence into unsafe output.

The future design must prove:

- no live connector execution;
- no credential handling;
- no query execution;
- no raw data receipt;
- no source package payload receipt;
- no direct identifiers;
- no generic payload pass-through;
- no export creation;
- no customer-facing surface;
- no persistence write unless a separate exact-scope persistence decision
  promotes that exact write path.

## 12. Legal And Trust Review

Legal/trust review is required before:

- customer-facing value language;
- customer-facing report design;
- exports;
- finance-context investigation;
- model implementation;
- model outputs;
- durable research-model input storage;
- any language that could be read as ROI, EBITDA, causality, productivity,
  probability, financial attribution, or customer-ready contribution output.

This decision does not request that review. It records that the review is a
future blocker before those surfaces can be promoted.

## 13. Productization Meaning

This moves productization forward by making the next research step explicit:

```text
Research Promotion Readiness Packet
-> Internal Research Design
-> Internal Prototype Runner Design Decision
-> Later exact-scope runner implementation decision
```

It does not move the product into modeling, scoring, customer reporting,
finance output, live connector execution, or new persistence.

## 14. Next Implementation Gate

The follow-on implementation gate is recorded in:

- [AI Value Contribution Alignment Internal Prototype Runner Implementation Decision](./AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_IMPLEMENTATION_DECISION.md)

That decision promotes only a local, non-persistent, compact-ref runner and
keeps model implementation held.

The implementation gate decision values were:

| Decision | Meaning |
| --- | --- |
| `HOLD_RESEARCH_PROTOTYPE_RUNNER_IMPLEMENTATION` | Keep the runner at design stage. |
| `PROMOTE_NON_PERSISTENT_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_IMPLEMENTATION` | Authorize a specific internal-only, non-persistent runner implementation that consumes compact refs only and emits no model outputs. |
| `REJECT_RESEARCH_PROTOTYPE_RUNNER_PATH` | Reject the prototype runner path and return to evidence design. |

No gate may promote customer-facing output, finance output, probability output,
score-like output, model output, persistence, routes, UI, exports, or live
connector execution without a separate exact-scope decision.

## 15. Verification

When this decision changes, run:

```bash
npm run test:ai-value-contribution-alignment-internal-prototype-runner-design
npm run test:ai-value-contribution-alignment-internal-prototype-runner
npm run test:ai-value-contribution-alignment-internal-research-design
npm run test:ai-value-research-promotion-readiness-packet
git diff --check
bash scripts/ci_docs_contract_sweep.sh
python3 scripts/ci_v1_governance_gates.py
```

Expected: all commands exit `0`.
