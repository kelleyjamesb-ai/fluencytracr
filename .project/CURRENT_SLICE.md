# Current Slice Contract

- Work item id: `ai-fluency-measurement-model-calibration-contract`
- Title: `AI Fluency measurement-model calibration prerequisites boundary`
- Status: `completed`

## Summary

Define the docs/spec-only prerequisites boundary for the future
`bayesian_fluency_measurement_model`. The slice distinguishes approved
aggregate snapshot context from the missing privacy-safe measurement evidence,
records HOLD and non-authorization boundaries, and sets
`PREREQUISITES_DEFINED_CALIBRATION_INCOMPLETE`. It does not fit a model, create
runtime code,
add schemas, persist output, expose routes/UI, run connectors, admit real data,
export respondent rows, or authorize confidence/probability, ROI, causality,
productivity, finance, HR, ranking, economic, or customer-facing output.

## Scope Paths

- `docs/contracts/ai-value-ai-fluency-measurement-model-calibration/README.md`
- `docs/contracts/ai-value-ai-fluency-instrument-snapshot/README.md`
- `docs/contracts/bayesian-ai-value-realization-and-human-transformation-model-family/README.md`
- `openspec/changes/add-ai-fluency-instrument-snapshot-longitudinal-proof/proposal.md`
- `openspec/changes/add-ai-fluency-instrument-snapshot-longitudinal-proof/design.md`
- `openspec/changes/add-ai-fluency-instrument-snapshot-longitudinal-proof/specs/bayesian-ai-value-realization-and-human-transformation-model-family/spec.md`
- `openspec/changes/add-ai-fluency-instrument-snapshot-longitudinal-proof/tasks.md`
- `README.md`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md`

## Key Boundaries

- Calibration state is `PREREQUISITES_DEFINED_CALIBRATION_INCOMPLETE`.
- Validated aggregate `AIFluencyInstrumentSnapshot` waves are the only allowed
  snapshot-context inputs for any future implementation.
- Dimension summaries, aggregate uncertainty, and reliability metadata are not
  sufficient to calibrate a latent model or establish comparable cross-wave
  change.
- A future proposal must define privacy-safe aggregate sufficient statistics,
  exact form/item/scoring versions, form compatibility or equating, and
  longitudinal measurement-invariance gates.
- Missing aggregate uncertainty, reliability, source refs, source hashes,
  k-min posture, missingness posture, or respondent-composition posture HOLDS.
- Respondent rows, raw answers, direct identifiers, HR/personnel fields,
  manager fields, productivity fields, raw prompts, transcripts, query text,
  and raw event rows reject before interpretation.
- No model result, posterior quantity, confidence percentage, probability, ROI,
  finance, causality, productivity, HR, ranking, route, UI, export, connector,
  persistence, real-data admission, customer output, new canonical event, new
  suppression reason, tunable threshold, or admin override is authorized.

## Completed Checks

- `npx openspec validate add-ai-fluency-instrument-snapshot-longitudinal-proof --strict`
- `npx openspec validate generalize-bayesian-confidence-to-model-family --strict`
- `npm run test:ai-value-ai-fluency-instrument-snapshot`
- `./scripts/ci_docs_contract_sweep.sh`
- `node scripts/ci_semantic_drift_guard.mjs`
- `python3 scripts/ci_v1_governance_gates.py`
- `git diff --check`
- `./harness/scripts/verify.sh` (`274 passed`, `3 skipped`)

## Next Handoff Note

OpenSpec task `5.5` remains incomplete. The next bounded model-family item must
first define the missing privacy-safe aggregate measurement evidence and
synthetic calibration design. VBD trajectory calibration, persistence
promotion, backend read projection, UI integration, real-data admission, and
customer output remain separate later scopes.
