# V4 Internal Readout Runbook

## Purpose

This runbook turns the promoted V4 scope into a repeatable internal process.
It explains how to refresh the AI Scale Readiness internal readout from saved
aggregate exports, how to check the evidence boundary, and how to produce a
decision memo without drifting into customer-facing economic output.

Current process status: `INTERNAL_READOUT_PROCESS_READY`

This runbook adds no APIs, schemas, Prisma migrations, runtime services,
frontend surfaces, customer-facing economic readouts, ROI calculation, causal
claim, prediction claim, individual scoring, comparative team evaluation,
comparative department evaluation, productivity measurement, or maturity label.

## Governing Decision

The governing closeout decision is
[V4_CLOSEOUT_DECISION.md](./V4_CLOSEOUT_DECISION.md).

Promoted:

- AI Scale Readiness internal readout shape.
- Depth Repertoire as aggregate context.
- Economic Impact Bridge as value-investigation routing only.

Held:

- Trust Calibration.
- Reusable Leverage.
- Skill Read Evidence as a governed signal.
- Customer-facing economic output.

## Required Inputs

Use aggregate-only exports listed in
[dogfood-output/V4_RESEARCH_EXPORTS.md](../../dogfood-output/V4_RESEARCH_EXPORTS.md).
This manifest is the allowlist. Do not load `dogfood-output/**/*.csv`.

Required tracked inputs:

- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_1.csv`
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_2.csv`
- `dogfood-output/v4-depth-repertoire/v4_depth_repertoire_window_3.csv`
- `dogfood-output/v4-trust-signal-availability/trust_signal_availability_summary_safe.csv`
- `dogfood-output/v4-trust-signal-availability/agent-feedback/agent_feedback_summary_safe.csv`
- `dogfood-output/v4-skill-read-availability/skill_read_availability_all_windows.csv`

Use `trust_signal_availability_all_windows.csv`,
`trust_signal_availability_window_*.csv`,
`agent_feedback_probe_window_1.csv`, and
`agent_feedback_vote_probe_window_1.csv` only for narrow attribution QA. They
may include low-count join rows or diagnostic details and should not be used for
broad LM review or narrative readout tables.

Optional inputs when available:

- V2 Velocity by fixed window.
- Quality Multiplier and Reliability Factor by fixed window.
- Surface taxonomy and AGENT sub-surface coverage.
- Customer-attested aggregate Outcome Evidence.
- Approved aggregate segmentation exports.

## Refresh Process

1. Confirm the branch is current and the working tree is clean.
2. Confirm the aggregate CSV bundle is present.
3. Confirm no scratch query files are being used as data inputs.
4. Read the governing closeout decision.
5. Fill the input checklist template.
6. Fill the evidence-gap checklist template.
7. Produce the internal readout from the template.
8. Produce the decision memo from the template.
9. Run the governance and docs checks.
10. Commit the refreshed readout package.

## Manual QA Gate

Before any readout is used, verify:

- The input file path appears in the explicit export manifest allowlist.
- Outputs are aggregate-only.
- No raw skill names appear.
- No user IDs, emails, names, stable hashed user IDs, prompts, outputs,
  transcripts, action rows, or raw event rows appear.
- No row with a user-count, joined-user-count, distinct-user-count, or
  cohort-size value below 5 is surfaced in the readout.
- Trust signals are represented as availability or attribution status only.
- Skill Read Evidence is represented as availability status only.
- Held signals are not treated as negative findings.
- Suppressed evidence is not reconstructed.
- Glean dogfood values are not used as thresholds, defaults, calibration values,
  or customer benchmarks.
- Economic language routes investigation only and does not calculate value.

## Readout Procedure

Use [V4_INTERNAL_READOUT_TEMPLATE.md](./templates/V4_INTERNAL_READOUT_TEMPLATE.md)
as the readout shell.

Minimum sections:

- Purpose.
- Inputs reviewed.
- Data readiness status.
- AI Scale Readiness summary.
- Depth Repertoire context.
- Trust evidence status.
- Skill Read Evidence and reusable leverage status.
- Economic investigation routing.
- Evidence gaps.
- Recommended next action.
- Blocked claims.

## Decision Procedure

Use [V4_DECISION_MEMO_TEMPLATE.md](./templates/V4_DECISION_MEMO_TEMPLATE.md).

Allowed decisions:

- `KEEP_INTERNAL_READOUT_PROCESS`
- `REFRESH_WITH_NEW_WINDOWS`
- `RUN_TRUST_ATTRIBUTION_REFINEMENT`
- `RUN_SKILL_IDENTITY_VALIDATION`
- `PROPOSE_MINIMAL_SCHEMA_REVIEW`
- `HOLD_FOR_EVIDENCE_GAPS`

Do not use this runbook to promote customer-facing economic output. That
requires a later governance decision.

## Validation Commands

Run:

```bash
python3 -m pytest tests/dogfood/test_velocity_double_count.py -q
python3 scripts/ci_v1_governance_gates.py
scripts/ci_docs_contract_sweep.sh
node scripts/ci_semantic_drift_guard.mjs
git diff --check
```

If a command is unavailable, document the blocker and run the remaining checks.

## Stop Conditions

Stop and hold the readout if:

- a required CSV is missing,
- a CSV is not listed in the explicit export manifest allowlist,
- a tracked CSV contains raw identifiers or raw skill names,
- a row needed for interpretation has fewer than 5 users or equivalent cohort
  members,
- the readout requires a held signal to make the recommendation,
- the evidence implies a customer-facing economic number,
- a suppressed slice would need to be reconstructed,
- the docs contradict the closeout decision.

## Output Package

A complete internal readout package includes:

- completed input checklist,
- completed evidence-gap checklist,
- completed internal readout,
- completed decision memo,
- validation results,
- clear list of promoted, held, and blocked scopes.

## Operator Warning

The repository may contain older dogfood CSVs or ignored local scratch files
that are not part of the V4 internal readout process. Some may include low-count
slices or copied SQL text. They are not valid inputs unless explicitly listed in
the V4 research export manifest and passed through the QA gate above.
