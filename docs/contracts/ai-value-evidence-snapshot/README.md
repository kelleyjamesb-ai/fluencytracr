# AI Value Evidence Snapshot Contract

Schema version: `FT_AI_VALUE_EVIDENCE_SNAPSHOT_2026_06`

## 1. Purpose

The AI Value Evidence Snapshot is an immutable aggregate evidence posture
object. It captures what evidence was available for a given org, workflow,
window, and measurement plan at the time a claim or readout could be evaluated.

It is not a value claim. It is not ROI. It is not EBITA. It is not causality. It
is not productivity measurement. It is not customer-facing economic output. It
is not a people analytics, HR decisioning, or performance management artifact.

This contract is the first safe object after the BigQuery signal probe decision
`READY_FOR_CAVEATED_EVIDENCE_SNAPSHOT`. It records aggregate evidence posture
only. It does not persist snapshots yet and does not create
`claim_readiness_snapshots` or `executive_readout_snapshots`.

Related source docs:

- [AI Value Data Model Audit](../../architecture/AI_VALUE_DATA_MODEL_AUDIT.md)
- [BigQuery Signal Availability Audit](../../architecture/BIGQUERY_SIGNAL_AVAILABILITY_AUDIT.md)
- [BigQuery Signal Probe Results](../../architecture/BIGQUERY_SIGNAL_PROBE_RESULTS.md)
- [Aggregate Workforce Context Governance](../../architecture/AGGREGATE_WORKFORCE_CONTEXT_GOVERNANCE.md)

## 2. Non-goals

The evidence snapshot must not:

- store raw BigQuery rows;
- store prompts, responses, transcripts, file contents, or query text;
- store direct identifiers;
- store hashed, pseudonymous, tokenized, or joinable person identifiers;
- store person-level HRIS records;
- store person-level productivity data;
- support manager/team comparative ordering or manager-chain analysis, both of
  which are prohibited;
- support compensation or performance inference;
- support promotion or discipline inference;
- support attrition prediction;
- infer HRIS outcomes from AI usage;
- support customer-facing financial output;
- silently convert telemetry into business value;
- compute claim readiness;
- create backend routes, frontend UI, migrations, ingestion jobs, or persistence.

## 3. Snapshot Types

Allowed `snapshot_type` values:

| Type | Meaning |
| --- | --- |
| `TELEMETRY_SOURCE_AVAILABILITY` | Source availability summary only. |
| `TELEMETRY_ONLY_CAVEATED` | Layer 1 telemetry exists, with missing or held higher layers. |
| `LAYER_1_PLUS_LAYER_2` | Layer 1 telemetry plus aggregate user voice evidence. |
| `LAYER_1_PLUS_LAYER_3` | Layer 1 telemetry plus aggregate system-of-record outcome evidence. |
| `FULL_STACK_EVIDENCE` | Layer 1, Layer 2, Layer 3, governance, and assumptions are present or approved. |
| `HELD_FOR_GOVERNANCE` | Snapshot is structurally present but held for approval, suppression, or governance. |

Telemetry-only snapshots may support caveated evidence posture and blocking
evaluation. They must not support realized ROI, EBITA, causality, productivity,
headcount reduction, individual attribution, manager/team comparative ordering, people
decisioning, or customer-facing financial output.

## 4. Required Fields

Each snapshot must include:

- `schema_version`
- `evidence_snapshot_id`
- `org_id`
- `measurement_plan_id`
- `workflow`
- `window`
- `snapshot_type`
- `source_refs`
- `evidence_lanes`
- `playbook_layers`
- `playbook_coverage`
- `vbd_operating_map`
- `aggregate_telemetry_summary`
- `aggregate_workforce_context`
- `suppression`
- `privacy_boundary`
- `snapshot_readiness_decision`
- `allowed_uses`
- `blocked_uses`
- `required_caveats`
- `next_evidence_actions`
- `generated_at`
- `derivation_version`

The shared validator lives at
[`shared/src/aiValueEngine/evidenceSnapshot.ts`](../../../shared/src/aiValueEngine/evidenceSnapshot.ts).

## 5. Evidence Lane Classification

Every snapshot must include all seven FluencyTracr evidence lanes:

| Lane | Default telemetry-first posture |
| --- | --- |
| `surface_usage` | `available_now`, `present`, Layer 1 telemetry. |
| `skill_lifecycle` | `partially_available`, `partial`, Layer 1 telemetry. |
| `agent_lifecycle` | `derivable_with_existing_data`, `partial`, Layer 1 telemetry. |
| `mcp_action_boundary` | `requires_customer_export`, `held`, governance evidence. |
| `artifact_output` | `derivable_with_existing_data`, `partial`, Layer 1 telemetry. |
| `control_evidence` | `requires_customer_export`, `held`, governance evidence. |
| `assumptions` | `requires_customer_export`, `held`, assumption evidence. |

Allowed `classification` values:

- `available_now`
- `partially_available`
- `derivable_with_existing_data`
- `requires_customer_export`
- `requires_new_instrumentation`
- `not_available`
- `unknown`

Allowed `evidence_state` values:

- `present`
- `partial`
- `missing`
- `held`
- `suppressed`
- `not_computed`

## 6. Playbook Evidence Layer Classification

Every snapshot must include all five Glean Playbook evidence layer groups:

| Layer group | Meaning |
| --- | --- |
| `layer_1_platform_telemetry` | Aggregate platform telemetry. |
| `layer_2_user_voice_empirical` | Aggregate user voice, survey, or stated evidence. |
| `layer_3_business_system_outcomes` | Aggregate customer-attested system-of-record outcome evidence. |
| `governance_evidence` | Approved control, MCP/action, policy, or source-readiness evidence. |
| `assumption_evidence` | Customer-owned assumptions and approval state. |

Each layer group must carry `evidence_state`, `confidence`, and `caveats`.

## 7. Playbook Coverage Matrix

The Playbook Coverage Matrix distinguishes BigQuery source availability from
full value evidence coverage.

Strong Layer 1 telemetry is not full Playbook coverage. Full Playbook coverage
requires appropriate evidence posture across:

- Layer 1 platform telemetry;
- Layer 2 user voice / empirical evidence;
- Layer 3 business system-of-record outcomes;
- governance evidence;
- assumption evidence.

The matrix must make missing, held, suppressed, or not-computed evidence
explicit. It exists so a readout can distinguish four separate questions:

- **BigQuery source availability:** what aggregate telemetry exists;
- **Playbook evidence coverage:** which evidence layers and signals are covered;
- **Claim readiness:** whether a claim posture can be evaluated;
- **Financial permission:** whether customer-approved financial or economic
  language is allowed.

Allowed `coverage_status` values:

- `layer_1_only`
- `layer_1_plus_partial_layer_2`
- `layer_1_plus_partial_layer_3`
- `layer_1_plus_layer_2_and_layer_3`
- `full_playbook_coverage`
- `held_for_customer_exports`
- `held_for_governance`

### Layer 1 platform telemetry signals

Layer 1 platform telemetry coverage must track:

- `workflow_run_count`
- `search_activity`
- `chat_or_assistant_activity`
- `ai_answer_activity`
- `active_user_aggregate`
- `eligible_cohort_size`
- `connector_or_source_coverage`
- `skill_lifecycle_activity`
- `agent_lifecycle_activity`
- `artifact_output_metadata`
- `mcp_action_boundary_metadata`
- `control_or_policy_telemetry`
- `suppression_or_blocked_event_posture`

### Layer 2 user voice / empirical signals

Layer 2 coverage must track:

- `aggregate_ai_fluency_baseline`
- `aggregate_ai_fluency_retest`
- `aggregate_confidence_or_readiness_survey`
- `aggregate_knowledge_access_satisfaction`
- `aggregate_workflow_observation`
- `aggregate_qualitative_proof_points`
- `customer_approved_time_and_motion_summary`

Telemetry-first snapshots should list required Layer 2 source exports:

- `aggregate_ai_fluency_baseline`
- `aggregate_ai_fluency_retest`
- `aggregate_user_voice_or_workflow_observation`

### Layer 3 business system-of-record signals

Layer 3 coverage must track:

- `customer_attested_kpi_baseline`
- `customer_attested_kpi_comparison`
- `source_system_name`
- `source_owner_attestation`
- `metric_owner_review`
- `finance_or_business_owner_approval`
- `aggregate_outcome_metric_movement`
- `minimum_cohort_threshold`
- `system_of_record_export_availability`

Telemetry-first snapshots should list required Layer 3 source exports:

- `customer_attested_kpi_baseline`
- `customer_attested_kpi_comparison`
- `system_of_record_outcome_export`

### Governance evidence signals

Governance coverage must track:

- `suppression_state`
- `k_min_posture`
- `source_readiness_state`
- `data_boundary_state`
- `approved_aggregate_grain`
- `held_suppressed_missing_lanes`
- `forbidden_field_checks`
- `raw_content_exclusion`

If governance evidence is missing or held, the snapshot readiness decision must
be `HOLD_FOR_GOVERNANCE_APPROVAL` unless the snapshot is only
`TELEMETRY_SOURCE_AVAILABILITY`.

### Assumption evidence signals

Assumption coverage must track:

- `customer_owned_assumptions`
- `productivity_recapture_assumption_if_relevant`
- `aggregate_workforce_context_approval_if_provided`
- `financial_assumption_approval_if_requested`
- `low_confidence_assumptions`
- `high_sensitivity_assumptions`
- `customer_facing_approval_state`

Telemetry-first snapshots should list required assumption approvals:

- `customer_owned_assumptions`
- `finance_or_business_owner_approval`
- `aggregate_workforce_context_approval_if_used`

### Full coverage rule

`full_playbook_coverage` requires:

- Layer 1 present or partial with caveats;
- Layer 2 present;
- Layer 3 present;
- governance evidence present;
- assumption evidence present or explicitly not required;
- no unsafe privacy flags;
- k-min threshold met;
- missing, held, suppressed, or not-computed lanes carried forward as caveats.

BigQuery source availability alone must never validate as
`full_playbook_coverage`.

## 8. VBD Operating Map

The VBD Operating Map records the observed Layer 1 AI fluency posture for the
evidence window. It captures:

- **Velocity:** activity movement over time.
- **Breadth:** spread across approved aggregate slices.
- **Depth:** embeddedness in repeatable workflow behavior.

The VBD Operating Map is not a value claim. It feeds Playbook evidence coverage
as `layer_1_platform_telemetry`.

A VBD posture can support caveated statements about AI-enabled work maturity:
how AI-enabled work is growing, spreading, and embedding across approved
aggregate workflow slices. It cannot support ROI, EBITA, causality,
productivity, headcount reduction, individual attribution, manager/team
ranking, people decisioning, or customer-facing financial output.

`vbd_operating_map.contributes_to_playbook_layer` must equal
`layer_1_platform_telemetry`.

`blocked_interpretation` must include:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

Breadth must remain compatible with the approved aggregate grain in the privacy
boundary when one is present. If aggregate grain approval is missing or held,
breadth must remain caveated and cannot be strengthened. Suppressed or unknown
slices must be carried forward and must not be hidden inside covered breadth.

Embedded Depth remains Layer 1 posture. It cannot allow business value claims
unless Layer 3 business outcome evidence or accepted quality/outcome evidence is
present. If `operating_mode` is `high_fluency_flow` while
`coverage_status` is `layer_1_only`, `required_caveats` must state that high
fluency flow is Layer 1 posture only and not full value proof.

VBD cannot upgrade `coverage_status` to `full_playbook_coverage`, override
suppression, infer individual/manager/team/HRIS outcomes, or weaken privacy and
governance controls.

## 9. Source Coverage

`source_refs` may reference aggregate, reviewed, or synthetic-safe source
objects only:

- BigQuery probe result IDs;
- V3 verdict IDs;
- Velocity observation IDs;
- outcome evidence IDs;
- Fluency baseline IDs;
- source readiness IDs;
- real source manifest IDs;
- aggregate workforce context export IDs;
- short notes.

Source references must not include real project IDs, raw table names, query
text, prompts, responses, transcripts, action payloads, document URLs, actor
IDs, user IDs, employee IDs, hashed IDs, emails, or raw source rows.

`aggregate_telemetry_summary` may record aggregate counts, table-family
coverage labels, approved field coverage summaries, and k-min posture. It must
not store row-level samples or raw schemas.

## 10. Aggregate Workforce Context Governance

Aggregate HRIS-derived workforce context is allowed only when it is:

- aggregate-only;
- cohort-safe;
- customer-approved;
- non-decisioning;
- non-ranking;
- free of direct identifiers;
- free of hashed or joinable person identifiers;
- used only for workflow-level value measurement.

Person-level HRIS records are prohibited in FluencyTracr product state whether
direct, pseudonymous, hashed, tokenized, or otherwise joinable.

Hashed or pseudonymous person-level IDs may be used only transiently inside an
approved customer or warehouse aggregation process to enforce k-min,
deduplicate, or compute aggregate metrics. They must not be stored in
FluencyTracr product tables, evidence snapshots, claim snapshots, executive
readouts, exports, or UI.

`aggregate_workforce_context.context_state` values:

- `not_provided`
- `provided_aggregate_safe`
- `held_for_approval`
- `suppressed`
- `blocked`

If `context_state` is `provided_aggregate_safe`, the validator requires:

- `privacy_boundary.aggregate_only: true`
- `privacy_boundary.aggregate_workforce_context_allowed: true`
- every unsafe privacy flag set to `false`
- `source_owner_approval_state: approved`
- `cohort_threshold_met: true`

The term `HRIS` is not blocked by itself when it appears as aggregate,
customer-approved workforce context. Person-level HRIS records, direct IDs,
hashed IDs, joinable IDs, people decisioning, ranking, compensation or
performance inference, promotion or discipline inference, attrition prediction,
and HRIS inference from AI usage always fail validation.

## 11. K-Min and Suppression Requirements

Suppression remains fail-closed:

- `suppression.default_verdict` must be `SUPPRESS`;
- `suppression.suppression_applies_per_slice` must be `true`;
- `suppression.hidden_values_exposed` must be `false`;
- suppression applies independently per slice;
- hidden suppressed values must never be exposed.

`aggregate_telemetry_summary.k_min_summary` may record aggregate slice counts,
k-min clear counts, suppressed or unknown slice counts, and the minimum cohort
threshold. It must not retain low-count row details.

## 12. Missing, Held, or Suppressed Lane Handling

If any lane is missing, held, suppressed, or not computed, `required_caveats`
must mention missing, held, suppressed, or not computed evidence.

Specific caveats are required when:

- Layer 2 user voice or empirical evidence is missing or held;
- Layer 3 business system-of-record outcome evidence is missing or held;
- customer-owned assumptions are missing, held, unapproved, or require export;
- aggregate workforce context is held for approval;
- workforce context is blocked or unsafe.

Missing evidence must remain explicit. It must not be silently converted into
claim support.

## 13. Allowed Uses

Telemetry-first evidence snapshots may be used for:

- aggregate evidence posture review;
- source availability summary;
- missing evidence planning;
- claim blocking evaluation;
- internal measurement-plan readiness discussion.

For `TELEMETRY_ONLY_CAVEATED`, `feeds.claim_readiness` may be true only for
posture and blocking evaluation. It does not authorize financial claims,
customer-facing claims, or executive economic output.

## 14. Blocked Uses

Telemetry source availability and telemetry-only caveated snapshots must block:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

The validator also rejects allowed uses that attempt to enable ROI, EBITA,
causality, productivity, headcount reduction, individual attribution,
manager/team comparative ordering, people decisioning, or customer-facing
financial output.

Agent lifecycle evidence may not support financial agent value unless Layer 3
business outcome evidence is present. Artifact output metadata may not support
business value unless Layer 3 or accepted outcome/quality evidence is present.

## 15. Relationship to Future Persistence

This contract defines the future shape of `evidence_snapshots`, but does not
create the table. The durable path remains:

`value_hypotheses -> measurement_plans -> evidence_snapshots -> claim_readiness_snapshots -> executive_readout_snapshots`

The sequence is intentionally staged:

1. Define and validate aggregate evidence posture.
2. Persist evidence snapshots only after source availability and caveat behavior
   are stable.
3. Derive claim readiness snapshots from evidence snapshots later.
4. Derive executive readout snapshots only after evidence and claim snapshots
   can preserve the caveats and blocked uses shown to sponsors.

## 16. Example Payload

Full examples:

- [telemetry-only-caveated-snapshot.json](./examples/telemetry-only-caveated-snapshot.json)
- [aggregate-workforce-context-caveated-snapshot.json](./examples/aggregate-workforce-context-caveated-snapshot.json)

Minimal excerpt:

```json
{
  "schema_version": "FT_AI_VALUE_EVIDENCE_SNAPSHOT_2026_06",
  "snapshot_type": "TELEMETRY_ONLY_CAVEATED",
  "snapshot_readiness_decision": "READY_FOR_CAVEATED_EVIDENCE_SNAPSHOT",
  "playbook_coverage": {
    "coverage_status": "layer_1_only",
    "layer_2_user_voice_empirical": {
      "status": "missing",
      "required_source_exports": [
        "aggregate_ai_fluency_baseline",
        "aggregate_ai_fluency_retest",
        "aggregate_user_voice_or_workflow_observation"
      ]
    },
    "layer_3_business_system_outcomes": {
      "status": "missing",
      "required_source_exports": [
        "customer_attested_kpi_baseline",
        "customer_attested_kpi_comparison",
        "system_of_record_outcome_export"
      ]
    },
    "assumption_evidence": {
      "status": "held",
      "required_approvals": [
        "customer_owned_assumptions",
        "finance_or_business_owner_approval",
        "aggregate_workforce_context_approval_if_used"
      ]
    }
  },
  "privacy_boundary": {
    "aggregate_only": true,
    "contains_direct_identifiers": false,
    "contains_raw_content": false,
    "contains_person_level_hris_records": false,
    "contains_hashed_or_joinable_person_identifiers": false,
    "contains_manager_or_team_ranking": false,
    "contains_people_decisioning": false
  },
  "blocked_uses": [
    "realized_roi",
    "ebita_claim",
    "causality_claim",
    "productivity_claim",
    "headcount_reduction_claim",
    "individual_attribution",
    "manager_or_team_ranking",
    "people_decisioning",
    "customer_facing_financial_output"
  ]
}
```
