# AI Value Formula Registry

## Purpose

This contract defines `fluencytracr_ai_value_formula_registry`, the canonical
metadata registry for mathematical formulas used or proposed across AI
Fluency, VBD, hypothesis-level outcome modeling, Bayesian DiD, longitudinal
modeling, pathway coherence, evidence-design claim caps, economic value
translation, portfolio aggregation, and data-quality gates.

The registry is both human-readable and machine-readable, but it is not a
formula execution engine. It catalogs what is implemented, what is synthetic
only, what is specified but not implemented, what is future research, what is
deprecated, and what is prohibited.

## Status

Status: metadata contract and validation registry.

The machine-readable registry is
[`formula-registry.json`](./formula-registry.json). The schema is
[`formula-registry.schema.json`](./formula-registry.schema.json).

This change does not add routes, UI, persistence, exports, migrations, live
connectors, production schemas, customer-facing confidence/probability output,
ROI, causality, productivity measurement, finance output, new canonical
events, new suppression reasons, tunable thresholds, admin overrides, or a
promotion decision.

## Registry Boundary

The registry may:

- identify canonical formula IDs, names, versions, layers, states, source
  contracts, required inputs, units, assumptions, limitations, prohibited
  interpretations, validation tests, and customer display posture;
- point to already-governed existing implementations as traceability metadata;
- document docs-only formula templates for customer-owned aggregate value
  tests;
- document prohibited formulas so later work cannot accidentally implement
  them.

The registry must not:

- call referenced functions;
- compute posterior, diagnostic, statistical, economic, ROI, productivity, or
  confidence/probability values;
- combine Fluency, VBD, and business outcome evidence into one arbitrary
  weighted composite;
- allow runtime-tunable weights, thresholds, coefficients, caps, or
  multipliers;
- upgrade evidence-design claim caps using finance assumptions, customer goals,
  favorable Fluency, or favorable VBD;
- use future windows in baselines, lagged exposure, counterfactuals, or
  eligibility checks;
- emit customer-facing economic output.

## Implementation States

Allowed states:

- `IMPLEMENTED_AND_TESTED`
- `IMPLEMENTED_SYNTHETIC_ONLY`
- `SPECIFIED_NOT_IMPLEMENTED`
- `FUTURE_RESEARCH`
- `DEPRECATED`
- `PROHIBITED`

Do not describe a formula as implemented unless an existing governed
implementation and validation test already exist.

## Canonical Model Layers

1. `AI_FLUENCY_MEASUREMENT`
2. `VBD_BEHAVIORAL_MEASUREMENT`
3. `HYPOTHESIS_OUTCOME_MODELING`
4. `COMPARISON_SUPPORTED_DID`
5. `HISTORICAL_COUNTERFACTUAL_MODELING`
6. `PATHWAY_COHERENCE`
7. `EVIDENCE_DESIGN_CLAIM_CAPS`
8. `ECONOMIC_VALUE_TRANSLATION`
9. `PORTFOLIO_AGGREGATION`
10. `DATA_QUALITY_AND_GOVERNANCE_GATES`

## Audit Table

| Formula or calculation | Current location | Current status | Mathematical meaning | Keep/change/deprecate |
| --- | --- | --- | --- | --- |
| `ai_fluency_observed_dimension_mean` | AI Fluency instrument concept and aggregate import docs | `SPECIFIED_NOT_IMPLEMENTED` | Mean of approved aggregate dimension scores for a cohort and wave | Keep as source-owned aggregate statistic; do not compute from respondent rows |
| `ai_fluency_aggregate_standard_error` | AI Fluency snapshot uncertainty fields | `SPECIFIED_NOT_IMPLEMENTED` | Aggregate standard error from approved sufficient statistics | Keep as required uncertainty concept; do not invent when absent |
| `ai_fluency_snapshot_aggregate_boundary` | `shared/src/aiValueEngine/aiFluencyInstrumentSnapshot.ts` | `IMPLEMENTED_AND_TESTED` | Source-independent aggregate snapshot validator | Keep |
| `ai_fluency_weighted_aggregate_import` | `shared/src/aiValueEngine/aiFluencyClientImport.ts` | `IMPLEMENTED_AND_TESTED` | Aggregate adapter weighting for source-provided AI Fluency summaries | Keep as adapter math only |
| `ai_fluency_dashboard_scale_normalization` | `shared/src/aiValueEngine/aiFluencyDashboardImportRunner.ts` | `IMPLEMENTED_AND_TESTED` | 0-100 to 1-5 dashboard normalization | Keep as adapter normalization, not canonical respondent scoring |
| `ai_fluency_latent_measurement_error_model` | Bayesian model-family contract | `FUTURE_RESEARCH` | Latent aggregate Fluency capability with measurement error | Keep specified as future research |
| `ai_fluency_arbitrary_overall_score` | Not authorized | `PROHIBITED` | Any unversioned total score or ad hoc cross-dimension weighting | Prohibit |
| `velocity_index` | `backend/src/value_realization/velocity_index.ts` | `IMPLEMENTED_AND_TESTED` | V2 aggregate distribution index across frequency, engagement, and breadth | Keep |
| `velocity_adjustment_factor` | `backend/src/value_realization/velocity_index.ts` and Quality Multiplier contract | `IMPLEMENTED_AND_TESTED` | Optional compiled adjustment factor derived from Velocity Index | Keep as existing contract only |
| `depth_repertoire_caveat_context` | `docs/contracts/depth/depth-repertoire.md` and Value Confidence docs | `SPECIFIED_NOT_IMPLEMENTED` | Aggregate caveat/context for repeated cross-surface use | Keep docs-only caveat context |
| `vbd_fixed_weight_composite` | Not authorized | `PROHIBITED` | Arbitrary weighted total across Velocity, Breadth, and Depth | Prohibit |
| `outcome_direction_adjusted_movement` | Bayesian model-family contract | `SPECIFIED_NOT_IMPLEMENTED` | Outcome movement adjusted so favorable direction is positive | Keep as internal formula specification |
| `minimum_worthwhile_change_indicator` | Bayesian model-family contract | `SPECIFIED_NOT_IMPLEMENTED` | Predeclared decision-context indicator for material movement | Keep as context only; not a prior or threshold |
| `comparison_supported_bayesian_did_effect` | `inference/src/fluencytracr_inference/model.py` | `IMPLEMENTED_SYNTHETIC_ONLY` | Current two-group pre/post Bayesian DiD synthetic proof estimand | Keep synthetic/internal only |
| `first_longitudinal_synthetic_model_slice` | `inference/src/fluencytracr_inference/longitudinal_model.py` | `IMPLEMENTED_SYNTHETIC_ONLY` | First longitudinal synthetic smoke model for in-sample VBD contrast | Keep synthetic smoke only |
| `historical_state_space_counterfactual_model` | Bayesian model-family contract | `FUTURE_RESEARCH` | Future historical counterfactual route for repeated aggregate windows | Keep future research |
| `posterior_pathway_coherence_review` | Bayesian model-family contract | `FUTURE_RESEARCH` | Internal review of directional coherence across Fluency, VBD, and outcome movement | Keep future research/internal only |
| `evidence_design_claim_cap` | Bayesian model-family contract | `SPECIFIED_NOT_IMPLEMENTED` | Claim-strength cap applied after estimation and before interpretation | Keep specified; no runtime upgrade |
| `finance_context_claim_cap_upgrade` | Not authorized | `PROHIBITED` | Any finance assumption that upgrades evidence design or claim level | Prohibit |
| `cycle_time_delta` | AI Manager Outcomes Recommendations contract | `SPECIFIED_NOT_IMPLEMENTED` | Customer-owned aggregate formula template for cycle-time movement | Keep docs-only |
| `friction_rate_delta` | AI Manager Outcomes Recommendations contract | `SPECIFIED_NOT_IMPLEMENTED` | Customer-owned aggregate formula template for friction-rate movement | Keep docs-only |
| `sales_cycle_delta` | AI Manager Outcomes Recommendations contract | `SPECIFIED_NOT_IMPLEMENTED` | Customer-owned aggregate formula template for sales-cycle movement | Keep docs-only |
| `conversion_rate_delta` | AI Manager Outcomes Recommendations contract | `SPECIFIED_NOT_IMPLEMENTED` | Customer-owned aggregate formula template for conversion-rate movement | Keep docs-only |
| `quality_rate_delta` | AI Manager Outcomes Recommendations contract | `SPECIFIED_NOT_IMPLEMENTED` | Customer-owned aggregate formula template for quality-rate movement | Keep docs-only |
| `throughput_delta` | AI Manager Outcomes Recommendations contract | `SPECIFIED_NOT_IMPLEMENTED` | Customer-owned aggregate formula template for throughput movement | Keep docs-only |
| `trust_coverage_share` | AI Manager Outcomes Recommendations contract | `SPECIFIED_NOT_IMPLEMENTED` | Customer-owned aggregate formula template for trust-coverage share | Keep docs-only |
| `exception_rate_delta` | AI Manager Outcomes Recommendations contract | `SPECIFIED_NOT_IMPLEMENTED` | Customer-owned aggregate formula template for exception-rate movement | Keep docs-only |
| `experience_metric_delta` | AI Manager Outcomes Recommendations contract | `SPECIFIED_NOT_IMPLEMENTED` | Customer-owned aggregate formula template for experience-metric movement | Keep docs-only |
| `modeled_value_draw` | Not authorized | `PROHIBITED` | Dollarized modeled value calculation | Prohibit |
| `portfolio_value_draw` | Not authorized | `PROHIBITED` | Portfolio total economic value calculation | Prohibit |
| `quality_multiplier_event_path` | `backend/src/value_realization/quality_multiplier.ts` | `IMPLEMENTED_AND_TESTED` | Existing compiled Quality Multiplier event path | Keep |
| `quality_multiplier_forwarded_distribution` | `backend/src/value_realization/quality_multiplier.ts` | `IMPLEMENTED_AND_TESTED` | Existing compiled forwarded-distribution Quality Multiplier path | Keep |
| `reliability_factor` | `backend/src/value_realization/reliability_factor.ts` | `IMPLEMENTED_AND_TESTED` | Existing compiled reliability composite | Keep |
| `causal_delta_pattern_rank_movement` | `backend/src/value_realization/causal_delta.ts` | `IMPLEMENTED_AND_TESTED` | Pattern-rank pre/post movement, not causal proof | Keep and preserve non-causal language |
| `v3_aggregate_ingest_rollups` | `backend/src/value_realization/v3_aggregate_ingest.ts` | `IMPLEMENTED_AND_TESTED` | V3 aggregate verdict and forwarded distribution derivations | Keep |
| `suppression_gate_default_hold` | Suppression contracts and backend gates | `IMPLEMENTED_AND_TESTED` | Default hold/suppress posture before gates clear | Keep |
| `seeded_ai_fluency_html_scoring` | `frontend/public/ai-fluency/assessment-24-item.html` | `DEPRECATED` | Seeded/illustrative HTML scoring | Deprecate as canonical authority |

## AI Manager Formula Families

The following formula families are descriptive customer-run aggregate templates
only:

- `cycle_time_delta`
- `friction_rate_delta`
- `sales_cycle_delta`
- `conversion_rate_delta`
- `quality_rate_delta`
- `throughput_delta`
- `trust_coverage_share`
- `exception_rate_delta`
- `experience_metric_delta`

They must not emit dollars, hours saved, productivity lift, ROI, causality,
probability, confidence percentage, or customer-facing economic output.

## Claim Cap Boundary

Favorable Fluency or VBD context cannot rescue a failed or weak primary
business outcome. Finance assumptions, ROI Bot context, Blueprint target
values, sponsor goals, and minimum worthwhile change cannot upgrade evidence
design strength, posterior eligibility, claim level, evidence grade, or
customer-facing output authorization.

## Verification

Canonical validation:

```bash
npm run test:ai-value-formula-registry
npx openspec validate add-ai-value-formula-registry --strict
```
