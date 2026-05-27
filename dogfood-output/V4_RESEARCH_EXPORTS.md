# V4 Research Export Bundle

This folder contains aggregate-only dogfood exports used for V4 research and
model review. These files are internal Glean dogfood observations, not customer
benchmarks, thresholds, defaults, calibration values, or customer-facing
economic outputs.

## Readout And Broad LM-Review CSVs

This list is the explicit allowlist for V4 internal readout rehearsal and broad
LM review. Do not load every CSV under `dogfood-output/`.

Depth Repertoire:

- `v4-depth-repertoire/v4_depth_repertoire_window_1.csv`
- `v4-depth-repertoire/v4_depth_repertoire_window_2.csv`
- `v4-depth-repertoire/v4_depth_repertoire_window_3.csv`

Trust signal availability:

- `v4-trust-signal-availability/trust_signal_availability_summary_safe.csv`

Trust attribution refinement:

- `v4-trust-attribution-refinement/v4_trust_attribution_summary.csv`

AGENT feedback availability:

- `v4-trust-signal-availability/agent-feedback/agent_feedback_summary_safe.csv`

Skill Read Evidence availability:

- `v4-skill-read-availability/skill_read_availability_window_1.csv`
- `v4-skill-read-availability/skill_read_availability_window_2.csv`
- `v4-skill-read-availability/skill_read_availability_window_3.csv`
- `v4-skill-read-availability/skill_read_availability_all_windows.csv`

Full dogfood rehearsal:

- `v4-full-dogfood-rehearsal/v4_rehearsal_summary.csv`

Trust and behavior cohort classification:

- `v4-trust-cohort-classification/v4_trust_classification_summary_safe.csv`
- `v4-trust-cohort-classification/v4_behavior_cohort_readiness_summary.csv`

Behavior cohort joint distribution:

- `v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_summary_safe.csv`

Velocity x Depth readout-zone test:

- `v4-velocity-depth-zone/v4_velocity_depth_zone_summary_safe.csv`

Segment overlay test:

- `v4-segment-overlay-test/v4_segment_overlay_summary.csv`

Intervention tracking readiness:

- `v4-intervention-tracking-test/v4_intervention_tracking_readiness.csv`

Outcome join readiness:

- `v4-outcome-join-test/v4_outcome_join_readiness.csv`

Outcome source inventory:

- `v4-outcome-source-inventory/zendesk_support_outcome_inventory.csv`
- `v4-outcome-source-inventory/rocketlane_project_outcome_inventory.csv`

Support outcome join:

- `v4-support-outcome-join/v4_support_outcome_join_window_summary.csv`
- `v4-support-outcome-join/v4_support_outcome_join_by_zone.csv`
- `v4-support-outcome-join/v4_support_outcome_comparison_fixture.csv`

Support join-key test:

- `v4-support-join-key-test/v4_support_join_key_candidate_inventory.csv`
- `v4-support-join-key-test/v4_gce_org_metadata_join_coverage.csv`

Time-Saved Defensibility Range readiness:

- `v4-time-saved-defensibility-test/v4_time_saved_defensibility_readiness.csv`
- `v4-time-saved-defensibility-test/v4_time_saved_defensibility_blocked_fixture.csv`

Value realization strategy layer:

- `v4-value-realization-strategy/v4_value_realization_strategy_summary.csv`

Trust Evidence Gap Composition:

- `trust-evidence-gap-composition/trust_evidence_gap_composition_summary.csv`
- `trust-evidence-gap-composition/TRUST_EVIDENCE_GAP_COMPOSITION_READOUT.md`

## QA-Only Aggregate Attribution CSVs

These files are tracked for narrow attribution QA only. They may include
low-count join rows or diagnostic details and must not be used as broad
LM-review inputs or narrative readout tables.

Trust attribution QA:

- `v4-trust-signal-availability/trust_signal_availability_window_1.csv`
- `v4-trust-signal-availability/trust_signal_availability_window_2.csv`
- `v4-trust-signal-availability/trust_signal_availability_window_3.csv`
- `v4-trust-signal-availability/trust_signal_availability_all_windows.csv`

AGENT feedback QA:

- `v4-trust-signal-availability/agent-feedback/agent_feedback_probe_window_1.csv`
- `v4-trust-signal-availability/agent-feedback/agent_feedback_vote_probe_window_1.csv`

Trust attribution refinement QA:

- `v4-trust-attribution-refinement/v4_trust_attribution_window_1.csv`
- `v4-trust-attribution-refinement/v4_trust_attribution_window_2.csv`
- `v4-trust-attribution-refinement/v4_trust_attribution_window_3.csv`
- `v4-trust-attribution-refinement/v4_trust_attribution_all_windows.csv`

Trust classification QA:

- `v4-trust-cohort-classification/v4_trust_classification_window_1.csv`
- `v4-trust-cohort-classification/v4_trust_classification_window_2.csv`
- `v4-trust-cohort-classification/v4_trust_classification_window_3.csv`
- `v4-trust-cohort-classification/v4_trust_classification_all_windows.csv`

Trust Evidence Gap Composition QA:

- `trust-evidence-gap-composition/trust_evidence_gap_composition_input_run_first.csv`
- `trust-evidence-gap-composition/bigquery-candidate-key/trust_evidence_gap_composition_candidate_key_summary.csv`
- `trust-evidence-gap-composition/bigquery-candidate-key/trust_evidence_gap_composition_candidate_key_summary.json`
- `trust-evidence-gap-composition/bigquery-candidate-key/trust_evidence_gap_composition_candidate_key_all_windows.csv`

The `bigquery-candidate-key/` files are QA-only. They are not directly
comparable to the deduped 43.1% product-episode pilot gap until the
product-episode dedup overlay is applied. Sub-floor component values must remain
withheld in tracked outputs.

Behavior cohort joint distribution QA:

- `v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_window_1.csv`
- `v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_window_2.csv`
- `v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_window_3.csv`
- `v4-behavior-cohort-joint-distribution/v4_behavior_cohort_joint_all_windows.csv`

Velocity x Depth readout-zone QA:

- `v4-velocity-depth-zone/v4_velocity_depth_zone_window_1.csv`
- `v4-velocity-depth-zone/v4_velocity_depth_zone_window_2.csv`
- `v4-velocity-depth-zone/v4_velocity_depth_zone_window_3.csv`
- `v4-velocity-depth-zone/v4_velocity_depth_zone_all_windows.csv`

## Excluded Scratch Files

Some ignored local `.csv` files contain copied SQL text or scratch query output
and are not valid data exports. They are intentionally not tracked.

Older dogfood CSVs and QA-only attribution CSVs are not part of the V4 internal
readout rehearsal unless a later manifest explicitly promotes a sanitized
summary.

## Guardrails

The tracked research exports must remain aggregate-only. They must not contain
raw user IDs, emails, raw skill names, prompts, outputs, transcripts, action
rows, or raw event rows.

Narrative readouts and broad LM-review bundles must not surface rows with user
or cohort counts below 5.
