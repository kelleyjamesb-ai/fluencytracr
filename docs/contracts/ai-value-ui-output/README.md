# AI Value UI Output Contract

This contract defines the internal review-queue output that a thin UI may render
after deterministic Value Hypothesis Readiness artifacts exist.

It does not create a frontend, backend route, schema, migration, persistence
table, customer-facing output, financial output, ROI proof, causality claim,
productivity claim, confidence percentage, probability output, person-level
output, or team-ranking surface.

## Inputs

The builder accepts already-validated, aggregate-safe objects:

- `packet`: a Value Hypothesis Readiness packet.
- `dataSpineReadiness`: a Data Spine Intake Readiness result.
- `generatedAt`: optional deterministic timestamp for tests and examples.

The UI output is source-bound. It can show readiness state, review label, source
lane status, held lanes, missing evidence, caveats, blocked claims, allowed next
actions, and internal review cards.

## Display Boundary

The only supported display mode is:

```text
internal_review_queue
```

The output may support Glean review, business-owner review, and evidence
collection workflows. It must not present a polished executive proof dashboard.

## Required Boundary Policy

Every valid output must explicitly keep these capabilities disabled:

- frontend UI creation
- backend routes
- migrations
- Prisma schemas
- persistence
- customer-facing output
- customer-facing financial output
- financial output
- ROI proof
- causality claims
- productivity claims
- confidence percentages
- probability outputs
- person-level output
- no manager or team ranking

## Forbidden Fields And Language

Validation fails closed when unsupported fields or text imply ROI proof,
financial attribution, EBITDA impact, causality, productivity, confidence
percentages, probabilities, raw rows, direct identifiers, routes, schemas, or
persistence.

## Productization Role

This is a display contract only. It is the final layer after the governed
evidence spine has produced deterministic review artifacts. It does not parse
Blueprint uploads, query BigQuery, import customer metrics, compute value, or
upgrade readiness.
