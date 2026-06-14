# AI Value Customer Exposure Policy Contract

Schema version: `FT_AI_VALUE_CUSTOMER_EXPOSURE_POLICY_2026_06`

## 1. Purpose

The AI Value Customer Exposure Policy defines what parts of the post-sales
customer evidence workflow can be shown to a customer after the internal
workflow orchestrator exists.

It is a contract-only sidecar. It does not create backend routes, frontend UI,
ingestion jobs, migrations, Prisma schema changes, export packages, persisted
Claim Readiness Snapshots, persisted Executive Readout Snapshots, rendered
readouts, realized ROI output, EBITA output, causality, productivity,
headcount, individual attribution, `manager_or_team_ranking`, people
decisioning, or customer-facing financial output.

Related contracts:

- [AI Value Customer Journey](../ai-value-customer-journey/README.md)
- [AI Value AI Fluency Intake Bridge](../ai-value-ai-fluency-intake-bridge/README.md)
- [AI Value Client Evidence Request](../ai-value-client-evidence-request/README.md)
- [AI Value Client Evidence Entry](../ai-value-client-evidence-entry/README.md)
- [AI Value Source Packages](../ai-value-source-packages/README.md)
- [AI Value Evidence Snapshot](../ai-value-evidence-snapshot/README.md)
- [AI Value Claim Readiness Handoff](../ai-value-claim-readiness-handoff/README.md)
- [AI Value Post-Sales Workflow Orchestrator](../ai-value-post-sales-workflow-orchestrator/README.md)

## 2. Core Rule

Customer-visible does not mean customer-safe claim.

The policy may allow customers to see:

- aggregate AI Fluency posture;
- evidence gaps;
- Client Evidence Requests;
- Client Evidence Entry status;
- validated Source Package status;
- Evidence Snapshot coverage posture and caveats;
- claim readiness boundary preview;
- executive readout preparation status.

The policy does not allow:

- value proof;
- ROI output;
- EBITA output;
- causality output;
- productivity output;
- headcount output;
- individual attribution;
- `manager_or_team_ranking`;
- people decisioning;
- customer-facing financial output;
- raw data export;
- Claim Readiness Snapshot export;
- Executive Readout Snapshot export.

## 3. Required Exposure Decisions

Every policy object must include one decision for each surface:

- `ai_fluency_initial_posture`
- `evidence_gap_review`
- `client_evidence_requests`
- `client_evidence_entry_statuses`
- `validated_source_packages`
- `updated_evidence_snapshot`
- `claim_readiness_preview`
- `executive_readout_preparation`
- `export_package`

Each decision must include:

- `surface_id`
- `customer_visible`
- `customer_action_required`
- `exposure_state`
- `exposure_scope`
- `evidence_interpretation`
- `value_proof_allowed`
- `allowed_customer_outputs`
- `blocked_customer_outputs`
- `required_caveats`
- `source_refs`

`value_proof_allowed` must remain false for every decision in this contract.

## 4. What Can Be Customer-Visible

AI Fluency-only output may be customer-visible only as posture. It is not value
proof and cannot support financial, productivity, causality, headcount,
individual attribution, ranking, people-decisioning, or customer-facing
financial claims.

Evidence gaps may be customer-visible. Missing, held, suppressed, rejected, and
not-computed evidence must remain visible. Missing evidence must not be treated
as support.

Client Evidence Requests may be customer-visible and actionable. Requests ask
for aggregate evidence; they do not improve claim readiness, create Source
Packages, create Evidence Snapshots, create readouts, or authorize claims.

Client Evidence Entry status may be customer-visible. The visible surface is
status only: draft, submitted, validated, rejected, held, suppressed, accepted
for Source Package, or rejected from Source Package conversion. Raw submitted
rows, raw files, prompts, responses, transcripts, query text, file contents,
direct identifiers, hashed or joinable person identifiers, person-level HRIS,
and person-level productivity remain blocked.

Validated Source Packages may be referenced as aggregate evidence status only.
The policy does not expose raw payloads or source files.

Updated Evidence Snapshots may expose coverage status, caveats, blocked uses,
blocked claims, evidence gaps, and source-bound provenance summaries. They do
not create customer-facing financial output.

Claim readiness preview may be customer-visible only as a boundary preview. It
does not create or persist Claim Readiness Snapshots.

Executive readout preparation may be customer-visible only as preparation
status until a later customer-facing readout contract allows more.

Export remains blocked until explicit export governance exists.

Governed financial claims may be marked allowed only inside
`financial_claim_policy` when full Playbook coverage, finance/business approval,
customer assumption approval, upstream financial translation, and export
governance are all present. This is not customer-facing financial output:
`customer_facing_financial_output_allowed` remains false in this contract.

## 5. Source Availability Boundary

The policy must keep these false:

- `ai_fluency_baseline_is_value_proof`
- `bigquery_source_availability_is_value_proof`
- `vbd_is_value_proof`
- `aggregate_workforce_context_upgrades_coverage`
- `client_evidence_request_upgrades_claim_readiness`

VBD remains Layer 1 platform telemetry posture.

AI Fluency baseline is posture and aggregate user voice context only.

BigQuery source availability is not value proof.

Aggregate workforce context can be valid only as aggregate, cohort-safe,
approved, non-decisioning context. It cannot upgrade coverage by itself.

## 6. Financial Claim Policy

Governed financial claims remain blocked unless all unlock conditions are met:

- `full_playbook_coverage`
- finance or business owner approval;
- customer assumption approval;
- safe privacy posture;
- no active suppression;
- upstream financial boundary allows translation;
- export governance if any customer-facing output is requested.

When those conditions are represented as present, `financial_claims_allowed`
may be true for governed claim-language exposure only. This contract still
keeps:

- `customer_facing_financial_output_allowed: false`

Any future change that allows customer-facing financial output, dollarized ROI
output, or EBITA output requires a separate contract and explicit approval.

## 7. Readout Policy

Claim readiness preview is customer-visible only as boundary preview.

Executive readout preparation status may be customer-visible.

Customer-facing readout output remains blocked unless:

- a later customer-facing readout contract allows the exact scope;
- source binding is preserved;
- all caveats, blocked uses, blocked claims, suppression, privacy, k-min,
  source refs, window, VBD boundary, workforce boundary, and financial boundary
  carry forward;
- the output remains non-financial unless a later financial-output contract
  explicitly approves otherwise.

## 8. Export Policy

`export_allowed` must remain false in this contract.

Export governance approval may be recorded as context, but recording approval
does not create an export package or customer-facing output.

Blocked export sections include:

- `raw_rows`
- `raw_files`
- `claim_readiness_snapshots`
- `executive_readout_snapshots`
- `customer_facing_financial_output`

## 9. Privacy Boundary

The policy is aggregate-only. It must not include:

- direct identifiers;
- hashed or joinable person identifiers;
- raw rows;
- raw files;
- raw prompts;
- raw responses;
- transcripts;
- query text;
- file contents;
- person-level productivity;
- person-level HRIS records;
- `manager_or_team_ranking`;
- people decisioning;
- compensation or performance inference;
- promotion or discipline inference;
- attrition prediction;
- HRIS inference from AI usage.

## 10. Persistence Policy

The policy must keep all of the following false:

- `persisted`
- `creates_migrations`
- `creates_prisma_schema`
- `creates_backend_routes`
- `creates_frontend_ui`
- `creates_ingestion_jobs`
- `stores_raw_rows`
- `stores_raw_files`
- `creates_claim_readiness_snapshots`
- `persists_claim_readiness_snapshots`
- `creates_executive_readout_snapshots`
- `persists_executive_readout_snapshots`
- `creates_customer_facing_dashboard`
- `creates_external_api_routes`

## 11. Validation Expectations

`validateCustomerExposurePolicy` must fail closed when:

- required exposure decisions are missing;
- AI Fluency posture becomes value proof;
- evidence gaps are hidden;
- Client Evidence Requests upgrade claim readiness;
- Client Evidence Entry status exposes raw evidence;
- Source Package status becomes raw payload exposure;
- Evidence Snapshot exposure includes unsupported claim output;
- Claim Readiness preview becomes a claim output or snapshot export;
- executive readout preparation becomes a rendered readout without policy;
- export is allowed before a separate export governance contract;
- governed financial claims are allowed without full Playbook coverage,
  finance/business approval, customer assumption approval, upstream financial
  translation, export governance, or `financial_exposure_state:
  financial_translation_ready`;
- customer-facing financial output is allowed;
- blocked uses, blocked outputs, or caveats are weakened;
- source binding is missing or unvalidated;
- privacy or persistence flags are unsafe;
- raw/person-level fields or unsafe people analytics fields appear anywhere.

## 12. Non-Goals

This phase does not authorize:

- backend routes;
- frontend UI;
- migrations or Prisma schema changes;
- ingestion jobs;
- raw file or raw row storage;
- persisted Claim Readiness Snapshots;
- persisted Executive Readout Snapshots;
- rendered executive readouts;
- customer workflow API implementation;
- customer workflow UI implementation;
- realized ROI output, EBITA output, causality, productivity, headcount,
  individual attribution, `manager_or_team_ranking`, people decisioning, or
  customer-facing financial output.
