# AI Value Contribution Alignment Internal Research Design

Status: internal research-design draft only. This document does not create
backend routes, frontend UI, Prisma schema changes, migrations, repositories,
persistence writes, live Glean, BigQuery, or Sigma execution, export packages,
rendered customer readouts, model implementation, numeric weights, model
outputs, ROI, causality, productivity, probability, or customer-facing
financial output.

Decision: `RECORD_INTERNAL_RESEARCH_DESIGN_DRAFT`

Implementation posture: `HOLD_RESEARCH_MODEL_IMPLEMENTATION`

## 1. Source Gate

This design cites the passed current controlled pilot Research Promotion
Readiness Packet:

- [current-controlled-pilot-research-promotion-readiness-packet.json](../contracts/ai-value-research-promotion-readiness-packet/examples/current-controlled-pilot-research-promotion-readiness-packet.json)

Packet decision:

```text
READY_FOR_INTERNAL_RESEARCH_DESIGN
```

Packet id:

```text
research_promotion_packet_1b0e65cdc29451d5
```

Packet integrity hash:

```text
17cf73c5515ae5c5d21bbad7bc4020879157f998d0680d35519406b3603461ed
```

The packet is controlled-fixture-bound. Its Day 0 / 30 / 60 / 90 / 180 /
365 milestone refs are controlled recomputations from a saved scrubbed
aggregate fixture, not independently reviewed live pilot windows. This design
therefore records only the research design shape, not a live pilot claim or a
model implementation.

## 2. Research Question

The research question is:

```text
Given a customer-approved Blueprint hypothesis, governed aggregate AI Fluency
context, observed VBD work-behavior context, selected customer metric movement,
and repeated milestone evidence, can FluencyTracr design an internal method for
reviewing whether observed outcomes are aligned with the approved theory of
change without turning that alignment into proof?
```

The research question is not:

```text
Did AI cause the metric to move?
```

## 3. Conceptual Model Frame

The future model family should be framed as contribution alignment research,
not as direct economic proof.

Safe conceptual frame:

```text
Contribution_Alignment_Candidate =
  Gate(
    approved_path_binding,
    source_review_posture,
    suppression_posture,
    boundary_clearance
  )
  AND
  f(
    Hypothesis_Binding,
    Source_Coverage,
    Milestone_Continuity,
    Observed_VBD_Alignment,
    Customer_Metric_Movement,
    AI_Fluency_Context_Integrity,
    Comparison_Design_Strength,
    Assumption_Governance
  )
```

This is a research-design frame, not executable pseudocode and not an
implemented formula. The function has no numeric weights, coefficients,
likelihoods, ranges, thresholds, percentages, posterior values, or product
outputs in this phase.

The gate must fail closed when any hard blocker is present:

- held, missing, suppressed, stale, or blocked milestone evidence;
- path, approval, metric, lag, driver, workflow, function, cohort, window, or
  source drift;
- unsafe source refs;
- raw rows, query text, prompts, transcripts, user identifiers, row ids, span
  ids, hashed identifiers, or joinable person identifiers;
- model-output, score-like, probability, finance-output, ROI, EBITDA,
  causality, productivity, ranking, customer-facing, export, live-connector,
  route, UI, schema, persistence, or raw-storage fields.

## 4. Eligible Inputs

Eligible inputs are compact refs and hashes from the passed packet only:

| Input | Research role |
| --- | --- |
| Approved Blueprint or value hypothesis ref | Defines the customer-approved theory of change. |
| Expectation path id, version, and hash | Provides stable path identity. |
| Expected pathway metadata | Defines expected behavior, observed VBD signal, selected metric, metric lag, direction, and governed value driver. |
| Measurement Cell snapshot refs | Provides Day 0 / 30 / 60 / 90 / 180 / 365 compact milestone refs. |
| Series contract continuity ref | Provides contract-output continuity proof only, not persisted Series state. |
| Source lane refs | Confirms source review posture for Blueprint, AI Fluency, VBD/token, customer metric, and assumption/governance lanes. |
| AI Fluency construct context ref | Provides aggregate context for the five AI Fluency dimensions. |
| AI Fluency psychological context ref | Provides optional aggregate stated attitude / stated AI behavior orientation / intent context only. |
| Observed VBD context ref | Provides telemetry-derived observed work behavior context. |
| Selected metric movement ref | Provides aggregate customer-owned metric movement context. |
| Assumption governance ref | Provides reviewed assumption and governance posture. |
| Data Spine alignment ref | Confirms org/client/workflow/function/cohort/window alignment. |

## 5. AI Fluency And VBD Separation

The AI Fluency construct must remain separate from observed VBD behavior.

AI Fluency construct context is aggregate context for:

1. Confidence
2. Usage Quality
3. Behavior Change
4. Leadership Reinforcement
5. Capability Growth

AI Fluency psychological context is aggregate stated context only:

- AI attitude;
- stated AI behavior orientation;
- behavioral intent;
- perceived AI impact when present in the approved instrument context.

Observed VBD behavior is different. It is telemetry-derived observed work
behavior:

- Velocity;
- Breadth;
- Depth.

Psychological context can add caveats or hold the design if unsafe or missing
where declared. It cannot strengthen, clear, upgrade, or rescue readiness.
It cannot substitute for observed VBD context or selected customer metric movement.

## 6. Excluded Inputs

The design must exclude:

- raw rows;
- query text or SQL text;
- prompts, responses, transcripts, files, raw text answers, or item-level
  survey answers;
- respondent records;
- user identifiers, employee identifiers, emails, row ids, span ids, hashed
  identifiers, or joinable person identifiers;
- source package payloads;
- full operator source handoff bundles;
- full Measurement Cell payloads;
- full Measurement Cell Series payloads;
- full Blueprint expectation-path registries;
- payload wrapper fields that can smuggle raw or unsafe content;
- finance output, ROI, EBITDA, financial attribution, causality,
  productivity, probability, score-like output, numeric weights, model output,
  customer-facing output, export, route, UI, schema, persistence, live
  connector execution, or raw data storage.

## 7. Comparison Design

The current controlled packet supports method design only. It does not support
a live pilot inference.

Future research design may compare evidence in this order, with each stronger
step requiring a separate promotion review:

| Design level | Description | Current status |
| --- | --- | --- |
| Controlled fixture replay | Saved aggregate fixture recomputed across governed milestone refs. | Ready for design only. |
| Repeated live milestone review | Independently reviewed Day 0 / 30 / 60 / 90 / 180 / 365 aggregate milestones. | Held. |
| Pre/post same-slice review | Baseline and comparison movement on the same approved path. | Held for live evidence. |
| Matched comparison | Comparable aggregate workflow/cohort path with source-bound controls. | Held. |
| Difference-in-differences | Pre/post movement compared against a governed matched comparison. | Held. |
| Stepped-wedge rollout | Staggered rollout with governed aggregate windows. | Held. |
| Controlled pilot or holdout | Business-approved aggregate comparison design. | Held. |

No design level in this document authorizes causality, ROI, productivity,
probability, finance output, or customer-facing economic output.

## 8. Design-Strength Cap

Design strength caps interpretation.

For the current controlled packet, the cap is:

```text
METHOD_DESIGN_ONLY
```

That cap allows:

- internal research-design drafting;
- review of required inputs;
- review of blocked outputs;
- validation planning;
- report-shape planning for internal prototypes.

That cap blocks:

- model implementation;
- numeric weights;
- model outputs;
- durable research-model input tables;
- customer-facing output;
- export packages;
- finance-context investigation;
- ROI, EBITDA, causality, productivity, probability, or contribution output.

## 9. Missing Evidence And Suppression Behavior

The design must fail closed:

- missing evidence remains missing;
- held evidence remains held;
- suppressed evidence remains suppressed;
- stale windows remain stale;
- rolling 30-day context cannot become milestone evidence;
- later ready windows cannot rescue earlier held, suppressed, missing, stale,
  or blocked windows;
- psychological context cannot rescue missing observed VBD behavior or missing
  selected customer metric movement;
- unsafe refs or unsafe wrapper fields reject or hold before any research
  design can use them.

## 10. Output Audience

Allowed audience:

- internal AI Value product owner;
- internal value research owner;
- governance operator;
- legal/trust reviewer when required;
- internal operator preparing a future research-design review.

Blocked audience:

- customer-facing users;
- executive customers;
- finance buyers;
- sales decks;
- exports;
- UI reports;
- external dashboards;
- live connector consumers.

## 11. Blocked Output Language

Blocked language includes:

- AI caused EBITDA;
- AI proved ROI;
- AI produced productivity gains;
- AI generated financial attribution;
- AI contribution score;
- customer-facing score;
- probability of contribution;
- predicted ROI;
- realized ROI;
- workforce efficiency proof;
- employee, manager, team, department, customer, or skill ranking;
- finance-ready output;
- customer-facing confidence output.

Allowed language:

```text
The controlled packet is ready for internal research-design drafting.
```

Allowed internal prototype language, after a separate prototype decision:

```text
Evidence alignment can be reviewed against the customer-approved hypothesis.
```

## 12. Internal Report Shape

A future internal prototype report should show:

1. Approved hypothesis and expectation path.
2. Packet and source-bound evidence posture.
3. AI Fluency construct context.
4. AI Fluency psychological context, clearly marked context-only.
5. Observed VBD work behavior.
6. Selected customer metric movement.
7. Milestone continuity and missing-window posture.
8. Comparison design strength and cap.
9. Assumption governance and caveats.
10. Blocked claims and blocked outputs.
11. Next evidence required before model implementation.

The report must not show a customer-facing contribution result, financial
output, ROI, causality, productivity, probability, model score, or economic
proof.

## 13. Validation Checks

Before any later research prototype implementation, require red/green tests
for:

- packet decision not equal to `READY_FOR_INTERNAL_RESEARCH_DESIGN`;
- packet integrity hash drift;
- approved path drift;
- approval drift;
- metric drift;
- metric lag drift;
- value-driver drift;
- org/client/workflow/function/cohort/window drift;
- missing Day 0 / 30 / 60 / 90 / 180 / 365 milestones;
- held, suppressed, stale, missing, blocked, or rolling-window-only evidence;
- missing source freshness or window posture;
- missing or mismatched customer metric movement;
- psychological-only evidence;
- collapsed AI Fluency stated behavior and observed VBD behavior;
- unsafe source refs;
- raw rows;
- query text or SQL text;
- prompts, responses, transcripts, files, or raw text answers;
- item-level survey answers or respondent records;
- user identifiers, employee identifiers, row ids, span ids, hashed
  identifiers, or joinable person identifiers;
- full source package payloads;
- full handoff bundles;
- full Measurement Cell or Series payloads;
- full expectation-path registries;
- finance-output, ROI, EBITDA, causality, productivity, probability,
  score-like, numeric-weight, customer-facing, export, live-connector, route,
  UI, schema, persistence, or model-output fields;
- JSON smuggling through compact refs, caveats, blocked uses, validation
  summaries, posture fields, or wrapper payloads.

## 14. Legal And Trust Posture

Legal/trust review is required before:

- customer-facing value language;
- customer-facing report design;
- exports;
- finance-context investigation;
- model implementation;
- model outputs;
- durable research-model input storage;
- any language that could be read as ROI, EBITDA, causality, productivity,
  probability, or financial attribution.

The current design does not request that review. It records that the review is
required before any promoted implementation or customer-facing surface.

## 15. Next Decision

The next decision must choose one of:

| Decision | Meaning |
| --- | --- |
| `HOLD_RESEARCH_MODEL_IMPLEMENTATION` | Keep the design as a research artifact only. |
| `PROMOTE_INTERNAL_RESEARCH_PROTOTYPE_RUNNER_DESIGN__HOLD_RUNNER_IMPLEMENTATION` | Authorize a non-persistent internal prototype runner design and keep runner implementation held. The future runner would consume compact packet refs only and emit no model outputs if a later exact-scope implementation decision promotes it. |
| `REJECT_RESEARCH_MODEL_PATH` | Reject this model path and return to evidence design. |

No decision in this document authorizes implementation. A later exact-scope
promotion decision is required before any code, persistence, routes, UI,
exports, model outputs, numeric weights, finance output, ROI, causality,
productivity, probability, or customer-facing output.
