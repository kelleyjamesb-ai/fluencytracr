# AI Value Contribution Alignment Internal Prototype Runner

Schema version:
`FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_PROTOTYPE_RUNNER_2026_06`

Status: internal executable runner contract. This contract authorizes only a
local, non-persistent runner that consumes compact Research Promotion
Readiness Packet refs and emits a compact internal review envelope.

It does not create backend routes, frontend UI, Prisma schema changes,
migrations, repositories, persistence writes, exports, live Glean, BigQuery, or
Sigma execution, model math, numeric weights, model outputs, probability,
score-like output, ROI, EBITDA, causality, productivity, finance output, or
customer-facing output.

## Purpose

The runner proves the current controlled Research Promotion Readiness Packet
can become a method-design alignment review envelope without becoming a model.

It answers:

```text
Can an internal reviewer see the approved path, compact milestone refs,
AI Fluency context refs, observed VBD context ref, selected metric movement
ref, caveats, and blocked uses in one bounded envelope?
```

It does not answer:

```text
Did AI cause the outcome?
What is the confidence score?
What is the ROI?
```

## Run

```bash
npm run run:ai-value-contribution-alignment-internal-prototype-runner
```

## Validate

```bash
npm run test:ai-value-contribution-alignment-internal-prototype-runner
```

## Output Boundary

The runner may emit only:

- compact packet refs and hashes;
- compact research design refs and hashes;
- selected expectation path identity;
- compact milestone refs;
- AI Fluency construct context ref;
- AI Fluency psychological context ref;
- observed VBD context ref;
- selected customer metric movement ref;
- assumption governance ref;
- Data Spine alignment ref;
- Source Package Review posture ref;
- caveats;
- blocked uses;
- false feeds;
- validation summary.

The runner must not emit raw rows, query text, SQL text, prompts, responses,
transcripts, files, item-level survey answers, respondent records, identifiers,
source package payloads, full handoff bundles, full Measurement Cell payloads,
full Series payloads, generic payload containers, model results, numeric
weights, probability, score-like output, ROI, EBITDA, causality, productivity,
finance output, customer-facing output, routes, UI, schemas, persistence
writes, exports, or live connector execution.
