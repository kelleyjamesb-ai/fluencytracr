# Required Phase 5 Governance Enforcement Tests

The following tests are mandatory governance enforcement artifacts.

CI must fail if any listed test is missing, renamed, skipped, or not executed.

* phase5_cross_window.test.ts
* phase5_forbidden_fields.test.ts
* phase5_binary_visibility_api.test.ts
* phase5_suppression_before_surfacing.test.ts
* phase5_absence_neutral.test.ts
* phase5_non_ordinal_patterns.test.ts
* phase5_decision_support_suppression.test.ts
* enforcement_flag.test.ts
* phase5_non_exportability.test.ts

IMPORTANT: This manifest is descriptive only. Runtime code must not import or parse `docs/governance/**`.
