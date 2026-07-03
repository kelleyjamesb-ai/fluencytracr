# Confidence-engine porting ledger (task 1.1 freeze)

Authorized by OpenSpec change `add-confidence-engine-workspace`. This ledger
freezes the spine inventory the port must preserve byte-identically. Any
schema version string, state token, or hash edge below changing during the
port is a porting defect, not an update.

## Spine modules (port order = dependency order)

| # | Module (`scripts/run_ai_value_contribution_alignment_<name>.mjs`) | Schema version | Lines |
|---|---|---|---|
| 1 | `feature_stability_review` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_FEATURE_STABILITY_REVIEW_2026_06` | 751 |
| 2 | `internal_numeric_weight_decision` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_NUMERIC_WEIGHT_DECISION_2026_06` | 560 |
| 3 | `versioned_weight_object` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_VERSIONED_WEIGHT_OBJECT_2026_06` | 757 |
| 4 | `weighted_internal_model_frame` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_WEIGHTED_INTERNAL_MODEL_FRAME_2026_06` | 834 |
| 5 | `internal_bayesian_readiness_review` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_READINESS_REVIEW_2026_06` | 816 |
| 6 | `bayesian_model_specification` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_BAYESIAN_MODEL_SPECIFICATION_2026_06` | 971 |
| 7 | `internal_bayesian_execution_gate` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_GATE_2026_06` | 947 |
| 8 | `internal_bayesian_execution_runtime` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_BAYESIAN_EXECUTION_RUNTIME_2026_06` | 979 |
| 9 | `governed_diagnostics_sufficiency_evidence_source` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_GOVERNED_DIAGNOSTICS_SUFFICIENCY_EVIDENCE_SOURCE_2026_06` | 1594 |
| 10 | `diagnostics_evidence_packet` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_DIAGNOSTICS_EVIDENCE_PACKET_2026_06` | 1490 |
| 11 | `internal_diagnostics_model_adequacy_review` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_INTERNAL_DIAGNOSTICS_MODEL_ADEQUACY_REVIEW_2026_06` | 1573 |
| 12 | `posterior_output_review_gate` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_POSTERIOR_OUTPUT_REVIEW_GATE_2026_06` | 844 |
| 13 | `bayesian_promotion_decision_gate` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_BAYESIAN_PROMOTION_DECISION_GATE_2026_06` | 1796 |
| 14 | `promotion_gate_passed_artifact_handoff` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_PROMOTION_GATE_PASSED_ARTIFACT_HANDOFF_2026_06` | 744 |
| 15 | `bayesian_hardening_orchestrator` | `FT_AI_VALUE_CONTRIBUTION_ALIGNMENT_BAYESIAN_HARDENING_ORCHESTRATOR_2026_06` | 1167 |

Also consumed by the orchestrator (port with #15):
`internal_bayesian_execution_artifact_v1`.

Out of scope (immutable research lineage, stays in `scripts/`):
`internal_prototype_runner`, `runner_review_packet`,
`model_prototype_design_review`, `internal_model_prototype`,
`internal_model_prototype_review_packet`, `internal_research_design_gate_review`,
`method_prototype_decision`, `small_internal_method_prototype`,
`internal_method_prototype_review_record`, `research_math_finalization_review`,
`research_math_data_model_promotion_decision`,
`internal_research_math_data_model` (its output is the chain input, captured
as golden 00), `comparison_design_adequacy_evidence_review` (reviewer-owned
lane, revisit after spine cutover).

## Hash edges that must survive

Each artifact self-hashes as `sha256(stableStringify(object minus its own
*_hash field))` and embeds upstream hashes (`..._hash` refs) from the module
it consumes, in this order:

research_math_data_model → feature_stability_review →
internal_numeric_weight_decision → versioned_weight_object →
weighted_internal_model_frame → internal_bayesian_readiness_review →
bayesian_model_specification → internal_bayesian_execution_gate →
internal_bayesian_execution_runtime (+ aggregate-window fixture, and the
`--source-envelope` variant) → { governed_diagnostics_sufficiency_evidence_source,
diagnostics_evidence_packet, internal_diagnostics_model_adequacy_review,
posterior_output_review_gate } → bayesian_promotion_decision_gate →
promotion_gate_passed_artifact_handoff → bayesian_hardening_orchestrator.

## Determinism contract

Every spine module hardcodes `generated_at` ("2026-06-25T00:00:00.000Z" era
constants) and uses no `Date.now()`/randomness, so golden outputs are
byte-stable. `test/golden/generate.sh` regenerates the full chain; on an
unchanged `scripts/` tree regeneration must be a no-op (enforced by the
parity suite comparing self-hashes, and by `git status` after regeneration).

## CLI compatibility to preserve at cutover

- Modules 1–7 read stdin (`-`) or a file path.
- Module 8 takes `<gate.json> <aggregate-window-fixture.json>` positional
  args plus the `--source-envelope` flag variant.
- Modules 9–12, 15 read the runtime source envelope (stdin or path).
- Module 13 takes `<adequacy-review.json> <envelope.json> <packet.json>`.
- Module 14 takes `<envelope.json>`.
- npm script chains (see root `package.json` `run:ai-value-contribution-
  alignment-*`) pipe stage-to-stage and use `/tmp/fluencytracr-*` temp files;
  these invocations must work unchanged against the wrappers.

## Known pre-existing defect fixed alongside this freeze

`governed_diagnostics_sufficiency_evidence_source.mjs` on `main` contained two
`const ALLOWED_SOURCE_RUNTIME_ENVELOPE_FIELDS` declarations (a merge collision
between commits 711ef915 and b4e7a0ff), which is a SyntaxError: the module —
and every downstream spine stage — could not load at all. The resolution
recorded in this branch restores loadability and is arbitrated by the
module's own test suite plus golden chain stages 10–16.
