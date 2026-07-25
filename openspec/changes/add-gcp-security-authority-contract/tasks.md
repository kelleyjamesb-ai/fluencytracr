## 1. Provider evidence

- [x] 1.1 Add exact public-source registry and external recovery-bundle commitments.
- [x] 1.2 Add offline verifier for all source, claim, and revalidation hashes.

## 2. Contract artifacts

- [x] 2.1 Define separate security policy and evidence-snapshot schemas/hashes.
- [x] 2.2 Define digest-based direct WIF and alternate-credential closure.
- [x] 2.3 Define distinct Cloud HSM key generations and detached image provenance.
- [x] 2.4 Define role/capability matrix, transitive controller closure, and effective-access tuples.
- [x] 2.5 Define held rollover and authority-audit interfaces.
- [x] 2.6 Keep all live admission lists empty and authority held.

## 3. Verification

- [x] 3.1 Add canonical vectors and strict mutation/contract tests.
- [x] 3.2 Obtain independent CODE/BUG/ADVERSARIAL GO on the final exact candidate.
- [x] 3.3 Commit, push, and open a separate draft PR after fresh human authorization.

Review note: fresh read-only reviewers inspected the exact remediated head and
falsified the claim-pin, source-link, disposition-manifest, coordinated-omission,
and all-source mutator-composition boundaries. The BUG review returned GO after
proving that one source record may emit multiple mutators while a positive
mutator count with zero source records rejects. Final exact-tree CODE, BUG, and
ADVERSARIAL closeout reviews returned GO. Runtime authority remains held.

## 4. Explicitly deferred

- [ ] 4.1 Live GCP policy/key/WIF/IAM/audit evidence (not authorized).
- [ ] 4.2 Section 7.4 attestation and receipt contract (separate scope).
- [ ] 4.3 Section 7.5 logging/persistence implementation (separate scope).
- [ ] 4.4 Any canary, rollover, deployment, qualification, signing, or model execution (not authorized).
