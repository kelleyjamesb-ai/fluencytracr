# AI Value Contribution Alignment Internal Prototype Runner Implementation Decision

Status: exact-scope internal implementation decision. This document authorizes
only a non-persistent internal runner script that consumes compact refs and
hashes from the current Research Promotion Readiness Packet and emits a compact
internal review envelope.

Decision:
`PROMOTE_NON_PERSISTENT_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_IMPLEMENTATION__HOLD_MODEL_IMPLEMENTATION`

## 1. Decision

Promote the narrow internal prototype runner implementation.

The implementation is limited to:

- a local script;
- a package script;
- a validator test;
- documentation and progress updates.

The implementation remains non-persistent, internal-only, compact-ref-only,
and method-design-only.

## 2. Source Gate

The runner must require:

- current controlled pilot Research Promotion Readiness Packet id and
  integrity hash;
- source-fixture-bound packet validation;
- internal research design hash validation;
- `READY_FOR_INTERNAL_RESEARCH_DESIGN` packet decision;
- `METHOD_DESIGN_ONLY` interpretation cap;
- explicit `HOLD_RESEARCH_MODEL_IMPLEMENTATION` posture.

If any source binding drifts, the runner must hold before emitting an internal
review-ready state.

## 3. Allowed Output

The runner may emit only a compact internal review envelope:

- runner id and hash;
- packet ref and packet integrity hash;
- research design ref and hash;
- implementation decision ref;
- review scope;
- source-bound posture;
- selected expectation path ref;
- milestone coverage posture and compact snapshot refs;
- AI Fluency construct context ref;
- AI Fluency psychological context ref;
- observed VBD context ref;
- selected customer metric movement ref;
- assumption governance ref;
- Data Spine alignment ref;
- Source Package Review posture ref;
- blocked uses;
- caveats;
- false feeds;
- validation summary.

## 4. Blocked Output

The runner must not emit:

- model math;
- numeric weights;
- contribution output;
- probability output;
- score-like output;
- finance output;
- finance-context investigation;
- ROI;
- EBITDA;
- financial attribution;
- causality;
- productivity measurement;
- customer-facing output;
- exports;
- routes;
- UI;
- schemas;
- persistence writes;
- live connector execution;
- raw rows;
- query text or SQL text;
- prompts, responses, transcripts, files, or raw text answers;
- item-level survey answers or respondent records;
- user identifiers, employee identifiers, row ids, span ids, hashed
  identifiers, or joinable person identifiers;
- source package payloads;
- full handoff bundles;
- full Measurement Cell payloads;
- full Series payloads;
- generic payload containers.

## 5. Interpretation Cap

The runner output can say only:

```text
This compact packet is internally reviewable for method-design alignment.
```

It cannot say:

```text
The hypothesis is validated.
AI caused the metric to move.
The initiative produced ROI.
The contribution model is ready.
```

## 6. Required Tests

Implementation requires red/green tests for:

- ready compact internal review output;
- packet source-binding drift;
- design hash drift;
- false feeds for model, finance, customer-facing, live connector, route, UI,
  schema, persistence, and export outputs;
- raw rows, query text, prompt, transcript, identifier, model-result,
  probability, score-like, finance, ROI, EBITDA, causality, productivity, and
  generic payload smuggling;
- CLI compact output.

## 7. Non-Authorization

This decision does not authorize confidence math, research model
implementation, model training, model scoring, customer-facing output,
finance-context investigation, exports, UI, routes, schemas, persistence,
live connector execution, ROI, causality, productivity measurement,
probability output, score-like output, or customer-facing financial output.
