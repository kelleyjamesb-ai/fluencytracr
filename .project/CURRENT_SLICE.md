# Current Slice Contract

- Work item id: `ai-value-comparison-design-source-package-preparation-binding`
- Title: `Comparison Design Source Package Preparation Binding`
- Status: `completed`

## Summary

Add the bounded preparation-only artifact after the Aggregate Data Collection
Planning Contract so FluencyTracr can carry a reviewer-approved measurement
plan and aggregate collection planning posture into the checklist needed before
future reviewer-owned comparison-design source package collection.

## Scope Paths

- `docs/contracts/ai-value-comparison-design-source-package-preparation-binding/README.md`
- `scripts/run_ai_value_comparison_design_source_package_preparation_binding.mjs`
- `scripts/validate_ai_value_comparison_design_source_package_preparation_binding.test.mjs`
- `package.json`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Boundaries

- Internal-only, aggregate-only, source-ref-only, fail-closed.
- The preparation artifact is not reviewer attestation, not reviewed evidence,
  not a collected source package, and not comparison-design adequacy.
- It does not create evidence, assess evidence, satisfy diagnostics evidence,
  complete the Governed Diagnostics Sufficiency Evidence Source, feed Bayesian
  promotion, or authorize promotion.
- Posterior interpretation, confidence/probability output, ROI, finance,
  causality, productivity, customer-facing economic output, live connectors,
  routes, UI, schemas, persistence, exports, raw rows, identifiers, query text,
  prompts, transcripts, person-level data, individual scoring, and team scoring
  remain blocked.

## Completed Checks

- `npm run test:ai-value-comparison-design-source-package-preparation-binding`
- `npm run test:ai-value-aggregate-data-collection-planning-contract`
- `npm run test:ai-value-reviewer-approved-measurement-plan-contract`
- `npm run test:ai-value-hypothesis-to-metric-recommendation`
- `npm run test:ai-value-contribution-reporting-spine`
- `bash scripts/ci_docs_contract_sweep.sh`
- `python3 scripts/ci_v1_governance_gates.py`
- `node scripts/ci_semantic_drift_guard.mjs`
- `git diff --check`

## Next Handoff Note

The exact next bounded slice is `Reviewer-Owned Comparison Design Source
Package Collection`. It should collect or bind a reviewer-owned
comparison-design source package against the preparation binding without
creating synthetic evidence, satisfying `comparison_design_adequacy`, running
diagnostics, authorizing Bayesian promotion, creating live connectors/routes/
UI/schemas/persistence/exports, or emitting confidence/probability, ROI,
finance, causality, productivity, economic, or customer-facing economic output.
