# AI Value Measurement Model

## North Star

The AI Value Platform should help an organization answer:

```text
Are we building AI capability, is AI becoming real work, what outcome should
move, what proof do we have, and what should we change next?
```

This is the product spine. The platform should not optimize for usage volume,
prompt counts, generic maturity scoring, or static dashboards. It should help
leaders connect aggregate AI capability, aggregate work-pattern evidence,
customer-owned outcome metrics, evidence quality, and the next operating action.

## Narrow Product Spine

```text
AI Fluency Baseline
-> VBD Operating Map
-> Function Outcome Metric
-> Value Evidence Case
-> Intervention / Retest
```

Blueprint, metrics, evidence readiness, scenario modeling, claim boundaries,
executive readouts, and sponsor decisions still matter. They are supporting
objects inside the spine, not separate product destinations.

## VBD Definitions

Use these definitions as canonical for the AI Value Platform:

| Dimension | Definition | Product meaning |
| --- | --- | --- |
| Velocity | Speed to adoption. | How quickly a function or workflow moves from AI availability to active, repeated use. |
| Breadth | Spread across the organization, functions, roles, and workflows. | How widely AI capability is showing up across the client operating system. |
| Depth | Aggregate AI tool or surface repertoire. | How many AI tools or surfaces people use, exposed only as aggregate distributions. |

VBD is an operating map, not value proof. It tells the platform where AI work
is developing and where intervention may be needed. Value claims require a
customer-owned function outcome metric, accepted or caveated outcome evidence,
and claim review.

## What Good Looks Like

| Layer | Good looks like | Failure mode |
| --- | --- | --- |
| AI Fluency Baseline | Aggregate readiness by function shows what people are ready to do with AI. | Treating fluency as generic training completion or individual scoring. |
| VBD Operating Map | Velocity and Depth classify the work pattern; Breadth shows coverage across functions, roles, or workflow families. | Mistaking high usage, prompts, tokens, or tool sprawl for value. |
| Function Outcome Metric | A customer-owned metric is selected for the same workflow slice and window. | Choosing broad enterprise KPIs that cannot be tied to the workflow. |
| Value Evidence Case | AI work evidence, customer outcome evidence, assumptions, claim level, and caveats are assembled in one governed case. | Jumping from adoption telemetry to ROI proof. |
| Intervention / Retest | The product recommends what to change next and when to remeasure on the same slice. | Producing a static readout with no operating loop. |

## Phase Data Support Map

This table describes what data currently supports each phase based on the
software and fixtures already in the repo.

| Spine phase | Core product question | Data support already in repo | What it supports today | Gaps to build next |
| --- | --- | --- | --- | --- |
| AI Fluency Baseline | Are we building AI capability? | `customer-support-fluency-baseline.json`; `shared/src/aiValueEngine/fluencyBaseline.ts`; aggregate cohort validation in `scripts/ai_value_engine.test.mjs`. | Aggregate fluency context, suppressed small cohorts, instrument metadata, readiness summary, and no person-level scoring. | Function-level fluency trend over time; direct mapping from fluency dimensions to VBD intervention choices; richer client result import path. |
| VBD Operating Map | Is AI becoming real work? | `docs/concepts/VELOCITY.md`; `docs/concepts/DEPTH.md`; `customer-support-aggregate-api-push-package.json`; VBD context in `value-improvement-loop.schema.json`; VBD UI map in `frontend/src/pages/AIValueWorkspace.tsx`. | Velocity and Breadth aggregate package examples; Depth concept grounding; VBD status as intervention context; Velocity x Depth quadrant language. | First-class VBD map schema; function/workflow plotting data; Breadth heatmap; longitudinal VBD snapshots; validated Depth signals by function. |
| Function Outcome Metric | What outcome should move? | `metric-definition.schema.json`; `customer-support-metrics-library.json`; `sales-pipeline-metrics-library.json`; `shared/src/aiValueEngine/metrics.ts`; Blueprint-to-metric adapter. | Governed metric names, definitions, value routes, source systems, units, baseline/comparison rules, owners, and allowed claim levels. | Broader function metrics library; source-system connector requirements; metric selection UX tied to function and VBD quadrant. |
| Value Evidence Case | What proof do we have? | `customer-support-value-evidence-pack.json`; `data-boundary-roi-evidence.schema.json`; `customer-support-data-boundary-roi-evidence.json`; `evidence-readiness.schema.json`; `customer-support-outcome-evidence-export.json`; baseline/comparison API-push fixtures; `roi-scenario.schema.json`; `claim-boundary.schema.json`; `executive-packet.schema.json`. | Evidence readiness, allowed upstream data sources, aggregate transformation boundaries, outcome export review, baseline/comparison windows, modeled value scenario, claim boundaries, safe language, blocked claims, and executive packet generation. | Unified `value_evidence_case` object that assembles metric, outcome data, VBD state, evidence quality, scenario, caveats, and decision in one place. |
| Intervention / Retest | What should we change next? | `value-improvement-loop.schema.json`; `customer-support-value-improvement-loop.json`; `shared/src/aiValueEngine/valueImprovement.ts`; Scenario and Decisions UI panel. | Advisory blockers, recommended interventions, retest window, next data needed, and guarded caveats when a value target is not improving. | Intervention history; owner workflow; retest result object; learning loop that records which interventions move VBD and outcomes. |

## Evidence Quality Ladder

Every Value Evidence Case should expose the evidence level before stronger value
language can move forward.

| Evidence level | Meaning | Allowed language |
| --- | --- | --- |
| Missing | Required workflow, metric, baseline, comparison, or outcome evidence is absent. | Observed AI activity only. |
| Directional | AI work evidence and early outcome or survey signals move in the expected direction, but rigor is weak. | Internal hypothesis language. |
| Caveated | Same workflow slice and baseline/comparison windows exist, but assumptions or confounds remain. | Caveated value investigation. |
| Supported | Customer-owned aggregate outcome evidence, denominator integrity, baseline integrity, and claim review support bounded movement. | Bounded realized movement for the workflow slice. |
| Strong | Repeated supported evidence or stronger causal design exists. | Narrow high-confidence value claims. |
| Blocked | Governance, privacy, evidence, or claim-boundary gates fail. | Explanation of why value language is blocked. |

## Product Object Reset

The current implementation has useful objects, but the product should present
them through fewer client-facing objects:

| Client-facing object | Supporting objects |
| --- | --- |
| Organization Baseline | fluency baseline, engagement context, client objective |
| VBD Map | velocity observations, breadth coverage, depth signals, aggregate workflow evidence |
| Outcome Metric | blueprint, metrics library, value route, source system, baseline/comparison rule |
| Value Evidence Case | evidence readiness, outcome evidence export, ROI/value scenario, claim boundary, executive packet |
| Intervention / Retest | value improvement loop, sponsor decision, retest plan, next data needed |

## Non-Negotiables

- Aggregate-only.
- Workflow-sliced.
- Customer-owned outcome data for value proof.
- Sensitive organizational data may be useful upstream, but it must be
  aggregated, attested, and stripped of direct identifiers before it crosses
  into FluencyTracr.
- VBD and AI Fluency guide intervention planning; they do not prove business
  impact by themselves.
- No individual scoring.
- No manager, team, department, or employee ranking.
- No HR analytics.
- No ROI proof from usage telemetry alone.
- No causality claims without a future explicitly approved evidence design.
- No customer-facing economic output unless a later contract authorizes the
  exact scope.

## Build Implications

1. Use the Data Boundary and ROI Evidence Contract before building stronger
   value or ROI surfaces.
2. Add a first-class `value_evidence_case` schema before further UI expansion.
3. Treat the VBD map as the operating diagnosis, not as a score.
4. Use the metrics library to narrow outcome selection by function and value
   route.
5. Move scenario, proof, caveats, and decisions into the Value Evidence Case.
6. Add retest objects so the system learns whether interventions moved VBD and
   the customer-owned outcome metric.
