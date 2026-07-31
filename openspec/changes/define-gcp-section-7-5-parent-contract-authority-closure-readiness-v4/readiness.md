# Section 7.5.1 V4 preimplementation readiness packet

## Packet identity

| Field | Value |
| --- | --- |
| Protocol version and SHA-256 | `CANONICAL_RUNTIME_PHASE_READINESS_V1` / `f1e66d7323d5ca383de1bfd22d343928c2332cfe84795d01da60a705fd13a77d` |
| Packet state | `PREIMPLEMENTATION_EVIDENCE_READY` |
| Queue item / risk | `gcp-canonical-runtime-section-7-5-parent-authority` / `high` |
| Phase / scope kind | `Section 7.5.1` / `DOCS_CONTRACT` |
| Base commit | `c2eb0f4c14c7aa7dfaef4d2c61605a45156ce02a` |
| Authority effect | `NONE` |

## 1. Scope and authority

### Changed-path allowlist

- This OpenSpec change, `tests/gcp_s751_v4/`, its V4 packet fixture, and its
  focused test entrypoint only.

### Allowed actions

- Define and test the V4 compact rule source offline.
- Bind the exact parent paths and hashes without copying parent bytes.

### Non-goals and prohibited actions

- No evaluator, parent amendment, closure projection, GCP, restricted
  evidence, credential, key, signing service, provisioning, persistence,
  deployment, qualification, model execution, Section 7.5.2-7.8, push, PR,
  merge, or live action.

### Ownership and current blockers

| Concern | Owner | Current phase use | Missing evidence outcome |
| --- | --- | --- | --- |
| runtime-object member | Section 7.2 | Bind/read only | `REJECT` |
| security-authority and role matrix | Section 7.3 | Bind/read only | `REJECT` |
| attestation receipt | Section 7.4 | Bind/read only | `REJECT` |
| constraints/open obligations | Section 7.5A | Bind/read only | `REJECT` |
| P00 | Section 7.2 | Preserve `OPEN_BLOCKING` | `HOLD` |
| P01/P02/P06 | Section 7.3 | Preserve `OPEN_BLOCKING` | `HOLD` |
| P03/P14 | Section 7.4 | Preserve `OPEN_BLOCKING` | `HOLD` |
| P05 | Sections 7.3, 7.4, future full 7.5 | Preserve every owner | `HOLD` |
| P07 | Section 7.4, future full 7.5 | Preserve every owner | `HOLD` |
| P08 | Section 7.3, future full 7.5 | Preserve every owner | `HOLD` |
| P19 | Sections 7.3, 7.4, future full 7.5 | Preserve every owner | `HOLD` |
| P04/P09-P13/P18 | Future full 7.5 and named parents | No | `HOLD` |
| P15 / P16 / P17 | Sections 7.7 / 7.8 / human queue | No / no / observe only | `HOLD` |

Next human gate: exact-packet independent `CODE`, `BUG`, and `ADVERSARIAL`
review. `READINESS_GO` retains `authority_effect: NONE`.

## 2. Rule and trust inventory

The compact rule source is
`tests/fixtures/gcp_section_7_5_parent_contract_authority_closure_readiness_v4/packet-rules.json`.
It defines the ordered five-member manifest, closed schemas, rule templates,
fixed oracle precedence, compile-pinned trusted-time root, and one closed case
declaration for every attack/metamorphic generator. Each declaration binds its
literal mutation, immutable root and hash, expected result rule, oracle, test
ID template, and exact ledger rows. Later work must mechanically derive every
parent pointer and dynamic closed boundary from those sources. Candidate
hashes are recomputed, no candidate-controlled value is a root, dynamic
signatures and envelopes are never frozen, and context schemas prohibit every
locator.

Each accepted synthetic alias is mechanically derived by the harness and
recomputed by the independent oracle. For alias ordinal `i`, the derivation is
the first 32 lowercase hex characters of
`SHA256("GCP_SECTION_7_5_1_SYNTHETIC_ALIAS_V1" || 0x00 ||
SHA256(CANONICAL_JSON(candidate with synthetic_aliases=[])) || 0x00 ||
nonce_bytes || UINT32_BE(i))`; the resulting list is sorted before admission.
The nonce is inside the authenticated payload. A merely shape-valid 32-hex
value, including an identifier-derived digest, therefore rejects at
`PRIVACY_OR_NONAUTHORIZATION_INVALID`.

The permitted rule classes are `COMPILE_PINNED`,
`AUTHENTICATED_OBSERVATION`, `DERIVED`, and `OPAQUE_LATER_SECTION`.
`OPAQUE_LATER_SECTION` cannot become an acceptance ancestor. The future
trust-dependency graph must be acyclic; the Section 7.3 controller graph is
separate and retains its required least fixed point. Controller closure
includes each governed role alias in its own transitive upstream set and
enforces every exact parent-declared forbidden pair after cycle retention.
Direct, transitive, fan-out, or cross-object-spliced controller intersections
reject; unknown or unviewable edges hold.

The signed-context rule uses
`GCP_SECTION_7_5_1_SIGNATURE_PROJECTION_V1` and domain
`FLUENCYTRACR:GCP_SECTION_7_5_1_SIGNED_CONTEXT:V1`. Its signature preimage is
the domain bytes, one zero byte, and canonical JSON of the payload excluding
`key_id`. The excluded `key_id` is separately acceptance-bound to the exact
fingerprint of the out-of-band admitted SPKI and cannot choose the anchor.
The packet also enumerates the complete closed
decision/reason/authority-effect/claim-grade mapping; no free-form reason or
alternate tuple is admitted.

## 3. Environment truth table

`CLEAN_CI` and `ARCHIVE_CLOSEOUT` each define `ABSENT`, `PARTIAL`, `CORRUPT`,
and `EXACT` cells. The first three are `REJECT:INVALID_PARENT_RESOURCE_SET`;
the clean exact cell is `HOLD:CURRENT_PARENT_OBLIGATIONS_OPEN` with
`STRUCTURAL_ONLY`; the archive exact cell is
`HOLD:ARCHIVE_CLOSEOUT_PARENT_OBLIGATIONS_OPEN` with `ARCHIVE_CLOSEOUT_ONLY`.
Each postimplementation command exit is `0`; before a SUT exists, cases first
construct the mutation and independent expectation then stop at `MISSING_SUT`.
The executable cells construct cell-specific final-directory capabilities with
zero members for `ABSENT`, a strict subset for `PARTIAL`, all five members with
one governed corruption for `CORRUPT`, and exact bytes for `EXACT`. Cell labels
remain harness metadata and are not encoded in a capability path, member name,
candidate, signed context, anchor, or evaluator argument.

Every `LIVE_RUNTIME` cell (`ABSENT`, `PARTIAL`, `CORRUPT`, `EXACT`) is exactly
`NOT_AUTHORIZED` / `NOT_RUN`, disposition
`HOLD:LIVE_RUNTIME_NOT_AUTHORIZED`, claim grade `DESIGN_ONLY`, and authority
`NONE`. The fixture records all twelve explicit cells. Hermetic later tests
use an isolated home, absolute resolved executables, controlled config/cache,
`PATH`, locale, timezone, thread settings, and no network mutation.

For every mode, including `LIVE_RUNTIME`, signature and signed bindings are
followed by registry/receipt/approval conjunction validation and process-local
nonce admission. A bad live conjunction rejects and a repeated authenticated
live nonce rejects. Only then does live return its non-authorizing hold, before
any parent-resource activity.

## 4. Requirements and oracle inventory

| Oracle class | Status | Independent of future SUT? | Later scope blocked if deferred |
| --- | --- | --- | --- |
| Schema/canonicalization | `BOUND` | Yes | No |
| Hash/dependency DAG | `BOUND` | Yes | No |
| Decision totality | `BOUND` | Yes | No |
| Source replay | `BOUND` | Yes | No |
| Trust/cryptographic | `BOUND` | Yes | No |
| Environment isolation | `BOUND` | Yes | No |
| Privacy/nonauthorization | `BOUND` | Yes | No |
| Exact numerical | `DEFERRED_BLOCKING` | Yes | Execution/evidence/qualification/authority |
| Statistical methodology | `DEFERRED_BLOCKING` | Yes | Execution/evidence/qualification/authority |

Math semantics touched: `false`. This docs/test-readiness packet changes no
equation, prior, likelihood, threshold, seed, diagnostic, model bytes, or
inference output. Numerical and statistical qualification remain blocking.

## 5. Attack-to-oracle matrix

The compact catalog binds A001-A019: unknown, missing, wrong-type,
nested-extra, truncated, substitution, splice, forged provenance, replay,
complete alternate-anchor reseal, all-time reseal, stale/future time, mode
confusion, ambient fallback, partial resource, corrupt resource, concurrency,
privacy leakage, and authority escalation. `M001` through `M004` bind V4
metamorphic equivalence across ephemeral keys/signatures, aliases, descriptor
numbers, and opposing outcomes at one normalized descriptor number. Every
future test must perform its named mutation and compute its independent oracle
result before the single absent-SUT gate.

The packet catalog now owns one exact closed record for every emitted case:
146 attack/metamorphic cases, eight executable environment cells, and five
closed-result-parser boundaries. Each record fixes its stable case ID,
generator ID, literal mutation operator and parameters, source and target
relationship, authenticated immutable root, full expected sequence, oracle,
exact pytest node, and one exact ledger selector. The corpus constructs and
observes mutations independently, derives the exact resource, pointer, and
rule ID from that observed evidence, then requires a bijective field-for-field
reconciliation with those records. A selector must resolve exactly one ledger
row, equal the independently observed selector, and match the observed
rejection or hold boundary.

Generated tests cover raw candidate, payload, envelope, and nested nonce/time
unknown, missing, wrong-type, nested-extra, and truncation cases; candidate,
payload, signature, and all-five-parent splices; forged receipt/provenance;
process-local replay as two identical calls in one oracle/evaluator process; an
alternate-key complete reseal evaluated against the original admitted anchor;
complete time reseal under the original signing-batch anchor and an independent
packet-owned trusted-time root; stale/future time; mode confusion; ambient
fallback; each parent missing and corrupt; extra, nonregular, symlink,
capability-first atomic replacement, and separately concurrent resource
states; every public input string path; every result string field through the
closed result parser; and every fourteen-role, sixteen-capability,
two-HSM-purpose, and twenty-owner boundary. Role mutations reach the Section
7.3 authority oracle after valid resealing and select the exact semantic role
row. Manifest-bound capability, HSM, and owner mutations stop earlier at
resource admission, select only that exact resource-admission row, and remain
honestly classified as parent-resource rejection. The replay record fixes both
expected sequence entries, and each output-parser field has its own packet
record rather than inheriting generator metadata.

`PreparedCase` labels, attack IDs, expectations, and ledger coverage remain
harness metadata. They do not enter candidate or envelope bytes, the admitted
SPKI, bundle names or contents, numeric descriptor semantics, or future child
arguments. Equivalent cases vary real ephemeral anchors/signatures,
authenticated nonce-bound synthetic aliases, and descriptor numbers while
preserving decisions. Separate exec-isolated children use `dup2` to present
exact and corrupt parent semantics at descriptor `751` and produce the
governed opposing results.

The future child protocol is already closed even though the evaluator remains
absent. It passes candidate, envelope, and admitted-anchor bytes through
dedicated inherited descriptors, passes only the admitted final-directory and
result descriptors as additional capabilities, requires zero stdout/stderr,
and admits exactly one canonical five-field result for a one-call case. A
replay session must instead emit one canonical ordered two-element array
containing the independently checked first-call and second-call five-field
results; a terminal-only replay result is invalid. The replay case adds a
second dedicated candidate/envelope/anchor descriptor triple to the same child
process and requires those bytes to be identical to the first call. Current
future-SUT cases intentionally stop only with literal `MISSING_SUT`; collected
counts and audit results belong in the task report rather than this normative
packet.

## 6. Cost, review, and stop controls

| Control | Value |
| --- | --- |
| Estimated / maximum wall time | 60 minutes / 120 minutes |
| External dollar cost | `0` |
| Privileged access / network mutation | `false` / `false` |
| Checkpoint cadence | 30 minutes |
| Review roles | `CODE`, `BUG`, `ADVERSARIAL` |
| Remediation batches / replacement panels | 1 / 1 |
| Material blocker after replacement | `STOP_REARCHITECT` |

A material finding can create false GO or authority, omit a required
parent/root/rule/oracle/attack, accept ambient or answer-key behavior, leak
restricted/private data, bypass no-follow/authorization, erase ownership or
blocking truth, or make evidence nonreproducible.

External reviewers record identities and verdicts outside this packet. No
self-approval, evidence commit/tree, packet self-hash, or review verdict is a
packet field.
