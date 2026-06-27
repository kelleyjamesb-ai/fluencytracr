# Current Slice Contract

- Work item id: `ai-value-measurement-journey-state-model`
- Title: `Measurement Journey State Model and Source-Ref Alignment Posture`
- Status: `completed`

## Summary

Add the bounded product-facing, UI-safe Measurement Journey State Model over
the governed AI Value contract chain, including the prerequisite Triangulated
Evidence Alignment Review source-ref posture and a narrow comparison-design
sidecar hardening guard. The model selects exactly one active journey state,
exposes a separate model-review posture, reports the current blocker and next
allowed product action, and keeps all evidence, diagnostics, Bayesian
readiness, promotion, posterior interpretation, confidence/probability,
economic, route, schema, persistence, export, live connector, raw row,
identifier, query text, prompt, transcript, person-level, individual scoring,
and team scoring paths blocked.

## Scope Paths

- `docs/contracts/ai-value-measurement-journey-state-model/README.md`
- `docs/contracts/ai-value-triangulated-evidence-alignment-review/README.md`
- `scripts/run_ai_value_measurement_journey_state_model.mjs`
- `scripts/validate_ai_value_measurement_journey_state_model.test.mjs`
- `scripts/run_ai_value_triangulated_evidence_alignment_review.mjs`
- `scripts/validate_ai_value_triangulated_evidence_alignment_review.test.mjs`
- `scripts/run_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.mjs`
- `scripts/validate_ai_value_contribution_alignment_comparison_design_adequacy_evidence_review.test.mjs`
- `package.json`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Boundaries

- The state model is a view model over governed contract posture, not evidence.
- The triangulated review is source-ref posture only; it does not validate
  evidence content, satisfy diagnostics evidence, or create model readiness.
- Active state selection uses most-advanced-valid-state logic while failing
  closed to the earliest unmet, unsafe, stale, held, missing, or invalid
  prerequisite.
- Ready downstream states require source-bound validation; hashes alone do not
  advance the journey.
- Held triangulated alignment requires source-bound held recomputation before
  it can map to `EVIDENCE_ALIGNMENT_HELD`.
- Held triangulated review output validates as fail-closed output without
  requiring missing source refs to exist.
- Reviewer-owned comparison-design collections with unexpected raw or promotion
  sidecars hold before they can feed adequacy review.
- `MODEL_REVIEW_BLOCKED` can only hide the alignment state after a source-bound
  `EVIDENCE_ALIGNMENT_ALIGNED` review plus an explicit model-review gate
  posture. Held, partial, and divergent alignment remain visible.
- `model_review_posture` remains separate and defaults to
  `BLOCKED_UNTIL_GOVERNED_DIAGNOSTICS_EVIDENCE`.
- The state model emits no `reviewed_source_evidence_hash`,
  `source_evidence_hash`, or `evidence_satisfied` field.

## Completed Checks

- `npm run test:ai-value-measurement-journey-state-model`
- `npm run test:ai-value-triangulated-evidence-alignment-review`
- `npm run test:ai-value-contribution-alignment-comparison-design-adequacy-evidence-review`
- `npm run test:ai-value-reviewer-owned-comparison-design-source-package-collection`
- `npm run test:ai-value-comparison-design-source-package-preparation-binding`
- `npm run test:ai-value-aggregate-data-collection-planning-contract`
- `bash scripts/ci_docs_contract_sweep.sh`
- `python3 scripts/ci_v1_governance_gates.py`
- `node scripts/ci_semantic_drift_guard.mjs`
- `git diff --check`

## Next Handoff Note

The product is ready for a bounded UI/UX slice that renders the Measurement
Journey State Model in the existing AI Value Journey / Workspace / Readout
surfaces. That slice must reuse existing UI, render state labels rather than
raw tokens, preserve model-review blocking, and avoid creating routes, schemas,
persistence, exports, live connectors, diagnostics evidence, Bayesian
readiness, promotion, posterior interpretation, confidence/probability output,
ROI, finance, causality, productivity, customer-facing economic output, raw
rows, identifiers, query text, prompts, transcripts, or person-level data.
