# AI Value Source Packages Contract

Schema version: `FT_AI_VALUE_SOURCE_PACKAGE_2026_06`

## 1. Purpose

AI Value Source Packages define how external aggregate evidence may enter the
AI Value chain before ingestion, persistence, evidence assembly, claim
readiness, or readout work exists.

They are evidence inputs only. A source package can help an Evidence Collection
Assembler decide whether evidence is present, partial, missing, held,
suppressed, or not computed. It cannot create full Playbook coverage by itself
and cannot authorize downstream claims.

## 2. Non-goals

Source packages must not:

- store raw rows;
- store raw prompts, responses, transcripts, query text, or file contents;
- store direct identifiers;
- store hashed, pseudonymous, tokenized, or joinable person identifiers;
- store person-level HRIS records;
- store person-level productivity data;
- authorize the blocked use `manager_or_team_ranking`;
- authorize the blocked use `people_decisioning`;
- infer compensation, performance, promotion, discipline, attrition, or HRIS
  outcomes from AI usage;
- compute claim readiness, ROI, EBITA, productivity, causality, or financial
  impact;
- create executive readouts, backend routes, frontend UI, ingestion jobs,
  migrations, or persistence.

## 3. Source Package Types

Allowed `source_package_type` values:

| Type | Evidence layer | Meaning |
| --- | --- | --- |
| `layer_1_bigquery_telemetry_summary` | Layer 1 telemetry | Aggregate BigQuery or equivalent platform telemetry summary. |
| `layer_2_user_voice_empirical_export` | Layer 2 user voice | Aggregate AI Fluency baseline, retest, survey, workflow observation, or user voice export. |
| `layer_3_business_system_of_record_outcome_export` | Layer 3 system-of-record | Customer-attested aggregate business outcome export with metric owner review or caveat. |
| `aggregate_workforce_context_export` | Assumption/context evidence | Aggregate, cohort-safe, customer-approved workforce context only. |
| `governance_control_export` | Governance evidence | Source readiness, k-min, data-boundary, control, policy, or forbidden-field evidence. |
| `assumption_approval_export` | Assumption evidence | Customer or business-owner approval state for assumptions. |

## 4. Required Fields

Each source package must include:

- `schema_version`
- `source_package_id`
- `org_id`
- `source_package_type`
- `source_owner_role`
- `source_owner_attestation`
- `generated_at`
- `covered_window`
- `approved_aggregate_grain`
- `minimum_cohort_threshold`
- `k_min_posture`
- `source_system_type`
- `source_refs`
- `evidence_state`
- `privacy_boundary`
- `allowed_uses`
- `blocked_uses`
- `caveats`
- `derivation_version`

The shared validator lives at
[`shared/src/aiValueEngine/sourcePackages.ts`](../../../shared/src/aiValueEngine/sourcePackages.ts).

## 5. Privacy Boundary

`privacy_boundary.aggregate_only` must be true.

The following flags must be false:

- `contains_direct_identifiers`
- `contains_raw_content`
- `contains_person_level_productivity`
- `contains_person_level_hris_records`
- `contains_hashed_or_joinable_person_identifiers`
- `contains_manager_or_team_ranking`
- `contains_people_decisioning`
- `contains_compensation_or_performance_inference`
- `contains_promotion_or_discipline_inference`
- `contains_attrition_prediction`
- `contains_hris_inference_from_ai_usage`

The validator also rejects forbidden raw or person-level fields anywhere in the
package object.

## 6. K-Min and Aggregate Grain

`minimum_cohort_threshold` must be at least `5`.

`k_min_posture` must explicitly include:

- `minimum_cohort_threshold`
- `cohort_threshold_met`
- aggregate slice counts, where available
- suppressed or unknown slice counts, where available

`approved_aggregate_grain` must be one of:

- `org`
- `function`
- `workflow_family`
- `workflow`
- `role_family`
- `cohort`
- `custom_aggregate`

K-min posture does not create full Playbook coverage. It only determines
whether a source package can safely feed evidence collection.

## 7. Allowed Uses and Blocked Uses

Allowed uses are limited to evidence-input and review contexts, such as:

- `evidence_collection_input`
- `source_availability_summary`
- `evidence_snapshot_preparation`
- `missing_evidence_planning`
- `aggregate_context_only`
- `governance_review`
- `assumption_review`

Every package must keep these blocked uses:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

Blocked uses may be stricter. They must not be weakened by source package type.

## 8. Layer-Specific Rules

Layer 1 packages are aggregate telemetry summaries only. They cannot become
ROI, productivity, causality, or financial proof.

Layer 2 packages must be aggregate-only user voice, AI Fluency baseline/retest,
survey aggregate, or empirical user voice evidence.

Layer 3 packages must be customer-attested aggregate system-of-record outcome
evidence. They require metric-owner review or an explicit caveat. Layer 3
packages cannot claim causality or financial impact by themselves.

Aggregate workforce context packages must be aggregate-only, cohort-safe,
customer-approved, non-decisioning, non-ranking, and free of direct or joinable
person identifiers. They cannot authorize productivity or people decisions.

Governance packages represent source readiness, data boundary, k-min posture,
forbidden-field checks, raw-content exclusion, control posture, or policy
review. They cannot override suppression or privacy boundaries.

Assumption packages must include approval state and approval owner role. They
cannot compute ROI, EBITA, productivity, causality, or financial impact.

## 9. Source Refs

`source_refs` must be metadata-only references, such as source readiness IDs,
aggregate export IDs, or aggregate probe IDs. They must not include raw rows,
query text, file contents, prompts, responses, transcripts, direct identifiers,
or joinable person identifiers.

## 10. Relationship to Measurement Plan

Measurement Plans declare which source packages are required. Source Packages
answer whether a specific aggregate source export or attestation is safe to
reference during evidence collection.

A source package does not satisfy the full Measurement Plan by itself. The
Evidence Collection Assembler must combine the plan and available source
packages, preserve missing evidence as caveats, and validate the resulting
Evidence Snapshot posture.

## 11. Relationship to Evidence Snapshot

Source Packages may feed Evidence Snapshot preparation only through a future
non-persisted assembler. They are not Evidence Snapshots and cannot directly
create claim readiness.

The validator returns:

- `feeds.evidence_collection_input`
- `feeds.evidence_snapshot_source_ref`
- hard-false claim/readout/economic-output feeds
- hard-false `full_playbook_coverage`

## 12. Examples

Validator-backed examples:

- [`examples/layer-1-bigquery-telemetry-package.json`](./examples/layer-1-bigquery-telemetry-package.json)
- [`examples/layer-2-user-voice-package.json`](./examples/layer-2-user-voice-package.json)
- [`examples/layer-3-system-of-record-outcome-package.json`](./examples/layer-3-system-of-record-outcome-package.json)
- [`examples/aggregate-workforce-context-package.json`](./examples/aggregate-workforce-context-package.json)
- [`examples/governance-control-package.json`](./examples/governance-control-package.json)
- [`examples/assumption-approval-package.json`](./examples/assumption-approval-package.json)

## 13. Validation

Run:

```bash
npm run test:ai-value-source-packages
```

The tests validate examples and reject unsafe raw content, identifiers,
person-level HRIS, person-level productivity, the blocked use
`manager_or_team_ranking`, the blocked use `people_decisioning`, unsafe Layer 2
privacy posture, Layer 3 packages without review or caveat, assumption packages
without approval state, aggregate workforce context that tries to authorize
blocked uses, and source packages that attempt to declare full Playbook
coverage.
