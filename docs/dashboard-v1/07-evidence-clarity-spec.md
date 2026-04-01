# Evidence & Clarity Specification (Dashboard V1)

## Purpose

This document defines how FluencyTracr determines whether a workflow is clear enough to show on the executive surface.

FluencyTracr does not score people or teams.
It observes workflow-level AI interaction patterns.

Outputs are signals, not judgments.

---

## Observed Signals (Workflow-Level)

Signals are derived from canonical events:

- Acceptance / Edit / Reject / Abandon
- Iteration depth
- Verification presence (double-checking)
- Recovery activity
- Latency relative to workflow baseline

See V0 Behavioral Signals for authoritative definitions.

---

## Dominant Pattern

Each workflow may have one dominant working style at a time:

- Calibrated Fluency
- Blind Efficiency
- Recovery Maturity
- Friction Loop
- Undertrust Avoidance

Only one dominant pattern may be surfaced at a time.

If ambiguity exists, output is not shown.

---

## Visibility States

Each workflow must resolve to one of three states:

- VISIBLE → “Clear enough to show”
- NOT_ENOUGH_DATA_YET → “Not enough data yet”
- NOT_SHOWN_SAFETY → “Not shown (safety)”

No numeric scores are allowed.

---

## Risk-Weighted Sufficiency

Workflows are assigned a risk_class in the workflow registry:

- low
- medium
- high

Risk class affects how much evidence is required to be considered VISIBLE.

### Low Risk
- Minimum event threshold
- Window gating ≥ 30 days

### Medium Risk
- Higher event threshold
- Window gating ≥ 30 days

### High Risk
- Highest event threshold
- Verification presence required
- Window gating ≥ 30 days (≥ 60 days if sparse)

If verification is missing in high-risk workflows, the workflow is NOT_ENOUGH_DATA_YET.

---

## Suppression

Suppression is used only when:

- Ambiguity cannot be resolved safely
- Governance boundaries would be violated
- Required inputs are inconsistent

Suppression is not an error state.
It is a safety mechanism.

---

## Determinism Requirement

Given the same:

- Workflow registry version
- Event window
- Risk class

The output must be identical.

No randomness.
No heuristic drift.
No directional interpretation.
