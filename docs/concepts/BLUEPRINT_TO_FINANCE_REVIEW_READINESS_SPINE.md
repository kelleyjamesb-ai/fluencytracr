# Blueprint To Finance Review Readiness Spine

## Purpose

This document defines a documentation-stage measurement and data spine for
connecting Blueprint promises, aggregate AI Fluency movement, VBD movement,
customer-selected functional metrics, governance sufficiency, and future
finance-review readiness.

The spine is designed with a future Bayesian longitudinal model in mind, but it
does not authorize that model in product yet.

It answers:

```text
What data must align over time before FluencyTracr can responsibly estimate
whether AI-enabled workflow change is associated with movement in selected
business metrics that may be finance-relevant?
```

It does not answer:

```text
How much EBITA or EBITDA did AI create?
```

## Product Thesis

VBD does not prove value. VBD estimates how ready a workflow is to produce
measurable business movement.

VBD interaction patterns help estimate how quickly AI-enabled workflow change
should become measurable in selected business metrics. When those metric
movements align with the Blueprint promise and finance-approved financial
pathways, the model may later support governed research into whether
AI-enabled workflow change contributed to selected metric movement.

Any later contribution-confidence estimate must remain capped by evidence
design strength, governance clearance, metric specificity, source quality, and
finance review.

## Relationship To Existing Concepts

This spine sits between AI Value Measurement Model, AI Value Hypothesis
Readiness, AI Value Finance Investigation Readiness, Economic Impact Bridge,
and EBITA Impact Bridge.

```text
Blueprint Promise
-> AI Fluency Movement
-> VBD Time Series
-> Selected Functional Metric Movement
-> Evidence Design Strength
-> Value Hypothesis Readiness
-> Finance Investigation Readiness
-> Economic Impact Bridge
-> EBITA Impact Bridge
```

This concept does not replace those artifacts. It defines the measurement grain
and time-series logic they need to share before stronger statistical modeling
can be considered.

The first hardened object for this spine is the
[AI Value Measurement Cell](../contracts/ai-value-measurement-cell/README.md),
which validates cross-source alignment at the aggregate
function/workflow/cohort/window/metric grain.

## Canonical Measurement Cell

The core analytical unit is a Measurement Cell.

```text
Measurement Cell =
  org_id
+ function_area
+ workflow_id or workflow_family
+ cohort_key
+ time_window
+ metric_id
```

Every evidence source must map to the same Measurement Cell before it can
contribute to readiness or future model-readiness.

Required alignment fields:

- `org_id`
- `function_area`
- `workflow_id` or `workflow_family`
- `cohort_key`
- `time_window_id`
- `window_start`
- `window_end`
- `baseline_window`
- `comparison_window`
- `prior_window_ref`
- `metric_id`
- `source_ref`
- `owner_role`
- `review_state`

If a source cannot align to the same function, workflow, cohort, window, and
metric, it should remain context only.

## Time Series

The spine should support ongoing windows, not stop at day 180.

Initial windows:

- day 0 baseline
- day 30
- day 60
- day 90
- day 180
- day 365

Longer-running windows:

- rolling quarter
- rolling half year
- rolling year
- year-over-year comparison

The model should not assume an organization reaches peak VBD at one year.
Different functions and workflows will mature at different speeds. The product
should measure function/workflow maturity curves rather than a single
organization-wide peak.

## Core Inputs

### Blueprint Promise

Blueprint evidence records what was promised, for which workflows, against
which outcomes, and under which assumptions.

Required fields:

- `value_route`
- `value_promise`
- `workflow_family`
- `expected_metric_id`
- `expected_metric_direction`
- `expected_metric_lag`
- `assumption_refs`
- `business_owner_role`
- `finance_owner_state`
- `source_ref`

### Population Context

Population context explains the denominator without creating person-level
analytics.

Required fields:

- `eligible_seats`
- `active_seats`
- `function_area`
- `cohort_key`
- `cohort_suppression_state`
- `new_user_cohort_flag`

`new_user_cohort_flag` is future context only. New-hire or new-user behavior
should be studied as aggregate onboarding cohorts, not individual ramp scoring.

### AI Fluency Movement

AI Fluency captures aggregate stated readiness and behavior-change context.

Required fields:

- `fluency_score`
- `dimension_scores`
- `instrument_window`
- `response_count`
- `suppression_state`
- `source_ref`

AI Fluency movement can strengthen interpretation, but it does not prove
business impact.

### VBD Time Series

VBD is the behavioral exposure layer.

Required fields:

- `velocity`
- `breadth`
- `depth`
- `integration_score`
- `overall_vbd_score`
- `vbd_quadrant`
- `token_intensity_band`
- `source_ref`
- `suppression_state`

Token intensity remains spend and usage context only. It must not change the
VBD formula unless a later governed model explicitly promotes that use.

### Selected Functional Metric

The selected metric must be customer-owned and tied to the Blueprint promise.

Required fields:

- `metric_id`
- `metric_name`
- `metric_source_system`
- `metric_value`
- `metric_unit`
- `metric_direction`
- `metric_sensitivity`
- `normalization_denominator`
- `baseline_value`
- `comparison_value`
- `metric_delta`
- `source_ref`
- `owner_approval_state`

Good metrics are close to the workflow, directionally clear, and sensitive
enough to move inside the expected signal window.

### Confounder Registry

Every measurement cell should carry known confounders.

Examples:

- seasonality
- headcount changes
- staffing mix
- budget changes
- campaign or launch timing
- pricing changes
- policy changes
- workflow redesign unrelated to AI
- sales territory changes
- customer demand shocks
- support volume mix changes

Confounders do not automatically block measurement, but they cap confidence if
they are unaddressed.

## Derived Measurement Concepts

### VBD Score

The VBD score measures the quality of AI-enabled workflow adoption.

```text
Overall VBD Score =
  0.30(Velocity)
+ 0.30(Breadth)
+ 0.40(Depth)
```

VBD is an operating signal, not an economic proof.

### VBD Momentum

VBD Momentum measures the rate of behavioral change over time.

```text
VBD Momentum =
  current overall VBD score
- prior overall VBD score
```

A normalized version may be used for unequal windows:

```text
Normalized VBD Momentum =
  (current overall VBD score - prior overall VBD score)
  / days between window midpoints
  * 30
```

VBD Momentum should be interpreted at the function/workflow level. High early
momentum can indicate adoption acceleration. Slowing momentum may indicate
plateau, saturation, or the need for deeper workflow redesign.

### VBD Signal Emergence

VBD Signal Emergence estimates when selected metric movement should reasonably
become detectable.

It should consider:

- VBD level
- VBD Momentum
- Velocity, Breadth, and Depth interaction
- metric sensitivity
- expected metric lag
- baseline stability
- data noise
- comparison design strength

This is a timing estimate, not proof that movement occurred.

### Metric Delta

Metric Delta measures whether the selected customer-owned metric moved in the
expected direction.

```text
Metric Delta =
  comparison metric value
- baseline metric value
```

For metrics where lower is better, interpretation must use the expected
direction from the Blueprint or metric definition.

### Metric Yield

Metric Yield measures business-metric movement relative to sustained VBD
exposure.

```text
Metric Yield =
  normalized selected metric delta
  / sustained VBD exposure
```

Sustained VBD exposure should be treated as a future modeling construct, such
as average VBD level over a window or area under the VBD curve. It must not be
introduced as a hidden economic multiplier.

Metric Yield answers:

```text
After AI-enabled workflow adoption matures, are selected metrics continuing to
improve relative to the level of sustained AI-enabled work?
```

### Token Efficiency Yield

Token Efficiency Yield measures selected metric movement relative to token
intensity.

```text
Token Efficiency Yield =
  normalized selected metric delta
  / token intensity
```

This is an efficiency context signal only. It must not become ROI proof,
productivity scoring, employee evaluation, or a claim that lower token use is
always better.

### New User Ramp Curve

New User Ramp Curve is a future aggregate cohort lens.

It asks:

```text
How quickly do newly onboarded or newly activated users move from initial use
into breadth, depth, and workflow-connected behavior?
```

Allowed use:

- aggregate onboarding cohort context;
- enablement planning;
- expectation setting for time-to-signal.

Blocked use:

- individual ramp scoring;
- manager comparison;
- employee performance interpretation;
- HRIS-linked people decisioning.

## Evidence Design Strength

Evidence design strength caps any future confidence estimate.

| Design | Meaning | Confidence implication |
| --- | --- | --- |
| Assumption only | Blueprint or ROI assumption exists without observed movement. | Planning context only. |
| Baseline only | Day 0 state exists, but no comparison window. | No contribution confidence. |
| Pre/post | Baseline and comparison windows exist for the same cell. | Directional movement only. |
| Repeated pre/post | Multiple windows show sustained alignment. | Stronger directional evidence. |
| Matched comparison | Similar lower-exposure cell exists. | Contribution confidence can increase. |
| Staggered rollout | Different functions or cohorts adopt over time. | Strong quasi-experimental design. |
| Controlled test | Explicit holdout or controlled pilot exists. | Highest confidence candidate. |
| Calibrated historical model | Model validated across prior comparable windows. | Future calibrated confidence candidate. |

The model cannot be more confident than the evidence design allows.

## Bayesian Future Model

A Bayesian model makes sense later because this product will have noisy,
heterogeneous, time-series evidence across functions, workflows, metrics, and
customers.

The right future form is a Bayesian longitudinal panel model, not a direct
EBITA prediction model.

### Modeling Unit

The model should operate over Measurement Cells:

```text
cell = org_id, function_area, workflow_family, cohort_key, time_window, metric_id
```

### Metric Movement Model

Future research model:

```text
Selected metric movement for a cell and window
  = baseline function/workflow trend
  + AI Fluency movement
  + Velocity movement
  + Breadth movement
  + Depth movement
  + VBD interaction effects
  + token intensity context
  + business controls
  + time controls
  + error
```

Statistical form:

```text
metric_delta[cell, time] ~ Normal(mu[cell, time], sigma)

mu[cell, time] =
  alpha_org
+ alpha_function
+ alpha_workflow
+ beta_fluency * fluency_delta_lagged
+ beta_velocity * velocity_delta_lagged
+ beta_breadth * breadth_delta_lagged
+ beta_depth * depth_delta_lagged
+ beta_vbd_interaction * vbd_interaction_lagged
+ beta_token * token_intensity_context
+ gamma_controls * business_controls
+ gamma_time * time_controls
```

The interaction term should be tested rather than assumed. A useful research
candidate is:

```text
vbd_interaction =
  Velocity
+ Breadth
+ Depth
+ Velocity*Breadth
+ Velocity*Depth
+ Breadth*Depth
+ Velocity*Breadth*Depth
```

### Signal Emergence Model

A second future model can estimate time-to-signal:

```text
P(metric movement observed by window) =
  logistic(
    VBD level
  + VBD Momentum
  + metric sensitivity
  + expected metric lag
  + baseline stability
  + comparison strength
  - data noise
  )
```

This estimates when a metric may become measurable. It does not prove that AI
created the movement.

### Priors

Priors should be weakly informative at first and later calibrated from
validated historical evidence.

Possible prior sources:

- historical baseline movement inside the same customer;
- prior windows for the same function/workflow;
- comparable workflows inside the same customer;
- finance-approved expectations for metric lag;
- validated pilot data after governance review.

Priors must not encode sales promises as facts. A Blueprint promise may define
expected direction and value route; it must not become proof.

### Future Contribution Confidence Research

The future Bayesian output should estimate confidence in metric contribution,
not direct EBITA or EBITDA causality.

Safe internal research language:

```text
Posterior confidence that AI-enabled workflow change contributed to movement in
the selected metric, within the limits of the evidence design.
```

Potential future internal research bridge:

```text
Finance-review model readiness =
  posterior metric contribution confidence
  capped by evidence design strength
  adjusted by finance-approved metric-to-financial-driver linkage
  gated by governance clearance
```

No confidence percentage should be customer-facing until comparison designs,
calibration, source quality, finance review, and governance review are proven
and a later decision explicitly promotes that output.

## Architecture Requirements

A strong architecture should have:

- one canonical Measurement Cell grain;
- source-bound evidence for every cell;
- repeatable time windows;
- explicit prior-window references;
- VBD snapshots by function/workflow/cohort/window;
- selected metric snapshots by the same grain;
- metric sensitivity and expected lag;
- confounder capture;
- evidence design strength;
- finance-owner review state;
- governance and claim-boundary state;
- no hidden economic multipliers.

The spine should roll up from function/workflow cells to enterprise summaries
only after the lower-level evidence is valid. Organization-wide averages should
not hide weak, suppressed, or contradictory cells.

## Agentic Operating Model

Agents remain evidence workers, not claim makers.

- Blueprint Agent: extracts promises, value routes, workflow families, expected
  metrics, assumptions, owners, and expected directions.
- AI Fluency Agent: ingests aggregate instrument results and tracks movement by
  approved function/cohort/window.
- VBD Agent: creates aggregate VBD snapshots and VBD Momentum by measurement
  cell.
- Metric Agent: maps selected customer-owned metrics, expected lags,
  sensitivity, denominators, and metric deltas.
- Confounder Agent: records known business, staffing, seasonality, campaign,
  and process-change context.
- Finance Context Agent: records finance-approved metric-to-financial-driver
  pathways and owner review state.
- Governance Agent: blocks unsafe claims, missing source refs, person-level
  risk, weak design, unsupported assumptions, and suppressed evidence.
- Readiness Agent: assembles the Value Hypothesis Readiness packet and future
  model-readiness posture.

Each agent output must be structured, source-bound, aggregate-only, and
caveated.

## Claim Boundary

Allowed language:

- VBD movement;
- VBD Momentum;
- Signal Emergence Window;
- selected metric movement;
- Metric Yield;
- Token Efficiency Yield;
- evidence design strength;
- finance-review readiness pathway;
- future contribution-confidence research;
- finance-context investigation.

Blocked language:

- AI proved EBITA or EBITDA impact;
- AI caused EBITA or EBITDA growth;
- AI contributed to EBITA or EBITDA growth without approved causal design;
- realized ROI from usage;
- productivity proof;
- employee productivity lift;
- manager, team, or department ranking;
- individual ramp scoring;
- customer-facing prediction;
- confidence percentage without calibration and governance approval.

## Implementation Boundary

This concept authorizes docs-only planning and research framing unless a later
bounded contract-hardening slice explicitly promotes an alignment object.

The AI Value Measurement Cell is that first bounded contract-hardening slice.
It is a shared fail-closed alignment validator only. It does not score value,
run a Bayesian model, calculate finance movement, create customer-facing
outputs, or unlock stronger claim language.

It does not authorize:

- production schemas under `schemas/`;
- backend routes;
- persistence;
- frontend UI;
- connectors;
- SQL;
- runtime scoring;
- Bayesian model execution;
- confidence percentages;
- customer-facing economic output;
- ROI proof;
- causality claims;
- productivity claims;
- individual attribution;
- manager, team, department, or employee ranking.

Any future implementation must be promoted by a later decision record and must
preserve the nine governance invariants exactly.
