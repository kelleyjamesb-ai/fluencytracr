# AI Value Token Efficiency Signal Contract

Schema version: `FT_AI_VALUE_TOKEN_EFFICIENCY_SIGNAL_2026_06`

## 1. Purpose

The Token Efficiency Signal is a contract-only Layer 1 cost/intensity overlay
for aggregate token usage. It helps AI value teams understand whether an
approved workflow window has enough aggregate token evidence to review cost
exposure, model usage, workflow intensity, model routing, workflow design, and
evidence collection planning.

It is not a value claim. It is not ROI. It is not EBITA. It is not causality. It
is not productivity measurement. It is not headcount reduction evidence. It is
not customer-facing financial output.

## 2. Non-goals

The Token Efficiency Signal must not:

- store raw rows;
- store raw prompts, responses, transcripts, query text, or file contents;
- store direct identifiers;
- store hashed, pseudonymous, tokenized, or joinable person identifiers;
- store person-level HRIS records or person-level productivity data;
- support manager/team comparative ordering, people decisioning, or individual
  attribution;
- compute ROI, EBITA, productivity, causality, headcount reduction, financial
  impact, or customer-facing financial output;
- create migrations, Prisma schema edits, backend routes, frontend UI,
  ingestion jobs, persistence, claim readiness snapshots, or executive readout
  snapshots.

## 3. Evidence Mapping

| Field | Required value | Meaning |
| --- | --- | --- |
| `playbook_layer` | `layer_1_platform_telemetry` | Token usage is platform telemetry only. |
| `evidence_lane` | `surface_usage` | Token usage is a surface/workflow intensity signal, not user voice or system-of-record outcome evidence. |
| `coverage_contribution` | `layer_1_cost_intensity_overlay` | The signal can annotate Layer 1 cost/intensity posture. |
| `full_playbook_coverage_contribution` | `false` | Token usage cannot create or upgrade full Playbook coverage. |

VBD remains the Layer 1 AI fluency posture. Token Efficiency is a separate
Layer 1 cost/intensity overlay. Neither VBD nor Token Efficiency can become
full Playbook coverage without Layer 2 user voice, Layer 3 system-of-record
outcomes, governance evidence, and approved assumptions.

## 4. Required Fields

Each signal must include:

- `schema_version`
- `token_efficiency_signal_id`
- `org_id`
- `workflow_family`
- `generated_at`
- `covered_window`
- `approved_aggregate_grain`
- `minimum_cohort_threshold`
- `k_min_posture`
- `playbook_layer`
- `evidence_lane`
- `coverage_contribution`
- `full_playbook_coverage_contribution`
- `evidence_state`
- `source_refs`
- `source_owner_attestation`
- `privacy_boundary`
- `allowed_uses`
- `blocked_uses`
- `value_proof_policy`
- `caveats`
- `derivation_version`

Present or partial signals must include `aggregate_token_summary`.

The shared validator lives at
[`shared/src/aiValueEngine/tokenEfficiencySignal.ts`](../../../shared/src/aiValueEngine/tokenEfficiencySignal.ts).

## 5. Aggregate Token Summary

Present or partial signals may carry aggregate metrics such as:

- `total_prompt_tokens`
- `total_completion_tokens`
- `total_tokens`
- `model_families_observed`
- `aggregate_interaction_count`
- `aggregate_workflow_count`
- `high_intensity_workflow_share`
- `average_tokens_per_interaction`
- `average_tokens_per_workflow`
- `prompt_to_completion_ratio`

These fields are aggregate summary values only. They must not contain raw rows,
prompts, responses, transcripts, query text, file contents, direct identifiers,
or joinable person identifiers.

## 6. Allowed Uses and Blocked Uses

Allowed uses are limited to:

- `cost_exposure_review`
- `model_usage_review`
- `workflow_intensity_review`
- `token_efficiency_review`
- `model_routing_review`
- `workflow_design_review`
- `evidence_collection_planning`

Every signal must block:

- `realized_roi`
- `ebita_claim`
- `causality_claim`
- `productivity_claim`
- `headcount_reduction_claim`
- `individual_attribution`
- `manager_or_team_ranking`
- `people_decisioning`
- `customer_facing_financial_output`

## 7. Value Proof Policy

The following flags must be false:

- `token_usage_is_roi_proof`
- `token_usage_is_productivity_proof`
- `token_usage_is_financial_output`
- `token_usage_computes_causality`
- `downstream_claim_strength_upgrade_allowed`

Downstream objects may cite Token Efficiency only as caveated Layer 1
cost/intensity context. They must not use it to upgrade claim readiness,
financial permission, full Playbook coverage, or customer-facing economic
output.

## 8. K-Min and Held State

`minimum_cohort_threshold` must be at least `5`, and `k_min_posture` must carry
the same minimum. Present or partial token evidence requires
`k_min_posture.cohort_threshold_met: true`.

If k-min does not clear, the signal can remain structurally valid only as
`evidence_state: held`, with explicit caveats. Held token evidence does not
feed Evidence Snapshot context.

## 9. Relationship to Other Contracts

- Source Packages may reference Token Efficiency as Layer 1 source-readiness
  context only.
- Evidence Snapshots may carry valid present Token Efficiency as Layer 1
  caveated cost/intensity context, not as coverage upgrade.
- Measurement Plans may request Token Efficiency during evidence collection
  planning, but it remains separate from VBD and cannot authorize value claims.

## 10. Examples

Validator-backed examples:

- [`examples/valid-token-efficiency-signal.json`](./examples/valid-token-efficiency-signal.json)
- [`examples/held-token-efficiency-signal.json`](./examples/held-token-efficiency-signal.json)

## 11. Validation

Run:

```bash
npm run test:ai-value-token-efficiency-signal
```

The tests validate examples and reject unsafe raw content, identifiers,
person-level fields, unsafe privacy flags, unsafe allowed uses, missing blocked
uses, value-proof upgrades, k-min failures for present evidence, and attempts
to make Token Efficiency full Playbook coverage.
