# AI Value Measurement Plan Contract

Schema version: `FT_AI_VALUE_MEASUREMENT_PLAN_2026_06`

## 1. Purpose

The AI Value Measurement Plan is the customer/workflow-specific plan that
defines what value hypothesis is being tested, which workflow and metrics are
in scope, which baseline and comparison windows apply, and which Glean Value
Playbook evidence layers must be collected before evidence snapshots, claim
readiness, or executive readouts are generated.

It is not a value claim. It is not ROI. It is not EBITA. It is not causality. It
is not productivity measurement. It is not customer-facing financial output. It
is not a people analytics, HR decisioning, or performance management artifact.

## 2. Non-goals

The Measurement Plan must not:

- create migrations, Prisma schema changes, backend routes, frontend UI,
  ingestion jobs, or persistence;
- persist measurement plans or evidence snapshots;
- compute claim readiness;
- compute financial permission;
- create `claim_readiness_snapshots`;
- create `executive_readout_snapshots`;
- store raw BigQuery rows, raw prompts, raw responses, transcripts, file
  contents, or query text;
- store direct identifiers, hashed identifiers, pseudonymous identifiers, or
  joinable person identifiers;
- store person-level HRIS records;
- support people decisioning, manager/team ranking, individual productivity,
  compensation/performance inference, promotion/discipline inference, attrition
  prediction, or HRIS inference from AI usage.

## 3. Relationship to the Glean Value Playbook

The Measurement Plan sits after Value Hypothesis and before Evidence Collection:

`Value Hypothesis -> Measurement Plan -> Evidence Collection -> Evidence Snapshot -> Claim Readiness -> Executive Readout`

It translates a value hypothesis into an evidence collection plan. It makes
Layer 1 telemetry readiness, Layer 2 user voice / empirical evidence, Layer 3
business system-of-record outcomes, governance evidence, and assumption
evidence explicit before any snapshot is generated.

## 4. Relationship to Evidence Snapshots

Evidence Snapshots describe what evidence exists for a workflow window. The
Measurement Plan describes what evidence should be collected before that
snapshot is built.

Layer 1 telemetry readiness is not full Playbook readiness. Full Playbook
readiness requires explicit Layer 2 evidence, Layer 3 evidence, governance
evidence, assumption evidence or explicit not-required status, k-min posture,
and safe aggregate-only privacy posture.

## 5. Required Fields

Each Measurement Plan must include:

- `schema_version`
- `measurement_plan_id`
- `org_id`
- `value_hypothesis`
- `workflow_scope`
- `metric_selection`
- `windows`
- `playbook_evidence_requirements`
- `source_package_requirements`
- `aggregate_workforce_context_requirements`
- `vbd_measurement_design`
- `assumptions`
- `privacy_boundary`
- `readiness`
- `allowed_uses`
- `blocked_uses`
- `created_at`
- `derivation_version`

The shared validator lives at
[`shared/src/aiValueEngine/measurementPlan.ts`](../../../shared/src/aiValueEngine/measurementPlan.ts).

## 6. Value Hypothesis Binding

`value_hypothesis` binds the plan to the business question being tested:

- `hypothesis_statement`
- `value_route`
- `business_objective`
- optional `value_hypothesis_id`
- optional `sponsor_role`
- optional `owner_role`

Allowed `value_route` values:

- `cost_reduction`
- `capacity_creation`
- `quality_improvement`
- `risk_reduction`
- `experience_improvement`
- `revenue_expansion`
- `unclassified`

## 7. Workflow and Function Scope

`workflow_scope` defines the aggregate workflow boundary:

- `workflow_family`
- optional `workflow_name`
- optional `function_area`
- optional `included_surfaces`
- optional `excluded_surfaces`
- `approved_aggregate_grain`
- `minimum_cohort_threshold`

`minimum_cohort_threshold` must be at least `5`.

Allowed `approved_aggregate_grain` values:

- `org`
- `function`
- `workflow_family`
- `workflow`
- `role_family`
- `cohort`
- `custom_aggregate`

## 8. Metric Selection

Each plan must include a primary metric with:

- `metric_id`
- `metric_name`
- `metric_category`
- `source_system_type`
- optional `metric_owner_role`

Allowed `metric_category` values:

- `cycle_time`
- `throughput`
- `quality`
- `cost`
- `risk`
- `experience`
- `revenue`
- `capacity`
- `adoption`
- `readiness`
- `other`

Allowed `source_system_type` values:

- `bigquery_telemetry`
- `customer_system_of_record`
- `aggregate_survey_export`
- `aggregate_workforce_export`
- `finance_approved_assumption`
- `manual_customer_attestation`
- `not_selected`

## 9. Baseline and Comparison Windows

`windows` must include:

- `baseline_window_start`
- `baseline_window_end`
- optional `comparison_window_start`
- optional `comparison_window_end`
- `window_alignment_state`

Baseline start must be before baseline end. If comparison start is provided,
comparison end must also be provided, and comparison start must be before
comparison end.

Allowed `window_alignment_state` values:

- `baseline_only`
- `baseline_and_comparison_selected`
- `comparison_pending`
- `not_ready`

## 10. Playbook Evidence Requirements

Every plan must include all five evidence groups:

- `layer_1_platform_telemetry`
- `layer_2_user_voice_empirical`
- `layer_3_business_system_outcomes`
- `governance_evidence`
- `assumption_evidence`

Layer 1 records required, optional, and not-applicable telemetry signals.
Layer 2 records required, optional, and not-applicable user voice or empirical
exports. Layer 3 records required, optional, and not-applicable business
system-of-record exports. Governance records required and optional controls.
Assumption evidence records required assumptions, optional assumptions, and
required approvals.

## 11. Velocity, Breadth, and Depth Measurement Design

Velocity, Breadth, and Depth describe the maturity of AI-enabled work. They are
Layer 1 fluency signals that show how usage is growing, spreading, and
embedding across approved aggregate workflow slices.

- **Velocity** measures whether AI-enabled work is increasing over time.
- **Breadth** measures whether AI-enabled work is spreading across approved
  aggregate grains such as function, workflow family, workflow, role family, or
  cohort.
- **Depth** measures whether AI-enabled work is becoming embedded in repeatable
  workflow behavior.

`vbd_measurement_design` contributes only to
`layer_1_platform_telemetry`. VBD does not authorize ROI, EBITA, causality,
productivity, headcount reduction, individual attribution, manager/team
ranking, people decisioning, or customer-facing financial claims.

Breadth must remain aggregate-only. It must not become manager ranking, team
ranking, manager-chain analysis, person-level analytics, direct identifier
analysis, hashed or joinable identifier analysis, or people decisioning.

Depth may describe embedded repeatable workflow behavior, agent lifecycle,
artifact metadata, verification/review signals, or governed action boundaries.
Depth must not become a business value claim unless paired with Layer 3
business system outcomes or accepted quality/outcome evidence.

`vbd_claim_boundary.allowed_uses` may include only:

- `ai_fluency_posture`
- `layer_1_operating_signal`
- `evidence_collection_planning`
- `source_availability_context`

`vbd_claim_boundary.blocked_uses` must include:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

VBD becomes value-relevant only when paired with Playbook coverage, especially
Layer 2 user voice, Layer 3 business outcomes, governance evidence, and
approved customer-owned assumptions.

## 12. Source Package Requirements

`source_package_requirements` declares which aggregate source packages are
needed:

- `bigquery_source_required`
- `ai_fluency_baseline_required`
- `ai_fluency_retest_required`
- `system_of_record_export_required`
- `aggregate_workforce_context_required`
- `finance_or_business_owner_approval_required`
- `control_or_policy_owner_approval_required`
- `source_owner_attestation_required`

If Layer 2 is required, the plan must require an AI Fluency baseline or list a
user voice export. If Layer 3 is required, the plan must require a
system-of-record export.

## 13. Aggregate Workforce Context Requirements

Aggregate workforce context is allowed only when it is aggregate-only,
cohort-safe, customer-approved, non-decisioning, non-ranking, and free of direct
or joinable person identifiers.

`aggregate_workforce_context_requirements` includes:

- `allowed`
- `required`
- optional `allowed_context_types`
- `source_owner_approval_required`
- `minimum_cohort_threshold`
- `blocked_uses`

If aggregate workforce context is required, it must be allowed, source-owner
approval must be required, the minimum cohort threshold must be at least `5`,
and the blocked uses must include:

- `people_decisioning`
- `manager_or_team_ranking`
- `individual_attribution`
- `productivity_claim`

Aggregate workforce context never authorizes people decisioning, manager/team
ranking, individual attribution, or productivity scoring.

## 14. Assumption Requirements

`assumptions` declares whether customer-owned assumptions are required:

- `productivity_recapture_required`
- `financial_assumption_required`
- `customer_owned_assumption_required`
- `assumption_approval_state`
- optional `notes`

If `financial_assumption_required` is true,
`finance_or_business_owner_approval_required` must be true. If
`productivity_recapture_required` is true,
`customer_owned_assumption_required` must be true.

Allowed `assumption_approval_state` values:

- `not_required`
- `missing`
- `submitted`
- `approved`
- `rejected`
- `held`

## 15. Governance and Privacy Requirements

`privacy_boundary.aggregate_only` must be true. All unsafe privacy flags must be
false:

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

The validator also rejects forbidden fields that indicate raw content, prompts,
responses, direct identifiers, person-level HRIS, hashed or joinable person
identifiers, people decisioning, ranking, compensation/performance inference, or
productivity scoring.

## 16. Allowed Uses

Allowed uses are planning-only:

- `measurement_plan_design`
- `evidence_collection_planning`
- `source_package_request`
- `evidence_snapshot_preparation`

The Measurement Plan may prepare for evidence snapshots. It does not evaluate
claims, grant financial permission, or create readouts.

## 17. Blocked Uses

All Measurement Plans, across every readiness state, must block:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

Unsafe uses are rejected from `allowed_uses`.

## 18. Example Payload

Full examples:

- [layer-1-only-draft-plan.json](./examples/layer-1-only-draft-plan.json)
- [full-playbook-ready-plan.json](./examples/full-playbook-ready-plan.json)

Minimal excerpt:

```json
{
  "schema_version": "FT_AI_VALUE_MEASUREMENT_PLAN_2026_06",
  "readiness": {
    "measurement_plan_readiness": "held_for_customer_exports",
    "missing_requirements": [
      "layer_2_user_voice_empirical",
      "layer_3_business_system_outcomes"
    ]
  },
  "playbook_evidence_requirements": {
    "layer_1_platform_telemetry": { "required": true },
    "layer_2_user_voice_empirical": { "required": true },
    "layer_3_business_system_outcomes": { "required": true },
    "governance_evidence": { "required": true },
    "assumption_evidence": { "required": true }
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
