# AI Scale Readiness Portfolio

## Purpose

The AI Scale Readiness Portfolio defines an executive workflow investment view using Velocity x Depth.

Scale readiness is a workflow investment signal. It is not a comparative team evaluation, employee capability label, or maturity label.

## Contract Status

Status: docs-only internal readout contract. The governing concept is
[AI_SCALE_READINESS_PORTFOLIO.md](../../concepts/AI_SCALE_READINESS_PORTFOLIO.md).
The current dogfood decision records
`PROMOTE_AI_SCALE_READINESS_WITH_DEPTH_REPERTOIRE_CONTEXT` in
[V4_GLEAN_DOGFOOD_DECISION.md](../../research/V4_GLEAN_DOGFOOD_DECISION.md).
The final closeout decision records `PROMOTE_INTERNAL_SCALE_READINESS_READOUT`
in [V4_CLOSEOUT_DECISION.md](../../research/V4_CLOSEOUT_DECISION.md).

This contract is approved for internal Glean dogfood readout shape only. It
does not approve runtime APIs, schemas, customer-facing readouts, frontend
surfaces, automated recommendations, economic ranges, or dollarized output.
Any future API or schema must be separately promoted and limited to the
smallest governed surface needed.

## Executive Question

Which workflows are ready to scale, harvest, coach, redesign, govern, or suppress based on governed aggregate evidence?

## Velocity x Depth Matrix

Velocity measures adoption energy.

Depth measures work integration.

Depth Repertoire may appear as aggregate context about cross-surface return use
and may populate the `depth_repertoire_context` field defined below. It must
not become a hidden multiplier, threshold, dollar driver, or surfacing override.
It must not reconstruct suppressed values.

The matrix combines both:

| Velocity | Depth Repertoire Context | Interpretation |
| --- | --- | --- |
| High | Integrated Repertoire | Strong candidate for scale-readiness planning and value investigation. |
| High | Active But Shallow | Activity may be broad but needs enablement or workflow redesign before value investigation. |
| Low | Focused Integration | Focused integration may be meaningful but needs business-context review before scaling. |
| Low | Unstable / Insufficient | Evidence is too weak for economic interpretation. |
| Suppressed | Any | No economic or portfolio interpretation. |

## Depth Repertoire Boundary

Suppressed or insufficient Depth Repertoire evidence must remain null or absent
and must not be reconstructed through scale-readiness language. Internal Glean
dogfood values must not become readiness thresholds, benchmarks, defaults, or
calibration constants.

Depth Repertoire may classify the context around a workflow or surface. It does
not by itself calculate economic value, prove impact, or authorize customer-facing
claims.

## Depth Repertoire Context Classifications

| Classification | Evidence pattern | Action posture |
| --- | --- | --- |
| `INTEGRATED_REPERTOIRE` | Stable cross-surface repertoire and repeat use | Candidate value investigation |
| `ACTIVE_BUT_SHALLOW` | Strong activity with weak repertoire or repeat depth | Enablement or workflow redesign first |
| `FOCUSED_INTEGRATION` | Lower activity with coherent repeated repertoire | Business-context review before scaling |
| `UNSTABLE_OR_INSUFFICIENT` | Window movement, sparse evidence, or suppression | Hold economic interpretation |

These classifications are aggregate action postures. They are not employee
labels, group comparisons, economic values, or outcome claims.

## Decision Zones

### SCALE

Aggregate evidence supports broader rollout consideration with caveats.

### HARVEST

Aggregate evidence supports careful value realization, operationalization, or reporting.

### COACH

Aggregate evidence suggests adoption or integration needs enablement.

### REDESIGN

Aggregate evidence suggests the workflow or AI pattern may not fit the work.

### GOVERN

Aggregate evidence suggests stronger policy, review, or trust calibration is needed.

### INVESTIGATE_VALUE

Aggregate evidence supports a bounded economic value investigation. This zone
does not produce economic output. It only identifies where customer-owned
business assumptions or outcome evidence may be worth collecting.

### HOLD_FOR_EVIDENCE

Aggregate evidence is incomplete, unstable, suppressed, or too ambiguous for
action beyond further data readiness work.

### SUPPRESSED

Fail-closed gates block interpretation. No economic or portfolio values should be exposed.

## Trust Classification Boundary

Trust signals may appear only as readiness context until strict parent
attribution is validated.

| Classification | Evidence pattern | Allowed use |
| --- | --- | --- |
| `TRUST_EVIDENCE_AVAILABLE` | Verification or feedback volume exists | Continue attribution testing |
| `TRUST_ATTRIBUTION_HOLD` | Signal volume exists but parent joins are noisy | Caveat only |
| `TRUST_PARENT_ATTRIBUTION_READY` | Signals attach to exactly one governed parent surface | Eligible for Trust Calibration review |
| `TRUST_CALIBRATION_READY` | Attribution is stable and risk context is available | Future governed readout candidate |

Current dogfood state is `TRUST_ATTRIBUTION_HOLD`. While held, the portfolio
must fall back to existing V1/V2 behavior evidence such as completion,
abandonment, recovery, valid verification presence, Quality Multiplier,
Reliability Factor, and Velocity.

## Reusable Leverage Boundary

Reusable leverage may appear only as data-readiness context until governed
identity and join coverage are validated.

| Classification | Evidence pattern | Allowed use |
| --- | --- | --- |
| `WORKFLOW_METADATA_HOLD` | GCE workflow metadata does not expose reuse reliably | Do not interpret reuse spread |
| `SKILL_READ_EVIDENCE_AVAILABLE` | Agent span logs may expose skill reads | Run aggregate availability tests |
| `SKILL_READ_UNGOVERNED` | Reads lack governed identity or clean attribution | Caveat only |
| `REUSE_REVIEW_HELD` | Future validation candidate only; no reusable leverage interpretation is authorized | Hold for later exact-scope validation |

Current dogfood state is `SKILL_READ_EVIDENCE_AVAILABLE`, with reusable leverage
still held until the agent-span path proves governed identity and join coverage.
Raw skill names must not appear in this readout.

## Economic Investigation Routing

Status: `PROMOTE_INVESTIGATION_ROUTING_ONLY`

The portfolio may route internal value investigations. It must not calculate
economic output.

| Evidence pattern | Investigation route |
| --- | --- |
| Integrated Repertoire plus stable Velocity plus low friction | Candidate value investigation |
| Active But Shallow plus high activity | Enablement or workflow redesign before value investigation |
| Focused Integration plus lower activity | Business-context review before scale decision |
| Trust Attribution Hold | Trust caveat blocks strong value claim |
| Reusable Leverage Hold | Do not claim automation playbook spread |
| Suppressed or unstable evidence | Hold economic interpretation |

## Inputs

- V3 aggregate verdicts.
- Velocity.
- Depth Repertoire context.
- Quality Multiplier.
- Reliability Factor.
- Trust evidence classification.
- Reusable leverage classification.
- Outcome Evidence when available.

Depth Repertoire may guide internal scale-readiness context and investigation
routing. It does not promote economic output.

## Output Shape

A portfolio readout should include:

- workflow key,
- verdict,
- suppression reason,
- Velocity band,
- Depth Repertoire context classification,
- Trust classification,
- Reusable leverage classification,
- decision zone,
- investigation route,
- required caveats,
- blocked claims.

## Operational Controls

The repeatable process is governed by
[V4_INTERNAL_READOUT_RUNBOOK.md](../../research/V4_INTERNAL_READOUT_RUNBOOK.md).
Reusable operator templates live under
[docs/research/templates/](../../research/templates/).

Before any internal readout is used, the operator must complete:

- input checklist,
- evidence-gap checklist,
- aggregate-only safety review,
- held-signal review,
- decision memo.

These controls are operational process artifacts. They do not add runtime
fields, APIs, schemas, product surfaces, or customer-facing economic output.

## Required Caveats

Every portfolio readout should state:

- The output supports decisions about where to scale, coach, redesign, or govern.
- It is not a comparative team evaluation, employee capability label, or maturity label.
- Suppressed workflows cannot contribute portfolio totals.
- Decision zones require business context before action.
- Economic routing identifies where to investigate value; it does not calculate value.
- Trust and reusable leverage holds are evidence gaps, not negative findings.
- Missing surface, segment, verification, AGENT metadata, reusable workflow, or
  organization metadata coverage is a data readiness gap, not low readiness.

## Examples

```json
{
  "readout_type": "AI_SCALE_READINESS_PORTFOLIO",
  "workflow_id": "workflow:CHAT",
  "verdict": "SURFACE",
  "velocity_band": "HIGH",
  "depth_repertoire_context": "INTEGRATED_REPERTOIRE",
  "trust_classification": "TRUST_ATTRIBUTION_HOLD",
  "reusable_leverage_classification": "SKILL_READ_EVIDENCE_AVAILABLE",
  "decision_zone": "INVESTIGATE_VALUE",
  "investigation_route": "candidate_value_investigation",
  "required_caveats": [
    "Scale readiness is a workflow investment signal.",
    "Depth Repertoire provides aggregate context only.",
    "Trust attribution remains held until strict parent joins are validated.",
    "Reusable leverage remains held until governed identity and join coverage are validated.",
    "This readout routes value investigation; it does not calculate economic value."
  ]
}
```

## Non-Capabilities

The portfolio does not rank teams.

The portfolio does not label employee capability.

The portfolio does not calculate realized ROI.

The portfolio does not prove causality.

The portfolio does not override suppression.

The portfolio does not expose raw skill names.

The portfolio does not produce customer-facing economic output.
