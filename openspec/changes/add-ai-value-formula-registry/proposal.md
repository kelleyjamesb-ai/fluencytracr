# Change: Add AI Value Formula Registry

## Why

FluencyTracr now has multiple governed mathematical concepts across AI
Fluency, VBD, Bayesian DiD, longitudinal synthetic proof, evidence-design
claim caps, and V4 value-confidence planning. Without one canonical registry,
future work can mislabel docs-only templates as implemented formulas or turn
prohibited economic calculations into runtime behavior.

## What Changes

- Add a docs-first `fluencytracr_ai_value_formula_registry` contract.
- Add a machine-readable JSON registry and JSON schema.
- Add a shared metadata validator that validates registry status and
  non-execution boundaries only.
- Add tests for registry drift, required fields, state truthfulness,
  non-executable specified/prohibited formulas, AI Manager formula-family
  coverage, finance non-upgrade, claim-cap non-rescue, and future-window
  leakage boundaries.

## Non-Goals

- No formula execution engine.
- No new Bayesian model implementation.
- No customer-facing economic output, ROI, productivity, causality,
  confidence percentage, or probability output.
- No routes, UI, persistence, exports, migrations, production schemas, live
  connectors, new suppression reasons, new canonical events, tunable
  thresholds, admin overrides, or promotion decision.

## Impact

- Affected specs: `ai-value-formula-registry`
- Affected docs: `docs/contracts/ai-value-formula-registry/`
- Affected code: `shared/src/aiValueEngine/aiValueFormulaRegistry.ts`
- Affected tests: `scripts/validate_ai_value_formula_registry.test.mjs`
