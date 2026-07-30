# Section 7.5.1 Rule-Ledger V4 Design

## Status and authority

James approved Approach A on 2026-07-30 as the human architecture decision
following the stopped V3 readiness attempt.

This document is design-only. It does not authorize an OpenSpec readiness
packet, system-under-test implementation, parent-contract amendment, closure
projection, GCP access, credentials, signing service, provisioning, persistent
resources, deployment, qualification, model execution, Sections 7.5.2-7.8,
push, pull request, merge, or live action.

The next step after James reviews this document is an implementation plan for
the V4 preimplementation readiness packet. The stopped V2 and V3 packets remain
diagnostic evidence and are not implementation ancestors.

## Problem

Section 7.5.1 must determine whether the exact Section 7.2, 7.3, 7.4, and 7.5A
parent contracts are admissible for bounded parent-authority closure. The
readiness design must prove that a future evaluator cannot:

- accept candidate-controlled trust roots;
- accept partial, changed, or symlink-reached parent resources;
- accept unknown or mistyped parent roles, capabilities, fields, or owners;
- treat internally consistent hashes as authentication;
- admit user-identifiable input;
- infer the expected answer from test-only labels;
- conflate clean-CI, archive-closeout, or live-runtime authority; or
- print or persist restricted input.

The V3 design made three categories of data dynamic while treating them as
static fixture instances:

1. P-256 signatures and signed-envelope bytes;
2. filesystem locator strings; and
3. large normalized field-ledger instances.

That created avoidable failure modes. A static ledger hashed an invalid
synthetic signature, locator values became both an answer-key discriminator and
an identifier channel, and a multi-megabyte normalized fixture obscured the
small set of actual trust rules.

## Goals

1. Preserve the current Section 7.5.1 queue bound and all nine repository
   invariants.
2. Keep signature verification inside the future evaluator rather than
   trusting a caller-provided `verified` boolean.
3. Remove locator strings from every candidate, context, fixture, ledger, and
   evaluator input.
4. Separate static rule evidence from dynamic run evidence.
5. Derive exhaustive parent-field coverage mechanically from the exact five
   parent documents.
6. Admit no free-text or user-identifiable value at any candidate, context, or
   output boundary.
7. Retain a complete independent decision oracle, executable 12-cell
   environment table, mandatory attack coverage, and exact
   CODE/BUG/ADVERSARIAL review.
8. Reduce the committed readiness footprint and the number of manually
   synchronized representations.

## Non-goals

- Implementing the Section 7.5.1 evaluator.
- Amending Sections 7.2, 7.3, 7.4, or 7.5A.
- Closing any S75A prerequisite.
- Changing current parent ownership or later-section ownership.
- Introducing a new canonical event, suppression reason, threshold, override,
  score, ranking, individual attribution, or cross-slice aggregation.
- Executing against GCP or creating credentials, keys, storage, networking, or
  audit resources.
- Producing qualification evidence, model output, customer data, or UI data.

## Decision 1: use a rule ledger, not an instance ledger

The static readiness ledger SHALL describe how each field or resource is
admitted. It SHALL NOT pretend that dynamic candidate, envelope, signature, or
nonce values have one frozen expected hash.

Each rule-ledger row contains:

- stable rule ID;
- resource and canonical JSON pointer or descriptor role;
- owner;
- trust class;
- closed value shape or enum rule;
- controller, producer, authenticator, and consumer;
- direct rule dependencies;
- independent anchor rule;
- decision use;
- applicable attack families;
- failure outcome; and
- whether its value is static or dynamic.

Static exact values are limited to immutable evidence that is already
versioned in the repository:

- the five ordered parent resource names and SHA-256 hashes;
- their exact canonical JSON bytes;
- the applicable schema and policy identities;
- the readiness protocol identity and hash; and
- compile-pinned enums and limits.

Dynamic values include:

- candidate bytes and digest;
- signed-context envelope and signature bytes;
- ephemeral verifier public anchor;
- nonce;
- process-local replay state; and
- per-run directory descriptor identity.

Dynamic rows bind a validator or derivation rule, not an expected instance
hash. A test run may record dynamic digests in temporary diagnostic output, but
those digests are not static readiness roots and are not committed as normative
fixture values.

### Exhaustive closed-schema derivation

A small deterministic ledger builder SHALL enumerate every JSON pointer and
value type directly from the exact five parent documents. Rule templates map
the resulting paths to their section owner, trust rule, applicable attack
families, and failure outcome.

The same builder SHALL traverse the closed schemas for every dynamic boundary:

- candidate and nested Section 7.3 observation fields;
- signed-context payload and envelope fields;
- public-anchor and key-fingerprint fields;
- nonce and time fields;
- process-local replay records;
- parent-bundle descriptor admission facts; and
- the five-field result.

Container rows use explicit canonical pointers, including closed wildcard paths
for repeated array or map members. Bidirectional reconciliation proves that
every allowed dynamic path has one rule-ledger row and that no dynamic row
lacks a closed-schema source. Runtime values remain dynamic; only their paths,
types, cardinalities, derivations, and admission rules are ledgered.

The committed source of truth is:

1. the exact parent bytes;
2. the ordered five-member manifest;
3. the small closed rule-template set; and
4. the deterministic builder and its tests.

The builder's normalized exhaustive output is reviewable on demand. It is not
hand-copied into a second multi-megabyte fixture. Mechanical checks prove:

- every parent pointer appears exactly once;
- no ledger pointer lacks a parent source;
- every closed dynamic-boundary path appears exactly once;
- no dynamic row lacks a closed-schema source;
- every dependency resolves;
- every independent anchor rule resolves;
- the rule-ledger trust-dependency graph is acyclic;
- Section 7.3 controller edges are evaluated separately as the governed
  controller graph, including cycles that must converge to the required least
  fixed point;
- every applicable boundary maps to an attack family; and
- rebuilding in a cold process produces byte-identical normalized output.

## Decision 2: pass an exact parent-bundle directory descriptor

The future evaluator contract is:

```text
evaluate_candidate(
  candidate_bytes,
  signed_context_envelope_bytes,
  verifier_anchor_spki,
  trusted_parent_bundle_fd
) -> {
  schema_version,
  decision,
  reason,
  authority_effect,
  claim_grade
}
```

`trusted_parent_bundle_fd` is a harness-admitted capability naming the directory
object that directly contains the exact five parent members. The harness owns
path admission and opens the incoming descriptor without following symlinks.
The evaluator does not and cannot prove the provenance or no-follow treatment
of ancestor path components from an already-open descriptor. Its authority
begins at the directory object and contents referenced by that capability.

The caller keeps the incoming descriptor open and performs no close, seek,
directory iteration, or mutation through it for the duration of the call. The
numeric descriptor value is non-semantic and cannot affect a decision. The
evaluator:

1. verifies that the incoming capability currently references a directory and
   records its device/inode identity;
2. opens `"."` relative to it with
   `O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC`, obtaining an
   evaluator-owned independent open-file description rather than a cursor-
   sharing duplicate;
3. proves that the evaluator-owned descriptor has the same device/inode
   identity as the incoming capability;
4. lists the evaluator-owned directory and requires the exact five-member set;
5. opens each fixed member name relative to that descriptor with no-follow
   semantics;
6. verifies regular-file identity before and after each read;
7. recomputes every member hash;
8. checks the signed ordered manifest;
9. repeats directory population and both-descriptor identity checks after
   reading; and
10. closes every descriptor it owns, never the caller's descriptor.

Missing, extra, non-regular, symlink, renamed, replaced, or concurrently changed
resources fail closed. Unexpected caller closure or capability identity change
also fails closed. Concurrent caller directory iteration cannot perturb the
evaluator-owned cursor; external content mutation is detected by the pre/post
population and member-identity checks. Because the evaluator receives the
final bundle capability, filesystem locator strings cannot carry user
identifiers or expected test answers.

## Decision 3: generate and verify real P-256 envelopes per run

P-256 verification remains inside the future evaluator.

The test harness generates one ephemeral P-256 key pair per isolated case or
bounded batch. Before constructing candidate or context bytes, it admits the
public SPKI through a verifier-trusted, out-of-band harness channel. That
immutable test trust root is fixed for the case or batch, cannot be selected or
changed by candidate or signed-context data, and is not reused across
independent batches. Alternate-anchor and reseal attacks continue to pass the
original admitted anchor separately so that attacker-consistent re-signing
cannot redefine trust.

The exact later OpenSpec packet SHALL freeze P-256 SPKI DER and ECDSA signature
DER encodings. The signed-context `key_id` is the closed, non-identifying
fingerprint `P256_SPKI_SHA256:<64 lowercase hex>` derived from the admitted
SPKI, never a caller-authored label.

The private key:

- exists only in the signing process;
- is never written to a file or environment variable;
- is never placed in the candidate, context, fixture, ledger, or evaluator
  arguments; and
- becomes inaccessible when the isolated signing process exits.

The rule ledger describes:

- envelope closed shape;
- canonical payload encoding;
- signature encoding and algorithm;
- public-anchor shape;
- signature verification predicate;
- candidate-digest binding;
- exact policy, parent-manifest, time, mode, and authority rules; and
- the failure precedence.

It does not freeze an example signature or envelope-root hash.

Structural evidence SHALL include at least two independently generated valid
envelopes. Both must verify under their own anchors, fail under the other
anchor, and satisfy the same rule-ledger rows despite having different dynamic
bytes.

These software-generated signatures prove structural signature and trust-root
handling only. They do not prove Section 7.3 HSM purposes, custody, or runtime
key provenance, and they cannot close P03, P08, P14, or any equivalent
production-authority obligation. Their claim grade remains `HOLD`.

## Decision 4: keep every public input domain closed

### Candidate

The candidate contains only:

- exact candidate schema version;
- exact `EVALUATE_ONLY` requested action; and
- the full Section 7.3 observation.

Section 7.3 observation values are limited to:

- exact governed role keys;
- lowercase 32-hex context-bound synthetic aliases;
- closed lists and objects with exact keys;
- canonical sorted edges and cycle records; and
- nonnegative integer unknown-edge count.

There is no `public_projection`, comment, label, path, tenant, account, person,
email, phone, address, project resource name, or other free-text field.

### Signed context

The signed context contains only closed fields required to bind:

- exact context schema and policy identities;
- candidate SHA-256;
- mode enum;
- ordered five-parent manifest;
- registry, receipt, approval-target, current-head, anti-rollback, and
  role-matrix hashes;
- exact signer purpose and key ID;
- fixed-format nonce and UTC times; and
- `authority_effect: NONE`.

It contains no locator or arbitrary string.

### Result

Every result field is a closed enum. Results contain no echoed input, path,
identifier, diagnostic text, raw hash collection, or variable exception
message.

## Decision 5: preserve one total independent oracle

The reference oracle shares no decision helper with the future evaluator. It
applies this fixed precedence:

1. candidate canonical JSON and closed shape;
2. envelope canonical JSON and closed shape;
3. P-256 signature and independently supplied public-anchor verification;
4. signed candidate-digest, policy, mode, time, and authority binding;
5. replay and registry/receipt/approval conjunctions;
6. exact parent-bundle descriptor admission and member bytes;
7. full Section 7.3 role, capability, controller, and owner semantics;
8. privacy and nonauthorization;
9. clean-CI versus archive-closeout result; and
10. fixed closed result projection.

Invalid data returns a stable closed `REJECT` reason. Missing current authority
or evidence returns a stable `HOLD` reason. `LIVE_RUNTIME` always remains
`NOT_AUTHORIZED` and `NOT_RUN` in this readiness scope.

The oracle proves observable decisions and result shape. It does not claim to
prove the evaluator's internal implementation technique.

## Decision 6: use generated attack families without answer-key fields

The readiness corpus keeps the protocol's mandatory attack classes while
removing test-specific semantic values from evaluator inputs.

Generated cases use neutral random or ordinal test-harness labels that never
enter candidate bytes, context bytes, public anchors, or the bundle capability.
Expected decisions remain entirely outside evaluator inputs. Normative inputs
necessarily determine decisions; the prohibition is against any
non-normative or test-only discriminator that bypasses the governed rules.

The corpus contains:

- candidate and context unknown, missing, wrong-type, nested-extra, and
  truncated cases;
- validly signed malformed cases wherever authentication is constructible;
- candidate, payload, signature, and parent cross-object splices;
- alternate-anchor and complete dependency-closure reseals;
- all-time-field shifts and stale/future windows;
- replay and process-local reuse;
- exact five-parent missing and corrupt coverage;
- extra member, non-regular member, symlink, replacement, and concurrency
  coverage;
- complete Section 7.3 role, capability, HSM-purpose, controller-cycle, and
  owner-preservation coverage;
- identifier-class probes against every string-capable candidate, context, and
  result boundary;
- shallow-dispatch mutants that attempt to use scalar values, ordering, or
  fixture indices as answer keys;
- metamorphic equivalents with the same semantic case across different
  ephemeral keys, signatures, synthetic aliases, and descriptor numbers;
- opposing semantic outcomes presented under the same normalized descriptor
  number in isolated child processes using `dup2`; and
- all 12 environment cells.

Every future-evaluator case constructs its mutation and independent oracle
result before reaching the intentional missing-evaluator gate.
Metamorphic expectations and descriptor normalization remain oracle-owned and
never enter candidate, context, anchor, or bundle content.

The packet SHALL NOT promise a specific total test count before collection.
Coverage is defined by closed generators and reconciliation checks, not by
maintaining a manually synchronized numeric headline.

## Data flow

```text
exact parent bytes --------------------+
                                       |
rule templates -> generated ledger ----+--> independent oracle
                                       |          |
ephemeral P-256 signer -> envelope -----+          |
candidate bytes -----------------------+          +--> expected result
harness-admitted bundle FD ------------+          |
out-of-band trusted public SPKI -------+----------+--> future evaluator
                                                     |
                                                     +--> actual result
```

Only the expected and actual closed results are compared. Private signing
material, raw parent bytes, descriptors, and dynamic signature bytes are not
emitted by the evaluator.

## Environment behavior

The readiness packet retains:

`CLEAN_CI | ARCHIVE_CLOSEOUT | LIVE_RUNTIME`

crossed with:

`ABSENT | PARTIAL | CORRUPT | EXACT`.

For each executable cell, the harness resolves required executables before
clearing the environment, passes absolute executable paths explicitly, uses a
temporary isolated home, and controls locale/timezone/thread variables. It
opens a cell-specific directory capability: no parent members for `ABSENT`, a
strict subset for `PARTIAL`, a complete set with a governed corruption for
`CORRUPT`, and the exact admitted bundle only for `EXACT`. Each capability is
admitted by the harness before evaluation and remains open and quiescent for
the call.

The packet records command exit separately from evaluator disposition.
Live-runtime cells remain design-only.

## Error and output contract

The evaluator returns exactly five fields:

- `schema_version`;
- `decision`;
- `reason`;
- `authority_effect`; and
- `claim_grade`.

It writes zero bytes to stdout and stderr. It does not return exception text.

Reason families distinguish:

- candidate shape;
- signed-context shape;
- signed-context authentication;
- signed binding/time/mode;
- parent resource set;
- registry/receipt/approval conjunction;
- parent authority semantics;
- privacy or authority violation;
- current parent obligations open;
- archive-closeout obligations open; and
- live runtime not authorized.

The exact enum inventory belongs in the future OpenSpec packet. This design
does not add a product suppression reason.

## Acceptance criteria for the V4 readiness design

Before freezing a V4 packet:

1. No candidate, context, ledger, fixture, or evaluator signature contains a
   filesystem locator field.
2. No normative fixture contains a frozen P-256 signature or dynamic envelope
   hash.
3. Two or more independently generated valid envelopes satisfy the same
   rule-ledger contract while having different bytes.
4. The generated ledger covers every exact parent JSON pointer and every
   closed dynamic-boundary path once and is cold-process byte-identical.
5. Every dependency and independent anchor rule resolves, the trust-dependency
   graph is acyclic, and the separate Section 7.3 controller graph reaches its
   required least fixed point even when governed cycles exist.
6. Every public input string has an exact enum, hash, time, key ID, member name,
   or lowercase 32-hex alias rule.
7. Identifier probes fail at every string-capable public boundary.
8. No non-normative/test-only field, filesystem locator, descriptor number,
   test ID, attack ID, fixture index, or expected result can serve as an answer
   key.
9. All mandatory attacks and 12 environment cells reconcile to executable
   tests and independent oracle results.
10. Metamorphic tests preserve decisions across different keys, signatures,
    aliases, and descriptor numbers, while isolated `dup2` tests produce
    opposing governed outcomes at the same normalized descriptor number.
11. The exact evidence commit contains only the approved V4 packet, compact
    rule templates or manifest, deterministic ledger builder, tests, and no
    evaluator implementation.
12. CODE, BUG, and ADVERSARIAL reviewers independently return
    `READINESS_GO` on the same exact commit, tree, packet, protocol, builder,
    and test hashes before evaluator implementation begins.

## Alternatives considered

### Split authentication and evaluation

A separate authenticator could return a preverified capability to the
evaluator. This creates another cross-process contract and another authority
handoff. It is rejected for this phase because the evaluator can safely verify
P-256 directly without trusting a caller-selected boolean.

### Commit deterministic cryptographic fixtures

A fixed test private key could make envelope bytes reproducible. This is
rejected because it reintroduces signer-capable committed material and risks
confusing a test instance with runtime authority.

### Repair the V3 instance ledger

The stopped V3 packet could add more static rows and cases. This is rejected by
the stop rule and would preserve the source of the complexity: dynamic
instances represented as static roots.

## Risks and mitigations

- **Generated ledger hides mistakes in its generator.** The builder is small,
  deterministic, and checked bidirectionally against every source pointer,
  value type, dependency, anchor rule, and attack family. Reviewers inspect the
  builder and emitted output.
- **Dynamic signatures reduce byte-for-byte fixture reproducibility.** The
  contract is reproducible at the rule and decision level. Multiple valid
  envelopes must produce equivalent decisions, while dynamic signature bytes
  are intentionally different.
- **Moving to a final bundle descriptor could hide caller path errors.** Caller
  path admission is outside the evaluator input. Harness tests independently
  prove caller no-follow opening; evaluator acceptance starts at the admitted
  directory-object/content boundary and makes no ancestor-provenance claim.
- **A caller could perturb a shared directory cursor.** The evaluator reopens
  `"."` relative to the incoming capability to obtain its own open-file
  description, pins incoming and owned directory identity, and fails closed on
  unexpected closure or mutation.
- **A software test key could be mistaken for runtime custody evidence.** The
  anchor is harness-owned and out-of-band, its key ID is a closed fingerprint,
  and its structural-only `HOLD` claim explicitly leaves HSM and production
  custody obligations open.
- **A smaller committed fixture could reduce review visibility.** The exact
  normalized ledger remains available through one deterministic command and
  is hashed in review evidence; it is not an additional hand-maintained source.
- **Closed strings could still encode identifiers in hex.** Alias provenance is
  context-bound synthetic generation, fixed length, uniqueness checked, and
  never derived from user, account, tenant, project, or customer values.

## Delivery sequence after design approval

1. Write a bounded implementation plan for a new V4 preimplementation
   readiness packet.
2. Create a new OpenSpec change rather than mutating the stopped V2/V3 changes.
3. Add fail-first structural tests for the three stopped-V3 defect classes.
4. Implement only the compact rule templates, ledger builder, independent
   oracle, dynamic signer harness, and future-evaluator red tests.
5. Freeze one clean evidence commit with no evaluator implementation.
6. Run exact CODE, BUG, and ADVERSARIAL readiness review.
7. Record `READINESS_GO` or `READINESS_HOLD` with `authority_effect: NONE`.
8. Begin evaluator implementation only after a separate permitted next step
   and unanimous exact-packet `READINESS_GO`.

## Designed-state boundary

If James approves this written design, the next deliverable is an
implementation plan. Approval does not itself authorize implementation, push,
pull request, merge, GCP, deployment, or later-section work.
