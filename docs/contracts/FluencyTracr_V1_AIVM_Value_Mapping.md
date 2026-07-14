# FluencyTracr V1 — AIVM Verdict Mapping

**Status:** Additive V1 verdict metadata  
**Purpose:** Make FluencyTracr `SURFACE` / `SUPPRESS` verdicts legible to Glean Value Realization language without changing suppression behavior.

## Additive Verdict Fields

Every V1 verdict payload includes:

| Field | Enum values | Default |
| --- | --- | --- |
| `value_type` | `ACCELERATION`, `QUALITY_PREMIUM`, `NET_NEW`, `UNCLASSIFIED` | `UNCLASSIFIED` |
| `evidence_grade` | `OBJECTIVE`, `CALIBRATED`, `QUALITATIVE` | `QUALITATIVE` |

Existing internal candidate-decision fields remain unchanged. `SUPP_*`
`suppress_reason_code` values and `renderable` are internal control-flow
diagnostics, not product output fields. The current JSON Schema is an unbound
SURFACE-only export projection; product-facing SUPPRESS verdicts use only the
canonical five suppression reasons.

## Deterministic Mapping

| AIVM field | Output | Deterministic rule |
| --- | --- | --- |
| `value_type` | `ACCELERATION` | `FT_V1_LATENCY_OBSERVED` is present and low `FT_V1_ABANDONMENT_OBSERVED` (`abandonment_present=false`) dominates observed abandonment, and the acceleration evidence score is greater than the quality evidence score. |
| `value_type` | `QUALITY_PREMIUM` | `FT_V1_VERIFICATION_PRESENCE_OBSERVED` and `FT_V1_RECOVERY_OBSERVED` are both present, and the quality evidence score is greater than the acceleration evidence score. |
| `value_type` | `NET_NEW` | Reserved for explicit upstream tagging only. V1 does not infer `NET_NEW` from behavioral events. |
| `value_type` | `UNCLASSIFIED` | Default when no deterministic AIVM mapping wins, including ties. |
| `evidence_grade` | `OBJECTIVE` | Only when `cohort_size >= 30` and `window_length_days >= 90`. |
| `evidence_grade` | `CALIBRATED` | Reserved for a future approved calibration source; V1 does not infer it. |
| `evidence_grade` | `QUALITATIVE` | Default for all other verdicts. |

## Governance Constraints

- This mapping does not introduce new canonical events, new suppression reasons, new thresholds, or admin overrides.
- This mapping does not change `SURFACE` / `SUPPRESS` decisions.
- This mapping does not store content, user identifiers, individual scores, rankings, probabilities, or free-text narrative.
- Suppression remains fail-closed. A suppressed verdict can still carry `value_type` and `evidence_grade`, but those fields are descriptive metadata only.
