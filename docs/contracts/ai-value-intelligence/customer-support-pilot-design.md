# Customer Support AI Value Pilot Design

## Purpose

This packet defines Phase 3 of the AI Value Intelligence MVP: a docs-first
customer-side pilot design for the Customer Support AI Value Evidence Pack.

The pilot should answer one practical question:

```text
Can a customer provide aggregate support workflow evidence that lets
FluencyTracr generate a bounded, caveated value-readiness packet without
claiming ROI proof, causality, productivity, or person-level performance?
```

This packet is not an implementation plan for runtime ingest, dashboards,
connectors, schemas, APIs, person-level HR analytics, realized ROI
calculation, or economic output.

## Pilot Boundary

The pilot is scoped to one customer-approved support workflow family:

`customer_support_case_resolution`

Allowed interpretation:

- aggregate AI work activity is visible for a support workflow slice;
- aggregate support outcome metrics are present, missing, held, or suppressed;
- support value routes may be investigated;
- trusted aggregate evidence may route to ROI or value metric selection;
- claim language is safe, caveated, missing, suppressed, or blocked.

Blocked interpretation:

- Glean proved ROI;
- Glean caused support productivity lift;
- AI usage generated cost savings;
- a person, team, manager, function, or department performed better;
- raw ticket, prompt, response, transcript, file, or action content explains
  value;
- person-level HRIS, directory, survey, training, or enablement-system data is
  required. Aggregate workforce context is optional and only allowed when
  customer-approved, cohort-safe, and used for workflow-level value
  measurement.

## Approved Customer-Side Aggregate Inputs

All inputs must be generated inside the customer or approved source boundary.
Only aggregate rows, approved labels, and source-coverage states may be used in
the pilot packet.

| Input family | Approved aggregate fields | Required owner | Notes |
| --- | --- | --- | --- |
| Pilot identity | `org_id`, `window_id`, `workflow_family`, `workflow_value_hypothesis` | AIOM and customer business sponsor | Labels only; no customer person identifiers. |
| AI work evidence | `verdict`, existing `suppression_reason`, `cohort_size`, `window_days`, aggregate pattern counts | FluencyTracr evidence owner | Must preserve existing SURFACE/SUPPRESS posture and suppression reasons. |
| Support workflow volume | total cases, eligible case count, excluded case count, channel mix share | Customer support operations | Used for context and denominator quality only. |
| Resolution movement | median or p75 resolution time by approved window | Customer support operations | Directional investigation only; no time-saved calculation. |
| Escalation movement | aggregate escalation rate by approved window | Customer support operations | Tests friction/capacity hypothesis. |
| Rework movement | aggregate reopen rate, correction rate, or QA exception rate | Customer support operations | Tests quality hypothesis. |
| Backlog movement | aggregate backlog count or aged-backlog share | Customer support operations | Context for capacity/experience route. |
| Customer experience | aggregate CSAT, NPS, or sentiment band if already approved | Customer experience owner | Optional; no raw comments or transcripts. |
| Source coverage | present, missing, held, not computed, or suppressed by lane | Data owner and AIOM | Must be declared before interpretation. |
| Assumptions | customer-owned assumption rows | Business sponsor | Required for any capacity, cost, or experience narrative. |

Disallowed inputs:

- names, emails, employee IDs, user IDs, manager chains, titles, or person-level
  rows;
- raw tickets, prompts, responses, transcripts, comments, documents, file
  contents, query text, tool payloads, or action rows;
- person-level HRIS, directory, survey, training, enablement, compensation,
  performance, or workforce-planning records;
- hashed or joinable person identifiers;
- model-generated inferred teams, roles, managers, effort, productivity, or
  savings.

## Source-System Requirements

The customer must approve each source before the pilot packet can be treated as
ready for interpretation.

| Source | Minimum requirement | Not approved behavior |
| --- | --- | --- |
| Glean aggregate activity | Emits aggregate AI work counts for the approved support workflow slice. | Mark AI activity `missing` or `held`; do not infer usage from outcome movement. |
| Support ticketing or case system | Emits aggregate support KPIs for the same baseline and comparison windows. | Mark outcome evidence `missing`; emit no safe value claims. |
| Workflow definition source | Confirms the workflow family and eligible case population. | Mark workflow coverage `held`; do not interpret support value route. |
| Source-coverage declaration | Lists present, missing, held, not-computed, and suppressed lanes before readout. | Emit instrumentation-hold language. |
| Business assumption owner | Owns assumptions for case mix, staffing, seasonality, and process changes. | Keep claims caveated or missing; do not strengthen confidence. |

The pilot should not request direct access to customer systems. The customer or
approved source owner should export only the aggregate fields above.

## Baseline And Comparison Window Rules

The pilot must use one declared baseline window and one declared comparison
window.

| Rule | Requirement |
| --- | --- |
| Fixed windows | Baseline and comparison dates must be declared before interpretation. |
| Same slice | Both windows must use the same workflow family and eligible case definition. |
| Existing suppression gates | Existing time, volume, convergence, baseline-stability, and ambiguity gates remain authoritative. |
| No tunable thresholds | The pilot must not introduce customer-adjustable minimums. |
| No cherry-picking | Windows cannot be changed after seeing the packet to improve the story. |
| Seasonality note | Known seasonality, launches, incidents, staffing changes, or policy changes must be recorded in the assumption ledger. |
| Missing baseline | If no baseline exists, outcome confidence is `MISSING` or `INTERNAL_ONLY`; no safe value claim is emitted. |

Recommended pilot shape:

- baseline window: the most recent eligible pre-pilot support period;
- comparison window: the first eligible post-rollout or AI-assisted period;
- primary outcome route: choose one of capacity, quality, cost, or experience
  before interpreting results.

## Customer-Owned Assumption Ledger

The customer owns all business assumptions. FluencyTracr may carry the ledger
as caveat context and may use approved assumptions to route ROI or value metric
models for review, but must not convert assumptions into ROI proof, savings, or
causal proof.

| Assumption ID | Required statement | Owner | Blocks if missing |
| --- | --- | --- | --- |
| `support-case-mix-stability` | Whether baseline and comparison case mix are similar enough for directional review. | Support operations | Stronger capacity, cost, or quality language. |
| `support-volume-context` | Whether support volume changed materially across windows. | Support operations | Capacity interpretation. |
| `staffing-and-coverage-context` | Whether staffing, queue coverage, outsourcing, or schedule changes affected outcomes. | Support leader | Productivity or capacity narrative. |
| `channel-mix-context` | Whether chat, email, phone, or self-service mix changed. | Support operations | Resolution-time interpretation. |
| `process-policy-context` | Whether process, routing, SLA, policy, or tooling changes occurred. | Business sponsor | Causal and quality interpretation. |
| `knowledge-base-context` | Whether major knowledge-base changes occurred in the window. | Knowledge owner | Search/Assistant value narrative. |
| `metric-definition-stability` | Whether KPI definitions are stable across windows. | Data owner | Any outcome comparison. |
| `ai-rollout-context` | What AI workflow, enablement, Skill, or agent rollout occurred and when. | AIOM and business sponsor | Workflow-value hypothesis. |

Assumption states:

- `present`: customer owner supplied the assumption;
- `missing`: required assumption is absent;
- `held`: source owner has not approved use;
- `not_applicable`: explicitly not relevant to this pilot slice.

## Source-Coverage Checklist

Use this checklist before generating or sharing a pilot packet.

| Lane | Ready state | Fail-closed state |
| --- | --- | --- |
| AI activity | Aggregate activity is present for the approved workflow slice. | `MISSING` if no aggregate AI activity is available. |
| Workflow | Workflow family, eligible population, and excluded population are declared. | `HELD` if workflow definition is ambiguous. |
| Outcome | Customer-owned support KPIs are present for both windows. | `MISSING` if outcome evidence is absent. |
| Baseline | Baseline window is declared and comparable. | `MISSING` if no baseline exists. |
| Trust | Verification, recovery, abandonment, QA, or customer attestation context is present or explicitly unavailable. | `HELD` if trust context is required but unavailable. |
| Assumptions | Required customer-owned assumptions are present or explicitly marked not applicable. | `CAVEATED` or `MISSING` if assumptions are absent. |
| Suppression | Existing fail-closed suppression status is available per slice. | `SUPPRESSED` if any existing suppression gate blocks the slice. |

## Fail-Closed Evidence States

The pilot uses evidence states to prevent interpretation from outrunning proof.

| State | Meaning | Output behavior |
| --- | --- | --- |
| `PRESENT` | Required aggregate evidence is attached and approved. | May support bounded investigation language with caveats. |
| `MISSING` | Required evidence is absent. | Emit no safe value claims for that lane. |
| `HELD` | Evidence may exist but is not approved, aligned, or interpretable. | Emit instrumentation or governance-hold language. |
| `NOT_COMPUTED` | Lane has not been computed for the pilot. | Do not infer from adjacent lanes. |
| `SUPPRESSED` | Existing FluencyTracr suppression applies. | Block downstream value language. |
| `BLOCKED` | Input or claim violates governance. | Reject packet generation or list as blocked claim. |

These states are pilot evidence states, not new suppression reasons. Existing
suppression reasons remain unchanged.

## AIOM Handoff Template

Use this template when handing the pilot to a customer sponsor or internal
value-realization reviewer.

```markdown
# Customer Support AI Value Pilot Handoff

## Pilot Question

Can aggregate evidence show whether AI-assisted support case resolution is a
candidate for value investigation?

## Approved Scope

- Workflow family:
- Baseline window:
- Comparison window:
- Primary value route:
- Customer business sponsor:
- Data/source owner:
- AIOM owner:

## Source Coverage

| Lane | State | Notes |
| --- | --- | --- |
| AI activity |  |  |
| Workflow |  |  |
| Outcome |  |  |
| Baseline |  |  |
| Trust |  |  |
| Assumptions |  |  |
| Suppression |  |  |

## Outcome Signals

| Signal | Present? | Customer owner | Caveat |
| --- | --- | --- | --- |
| Resolution time |  |  |  |
| Escalation rate |  |  |  |
| Reopen or QA exception rate |  |  |  |
| Backlog movement |  |  |  |
| CSAT/NPS, if approved |  |  |  |

## Assumption Ledger

| Assumption | State | Owner | Claim impact |
| --- | --- | --- | --- |
| Case mix stability |  |  |  |
| Volume context |  |  |  |
| Staffing and coverage context |  |  |  |
| Channel mix context |  |  |  |
| Process or policy context |  |  |  |
| Metric definition stability |  |  |  |

## Safe Language

- Aggregate evidence suggests this support workflow is a candidate for value
  investigation.
- Support outcome data can test whether AI-assisted work is associated with
  movement in resolution time, escalation, rework, backlog, or customer
  experience.
- If trust, source coverage, baseline, outcome evidence, and assumptions are
  accepted, the record can move into ROI metric routing and governed scenario
  modeling.
- The claim is caveated because outcome movement is associational and may be
  explained by case mix, staffing, seasonality, channel mix, or process change.

## Blocked Language

- Glean proved ROI.
- Glean caused productivity lift.
- AI usage generated cost savings.
- A person, manager, team, function, or department saved hours or performed
  better.
- Raw ticket text, prompts, responses, or transcripts explain the value.

## Recommended Next Decision

- Proceed to governed packet generation.
- Hold for missing source coverage.
- Hold for missing outcome evidence.
- Hold for missing customer-owned assumptions.
- Stop and return to governance review.
```

## Pilot Acceptance Criteria

The pilot packet is ready only when all criteria are true:

- the workflow family is narrow and customer-approved;
- aggregate AI work evidence is present or explicitly suppressed;
- support KPI evidence is customer-owned and aggregated;
- baseline and comparison windows are declared before interpretation;
- source coverage is recorded for AI activity, workflow, outcome, baseline,
  trust, assumptions, and suppression;
- customer-owned assumptions are present or marked missing/held;
- unsafe inputs are absent;
- safe and blocked language are both included in the handoff;
- missing evidence produces `MISSING`, `HELD`, or `SUPPRESSED` language;
- suppressed AI work evidence blocks downstream value language;
- no claim says ROI proof, realized savings, causality, productivity lift,
  individual scoring, ranked group comparison, manager comparison, or HR
  inference. Aggregate workforce context may support interpretation only when
  customer-approved and cohort-safe.

## Stop Conditions

Stop the pilot and return to governance review if the path requires:

- new canonical events;
- new suppression reasons;
- tunable thresholds;
- admin overrides;
- runtime services, schemas, APIs, dashboards, or customer connectors;
- individual scoring or person-level attribution;
- team, manager, department, function, customer, or Skill ranking;
- raw prompts, responses, transcripts, ticket text, query text, file content,
  tool payloads, or action rows;
- person-level HRIS, directory, survey, training, enablement, compensation,
  performance, or workforce-planning joins;
- hashed or joinable person identifiers, people decisioning, HRIS inference
  from AI usage, or manager/team ranking;
- realized ROI calculation, dollarized savings, hours-saved proof,
  productivity lift, causality, prediction, or customer-facing economic output.

## Relationship To The MVP

This packet implements Phase 3 of
[AI_VALUE_INTELLIGENCE_MVP.md](../../concepts/AI_VALUE_INTELLIGENCE_MVP.md).
It is designed to feed the seeded contract in
[README.md](./README.md) and the generated support evidence-pack examples in
[`examples/`](./examples/).
