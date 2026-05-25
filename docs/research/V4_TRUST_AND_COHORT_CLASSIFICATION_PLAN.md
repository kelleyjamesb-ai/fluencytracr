# V4 Trust And Cohort Classification Plan

## Purpose

This document defines the next research-only V4 classification layer after the
Trust Attribution fixed-window test. It answers two questions:

1. Which trust-related signals are ready for narrow interpretation, held for
   attribution gaps, or blocked?
2. Which cohort slices should be tested first so V4 becomes more actionable
   without becoming a people analytics or performance system?

This plan adds no runtime behavior, APIs, schemas, Prisma migrations, frontend
surfaces, customer-facing economic outputs, ROI calculations, causal claims,
prediction claims, individual scoring, comparative team evaluation,
comparative department evaluation, productivity measurement, or maturity label.

## Current Decision

Proceed with behavior-derived cohorts first.

Approved for the next research test:

- Velocity band,
- Depth Repertoire band,
- AGENT delegation band,
- Skill-read presence band,
- optional tenure cohort if derived from first-active date inside the approved
  boundary and emitted only as aggregate distributions.

Held until a later segmentation gate:

- department or business function,
- role family,
- level band,
- manager vs IC,
- leader or executive cohort,
- region.

The held group is valuable, but it requires an approved HRIS, Workday,
directory, or customer-owned metadata join. That join must happen inside the
customer or Glean boundary, and only aggregate segment distributions may cross
into FluencyTracr.

## Why Behavior Cohorts First

Behavior-derived cohorts are already available from governed telemetry. They
let V4 test whether classification logic is stable before adding organization
metadata. This avoids a failure mode where the first segmented readout looks
like a department, manager, or leader comparison instead of an intervention
planning tool.

The research question is:

> Do behavior-derived cohorts make trust and scale-readiness evidence more
> actionable without weakening the invariants?

It is not:

> Which team, department, manager, or group is best at AI?

## Trust Classification Set

Trust remains an evidence-readiness problem, not a score. A signal must pass
availability, attribution, stability, and governance checks before it can
support interpretation.

| Classification | Definition | Current examples |
| --- | --- | --- |
| `ATTRIBUTABLE_TRUST_SIGNAL` | Signal joins to exactly one governed parent surface by strict or session attribution and clears suppression. | `CHAT_FEEDBACK -> workflow:CHAT`, `SEARCH_FEEDBACK -> standalone:SEARCH` |
| `TRUST_SIGNAL_WITH_ALIASING` | Signal exists, but the join points across surfaces or produces conflicting parent candidates. | `CHAT_CITATION_CLICK`, `AI_ANSWER_VOTE` |
| `TRUST_SIGNAL_AVAILABLE_BUT_HELD` | Signal exists, but coverage, volume, no-parent share, or stability is not sufficient for interpretation. | `CHAT_CITATIONS`, `AI_SUMMARY_VOTE` |
| `INSUFFICIENT_TRUST_EVIDENCE` | Signal is sparse, missing, suppressed, or unavailable for the cohort/window. | Small-cell rows, missing parent joins |
| `TRUST_SIGNAL_BLOCKED_FOR_MISUSE_RISK` | Signal could invite person, team, manager, or department judgment if surfaced. | Any slice that cannot remain aggregate and non-comparative |

The next research phase should narrow to `CHAT_FEEDBACK` and
`SEARCH_FEEDBACK` first. Broad Trust Calibration remains held.

## AGENT Trust Classification Set

AGENT trust should not be inferred from AGENT volume alone. AGENT trust evidence
is about whether a cohort delegates work and returns to that delegation pattern
without high abandonment, unresolved recovery, or attribution gaps.

| Classification | Definition | Candidate evidence |
| --- | --- | --- |
| `AGENT_DELEGATION_CONFIDENCE` | Cohort repeatedly delegates to AGENT sub-surfaces with stable repeat use and acceptable reliability context. | AGENT repeat use, Depth Repertoire, Reliability Factor |
| `AGENT_TRUST_SIGNAL_AVAILABLE` | AGENT feedback or vote-like signal exists and can be attributed to an AGENT parent. | AGENT feedback availability probe |
| `AGENT_TRUST_ATTRIBUTION_HELD` | AGENT feedback exists, but parent attribution, sub-surface mapping, or cohort coverage is not ready. | Missing or ambiguous AGENT parent joins |
| `AGENT_DELEGATION_WITH_LOW_VERIFICATION` | Delegation evidence is strong, but verification or feedback evidence is weak. | High AGENT use with weak trust-signal readiness |
| `AGENT_EVIDENCE_SUPPRESSED` | AGENT slice fails volume, time, convergence, baseline, or ambiguity gates. | Any independently suppressed AGENT cohort |

This is not a statement that AGENT users are more or less trusting. It is an
aggregate classification of whether AGENT-related trust evidence is usable.

## Skill-Assisted Evidence Classification Set

Skill reads are not trust by themselves. They are stronger evidence for
structured workflow use, reusable leverage, or agent sophistication. They may
become trust-adjacent only when joined to AGENT outcomes and reliability
context without exposing raw skill names.

| Classification | Definition | Candidate evidence |
| --- | --- | --- |
| `SKILL_READ_EVIDENCE_AVAILABLE` | Skill-read presence is observable at aggregate level. | Skill-read availability CSVs |
| `SKILL_ASSISTED_WORKFLOW_EVIDENCE` | AGENT or workflow runs with skill-read presence show aggregate repeat/recovery/reliability patterns. | Skill-read presence joined to AGENT outcomes |
| `SKILL_IDENTITY_HELD` | Skill identity is too name-based, unspecified, duplicated, or not versioned enough for governed interpretation. | Unspecified share, missing canonical IDs |
| `SKILL_TRUST_INTERPRETATION_BLOCKED` | Skill-read evidence is being used to imply trust, correctness, or productivity without a valid outcome path. | Any trust claim based only on skill reads |

Raw skill names must not enter V4 readouts. Skill-read presence may be tested;
named skill comparison may not.

## Cohort Classification Set

The first cohort test should use only aggregate behavior-derived cohorts.

| Cohort | Definition | Status |
| --- | --- | --- |
| `velocity_band` | Cohorts grouped by aggregate Velocity distribution band. | Test first |
| `depth_repertoire_band` | Cohorts grouped by aggregate repeated surface repertoire. | Test first |
| `agent_delegation_band` | Cohorts grouped by AGENT share or repeat AGENT use. | Test first |
| `skill_read_presence_band` | Cohorts grouped by aggregate skill-read presence or absence. | Test first, no skill names |
| `tenure_cohort` | Cohorts grouped by first-active date buckets. | Optional if derived safely |
| `org_metadata_segment` | Department, function, level, manager/IC, leader, or region. | Hold for approved metadata join |

Every cohort must gate independently. Missing metadata is a data readiness gap,
not low readiness.

## Mathematics Allowed In Research

Mathematics is allowed, but only after the evidence fields are valid and
aggregate-safe. The recommended order is:

1. **Attribution math:** strict attribution rate, session attribution rate,
   alias rate, no-parent rate, small-cell suppression rate.
2. **Stability math:** compare classification rates across the three fixed
   windows and flag unstable signals.
3. **Distribution math:** p50, p90, p99, concentration, and spread across
   behavior-derived cohorts.
4. **Cluster analysis:** research-only grouping of aggregate cohorts after the
   rule-based classifications are stable.
5. **Regression or logistic models:** deferred until there is a clean,
   aggregate-level outcome variable and a documented holdout design.

Models must not use user IDs, names, emails, raw prompts, raw outputs,
transcripts, raw skill names, raw HR fields, or row-level events in emitted
outputs. Model outputs must not rank people, teams, managers, departments, or
customers.

## Required Fixed-Window Test

The next test should run across the same three fixed windows used by the V4
dogfood readout:

| Window | Start | End |
| --- | --- | --- |
| 1 | 2026-03-23 | 2026-05-22 |
| 2 | 2026-02-21 | 2026-04-22 |
| 3 | 2026-01-22 | 2026-03-23 |

Required aggregate outputs:

- trust classification counts by signal and window,
- AGENT trust classification counts by AGENT sub-surface and window,
- Skill-assisted evidence classifications by presence band and window,
- behavior-derived cohort coverage,
- suppression counts,
- stability summary.

The behavior-cohort joint-distribution scaffold for this test lives at
`sql/dogfood/behavior_cohort_joint_distribution_diagnostic.sql`.

Recommended local CSV bundle:

- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_window_1.csv`
- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_window_2.csv`
- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_window_3.csv`
- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_all_windows.csv`
- `dogfood-output/v4-trust-cohort-classification/v4_trust_classification_summary_safe.csv`

## Promotion Boundary

This plan does not promote Trust Calibration. It prepares the next research
test.

Promotion can be considered only if:

- classifications remain stable across fixed windows,
- usable trust classifications are narrow and explainable,
- AGENT and Skill-assisted evidence remain aggregate-only,
- behavior-derived cohorts add actionable interpretation beyond the
  organization-level readout,
- org metadata cohorts remain held unless an approved aggregate join exists,
- no classification can be read as person, team, manager, department, customer,
  productivity, maturity, ROI, causality, or prediction judgment.

## Decision Options After Test

The next readout should choose one:

- `PROMOTE_NARROW_TRUST_CLASSIFICATIONS`
- `PROMOTE_BEHAVIOR_COHORT_CLASSIFICATIONS`
- `PROMOTE_AGENT_TRUST_EVIDENCE_ONLY`
- `HOLD_FOR_ORG_METADATA_JOIN`
- `HOLD_FOR_SIGNAL_STABILITY`
- `HOLD_FOR_ATTRIBUTION_REFINEMENT`
- `REJECT_CURRENT_CLASSIFICATION_SET`

## What Remains Blocked

The following remain blocked:

- broad Trust Calibration,
- customer-facing trust readouts,
- org metadata segmentation runtime support,
- manager, leader, department, level, role, or region readouts,
- skill-name readouts,
- economic confidence changes based on trust,
- ROI or productivity claims,
- prediction claims,
- individual, team, manager, department, customer, or skill ranking.

## Open Questions

- Does `CHAT_FEEDBACK` remain stable enough to become a governed narrow trust
  signal?
- Does `SEARCH_FEEDBACK` remain stable enough to become a governed narrow trust
  signal?
- Can AGENT feedback attach cleanly to AGENT sub-surfaces?
- Does skill-read presence change AGENT reliability or repeat-use patterns?
- Do behavior-derived cohorts make the AI Scale Readiness Portfolio more
  actionable than organization-level evidence alone?
- Which org metadata segment should be approved first once the aggregate join
  path is ready?
