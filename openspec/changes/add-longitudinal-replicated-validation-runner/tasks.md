## 1. Contract And Plan

- [x] 1.1 Define the exact 1,200-slot calibration plan, fixed chunks, compiled coverage/null gates, and separate aggregate `k` floor semantics.
- [x] 1.2 Define fixed lag, shock, and negative-control plans plus nonauthorizing artifact semantics.

## 2. Resumable Python Runner

- [x] 2.1 Implement deterministic calibration slot execution and summary-only result hashing.
- [x] 2.2 Implement atomic per-slot checkpoints, exact chunk manifests, strict resume validation, and mixed-provenance rejection.
- [x] 2.3 Implement exact combine/recomputation with every planned row retained in denominators.
- [x] 2.4 Keep smoke, canary, partial, and incomplete studies HOLD.

## 3. Controls

- [x] 3.1 Implement `k=4,8,12,16` floor controls with `k=4` rejected before fit.
- [x] 3.2 Implement true-lag `{1,2,3}` versus candidate-lag `{0,1,2,3,4}` recovery with compiled selection and recovery gates.
- [x] 3.3 Implement uncontrolled/approved-control/unrelated shock, temporary movement, weak history, missing windows, unsafe data, unsupported route, and target-contamination controls.

## 4. Artifact And TypeScript Boundary

- [x] 4.1 Add a separate strict Python artifact emitter with runtime/source/hash commitments and blocked-output pins.
- [x] 4.2 Add a TypeScript schema that independently recomputes exact manifests, rates, integer gates, hashes, control outcomes, and HOLD/non-HOLD state.
- [x] 4.3 Add Python-to-TypeScript bridge coverage without changing DiD, smoke, or concordance schemas.

## 5. Verification And Status

- [x] 5.1 Run focused and full Python inference tests.
- [x] 5.2 Run TypeScript bridge tests and `shared`/`confidence-engine` builds.
- [x] 5.3 Run strict OpenSpec, docs, semantic-drift, governance, and diff checks.
- [x] 5.4 Complete independent CODE, BUG, and ADVERSARIAL acceptance.
- [x] 5.5 Update queue/progress records after verification. Do not mark parent replicated-validation tasks complete and do not commit full generated evidence in this PR.
