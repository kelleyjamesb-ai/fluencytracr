# AI Manager Outcomes Recommendations

## Purpose

AI Manager Outcomes Recommendations is the docs-only contract shape for
recommended customer-owned outcome signals and testing formulas derived from
aggregate AI Work Evidence.

It tells an AI program leader which internal outcome data would make a value
hypothesis testable. It does not calculate ROI, prove causality, predict
outcomes, measure productivity, assess people, compare groups, or require
HRIS, survey, enablement, or person-level data.

## Contract Status

Status: docs-only recommendation contract.

This contract may be used to harden internal readout language, pilot packet
examples, templates, and review checklists. It does not authorize APIs,
schemas, storage, runtime services, frontend product surfaces, customer-facing
economic output, Time-Saved range values, ROI calculation, productivity claims,
causality claims, prediction claims, or ranking surfaces.

## Required Inputs

A recommendation record may use only aggregate, governed inputs:

- AI Work Evidence readout zone;
- governed workflow or surface key;
- approved aggregate cohort or segment key;
- Velocity and Depth context where already allowed;
- Reliability Factor and Quality Multiplier context where aligned;
- trust attribution and source coverage context;
- outcome evidence readiness, if present;
- value hypothesis routing;
- required caveats and blocked claims.

Suppressed evidence cannot produce an outcome recommendation.

## Required Output Fields

The docs-only record should include:

- `schema_version`,
- `readout_type`,
- `window_id`,
- `cohort_key`,
- `workflow_id` or approved aggregate surface key,
- `verdict`,
- `suppression_reason`,
- `ai_service_workflow_family`,
- `observed_pattern`,
- `value_routes`,
- `recommended_outcome_signals`,
- `recommended_source_types`,
- `formula_template`,
- `recommendation_readiness`,
- `quality_gates`,
- `confounders`,
- `required_caveats`,
- `blocked_claims`,
- `executive_next_action`.

The record must not contain user IDs, emails, names, employee IDs, raw prompts,
raw outputs, transcripts, raw event rows, raw ticket rows, raw skill names,
comparative group labels, manager-group comparisons, customer comparisons, or
person-level usage rows.

## Field Rules

### `schema_version`

Recommended value:

`FT_AI_MANAGER_OUTCOMES_RECOMMENDATIONS_2026_05_DOCS_ONLY`

### `readout_type`

Must be:

`AI_MANAGER_OUTCOMES_RECOMMENDATIONS`

### `verdict`

Must preserve existing verdict posture:

- `SURFACE`
- `SUPPRESS`

Default is `SUPPRESS`.

### `suppression_reason`

May use only the existing five suppression reasons:

- `INSUFFICIENT_TIME`
- `INSUFFICIENT_VOLUME`
- `NO_CONVERGENCE`
- `BASELINE_UNSTABLE`
- `HIGH_AMBIGUITY`

This contract adds no suppression reasons.

### `ai_service_workflow_family`

Plain-language aggregate family for the AI service or workflow lane that
produced the recommendation. This is readout context only. It must not become a
new canonical event, suppression reason, ontology, score, or customer-specific
taxonomy.

Allowed examples:

- `assistive_search_or_answer_surface`;
- `search_to_agent_workflow`;
- `agent_or_action_execution_workflow`;
- `verification_or_feedback_attached_workflow`;
- `trust_evidence_repair_workflow`;
- `source_linkage_or_boundary_repair`;
- `scale_candidate_aggregate_workflow`.

### `observed_pattern`

Plain-language aggregate behavior pattern. It must refer to workflow or surface
behavior, not people or teams.

Allowed examples:

- `verification_attached_workflow`;
- `search_to_agent_escalation`;
- `post_friction_continuation`;
- `execution_linked_workflow`;
- `high_volume_assistive_surface`;
- `trust_evidence_gap`;
- `instrumentation_hold`.

### `value_routes`

Allowed value routes:

- `COST_REDUCTION`;
- `REVENUE_EXPANSION`;
- `QUALITY_IMPROVEMENT`;
- `CAPACITY_CREATION`;
- `RISK_REDUCTION`;
- `EXPERIENCE_IMPROVEMENT`;
- `UNCLASSIFIED`.

Routes are investigation lanes. They are not evidence that value was realized.

### `recommended_outcome_signals`

Customer-owned aggregate metrics that could test the hypothesis.

Examples:

- cycle time;
- handling time;
- escalation rate;
- rework rate;
- reopen rate;
- QA pass rate;
- defect rate;
- stage progression;
- conversion rate;
- throughput;
- backlog movement;
- verification coverage;
- policy exception rate;
- onboarding milestone completion;
- CSAT or NPS.

### `recommended_source_types`

Source families that may contain the outcome signal. Allowed examples:

- support system;
- CRM;
- QA or review system;
- operations or workflow system;
- onboarding or help system;
- learning system, if customer-approved and aggregate-safe;
- finance or workforce planning system, if customer-approved and
  assumption-only;
- HRIS, only for approved aggregate segments or milestone context.

No source type is required at pilot start.

### `formula_template`

A customer-run aggregate testing formula. The formula must be descriptive and
must not emit dollars, hours saved, productivity lift, ROI, or causality.

Allowed formula families:

- `cycle_time_delta`;
- `friction_rate_delta`;
- `sales_cycle_delta`;
- `conversion_rate_delta`;
- `quality_rate_delta`;
- `throughput_delta`;
- `trust_coverage_share`;
- `exception_rate_delta`;
- `experience_metric_delta`.

### `recommendation_readiness`

Allowed readiness states:

- `READY_FOR_CUSTOMER_VALUE_TEST`;
- `OUTCOME_EVIDENCE_MISSING`;
- `SOURCE_COVERAGE_HOLD`;
- `TRUST_ATTRIBUTION_HOLD`;
- `FORMULA_REVIEW_REQUIRED`;
- `RESEARCH_ONLY`;
- `SUPPRESSED_NO_RECOMMENDATION`.

These are recommendation states, not suppression reasons.

### `quality_gates`

Every record must state whether these gates pass, fail, or are held:

- `pattern_fit`;
- `outcome_fit`;
- `source_plausibility`;
- `aggregate_safety`;
- `formula_clarity`;
- `confounder_awareness`;
- `governance_safety`.

If a gate fails, `recommendation_readiness` must not be
`READY_FOR_CUSTOMER_VALUE_TEST`.

### `confounders`

The record must name obvious reasons the test could mislead interpretation.

Examples:

- seasonality;
- volume mix;
- staffing changes;
- territory mix;
- product changes;
- support channel mix;
- policy changes;
- workflow redesign;
- missing attribution;
- incomplete source coverage.

### `blocked_claims`

Every recommendation must block:

- ROI calculation;
- causal impact;
- productivity lift;
- guaranteed savings;
- prediction;
- employee assessment;
- comparative group evaluation;
- manager-group comparison;
- department comparison;
- customer comparison;
- raw content inspection.

## Example Recommendation Record

```json
{
  "schema_version": "FT_AI_MANAGER_OUTCOMES_RECOMMENDATIONS_2026_05_DOCS_ONLY",
  "readout_type": "AI_MANAGER_OUTCOMES_RECOMMENDATIONS",
  "window_id": "internal_pilot_2026_05_28",
  "cohort_key": "aggregate_internal_pilot",
  "workflow_id": "workflow:support_assist",
  "verdict": "SURFACE",
  "suppression_reason": null,
  "ai_service_workflow_family": "search_to_agent_workflow",
  "observed_pattern": "search_to_agent_escalation",
  "value_routes": [
    "COST_REDUCTION",
    "EXPERIENCE_IMPROVEMENT"
  ],
  "recommended_outcome_signals": [
    "resolution_time",
    "escalation_rate",
    "reopen_rate",
    "CSAT"
  ],
  "recommended_source_types": [
    "support_system"
  ],
  "formula_template": {
    "formula_family": "cycle_time_delta",
    "plain_english": "baseline median resolution time minus AI-assisted median resolution time",
    "required_customer_inputs": [
      "baseline aggregate resolution time",
      "AI-assisted aggregate resolution time",
      "approved workflow or cohort join"
    ],
    "emits_economic_value": false
  },
  "recommendation_readiness": "OUTCOME_EVIDENCE_MISSING",
  "quality_gates": {
    "pattern_fit": "PASS",
    "outcome_fit": "PASS",
    "source_plausibility": "PASS",
    "aggregate_safety": "PASS",
    "formula_clarity": "PASS",
    "confounder_awareness": "PASS",
    "governance_safety": "PASS"
  },
  "confounders": [
    "support volume mix",
    "staffing changes",
    "missing approved behavior-to-outcome attribution"
  ],
  "required_caveats": [
    "tests value but does not prove causality",
    "customer owns metric definitions and assumptions",
    "no person-level interpretation"
  ],
  "blocked_claims": [
    "ROI calculation",
    "causal impact",
    "productivity lift",
    "employee assessment",
    "comparative group evaluation"
  ],
  "executive_next_action": "Ask the customer to provide an aggregate support outcome export for the same workflow and window."
}
```

## Non-Capabilities

This contract is not:

- an ROI calculator;
- a causation engine;
- a prediction engine;
- a productivity measure;
- an HR analytics model;
- a survey join;
- a training-record join;
- a manager dashboard;
- a team benchmark;
- a runtime schema;
- an endpoint;
- an automated recommendation surface.

## Relationship To Value Confidence

AI Manager Outcomes Recommendations may sit downstream of AI Work Evidence,
AI Scale Readiness, and Economic Impact Bridge in internal readout language. It
does not change verdicts, suppression, confidence bands, Time-Saved range
eligibility, Trust Calibration status, or outcome evidence status.

It recommends what customer-owned outcome evidence to connect next. It does
not consume that evidence to produce economic output.
