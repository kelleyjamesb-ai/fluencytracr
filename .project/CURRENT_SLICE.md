# Current Slice Contract

- Work item id: `ai-value-aggregate-data-collection-planning-contract`
- Title: `Aggregate Data Collection Planning Contract`
- Status: `completed`

## Summary

Add the bounded planning-only contract after the Reviewer-Approved Measurement
Plan Contract so FluencyTracr can prepare for future aggregate data collection
against an approved measurement plan without pretending aggregate data, evidence,
comparison-design adequacy, diagnostics sufficiency, or Bayesian readiness
already exists.

## Scope Paths

- `docs/contracts/ai-value-aggregate-data-collection-planning-contract/README.md`
- `docs/contracts/ai-value-reviewer-approved-measurement-plan-contract/README.md`
- `scripts/run_ai_value_aggregate_data_collection_planning_contract.mjs`
- `scripts/validate_ai_value_aggregate_data_collection_planning_contract.test.mjs`
- `package.json`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Boundaries

- Internal-only, aggregate-only, source-ref-only, fail-closed.
- Metric recommendations and reviewer-approved measurement plans remain
  planning inputs, not evidence.
- Aggregate data collection planning does not create or observe aggregate data.
- The slice does not create evidence, assess evidence, satisfy
  `comparison_design_adequacy`, satisfy diagnostics evidence, feed Bayesian
  promotion, or authorize promotion.
- Posterior interpretation, confidence/probability output, ROI, finance,
  causality, productivity, customer-facing economic output, live connectors,
  routes, UI, schemas, persistence, exports, raw rows, identifiers, query text,
  prompts, transcripts, person-level data, individual scoring, and team scoring
  remain blocked.

## Completed Checks

- `npm run test:ai-value-aggregate-data-collection-planning-contract`
- `npm run test:ai-value-reviewer-approved-measurement-plan-contract`
- `npm run test:ai-value-hypothesis-to-metric-recommendation`
- `npm run test:ai-value-contribution-reporting-spine`
- `bash scripts/ci_docs_contract_sweep.sh`
- `python3 scripts/ci_v1_governance_gates.py`
- `node scripts/ci_semantic_drift_guard.mjs`
- `git diff --check`

## Next Handoff Note

The exact next bounded slice is `Comparison Design Source Package Preparation
Binding`. It should bind the existing comparison-design intake/source-package
preparation path to the validated Reviewer-Approved Measurement Plan Contract
and Aggregate Data Collection Planning Contract without creating evidence,
satisfying `comparison_design_adequacy`, running diagnostics, authorizing
Bayesian promotion, creating live connectors/routes/UI/schemas/persistence/
exports, or emitting confidence/probability, ROI, finance, causality,
productivity, economic, or customer-facing economic output.
