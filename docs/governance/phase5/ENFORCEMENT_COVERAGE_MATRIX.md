# Enforcement Coverage Matrix (ECM)

Acceptance rule: No GEM row without BOTH runtime enforcement and CI enforcement, each independently blocking violation.

Source of truth for GEM row IDs: docs/governance/phase5/GEM_ROW_IDS.md

## GEM-TG5-01-NO_CROSS_WINDOW_LINKAGE
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/backend/src/phase1/evaluateDecision.ts, /Users/jkelley/Desktop/FluencyTracr/backend/src/phase1/windowing.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_cross_window.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-02-NO_ORDERING_STREAKS_OR_DURATION
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/shared/src/privacy.ts, /Users/jkelley/Desktop/FluencyTracr/backend/src/middleware/forbiddenFieldsMiddleware.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_forbidden_fields.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-03-NO_DELTAS_COMPARISONS_OR_TRENDS
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/shared/src/privacy.ts, /Users/jkelley/Desktop/FluencyTracr/backend/src/middleware/forbiddenFieldsMiddleware.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_forbidden_fields.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-04-BINARY_ONLY_EXECUTIVE_VISIBILITY
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/backend/src/phase1/surfaceDecision.ts, /Users/jkelley/Desktop/FluencyTracr/backend/src/app.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_binary_visibility_api.test.ts, /Users/jkelley/Desktop/FluencyTracr/backend/tests/binary_visibility.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/scripts/ci_v1_governance_gates.py, /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-05-SUPPRESSION_BEFORE_SURFACING
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/backend/src/phase1/evaluateDecision.ts, /Users/jkelley/Desktop/FluencyTracr/backend/src/phase1/surfaceDecision.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/suppression_before_surfacing.test.ts, /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_suppression_before_surfacing.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-06-ABSENCE_IS_NEUTRAL
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/backend/src/app.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_absence_neutral.test.ts, /Users/jkelley/Desktop/FluencyTracr/backend/tests/orientation_phase3_negatives.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-07-NON_ORDINAL_PATTERN_LABELS
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/shared/src/types.ts, /Users/jkelley/Desktop/FluencyTracr/shared/src/schemas.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_non_ordinal_patterns.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-08-NO_EXEC_EXPORT_ENABLING_AGGREGATION
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/backend/src/app.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/dashboard_export.test.ts, /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_non_exportability.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-09-DECISION_SUPPORT_SUPPRESSION
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/backend/src/phase1/evaluateDecision.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_decision_support_suppression.test.ts, /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase1_thin_slice.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-10-ENFORCEMENT_ON_OFF_SEMANTICS
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/backend/src/config/enforcement.ts, /Users/jkelley/Desktop/FluencyTracr/backend/src/app.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/enforcement_flag.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/scripts/validate_enforcement_state.py, /Users/jkelley/Desktop/FluencyTracr/.github/workflows/enforcement-state-gate.yml, /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-11-AMBIGUITY_FAIL_CLOSED
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/backend/src/phase1/evaluateDecision.ts, /Users/jkelley/Desktop/FluencyTracr/backend/src/middleware/ambiguityMiddleware.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_fail_closed.test.ts, /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase1_thin_slice.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/scripts/ci_v1_governance_gates.py, /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

## GEM-TG5-12-ENFORCEMENT_VALIDITY_RULE
- Source artifact: docs/governance/tg5/TG5_Governance_Enforcement_Matrix_FINAL.md
- Enforcement points: ingestion | evaluation | suppression | surfacing | API | CI
- Runtime enforcement locations (paths): /Users/jkelley/Desktop/FluencyTracr/backend/src/config/enforcement.ts, /Users/jkelley/Desktop/FluencyTracr/backend/src/middleware/forbiddenFieldsMiddleware.ts
- Tests proving enforcement: /Users/jkelley/Desktop/FluencyTracr/backend/tests/enforcement_flag.test.ts, /Users/jkelley/Desktop/FluencyTracr/backend/tests/phase5_forbidden_fields.test.ts
- CI checks failing on violation: /Users/jkelley/Desktop/FluencyTracr/scripts/ci_phase5_guardrails.py, /Users/jkelley/Desktop/FluencyTracr/.github/workflows/ci.yml (backend tests)
- Status: COMPLETE

**Non-Expansion Attestation**
During Phase 5A remediation, no governance behavior was expanded.
All changes strictly strengthened enforcement of existing, approved governance rules.
No new signals, outputs, semantics, or executive surfaces were introduced.
