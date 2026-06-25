# AI Value Contribution Alignment Method Prototype Decision

Status: exact-scope internal implementation decision. This document authorizes
only the small internal method prototype defined by the current internal
research-design gate review.

Decision:
`PROMOTE_SMALL_INTERNAL_METHOD_PROTOTYPE__HOLD_MODEL_IMPLEMENTATION_AND_CUSTOMER_OUTPUT`

## 1. Decision

Promote the narrow small internal method prototype.

The promoted scope is limited to:

- a local script;
- package scripts;
- validator tests;
- contract README updates;
- documentation and progress updates.

The decision remains internal-only, non-persistent, compact-ref-only, and
decision-only.

## 2. Source Gate

The decision must require:

- current Internal Research-Design Gate Review id and hash;
- source-bound Internal Research-Design Gate Review validation;
- current Internal Model Prototype Review Packet validation;
- current Internal Model Prototype validation;
- current Model Prototype Design Review validation;
- current Runner Review Packet validation;
- current Internal Prototype Runner validation;
- current Research Promotion Readiness Packet validation;
- controlled fixture binding;
- internal research-design hash validation;
- runner implementation-decision hash validation;
- `READY_FOR_EXACT_SCOPE_METHOD_PROTOTYPE_DECISION` gate state;
- false model, confidence-output, finance, customer-facing, route, UI,
  schema, persistence, export, and live-connector feeds.

If the source gate review drifts, the decision must hold before exposing a
small-internal-prototype-ready state.

## 3. Allowed Output

The decision may emit only a compact internal decision record:

- decision id and hash;
- compact source gate-review ref;
- method prototype scope;
- promotion basis;
- blocked uses;
- caveats;
- false feeds;
- validation summary.

## 4. Allowed Prototype Scope

The only promoted prototype may emit:

```text
qualitative_component_posture_only
```

The prototype may show which governed components are included for internal
method review. It may not combine those components into a numeric result.

## 5. Blocked Output

The decision must not emit or authorize:

- research-model feed;
- model implementation;
- model math;
- numeric weights;
- model result;
- contribution output;
- confidence output;
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
- full gate-review payloads;
- full prototype payloads;
- full Measurement Cell payloads;
- full Series payloads;
- generic payload containers.

## 6. Interpretation Cap

The decision output can say only:

```text
The small internal qualitative method prototype is authorized for internal
review.
```

It cannot say:

```text
The research model is authorized.
The model produced a result.
The hypothesis is validated.
AI caused the metric to move.
The initiative produced ROI.
The output is customer-ready.
```

## 7. Required Tests

Implementation requires red/green tests for:

- ready compact decision;
- source gate-review drift;
- missing or malformed source gate review;
- false feeds for model, confidence, finance, customer-facing, live connector,
  route, UI, schema, persistence, and export outputs;
- raw rows, query text, prompt, transcript, identifier, model-result,
  confidence, probability, score-like, finance, ROI, EBITDA, causality,
  productivity, and generic payload smuggling;
- validation gaps not echoing unsafe values;
- tampering after decision hash recomputation;
- CLI compact output.

## 8. Non-Authorization

This decision does not authorize research-model implementation, model training,
statistical weights, model scoring, confidence output, probability output,
score-like output, customer-facing output, finance-context investigation,
exports, UI, routes, schemas, persistence, live connector execution, ROI,
causality, productivity measurement, or customer-facing financial output.
