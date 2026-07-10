## 1. Contract

- [x] 1.1 Add the human-readable AI Value Formula Registry contract.
- [x] 1.2 Add the machine-readable registry JSON with canonical formula IDs,
      layers, states, assumptions, limitations, prohibited interpretations,
      source refs, executable-reference posture, validation tests, and customer
      display state.
- [x] 1.3 Add a JSON schema for the registry shape.

## 2. Validation

- [x] 2.1 Add a shared metadata validator that validates the registry without
      executing formulas.
- [x] 2.2 Add focused tests for registry drift, non-executable states,
      AI Manager formula-family coverage, finance non-upgrade, claim-cap
      non-rescue, no future-window leakage, no unsafe economic helper, and
      no runtime-tunable numeric controls.

## 3. Verification

- [x] 3.1 Run `npm run test:ai-value-formula-registry`.
- [x] 3.2 Run `npm run build --workspace shared`.
- [x] 3.3 Run `npx openspec validate add-ai-value-formula-registry --strict`.
- [x] 3.4 Run `git diff --check`.
