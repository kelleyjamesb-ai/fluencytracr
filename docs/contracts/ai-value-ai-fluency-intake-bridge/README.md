# AI Value AI Fluency Intake Bridge Contract

Status: Phase 4 contract

Schema version: `FT_AI_VALUE_AI_FLUENCY_INTAKE_BRIDGE_2026_06`

Validator: `shared/src/aiValueEngine/aiFluencyIntakeBridge.ts`

This contract defines the post-sales bridge from aggregate AI Fluency intake to
a draft Measurement Plan, evidence gap review, and Client Evidence Requests.
It lets the workflow begin before full Playbook evidence exists while making
the evidence limits explicit.

This contract does not create migrations, Prisma schema changes, backend
routes, frontend UI, ingestion jobs, persistence, claim readiness snapshots,
executive readout snapshots, ROI, EBITA, causality, productivity, headcount,
ranking, people decisioning, or customer-facing financial output.

## Purpose

The bridge composes existing safe contracts:

- AI Fluency baseline validation and aggregate summary
- AI Value Measurement Plan draft
- Evidence gap review
- Client Evidence Requests

AI Fluency baseline evidence is aggregate Layer 2 user voice / behavioral
posture context. VBD remains Layer 1 operating posture. Neither can be treated
as value proof, claim readiness, full Playbook coverage, or customer-facing
financial output.

## Required Fields

Each bridge must include:

- `bridge_id`
- `org_id`
- `workflow`
- `ai_fluency_intake`
- `measurement_plan_draft`
- `evidence_gap_review`
- `client_evidence_requests`
- `privacy_boundary`
- `persistence_policy`
- `allowed_uses`
- `blocked_uses`
- `required_caveats`
- `created_at`
- `derivation_version`

## AI Fluency Boundary

`ai_fluency_intake` may be:

- `provided_validated`
- `missing_placeholder`

When a valid aggregate baseline is provided, the bridge stores only validation
metadata and aggregate summary. It must not store raw responses, respondent
records, direct identifiers, hashed or joinable identifiers, person-level HRIS,
person-level productivity, or `manager_or_team_ranking` fields.

When no baseline is provided, the bridge creates a safe placeholder and marks
Layer 2 evidence as missing. Missing evidence remains missing; it cannot be
treated as support.

## Evidence Gap Review

The evidence gap review must keep these boundaries explicit:

- `full_playbook_coverage: false`
- `ai_fluency_baseline_is_value_proof: false`
- `bigquery_source_availability_is_value_proof: false`
- `missing_evidence_treated_as_support: false`

Layer 2 and Layer 3 gaps remain required until validated aggregate customer
evidence is provided. Governance and assumption evidence remain held until
confirmed by the appropriate customer owner.

## Client Evidence Requests

The bridge generates Client Evidence Requests from the Measurement Plan. These
requests can ask for aggregate exports, manual aggregate entry, owner
attestation, governance confirmation, or assumption approval.

Requests do not improve claim readiness by themselves. They only define what
aggregate evidence is needed next.

## Blocked Uses

The bridge must always block:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

It also blocks individual scoring, team/manager comparison, customer-facing
economic output, dollarized output, ROI proof, person-level HRIS records,
person-level productivity, hashed or joinable person identifiers, manager-chain
analysis, compensation/performance inference, promotion/discipline inference,
attrition prediction, and HRIS inference from AI usage.

## Privacy Boundary

The bridge is aggregate-only. Unsafe privacy flags must be false, including
direct identifiers, raw content, raw prompts, raw responses, transcripts, query
text, file contents, raw rows, hashed or joinable person identifiers,
person-level HRIS records, person-level productivity, `manager_or_team_ranking`,
and people decisioning.

## Example

See `examples/ai-fluency-only-draft-plan.json`.
