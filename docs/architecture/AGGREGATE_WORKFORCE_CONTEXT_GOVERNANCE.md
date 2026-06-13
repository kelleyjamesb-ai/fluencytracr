# Aggregate Workforce Context Governance

Status: active governance guidance

Phase: `phase-ai-value-aggregate-workforce-context-governance`

## Purpose

This document clarifies how FluencyTracr may use HRIS-derived and workforce
data in AI Value Platform evidence work.

Canonical principle:

> HRIS-derived data is allowed only as aggregate, cohort-safe,
> customer-approved workforce context for workflow-level value measurement.
> Person-level HRIS records, direct identifiers, hashed or joinable person
> identifiers, individual productivity measures, people decisioning,
> compensation/performance inference, promotion/discipline inference, manager
> ranking, team ranking, and HRIS inference from AI usage are prohibited.

## Why It Matters

Enterprise value measurement often needs workforce context. For example, a
support workflow value hypothesis may need aggregate role-family coverage,
new-hire cohort size, training completion, or capacity assumptions to explain
whether a measured workflow movement is plausible and useful.

That context is allowed only when it remains aggregate and customer-approved.
It must support workflow-level value measurement, not employee assessment,
manager comparison, workforce surveillance, or HR decisioning.

## Allowed Aggregate Workforce Context

Allowed examples include:

- aggregate new-hire cohort size by function;
- aggregate time-to-productivity by cohort;
- aggregate training completion by function;
- aggregate role-family coverage;
- aggregate workforce capacity context;
- aggregate hiring plan or avoided-hire assumption approved by the customer or
  finance owner.

Allowed contract shapes may use names such as:

- `aggregate_workforce_context`
- `aggregate_hris_derived_context`
- `aggregate_role_family_context`
- `aggregate_new_hire_cohort_context`
- `aggregate_training_completion_context`
- `aggregate_capacity_planning_context`

These fields can enter through a customer-approved aggregate export, Aggregate
Evidence Import, system-of-record Outcome Evidence, measurement-plan source
context, an assumption ledger, or customer-owned assumption state.

## Prohibited Data

FluencyTracr product state must not store or emit:

- person-level HRIS records;
- direct employee, user, or person identifiers;
- hashed, pseudonymous, tokenized, or otherwise joinable person identifiers;
- employee emails, names, manager IDs, manager chains, or manager views;
- individual productivity measures or individual scoring;
- people decisioning signals;
- compensation or performance inference;
- promotion or discipline inference;
- attrition prediction;
- manager ranking or team ranking;
- HRIS inference from AI usage.

## Hashed Or Pseudonymous Identifiers

Hashed or pseudonymous person-level identifiers are still person-level join
keys. They are prohibited in FluencyTracr product tables, evidence snapshots,
claim readiness snapshots, executive readout snapshots, exports, and UI.

They may be used only transiently inside an approved customer or warehouse
aggregation process to enforce k-min, deduplicate, or compute aggregate
metrics. They must be removed before any package crosses into FluencyTracr.

## Required Safeguards

Aggregate workforce context is allowed only when all of the following are true:

- `aggregate_only = true`;
- minimum cohort threshold is met;
- no direct identifiers are present;
- no hashed or joinable person identifiers are persisted;
- no person-level rows are stored;
- no manager/team ranking is possible;
- no people decisioning is supported;
- no sensitive attribute inference is performed;
- source owner approval is recorded;
- evidence is used only for workflow-level value measurement.

## Examples

| Example | Status | Reason |
| --- | --- | --- |
| Aggregate new-hire cohort size by support role family | Allowed | Cohort-safe workforce context for workflow measurement. |
| Aggregate time-to-productivity by new-hire cohort | Allowed | System-of-record outcome context when customer-approved and aggregate. |
| Training completion share by function | Allowed | Aggregate enablement context. |
| Hashed employee ID retained in an evidence snapshot | Prohibited | Joinable person identifier persisted in product state. |
| Manager chain attached to a value case | Prohibited | Person/org hierarchy data that enables manager views. |
| Attrition prediction from AI usage | Prohibited | HRIS inference from AI usage and people decisioning risk. |
| Ranking managers by AI-assisted productivity | Prohibited | Manager ranking and productivity measurement. |

## Relationship To Playbook Evidence Layers

Aggregate workforce context is usually Layer 3 system-of-record evidence or
assumption context. It may also qualify Layer 2 user-voice interpretation when
paired with aggregate AI Fluency baseline exports.

It is not Layer 1 telemetry. Glean telemetry can show aggregate work patterns;
it must not infer HRIS outcomes, employee performance, or people decisions.

## Relationship To Evidence Snapshots

Future `evidence_snapshots`, `claim_readiness_snapshots`, and
`executive_readout_snapshots` may reference aggregate workforce context only as
governed source context, outcome evidence, or customer-owned assumptions.

Snapshots must carry a privacy boundary showing aggregate-only use and false
flags for person-level HRIS records, hashed or joinable person identifiers,
person-level productivity, manager/team ranking, people decisioning,
compensation/performance inference, and HRIS inference from AI usage.

Missing or unapproved workforce context must remain missing, held, or caveated.
It must not be silently inferred from AI usage telemetry.
