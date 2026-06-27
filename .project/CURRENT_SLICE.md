# Current Slice Contract

- Work item id: `ai-value-ui-view-model-adapter`
- Title: `UI View Model Adapter`
- Status: `completed`

## Summary

Add a single frontend-safe adapter that consumes the Measurement Journey State
Model and safe upstream posture labels to produce a clean UI object for later
Journey / Workspace / Readout integration. The adapter is product-facing,
aggregate-only, label-only, and fail-closed. It does not import Node runners,
create routes, add schemas, persist customer output, export anything, call live
connectors, recompute the active journey state, expose reviewer-owned payloads,
or surface raw evidence, source refs, hashes, prompts, transcripts, query text,
identifiers, reviewer names, or person-level data.

## Scope Paths

- `frontend/src/lib/aiValueUiViewModelAdapter.ts`
- `frontend/src/lib/aiValueUiViewModelAdapter.test.ts`
- `package.json`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Boundaries

- The Measurement Journey State Model remains the active-state source of truth.
- The adapter maps state ids to approved product labels and never advances
  beyond the active source-model state.
- Unknown, unsafe, malformed, missing, or weakened source-model states fail
  closed to `NO_BLUEPRINT`.
- Required non-authorization fields must be present and false; supplied
  `blocked_outputs` and `feeds` must all remain false.
- `model_review_posture` remains
  `BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE` even when source refs align.
- Aligned source refs remain review-only and do not imply evidence
  satisfaction, causality, confidence, probability, ROI, productivity,
  Bayesian readiness, or model eligibility.
- Divergent source refs require reviewer interpretation and do not imply
  failure.
- Safety booleans are hardcoded false:
  `can_show_confidence`, `can_show_probability`, `can_show_roi`,
  `can_show_productivity`, `can_show_causality`, `can_export`, and
  `can_persist_customer_output`.

## Completed Checks

- `npm run test:ai-value-ui-view-model-adapter`
- `npm run test:ai-value-measurement-journey-state-model`
- `npm run test:ai-value-triangulated-evidence-alignment-review`
- `npm run test:ai-value-contribution-alignment-comparison-design-adequacy-evidence-review`
- `npm run test:ai-value-reviewer-owned-comparison-design-source-package-collection`
- `npm run test:ai-value-comparison-design-source-package-preparation-binding`
- `npm run test:ai-value-aggregate-data-collection-planning-contract`
- `bash scripts/ci_docs_contract_sweep.sh`
- `python3 scripts/ci_v1_governance_gates.py`
- `node scripts/ci_semantic_drift_guard.mjs`
- `npm run build --workspace frontend`
- `git diff --check`

## Next Handoff Note

The product is ready for the bounded Journey / Workspace / Readout integration
slice that consumes `buildAiValueUiViewModelAdapter` inside existing AI Value
surfaces. That slice should reuse the existing UI, render only adapter labels
and safe booleans, preserve model-review blocking, and still avoid routes,
schemas, persistence, exports, live connectors, diagnostics evidence, Bayesian
readiness, promotion, posterior interpretation, confidence/probability output,
ROI, finance, causality, productivity, customer-facing economic output, raw
rows, identifiers, query text, prompts, transcripts, reviewer names, or
person-level data.
