# Behavioral Signals (Human + Agentic) - Design Specification

## Version 0.2 | Status: Draft | Date: 2026-02-23

## Executive summary
This specification defines a non-punitive, privacy-preserving, aggregation-first behavioral signal model for FluencyTracr.

Design principles:
- Awareness model, not scoring or ranking.
- No raw prompt text, output text, transcripts, screenshots, or keystrokes.
- Metadata and event sequences only.
- Suppression and aggregation are required before surfacing executive evidence.
- Multi-agent readiness is first-class for both human telemetry and agent emitters.

## Human Signal Families (v0)

### Adoption and experimentation

| Signal name (snake case) | What it measures | Required metadata fields (no raw content) | Computation notes (sequence-based) | Surfacing constraints (window, suppression) | EvidenceBundle mapping or computed-only |
|---|---|---|---|---|---|
| `tool_first_seen` | First observed use of a tool class in a workflow cohort | `org_id`, `workflow_id`, `tool_class`, `bucket_start`, `event_sequence_id`. No raw content required. | Detect first occurrence in ordered sequence for `(org_id, workflow_id, tool_class)`. | Surface only at weekly, 30d, 60d; suppress for cohort `< k_min`. | Coverage map (`coverage.instrumented_sources` / `coverage.missing_sources`) |
| `feature_trial_sequence_started` | Start of exploratory sequence for a new feature | `org_id`, `workflow_id`, `feature_flag`, `bucket_start`, `event_sequence_id`. No raw content required. | Count trial start marker before stable-use markers in sequence. | Surface weekly and above; suppress small cohorts. | Computed-only |
| `prompt_strategy_shift` | Strategy metadata changes between attempts | `org_id`, `workflow_id`, `attempt_index`, `strategy_tag`, `bucket_start`. No raw content required. | Detect strategy transitions across adjacent attempts. | Surface at 30d and 60d; suppress low sequence counts. | Fragility proxy (`fragility.friction_loops_elevated`) when elevated |
| `template_reuse` | Reuse of known template assets | `org_id`, `workflow_id`, `template_id`, `bucket_start`, `event_sequence_id`. No raw content required. | Count repeated template occurrences after first seen. | Surface weekly and above with suppression. | Calibration proxy (`calibration.verification_presence`) |

### Trust calibration

| Signal name (snake case) | What it measures | Required metadata fields (no raw content) | Computation notes (sequence-based) | Surfacing constraints (window, suppression) | EvidenceBundle mapping or computed-only |
|---|---|---|---|---|---|
| `verification_started` | Explicit verification before acceptance | `org_id`, `workflow_id`, `verification_type`, `event_sequence_id`, `bucket_start`. No raw content required. | Detect verification event before terminal disposition. | Surface weekly, 30d, 60d with suppression. | `calibration.verification_presence` |
| `verification_latency_bucket` | Verification timing bucket profile | `org_id`, `workflow_id`, `verification_latency_bucket`, `event_sequence_id`, `bucket_start`. No raw content required. | Derive bucket from ordered timing metadata. | Surface at 30d and 60d; suppress sparse buckets. | Computed-only |
| `counterfactual_probe` | Alternative-path checks before decision | `org_id`, `workflow_id`, `probe_type`, `event_sequence_id`, `bucket_start`. No raw content required. | Count probe markers before final action. | Surface weekly and above with suppression. | Calibration proxy (`calibration.verification_presence`) |
| `policy_checked` | Policy check in workflow path | `org_id`, `workflow_id`, `policy_id`, `event_sequence_id`, `bucket_start`. No raw content required. | Detect policy-check markers before action/commit markers. | Surface weekly and above with suppression. | `calibration.escalation_to_safe_path_presence` (supporting evidence) |

### Cognitive friction

| Signal name (snake case) | What it measures | Required metadata fields (no raw content) | Computation notes (sequence-based) | Surfacing constraints (window, suppression) | EvidenceBundle mapping or computed-only |
|---|---|---|---|---|---|
| `rapid_abandonment` | Early abandonment after generation/draft stage | `org_id`, `workflow_id`, `abandonment_stage`, `event_sequence_id`, `bucket_start`. No raw content required. | Detect early terminal abandonment in bounded sequence distance. | Surface at 30d and 60d with suppression. | `fragility.rapid_abandonment_elevated` |
| `burst_retry_loop` | Dense retry loops in short sequence windows | `org_id`, `workflow_id`, `retry_reason_bucket`, `attempt_index`, `bucket_start`. No raw content required. | Count retries in bounded sequence windows. | Surface at 30d and 60d; suppress sparse cohorts. | `fragility.friction_loops_elevated` |
| `undo_churn` | Repeated reversals and undo behavior | `org_id`, `workflow_id`, `undo_type`, `event_sequence_id`, `bucket_start`. No raw content required. | Count undo/reversal transitions across adjacent events. | Surface weekly and above with suppression. | `fragility.friction_loops_elevated` |
| `contradiction_detected` | Contradictory outcome/evidence markers | `org_id`, `workflow_id`, `contradiction_class`, `event_sequence_id`, `bucket_start`. No raw content required. | Detect contradiction markers then evaluate follow-on transitions. | Surface at 30d and 60d; suppress low cohorts. | Computed-only |
| `conflict_resolved` | Resolution after contradiction/conflict | `org_id`, `workflow_id`, `resolution_type`, `event_sequence_id`, `bucket_start`. No raw content required. | Count resolution markers after contradiction markers. | Surface weekly and above with suppression. | `calibration.recovery_presence` |

### Goal clarity proxies

| Signal name (snake case) | What it measures | Required metadata fields (no raw content) | Computation notes (sequence-based) | Surfacing constraints (window, suppression) | EvidenceBundle mapping or computed-only |
|---|---|---|---|---|---|
| `constraints_declared_early` | Early declaration of constraints | `org_id`, `workflow_id`, `constraint_marker`, `event_sequence_id`, `bucket_start`. No raw content required. | Detect constraint marker before first solution action. | Surface weekly and above with suppression. | Computed-only |
| `acceptance_criteria_set` | Acceptance criteria set before execution | `org_id`, `workflow_id`, `criteria_marker`, `event_sequence_id`, `bucket_start`. No raw content required. | Count criteria markers before execute/commit markers. | Surface weekly and above with suppression. | Computed-only |
| `scope_narrowed` | Refinement from broad to bounded scope | `org_id`, `workflow_id`, `scope_change_type`, `event_sequence_id`, `bucket_start`. No raw content required. | Detect narrowing transitions in sequence state. | Surface at 30d and 60d; suppress sparse cohorts. | Computed-only |

### Diffusion

| Signal name (snake case) | What it measures | Required metadata fields (no raw content) | Computation notes (sequence-based) | Surfacing constraints (window, suppression) | EvidenceBundle mapping or computed-only |
|---|---|---|---|---|---|
| `artifact_forked` | Branching/adaptation of existing artifact lineage | `org_id`, `workflow_id`, `artifact_id`, `parent_artifact_id`, `bucket_start`. No raw content required. | Count fork events and lineage transitions in ordered events. | Surface weekly and above with suppression. | Exposure proxy (`exposure.shadow_ai`) in unsanctioned contexts |
| `peer_artifact_opened` | Cross-peer artifact engagement signal | `org_id`, `workflow_id`, `artifact_id`, `peer_scope_class`, `bucket_start`. No raw content required. | Count open events from non-origin scope with follow-on action markers. | Surface weekly and above with suppression. | Coverage and computed-only diffusion indicator |

### Risk-aware routing

| Signal name (snake case) | What it measures | Required metadata fields (no raw content) | Computation notes (sequence-based) | Surfacing constraints (window, suppression) | EvidenceBundle mapping or computed-only |
|---|---|---|---|---|---|
| `escalated_to_safe_path` | Routing to guarded execution path | `org_id`, `workflow_id`, `risk_class`, `safe_path_type`, `event_sequence_id`, `bucket_start`. No raw content required. | Detect escalation after risk marker and before completion marker. | Surface weekly and above with suppression. | `calibration.escalation_to_safe_path_presence` |
| `sensitive_mode_enabled` | Activation of sensitive handling mode | `org_id`, `workflow_id`, `sensitive_mode_type`, `risk_class`, `bucket_start`. No raw content required. | Count sensitive mode activation transitions. | Surface weekly and above with suppression. | `exposure.unsanctioned_tool_class` (inverse risk context) + computed-only controls signal |

## Agentic Oversight Signal Families (v0)

| Signal name (snake case) | What it measures | Required metadata fields (no raw content) | Computation notes (sequence-based) | Surfacing constraints (window, suppression) | EvidenceBundle mapping or computed-only |
|---|---|---|---|---|---|
| `agent_review_present_before_execute` | Review before agent execution | `org_id`, `workflow_id`, `agent_type`, `review_marker`, `event_sequence_id`, `bucket_start`. No raw content required. | Detect review marker before execute marker in same sequence. | Surface weekly and above with suppression. | `calibration.verification_presence` |
| `agent_intervention_stop` | Explicit stop intervention into agent run | `org_id`, `workflow_id`, `agent_type`, `stop_reason_bucket`, `event_sequence_id`, `bucket_start`. No raw content required. | Count stop interventions and follow-on transitions. | Surface at 30d and 60d; suppress sparse cohorts. | `calibration.recovery_presence` |
| `agent_override_redirect` | Redirect from default to validated agent path | `org_id`, `workflow_id`, `override_type`, `redirect_target_class`, `event_sequence_id`, `bucket_start`. No raw content required. | Detect override markers then alternate path continuation markers. | Surface weekly and above with suppression. | `calibration.recovery_presence` |
| `post_run_verification_present` | Verification after autonomous run | `org_id`, `workflow_id`, `verification_type`, `post_run_marker`, `bucket_start`. No raw content required. | Detect verification markers after run completion markers. | Surface weekly and above with suppression. | `calibration.verification_presence` |
| `permission_elevation_attempted` | Permission elevation attempts in agent flow | `org_id`, `workflow_id`, `permission_scope`, `agent_type`, `event_sequence_id`, `bucket_start`. No raw content required. | Count elevation attempts and safe-path follow-on behavior. | Surface weekly and above; suppress small cohorts. | `exposure.unsanctioned_tool_class` + computed-only governance signal |
| `repeat_failure_loop_detected` | Repeated failures without successful terminal transition | `org_id`, `workflow_id`, `failure_class`, `attempt_index`, `bucket_start`. No raw content required. | Detect repeated failure markers within bounded attempt windows. | Surface at 30d and 60d with suppression. | `fragility.friction_loops_elevated` |
| `silent_success_risk_proxy` | Success markers without expected verification markers | `org_id`, `workflow_id`, `success_marker`, `verification_absence_flag`, `bucket_start`. No raw content required. | Detect success when expected verification markers are absent. | Surface at 30d and 60d with suppression. | `fragility.blind_acceptance_risk_elevated` |

## Anti-gaming and validity notes
- Multi-signal confirmation is required for strategic decisions.
- Known biases include telemetry gaps, connector drift, and workflow mix shifts.
- Family-level decision support:
  - Adoption and diffusion support enablement and tooling investment.
  - Calibration and risk-aware routing support governance and guardrail tuning.
  - Cognitive friction and agentic oversight support workflow redesign and verification policy improvements.

## Implementation notes
- All computations are sequence-based and metadata-only.
- Suppression is applied before surfacing and must propagate to all downstream outputs.
- Executive outputs remain org-level aggregate with no individual attribution.
