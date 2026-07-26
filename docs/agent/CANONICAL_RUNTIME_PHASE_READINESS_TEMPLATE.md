# Canonical Runtime Phase Readiness Packet

> Copy this file into the human-created queue item’s bound OpenSpec change as `readiness.md`. Do not edit this reusable template in place. Delete this instruction and replace every `<required>` placeholder before `PREIMPLEMENTATION_EVIDENCE_READY`.

## Packet identity

| Field | Required value |
| --- | --- |
| Protocol version and SHA-256 | `<required>` |
| Packet state | `DRAFT` or `PREIMPLEMENTATION_EVIDENCE_READY` |
| Human-created queue item ID / risk | `<required>` / `high` |
| Phase and scope kind | `<required>` / `DOCS_CONTRACT`, `IMPLEMENTATION`, `EXECUTION`, or `RUNTIME_AUTHORITY` |
| Base commit | `<required existing Git commit>` |
| Authority effect | `NONE` |

A filled packet has no self-approval and contains no external evidence commit/tree, packet hash, or review-verdict field. After the packet plus tests/fixtures are committed, record the evidence commit/tree, packet/protocol SHA-256 values, individual CODE/BUG/ADVERSARIAL verdicts, and aggregate decision in `.project/PROGRESS.md`.

## 1. Scope and authority

### Changed-path allowlist

- `<required>`

### Allowed actions

- `<required>`

### Non-goals and prohibited actions

- `<required>`
- No live GCP, credentials, signing, provisioning, persistence, deployment, qualification, evidence collection, or model execution unless a later exact scope and fresh authorization explicitly permit it.

### Ownership

| Concern | Owning section | Current phase may define/use it? | Missing evidence outcome |
| --- | --- | --- | --- |
| `<required>` | `<required>` | `<required>` | `HOLD` or `REJECT` |

### Next human gate

`<required>`

`READINESS_GO` grants no implementation, external-system, Git, PR, or later-section authority.

## 2. Trust and field ledger

Include every input/nested field, restricted resource, hash node, identity, time source, approval, and output field. Allowed classes: `COMPILE_PINNED`, `AUTHENTICATED_OBSERVATION`, `DERIVED`, `OPAQUE_LATER_SECTION`.

| ID | Owner | Trust class | Controller | Producer | Authenticator | Consumer | Direct dependencies | Admission/derivation | Independent immutable anchor | Decision use | Applicable attack IDs or exact no-attack rationale | Failure outcome |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `HOLD` or `REJECT` |

Checklist:

- [ ] Every candidate-supplied hash is recomputed and compared.
- [ ] No candidate-controlled value is a root.
- [ ] Every root has admission evidence independent of its descendants.
- [ ] The graph is acyclic and every dependency/owner exists.
- [ ] `OPAQUE_LATER_SECTION` is not a current acceptance input or ancestor.
- [ ] Producer, authenticator, current verifier, and consumer are separated where evidence crosses roles.
- [ ] Review/readiness metadata is not a fact/root/decision ancestor.
- [ ] Every supplied field is validated or prohibited before projection; none is silently overwritten.
- [ ] Every applicable ingress, root, restricted resource, decision input, and attacker-controlled closure maps to attack IDs; unmatched rows HOLD.

### Ledger-to-attack reconciliation

| Trust-ledger ID | Applicable boundary/closure | Required attack IDs | Coverage status |
| --- | --- | --- | --- |
| `<required>` | `<required>` | `<required>` | `BOUND` or `HOLD` |

## 3. Environment truth table

Record command exit separately from inner SUT disposition. Required cells cannot pass by skip. Live cells remain `NOT_AUTHORIZED`/`NOT_RUN` until fresh authorization.

| Environment | Resource state | Exact command / controlled prerequisites | Expected command exit | Expected inner disposition | Claim grade | Exact test/oracle ID | Authority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CLEAN_CI` | `ABSENT` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `NONE` |
| `CLEAN_CI` | `PARTIAL` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `NONE` |
| `CLEAN_CI` | `CORRUPT` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `NONE` |
| `CLEAN_CI` | `EXACT` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `NONE` |
| `ARCHIVE_CLOSEOUT` | `ABSENT` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `NONE` |
| `ARCHIVE_CLOSEOUT` | `PARTIAL` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `NONE` |
| `ARCHIVE_CLOSEOUT` | `CORRUPT` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `NONE` |
| `ARCHIVE_CLOSEOUT` | `EXACT` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `NONE` |
| `LIVE_RUNTIME` | `ABSENT` | `NOT_AUTHORIZED` | `NOT_RUN` | `<required design outcome>` | `DESIGN_ONLY` | `<required>` | `NONE` |
| `LIVE_RUNTIME` | `PARTIAL` | `NOT_AUTHORIZED` | `NOT_RUN` | `<required design outcome>` | `DESIGN_ONLY` | `<required>` | `NONE` |
| `LIVE_RUNTIME` | `CORRUPT` | `NOT_AUTHORIZED` | `NOT_RUN` | `<required design outcome>` | `DESIGN_ONLY` | `<required>` | `NONE` |
| `LIVE_RUNTIME` | `EXACT` | `NOT_AUTHORIZED` | `NOT_RUN` | `<required design outcome>` | `DESIGN_ONLY` | `<required>` | `NONE` |

Hermetic controls used: `HOME=<required>`, explicit resources/digests `<required>`, config/cache/loader `<required>`, `PATH`/Git/Python/native-library variables `<required>`, locale/timezone/thread settings `<required>`, network `<required>`.

## 4. Requirements and oracle inventory

No normative row may be blank, skipped, or `N/A`. `DEFERRED_BLOCKING` remains blocking for its named later scope.

| Requirement ID | Normative statement | Owner | Status (`BOUND` / `DEFERRED_BLOCKING`) | Independent oracle/test IDs | Expected outcome | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |

| Oracle class | Status | Independent of SUT? | Exact evidence/test IDs | Later scope blocked if deferred |
| --- | --- | --- | --- | --- |
| Schema/canonicalization | `<required>` | `<required>` | `<required>` | `<required>` |
| Hash/dependency DAG | `<required>` | `<required>` | `<required>` | `<required>` |
| Decision totality | `<required>` | `<required>` | `<required>` | `<required>` |
| Source replay | `<required>` | `<required>` | `<required>` | `<required>` |
| Trust/cryptographic | `<required>` | `<required>` | `<required>` | `<required>` |
| Environment isolation | `<required>` | `<required>` | `<required>` | `<required>` |
| Privacy/nonauthorization | `<required>` | `<required>` | `<required>` | `<required>` |
| Exact numerical | `<required>` | `<required>` | `<required>` | `<required>` |
| Statistical methodology | `<required>` | `<required>` | `<required>` | `<required>` |

### Bayesian/math trigger

Math semantics touched: `<true/false>`

Evidence for that classification: `<required>`

If true, identify independent analytical/golden, differential, normalization, numerical-stability, calibration/coverage, sensitivity/negative-control, diagnostic, and cold-process byte-identity evidence. If false for docs-only work, numerical/statistical rows may remain `DEFERRED_BLOCKING`. If false for implementation, bind a `NOT_TOUCHED_NONINTERFERENCE` oracle proving governed equations, model/plan bytes, dependencies, seeds, thresholds, diagnostics, fixtures, and inference outputs are unchanged and outside the changed closure. Numerical qualification still remains blocking for execution/evidence/qualification/authority.

## 5. Attack-to-oracle matrix

Every exact test must perform the named attack. “Covered by the full suite” is not acceptable. For full-closure rows, enumerate every attacker-owned descendant—not “all descendants.”

| Attack class | Attack ID / trust boundary / ingress | Covered trust-ledger IDs | Exact mutation or interleaving | Independent root | Complete resealed closure | Expected `REJECT`/`HOLD` | Oracle ID / exact test ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Unknown field | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Missing field | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Wrong type | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Nested extra field | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Truncated object | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Single-field substitution | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Cross-object splice | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Forged receipt/provenance | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Replay/reuse | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Coordinated full-closure reseal | `<required>` | `<required>` | `<required>` | `<required>` | `<enumerate exact descendant IDs>` | `<required>` | `<required>` |
| Global timestamp reseal | `<required>` | `<required>` | `<required>` | `<required>` | `<enumerate every shifted timestamp and dependent ID>` | `<required>` | `<required>` |
| Stale/future time | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Mode downgrade/confusion | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Ambient-resource fallback | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Partial resource | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Corrupt resource | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Concurrency/interleaving | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Privacy leakage | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |
| Authority escalation | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` | `<required>` |

## 6. Cost, review, and stop controls

| Control | Value |
| --- | --- |
| Estimated / maximum wall time | `<required>` / `<required>` |
| Longest command / compute profile | `<required>` / `<required>` |
| External dollar cost limit | `0` unless separately approved |
| Privileged access required | `false` unless separately approved |
| Network mutation required | `false` unless separately approved |
| Checkpoint cadence | `30 minutes` |
| Design review roles | `CODE`, `BUG`, `ADVERSARIAL` |
| Implementation remediation batches | `1` |
| Replacement exact-tree panels | `1` |
| Any material blocker after replacement | `STOP_REARCHITECT` |
| Nonblocking suggestions | Separate human-created queue item |

Material finding definition: `<required>`

Defect class definition `(violated invariant, trust boundary, failure mechanism)` applied to this phase: `<required>`

## External review requirements—not packet fields

Do not add review evidence or verdict placeholders to this immutable packet. After the packet plus adversarial tests/fixtures are frozen, each independent reviewer records evidence externally and binds the exact packet SHA-256 and preimplementation evidence commit/tree:

- **CODE/quality:** Git identities, changed paths/queue scope, requirement and ledger completeness, test/reference existence, dependency/attack cross-references, and clean test collection.
- **BUG/failure-mode:** representative red attacks and environment cells, with command exit and inner SUT disposition reported separately.
- **ADVERSARIAL:** independent roots, complete resealed closures, role separation, math/non-interference classification, privacy/authority ceilings, ambient fallback, and pressure bypasses.

Each reports commands/hypotheses, observed results, unverified assumptions, and an individual `GO` or `HOLD`. Record the three verdicts and aggregate `READINESS_GO`/`READINESS_HOLD` in `.project/PROGRESS.md`. `READINESS_GO` has `authority_effect: NONE`.
