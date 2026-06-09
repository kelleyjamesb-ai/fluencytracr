# Customer Support AI Value Pilot Dry Run

## Purpose

This Phase 4 dry run fills the Phase 3 AIOM handoff template using the seeded
Customer Support AI Value Evidence Pack.

It is an AIOM-ready review artifact, not a customer-facing ROI readout. It
tests whether the current MVP can translate aggregate support workflow evidence
into a governed pilot decision.

Source artifacts:

- [Customer Support AI Value Evidence Pack](./examples/customer-support-value-evidence-pack.md)
- [Seeded support input](./examples/customer-support-seeded-input.json)
- [Phase 3 pilot design](./customer-support-pilot-design.md)

## Readiness Decision

Decision: `PROCEED_WITH_CAVEATED_AIOM_REVIEW`

Rationale:

- aggregate AI work evidence is present for the support workflow slice;
- customer-owned support outcome signals are present in the seeded fixture;
- existing FluencyTracr verdict is `SURFACE`;
- claim confidence is `CAVEATED`, not ROI proof;
- the broader customer-owned assumption ledger is incomplete and must be
  confirmed before any stronger executive value narrative.

Do not use this dry run to claim realized ROI, savings, causality,
productivity lift, individual performance, team ranking, manager comparison, or
HR analytics.

## Approved Scope

| Field | Dry-run value |
| --- | --- |
| Organization label | `org-northstar-enterprise` |
| Workflow family | `customer_support_case_resolution` |
| Baseline window | `2026-02-01_to_2026-03-31` |
| Comparison window | `2026-04-01_to_2026-05-31` |
| Evidence window | `2026-04-01_to_2026-05-31` |
| Primary value route | `CAPACITY_CREATION` |
| Secondary value routes | `COST_REDUCTION`, `QUALITY_IMPROVEMENT`, `EXPERIENCE_IMPROVEMENT` |
| Workflow value hypothesis | AI-assisted support work may be associated with faster case resolution, lower escalation, and improved knowledge reuse. |
| Customer business sponsor | Customer Support business sponsor, confirmation required |
| Data/source owner | Customer support operations and support data owner |
| AIOM owner | AIOM pilot owner |

## Source Coverage

| Lane | State | Notes |
| --- | --- | --- |
| AI activity | `PRESENT` | Aggregate Search and Assistant activity is present for the support workflow slice. |
| Workflow | `PRESENT` | The dry run uses one workflow family: `customer_support_case_resolution`. |
| Outcome | `PRESENT` | Seeded support KPIs include resolution time, escalation rate, reopen rate, and backlog count. |
| Baseline | `PRESENT` | Baseline and comparison windows are declared before interpretation. |
| Trust | `PRESENT` | Verification, recovery, and abandonment aggregate signals are present. |
| Assumptions | `CAVEATED` | One assumption is present in the seeded input; the full customer-owned ledger still needs confirmation. |
| Suppression | `PRESENT` | Verdict is `SURFACE`; suppression reason is `none`. |

## Aggregate AI Work Evidence

| Evidence signal | Seeded aggregate value | Interpretation |
| --- | ---: | --- |
| Assistant sessions | 1,840 | AI-assisted knowledge access is observable. |
| Search sessions | 2,260 | Search activity is present in the same support slice. |
| Skill invocations | 312 | Reusable support workflow behavior may be emerging. |
| Agent runs | 148 | Delegated or agentic support workflow behavior may be emerging. |
| Verification-attached episodes | 780 | Supports quality and trust review, but does not prove correctness. |
| Recovery episodes | 96 | Indicates friction and recovery context. |
| Abandonment episodes | 41 | Indicates friction and workflow reliability caveats. |

## Outcome Signals

These signals support a bounded value investigation only. They do not calculate
ROI, savings, hours saved, productivity, attribution, or causality.

| Signal | Present? | Baseline | Comparison | Directional movement | Customer owner | Caveat |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Median resolution time | Yes | 18.4 hours | 15.1 hours | 3.3 hours lower | Customer support operations | Do not translate into hours saved without a separate customer-owned study. |
| Escalation rate | Yes | 18.0% | 14.0% | 4.0 percentage points lower | Customer support operations | Case mix, routing, and staffing may explain movement. |
| Reopen rate | Yes | 7.5% | 6.1% | 1.4 percentage points lower | Customer support operations | QA policy, knowledge base, or channel mix may explain movement. |
| Backlog count | Yes | 1,240 cases | 1,102 cases | 138 fewer cases | Customer support operations | Backlog movement is context, not realized value proof. |
| CSAT/NPS | No | Not provided | Not provided | `MISSING` | Customer experience owner | Experience route remains incomplete until approved aggregate CX evidence is attached. |

## Assumption Ledger

| Assumption | State | Owner | Claim impact |
| --- | --- | --- | --- |
| Case mix stability | `PRESENT` | Customer support operations | Seeded input says support volume mix is similar enough for directional review. |
| Volume context | `CAVEATED` | Customer support operations | Needs customer confirmation before capacity language is strengthened. |
| Staffing and coverage context | `MISSING` | Support leader | Blocks productivity or staffing interpretation. |
| Channel mix context | `MISSING` | Customer support operations | Keeps resolution-time interpretation caveated. |
| Process or policy context | `MISSING` | Business sponsor | Blocks causal or quality interpretation. |
| Knowledge-base context | `MISSING` | Knowledge owner | Keeps Search/Assistant value narrative caveated. |
| Metric definition stability | `MISSING` | Data owner | Must be confirmed before broader executive reporting. |
| AI rollout context | `MISSING` | AIOM and business sponsor | Must be confirmed before tying the window to a declared rollout. |

## Claim Confidence

Overall state: `CAVEATED`

| Claim type | State | Reason |
| --- | --- | --- |
| `support_value_investigation` | `SUPPORTED` | Aggregate AI work evidence and support outcome context support a bounded value-investigation claim. |
| `capacity_creation_hypothesis` | `CAVEATED` | Capacity movement is directionally aligned but remains associational and assumption-bound. |
| `roi_proof` | `BLOCKED` | The packet does not prove ROI or causality. |

## Safe Language

AIOMs may use the following language in an internal pilot review:

- Aggregate evidence suggests the support case-resolution workflow is a
  candidate for value investigation.
- Search, Assistant, Skills, and agent activity are observable in the support
  workflow slice.
- Support outcome data can test whether AI-assisted work is associated with
  movement in resolution time, escalation rate, reopen rate, and backlog.
- The current dry run is caveated because outcome movement is associational and
  customer-owned assumptions are incomplete.
- The next customer conversation should validate source coverage, assumption
  ownership, and the primary value route before any executive value narrative.

## Blocked Language

AIOMs must not use the following language:

- Glean proved ROI for the support organization.
- Glean caused productivity lift.
- AI usage generated cost savings.
- The support team saved a specific number of hours.
- A person, manager, team, function, or department performed better with AI.
- Raw ticket text, prompts, responses, transcripts, or files explain the
  outcome movement.
- HRIS, survey, training, enablement, compensation, performance, or workforce
  data is needed for this dry run.

## AIOM Talk Track

Use this concise talk track for internal review:

```text
This dry run shows that the support case-resolution workflow is a viable
candidate for governed value investigation. We have aggregate AI activity,
support outcome signals, and a SURFACE verdict, so the packet can support
caveated investigation language. It cannot support ROI, causality,
productivity, savings, or team-performance claims. The next step is to confirm
the customer-owned assumption ledger and choose the primary value route before
turning this into an executive pilot story.
```

## Next-Step Recommendation

Recommended next step: `CUSTOMER_VALIDATION_WORKSHOP`

Workshop objective:

Confirm whether the customer can approve the aggregate source coverage,
baseline/comparison windows, and assumption ledger required to turn this dry
run into a governed pilot packet.

Agenda:

1. Confirm the support workflow slice and eligible case population.
2. Confirm baseline and comparison windows.
3. Validate support outcome definitions and metric stability.
4. Complete the assumption ledger.
5. Choose one primary value route for pilot storytelling.
6. Re-run or regenerate the evidence pack only after customer-owned assumptions
   are marked present, missing, held, or not applicable.

Decision options after the workshop:

| Decision | When to choose it |
| --- | --- |
| `PROCEED_TO_GOVERNED_PACKET` | Source coverage, outcome evidence, windows, and assumptions are confirmed. |
| `HOLD_FOR_ASSUMPTIONS` | Outcome metrics are present, but business assumptions are incomplete. |
| `HOLD_FOR_SOURCE_COVERAGE` | AI activity, workflow, outcome, baseline, or trust lanes are missing or held. |
| `STOP_FOR_GOVERNANCE_REVIEW` | Any proposed path requires raw data, HR analytics, ROI proof, causality, scoring, ranking, or runtime implementation. |

Current dry-run recommendation:

`HOLD_FOR_ASSUMPTIONS` before any executive-facing value narrative, while
proceeding with internal AIOM review.

## Governance Review

This dry run preserves the FluencyTracr governance boundary:

- no new canonical events;
- no new suppression reasons;
- no tunable thresholds;
- no admin overrides;
- no individual scoring or person-level attribution;
- no team, manager, department, function, customer, or Skill ranking;
- no raw prompts, ticket text, responses, transcripts, file content, tool
  payloads, or action rows;
- no HRIS, directory, survey, training, enablement, compensation, performance,
  or workforce-planning joins;
- no ROI calculation, dollarized savings, hours-saved proof, productivity
  lift, causality, prediction, dashboard, connector, API, schema, or runtime
  implementation.
