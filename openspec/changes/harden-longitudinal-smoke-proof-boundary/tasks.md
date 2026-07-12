## 1. Structural And Binding Hardening

- [x] 1.1 Validate longitudinal dataset structure before fit and emission.
- [x] 1.2 Bind fit and diagnostics to the exact synthetic input and fit summary.
- [x] 1.3 Add regression coverage for malformed inputs and cross-dataset rebinding.

## 2. Truthful V2 Artifact

- [x] 2.1 Emit a V2 smoke artifact with literal closed-form engine claims.
- [x] 2.2 Make all non-HOLD V2 artifacts internal and nonauthorizing.
- [x] 2.3 Represent unexecuted sampler, PPC, prior-sensitivity, and full counterfactual checks as `NOT_RUN`.

## 3. TypeScript Bridge

- [x] 3.1 Retain V1 read compatibility and add strict V2 validation.
- [x] 3.2 Reject rehashed model, partial-binding, diagnostic, route, source, and authorization contradictions; document that coordinated payload/hash replacement requires a future trusted signature.

## 4. Verification And Status

- [x] 4.1 Run focused and full Python inference tests.
- [x] 4.2 Run the longitudinal TypeScript bridge tests and confidence-engine build.
- [x] 4.3 Run strict OpenSpec, docs, governance, semantic-drift, and diff checks.
- [x] 4.4 Update longitudinal task/status records only after verification.
