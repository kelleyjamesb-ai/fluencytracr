# Reliability Factor Contract

**Status:** Additive V1 verdict metadata  
**Purpose:** Provide a bounded workflow-level reliability composite for surfaced aggregate evidence without changing FluencyTracr suppression behavior.

## Scope

Reliability Factor is emitted on aggregate workflow verdicts as a read-only evidence descriptor. It summarizes whether a surfaced workflow pattern shows signs of reliable AI-assisted work: verification, successful recovery, low abandonment, and low friction-loop behavior.

It does not introduce new canonical events, suppression reasons, thresholds, overrides, user-level fields, or individual scoring. The default disclosure posture remains fail-closed.

## Output Fields

| Field | Type | Range | Rule |
| --- | --- | --- | --- |
| `reliability_factor` | `number \| null` | `0.000` to `1.000` | Null when verdict is `SUPPRESS`; otherwise the rounded bounded composite. |
| `reliability_components` | `object \| null` | component rates from `0.000` to `1.000` | Null when verdict is `SUPPRESS`; otherwise the four component rates used in the formula. |

Component object:

```json
{
  "abandonment_rate": 0.1,
  "friction_loop_rate": 0.2,
  "recovery_success_rate": 0.9,
  "verification_presence_rate": 1
}
```

## Formula

```text
clamp01(0.5 + 0.25 * verification_presence_rate + 0.25 * recovery_success_rate - 0.25 * abandonment_rate - 0.25 * friction_loop_rate)
```

The implementation rounds the final bounded value to three decimal places. Component rates are also bounded to `[0, 1]` before use.

## Component Definitions

All components are derived from existing canonical workflow events only.

| Component | Direction | Definition |
| --- | --- | --- |
| `verification_presence_rate` | Raises reliability | Share of aggregate workflow executions where verification behavior is observed. Derived from `VERIFICATION_PRESENCE_OBSERVED`. |
| `recovery_success_rate` | Raises reliability | Share of aggregate workflow executions where recovery behavior resolves into usable continuation rather than abandonment. Derived from `RECOVERY_OBSERVED` and existing disposition evidence. |
| `abandonment_rate` | Lowers reliability | Share of aggregate workflow executions where the observed workflow is abandoned. Derived from `ABANDONMENT_OBSERVED`. |
| `friction_loop_rate` | Lowers reliability | Share of aggregate workflow executions showing repeated retry/friction-loop behavior. Derived from existing iteration and latency corroboration signals, without treating latency alone as a surfacing trigger. |

## Null-on-SUPPRESS Rule

When the verdict is `SUPPRESS`, both `reliability_factor` and `reliability_components` must be `null`.

Suppressed evidence must not receive a fallback Reliability Factor, a default neutral value, or a partial component payload. Downstream consumers should preserve the suppression reason and avoid converting suppressed evidence into a value-realization claim.

## Known Limits

- Reliability Factor is not a gate. It must not change `SURFACE` or `SUPPRESS` decisions.
- Reliability Factor is not a hallucination detector and does not inspect generated content.
- Reliability Factor is not statistical significance, causality, ROI, or outcome attribution.
- Reliability Factor is not an individual score and must not be computed or displayed at user level.
- Reliability Factor does not create a built-in JBTD or persona taxonomy.
- Latency remains corroborative only; it cannot independently trigger surfacing or reliability disclosure.
- The composite is bounded and directional, not a complete explanation of workflow quality.
