# AI Value Contribution Alignment Method Prototype Decision

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_METHOD_PROTOTYPE_DECISION_2026_06`

Status: executable internal decision gate. This contract authorizes only a
small, non-persistent internal method prototype when the source-bound internal
research-design gate review is ready.

It does not create backend routes, frontend UI, Prisma schema changes,
migrations, repositories, persistence writes, exports, live Glean, BigQuery, or
Sigma execution, statistical model implementation, numeric weights, model
results, confidence output, probability, score-like output, ROI, EBITDA,
causality, productivity, finance output, or customer-facing output.

## Purpose

This decision answers:

```text
Has the internal research-design gate review cleared enough to build a small
internal method prototype that emits qualitative component posture only?
```

It does not answer:

```text
What is the model result?
What weights should be used?
What is the confidence score?
Did AI cause the metric to move?
Is the output customer-ready?
```

## Run

```bash
npm run run:ai-value-contribution-alignment-method-prototype-decision
```

## Validate

```bash
npm run test:ai-value-contribution-alignment-method-prototype-decision
```

## States

```text
PROMOTE_SMALL_INTERNAL_METHOD_PROTOTYPE
HOLD_FOR_VALID_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Ready means only this:

```text
Build a small internal method prototype that emits qualitative component
posture only.
```

Ready does not authorize research-model feeds, model implementation, durable
input tables, statistical weights, confidence output, probability, score-like
output, finance-context investigation, customer-facing output, persistence,
exports, routes, UI, schemas, or live connector execution.

## Source Gate

The decision must bind to:

- the current Internal Research-Design Gate Review id and hash;
- the current Internal Model Prototype Review Packet validation;
- the current Internal Model Prototype validation;
- the current Model Prototype Design Review validation;
- the current Runner Review Packet validation;
- the current Internal Prototype Runner validation;
- the current Research Promotion Readiness Packet validation;
- the controlled aggregate fixture;
- the internal research-design text;
- the runner implementation-decision text.

If any source proof drifts, the decision must hold.

## Allowed Prototype Scope

The only promoted prototype scope is:

```text
qualitative_component_posture_only
```

The decision may not authorize numeric results, model outputs, model feeds,
finance outputs, customer-facing outputs, persistence, exports, live connector
execution, routes, UI, or schemas.

## Fail-Closed Boundary

The decision must reject or hold on:

- missing or invalid internal research-design gate review proof;
- source gate id or hash drift;
- upstream prototype review packet, prototype, design-review, runner-review,
  runner, readiness-packet, fixture, or research-design drift;
- raw rows, query text, SQL text, prompts, transcripts, identifiers,
  source package payloads, full gate-review payloads, full prototype payloads,
  full Measurement Cell payloads, or generic payload containers;
- model result, numeric weight, confidence, probability, score-like, finance,
  ROI, EBITDA, causality, productivity, export, route, UI, schema,
  persistence, live connector, or customer-facing side doors.

Validation output must not echo unsafe values or unsafe key names.
