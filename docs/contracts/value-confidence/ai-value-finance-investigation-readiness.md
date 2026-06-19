# AI Value Finance Investigation Readiness

## Purpose

AI Value Finance Investigation Readiness is a future-state, docs-only internal
contract for deciding whether an aggregate evidence package is ready for
customer-owned finance or business-owner review.

It is designed for the product FluencyTracr should grow into: AI Fluency,
Velocity, Breadth, Depth, token movement, selected metric movement, and finance
context can be reviewed together as a governed value hypothesis. The contract
does not turn those signals into a financial attribution result.

ROI Bot may participate as a sourced value-modeling companion. It can bring
approved live usage actuals, token/FlexCredit context, pricing assumptions,
volume assumptions, revenue assumptions, loaded-cost assumptions, source tags,
and pull dates into the review package. Those inputs are assumption and usage
context only. They do not override FluencyTracr suppression, alter AI Fluency
interpretation, change VBD scoring, upgrade evidence grade, or create financial
attribution.

It does not calculate realized ROI, estimate EBITA or EBITDA impact, prove
causality, predict finance movement, measure productivity, rank teams or
managers, attribute financial outcomes to AI, or create customer-facing
financial output.

## Contract Status

Status: future-state docs-only internal contract.

This contract may be used for pilot design, internal modeling language,
planning-grade examples, review checklists, and future schema planning. It does
not authorize APIs, runtime services, production schemas, automated
recommendation engines, customer-facing economic output, formula execution,
finance-system joins, realized ROI, productivity claims, causality claims,
prediction claims, or ranking surfaces.

## Future-State Question

The future-state question is:

> Is this aggregate evidence package ready for finance or business-owner review?

The contract must not answer:

> What is the probability that AI caused EBITA or EBITDA movement?

Allowed framing:

> Aggregate evidence supports a value hypothesis worth business-owner review.

Blocked framing:

> AI contributed to EBITA or EBITDA growth.

## Pilot Data Role

Pilot data may be used to test:

- record shape,
- time-window handling,
- selected metric review,
- same-window movement checks,
- comparison-design readiness,
- evidence-alignment review,
- caveat propagation,
- evidence-gap behavior,
- blocked-claim behavior,
- executive interpretation.

Pilot data must not tune a model to produce a favorable conclusion, establish
customer-facing financial claims, or become a default benchmark.

## Required Inputs

A finance-investigation-readiness record may use only aggregate, governed
inputs:

- AI Fluency aggregate movement,
- Velocity, Breadth, and Depth movement,
- token intensity or token efficiency movement,
- ROI Bot sourced usage actuals and financial assumptions when source tags,
  pull dates, and assumption owners are present,
- selected customer-owned outcome metric movement,
- customer-owned finance context when supplied or approved by the customer,
- value routes and EBITA-relevant driver candidates,
- controls and confounders,
- comparison design state,
- evidence window metadata,
- suppression state,
- required caveats,
- blocked claims.

Suppressed evidence cannot produce a finance-investigation recommendation.

## Required Output Fields

The docs-only record should include:

- `schema_version`,
- `readout_type`,
- `economic_readout_type`,
- `org_id`,
- `window_id`,
- `baseline_window`,
- `comparison_window`,
- `cohort_key`,
- `suppression_bucket_key`,
- `workflow_id`,
- `jbtd_id`,
- `persona_id`,
- `verdict`,
- `suppression_reason`,
- `selected_metric_id`,
- `selected_metric_name`,
- `selected_metric_direction`,
- `ai_fluency_movement_context`,
- `vbd_movement_context`,
- `token_movement_context`,
- `roi_bot_modeling_context`,
- `metric_movement_context`,
- `finance_context_state`,
- `value_hypothesis`,
- `value_routes`,
- `ebita_driver_candidates`,
- `comparison_design_readiness`,
- `customer_assumption_status`,
- `finance_validation_state`,
- `causality_status`,
- `evidence_grade`,
- `confidence_band`,
- `review_method`,
- `recommendation_readiness`,
- `quality_gates`,
- `confounders`,
- `required_caveats`,
- `blocked_claims`,
- `allowed_next_action`.

The record must not contain user IDs, emails, names, employee IDs, raw prompts,
raw outputs, transcripts, raw event rows, raw CRM rows, raw finance rows,
manager-chain fields, team-ranking fields, department-ranking fields,
person-level usage rows, person-level HRIS records, individual productivity
fields, financial attribution fields, or probability fields about finance
movement.

## Field Rules

### `schema_version`

Recommended value:

`FT_AI_VALUE_FINANCE_INVESTIGATION_READINESS_2026_06_DOCS_ONLY`

### `readout_type`

Must be:

`AI_VALUE_FINANCE_INVESTIGATION_READINESS`

### `economic_readout_type`

Must be:

`FINANCE_INVESTIGATION_READINESS`

This is a process-readiness readout. It is not an economic value output and
must not include financial estimates, ROI values, attributed value, or impact
probabilities.

### `cohort_key`

An approved aggregate cohort or function/workflow context. It is an
intervention context, not a ranking surface or performance group.

### `suppression_bucket_key`

The governed slice key used to prove the record was evaluated independently for
suppression. It should align to the existing slice posture, such as
`workflow_id`, `jbtd_id`, and `persona_id` where available.

### `workflow_id`, `jbtd_id`, and `persona_id`

`workflow_id` is required when the readiness review is workflow-specific.
`jbtd_id` and `persona_id` are nullable. Null means the slice was not approved
or available; it must not be inferred downstream.

### `verdict` and `suppression_reason`

Must preserve the existing fail-closed verdict semantics. If `verdict` is
`SUPPRESS`, `recommendation_readiness` must be `SUPPRESSED` and the record must
not include an allowed finance investigation action.

### `selected_metric_id`

The customer-selected metric under review. The metric may be chosen from a
function-filtered catalog, but the readiness record is about the selected
metric and evidence window, not about ranking functions.

### `ai_fluency_movement_context`

Aggregate AI Fluency movement between the baseline and comparison windows.
Allowed subfields:

- `baseline_percent`,
- `comparison_percent`,
- `delta_points`,
- `respondent_count_baseline`,
- `respondent_count_comparison`,
- `collection_mode`,
- `interpretation`.

AI Fluency is human-readiness and user-voice context. It is not value proof.

### `vbd_movement_context`

Aggregate movement in Velocity, Breadth, and Depth between the baseline and
comparison windows.

Allowed subfields:

- `velocity_baseline`,
- `velocity_comparison`,
- `breadth_baseline`,
- `breadth_comparison`,
- `depth_baseline`,
- `depth_comparison`,
- `movement_summary`.

VBD is workflow-integration context. It is not an economic metric and must not
upgrade financial claim readiness by itself.

### `token_movement_context`

Aggregate token intensity or efficiency movement for the same window and
approved slice.

Allowed subfields:

- `token_intensity_baseline`,
- `token_intensity_comparison`,
- `token_efficiency_band`,
- `interpretation`.

Token evidence is usage-cost or workflow-complexity context. It must not be
used to infer individual productivity, financial impact, or causal value.

### `roi_bot_modeling_context`

Sourced usage actuals and scenario assumptions from ROI Bot. Allowed subfields:

- `usage_actuals_state`,
- `source_tags_present`,
- `pull_date_present`,
- `assumption_owner_state`,
- `scenario_inputs_present`,
- `deliverable_packaging_state`,
- `interpretation`.

ROI Bot context is the governed value-modeling lane, not FluencyTracr
governance. It may help package a finance-review hypothesis after evidence
review, but it must not create realized ROI, productivity, causality, EBITDA,
EBITA, revenue, savings, individual-attribution, or customer-facing economic
claims by itself.

### `metric_movement_context`

Customer-owned aggregate outcome movement for the selected metric.

Allowed subfields:

- `metric_value_baseline`,
- `metric_value_comparison`,
- `delta_value`,
- `direction_of_improvement`,
- `expected_range`,
- `source_type`,
- `owner_role`,
- `validation_state`.

Metric movement is an outcome signal. It is not causality proof.

### `finance_context_state`

Customer-owned finance context for the same or adjacent review window.

Allowed values:

- `NOT_PROVIDED`,
- `CUSTOMER_STATED_UNVALIDATED`,
- `FINANCE_OWNER_ATTESTED`,
- `FINANCE_VALIDATED_INTERNAL`,
- `FINANCE_CONTEXT_APPROVED_FOR_INTERNAL_REVIEW`,
- `SUPPRESSED`.

The customer may use its own finance nomenclature, including EBITDA or EBITA,
when customer-provided. FluencyTracr must not normalize that nomenclature into
a universal financial-output claim.

### `value_hypothesis`

A plain-language statement of the value route worth investigating. It must be
phrased as a hypothesis, not a finding.

Allowed example:

> Faster sales-cycle completion may be worth business-owner review because AI
> Fluency, workflow integration, token movement, and selected sales-cycle
> movement improved in the same review window.

Blocked example:

> AI improved sales-cycle completion and increased EBITA.

### `value_routes`

Allowed route values:

- `REVENUE_EXPANSION`,
- `COST_REDUCTION`,
- `CAPACITY_CREATION`,
- `QUALITY_IMPROVEMENT`,
- `RISK_REDUCTION`,
- `EXPERIENCE_IMPROVEMENT`,
- `UNCLASSIFIED`.

### `ebita_driver_candidates`

Candidate EBITA-relevant drivers under customer review. Allowed candidates
must align to the EBITA Impact Bridge:

- `REVENUE_GROWTH`,
- `RETENTION_OR_EXPANSION`,
- `OPERATING_COST_REDUCTION`,
- `CAPACITY_CREATION`,
- `QUALITY_COST_REDUCTION`,
- `RISK_LOSS_REDUCTION`.

These are investigation routes only. They are not calculated, attributed, or
customer-facing financial outputs.

### `comparison_design_readiness`

Allowed values:

- `NO_COMPARISON_PLANNING_ONLY`,
- `PRE_POST_ONLY`,
- `MATCHED_COMPARISON_CANDIDATE`,
- `CUSTOMER_OWNED_RESEARCH_DESIGN_CANDIDATE`,
- `EXPERIMENTAL_OR_HOLDOUT_DESIGN_DOCUMENTED`.

Design state controls the maximum allowed interpretation. Candidate states do
not authorize formula execution or causal language.

### `customer_assumption_status`

Allowed values:

- `MISSING`,
- `CUSTOMER_STATED`,
- `BUSINESS_OWNER_REVIEWED`,
- `FINANCE_OWNER_ATTESTED`,
- `FINANCE_VALIDATED`,
- `SUPPRESSED`.

Customer-owned assumptions cannot upgrade evidence grade by themselves.

### `finance_validation_state`

Allowed values:

- `NOT_READY`,
- `READY_FOR_BUSINESS_OWNER_REVIEW`,
- `READY_FOR_FINANCE_CONTEXT_REVIEW`,
- `FINANCE_CONTEXT_REVIEWED`,
- `CUSTOMER_FACING_HELD`,
- `SUPPRESSED`.

This field describes process readiness only. It must not be rendered as
financial impact confidence.

### `causality_status`

Must use the parent Value Confidence statuses:

- `NOT_CAUSAL`,
- `ASSOCIATIONAL`,
- `VALIDATED_LEADING_INDICATOR`,
- `EXPERIMENTAL_EVIDENCE`.

Default is `NOT_CAUSAL`.

### `evidence_grade`

Must use the parent Value Confidence grades:

- `OBJECTIVE`,
- `CALIBRATED`,
- `QUALITATIVE`.

Customer-stated assumptions cannot upgrade evidence grade.

### `confidence_band`

Must be:

`NOT_APPLICABLE_READINESS_ONLY`

This contract does not emit a confidence band about AI-caused financial
movement. The parent field is present only to make the non-economic readiness
boundary explicit.

### `review_method`

Allowed values:

- `RULE_BASED_EVIDENCE_ALIGNMENT_REVIEW`,
- `CONTROL_COVERAGE_REVIEW`,
- `COMPARISON_DESIGN_DOCUMENTATION_REVIEW`,
- `FINANCE_OWNER_VALIDATION_REVIEW`.

The review method describes how readiness was checked. It must not imply
statistical execution, causal identification, prediction, probability scoring,
or finance attribution.

### `recommendation_readiness`

Allowed values:

- `HOLD_FOR_MISSING_EVIDENCE`,
- `HOLD_FOR_SUPPRESSION`,
- `READY_FOR_VALUE_HYPOTHESIS_REVIEW`,
- `READY_FOR_BUSINESS_OWNER_REVIEW`,
- `READY_FOR_FINANCE_CONTEXT_INVESTIGATION`,
- `FINANCE_CONTEXT_REVIEWED_INTERNAL`,
- `CUSTOMER_FACING_HELD`,
- `SUPPRESSED`.

The strongest allowed default future-state output is readiness for
finance-context investigation. This is not a confidence tier about AI-caused
financial movement.

### `quality_gates`

Required gate checks:

- `suppression_gates_cleared`,
- `aggregate_only`,
- `selected_metric_validated`,
- `same_window_review_complete`,
- `comparison_design_documented`,
- `controls_documented`,
- `finance_context_customer_owned`,
- `caveats_propagated`,
- `blocked_claims_enforced`.

Each gate should include `status`, `evidence`, and `gap` fields. Any failed
gate must hold the readiness state.

### `confounders`

Controls and confounders that may explain metric or finance movement.

Allowed control families:

- seasonality,
- demand or volume mix,
- pricing changes,
- staffing changes,
- territory or segment mix,
- product launches,
- support channel mix,
- workflow redesign,
- marketing campaign timing,
- macro or market movement,
- finance-policy changes,
- source coverage changes.

Missing controls must be represented as evidence gaps, not ignored.

### `allowed_next_action`

Allowed values:

- `HOLD`,
- `COLLECT_MISSING_AGGREGATE_EVIDENCE`,
- `REVIEW_VALUE_HYPOTHESIS_WITH_BUSINESS_OWNER`,
- `PREPARE_FINANCE_CONTEXT_INVESTIGATION_PACKET`,
- `ROUTE_TO_CUSTOMER_OWNED_FINANCE_REVIEW`,
- `DOCUMENT_INTERNAL_REVIEW_ONLY`.

No value may authorize customer-facing financial output, ROI claims, realized
savings claims, productivity claims, causal claims, or ranking surfaces.

## Review Design Notes

This contract may document whether an evidence package is ready for stronger
customer-owned review design. It must not encode formulas, coefficients,
weights, probabilities, finance predictions, or attribution logic.

Allowed review-method questions:

- Are the approved aggregate windows aligned?
- Did suppression gates clear for the reviewed slice?
- Is the selected metric customer-owned and business-owner reviewed?
- Are controls and confounders documented?
- Is comparison design documented as planning-only, candidate, or ready for
  separate customer-owned review?
- Is finance context customer-owned and clearly outside FluencyTracr
  calculation?
- Are blocked claims and required caveats propagated?

Any future statistical, econometric, or causal design belongs in a separately
approved research plan or customer-owned finance analysis. This contract can
record readiness for that review; it cannot execute it or translate it into an
AI financial contribution claim.

This readiness record cannot bypass the ROI Scenario financial claim gate or
the EBITA Impact Bridge. Those gates remain the governing path for any future
financial translation or customer-facing economic output.

## Allowed Language

Allowed phrases:

- "Aggregate evidence supports a value hypothesis worth business-owner review."
- "Ready for finance-context investigation."
- "Same-window metric movement is directionally aligned, non-causal, and caveated."
- "Customer-owned finance context may inform scenario review outside FluencyTracr."
- "The selected metric should be reviewed with the business owner before any stronger claim is made."

## Blocked Language

The record must block:

- "AI contributed to EBITA movement."
- "AI contributed to EBITDA movement."
- "Probability of EBITA impact."
- "Probability of EBITDA impact."
- "Confidence that AI caused finance movement."
- "Attributable EBITA."
- "Attributable EBITDA."
- "Realized ROI."
- "Dollarized value."
- "AI-driven productivity lift."
- "Predicted financial impact."
- "Token efficiency produced value."
- "VBD explains metric movement."
- "Controls prove contribution."
- "Selected metrics validate EBITA impact."
- "Selected metrics validate EBITDA impact."

## Required Caveats

Every finance-investigation-readiness record must include caveats stating:

- the record is aggregate-only,
- the record is non-causal unless a separately approved causal design exists,
- AI Fluency is readiness context, not value proof,
- VBD is workflow-integration context, not an economic metric,
- token movement is usage-cost or workflow-complexity context, not value proof,
- selected metric movement is customer-owned outcome context, not AI attribution,
- finance context is customer-owned and not calculated by FluencyTracr,
- suppressed evidence cannot produce a recommendation,
- customer-facing financial output remains held unless a later governance
  decision promotes that exact scope.

## Example Record

```json
{
  "schema_version": "FT_AI_VALUE_FINANCE_INVESTIGATION_READINESS_2026_06_DOCS_ONLY",
  "readout_type": "AI_VALUE_FINANCE_INVESTIGATION_READINESS",
  "economic_readout_type": "FINANCE_INVESTIGATION_READINESS",
  "org_id": "example-enterprise",
  "window_id": "M1_TO_M6_REVIEW",
  "baseline_window": {
    "label": "Month 1",
    "start_date": "2026-01-01",
    "end_date": "2026-01-31"
  },
  "comparison_window": {
    "label": "Month 6",
    "start_date": "2026-06-01",
    "end_date": "2026-06-30"
  },
  "cohort_key": "function:sales",
  "suppression_bucket_key": "workflow:sales-cycle-review|jbtd:opportunity-quality|persona:account-executive",
  "workflow_id": "sales-cycle-review",
  "jbtd_id": "opportunity-quality",
  "persona_id": "account-executive",
  "verdict": "SURFACE",
  "suppression_reason": null,
  "selected_metric_id": "sales_cycle_days",
  "selected_metric_name": "Sales cycle days",
  "selected_metric_direction": "LOWER_IS_BETTER",
  "ai_fluency_movement_context": {
    "baseline_percent": 48,
    "comparison_percent": 66,
    "delta_points": 18,
    "respondent_count_baseline": 742,
    "respondent_count_comparison": 781,
    "collection_mode": "aggregate_survey",
    "interpretation": "Readiness improved in the same review window."
  },
  "vbd_movement_context": {
    "velocity_baseline": 41,
    "velocity_comparison": 63,
    "breadth_baseline": 38,
    "breadth_comparison": 57,
    "depth_baseline": 34,
    "depth_comparison": 52,
    "movement_summary": "Workflow integration improved across the reviewed function."
  },
  "token_movement_context": {
    "token_intensity_baseline": "MEDIUM",
    "token_intensity_comparison": "HIGH",
    "token_efficiency_band": "IMPROVING",
    "interpretation": "Higher token use coincided with broader workflow integration."
  },
  "metric_movement_context": {
    "metric_value_baseline": 76,
    "metric_value_comparison": 64,
    "delta_value": -12,
    "direction_of_improvement": "LOWER_IS_BETTER",
    "expected_range": "62-72 days",
    "source_type": "customer_owned_crm_aggregate",
    "owner_role": "revenue_operations",
    "validation_state": "BUSINESS_OWNER_REVIEWED"
  },
  "finance_context_state": "CUSTOMER_STATED_UNVALIDATED",
  "value_hypothesis": "Sales-cycle movement may be worth business-owner review because readiness, workflow integration, token movement, and the selected sales metric improved in the same review window.",
  "value_routes": ["REVENUE_EXPANSION", "CAPACITY_CREATION"],
  "ebita_driver_candidates": ["REVENUE_GROWTH", "CAPACITY_CREATION"],
  "comparison_design_readiness": "PRE_POST_ONLY",
  "customer_assumption_status": "CUSTOMER_STATED",
  "finance_validation_state": "READY_FOR_BUSINESS_OWNER_REVIEW",
  "causality_status": "NOT_CAUSAL",
  "evidence_grade": "CALIBRATED",
  "confidence_band": "NOT_APPLICABLE_READINESS_ONLY",
  "review_method": "RULE_BASED_EVIDENCE_ALIGNMENT_REVIEW",
  "recommendation_readiness": "READY_FOR_BUSINESS_OWNER_REVIEW",
  "quality_gates": {
    "suppression_gates_cleared": {
      "status": "PASS",
      "evidence": "SURFACE verdict on approved aggregate slice.",
      "gap": null
    },
    "aggregate_only": {
      "status": "PASS",
      "evidence": "No person-level fields are present.",
      "gap": null
    },
    "selected_metric_validated": {
      "status": "PASS",
      "evidence": "Metric owner reviewed source and direction.",
      "gap": null
    },
    "same_window_review_complete": {
      "status": "PASS",
      "evidence": "Month 1 and Month 6 windows are documented.",
      "gap": null
    },
    "comparison_design_documented": {
      "status": "GAP",
      "evidence": "Pre/post only.",
      "gap": "No matched comparison or holdout design."
    },
    "controls_documented": {
      "status": "GAP",
      "evidence": "Seasonality noted.",
      "gap": "Pricing and territory-mix controls still required."
    },
    "finance_context_customer_owned": {
      "status": "PASS",
      "evidence": "Finance context is customer-stated and not calculated by FluencyTracr.",
      "gap": null
    },
    "caveats_propagated": {
      "status": "PASS",
      "evidence": "Required caveats are present.",
      "gap": null
    },
    "blocked_claims_enforced": {
      "status": "PASS",
      "evidence": "No ROI, causality, productivity, or attribution claim is emitted.",
      "gap": null
    }
  },
  "confounders": [
    "seasonality",
    "pricing changes",
    "territory or segment mix"
  ],
  "required_caveats": [
    "This is aggregate-only and non-causal.",
    "Finance context is customer-owned and not calculated by FluencyTracr.",
    "The record routes a value hypothesis for review; it does not attribute financial movement to AI."
  ],
  "blocked_claims": [
    "AI contributed to EBITA movement.",
    "Probability of EBITA impact.",
    "Realized ROI.",
    "AI-driven productivity lift.",
    "VBD explains metric movement.",
    "Token efficiency produced value."
  ],
  "allowed_next_action": "REVIEW_VALUE_HYPOTHESIS_WITH_BUSINESS_OWNER"
}
```

## Implementation Boundary

This contract is documentation-stage only. It does not authorize runtime
implementation, schemas, endpoints, persistence, frontend product surfaces,
automated scoring, probability output, finance-system joins, model execution,
customer-facing economic output, realized ROI, productivity claims, causality
claims, prediction claims, individual attribution, or ranking surfaces.
