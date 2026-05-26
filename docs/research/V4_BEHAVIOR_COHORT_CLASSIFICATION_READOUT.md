# V4 Behavior Cohort Classification Readout

## Purpose

This readout tests the next step after the full V4 rehearsal: whether saved
aggregate CSVs can classify trust evidence, behavior-derived cohort readiness,
and joint behavior-cohort distributions.

This is research-only. It adds no APIs, schemas, Prisma migrations, runtime
services, frontend surfaces, customer-facing economic outputs, ROI
calculations, causal claims, prediction claims, individual scoring,
comparative team evaluation, comparative department evaluation, productivity
measurement, or maturity label.

## Inputs Reviewed

This readout uses saved aggregate files only:

- `dogfood-output/v4-trust-attribution-refinement/v4_trust_attribution_all_windows.csv`
- `dogfood-output/v4-trust-attribution-refinement/v4_trust_attribution_summary.csv`
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_*.csv`
- `dogfood-output/v4-skill-read-availability/skill_read_availability_all_windows.csv`
- `dogfood-output/v4-trust-signal-availability/agent-feedback/agent_feedback_summary_safe.csv`

Derived outputs:

- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_window_1.csv`
- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_window_2.csv`
- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_window_3.csv`
- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_all_windows.csv`
- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_summary_safe.csv`
- `dogfood-output/v4-trust-cohort-classification/v4_behavior_cohort_readiness_summary.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`

## Trust Classification Results

The saved attribution output supports narrow trust evidence classification:

| Signal | Classification | Signal count | Attributed count | Decision |
| --- | --- | ---: | ---: | --- |
| `CHAT_FEEDBACK` | `ATTRIBUTABLE_TRUST_SIGNAL` | 375,674 | 375,674 | Candidate |
| `SEARCH_FEEDBACK` | `ATTRIBUTABLE_TRUST_SIGNAL` | 2,663 | 2,663 | Candidate |
| `AI_SUMMARY_VOTE` | `ATTRIBUTABLE_TRUST_SIGNAL` | 86 | 86 | Narrow review only |
| `CHAT_CITATIONS` | `ATTRIBUTABLE_TRUST_SIGNAL` | 2,243 | 2,243 | Narrow review only |
| `AI_ANSWER_VOTE` | `TRUST_SIGNAL_WITH_ALIASING` | 11,280 | 0 | Hold |
| `CHAT_CITATION_CLICK` | `TRUST_SIGNAL_WITH_ALIASING` | 1,531,784 | 0 | Hold |
| `CHAT_CITATION_CLICK` | `TRUST_SIGNAL_AVAILABLE_BUT_HELD` | 55,162 | 0 | Hold |
| `CHAT_FEEDBACK` | `TRUST_SIGNAL_WITH_ALIASING` | 286,531 | 0 | Hold |
| `CHAT_FEEDBACK` | `TRUST_SIGNAL_AVAILABLE_BUT_HELD` | 206,826 | 0 | Hold |

**Result:** `CHAT_FEEDBACK` and `SEARCH_FEEDBACK` remain the only strong
candidate trust classifications. `AI_SUMMARY_VOTE` and `CHAT_CITATIONS` are
real but too narrow or too dominated by unresolved rows to promote broadly.
`CHAT_CITATION_CLICK` and `AI_ANSWER_VOTE` remain held.

## Behavior Cohort Readiness

The original saved files evaluated readiness of cohort dimensions. The
follow-up joint-distribution export now produces true aggregate cross-tabs
across Depth, Velocity, Trust, AGENT, and Skills.

| Cohort dimension | Status | Decision | Required next input |
| --- | --- | --- | --- |
| `depth_repertoire_band` | Joint distribution exported | Review for behavior-cohort promotion | Stability and interpretation review |
| `skill_read_presence_band` | Joint distribution exported | Continue research input | Confirm it remains presence-only, no skill names |
| `agent_delegation_band` | Joint distribution exported | Continue research input | AGENT trust interpretation remains held |
| `velocity_band` | Joint distribution exported | Review for behavior-cohort promotion | Stability and interpretation review |
| `tenure_cohort` | Missing export | Optional hold | First-active-date buckets computed inside approved boundary |
| `department/function` | Org metadata held | Hold for approved join | Approved aggregate HRIS/directory join |
| `manager/IC/leader` | Org metadata held | Hold for approved join | Approved aggregate HRIS/directory join |
| `level/region/role family` | Org metadata held | Hold for approved join | Approved aggregate HRIS/directory join |

## Main Finding

Saved aggregate CSVs are enough to classify evidence readiness. They are not
enough to analyze behavior-derived cohorts as actual cross-tabs.

That means this question can be answered from saved files:

> Which signals are attributable, held, aliased, or missing?

This question can now be reviewed from the saved joint-distribution files:

> Do high-Depth or high-Velocity cohorts show different trust, AGENT, or
> Skill-assisted behavior?

The export remains aggregate-only and does not emit user rows.

## Decision

`PROMOTE_NARROW_TRUST_CLASSIFICATIONS`

Also:

`BEHAVIOR_COHORT_CLASSIFICATIONS_EXPORTED_FOR_REVIEW`

The trust evidence classification layer is useful now. The behavior cohort
classification layer is ready for review from the saved aggregate
joint-distribution export.

## What Remains Blocked

- Broad Trust Calibration,
- customer-facing trust readouts,
- org metadata cohorts,
- economic output,
- skill-name readouts,
- AGENT trust interpretation without parent attribution,
- individual, team, manager, department, customer, or skill ranking.

## Recommended Next Step

Review `dogfood-output/v4-behavior-cohort-joint-distribution/` and choose the
next behavior-cohort decision. The export is dogfood/research only and remains
aggregate CSV replay data, not a runtime product surface.
