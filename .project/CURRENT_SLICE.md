# Current Slice Contract

- Work item id: `ai-value-comparison-design-adequacy-review-reviewer-owned-binding`
- Title: `Comparison Design Adequacy Evidence Review Binding to Reviewer-Owned Package`
- Status: `completed`

## Summary

Bind the existing Comparison Design Adequacy Evidence Review to the
Reviewer-Owned Comparison Design Source Package Collection artifact. The review
may satisfy only the `comparison_design_adequacy` dimension, and only when the
collection artifact is complete, source-bound, scalar, aggregate-only,
boundary-clear, and ready for adequacy review.

## Scope Paths

- `docs/contracts/ai-value-contribution-alignment-comparison-design-adequacy-evidence-review/README.md`
- `scripts/run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs`
- `scripts/validate_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.test.mjs`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Boundaries

- The adequacy review uses the existing reviewer-owned collection artifact as
  its only source package input.
- Direct legacy adequacy source packages, runtime design matrix fields, model
  spec prose, templates, fixtures, generated examples, and source hashes alone
  cannot satisfy `comparison_design_adequacy`.
- Held inputs emit no `review_hash`, no `reviewed_source_evidence_hash`, and no
  `source_evidence_hash`.
- The review does not create source evidence, duplicate package collection,
  satisfy diagnostics sufficiency, feed Bayesian promotion, or authorize
  promotion.
- Posterior interpretation, confidence/probability output, ROI, finance,
  causality, productivity, customer-facing economic output, live connectors,
  routes, UI, schemas, persistence, exports, raw rows, identifiers, query text,
  prompts, transcripts, person-level data, individual scoring, and team scoring
  remain blocked.

## Completed Checks

- `npm run test:ai-value-contribution-alignment-comparison-design-adequacy-evidence-review`
- `npm run test:ai-value-reviewer-owned-comparison-design-source-package-collection`
- `npm run test:ai-value-comparison-design-source-package-preparation-binding`
- `npm run test:ai-value-aggregate-data-collection-planning-contract`
- `bash scripts/ci_docs_contract_sweep.sh`
- `python3 scripts/ci_v1_governance_gates.py`
- `node scripts/ci_semantic_drift_guard.mjs`
- `git diff --check`

## Next Handoff Note

The exact next bounded slice remains governed diagnostics evidence collection
for the remaining unsatisfied dimensions. Do not start diagnostics sufficiency,
Bayesian readiness, promotion, or posterior interpretation until every required
dimension has explicit governed reviewed evidence.
