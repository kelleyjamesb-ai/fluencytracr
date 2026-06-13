# Outcome Evidence

Audience: Chris Lee's AIOM workflow, Paul Li's value pipeline, and customer
data engineers attaching systems-of-record KPIs to FluencyTracr verdicts.

Outcome Evidence is the storage-and-replay bridge for customer-attested
aggregate KPI outcomes. It lets a customer attach a metric such as Jira cycle
time, Veeva approval time, ticket deflection, NPS, or aggregate
time-to-productivity by cohort to a workflow period without FluencyTracr
building a connector to that source system.

## Contract

`POST /api/v1/outcome-evidence` stores one aggregate observation:

```json
{
  "workflow_id": "manager-review-writer",
  "outcome_metric": "jira_cycle_time",
  "outcome_unit": "days",
  "period_start": "2026-05-01T00:00:00.000Z",
  "period_end": "2026-05-15T00:00:00.000Z",
  "aggregate_value": 4.2,
  "cohort_size": 12,
  "source_system": "Jira",
  "jbtd_id": "manager_review",
  "persona_id": "people_manager"
}
```

`GET /api/v1/outcome-evidence?workflow_id=manager-review-writer&period_start=2026-05-01T00:00:00.000Z&period_end=2026-05-15T00:00:00.000Z`
returns the unchanged workflow verdict, Reliability Factor, AIVM tags, and
matching outcome evidence. Consumers decide how to compare those values.

## Guardrails

- `cohort_size < 5` is rejected as `INSUFFICIENT_VOLUME`.
- `aggregate_kind: "team_level_kpi"` may attest a known aggregate KPI with
  `cohort_size >= 1`; FluencyTracr stores that customer attestation verbatim.
- Periods must span at least seven days, end after they start, and not end in
  the future.
- Unknown fields are rejected.
- Free-form customer metadata may not use field names containing `user`,
  `email`, `name`, or `id`.
- `jbtd_id` and `persona_id` are opaque join keys and do not weaken gates.
- HRIS-derived outcome evidence is allowed only as aggregate, cohort-safe,
  customer-approved workforce context for workflow-level value measurement.
  Person-level HRIS records, direct identifiers, hashed or joinable person
  identifiers, individual productivity, people decisioning,
  compensation/performance inference, promotion/discipline inference,
  manager/team ranking, attrition prediction, and HRIS inference from AI usage
  remain blocked.

## Non-Goals

FluencyTracr does not compute correlations, causation, lift, attribution,
dollarization, or hours from outcome evidence. It does not validate or audit
customer-attested numbers and does not provide a browsing UI. Outcome evidence
never changes a `SUPPRESS` verdict to `SURFACE`.

## Worked Example

A customer data engineer posts Jira cycle time for `manager-review-writer`
for a two-week period. The GET endpoint returns that cycle-time observation
beside the workflow verdict and Reliability Factor for the same window. Paul
Li's pipeline or Chris Lee's AIOM dashboard can then decide how to analyze the
relationship externally. FluencyTracr only stores the aggregate KPI and replays
it beside the existing verdict.
