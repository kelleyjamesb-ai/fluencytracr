# V4 Intervention Tracking Research Design

## Purpose

This document defines the V4 intervention tracking research design and records
the first saved-data readiness test.

The goal is to answer a bounded operating question:

> After a known enablement, workflow redesign, Skill rollout, agent deployment,
> or trust-loop change, did aggregate behavior move in the intended direction?

This is research-only. It adds no APIs, schemas, Prisma migrations, runtime
services, frontend surfaces, customer-facing economic outputs, ROI
calculation, causal claim, prediction claim, individual scoring, comparative
team evaluation, comparative department evaluation, productivity measurement,
maturity label, automated recommendation, raw skill-name readout, new
canonical events, new suppression reasons, tunable thresholds, or admin
overrides.

## Why This Phase Matters

Velocity x Depth and segment overlay tell us where behavior differs. They do
not tell us whether an organization is improving because of a deliberate
action.

Intervention tracking is the bridge from a static readout to an operating
system:

```text
readout zone
-> human intervention
-> next fixed window
-> aggregate movement review
```

The design must remain descriptive. It can say behavior moved after an
intervention. It cannot say the intervention caused the movement unless a
separate causal design is approved later.

## Intervention Definition

An intervention is a known human or system action intended to change aggregate
AI work behavior.

Allowed intervention types:

| Intervention type | Example | Intended movement |
| --- | --- | --- |
| `ENABLEMENT_SESSION` | Training, office hours, role-based workshop | Higher Velocity, higher Depth, fewer shallow rows |
| `WORKFLOW_REDESIGN` | Redesigned prompt flow, template, handoff, or artifact | Lower friction, better completion, stronger repeat use |
| `SKILL_ROLLOUT` | Reusable Skill or playbook introduced | More repeatable leverage and less one-off behavior |
| `AGENT_DEPLOYMENT` | Autonomous or workflow agent introduced | More structured delegation where appropriate |
| `TRUST_LOOP_CHANGE` | Feedback, citation, review, approval, or correction loop | Better attributable trust evidence |
| `LEADERSHIP_CAMPAIGN` | Executive or manager reinforcement | Higher activation or breadth in target segments |
| `POLICY_OR_GOVERNANCE_CHANGE` | Usage guidance, risk policy, approval threshold | Better trust/reliability posture |

## Required Intervention Ledger

The next test requires an aggregate intervention ledger with these fields:

| Field | Required | Notes |
| --- | --- | --- |
| `intervention_id` | Yes | Stable non-person identifier. |
| `intervention_type` | Yes | One of the governed intervention types. |
| `intervention_date` | Yes | Used to align pre/post windows. |
| `target_scope_type` | Yes | Segment, workflow, surface, work mode, or org-wide. |
| `target_scope_id` | Yes | Aggregate target only; no person identifiers. |
| `expected_movement` | Yes | Plain-language direction, not a target threshold. |
| `source_owner` | Yes | Business, AIOM, enablement, product, or governance owner. |
| `evidence_caveat` | Yes | What this intervention cannot prove. |

The ledger must not include user IDs, emails, names, raw prompts, raw outputs,
transcripts, raw event rows, raw skill names, or manager-specific targets.

## Movement Review Shape

The research readout should compare aggregate pre/post windows:

| Component | Meaning |
| --- | --- |
| Pre-window | Fixed window before the intervention. |
| Post-window | Fixed window after the intervention. |
| Segment or workflow | Aggregate target where movement is reviewed. |
| Velocity movement | Directional change in adoption energy. |
| Depth Repertoire movement | Directional change in work integration. |
| Trust movement | Directional change in attributable trust evidence where available. |
| Reliability movement | Directional change in friction, abandonment, recovery, or verification context. |
| Readout-zone movement | Movement across scale, shallow, focused, trust-gap, instrumentation-hold, or suppressed zones. |

Allowed movement labels:

- `MOVED_AS_EXPECTED`
- `MOVED_OPPOSITE_EXPECTATION`
- `NO_MEANINGFUL_MOVEMENT`
- `MIXED_MOVEMENT`
- `INSUFFICIENT_EVIDENCE`
- `SUPPRESSED`

These are review labels, not scores.

## Saved-Data Readiness Test

Tested inputs:

- `dogfood-output/v4-velocity-depth-zone/v4_velocity_depth_zone_summary_safe.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`
- `dogfood-output/v4-readout-zone-data-test/v4_readout_zone_data_test_summary.csv`
- `dogfood-output/v4-segment-overlay-test/v4_segment_overlay_summary.csv`

Derived readiness output:

- `dogfood-output/v4-intervention-tracking-test/v4_intervention_tracking_readiness.csv`

Result:

| Required field group | Observed status | Test result |
| --- | --- | --- |
| Intervention identity | Missing | `HOLD_FOR_INTERVENTION_LEDGER_SOURCE` |
| Intervention timing | Missing | `HOLD_FOR_INTERVENTION_LEDGER_SOURCE` |
| Target scope | Partial behavior segments only | `DESIGN_READY_EXPORT_NOT_READY` |
| Movement metrics | Partial window summaries only | `DESIGN_READY_EXPORT_NOT_READY` |
| Claim safety | Ready as design constraint | `PROMOTE_INTERVENTION_TRACKING_RESEARCH_DESIGN` |

## What The Test Proves

The method is safe to design.

The current saved V4 outputs already contain enough aggregate behavior evidence
to review movement once a governed intervention ledger exists. Velocity, Depth
Repertoire, segment overlay, and readout zones can serve as movement review
dimensions.

## What The Test Does Not Prove

The saved outputs do not yet contain intervention identity, intervention date,
source owner, target scope, or expected movement. Therefore they cannot support
an actual pre/post intervention readout today.

The current evidence does not prove:

- an intervention changed behavior,
- any causal effect,
- ROI,
- time saved,
- productivity lift,
- customer value,
- team performance,
- manager effectiveness,
- employee behavior,
- skill effectiveness.

## Decision

`PROMOTE_INTERVENTION_TRACKING_RESEARCH_DESIGN`

Also:

`HOLD_FOR_INTERVENTION_LEDGER_SOURCE`

The design can move forward. Actual intervention movement testing is blocked
until a governed aggregate intervention ledger exists.

## Required Next Test

Create a small aggregate intervention ledger fixture and run one dry research
readout over existing saved windows.

Minimum fixture rows:

| Intervention type | Target scope | Expected movement |
| --- | --- | --- |
| `ENABLEMENT_SESSION` | Velocity x Depth segment | More rows in stronger readout zones |
| `WORKFLOW_REDESIGN` | Workflow or work mode | Less shallow adoption or friction |
| `TRUST_LOOP_CHANGE` | Trust evidence gap segment | More attributable trust evidence |

The fixture can be synthetic for method validation, but any real dogfood use
must use actual intervention records approved by the source owner.

## What Remains Blocked

- Runtime intervention APIs,
- canonical schemas,
- productized intervention ledger,
- automated recommendations,
- causality,
- ROI,
- productivity claims,
- customer-facing intervention readouts,
- person, team, manager, department, customer, or skill ranking.

## Open Questions

- Which source should own the first real intervention ledger: AIOM enablement,
  product rollout, skills program, or trust-loop initiative?
- Should intervention windows be fixed 60-day windows or nearest eligible
  pre/post windows around the intervention date?
- How should overlapping interventions be represented without implying
  attribution certainty?
- Should the first actual test use enablement, workflow redesign, or trust-loop
  repair?
