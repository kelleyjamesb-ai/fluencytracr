# EBITA Impact Bridge

## Purpose

The EBITA Impact Bridge is a governed translation layer after ROI Scenario and
before Executive Packet. It asks whether validated workflow value evidence can
be responsibly translated into an EBITA-relevant financial lever.

It is not an AI adoption score, usage score, productivity score, or ROI
calculator. It classifies the evidence posture for a financial translation; it
does not compute EBITA.

## Product Spine

```text
Blueprint
-> Metrics Library
-> Value Scenario
-> Evidence Readiness
-> Claim Boundary
-> ROI Scenario
-> EBITA Impact Bridge
-> Executive Packet
```

The bridge inherits claim permission from the ROI Scenario financial claim
gate. It cannot unlock stronger financial language than the upstream ROI gate
allows.

## What It Does

- maps customer-owned value routes to EBITA-relevant drivers;
- records the business metric that would support the lever;
- records whether customer-owned financial assumptions exist;
- classifies evidence quality as missing, directional, caveated, supported,
  finance-validated, or blocked;
- controls safe language, required caveats, and blocked claims;
- declares whether the bridge can feed an executive readout or
  customer-facing economic output.

## What It Does Not Do

The EBITA Impact Bridge does not calculate EBITA from:

- AI usage alone;
- prompt volume;
- seat activation;
- monthly active users;
- time saved without workflow and business-outcome validation;
- individual productivity;
- named employee behavior;
- manager, team, or department comparison;
- HRIS-linked people analytics.

## Evidence Requirements

Directional EBITA language is allowed only as a caveated bridge from workflow
evidence to possible financial levers. It must state that no realized EBITA
claim is made.

Modeled EBITA scenarios require customer-owned financial assumptions and
supported or finance-validated financial evidence. The actual dollar math
remains customer-owned and finance-reviewed.

Finance-validated EBITA cases require finance-attested assumptions and a source
ROI Scenario gate in `FINANCE_VALIDATED` or `CUSTOMER_FACING_APPROVED` mode.
Realized EBITA language also requires the source ROI Scenario to allow realized
financial calculation with aggregate-only evidence, baseline, comparison,
accepted outcome metric, investment costs, finance owner attestation, and
confounds review.

Customer-facing EBITA output requires source ROI Scenario approval in
`CUSTOMER_FACING_APPROVED` mode, finance owner attestation, governance approval,
and `allowed_outputs.customer_facing_economic_output = true`.

Causality language requires source ROI Scenario approval for
`causality_language` and an experimental or quasi-experimental design flag.
Without that design, causality remains blocked or caveated.

## EBITA Driver Mapping

| Value route | Allowed EBITA drivers |
| --- | --- |
| `REVENUE_EXPANSION` | `REVENUE_GROWTH`, `RETENTION_OR_EXPANSION` |
| `COST_REDUCTION` | `OPERATING_COST_REDUCTION` |
| `CAPACITY_CREATION` | `CAPACITY_CREATION`, `OPERATING_COST_REDUCTION` |
| `QUALITY_IMPROVEMENT` | `QUALITY_COST_REDUCTION`, `RETENTION_OR_EXPANSION` |
| `RISK_REDUCTION` | `RISK_LOSS_REDUCTION` |
| `EXPERIENCE_IMPROVEMENT` | `RETENTION_OR_EXPANSION` |
| `UNCLASSIFIED` | none |

## Workforce Analytics Boundary

Aggregate workforce analytics can support context only. They may help explain
readiness, enablement coverage, training completion, confidence, change
readiness, capacity, or role-family adoption when aggregate safety checks pass.

They must never become individual scoring, HRIS inference, manager ranking,
`manager_or_team_ranking`, productivity ranking, people decisioning, compensation inference,
or headcount-reduction justification.

## Blocked Claims

The bridge must always block:

- usage proves EBITA;
- AI caused EBITA without causal design;
- AI justifies headcount reduction;
- individual productivity claims;
- `manager_or_team_ranking`.

It must also reject safe-language phrases that imply AI proved ROI, AI caused
EBITA, AI saved a dollar amount from usage, headcount reduction, employee
productivity lift, or manager/team underperformance.

## Implementation Boundary

This concept authorizes only a deterministic shared object layer and validator.
It does not authorize frontend UI, dashboards, backend routes, persistence,
connectors, scoring models, weights, machine learning inference, customer-facing
economic output, ROI proof, causality claims, productivity claims, individual
attribution, or `manager_or_team_ranking`.
