# Executive Readout V2

## Purpose

Executive Readout V2 turns the ROI Scenario and EBITA Impact Bridge into a
governed decision artifact. It is meant to help an executive sponsor decide
what value claim is supportable, what remains blocked, and what evidence or
intervention is needed next.

It is not a dashboard, ROI calculator, EBITA calculator, financial model, or
proof of causality.

## Product Spine

```text
AI Fluency baseline
-> VBD operating map
-> Function outcome metric
-> Value evidence case
-> ROI Scenario
-> EBITA Impact Bridge
-> Executive Readout V2
-> Intervention or retest decision
```

The readout answers seven executive questions:

1. What AI-enabled workflow changed?
2. What business outcome moved?
3. What evidence quality supports the claim?
4. What financial or EBITA lever may be implicated?
5. What claim is allowed?
6. What claim is blocked?
7. What evidence or intervention is needed next?

## EBITA Impact Summary

The executive packet may include an optional `ebita_impact_summary` section. The
section is allowed only as governed language around evidence quality and claim
permission. It carries:

- EBITA bridge status;
- realized EBITA, customer-facing, and causality permission flags;
- primary EBITA levers;
- adoption, workflow, outcome, financial, and overall confidence evidence;
- allowed phrases;
- required caveats;
- blocked claims; and
- next evidence actions.

This section does not contain dollar values. Dollarized claims remain blocked
unless the upstream ROI Scenario financial claim gate allows `dollarized_output`.
Realized EBITA language remains blocked unless the EBITA bridge policy allows
realized EBITA and the overall evidence is finance validated.

## Status Levels

| Status | Meaning |
| --- | --- |
| `NO_FINANCIAL_TRANSLATION` | The evidence is not sufficient to translate AI work into financial or EBITA language. |
| `DIRECTIONAL_EBITA_BRIDGE` | The workflow may map to an EBITA lever, but no realized financial claim is allowed. |
| `MODELED_EBITA_SCENARIO` | Customer-owned assumptions can support a model, but finance validation is still required. |
| `FINANCE_VALIDATED_EBITA_CASE` | Finance-attested assumptions support guarded language for the stated workflow and window. |
| `CUSTOMER_FACING_APPROVED` | Customer-facing economic language is approved only when both ROI and EBITA gates permit it. |

## Evidence Rules

Usage telemetry cannot produce ROI or EBITA claims by itself. Adoption evidence
can show that AI-enabled work is happening, but financial language requires
workflow evidence, accepted customer-owned outcome evidence, baseline and
comparison windows, customer-owned financial assumptions, and the relevant
approval state.

Financial language must match the evidence level:

- directional evidence supports only caveated value-route language;
- modeled evidence supports only customer-owned scenario language;
- finance validation supports only scoped finance-validated language; and
- customer-facing economic output requires explicit customer-facing approval.

Causality language requires an experimental or quasi-experimental evidence
design. Without that design, the readout must avoid causal language.

## Workforce Analytics Boundary

Aggregate workforce analytics can support context only. They may help explain
aggregate readiness, enablement coverage, training completion, confidence,
change readiness, workflow capacity, or role-family adoption.

Blocked uses include individual productivity measurement, named employee claims, manager or team ranking, HRIS inference, people decisioning, compensation or performance inference, and headcount-reduction justification.

## Next Evidence Actions

The readout should tell the sponsor what to do next, not just label the case.
Common next actions include:

- attach customer-owned financial assumptions;
- confirm finance owner and approval state;
- attach accepted customer-owned outcome evidence for the same workflow and
  window;
- confirm baseline and comparison windows;
- avoid causal language until experimental or quasi-experimental evidence is
  available; and
- keep economic language internal or caveated until customer-facing approval is
  granted.

## Implementation Boundary

This concept authorizes a deterministic shared object and readout-rendering
layer only. It does not authorize frontend UI, backend routes, database schema,
production connectors, ML, scoring weights, dashboards, autonomous customer
actions, raw prompt or response storage, direct identifiers, individual scoring,
manager ranking, HRIS inference, headcount-reduction claims, unsupported ROI
proof, or unsupported causality claims.
