# Customer Support AI Value Validation Workshop Kit

## Purpose

This Phase 5 kit turns the Phase 4 dry run into a customer validation workshop.
It gives an AIOM a customer-ready packet for confirming whether the Customer
Support AI Value Evidence Pack can move from internal dry run to governed pilot
packet.

The workshop has one decision question:

```text
Can the customer approve the aggregate source coverage, support outcome
definitions, baseline/comparison windows, and assumption ledger needed for a
caveated support value investigation?
```

This kit is docs-only. It can validate whether trusted aggregate evidence is
ready for ROI metric routing and governed scenario review. It does not
authorize realized ROI calculation, causality claims, individual scoring, HR
analytics, dashboards, connectors, schemas, APIs, or runtime implementation.

Source artifacts:

- [Customer Support AI Value pilot dry run](./customer-support-pilot-dry-run.md)
- [Customer Support AI Value pilot design](./customer-support-pilot-design.md)
- [Customer Support AI Value Evidence Pack](./examples/customer-support-value-evidence-pack.md)

## Customer Pre-Read

Send this pre-read before the workshop.

```markdown
# Customer Support AI Value Validation Workshop Pre-Read

## What We Are Validating

We are validating whether aggregate customer-support workflow evidence can
support a caveated AI value investigation.

The goal is not to prove ROI. The goal is to confirm whether the evidence is
ready enough to select ROI or value metrics and say:

"This support workflow is a candidate for governed value investigation, and
these customer-owned signals can test the value hypothesis."

## What We Need From You

Please come prepared to confirm:

- the support workflow slice we should review;
- the baseline and comparison windows;
- the aggregate support metrics available for those windows;
- who owns the metric definitions;
- which business assumptions may explain outcome movement;
- whether any source-coverage gaps should hold interpretation.

## What We Will Not Ask For

We will not ask for names, emails, employee IDs, user-level rows, manager
chains, ticket text, prompts, responses, transcripts, files, person-level HRIS
records, hashed or joinable person identifiers, training records, survey
responses, compensation data, performance data, or workforce-planning data.
Aggregate workforce context may be accepted only if the customer provides it
at a cohort-safe approved grain.

## What The Workshop Produces

By the end, we will choose one of four outcomes:

- proceed to a governed pilot packet;
- hold for missing assumptions;
- hold for missing source coverage;
- stop and return to governance review.
```

## Recommended Attendees

| Role | Why they are needed |
| --- | --- |
| AIOM | Facilitates the evidence boundary, safe language, and decision gate. |
| Customer support business sponsor | Owns the workflow value hypothesis and primary value route. |
| Support operations owner | Confirms case population, volume context, channel mix, and operational changes. |
| Support data owner | Confirms metric definitions, window comparability, and aggregate export feasibility. |
| Knowledge or AI workflow owner | Confirms knowledge-base, Skill, agent, or AI rollout context. |
| Governance or privacy reviewer, optional | Confirms the aggregate-only boundary if the customer requires review. |

Do not require HR, people analytics, training, enablement, compensation, or
performance-management stakeholders for this workshop.

## Workshop Agenda

Recommended duration: 60 minutes.

| Time | Topic | Output |
| --- | --- | --- |
| 0-5 min | Confirm workshop boundary | Agreement that the session validates aggregate evidence readiness, not ROI. |
| 5-12 min | Confirm workflow slice | Approved workflow family and eligible case population. |
| 12-20 min | Confirm windows | Baseline and comparison windows, plus any seasonality or incident caveats. |
| 20-32 min | Review aggregate data request | Present, missing, held, or not applicable state for each requested aggregate field. |
| 32-45 min | Complete assumption ledger | Customer-owned assumptions marked present, missing, held, or not applicable. |
| 45-52 min | Choose value route | Primary pilot story selected: capacity, quality, cost, or experience. |
| 52-58 min | Apply decision gates | Proceed, hold, stop, or route to governed ROI metric modeling. |
| 58-60 min | Confirm next owner and date | Owner for missing evidence and date for packet regeneration or hold review. |

## Approved Aggregate Data Request

The customer or approved source owner may provide only aggregate rows for the
approved support workflow slice and approved windows.

| Data family | Required? | Approved aggregate fields | Not allowed |
| --- | --- | --- | --- |
| Pilot identity | Required | workflow family, baseline window, comparison window, value hypothesis | customer person identifiers |
| Case population | Required | total cases, eligible cases, excluded cases, exclusion reason counts | ticket IDs, ticket text, customer names |
| AI activity | Required if available | aggregate Search sessions, Assistant sessions, Skill invocations, agent runs | prompts, responses, transcripts, user-level logs |
| Trust and friction context | Required if available | aggregate verification-attached episodes, recovery episodes, abandonment episodes, QA exception counts | action rows, reviewer names, comments |
| Resolution time | Required | median or p75 resolution time by window | per-ticket timestamps or agent-level time rows |
| Escalation | Required | aggregate escalation rate by window | escalation notes, assignee names |
| Rework or quality | Required | aggregate reopen rate, correction rate, or QA exception rate by window | raw QA notes, ticket text |
| Backlog | Optional but recommended | aggregate backlog count or aged-backlog share by window | ticket-level backlog rows |
| Customer experience | Optional | aggregate CSAT, NPS, or sentiment band by window | verbatim comments, respondent identity |
| Assumptions | Required | assumption state, owner, caveat text | HR, compensation, performance, training, or survey rows |

## Source-Coverage Checklist

Use this checklist during the workshop.

| Lane | Customer answer | Ready state | Hold condition |
| --- | --- | --- | --- |
| AI activity |  | `PRESENT` when aggregate activity exists for the approved support slice. | Hold if activity is unavailable, not approved, or not aligned to the workflow. |
| Workflow |  | `PRESENT` when the workflow family and eligible cases are approved. | Hold if the workflow definition is too broad or ambiguous. |
| Outcome |  | `PRESENT` when aggregate support KPIs exist for both windows. | Hold if outcome evidence is missing or only available as raw rows. |
| Baseline |  | `PRESENT` when baseline and comparison windows are declared before interpretation. | Hold if no comparable baseline exists. |
| Trust |  | `PRESENT` when verification, recovery, abandonment, QA, or attestation context is available or explicitly not applicable. | Hold if trust context is required but unavailable. |
| Assumptions |  | `PRESENT` when required assumptions are owned and marked. | Hold if material assumptions are missing. |
| Suppression |  | `PRESENT` when existing fail-closed verdict state is available. | Suppress downstream value language if existing gates suppress the slice. |

Allowed states: `PRESENT`, `MISSING`, `HELD`, `NOT_COMPUTED`,
`NOT_APPLICABLE`, `SUPPRESSED`.

These are workshop evidence states, not new suppression reasons.

## Assumption-Ledger Worksheet

Complete this worksheet before any executive-facing value narrative.

| Assumption | Customer prompt | State | Owner | Impact if missing |
| --- | --- | --- | --- | --- |
| Case mix stability | Was the baseline case mix similar enough to the comparison case mix for directional review? |  | Support operations | Keeps all value language caveated. |
| Volume context | Did total support volume materially change across windows? |  | Support operations | Blocks stronger capacity interpretation. |
| Staffing and coverage context | Did staffing, queue coverage, outsourcing, or scheduling materially change? |  | Support leader | Blocks productivity or staffing interpretation. |
| Channel mix context | Did chat, email, phone, self-service, or partner channel mix materially change? |  | Support operations | Keeps resolution-time movement caveated. |
| Process or policy context | Did routing, SLA, policy, support process, or tooling materially change? |  | Business sponsor | Blocks causal or quality interpretation. |
| Knowledge-base context | Did major content, knowledge-base, or support enablement changes occur? |  | Knowledge owner | Keeps Search/Assistant narrative caveated. |
| Metric definition stability | Were KPI definitions and measurement methods stable across windows? |  | Data owner | Blocks stronger outcome comparison. |
| AI rollout context | What AI workflow, Skill, agent, enablement, or process rollout occurred and when? |  | AIOM and business sponsor | Blocks the workflow-value hypothesis. |
| Customer experience context | Is aggregate CSAT, NPS, or experience evidence available and approved? |  | CX owner | Keeps experience route incomplete. |

Allowed states: `PRESENT`, `MISSING`, `HELD`, `NOT_APPLICABLE`.

## Decision Gates

Apply these gates at the end of the workshop.

| Gate | Pass condition | Fail-closed outcome |
| --- | --- | --- |
| Workflow fit | Workflow family and eligible case population are customer-approved. | `HOLD_FOR_SCOPE` |
| Aggregate safety | Requested data excludes person-level rows and raw content. | `STOP_FOR_GOVERNANCE_REVIEW` |
| Source coverage | AI activity, workflow, outcome, baseline, trust, assumptions, and suppression states are recorded. | `HOLD_FOR_SOURCE_COVERAGE` |
| Outcome fit | Metrics test the selected value route. | `HOLD_FOR_OUTCOME_ALIGNMENT` |
| Baseline discipline | Baseline and comparison windows are declared before interpretation. | `HOLD_FOR_BASELINE` |
| Assumption ownership | Material assumptions have owners and states. | `HOLD_FOR_ASSUMPTIONS` |
| Claim governance | Safe and blocked language are accepted by AIOM and sponsor. | `STOP_FOR_GOVERNANCE_REVIEW` |

## Safe Talk Track

Use this talk track with the customer.

```text
The purpose of this workshop is to validate whether aggregate support evidence
is ready for a governed AI value investigation. We are not trying to prove ROI,
attribute causality, score employees, compare teams, or measure productivity.

If the aggregate sources and assumptions are ready, the strongest claim we can
make is that this support workflow is a candidate for value investigation and
that customer-owned support metrics can test the hypothesis. If trust, source
coverage, outcome evidence, baseline rules, and assumptions are accepted, the
record can route to governed ROI metric modeling. If evidence is missing or not
approved, the packet will hold or suppress the value language.
```

## Safe Language

The AIOM may use these statements if the relevant workshop gates pass:

- Aggregate evidence can support a bounded value investigation for the support
  case-resolution workflow.
- Customer-owned support metrics can test whether AI-assisted work is
  associated with movement in resolution time, escalation, rework, backlog, or
  customer experience.
- Accepted aggregate evidence can route into ROI metric selection and governed
  scenario review.
- The readout remains caveated because outcome movement may be explained by
  case mix, volume, staffing, channel mix, process changes, or metric changes.
- Missing evidence will produce hold language rather than a stronger claim.

## Blocked Language

Do not use these statements:

- Glean proved ROI.
- Glean caused productivity lift.
- AI usage generated cost savings.
- The support team saved a specific number of hours.
- A person, manager, team, function, or department performed better with AI.
- Raw ticket text, prompts, responses, transcripts, or files explain the value.
- Person-level HRIS, survey, training, enablement, compensation, performance,
  or workforce data is required for this pilot. Aggregate workforce context is
  optional and must remain cohort-safe and customer-approved.

## Post-Workshop Outcomes

Choose exactly one outcome.

| Outcome | Use when | Next action |
| --- | --- | --- |
| `PROCEED_TO_GOVERNED_PACKET` | Scope, aggregate data, windows, assumptions, and safe language are confirmed. | Regenerate the Customer Support AI Value Evidence Pack with customer-approved aggregate inputs. |
| `ROUTE_TO_ROI_METRIC_MODELING` | Scope, trust, source coverage, outcome evidence, baseline/comparison rules, and assumptions are accepted. | Generate or update the governed ROI scenario with customer-approved metrics and caveats. |
| `HOLD_FOR_ASSUMPTIONS` | Outcome metrics are present, but assumptions are incomplete. | Assign owners for missing assumptions and reconvene before executive narrative. |
| `HOLD_FOR_SOURCE_COVERAGE` | A required source lane is missing, held, or not aligned. | Fix source coverage or narrow the workflow slice. |
| `HOLD_FOR_BASELINE` | No comparable baseline exists. | Select a governed baseline or keep the packet internal-only. |
| `STOP_FOR_GOVERNANCE_REVIEW` | The requested path requires raw data, person-level HR analytics, HRIS inference, scoring, ranking, ROI proof, causality, dashboard, connector, or runtime implementation. | Stop the pilot motion and return to governance review. |

Recommended default from the Phase 4 dry run:

`HOLD_FOR_ASSUMPTIONS` until the customer completes the assumption-ledger
worksheet. Internal AIOM review may continue, but executive value language
should remain caveated.

## Follow-Up Note Template

```markdown
# Customer Support AI Value Validation Workshop Follow-Up

## Decision

- Outcome:
- Rationale:

## Confirmed Scope

- Workflow family:
- Baseline window:
- Comparison window:
- Primary value route:

## Confirmed Aggregate Sources

| Lane | State | Owner | Follow-up |
| --- | --- | --- | --- |
| AI activity |  |  |  |
| Workflow |  |  |  |
| Outcome |  |  |  |
| Baseline |  |  |  |
| Trust |  |  |  |
| Assumptions |  |  |  |
| Suppression |  |  |  |

## Open Assumptions

| Assumption | Owner | Due date |
| --- | --- | --- |
|  |  |  |

## Safe Next Message

We confirmed whether the support workflow has enough aggregate evidence for a
caveated value investigation. We are not claiming ROI proof, causality,
productivity, or team performance. If the remaining trust, source, baseline,
outcome, and assumption checks pass, the next step is governed ROI metric
modeling; otherwise, complete the missing evidence items before generating or
sharing a stronger pilot packet.
```

## Governance Boundary

This workshop kit preserves the FluencyTracr boundary:

- no new canonical events;
- no new suppression reasons;
- no tunable thresholds;
- no admin overrides;
- no individual scoring or person-level attribution;
- no team, manager, department, function, customer, or Skill ranking;
- no raw prompts, ticket text, responses, transcripts, file content, tool
  payloads, or action rows;
- no person-level HRIS, directory, survey, training, enablement,
  compensation, performance, or workforce-planning joins;
- no hashed or joinable person identifiers, people decisioning, HRIS inference
  from AI usage, or manager/team comparative ordering;
- no realized ROI calculation, dollarized savings, hours-saved proof,
  productivity lift, causality, prediction, dashboard, connector, API, schema,
  or runtime implementation.
