# FluencyTracr V2 TG1 — Governance Lock (Execution Rules)

Status: Draft
Authority: Sentinel
Date: February 3, 2026
Scope: Governance-only, execution rules
Inputs: docs/governance/FluencyTracr_V2_Governance_Charter_Draft1.md; docs/governance/SENTINEL_V2_TG0_APPROVAL.md

This document translates the approved V2 charter into explicit, non-negotiable execution rules for all future V2 work. It authorizes governance definition only and does not authorize build, design, enforcement changes, connectors, or V2 execution.

## 1. Allowed V2 Questions

The system is permitted to answer only the following categories of questions, phrased in neutral, descriptive language and limited to self-comparison across time within the same cohort.

- “Where is AI use becoming more legible over time within this cohort?”
- “Where are human review behaviors becoming more consistent over time within this cohort?”
- “Where are recovery or correction behaviors becoming more consistently observed over time within this cohort?”
- “Where are observed interaction patterns stabilizing over time within this cohort?”
- “Where are observed interaction patterns destabilizing over time within this cohort?”
- “Where are early indicators of organizational fragility emerging over time within this cohort, without diagnosis?”
- “Where are signals suppressed due to ambiguity, noise, or insufficient evidence?”

## 2. Forbidden Inferences (Hard Refusals)

The system MUST refuse to answer any question or imply any conclusion that falls into these categories.

- Performance, productivity, efficiency, or ROI.
- Improvement, decline, better, worse, higher, lower, or any evaluative framing.
- Ranking, comparison, or benchmarking between individuals, teams, functions, business units, or organizations.
- Attribution of change to people, teams, leaders, policies, training, tools, or decisions.
- Causality, including “because of X,” “driven by Y,” or “as a result of Z.”
- Individual or team trajectories, progress, or regress.
- Any use as a KPI, performance review input, or decision justification.

## 3. Time-Aware Suppression Rules

No time-based signal may surface unless all rules below are satisfied. If any rule fails, the signal MUST be suppressed.

- Minimum windows: at least 3 consecutive valid windows are required before any time-based signal can appear.
- Persistence: the same directional pattern must be present in all 3 windows without interruption.
- Contradiction handling: any opposing or contradictory movement in any of the 3 windows requires suppression.
- Cool-off after change: suppress all time-based signals for 2 consecutive valid windows following any tooling or policy change that could affect observation surfaces.
- Ambiguity handling: any ambiguity in attribution, measurement stability, or observation surface mapping requires suppression.
- Data insufficiency: if any required window is incomplete, missing, or fails validation, the signal must be suppressed.

## 4. Misuse Refusal Rules

The system MUST refuse the following executive-style questions and provide an explicit out-of-scope response.

1. Question: “Are we getting better at AI?” Response: “Out of scope. V2 does not evaluate improvement or performance.”
2. Question: “Which team uses AI most effectively?” Response: “Out of scope. V2 does not compare teams or rank cohorts.”
3. Question: “Did the new policy improve outcomes?” Response: “Out of scope. V2 does not attribute causality or policy impact.”
4. Question: “Where is productivity highest?” Response: “Out of scope. V2 does not measure productivity or efficiency.”
5. Question: “Should we reward the teams that improved?” Response: “Out of scope. V2 does not support performance decisions.”
6. Question: “Is AI adoption driving ROI?” Response: “Out of scope. V2 does not measure ROI or causality.”

## 5. Language Guardrails

### 5.1 Disallowed Words and Framings

The following words and framings MUST NOT appear in any V2 output or UI.

- better, worse, improved, declined, higher, lower, top, bottom
- performance, productivity, efficiency, ROI, output, impact
- ranking, leaderboard, benchmark, best-in-class
- because of, caused by, driven by, due to
- maturity level, ladder, score, grade

### 5.2 Required Neutral Alternatives

Use only neutral, descriptive language. Examples of required alternatives follow.

- Use “more legible” instead of “better.”
- Use “less legible” instead of “worse.”
- Use “more consistently observed” instead of “improved.”
- Use “less consistently observed” instead of “declined.”
- Use “pattern is stabilizing” instead of “performance is improving.”
- Use “pattern is destabilizing” instead of “performance is worsening.”
- Use “signal suppressed due to ambiguity” instead of “insufficient performance.”

### 5.3 Phrases That Must Never Appear

The following phrases are prohibited and MUST NEVER appear in UI or outputs.

- “AI performance”
- “team ranking”
- “productivity gains”
- “ROI impact”
- “leadership effectiveness”
- “skill improvement”
- “best team”

## Completion Rule

Do not proceed beyond TG1. No build work may begin until TG1 is approved and locked.
