# V4 Validation Plan

## Purpose

This plan preserves the forecasting ambition behind V4 without turning it into an unvalidated product claim.

Forecasting requires validation against held-out cohort data before it becomes a customer-facing product capability. Predictive outputs, if ever productized, must remain cohort-level, confidence-gated, non-causal by default, and never person-level.

## Why Prediction Is Not Yet Productized

Current V4 documentation defines value confidence, not prediction. The repo does not yet contain validated holdout evidence that early aggregate patterns reliably forecast future economic confidence.

Until validation exists, V4 must not make customer-facing prediction claims.

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
