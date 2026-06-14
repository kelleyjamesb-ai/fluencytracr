# AI Value Client Evidence Entry Contract

Status: Phase 3 contract

Schema version: `FT_AI_VALUE_CLIENT_EVIDENCE_ENTRY_2026_06`

Validator: `shared/src/aiValueEngine/clientEvidenceEntry.ts`

This contract defines safe client evidence entry for aggregate evidence a
client provides directly or enters manually in software.

This contract does not create migrations, Prisma schema changes, backend
routes, frontend UI, ingestion jobs, raw file storage, claim readiness snapshot
persistence, executive readout snapshot persistence, rendered readouts, ROI,
EBITA, causality, productivity, headcount, ranking, people decisioning, or
customer-facing financial output.

## Purpose

Client Evidence Entries capture aggregate, attested, privacy-safe customer
evidence after a Client Evidence Request. Entries can become Source Packages
only after validation. Draft, submitted, rejected, held, or suppressed entries
cannot produce Source Packages.

## Entry Modes

Allowed `entry_mode` values are:

- `aggregate_export_upload_metadata`
- `manual_aggregate_metric_entry`
- `manual_user_voice_aggregate_entry`
- `manual_governance_attestation`
- `manual_assumption_approval`
- `manual_workforce_context_entry`

Allowed `evidence_layer` values are:

- `layer_2_user_voice_empirical`
- `layer_3_business_system_outcomes`
- `governance_evidence`
- `assumption_evidence`
- `aggregate_workforce_context`

Allowed `validation_status` values are:

- `draft`
- `submitted`
- `validated`
- `rejected`
- `held`
- `suppressed`

## Required Fields

Each entry must include:

- `schema_version`
- `entry_id`
- `request_id`
- `org_id`
- `measurement_plan_id`
- `evidence_layer`
- `entry_mode`
- `entered_by_role`
- `source_owner_role`
- `approver_role`, optional
- `attestation`
- `aggregate_grain`
- `minimum_cohort_threshold`
- `covered_window`
- `metric_or_signal_summary`
- `evidence_state`
- `privacy_boundary`
- `allowed_uses`
- `blocked_uses`
- `required_caveats`
- `validation_status`
- `rejection_reasons`, optional
- `created_at`
- `derivation_version`

No extra top-level fields are allowed. Additional source details must be
represented as metadata-only `metric_or_signal_summary.source_refs` values and
still pass the unsafe field and unsafe metadata value scanners.

## Privacy Boundary

Every entry must be aggregate-only. Entries must not include:

- raw rows
- uploaded raw files
- raw prompts
- raw responses
- transcripts
- query text
- file contents
- direct identifiers
- hashed or joinable person identifiers
- person-level HRIS records
- person-level productivity
- manager or team ranking
- people decisioning
- compensation or performance inference
- promotion, discipline, attrition, or HRIS inference from AI usage

## Claim Boundary

Entries must preserve blocked uses and caveats. They cannot compute ROI, EBITA,
productivity, causality, financial impact, headcount reduction, ranking,
people decisioning, or customer-facing financial output.

## Source Package Conversion

`buildSourcePackageFromClientEvidenceEntry` converts only validated `present` or
`partial` entries into Source Packages. Invalid, draft, submitted, rejected,
held, suppressed, missing, or not-computed entries throw instead of producing a
Source Package.

Entry-to-Source Package mapping:

- `aggregate_export_upload_metadata` -> Source Package type is selected by
  `evidence_layer`; only aggregate export metadata is retained
- `manual_user_voice_aggregate_entry` -> `layer_2_user_voice_empirical_export`
- `manual_aggregate_metric_entry` -> `layer_3_business_system_of_record_outcome_export`
- `manual_governance_attestation` -> `governance_control_export`
- `manual_assumption_approval` -> `assumption_approval_export`
- `manual_workforce_context_entry` -> `aggregate_workforce_context_export`

Derived Source Packages remain evidence inputs only. They cannot create full
Playbook coverage by themselves, claim readiness snapshots, executive readout
snapshots, or customer-facing economic output.

## Examples

Validator-backed examples live in:

- `examples/aggregate-export-upload-metadata-entry.json`
- `examples/manual-layer-3-outcome-entry.json`
- `examples/manual-layer-2-user-voice-entry.json`
- `examples/manual-governance-attestation-entry.json`
- `examples/manual-assumption-approval-entry.json`
- `examples/manual-workforce-context-entry.json`
- `examples/rejected-person-level-entry.json`
