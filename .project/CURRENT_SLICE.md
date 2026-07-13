# Current Slice Contract

- Work item id: `hypothesis-metric-longitudinal-admission-boundary`
- Title: `Hypothesis and company-defined metric admission boundary`
- Status: `completed`

## Summary

Define the docs/OpenSpec boundary that connects an enterprise portfolio of
approved hypotheses and company-defined aggregate metrics to the single proven
longitudinal Bayesian model family. The company metric catalog has no arbitrary
product cap, but each analysis unit binds exactly one approved primary metric
version to one hypothesis, aggregate cohort slice, ordered window plan,
predeclared lag, and evidence design.

## Scope Paths

- `docs/contracts/ai-value-hypothesis-metric-longitudinal-admission/README.md`
- `docs/contracts/bayesian-ai-value-realization-and-human-transformation-model-family/README.md`
- `docs/contracts/ai-value-formula-registry/formula-registry.json`
- `docs/contracts/ai-value-formula-registry/README.md`
- `scripts/validate_ai_value_formula_registry.test.mjs`
- `openspec/changes/harden-hypothesis-metric-longitudinal-admission/**`
- `README.md`
- `.project/WORK_QUEUE.json`
- `.project/CURRENT_SLICE.md`
- `.project/PROGRESS.md` only after verification

## Key Boundaries

- Company metric definitions are not limited to a fixed count or universal
  taxonomy.
- Open metric intake does not imply open model eligibility.
- Each analysis unit has exactly one predeclared primary metric version.
- Supporting and guardrail metrics remain separate and are never blended into
  a score or substituted for the primary estimand.
- The current longitudinal proof supports only aggregate continuous-normal
  identity outcomes with known positive uncertainty and every compiled
  structural/diagnostic gate.
- Each of the 6 or 12 model panel groups binds one exact canonical slice tuple
  with independently passing per-window receipts; only model-level partial
  pooling is allowed, never raw cross-slice aggregation or gate rescue.
- Pre-outcome access receipts, baseline-Fluency hashes, separate evidence/fit
  dependency keys, and prepared-input/fit-summary result hashes fail closed.
- Unsupported metric families, incomplete definitions, missing uncertainty,
  off-plan windows, or unsafe source posture HOLD without creating a new
  canonical suppression reason.
- The fitted `longitudinal_movement` remains a direction-adjusted associational
  Velocity/Breadth-outcome contrast in pre-period outcome standard-deviation
  units, separate from raw KPI movement and the categorical evidence-design
  claim cap; none authorizes a causal or customer-facing confidence claim.
- No runtime, schema, route, UI, persistence, export, connector, real-data
  admission, customer output, confidence/probability output, ROI, causality,
  productivity, finance, HR, ranking, promotion, new canonical event, new
  suppression reason, tunable threshold, or admin override is authorized.

## Completed Checks

- `npx openspec validate harden-hypothesis-metric-longitudinal-admission --strict`
- `npx openspec validate generalize-bayesian-confidence-to-model-family --strict`
- `npx openspec validate add-ai-value-formula-registry --strict`
- `npm run test:ai-value-formula-registry`
- `./scripts/ci_docs_contract_sweep.sh`
- `node scripts/ci_semantic_drift_guard.mjs`
- `python3 scripts/ci_v1_governance_gates.py`
- `./harness/scripts/verify.sh`
- `git diff --check`
- CODE, BUG, and ADVERSARIAL review: `GO`, `GO`, `GO`

Results: formula registry `22 passed`; Assurance Harness `274 passed`, `3
skipped`; all strict validations and governance/documentation gates passed.

## Next Handoff Note

Do not implement metric schemas, real-data admission, model routing, reporting,
or UI from this boundary. Those require separate exact-scope proposals after
this contract is independently accepted.
