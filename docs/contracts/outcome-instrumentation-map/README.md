# Outcome Instrumentation Map Contract

Schema version: `OIM_2026_05`

## Purpose

The Outcome Instrumentation Map defines which external business outcome metrics can be connected to the AI Work Value Graph and what evidence is required before those metrics can affect claim readiness.

It is the bridge between FluencyTracr value hypotheses and systems of record such as CRM, support, engineering, security, finance, HR, project, and customer success platforms.

## Required Fields

Each instrumentation entry includes:

- `system_of_record`
- `metric_name`
- `aggregation_level`
- `window`
- `baseline_required`
- `counterfactual_requirement`
- `attribution_strength`
- `privacy_boundary`
- `minimum_sample_size`
- `claim_readiness_effect`

## Safety Boundary

The map is aggregate-only. It must not contain:

- direct identifiers
- person-level metrics
- user, employee, rep, manager, or individual views
- rankings
- productivity scoring
- raw prompts, raw responses, transcripts, query text, or file content

The minimum sample size is enforced at `>= 5`; downstream reporting may choose a higher threshold.

## Synthetic Examples

Fixture:

`examples/nielsen-style-outcome-instrumentation-map.json`

Included examples:

- CS response time
- Sales meetings per week
- Support ticket deflection
- Engineering time to first commit
- Security incident response time
- Finance reporting cycle time
- HR onboarding time to proficiency

## Relationship To Value Contracts

- Value Hypothesis Registry (`VHR_2026_05`) defines expected value mechanisms and required evidence.
- AI Work Maturity Model (`AIWMM_2026_05`) defines maturity stage progression.
- Outcome Instrumentation Map (`OIM_2026_05`) defines which external metrics can move claim readiness and what attribution/privacy requirements apply.
