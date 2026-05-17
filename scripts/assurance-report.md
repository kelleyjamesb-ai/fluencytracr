# LMSYS Data-Assurance Verification Report

Generated: 2026-05-16T18:26:28.676Z
Source dataset: lmsys/lmsys-chat-1m
Backend: http://localhost:4000
Assurance run: verify-mp8ogopl

| Status | Check | Detail |
| --- | --- | --- |
| PASS | `seed_valid_assurance_events` | {"events_posted":403,"batches_posted":7,"orgs":{"lmsys-org-assurance":307,"lmsys-org-assurance-residual-fires":20,"lmsys-org-assurance-residual-positive-bypass":40,"lmsys-org-assurance-residual-ambiguity":20,"lmsys-org-assurance-residual-no-persistence":10,"lmsys-org-tenant-a":3,"lmsys-org-tenant-b":3}} |
| PASS | `pii_probes_rejected_at_boundary` | {"statuses":[400,400,400]} |
| PASS | `observability_endpoint_read` | {} |
| PASS | `sub_threshold_cohort_suppressed` | {"workflow_id":"lmsys-assurance-verify-mp8ogopl-sub-threshold","disclosure":"SUPPRESSED","suppression_reasons":["insufficient_disclosed_executions"]} |
| PASS | `trace_read_calibrated_fluency` | {"traces":5} |
| PASS | `trace_read_fast_completion_no_verification` | {"traces":5} |
| PASS | `trace_read_failure_success_recovery_maturity` | {"traces":5} |
| PASS | `trace_read_friction_loop` | {"traces":50} |
| PASS | `trace_read_undertrust_avoidance` | {"traces":5} |
| PASS | `all_five_classification_patterns_observed` | {"observed":["Blind Efficiency","Calibrated Fluency","Friction Loop","Recovery Maturity","Undertrust Avoidance"]} |
| PASS | `duplicate_execution_ids_isolated_by_org` | {"execution_id":"exec:lmsys-assurance-verify-mp8ogopl-shared-model:run:lmsys-assurance-verify-mp8ogopl-duplicate-shared-run","tenant_a_traces":1,"tenant_b_traces":1} |
| PASS | `audit_log_entries_exist_for_each_suppression` | {"suppressed_workflows":["lmsys-assurance-seed-mp8ogo6t-sub-threshold","lmsys-assurance-verify-mp8ogopl-sub-threshold"]} |
| PASS | `prevalence_values_are_categorical` | {"allowed_values":["LOW","MODERATE","HIGH"]} |
| PASS | `ghost_use_residual_fires` | {"workflow_id":"lmsys-assurance-verify-mp8ogopl-ghost-use-residual-fires","ghost_use_surfacings":2} |
| PASS | `ghost_use_bypassed_by_positive_evidence` | {"workflow_id":"lmsys-assurance-verify-mp8ogopl-ghost-use-bypassed-by-positive-evidence","bypass_evidence":2} |
| PASS | `ghost_use_suppressed_by_ambiguity` | {"workflow_id":"lmsys-assurance-verify-mp8ogopl-ghost-use-suppressed-by-ambiguity","ambiguity_evidence":4} |
| PASS | `ghost_use_does_not_persist` | {"workflow_id":"lmsys-assurance-verify-mp8ogopl-ghost-use-does-not-persist","persistence_evidence":4} |
| PASS | `ghost_use_framed_as_observability_only` | {"ghost_use_surfacings_inspected":2,"forbidden_terms":["resistance","underperformance","lack of fluency"]} |
| PASS | `patterns_endpoint_read_attempted` | {"body_summary":"Cohort below minimum size"} |

FluencyTracr operates as a data-assurance layer: YES
