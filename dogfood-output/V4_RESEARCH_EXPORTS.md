# V4 Research Export Bundle

This folder contains aggregate-only dogfood exports used for V4 research and
model review. These files are internal Glean dogfood observations, not customer
benchmarks, thresholds, defaults, calibration values, or customer-facing
economic outputs.

## Included CSVs

Depth Repertoire:

- `v4-depth-repertoire/v4_depth_repertoire_window_1.csv`
- `v4-depth-repertoire/v4_depth_repertoire_window_2.csv`
- `v4-depth-repertoire/v4_depth_repertoire_window_3.csv`

Trust signal availability:

- `v4-trust-signal-availability/trust_signal_availability_window_1.csv`
- `v4-trust-signal-availability/trust_signal_availability_window_2.csv`
- `v4-trust-signal-availability/trust_signal_availability_window_3.csv`
- `v4-trust-signal-availability/trust_signal_availability_all_windows.csv`

AGENT feedback availability:

- `v4-trust-signal-availability/agent-feedback/agent_feedback_probe_window_1.csv`
- `v4-trust-signal-availability/agent-feedback/agent_feedback_vote_probe_window_1.csv`

Skill Read Evidence availability:

- `v4-skill-read-availability/skill_read_availability_window_1.csv`
- `v4-skill-read-availability/skill_read_availability_window_2.csv`
- `v4-skill-read-availability/skill_read_availability_window_3.csv`
- `v4-skill-read-availability/skill_read_availability_all_windows.csv`

## Excluded Scratch Files

Some ignored local `.csv` files contain copied SQL text or scratch query output
and are not valid data exports. They are intentionally not tracked.

## Guardrails

The tracked research exports must remain aggregate-only. They must not contain
raw user IDs, emails, raw skill names, prompts, outputs, transcripts, action
rows, or raw event rows.
