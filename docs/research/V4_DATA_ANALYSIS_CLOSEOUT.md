# V4 Data Analysis Closeout

## Purpose

This document records where the V4 dogfood data analysis stands after the local
full rehearsal and behavior cohort classification pass.

The goal is to decide what is done, what is valid, what is held, and what data
is still required before any further V4 promotion decision.

This is research/documentation-only. It adds no runtime behavior, APIs,
schemas, Prisma migrations, frontend surfaces, customer-facing economic
outputs, ROI calculations, causal claims, prediction claims, individual
scoring, comparative team evaluation, comparative department evaluation,
productivity measurement, or maturity label.

## Data Analysis Completed

The following analyses are complete from saved aggregate CSVs:

| Area | Status | Result |
| --- | --- | --- |
| Depth Repertoire | Complete | Stable across three fixed windows; useful as V4 context. |
| Trust signal availability | Complete | Signals exist at meaningful volume. |
| Trust attribution | Complete | Narrow candidates found; broad Trust Calibration held. |
| AGENT feedback availability | Complete | Feedback exists; attribution still held. |
| Skill Read Evidence availability | Complete | Skill-read evidence is observable with strong parent join coverage. |
| Full local rehearsal | Complete | V4 can produce a numbers-backed internal research readout. |
| Trust classification | Complete | `CHAT_FEEDBACK` and `SEARCH_FEEDBACK` are candidate narrow trust signals. |
| Behavior cohort readiness | Complete | Cohort concept is valid, and fixed-window joint distributions are now saved for review. |

## Valid Current Findings

The current data supports these statements:

- Depth Repertoire is stable enough to use as internal V4 context.
- Trust-related signals are available.
- `CHAT_FEEDBACK` and `SEARCH_FEEDBACK` are the strongest narrow trust
  classification candidates.
- `CHAT_CITATION_CLICK` and `AI_ANSWER_VOTE` should remain held because
  aliasing dominates.
- AGENT feedback exists, but AGENT trust attribution is not yet governed.
- Skill-read evidence is available and joinable enough for research, but it is
  not trust by itself.
- Behavior-derived cohorts are the right next segmentation path.
- Org metadata cohorts should remain held until an approved aggregate join
  exists.

## Invalid Or Blocked Interpretations

The current data does not support:

- broad Trust Calibration,
- customer-facing trust readouts,
- customer-facing economic outputs,
- ROI,
- productivity lift,
- causal claims,
- prediction claims,
- maturity labels,
- team, manager, department, customer, employee, or skill ranking,
- skill-name readouts,
- org metadata segmentation.

## Prior Data Gap

The core data gap after the first saved-export pass was not another broad scan.
It was a specific missing shape:

> joint aggregate distributions by behavior cohort.

The earlier saved CSVs were mostly separate summaries. They could tell us that
Depth was stable, trust signals existed, and skill-read evidence was available.
They could not tell us whether high-Depth cohorts also had better trust
attribution, stronger AGENT evidence, or different skill-read presence. The
new joint-distribution export fills that shape for review.

## Completed Joint-Distribution Data Test

The narrow dogfood/research joint-distribution diagnostic is scaffolded at:

`sql/dogfood/behavior_cohort_joint_distribution_diagnostic.sql`

It was run against the three fixed 60-day windows and outputs aggregate rows by:

- fixed window,
- behavior cohort dimension,
- behavior cohort band,
- trust classification,
- AGENT delegation classification,
- skill-read presence classification,
- cohort size,
- signal count,
- suppression status.

It should not emit user IDs, emails, names, prompts, outputs, transcripts, raw
skill names, raw event rows, action rows, or raw HR fields.

Saved outputs:

- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_window_1.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_window_2.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_window_3.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_all_windows.csv`
- `dogfood-output/v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`

The combined export has 515 aggregate rows: 495 rows are
`SURFACE_ELIGIBLE_RESEARCH_ONLY`, and 20 rows remain `SUPPRESS` behind
`INSUFFICIENT_VOLUME`.

## Decision

`DATA_ANALYSIS_COMPLETE_FOR_SAVED_EXPORTS`

`BEHAVIOR_COHORT_JOINT_DISTRIBUTION_EXPORTED_FOR_REVIEW`

We should stop mining the earlier saved CSVs for more precision. The next
incremental value comes from reviewing the saved joint-distribution export and
choosing a classification decision.

## Recommended Next Phase

Review the saved joint-distribution outputs from:

`sql/dogfood/behavior_cohort_joint_distribution_diagnostic.sql`

After that, update the V4 decision with one of:

- `PROMOTE_BEHAVIOR_COHORT_CLASSIFICATIONS`,
- `HOLD_FOR_SIGNAL_STABILITY`,
- `HOLD_FOR_ATTRIBUTION_REFINEMENT`,
- `HOLD_FOR_ORG_METADATA_JOIN`,
- `REJECT_CURRENT_CLASSIFICATION_SET`.

## Stopping Rule

Do not run more broad BigQuery diagnostics for V4 closeout. Any remaining query
must be a narrow aggregate export tied to a named hold decision.
