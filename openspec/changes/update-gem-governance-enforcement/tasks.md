## 1. Proposal Review
- [ ] 1.1 Confirm GEM scope and allowed surfaces

## 2. Enforcement Foundations
- [ ] 2.1 Add centralized forbidden-key list and ingestion hard rejection
- [ ] 2.2 Add schema/contract forbidden-key CI scanner
- [ ] 2.3 Add global enforcement flag (single source) with fail-fast startup check

## 3. Runtime Enforcement
- [ ] 3.1 Enforce single-window inference with zero cross-window state
- [ ] 3.2 Apply suppression gate before serialization/response/export
- [ ] 3.3 Implement ambiguity fail-closed handling
- [ ] 3.4 Implement absence-is-neutral behavior in contracts/serialization
- [ ] 3.5 Enforce binary-only visibility output
- [ ] 3.6 Enforce non-ordinal, categorical labels
- [ ] 3.7 Disable or suppress unsafe aggregation/export routes

## 4. Tests & CI Proofs
- [ ] 4.1 Add deterministic tests for suppression, ambiguity, absence neutrality
- [ ] 4.2 Add window isolation test for no cross-run accumulation
- [ ] 4.3 Add binary visibility and non-ordinal label tests
- [ ] 4.4 Add adversarial aggregation-blocking tests
- [ ] 4.5 Add CI checks for forbidden keys and enforcement-flag consistency

## 5. Validation
- [ ] 5.1 Run test suite and confirm all GEM-linked checks pass
