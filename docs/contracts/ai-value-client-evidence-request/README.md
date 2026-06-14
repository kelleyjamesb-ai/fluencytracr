# AI Value Client Evidence Request Contract

Status: Phase 2 contract

Schema version: `FT_AI_VALUE_CLIENT_EVIDENCE_REQUEST_2026_06`

Validator: `shared/src/aiValueEngine/clientEvidenceRequest.ts`

This contract defines the customer action object that tells a client what
aggregate evidence is needed to move from initial AI Fluency or Layer 1 posture
toward stronger Playbook coverage.

This contract does not create migrations, Prisma schema changes, backend
routes, frontend UI, ingestion jobs, new persistence, claim readiness snapshot
persistence, executive readout snapshot persistence, rendered readouts, ROI,
EBITA, causality, productivity, headcount, ranking, people decisioning, or
customer-facing financial output.

## Purpose

Client Evidence Requests translate Measurement Plan requirements or Evidence
Snapshot gaps into aggregate customer evidence asks. A request is not evidence.
It cannot improve claim readiness by itself, create a Source Package, create an
Evidence Snapshot, or authorize customer-facing value language.

Requests may ask for:

- aggregate Layer 2 user voice or AI Fluency evidence
- aggregate Layer 3 customer-owned system-of-record outcome evidence
- governance or control confirmations
- customer-owned assumption approvals
- aggregate workforce context for non-decisioning interpretation only

## Required Fields

Each request must include:

- `request_id`
- `org_id`
- `measurement_plan_id`
- `evidence_snapshot_id`, optional
- `requested_playbook_layer`
- `request_type`
- `evidence_purpose`
- `accepted_formats`
- `required_fields`
- `forbidden_fields`
- `privacy_requirements`
- `minimum_cohort_threshold`
- `owner_role`
- `approver_role`, optional
- `due_status`
- `allowed_claim_improvement`
- `blocked_claims`
- `required_caveats`
- `customer_instructions`
- `internal_notes`, optional
- `created_at`
- `derivation_version`

Allowed `requested_playbook_layer` values are:

- `layer_2_user_voice_empirical`
- `layer_3_business_system_outcomes`
- `governance_evidence`
- `assumption_evidence`
- `aggregate_workforce_context`

Allowed `request_type` values are:

- `aggregate_export`
- `manual_aggregate_entry`
- `owner_attestation`
- `finance_or_business_approval`
- `governance_control_confirmation`

Allowed `due_status` values are:

- `not_requested`
- `requested`
- `awaiting_customer`
- `received`
- `validated`
- `rejected`
- `held`
- `suppressed`

## Privacy Boundary

Every request must be aggregate-only and must forbid:

- `raw_prompts`
- `raw_responses`
- `transcripts`
- `query_text`
- `file_contents`
- `raw_rows`
- `direct_identifiers`
- `hashed_or_joinable_person_identifiers`
- `person_level_hris_records`
- `person_level_productivity`
- `manager_or_team_ranking`
- `people_decisioning`

The request cannot ask for direct identifiers, hashed or joinable identifiers,
person-level HRIS, person-level productivity, raw prompts, raw responses,
transcripts, query text, file contents, or raw rows.

## Claim Boundary

`allowed_claim_improvement` must remain caveated and must explicitly state that
the request itself does not upgrade claim readiness. It may only describe
evidence gap closure planning until validated aggregate evidence exists.

Every request must continue to block unsupported financial and people-analytics
claims, including ROI proof, realized ROI, EBITA claims, causality claims,
productivity claims, headcount reduction claims, individual attribution,
individual scoring, `manager_or_team_ranking`, people decisioning, financial
value claims, customer-facing financial output, and customer-facing economic
output.

## Layer Rules

Layer 2 requests may ask for aggregate AI Fluency baseline/retest exports,
aggregate survey results, aggregate user voice summaries, or empirical workflow
observation summaries.

Layer 3 requests may ask for customer-owned aggregate system-of-record outcome
metrics with metric-owner attestation.

Governance requests may ask for aggregate privacy, source-readiness, k-min,
data-boundary, and raw-content exclusion confirmation.

Assumption requests may ask for customer-owned assumptions and finance or
business owner approval states.

Aggregate workforce context requests may ask only for aggregate, cohort-safe,
source-owner-approved context and must carry a non-decisioning label.

## Builders

`buildClientEvidenceRequestsFromMeasurementPlan` derives requests from required
Measurement Plan Playbook layers and aggregate workforce requirements.

`buildClientEvidenceRequestsFromEvidenceSnapshot` derives requests from
missing, held, suppressed, not-computed, or partial Evidence Snapshot Playbook
coverage and held aggregate workforce context.

Both builders produce request objects only. They do not validate or persist
client evidence, create Source Packages, create Evidence Snapshots, or improve
claim readiness.

## Examples

Validator-backed examples live in:

- `examples/layer-2-user-voice-request.json`
- `examples/layer-3-business-outcome-request.json`
- `examples/assumption-approval-request.json`
- `examples/workforce-context-request.json`

