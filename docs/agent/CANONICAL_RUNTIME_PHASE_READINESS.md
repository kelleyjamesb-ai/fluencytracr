# Canonical Runtime Phase Readiness Protocol

## Purpose

Use this protocol before system-under-test work on every human-authorized, high-risk canonical-runtime qualification slice beginning with Section 7.5. Its purpose is to discover trust-boundary, environment, oracle, and adversarial-coverage gaps before implementation rather than during final review.

This protocol and its template are reference artifacts, not active execution state. `.project/WORK_QUEUE.json` and `.project/PROGRESS.md` remain the only active-state sources. A packet never creates a queue item and never grants implementation or external authority.

## Applicability and packet lifecycle

The protocol applies when a queue item is both:

- part of the canonical runtime qualification path; and
- marked `risk: high`.

Copy [`CANONICAL_RUNTIME_PHASE_READINESS_TEMPLATE.md`](CANONICAL_RUNTIME_PHASE_READINESS_TEMPLATE.md) to the queue-bound OpenSpec change as `readiness.md`, or to another path explicitly named by the human-created queue item. Never edit the reusable template in place and never create a parallel queue or progress file.

The packet progresses through:

- `DRAFT`;
- `PREIMPLEMENTATION_EVIDENCE_READY`, after the packet plus adversarial tests/fixtures exist but before system-under-test implementation;
- external `READINESS_GO` or `READINESS_HOLD`; and
- `STOP_REARCHITECT` if a post-remediation implementation candidate still has a material blocker.

A review decision binds the exact packet SHA-256, preimplementation evidence commit and its tree, base commit, protocol version, and protocol SHA-256. Record those identities and each reviewer verdict in `.project/PROGRESS.md`; do not put the containing commit/tree or self-hash inside the packet. Any packet, adversarial-test, fixture, scope, dependency, requirement, oracle, environment, attack, or test-plan change after `READINESS_GO` invalidates the verdict. The implementation commit must descend from the recorded evidence commit and preserve the reviewed packet/test/fixture blob IDs unchanged.

Do not place self-approval inside the packet. Readiness/review metadata cannot be a trust root or an ancestor of facts it attests.

## Authority boundary

Every packet and verdict has `authority_effect: NONE`. `READINESS_GO` means only that the exact packet is adequate for the named queue-bounded next step. It does not authorize:

- a new queue item;
- later-section work;
- GCP access, credentials, signing, provisioning, persistence, or deployment;
- qualification, evidence collection, or model execution; or
- commit, push, PR mutation, or merge.

Those actions retain their existing sequencing and fresh-confirmation gates. Live-environment rows remain design-only until separately authorized.

## Why semantic review—not a generic readiness validator—is the gate

A generic validator can check shape but cannot prove that a claimed root is independently trusted, a closure is complete, a test exercises the named attack, or an oracle is independent of the implementation. Treating structural validity as readiness would create false assurance and duplicate phase-specific facts.

Therefore:

- the packet uses a closed, required template;
- phase-specific commands and tests provide mechanical evidence;
- reviewers verify Git identities, changed paths, test references, trust semantics, closure completeness, and oracle independence against primary evidence; and
- only the exact-packet CODE/BUG/ADVERSARIAL panel may return `READINESS_GO`.

No tool may emit a generic “readiness passed” result based only on nonempty fields, hashes, or internally consistent graphs.

## Definition of Ready

A packet may enter `PREIMPLEMENTATION_EVIDENCE_READY` only when all packet-owned fields have no placeholders, every named adversarial test/fixture exists in one clean evidence commit, no system-under-test implementation has begun, and every control below is satisfied. External commit/tree/hash identities and review records are not packet fields.

### 1. Scope and ownership are frozen

Bind:

- exact base commit that exists in the repository;
- the externally recorded clean preimplementation evidence commit and tree containing the packet plus tests/fixtures and no system-under-test implementation;
- the human-created queue item ID and risk;
- changed-path allowlist;
- allowed actions;
- explicit non-goals and authorization ceiling;
- current-section and later-section ownership; and
- the next human gate.

Distinguish docs-contract work, implementation, execution, and runtime-authority work. Readiness for one never implies readiness for another. Unknown ownership or cross-section ambiguity produces HOLD.

### 2. Trust and field ledger is exhaustive

Create one row for every input field, nested field, restricted resource, hash node, identity, time source, approval, and output field. Each row names:

- stable field/resource ID;
- owning section;
- exactly one trust class;
- controller;
- producer, authenticator, and consumer;
- direct dependencies;
- admission/derivation rule;
- immutable independent anchor;
- decision use;
- applicable attack IDs, or an exact rationale for no attack applicability; and
- failure outcome.

Allowed trust classes are:

- `COMPILE_PINNED`;
- `AUTHENTICATED_OBSERVATION`;
- `DERIVED`; and
- `OPAQUE_LATER_SECTION`.

Candidate-provided hashes are always recomputed and compared. Candidate-controlled data cannot be a trust root. The dependency graph must be acyclic and every root must have admission evidence independent of the graph it anchors. Hashes prove consistency, not authenticity. `OPAQUE_LATER_SECTION` cannot satisfy a current predicate, be an ancestor of current acceptance, or escape HOLD.

A supplied field is strictly validated or prohibited before projection; it is never silently accepted and overwritten. Historical producer, current verifier, authenticator, and consumer identities are separate whenever evidence crosses those roles.

Every applicable ingress, trust root, restricted resource, decision input, and attacker-controlled closure in the ledger must map to one or more attack IDs. Repeat attack classes across distinct boundaries when needed. Add a ledger-to-attack reconciliation table and HOLD if any applicable ledger row or attack boundary is unmatched.

### 3. Environment truth table is executable

Fill all 12 cells in:

`CLEAN_CI | ARCHIVE_CLOSEOUT | LIVE_RUNTIME` × `ABSENT | PARTIAL | CORRUPT | EXACT`.

For each cell, record:

- exact hermetic command or `NOT_AUTHORIZED`;
- controlled prerequisites;
- expected command exit and expected inner SUT disposition separately;
- claim grade;
- exact test/oracle ID; and
- `authority_effect: NONE`.

Definitions:

- `ABSENT`: no candidate resource exists at explicit or ambient paths;
- `PARTIAL`: at least one required member, dependency, or byte range is absent;
- `CORRUPT`: all required members exist but at least one byte, digest, signature, relationship, or type is invalid; and
- `EXACT`: the complete immutable set matches every approved identity and digest.

Control `HOME`, explicit resource paths, config, caches, loaders, `PATH`, Git/Python/native-library variables, locale, timezone, and thread settings as applicable. Ambient fallback and silent mode downgrade are prohibited. A required cell cannot pass by skip. Archive closeout and structural clean CI must have distinct outcomes and claim grades. Live rows remain `NOT_AUTHORIZED`/`NOT_RUN` until fresh authorization.

Reviewers must run representative commands and confirm that the command exit, inner SUT result, and declared cell agree. A passing pytest command that asserts an inner rejection has command exit `0`; the packet must not confuse those two layers.

### 4. Attack-to-oracle matrix is executable

Every row binds:

- stable attack ID and trust boundary;
- raw ingress;
- exact mutation or interleaving;
- independent immutable root;
- complete attacker-controlled resealed closure;
- deterministic expected `REJECT` or `HOLD`;
- oracle ID;
- exact test ID; and
- every trust-ledger ID covered by the attack.

Mandatory attack classes:

- unknown field;
- missing field;
- wrong type;
- nested extra field;
- truncated object;
- single-field substitution;
- cross-object splice;
- forged receipt/provenance;
- replay/reuse;
- coordinated full dependency-closure reseal;
- global timestamp shift with every dependent value resealed;
- stale/future time;
- mode downgrade/confusion;
- ambient-resource fallback;
- partial resource;
- corrupt resource;
- concurrency/interleaving;
- privacy leakage; and
- authority escalation.

“The full suite covers this” is not an admissible test reference. Full-closure tests must move a root and every attacker-owned descendant while preserving internal consistency; rejection must come from an independently admitted anchor. Reviewers inspect the named test to prove it performs the declared mutation. Attack-to-ledger and ledger-to-attack references must reconcile exactly for every applicable boundary; the 19 class names are a minimum, not a one-row-per-class ceiling.

### 5. Requirements and oracle inventory are total

Assign stable requirement IDs. Every normative requirement maps to named deterministic tests/oracles. No normative row may be blank, skipped, or `N/A`. Deferred rows remain explicitly blocking for the later scope they protect.

Inventory:

- schema/canonicalization;
- hash/dependency DAG;
- decision totality;
- source replay;
- trust/cryptographic verification;
- environment isolation;
- privacy/nonauthorization;
- exact numerical behavior; and
- statistical methodology.

“Math semantics touched” includes equations, priors, likelihoods, transforms, RNG/seed ordering, diagnostics, thresholds, quantiles, rounding, numerical-library changes, and serialization that changes numerical interpretation. When triggered, exact numerical and statistical oracles must be independent of the implementation under test. Applicable evidence includes analytical/golden cases, differential checks, normalization and numerical stability, simulation-based calibration or coverage, sensitivity and negative controls, governed diagnostics, and repeated cold-process byte identity.

For docs-only work that does not touch math semantics, numerical/statistical rows may be `DEFERRED_BLOCKING` with rationale. For implementation work that does not touch math semantics, bind a `NOT_TOUCHED_NONINTERFERENCE` oracle proving that governed equations, model/plan bytes, numerical dependencies, seeds, thresholds, diagnostics, canonical numerical fixtures, and inference outputs are outside the changed closure and unchanged. This permits non-mathematical implementation only; exact numerical/statistical qualification remains blocking for execution, evidence, qualification, and runtime authority. Reviewers—not packet prose—decide whether the trigger and non-interference proof are accurate.

### 6. Cost and stop controls are explicit

Record:

- estimated and maximum wall time;
- longest command and compute profile;
- external dollar cost limit;
- privileged/network requirements; and
- 30-minute checkpoint cadence.

External cost, privileged access, and network mutation default to zero/false. Record checkpoints in `.project/PROGRESS.md`; long commands get launch and completion checkpoints. Reaching a time, token, compute, or cost ceiling produces HOLD or a human scope decision. It never permits skipped roots, smaller matrices, smoke-for-full substitution, stale tests, reviewer omission, weakened oracles, or scope widening.

## Execution and review sequence

### Design gate

1. Complete the packet before system-under-test code.
2. Add the packet’s adversarial tests and fixtures. They may be red because the implementation is absent, but each must collect, execute, and fail only for its documented missing behavior.
3. Create one clean preimplementation evidence commit containing the packet plus tests/fixtures and no system-under-test implementation; record its commit and tree IDs externally.
4. Run cheap phase-specific structural checks and representative environment/oracle commands.
5. Run independent CODE/quality, BUG/failure-mode, and ADVERSARIAL reviews against the same packet SHA-256 and preimplementation evidence commit/tree.
6. Coalesce duplicate findings by defect class and resolve all design findings before implementation. Design findings do not consume the implementation remediation allowance.
7. Record each reviewer’s evidence-backed `GO`/`HOLD` and the aggregate `READINESS_GO`/`READINESS_HOLD` in `PROGRESS.md`, bound to the exact packet/protocol hashes, base commit, and evidence commit/tree.

Role responsibilities are not interchangeable:

- **CODE/quality** verifies Git identities, changed-path and queue scope, requirement/ledger completeness, test/reference existence, dependency/attack cross-references, and clean collection of every named test.
- **BUG/failure-mode** executes representative red attacks and environment cells, distinguishes command exit from inner SUT disposition, and records concrete observed counterexamples.
- **ADVERSARIAL** challenges independent roots, complete resealed closures, producer/authenticator/consumer separation, math/non-interference classification, privacy/authority ceilings, ambient-resource fallback, and time/cost pressure bypasses.

Each role reports the exact packet SHA-256 and evidence commit/tree, commands/hypotheses attempted, observed results, unverified assumptions, and its own `GO` or `HOLD`. Generic approval text or one shared aggregate verdict is insufficient.

### Implementation gate

1. Branch from the recorded preimplementation evidence commit; preserve the reviewed packet and adversarial tests/fixtures unchanged unless a new design review is obtained.
2. Implement only the queue-bounded system-under-test behavior needed to make the reviewed red tests pass.
3. Use targeted tests during development; do not run the broad suite after every small mutation.
4. Before first push, run the environment truth table from an isolated checkout of the exact implementation candidate commit/tree.
5. When targeted and environment checks are stable, run the full applicable suite once.
6. Freeze one implementation commit/tree and run one CODE/BUG/ADVERSARIAL final panel. Mechanically require `git merge-base --is-ancestor <evidence-commit> <implementation-commit>` and equality of `git rev-parse <commit>:<path>` blob IDs for the readiness packet plus every reviewed adversarial test/fixture path. Any ancestry failure, missing path, or blob mismatch invalidates `READINESS_GO` and returns to design review.

### One remediation batch, then redesign

A material finding can cause false GO/authority, omit required evidence/root/oracle, leak restricted data, bypass authorization, create environment-dependent acceptance, or make evidence nonreproducible.

A defect class is `(violated invariant, trust boundary, failure mechanism)`. Reviewer, file, line, and wording do not create a new class; duplicate reports count once.

If the first final panel finds material blockers:

1. group all findings by defect class;
2. identify the failed general invariant;
3. expand generic mutation/oracle coverage across the affected closure;
4. perform one coherent remediation batch; and
5. rerun affected targeted/environment checks, the full suite, and one replacement exact-tree panel.

Any material blocker in the replacement panel—repeated, relabeled, or new—produces `STOP_REARCHITECT`. Do not start a second repair loop, push, or merge under the same packet. Return the queue item to pending/HOLD, record the blocker in `PROGRESS.md`, and obtain a new design decision.

Nonblocking suggestions never authorize mutation after final GO. Defer them to a separate human-created queue item.

## Closeout without review recursion

Prepare normative task state before final implementation-tree review wherever truthful. After merge, a separate metadata-only closeout may update only the existing queue item’s `status`/`last_note` and `.project/PROGRESS.md`. It must verify merge-tree equality, current-head checks, queue invariants, and no new authority/later-section work. It does not mutate normative contracts or implementation.

## Section 7.4 retrospective: what this gate would have demanded

This table is retrospective process evidence, not a claim that Section 7.4 had a preimplementation packet and not retroactive authority.

| Late defect class | Required preimplementation packet evidence |
| --- | --- |
| Restricted archives absent in clean CI | Separate clean/no-archive and archive/exact cells; hermetic `HOME`; exact command and distinct outputs; no required skip. |
| Replay receipt authentication/provenance | Separate producer/authenticator/current-verifier/consumer ledger rows; forged-MAC and reuse tests before cross-call consumption. |
| Raw replay-chain shape | Unknown, missing, wrong-type, nested-extra, and truncated raw-ingress tests before any projection or overwrite. |
| Source-root coordinated reseal | Root plus complete attacker-owned descendant closure mutation; independent compile/authenticated anchor; deterministic rejection. |
| Global timestamp coordinated reseal | Trusted time origin; shift every timestamp and dependent hash by `+Δ`; deterministic rejection against authenticated receipt lineage. |

A Section 7.5 packet is not ready merely because it repeats this table. It must identify its own fields, roots, environments, attacks, tests, and independent oracles.
