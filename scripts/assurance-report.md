# LMSYS Data-Assurance Verification Report

Generated: 2026-05-15T22:42:39.340Z
Source dataset: lmsys/lmsys-chat-1m
Backend: http://localhost:4000
Assurance run: verify-mp7i6b5q

| Status | Check | Detail |
| --- | --- | --- |
| PASS | `seed_valid_assurance_events` | {"events_posted":313,"batches_posted":3,"orgs":{"lmsys-org-assurance":307,"lmsys-org-tenant-a":3,"lmsys-org-tenant-b":3}} |
| PASS | `pii_probes_rejected_at_boundary` | {"statuses":[400,400,400]} |
| PASS | `observability_endpoint_read` | {} |
| PASS | `sub_threshold_cohort_suppressed` | {"workflow_id":"lmsys-assurance-verify-mp7i6b5q-sub-threshold","disclosure":"SUPPRESSED","suppression_reasons":["insufficient_disclosed_executions"]} |
| PASS | `trace_read_calibrated_fluency` | {"traces":5} |
| PASS | `trace_read_fast_completion_no_verification` | {"traces":5} |
| PASS | `trace_read_failure_success_recovery_maturity` | {"traces":5} |
| PASS | `trace_read_friction_loop` | {"traces":50} |
| PASS | `trace_read_undertrust_avoidance` | {"traces":5} |
| PASS | `all_five_classification_patterns_observed` | {"observed":["Blind Efficiency","Calibrated Fluency","Friction Loop","Recovery Maturity","Undertrust Avoidance"]} |
| PASS | `duplicate_execution_ids_isolated_by_org` | {"execution_id":"exec:lmsys-assurance-verify-mp7i6b5q-shared-model:run:lmsys-assurance-verify-mp7i6b5q-duplicate-shared-run","tenant_a_traces":1,"tenant_b_traces":1} |
| FAIL | `audit_log_entries_exist_for_each_suppression` | {"suppressed_workflows":["lmsys-assurance-verify-mp7i6b5q-sub-threshold"],"missing_audit_workflows":["lmsys-assurance-verify-mp7i6b5q-sub-threshold"],"audit_log_count":0} |
| FAIL | `prevalence_values_are_categorical` | {"violations":[{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-blind-efficiency","pattern":"Calibrated Fluency","value":0},{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-blind-efficiency","pattern":"Blind Efficiency","value":5},{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-blind-efficiency","pattern":"Recovery Maturity","value":0},{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-blind-efficiency","pattern":"Friction Loop","value":0},{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-blind-efficiency","pattern":"Undertrust Avoidance","value":0},{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-calibrated-fluency","pattern":"Calibrated Fluency","value":5},{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-calibrated-fluency","pattern":"Blind Efficiency","value":0},{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-calibrated-fluency","pattern":"Recovery Maturity","value":0},{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-calibrated-fluency","pattern":"Friction Loop","value":0},{"workflow_id":"lmsys-assurance-verify-mp7i6b5q-calibrated-fluency","pattern":"Undertrust Avoidance","value":0}]} |
| PASS | `patterns_endpoint_read_attempted` | {"body_summary":"Cohort below minimum size"} |

FluencyTracr operates as a data-assurance layer: NO
