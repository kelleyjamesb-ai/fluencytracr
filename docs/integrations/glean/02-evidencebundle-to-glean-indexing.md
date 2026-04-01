# EvidenceBundle to Glean Indexing

References:
- EvidenceBundle v1: `docs/contracts/evidence-bundle/v1/README.md`
- EvidenceBundle schema: `docs/contracts/evidence-bundle/v1/evidence-bundle.schema.json`
- `/api/ingest` API doc: `docs/api/ingest.md`

## Document types by EvidenceBundle window
Use one document type per bundle `window` value, e.g. `evidencebundle_<window>`:
- `evidencebundle_daily`, `evidencebundle_weekly`
- `evidencebundle_30d`, `evidencebundle_60d`, `evidencebundle_90d`, `evidencebundle_180d`, `evidencebundle_360d`
- `evidencebundle_3m`, `evidencebundle_6m`, `evidencebundle_12m`

(`360d` and `12m` both use a 365-day span in FluencyTracr `WINDOW_DAYS`; doc type names follow the bundle token.)

## Required indexed fields
- `doc_id` (stable deterministic id, example: `org_<org_id>_<window>_<generated_at_date>`)
- `org_id`
- `schema_version` (`evidence_bundle.v1`)
- `window` (see EvidenceBundle v1 schema enum: `daily`, `weekly`, and all `FluencyWindow` tokens)
- `generated_at`
- `suppression_applied`
- `suppression_reasons`
- `trend_direction`
- `exposure_shadow_ai_status`
- `exposure_unsanctioned_tool_class_status`
- `calibration_verification_presence_status`
- `calibration_recovery_presence_status`
- `calibration_escalation_to_safe_path_presence_status`
- `fragility_friction_loops_elevated_status`
- `fragility_rapid_abandonment_elevated_status`
- `fragility_blind_acceptance_risk_elevated_status`
- `coverage_instrumented_sources`
- `coverage_missing_sources`

## Recommended title and metadata format

Title format:
- `FluencyTracr EvidenceBundle <window> - <org_id> - <yyyy-mm-dd>`

Metadata:
- `source_system=fluencytracr`
- `contract=evidence_bundle.v1`
- `window=<daily|weekly|30d|60d|90d|180d|360d|3m|6m|12m>`
- `suppression=<true|false>`
- `classification=governance_evidence`

## Retention guidance
- Daily bundles: retain 35 days.
- Weekly bundles: retain 26 weeks.
- 30d bundles: retain 12 months.
- 60d bundles: retain 18 months.
- If suppression is applied, retain suppression metadata and reason codes without replacing with inferred values.

## Permissions model mapping
- Glean principal scope maps to FluencyTracr `org_id`.
- Exec readers: read-only access to org-level evidence documents.
- Governance operators: read-only plus audit metadata access where configured.
- No person-level permission expansion because bundles are aggregate-only.

## Publishing cadence and backfill
- Daily window: publish once per day after window close.
- Weekly window: publish once per week at fixed UTC close.
- Rolling fluency windows (`30d`–`360d`, `3m`, `6m`, `12m`): publish on your org’s chosen cadence (often daily rolling updates).
- Backfill:
  - Recompute requested windows from source evidence.
  - Re-publish with deterministic `doc_id` replacement behavior.
  - Preserve schema version and suppression metadata.

## Ingest dependency note
- Upstream partner metadata/event flow enters via `/api/ingest`.
- Ingested events drive downstream EvidenceBundle generation, which then feeds Glean indexing.

