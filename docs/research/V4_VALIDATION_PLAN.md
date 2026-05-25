# V4 Validation Plan

## Purpose

This plan preserves the forecasting ambition behind V4 without turning it into an unvalidated product claim.

Forecasting requires validation against held-out cohort data before it becomes a customer-facing product capability. Predictive outputs, if ever productized, must remain cohort-level, confidence-gated, non-causal by default, and never person-level.

## Why Prediction Is Not Yet Productized

Current V4 documentation defines value confidence, not prediction. The repo does not yet contain validated holdout evidence that early aggregate patterns reliably forecast future economic confidence.

Until validation exists, V4 must not make customer-facing prediction claims.

## V4 Signal Validation Gate

The V4 signal validation gate precedes productization. It must be completed
before a candidate signal can become a productized V4 API, schema, contract, or
customer-facing readout.

Canonical validation gate documents:

- [V4 Signal Validation Gate](./V4_SIGNAL_VALIDATION_GATE.md)
- [V4 Signal Validation Runbook](./V4_SIGNAL_VALIDATION_RUNBOOK.md)
- [V4 Signal Validation Readout Template](./V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md)
- [V4 Depth Readout Runbook](./V4_DEPTH_READOUT_RUNBOOK.md)
- [V4 Depth Stability Decision](./V4_DEPTH_STABILITY_DECISION.md)
- [V4 Depth Repertoire Stability Readout](./V4_DEPTH_REPERTOIRE_STABILITY_READOUT.md)
- [Work Mode Taxonomy](../concepts/WORK_MODES.md)
- [V4 Value Confidence Caveat Propagation Runbook](./V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md)
- [V4 TSDR Caveat Propagation Decision](./V4_TSDR_CAVEAT_PROPAGATION_DECISION.md)
- [V4 AI Value Leakage Map Caveat Propagation Decision](./V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md)

Forecasting remains out of scope. Product APIs remain out of scope until signal
promotion decisions are made through the validation gate. A `PROMOTE` decision
means a signal is eligible for later productization review, not automatically
productized.

## V4 Depth Readout Gate

The V4 Depth Readout Engine is dogfood-only. It may be used to study how
aggregate Velocity and Depth evidence interact across workflow or surface
aggregates, but it does not authorize V4 economic APIs, customer-facing
readouts, schemas, or frontend product surfaces.

Depth validation must distinguish surface repertoire from repeat/refinement
volume. Repeat/refinement evidence is useful, but it must not be treated as the
whole Depth construct unless it is paired with a non-saturated component such as
surface repertoire, verification, delegation, or reuse evidence.

Depth Repertoire is the current research candidate for that non-saturated spine:
`Surface Repertoire x Repeat Use / Refinement`. The dedicated stability readout
promotes it for contract hardening only. Glean dogfood values from that readout
must not be embedded into universal concepts, contracts, schemas, thresholds,
calibration values, or defaults. V4 economic readouts, Time-Saved Defensibility
Range, and value-confidence APIs remain blocked from depending on Depth
Repertoire until a later value-confidence review explicitly allows it.

The calibration plan is
[V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_PLAN.md](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_PLAN.md).
The current calibration decision is
[V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md](./V4_DEPTH_REPERTOIRE_VALUE_CONFIDENCE_CALIBRATION_DECISION.md),
which records `PROMOTE_CAVEAT_ONLY`. V4 value-confidence artifacts may use
Depth Repertoire only as aggregate caveat/context. It must not modify
confidence bands, surfacing eligibility, Time-Saved Defensibility Range, ROI
language, causal claims, prediction claims, or any customer-facing economic
number unless a later calibration decision explicitly promotes that use.

Any V4 artifact that carries Depth Repertoire caveat/context must pass
[V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md](./V4_VALUE_CONFIDENCE_CAVEAT_PROPAGATION_RUNBOOK.md)
before further contract hardening. Passing caveat propagation does not
authorize economic dependency; it only proves that context does not alter
values, bands, zones, eligibility, or blocked claims.

The Time-Saved Defensibility Range contract has passed caveat propagation in
[V4_TSDR_CAVEAT_PROPAGATION_DECISION.md](./V4_TSDR_CAVEAT_PROPAGATION_DECISION.md).
That decision permits documentation-stage TSDR contract hardening only. It does
not authorize runtime implementation, schema hardening, economic dependency,
range adjustment, confidence-band adjustment, eligibility use, ROI, causality,
prediction, productivity, maturity, or ranking claims.

The AI Value Leakage Map contract has passed caveat propagation in
[V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md](./V4_VALUE_LEAKAGE_CAVEAT_PROPAGATION_DECISION.md).
That decision permits documentation-stage leakage-map contract hardening only.
It does not authorize runtime implementation, schema hardening, economic
dependency, leakage severity adjustment, value-at-risk adjustment,
confidence-band adjustment, eligibility use, ROI, causality, prediction,
productivity, maturity, or ranking claims.

Reusable Workflow Propagation and Named Workflow Leverage remain `HOLD` unless
future validation promotes them. Time-Saved Defensibility Range and other V4
economic readouts remain blocked until Depth readout stability is demonstrated
across windows or cohorts.

The canonical decision record is
[V4_DEPTH_STABILITY_DECISION.md](./V4_DEPTH_STABILITY_DECISION.md). If that
decision is `HOLD_FOR_MORE_WINDOWS`, `HOLD_FOR_SIGNAL_REFINEMENT`,
`NARROW_TO_SUBSIGNALS`, or `REJECT_CURRENT_READOUT`, no V4 economic API,
Time-Saved Defensibility Range implementation, or Depth-dependent economic
readout may start. Depth contract hardening is allowed only if the decision is
`PROMOTE_DEPTH_CONTRACT_HARDENING`.

## V4 Scale Readiness To Economic Value Gate

The next V4 planning layer is documented in:

- [AI Scale Readiness Portfolio](../concepts/AI_SCALE_READINESS_PORTFOLIO.md),
- [Organizational Segmentation](../concepts/ORG_SEGMENTATION.md),
- [Economic Impact Bridge](../concepts/ECONOMIC_IMPACT_BRIDGE.md).

These are concept documents, not implementation approval. They define how V4
should eventually answer where to scale AI, where to coach, where to redesign
workflows, where to calibrate trust, and where evidence is too weak to act.

The current caveat propagation decisions are:

- [V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md](./V4_SCALE_READINESS_CAVEAT_PROPAGATION_DECISION.md)
  records `HOLD_FOR_60_DAY_GLEAN_DOGFOOD`.
- [V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md](./V4_TRUST_CALIBRATION_CAVEAT_PROPAGATION_DECISION.md)
  records `HOLD_FOR_60_DAY_GLEAN_DOGFOOD`.
- [V4_GLEAN_DOGFOOD_DECISION.md](./V4_GLEAN_DOGFOOD_DECISION.md)
  records the overall current decision: `HOLD_FOR_60_DAY_GLEAN_DOGFOOD`.

The required next evidence step is a Glean internal dogfood run across three
60-day-compliant windows:

| Window | Start | End |
| --- | --- | --- |
| 1 | 2026-03-23 | 2026-05-22 |
| 2 | 2026-02-21 | 2026-04-22 |
| 3 | 2026-01-22 | 2026-03-23 |

That run must align V3 verdict metadata, Velocity, Quality Multiplier,
Reliability Factor, Depth Repertoire, Trust Calibration evidence, data readiness
gates, and safe segmentation coverage to the same cohort/window keys. Until the
dogfood decision promotes a scope, no V4 economic API, customer-facing readout,
Time-Saved Defensibility Range productization, Organizational Segmentation
runtime support, or Economic Impact Bridge runtime support may start.

## Candidate Predictive Tests

### Skill Catalyst vs Selection Test

Test whether reusable Skills cause later depth or whether already-deep cohorts are simply more likely to create Skills.

### Time-to-Depth Curve

Test whether early Velocity and verification behavior predict how quickly a cohort reaches higher aggregate Depth bands.

### Early Stall-Risk Signal Discovery

Test whether early aggregate patterns indicate that adoption energy will stall before work integration appears.

## Target Variables

Candidate targets may include:

- later Depth band,
- later Trust Calibration band,
- later Reliability Factor band,
- sustained Velocity distribution,
- surfaced reportability outcome,
- customer-attested aggregate outcome evidence.

Targets must remain cohort-level.

## Feature Set

Candidate features may include:

- Velocity distributions,
- Depth dimensions,
- surface breadth,
- work mode distributions,
- AGENT sub-surface mix,
- verification attribution,
- recovery and abandonment evidence,
- Reliability Factor,
- Quality Multiplier,
- governed baseline metadata.

Features must not include user IDs, names, emails, raw prompts, raw outputs, transcripts, or row-level event records.

## Holdout Design

Validation must use held-out cohort windows. Training and evaluation windows must be separated by time, customer, workflow, or another documented holdout design.

The holdout plan must prevent leakage from future outcomes into early features.

## Leakage Controls

Controls should prevent:

- including outcome variables as features,
- including future windows in current-window features,
- joining person-level identifiers into model outputs,
- using customer-specific tuning to improve apparent performance,
- reconstructing suppressed values.

## False Positive / False Negative Risks

False positives may push investment toward workflows that are not truly ready.

False negatives may delay useful enablement or scaling decisions.

Both risks must be documented before any predictive output becomes a product capability.

## Governance Constraints

Predictive research must preserve:

- no new canonical events,
- no new suppression reasons,
- no tunable thresholds,
- no admin overrides,
- no individual scoring,
- no team ranking,
- no productivity scoring,
- no customer-facing prediction claims before validation,
- fail-closed suppression,
- aggregate-only outputs.

## Criteria for Productization

Prediction may be considered for productization only after:

- held-out validation is complete,
- false positive and false negative risks are documented,
- output remains cohort-level,
- causality status defaults to `NOT_CAUSAL`,
- suppressed readouts expose no economics,
- reportability caveats are defined,
- governance review approves the product boundary.

## Open Questions

- What minimum holdout size is required?
- Which target variable best represents durable operating leverage?
- How should customer and workflow heterogeneity be handled?
- What validation result is strong enough for customer-facing use?
- Should predictive research remain internal-only even if validation succeeds?
