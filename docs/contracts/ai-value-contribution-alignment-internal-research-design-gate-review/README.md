# AI Value Contribution Alignment Internal Research-Design Gate Review

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_RESEARCH_DESIGN_GATE_REVIEW_2026_06`

Status: executable internal gate-review contract. This contract authorizes only
a compact, non-persistent review of the current Contribution Alignment Internal
Model Prototype Review Packet.

It does not create backend routes, frontend UI, Prisma schema changes,
migrations, repositories, persistence writes, exports, live Glean, BigQuery, or
Sigma execution, statistical model implementation, numeric weights, model
results, confidence output, probability, score-like output, ROI, EBITDA,
causality, productivity, finance output, or customer-facing output.

## Purpose

The gate review closes the current internal design chain by answering one
question:

```text
Is the reviewed compact prototype safe enough to support a later exact-scope
method-prototype decision review?
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
npm run run:ai-value-contribution-alignment-internal-research-design-gate-review
```

## Validate

```bash
npm run test:ai-value-contribution-alignment-internal-research-design-gate-review
```

## Source Gate

The gate review must bind to:

- the current Contribution Alignment Internal Model Prototype Review Packet id
  and hash;
- the current Contribution Alignment Internal Model Prototype id and hash;
- the current Model Prototype Design Review validation;
- the current Runner Review Packet validation;
- the current Internal Prototype Runner validation;
- the current Research Promotion Readiness Packet validation;
- the controlled aggregate fixture;
- the internal research-design text;
- the runner implementation-decision text.

If any source proof drifts, the gate review must hold before allowing the next
decision review.

## States

```text
READY_FOR_EXACT_SCOPE_METHOD_PROTOTYPE_DECISION
HOLD_FOR_VALID_INTERNAL_MODEL_PROTOTYPE_REVIEW_PACKET
REJECTED_FOR_BOUNDARY_LEAKAGE
```

Ready means only this:

```text
The compact prototype review packet is source-bound and safe enough to review a
later exact-scope method-prototype decision.
```

Ready does not authorize research-model feeds, model implementation, durable
input tables, statistical weights, confidence output, probability, score-like
output, finance-context investigation, customer-facing output, persistence,
exports, routes, UI, schemas, or live connector execution.

## Required Separation

The gate review must keep these contexts distinct:

- AI Fluency construct context.
- AI Fluency psychological context.
- Observed VBD context.
- Selected customer metric movement.

Psychological context cannot substitute for observed VBD context. Observed VBD
context cannot substitute for customer metric movement. The gate review may
trace these contexts only as compact review states.

## Fail-Closed Boundary

The gate review must reject or hold on:

- missing or invalid prototype review packet proof;
- source prototype review packet id or hash drift;
- prototype, design-review, runner-review, runner, readiness-packet, fixture,
  or research-design drift;
- raw rows, query text, SQL text, prompts, transcripts, identifiers,
  item-level survey answers, source package payloads, full review packet
  payloads, full prototype payloads, full Measurement Cell payloads, or
  generic payload containers;
- model result, numeric weight, confidence, probability, score-like, finance,
  ROI, EBITDA, causality, productivity, export, route, UI, schema,
  persistence, live connector, or customer-facing side doors;
- tampering after gate-review hash recomputation.

Validation output must not echo unsafe values or unsafe key names.
