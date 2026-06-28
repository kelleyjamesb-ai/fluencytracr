# AI Value Contribution Alignment Research Math Data Model Promotion Decision

Status: exact-scope internal promotion decision. This document authorizes only
the promotion decision that determines whether a compact internal research-math
data model layer may be built.

Decision:
`PROMOTE_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION__HOLD_PERSISTENCE_AND_CUSTOMER_OUTPUT`

## 1. Decision

Promote the narrow Research Math Data Model Promotion Decision.

The promoted scope is limited to:

- a local script;
- package scripts;
- validator tests;
- a contract README;
- documentation and progress updates.

The decision remains internal-only, non-persistent, compact-ref-only, and
promotion-gate-only.

## 2. Source Gate

The decision must require:

- current Internal Method Prototype Review Record id and hash;
- current Research Math Finalization Review id and hash;
- source-bound Research Math Finalization Review validation;
- source-bound Internal Method Prototype Review Record validation;
- current Small Internal Method Prototype validation;
- current Method Prototype Decision validation;
- current Internal Research-Design Gate Review validation;
- current Internal Model Prototype Review Packet validation;
- current Internal Model Prototype validation;
- current Model Prototype Design Review validation;
- current Runner Review Packet validation;
- current Internal Prototype Runner validation;
- current Research Promotion Readiness Packet validation;
- controlled fixture binding;
- internal research-design hash validation;
- runner implementation-decision hash validation;
- `READY_FOR_RESEARCH_MATH_DATA_MODEL_PROMOTION_DECISION` source
  finalization-review state;
- false research-model, research-math-output, confidence-output, finance,
  customer-facing, route, UI, schema, persistence, export, and live-connector
  feeds.

If the source finalization review drifts, or if a caller supplies only the
older review record without the finalization review, the decision must hold
before exposing an internal data-model-layer-ready state.

## 3. Allowed Output

The decision may emit only a compact internal promotion decision:

- decision id and hash;
- compact source finalization review ref;
- decision scope;
- data model layer scope;
- context partition requirements;
- promotion basis;
- blocked uses;
- caveats;
- false feeds;
- validation summary.

## 4. Allowed Next Step

The only promoted next step is:

```text
internal_research_math_data_model_layer_only
```

This next step is still internal and non-persistent. It is not math
implementation, physical persistence, or customer-facing output.

## 5. Blocked Output

The decision must not emit or authorize:

- research-model feed;
- research math output;
- model implementation;
- model math implementation;
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
- warehouse job ids, table refs, credentials, dashboard URLs, or source-system
  authorization strings;
- source package payloads;
- full Measurement Cell payloads;
- full Series payloads;
- feature tables or model input tables;
- generic payload containers.

## 6. Required Context Separation

The decision must preserve the distinction between:

- AI Fluency construct context;
- AI Fluency psychological context;
- observed VBD context;
- selected customer metric movement.

AI Fluency psychological context and observed VBD context are related but not
interchangeable. Stated attitude, behavior, and intent from the AI Fluency
instrument cannot replace telemetry-derived observed work behavior. Observed
VBD context cannot replace customer-owned metric movement.

## 7. Interpretation Cap

The decision output can say only:

```text
The compact internal research-math data model layer is authorized.
```

It cannot say:

```text
The research math is implemented.
The research model is authorized.
The model produced a result.
The hypothesis is validated.
AI caused the metric to move.
The initiative produced ROI.
The data model is customer-facing.
The output is customer-ready.
```

## 8. Required Tests

Implementation requires red/green tests for:

- ready compact promotion decision;
- source finalization review drift;
- missing or malformed source finalization review;
- older review record supplied without the required finalization review;
- required separation of AI Fluency construct context, AI Fluency
  psychological context, observed VBD context, and selected metric movement;
- false feeds for research model, research math output, confidence, finance,
  customer-facing, live connector, route, UI, schema, persistence, and export
  outputs;
- raw rows, query text, prompt, transcript, identifier, model-result,
  confidence, probability, score-like, finance, ROI, EBITDA, causality,
  productivity, and generic payload smuggling;
- warehouse refs, BigQuery job ids, Sigma URLs, feature-table refs, and
  source-system authorization side doors;
- math-output metadata, numeric arrays, weights, posterior fields, finance
  synonyms, causality synonyms, and productivity synonyms;
- unsafe values inside otherwise allowed fields;
- ungoverned false-feed or false-boundary fields;
- validation gaps not echoing unsafe values;
- tampering after decision hash recomputation;
- CLI compact output.

## 9. Non-Authorization

This decision does not authorize research math implementation, research model
implementation, model training, statistical weights, model scoring, confidence
output, probability output, score-like output, customer-facing output,
finance-context investigation, exports, UI, routes, schemas, persistence, live
connector execution, ROI, causality, productivity measurement, or
customer-facing financial output.
