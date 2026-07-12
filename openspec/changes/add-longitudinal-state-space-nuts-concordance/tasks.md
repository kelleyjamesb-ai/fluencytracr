## 1. Contract And Artifact Boundary

- [x] 1.1 Specify the separate synthetic-only longitudinal validation artifact and compiled model/concordance rules.
- [x] 1.2 Implement strict summary-only hash bindings and nonauthorizing HOLD semantics without changing smoke V1/V2.

## 2. Matched Engines

- [x] 2.1 Add the six-cell synthetic validation generator with truth kept outside model inputs.
- [x] 2.2 Implement deterministic Rao-Blackwellized Gaussian state-space integration.
- [x] 2.3 Implement the PyMC NUTS reference at four chains, 1,000 draws, 2,000 tuning draws, `target_accept=0.99`, and `max_treedepth=15`.
- [x] 2.4 Compute sampler diagnostics and fixed posterior predictive checks from sampled reference evidence.

## 3. Concordance Runner

- [x] 3.1 Plan and validate exactly five compiled seeds across each of the six required cells.
- [x] 3.2 Apply compiled mean, endpoint, SD-ratio, sampler, and PPC gates; any failure MUST HOLD.
- [x] 3.3 Keep reduced mechanics mode explicitly HOLD and verify all 30 full-setting slots before unblocking replicated validation.

## 4. TypeScript Bridge

- [x] 4.1 Add a strict sibling validation schema that recomputes hash and semantic gates and rejects forged engine, route, Depth, threshold, and authorization claims.
- [x] 4.2 Add Python-to-TypeScript valid/HOLD bridge coverage and preserve DiD and longitudinal smoke compatibility.

## 5. Verification And Status

- [x] 5.1 Run focused and full Python inference tests.
- [x] 5.2 Run TypeScript bridge tests and `shared`/`confidence-engine` builds.
- [x] 5.3 Run strict OpenSpec, docs, semantic-drift, governance, and diff checks.
- [ ] 5.4 Complete independent CODE, BUG, and ADVERSARIAL acceptance.
- [ ] 5.5 Update task/status records only after verification; do not mark replicated longitudinal validation or unfinished DiD tasks complete.
