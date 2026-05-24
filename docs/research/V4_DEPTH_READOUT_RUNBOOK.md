# V4 Depth Readout Runbook

## Purpose

This runbook explains how to run the dogfood-only V4 Depth Readout Engine. The
engine composes aggregate Velocity, Delegation Depth, and refinement diagnostics
into a repeatable local readout for studying how adoption energy and work
integration interact across workflow and surface aggregates.

This readout is dogfood-only. It is not a product API, frontend surface,
economic value range, ROI calculation, prediction, or scoring system.

## Required Inputs

Place these aggregate CSV exports in `dogfood-input/v4-depth-readout`:

```text
v4_delegation_window_1.csv
v4_delegation_window_2.csv
v4_delegation_window_3.csv
v4_refinement_window_1.csv
v4_refinement_window_2.csv
v4_refinement_window_3.csv
v4_velocity_window_1.csv
v4_velocity_window_2.csv
v4_velocity_window_3.csv
```

These are the real dogfood input names for the Depth Readout Engine. They are
different from the V4 Signal Validation Harness names, which use
`v4_velocity_depth_window_*.csv` under `dogfood-input/v4-signal-validation`.

Each export must be aggregate-only. Any export containing user IDs, emails,
names, raw prompts, raw outputs, transcripts, or raw event rows must fail
validation.

## Naming Map

| Location | File pattern | Meaning |
| --- | --- | --- |
| `dogfood-input/v4-depth-readout/` | `v4_velocity_window_*.csv` | Real Velocity inputs for the Depth Readout Engine. |
| `dogfood-input/v4-depth-readout/` | `v4_delegation_window_*.csv` | Real Delegation Depth inputs for the Depth Readout Engine. |
| `dogfood-input/v4-depth-readout/` | `v4_refinement_window_*.csv` | Real Refinement Depth inputs for the Depth Readout Engine. |
| `dogfood-output/v4-depth-readout/` | `V4_DEPTH_READOUT.md`, `v4_depth_summary.json`, `v4_depth_by_surface.csv` | Generated dogfood outputs used for stability review. |
| `tests/fixtures/v4_depth_readout/complete/` | `v4_*_window_*.csv` | Synthetic test fixtures only; do not treat as real dogfood input. |
| `tests/fixtures/v4_depth_readout/missing_required_file/` | `v4_velocity_window_*.csv` | Negative test fixture proving missing-file fail-closed behavior. |
| `tests/fixtures/v4_depth_readout/forbidden_field/` | `v4_velocity_window_1.csv` | Negative test fixture proving person-level field rejection. |

If a file lives under `tests/fixtures/`, it exists to test the engine. Real
BigQuery exports should live under `dogfood-input/v4-depth-readout/`, and
generated outputs should live under `dogfood-output/v4-depth-readout/`.

Do not substitute V4 Signal Validation Harness inputs for Depth Readout Engine
inputs. The validation harness uses a different file family because it evaluates
promotion readiness across multiple candidate signals, not only the local Depth
readout.

## Optional Inputs

Optional reusable workflow propagation exports may be present:

```text
v4_reuse_propagation_window_1.csv
v4_reuse_propagation_window_2.csv
v4_reuse_propagation_window_3.csv
```

Reusable Workflow Propagation and Named Workflow Leverage remain `HOLD`
pending metadata observability. They are not used as Depth score drivers in
this readout.

## Command

```bash
python3 scripts/dogfood/run_v4_depth_readout.py \
  --input-dir dogfood-input/v4-depth-readout \
  --output-dir dogfood-output/v4-depth-readout
```

## Expected Outputs

The command writes:

- `dogfood-output/v4-depth-readout/V4_DEPTH_READOUT.md`
- `dogfood-output/v4-depth-readout/v4_depth_summary.json`
- `dogfood-output/v4-depth-readout/v4_depth_by_surface.csv`

The outputs are aggregate-only and must not include person-level fields or raw
event rows.

## How to Interpret Zones

Zones are dogfood-only readout heuristics, not production thresholds:

| Zone | Interpretation |
| --- | --- |
| `OPERATING_LEVERAGE_CANDIDATE` | High Velocity with high Depth evidence. |
| `FRAGILE_SCALE_CANDIDATE` | High Velocity with low Depth evidence. |
| `FOCUSED_DEPTH_CANDIDATE` | Low Velocity with high Depth evidence. |
| `THIN_USE_CANDIDATE` | Low Velocity with low Depth evidence. |
| `INSUFFICIENT_EVIDENCE` | Missing or sparse aggregate evidence prevents interpretation. |
| `SUPPRESSED` | Evidence is unsafe or too sparse for readout. |

The zones are candidates for dogfood interpretation only. They do not rank
surfaces, teams, people, managers, or departments.

## What This Does Not Mean

This readout does not calculate ROI.

This readout does not prove productivity lift.

This readout does not rank teams, people, managers, or departments.

This readout does not productize V4.

This readout does not add canonical events, suppression reasons, tunable
thresholds, admin overrides, APIs, schemas, Prisma migrations, frontend product
surfaces, backend services, or customer-facing V4 economic readouts.

## How This Feeds Later V4 Work

The readout can help identify where Velocity and Depth appear aligned or
misaligned across aggregate surfaces. Those patterns may inform later mapping
improvements, transformer enhancements, validation design, or concept review.

Current dogfood Depth evidence must be read carefully: repeat/refinement volume
is only one component of Depth. A stable future Depth readout needs
surface-repertoire evidence or another non-saturated component before it can
support economic interpretation.

Any later V4 product contract still requires explicit governance approval,
multi-window stability evidence, and a separate implementation PR.

## Why Economic Readouts Remain Blocked

V4 economic readouts remain blocked until Depth readout stability is
demonstrated across windows or cohorts.

Distribution shape alone is not enough. Before Time-Saved Defensibility Range,
AI Value Leakage Map, AI Scale Readiness Portfolio, or Trust Calibration
readouts can consume this evidence, the readout must show stable aggregate
interpretation, sufficient coverage, taxonomy alignment, and safety against
misuse.
