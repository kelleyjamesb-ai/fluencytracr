# V4 Behavior Cohort Classification Readout

## Purpose

This readout tests the next step after the full V4 rehearsal: whether saved
aggregate CSVs are sufficient to classify trust evidence and behavior-derived
cohort readiness without running new BigQuery queries.

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

The saved files can evaluate readiness of cohort dimensions, but they cannot
yet produce true joint cohort classifications across Depth, Velocity, Trust,
AGENT, and Skills.

| Cohort dimension | Status | Decision | Required next input |
| --- | --- | --- | --- |
| `depth_repertoire_band` | Ready from saved exports | Promote as context | Joint distribution needed for cross-signal analysis |
| `skill_read_presence_band` | Ready for presence only | Promote as research input | Skill-read presence x AGENT/depth/reliability aggregate CSV |
| `agent_delegation_band` | Partial availability only | Hold for attribution | AGENT sub-surface x feedback attribution x reliability/depth aggregate CSV |
| `velocity_band` | Missing joint export | Hold for export | Velocity band x depth/trust/skill/agent aggregate CSV |
| `tenure_cohort` | Missing export | Optional hold | First-active-date buckets computed inside approved boundary |
| `department/function` | Org metadata held | Hold for approved join | Approved aggregate HRIS/directory join |
| `manager/IC/leader` | Org metadata held | Hold for approved join | Approved aggregate HRIS/directory join |
| `level/region/role family` | Org metadata held | Hold for approved join | Approved aggregate HRIS/directory join |

## Main Finding

Saved aggregate CSVs are enough to classify evidence readiness. They are not
enough to analyze behavior-derived cohorts as actual cross-tabs.

That means this question can be answered from saved files:

> Which signals are attributable, held, aliased, or missing?

This question cannot yet be answered from saved files:

> Do high-Depth or high-Velocity cohorts show different trust, AGENT, or
> Skill-assisted behavior?

Answering that requires a new aggregate joint-distribution export. It should
still be aggregate-only and should not emit user rows.

## Decision

`PROMOTE_NARROW_TRUST_CLASSIFICATIONS`

Also:

`HOLD_BEHAVIOR_COHORT_CLASSIFICATIONS_FOR_JOINT_EXPORT`

The trust evidence classification layer is useful now. The behavior cohort
classification layer is conceptually right but needs a purpose-built aggregate
export.

## Required Next Export

If we continue testing cohorts, the next BigQuery export should be narrow and
purpose-built. It should emit aggregate rows by:

- fixed window,
- behavior cohort dimension,
- behavior cohort band,
- trust classification,
- AGENT delegation classification,
- skill-read presence classification,
- cohort size,
- signal count,
- suppression status.

No user IDs, emails, names, prompts, outputs, transcripts, raw skill names, raw
event rows, or action rows may be emitted.

## What Remains Blocked

- Broad Trust Calibration,
- customer-facing trust readouts,
- org metadata cohorts,
- economic output,
- skill-name readouts,
- AGENT trust interpretation without parent attribution,
- individual, team, manager, department, customer, or skill ranking.

## Recommended Next Step

Run `sql/dogfood/behavior_cohort_joint_distribution_diagnostic.sql` for
dogfood/research only across the three fixed windows. It should compute the
needed joint distributions inside BigQuery and output aggregate rows that can
be saved to CSV for local replay.
