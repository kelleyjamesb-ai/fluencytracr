# V4 Value Confidence Layer

## Purpose

V4 defines the Value Confidence Layer for FluencyTracr. It converts governed aggregate behavioral evidence into executive economic decision artifacts.

V4 does not calculate realized ROI. V4 qualifies the defensibility of AI value claims. It uses aggregate, privacy-preserving, fail-closed evidence to help executives understand which claims are supportable, which are caveated, and which must remain blocked.

## Why V4 Exists

Glean's time-saved pipeline can anchor a commercial value conversation, but raw activity and estimated time saved do not automatically become defensible economic value.

Executives need to know whether AI activity is becoming durable operating leverage. That requires more than usage volume. It requires evidence that adoption has energy, work integration, quality, reliability, calibrated trust, and appropriate caveats.

V4 exists to make that evidence boundary explicit before build work begins.

## V3 Foundation

V3 provides the foundation:

- customer-side transformation,
- aggregate-only ingest,
- governed calibration validation,
- fail-closed verdicts,
- immutable verdict persistence,
- verdict replay for reportability consumers.

V4 composes V3 outputs. It does not replace V3 ingest, bypass suppression gates, or create a raw-data path into FluencyTracr.

## V4 Thesis: Velocity x Depth -> Economic Confidence

Velocity measures adoption energy.

Depth measures work integration.

Economic value confidence requires both.

V4 converts AI activity into economic confidence only when governed aggregate evidence supports it. High activity without integration can be fragile. Deep integration without broad adoption may be valuable but limited. V4 must distinguish activity from durable operating leverage.

## Executive Questions V4 Supports

V4 should help executives ask:

- Which parts of the time-saved claim are defensible?
- Where is AI investment failing to convert into supported value?
- Which workflows are ready to scale, harvest, coach, redesign, or govern?
- Is trust behavior calibrated to workflow risk?
- Which caveats must travel with any customer-facing claim?

## Core Frameworks

### Time-Saved Defensibility Range

The Time-Saved Defensibility Range qualifies a raw time-saved estimate using Velocity, Depth, Quality Multiplier, Reliability Factor, Trust Calibration, and evidence grade.

It is a defensibility range, not a single ROI number.

### AI Value Leakage Map

The AI Value Leakage Map identifies aggregate places where AI investment may not be converting into defensible value. Leakage can come from velocity, depth, reuse, verification, recovery, or friction gaps.

Value leakage is not a performance judgment.

### AI Scale Readiness Portfolio

The AI Scale Readiness Portfolio uses Velocity x Depth to identify workflow investment zones: scale, harvest, coach, redesign, govern, or suppress.

The portfolio is a workflow investment signal, not a team ranking or employee capability label.

### Trust Calibration Index

The Trust Calibration Index interprets verification behavior against workflow risk and evidence quality.

It does not reward maximum verification. It asks whether trust behavior appears appropriate for the work.

## Economic Outputs

V4 may define executive economic decision artifacts such as:

- defensibility ranges for time-saved claims,
- leakage maps for scenario-based value risk,
- scale readiness portfolios for workflow investment planning,
- trust calibration caveats for reportability,
- required caveats for customer-facing value claims.

Suppressed evidence cannot produce dollar values, hours saved, upside estimates, or portfolio totals.

## Baseline Strategy

### Time-saved pipeline estimate as commercial anchor

Glean's time-saved estimate remains the commercial anchor. FluencyTracr does not replace that pipeline.

### Workflow historical norm as behavioral baseline

Workflow historical norms provide behavioral context for whether current aggregate patterns are meaningfully different from prior operation.

### External business KPI as optional validation

External business KPIs may strengthen confidence when they are customer-attested, aggregate, and governed. They do not automatically prove causality.

### Customer-stated baseline as planning assumption only

Customer-stated baselines are planning assumptions. They cannot upgrade evidence grade by themselves and must not override aggregate evidence.

## Causality Boundary

Default causality status is `NOT_CAUSAL`. V4 may support associational or validation-oriented language only when the evidence supports it and caveats travel with the readout.

V4 must not claim causal productivity lift unless future experimental evidence is explicitly validated and governed.

## What V4 Does Not Claim

V4 does not calculate realized ROI.

V4 does not prove value.

V4 does not create customer-facing prediction claims.

V4 does not rank people, teams, managers, departments, or customers.

V4 does not produce productivity measurement.

V4 does not rescue suppressed evidence.

## Governance Invariants

V4 must preserve the nine invariants:

1. No new canonical events.
2. No new suppression reasons.
3. No tunable thresholds.
4. No admin overrides.
5. No individual scoring or user-identifiable fields.
6. Default verdict is `SUPPRESS`.
7. Latency is corroborative only.
8. Assurance Harness CI must remain green.
9. Suppression gates apply independently per governed slice.

## Build Sequence

1. Define concepts and contracts in Markdown.
2. Add minimal schema work only after contract language stabilizes.
3. Add fixtures that prove suppression and aggregate-only behavior.
4. Implement readout computation behind existing V3 verdict boundaries.
5. Add reportability integration only after suppressed economics and caveat propagation are mechanically enforced.

This PR covers step 1 only.

## Open Questions

- Which V4 readout should be implemented first?
- What evidence grade is required for each executive readout?
- How should customer-stated assumptions be represented without upgrading evidence?
- What minimum holdout validation is required before predictive research can become product?
- How should V4 artifacts attach to reportability decisions without changing reportability states?
