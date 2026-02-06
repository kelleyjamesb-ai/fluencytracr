# Adversarial Change Log (ACL)

Purpose: Track adversarial PR scenarios and prove enforcement (CI or runtime suppression). This log is descriptive only.

Template:
- ID:
- Scenario:
- Targeted GEM IDs:
- Expected Block (CI | Runtime Suppression):
- Evidence (test/CI path):
- Result (PASS/FAIL/TODO):
- Notes:

---

## Entries

- ID: ACL-001
- Scenario: Add “helpful” counts/metrics to executive response payloads.
- Targeted GEM IDs: GEM-TG5-02-NO_ORDERING_STREAKS_OR_DURATION, GEM-TG5-03-NO_DELTAS_COMPARISONS_OR_TRENDS, GEM-TG5-08-NO_EXEC_EXPORT_ENABLING_AGGREGATION
- Expected Block (CI | Runtime Suppression): CI
- Evidence (test/CI path): /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/docs/governance/phase5/ci_violation_logs_with_gem_ids.txt
- Result (PASS/FAIL/TODO): PASS
- Notes: CI guardrail rejects forbidden keys.

- ID: ACL-002
- Scenario: Add a history endpoint or export for multi-window payloads.
- Targeted GEM IDs: GEM-TG5-01-NO_CROSS_WINDOW_LINKAGE, GEM-TG5-03-NO_DELTAS_COMPARISONS_OR_TRENDS, GEM-TG5-08-NO_EXEC_EXPORT_ENABLING_AGGREGATION
- Expected Block (CI | Runtime Suppression): CI
- Evidence (test/CI path): /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/docs/governance/phase5/ci_violation_logs_with_gem_ids.txt
- Result (PASS/FAIL/TODO): PASS
- Notes: CI guardrail rejects multi-window keys.

- ID: ACL-003
- Scenario: Introduce joinable identifiers that enable cross-window aggregation.
- Targeted GEM IDs: GEM-TG5-01-NO_CROSS_WINDOW_LINKAGE, GEM-TG5-08-NO_EXEC_EXPORT_ENABLING_AGGREGATION
- Expected Block (CI | Runtime Suppression): CI
- Evidence (test/CI path): /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/docs/governance/phase5/ci_violation_logs_with_gem_ids.txt
- Result (PASS/FAIL/TODO): PASS
- Notes: CI guardrail rejects forbidden key additions.

- ID: ACL-004
- Scenario: Reintroduce WAIM-like executable hints in runtime or tests.
- Targeted GEM IDs: GEM-TG5-05-SUPPRESSION_BEFORE_SURFACING, GEM-TG5-12-ENFORCEMENT_VALIDITY_RULE
- Expected Block (CI | Runtime Suppression): CI
- Evidence (test/CI path): /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/docs/governance/phase5/ci_violation_logs_with_gem_ids.txt
- Result (PASS/FAIL/TODO): PASS
- Notes: CI guardrail blocks docs/governance imports.

- ID: ACL-005
- Scenario: Add time ordering, streaks, or duration fields to a schema or API payload.
- Targeted GEM IDs: GEM-TG5-02-NO_ORDERING_STREAKS_OR_DURATION, GEM-TG5-03-NO_DELTAS_COMPARISONS_OR_TRENDS
- Expected Block (CI | Runtime Suppression): CI
- Evidence (test/CI path): /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/docs/governance/phase5/ci_violation_logs_with_gem_ids.txt
- Result (PASS/FAIL/TODO): PASS
- Notes: CI guardrail rejects ordered/accumulative keys.

- ID: ACL-006
- Scenario: Import docs/governance/** into runtime or test code.
- Targeted GEM IDs: GEM-TG5-12-ENFORCEMENT_VALIDITY_RULE
- Expected Block (CI | Runtime Suppression): CI
- Evidence (test/CI path): /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/docs/governance/phase5/ci_violation_logs_with_gem_ids.txt
- Result (PASS/FAIL/TODO): PASS
- Notes: CI guardrail blocks executable references to docs/governance.

- ID: ACL-007
- Scenario: Delete or rename phase5_non_exportability.test.ts.
- Targeted GEM IDs: GEM-TG5-12-ENFORCEMENT_VALIDITY_RULE
- Expected Block (CI | Runtime Suppression): CI
- Evidence (test/CI path): /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_required_tests.py, /Users/jkelley/Desktop/FluencyTracr/docs/governance/phase5/ci_violation_logs_with_gem_ids.txt
- Result (PASS/FAIL/TODO): PASS
- Notes: CI guardrail blocks missing required enforcement test.
