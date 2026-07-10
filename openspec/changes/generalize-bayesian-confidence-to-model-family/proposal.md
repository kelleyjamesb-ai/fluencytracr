# Change: Generalize Bayesian confidence to a model family

## Why

The current Bayesian proof harness correctly implements a hierarchical
Bayesian DiD design for synthetic, internal-only, two-group pre/post
comparison-supported hypotheses. Recent Phase B2 work showed that treating
Bayesian DiD as the universal confidence model creates pressure to force
evidence designs through a module they may not fit.

FluencyTracr needs a broader architecture:
`bayesian_ai_value_realization_and_human_transformation_model_family`. The current DiD
implementation remains valid, but only as
`comparison_supported_bayesian_did_module`.

## What Changes

- Add a docs-only current-state audit and decision record under
  `docs/contracts/bayesian-ai-value-realization-and-human-transformation-model-family/`.
- Reposition the existing DiD proof harness as a specialized
  comparison-supported module, not the universal model for every value
  evidence pathway.
- Define additive evidence-design vocabulary:
  `CONTROLLED_TEST`, `TWO_GROUP_PRE_POST_COMPARISON`, `STAGGERED_ROLLOUT`,
  `MATCHED_COMPARISON`, `HISTORICAL_STATE_SPACE`, `REPEATED_PRE_POST`, and
  `BASELINE_ONLY`.
- Define the Hypothesis Measurement Plan as the future governing input concept.
- Add Phase 1 docs-only contract semantics for router status, required gates,
  claim caps, unsupported/HOLD behavior, pathway coherence review, and
  non-personal owner references.
- Add Phase 2A docs-only specification for the first longitudinal synthetic
  candidate, `first_longitudinal_synthetic_model_slice`, including the
  conceptual equation, required aggregate synthetic inputs, internal
  validation/review estimands, HOLD behavior, and future validation scenarios.
- Explicitly defer runtime implementation of router logic, schemas, model
  code, and replicated validation to later phases.

## What Does Not Change

- No runtime model code.
- No artifact schema changes.
- No TypeScript production schema changes.
- No routes, UI, persistence, exports, migrations, or live connector reads.
- No customer-facing output.
- No confidence percentages, probability output, ROI proof, causality claim,
  productivity measurement, or finance output.
- No weakening of fail-closed behavior, comparison adequacy gates, sampler
  diagnostics, source hash binding, artifact hash binding, cohort floors, or
  blocked-use pins.
- No additional existing `add-bayesian-inference-proof-harness` task is marked
  complete by this decision; tasks `3.3`, `3.4`, `4.2`, and `5.1` remain
  unchecked.

## Impact

- Affected specs:
  `bayesian-ai-value-realization-and-human-transformation-model-family` (new
  proposal capability).
- Affected docs: model-family decision record, cross-reference notes in the
  existing Bayesian methodology/specification contracts, and
  `.project/PROGRESS.md`.
- Affected code: none.

## Phasing

- Phase 0: audit and decision record. Completed in this task.
- Phase 1: contract and router vocabulary. Completed as docs/contracts and
  OpenSpec contract semantics in this change.
- Phase 2A: first longitudinal synthetic model slice specification. Completed
  as docs-only contract semantics in this change.
- Phase 2B: first longitudinal synthetic model prototype implementation.
  Future runtime proposal after approval.
- Phase 3: replicated synthetic validation. Future validation proposal after
  the prototype exists.
