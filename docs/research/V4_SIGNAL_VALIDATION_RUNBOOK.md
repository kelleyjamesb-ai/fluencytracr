# V4 Signal Validation Runbook

## Purpose

This runbook prepares weekend validation for V4 candidate signals. It explains
how to produce aggregate BigQuery exports, name them consistently, run the local
validator, and prepare the manual review needed before any candidate can move
beyond research.

This runbook does not add SQL, schemas, APIs, migrations, or frontend
surfaces. The dogfood validation harness exists under
`scripts/dogfood/run_v4_signal_validation.py` and remains a local validation
tool, not a product API or customer-facing readout.

Use this runbook with:

- [V4_SIGNAL_VALIDATION_GATE.md](./V4_SIGNAL_VALIDATION_GATE.md)
- [V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md](./V4_SIGNAL_VALIDATION_READOUT_TEMPLATE.md)
- [SIGNAL_PROMOTION_CRITERIA.md](./SIGNAL_PROMOTION_CRITERIA.md)
- [V4_SIGNAL_DISCOVERY_PROBES.md](./V4_SIGNAL_DISCOVERY_PROBES.md)

## Prerequisites

Before running validation, confirm:

- the candidate signals are limited to the current V4 validation set,
- the BigQuery source is approved for dogfood validation,
- three comparable windows or cohorts are available,
- each SQL probe uses aggregate-safe final output,
- the operator can export CSV files to `dogfood-input/v4-signal-validation`,
- no raw prompts, raw outputs, transcripts, person-level rows, direct
  identifiers, or raw event extracts will be exported.

If fewer than three comparable windows are available, the output must default to
HOLD, not PROMOTE.

## BigQuery Inputs

Use approved dogfood BigQuery sources only. Record the project, dataset, table,
cohort definition, and date boundaries in the readout artifact.

The expected probe inputs are:

- refinement probe output,
- delegation probe output,
- reusable workflow propagation probe output,
- velocity x depth zone output.

The velocity x depth zone export may come from an approved existing diagnostic
or manually assembled aggregate output until a dedicated probe exists. It must
remain aggregate-only.

## Required Windows

Use three fixed, comparable windows:

- `window_1`
- `window_2`
- `window_3`

The windows should be equal length unless the readout explicitly documents why
they are comparable. One 60-day diagnostic window is insufficient for product
promotion.

Record for each window:

- start timestamp,
- end timestamp,
- cohort definition,
- source table or export,
- taxonomy version,
- known instrumentation changes.

## SQL Probe Execution

For each window, run the existing SQL probes with `window_start` and
`window_end` set to that window.

Use the existing dogfood probes for:

- rapid refinement,
- delegation,
- reusable workflow propagation.

For Velocity x Depth Zone, use an approved aggregate diagnostic that preserves
Velocity's frequency, engagement, and breadth dimensions and Depth's aggregate
work-integration evidence. Do not collapse them into a score.

The final SQL outputs must be aggregate-only. Intermediate warehouse logic may
compute over person-level rows only inside the approved environment.

## Export Naming Convention

Export CSV files into:

```text
dogfood-input/v4-signal-validation
```

Use exactly these names:

```text
v4_refinement_window_1.csv
v4_refinement_window_2.csv
v4_refinement_window_3.csv
v4_delegation_window_1.csv
v4_delegation_window_2.csv
v4_delegation_window_3.csv
v4_reuse_propagation_window_1.csv
v4_reuse_propagation_window_2.csv
v4_reuse_propagation_window_3.csv
v4_velocity_depth_window_1.csv
v4_velocity_depth_window_2.csv
v4_velocity_depth_window_3.csv
```

The `v4_velocity_depth_window_*.csv` files are specific to the V4 Signal
Validation Harness. They are not interchangeable with the Depth Readout
Engine's `v4_velocity_window_*.csv` files under
`dogfood-input/v4-depth-readout/`. The validation harness evaluates promotion
readiness across several candidate signals; the Depth Readout Engine composes a
local dogfood readout from Velocity, Delegation Depth, and refinement inputs.

Do not add extra suffixes, dates, or local notes to the filenames. Put
operator notes in the readout artifact instead.

## Local Validation Command

Run:

```bash
python3 scripts/dogfood/run_v4_signal_validation.py \
  --input-dir dogfood-input/v4-signal-validation \
  --output-dir dogfood-output/v4-signal-validation
```

The harness prepares weekend validation outputs. The generated readout remains
dogfood-only and must still be reviewed against the manual checklist before any
promotion decision is accepted.

## Harness Implementation

The local harness command now exists. It validates aggregate CSV exports,
detects the refinement, delegation, reusable workflow propagation, and Velocity
x Depth input families, and emits a five-signal promotion table covering:

- `depth`,
- `delegation_depth`,
- `reusable_workflow_propagation`,
- `rapid_refinement`,
- `velocity_depth_zone`.

The harness fails closed when required aggregate columns are missing or when an
export includes forbidden person-level fields such as user IDs, emails, names,
raw prompts, raw outputs, transcripts, or raw event rows.

The harness does not productize V4 signals. `PROMOTE` means eligible for later
productization review, not automatically productized.

## Expected Outputs

The follow-up validator should produce aggregate-only outputs under:

```text
dogfood-output/v4-signal-validation
```

Expected outputs should include:

- `V4_SIGNAL_VALIDATION_READOUT.md`,
- `v4_signal_validation_summary.json`,
- `v4_signal_promotion_table.csv`,
- one per-signal stability section in the Markdown readout,
- one coverage section in the Markdown readout,
- one governance safety section in the Markdown readout,
- one decision recommendation table in Markdown and CSV form,
- no raw event rows,
- no person-level fields,
- no hidden reconstructed suppressed values.

If validation inputs are incomplete, unsafe, or unstable, the expected output is
`HOLD` or `REJECT`, not `PROMOTE`.

## Manual Review Checklist

Before any promotion meeting, manually confirm:

- all twelve required CSV files are present,
- all three windows are comparable,
- no export contains user IDs, emails, names, raw prompts, raw outputs,
  transcripts, or raw event rows,
- final outputs are aggregate-only,
- each signal has p50, p90, p99, share, or coverage evidence as applicable,
- ambiguous mappings are documented,
- suppressed windows or slices are documented,
- Velocity dimensions are not collapsed into a score,
- Depth and Delegation Depth are not treated as maturity labels,
- no signal is framed as ROI, causal proof, prediction, or productivity.

Any export containing user IDs, emails, names, raw prompts, raw outputs,
transcripts, or raw event rows must fail validation.

## Promotion Decision Meeting Checklist

The decision meeting must answer:

- Does each signal have evidence across three comparable windows?
- Is distribution shape meaningful and stable enough to interpret?
- Is coverage sufficient?
- Is the taxonomy mapping defensible?
- Is the relationship to Velocity documented?
- Is the relationship to value-realization primitives specific?
- Does the signal support a concrete executive or product decision?
- Does the governance safety review pass?
- Is the correct outcome `PROMOTE`, `HOLD`, or `REJECT`?

`PROMOTE` means eligible for later productization, not automatically
productized.

`HOLD` means research-only.

`REJECT` means must not be used in product readouts unless governance reopens
it.

## Known Failure Modes

Known failure modes include:

- fewer than three comparable windows,
- missing one or more required exports,
- inconsistent window lengths without justification,
- user IDs, emails, names, prompts, outputs, transcripts, or raw rows in CSVs,
- taxonomy drift between windows,
- unmapped surfaces silently included in numerators,
- Velocity and Depth collapsed into a score,
- reusable workflow evidence based on unlisted or ephemeral workflows,
- rapid same-surface reuse overclaimed as confirmed refinement,
- distribution shape interpreted as product proof,
- coverage gaps treated as successful validation,
- output recommending `PROMOTE` when evidence is incomplete.

If fewer than three comparable windows are available, the output must default to
HOLD, not PROMOTE.

## Governance Constraints

This is dogfood validation only.

No signal may be promoted if it creates individual scoring, team ranking,
prohibited maturity scoring, productivity scoring, ROI claims, causal claims,
or prediction claims.

The validation process must not add:

- canonical events,
- suppression reasons,
- tunable thresholds,
- admin overrides,
- SQL in this PR,
- schemas,
- APIs,
- Prisma migrations,
- frontend product surfaces,
- customer-facing readouts.

All readouts must remain aggregate-only and fail-closed.
