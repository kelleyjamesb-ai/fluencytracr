# AI Work Maturity Model Contract

Schema version: `AIWMM_2026_05`

## Purpose

The AI Work Maturity Model describes how aggregate evidence advances a Glean-assisted work pattern from ad hoc assistance toward finance-approved value.

It is designed for CFO/executive value conversations where the important question is:

> Is this work pattern merely active, repeatable, governed, linked to an outcome, or strong enough for finance-approved value language?

## Maturity Stages

| Stage | Meaning |
| --- | --- |
| `ad_hoc_assistance` | AI is used occasionally for point-in-time help. |
| `repeated_assistance` | AI use repeats across a surface or workflow pattern. |
| `reusable_expertise` | Work has reusable artifacts, Skills, or repeatable expertise patterns. |
| `agentic_execution` | Agents or workflow runs execute multi-step work. |
| `governed_action` | Actions are logged, controlled, and reviewable. |
| `outcome_linked` | Evidence connects the work pattern to a business outcome metric. |
| `finance_approved` | Finance has reviewed the financial model and approved the value language. |

## Evidence-To-Stage Mapping

| Evidence type | Default stage | Supported stages |
| --- | --- | --- |
| `survey` | `ad_hoc_assistance` | `ad_hoc_assistance`, `repeated_assistance` |
| `product_telemetry` | `repeated_assistance` | `ad_hoc_assistance`, `repeated_assistance`, `reusable_expertise` |
| `workflow_run` | `agentic_execution` | `repeated_assistance`, `agentic_execution`, `outcome_linked` |
| `artifact_output` | `reusable_expertise` | `reusable_expertise`, `outcome_linked` |
| `action_log` | `agentic_execution` | `agentic_execution`, `governed_action`, `outcome_linked` |
| `control_evidence` | `governed_action` | `governed_action`, `outcome_linked`, `finance_approved` |
| `business_outcome` | `outcome_linked` | `outcome_linked`, `finance_approved` |
| `financial_model` | `finance_approved` | `finance_approved` |

## Example Shape

Each maturity example includes:

- current maturity stage
- evidence present
- evidence missing
- upgrade path
- safe claim language

The contract rejects raw prompts, raw responses, transcripts, query text, file content, direct identifiers, ranking fields, manager views, and productivity scoring fields.

## Nielsen-Style Synthetic Examples

Fixture:

`examples/nielsen-style-ai-work-maturity-examples.json`

Included examples:

- search productivity
- assistant productivity
- CS response-time improvement
- sales account planning
- support case analyzer
- project onboarding
- security incident assistant
- agentic business reporting

## Relationship To Value Hypotheses

Use the Value Hypothesis Registry (`VHR_2026_05`) when the question is not only "what maturity stage is this work in?" but "what business value do we expect, what evidence is required, and what claim templates are enabled?"

