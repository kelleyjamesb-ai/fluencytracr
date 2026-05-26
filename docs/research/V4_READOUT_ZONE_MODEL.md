# V4 Readout Zone Model

## Purpose

This document completes Workstream 1 from
[V4 Next Sprint Plan](./V4_NEXT_SPRINT_PLAN.md).

It defines an internal aggregate zone model for Glean dogfood and future
client-pilot discussion. The model turns promoted behavior-cohort axes into
plain operating language: where to scale, enable, redesign, calibrate trust,
improve instrumentation, or hold interpretation.

This is not a runtime contract, schema, API, product surface, customer-facing
economic readout, ROI method, prediction method, scoring method, ranking
method, or new suppression framework.

## Scope

Authorized inputs are limited to governed aggregate evidence already allowed by
the current V4 research decisions:

- existing V1/V2/V3 verdict and suppression metadata,
- promoted internal `velocity_band` behavior-cohort axis,
- promoted internal `depth_repertoire_band` behavior-cohort axis,
- Quality Multiplier and Reliability Factor context where already aligned to
  the same aggregate keys,
- narrow trust attribution context where available,
- AGENT delegation and Skill Read presence as context-only dimensions,
- source-readiness, outcome-readiness, and instrumentation hold states.

The model must not introduce new canonical events, new suppression reasons,
tunable thresholds, individual fields, raw skill names, raw prompts, raw
outputs, transcripts, action rows, customer-specific benchmarks, or Glean
dogfood values as universal defaults.

## Zone Precedence

Zones are assigned as action postures, not as ratings.

1. If an existing fail-closed gate returns `SUPPRESS`, the zone is
   `SUPPRESSED`.
2. If required source coverage, outcome context, AGENT context, Skill context,
   or alignment evidence is too incomplete for interpretation, the zone is
   `INSTRUMENTATION_HOLD`.
3. If activity or Depth exists but verification or trust attribution is
   missing, aliased, held, or dominated by no-parent evidence, the zone is
   `TRUST_EVIDENCE_GAP`.
4. If activity is high but Depth, verification, recovery, or reliability
   evidence is weak or unstable, the zone is `SHALLOW_ADOPTION`.
5. If Depth Repertoire is strong in a narrower aggregate pocket without broad
   activity, the zone is `FOCUSED_EXPERT_USE`.
6. If Velocity and Depth Repertoire are stable and reliability or trust context
   is usable, the zone is `SCALE_CANDIDATE`.

This precedence uses existing bands and held states from approved aggregate
exports. It does not create configurable thresholds.

## Zone Table

| Zone | Strict input pattern | Allowed language | Blocked language | Example explanation |
| --- | --- | --- | --- | --- |
| `SCALE_CANDIDATE` | Eligible aggregate row; stable Velocity band; stable Depth Repertoire band; no blocking trust, reliability, or source-readiness caveat. | Candidate for expansion, enablement, or customer-owned value investigation. | Value proven; ROI expected; guaranteed savings; productivity lift; ranking language. | This aggregate workflow population shows stable activity and integrated use. It is ready for a business-owned value investigation, not a value claim. |
| `SHALLOW_ADOPTION` | Eligible aggregate row; activity is visible, but Depth, verification, recovery, reliability, or trust evidence is weak, unstable, or held. | Active use that likely needs enablement, workflow redesign, or trust-loop repair before economic interpretation. | Broad rollout success; adoption value; productivity gain; low performer label. | Activity is present, but the evidence does not yet show durable work integration. The right action is to improve the usage pattern before value analysis. |
| `FOCUSED_EXPERT_USE` | Eligible aggregate row; Depth Repertoire is strong in a narrower aggregate pocket, even when broad Velocity is lower. | Candidate for workflow study and possible expansion after business context review. | Elite team; expert ranking; proof of scalable value; automatic replication. | A narrower aggregate pattern shows integrated use. Study the workflow before deciding whether the behavior should expand. |
| `TRUST_EVIDENCE_GAP` | Activity or Depth exists, but trust signals are missing, aliased, no-parent, or otherwise held. | Improve verification, feedback, attribution, or calibration loops before stronger interpretation. | Trust proven; quality proven; verified savings; economic confidence. | Behavior is visible, but the trust evidence cannot yet support interpretation. The next step is attribution and feedback-loop repair. |
| `INSTRUMENTATION_HOLD` | Source coverage, outcome alignment, AGENT context, Skill context, or aggregate key alignment is incomplete enough to block interpretation. | Data-readiness gap; source coverage work needed; no value hypothesis beyond remediation. | Hidden value; likely value; estimated loss; comparison to other groups. | The row is not interpretable because required aggregate source coverage is missing or misaligned. Fix instrumentation before discussing value. |
| `SUPPRESSED` | Existing suppression gates fail for time, volume, convergence, baseline stability, or ambiguity. | Do not interpret; wait for an eligible window or repair eligible aggregate inputs. | Any economic claim; any readiness claim; any implied performance claim. | The row is suppressed by the existing governance gates. It should not be used for readout, comparison, or economic interpretation. |

## Operating Narrative

The zone model is a value-realization operating map. It helps a reviewer decide
which aggregate intervention is plausible next:

- scale where behavior is stable and integrated,
- enable where activity exists but integration is shallow,
- study narrower pockets where integrated behavior exists without broad volume,
- calibrate trust where attribution blocks interpretation,
- improve instrumentation where source coverage blocks interpretation,
- hold where fail-closed gates suppress evidence.

The model deliberately separates behavior evidence from economic proof. A zone
can route a value investigation only after the behavior evidence is aggregate,
stable, and governed. It cannot supply dollars, causality, productivity, or
customer-facing economic confidence by itself.

## What This Can Say

Safe readout language:

- "This aggregate workflow population is a candidate for value investigation."
- "This pattern looks active but not yet integrated enough for economic
  interpretation."
- "Trust attribution blocks stronger interpretation."
- "Source coverage is the next work item."
- "Suppressed rows stay out of interpretation."

## What This Cannot Say

Blocked readout language:

- "This group creates more value than another group."
- "This customer is more mature than another customer."
- "This behavior proves ROI."
- "This behavior caused a productivity lift."
- "This pattern predicts future savings."
- "This skill, person, manager, department, team, or customer should be ranked."
