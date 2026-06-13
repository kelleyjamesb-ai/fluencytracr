# Value Hypothesis Registry Contract

Schema version: `VHR_2026_05`

## Purpose

The Value Hypothesis Registry records CFO-legible hypotheses about where Glean may create business value. It does not prove causality or calculate ROI by itself. It defines what would need to be true, which indicators should be watched, which evidence is present, which evidence is missing, and which safe claim templates are enabled.

Use the registry to help answer:

> Which Glean-assisted work patterns are plausible value drivers, how mature is the evidence, and what can we safely say today?

## Required Fields

Each hypothesis includes:

- `hypothesis_id`
- `outcome_domain`
- `work_pattern`
- `target_maturity_stage`
- `expected_value_mechanism`
- `leading_indicators`
- `lagging_indicators`
- `required_evidence`
- `current_evidence_state`
- `claim_templates_enabled`
- `upgrade_actions`
- `risks_and_caveats`

## Safety Boundary

The registry rejects raw prompts, raw responses, transcripts, query text, file content, direct identifiers, rankings, manager views, and productivity scoring fields.

Claim templates should use contribution, coverage, or evidence language unless finance-approved evidence and reportability gates allow stronger phrasing.

Aggregate HRIS-derived workforce context may support a value hypothesis only as
customer-approved, cohort-safe context for workflow-level measurement. The
registry must not encode person-level HRIS records, hashed or joinable person
identifiers, individual productivity, people decisioning,
compensation/performance inference, promotion/discipline inference, attrition
prediction, manager/team comparative ordering, or HRIS inference from AI usage.

## Relationship To Outcome Instrumentation

Use the Outcome Instrumentation Map (`OIM_2026_05`) to define which external metrics, systems of record, baselines, counterfactuals, attribution levels, and privacy boundaries can move each hypothesis toward stronger claim readiness.

## Synthetic Nielsen-Style Example

Fixture:

`examples/nielsen-style-value-hypothesis-registry.json`

Seeded hypotheses:

- CS response-time improvement
- sales account planning acceleration
- engineering time-to-first-commit reduction
- support case deflection
- security incident response acceleration
- finance reporting acceleration
- HR onboarding acceleration
- agentic business reporting
