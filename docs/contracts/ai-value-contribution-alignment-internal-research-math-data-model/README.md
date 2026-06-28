# AI Value Contribution Alignment Internal Research Math Data Model

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_MATH_DATA_MODEL_2026_06`

Status: executable internal data-model boundary. This contract defines compact
context grain and component boundaries for future research-math design after
the Research Math Data Model Promotion Decision passes.

It does not create backend routes, frontend UI, Prisma schema changes,
migrations, repositories, persistence writes, exports, live Glean, BigQuery, or
Sigma execution, research math implementation, statistical model
implementation, numeric weights, model results, confidence output, probability,
score-like output, ROI, EBITDA, causality, productivity, finance output, or
customer-facing output.

## Purpose

This internal data model answers:

```text
What compact, source-bound context would a later research design need, without
emitting model math or creating durable customer-facing state?
```

It does not answer:

```text
What is the model equation?
What are the weights?
What is the contribution confidence?
Did AI cause a metric movement?
What should the customer see?
```

## Run

```bash
npm run run:ai-value-contribution-alignment-internal-research-math-data-model
```

## Validate

```bash
npm run test:ai-value-contribution-alignment-internal-research-math-data-model
```

## States

```text
READY_FOR_INTERNAL_RESEARCH_MATH_FINALIZATION_DESIGN
HOLD_FOR_VALID_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Ready means only this:

```text
The compact internal research-design data model boundary is available.
```

Ready does not authorize persistence, physical tables, model execution,
numeric parameters, customer-facing confidence, exports, routes, UI, live
connectors, or customer-facing output.

## Compact Grain

The internal data model keeps the grain explicit:

- one selected approved expectation-path ref;
- one source-bound Measurement Cell context ref;
- repeated Day 0 / 30 / 60 / 90 / 180 / 365 milestone evidence refs;
- repeated-window evidence required before any later separately approved
  customer-facing promotion review could be considered;
- no full source package, Measurement Cell, Series, or handoff payload.

## Context Partitions

The data model keeps these partitions separate:

- AI Fluency construct context:
  Confidence, Usage Quality, Behavior Change, Leadership Reinforcement, and
  Capability Growth.
- AI Fluency psychological context:
  AI attitude, behavior toward AI, and behavioral intent.
- Observed VBD context:
  telemetry-derived observed work behavior context.
- Selected metric movement context:
  customer-owned metric movement context.

Psychological survey behavior and observed VBD are related but not
interchangeable. Observed VBD is not customer metric movement.

## Component Registry

The component registry is context-only:

- hypothesis binding;
- source coverage;
- milestone continuity;
- AI Fluency construct context integrity;
- psychological context integrity;
- observed VBD alignment;
- selected metric movement;
- comparison design strength;
- assumption governance;
- boundary clearance.

Every component is `context_only`, `not_emitted`, and has no numeric role.

## Fail-Closed Boundary

The data model must reject or hold on:

- missing or invalid Research Math Data Model Promotion Decision proof;
- promotion decision id or hash drift;
- raw rows, query text, SQL text, prompts, transcripts, identifiers,
  source package payloads, full Measurement Cell payloads, full Series payloads,
  feature tables, warehouse refs, dashboard URLs, or generic payload
  containers;
- model result, numeric weight, confidence, probability, score-like, finance,
  ROI, EBITDA, causality, productivity, export, route, UI, schema,
  persistence, live connector, or customer-facing side doors.

Validation output must not echo unsafe values or unsafe key names.
